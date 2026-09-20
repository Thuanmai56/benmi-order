-- Migration: 0058_seed_haoshiguoshao_menu.sql
-- Description: Seed initial menu, categories, modifiers, and tenant configuration for tenant 'haoshiguoshao' (好食鍋燒)

-- 1. Seed Tenant
INSERT INTO tenants (id, name)
VALUES ('haoshiguoshao', '好食鍋燒')
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
    longitude
) VALUES (
    'haoshiguoshao',
    '好食鍋燒',
    '#ea580c',
    '台南市建南路154號(文華市場)',
    '{"0":[{"start":"15:00","end":"01:00"}],"1":[{"start":"15:00","end":"01:00"}],"2":[{"start":"15:00","end":"01:00"}],"3":[{"start":"15:00","end":"01:00"}],"4":[{"start":"15:00","end":"01:00"}],"5":[{"start":"15:00","end":"01:00"}],"6":[{"start":"15:00","end":"01:00"}]}',
    '🛵 線上預訂外帶/自取，現點現煮免現場排隊等候。訂餐專線：0906300599',
    '12345678',
    'zh-TW',
    1,
    1,
    'open',
    '2009560906-c5taZfiY',
    'https://liff.line.me/2009560906-c5taZfiY',
    'HS',
    '["reports", "flex_notifications"]',
    'taiwanese',
    1,
    1,
    22.9836,
    120.1912
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
    longitude = excluded.longitude;

-- 3. Seed Menu Categories
INSERT INTO menu_categories (
    id, tenant_id, name, short_name, slug, category_type, selection_type,
    is_required, min_selection, max_selection, sort_order,
    allow_customization, applied_modifiers
) VALUES
-- Catalog Categories
('cat_hs_guoshao',       'haoshiguoshao', '鍋燒麵系列', '鍋燒麵', 'guoshao',       'catalog',  'single',   0, 0, 1, 1, 1, '["mod_hs_noodle_type", "mod_hs_guoshao_addons"]'),
('cat_hs_fried_noodles', 'haoshiguoshao', '炒泡麵系列', '炒泡麵', 'fried-noodles', 'catalog',  'single',   0, 0, 1, 2, 0, '[]'),
('cat_hs_soups',         'haoshiguoshao', '精選湯類',   '湯類',   'soups',         'catalog',  'single',   0, 0, 1, 3, 0, '[]'),
('cat_hs_drinks',        'haoshiguoshao', '清涼冰飲',   '冰飲',   'drinks',        'catalog',  'single',   0, 0, 1, 4, 0, '[]'),
('cat_hs_snacks',        'haoshiguoshao', '點心炸物',   '炸物',   'snacks',        'catalog',  'single',   0, 0, 1, 5, 0, '[]'),

-- Modifier Categories
('mod_hs_noodle_type',     'haoshiguoshao', '麵體選擇 (必選1項)', '麵體', 'noodle-type',    'modifier', 'single',   1, 1, 1, 10, 0, '[]'),
('mod_hs_guoshao_addons',  'haoshiguoshao', '加料加價購 (可複選)', '加料', 'guoshao-addons', 'modifier', 'multiple', 0, 0, 6, 11, 0, '[]')
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
-- 4.1 鍋燒麵系列 (Guoshao Noodles)
('hs_gs_01', 'haoshiguoshao', 'cat_hs_guoshao', '原味鍋燒',  70, '原味經典清甜高湯，請選擇搭配麵體', '經典原味', 1, 1),
('hs_gs_02', 'haoshiguoshao', 'cat_hs_guoshao', '麻辣鍋燒',  80, '香麻帶勁微辣濃郁高湯，請選擇搭配麵體', '人氣推薦', 1, 2),
('hs_gs_03', 'haoshiguoshao', 'cat_hs_guoshao', '泡菜鍋燒',  80, '酸辣爽口韓式泡菜風味，請選擇搭配麵體', NULL, 0, 3),
('hs_gs_04', 'haoshiguoshao', 'cat_hs_guoshao', '咖哩鍋燒',  80, '濃郁甘醇日式咖哩風味，請選擇搭配麵體', NULL, 0, 4),
('hs_gs_05', 'haoshiguoshao', 'cat_hs_guoshao', '魚肉鍋燒',  80, '鮮甜細嫩魚肉搭配清爽高湯，請選擇搭配麵體', NULL, 0, 5),
('hs_gs_06', 'haoshiguoshao', 'cat_hs_guoshao', '肉排鍋燒',  90, '厚實飽滿鮮嫩肉排，飽足感十足，請選擇搭配麵體', '飽足首選', 0, 6),
('hs_gs_07', 'haoshiguoshao', 'cat_hs_guoshao', '好蝦鍋燒',  90, '鮮甜美味好蝦，湯頭甘醇鮮美，請選擇搭配麵體', '海味推薦', 1, 7),
('hs_gs_08', 'haoshiguoshao', 'cat_hs_guoshao', '起士鍋燒',  90, '香濃起司片熔入熱湯，濃郁牽絲，請選擇搭配麵體', NULL, 0, 8),
('hs_gs_09', 'haoshiguoshao', 'cat_hs_guoshao', '部隊鍋燒',  90, '韓式部隊風味澎湃豐富組合，請選擇搭配麵體', NULL, 0, 9),
('hs_gs_10', 'haoshiguoshao', 'cat_hs_guoshao', '鮮味鍋燒', 105, '豐盛鮮美招牌海陸饗宴，請選擇搭配麵體', '豪華鮮味', 1, 10),

-- 4.2 炒泡麵系列 (Fried Noodles)
('hs_fn_01', 'haoshiguoshao', 'cat_hs_fried_noodles', '阿嬤炒泡麵',     75, '古早味經典阿嬤家常風味炒泡麵', '招牌經典', 1, 1),
('hs_fn_02', 'haoshiguoshao', 'cat_hs_fried_noodles', '炸醬炒泡麵',     75, '特製鹹香炸醬拌炒，香氣逼人', NULL, 0, 2),
('hs_fn_03', 'haoshiguoshao', 'cat_hs_fried_noodles', '麻辣沙茶炒泡麵', 75, '麻辣佐經典沙茶雙重香氣爆發', '香辣濃郁', 1, 3),
('hs_fn_04', 'haoshiguoshao', 'cat_hs_fried_noodles', '皮蛋麻辣炒泡麵', 85, '濃郁皮蛋與麻辣炒泡麵的絕妙搭配', '特色推薦', 1, 4),
('hs_fn_05', 'haoshiguoshao', 'cat_hs_fried_noodles', '起士香腸炒泡麵', 85, '牽絲濃郁起司搭配鹹香多汁香腸', '人氣熱銷', 1, 5),
('hs_fn_06', 'haoshiguoshao', 'cat_hs_fried_noodles', '辛拉麵',         80, '經典韓國辛拉麵，香辣濃郁過癮', '🌶️🌶️ 雙倍辣', 0, 6),
('hs_fn_07', 'haoshiguoshao', 'cat_hs_fried_noodles', '紅燒牛肉泡麵',   75, '香濃紅燒牛肉風味泡麵', NULL, 0, 7),
('hs_fn_08', 'haoshiguoshao', 'cat_hs_fried_noodles', '肉燥泡麵',       65, '台灣傳統經典鹹香肉燥泡麵', NULL, 0, 8),

-- 4.3 精選湯類 (Soups - 魚丸來自興達港手工魚丸，不是機器魚丸喔！)
('hs_sp_01', 'haoshiguoshao', 'cat_hs_soups', '蛋花湯',     25, '現煮滑嫩香醇蛋花湯', NULL, 0, 1),
('hs_sp_02', 'haoshiguoshao', 'cat_hs_soups', '紫菜蛋花湯', 30, '清甜紫菜搭配滑順現煮蛋花', NULL, 0, 2),
('hs_sp_03', 'haoshiguoshao', 'cat_hs_soups', '紫菜魚丸湯', 35, '興達港手工魚丸，鮮甜彈牙配清爽紫菜高湯', NULL, 0, 3),
('hs_sp_04', 'haoshiguoshao', 'cat_hs_soups', '魚丸蛋花湯', 45, '興達港手工魚丸搭配滑順現煮蛋花', NULL, 0, 4),
('hs_sp_05', 'haoshiguoshao', 'cat_hs_soups', '魚肉湯',     45, '鮮嫩細緻魚肉，暖胃清甜好湯', NULL, 0, 5),
('hs_sp_06', 'haoshiguoshao', 'cat_hs_soups', '麻辣魚丸湯', 40, '興達港手工魚丸佐香辣過癮麻辣湯頭', NULL, 0, 6),
('hs_sp_07', 'haoshiguoshao', 'cat_hs_soups', '魚肉魚丸湯', 55, '鮮美魚肉與興達港手工魚丸雙料大滿足', '雙料推薦', 1, 7),
('hs_sp_08', 'haoshiguoshao', 'cat_hs_soups', '綜合湯',     70, '豐盛澎湃綜合配料，鮮甜好滋味一次滿足', '招牌必點', 1, 8),

-- 4.4 清涼冰飲 (Cold Drinks)
('hs_dr_01', 'haoshiguoshao', 'cat_hs_drinks', '紅茶 (杯)',     20, '古早味清涼解渴紅茶', NULL, 0, 1),
('hs_dr_02', 'haoshiguoshao', 'cat_hs_drinks', '冬瓜茶 (杯)',   20, '台灣傳統古法熬煮甘醇冬瓜茶', NULL, 0, 2),
('hs_dr_03', 'haoshiguoshao', 'cat_hs_drinks', '檸檬紅茶 (杯)', 35, '清香檸檬微酸酸甜解膩紅茶', NULL, 0, 3),
('hs_dr_04', 'haoshiguoshao', 'cat_hs_drinks', '檸檬冬瓜 (杯)', 35, '甘甜冬瓜搭配檸檬微酸清涼暢快', NULL, 0, 4),
('hs_dr_05', 'haoshiguoshao', 'cat_hs_drinks', '奶茶 (杯)',     30, '醇厚濃郁香甜滑順經典奶茶', NULL, 0, 5),
('hs_dr_06', 'haoshiguoshao', 'cat_hs_drinks', '冬瓜鮮奶 (杯)', 30, '古早味冬瓜茶佐香純濃郁鮮奶', NULL, 0, 6),
('hs_dr_07', 'haoshiguoshao', 'cat_hs_drinks', '紅茶 (瓶)',     40, '大容量瓶裝古早味清涼紅茶', '大瓶暢飲', 0, 7),
('hs_dr_08', 'haoshiguoshao', 'cat_hs_drinks', '奶茶 (瓶)',     50, '大容量瓶裝濃郁滑順香甜奶茶', '大瓶暢飲', 0, 8),
('hs_dr_09', 'haoshiguoshao', 'cat_hs_drinks', '檸檬紅茶 (瓶)', 55, '大容量瓶裝酸甜檸檬清爽紅茶', '大瓶暢飲', 0, 9),
('hs_dr_10', 'haoshiguoshao', 'cat_hs_drinks', '檸檬冬瓜 (瓶)', 55, '大容量瓶裝甘醇冬瓜佐清新檸檬', '大瓶暢飲', 0, 10),
('hs_dr_11', 'haoshiguoshao', 'cat_hs_drinks', '冬瓜鮮奶 (瓶)', 60, '大容量瓶裝香醇冬瓜鮮奶', '大瓶暢飲', 0, 11),

-- 4.5 點心炸物 (Snacks & Fried Foods)
('hs_sn_01', 'haoshiguoshao', 'cat_hs_snacks', '脆薯',       50, '金黃酥脆現炸美式脆薯', NULL, 0, 1),
('hs_sn_02', 'haoshiguoshao', 'cat_hs_snacks', '小雞塊',     40, '外酥內嫩金黃香脆小雞塊', NULL, 0, 2),
('hs_sn_03', 'haoshiguoshao', 'cat_hs_snacks', '小肉豆',     30, '南台灣早餐宵夜超人氣必點小肉豆', '南部特色', 1, 3),
('hs_sn_04', 'haoshiguoshao', 'cat_hs_snacks', '香脆菜頭粿', 40, '外皮煎至微焦香脆的經典台式蘿蔔糕', NULL, 0, 4),
('hs_sn_05', 'haoshiguoshao', 'cat_hs_snacks', '炸巧克力卷', 40, '香脆酥脆外皮包覆爆漿香濃巧克力', '甜點必點', 0, 5),
('hs_sn_06', 'haoshiguoshao', 'cat_hs_snacks', '炸黑糖小饅頭', 40, '外酥內Q軟，散發迷人黑糖香氣', NULL, 0, 6),
('hs_sn_07', 'haoshiguoshao', 'cat_hs_snacks', '銀絲卷',     40, '炸至金黃酥香銀絲卷，外酥內軟', NULL, 0, 7),
('hs_sn_08', 'haoshiguoshao', 'cat_hs_snacks', '蔥花蛋',     40, '新鮮翠綠青蔥香煎嫩蛋', NULL, 0, 8),
('hs_sn_09', 'haoshiguoshao', 'cat_hs_snacks', '麻油煎蛋',   40, '濃郁純麻油香煎，補氣溫潤溫暖', NULL, 0, 9),
('hs_sn_10', 'haoshiguoshao', 'cat_hs_snacks', '打拋豬煎蛋', 50, '香氣濃郁微辣泰式打拋豬肉融入煎蛋', '獨家推薦', 1, 10),
('hs_sn_11', 'haoshiguoshao', 'cat_hs_snacks', '炸珍珠餃',   45, '金黃酥脆一口剛好，鮮美多汁珍珠餃', NULL, 0, 11),
('hs_sn_12', 'haoshiguoshao', 'cat_hs_snacks', '蔥油餅',     40, '外酥內層次豐富的手工香脆蔥油餅', NULL, 0, 12),
('hs_sn_13', 'haoshiguoshao', 'cat_hs_snacks', '蔥肉餅',     50, '香酥厚實餅皮包覆滿滿蔥肉鮮美內餡', '人氣點心', 1, 13),

-- 4.6 麵體選擇 (Noodle Types - Modifiers for 鍋燒麵)
('hs_mod_nd_01', 'haoshiguoshao', 'mod_hs_noodle_type', '意麵', 0, '台南傳統經典油炸意麵，吸飽高湯最美味', '經典首選', 1, 1),
('hs_mod_nd_02', 'haoshiguoshao', 'mod_hs_noodle_type', '冬粉', 0, '滑順Q彈細冬粉，輕盈爽口', NULL, 0, 2),
('hs_mod_nd_03', 'haoshiguoshao', 'mod_hs_noodle_type', '烏龍', 0, '厚實Q彈有嚼勁烏龍麵', NULL, 0, 3),
('hs_mod_nd_04', 'haoshiguoshao', 'mod_hs_noodle_type', '泡飯', 0, '香熱米飯與高湯的傳統湯泡飯吃法', NULL, 0, 4),
('hs_mod_nd_05', 'haoshiguoshao', 'mod_hs_noodle_type', '油麵', 0, '傳統滑順黃油麵', NULL, 0, 5),

-- 4.7 鍋燒加料加價購 (Add-ons for 鍋燒麵)
('hs_mod_ad_01', 'haoshiguoshao', 'mod_hs_guoshao_addons', '加麻辣', 10, '高湯升級香麻微辣風味', NULL, 0, 1),
('hs_mod_ad_02', 'haoshiguoshao', 'mod_hs_guoshao_addons', '加肉',   40, '鮮美嫩肉加倍，大口滿足', NULL, 0, 2),
('hs_mod_ad_03', 'haoshiguoshao', 'mod_hs_guoshao_addons', '加好蝦', 40, '鮮甜好蝦增量加料', NULL, 0, 3),
('hs_mod_ad_04', 'haoshiguoshao', 'mod_hs_guoshao_addons', '加麵',   20, '份量加大，飽足加倍', NULL, 0, 4),
('hs_mod_ad_05', 'haoshiguoshao', 'mod_hs_guoshao_addons', '火鍋料', 30, '精選澎湃火鍋配料組合', NULL, 0, 5),
('hs_mod_ad_06', 'haoshiguoshao', 'mod_hs_guoshao_addons', '起士',   15, '濃郁香濃起司一片', NULL, 0, 6)
ON CONFLICT(id) DO UPDATE SET
    tenant_id = excluded.tenant_id,
    category_id = excluded.category_id,
    name = excluded.name,
    price = excluded.price,
    description = excluded.description,
    badge_text = excluded.badge_text,
    is_recommended = excluded.is_recommended,
    sort_order = excluded.sort_order;
