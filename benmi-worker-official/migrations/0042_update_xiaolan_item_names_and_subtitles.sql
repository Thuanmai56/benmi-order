-- Migration: 0042_update_xiaolan_item_names_and_subtitles.sql
-- Description: Split Chinese dish names and Vietnamese subtitles into name & description columns for tenant xiaolan

-- 1. Update Categories Clean Names
UPDATE menu_categories
SET name = '越式麵包', short_name = '越式麵包'
WHERE id = 'cat_xx_banhmi' AND tenant_id = 'xiaolan';

UPDATE menu_categories
SET name = '涼拌 / 粉捲', short_name = '涼拌/粉捲'
WHERE id = 'cat_xx_noodle' AND tenant_id = 'xiaolan';

UPDATE menu_categories
SET name = '飲料', short_name = '飲料'
WHERE id = 'cat_xx_drink' AND tenant_id = 'xiaolan';

UPDATE menu_categories
SET name = '辣度選擇', short_name = '辣度'
WHERE id = 'cat_xx_spicy' AND tenant_id = 'xiaolan';

UPDATE menu_categories
SET name = '客製選項 (不加配料)', short_name = '客製選項'
WHERE id = 'cat_xx_custom' AND tenant_id = 'xiaolan';

UPDATE menu_categories
SET name = '加料選項', short_name = '加料'
WHERE id = 'cat_xx_topping' AND tenant_id = 'xiaolan';

-- 2. Update Bánh Mì Items
UPDATE menu_items
SET name = '越式招牌麵包', description = 'Bánh mì thịt (招牌)'
WHERE id = 'item_xx_bm_01' AND tenant_id = 'xiaolan';

UPDATE menu_items
SET name = '打拋豬麵包', description = 'Bánh mì thịt băm vị Thái'
WHERE id = 'item_xx_bm_02' AND tenant_id = 'xiaolan';

UPDATE menu_items
SET name = '荷包蛋麵包', description = 'Bánh mì trứng chả'
WHERE id = 'item_xx_bm_03' AND tenant_id = 'xiaolan';

UPDATE menu_items
SET name = '沙爹牛肉麵包', description = 'Bánh mì bò xào sa tế'
WHERE id = 'item_xx_bm_04' AND tenant_id = 'xiaolan';

UPDATE menu_items
SET name = '起司蔬菜麵包', description = 'Bánh mì rau cải phô mai'
WHERE id = 'item_xx_bm_05' AND tenant_id = 'xiaolan';

UPDATE menu_items
SET name = '起司花生醬麵包', description = 'Bánh mì bơ đậu phộng phô mai'
WHERE id = 'item_xx_bm_06' AND tenant_id = 'xiaolan';

UPDATE menu_items
SET name = '空麵包', description = 'Bánh mì không'
WHERE id = 'item_xx_bm_07' AND tenant_id = 'xiaolan';

-- 3. Update Noodles / Rolls Items
UPDATE menu_items
SET name = '涼拌米線', description = 'Bún thịt khìa'
WHERE id = 'item_xx_nd_01' AND tenant_id = 'xiaolan';

UPDATE menu_items
SET name = '涼拌粉捲粉', description = 'Bánh ướt'
WHERE id = 'item_xx_nd_02' AND tenant_id = 'xiaolan';

-- 4. Update Drinks Items
UPDATE menu_items
SET name = '越式煉乳咖啡', description = 'Cà phê sữa đá'
WHERE id = 'item_xx_dr_01' AND tenant_id = 'xiaolan';

UPDATE menu_items
SET name = '越式黑咖啡', description = 'Cà phê đen đá'
WHERE id = 'item_xx_dr_02' AND tenant_id = 'xiaolan';

UPDATE menu_items
SET name = '羅望子冰茶', description = 'Nước đá me'
WHERE id = 'item_xx_dr_03' AND tenant_id = 'xiaolan';

-- 5. Update Spicy Modifiers
UPDATE menu_items
SET name = '大辣', description = 'Cay nhiều'
WHERE id = 'opt_xx_sp_01' AND tenant_id = 'xiaolan';

UPDATE menu_items
SET name = '中辣', description = 'Cay vừa'
WHERE id = 'opt_xx_sp_02' AND tenant_id = 'xiaolan';

UPDATE menu_items
SET name = '小辣', description = 'Cay ít'
WHERE id = 'opt_xx_sp_03' AND tenant_id = 'xiaolan';

UPDATE menu_items
SET name = '微辣辣椒醬', description = 'Tương ớt'
WHERE id = 'opt_xx_sp_04' AND tenant_id = 'xiaolan';

UPDATE menu_items
SET name = '不辣', description = 'Không cay'
WHERE id = 'opt_xx_sp_05' AND tenant_id = 'xiaolan';

-- 6. Update Customization Modifiers
UPDATE menu_items
SET name = '不加香菜', description = 'Không ngò'
WHERE id = 'opt_xx_cs_01' AND tenant_id = 'xiaolan';

UPDATE menu_items
SET name = '不加豬肝醬', description = 'Không patê'
WHERE id = 'opt_xx_cs_02' AND tenant_id = 'xiaolan';

UPDATE menu_items
SET name = '不加奶油', description = 'Không bơ'
WHERE id = 'opt_xx_cs_03' AND tenant_id = 'xiaolan';

UPDATE menu_items
SET name = '不加泡菜', description = 'Không dưa chua'
WHERE id = 'opt_xx_cs_04' AND tenant_id = 'xiaolan';

UPDATE menu_items
SET name = '不加小黃瓜', description = 'Không dưa leo'
WHERE id = 'opt_xx_cs_05' AND tenant_id = 'xiaolan';

-- 7. Update Topping Modifiers
UPDATE menu_items
SET name = '加蛋', description = 'Thêm trứng'
WHERE id = 'opt_xx_tp_01' AND tenant_id = 'xiaolan';
