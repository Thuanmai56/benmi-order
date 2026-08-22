-- Migration: 0023_add_tenant_features.sql
-- Description: Add features column to tenant_config for modular subscription add-ons

-- 1. Bổ sung trường features dạng JSON text vào bảng tenant_config (mặc định mảng rỗng '[]')
ALTER TABLE tenant_config ADD COLUMN features TEXT DEFAULT '[]';

-- 2. Khởi tạo giá trị mặc định '[]' cho các tenant hiện hữu nếu giá trị là NULL
UPDATE tenant_config SET features = '[]' WHERE features IS NULL;
