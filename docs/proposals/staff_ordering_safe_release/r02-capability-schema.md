# R02 — Schema capability staff mặc định đóng

Ngày chuẩn bị: 20/10/2026 JST. Nhánh `codex/staff-order-r02-capabilities`, worktree riêng từ `main` commit `c35c3332c95becaef9f523f0e9380c18321f0fb3`.

**Người dùng đã xác nhận commit/push ngày 22/10/2026 JST. Phạm vi R02 chỉ thêm schema capability; chưa cho phép tạo PR, merge, deploy thủ công hoặc apply migration từ xa. Chưa bắt đầu R03. Push có thể kích hoạt preview tự động.**

R01 đã merge qua [PR #74](https://github.com/Thuanmai56/benmi-order/pull/74), commit `f31de7f`; [CI sau merge](https://github.com/Thuanmai56/benmi-order/actions/runs/39266633555) thành công. Main hiện có thêm PR #76 (ReportRepository), đã được giữ trong base R02. Workspace chính đang ở `dev` nên R02 không checkout hoặc sửa nhánh đó.

## Thay đổi

Migration `0071_add_staff_ordering_capabilities.sql` chỉ thêm một cột vào `tenant_config`:

```sql
staff_ordering_capabilities TEXT NOT NULL DEFAULT '{}'
CHECK (
    json_valid(staff_ordering_capabilities)
    AND json_type(staff_ordering_capabilities) = 'object'
)
```

- Mọi tenant hiện có và tenant mới đều nhận `{}` khi không chỉ định giá trị.
- Giữ nguyên `staff_ordering_enabled`, dữ liệu đơn, bàn, session, idempotency request, indexes và triggers.
- Chặn NULL, JSON lỗi, array và scalar JSON. Kiểm tra tên capability và giá trị boolean thuộc R03; R02 chưa triển khai guard/API.
- Không sửa migration `0057`, không thêm trigger revision, không bật demo hoặc thay master flag staging.
- Có thể giữ schema này khi quay về code cũ. Không cần drop cột hoặc restore database để rollback code.

Quyền dự kiến cho R03 vẫn là `session`, `tables_read`, `tables_write`, `orders_read`, `create`, `append`, `status`, `pos_entry`, `auto_print_new`, `auto_print_round`; thiếu key phải được ứng dụng coi là đóng. R02 chưa lưu key nào cho tenant thực.

## Đối chiếu chênh lệch schema R00

Đã truy vấn lại cả ba database bằng `cf`/Node 24; mọi batch thành công ghi nhận `rows_written=0`, `changed_db=false`.

| Môi trường | Cờ hiện tại | Cột mới | Ledger so với main |
| --- | --- | --- | --- |
| Production | 14 tenant đóng; 0 đơn staff | Chưa có | Không pending main; 4 tên ngoài main |
| Staging/test | 12 đóng, 2 bật (`bsc`, `jiangjiejie`); 2 đơn ACCEPTED còn mở | Chưa có | Còn thiếu `0067_tenant_lifecycle.sql`; 8 tên ngoài main |
| Dev | 14 tenant đóng; 0 đơn staff | Chưa có | Không pending main; 9 tên ngoài main, cao nhất `0070` |

`blab_demo` tồn tại và đóng ở cả ba môi trường. `0057` đã chạy ở cả ba; chưa nơi nào ghi nhận migration `0071`.

Phân loại các khác biệt liên quan:

- `0006_add_performance_indexes.sql`: tìm được commit đổi tên `1e1c084`; nội dung giống hệt `0007_add_performance_indexes.sql` trong main. Không apply lại hoặc xóa ledger cũ.
- `0061_unified_bundle_and_customization_schema.sql`: schema modifier/menu; không thay `tenant_config` hay capability.
- `0062_tenant_line_runtime.sql`: hai bảng LINE runtime/probe; không thay `tenant_config`.
- `0063_clean_customizations_and_category_links.sql`: modifier/category và dữ liệu menu; không được chạy kèm R02.
- Staging có thêm ba cột cancellation trong `tenant_config` và trigger revision cũ. Dev có schema menu riêng đến `0070`. Các phần này được giữ nguyên; migration R02 được test với đúng DDL `tenant_config` và các object staff quan sát được ở từng môi trường.

Đã xác minh đủ điều kiện chuẩn bị **DDL độc lập của R02**. Điều này không đồng bộ staging thành production hoặc cho phép apply hàng loạt migration pending. Lifecycle staging, hai cờ bật ngoài demo và pipeline preview vẫn cần xử lý trước QA các chức năng staff ở R03 trở đi.

## Kiểm chứng local

- Test D1 thật bằng Miniflare với fixture schema của production/staging/dev, chỉ seed dữ liệu tổng hợp: **21 Node tests đạt** (3 nhóm môi trường × 6 ca con, gồm 3 test cha).
- Kiểm tra defaults, bảo toàn dữ liệu/cờ/schema objects, insert/update kiểu cũ, dữ liệu JSON lỗi, D1 batch rollback và reapply nhầm không ghi đè dữ liệu.
- Bộ 19 ca order identity/legacy Worker chạy sau cả `0057` và `0071`, để kiểm chứng code cũ trên schema mở rộng.
- Đã thêm suite schema vào `npm run test:release`; tổng baseline R02 là **18 suite**, gồm Chromium/WebKit.
- Runner ghi fingerprint cả migration mới chưa được Git track, để bằng chứng local không bỏ sót SQL đang review.

Kết quả cuối, hash SQL/fixture và các log được ghi trong `r02-evidence.json`; full preflight và log nằm dưới `artifacts/release-baseline/` (ngoài Git). Fixture chỉ chứa định nghĩa schema; không chứa bản ghi tenant, PIN, token hay credential.

## Các cổng tiếp theo

1. Người dùng đã duyệt commit/push nhánh ngày 22/10/2026; push có thể kích hoạt Pages/Worker preview.
2. CI trên PR phải đạt trên đúng head và main mới nhất trước merge.
3. Apply schema cần xác nhận riêng cho từng môi trường, dùng thư mục chỉ có đúng migration `0071` và kiểm tra ledger trước/sau theo [runbook](./r02-apply-runbook.md).
4. R03 chỉ được triển khai vào môi trường đã xác minh có cột đúng schema. Không tự chuyển task hoặc bật capability.

SQLite kiểm tra CHECK mới khi thêm cột; default `{}` hợp lệ trên mọi hàng hiện tại. Tham khảo [SQLite ALTER TABLE](https://www.sqlite.org/lang_altertable.html), [D1 JSON](https://developers.cloudflare.com/d1/sql-api/query-json/) và [D1 migration ledger](https://developers.cloudflare.com/d1/reference/migrations/).
