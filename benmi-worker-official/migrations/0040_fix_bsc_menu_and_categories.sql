-- Migration: 0040_fix_bsc_menu_and_categories.sql
-- Description: Clean up BSC categories, remove separate topping catalog category, update semantic slugs and add short_name for navbar tabs

-- 1. Add short_name column to menu_categories if it doesn't exist
ALTER TABLE menu_categories ADD COLUMN short_name TEXT;

-- 2. Insert / Update new BSC Categories first (so foreign keys are satisfied)
INSERT INTO menu_categories (id, tenant_id, name, short_name, slug, sort_order, category_type, allow_customization, applied_modifiers)
VALUES
    ('bsc_cat_meat', 'bsc', '🍗 肉類', '🍗 肉類', 'meat', 1, 'catalog', 1, '[]'),
    ('bsc_cat_side50', 'bsc', '⭐ 精選小菜 $50/份', '小菜$50', 'side50', 2, 'catalog', 1, '[]'),
    ('bsc_cat_side30', 'bsc', '🥘 特色小菜 $30/份', '小菜$30', 'side30', 3, 'catalog', 1, '[]'),
    ('bsc_cat_side25', 'bsc', '🥗 經典小菜 $25/份', '小菜$25', 'side25', 4, 'catalog', 0, '[]'),
    ('bsc_veggie', 'bsc', '🥦 蔬菜/配菜 1份$35 / 3份$100', '蔬菜/配菜', 'veggie', 5, 'catalog', 1, '[]')
ON CONFLICT(id) DO UPDATE SET
    name = excluded.name,
    short_name = excluded.short_name,
    slug = excluded.slug,
    sort_order = excluded.sort_order,
    category_type = excluded.category_type,
    allow_customization = excluded.allow_customization;

-- 3. Update existing BSC items to point to new category IDs
UPDATE menu_items SET category_id = 'bsc_cat_meat' WHERE tenant_id = 'bsc' AND category_id = 'bsc_cat_large';
UPDATE menu_items SET category_id = 'bsc_cat_side50' WHERE tenant_id = 'bsc' AND category_id = 'bsc_cat_small';
UPDATE menu_items SET category_id = 'bsc_cat_side30' WHERE tenant_id = 'bsc' AND category_id = 'bsc_cat_combo';
UPDATE menu_items SET category_id = 'bsc_cat_side25' WHERE tenant_id = 'bsc' AND category_id = 'bsc_cat_drinks';

-- 4. Delete topping items from menu_items FIRST (to satisfy foreign keys)
DELETE FROM menu_items WHERE tenant_id = 'bsc' AND (category_id = 'bsc_cat_topping' OR id LIKE 'bsc_topping_%');

-- 5. Delete obsolete category rows (now safe because no items reference them)
DELETE FROM menu_categories WHERE tenant_id = 'bsc' AND id IN ('bsc_cat_large', 'bsc_cat_small', 'bsc_cat_combo', 'bsc_cat_drinks', 'bsc_flavor_section', 'bsc_cat_topping');

-- 6. Ensure BSC customizations has 加價配料 as a sub-group under 口味與客製化
INSERT INTO menu_customizations (id, tenant_id, key, title, type, sort_order, options_json)
VALUES
    ('bsc_flavor', 'bsc', 'flavor', '✦ 口味選擇', 'radio', 0, '[{"name":"特調胡椒"},{"name":"泰式酸辣"},{"name":"清爽檸檬","sub_options":["不加香油","不加鹽巴"]},{"name":"檸檬香菜（ 香菜缺貨中，請選檸檬口味）","sub_options":["不加香油","不加鹽巴"]},{"name":"原味客製","sub_options":["不加香油","不加胡椒","不加胡椒加鹽巴"]}]'),
    ('bsc_salt', 'bsc', 'salt', '✦ 鹹度調整', 'radio', 1, '[{"name":"正常"},{"name":"調味重"},{"name":"調味清淡"}]'),
    ('bsc_spicy', 'bsc', 'spicy', '✦ 辣度選擇 (朝天椒)', 'radio', 2, '[{"name":"不辣"},{"name":"微辣"},{"name":"小辣"},{"name":"中辣"},{"name":"大辣"},{"name":"辣椒放餐盒角落"}]'),
    ('bsc_ingredients', 'bsc', 'ingredients', '✦ 配料調整', 'checkbox', 3, '[{"name":"不加蔥花"},{"name":"不加蒜頭"},{"name":"不加洋蔥"}]'),
    ('bsc_addons', 'bsc', 'addons', '✦ 加價配料', 'checkbox', 4, '[{"name":"加香菜","price":15},{"name":"加檸檬汁","price":20}]')
ON CONFLICT(id) DO UPDATE SET
    title = excluded.title,
    type = excluded.type,
    sort_order = excluded.sort_order,
    options_json = excluded.options_json;
