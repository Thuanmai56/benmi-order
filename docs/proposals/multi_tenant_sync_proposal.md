# PDP: Multi-Tenant Config, Images, Passwords & D1 Menu Sync [Refactor/Fix]

Tài liệu này đề xuất thiết kế kiến trúc nâng cấp hệ thống để loại bỏ rủi ro mất dữ liệu menu (khi sửa qua Admin) và cô lập hoàn toàn tài nguyên giữa các Tenant (đa hộ thuê) đối với cấu hình, hình ảnh và mật khẩu quản trị.

---

## 1. Executive Summary & Objectives

### Problem Statement
Hiện tại hệ thống đang tồn tại 2 vấn đề lớn về kiến trúc:
1. **Lưu lệch Menu (Out of Sync):** Khi admin lưu thay đổi thực đơn trên giao diện quản lý, API chỉ cập nhật vào KV (`menu:latest`). Khi KV cache này hết hạn hoặc bị xóa, hệ thống sẽ đọc lại dữ liệu cũ từ D1 Database làm mất toàn bộ thay đổi của người dùng.
2. **Thiếu cô lập tài nguyên (Shared Resources):** Các cấu hình hoạt động (`store_config`), tài sản ảnh (`image_list`, `image:${name}`), và mật khẩu đăng nhập (`dashboard:password`) đang được lưu chung trên một khóa KV toàn cục. Khi có nhiều cửa hàng cùng sử dụng hệ thống, dữ liệu của họ sẽ bị ghi đè hoặc rò rỉ chéo.

### Goals (In-Scope)
*   **D1 làm nguồn sự thật duy nhất (Single Source of Truth):** Đồng bộ hóa hoàn chỉnh mọi sửa đổi từ API sửa menu vào cơ sở dữ liệu D1.
*   **Cô lập 100% tài nguyên giữa các Tenant:** Tách biệt cấu hình cửa hàng, dữ liệu ảnh và mật khẩu quản trị bằng cách đính kèm Tenant ID vào cấu trúc khóa KV.
*   **Tương thích ngược (Backward Compatibility):** Khách hàng cũ và các thiết lập hiện tại của tenant mặc định `benmi` không bị ảnh hưởng hay gián đoạn.

### Non-Goals (Out-of-Scope)
*   Chuyển đổi hệ thống quản lý đơn hàng (`orders`) sang D1 trong đợt refactor này.

---

## 2. Context & Current Architecture

Hiện trạng các file mã nguồn:
*   [menu.ts](file:///Users/duccao/Documents/benmi-order/benmi-worker-official/src/modules/menu.ts): Hàm `updateMenu` chỉ ghi dữ liệu JSON thô vào KV khóa `menu:latest`.
*   [config.ts](file:///Users/duccao/Documents/benmi-order/benmi-worker-official/src/modules/config.ts): Đọc ghi cấu hình qua khóa tĩnh `"store_config"`.
*   [image.ts](file:///Users/duccao/Documents/benmi-order/benmi-worker-official/src/modules/image.ts): Đọc danh mục ảnh qua `"image_list"` và dữ liệu ảnh qua `image:${name}`.
*   [auth.ts](file:///Users/duccao/Documents/benmi-order/benmi-worker-official/src/modules/auth.ts): Đọc ghi mật khẩu qua `"dashboard:password"`.

---

## 3. Proposed Architecture

### 3.1. Thiết kế cơ cấu đồng bộ Menu vào D1 Database
Khi nhận yêu cầu `POST /api/menu` chứa cấu trúc JSON mới từ Client Admin:
1.  Trích xuất `tenant_id` từ request.
2.  Bắt đầu một tiến trình D1 transaction/batch để cập nhật lại danh mục và món ăn:
    *   **Xóa các món cũ:** Thực hiện xóa các món ăn thuộc danh mục của Tenant đó mà không còn tồn tại trong JSON mới gửi lên.
    *   **Xóa danh mục cũ:** Xóa các danh mục của Tenant không còn xuất hiện trong cấu trúc mới.
    *   **Thêm/Cập nhật danh mục:** Đọc các category từ JSON, thực hiện lệnh `INSERT INTO menu_categories ... ON CONFLICT(tenant_id, slug) DO UPDATE SET name = ...`.
    *   **Thêm/Cập nhật món ăn:** Duyệt qua các món ăn, thực hiện lệnh `INSERT INTO menu_items (id, tenant_id, category_id, name, price, sort_order) VALUES (...) ON CONFLICT(...)`.
3.  Xóa KV Cache `tenant:${tenantId}:menu` để kích hoạt việc tái tạo cache mới tại lượt đọc kế tiếp.

### 3.2. Cấu trúc Khóa KV mới cô lập theo Tenant
Để đảm bảo độc lập tài nguyên, cấu trúc khóa KV sẽ được chuyển đổi:

| Tài nguyên | Khóa toàn cục cũ | Khóa đa hộ thuê (Tenant-isolated Key) mới |
| :--- | :--- | :--- |
| **Cấu hình cửa hàng** | `store_config` | `tenant:${tenantId}:config` |
| **Danh mục ảnh** | `image_list` | `tenant:${tenantId}:image_list` |
| **Dữ liệu ảnh** | `image:${name}` | `tenant:${tenantId}:image:${name}` |
| **Mật khẩu Admin** | `dashboard:password` | `tenant:${tenantId}:password` |

---

## 4. Migration & Rollout Strategy

Để đảm bảo không gián đoạn hoạt động của cửa hàng thật, chúng ta áp dụng chiến lược chuyển đổi từng bước:

### Các bước nâng cấp (Rollout Phases)
1.  **Bước 1: Triển khai mã nguồn hỗ trợ chế độ kép (Dual-Mode):**
    *   Khi đọc dữ liệu (Config, Image, Password), nếu không tìm thấy khóa mới dạng `tenant:${tenantId}:...`, hệ thống sẽ tự động tìm và đọc dữ liệu từ khóa cũ làm dự phòng (fallback).
2.  **Bước 2: Migrate dữ liệu cho tenant mặc định `benmi`:**
    *   Copy dữ liệu hiện tại của `"store_config"`, `"image_list"`, `"dashboard:password"` sang các khóa mới tương ứng với tiền tố `tenant:benmi:`.
3.  **Bước 3: Chuyển đổi hoàn toàn:**
    *   Chỉ đọc và ghi trên khóa mới.

### Kế hoạch Rollback (Revert Plan)
*   Nếu phát hiện lỗi trong quá trình chạy thử nghiệm, deploy lại mã nguồn cũ về môi trường test, do các khóa cũ vẫn được bảo toàn nguyên vẹn.

---

## 5. Alternatives Considered & Trade-offs

### Alternative A: Giữ cấu hình và ảnh trong KV, Menu lưu D1
*   **Ưu điểm:** Đơn giản, không cần thay đổi logic của `config.ts` hay `image.ts`.
*   **Nhược điểm:** Khi mở rộng thêm cửa hàng thứ hai, không thể phân tách được hình ảnh món ăn và giờ mở cửa, dẫn đến xung đột dữ liệu nghiêm trọng.

### Chọn lựa kiến trúc:
Chọn phương án **Refactor toàn bộ tài nguyên theo Tenant** kết hợp lưu trữ Menu bền vững vào D1. Đây là cách làm chuẩn mực nhất của một hệ thống SaaS / Multi-tenant.

---

## 6. Step-by-Step Execution Plan

- [ ] **Phase 1: Database & API Sync Logic (Backend)**
  - Cập nhật hàm `updateMenu` trong `menu.ts` để đồng bộ dữ liệu JSON nhận được vào cơ sở dữ liệu D1 bằng cơ chế Batch Queries.
  - Cập nhật `config.ts` để đọc/ghi theo khóa `tenant:${tenantId}:config`.
  - Cập nhật `image.ts` để lưu danh mục và file ảnh theo `tenant:${tenantId}:image_list` và `tenant:${tenantId}:image:${name}`.
  - Cập nhật `auth.ts` để lưu mật khẩu quản trị theo `tenant:${tenantId}:password`.
- [ ] **Phase 2: Deploy & Migrate (Môi trường Test)**
  - Deploy lên môi trường `test` để cập nhật các API.
  - Chạy lệnh migration nội bộ hoặc curl để sao chép cấu hình và ảnh hiện tại từ các khóa cũ sang khóa mới cho tenant `benmi`.
- [ ] **Phase 3: Frontend Integration (Client)**
  - Cập nhật `index.html` và `orders.html` truyền thêm `tenant_id` khi gọi các API `/api/config`, `/api/image_list`, `/api/image` (hoặc để hệ thống tự nhận diện từ hostname).
- [ ] **Phase 4: Verification**
  - Chạy kiểm thử toàn bộ vòng đời (Sửa thực đơn, đổi giờ mở cửa, upload ảnh, đổi mật khẩu) để xác nhận hệ thống hoạt động chính xác trên môi trường test.

---

## 7. Verification & Test Plan

### Kiểm thử qua API Curl:
1.  **Lưu menu mới và kiểm chứng D1:**
    ```bash
    curl -X POST -H "Content-Type: application/json" -d '{"small":{"Bánh mì thịt": 60}}' "https://spring-smoke-46ba.thuanmnc.workers.dev/api/menu?tenant_id=benmi"
    ```
    *   Kiểm tra bảng `menu_items` trong D1 xem giá của `Bánh mì thịt` có đổi thành 60 không.
2.  **Đổi giờ hoạt động cửa hàng:**
    ```bash
    curl -X POST -H "Content-Type: application/json" -d '{"operatingHours":{"1":[{"start":"08:00","end":"22:00"}]}}' "https://spring-smoke-46ba.thuanmnc.workers.dev/api/config?tenant_id=benmi"
    ```
    *   Kiểm tra xem khóa KV `tenant:benmi:config` đã được cập nhật chưa.
