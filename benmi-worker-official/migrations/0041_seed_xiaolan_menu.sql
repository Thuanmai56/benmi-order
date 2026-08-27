-- Migration: 0041_seed_xiaolan_menu.sql
-- Description: Seed initial menu, categories, modifiers, and tenant configuration for tenant 'xiaolan' (小嫻越式法國麵包)

-- 1. Tenants Table
INSERT INTO tenants (id, name) 
VALUES ('xiaolan', '小嫻越式法國麵包')
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
    'xiaolan',
    '小嫻越式法國麵包',
    '#00b900',
    '新北市新莊區四維里成德街33號',
    '{"0":[{"start":"07:30","end":"20:00"}],"1":[{"start":"09:00","end":"20:00"}],"2":[],"3":[{"start":"09:00","end":"20:00"}],"4":[{"start":"09:00","end":"20:00"}],"5":[{"start":"09:00","end":"20:00"}],"6":[{"start":"07:30","end":"20:00"}]}',
    '📞 訂購專線：0909 039 219',
    '12345678',
    'zh-TW',
    0,
    0,
    'open',
    '2009560906-c5taZfiY',
    'https://liff.line.me/2009560906-c5taZfiY',
    'X',
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
('cat_xx_banhmi',  'xiaolan', '越式麵包 (Bánh mì)',                   '越式麵包',  'banh-mi',        'catalog',  'single',   0, 0, 1,  1, 1, '["cat_xx_spicy", "cat_xx_custom", "cat_xx_topping"]'),
('cat_xx_noodle',  'xiaolan', '涼拌 / 粉捲 (Bún & Bánh ướt)',          '涼拌/粉捲', 'noodles-rolls',  'catalog',  'single',   0, 0, 1,  2, 0, '[]'),
('cat_xx_drink',   'xiaolan', '飲料 (Đồ uống)',                        '飲料',      'drinks',         'catalog',  'single',   0, 0, 1,  3, 0, '[]'),
('cat_xx_spicy',   'xiaolan', '辣度選擇 (Độ cay)',                      '辣度',      'spiciness',      'modifier', 'single',   1, 1, 1,  4, 0, '[]'),
('cat_xx_custom',  'xiaolan', '客制化客製選項 (Tùy chọn bỏ nguyên liệu)', '客製選項',  'customization',  'modifier', 'multiple', 0, 0, 10, 5, 0, '[]'),
('cat_xx_topping', 'xiaolan', '加料選項 (Thêm đồ)',                     '加料',      'toppings',       'modifier', 'multiple', 0, 0, 10, 6, 0, '[]')
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
-- Bánh mì (Catalog)
('item_xx_bm_01', 'xiaolan', 'cat_xx_banhmi', '越式麵包 (招牌) Bánh mì thịt',           110, NULL, '👍 招牌', 1, 1),
('item_xx_bm_02', 'xiaolan', 'cat_xx_banhmi', '打拋豬麵包 BM thịt băm vị thái',          110, NULL, NULL,     0, 2),
('item_xx_bm_03', 'xiaolan', 'cat_xx_banhmi', '荷包蛋麵包 BM trứng chả',                 100, NULL, NULL,     0, 3),
('item_xx_bm_04', 'xiaolan', 'cat_xx_banhmi', '沙爹牛肉麵包 BM bò xào satế',             150, NULL, NULL,     0, 4),
('item_xx_bm_05', 'xiaolan', 'cat_xx_banhmi', '起司蔬菜麵包 BM rau cải phô mai',          80, NULL, NULL,     0, 5),
('item_xx_bm_06', 'xiaolan', 'cat_xx_banhmi', '起司花生醬麵包 BM bơ đậu phộng phô mai', 100, NULL, NULL,     0, 6),
('item_xx_bm_07', 'xiaolan', 'cat_xx_banhmi', '空麵包 Bánh mì không',                     40, NULL, NULL,     0, 7),

-- Noodles / Rolls (Catalog)
('item_xx_nd_01', 'xiaolan', 'cat_xx_noodle', '涼拌米線 Bún thịt khìa',                  100, NULL, NULL,     0, 1),
('item_xx_nd_02', 'xiaolan', 'cat_xx_noodle', '涼拌粉捲粉 Bánh ướt',                     100, NULL, NULL,     0, 2),

-- Drinks (Catalog)
('item_xx_dr_01', 'xiaolan', 'cat_xx_drink', '越式煉乳咖啡 Cà phê sữa đá',               70, NULL, NULL,     0, 1),
('item_xx_dr_02', 'xiaolan', 'cat_xx_drink', '越式黑咖啡 Cà phê đen đá',                 60, NULL, NULL,     0, 2),
('item_xx_dr_03', 'xiaolan', 'cat_xx_drink', '羅望子冰茶 Nước đá me',                     80, NULL, NULL,     0, 3),

-- Spicy Modifiers
('opt_xx_sp_01', 'xiaolan', 'cat_xx_spicy', '大辣 (Cay nhiều)',                           0, NULL, NULL,     0, 1),
('opt_xx_sp_02', 'xiaolan', 'cat_xx_spicy', '中辣 (Cay vừa)',                             0, NULL, NULL,     0, 2),
('opt_xx_sp_03', 'xiaolan', 'cat_xx_spicy', '小辣 (Cay ít)',                              0, NULL, NULL,     0, 3),
('opt_xx_sp_04', 'xiaolan', 'cat_xx_spicy', '微辣辣椒醬 (Tương ớt)',                      0, NULL, NULL,     0, 4),
('opt_xx_sp_05', 'xiaolan', 'cat_xx_spicy', '不辣 (Không cay)',                           0, NULL, NULL,     0, 5),

-- Customization Modifiers
('opt_xx_cs_01', 'xiaolan', 'cat_xx_custom', '不加香菜 (Không ngò)',                      0, NULL, NULL,     0, 1),
('opt_xx_cs_02', 'xiaolan', 'cat_xx_custom', '不加豬肝醬 (Không patê)',                   0, NULL, NULL,     0, 2),
('opt_xx_cs_03', 'xiaolan', 'cat_xx_custom', '不加奶油 (Không bơ)',                       0, NULL, NULL,     0, 3),
('opt_xx_cs_04', 'xiaolan', 'cat_xx_custom', '不加泡菜 (Không dưa chua)',                 0, NULL, NULL,     0, 4),
('opt_xx_cs_05', 'xiaolan', 'cat_xx_custom', '不加小黃瓜 (Không dưa leo)',                0, NULL, NULL,     0, 5),

-- Topping Modifiers
('opt_xx_tp_01', 'xiaolan', 'cat_xx_topping', '加蛋 (Thêm trứng)',                        15, NULL, NULL,     0, 1)
ON CONFLICT(id) DO UPDATE SET
    tenant_id = excluded.tenant_id,
    category_id = excluded.category_id,
    name = excluded.name,
    price = excluded.price,
    description = excluded.description,
    badge_text = excluded.badge_text,
    is_recommended = excluded.is_recommended,
    sort_order = excluded.sort_order;
