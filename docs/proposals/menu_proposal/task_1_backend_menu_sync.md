# Nhiệm vụ 1: Triển khai Backend API & Smart D1 Menu Sync

Tài liệu này đặc tả chi tiết các đầu việc sửa đổi mã nguồn Worker (Backend) để thực hiện đồng bộ menu thông minh vào D1 Database và cô lập khóa KV theo từng Tenant.

---

## Danh sách Task nhỏ cần thực hiện

### [ ] Task 1.1: Đồng bộ Menu thông minh trong `updateMenu` (`src/modules/menu.ts`)
*   **Mục tiêu:** Nhận payload JSON từ Admin, cập nhật vào D1 và bảo toàn trường `out_of_stock_until` của các món ăn hiện tại.
*   **Các bước làm:**
    1.  Nhận request `POST /api/menu`, trích xuất `tenantId` bằng `getTenantId(request)`.
    2.  Đọc payload JSON. Ví dụ:
        ```json
        {
          "small": { "燒肉": 56, "火腿": 56 },
          "large": { "燒肉": 80 }
        }
        ```
    3.  Lập danh sách tất cả các category slug (ví dụ: `small`, `large`) và tên món ăn (ví dụ: `燒肉`, `火腿`).
    4.  Tạo Batch Query trong D1:
        *   **Bước 4a (Upsert Categories):** Với mỗi category, chèn hoặc cập nhật:
            ```sql
            INSERT INTO menu_categories (tenant_id, name, slug, sort_order)
            VALUES (?, ?, ?, ?)
            ON CONFLICT(tenant_id, slug) DO UPDATE SET name = excluded.name, sort_order = excluded.sort_order;
            ```
        *   **Bước 4b (Upsert Items):** Với mỗi món ăn, chèn hoặc cập nhật giá/thứ tự sắp xếp:
            ```sql
            INSERT INTO menu_items (tenant_id, category_id, name, price, sort_order)
            VALUES (?, ?, ?, ?, ?)
            ON CONFLICT(tenant_id, category_id, name) DO UPDATE SET price = excluded.price, sort_order = excluded.sort_order;
            -- KHÔNG cập nhật out_of_stock_until để bảo toàn trạng thái hết hàng của món
            ```
        *   **Bước 4c (Delete absent items):** Xóa các món thuộc tenant hiện tại không còn xuất hiện trong payload:
            ```sql
            DELETE FROM menu_items WHERE tenant_id = ? AND name NOT IN (?1, ?2, ?3, ...);
            ```
        *   **Bước 4d (Delete absent categories):** Xóa các category không còn xuất hiện trong payload:
            ```sql
            DELETE FROM menu_categories WHERE tenant_id = ? AND slug NOT IN (?1, ?2, ...);
            ```
    5.  Thực hiện chạy Batch Query qua `await env.DB.batch([...])`.
    6.  Xóa cache KV: `await env.ORDER_STATE.delete(`tenant:${tenantId}:menu`)`.

---

### [ ] Task 1.2: Cô lập Cấu hình trong `config.ts` (`src/modules/config.ts`)
*   **Mục tiêu:** Chuyển đổi khóa đọc/ghi cấu hình từ tĩnh sang động theo tenant.
*   **Các bước làm:**
    1.  Trong hàm `getConfig(request, env)`:
        *   Trích xuất `tenantId = getTenantId(request)`.
        *   Thực hiện đọc khóa mới: `await env.ORDER_STATE.get(`tenant:${tenantId}:config`)`.
        *   **Fallback (Tương thích ngược):** Nếu kết quả trả về là null và `tenantId` là `"benmi"`, thực hiện đọc khóa cũ `"store_config"` và tự động sao chép sang khóa mới để di trú dữ liệu ngầm.
    2.  Trong hàm `updateConfig(request, env)`:
        *   Trích xuất `tenantId = getTenantId(request)`.
        *   Thực hiện ghi vào khóa mới: `await env.ORDER_STATE.put(`tenant:${tenantId}:config`, data)`.

---

### [ ] Task 1.3: Cô lập Ảnh trong `image.ts` (`src/modules/image.ts`)
*   **Mục tiêu:** Phân tách danh sách ảnh và các file ảnh tải lên theo từng Tenant.
*   **Các bước làm:**
    1.  Trong hàm `getImageList`:
        *   Đọc từ khóa KV `tenant:${tenantId}:image_list`.
        *   **Fallback:** Nếu rỗng và tenant là `"benmi"`, đọc từ `"image_list"`.
    2.  Trong các hàm upload/delete ảnh:
        *   Ghi danh sách ảnh vào `tenant:${tenantId}:image_list`.
        *   Ghi dữ liệu binary của ảnh vào khóa: `tenant:${tenantId}:image:${imageName}`.
        *   **Fallback đọc ảnh:** Khi gọi ảnh, nếu không tìm thấy `tenant:${tenantId}:image:${name}`, thử tìm theo khóa cũ `image:${name}`.

---

### [ ] Task 1.4: Cô lập Mật khẩu trong `auth.ts` (`src/modules/auth.ts`)
*   **Mục tiêu:** Đảm bảo mỗi tenant/cửa hàng có một mật khẩu đăng nhập Admin riêng biệt.
*   **Các bước làm:**
    1.  Trong hàm kiểm tra mật khẩu (login):
        *   Đọc từ khóa KV `tenant:${tenantId}:password`.
        *   **Fallback:** Nếu không có, đọc từ khóa cũ `"dashboard:password"`.
    2.  Trong hàm đổi mật khẩu:
        *   Ghi mật khẩu mới vào khóa KV `tenant:${tenantId}:password`.
