-- Migration: 0016_add_badge_and_recommended_to_menu_items.sql
-- Description: Add badge_text and is_recommended columns to menu_items table, and populate initial data

ALTER TABLE menu_items ADD COLUMN badge_text TEXT DEFAULT NULL;
ALTER TABLE menu_items ADD COLUMN is_recommended INTEGER DEFAULT 0;

-- 1. Populate Benmi recommended items
UPDATE menu_items 
SET is_recommended = 1, badge_text = '👍 推薦'
WHERE tenant_id = 'benmi' AND name IN ('雙層烤肉', '綜合', '5 大雙層烤肉+飲料', '6 大綜合+飲料');

-- 2. Populate Zhadan Tongxue specific item badges
UPDATE menu_items 
SET badge_text = '雞肉足足100g'
WHERE tenant_id = 'zhadantongxue' AND (name = '雞腿肉卷炸蛋蔥餅' OR name LIKE '%雞腿%');

UPDATE menu_items 
SET badge_text = '香腸足足15cm'
WHERE tenant_id = 'zhadantongxue' AND (name = '台灣香腸炸蛋蔥餅' OR name LIKE '%香腸%');
