-- Migration: 0038_seed_52kaoroufan_menu.sql
-- Description: Seed initial menu, categories, and tenant configuration for tenant '52kaoroufan' (52越南烤肉飯)

-- 1. Tenants Table
INSERT OR REPLACE INTO tenants (id, name) 
VALUES ('52kaoroufan', '52越南烤肉飯');

-- 2. Tenant Config Table
INSERT OR REPLACE INTO tenant_config (
    tenant_id,
    brand_name,
    brand_color,
    store_address,
    operating_hours,
    delivery_policy,
    default_password,
    locale,
    allow_scheduled_pickup,
    allow_dine_in,
    store_status,
    liff_id,
    liff_url,
    order_prefix,
    features,
    is_active
) VALUES (
    '52kaoroufan',
    '52越南烤肉飯',
    '#00b900',
    '新北市新莊區光榮里西盛街203之1號',
    '{"0":[{"start":"12:00","end":"20:00"}],"1":[{"start":"12:00","end":"20:00"}],"2":[{"start":"12:00","end":"20:00"}],"3":[{"start":"12:00","end":"20:00"}],"4":[{"start":"12:00","end":"20:00"}],"5":[],"6":[{"start":"12:00","end":"20:00"}]}',
    '📞 訂購專線：0983-335-067',
    '12345678',
    'zh-TW',
    0,
    0,
    'open',
    '2009560906-c5taZfiY',
    'https://liff.line.me/2009560906-c5taZfiY',
    'F',
    '[]',
    1
);

-- 3. Categories (Catalog)
INSERT OR REPLACE INTO menu_categories (
    id, tenant_id, name, slug, category_type, selection_type,
    is_required, min_selection, max_selection, sort_order,
    allow_customization, applied_modifiers
) VALUES
('cat_52_main', '52kaoroufan', '主餐 (Món chính)', 'main-dishes', 'catalog', 'single', 0, 0, 1, 1, 0, '[]');

-- 4. Menu Items
INSERT OR REPLACE INTO menu_items (
    id, tenant_id, category_id, name, price, description, badge_text, is_recommended, sort_order
) VALUES
('item_52_01', '52kaoroufan', 'cat_52_main', '烤肉飯 (Cơm thịt nướng)',   120, NULL, NULL,  0, 1),
('item_52_02', '52kaoroufan', 'cat_52_main', '烤肉涼麵 (Bún thịt nướng)',  120, NULL, NULL,  0, 2),
('item_52_03', '52kaoroufan', 'cat_52_main', '番茄米線 (Bún Riêu)',        120, NULL, 'NEW', 1, 3),
('item_52_04', '52kaoroufan', 'cat_52_main', '海鮮河粉 (Hủ tiếu hải sản)', 110, NULL, NULL,  0, 4),
('item_52_05', '52kaoroufan', 'cat_52_main', '春捲三個 (Gỏi cuốn 3 cái)',   100, NULL, NULL,  0, 5),
('item_52_06', '52kaoroufan', 'cat_52_main', '炒河粉 (Hủ tiếu xào)',       100, NULL, NULL,  0, 6),
('item_52_07', '52kaoroufan', 'cat_52_main', '炒泡麵 (Xào mì gói)',        100, NULL, NULL,  0, 7),
('item_52_08', '52kaoroufan', 'cat_52_main', '乾拌河粉 (Hủ tiếu trộn)',     100, NULL, NULL,  0, 8),
('item_52_09', '52kaoroufan', 'cat_52_main', '乾拌泡麵 (Mì gói trộn)',      100, NULL, NULL,  0, 9);
