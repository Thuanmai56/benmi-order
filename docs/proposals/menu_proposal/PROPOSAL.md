# PDP: Menu Synchronization & Multi-Tenant Isolation [Overview]

Tài liệu này đề xuất thiết kế kiến trúc nâng cấp hệ thống để đồng bộ thực đơn từ Dashboard Admin vào D1 Database, đảm bảo an toàn trạng thái hết hàng (Sell out), và cô lập hoàn toàn cấu hình, hình ảnh, mật khẩu giữa các Tenant.

Chi tiết kế hoạch được chia thành các nhiệm vụ cụ thể trong thư mục này:

---

## 1. Executive Summary & Objectives

### Problem Statement
Hiện tại hệ thống đang tồn tại 2 vấn đề lớn về kiến trúc:
1.  **Lưu lệch Menu (Out of Sync):** Khi admin lưu thay đổi thực đơn trên giao diện quản lý, API chỉ cập nhật vào KV (`menu:latest`). Khi KV cache này hết hạn hoặc bị xóa, hệ thống sẽ đọc lại dữ liệu cũ từ D1 Database làm mất toàn bộ thay đổi của người dùng.
2.  **Thiếu cô lập tài nguyên (Shared Resources):** Các cấu hình hoạt động (`store_config`), tài sản ảnh (`image_list`, `image:${name}`), và mật khẩu đăng nhập (`dashboard:password`) đang được lưu chung trên một khóa KV toàn cục. Khi có nhiều cửa hàng cùng sử dụng hệ thống, dữ liệu của họ sẽ bị ghi đè hoặc rò rỉ chéo.

### [CRITICAL RISK] Bảo toàn trạng thái hết hàng (Sell out)
> [!IMPORTANT]
> Khi Admin lưu thay đổi menu, dữ liệu gửi từ Admin lên API không chứa trạng thái hết hàng của các món ăn. Nếu Worker đồng bộ bằng cách xóa toàn bộ món ăn rồi chèn lại, tất cả trạng thái hết hàng (`out_of_stock_until`) sẽ bị mất sạch (reset về NULL).
> 
> **Giải pháp bắt buộc:** Sử dụng câu lệnh SQL `ON CONFLICT` để chỉ cập nhật `price` và `sort_order`, đồng thời chỉ thực hiện xóa các món ăn không có tên trong danh sách mới bằng mệnh đề `NOT IN (...)`. Tuyệt đối không xóa trắng bảng.

---

## 2. Thư mục Nhiệm vụ (Task Index)

Các giai đoạn thực hiện đã được chia nhỏ thành các tài liệu đặc tả độc lập:

1.  **[Nhiệm vụ 1: Triển khai Backend API & Smart D1 Menu Sync](file:///Users/duccao/Documents/benmi-order/docs/proposals/menu_proposal/task_1_backend_menu_sync.md)**
    *   Refactor API đồng bộ menu D1.
    *   Cô lập Cấu hình, Ảnh, Mật khẩu quản trị theo từng Tenant trong KV.
2.  **[Nhiệm vụ 2: Tích hợp Frontend & Truyền tham số Tenant](file:///Users/duccao/Documents/benmi-order/docs/proposals/menu_proposal/task_2_frontend_integration.md)**
    *   Cập nhật truyền tham số `tenant_id` trên Dashboard Admin (`orders.html`).
    *   Cập nhật truyền tham số `tenant_id` trên giao diện khách hàng (`index.html`).
3.  **[Nhiệm vụ 3: Di cư dữ liệu (Migration) & Kiểm thử](file:///Users/duccao/Documents/benmi-order/docs/proposals/menu_proposal/task_3_migration_testing.md)**
    *   Di cư dữ liệu cấu hình/ảnh của tenant `benmi` hiện tại sang cấu trúc khóa KV mới.
    *   Xác minh tính đúng đắn trên môi trường thử nghiệm `test`.
