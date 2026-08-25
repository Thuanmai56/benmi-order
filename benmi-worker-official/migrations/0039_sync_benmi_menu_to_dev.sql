-- Migration: 0039_sync_benmi_menu_to_dev.sql
-- Description: Ensure benmi tenant categories and menu items are properly populated across all environments

-- 1. Ensure Tenant Record
INSERT INTO tenants (id, name)
VALUES ('benmi', 'Benmi Order')
ON CONFLICT(id) DO UPDATE SET name = excluded.name;

-- 2. Seed Categories
INSERT INTO menu_categories (id, tenant_id, name, slug, sort_order, category_type, selection_type, is_required, min_selection, max_selection, allow_customization, applied_modifiers)
VALUES
    ('cat_large', 'benmi', '🍔 大麵包', 'large', 1, 'catalog', 'single', 0, 0, 1, 1, NULL),
    ('cat_small', 'benmi', '🥖 小麵包', 'small', 2, 'catalog', 'single', 0, 0, 1, 1, NULL),
    ('cat_combo', 'benmi', '🎁 特惠套餐 (含飲料)', 'combo', 3, 'catalog', 'single', 0, 0, 1, 1, NULL),
    ('cat_drinks', 'benmi', '🥤 單點飲料', 'drinks', 4, 'catalog', 'single', 0, 0, 1, 0, '[]'),
    ('cat_topping', 'benmi', '加料選項', 'topping', 5, 'modifier', 'single', 0, 0, 1, 1, NULL)
ON CONFLICT(id) DO UPDATE SET
    tenant_id = excluded.tenant_id,
    name = excluded.name,
    slug = excluded.slug,
    sort_order = excluded.sort_order,
    category_type = excluded.category_type,
    allow_customization = excluded.allow_customization,
    applied_modifiers = excluded.applied_modifiers;

-- 3. Seed Menu Items
INSERT INTO menu_items (id, tenant_id, category_id, name, price, description, badge_text, is_recommended, sort_order)
VALUES
    -- Small
    ('s1', 'benmi', 'cat_small', '燒肉', 56, NULL, NULL, 0, 1),
    ('s2', 'benmi', 'cat_small', '火腿', 56, NULL, NULL, 0, 2),
    ('s3', 'benmi', 'cat_small', '雞肉', 68, NULL, NULL, 0, 3),
    ('s4', 'benmi', 'cat_small', '烤肉', 72, NULL, NULL, 0, 4),
    ('s5', 'benmi', 'cat_small', '雙層烤肉', 78, NULL, '👍 推薦', 1, 5),
    ('s6', 'benmi', 'cat_small', '綜合', 79, NULL, '👍 推薦', 1, 6),
    -- Large
    ('l1', 'benmi', 'cat_large', '燒肉', 80, NULL, NULL, 0, 6),
    ('l2', 'benmi', 'cat_large', '火腿', 80, NULL, NULL, 0, 7),
    ('l3', 'benmi', 'cat_large', '雙層烤肉', 115, NULL, '👍 推薦', 1, 3),
    ('l4', 'benmi', 'cat_large', '綜合', 130, NULL, '👍 推薦', 1, 4),
    ('l5', 'benmi', 'cat_large', '雞肉', 100, NULL, NULL, 0, 5),
    ('l6', 'benmi', 'cat_large', '烤肉', 105, NULL, NULL, 0, 2),
    -- Combo
    ('c1', 'benmi', 'cat_combo', '1 大燒肉+飲料', 90, NULL, NULL, 0, 1),
    ('c2', 'benmi', 'cat_combo', '2 大火腿+飲料', 90, NULL, NULL, 0, 2),
    ('c3', 'benmi', 'cat_combo', '3 大雞肉+飲料', 118, NULL, NULL, 0, 3),
    ('c4', 'benmi', 'cat_combo', '4 大烤肉+飲料', 128, NULL, NULL, 0, 4),
    ('c5', 'benmi', 'cat_combo', '5 大雙層烤肉+飲料', 135, NULL, '👍 推薦', 1, 5),
    ('c6', 'benmi', 'cat_combo', '6 大綜合+飲料', 142, NULL, '👍 推薦', 1, 6),
    ('c7', 'benmi', 'cat_combo', '7 小燒肉+飲料', 77, NULL, NULL, 0, 7),
    ('c8', 'benmi', 'cat_combo', '8 小雞肉+飲料', 88, NULL, NULL, 0, 8),
    ('c9', 'benmi', 'cat_combo', '9 小烤肉+飲料', 95, NULL, NULL, 0, 9),
    ('c10', 'benmi', 'cat_combo', '10 小雙層烤肉+飲料', 99, NULL, NULL, 0, 10),
    ('c11', 'benmi', 'cat_combo', '11 小綜合+飲料', 100, NULL, NULL, 0, 11),
    ('c12', 'benmi', 'cat_combo', '假日滿足套餐', 100, NULL, NULL, 0, 12),
    -- Drinks
    ('d1', 'benmi', 'cat_drinks', '越南咖啡', 48, NULL, NULL, 0, 1),
    ('d2', 'benmi', 'cat_drinks', '豆漿', 37, NULL, NULL, 0, 2),
    ('d3', 'benmi', 'cat_drinks', '紅茶', 37, NULL, NULL, 0, 3),
    ('d4', 'benmi', 'cat_drinks', '可樂', 37, NULL, NULL, 0, 4),
    ('d5', 'benmi', 'cat_drinks', '雪碧', 37, NULL, NULL, 0, 5),
    -- Toppings
    ('benmi_topping_菜', 'benmi', 'cat_topping', '菜', 15, NULL, NULL, 0, 1),
    ('t1', 'benmi', 'cat_topping', '起司', 15, NULL, NULL, 0, 2),
    ('t2', 'benmi', 'cat_topping', '火腿', 20, NULL, NULL, 0, 3),
    ('t3', 'benmi', 'cat_topping', '燒肉', 20, NULL, NULL, 0, 4),
    ('t4', 'benmi', 'cat_topping', '烤肉', 25, NULL, NULL, 0, 5),
    ('t5', 'benmi', 'cat_topping', '雞肉', 25, NULL, NULL, 0, 6)
ON CONFLICT(id) DO UPDATE SET
    tenant_id = excluded.tenant_id,
    category_id = excluded.category_id,
    name = excluded.name,
    price = excluded.price,
    badge_text = excluded.badge_text,
    is_recommended = excluded.is_recommended,
    sort_order = excluded.sort_order;
