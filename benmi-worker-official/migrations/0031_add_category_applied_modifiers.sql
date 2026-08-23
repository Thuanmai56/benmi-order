-- Migration: 0031_add_category_applied_modifiers.sql
-- Description: Add applied_modifiers column to menu_categories to allow picking specific modifier groups per category

ALTER TABLE menu_categories ADD COLUMN applied_modifiers TEXT DEFAULT NULL;

-- Default for existing categories:
-- drinks: no modifiers '[]'
-- side_dishes / 小料單賣: no modifiers '[]'
UPDATE menu_categories SET applied_modifiers = '[]' WHERE slug = 'drinks' OR slug LIKE '%mt46veog%' OR name LIKE '%小料%';
