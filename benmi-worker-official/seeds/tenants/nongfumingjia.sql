-- ==============================================================================
-- Tenant Seed: nongfumingjia (韓國農夫泡菜園)
-- Description: Initial menu, categories, and store configuration
-- Execution:
--   echo "y" | npx wrangler d1 execute blab-db-production --remote --file=seeds/tenants/nongfumingjia.sql
-- ==============================================================================

-- 1. Seed Tenant
INSERT INTO tenants (id, name)
VALUES ('nongfumingjia', '韓國農夫泡菜園')
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
    'nongfumingjia',
    '韓國農夫泡菜園',
    '#e11d48',
    '台南市東區東光路123號後甲黃昏市場119',
    '週一至週日 14:00 - 19:30',
    '',
    '12345678',
    'zh-TW',
    1,
    0,
    'open',
    '2009560906-c5taZfiY',
    'https://liff.line.me/2009560906-c5taZfiY',
    'NFM',
    '["reports", "flex_notifications"]',
    'korean',
    1,
    1,
    22.9926,
    120.2319,
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

-- 3. Seed Menu Categories
INSERT INTO menu_categories (
    id, tenant_id, name, short_name, slug, category_type, selection_type,
    is_required, min_selection, max_selection, sort_order,
    allow_customization, applied_modifiers
) VALUES
('cat_nfm_kimchi',  'nongfumingjia', '泡菜類', '泡菜', 'kimchi',      'catalog', 'single', 0, 0, 1, 1, 0, '[]'),
('cat_nfm_cooked',  'nongfumingjia', '熟食',   '熟食', 'cooked-food', 'catalog', 'single', 0, 0, 1, 2, 0, '[]'),
('cat_nfm_braised', 'nongfumingjia', '滷味',   '滷味', 'braised',     'catalog', 'single', 0, 0, 1, 3, 0, '[]')
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

-- 4. Seed Menu Items
INSERT INTO menu_items (
    id, tenant_id, category_id, name, price, description, badge_text, is_recommended, sort_order
) VALUES
-- 4.1 泡菜類
('item_nfm_kc_01', 'nongfumingjia', 'cat_nfm_kimchi', '泡菜',        100, NULL, NULL, 0, 1),
('item_nfm_kc_02', 'nongfumingjia', 'cat_nfm_kimchi', '拌桔梗',      100, NULL, NULL, 0, 2),
('item_nfm_kc_03', 'nongfumingjia', 'cat_nfm_kimchi', '乾青蘿蔔條',  100, NULL, NULL, 0, 3),
('item_nfm_kc_04', 'nongfumingjia', 'cat_nfm_kimchi', '拌小蔥',      100, NULL, NULL, 0, 4),
('item_nfm_kc_05', 'nongfumingjia', 'cat_nfm_kimchi', '泡菜大包',    260, NULL, NULL, 0, 5),

-- 4.2 熟食
('item_nfm_cf_01', 'nongfumingjia', 'cat_nfm_cooked', '魷魚炒年糕',  100, NULL, NULL, 0, 1),
('item_nfm_cf_02', 'nongfumingjia', 'cat_nfm_cooked', '迷你紫菜捲',  100, NULL, NULL, 0, 2),
('item_nfm_cf_03', 'nongfumingjia', 'cat_nfm_cooked', '雜菜冬粉',    100, NULL, NULL, 0, 3),
('item_nfm_cf_04', 'nongfumingjia', 'cat_nfm_cooked', '拳頭飯',      100, NULL, NULL, 0, 4),
('item_nfm_cf_05', 'nongfumingjia', 'cat_nfm_cooked', '魷魚煎餅',    100, NULL, NULL, 0, 5),

-- 4.3 滷味
('item_nfm_br_01', 'nongfumingjia', 'cat_nfm_braised', '麻辣鴨頭(3支)', 130, NULL, NULL, 0, 1),
('item_nfm_br_02', 'nongfumingjia', 'cat_nfm_braised', '麻辣鴨翅(3支)', 130, NULL, NULL, 0, 2),
('item_nfm_br_03', 'nongfumingjia', 'cat_nfm_braised', '麻辣鴨脖(3支)', 130, NULL, NULL, 0, 3),
('item_nfm_br_04', 'nongfumingjia', 'cat_nfm_braised', '麻辣鴨舌(8支)', 120, NULL, NULL, 0, 4)
ON CONFLICT(id) DO UPDATE SET
    tenant_id = excluded.tenant_id,
    category_id = excluded.category_id,
    name = excluded.name,
    price = excluded.price,
    description = excluded.description,
    badge_text = excluded.badge_text,
    is_recommended = excluded.is_recommended,
    sort_order = excluded.sort_order;

-- 5. Seed Menu Customizations (Order-level option: Bag)
INSERT INTO menu_customizations (id, tenant_id, key, title, type, sort_order, options_json)
VALUES (
    'custom_nfm_bag',
    'nongfumingjia',
    'bag',
    '✦ 響應環保 / 提袋加購',
    'radio',
    0,
    '[{"id":"bag_none","name":"不需要提袋","price":0,"is_default":true},{"id":"bag_buy","name":"購買提袋 (+1元)","price":1,"is_default":false}]'
)
ON CONFLICT(id) DO UPDATE SET
    tenant_id = excluded.tenant_id,
    key = excluded.key,
    title = excluded.title,
    type = excluded.type,
    sort_order = excluded.sort_order,
    options_json = excluded.options_json;

-- 6. Canonical Unified Option Groups & Options (Schema v2)
INSERT INTO modifier_groups (
    id, tenant_id, name, selection_type, is_required, min_selection, max_selection, sort_order, scope, auto_popup, source_metadata_json
) VALUES (
    'mg_cust_nongfumingjia_custom_nfm_bag',
    'nongfumingjia',
    '✦ 響應環保 / 提袋加購',
    'single',
    0,
    0,
    1,
    0,
    'order',
    0,
    '{"source_table":"menu_customizations","source_id":"custom_nfm_bag","legacy_key":"bag","legacy_type":"radio"}'
) ON CONFLICT(id) DO UPDATE SET
    name = excluded.name,
    selection_type = excluded.selection_type,
    is_required = excluded.is_required,
    min_selection = excluded.min_selection,
    max_selection = excluded.max_selection,
    sort_order = excluded.sort_order,
    scope = excluded.scope;

INSERT INTO modifier_options (
    id, tenant_id, group_id, name, price, is_default, sort_order, sub_options_json, eligibility_rules_json, source_metadata_json
) VALUES
(
    'opt_nfm_bag_none',
    'nongfumingjia',
    'mg_cust_nongfumingjia_custom_nfm_bag',
    '不需要提袋',
    0,
    1,
    0,
    '[]',
    '[]',
    '{"source_table":"menu_customizations.options_json","source_group_id":"custom_nfm_bag","source_option_id":"bag_none"}'
),
(
    'opt_nfm_bag_buy',
    'nongfumingjia',
    'mg_cust_nongfumingjia_custom_nfm_bag',
    '購買提袋 (+1元)',
    1,
    0,
    1,
    '[]',
    '[]',
    '{"source_table":"menu_customizations.options_json","source_group_id":"custom_nfm_bag","source_option_id":"bag_buy"}'
) ON CONFLICT(id) DO UPDATE SET
    name = excluded.name,
    price = excluded.price,
    is_default = excluded.is_default,
    sort_order = excluded.sort_order;
