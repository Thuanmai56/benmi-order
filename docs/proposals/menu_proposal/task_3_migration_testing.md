# Nhiệm vụ 3: Di cư dữ liệu (Migration) & Kiểm thử

Tài liệu này đặc tả chi tiết kế hoạch di cư dữ liệu cấu hình/ảnh của tenant mặc định `benmi` và quy trình xác minh kiểm thử trên môi trường `test`.

---

## Danh sách Task nhỏ cần thực hiện

### [ ] Task 3.1: Di cư dữ liệu KV hiện tại cho Tenant `benmi`
*   **Mục tiêu:** Di chuyển cấu hình cửa hàng, danh mục ảnh, mật khẩu admin hiện tại của `benmi` sang cấu trúc khóa KV mới có tiền tố `tenant:benmi:` để dọn đường cho việc tắt chế độ kép (dual-mode).
*   **Các bước làm:**
    1.  Tải dữ liệu của các khóa KV hiện tại từ môi trường test bằng các lệnh wrangler:
        *   Cấu hình: `npx wrangler kv:key get --binding ORDER_STATE "store_config" --env test`
        *   Danh sách ảnh: `npx wrangler kv:key get --binding ORDER_STATE "image_list" --env test`
        *   Mật khẩu: `npx wrangler kv:key get --binding ORDER_STATE "dashboard:password" --env test`
    2.  Ghi lại dữ liệu đó vào các khóa mới:
        *   Cấu hình mới: `npx wrangler kv:key put --binding ORDER_STATE "tenant:benmi:config" "<nội dung>" --env test`
        *   Danh sách ảnh mới: `npx wrangler kv:key put --binding ORDER_STATE "tenant:benmi:image_list" "<nội dung>" --env test`
        *   Mật khẩu mới: `npx wrangler kv:key put --binding ORDER_STATE "tenant:benmi:password" "<nội dung>" --env test`
    3.  *(Tùy chọn)* Đối với hình ảnh vật lý: Do cơ chế fallback tự động tìm khóa `image:${name}` cũ nên không bắt buộc phải copy toàn bộ ảnh sang `tenant:benmi:image:${name}` ngay lập tức. Tuy nhiên, các ảnh tải lên mới sau này sẽ tự động lưu dưới định dạng khóa mới.

---

### [ ] Task 3.2: Quy trình Kiểm thử & Xác minh trên môi trường Test
Thực hiện chuỗi hành động sau để xác minh toàn bộ hệ thống hoạt động chính xác:

1.  **Kiểm tra lưu thực đơn (Menu Sync):**
    *   Truy cập Dashboard Admin của `test`, thực hiện sửa giá của một món ăn (ví dụ: món `綜合` đổi từ 79 thành 85).
    *   Bấm **Lưu thay đổi (Lưu Menu)**.
    *   Truy vấn D1 Database để kiểm tra xem giá đã được cập nhật chưa:
        ```bash
        npx wrangler d1 execute DB --remote --env test --command "SELECT price FROM menu_items WHERE name = '綜合' AND tenant_id = 'benmi';"
        ```
2.  **Kiểm tra bảo toàn trạng thái hết hàng (Sell-out preservation):**
    *   Trước khi sửa menu, hãy cài đặt một món ăn thành trạng thái **Hết hàng (Out of Stock)** (ví dụ: món `豆漿`).
    *   Tiến hành sửa giá một món khác và bấm **Lưu menu**.
    *   Tải lại trang Admin và kiểm tra xem món `豆漿` có bị mất trạng thái hết hàng hay không.
    *   Truy cập trang khách hàng (`index.html`), xác nhận món `豆漿` vẫn hiển thị màu xám mờ và có chữ `已售完 / Hết hàng`.
3.  **Kiểm tra cô lập KV (Tenant configuration):**
    *   Thao tác đổi giờ mở cửa trên Dashboard.
    *   Dùng Wrangler kiểm tra xem khóa KV `tenant:benmi:config` đã được cập nhật giá trị mới hay chưa:
        ```bash
        npx wrangler kv:key get --binding ORDER_STATE "tenant:benmi:config" --env test
        ```
