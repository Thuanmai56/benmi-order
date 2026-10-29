-- ==============================================================================
-- Tenant Seed: yanxiansuji (炎鹽酥雞)
-- Description: Initial menu, categories, bundle rules, and store configuration
-- Execution:
--   echo "y" | npx wrangler d1 execute blab-db-production --remote --file=seeds/tenants/yanxiansuji.sql
-- ==============================================================================

-- 1. Seed Tenant
INSERT INTO tenants (id, name)
VALUES ('yanxiansuji', '炎鹽酥雞')
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
    line_channel_token,
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
    openrouter_model,
    customer_order_domain,
    legacy_liff_endpoint_url
) VALUES (
    'yanxiansuji',
    '炎鹽酥雞',
    '#e11d48',
    '新竹市北區北門街71號',
    '週一至週日',
    '🛵 外送專線：0983238058 (新竹市區 800元，竹北竹科 2000元 即可外送)',
    '12345678',
    'zh-TW',
    0,
    0,
    'open',
    'IIOMPnKgaOjafVSgR/Xbmfa36rQI+l2F4xec6H+9LlLjnK4NVuFKvDkENpRwc1D0d1nX5YJ8WIe9xqWvACcY9MVB6868bKjhzYBA2XmwH3P45lmzUlRb+L/5eC0W8b7GoevQ8oF9cx7RDLG/iGtzJAdB04t89/1O/w1cDnyilFU=',
    '2012204848-Khsh9BmY',
    'https://liff.line.me/2012204848-Khsh9BmY',
    'YZS',
    '["reports", "flex_notifications"]',
    'snack',
    1,
    1,
    24.8085,
    120.9668,
    'openai/gpt-oss-20b',
    'google/gemma-4-26b-a4b-it:free',
    'blabfood',
    'https://benmi-order.pages.dev/?tenant_id=yanxiansuji'
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
    line_channel_token = excluded.line_channel_token,
    liff_id = excluded.liff_id,
    liff_url = excluded.liff_url,
    order_prefix = excluded.order_prefix,
    features = excluded.features,
    cuisine_type = excluded.cuisine_type,
    is_marketplace_visible = excluded.is_marketplace_visible,
    is_active = excluded.is_active,
    latitude = excluded.latitude,
    longitude = excluded.longitude,
    groq_model = excluded.groq_model,
    openrouter_model = excluded.openrouter_model,
    customer_order_domain = excluded.customer_order_domain,
    legacy_liff_endpoint_url = excluded.legacy_liff_endpoint_url;

-- 3. Seed Menu Categories
INSERT INTO menu_categories (
    id, tenant_id, name, short_name, slug, category_type, selection_type,
    is_required, min_selection, max_selection, sort_order,
    allow_customization, applied_modifiers
) VALUES
-- 3.1 Catalog Categories (all linked to flavor-selection modifier)
('cat_yanzisuchun_signature', 'yanxiansuji', '招牌必點',       '招牌',     'signature',        'catalog',     'single', 0, 0, 1, 1, 1, '["cat_yanzisuchun_flavor"]'),
('cat_yanzisuchun_classic',   'yanxiansuji', '經典熱銷',       '經典',     'classic',          'catalog',     'single', 0, 0, 1, 2, 1, '["cat_yanzisuchun_flavor"]'),
('cat_yanzisuchun_snack',     'yanxiansuji', '點心區',         '點心',     'snack',            'catalog',     'single', 0, 0, 1, 3, 1, '["cat_yanzisuchun_flavor"]'),
('cat_yanzisuchun_fries',     'yanxiansuji', '著條控',         '薯條',     'fries',            'catalog',     'single', 0, 0, 1, 4, 1, '["cat_yanzisuchun_flavor"]'),
('cat_yanzisuchun_veggies',   'yanxiansuji', '來點青菜',       '青菜',     'veggies',          'catalog',     'single', 0, 0, 1, 5, 1, '["cat_yanzisuchun_flavor"]'),
('cat_yanzisuchun_combos',    'yanxiansuji', '分享與個人餐',   '套餐',     'combos',           'catalog',     'single', 0, 0, 1, 6, 1, '["cat_yanzisuchun_flavor"]'),

-- 3.2 Dish-level Modifier Category (Flavors / Seasoning)
('cat_yanzisuchun_flavor',    'yanxiansuji', '口味選擇',       '口味',     'flavor-selection', 'modifier',    'single', 1, 1, 1, 7, 0, '[]'),

-- 3.3 Bundle Pool for Combo Drink Choice (Hidden from standalone catalog)
('cat_yanzisuchun_drink_choice', 'yanxiansuji', '飲料選擇 (二擇一)', '飲料', 'drink-choice',     'bundle_pool', 'single', 1, 1, 1, 8, 0, '[]')
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
-- 4.1 招牌必點
('yzs_sig_01', 'yanxiansuji', 'cat_yanzisuchun_signature', '月亮蝦餅',     130, NULL, '招牌必點', 1, 1),
('yzs_sig_02', 'yanxiansuji', 'cat_yanzisuchun_signature', '香雞排',        85, NULL, NULL,       0, 2),
('yzs_sig_03', 'yanxiansuji', 'cat_yanzisuchun_signature', '無骨鹽酥雞',    60, NULL, NULL,       0, 3),
('yzs_sig_04', 'yanxiansuji', 'cat_yanzisuchun_signature', '三角骨',        60, NULL, NULL,       0, 4),
('yzs_sig_05', 'yanxiansuji', 'cat_yanzisuchun_signature', '雞皮',          60, NULL, NULL,       0, 5),
('yzs_sig_06', 'yanxiansuji', 'cat_yanzisuchun_signature', '魷魚圈',        60, NULL, NULL,       0, 6),
('yzs_sig_07', 'yanxiansuji', 'cat_yanzisuchun_signature', '大腸頭',        60, NULL, NULL,       0, 7),
('yzs_sig_08', 'yanxiansuji', 'cat_yanzisuchun_signature', '柳葉魚 (4隻)',  60, NULL, NULL,       0, 8),

-- 4.2 經典熱銷
('yzs_cls_01', 'yanxiansuji', 'cat_yanzisuchun_classic', '黃金豆腐 (半盒)', 40, NULL, NULL,       0, 1),
('yzs_cls_02', 'yanxiansuji', 'cat_yanzisuchun_classic', '黃金豆腐 (一盒)', 70, NULL, NULL,       0, 2),
('yzs_cls_03', 'yanxiansuji', 'cat_yanzisuchun_classic', '糯米腸',          30, NULL, NULL,       0, 3),
('yzs_cls_04', 'yanxiansuji', 'cat_yanzisuchun_classic', '甜不辣',          30, NULL, NULL,       0, 4),
('yzs_cls_05', 'yanxiansuji', 'cat_yanzisuchun_classic', '辦桌蝦餅',        30, NULL, NULL,       0, 5),
('yzs_cls_06', 'yanxiansuji', 'cat_yanzisuchun_classic', '米血',            20, NULL, NULL,       0, 6),
('yzs_cls_07', 'yanxiansuji', 'cat_yanzisuchun_classic', '蛋餅皮',          20, NULL, NULL,       0, 7),
('yzs_cls_08', 'yanxiansuji', 'cat_yanzisuchun_classic', '豆包',            20, NULL, NULL,       0, 8),
('yzs_cls_09', 'yanxiansuji', 'cat_yanzisuchun_classic', '花枝丸',          35, NULL, NULL,       0, 9),
('yzs_cls_10', 'yanxiansuji', 'cat_yanzisuchun_classic', '貢丸',            35, NULL, NULL,       0, 10),
('yzs_cls_11', 'yanxiansuji', 'cat_yanzisuchun_classic', '雞屁股',          40, NULL, NULL,       0, 11),
('yzs_cls_12', 'yanxiansuji', 'cat_yanzisuchun_classic', '雞心',            40, NULL, NULL,       0, 12),
('yzs_cls_13', 'yanxiansuji', 'cat_yanzisuchun_classic', '雞胗',            40, NULL, NULL,       0, 13),
('yzs_cls_14', 'yanxiansuji', 'cat_yanzisuchun_classic', '旗魚黑輪',        25, NULL, NULL,       0, 14),
('yzs_cls_15', 'yanxiansuji', 'cat_yanzisuchun_classic', '檸檬雞柳條',      30, NULL, NULL,       0, 15),
('yzs_cls_16', 'yanxiansuji', 'cat_yanzisuchun_classic', '魚豆腐',          30, NULL, NULL,       0, 16),
('yzs_cls_17', 'yanxiansuji', 'cat_yanzisuchun_classic', '炸蝦捲',          30, NULL, NULL,       0, 17),
('yzs_cls_18', 'yanxiansuji', 'cat_yanzisuchun_classic', '沙茶黑輪片',      30, NULL, NULL,       0, 18),
('yzs_cls_19', 'yanxiansuji', 'cat_yanzisuchun_classic', '豆干',            30, NULL, NULL,       0, 19),
('yzs_cls_20', 'yanxiansuji', 'cat_yanzisuchun_classic', '百葉豆腐',        30, NULL, NULL,       0, 20),
('yzs_cls_21', 'yanxiansuji', 'cat_yanzisuchun_classic', '魚板',            30, NULL, NULL,       0, 21),

-- 4.3 點心區
('yzs_snk_01', 'yanxiansuji', 'cat_yanzisuchun_snack', '炸湯圓 (花生粉)',   35, NULL, NULL,       0, 1),
('yzs_snk_02', 'yanxiansuji', 'cat_yanzisuchun_snack', '小肉豆',            35, NULL, NULL,       0, 2),
('yzs_snk_03', 'yanxiansuji', 'cat_yanzisuchun_snack', '銀絲卷',            30, NULL, NULL,       0, 3),
('yzs_snk_04', 'yanxiansuji', 'cat_yanzisuchun_snack', '煉乳銀絲卷',        35, NULL, NULL,       0, 4),
('yzs_snk_05', 'yanxiansuji', 'cat_yanzisuchun_snack', '蘿蔔糕',            20, NULL, NULL,       0, 5),
('yzs_snk_06', 'yanxiansuji', 'cat_yanzisuchun_snack', '甜芋條',            20, NULL, NULL,       0, 6),
('yzs_snk_07', 'yanxiansuji', 'cat_yanzisuchun_snack', '鹹芋粿巧',          35, NULL, NULL,       0, 7),
('yzs_snk_08', 'yanxiansuji', 'cat_yanzisuchun_snack', '雞塊',              40, NULL, NULL,       0, 8),
('yzs_snk_09', 'yanxiansuji', 'cat_yanzisuchun_snack', '烤雞翅 (2支)',      45, NULL, NULL,       0, 9),
('yzs_snk_10', 'yanxiansuji', 'cat_yanzisuchun_snack', '地瓜球',            40, NULL, NULL,       0, 10),
('yzs_snk_11', 'yanxiansuji', 'cat_yanzisuchun_snack', '熱狗',              25, NULL, NULL,       0, 11),
('yzs_snk_12', 'yanxiansuji', 'cat_yanzisuchun_snack', '鑫鑫腸',            25, NULL, NULL,       0, 12),
('yzs_snk_13', 'yanxiansuji', 'cat_yanzisuchun_snack', '洋蔥圈',            40, NULL, NULL,       0, 13),

-- 4.4 著條控
('yzs_fr_01', 'yanxiansuji', 'cat_yanzisuchun_fries', '美國粗脆薯',         40, NULL, NULL,       0, 1),
('yzs_fr_02', 'yanxiansuji', 'cat_yanzisuchun_fries', '細薯條',             40, NULL, NULL,       0, 2),
('yzs_fr_03', 'yanxiansuji', 'cat_yanzisuchun_fries', '瓜瓜園地瓜薯條',     40, NULL, NULL,       0, 3),
('yzs_fr_04', 'yanxiansuji', 'cat_yanzisuchun_fries', '混薯 (脆+細)',       40, NULL, NULL,       0, 4),

-- 4.5 來點青菜
('yzs_vg_01', 'yanxiansuji', 'cat_yanzisuchun_veggies', '杏鮑菇',           40, NULL, NULL,       0, 1),
('yzs_vg_02', 'yanxiansuji', 'cat_yanzisuchun_veggies', '四季豆',           40, NULL, NULL,       0, 2),
('yzs_vg_03', 'yanxiansuji', 'cat_yanzisuchun_veggies', '玉米',             40, NULL, NULL,       0, 3),
('yzs_vg_04', 'yanxiansuji', 'cat_yanzisuchun_veggies', '玉米筍',           40, NULL, NULL,       0, 4),
('yzs_vg_05', 'yanxiansuji', 'cat_yanzisuchun_veggies', '櫛瓜',             40, NULL, NULL,       0, 5),
('yzs_vg_06', 'yanxiansuji', 'cat_yanzisuchun_veggies', '青椒',             40, NULL, NULL,       0, 6),
('yzs_vg_07', 'yanxiansuji', 'cat_yanzisuchun_veggies', '小黃瓜',           40, NULL, NULL,       0, 7),

-- 4.6 分享與個人餐
('yzs_cb_01', 'yanxiansuji', 'cat_yanzisuchun_combos', '亂炸分享餐 $200',   200, '亂炸分享餐', NULL, 0, 1),
('yzs_cb_02', 'yanxiansuji', 'cat_yanzisuchun_combos', '亂炸分享餐 $300',   300, '亂炸分享餐', NULL, 0, 2),
('yzs_cb_03', 'yanxiansuji', 'cat_yanzisuchun_combos', '亂炸分享餐 $500',   500, '亂炸分享餐', NULL, 0, 3),
('yzs_cb_04', 'yanxiansuji', 'cat_yanzisuchun_combos', '個人獨享餐 (雞排+甜不辣+米血+可樂或綠茶擇一)', 150, '內含：雞排、甜不辣、米血，可樂或綠茶擇一', '超值', 1, 4),

-- 4.7 口味選擇 (Modifier Items)
('yzs_fl_01', 'yanxiansuji', 'cat_yanzisuchun_flavor', '不加調味',            0, NULL, NULL,       0, 1),
('yzs_fl_02', 'yanxiansuji', 'cat_yanzisuchun_flavor', '胡椒',                0, NULL, NULL,       0, 2),
('yzs_fl_03', 'yanxiansuji', 'cat_yanzisuchun_flavor', '海苔椒鹽',            0, NULL, NULL,       0, 3),
('yzs_fl_04', 'yanxiansuji', 'cat_yanzisuchun_flavor', '小辣',                0, NULL, NULL,       0, 4),
('yzs_fl_05', 'yanxiansuji', 'cat_yanzisuchun_flavor', '山葵椒鹽',            0, NULL, NULL,       0, 5),
('yzs_fl_06', 'yanxiansuji', 'cat_yanzisuchun_flavor', '青花椒鹽',            0, NULL, NULL,       0, 6),
('yzs_fl_07', 'yanxiansuji', 'cat_yanzisuchun_flavor', '咖哩椒鹽',            0, NULL, NULL,       0, 7),
('yzs_fl_08', 'yanxiansuji', 'cat_yanzisuchun_flavor', '沙茶椒鹽',            0, NULL, NULL,       0, 8),
('yzs_fl_09', 'yanxiansuji', 'cat_yanzisuchun_flavor', '胡椒梅粉',            0, NULL, NULL,       0, 9),
('yzs_fl_10', 'yanxiansuji', 'cat_yanzisuchun_flavor', '梅粉',                0, NULL, NULL,       0, 10),

-- 4.8 飲料選擇 (Bundle Pool Items for 個人獨享餐)
('yzs_drk_01', 'yanxiansuji', 'cat_yanzisuchun_drink_choice', '可樂',         0, NULL, NULL,       0, 1),
('yzs_drk_02', 'yanxiansuji', 'cat_yanzisuchun_drink_choice', '綠茶',         0, NULL, NULL,       0, 2)
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
    'custom_yzs_bag',
    'yanxiansuji',
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

-- 6. Seed Bundle Rules (Mandatory Drink choice for 個人獨享餐 yzs_cb_04)
INSERT INTO menu_bundle_rules (id, tenant_id, parent_item_id, schema_version, config_json)
VALUES (
    'rule_yzs_cb_04_drink',
    'yanxiansuji',
    'yzs_cb_04',
    1,
    '{"version":1,"groups":[{"id":"drink-choice","name":"飲料選擇 (二擇一)","label":{"zh-TW":"請選擇 1 樣飲料","vi":"Chọn 1 loại đồ uống"},"minQuantity":1,"maxQuantity":1,"allowRepeat":false,"sources":[{"type":"category","categoryId":"cat_yanzisuchun_drink_choice"}],"pricing":{"type":"included"}}]}'
)
ON CONFLICT(tenant_id, parent_item_id) DO UPDATE SET
    schema_version = excluded.schema_version,
    config_json = excluded.config_json,
    is_active = excluded.is_active;

-- 7. Canonical Unified Option Groups & Options (Schema v2)
-- 7.1 Order-level Bag Customization
INSERT INTO modifier_groups (
    id, tenant_id, name, selection_type, is_required, min_selection, max_selection, sort_order, scope, auto_popup, source_metadata_json
) VALUES (
    'mg_cust_yanxiansuji_custom_yzs_bag',
    'yanxiansuji',
    '✦ 響應環保 / 提袋加購',
    'single',
    0,
    0,
    1,
    0,
    'order',
    0,
    '{"source_table":"menu_customizations","source_id":"custom_yzs_bag","legacy_key":"bag","legacy_type":"radio"}'
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
    'opt_yzs_bag_none',
    'yanxiansuji',
    'mg_cust_yanxiansuji_custom_yzs_bag',
    '不需要提袋',
    0,
    1,
    0,
    '[]',
    '[]',
    '{"source_table":"menu_customizations.options_json","source_group_id":"custom_yzs_bag","source_option_id":"bag_none"}'
),
(
    'opt_yzs_bag_buy',
    'yanxiansuji',
    'mg_cust_yanxiansuji_custom_yzs_bag',
    '購買提袋 (+1元)',
    1,
    0,
    1,
    '[]',
    '[]',
    '{"source_table":"menu_customizations.options_json","source_group_id":"custom_yzs_bag","source_option_id":"bag_buy"}'
) ON CONFLICT(id) DO UPDATE SET
    name = excluded.name,
    price = excluded.price,
    is_default = excluded.is_default,
    sort_order = excluded.sort_order;

-- 7.2 Category-level Flavor Group (口味選擇)
INSERT INTO modifier_groups (
    id, tenant_id, name, selection_type, is_required, min_selection, max_selection, sort_order, scope, auto_popup, source_metadata_json
) VALUES (
    'mg_cat_yanxiansuji_cat_yanzisuchun_flavor',
    'yanxiansuji',
    '口味選擇',
    'single',
    0,
    0,
    1,
    7,
    'category',
    0,
    '{"source_table":"menu_categories","source_id":"cat_yanzisuchun_flavor","slug":"cat_yanzisuchun_flavor","category_type":"modifier"}'
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
('opt_yzs_fl_01', 'yanxiansuji', 'mg_cat_yanxiansuji_cat_yanzisuchun_flavor', '椒鹽',     0, 1, 1,  '[]', '[]', '{"source_table":"menu_items","source_item_id":"yzs_fl_01"}'),
('opt_yzs_fl_02', 'yanxiansuji', 'mg_cat_yanxiansuji_cat_yanzisuchun_flavor', '胡椒',     0, 0, 2,  '[]', '[]', '{"source_table":"menu_items","source_item_id":"yzs_fl_02"}'),
('opt_yzs_fl_03', 'yanxiansuji', 'mg_cat_yanxiansuji_cat_yanzisuchun_flavor', '海苔椒鹽', 0, 0, 3,  '[]', '[]', '{"source_table":"menu_items","source_item_id":"yzs_fl_03"}'),
('opt_yzs_fl_04', 'yanxiansuji', 'mg_cat_yanxiansuji_cat_yanzisuchun_flavor', '小辣',     0, 0, 4,  '[]', '[]', '{"source_table":"menu_items","source_item_id":"yzs_fl_04"}'),
('opt_yzs_fl_05', 'yanxiansuji', 'mg_cat_yanxiansuji_cat_yanzisuchun_flavor', '山葵椒鹽', 0, 0, 5,  '[]', '[]', '{"source_table":"menu_items","source_item_id":"yzs_fl_05"}'),
('opt_yzs_fl_06', 'yanxiansuji', 'mg_cat_yanxiansuji_cat_yanzisuchun_flavor', '青花椒鹽', 0, 0, 6,  '[]', '[]', '{"source_table":"menu_items","source_item_id":"yzs_fl_06"}'),
('opt_yzs_fl_07', 'yanxiansuji', 'mg_cat_yanxiansuji_cat_yanzisuchun_flavor', '咖哩椒鹽', 0, 0, 7,  '[]', '[]', '{"source_table":"menu_items","source_item_id":"yzs_fl_07"}'),
('opt_yzs_fl_08', 'yanxiansuji', 'mg_cat_yanxiansuji_cat_yanzisuchun_flavor', '沙茶椒鹽', 0, 0, 8,  '[]', '[]', '{"source_table":"menu_items","source_item_id":"yzs_fl_08"}'),
('opt_yzs_fl_09', 'yanxiansuji', 'mg_cat_yanxiansuji_cat_yanzisuchun_flavor', '胡椒梅粉', 0, 0, 9,  '[]', '[]', '{"source_table":"menu_items","source_item_id":"yzs_fl_09"}'),
('opt_yzs_fl_10', 'yanxiansuji', 'mg_cat_yanxiansuji_cat_yanzisuchun_flavor', '梅粉',     0, 0, 10, '[]', '[]', '{"source_table":"menu_items","source_item_id":"yzs_fl_10"}')
ON CONFLICT(id) DO UPDATE SET
    name = excluded.name,
    price = excluded.price,
    is_default = excluded.is_default,
    sort_order = excluded.sort_order;

INSERT INTO item_modifier_links (tenant_id, item_id, group_id, sort_order)
SELECT p.tenant_id, p.id, mapping.column3, mapping.column4
FROM (VALUES
('yanxiansuji', 'cat_yanzisuchun_signature', 'mg_cat_yanxiansuji_cat_yanzisuchun_flavor', 0),
('yanxiansuji', 'cat_yanzisuchun_classic',   'mg_cat_yanxiansuji_cat_yanzisuchun_flavor', 0),
('yanxiansuji', 'cat_yanzisuchun_snack',     'mg_cat_yanxiansuji_cat_yanzisuchun_flavor', 0),
('yanxiansuji', 'cat_yanzisuchun_fries',     'mg_cat_yanxiansuji_cat_yanzisuchun_flavor', 0),
('yanxiansuji', 'cat_yanzisuchun_veggies',   'mg_cat_yanxiansuji_cat_yanzisuchun_flavor', 0),
('yanxiansuji', 'cat_yanzisuchun_combos',    'mg_cat_yanxiansuji_cat_yanzisuchun_flavor', 0)
) AS mapping
JOIN menu_items p ON p.tenant_id = mapping.column1 AND p.category_id = mapping.column2
WHERE 1
ON CONFLICT(tenant_id, item_id, group_id) DO NOTHING;

-- 7.3 Combo / Bundle Rule for 個人獨享餐 (yzs_cb_04)
INSERT INTO modifier_groups (
    id, tenant_id, name, selection_type, is_required, min_selection, max_selection, sort_order, scope,
    allow_repeats, included, sources_json, labels_json, auto_popup, source_metadata_json
) VALUES (
    'ug_rule_yzs_cb_04_drink_0',
    'yanxiansuji',
    '飲料選擇 (二擇一)',
    'single',
    1,
    1,
    1,
    0,
    'item',
    0,
    0,
    '[{"type":"category","categoryId":"cat_yanzisuchun_drink_choice"}]',
    '{"zh-TW":"請選擇 1 樣飲料","vi":"Chọn 1 loại đồ uống"}',
    1,
    '{"legacyBundleRuleId":"rule_yzs_cb_04_drink","legacyGroupId":"drink-choice","legacySurcharges":{}}'
) ON CONFLICT(id) DO UPDATE SET
    name = excluded.name,
    selection_type = excluded.selection_type,
    is_required = excluded.is_required,
    min_selection = excluded.min_selection,
    max_selection = excluded.max_selection,
    sort_order = excluded.sort_order,
    scope = excluded.scope,
    included = excluded.included,
    sources_json = excluded.sources_json,
    labels_json = excluded.labels_json,
    auto_popup = excluded.auto_popup;

INSERT INTO item_modifier_links (tenant_id, item_id, group_id, sort_order, is_disabled)
VALUES (
    'yanxiansuji',
    'yzs_cb_04',
    'ug_rule_yzs_cb_04_drink_0',
    0,
    0
) ON CONFLICT(tenant_id, item_id, group_id) DO UPDATE SET
    sort_order = excluded.sort_order,
    is_disabled = excluded.is_disabled;
