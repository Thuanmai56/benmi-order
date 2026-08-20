-- Migration: 0013_merge_zhadan_snack_into_main.sql
-- Description: Move Thai shrimp pancake item into main category (招牌炸蛋蔥餅) and remove 點心小吃 category for zhadantongxue

-- 1. Chuyển món 泰式月亮蝦餅 (6片) sang danh mục cat_zd_main
UPDATE menu_items 
SET category_id = 'cat_zd_main', sort_order = 10 
WHERE id = 'zd_item_10' OR (tenant_id = 'zhadantongxue' AND name LIKE '%泰式月亮蝦餅%');

-- 2. Xóa danh mục 點心小吃 (cat_zd_snack)
DELETE FROM menu_categories 
WHERE id = 'cat_zd_snack' AND tenant_id = 'zhadantongxue';
