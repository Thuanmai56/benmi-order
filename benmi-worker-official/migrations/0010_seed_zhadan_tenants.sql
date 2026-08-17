-- Migration: 0010_seed_zhadan_tenants.sql
-- Description: One-time seed data for tenant 'zhadantongxue' (炸蛋同学 - 招牌炸蛋葱饼)
-- Menu includes:
--   1. Main Dishes (招牌炸蛋蔥餅 - 9 items from Image 1)
--   2. Snacks (點心小吃 - Thai shrimp pancake from Image 1)
--   3. Required Customizations (加辣, 雞蛋, 生菜 options from Image 2)
--   4. Extra Add-on Toppings (加料選項 - 8 toppings from Text 3)

-- 1. Thêm thông tin Cửa hàng (Tenant & Tenant Config)
INSERT OR IGNORE INTO tenants (id, name) 
VALUES ('zhadantongxue', '炸蛋同学');

INSERT OR IGNORE INTO tenant_config (
    tenant_id,
    brand_name,
    brand_color,
    store_address,
    operating_hours,
    delivery_policy,
    quick_replies,
    default_password,
    locale,
    allow_scheduled_pickup,
    store_status,
    liff_id,
    liff_url,
    is_active
) VALUES (
    'zhadantongxue',
    '炸蛋同学 招牌炸蛋葱饼',
    '#f59e0b',
    '加盟/訂購專線: 0902271718',
    '11:00-21:00',
    '🛵 外送請先來電 0902271718 洽詢配送範圍與滿額條件。',
    '[{"triggers":["電話","訂購","加盟"],"reply":"訂購/加盟專線：0902271718"},{"triggers":["菜單","推薦"],"reply":"招牌推薦：原味炸蛋蔥餅、雙芝士炸蛋蔥餅、雞腿肉卷炸蛋蔥餅！"}]',
    '12345678',
    'zh-TW',
    1,
    'open',
    '2009560906-c5taZfiY',
    'https://liff.line.me/2009560906-c5taZfiY',
    1
);

-- 2. Danh mục Thực đơn (Menu Categories)
INSERT OR IGNORE INTO menu_categories (id, tenant_id, name, slug, sort_order) VALUES
('cat_zd_main',     'zhadantongxue', '招牌炸蛋蔥餅', 'main',     1),
('cat_zd_snack',    'zhadantongxue', '點心小吃',     'snack',    2),
('cat_zd_spicy',    'zhadantongxue', '加辣選項',     'spicy',    3),
('cat_zd_egg',      'zhadantongxue', '雞蛋選項',     'egg',      4),
('cat_zd_lettuce',  'zhadantongxue', '生菜選項',     'lettuce',  5),
('cat_zd_topping',  'zhadantongxue', '加料選項',     'topping',  6);

-- 3. Chi tiết Món ăn (Menu Items)

-- 3.1. Danh mục Món chính: 招牌炸蛋蔥餅 (Ảnh 1)
INSERT OR IGNORE INTO menu_items (id, tenant_id, category_id, name, price, description, sort_order) VALUES
('zd_item_01', 'zhadantongxue', 'cat_zd_main', '原味炸蛋蔥餅',   45, '招牌經典原味', 1),
('zd_item_02', 'zhadantongxue', 'cat_zd_main', '雙蛋蛋炸蛋蔥餅', 55, '雙倍蛋香濃郁', 2),
('zd_item_03', 'zhadantongxue', 'cat_zd_main', '雪花培根炸蛋蔥餅', 55, '嚴選雪花培根', 3),
('zd_item_04', 'zhadantongxue', 'cat_zd_main', '韓式泡菜炸蛋蔥餅', 60, '爽脆酸辣解膩', 4),
('zd_item_05', 'zhadantongxue', 'cat_zd_main', '雙芝士炸蛋蔥餅', 60, '雙倍濃郁起司', 5),
('zd_item_06', 'zhadantongxue', 'cat_zd_main', '雙熱狗炸蛋蔥餅', 60, '經典雙熱狗組合', 6),
('zd_item_07', 'zhadantongxue', 'cat_zd_main', '黑椒豬排炸蛋蔥餅', 65, '厚切黑椒豬排', 7),
('zd_item_08', 'zhadantongxue', 'cat_zd_main', '雞腿肉卷炸蛋蔥餅', 70, '雞腿足足100g', 8),
('zd_item_09', 'zhadantongxue', 'cat_zd_main', '台灣香腸炸蛋蔥餅', 80, '香腸足足15cm', 9);

-- 3.2. Danh mục Ăn vặt: 點心小吃 (Ảnh 1)
INSERT OR IGNORE INTO menu_items (id, tenant_id, category_id, name, price, description, sort_order) VALUES
('zd_item_10', 'zhadantongxue', 'cat_zd_snack', '泰式月亮蝦餅 (6片)', 50, '外酥內嫩泰式風味', 1);

-- 3.3. Tùy chọn Độ cay: 加辣選項 (Ảnh 2)
INSERT OR IGNORE INTO menu_items (id, tenant_id, category_id, name, price, sort_order) VALUES
('zd_opt_spicy_1', 'zhadantongxue', 'cat_zd_spicy', '加辣 Add Spice',     0, 1),
('zd_opt_spicy_2', 'zhadantongxue', 'cat_zd_spicy', '不加辣 Non-Spicy',   0, 2);

-- 3.4. Tùy chọn Độ chín trứng: 雞蛋選項 (Ảnh 2)
INSERT OR IGNORE INTO menu_items (id, tenant_id, category_id, name, price, sort_order) VALUES
('zd_opt_egg_1', 'zhadantongxue', 'cat_zd_egg', '流心蛋 Runny Yolk Egg', 0, 1),
('zd_opt_egg_2', 'zhadantongxue', 'cat_zd_egg', '熟蛋 Over Egg',         0, 2);

-- 3.5. Tùy chọn Rau xà lách: 生菜選項 (Ảnh 2)
INSERT OR IGNORE INTO menu_items (id, tenant_id, category_id, name, price, sort_order) VALUES
('zd_opt_lettuce_1', 'zhadantongxue', 'cat_zd_lettuce', '加生菜',   0, 1),
('zd_opt_lettuce_2', 'zhadantongxue', 'cat_zd_lettuce', '不加生菜', 0, 2);

-- 3.6. Topping thêm: 加料選項 (Đoạn Text 3)
INSERT OR IGNORE INTO menu_items (id, tenant_id, category_id, name, price, sort_order) VALUES
('zd_top_01', 'zhadantongxue', 'cat_zd_topping', '一片起司',   10, 1),
('zd_top_02', 'zhadantongxue', 'cat_zd_topping', '一支熱狗',   10, 2),
('zd_top_03', 'zhadantongxue', 'cat_zd_topping', '雞蛋',       15, 3),
('zd_top_04', 'zhadantongxue', 'cat_zd_topping', '培根',       15, 4),
('zd_top_05', 'zhadantongxue', 'cat_zd_topping', '泡菜',       15, 5),
('zd_top_06', 'zhadantongxue', 'cat_zd_topping', '豬排',       25, 6),
('zd_top_07', 'zhadantongxue', 'cat_zd_topping', '雞腿肉卷',   35, 7),
('zd_top_08', 'zhadantongxue', 'cat_zd_topping', '台灣香腸',   50, 8);
