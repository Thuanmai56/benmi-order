# Feature Cluster B: Quản lý hình ảnh và tệp tin (Media & Images)

Nhiệm vụ này tách hoàn toàn dữ liệu ảnh nhị phân Base64 khỏi KV, lưu trữ trực tiếp lên Cloudflare R2 Object Storage, và lưu siêu dữ liệu ảnh (metadata) vào bảng `tenant_images` của D1.

---

## Task B.1: Cấu hình R2, Schema Metadata & Refactor API

### 1. Cấu hình R2 và SQL Migration
* Khởi tạo các bucket R2 trên Cloudflare Dashboard (`benmi-images-production`, `benmi-images-test`, `benmi-images-dev`).
* Cập nhật R2 bindings trong [wrangler.jsonc](file:///Users/duccao/Documents/benmi-order/benmi-worker-official/wrangler.jsonc) liên kết tới `IMAGES_BUCKET`.
* Cập nhật kiểu dữ liệu interface `Env` trong `src/types/env.ts` (`IMAGES_BUCKET: R2Bucket`).
* Tạo file migration `0006_create_tenant_images.sql` trong thư mục [migrations](file:///Users/duccao/Documents/benmi-order/benmi-worker-official/migrations):
  ```sql
  CREATE TABLE tenant_images (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      name TEXT NOT NULL,
      file_size INTEGER DEFAULT 0,
      content_type TEXT DEFAULT 'image/jpeg',
      r2_key TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
      UNIQUE(tenant_id, name)
  );
  CREATE INDEX idx_images_tenant ON tenant_images(tenant_id);
  ```
* Thực thi migration:
  ```bash
  npx wrangler d1 migrations apply DB --local
  npx wrangler d1 migrations apply DB --remote --env test
  ```

### 2. Refactor Code backend ([image.ts](file:///Users/duccao/Documents/benmi-order/benmi-worker-official/src/modules/image.ts))
* **Upload ảnh (`updateImage`)**: Giải mã Base64 sang nhị phân, gọi `env.IMAGES_BUCKET.put()` để ghi lên R2, sau đó chèn bản ghi vào bảng D1 `tenant_images`.
* **Get ảnh (`getImage`)**: Đọc metadata từ D1, sau đó đọc stream nhị phân từ R2 (`env.IMAGES_BUCKET.get()`) trả về response.
* **Danh sách ảnh (`getImageList`)**: `SELECT name FROM tenant_images WHERE tenant_id = ?` thay vì đọc array JSON từ KV.
* **Xóa ảnh (`deleteImage`)**: Xóa tệp nhị phân trên R2 trước, sau đó xóa bản ghi trong D1.

---

## Task B.2: Backfill hình ảnh từ KV sang R2 và Cutover

1. **Backfill script**:
   * Viết script chạy một lần quét toàn bộ các khóa hình ảnh `tenant:${tenantId}:image:${name}` trên KV.
   * Với mỗi ảnh:
     * Đọc chuỗi Base64 từ KV.
     * Chuyển đổi sang nhị phân và upload lên R2 bucket.
     * Lưu metadata tương ứng vào bảng `tenant_images` trong D1.
2. **Cutover**:
   * Chuyển hoàn toàn các API lấy danh sách và hiển thị ảnh chỉ gọi D1/R2.
   * Xóa sạch các khóa ảnh Base64 cũ trên KV.

---

## Hướng dẫn xác minh (Verification Plan)
1. Tải ảnh lên qua Dashboard Admin, kiểm tra xem tệp tin ảnh xuất hiện trong R2 cục bộ chưa.
2. Kiểm tra xem danh sách ảnh hiển thị trên Dashboard có bị thiếu hoặc vỡ giao diện không.
