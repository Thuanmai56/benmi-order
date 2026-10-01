-- ==============================================================================
-- Tenant Seed: miyansuo (米研所 Rice Bakery)
-- Description: Initial menu, categories, bundle rules, and store configuration
-- Execution:
--   npx wrangler d1 execute <database_name> --remote [--env dev|test] --file=seeds/tenants/miyansuo.sql
-- ==============================================================================

-- 1. Seed Tenant
INSERT INTO tenants (id, name)
VALUES ('miyansuo', '米研所 Rice Bakery')
ON CONFLICT(id) DO UPDATE SET name = excluded.name;

-- 2. Seed Tenant Config
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
    cuisine_type,
    is_marketplace_visible,
    is_active,
    latitude,
    longitude,
    groq_model,
    openrouter_model
) VALUES (
    'miyansuo',
    '米研所 Rice Bakery',
    '#f59e0b',
    '新店區明德路54號 (尤米沙龍門口)',
    '{"0":[{"start":"13:00","end":"19:00"}],"1":[{"start":"13:00","end":"19:00"}],"2":[{"start":"13:00","end":"19:00"}],"3":[{"start":"13:00","end":"19:00"}],"4":[{"start":"13:00","end":"19:00"}],"5":[{"start":"13:00","end":"19:00"}],"6":[{"start":"13:00","end":"19:00"}]}',
    '🛵 20份以上訂購，請提早2-3天預訂。大量訂購皆可提供客製化服務，歡迎透過官方LINE (@466welww) 與我們洽詢。',
    '12345678',
    'zh-TW',
    1,
    0,
    'open',
    '2009560906-c5taZfiY',
    'https://liff.line.me/2009560906-c5taZfiY',
    'MY',
    '["reports", "flex_notifications"]',
    'snack',
    1,
    1,
    24.9745,
    121.5412,
    'openai/gpt-oss-20b',
    'google/gemma-4-26b-a4b-it:free'
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
    cuisine_type = excluded.cuisine_type,
    is_marketplace_visible = excluded.is_marketplace_visible,
    is_active = excluded.is_active,
    latitude = excluded.latitude,
    longitude = excluded.longitude,
    groq_model = excluded.groq_model,
    openrouter_model = excluded.openrouter_model;

-- 3. Clean up obsolete dish modifier if previously seeded
DELETE FROM menu_items WHERE tenant_id = 'miyansuo' AND category_id = 'cat_mys_packaging';
DELETE FROM menu_categories WHERE tenant_id = 'miyansuo' AND id = 'cat_mys_packaging';

-- 4. Seed Menu Categories
INSERT INTO menu_categories (
    id, tenant_id, name, short_name, slug, category_type, selection_type,
    is_required, min_selection, max_selection, sort_order,
    allow_customization, applied_modifiers
) VALUES
-- Order Customization Section (Top position, similar to BSC flavor section)
('cat_mys_sec_flavor',     'miyansuo', '加購服務 / 響應環保',       '提袋加購',   'sec-flavor',     'order_customization', 'single',   0, 0, 1, 0, 0, '[]'),

-- Catalog Categories
('cat_mys_egg_cake_small', 'miyansuo', '雞蛋糕 (小份 5入)',     '小份 (5入)',   'egg-cake-small', 'catalog',             'single',   0, 0, 1, 1, 0, '[]'),
('cat_mys_sharing_box',    'miyansuo', '經典分享盒 (大份 10入)', '分享盒 (10入)', 'sharing-box',    'catalog',             'single',   0, 0, 1, 2, 0, '[]'),

-- Bundle Pool for Sharing Box Flavors (Hidden from standalone catalog/modifiers)
('cat_mys_flavors',        'miyansuo', '口味選擇 (任選2種)',     '口味',         'flavors',        'bundle_pool',         'multiple', 1, 2, 2, 10, 0, '[]')
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

-- 5. Seed Menu Items
INSERT INTO menu_items (
    id, tenant_id, category_id, name, price, description, badge_text, is_recommended, sort_order
) VALUES
-- 5.1 雞蛋糕 (小份 5入)
('mys_ec_01', 'miyansuo', 'cat_mys_egg_cake_small', '原味雞蛋糕 (5入)',       60, '純粹濃郁蛋奶香，經典原味', NULL, 0, 1),
('mys_ec_02', 'miyansuo', 'cat_mys_egg_cake_small', '奶酥雞蛋糕 (5入)',       65, '特調香濃奶酥內餡，醇厚香甜', NULL, 0, 2),
('mys_ec_03', 'miyansuo', 'cat_mys_egg_cake_small', '巧克力雞蛋糕 (5入)',     65, '濃郁絲滑特選巧克力，大人小孩都喜愛', NULL, 0, 3),
('mys_ec_04', 'miyansuo', 'cat_mys_egg_cake_small', '牽絲起司雞蛋糕 (5入)',   70, '香濃起司熱騰騰牽絲，鹹甜絕配', '人氣必點', 1, 4),
('mys_ec_05', 'miyansuo', 'cat_mys_egg_cake_small', '香草籽卡士達雞蛋糕 (5入)', 80, '每日限量口味，嚴選天然香草籽特調卡士達', '限量', 0, 5),
('mys_ec_06', 'miyansuo', 'cat_mys_egg_cake_small', '開心果醬雞蛋糕 (5入)',   90, '每日限量口味，濃郁開心果堅果香氣', '限量', 0, 6),

-- 5.2 經典分享盒 (大份 10入)
('mys_sb_01', 'miyansuo', 'cat_mys_sharing_box', '經典分享盒 (10入)', 130, '原味、奶酥、巧克力、起司，可任選兩種搭配', '經典', 1, 1),

-- 5.3 經典分享盒口味選擇 (Bundle Pool Items)
('mys_flv_01', 'miyansuo', 'cat_mys_flavors', '原味',     0, '經典原味蛋奶香', NULL, 0, 1),
('mys_flv_02', 'miyansuo', 'cat_mys_flavors', '奶酥',     0, '特調香濃奶酥',   NULL, 0, 2),
('mys_flv_03', 'miyansuo', 'cat_mys_flavors', '巧克力',   0, '濃郁絲滑巧克力', NULL, 0, 3),
('mys_flv_04', 'miyansuo', 'cat_mys_flavors', '牽絲起司', 0, '鹹香牽絲起司',   NULL, 0, 4)
ON CONFLICT(id) DO UPDATE SET
    tenant_id = excluded.tenant_id,
    category_id = excluded.category_id,
    name = excluded.name,
    price = excluded.price,
    description = excluded.description,
    badge_text = excluded.badge_text,
    is_recommended = excluded.is_recommended,
    sort_order = excluded.sort_order;

-- 6. Seed Menu Customizations (Order-level options, rendered at top of menu)
INSERT INTO menu_customizations (id, tenant_id, key, title, type, sort_order, options_json)
VALUES (
    'custom_mys_bag',
    'miyansuo',
    'bag',
    '✦ 響應環保 / 提袋加購',
    'radio',
    0,
    '[{"id":"bag_none","name":"不需要提袋","price":0,"is_default":true},{"id":"bag_buy","name":"購買提袋","price":1,"is_default":false}]'
)
ON CONFLICT(id) DO UPDATE SET
    tenant_id = excluded.tenant_id,
    key = excluded.key,
    title = excluded.title,
    type = excluded.type,
    sort_order = excluded.sort_order,
    options_json = excluded.options_json;

-- 7. Seed Universal Bundle Selection Rules for 經典分享盒 (10入)
INSERT INTO menu_bundle_rules (id, tenant_id, parent_item_id, schema_version, config_json)
VALUES (
    'rule_mys_bundle_sb_01',
    'miyansuo',
    'mys_sb_01',
    1,
    '{"version":1,"groups":[{"id":"flavors","name":"口味選擇 (任選2種)","label":{"zh-TW":"請選擇 2 樣口味搭配","vi":"Chọn 2 vị kết hợp"},"minQuantity":2,"maxQuantity":2,"allowRepeat":true,"sources":[{"type":"category","categoryId":"cat_mys_flavors"}],"pricing":{"type":"included"}}]}'
)
ON CONFLICT(tenant_id, parent_item_id) DO UPDATE SET
    schema_version = excluded.schema_version,
    config_json = excluded.config_json,
    is_active = excluded.is_active;
