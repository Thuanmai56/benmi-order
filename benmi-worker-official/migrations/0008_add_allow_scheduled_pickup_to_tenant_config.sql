-- 8. Thêm cột allow_scheduled_pickup vào bảng tenant_config
ALTER TABLE tenant_config ADD COLUMN allow_scheduled_pickup INTEGER DEFAULT 1;

-- Cập nhật mặc định cho tenant benmi
UPDATE tenant_config SET allow_scheduled_pickup = 1 WHERE tenant_id = 'benmi';
