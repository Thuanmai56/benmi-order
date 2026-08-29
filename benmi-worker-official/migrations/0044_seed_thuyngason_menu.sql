-- Migration: 0044_seed_thuyngason_menu.sql
-- Description: Seed initial menu, categories, modifiers, and tenant configuration for tenant 'thuyngason' (Bánh mì Thủy Nga Sơn - 越式沙威瑪)

-- 1. Tenants Table
INSERT INTO tenants (id, name) 
VALUES ('thuyngason', 'Bánh mì Thủy Nga Sơn - 越式沙威瑪')
ON CONFLICT(id) DO UPDATE SET name = excluded.name;

-- 2. Tenant Config Table
INSERT INTO tenant_config (
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
    'thuyngason',
    'Bánh mì Thủy Nga Sơn - 越式沙威瑪',
    '#f59e0b',
    '',
    '{"0":[{"start":"10:00","end":"21:00"}],"1":[{"start":"10:00","end":"21:00"}],"2":[{"start":"10:00","end":"21:00"}],"3":[{"start":"10:00","end":"21:00"}],"4":[{"start":"10:00","end":"21:00"}],"5":[{"start":"10:00","end":"21:00"}],"6":[{"start":"10:00","end":"21:00"}]}',
    '🛵 外送請先來電或透過官方 LINE 洽詢配送範圍與滿額條件。',
    '12345678',
    'zh-TW',
    1,
    0,
    'open',
    '2009560906-c5taZfiY',
    'https://liff.line.me/2009560906-c5taZfiY',
    'T',
    '[]',
    1
)
ON CONFLICT(tenant_id) DO UPDATE SET
    brand_name = excluded.brand_name,
    brand_color = excluded.brand_color,
    store_address = excluded.store_address,
    operating_hours = excluded.operating_hours,
    delivery_policy = excluded.delivery_policy,
    locale = excluded.locale,
    allow_scheduled_pickup = excluded.allow_scheduled_pickup,
    allow_dine_in = excluded.allow_dine_in,
    store_status = excluded.store_status,
    order_prefix = excluded.order_prefix,
    features = excluded.features,
    is_active = excluded.is_active;

-- 3. Categories (Catalog & Modifiers)
INSERT INTO menu_categories (
    id, tenant_id, name, short_name, slug, category_type, selection_type,
    is_required, min_selection, max_selection, sort_order,
    allow_customization, applied_modifiers
) VALUES
('cat_tns_main',    'thuyngason', '招牌餐點 (沙威瑪 / 漢堡 / 烤麵包)', '招牌餐點', 'main',          'catalog',  'single',   0, 0, 1,  1, 1, '["cat_tns_spicy", "cat_tns_custom", "cat_tns_topping"]'),
('cat_tns_spicy',   'thuyngason', '辣度選擇 (Độ cay)',                   '辣度',     'spiciness',     'modifier', 'single',   1, 1, 1,  2, 0, '[]'),
('cat_tns_custom',  'thuyngason', '客製選項 (Tùy chọn bỏ nguyên liệu)',  '客製',     'customization', 'modifier', 'multiple', 0, 0, 10, 3, 0, '[]'),
('cat_tns_topping', 'thuyngason', '加料選項 (Thêm đồ)',                  '加料',     'toppings',      'modifier', 'multiple', 0, 0, 10, 4, 0, '[]')
ON CONFLICT(id) DO UPDATE SET
    tenant_id = excluded.tenant_id,
    name = excluded.name,
    short_name = excluded.short_name,
    slug = excluded.slug,
    category_type = excluded.category_type,
    selection_type = excluded.selection_type,
    is_required = excluded.is_required,
    min_selection = excluded.min_selection,
    max_selection = excluded.max_selection,
    sort_order = excluded.sort_order,
    allow_customization = excluded.allow_customization,
    applied_modifiers = excluded.applied_modifiers;

-- 4. Menu Items
INSERT INTO menu_items (
    id, tenant_id, category_id, name, price, description, badge_text, is_recommended, sort_order
) VALUES
-- Main Dishes (Catalog)
('item_tns_01', 'thuyngason', 'cat_tns_main', '越式沙威瑪 Bánh mì thịt nướng',              90,  '經典越式烤肉法國麵包夾生菜黃瓜醃蘿蔔', '👍 招牌', 1, 1),
('item_tns_02', 'thuyngason', 'cat_tns_main', '酥皮沙威瑪 Bánh tam giác giòn thịt nướng',   80,  '酥脆三角餅夾香烤豬肉與新鮮蔬菜',     NULL,     0, 2),
('item_tns_03', 'thuyngason', 'cat_tns_main', '美式漢堡 Hamburger thịt nướng',               60,  '美式芝麻漢堡包夾烤肉生菜與特調醬汁',   NULL,     0, 3),
('item_tns_04', 'thuyngason', 'cat_tns_main', '烤越南麵包 Bánh mì nướng muối ớt',           100, '越南道地香辣烤麵包，淋上美乃滋與滿滿配料', '🔥 人氣', 1, 4),
('item_tns_05', 'thuyngason', 'cat_tns_main', '黑金沙威瑪 Bánh than trúc thịt nướng',       100, '天然竹炭黑金麵包夾烤肉生菜，風味獨特', NULL,     0, 5),
('item_tns_06', 'thuyngason', 'cat_tns_main', '起士沙威瑪 Bánh phô mai thịt nướng',         100, '香濃起司搭配特製烤肉與蔬菜，濃郁拉絲', '🧀 濃郁', 0, 6),

-- Spicy Modifiers
('opt_tns_sp_01', 'thuyngason', 'cat_tns_spicy', '大辣 (Cay nhiều)',                        0,   NULL, NULL, 0, 1),
('opt_tns_sp_02', 'thuyngason', 'cat_tns_spicy', '中辣 (Cay vừa)',                          0,   NULL, NULL, 0, 2),
('opt_tns_sp_03', 'thuyngason', 'cat_tns_spicy', '小辣 (Cay ít)',                           0,   NULL, NULL, 0, 3),
('opt_tns_sp_04', 'thuyngason', 'cat_tns_spicy', '不辣 (Không cay)',                        0,   NULL, NULL, 0, 4),

-- Customization Modifiers
('opt_tns_cs_01', 'thuyngason', 'cat_tns_custom', '不加香菜 (Không ngò)',                   0,   NULL, NULL, 0, 1),
('opt_tns_cs_02', 'thuyngason', 'cat_tns_custom', '不加小黃瓜 (Không dưa leo)',             0,   NULL, NULL, 0, 2),
('opt_tns_cs_03', 'thuyngason', 'cat_tns_custom', '不加醃蘿蔔 (Không dưa chua)',             0,   NULL, NULL, 0, 3),
('opt_tns_cs_04', 'thuyngason', 'cat_tns_custom', '不要菜 (Không ăn rau)',                   0,   NULL, NULL, 0, 4),

-- Topping Modifiers
('opt_tns_tp_01', 'thuyngason', 'cat_tns_topping', '加蛋 (Thêm trứng)',                     15,  NULL, NULL, 0, 1)
ON CONFLICT(id) DO UPDATE SET
    tenant_id = excluded.tenant_id,
    category_id = excluded.category_id,
    name = excluded.name,
    price = excluded.price,
    description = excluded.description,
    badge_text = excluded.badge_text,
    is_recommended = excluded.is_recommended,
    sort_order = excluded.sort_order;
