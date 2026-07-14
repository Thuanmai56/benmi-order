-- Seed Tenant
INSERT INTO tenants (id, name) VALUES ('benmi', 'Benmi Order');

-- Seed Categories
INSERT INTO menu_categories (id, tenant_id, name, slug, sort_order) VALUES ('cat_small', 'benmi', 'Kích thước Nhỏ', 'small', 1);
INSERT INTO menu_categories (id, tenant_id, name, slug, sort_order) VALUES ('cat_large', 'benmi', 'Kích thước Lớn', 'large', 2);
INSERT INTO menu_categories (id, tenant_id, name, slug, sort_order) VALUES ('cat_combo', 'benmi', 'Set Combo', 'combo', 3);
INSERT INTO menu_categories (id, tenant_id, name, slug, sort_order) VALUES ('cat_drinks', 'benmi', 'Đồ uống', 'drinks', 4);
INSERT INTO menu_categories (id, tenant_id, name, slug, sort_order) VALUES ('cat_topping', 'benmi', 'Topping thêm', 'topping', 5);

-- Seed Menu Items (small size)
INSERT INTO menu_items (id, tenant_id, category_id, name, price, sort_order) VALUES ('s1', 'benmi', 'cat_small', '燒肉', 56, 1);
INSERT INTO menu_items (id, tenant_id, category_id, name, price, sort_order) VALUES ('s2', 'benmi', 'cat_small', '火腿', 56, 2);
INSERT INTO menu_items (id, tenant_id, category_id, name, price, sort_order) VALUES ('s3', 'benmi', 'cat_small', '雞肉', 68, 3);
INSERT INTO menu_items (id, tenant_id, category_id, name, price, sort_order) VALUES ('s4', 'benmi', 'cat_small', '烤肉', 72, 4);
INSERT INTO menu_items (id, tenant_id, category_id, name, price, sort_order) VALUES ('s5', 'benmi', 'cat_small', '雙層烤肉', 78, 5);
INSERT INTO menu_items (id, tenant_id, category_id, name, price, sort_order) VALUES ('s6', 'benmi', 'cat_small', '綜合', 79, 6);

-- Seed Menu Items (large size)
INSERT INTO menu_items (id, tenant_id, category_id, name, price, sort_order) VALUES ('l1', 'benmi', 'cat_large', '燒肉', 80, 1);
INSERT INTO menu_items (id, tenant_id, category_id, name, price, sort_order) VALUES ('l2', 'benmi', 'cat_large', '火腿', 80, 2);
INSERT INTO menu_items (id, tenant_id, category_id, name, price, sort_order) VALUES ('l3', 'benmi', 'cat_large', '雞肉', 100, 3);
INSERT INTO menu_items (id, tenant_id, category_id, name, price, sort_order) VALUES ('l4', 'benmi', 'cat_large', '烤肉', 105, 4);
INSERT INTO menu_items (id, tenant_id, category_id, name, price, sort_order) VALUES ('l5', 'benmi', 'cat_large', '雙層烤肉', 115, 5);
INSERT INTO menu_items (id, tenant_id, category_id, name, price, sort_order) VALUES ('l6', 'benmi', 'cat_large', '綜合', 130, 6);

-- Seed Menu Items (combo)
INSERT INTO menu_items (id, tenant_id, category_id, name, price, sort_order) VALUES ('c1', 'benmi', 'cat_combo', '1 大燒肉+飲料', 90, 1);
INSERT INTO menu_items (id, tenant_id, category_id, name, price, sort_order) VALUES ('c2', 'benmi', 'cat_combo', '2 大火腿+飲料', 90, 2);
INSERT INTO menu_items (id, tenant_id, category_id, name, price, sort_order) VALUES ('c3', 'benmi', 'cat_combo', '3 大雞肉+飲料', 118, 3);
INSERT INTO menu_items (id, tenant_id, category_id, name, price, sort_order) VALUES ('c4', 'benmi', 'cat_combo', '4 大烤肉+飲料', 128, 4);
INSERT INTO menu_items (id, tenant_id, category_id, name, price, sort_order) VALUES ('c5', 'benmi', 'cat_combo', '5 大雙層烤肉+飲料', 135, 5);
INSERT INTO menu_items (id, tenant_id, category_id, name, price, sort_order) VALUES ('c6', 'benmi', 'cat_combo', '6 大綜合+飲料', 142, 6);
INSERT INTO menu_items (id, tenant_id, category_id, name, price, sort_order) VALUES ('c7', 'benmi', 'cat_combo', '7 小燒肉+飲料', 77, 7);
INSERT INTO menu_items (id, tenant_id, category_id, name, price, sort_order) VALUES ('c8', 'benmi', 'cat_combo', '8 小雞肉+飲料', 88, 8);
INSERT INTO menu_items (id, tenant_id, category_id, name, price, sort_order) VALUES ('c9', 'benmi', 'cat_combo', '9 小烤肉+飲料', 95, 9);
INSERT INTO menu_items (id, tenant_id, category_id, name, price, sort_order) VALUES ('c10', 'benmi', 'cat_combo', '10 小雙層烤肉+飲料', 99, 10);
INSERT INTO menu_items (id, tenant_id, category_id, name, price, sort_order) VALUES ('c11', 'benmi', 'cat_combo', '11 小綜合+飲料', 100, 11);

-- Seed Menu Items (drinks)
INSERT INTO menu_items (id, tenant_id, category_id, name, price, sort_order) VALUES ('d1', 'benmi', 'cat_drinks', '越南咖啡', 48, 1);
INSERT INTO menu_items (id, tenant_id, category_id, name, price, sort_order) VALUES ('d2', 'benmi', 'cat_drinks', '豆漿', 37, 2);
INSERT INTO menu_items (id, tenant_id, category_id, name, price, sort_order) VALUES ('d3', 'benmi', 'cat_drinks', '紅茶', 37, 3);
INSERT INTO menu_items (id, tenant_id, category_id, name, price, sort_order) VALUES ('d4', 'benmi', 'cat_drinks', '可樂', 37, 4);
INSERT INTO menu_items (id, tenant_id, category_id, name, price, sort_order) VALUES ('d5', 'benmi', 'cat_drinks', '雪碧', 37, 5);

-- Seed Menu Items (topping)
INSERT INTO menu_items (id, tenant_id, category_id, name, price, sort_order) VALUES ('t1', 'benmi', 'cat_topping', '起司', 15, 1);
INSERT INTO menu_items (id, tenant_id, category_id, name, price, sort_order) VALUES ('t2', 'benmi', 'cat_topping', '火腿', 20, 2);
INSERT INTO menu_items (id, tenant_id, category_id, name, price, sort_order) VALUES ('t3', 'benmi', 'cat_topping', '燒肉', 20, 3);
INSERT INTO menu_items (id, tenant_id, category_id, name, price, sort_order) VALUES ('t4', 'benmi', 'cat_topping', '烤肉', 25, 4);
INSERT INTO menu_items (id, tenant_id, category_id, name, price, sort_order) VALUES ('t5', 'benmi', 'cat_topping', '雞肉', 25, 5);
