# Development & QA Seed Scripts

Thư mục này chứa các script SQL tạo dữ liệu mẫu phục vụ kiểm thử môi trường nội bộ (**Dev / Staging / Local**).

> [!WARNING]
> **Tuyệt đối không đưa các file seed đơn hàng (transactional mock data) vào thư mục `migrations/`**.
> Thư mục `migrations/` chỉ dành riêng cho cấu trúc bảng (DDL schema) và danh mục quán/menu gốc của hệ thống. Đưa đơn hàng giả lập vào `migrations/` sẽ khiến môi trường Production bị lẫn lộn dữ liệu đơn hàng thực tế của đối tác quán.

---

## Cách chạy Script Seed

### 1. Nạp đơn hàng mẫu combo cho quán 蔣姐姐 (`jiangjiejie`)
```bash
# Nạp vào database dev từ xa:
npx wrangler d1 execute blab-db-dev --remote --env dev --file=seeds/seed_jiangjiejie_bundle_orders.sql

# Nạp vào database local:
npx wrangler d1 execute DB --local --file=seeds/seed_jiangjiejie_bundle_orders.sql
```

### 2. Dọn dẹp dữ liệu test mẫu nếu cần
```bash
npx wrangler d1 execute blab-db-dev --remote --env dev --command="DELETE FROM order_items WHERE tenant_id = 'jiangjiejie' AND order_key LIKE 'J0916-%'; DELETE FROM orders WHERE tenant_id = 'jiangjiejie' AND key LIKE 'J0916-%';"
```
