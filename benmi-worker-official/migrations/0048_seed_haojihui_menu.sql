-- Migration: 0048_seed_haojihui_menu.sql
-- Description: Seed tenant 'haojihui' (好雞匯 蔬鮮輕食) configuration, categories, menu items, and customizations

-- 1. Ensure menu_customizations table exists
CREATE TABLE IF NOT EXISTS menu_customizations (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    key TEXT NOT NULL,
    title TEXT NOT NULL,
    type TEXT NOT NULL,
    sort_order INTEGER NOT NULL,
    options_json TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_menu_customizations_tenant ON menu_customizations(tenant_id);

-- 2. Seed Tenant Record
INSERT INTO tenants (id, name)
VALUES ('haojihui', '好雞匯 蔬鮮輕食')
ON CONFLICT(id) DO UPDATE SET name = excluded.name;

-- 3. Seed Tenant Config
INSERT INTO tenant_config (
    tenant_id,
    brand_name,
    brand_color,
    store_address,
    operating_hours,
    allow_dine_in,
    allow_scheduled_pickup,
    features,
    order_prefix,
    delivery_policy,
    locale,
    store_status,
    liff_id,
    liff_url,
    default_password,
    is_active
) VALUES (
    'haojihui',
    '好雞匯 蔬鮮輕食',
    '#dc2626',
    '',
    '{"0":[{"start":"11:00","end":"21:00"}],"1":[{"start":"11:00","end":"21:00"}],"2":[{"start":"11:00","end":"21:00"}],"3":[{"start":"11:00","end":"21:00"}],"4":[{"start":"11:00","end":"21:00"}],"5":[{"start":"11:00","end":"21:00"}],"6":[{"start":"11:00","end":"21:00"}]}',
    0,
    1,
    '["reports", "flex_notifications"]',
    'H',
    '🛵 線上預訂自取，現點現做，節省現場等候時間。',
    'zh-TW',
    'open',
    '2009560906-c5taZfiY',
    'https://liff.line.me/2009560906-c5taZfiY',
    '12345678',
    1
)
ON CONFLICT(tenant_id) DO UPDATE SET
    brand_name = excluded.brand_name,
    brand_color = excluded.brand_color,
    store_address = excluded.store_address,
    operating_hours = excluded.operating_hours,
    allow_dine_in = excluded.allow_dine_in,
    allow_scheduled_pickup = excluded.allow_scheduled_pickup,
    features = excluded.features,
    order_prefix = excluded.order_prefix,
    delivery_policy = excluded.delivery_policy,
    locale = excluded.locale,
    store_status = excluded.store_status,
    liff_id = excluded.liff_id,
    liff_url = excluded.liff_url,
    is_active = excluded.is_active;

-- 4. Seed Menu Categories
INSERT INTO menu_categories (
    id, tenant_id, name, short_name, slug, category_type, selection_type,
    is_required, min_selection, max_selection, sort_order,
    allow_customization, applied_modifiers
) VALUES
('hjh_sec_flavor',            'haojihui', '🧪 口味與客製化選擇',        '口味設定', 'sec-flavor',         'order_customization', 'single', 0, 0, 1, 1, 1, '[]'),
('cat_hjh_combos_veggie',      'haojihui', '🥗 菜菜餐',                 '菜菜餐',   'combos-veggie',      'catalog',             'single', 0, 0, 1, 2, 1, '[]'),
('cat_hjh_combos_single_meat', 'haojihui', '🍗 一種肉肉吃得巧',          '吃得巧',   'combos-single-meat', 'catalog',             'single', 0, 0, 1, 3, 1, '[]'),
('cat_hjh_combos_double_meat', 'haojihui', '🥩 兩種肉肉好滿足',          '好滿足',   'combos-double-meat', 'catalog',             'single', 0, 0, 1, 4, 1, '[]'),
('cat_hjh_combos_large_meat',  'haojihui', '🍖 大份肉肉好過癮',          '好過癮',   'combos-large-meat',  'catalog',             'single', 0, 0, 1, 5, 1, '[]'),
('cat_hjh_combos_sharing',     'haojihui', '👨‍👩‍👧 多人分享餐',            '分享餐',   'combos-sharing',     'catalog',             'single', 0, 0, 1, 6, 1, '[]'),
('cat_hjh_meat',               'haojihui', '🥓 肉品單點',               '肉品單點', 'meat',               'catalog',             'single', 0, 0, 1, 7, 1, '[]'),
('cat_hjh_veggie',             'haojihui', '🥦 新鮮蔬菜類 (一律 $30)',   '蔬菜類',   'veggie',             'catalog',             'single', 0, 0, 1, 8, 1, '[]'),
('cat_hjh_braised',            'haojihui', '🥘 特色滷味類 (一律 $30)',   '滷味類',   'braised',            'catalog',             'single', 0, 0, 1, 9, 1, '[]'),
('cat_hjh_offal',              'haojihui', '🍢 內臟類 (一律 $30)',       '內臟類',   'offal',              'catalog',             'single', 0, 0, 1, 10, 1, '[]'),
('cat_hjh_signature',          'haojihui', '⭐ 獨家招牌菜 (一律 $30)',   '招牌菜',   'signature',          'catalog',             'single', 0, 0, 1, 11, 1, '[]')
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
INSERT INTO menu_items (id, tenant_id, category_id, name, price, description, badge_text, is_recommended, sort_order)
VALUES
    -- 菜菜餐
    ('hjh_combo_v7',  'haojihui', 'cat_hjh_combos_veggie', '菜菜餐 (任選 7 樣配菜)',  200.0, '任選 7 樣今日配菜，輕食健康首選', '人氣輕食', 1, 1),
    ('hjh_combo_v11', 'haojihui', 'cat_hjh_combos_veggie', '菜菜餐 (任選 11 樣配菜)', 300.0, '任選 11 樣今日配菜，豐盛多樣',   '超值推薦', 1, 2),
    ('hjh_combo_v15', 'haojihui', 'cat_hjh_combos_veggie', '菜菜餐 (任選 15 樣配菜)', 400.0, '任選 15 樣今日配菜，全家飽足滿足', NULL,       0, 3),

    -- 一種肉肉吃得巧
    ('hjh_combo_a',   'haojihui', 'cat_hjh_combos_single_meat', '套餐 A (小份雞或嫩豬排 + 5樣配菜)', 200.0, '小份雞 或 嫩豬排 (二選一) + 任選 5 樣今日配菜', '👍 招牌 A 餐', 1, 1),
    ('hjh_combo_b',   'haojihui', 'cat_hjh_combos_single_meat', '套餐 B (小份天使胸 + 6樣配菜)',     250.0, '小份天使胸 + 任選 6 樣今日配菜',               '低脂高蛋白',   1, 2),

    -- 兩種肉肉好滿足
    ('hjh_combo_c',   'haojihui', 'cat_hjh_combos_double_meat', '套餐 C (小份雞 + 嫩豬排 + 6樣配菜)',  300.0, '小份雞肉 + 嫩豬排，雙重享受 + 6 樣配菜', '雙肉首選', 1, 1),
    ('hjh_combo_d',   'haojihui', 'cat_hjh_combos_double_meat', '套餐 D (小份雞 + 嫩豬排 + 10樣配菜)', 400.0, '小份雞肉 + 嫩豬排 + 10 樣配菜',          NULL,       0, 2),
    ('hjh_combo_e',   'haojihui', 'cat_hjh_combos_double_meat', '套餐 E (小份天使胸 + 嫩豬排 + 9樣配菜)', 390.0, '小份天使胸 + 嫩豬排 + 9 樣配菜',       NULL,       0, 3),

    -- 大份肉肉好過癮
    ('hjh_combo_f',   'haojihui', 'cat_hjh_combos_large_meat', '套餐 F (大份肉 + 6樣配菜)',          300.0, '大份肉品 + 任選 6 樣配菜',        '肉量升級', 1, 1),
    ('hjh_combo_g',   'haojihui', 'cat_hjh_combos_large_meat', '套餐 G (大份天使胸 + 4樣配菜)',      250.0, '大份天使胸 + 任選 4 樣配菜',      '健身推薦', 0, 2),
    ('hjh_combo_h',   'haojihui', 'cat_hjh_combos_large_meat', '套餐 H (大份肉 + 嫩豬排 + 8樣配菜)',  400.0, '大份肉 + 嫩豬排 + 任選 8 樣配菜', '超大滿足', 1, 3),

    -- 多人分享餐
    ('hjh_combo_share_1', 'haojihui', 'cat_hjh_combos_sharing', '分享餐 1 (雙倍大份雞 + 10樣配菜)', 550.0, '雙倍大份雞肉 + 任選 10 樣配菜，適合 2-3 人享用', '聚餐推薦',   1, 1),
    ('hjh_combo_share_2', 'haojihui', 'cat_hjh_combos_sharing', '分享餐 2 (雙倍大份雞 + 12樣配菜)', 600.0, '雙倍大份雞肉 + 任選 12 樣配菜',                 NULL,         0, 2),
    ('hjh_combo_share_3', 'haojihui', 'cat_hjh_combos_sharing', '分享餐 3 (大份雞 + 13樣配菜)',     500.0, '大份雞肉 + 任選 13 樣配菜',                     NULL,         0, 3),
    ('hjh_combo_share_4', 'haojihui', 'cat_hjh_combos_sharing', '分享餐 4 (大份雞 + 17樣配菜)',     600.0, '大份雞肉 + 任選 17 樣配菜',                     NULL,         0, 4),
    ('hjh_combo_share_5', 'haojihui', 'cat_hjh_combos_sharing', '分享餐 5 (大份雞 + 20樣配菜)',     690.0, '大份雞肉 + 任選 20 樣配菜，全家豪華分享',       '超豪華全配', 1, 5),

    -- 肉品單點
    ('hjh_meat_large',        'haojihui', 'cat_hjh_meat', '大份雞',      140.0, '招牌鮮嫩雞肉 (大份)',     '熱銷招牌', 1, 1),
    ('hjh_meat_breast',       'haojihui', 'cat_hjh_meat', '雞胸',         60.0, '鮮嫩雞胸肉',               NULL,       0, 2),
    ('hjh_meat_thigh',        'haojihui', 'cat_hjh_meat', '雞腿',         60.0, '多汁鮮嫩雞腿肉',           NULL,       1, 3),
    ('hjh_meat_angel_breast', 'haojihui', 'cat_hjh_meat', '超嫩天使胸',   70.0, '獨家秘製超嫩天使雞胸',     '招牌獨家', 1, 4),
    ('hjh_meat_pork_chop',    'haojihui', 'cat_hjh_meat', '超嫩豬排',     60.0, '特選鮮嫩豬排',             NULL,       0, 5),
    ('hjh_meat_wings',        'haojihui', 'cat_hjh_meat', '雞翅',         60.0, '鮮香雞翅',                 NULL,       0, 6),

    -- 新鮮蔬菜類 ($30)
    ('hjh_veg_01', 'haojihui', 'cat_hjh_veggie', '花椰菜',   30.0, NULL, NULL,     1, 1),
    ('hjh_veg_02', 'haojihui', 'cat_hjh_veggie', '蓮藕',     30.0, NULL, NULL,     0, 2),
    ('hjh_veg_03', 'haojihui', 'cat_hjh_veggie', '海帶根',   30.0, NULL, NULL,     0, 3),
    ('hjh_veg_04', 'haojihui', 'cat_hjh_veggie', '洋蔥',     30.0, NULL, NULL,     0, 4),
    ('hjh_veg_05', 'haojihui', 'cat_hjh_veggie', '馬鈴薯',   30.0, NULL, NULL,     0, 5),
    ('hjh_veg_06', 'haojihui', 'cat_hjh_veggie', '高麗菜',   30.0, NULL, NULL,     1, 6),
    ('hjh_veg_07', 'haojihui', 'cat_hjh_veggie', '秋葵',     30.0, NULL, NULL,     0, 7),
    ('hjh_veg_08', 'haojihui', 'cat_hjh_veggie', '杏鮑菇',   30.0, NULL, NULL,     0, 8),
    ('hjh_veg_09', 'haojihui', 'cat_hjh_veggie', '西芹',     30.0, NULL, NULL,     0, 9),
    ('hjh_veg_10', 'haojihui', 'cat_hjh_veggie', '洋地瓜',   30.0, NULL, NULL,     0, 10),
    ('hjh_veg_11', 'haojihui', 'cat_hjh_veggie', '龍鬚菜',   30.0, NULL, NULL,     0, 11),
    ('hjh_veg_12', 'haojihui', 'cat_hjh_veggie', '水蓮',     30.0, NULL, NULL,     1, 12),
    ('hjh_veg_13', 'haojihui', 'cat_hjh_veggie', '小黃瓜',   30.0, NULL, NULL,     0, 13),
    ('hjh_veg_14', 'haojihui', 'cat_hjh_veggie', '香菇',     30.0, NULL, NULL,     0, 14),
    ('hjh_veg_15', 'haojihui', 'cat_hjh_veggie', '四季豆',   30.0, NULL, NULL,     0, 15),
    ('hjh_veg_16', 'haojihui', 'cat_hjh_veggie', '黃豆芽',   30.0, NULL, NULL,     0, 16),
    ('hjh_veg_17', 'haojihui', 'cat_hjh_veggie', '苦瓜',     30.0, NULL, NULL,     0, 17),
    ('hjh_veg_18', 'haojihui', 'cat_hjh_veggie', '玉米筍',   30.0, NULL, NULL,     1, 18),
    ('hjh_veg_19', 'haojihui', 'cat_hjh_veggie', '木耳',     30.0, NULL, NULL,     0, 19),
    ('hjh_veg_20', 'haojihui', 'cat_hjh_veggie', '烤地瓜',   30.0, NULL, NULL,     0, 20),
    ('hjh_veg_21', 'haojihui', 'cat_hjh_veggie', '水煮蛋白', 30.0, NULL, '高蛋白', 0, 21),
    ('hjh_veg_22', 'haojihui', 'cat_hjh_veggie', '金針菇',   30.0, NULL, NULL,     0, 22),
    ('hjh_veg_23', 'haojihui', 'cat_hjh_veggie', '手工筍片', 30.0, NULL, NULL,     0, 23),

    -- 特色滷味類 ($30)
    ('hjh_brs_01', 'haojihui', 'cat_hjh_braised', '紅蘿蔔',   30.0, NULL, NULL, 0, 1),
    ('hjh_brs_02', 'haojihui', 'cat_hjh_braised', '蒟蒻',     30.0, NULL, NULL, 0, 2),
    ('hjh_brs_03', 'haojihui', 'cat_hjh_braised', '鴨肉丸',   30.0, NULL, NULL, 0, 3),
    ('hjh_brs_04', 'haojihui', 'cat_hjh_braised', '豆皮',     30.0, NULL, NULL, 1, 4),
    ('hjh_brs_05', 'haojihui', 'cat_hjh_braised', '小豆干',   30.0, NULL, NULL, 0, 5),
    ('hjh_brs_06', 'haojihui', 'cat_hjh_braised', '白蘿蔔',   30.0, NULL, NULL, 0, 6),
    ('hjh_brs_07', 'haojihui', 'cat_hjh_braised', '海帶',     30.0, NULL, NULL, 0, 7),
    ('hjh_brs_08', 'haojihui', 'cat_hjh_braised', '糯米腸',   30.0, NULL, NULL, 0, 8),
    ('hjh_brs_09', 'haojihui', 'cat_hjh_braised', '鳥蛋',     30.0, NULL, NULL, 0, 9),
    ('hjh_brs_10', 'haojihui', 'cat_hjh_braised', '魚豆腐',   30.0, NULL, NULL, 0, 10),
    ('hjh_brs_11', 'haojihui', 'cat_hjh_braised', '黑豆乾',   30.0, NULL, NULL, 0, 11),
    ('hjh_brs_12', 'haojihui', 'cat_hjh_braised', '黑輪',     30.0, NULL, NULL, 0, 12),
    ('hjh_brs_13', 'haojihui', 'cat_hjh_braised', '甜不辣',   30.0, NULL, NULL, 0, 13),
    ('hjh_brs_14', 'haojihui', 'cat_hjh_braised', '米血',     30.0, NULL, NULL, 1, 14),
    ('hjh_brs_15', 'haojihui', 'cat_hjh_braised', '百頁豆腐', 30.0, NULL, NULL, 1, 15),

    -- 內臟類 ($30)
    ('hjh_off_01', 'haojihui', 'cat_hjh_offal', '雞屁股',     30.0, NULL, NULL,       0, 1),
    ('hjh_off_02', 'haojihui', 'cat_hjh_offal', '雞胗',       30.0, NULL, NULL,       1, 2),
    ('hjh_off_03', 'haojihui', 'cat_hjh_offal', '雞冠',       30.0, NULL, NULL,       0, 3),
    ('hjh_off_04', 'haojihui', 'cat_hjh_offal', '雞腸',       30.0, NULL, NULL,       0, 4),
    ('hjh_off_05', 'haojihui', 'cat_hjh_offal', '雞心',       30.0, NULL, NULL,       0, 5),
    ('hjh_off_06', 'haojihui', 'cat_hjh_offal', '黃金蛋',     30.0, NULL, '人氣推薦', 1, 6),
    ('hjh_off_07', 'haojihui', 'cat_hjh_offal', '零油脂雞皮', 30.0, NULL, '低脂爽脆', 1, 7),

    -- 獨家招牌菜 ($30)
    ('hjh_sig_01', 'haojihui', 'cat_hjh_signature', '膠原珊瑚草',   30.0, NULL, '獨家富含膠原', 1, 1),
    ('hjh_sig_02', 'haojihui', 'cat_hjh_signature', '煙燻豬耳朵',   30.0, NULL, '煙燻香濃',     1, 2),
    ('hjh_sig_03', 'haojihui', 'cat_hjh_signature', '煙燻無骨鳳爪', 30.0, NULL, 'Q彈無骨',      1, 3),
    ('hjh_sig_04', 'haojihui', 'cat_hjh_signature', '薄脆豬頭皮',   30.0, NULL, NULL,           0, 4),
    ('hjh_sig_05', 'haojihui', 'cat_hjh_signature', '鮮甜蟹味棒',   30.0, NULL, NULL,           0, 5)
ON CONFLICT(id) DO UPDATE SET
    tenant_id = excluded.tenant_id,
    category_id = excluded.category_id,
    name = excluded.name,
    price = excluded.price,
    description = excluded.description,
    badge_text = excluded.badge_text,
    is_recommended = excluded.is_recommended,
    sort_order = excluded.sort_order;

-- 6. Seed Menu Customizations (Order-level flavor options)
INSERT INTO menu_customizations (id, tenant_id, key, title, type, sort_order, options_json)
VALUES
    ('hjh_custom_sauce',     'haojihui', 'sauce',     '✦ 醬汁選擇', 'radio',    0, '[{"name":"經典醬汁 (含蔥、蒜、胡椒、香油)"},{"name":"清爽和風 (含蔥、香油、和風醬)"}]'),
    ('hjh_custom_spicy',     'haojihui', 'spicy',     '✦ 辣度選擇', 'radio',    1, '[{"name":"不辣"},{"name":"微辣"},{"name":"小辣"},{"name":"中辣"},{"name":"大辣"}]'),
    ('hjh_custom_seasoning', 'haojihui', 'seasoning', '✦ 配料調整', 'checkbox', 2, '[{"name":"不加蔥"},{"name":"不加蒜"},{"name":"不加胡椒"},{"name":"不加香油"}]')
ON CONFLICT(id) DO UPDATE SET
    title = excluded.title,
    type = excluded.type,
    sort_order = excluded.sort_order,
    options_json = excluded.options_json;
