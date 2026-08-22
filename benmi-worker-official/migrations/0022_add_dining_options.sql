-- Migration: 0022_add_dining_options.sql
-- Description: Add dining_option to orders table and allow_dine_in to tenant_config table

-- 1. Bổ sung trường dining_option vào bảng orders (mặc định 'takeaway')
ALTER TABLE orders ADD COLUMN dining_option TEXT NOT NULL DEFAULT 'takeaway';

-- 2. Tạo chỉ mục tối ưu truy vấn theo tenant và loại đơn
CREATE INDEX IF NOT EXISTS idx_orders_tenant_dining ON orders(tenant_id, dining_option, created_at DESC);

-- 3. Bổ sung trường allow_dine_in vào bảng tenant_config (mặc định 1 - cho phép cả 2 hình thức)
ALTER TABLE tenant_config ADD COLUMN allow_dine_in INTEGER DEFAULT 1;

-- Cập nhật mặc định cho các tenant hiện hữu nếu giá trị là NULL
UPDATE tenant_config SET allow_dine_in = 1 WHERE allow_dine_in IS NULL;
