-- Migration: 0037_seed_bsc_menu.sql
-- Description: Seed tenant 'bsc' (干城鹹水雞) configuration, categories, menu items, and customizations

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
VALUES ('bsc', '干城鹹水雞')
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
    default_password
) VALUES (
    'bsc',
    '干城鹹水雞',
    '#00b900',
    '台中市南屯區黎明里干城街302號',
    '{"0":[{"start":"16:30","end":"21:30"}],"4":[{"start":"16:30","end":"21:30"}],"5":[{"start":"16:30","end":"21:30"}],"6":[{"start":"16:30","end":"21:30"}]}',
    0,
    0,
    '["reports", "flex_notifications"]',
    'K',
    '📞 訂購專線：請透過 LINE 線上點餐',
    'zh-TW',
    'open',
    '12345678'
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
    store_status = excluded.store_status;

-- 4. Seed Menu Categories
INSERT INTO menu_categories (id, tenant_id, name, slug, sort_order, category_type, allow_customization, applied_modifiers)
VALUES
    ('bsc_flavor_section', 'bsc', '🧪 口味與客製化選擇', 'sec-flavor', 1, 'order_customization', 1, '[]'),
    ('bsc_cat_large', 'bsc', '🍗 肉類', 'large', 2, 'catalog', 1, '[]'),
    ('bsc_cat_small', 'bsc', '⭐ 精選小菜 $50/份', 'small', 3, 'catalog', 1, '[]'),
    ('bsc_cat_combo', 'bsc', '🥘 特色小菜 $30/份', 'combo', 4, 'catalog', 1, '[]'),
    ('bsc_cat_drinks', 'bsc', '🥗 經典小菜 $25/份', 'drinks', 5, 'catalog', 0, '[]'),
    ('bsc_veggie', 'bsc', '🥦 蔬菜/配菜 1份$35 / 3份$100', 'veggie', 6, 'catalog', 1, '[]'),
    ('bsc_cat_topping', 'bsc', '加價配料', 'topping', 7, 'catalog', 1, '[]')
ON CONFLICT(id) DO UPDATE SET
    name = excluded.name,
    slug = excluded.slug,
    sort_order = excluded.sort_order,
    category_type = excluded.category_type,
    allow_customization = excluded.allow_customization;

-- 5. Seed Menu Items
INSERT INTO menu_items (id, tenant_id, category_id, name, price, badge_text, is_recommended, sort_order)
VALUES
    -- 肉類
    ('bsc_large_雞胸肉', 'bsc', 'bsc_cat_large', '雞胸肉', 60.0, NULL, 0, 1),
    ('bsc_large_雞腿肉', 'bsc', 'bsc_cat_large', '雞腿肉', 70.0, NULL, 0, 2),
    ('bsc_large_松阪豬', 'bsc', 'bsc_cat_large', '松阪豬', 70.0, NULL, 0, 3),

    -- 精選小菜 $50
    ('bsc_small_無骨鳳爪', 'bsc', 'bsc_cat_small', '無骨鳳爪', 50.0, NULL, 0, 1),
    ('bsc_small_日本山藥', 'bsc', 'bsc_cat_small', '日本山藥', 50.0, NULL, 0, 2),

    -- 特色小菜 $30
    ('bsc_combo_煙燻豆包', 'bsc', 'bsc_cat_combo', '煙燻豆包', 30.0, NULL, 0, 1),
    ('bsc_combo_茶燻百葉', 'bsc', 'bsc_cat_combo', '茶燻百葉', 30.0, NULL, 0, 2),
    ('bsc_combo_鳥蛋(5顆)', 'bsc', 'bsc_cat_combo', '鳥蛋(5顆)', 30.0, NULL, 0, 3),
    ('bsc_combo_鴨米血', 'bsc', 'bsc_cat_combo', '鴨米血', 30.0, NULL, 0, 4),
    ('bsc_combo_櫛瓜', 'bsc', 'bsc_cat_combo', '櫛瓜', 30.0, NULL, 0, 5),
    ('bsc_combo_木耳', 'bsc', 'bsc_cat_combo', '木耳', 30.0, NULL, 0, 6),
    ('bsc_combo_蘋果', 'bsc', 'bsc_cat_combo', '蘋果', 30.0, NULL, 0, 7),
    ('bsc_combo_筍片', 'bsc', 'bsc_cat_combo', '筍片', 30.0, NULL, 0, 8),

    -- 經典小菜 $25
    ('bsc_drinks_蝦子(一隻)', 'bsc', 'bsc_cat_drinks', '蝦子(一隻)', 25.0, NULL, 0, 1),
    ('bsc_drinks_大黑豆乾', 'bsc', 'bsc_cat_drinks', '大黑豆乾', 25.0, NULL, 0, 2),
    ('bsc_drinks_竹輪', 'bsc', 'bsc_cat_drinks', '竹輪', 25.0, NULL, 0, 3),
    ('bsc_drinks_皮蛋', 'bsc', 'bsc_cat_drinks', '皮蛋', 25.0, NULL, 0, 4),
    ('bsc_drinks_甜不辣', 'bsc', 'bsc_cat_drinks', '甜不辣', 25.0, NULL, 0, 5),

    -- 蔬菜/配菜 $35
    ('bsc_veggie_滷苦瓜', 'bsc', 'bsc_veggie', '滷苦瓜', 35.0, NULL, 0, 1),
    ('bsc_veggie_海帶芽', 'bsc', 'bsc_veggie', '海帶芽', 35.0, NULL, 0, 2),
    ('bsc_veggie_水煮花生', 'bsc', 'bsc_veggie', '水煮花生', 35.0, NULL, 0, 3),
    ('bsc_veggie_剝皮辣椒', 'bsc', 'bsc_veggie', '剝皮辣椒', 35.0, NULL, 0, 4),
    ('bsc_veggie_滷香菇', 'bsc', 'bsc_veggie', '滷香菇', 35.0, NULL, 0, 5),
    ('bsc_veggie_甜椒', 'bsc', 'bsc_veggie', '甜椒', 35.0, NULL, 0, 6),
    ('bsc_veggie_西洋芹', 'bsc', 'bsc_veggie', '西洋芹', 35.0, NULL, 0, 7),
    ('bsc_veggie_小黃瓜', 'bsc', 'bsc_veggie', '小黃瓜', 35.0, NULL, 0, 8),
    ('bsc_veggie_高麗菜', 'bsc', 'bsc_veggie', '高麗菜', 35.0, NULL, 0, 9),
    ('bsc_veggie_玉米筍', 'bsc', 'bsc_veggie', '玉米筍', 35.0, NULL, 0, 10),
    ('bsc_veggie_龍鬚菜', 'bsc', 'bsc_veggie', '龍鬚菜', 35.0, NULL, 0, 11),
    ('bsc_veggie_娃娃菜', 'bsc', 'bsc_veggie', '娃娃菜', 35.0, NULL, 0, 12),
    ('bsc_veggie_蓮藕片', 'bsc', 'bsc_veggie', '蓮藕片', 35.0, NULL, 0, 13),
    ('bsc_veggie_豬耳朵', 'bsc', 'bsc_veggie', '豬耳朵', 35.0, NULL, 0, 14),
    ('bsc_veggie_雞軟骨', 'bsc', 'bsc_veggie', '雞軟骨', 35.0, NULL, 0, 15),
    ('bsc_veggie_烤馬鈴薯', 'bsc', 'bsc_veggie', '烤馬鈴薯', 35.0, NULL, 0, 16),
    ('bsc_veggie_腐竹豆皮', 'bsc', 'bsc_veggie', '腐竹豆皮', 35.0, NULL, 0, 17),
    ('bsc_veggie_滷蛋白丁', 'bsc', 'bsc_veggie', '滷蛋白丁', 35.0, NULL, 0, 18),
    ('bsc_veggie_蘆筍', 'bsc', 'bsc_veggie', '蘆筍', 35.0, NULL, 0, 19),
    ('bsc_veggie_花椰菜', 'bsc', 'bsc_veggie', '花椰菜', 35.0, NULL, 0, 20),
    ('bsc_veggie_水蓮', 'bsc', 'bsc_veggie', '水蓮', 35.0, NULL, 0, 21),
    ('bsc_veggie_山苦瓜', 'bsc', 'bsc_veggie', '山苦瓜', 35.0, NULL, 0, 22),
    ('bsc_veggie_秋葵', 'bsc', 'bsc_veggie', '秋葵', 35.0, NULL, 0, 23),
    ('bsc_veggie_芥藍芽', 'bsc', 'bsc_veggie', '芥藍芽', 35.0, NULL, 0, 24),
    ('bsc_veggie_杏鮑菇', 'bsc', 'bsc_veggie', '杏鮑菇', 35.0, NULL, 0, 25),
    ('bsc_veggie_雞肝', 'bsc', 'bsc_veggie', '雞肝', 35.0, NULL, 0, 26),
    ('bsc_veggie_雞胗', 'bsc', 'bsc_veggie', '雞胗', 35.0, NULL, 0, 27),
    ('bsc_veggie_鴨賞', 'bsc', 'bsc_veggie', '鴨賞', 35.0, NULL, 0, 28),
    ('bsc_veggie_雞心', 'bsc', 'bsc_veggie', '雞心', 35.0, NULL, 0, 29),
    ('bsc_veggie_蕎麥麵', 'bsc', 'bsc_veggie', '蕎麥麵', 35.0, NULL, 0, 30),
    ('bsc_veggie_金針菇', 'bsc', 'bsc_veggie', '金針菇', 35.0, NULL, 0, 31),

    -- 加價配料
    ('bsc_topping_加香菜', 'bsc', 'bsc_cat_topping', '加香菜', 15.0, NULL, 0, 1),
    ('bsc_topping_檸檬汁', 'bsc', 'bsc_cat_topping', '檸檬汁', 20.0, NULL, 0, 2)
ON CONFLICT(id) DO UPDATE SET
    price = excluded.price,
    sort_order = excluded.sort_order;

-- 6. Seed Menu Customizations (Order-level flavor options)
INSERT INTO menu_customizations (id, tenant_id, key, title, type, sort_order, options_json)
VALUES
    ('bsc_flavor', 'bsc', 'flavor', '✦ 口味選擇', 'radio', 0, '[{"name":"特調胡椒"},{"name":"泰式酸辣"},{"name":"清爽檸檬","sub_options":["不加香油","不加鹽巴"]},{"name":"檸檬香菜（ 香菜缺貨中，請選檸檬口味）","sub_options":["不加香油","不加鹽巴"]},{"name":"原味客製","sub_options":["不加香油","不加胡椒","不加胡椒加鹽巴"]}]'),
    ('bsc_salt', 'bsc', 'salt', '✦ 鹹度調整', 'radio', 1, '[{"name":"正常"},{"name":"調味重"},{"name":"調味清淡"}]'),
    ('bsc_spicy', 'bsc', 'spicy', '✦ 辣度選擇 (朝天椒)', 'radio', 2, '[{"name":"不辣"},{"name":"微辣"},{"name":"小辣"},{"name":"中辣"},{"name":"大辣"},{"name":"辣椒放餐盒角落"}]'),
    ('bsc_ingredients', 'bsc', 'ingredients', '✦ 配料調整', 'checkbox', 3, '[{"name":"不加蔥花"},{"name":"不加蒜頭"},{"name":"不加洋蔥"}]'),
    ('bsc_addons', 'bsc', 'addons', '✦ 加價配料', 'checkbox', 4, '[{"name":"加香菜","price":15},{"name":"加檸檬汁","price":20}]')
ON CONFLICT(id) DO UPDATE SET
    title = excluded.title,
    type = excluded.type,
    sort_order = excluded.sort_order,
    options_json = excluded.options_json;
