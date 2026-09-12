-- Migration: 0048_seed_jiangjiejie_menu.sql
-- Description: Seed initial menu, categories, modifiers, and tenant configuration for tenant 'jiangjiejie' (蔣姐姐鹹水雞)

-- 1. Tenants Table
INSERT INTO tenants (id, name) 
VALUES ('jiangjiejie', '蔣姐姐鹹水雞')
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
    cuisine_type,
    is_marketplace_visible,
    is_active
) VALUES (
    'jiangjiejie',
    '蔣姐姐鹹水雞',
    '#e11d48',
    '',
    '',
    '',
    '12345678',
    'zh-TW',
    1,
    0,
    'open',
    '2009560906-c5taZfiY',
    'https://liff.line.me/2009560906-c5taZfiY',
    'J',
    '[]',
    'taiwanese',
    1,
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
    cuisine_type = excluded.cuisine_type,
    is_marketplace_visible = excluded.is_marketplace_visible,
    is_active = excluded.is_active;

-- 3. Categories (Catalog & Modifiers)
INSERT INTO menu_categories (
    id, tenant_id, name, short_name, slug, category_type, selection_type,
    is_required, min_selection, max_selection, sort_order,
    allow_customization, applied_modifiers
) VALUES
-- Catalog Categories
('cat_jj_combo',   'jiangjiejie', '套餐類',           '套餐',   'combos',   'catalog', 'single', 0, 0, 1,  1, 1, '["*"]'),
('cat_jj_chicken', 'jiangjiejie', '雞肉類',           '雞肉',   'chicken',  'catalog', 'single', 0, 0, 1,  2, 1, '["*"]'),
('cat_jj_seafood', 'jiangjiejie', '海裡類 (一律 $20)', '海裡類', 'seafood',  'catalog', 'single', 0, 0, 1,  3, 1, '["*"]'),
('cat_jj_veggies', 'jiangjiejie', '時蔬類 (一律 $20)', '時蔬類', 'veggies',  'catalog', 'single', 0, 0, 1,  4, 1, '["*"]'),
('cat_jj_offal',   'jiangjiejie', '內臟類 (一律 $20)', '內臟類', 'offal',    'catalog', 'single', 0, 0, 1,  5, 1, '["*"]'),
('cat_jj_braised', 'jiangjiejie', '滷味類 (一律 $20)', '滷味類', 'braised',  'catalog', 'single', 0, 0, 1,  6, 1, '["*"]'),
('cat_jj_others',  'jiangjiejie', '其他類 (一律 $20)', '其他類', 'others',   'catalog', 'single', 0, 0, 1,  7, 1, '["*"]'),

-- Modifier Categories
('mod_jj_pepper',      'jiangjiejie', '胡椒粉',    '胡椒',   'pepper-level',        'modifier', 'single', 1, 1, 1,  8, 0, '[]'),
('mod_jj_chili',       'jiangjiejie', '辣椒',      '辣椒',   'chili-level',         'modifier', 'single', 1, 1, 1,  9, 0, '[]'),
('mod_jj_ma',          'jiangjiejie', '椒麻',      '椒麻',   'szechuan-pepper',     'modifier', 'single', 1, 1, 1, 10, 0, '[]'),
('mod_jj_onion',       'jiangjiejie', '洋蔥',      '洋蔥',   'onion-pref',          'modifier', 'single', 1, 1, 1, 11, 0, '[]'),
('mod_jj_garlic',      'jiangjiejie', '蒜泥',      '蒜泥',   'garlic-pref',         'modifier', 'single', 1, 1, 1, 12, 0, '[]'),
('mod_jj_scallion',    'jiangjiejie', '蔥',        '蔥',     'scallion-pref',       'modifier', 'single', 1, 1, 1, 13, 0, '[]'),
('mod_jj_sesame_oil',  'jiangjiejie', '香油',      '香油',   'sesame-oil',          'modifier', 'single', 1, 1, 1, 14, 0, '[]'),
('mod_jj_veg_soup',    'jiangjiejie', '蔬菜湯',    '蔬菜湯', 'vegetable-broth',     'modifier', 'single', 1, 1, 1, 15, 0, '[]'),
('mod_jj_chicken_prep','jiangjiejie', '雞肉處理',  '處理',   'chicken-preparation', 'modifier', 'single', 0, 0, 1, 16, 0, '[]'),
('mod_jj_lemon_juice', 'jiangjiejie', '特調檸檬汁','檸檬汁', 'special-lemon-juice', 'modifier', 'single', 1, 1, 1, 17, 0, '[]')
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
-- 4.1 套餐類 (Combos)
('jj_combo_a1',       'jiangjiejie', 'cat_jj_combo', '套餐 A (3隻鹹水雞翅+6樣菜)',    150, '包含 3 隻鹹水雞翅與 6 樣配菜', NULL, 0, 1),
('jj_combo_a2',       'jiangjiejie', 'cat_jj_combo', '套餐 A (2隻煙燻雞翅+6樣菜)',    150, '包含 2 隻煙燻雞翅與 6 樣配菜', NULL, 0, 2),
('jj_combo_b',        'jiangjiejie', 'cat_jj_combo', '套餐 B (1個鹹水雞胸+10樣菜)',   250, '包含 1 個鹹水雞胸與 10 樣配菜', NULL, 0, 3),
('jj_combo_c',        'jiangjiejie', 'cat_jj_combo', '套餐 C (8樣菜)',                150, '純配菜組合共 8 樣',             NULL, 0, 4),
('jj_combo_e',        'jiangjiejie', 'cat_jj_combo', '菜菜 E 套餐 (11樣菜)',          200, '純配菜組合共 11 樣',            NULL, 0, 5),
('jj_combo_family_1', 'jiangjiejie', 'cat_jj_combo', '全家歡樂餐 (鹹水半隻+12樣菜)', 350, '包含鹹水雞半隻與 12 樣配菜',    NULL, 0, 6),
('jj_combo_family_2', 'jiangjiejie', 'cat_jj_combo', '全家歡樂餐 (煙燻半隻+11樣菜)', 350, '包含煙燻雞半隻與 11 樣配菜',    NULL, 0, 7),

-- 4.2 雞肉類 (Chicken)
('jj_chk_01', 'jiangjiejie', 'cat_jj_chicken', '鹹水半隻',        140, NULL, NULL, 0, 1),
('jj_chk_02', 'jiangjiejie', 'cat_jj_chicken', '鹹水雞腿',         70, NULL, NULL, 0, 2),
('jj_chk_03', 'jiangjiejie', 'cat_jj_chicken', '鹹水雞胸',         70, NULL, NULL, 0, 3),
('jj_chk_04', 'jiangjiejie', 'cat_jj_chicken', '鹹水雞翅 (1隻)',   20, NULL, NULL, 0, 4),
('jj_chk_05', 'jiangjiejie', 'cat_jj_chicken', '鹹水翅三隻',       50, NULL, NULL, 0, 5),
('jj_chk_06', 'jiangjiejie', 'cat_jj_chicken', '脖子 3 隻',        10, NULL, NULL, 0, 6),
('jj_chk_07', 'jiangjiejie', 'cat_jj_chicken', '帶皮脖子 3 隻',    20, NULL, NULL, 0, 7),
('jj_chk_08', 'jiangjiejie', 'cat_jj_chicken', '雞爪 八隻',        20, NULL, NULL, 0, 8),
('jj_chk_09', 'jiangjiejie', 'cat_jj_chicken', '煙燻半隻',        160, NULL, NULL, 0, 9),
('jj_chk_10', 'jiangjiejie', 'cat_jj_chicken', '煙燻雞腿',         80, NULL, NULL, 0, 10),
('jj_chk_11', 'jiangjiejie', 'cat_jj_chicken', '煙燻雞胸',         80, NULL, NULL, 0, 11),
('jj_chk_12', 'jiangjiejie', 'cat_jj_chicken', '煙燻翅 (1隻)',     30, NULL, NULL, 0, 12),
('jj_chk_13', 'jiangjiejie', 'cat_jj_chicken', '煙燻翅兩隻',       50, NULL, NULL, 0, 13),

-- 4.3 海裡類 (Seafood)
('jj_sf_01', 'jiangjiejie', 'cat_jj_seafood', '1. 水晶藻', 20, NULL, NULL, 0, 1),
('jj_sf_02', 'jiangjiejie', 'cat_jj_seafood', '2. 海帶芽', 20, NULL, NULL, 0, 2),
('jj_sf_03', 'jiangjiejie', 'cat_jj_seafood', '3. 紫晶藻', 20, NULL, NULL, 0, 3),
('jj_sf_04', 'jiangjiejie', 'cat_jj_seafood', '4. 魷魚花', 20, NULL, NULL, 0, 4),

-- 4.4 時蔬類 (Veggies)
('jj_veg_05', 'jiangjiejie', 'cat_jj_veggies', '5. 蓮藕',         20, NULL, NULL, 0, 1),
('jj_veg_06', 'jiangjiejie', 'cat_jj_veggies', '6. 山藥',         20, NULL, NULL, 0, 2),
('jj_veg_07', 'jiangjiejie', 'cat_jj_veggies', '7. 水蓮',         20, NULL, NULL, 0, 3),
('jj_veg_08', 'jiangjiejie', 'cat_jj_veggies', '8. 蘆筍',         20, NULL, NULL, 0, 4),
('jj_veg_09', 'jiangjiejie', 'cat_jj_veggies', '9. 青木瓜',       20, NULL, NULL, 0, 5),
('jj_veg_10', 'jiangjiejie', 'cat_jj_veggies', '10. 金針菇',      20, NULL, NULL, 0, 6),
('jj_veg_11', 'jiangjiejie', 'cat_jj_veggies', '11. 甜龍筍',      20, NULL, NULL, 0, 7),
('jj_veg_12', 'jiangjiejie', 'cat_jj_veggies', '12. 小黃瓜',      20, NULL, NULL, 0, 8),
('jj_veg_13', 'jiangjiejie', 'cat_jj_veggies', '13. 蜜蘋果',      20, NULL, NULL, 0, 9),
('jj_veg_14', 'jiangjiejie', 'cat_jj_veggies', '14. 龍鬚菜',      20, NULL, NULL, 0, 10),
('jj_veg_15', 'jiangjiejie', 'cat_jj_veggies', '15. 西洋芹',      20, NULL, NULL, 0, 11),
('jj_veg_16', 'jiangjiejie', 'cat_jj_veggies', '16. 杏鮑菇',      20, NULL, NULL, 0, 12),
('jj_veg_17', 'jiangjiejie', 'cat_jj_veggies', '17. 玉米筍',      20, NULL, NULL, 0, 13),
('jj_veg_18', 'jiangjiejie', 'cat_jj_veggies', '18. 馬鈴薯',      20, NULL, NULL, 0, 14),
('jj_veg_19', 'jiangjiejie', 'cat_jj_veggies', '19. 脆筍片',      20, NULL, NULL, 0, 15),
('jj_veg_20', 'jiangjiejie', 'cat_jj_veggies', '20. 紅蘿蔔',      20, NULL, NULL, 0, 16),
('jj_veg_21', 'jiangjiejie', 'cat_jj_veggies', '21. 白蘿蔔',      20, NULL, NULL, 0, 17),
('jj_veg_22', 'jiangjiejie', 'cat_jj_veggies', '22. 台灣洋蔥',    20, NULL, NULL, 0, 18),
('jj_veg_23', 'jiangjiejie', 'cat_jj_veggies', '23. 57 號地瓜',    20, NULL, NULL, 0, 19),
('jj_veg_24', 'jiangjiejie', 'cat_jj_veggies', '24. 青花菜心',    20, NULL, NULL, 0, 20),
('jj_veg_25', 'jiangjiejie', 'cat_jj_veggies', '25. 大朵香菇',    20, NULL, NULL, 0, 21),
('jj_veg_26', 'jiangjiejie', 'cat_jj_veggies', '26. 水果甜椒',    20, NULL, NULL, 0, 22),
('jj_veg_27', 'jiangjiejie', 'cat_jj_veggies', '27. 黃大豆芽',    20, NULL, NULL, 0, 23),
('jj_veg_28', 'jiangjiejie', 'cat_jj_veggies', '28. 紫糯大玉米',  20, NULL, NULL, 0, 24),
('jj_veg_29', 'jiangjiejie', 'cat_jj_veggies', '29. 青龍椒(糯米椒)', 20, NULL, NULL, 0, 25),
('jj_veg_30', 'jiangjiejie', 'cat_jj_veggies', '30. 雲耳(黑木耳)',  20, NULL, NULL, 0, 26),
('jj_veg_31', 'jiangjiejie', 'cat_jj_veggies', '31. 綠色花椰菜',  20, NULL, NULL, 0, 27),
('jj_veg_32', 'jiangjiejie', 'cat_jj_veggies', '32. 高山高麗菜',  20, NULL, NULL, 0, 28),

-- 4.5 內臟類 (Offal)
('jj_off_a', 'jiangjiejie', 'cat_jj_offal', 'A. 雞冠',  20, NULL, NULL, 0, 1),
('jj_off_b', 'jiangjiejie', 'cat_jj_offal', 'B. 蛋丹',  20, NULL, NULL, 0, 2),
('jj_off_c', 'jiangjiejie', 'cat_jj_offal', 'C. 雞皮',  20, NULL, NULL, 0, 3),
('jj_off_d', 'jiangjiejie', 'cat_jj_offal', 'D. 雞屁股', 20, NULL, NULL, 0, 4),
('jj_off_e', 'jiangjiejie', 'cat_jj_offal', 'E. 雞胗',  20, NULL, NULL, 0, 5),
('jj_off_f', 'jiangjiejie', 'cat_jj_offal', 'F. 雞心',  20, NULL, NULL, 0, 6),
('jj_off_g', 'jiangjiejie', 'cat_jj_offal', 'G. 雞肝',  20, NULL, NULL, 0, 7),
('jj_off_x', 'jiangjiejie', 'cat_jj_offal', 'X. 鴨脆腸', 20, NULL, NULL, 0, 8),

-- 4.6 滷味類 (Braised)
('jj_brs_h', 'jiangjiejie', 'cat_jj_braised', 'H. 豬血糕', 20, NULL, NULL, 0, 1),
('jj_brs_i', 'jiangjiejie', 'cat_jj_braised', 'I. 豆干',   20, NULL, NULL, 0, 2),
('jj_brs_j', 'jiangjiejie', 'cat_jj_braised', 'J. 百頁豆腐', 20, NULL, NULL, 0, 3),
('jj_brs_k', 'jiangjiejie', 'cat_jj_braised', 'K. 素腰花', 20, NULL, NULL, 0, 4),
('jj_brs_l', 'jiangjiejie', 'cat_jj_braised', 'L. 甜不辣', 20, NULL, NULL, 0, 5),
('jj_brs_m', 'jiangjiejie', 'cat_jj_braised', 'M. 五香鳥蛋', 20, NULL, NULL, 0, 6),
('jj_brs_n', 'jiangjiejie', 'cat_jj_braised', 'N. 滷蛋白', 20, NULL, NULL, 0, 7),

-- 4.7 其他類 (Others)
('jj_oth_p', 'jiangjiejie', 'cat_jj_others', 'P. 王子麵',   20, '兩點前點餐保證有', NULL, 0, 1),
('jj_oth_r', 'jiangjiejie', 'cat_jj_others', 'R. 豆干絲',   20, NULL, NULL, 0, 2),
('jj_oth_s', 'jiangjiejie', 'cat_jj_others', 'S. 煙燻豆皮', 20, NULL, NULL, 0, 3),
('jj_oth_u', 'jiangjiejie', 'cat_jj_others', 'U. 皮蛋',     20, NULL, NULL, 0, 4),
('jj_oth_y', 'jiangjiejie', 'cat_jj_others', 'Y. 鑫鑫腸',   20, NULL, NULL, 0, 5),
('jj_oth_z', 'jiangjiejie', 'cat_jj_others', 'Z. 松葉蟹味棒', 20, NULL, NULL, 0, 6),

-- 4.8 胡椒粉 (Pepper Level Modifiers)
('jj_pep_0', 'jiangjiejie', 'mod_jj_pepper', '不要',          0, NULL, NULL, 0, 1),
('jj_pep_1', 'jiangjiejie', 'mod_jj_pepper', '一滴滴 (撒半次)', 0, NULL, NULL, 0, 2),
('jj_pep_2', 'jiangjiejie', 'mod_jj_pepper', '微鹹 (撒一次)',   0, NULL, NULL, 0, 3),
('jj_pep_3', 'jiangjiejie', 'mod_jj_pepper', '清淡 (撒兩次)',   0, NULL, NULL, 0, 4),
('jj_pep_4', 'jiangjiejie', 'mod_jj_pepper', '正常',          0, NULL, NULL, 0, 5),
('jj_pep_5', 'jiangjiejie', 'mod_jj_pepper', '重鹹',          0, NULL, NULL, 0, 6),

-- 4.9 辣椒 (Chili Level Modifiers)
('jj_chi_0', 'jiangjiejie', 'mod_jj_chili', '包辣', 0, NULL, NULL, 0, 1),
('jj_chi_1', 'jiangjiejie', 'mod_jj_chili', '微',   0, NULL, NULL, 0, 2),
('jj_chi_2', 'jiangjiejie', 'mod_jj_chili', '小',   0, NULL, NULL, 0, 3),
('jj_chi_3', 'jiangjiejie', 'mod_jj_chili', '中',   0, NULL, NULL, 0, 4),
('jj_chi_4', 'jiangjiejie', 'mod_jj_chili', '大',   0, NULL, NULL, 0, 5),

-- 4.10 椒麻 (Szechuan Pepper Modifiers)
('jj_ma_1', 'jiangjiejie', 'mod_jj_ma', '微麻', 0, NULL, NULL, 0, 1),
('jj_ma_2', 'jiangjiejie', 'mod_jj_ma', '小麻', 0, NULL, NULL, 0, 2),
('jj_ma_3', 'jiangjiejie', 'mod_jj_ma', '中麻', 0, NULL, NULL, 0, 3),
('jj_ma_4', 'jiangjiejie', 'mod_jj_ma', '大麻', 0, NULL, NULL, 0, 4),

-- 4.11 洋蔥 (Onion Modifiers)
('jj_oni_0', 'jiangjiejie', 'mod_jj_onion', '不要',  0, NULL, NULL, 0, 1),
('jj_oni_1', 'jiangjiejie', 'mod_jj_onion', '要',    0, NULL, NULL, 0, 2),
('jj_oni_2', 'jiangjiejie', 'mod_jj_onion', '多',   20, '多需加 20 元 (加洋蔥因成本上漲需滿 $100)', NULL, 0, 3),

-- 4.12 蒜泥 (Garlic Modifiers)
('jj_gar_0', 'jiangjiejie', 'mod_jj_garlic', '不要', 0, NULL, NULL, 0, 1),
('jj_gar_1', 'jiangjiejie', 'mod_jj_garlic', '要',   0, NULL, NULL, 0, 2),
('jj_gar_2', 'jiangjiejie', 'mod_jj_garlic', '多',   0, NULL, NULL, 0, 3),

-- 4.13 蔥 (Scallion Modifiers)
('jj_sca_0', 'jiangjiejie', 'mod_jj_scallion', '不要', 0, NULL, NULL, 0, 1),
('jj_sca_1', 'jiangjiejie', 'mod_jj_scallion', '要',   0, NULL, NULL, 0, 2),
('jj_sca_2', 'jiangjiejie', 'mod_jj_scallion', '多',   0, NULL, NULL, 0, 3),

-- 4.14 香油 (Sesame Oil Modifiers)
('jj_oil_0', 'jiangjiejie', 'mod_jj_sesame_oil', '不要', 0, NULL, NULL, 0, 1),
('jj_oil_1', 'jiangjiejie', 'mod_jj_sesame_oil', '少',   0, NULL, NULL, 0, 2),
('jj_oil_2', 'jiangjiejie', 'mod_jj_sesame_oil', '正常', 0, NULL, NULL, 0, 3),
('jj_oil_3', 'jiangjiejie', 'mod_jj_sesame_oil', '多',   0, NULL, NULL, 0, 4),

-- 4.15 蔬菜湯 (Broth Modifiers)
('jj_vsp_0', 'jiangjiejie', 'mod_jj_veg_soup', '極少', 0, NULL, NULL, 0, 1),
('jj_vsp_1', 'jiangjiejie', 'mod_jj_veg_soup', '少',   0, NULL, NULL, 0, 2),
('jj_vsp_2', 'jiangjiejie', 'mod_jj_veg_soup', '正常', 0, NULL, NULL, 0, 3),
('jj_vsp_3', 'jiangjiejie', 'mod_jj_veg_soup', '多',   0, NULL, NULL, 0, 4),

-- 4.16 雞肉處理 (Chicken Preparation Modifiers)
('jj_cpr_1', 'jiangjiejie', 'mod_jj_chicken_prep', '去骨',   0, NULL, NULL, 0, 1),
('jj_cpr_2', 'jiangjiejie', 'mod_jj_chicken_prep', '去皮',   0, NULL, NULL, 0, 2),
('jj_cpr_3', 'jiangjiejie', 'mod_jj_chicken_prep', '不去骨', 0, NULL, NULL, 0, 3),

-- 4.17 特調檸檬汁 (Special Lemon Juice Modifiers)
('jj_lem_0', 'jiangjiejie', 'mod_jj_lemon_juice', '不要', 0, NULL, NULL, 0, 1),
('jj_lem_1', 'jiangjiejie', 'mod_jj_lemon_juice', '全部', 0, '加檸檬汁因成本問題需滿 150', NULL, 0, 2),
('jj_lem_2', 'jiangjiejie', 'mod_jj_lemon_juice', '各半', 0, '加檸檬汁因成本問題需滿 150', NULL, 0, 3),
('jj_lem_3', 'jiangjiejie', 'mod_jj_lemon_juice', '試吃', 0, NULL, NULL, 0, 4)
ON CONFLICT(id) DO UPDATE SET
    tenant_id = excluded.tenant_id,
    category_id = excluded.category_id,
    name = excluded.name,
    price = excluded.price,
    description = excluded.description,
    badge_text = excluded.badge_text,
    is_recommended = excluded.is_recommended,
    sort_order = excluded.sort_order;
