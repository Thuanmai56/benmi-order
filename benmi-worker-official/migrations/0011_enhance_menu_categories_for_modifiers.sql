-- Migration: 0011_enhance_menu_categories_for_modifiers.sql
-- Description: Add classification and modifier configuration columns to menu_categories

-- 1. Bổ sung các cột phân loại danh mục và quy tắc tùy biến
ALTER TABLE menu_categories ADD COLUMN category_type TEXT DEFAULT 'catalog'; -- 'catalog' | 'modifier'
ALTER TABLE menu_categories ADD COLUMN selection_type TEXT DEFAULT 'single'; -- 'single' | 'multiple' | 'combo_drink'
ALTER TABLE menu_categories ADD COLUMN is_required INTEGER DEFAULT 0;       -- 1: Bắt buộc chọn, 0: Tùy chọn
ALTER TABLE menu_categories ADD COLUMN min_selection INTEGER DEFAULT 0;
ALTER TABLE menu_categories ADD COLUMN max_selection INTEGER DEFAULT 1;

-- 2. Cập nhật phân loại và tiêu đề hiển thị chuẩn cho Benmi
UPDATE menu_categories SET category_type = 'catalog', name = '🍔 大麵包' WHERE slug = 'large' AND tenant_id = 'benmi';
UPDATE menu_categories SET category_type = 'catalog', name = '🥖 小麵包' WHERE slug = 'small' AND tenant_id = 'benmi';
UPDATE menu_categories SET category_type = 'catalog', name = '🎁 特惠套餐 (含飲料)' WHERE slug = 'combo' AND tenant_id = 'benmi';
UPDATE menu_categories SET category_type = 'catalog', name = '🥤 單點飲料' WHERE slug = 'drinks' AND tenant_id = 'benmi';
UPDATE menu_categories SET category_type = 'modifier', name = '加料選項', selection_type = 'single', is_required = 0 WHERE slug = 'topping' AND tenant_id = 'benmi';

-- 3. Cập nhật phân loại chuẩn cho Zhadantongxue
UPDATE menu_categories SET category_type = 'catalog' WHERE slug = 'main' AND tenant_id = 'zhadantongxue';
UPDATE menu_categories SET category_type = 'modifier', selection_type = 'single', is_required = 1, min_selection = 1, max_selection = 1 WHERE slug IN ('spicy', 'egg', 'lettuce') AND tenant_id = 'zhadantongxue';
UPDATE menu_categories SET category_type = 'modifier', selection_type = 'multiple', is_required = 0, min_selection = 0, max_selection = 10 WHERE slug = 'topping' AND tenant_id = 'zhadantongxue';
