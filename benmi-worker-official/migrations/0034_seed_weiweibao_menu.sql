-- Migration: 0034_seed_weiweibao_menu.sql
-- Description: Seed initial menu, categories, modifiers and tenant configuration for tenant 'weiweibao' (微為飽小吃)

-- 1. Tenants Table
INSERT OR REPLACE INTO tenants (id, name) 
VALUES ('weiweibao', '微為飽小吃');

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
    'weiweibao',
    '微為飽小吃',
    '#00b900',
    '新北市板橋區四維路299號',
    '{"0":[{"start":"15:00","end":"22:00"}],"1":[{"start":"16:00","end":"22:00"}],"2":[{"start":"16:00","end":"22:00"}],"3":[{"start":"16:00","end":"22:00"}],"4":[{"start":"16:00","end":"22:00"}],"5":[{"start":"16:00","end":"22:00"}],"6":[{"start":"15:00","end":"22:00"}]}',
    '📞 訂購專線：0905107578',
    '12345678',
    'zh-TW',
    0,
    0,
    'open',
    '2009560906-c5taZfiY',
    'https://liff.line.me/2009560906-c5taZfiY',
    'W',
    '[]',
    1
);

-- 3. Categories (Catalog & Modifiers)
INSERT OR REPLACE INTO menu_categories (
    id, tenant_id, name, slug, category_type, selection_type,
    is_required, min_selection, max_selection, sort_order,
    allow_customization, applied_modifiers
) VALUES
('cat_wwb_bread',          'weiweibao', '麵包 (bánh mì các loại)',                    'banh-mi',               'catalog',  'single',      0, 0, 1,  1, 1, '["customizations-general","combo-drink-discount"]'),
('cat_wwb_noodle',         'weiweibao', '干米線 (bún khô)',                           'bun-kho',               'catalog',  'single',      0, 0, 1,  2, 1, '["customizations-general","customizations-noodle"]'),
('cat_wwb_pork',           'weiweibao', '脆皮豬肉 (thịt heo quay)',                   'heo-quay',              'catalog',  'single',      0, 0, 1,  3, 1, '["customizations-general"]'),
('cat_wwb_single',         'weiweibao', '單點 (A La Carte)',                         'a-la-carte',            'catalog',  'single',      0, 0, 1,  4, 0, '[]'),
('cat_wwb_drink',          'weiweibao', '飲料 (nước)',                               'beverages',             'catalog',  'single',      0, 0, 1,  5, 0, '[]'),
('cat_wwb_custom_general', 'weiweibao', '客製化 (Tùy chọn chung)',                    'customizations-general', 'modifier', 'multiple',    0, 0, 10, 6, 0, NULL),
('cat_wwb_custom_noodle',  'weiweibao', '客製化 - 干米線專用 (Tùy chọn bún)',         'customizations-noodle',  'modifier', 'multiple',    0, 0, 1,  7, 0, NULL),
('cat_wwb_combo_drink',    'weiweibao', '套餐加購飲料 (Mua kèm bánh mì - Đồng giá 50元)', 'combo-drink-discount', 'modifier', 'combo_drink', 0, 0, 1,  8, 0, NULL);

-- 4. Menu Items
INSERT OR REPLACE INTO menu_items (
    id, tenant_id, category_id, name, price, description, badge_text, is_recommended, sort_order
) VALUES
-- 麵包 (Bánh mì)
('wwb_bm_01', 'weiweibao', 'cat_wwb_bread', '脆皮豬肉麵包 (bánh mì heo quay)',        120, NULL, NULL, 0, 1),
('wwb_bm_02', 'weiweibao', 'cat_wwb_bread', '叉燒麵包豬 (bánh mì thịt heo xá xíu)',  100, NULL, NULL, 0, 2),
('wwb_bm_03', 'weiweibao', 'cat_wwb_bread', '叉燒麵包雞 (bánh mì gà xá xíu)',        95,  NULL, NULL, 0, 3),

-- 干米線 (Bún khô)
('wwb_nd_01', 'weiweibao', 'cat_wwb_noodle', '脆皮豬肉米線 (bún heo quay)',            120, NULL, NULL, 0, 1),
('wwb_nd_02', 'weiweibao', 'cat_wwb_noodle', '叉燒雞腿肉米線 (bún đùi gà xá xíu)',     110, NULL, NULL, 0, 2),
('wwb_nd_03', 'weiweibao', 'cat_wwb_noodle', '叉燒豬肉米線 (bún thịt heo xá xíu)',     100, NULL, NULL, 0, 3),
('wwb_nd_04', 'weiweibao', 'cat_wwb_noodle', '越式春捲 (gỏi cuốn)',                    100, NULL, NULL, 0, 4),

-- 脆皮豬肉 (Thịt heo quay)
('wwb_pk_01', 'weiweibao', 'cat_wwb_pork', '脆皮豬肉 - 大份 (hộp lớn)',               350, NULL, NULL, 0, 1),
('wwb_pk_02', 'weiweibao', 'cat_wwb_pork', '脆皮豬肉 - 小份 (hộp nhỏ)',               200, NULL, NULL, 0, 2),
('wwb_pk_03', 'weiweibao', 'cat_wwb_pork', '醃蘿蔔一盒 (củ cải giấm đường)',          100, NULL, NULL, 0, 3),

-- 單點 (A La Carte)
('wwb_sg_01', 'weiweibao', 'cat_wwb_single', '空麵包 (bánh mì không)',                30,  NULL, NULL, 0, 1),
('wwb_sg_02', 'weiweibao', 'cat_wwb_single', '雞腿 (đùi gà)',                          70,  NULL, NULL, 0, 2),

-- 飲料 (Nước)
('wwb_dr_01', 'weiweibao', 'cat_wwb_drink', '泰式紅奶茶 (Trà sữa thái)',              65,  NULL, NULL, 0, 1),
('wwb_dr_02', 'weiweibao', 'cat_wwb_drink', '越南拿鐵 (Cafe sữa)',                     65,  NULL, NULL, 0, 2),
('wwb_dr_03', 'weiweibao', 'cat_wwb_drink', '越南黑咖啡 (Cafe đá)',                    60,  NULL, NULL, 0, 3),
('wwb_dr_04', 'weiweibao', 'cat_wwb_drink', '可口可樂/雪碧 (Cocacola, sprite)',        30,  NULL, NULL, 0, 4),

-- 客製化 (Tùy chọn chung)
('wwb_cg_01', 'weiweibao', 'cat_wwb_custom_general', '加辣 (Có ớt)',                  0, NULL, NULL, 0, 1),
('wwb_cg_02', 'weiweibao', 'cat_wwb_custom_general', '不加辣 (Không ớt)',             0, NULL, NULL, 0, 2),
('wwb_cg_03', 'weiweibao', 'cat_wwb_custom_general', '不加香菜 (Không ngò rí)',       0, NULL, NULL, 0, 3),
('wwb_cg_04', 'weiweibao', 'cat_wwb_custom_general', '不加豬肝醬 (Không pate)',       0, NULL, NULL, 0, 4),
('wwb_cg_05', 'weiweibao', 'cat_wwb_custom_general', '不加黃瓜 (Không dưa leo)',       0, NULL, NULL, 0, 5),
('wwb_cg_06', 'weiweibao', 'cat_wwb_custom_general', '不加大陸妹 (Không xà lách)',     0, NULL, NULL, 0, 6),
('wwb_cg_07', 'weiweibao', 'cat_wwb_custom_general', '不加醃蘿蔔 (Không dưa chua)',   0, NULL, NULL, 0, 7),
('wwb_cg_08', 'weiweibao', 'cat_wwb_custom_general', '不加火腿 (Không chả)',          0, NULL, NULL, 0, 8),

-- 客製化 - 干米線專用 (Tùy chọn bún)
('wwb_cn_01', 'weiweibao', 'cat_wwb_custom_noodle', '不加花生 (Không đậu phộng)',      0, NULL, NULL, 0, 1),

-- 套餐加購飲料 (Combo drink discount)
('wwb_cd_01', 'weiweibao', 'cat_wwb_combo_drink', '加購 泰式紅奶茶 (Trà sữa thái)',   50, '搭配麵包享加購價 50元', '套餐優惠', 1, 1),
('wwb_cd_02', 'weiweibao', 'cat_wwb_combo_drink', '加購 越南拿鐵 (Cafe sữa)',          50, '搭配麵包享加購價 50元', '套餐優惠', 1, 2),
('wwb_cd_03', 'weiweibao', 'cat_wwb_combo_drink', '加購 越南黑咖啡 (Cafe đá)',         50, '搭配麵包享加購價 50元', '套餐優惠', 1, 3);
