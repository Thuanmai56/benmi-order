# Seeds & Tenant Data Provisioning

Thư mục `seeds/` chứa các script SQL tạo dữ liệu cho hệ thống:
1. **`seeds/tenants/`**: Dữ liệu thực đơn và cấu hình gốc của từng quán đối tác (`seeds/tenants/<tenant_id>.sql`).
2. **`seeds/*.sql`**: Dữ liệu giả lập (đơn hàng test, mock data) phục vụ kiểm thử môi trường nội bộ (**Dev / Staging / Local**).

> [!IMPORTANT]
> **Quy tắc phân tách kiến trúc**:
> - Thư mục `migrations/` **chỉ dành riêng** cho cấu trúc bảng (DDL schema: tạo bảng, thêm cột, index, bundle rules schema...).
> - Toàn bộ dữ liệu menu và cấu hình quán mới được lưu trữ tại `seeds/tenants/<tenant_id>.sql` để tránh làm phình thư mục migration và tránh xung đột số thứ tự migration khi mở rộng 1,000+ quán.

---

## 1. Nạp Thực Đơn Quán (Tenant Seeding)

Các file trong `seeds/tenants/` được thiết kế theo dạng **Idempotent** (`INSERT ... ON CONFLICT DO UPDATE`), có thể chạy nhiều lần an toàn mà không làm nhân bản dữ liệu:

```bash
# Nạp vào Dev:
echo "y" | npx wrangler d1 execute blab-db-dev --remote --env dev --file=seeds/tenants/<tenant_id>.sql

# Nạp vào Staging (Test):
echo "y" | npx wrangler d1 execute blab-db-test --remote --env test --file=seeds/tenants/<tenant_id>.sql

# Nạp vào Production:
echo "y" | npx wrangler d1 execute blab-db-production --remote --file=seeds/tenants/<tenant_id>.sql

# Làm mới KV Cache sau khi seed:
npx wrangler kv key delete --remote --namespace-id=<namespace_id> "tenant:<tenant_id>:bootstrap"
```

---

## 2. Nạp Dữ Liệu Test / Đơn Hàng Giả Lập (QA Mock Data)

```bash
# Nạp đơn hàng mẫu combo cho quán 蔣姐姐 (jiangjiejie) vào Dev:
npx wrangler d1 execute blab-db-dev --remote --env dev --file=seeds/seed_jiangjiejie_bundle_orders.sql

# Nạp vào database local:
npx wrangler d1 execute DB --local --file=seeds/seed_jiangjiejie_bundle_orders.sql

# Dọn dẹp dữ liệu test mẫu nếu cần:
npx wrangler d1 execute blab-db-dev --remote --env dev --command="DELETE FROM order_items WHERE tenant_id = 'jiangjiejie' AND order_key LIKE 'J0916-%'; DELETE FROM orders WHERE tenant_id = 'jiangjiejie' AND key LIKE 'J0916-%';"
```
