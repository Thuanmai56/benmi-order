-- Migration 0047: Add coordinates and marketplace discovery fields to tenant_config

-- 1. Bổ sung các cột tọa độ GPS, phân loại ẩm thực và cờ hiển thị trên Marketplace
ALTER TABLE tenant_config ADD COLUMN latitude REAL;
ALTER TABLE tenant_config ADD COLUMN longitude REAL;
ALTER TABLE tenant_config ADD COLUMN cuisine_type TEXT DEFAULT 'vietnamese';
ALTER TABLE tenant_config ADD COLUMN is_marketplace_visible INTEGER DEFAULT 1;

-- 2. Tạo chỉ mục tối ưu truy vấn Marketplace
CREATE INDEX IF NOT EXISTS idx_tenant_marketplace ON tenant_config(is_active, is_marketplace_visible);

-- 3. Cập nhật tọa độ GPS và phân loại ẩm thực thực tế cho các quán
-- Benmi 越式法國麵包 (Tân Bắc - Thổ Thành)
UPDATE tenant_config 
SET latitude = 24.970220, 
    longitude = 121.442880, 
    cuisine_type = 'vietnamese',
    is_marketplace_visible = 1 
WHERE tenant_id = 'benmi';

-- 雞蛋糕大叔 (Tân Bắc - Thổ Thành)
UPDATE tenant_config 
SET latitude = 24.985630, 
    longitude = 121.464710, 
    cuisine_type = 'snack',
    is_marketplace_visible = 1 
WHERE tenant_id = 'jidangaodashu';

-- 炸蛋同學 (Tân Bắc - Tân Điếm)
UPDATE tenant_config 
SET latitude = 24.975410, 
    longitude = 121.543590, 
    cuisine_type = 'snack',
    is_marketplace_visible = 1 
WHERE tenant_id = 'zhadantongxue';

-- 微為飽小吃 (Tân Bắc - Bản Kiều)
UPDATE tenant_config 
SET latitude = 25.025340, 
    longitude = 121.465130, 
    cuisine_type = 'taiwanese',
    is_marketplace_visible = 1 
WHERE tenant_id = 'weiweibao';

-- 干城鹹水雞 (Đài Trung - Nam Đồn)
UPDATE tenant_config 
SET latitude = 24.150490, 
    longitude = 120.633910, 
    cuisine_type = 'taiwanese',
    is_marketplace_visible = 1 
WHERE tenant_id = 'bsc';

-- 52越南烤肉飯 (Tân Bắc - Tân Trang)
UPDATE tenant_config 
SET latitude = 25.011850, 
    longitude = 121.428760, 
    cuisine_type = 'vietnamese',
    is_marketplace_visible = 1 
WHERE tenant_id = '52kaoroufan';

-- 小嫻越式法國麵包 (Tân Bắc - Tân Trang)
UPDATE tenant_config 
SET latitude = 25.021670, 
    longitude = 121.422340, 
    cuisine_type = 'vietnamese',
    is_marketplace_visible = 1 
WHERE tenant_id = 'xiaolan';

-- Bánh mì Thủy Nga Sơn - 越式沙威瑪 (Tân Bắc - Tân Trang)
UPDATE tenant_config 
SET latitude = 25.023810, 
    longitude = 121.421950, 
    store_address = CASE WHEN store_address IS NULL OR store_address = '' THEN '新北市新莊區民安西路136號' ELSE store_address END,
    cuisine_type = 'vietnamese',
    is_marketplace_visible = 1 
WHERE tenant_id = 'thuyngason';

-- BLAB Demo - 干城鹹水雞 (Đài Trung - Nam Đồn)
UPDATE tenant_config 
SET latitude = 24.150490, 
    longitude = 120.633910, 
    cuisine_type = 'taiwanese',
    is_marketplace_visible = 1 
WHERE tenant_id = 'blab_demo';
