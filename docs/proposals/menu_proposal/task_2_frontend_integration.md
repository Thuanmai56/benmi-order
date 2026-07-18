# Nhiệm vụ 2: Tích hợp Frontend & Truyền tham số Tenant

Tài liệu này đặc tả chi tiết các đầu việc sửa đổi mã nguồn Frontend (`orders.html` và `index.html`) để đảm bảo truyền tham số `tenant_id` chính xác khi tương tác với các API của Worker.

---

## Danh sách Task nhỏ cần thực hiện

### [ ] Task 2.1: Đồng bộ hóa tham số Tenant trên Admin Dashboard (`orders.html`)
*   **Mục tiêu:** Giao diện quản lý Admin phải gọi chính xác các API tương ứng với cửa hàng/tenant của họ.
*   **Các bước làm:**
    1.  Viết hàm helper `getTenantIdFromUrl()` ở đầu thẻ `<script>` trong `orders.html` để trích xuất `tenant_id` từ query parameter:
        ```javascript
        function getTenantIdFromUrl() {
            const params = new URLSearchParams(window.location.search);
            return params.get("tenant_id") || "benmi"; // mặc định là benmi
        }
        ```
    2.  Tìm kiếm tất cả các lệnh gọi `fetch` đến API `/api/...` trong `orders.html`.
    3.  Bổ sung tham số `tenant_id` vào URL của các API sau:
        *   Tải cấu hình: `/api/config?tenant_id=${getTenantIdFromUrl()}`
        *   Lưu cấu hình: `/api/config?tenant_id=${getTenantIdFromUrl()}` (gửi POST)
        *   Tải danh sách ảnh: `/api/image_list?tenant_id=${getTenantIdFromUrl()}`
        *   Tải menu: `/api/menu?tenant_id=${getTenantIdFromUrl()}`
        *   Lưu menu: `/api/menu?tenant_id=${getTenantIdFromUrl()}` (gửi POST)
        *   Báo hết hàng (Stock Status Update): `/api/menu/stock-status?tenant_id=${getTenantIdFromUrl()}`
        *   Tải và Đăng nhập Admin / Đổi mật khẩu / Đăng xuất: Đảm bảo có đính kèm tham số `tenant_id`.

---

### [ ] Task 2.2: Đồng bộ hóa tham số Tenant trên Giao diện Khách hàng (`index.html`)
*   **Mục tiêu:** Trang gọi món của khách hàng hiển thị đúng Menu, Hình ảnh và Giờ mở cửa của cửa hàng đó.
*   **Các bước làm:**
    1.  Tận dụng hàm helper `getTenantIdFromUrl()` có sẵn hoặc viết mới tương tự như trong `orders.html`.
    2.  Bổ sung tham số `tenant_id` vào cuộc gọi fetch API trong hàm `fetchMenu()`:
        *   `fetch(`${WORKER_BASE}/api/menu?tenant_id=${tenantId}`)`
        *   `fetch(`${WORKER_BASE}/api/image_list?tenant_id=${tenantId}`)`
        *   `fetch(`${WORKER_BASE}/api/config?tenant_id=${tenantId}`)`
