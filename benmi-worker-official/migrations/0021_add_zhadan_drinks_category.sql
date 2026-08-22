-- Migration: 0021_add_zhadan_drinks_category.sql
-- Description: Add '豆漿 意仁漿' category for tenant zhadantongxue

INSERT INTO menu_categories (id, tenant_id, name, slug, category_type, sort_order)
VALUES ('cat_zd_drinks', 'zhadantongxue', '豆漿 意仁漿', 'drinks', 'catalog', 6)
ON CONFLICT(id) DO UPDATE SET 
    name = excluded.name, 
    sort_order = excluded.sort_order,
    category_type = excluded.category_type;
