-- Migration: Seed Initial Menu Data
-- Author: Antigravity Agent
-- Date: 2026-07-12

-- 1. Seed Tenant mặc định
INSERT INTO tenants (id, name) VALUES ('thuanmai56', 'Benmi Bánh Mì Thừa Mai')
ON CONFLICT(id) DO UPDATE SET name = excluded.name;

-- 2. Seed Danh mục mặc định
INSERT INTO menu_categories (id, tenant_id, name, slug, sort_order) VALUES
('cat_small', 'thuanmai56', 'Kích thước Nhỏ', 'small', 1),
('cat_large', 'thuanmai56', 'Kích thước Lớn', 'large', 2),
('cat_combo', 'thuanmai56', 'Combo kèm Nước', 'combo', 3),
('cat_drinks', 'thuanmai56', 'Đồ uống', 'drinks', 4),
('cat_topping', 'thuanmai56', 'Topping thêm', 'topping', 5)
ON CONFLICT(tenant_id, slug) DO UPDATE SET name = excluded.name, sort_order = excluded.sort_order;

-- 3. Seed các Món ăn của danh mục Small
INSERT INTO menu_items (id, tenant_id, category_id, name, price, sort_order) VALUES
('mi_small_shaorou', 'thuanmai56', 'cat_small', '燒肉', 56.0, 1),
('mi_small_huotui', 'thuanmai56', 'cat_small', '火腿', 56.0, 2),
('mi_small_jirou', 'thuanmai56', 'cat_small', '雞肉', 68.0, 3),
('mi_small_kaorou', 'thuanmai56', 'cat_small', '烤肉', 72.0, 4),
('mi_small_shuangceng', 'thuanmai56', 'cat_small', '雙層烤肉', 78.0, 5),
('mi_small_zonghe', 'thuanmai56', 'cat_small', '綜合', 79.0, 6)
ON CONFLICT(id) DO UPDATE SET price = excluded.price, sort_order = excluded.sort_order;

-- 4. Seed các Món ăn của danh mục Large
INSERT INTO menu_items (id, tenant_id, category_id, name, price, sort_order) VALUES
('mi_large_shaorou', 'thuanmai56', 'cat_large', '燒肉', 80.0, 1),
('mi_large_huotui', 'thuanmai56', 'cat_large', '火腿', 80.0, 2),
('mi_large_jirou', 'thuanmai56', 'cat_large', '雞肉', 100.0, 3),
('mi_large_kaorou', 'thuanmai56', 'cat_large', '烤肉', 105.0, 4),
('mi_large_shuangceng', 'thuanmai56', 'cat_large', '雙層烤肉', 115.0, 5),
('mi_large_zonghe', 'thuanmai56', 'cat_large', '綜合', 130.0, 6)
ON CONFLICT(id) DO UPDATE SET price = excluded.price, sort_order = excluded.sort_order;

-- 5. Seed các Món ăn của danh mục Combo
INSERT INTO menu_items (id, tenant_id, category_id, name, price, sort_order) VALUES
('mi_combo_1', 'thuanmai56', 'cat_combo', '1 大燒肉+飲料', 90.0, 1),
('mi_combo_2', 'thuanmai56', 'cat_combo', '2 大火腿+飲料', 90.0, 2),
('mi_combo_3', 'thuanmai56', 'cat_combo', '3 大雞肉+飲料', 118.0, 3),
('mi_combo_4', 'thuanmai56', 'cat_combo', '4 大烤肉+飲料', 128.0, 4),
('mi_combo_5', 'thuanmai56', 'cat_combo', '5 大雙層烤肉+飲料', 135.0, 5),
('mi_combo_6', 'thuanmai56', 'cat_combo', '6 大綜合+飲料', 142.0, 6),
('mi_combo_7', 'thuanmai56', 'cat_combo', '7 小燒肉+飲料', 77.0, 7),
('mi_combo_8', 'thuanmai56', 'cat_combo', '8 小雞肉+飲料', 88.0, 8),
('mi_combo_9', 'thuanmai56', 'cat_combo', '9 小烤肉+飲料', 95.0, 9),
('mi_combo_10', 'thuanmai56', 'cat_combo', '10 小雙層烤肉+飲料', 99.0, 10),
('mi_combo_11', 'thuanmai56', 'cat_combo', '11 小綜合+飲料', 100.0, 11)
ON CONFLICT(id) DO UPDATE SET price = excluded.price, sort_order = excluded.sort_order;

-- 6. Seed các Món ăn của danh mục Drinks
INSERT INTO menu_items (id, tenant_id, category_id, name, price, sort_order) VALUES
('mi_drink_coffee', 'thuanmai56', 'cat_drinks', '越南咖啡', 48.0, 1),
('mi_drink_doujiang', 'thuanmai56', 'cat_drinks', '豆漿', 37.0, 2),
('mi_drink_hongcha', 'thuanmai56', 'cat_drinks', '紅茶', 37.0, 3),
('mi_drink_kele', 'thuanmai56', 'cat_drinks', '可樂', 37.0, 4),
('mi_drink_xuebi', 'thuanmai56', 'cat_drinks', '雪碧', 37.0, 5)
ON CONFLICT(id) DO UPDATE SET price = excluded.price, sort_order = excluded.sort_order;

-- 7. Seed các Món ăn của danh mục Toppings
INSERT INTO menu_items (id, tenant_id, category_id, name, price, sort_order) VALUES
('mi_topping_qisi', 'thuanmai56', 'cat_topping', '起司', 15.0, 1),
('mi_topping_huotui', 'thuanmai56', 'cat_topping', '火腿', 20.0, 2),
('mi_topping_shaorou', 'thuanmai56', 'cat_topping', '燒肉', 20.0, 3),
('mi_topping_kaorou', 'thuanmai56', 'cat_topping', '烤肉', 25.0, 4),
('mi_topping_jirou', 'thuanmai56', 'cat_topping', '雞肉', 25.0, 5)
ON CONFLICT(id) DO UPDATE SET price = excluded.price, sort_order = excluded.sort_order;
