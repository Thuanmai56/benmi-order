# Feature Cluster A: Cấu hình và Xác thực Admin (Auth & Config)

Nhiệm vụ này thực hiện chuyển đổi toàn bộ cấu hình cửa hàng (Liff ID, Giờ mở cửa) và cơ chế mật khẩu Admin từ KV sang D1. Đây là cụm tính năng độc lập đầu tiên, lý tưởng để xác nhận luồng tích hợp D1.

---

## Task A.1: Thiết lập Schema và Refactor API (Mã hóa mật khẩu & Đọc D1)

### 1. Viết SQL Migration bổ sung
* Tạo file migration mới `0005_add_auth_config_to_tenants.sql` trong thư mục [migrations](file:///Users/duccao/Documents/benmi-order/benmi-worker-official/migrations):
  ```sql
  -- Bổ sung cột cấu hình và mật khẩu vào bảng tenants
  ALTER TABLE tenants ADD COLUMN password_hash TEXT DEFAULT NULL;
  ALTER TABLE tenants ADD COLUMN liff_id TEXT DEFAULT NULL;
  ALTER TABLE tenants ADD COLUMN operating_hours TEXT DEFAULT NULL; -- Lưu cấu trúc JSON
  ```
* Chạy migration cục bộ và môi trường test:
  ```bash
  npx wrangler d1 migrations apply DB --local
  npx wrangler d1 migrations apply DB --remote --env test
  ```

### 2. Refactor Code backend
* **Quản lý cấu hình ([config.ts](file:///Users/duccao/Documents/benmi-order/benmi-worker-official/src/modules/config.ts))**:
  * Đọc từ D1 trong hàm `getConfig`:
    ```typescript
    const stored = await env.DB.prepare("SELECT liff_id, operating_hours FROM tenants WHERE id = ?").bind(tenantId).first<any>();
    ```
  * Cập nhật D1 trong hàm `updateConfig`:
    ```typescript
    await env.DB.prepare("UPDATE tenants SET liff_id = COALESCE(?, liff_id), operating_hours = COALESCE(?, operating_hours), updated_at = datetime('now') WHERE id = ?").bind(payload.liffId || null, operatingHoursStr, tenantId).run();
    ```
* **Mật khẩu Admin ([auth.ts](file:///Users/duccao/Documents/benmi-order/benmi-worker-official/src/modules/auth.ts))**:
  * Sử dụng Web Crypto API băm mật khẩu:
    ```typescript
    async function hashPassword(password: string, salt: string): Promise<string> {
      // Logic băm mật khẩu PBKDF2 hoặc SHA-256 kèm salt...
    }
    ```
  * Đọc `password_hash` từ D1 thay vì KV `tenant:${tenantId}:password`.
  * So sánh mã băm trong `handleAuth` và cập nhật mã băm mới trong `handleAuthChange`.
  * **Đọc dự phòng (Read Fallback)**: Nếu trong D1 `password_hash` chưa có (lần đầu tiên sau deploy), thực hiện đọc từ KV để lấy mật khẩu cũ và băm lại ghi vào D1 (Auto-migration).

---

## Task A.2: Di chuyển dữ liệu và Cắt KV (Cutover)

1. **Backfill dữ liệu**:
   * Viết script endpoint tạm thời quét tất cả các khoá `tenant:*:password` và `tenant:*:config` trên KV.
   * Đồng bộ giá trị cấu hình sang D1 và băm mật khẩu cũ ghi vào cột `password_hash` trong D1.
2. **Cutover**:
   * Gỡ bỏ logic đọc dự phòng trên KV khỏi code.
   * Xoá sạch các khoá config và password cũ trên KV để giải phóng không gian.

---

## Hướng dẫn xác minh (Verification Plan)
1. Cập nhật config qua API và xác nhận trường dữ liệu được thay đổi trực tiếp trong D1 local.
2. Thực hiện đổi mật khẩu admin và kiểm tra xem cột `password_hash` trong bảng `tenants` có chứa mật khẩu đã băm không.
