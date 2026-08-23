-- Migration: 0029_add_category_customization.sql
-- Thêm cột allow_customization vào bảng menu_categories (mặc định là 1: Bật tùy chỉnh)
ALTER TABLE menu_categories ADD COLUMN allow_customization INTEGER DEFAULT 1;

-- Cập nhật mặc định cho danh mục drinks (đồ uống) là 0 (Tắt tùy chỉnh)
UPDATE menu_categories SET allow_customization = 0 WHERE slug = 'drinks';
