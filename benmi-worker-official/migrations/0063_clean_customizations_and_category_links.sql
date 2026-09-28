-- Migration: 0063_clean_customizations_and_category_links.sql
-- Description: Clean phantom sec-flavor from menu_categories and add category_modifier_links for category-level customizations

-- 1. Create category_modifier_links table for Category-Level soft inheritance (Level 3 Customise)
CREATE TABLE IF NOT EXISTS category_modifier_links (
    tenant_id TEXT NOT NULL,
    category_id TEXT NOT NULL REFERENCES menu_categories(id) ON DELETE CASCADE,
    group_id TEXT NOT NULL REFERENCES modifier_groups(id) ON DELETE CASCADE,
    sort_order INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (tenant_id, category_id, group_id)
);
CREATE INDEX IF NOT EXISTS idx_cat_mod_links ON category_modifier_links(tenant_id, category_id);

-- 2. Add scope column to modifier_groups (order | category | item)
ALTER TABLE modifier_groups ADD COLUMN scope TEXT DEFAULT 'item';

-- 3. Clean phantom sec-flavor / order_customization records from menu_categories
DELETE FROM menu_categories WHERE slug = 'sec-flavor' OR category_type = 'order_customization';
