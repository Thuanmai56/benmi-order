# Thiết kế API & Logic Báo Hết Hàng (Out-of-Stock API Design)

Tài liệu này mô tả chi tiết các API endpoints, cấu trúc dữ liệu JSON, logic truy vấn SQL tính toán trạng thái còn/hết hàng thời gian thực, và chiến lược quản lý bộ nhớ đệm Cloudflare KV.

---

## 1. Danh sách API Endpoints

### 1.1. Lấy thông tin Thực đơn (GET `/api/menu`)
*   **Mục đích:** Khách hàng hoặc Dashboard lấy thực đơn đầy đủ kèm theo trạng thái hết hàng.
*   **Xác thực:** Không (Public API). Tenant được nhận diện qua hostname/subdomain.
*   **Cấu trúc dữ liệu phản hồi (JSON):**
    Để đảm bảo tính tương thích ngược (backward compatibility) với mã nguồn hiện tại, cấu trúc danh mục món ăn cũ được giữ nguyên, đồng thời bổ sung thêm trường `out_of_stock` chứa danh sách các món đang tạm thời hết hàng (dạng `"slug:name"`):
    ```json
    {
      "small": {
        "燒肉": 56,
        "火腿": 56,
        "雞肉": 68
      },
      "large": {
        "燒肉": 80,
        "火腿": 80
      },
      "combo": {
        "1 大燒肉+飲料": 90,
        "2 大火腿+飲料": 90
      },
      "drinks": {
        "越南咖啡": 48,
        "豆漿": 37
      },
      "topping": {
        "起司": 15,
        "火腿": 20
      },
      "out_of_stock": [
        "small:燒肉",
        "large:燒肉",
        "combo:1 大燒肉+飲料"
      ]
    }
    ```

### 1.2. Cập nhật Trạng thái Hết hàng (POST `/api/menu/stock-status`)
*   **Mục đích:** Nhân viên cập nhật trạng thái còn/hết hàng cho một mục thực đơn (`menu_item`).
*   **Xác thực:** Yêu cầu đăng nhập (Middleware Auth kiểm tra `templink` hoặc Token của nhân viên thuộc tenant).
*   **Dữ liệu yêu cầu (JSON Payload):**
    ```json
    {
      "menu_item_id": "8a7b6c5d-4e3f-2a1b-0c9d-8e7f6a5b4c3d",
      "status": "out_of_stock", // "in_stock" | "out_of_stock"
      "duration": "today", // "today" | "multiple_days" | "indefinite" (chỉ gửi khi status là out_of_stock)
      "until_date": "2026-07-15T00:00:00Z" // (chỉ gửi khi duration là multiple_days)
    }
    ```
*   **Dữ liệu phản hồi:**
    ```json
    {
      "success": true,
      "message": "Cập nhật trạng thái kho hàng món ăn thành công và đã đồng bộ cache."
    }
    ```

---

## 2. Logic tính toán trạng thái khả dụng trên D1 (SQL)

Khi tính toán xem một món ăn có thể đặt được hay không, chúng ta chỉ cần kiểm tra thời hạn hết hàng (`out_of_stock_until`) của chính món ăn đó so với thời gian hiện tại (`CURRENT_TIMESTAMP`).

Dưới đây là câu lệnh SQL kiểm tra trạng thái của thực đơn cho một cửa hàng (`tenant_id`):

```sql
SELECT 
    mi.id AS item_id,
    mi.name AS item_name,
    mi.price,
    mc.slug AS category_slug,
    -- Kiểm tra hết hàng trực tiếp tại món ăn
    (mi.out_of_stock_until IS NOT NULL AND mi.out_of_stock_until > datetime('now')) AS is_oos
FROM menu_items mi
JOIN menu_categories mc ON mi.category_id = mc.id
WHERE mi.tenant_id = ?;
```

---

## 3. Logic Xử lý Thời gian Hết hàng (Backend Handler)

Khi nhận yêu cầu cập nhật trạng thái hết hàng từ Dashboard, Backend sẽ tính toán mốc thời gian lưu vào DB D1 như sau:

1.  **Hết hàng hôm nay (`duration = "today"`):**
    *   Tự động tính toán mốc thời gian là **04:00 AM sáng ngày hôm sau** (theo múi giờ của quán ăn, ví dụ GMT+7 cho Việt Nam hoặc GMT+9 cho Nhật Bản).
    *   *Lý do chọn 04:00 AM:* Tránh trường hợp quán bán muộn qua nửa đêm (đến 01:00 AM) bị phục hồi tự động giữa ca làm việc.
2.  **Hết hàng nhiều ngày (`duration = "multiple_days"`):**
    *   Lấy giá trị `until_date` gửi lên từ Client và chuyển đổi thành định dạng ISO 8601 DATETIME.
3.  **Hết hàng vô thời hạn (`duration = "indefinite"`):**
    *   Lưu giá trị xa trong tương lai: `9999-12-31 23:59:59`.
4.  **Còn hàng (`status = "in_stock"`):**
    *   Đặt giá trị cột `out_of_stock_until` thành `NULL` (món ăn sẵn sàng hoạt động ngay lập tức).

---

## 4. Chiến lược Quản lý Bộ nhớ đệm (KV Caching & Invalidation)

Để đảm bảo hiệu năng tối ưu (menu tải dưới 50ms) và tiết kiệm chi phí D1:

1. **Khóa Cache (Cache Key):**
   * Định dạng khóa: `tenant:${tenant_id}:menu`
2. **Quy trình Đọc (GET Menu):**
   * Đọc từ KV trước $\rightarrow$ Có dữ liệu $\rightarrow$ Trả về ngay lập tức.
   * Nếu Cache Miss $\rightarrow$ Truy vấn D1 $\rightarrow$ Tạo cấu trúc JSON $\rightarrow$ Lưu vào KV $\rightarrow$ Trả về Client.
3. **Quy trình Ghi (POST Update Stock):**
   * Lưu trạng thái mới vào D1.
   * Xóa/Invalidate khóa cache tương ứng trên KV (`env.ORDER_STATE.delete("tenant:${tenant_id}:menu")`).
   * *Mẹo tối ưu:* Ngay sau khi xóa, thực hiện một lệnh chạy ngầm (asynchronous) để tái tạo JSON mới và ghi đè vào KV để khách hàng tiếp theo truy cập không bị trễ (Cold-start mitigation).
4. **Xử lý Cache Stale do Hết hạn Tự động:**
   * Khi ghi dữ liệu vào KV, chúng ta thiết lập tham số `expirationTtl`.
   * Thời gian hết hạn của cache sẽ bằng:
     $$\text{TTL} = \min(\text{Thời gian đến điểm phục hồi sớm nhất của các món}, 3600 \text{ giây})$$
   * Nếu không có món nào hết hàng tạm thời, đặt TTL mặc định là 3600 giây (1 giờ).
   * Cơ chế này đảm bảo khi đến giờ mở bán lại (ví dụ sau 04:00 AM), cache sẽ tự động hết hạn và tải dữ liệu mới từ D1 lên, không xảy ra hiện tượng dữ liệu cũ bị kẹt.
