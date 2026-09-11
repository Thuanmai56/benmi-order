# PDP: Takeaway Multi-Round Ordering — New

| Metadata | Details |
| :--- | :--- |
| Feature | Gọi thêm món nhiều lần cho đơn mang đi |
| Status | `DRAFT` — chờ duyệt, chưa triển khai |
| Date | 2026-09-02 |
| Scope | LINE LIFF, LINE Flex Message, Cloudflare Worker, D1, POS |

## 1. Executive Summary & Objectives

### Problem Statement

Khách đã tạo đơn `takeaway` hiện không có luồng chính thức để gọi thêm món vào cùng đơn. Backend có hàm append dùng chung và về mặt kỹ thuật có thể cập nhật một đơn mang đi, nhưng UI LIFF luôn ép append thành `dine_in`, LINE chỉ hiển thị nút gọi thêm cho đơn tại quán, và POS chỉ hiển thị badge/nhãn append cho `dine_in`.

Kết luận: hệ thống hiện chỉ hỗ trợ **một phần ở tầng backend**, chưa hỗ trợ an toàn và trọn vẹn cho người dùng mang đi.

### Goals

- Cho phép một đơn `takeaway` có Đợt 1, Đợt 2, Đợt 3... trên cùng `order.key`.
- Mọi đợt gọi thêm giữ nguyên giờ nhận hàng của đơn gốc.
- Tổng tiền, nội dung đơn và `order_items` được cập nhật đúng một lần cho mỗi request.
- POS phát hiện, phát âm báo và hiển thị rõ đợt gọi thêm cho cả `takeaway` và `dine_in`.
- Khách có thể tiếp tục gọi thêm từ LINE receipt/progress/append confirmation cho đến khi đơn đóng.
- Rollout theo cấu hình `tenant_config.features`, không hardcode tenant.
- Không làm hỏng luồng append `dine_in` hiện có.

### Non-Goals

- Không gộp tự động theo tên khách, `user_id` hoặc giờ nhận hàng.
- Không cho một đợt gọi thêm đổi giờ nhận; giờ khác phải tạo đơn mới.
- Không hỗ trợ split bill hoặc thanh toán từng đợt trong phạm vi này.
- Không tự động gộp hai đơn takeaway độc lập đã tồn tại.

## 2. Context & Current Architecture

### Luồng hiện tại

1. LIFF tạo đơn mới qua `POST /api/create`.
2. Append chỉ được kích hoạt khi URL có `parent_order_key` và `mode=append`.
3. LIFF gọi `POST /api/orders/append`.
4. Worker cộng tổng tiền, tăng `round_count`, prepend nội dung đợt mới, thêm `order_items` và cập nhật `last_appended_at`.
5. POS phát hiện `round_count` tăng để phát cảnh báo.

### Bằng chứng trong code

- Backend append không kiểm tra `dining_option`, nên có thể cập nhật cả takeaway: `benmi-worker-official/src/modules/orders.ts` (`executeAppendOrderInternal`, khoảng dòng 302-533).
- Append chỉ chặn `PICKED_UP`, `REJECTED`, `PAID`; các trạng thái terminal khác chưa được chặn: `orders.ts`, khoảng dòng 370-375.
- Mọi append đều ép trạng thái thành `ACCEPTED`: `orders.ts`, khoảng dòng 400-464.
- UUID ở `/api/create` hiện chỉ dùng để trả về kết quả idempotent của đơn cũ, không tự chuyển thành append: `orders.ts`, khoảng dòng 108-124.
- LIFF append luôn khóa hình thức thành `dine_in`: `js/client-checkout.js`, khoảng dòng 51-108.
- LINE receipt/progress chỉ thêm nút gọi món khi `isDineIn`: `benmi-worker-official/src/modules/line.ts`, khoảng dòng 542-560 và 687-706.
- Flex xác nhận append luôn hiển thị `桌號`, kể cả khi parent là takeaway: `line.ts`, khoảng dòng 730-848.
- POS phát hiện round tăng cho mọi đơn, nhưng badge/modal/history chỉ coi là append khi `isDineIn`: `js/orders-core.js`, khoảng dòng 414-439; `js/orders-live.js`, khoảng dòng 134-137; `js/orders-modals.js`, khoảng dòng 20-30; `js/orders-history.js`, khoảng dòng 188-191.
- Repository chưa có test tự động cho append; `npm test` hiện chỉ chạy static frontend checker.

### Rủi ro nếu chỉ mở nút cho takeaway

- UI sẽ hiển thị takeaway như đơn tại bàn và ẩn/đổi sai thông tin nhận hàng.
- Append vào đơn `NEW` sẽ nhảy thẳng sang `ACCEPTED`, bỏ qua bước nhận đơn của nhân viên.
- Retry do mạng có thể cộng tiền và insert món hai lần vì append chưa có idempotency key.
- Hai request gần nhau có thể cùng tính một `nextRound`.
- API chỉ cần mã đơn; mã đơn hiện có sequence dễ đoán nên chưa đủ để chứng minh quyền append.
- POS có thể báo “Bàn” trống cho takeaway và không hiện badge số đợt.

## 3. Proposed Architecture

### Business Rules

| Rule | Quyết định đề xuất |
| :--- | :--- |
| Định danh | Mọi đợt giữ cùng `order.key`; mỗi request append có `append_request_id` riêng |
| Giờ nhận | Luôn lấy `pickup_time` từ parent; client không được thay đổi |
| Trạng thái được append | `NEW`, `ACCEPTED`, `DONE` |
| Chuyển trạng thái | `NEW -> NEW`, `ACCEPTED -> ACCEPTED`, `DONE -> ACCEPTED` |
| Trạng thái bị khóa | `PICKED_UP`, `PAID`, `REJECTED`, `EXPIRED`, `FORCE_REJECT`, các trạng thái chờ xác nhận thay đổi/hủy |
| Đơn đã sẵn sàng | Cho append từ `DONE` nhưng cảnh báo khách rằng giờ hoàn tất có thể thay đổi |
| Pickup khác | Tạo đơn mới, không append |
| Tự gộp | Không tự gộp dựa trên `user_id`, tên hoặc thời gian |

### Feature Gate

Thêm feature key `takeaway_multi_round` vào `tenant_config.features`.

- Tắt: takeaway giữ hành vi hiện tại; backend từ chối append takeaway bằng mã lỗi rõ ràng.
- Bật: LINE/LIFF/POS bật toàn bộ luồng mới.
- Dine-in tiếp tục dùng feature và hành vi hiện có.

### Data Model

Tạo migration mới, ví dụ `0048_create_order_append_events.sql`:

```sql
CREATE TABLE order_append_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tenant_id TEXT NOT NULL,
  order_key TEXT NOT NULL,
  append_request_id TEXT NOT NULL,
  round_number INTEGER NOT NULL,
  added_amount REAL NOT NULL CHECK (added_amount > 0),
  note TEXT DEFAULT '',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (order_key) REFERENCES orders(key) ON DELETE CASCADE,
  UNIQUE (tenant_id, append_request_id),
  UNIQUE (tenant_id, order_key, round_number)
);

CREATE INDEX idx_order_append_events_order
ON order_append_events (tenant_id, order_key, round_number);
```

`orders.round_count`, `orders.total_amount` và `orders.order_content` vẫn là projection phục vụ POS nhanh. `order_append_events` là audit/idempotency boundary; `order_items.round_number` tiếp tục chứa chi tiết món.

### API Contract

#### `GET /api/orders/append-context?token=...`

Xác thực token và trả dữ liệu tối thiểu để LIFF hydrate append mode:

```json
{
  "active": true,
  "order": {
    "key": "B0902-T023",
    "dining_option": "takeaway",
    "pickup_time": "2026-09-02 18:30",
    "status": "ACCEPTED",
    "round_count": 2
  }
}
```

#### `POST /api/orders/append`

```json
{
  "append_token": "signed-capability-token",
  "append_request_id": "uuid-v4",
  "items": [],
  "appended_total": 120,
  "note": ""
}
```

Server lấy `tenant_id`, `order_key`, `dining_option`, `pickup_time` và user binding từ order/token; không tin các trường tương ứng do client tự gửi.

Response thành công hoặc retry cùng request:

```json
{
  "success": true,
  "key": "B0902-T023",
  "round_count": 3,
  "total_amount": 420,
  "status": "ACCEPTED",
  "idempotent": false
}
```

### Authorization

Không tiếp tục coi `parent_order_key` là đủ quyền append.

- Worker phát hành capability token có chữ ký, chứa tối thiểu `tenant_id`, `order_key`, user binding và expiry.
- Token chỉ được gửi trong receipt/progress/append confirmation của đúng đơn.
- Worker kiểm chữ ký, tenant, expiry, user binding và trạng thái đơn trước khi ghi.
- Không ghi raw token vào log.
- Link cũ theo `parent_order_key` được giữ tạm cho dine-in trong thời gian chuyển đổi; takeaway bắt buộc token ngay từ đầu.

### Atomicity and Idempotency

1. Nếu `(tenant_id, append_request_id)` đã tồn tại, trả lại kết quả cũ, không cộng thêm.
2. Đọc `round_count` hiện tại và đề xuất `nextRound`.
3. Ghi `order_append_events`, update `orders` và insert `order_items` trong một `DB.batch()`.
4. Unique constraint trên `(tenant_id, order_key, round_number)` biến xung đột đồng thời thành rollback; Worker đọc lại và retry với round mới trong giới hạn nhỏ.
5. Update tổng tiền bằng phép cộng trên DB, không thay bằng tổng do client tính.

Cloudflare xác nhận D1 `batch()` thực thi tuần tự và rollback toàn batch khi một statement thất bại: <https://developers.cloudflare.com/d1/worker-api/d1-database/#batch>.

### Frontend LIFF

- `initAppendModeIfPresent()` hydrate context từ API, không tự ép `dine_in`.
- Với takeaway: khóa hình thức, ẩn picker chỉnh giờ và hiển thị giờ nhận gốc dạng read-only.
- Banner dùng wording theo loại đơn: bàn cho dine-in; mã đơn + giờ nhận cho takeaway.
- Mỗi submit sinh một `append_request_id` và giữ nguyên ID đó khi retry.
- Sau thành công, xóa cart nhưng giữ link “Gọi thêm lần nữa” trong Flex confirmation.
- Fallback text LINE phải mang `append_request_id`/token an toàn hoặc không được tự coi là đã thành công khi API thất bại.

### LINE Flex Messages

- Receipt và progress thêm nút “Gọi thêm món” cho takeaway khi feature bật và status còn mở.
- Append confirmation render theo `dining_option`:
  - `dine_in`: số bàn.
  - `takeaway`: giờ nhận hàng.
- Nút append tiếp theo giữ capability token mới/hợp lệ.
- Không dùng emoji trang trí; dùng typography và SVG theo quy chuẩn UI hiện tại.

### POS

- Hiển thị badge `Đợt N` cho cả hai loại đơn.
- Alert takeaway dùng `Mang đi #KEY · HH:mm`, không dùng nhãn bàn.
- Modal takeaway vẫn hiển thị pickup time; thêm thời gian gọi gần nhất ở trường riêng.
- Sorting takeaway tiếp tục theo pickup time gốc; append không đổi thứ tự cam kết nhận hàng.
- Alarm vẫn dựa trên việc tăng round như hiện tại.
- Thêm đầy đủ key `zh-TW` và `vi`; bỏ wording hardcode chỉ dành cho “tại bàn”.

## 4. Migration & Rollout Strategy

### Phase A — Additive deployment

1. Tạo bảng `order_append_events` và indexes; không sửa/xóa cột hiện tại.
2. Deploy code backend có thể đọc cả request cũ và mới.
3. Feature `takeaway_multi_round` mặc định tắt.

### Phase B — Staging canary

1. Bật feature bằng `tenant_config.features` cho tenant QA, không hardcode.
2. Chạy test API, LIFF trong LINE, desktop và POS tablet.
3. Theo dõi duplicate, conflict, lỗi token và thời gian append.

### Phase C — Production rollout

1. Deploy backend/migration trước.
2. Deploy frontend, LINE templates và POS sau.
3. Bật lần lượt theo tenant/config sau khi smoke test.
4. Chỉ chuyển dine-in sang token contract mới sau khi takeaway ổn định.

### Rollback

- Tắt `takeaway_multi_round` trong tenant config và invalidate tenant/bootstrap cache.
- Giữ migration additive; không drop bảng trong rollback khẩn cấp.
- Backend vẫn phục vụ dine-in append cũ.
- Các append đã ghi vẫn hiển thị như dữ liệu lịch sử, không đảo ngược tổng tiền tự động.

## 5. Alternatives Considered & Trade-offs

| Phương án | Ưu điểm | Nhược điểm | Kết luận |
| :--- | :--- | :--- | :--- |
| Mở nút takeaway và tái dùng API hiện tại | Nhanh | Sai UI/state, duplicate, thiếu auth/audit | Không chọn |
| Mỗi lần gọi tạo đơn takeaway mới | Không sửa append | POS phân mảnh, nhiều mã/receipt, khó tổng hợp | Không đáp ứng yêu cầu |
| Tự gộp theo user + pickup time | Ít thao tác | Dễ gộp nhầm hai đơn có mục đích khác nhau | Không chọn |
| Append rõ ràng bằng token + request ID | An toàn, audit được, tương thích multi-tenant | Thêm migration và contract | Đề xuất |

## 6. Cross-Cutting Concerns

### Security

- Tenant isolation phải có trong mọi query và unique/index.
- Validate token trước khi query/update parent.
- Validate item/price phía server; không chỉ kiểm tổng dương do client gửi.
- Rate-limit append theo order/user/IP để tránh spam.
- Không log token hoặc payload chứa dữ liệu nhạy cảm.

### Observability

Structured log cho mỗi append:

```text
event=order_append tenant_id order_key dining_option append_request_id
from_round to_round from_status to_status idempotent conflict duration_ms
```

Theo dõi tỷ lệ `ORDER_LOCKED`, `INVALID_APPEND_TOKEN`, duplicate idempotent, round conflict và lỗi LINE push.

### Performance

- Query parent bằng `(tenant_id, key)` và event bằng unique indexes.
- Không dùng KV làm nguồn sự thật cho order/round.
- Không invalidate bootstrap cache khi append order vì catalog/config không thay đổi.

## 7. Step-by-Step Execution Plan

- [ ] PR 1 — Migration `order_append_events`, types và repository/helper cho append event.
- [ ] PR 2 — Backend token validation, state machine, idempotency, atomic batch và structured logs.
- [ ] PR 3 — LINE receipt/progress/append confirmation hỗ trợ takeaway và token link.
- [ ] PR 4 — LIFF append context theo loại đơn, pickup read-only, stable retry request ID.
- [ ] PR 5 — POS badge/alert/modal/history cho takeaway; hoàn thiện `zh-TW` + `vi`.
- [ ] PR 6 — Test suite, staging canary, đo log và rollout theo feature flag.

## 8. Verification & Test Plan

### Automated

- Tạo takeaway rồi append vòng 2/3: cùng key, giữ pickup time, tổng và item đúng.
- Retry cùng `append_request_id`: không tăng round/tổng, không thêm item.
- Hai request đồng thời: tạo hai round liên tiếp hoặc retry có kiểm soát, không mất dữ liệu.
- `NEW` append vẫn là `NEW`; `DONE` append về `ACCEPTED`.
- Mọi terminal/waiting state bị chặn đúng mã lỗi.
- Token sai tenant/order/user/expiry bị từ chối.
- Feature tắt: takeaway không có nút và API từ chối; dine-in không regression.
- POS render badge/alert/modal đúng cho cả `takeaway` và `dine_in` ở `zh-TW` và `vi`.

### Static checks

```bash
npm run check
cd benmi-worker-official && npx tsc --noEmit
```

### Manual staging scenarios

1. Đặt takeaway hẹn giờ, gọi thêm hai lần từ LINE, kiểm tra chỉ có một card POS và ba round.
2. Retry submit khi mạng chậm, kiểm tra tổng chỉ cộng một lần.
3. Gọi thêm khi đơn còn `NEW`, sau `ACCEPTED`, và sau `DONE`.
4. Thử sau `PICKED_UP`/`REJECTED`/`PAID`, xác nhận bị khóa.
5. Mở link token bằng tenant khác hoặc sửa order key, xác nhận bị từ chối.
6. Kiểm tra POS tablet: alarm, badge, pickup time, modal, history và thao tác tối thiểu 48px.
7. Tắt feature và xác nhận quay lại hành vi cũ không cần rollback schema.

## 9. Decisions Needed Before Implementation

1. Xác nhận rule đề xuất: mọi đợt takeaway giữ nguyên pickup time; giờ khác tạo đơn mới.
2. Xác nhận có cho gọi thêm khi `DONE` hay chỉ đến `ACCEPTED`.
3. Xác nhận thanh toán là tổng cuối cùng một lần, không thanh toán từng đợt.

