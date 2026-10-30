-- ==============================================================================
-- Tenant Seed: dafobenwan (大佛本丸)
-- Description: Initial menu catalog, unified option groups, and store config
-- Execution (from benmi-worker-official/):
--   node scripts/run-seed.cjs <dev|test|prod> seeds/tenants/dafobenwan.sql
-- ==============================================================================

-- 1. Seed Tenant
INSERT INTO tenants (id, name)
VALUES ('dafobenwan', '大佛本丸')
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
    'dafobenwan',
    '大佛本丸',
    '#f59e0b',
    '新北市三重區頂崁街210巷54號',
    '06:00-13:00',
    '歡迎加Line提前預約，團體、學校、公司歡迎訂購。',
    '12345678',
    'zh-TW',
    1,
    0,
    'open',
    '9/3qOxyCsS+ajb2OmYWAzilRNjLlutqvgp3LYSX0wRIv07srdAwt43dccaHWQ5CIRc2c59L78R/b2fiMbMKsT/nangHydUgiLSt73rvJsZkPic/CSMph0JeDT2QRRZQgmgAyU30a+sKt8Z0VEeMvTgdB04t89/1O/w1cDnyilFU=',
    '2012284059-Tz7lGqsh',
    'https://liff.line.me/2012284059-Tz7lGqsh',
    'DFBW',
    '["reports", "flex_notifications"]',
    'snack',
    1,
    1,
    25.0609,
    121.4728,
    'openai/gpt-oss-20b',
    'google/gemma-4-26b-a4b-it:free',
    'blabfood',
    'https://benmi-order.pages.dev/?tenant_id=dafobenwan'
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

-- 3. Seed Menu Categories (Unified Option Groups only: applied_modifiers = '[]')
INSERT INTO menu_categories (
    id, tenant_id, name, short_name, slug, category_type, selection_type,
    is_required, min_selection, max_selection, sort_order,
    allow_customization, applied_modifiers
) VALUES
('cat_df_popular_rice_balls', 'dafobenwan', '人氣飯糰', '人氣', 'popular-rice-balls', 'catalog', 'single', 0, 0, 1, 1, 1, '[]'),
('cat_df_special_rice_balls', 'dafobenwan', '特色飯糰', '特色', 'special-rice-balls', 'catalog', 'single', 0, 0, 1, 2, 1, '[]'),
('cat_df_upgrade_rice_balls', 'dafobenwan', '升級飯糰', '升級', 'upgrade-rice-balls', 'catalog', 'single', 0, 0, 1, 3, 1, '[]'),
('cat_df_porridge',           'dafobenwan', '粥品',     '粥品', 'porridge',           'catalog', 'single', 0, 0, 1, 4, 1, '[]'),
('cat_df_drinks',             'dafobenwan', '飲品',     '飲品', 'drinks',             'catalog', 'single', 0, 0, 1, 5, 0, '[]')
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
-- 4.1 人氣飯糰
('df_rb_01', 'dafobenwan', 'cat_df_popular_rice_balls', '傳統飯糰',     50, '肉鬆、菜脯、酸菜、油條、滷蛋',         '讚爆', 1, 1),
('df_rb_02', 'dafobenwan', 'cat_df_popular_rice_balls', '辣味飯糰',     50, '肉鬆、辣菜脯、酸菜、油條、滷蛋',       '讚爆', 1, 2),
('df_rb_03', 'dafobenwan', 'cat_df_popular_rice_balls', '素鬆飯糰',     50, '素鬆、菜脯、酸菜、油條、豆皮',         '讚爆', 1, 3),
('df_rb_04', 'dafobenwan', 'cat_df_popular_rice_balls', '素筍飯糰',     50, '素筍、菜脯、酸菜、油條、豆皮',         NULL,   0, 4),
('df_rb_05', 'dafobenwan', 'cat_df_popular_rice_balls', '甜鹹飯糰',     50, '肉鬆、菜脯、酸菜、油條、花生粉',       NULL,   0, 5),
('df_rb_06', 'dafobenwan', 'cat_df_popular_rice_balls', '玉米飯糰',     50, '肉鬆、菜脯、酸菜、油條、玉米',         NULL,   0, 6),

-- 4.2 特色飯糰
('df_rb_07', 'dafobenwan', 'cat_df_special_rice_balls', '辣醬皮蛋飯糰', 60, '肉鬆、菜脯、酸菜、油條、辣皮蛋',       '讚爆', 1, 1),
('df_rb_08', 'dafobenwan', 'cat_df_special_rice_balls', '經典鮪魚飯糰', 60, '肉鬆、菜脯、酸菜、油條、鮪魚',         '讚爆', 1, 2),
('df_rb_09', 'dafobenwan', 'cat_df_special_rice_balls', '韓式泡菜飯糰', 60, '肉鬆、菜脯、酸菜、油條、泡菜',         '讚爆', 1, 3),
('df_rb_10', 'dafobenwan', 'cat_df_special_rice_balls', '剝皮辣椒飯糰', 60, '肉鬆、菜脯、酸菜、油條、剝皮辣椒',     NULL,   0, 4),
('df_rb_11', 'dafobenwan', 'cat_df_special_rice_balls', '鹹蛋肉鬆飯糰', 60, '肉鬆、菜脯、酸菜、油條、鹹蛋',         NULL,   0, 5),
('df_rb_12', 'dafobenwan', 'cat_df_special_rice_balls', '金沙肉鬆飯糰', 60, '肉鬆、菜脯、酸菜、油條、金沙',         NULL,   0, 6),
('df_rb_13', 'dafobenwan', 'cat_df_special_rice_balls', '海苔香蛋飯糰', 60, '肉鬆、菜脯、酸菜、油條、海苔蛋',       NULL,   0, 7),

-- 4.3 升級飯糰
('df_rb_14', 'dafobenwan', 'cat_df_upgrade_rice_balls', '嫩煎豬排飯糰', 70, '肉鬆、菜脯、酸菜、油條、滷蛋、豬排',   '讚爆', 1, 1),
('df_rb_15', 'dafobenwan', 'cat_df_upgrade_rice_balls', '香嫩燻雞飯糰', 70, '肉鬆、菜脯、酸菜、油條、滷蛋、燻雞',   NULL,   0, 2),
('df_rb_16', 'dafobenwan', 'cat_df_upgrade_rice_balls', '素瓜仔肉飯糰', 70, '素鬆、菜脯、酸菜、油條、豆皮、素瓜仔肉', '讚爆', 1, 3),

-- 4.4 粥品
('df_pr_01_s', 'dafobenwan', 'cat_df_porridge', '皮蛋粥 (小)', 50, '肉鬆、菜脯、油條、皮蛋', NULL, 0, 1),
('df_pr_01_l', 'dafobenwan', 'cat_df_porridge', '皮蛋粥 (大)', 60, '肉鬆、菜脯、油條、皮蛋', NULL, 0, 2),
('df_pr_02_s', 'dafobenwan', 'cat_df_porridge', '鹹蛋粥 (小)', 50, '肉鬆、菜脯、油條、鹹蛋', NULL, 0, 3),
('df_pr_02_l', 'dafobenwan', 'cat_df_porridge', '鹹蛋粥 (大)', 60, '肉鬆、菜脯、油條、鹹蛋', NULL, 0, 4),
('df_pr_03_s', 'dafobenwan', 'cat_df_porridge', '素香粥 (小)', 50, '素鬆、菜脯、油條、豆皮', NULL, 0, 5),
('df_pr_03_l', 'dafobenwan', 'cat_df_porridge', '素香粥 (大)', 60, '素鬆、菜脯、油條、豆皮', NULL, 0, 6),

-- 4.5 飲品
('df_dr_01', 'dafobenwan', 'cat_df_drinks', '紅茶',        20, NULL, NULL, 0, 1),
('df_dr_02', 'dafobenwan', 'cat_df_drinks', '奶茶',        30, NULL, NULL, 0, 2),
('df_dr_03', 'dafobenwan', 'cat_df_drinks', '豆漿 (有糖)', 20, NULL, NULL, 0, 3),
('df_dr_04', 'dafobenwan', 'cat_df_drinks', '豆漿 (無糖)', 20, NULL, NULL, 0, 4)
ON CONFLICT(id) DO UPDATE SET
    tenant_id = excluded.tenant_id,
    category_id = excluded.category_id,
    name = excluded.name,
    price = excluded.price,
    description = excluded.description,
    badge_text = excluded.badge_text,
    is_recommended = excluded.is_recommended,
    sort_order = excluded.sort_order;

-- 5. Unified Option Groups (modifier_groups)
INSERT INTO modifier_groups (
    id, tenant_id, name, selection_type, is_required, min_selection, max_selection,
    sort_order, scope, allow_repeats, included, sources_json, labels_json, auto_popup, source_metadata_json
) VALUES
(
    'mg_df_rice_type',
    'dafobenwan',
    '先選米',
    'single',
    1,
    1,
    1,
    1,
    'item',
    0,
    0,
    '[]',
    '{"zh-TW":"請選擇米種","vi":"Chọn loại gạo"}',
    1,
    '{}'
),
(
    'mg_df_size',
    'dafobenwan',
    '份量調整',
    'single',
    0,
    0,
    1,
    2,
    'item',
    0,
    0,
    '[]',
    '{}',
    0,
    '{}'
),
(
    'mg_df_spicy',
    'dafobenwan',
    '辣度選擇',
    'single',
    0,
    0,
    1,
    3,
    'item',
    0,
    0,
    '[]',
    '{}',
    0,
    '{}'
),
(
    'mg_df_topping_10',
    'dafobenwan',
    '加料 10元',
    'multiple',
    0,
    0,
    6,
    4,
    'item',
    0,
    0,
    '[]',
    '{}',
    0,
    '{}'
),
(
    'mg_df_topping_15',
    'dafobenwan',
    '加料 15元',
    'multiple',
    0,
    0,
    6,
    5,
    'item',
    0,
    0,
    '[]',
    '{}',
    0,
    '{}'
),
(
    'mg_df_topping_25',
    'dafobenwan',
    '加料 25元',
    'multiple',
    0,
    0,
    3,
    6,
    'item',
    0,
    0,
    '[]',
    '{}',
    0,
    '{}'
)
ON CONFLICT(id) DO UPDATE SET
    tenant_id = excluded.tenant_id,
    name = excluded.name,
    selection_type = excluded.selection_type,
    is_required = excluded.is_required,
    min_selection = excluded.min_selection,
    max_selection = excluded.max_selection,
    sort_order = excluded.sort_order,
    scope = excluded.scope,
    allow_repeats = excluded.allow_repeats,
    included = excluded.included,
    sources_json = excluded.sources_json,
    labels_json = excluded.labels_json,
    auto_popup = excluded.auto_popup,
    source_metadata_json = excluded.source_metadata_json;

-- 6. Unified Modifier Options (modifier_options)
INSERT INTO modifier_options (
    id, tenant_id, group_id, name, price, is_default, sort_order,
    sub_options_json, eligibility_rules_json, source_metadata_json
) VALUES
-- 6.1 先選米 (mg_df_rice_type)
('opt_df_rt_white',  'dafobenwan', 'mg_df_rice_type', '白米', 0, 1, 1, '[]', '[]', '{}'),
('opt_df_rt_purple', 'dafobenwan', 'mg_df_rice_type', '紫米', 5, 0, 2, '[]', '[]', '{}'),

-- 6.2 份量調整 (mg_df_size)
('opt_df_size_normal', 'dafobenwan', 'mg_df_size', '正常',  0, 1, 1, '[]', '[]', '{}'),
('opt_df_size_large',  'dafobenwan', 'mg_df_size', '加大', 10, 0, 2, '[]', '[]', '{}'),

-- 6.3 辣度選擇 (mg_df_spicy)
('opt_df_sp_none',   'dafobenwan', 'mg_df_spicy', '不加辣', 0, 1, 1, '[]', '[]', '{}'),
('opt_df_sp_mild',   'dafobenwan', 'mg_df_spicy', '小辣',   0, 0, 2, '[]', '[]', '{}'),
('opt_df_sp_medium', 'dafobenwan', 'mg_df_spicy', '中辣',   0, 0, 3, '[]', '[]', '{}'),
('opt_df_sp_hot',    'dafobenwan', 'mg_df_spicy', '大辣',   0, 0, 4, '[]', '[]', '{}'),

-- 6.4 加料 10元 (mg_df_topping_10)
('opt_df_tp_corn',    'dafobenwan', 'mg_df_topping_10', '玉米',   10, 0, 1, '[]', '[]', '{}'),
('opt_df_tp_cheese',  'dafobenwan', 'mg_df_topping_10', '起司',   10, 0, 2, '[]', '[]', '{}'),
('opt_df_tp_seaweed', 'dafobenwan', 'mg_df_topping_10', '海苔',   10, 0, 3, '[]', '[]', '{}'),
('opt_df_tp_youtiao', 'dafobenwan', 'mg_df_topping_10', '油條',   10, 0, 4, '[]', '[]', '{}'),
('opt_df_tp_rousong', 'dafobenwan', 'mg_df_topping_10', '肉鬆',   10, 0, 5, '[]', '[]', '{}'),
('opt_df_tp_peanut',  'dafobenwan', 'mg_df_topping_10', '花生粉', 10, 0, 6, '[]', '[]', '{}'),

-- 6.5 加料 15元 (mg_df_topping_15)
('opt_df_tp_ludan',  'dafobenwan', 'mg_df_topping_15', '滷蛋',     15, 0, 1, '[]', '[]', '{}'),
('opt_df_tp_xandan', 'dafobenwan', 'mg_df_topping_15', '鹹蛋',     15, 0, 2, '[]', '[]', '{}'),
('opt_df_tp_pidan',  'dafobenwan', 'mg_df_topping_15', '皮蛋',     15, 0, 3, '[]', '[]', '{}'),
('opt_df_tp_paocai', 'dafobenwan', 'mg_df_topping_15', '泡菜',     15, 0, 4, '[]', '[]', '{}'),
('opt_df_tp_tuna',   'dafobenwan', 'mg_df_topping_15', '鮪魚',     15, 0, 5, '[]', '[]', '{}'),
('opt_df_tp_pep',    'dafobenwan', 'mg_df_topping_15', '剝皮辣椒', 15, 0, 6, '[]', '[]', '{}'),

-- 6.6 加料 25元 (mg_df_topping_25)
('opt_df_tp_pork',           'dafobenwan', 'mg_df_topping_25', '嫩煎豬排', 25, 0, 1, '[]', '[]', '{}'),
('opt_df_tp_smoked_chicken', 'dafobenwan', 'mg_df_topping_25', '燻雞',     25, 0, 2, '[]', '[]', '{}'),
('opt_df_tp_veggie_meat',    'dafobenwan', 'mg_df_topping_25', '素瓜仔肉', 25, 0, 3, '[]', '[]', '{}')
ON CONFLICT(id) DO UPDATE SET
    tenant_id = excluded.tenant_id,
    group_id = excluded.group_id,
    name = excluded.name,
    price = excluded.price,
    is_default = excluded.is_default,
    sort_order = excluded.sort_order,
    sub_options_json = excluded.sub_options_json,
    eligibility_rules_json = excluded.eligibility_rules_json,
    source_metadata_json = excluded.source_metadata_json;

-- 7. Explicit Item Modifier Links (item_modifier_links)
-- 7.1 mg_df_rice_type -> Rice Ball categories (sort_order = 1)
INSERT INTO item_modifier_links (tenant_id, item_id, group_id, sort_order, is_disabled)
SELECT p.tenant_id, p.id, 'mg_df_rice_type', 1, 0
FROM menu_items p
WHERE p.tenant_id = 'dafobenwan'
  AND p.category_id IN (
      'cat_df_popular_rice_balls',
      'cat_df_special_rice_balls',
      'cat_df_upgrade_rice_balls'
  )
ON CONFLICT(tenant_id, item_id, group_id) DO UPDATE SET
    sort_order = excluded.sort_order,
    is_disabled = excluded.is_disabled;

-- 7.2 mg_df_size -> Rice Ball categories (sort_order = 2)
INSERT INTO item_modifier_links (tenant_id, item_id, group_id, sort_order, is_disabled)
SELECT p.tenant_id, p.id, 'mg_df_size', 2, 0
FROM menu_items p
WHERE p.tenant_id = 'dafobenwan'
  AND p.category_id IN (
      'cat_df_popular_rice_balls',
      'cat_df_special_rice_balls',
      'cat_df_upgrade_rice_balls'
  )
ON CONFLICT(tenant_id, item_id, group_id) DO UPDATE SET
    sort_order = excluded.sort_order,
    is_disabled = excluded.is_disabled;

-- 7.3 mg_df_spicy -> Rice Ball + Porridge categories (sort_order = 3)
INSERT INTO item_modifier_links (tenant_id, item_id, group_id, sort_order, is_disabled)
SELECT p.tenant_id, p.id, 'mg_df_spicy', 3, 0
FROM menu_items p
WHERE p.tenant_id = 'dafobenwan'
  AND p.category_id IN (
      'cat_df_popular_rice_balls',
      'cat_df_special_rice_balls',
      'cat_df_upgrade_rice_balls',
      'cat_df_porridge'
  )
ON CONFLICT(tenant_id, item_id, group_id) DO UPDATE SET
    sort_order = excluded.sort_order,
    is_disabled = excluded.is_disabled;

-- 7.4 mg_df_topping_10 -> Rice Ball + Porridge categories (sort_order = 4)
INSERT INTO item_modifier_links (tenant_id, item_id, group_id, sort_order, is_disabled)
SELECT p.tenant_id, p.id, 'mg_df_topping_10', 4, 0
FROM menu_items p
WHERE p.tenant_id = 'dafobenwan'
  AND p.category_id IN (
      'cat_df_popular_rice_balls',
      'cat_df_special_rice_balls',
      'cat_df_upgrade_rice_balls',
      'cat_df_porridge'
  )
ON CONFLICT(tenant_id, item_id, group_id) DO UPDATE SET
    sort_order = excluded.sort_order,
    is_disabled = excluded.is_disabled;

-- 7.5 mg_df_topping_15 -> Rice Ball + Porridge categories (sort_order = 5)
INSERT INTO item_modifier_links (tenant_id, item_id, group_id, sort_order, is_disabled)
SELECT p.tenant_id, p.id, 'mg_df_topping_15', 5, 0
FROM menu_items p
WHERE p.tenant_id = 'dafobenwan'
  AND p.category_id IN (
      'cat_df_popular_rice_balls',
      'cat_df_special_rice_balls',
      'cat_df_upgrade_rice_balls',
      'cat_df_porridge'
  )
ON CONFLICT(tenant_id, item_id, group_id) DO UPDATE SET
    sort_order = excluded.sort_order,
    is_disabled = excluded.is_disabled;

-- 7.6 mg_df_topping_25 -> Rice Ball + Porridge categories (sort_order = 6)
INSERT INTO item_modifier_links (tenant_id, item_id, group_id, sort_order, is_disabled)
SELECT p.tenant_id, p.id, 'mg_df_topping_25', 6, 0
FROM menu_items p
WHERE p.tenant_id = 'dafobenwan'
  AND p.category_id IN (
      'cat_df_popular_rice_balls',
      'cat_df_special_rice_balls',
      'cat_df_upgrade_rice_balls',
      'cat_df_porridge'
  )
ON CONFLICT(tenant_id, item_id, group_id) DO UPDATE SET
    sort_order = excluded.sort_order,
    is_disabled = excluded.is_disabled;

-- 8. Bump Catalog Revision
INSERT INTO menu_catalog_revisions (tenant_id, revision)
VALUES ('dafobenwan', 1)
ON CONFLICT(tenant_id) DO UPDATE SET revision = revision + 1;

