# Multi-Tenant Scalability & Architecture Rules (Quy Tắc Thiết Kế Mở Rộng 1,000+ Tenants)

Mọi kỹ sư và AI Agent khi phân tích, thiết kế hoặc viết code trên hệ thống Benmi Order BẮT BUỘC phải tuân thủ nghiêm ngặt các nguyên tắc kiến trúc sau:

### 1. Tuyệt Đối Không Hardcode Tenant & Category (Zero Hardcoding)
- **CẤM**: Viết các câu lệnh điều kiện `if (tenantId === 'benmi')`, `if (tenantId === 'zhadantongxue')` hoặc `if (slug === 'drinks')` trong cả Frontend và Backend.
- **CHUẨN HÓA**:
  - Mọi hành vi khác biệt giữa các quán phải được định nghĩa qua `tenant_config` (ví dụ `features`, `allow_dine_in`, `operating_hours`) hoặc các trường dữ liệu động trong Database D1.
  - Mọi hành vi của danh mục (như cho phép tùy biến hay không) phải đọc từ `allow_customization` hoặc `applied_modifiers` trong CSDL.

### 2. Tách Bạch Thực Thể Ngữ Nghĩa (No Semantic Overloading)
- **CẤM**: Nhồi nhét các thực thể kinh doanh khác nhau vào cùng một bảng hoặc cùng một cấu trúc dữ liệu nếu ngữ nghĩa của chúng khác nhau (ví dụ: gộp Option tùy biến vào bảng Món ăn để tiết kiệm bảng).
- **CHUẨN HÓA**:
  - Món ăn (`menu_items`) và Nhóm Tùy biến (`modifiers`) phải có mô hình quan hệ rõ ràng.
  - Sử dụng bảng liên kết (Junction Table) hoặc quan hệ Khóa ngoại rõ ràng khi mở rộng quan hệ Nhiều - Nhiều (N - N).

### 3. Mô Hình Kế Thừa Phân Tầng (Hierarchical Inheritance Pattern)
Khi thiết kế các tính năng cấu hình (như tùy biến món, phí dịch vụ, chính sách giảm giá, giờ phục vụ), luôn áp dụng mô hình 3 tầng:
1. **Cấp Quán (Tenant Global Level)**: Giá trị mặc định toàn cửa hàng.
2. **Cấp Loại Sản Phẩm (Category Level)**: Kế thừa từ Quán, cho phép ghi đè.
3. **Cấp Từng Món (Item/SKU Level)**: Kế thừa từ Loại, cho phép ghi đè riêng cho từng món ngoại lệ.

### 4. Tối Ưu Edge Cache & Database Performance (Cloudflare D1 + KV)
- Tách biệt rõ ràng:
  - **D1 Database**: Nguồn sự thật duy nhất (Single Source of Truth), thiết kế chuẩn hóa, có foreign keys, indexes đầy đủ theo `tenant_id`.
  - **Workers KV**: Tầng làm phẳng dữ liệu (Denormalized Cache) phục vụ khách hàng đọc Menu sub-millisecond (`tenant:{tenant_id}:bootstrap`).
- Mọi thao tác ghi/cập nhật vào CSDL D1 phải đi kèm cơ chế xóa/cập nhật cache (Cache Invalidation) an toàn và tức thì.
