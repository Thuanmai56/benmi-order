# Feature Cluster C: Quản lý Đơn hàng và Giao dịch (Orders) - Direct Switch-Out

Nhiệm vụ này là phần cốt lõi và quan trọng nhất, di chuyển toàn bộ dữ liệu đơn hàng và cơ chế lập chỉ mục từ KV sang D1 để đạt được tính nhất quán mạnh, phân vùng tenant an toàn và cho phép truy vấn báo cáo SQL phức tạp. 

Theo yêu cầu, cụm tính năng này sẽ **không áp dụng cơ chế ghi song song (dual-write)** mà thực hiện di chuyển dữ liệu và chuyển đổi trực tiếp (Direct Switch-Out).

---

## Task C.1: Thiết lập SQL Schema bảng Orders [DONE]

1. **[x] Viết SQL Migration**
   * Tạo file migration `0005_create_orders_table.sql` (tuân theo thứ tự tuần tự tiếp theo của thư mục migrations):
     ```sql
     CREATE TABLE orders (
         key TEXT PRIMARY KEY,
         tenant_id TEXT NOT NULL,
         user_id TEXT,
         customer_name TEXT NOT NULL,
         pickup_time TEXT NOT NULL,
         status TEXT NOT NULL DEFAULT 'NEW',
         total_amount REAL NOT NULL CHECK(total_amount >= 0),
         order_content TEXT NOT NULL, -- Chi tiết món ăn (chuỗi văn bản hoặc JSON)
         reason TEXT DEFAULT '',
         note TEXT DEFAULT '',
         created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
         updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
         FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
     );
     CREATE INDEX idx_orders_tenant_created ON orders(tenant_id, created_at DESC);
     CREATE INDEX idx_orders_tenant_status ON orders(tenant_id, status);
     CREATE INDEX idx_orders_user ON orders(user_id);
     ```
2. **[x] Chạy migrations**:
   * [x] Đã áp dụng ở môi trường phát triển cục bộ (`--local`).
   * [x] Đã chạy áp dụng thành công lên các database remote (`test` và `production`):
     ```bash
     npx wrangler d1 migrations apply DB --remote --env test
     npx wrangler d1 migrations apply DB --remote
     ```

---

## Task C.2: Refactor Code Backend (Chuyển đổi trực tiếp) [DONE]

Chúng ta sửa đổi toàn bộ các tham chiếu KV của Đơn hàng trong code thành các câu lệnh SQL trực tiếp trên D1.

*   **[x] API Tạo/Lưu đơn hàng (`saveOrder` trong [orders.ts](file:///Users/duccao/Documents/benmi-order/benmi-worker-official/src/modules/orders.ts))**:
    *   Loại bỏ hoàn toàn các lệnh `env.ORDER_STATE.put` và `order_view:cache`.
    *   Chỉ thực hiện lệnh chèn/cập nhật trực tiếp vào bảng `orders` của D1:
        ```typescript
        await env.DB.prepare(
          `INSERT INTO orders (key, tenant_id, user_id, customer_name, pickup_time, status, total_amount, order_content, reason, note, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
           ON CONFLICT(key) DO UPDATE SET
             status = excluded.status,
             total_amount = excluded.total_amount,
             order_content = excluded.order_content,
             reason = excluded.reason,
             note = excluded.note,
             updated_at = datetime('now')`
        ).bind(order.key, tenantId, order.userId || null, order.customer, order.time, order.status, order.total, order.content, order.reason || "", order.note || "").run();
        ```

*   **[x] API Lấy danh sách đơn hàng (`getOrders` trong [orders.ts](file:///Users/duccao/Documents/benmi-order/benmi-worker-official/src/modules/orders.ts))**:
    *   Loại bỏ hoàn toàn logic đọc chỉ mục từ KV và luồng `Promise.all` fetch song song.
    *   Chỉ thực hiện câu lệnh SELECT duy nhất từ D1:
        ```typescript
        const { results } = await env.DB.prepare(
          "SELECT * FROM orders WHERE tenant_id = ? ORDER BY created_at DESC LIMIT 200"
        ).bind(tenantId).all<any>();
        ```
    *   Map kết quả từ D1 sang định dạng interface `Order` cũ để giữ tính tương thích ngược với Frontend.

*   **[x] API Webhook LINE ([line.ts](file:///Users/duccao/Documents/benmi-order/benmi-worker-official/src/modules/line.ts))**:
    *   Sửa đổi hàm webhook tại các đoạn đọc đơn hàng `env.ORDER_STATE.get("order:" + orderKey)` thành truy vấn D1 SQL.
    *   Gỡ bỏ hoàn toàn logic fallback KV cho pending actions và sử dụng bảng D1 `pending_actions` trực tiếp.

---

## Task C.3: Backfill dữ liệu & Bàn giao (Cutover) [IN PROGRESS]

1. **[x] Chuẩn bị và Chạy Script Backfill**:
   * Đã viết endpoint `/api/migrate/orders-kv-to-d1` để tự động quét toàn bộ KV (`order:`) và đẩy sang D1 qua phương thức `INSERT OR IGNORE`.
   * Đã kiểm thử chạy thành công trên local, sẵn sàng chạy trên môi trường thực tế sau khi deploy.
2. **[ ] Triển khai Code mới (Deploy & Cutover)**:
   * Deploy phiên bản backend đã refactor lên Production (User thực hiện lệnh `wrangler deploy` khi có quyền truy cập Cloudflare CLI).
   * Chạy gọi link để thực hiện backfill đơn hàng cũ sang D1: `https://<prod-worker-domain>/api/migrate/orders-kv-to-d1?secret=benmi_migrate_2026`
3. **[ ] Dọn dẹp tài nguyên**:
   * Sau khi chạy ổn định 1-2 ngày, thực hiện xóa các khoá cũ trên KV để giải phóng tài nguyên.

---

## Hướng dẫn xác minh (Verification Plan) [VERIFIED LOCAL]
1. [x] Xác nhận các đơn hàng cũ trong lịch sử hiển thị đầy đủ trên Dashboard Admin sau khi chạy script backfill (Đã xác minh qua mock KV local).
2. [x] Tạo đơn hàng mới từ LINE Webhook và cập nhật trạng thái, xác nhận dữ liệu được ghi trực tiếp vào D1 và không còn khóa `order:*` mới nào tạo trên KV (Đã kiểm tra luồng API).
