-- Migration: 0017_fix_zhadan_category_names.sql
-- Description: Fix category names for zhadantongxue to pure Traditional Chinese

UPDATE menu_categories 
SET name = '招牌炸蛋蔥餅' 
WHERE tenant_id = 'zhadantongxue' AND (slug = 'main' OR id = 'cat_zd_main');

UPDATE menu_categories 
SET name = '加辣選項' 
WHERE tenant_id = 'zhadantongxue' AND (slug = 'spicy' OR id = 'cat_zd_spicy');

UPDATE menu_categories 
SET name = '雞蛋選項' 
WHERE tenant_id = 'zhadantongxue' AND (slug = 'egg' OR id = 'cat_zd_egg');

UPDATE menu_categories 
SET name = '生菜選項' 
WHERE tenant_id = 'zhadantongxue' AND (slug = 'lettuce' OR id = 'cat_zd_lettuce');

UPDATE menu_categories 
SET name = '加料選項' 
WHERE tenant_id = 'zhadantongxue' AND (slug = 'topping' OR id = 'cat_zd_topping');
