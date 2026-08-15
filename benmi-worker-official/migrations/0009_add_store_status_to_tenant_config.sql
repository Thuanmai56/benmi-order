-- 9. Thêm cột store_status vào bảng tenant_config (open, busy, paused)
ALTER TABLE tenant_config ADD COLUMN store_status TEXT DEFAULT 'open';

-- Cập nhật mặc định cho tenant benmi
UPDATE tenant_config SET store_status = 'open' WHERE tenant_id = 'benmi';
