# R02 — Runbook apply một migration sau khi được xác nhận

**Tài liệu chuẩn bị; chưa chạy các lệnh ghi từ xa. Cần người dùng xác nhận riêng môi trường, commit và hash SQL trước mỗi lần apply.**

R02 chỉ bổ sung storage, code hiện tại chưa phụ thuộc cột mới. Chưa có bước bật flag hoặc capability. Không dùng các npm script apply toàn thư mục khi staging vẫn còn migration khác pending.

## Database và điều kiện trước apply

| Môi trường | Mode | Database ID |
| --- | --- | --- |
| Dev | `dev` | `40b67d8a-29e0-40c1-9ce2-b76f76864e95` |
| Staging | `test` | `c0152835-7d42-4545-8cb4-6658dfc7e97d` |
| Production | `production` | `48479f91-eec7-4da2-b044-edaaf622f195` |

Trước mỗi lần apply:

- Dùng Node 24 và `cf` từ backend lockfile; kiểm tra database binding đúng mode/ID.
- Lấy SQL từ đúng commit đã review; đối chiếu SHA-256 với evidence của commit đó.
- Kiểm tra lại số migration: nếu `0071` đã được dùng cho file khác trên một môi trường/nhánh thì dừng, cấp số mới và kiểm thử lại trước khi apply.
- Ghi snapshot master flags, số đơn staff đang mở và định nghĩa `tenant_config`/staff objects. Không đọc PIN/token hoặc nội dung đơn.
- Kiểm tra tên migration và cột bằng truy vấn chỉ đọc:

```sql
SELECT name, applied_at FROM d1_migrations
WHERE name = '0071_add_staff_ordering_capabilities.sql';

SELECT name, type, "notnull", dflt_value
FROM pragma_table_info('tenant_config')
WHERE name = 'staff_ordering_capabilities';

SELECT staff_ordering_enabled, COUNT(*) AS tenant_count
FROM tenant_config GROUP BY staff_ordering_enabled;
```

| Ledger | Cột | Quyết định |
| --- | --- | --- |
| Chưa có | Chưa có | Đủ điều kiện apply đúng file sau xác nhận |
| Đã có | Đã có | Kiểm tra định nghĩa/default/CHECK; nếu đúng thì không apply lại |
| Đã có | Chưa có | Dừng, điều tra drift |
| Chưa có | Đã có | Dừng, điều tra lần apply thủ công; không tự sửa ledger |

## Thực hiện một môi trường mỗi lượt

Thứ tự kiểm chứng: dev → staging → production. Mỗi lượt phải có xác nhận và đối soát xong trước lượt tiếp theo. Dưới đây chỉ là ví dụ cho **dev sau khi được duyệt**, chạy từ backend của đúng commit:

```sh
staff_migration_dir="$(mktemp -d)"
cp migrations/0071_add_staff_ordering_capabilities.sql "$staff_migration_dir/"

npx --no-install cf d1 migrations list 40b67d8a-29e0-40c1-9ce2-b76f76864e95 \
  --mode dev --dir "$staff_migration_dir"
```

Đối chiếu output: chỉ được có `0071_add_staff_ordering_capabilities.sql` chờ apply. Nếu có file khác hoặc thiếu file dự kiến, dừng. Sau đó dùng chính thư mục vừa kiểm tra:

```sh
npx --no-install cf d1 migrations apply 40b67d8a-29e0-40c1-9ce2-b76f76864e95 \
  --mode dev --dir "$staff_migration_dir"
```

CLI ghi tên file tương đối với thư mục được truyền vào ledger, nên giữ nguyên basename chính thức. Không chạy SQL riêng qua `d1 query` rồi bỏ qua ledger. Không tự chạy các migration thiếu ở staging cùng lượt này.

Cho staging/production phải có xác nhận mới, kiểm tra lại ID/mode và tạo lại thư mục chỉ có đúng file đã duyệt; không tái sử dụng một batch áp dụng cho cả ba môi trường.

## Đối soát sau apply

1. Ledger có đúng một bản ghi tên migration; cột là `TEXT NOT NULL DEFAULT '{}'` và DDL có CHECK JSON object.
2. Mọi config có capability `{}` ngay sau R02; master flags khớp snapshot trước apply. Hai master flag staging hiện có không được tự đổi.
3. Dữ liệu/bàn/session/request staff và định nghĩa index/trigger được giữ nguyên; nếu snapshot thay đổi, xác định nguyên nhân trước bước tiếp theo.
4. Kiểm tra endpoint đọc hiện có và CI tương thích. Không thử tạo đơn thật hoặc bật demo để test schema.
5. Ghi lại database, commit, SQL hash, ledger, kết quả và người xác nhận; dừng chờ xác nhận trước môi trường/task kế tiếp.

Nếu apply lỗi, kiểm tra lại cả cột và ledger trước retry. Không sửa migration đã chạy, drop cột, xóa ledger hoặc restore toàn D1 để xử lý lỗi R02. Code cũ tiếp tục hoạt động với cột bổ sung; rollback giữ schema và không bật quyền nào.
