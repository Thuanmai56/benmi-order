# Kế hoạch Tích hợp Frontend & Rollout (Frontend & Rollout Plan)

Tài liệu này trình bày thiết kế chi tiết giao diện người dùng (UI) trên Dashboard nhân viên (`orders.html`) và ứng dụng đặt hàng của khách (`index.html`), cùng với kế hoạch di chuyển dữ liệu (Data Migration) và kế hoạch dự phòng (Rollback).

---

## 1. Cải tiến Giao diện Dashboard Nhân viên (`orders.html`)

Nhân viên cần có giao diện trực quan để đánh dấu hết hàng và cấu hình thời hạn tự động hồi phục cho từng món ăn.

### 1.1. Luồng Giao diện (Mockup UI)

Trong màn hình quản trị menu (`orders.html` $\rightarrow$ Menu Editor), bên cạnh nút "Xóa" và "📷 Ảnh" của mỗi món ăn, chúng ta sẽ thêm một nút trạng thái kho hàng:

*   **Món đang còn hàng:** Hiển thị nút viền xanh lá `🟢 Còn hàng`.
*   **Món đang hết hàng:** Hiển thị nút nền đỏ `🔴 Hết hàng (đến sáng mai / đến ngày mai / vô thời hạn)`.

```
+---------------------------------------------------------------------------------+
| [☰] [ Bánh mì Thịt nướng Lớn               ]  [ $ ] [ 80 ]  [📷 Ảnh]  [🟢 Còn hàng] [Xóa] |
+---------------------------------------------------------------------------------+
                                                                       |
                                                                       v Click vào nút
+-------------------------------------------------------------+
| Cấu hình Trạng thái: Bánh mì Thịt nướng Lớn                   |
|                                                             |
| ( ) Còn hàng (In Stock)                                      |
| (o) Hết hàng hôm nay (Tự động mở lại vào 04:00 sáng mai)      |
| ( ) Hết hàng nhiều ngày (Chọn ngày mở lại bên dưới)           |
|     [ 2026-07-15 ] (Date Picker)                            |
| ( ) Hết hàng vô thời hạn (Chỉ mở lại khi bật thủ công)        |
|                                                             |
|                                       [ Hủy ] [ Lưu thay đổi ]|
+-------------------------------------------------------------+
```

---

## 2. Giao diện Thực đơn Khách hàng (`index.html`)

Khách hàng truy cập qua LINE LIFF cần thấy rõ món nào đã hết để tránh đặt nhầm.

### 2.1. Hiển thị ngoài Thực đơn chính
*   **Mục Menu hết hàng:**
    *   Làm mờ phần tử món ăn (độ mờ `opacity: 0.6` hoặc `0.5`).
    *   Thay thế nút giá tiền màu vàng bằng nhãn màu xám `Hết hàng`.
    *   Vô hiệu hóa sự kiện click vào món đó để không hiển thị popup thêm vào giỏ hàng.
*   **Mẫu CSS bổ sung:**
    ```css
    .item-card.sold-out {
        opacity: 0.65;
        pointer-events: none;
    }
    .item-card.sold-out .price-btn {
        background-color: #9ca3af !important; /* màu xám */
        color: #ffffff;
    }
    ```

### 2.2. Xử lý Topping và Đồ uống trong Popup Tùy chọn (Customize Modal)
Nếu khách hàng chọn một món còn hàng (ví dụ: Bánh mì size Lớn), nhưng một topping cụ thể (ví dụ: `Thịt nướng` thêm) đã hết hàng:
*   Phần tử `<option>` hoặc nút chọn topping tương ứng sẽ được đánh dấu là disabled.
*   Thêm hậu tố `(Hết hàng)` đằng sau tên topping đó (ví dụ: `Thịt nướng +$20 (Hết hàng)`).

---

## 3. Kế hoạch Dịch chuyển Dữ liệu (Data Migration Plan)

Vì hệ thống đang lưu dữ liệu trên KV, chúng ta cần di chuyển dữ liệu sang D1 theo các bước an toàn sau:

### Bước 1: Khởi tạo database D1 và tạo seed dữ liệu mặc định
Chúng ta sẽ viết một script seed (`/scripts/seed_menu_d1.sql`) để khởi tạo các danh mục và món ăn mặc định cho cửa hàng đầu tiên (`tenant_id = "thuanmai56"`):
```sql
-- Thêm cửa hàng mặc định
INSERT INTO tenants (id, name) VALUES ('thuanmai56', 'Benmi Bánh Mì Thừa Mai');

-- Thêm các danh mục gốc
INSERT INTO menu_categories (id, tenant_id, name, slug, sort_order) VALUES 
('cat_small', 'thuanmai56', 'Kích thước Nhỏ', 'small', 1),
('cat_large', 'thuanmai56', 'Kích thước Lớn', 'large', 2),
('cat_combo', 'thuanmai56', 'Combo kèm Nước', 'combo', 3),
('cat_drinks', 'thuanmai56', 'Đồ uống', 'drinks', 4),
('cat_topping', 'thuanmai56', 'Topping thêm', 'topping', 5);

-- Thêm các món ăn mẫu tương ứng với DEFAULT_MENU
-- (Sử dụng UUID cho menu_items trong script thực tế)
INSERT INTO menu_items (id, tenant_id, category_id, name, price, sort_order) VALUES
('mi_small_烤肉', 'thuanmai56', 'cat_small', '烤肉', 72.0, 1),
('mi_large_烤肉', 'thuanmai56', 'cat_large', '烤肉', 105.0, 1),
('mi_drink_coffee', 'thuanmai56', 'cat_drinks', '越南咖啡', 48.0, 1);
```

### Bước 2: Triển khai Middleware API thích ứng (Adapter)
*   Trong quá trình chuyển dịch, hàm `getMenu` sẽ thử đọc dữ liệu từ KV cache `tenant:thuanmai56:menu`.
*   Nếu không có, nó sẽ truy vấn D1 để lấy cấu trúc dữ liệu mới, định dạng lại thành cấu trúc JSON cũ (bao gồm mảng `out_of_stock`) rồi ghi vào KV.
*   Cơ chế này đảm bảo frontend cũ chưa được nâng cấp vẫn hoạt động bình thường 100% không bị crash.

---

## 4. Kế hoạch Dự phòng & Rollback (Rollback Plan)

Trong trường hợp D1 xảy ra lỗi quá tải, mất kết nối hoặc query timeout:

1.  **Cơ chế Fallback ở Backend:**
    Trong file `src/modules/menu.ts`, nếu khối lệnh try-catch khi truy vấn D1 bị lỗi:
    *   Bắt lỗi ngoại lệ (catch error).
    *   Tự động fallback đọc từ `DEFAULT_MENU` (JSON hardcoded trong code) hoặc đọc từ KV key cũ `menu:latest` dự phòng.
    *   Ghi log lỗi chi tiết về Cloudflare Observability để cảnh báo nhà phát triển.
2.  **Khôi phục trạng thái cũ (Revert):**
    Nếu muốn gỡ bỏ hoàn toàn D1 để quay lại KV:
    *   Đổi biến cờ cấu hình ở backend sang `USE_D1_MENU = false`.
    *   Backend sẽ chỉ đọc và viết trực tiếp vào KV key `menu:latest` như cũ.
