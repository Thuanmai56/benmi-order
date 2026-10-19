# R00 — Hiện trạng trước khi tách release staff ordering

Ngày kiểm tra: 19/10/2026, khoảng 21:42–21:44 JST (UTC+09:00).

**Kết quả: hoàn thành khảo sát; chờ người dùng xác nhận. Chưa đủ điều kiện release runtime.**

R00 chỉ truy vấn hiện trạng Cloudflare/GitHub, đọc code và chuẩn bị tài liệu local. Không deploy, apply migration, thay đổi cờ, cập nhật đơn, push hoặc tạo PR. Mỗi batch D1 thành công đều ghi nhận `changed_db=false`, `rows_written=0`.

## 1. Quy trình xác nhận

Người dùng đã yêu cầu ngày 19/10/2026: làm lần lượt từng task và luôn có người dùng xác nhận. R00 được phép bắt đầu; R01 chưa được xác nhận.

- Chuẩn bị đúng một task, báo cáo kết quả, kiểm chứng và điểm còn mở; dừng chờ xác nhận trước task tiếp theo.
- Merge/push gây deploy, deploy thủ công, migration và bật/tắt capability phải được trình bày bằng thay đổi cụ thể để người dùng xác nhận trước thao tác.
- Xác nhận khảo sát không đồng nghĩa xác nhận thay đổi production hoặc xử lý dữ liệu staging.
- Không tự xử lý hai đơn staff staging đang mở, không tự tắt các cờ staging.

## 2. Nguồn code và baseline

| Thành phần | Giá trị đã xác minh |
| --- | --- |
| `main` local và remote | `512a642cde71a7a1626aa6d215fabbae858ae632` |
| Nguồn tính năng trên remote | `origin/staff_dine_in` — `97708e8e20c8b19db7045ac4013d447940d5b38f` |
| Nguồn tính năng local | `staff_dine_in` — `b2d6488`, thiếu hai commit cuối của remote |
| Chênh lệch hai phía | `main` có 43 commit riêng; nhánh tính năng có 4 commit riêng |
| Diff tính năng từ tổ tiên chung | 18 file, thêm 5.484 dòng, xóa 24 dòng |
| Nhánh chuẩn bị R00 | `codex/staff-order-r00-inventory`, tạo từ `main` |

Không merge nguyên nhánh hoặc cherry-pick nguyên commit triển khai lớn. Mỗi phần phải được tích hợp vào kiến trúc hiện tại của `main`, giữ các bản sửa UUID, tenant lifecycle, LINE receipt và vòng lặp in.

GitHub xác nhận `main.protected=false`; workflow hiện có duy nhất là `PR-Agent`. Không có bằng chứng về một CI kiểm thử đang bảo vệ `main`. R01 cần bổ sung kiểm thử/checklist và kiểm tra các cổng thực tế; không coi PR-Agent là test.

## 3. Tenant demo và trạng thái D1

**Tenant đúng là `blab_demo`**, có dấu gạch dưới. Không tồn tại bản ghi tenant `blab-demo` trong ba database đã kiểm tra. Migration seed `0045` cũng dùng `blab_demo`.

Tenant `blab_demo` tồn tại, config active, `allow_dine_in=1`, `staff_ordering_enabled=0` ở cả ba môi trường. Đổi tên tenant không nằm trong phạm vi công việc.

| Chỉ số | Production | Staging (`test`) | Dev |
| --- | --- | --- | --- |
| Tenant có config | 14 | 14 | 14 |
| Cờ staff bật | 0 | 2: `bsc`, `jiangjiejie` | 0 |
| Đơn `source='staff'` | 0 | 8 thuộc `bsc`: 2 ACCEPTED, 3 PAID, 3 REJECTED | 0 |
| Bàn staff | 0 | 3 thuộc `bsc`, cả 3 active | 0 |
| Session staff | 0 | 13 tổng cộng, không có session chưa hết hạn và chưa bị revoke | 0 |
| Idempotency request staff | 0 | 17 thuộc `bsc` | 0 |
| Trùng đơn mở trên cùng bàn | 0 | 0 | 0 |

Các số liệu này là snapshot, không phải cơ chế giám sát liên tục. Trước mỗi lần triển khai phải kiểm tra lại cờ và đơn đang mở.

### Schema liên quan

Migration `0057_create_staff_ordering_and_tables.sql` đã được ghi nhận trên cả ba database:

- Production: `2026-09-20 04:27:38` UTC.
- Staging: `2026-09-20 04:27:32` UTC.
- Dev: `2026-09-27 05:14:20` UTC.

Cả ba có `restaurant_tables`, `staff_sessions`, `staff_order_requests` (cột `response_json`), unique partial index một đơn staff mở/bàn, `tenant_config.staff_ordering_enabled DEFAULT 0`, và `orders.table_id/source/revision`. Chưa môi trường nào có cột `staff_ordering_capabilities`.

Trigger `orders_staff_revision_guard` chỉ tồn tại trên staging. Trigger này kiểm tra `NEW.revision < 0` trên mọi order, chưa giới hạn `source='staff'`. Production và dev chưa có trigger đó.

**Không apply lại `0057`; không sửa migration lịch sử.** R11 phải kiểm tra và thay thế có chủ đích trigger cùng tên trên staging, không chỉ `CREATE TRIGGER IF NOT EXISTS` rồi tưởng rằng định nghĩa đã đúng.

### Migration ledger khác nhau giữa các môi trường

Có 69 migration SQL trong `main`. Đối chiếu theo tên đầy đủ:

| Môi trường | Bản ghi ledger | File `main` chưa ghi nhận | Bản ghi ngoài `main` |
| --- | --- | --- | --- |
| Production | 73 | Không có | 4 |
| Staging | 76 | `0067_tenant_lifecycle.sql` | 8 |
| Dev | 78 | Không có | 9 |

Production có bốn bản ghi ngoài `main`:

1. `0006_add_performance_indexes.sql`
2. `0061_unified_bundle_and_customization_schema.sql`
3. `0062_tenant_line_runtime.sql`
4. `0063_clean_customizations_and_category_links.sql`

Ba file `0061/0062/0063` tương ứng hiện diện trên `origin/dev`. Chưa xác minh nguồn và nội dung file `0006_add_performance_indexes.sql`; không kết luận ledger ngoài `main` là lỗi hoặc cho phép xóa.

Staging còn ghi nhận revision guard cũ và các migration cancellation ngoài `main`. Dev đã có ledger đến `0070`; không cấp số migration mới chỉ dựa vào số lớn nhất trên `main`. Danh sách đầy đủ lưu trong evidence JSON.

**Chặn R02 cho đến khi phân loại được các khác biệt schema liên quan và chuẩn bị migration đúng môi trường.** Không chạy apply tất cả pending migrations. Staging hiện không đại diện cho schema production; R01 cần kiểm thử trên baseline tương thích production, không lấy việc staging chạy được làm bằng chứng duy nhất.

## 4. Deploy đang chạy và mốc quay lui

### Production Worker

- Worker: `benmi-worker-official`.
- Deployment hiện hành: `ba908a4f-07d3-43f2-b3b0-a4a45154ab3b`.
- Version nhận 100% traffic: `bcfd87a2-632d-41c3-9fb8-e8ac2d6f481d`.
- Thời gian: 19/10/2026 20:25:21 JST.
- Version trước trong lịch sử: `06d9c565-8a8c-4e55-9f40-96bbad8a4935`.
- Metadata deployment không ghi Git SHA; chưa chứng minh Worker version tương ứng chính xác commit nào. Trùng thời gian với deploy frontend không đủ chứng minh cùng code.

### Production Pages

- Project: `benmi-order`; production branch: `main`.
- Deployment đang phục vụ: `bea91706-4e53-4ee1-b3b7-9936828580a8`.
- Git SHA: `512a642cde71a7a1626aa6d215fabbae858ae632`.
- Deploy thành công: 19/10/2026 20:25:11 JST.
- Deployment trước: `ccc409ff-fba1-4523-a7b2-1e65a973bbae`, commit `3fb69495be7146c7cfcb91374e07d605ec7fbe2e`.
- Domain project gồm `benmi-order.pages.dev`, `blabfood.app`, `explore.blabfood.app`, `order.blabfood.app`, `pos.blabfood.app`, `www.blabfood.app`.

Đây là mốc hiện trạng, chưa phải mốc rollback được kiểm thử với dữ liệu staff mới. Sau khi bắt đầu ghi staff, vẫn áp dụng giới hạn rollback tối thiểu đã nêu trong kế hoạch.

### Hai cơ chế auto-deploy production

1. Pages Git integration bật production deployment từ `main`; trigger gần nhất là `github:push`.
2. Workers Builds có trigger `36711d05-ab03-443b-808d-d445bac111da`, tên `Deploy default branch`, branch include `main`, path include `*`, root `/benmi-worker-official/`, deploy command **`npx wrangler deploy`**; không có dấu hiệu đã bị xóa (`deleted_on=null`).

Như vậy push vào `main` có thể kích hoạt cả hai hệ thống, kể cả commit chỉ thêm tài liệu vì path filter hiện là `*`. Không được coi merge vào `main` là hành động chỉ cập nhật Git.

Trigger backend đang lệch hướng dẫn `cf` trong repo. Trước release runtime đầu tiên cần một task riêng, được người dùng xác nhận, để chốt đường deploy theo `cf`, kiểm soát thời điểm triển khai và gắn artifact với Git SHA. R00 không sửa hoặc tắt trigger.

Pages bật preview cho tất cả branch (`preview_deployment_setting=all`, include `*`, không exclude). Frontend hiện suy môi trường từ hostname; preview có hostname không khớp dev/staging sẽ chọn API production. Không mở preview để thao tác ghi nếu chưa xác minh API đích. Không push nhánh R00 trước xác nhận vì push cũng tạo preview.

## 5. Công cụ và giới hạn kiểm chứng

Shell hiện dùng `/opt/homebrew/bin/node` v23.3.0, không hỗ trợ cách CLI tải config TypeScript hiện tại. Node 24 có sẵn tại `/Users/duccao/.nvm/versions/node/v24.22.0/bin/node`; các truy vấn thành công của R00 gọi trực tiếp Node này và CLI `cf` đã cài trong backend. Không đổi cấu hình Node toàn máy.

403 ban đầu của D1 không tái hiện ở các truy vấn sau; đã xác minh đăng nhập và truy vấn thành công cả ba môi trường. Không còn coi quyền D1 là blocker; không khẳng định nguyên nhân của lần 403 ban đầu.

R00 không chạy test mới vì chỉ thêm tài liệu. Kết quả ở giai đoạn lên kế hoạch: frontend static check, TypeScript và `npm test` đạt; test POS browser thiếu `playwright`. R01 phải chạy lại trên baseline riêng và lưu kết quả đầy đủ, không tái sử dụng kết quả cũ như kết quả của một release mới.

Không truy xuất PIN, bearer token, credential, nội dung món hoặc thông tin cá nhân của khách. Evidence chỉ giữ cấu hình deploy được chọn lọc, schema/ledger, tenant ID và số liệu tổng hợp staff.

## 6. Điểm cần chốt trước triển khai

| Điểm | Hành động tiếp theo | Cổng chặn |
| --- | --- | --- |
| Tenant demo đúng là `blab_demo` | Dùng ID này trong fixture/runbook; không đổi tên tenant | Trước bật bất kỳ capability nào |
| Staging bật staff ngoài demo và có hai đơn mở | Lập phương án giữ/đóng/xử lý riêng; trình người dùng trước thay đổi | Trước dùng staging cho QA rollout chỉ-demo |
| Ledger/schema khác nhau | Phân loại và kiểm tra baseline production; không apply hàng loạt | Trước R02 |
| Main không được bảo vệ bằng CI test hiện có | R01 bổ sung kiểm chứng và checklist; cấu hình protection là thao tác riêng nếu cần | Trước merge runtime |
| Worker auto-deploy còn dùng Wrangler | Task riêng xác nhận cấu hình `cf`, thứ tự schema/backend/frontend và gate deploy | Trước merge có tác động runtime |
| Pages preview có thể trỏ production | Kiểm tra endpoint trước QA; fixture test không dùng production | Trước thao tác trên preview |
| Worker chưa có liên kết Git SHA trong metadata | Gắn bằng chứng artifact/version/commit trong quy trình release | Trước release runtime |

R00 đủ bằng chứng để người dùng xét duyệt và cho phép chuẩn bị R01. Việc xác nhận R01 chỉ cho phép chuẩn bị baseline kiểm thử/checklist local, chưa cho phép push, sửa Cloudflare, migration hay bật tính năng.

Evidence máy đọc được: [r00-evidence.json](./r00-evidence.json). Theo dõi xác nhận và từng task: [release-tracker.md](./release-tracker.md).
