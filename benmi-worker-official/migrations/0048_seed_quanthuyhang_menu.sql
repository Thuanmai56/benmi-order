-- Migration: 0048_seed_quanthuyhang_menu.sql
-- Description: Seed tenant 'quanthuyhang' (翠姮 THUY HANG 越南小吃) configuration, categories, and menu items

-- 1. Seed Tenants
INSERT INTO tenants (id, name)
VALUES ('quanthuyhang', '翠姮 THUY HANG 越南小吃')
ON CONFLICT(id) DO UPDATE SET name = excluded.name;

-- 2. Seed Tenant Config
INSERT INTO tenant_config (
    tenant_id, brand_name, brand_color, store_address, operating_hours,
    delivery_policy, default_password, locale, allow_scheduled_pickup,
    allow_dine_in, store_status, liff_id, liff_url, order_prefix,
    features, cuisine_type, is_marketplace_visible, is_active, latitude, longitude
) VALUES (
    'quanthuyhang',
    '翠姬 THUY HANG 越南小吃',
    '#e11d48',
    '新北市中和區信義街106-1號',
    '{"0":[],"1":[{"start":"11:00","end":"23:00"}],"2":[{"start":"11:00","end":"23:00"}],"3":[{"start":"11:00","end":"23:00"}],"4":[{"start":"11:00","end":"23:00"}],"5":[{"start":"11:00","end":"23:00"}],"6":[{"start":"11:00","end":"23:00"}]}',
    '訂購專線：0986505656',
    '12345678',
    'zh-TW',
    1,
    0,
    'open',
    '2011490427-5BrvQQBz',
    'https://liff.line.me/2011490427-5BrvQQBz',
    'H',
    '[]',
    'vietnamese',
    1,
    1,
    24.98997,
    121.51073
)
ON CONFLICT(tenant_id) DO UPDATE SET
    brand_name = excluded.brand_name,
    brand_color = excluded.brand_color,
    store_address = excluded.store_address,
    operating_hours = excluded.operating_hours,
    delivery_policy = excluded.delivery_policy,
    locale = excluded.locale,
    allow_scheduled_pickup = excluded.allow_scheduled_pickup,
    allow_dine_in = excluded.allow_dine_in,
    store_status = excluded.store_status,
    liff_id = excluded.liff_id,
    liff_url = excluded.liff_url,
    order_prefix = excluded.order_prefix,
    features = excluded.features,
    cuisine_type = excluded.cuisine_type,
    is_marketplace_visible = excluded.is_marketplace_visible,
    is_active = excluded.is_active;

-- 3. Seed Menu Categories
INSERT INTO menu_categories (id, tenant_id, slug, name, category_type, selection_type, is_required, min_selection, max_selection, sort_order)
VALUES ('cat_th_soup_noodles', 'quanthuyhang', 'soup-noodles', '湯麵類 (Các món nước)', 'catalog', 'single', 0, 0, 1, 1)
ON CONFLICT(id) DO UPDATE SET name = excluded.name, sort_order = excluded.sort_order;
INSERT INTO menu_categories (id, tenant_id, slug, name, category_type, selection_type, is_required, min_selection, max_selection, sort_order)
VALUES ('cat_th_porridge', 'quanthuyhang', 'porridge', '粥品 (Cháo)', 'catalog', 'single', 0, 0, 1, 2)
ON CONFLICT(id) DO UPDATE SET name = excluded.name, sort_order = excluded.sort_order;
INSERT INTO menu_categories (id, tenant_id, slug, name, category_type, selection_type, is_required, min_selection, max_selection, sort_order)
VALUES ('cat_th_soup', 'quanthuyhang', 'soups', '湯類 (Canh)', 'catalog', 'single', 0, 0, 1, 3)
ON CONFLICT(id) DO UPDATE SET name = excluded.name, sort_order = excluded.sort_order;
INSERT INTO menu_categories (id, tenant_id, slug, name, category_type, selection_type, is_required, min_selection, max_selection, sort_order)
VALUES ('cat_th_dry_noodles', 'quanthuyhang', 'dry-noodles', '炒河粉 / 涼拌類 (Hủ tiếu xào & Bún khô)', 'catalog', 'single', 0, 0, 1, 4)
ON CONFLICT(id) DO UPDATE SET name = excluded.name, sort_order = excluded.sort_order;
INSERT INTO menu_categories (id, tenant_id, slug, name, category_type, selection_type, is_required, min_selection, max_selection, sort_order)
VALUES ('cat_th_rice', 'quanthuyhang', 'rice-dishes', '飯類 (Cơm)', 'catalog', 'single', 0, 0, 1, 5)
ON CONFLICT(id) DO UPDATE SET name = excluded.name, sort_order = excluded.sort_order;
INSERT INTO menu_categories (id, tenant_id, slug, name, category_type, selection_type, is_required, min_selection, max_selection, sort_order)
VALUES ('cat_th_appetizers', 'quanthuyhang', 'appetizers', '小菜 / 涼拌 (Món ăn kèm)', 'catalog', 'single', 0, 0, 1, 6)
ON CONFLICT(id) DO UPDATE SET name = excluded.name, sort_order = excluded.sort_order;
INSERT INTO menu_categories (id, tenant_id, slug, name, category_type, selection_type, is_required, min_selection, max_selection, sort_order)
VALUES ('cat_th_drinks', 'quanthuyhang', 'drinks', '飲料 (Đồ uống)', 'catalog', 'single', 0, 0, 1, 7)
ON CONFLICT(id) DO UPDATE SET name = excluded.name, sort_order = excluded.sort_order;

-- 4. Seed Menu Items
INSERT INTO menu_items (id, tenant_id, category_id, name, price, description, badge_text, is_recommended, is_out_of_stock, sort_order)
VALUES ('item_th_ap_01', 'quanthuyhang', 'cat_th_appetizers', '生春捲 Goi cuon', 80, NULL, NULL, 0, 0, 1)
ON CONFLICT(id) DO UPDATE SET name = excluded.name, price = excluded.price, is_out_of_stock = excluded.is_out_of_stock, sort_order = excluded.sort_order;
INSERT INTO menu_items (id, tenant_id, category_id, name, price, description, badge_text, is_recommended, is_out_of_stock, sort_order)
VALUES ('item_th_ap_02', 'quanthuyhang', 'cat_th_appetizers', '炸春捲 Cha gio chien', 100, NULL, NULL, 0, 0, 2)
ON CONFLICT(id) DO UPDATE SET name = excluded.name, price = excluded.price, is_out_of_stock = excluded.is_out_of_stock, sort_order = excluded.sort_order;
INSERT INTO menu_items (id, tenant_id, category_id, name, price, description, badge_text, is_recommended, is_out_of_stock, sort_order)
VALUES ('item_th_ap_03', 'quanthuyhang', 'cat_th_appetizers', '涼拌雞肉 Goi ga', 80, NULL, NULL, 0, 0, 3)
ON CONFLICT(id) DO UPDATE SET name = excluded.name, price = excluded.price, is_out_of_stock = excluded.is_out_of_stock, sort_order = excluded.sort_order;
INSERT INTO menu_items (id, tenant_id, category_id, name, price, description, badge_text, is_recommended, is_out_of_stock, sort_order)
VALUES ('item_th_ap_04', 'quanthuyhang', 'cat_th_appetizers', '海鮮涼拌 Goi hai san', 110, NULL, NULL, 0, 0, 4)
ON CONFLICT(id) DO UPDATE SET name = excluded.name, price = excluded.price, is_out_of_stock = excluded.is_out_of_stock, sort_order = excluded.sort_order;
INSERT INTO menu_items (id, tenant_id, category_id, name, price, description, badge_text, is_recommended, is_out_of_stock, sort_order)
VALUES ('item_th_dr_01', 'quanthuyhang', 'cat_th_drinks', '冰咖啡 Ca phe da', 50, NULL, NULL, 0, 0, 1)
ON CONFLICT(id) DO UPDATE SET name = excluded.name, price = excluded.price, is_out_of_stock = excluded.is_out_of_stock, sort_order = excluded.sort_order;
INSERT INTO menu_items (id, tenant_id, category_id, name, price, description, badge_text, is_recommended, is_out_of_stock, sort_order)
VALUES ('item_th_dr_02', 'quanthuyhang', 'cat_th_drinks', '咖啡奶 Ca phe sua da', 60, NULL, NULL, 0, 0, 2)
ON CONFLICT(id) DO UPDATE SET name = excluded.name, price = excluded.price, is_out_of_stock = excluded.is_out_of_stock, sort_order = excluded.sort_order;
INSERT INTO menu_items (id, tenant_id, category_id, name, price, description, badge_text, is_recommended, is_out_of_stock, sort_order)
VALUES ('item_th_dr_03', 'quanthuyhang', 'cat_th_drinks', '檸檬汁 Da chanh tuoi', 40, NULL, NULL, 0, 0, 3)
ON CONFLICT(id) DO UPDATE SET name = excluded.name, price = excluded.price, is_out_of_stock = excluded.is_out_of_stock, sort_order = excluded.sort_order;
INSERT INTO menu_items (id, tenant_id, category_id, name, price, description, badge_text, is_recommended, is_out_of_stock, sort_order)
VALUES ('item_th_dr_04', 'quanthuyhang', 'cat_th_drinks', '鹹檸檬 Da chanh muoi', 40, NULL, NULL, 0, 0, 4)
ON CONFLICT(id) DO UPDATE SET name = excluded.name, price = excluded.price, is_out_of_stock = excluded.is_out_of_stock, sort_order = excluded.sort_order;
INSERT INTO menu_items (id, tenant_id, category_id, name, price, description, badge_text, is_recommended, is_out_of_stock, sort_order)
VALUES ('item_th_dn_01', 'quanthuyhang', 'cat_th_dry_noodles', '牛肉炒河粉 Hu tieu xao bo', 110, NULL, NULL, 0, 0, 1)
ON CONFLICT(id) DO UPDATE SET name = excluded.name, price = excluded.price, is_out_of_stock = excluded.is_out_of_stock, sort_order = excluded.sort_order;
INSERT INTO menu_items (id, tenant_id, category_id, name, price, description, badge_text, is_recommended, is_out_of_stock, sort_order)
VALUES ('item_th_dn_02', 'quanthuyhang', 'cat_th_dry_noodles', '豬肉炒河粉 Hu tieu xao heo', 100, NULL, NULL, 0, 0, 2)
ON CONFLICT(id) DO UPDATE SET name = excluded.name, price = excluded.price, is_out_of_stock = excluded.is_out_of_stock, sort_order = excluded.sort_order;
INSERT INTO menu_items (id, tenant_id, category_id, name, price, description, badge_text, is_recommended, is_out_of_stock, sort_order)
VALUES ('item_th_dn_03', 'quanthuyhang', 'cat_th_dry_noodles', '海鮮炒河粉 Hu tieu xao hai san', 110, NULL, NULL, 0, 0, 3)
ON CONFLICT(id) DO UPDATE SET name = excluded.name, price = excluded.price, is_out_of_stock = excluded.is_out_of_stock, sort_order = excluded.sort_order;
INSERT INTO menu_items (id, tenant_id, category_id, name, price, description, badge_text, is_recommended, is_out_of_stock, sort_order)
VALUES ('item_th_dn_04', 'quanthuyhang', 'cat_th_dry_noodles', '烤肉米線 Bun thit nuong', 100, NULL, NULL, 0, 0, 4)
ON CONFLICT(id) DO UPDATE SET name = excluded.name, price = excluded.price, is_out_of_stock = excluded.is_out_of_stock, sort_order = excluded.sort_order;
INSERT INTO menu_items (id, tenant_id, category_id, name, price, description, badge_text, is_recommended, is_out_of_stock, sort_order)
VALUES ('item_th_dn_05', 'quanthuyhang', 'cat_th_dry_noodles', '越南涼麵 Bun thit cha lua', 100, NULL, NULL, 0, 0, 5)
ON CONFLICT(id) DO UPDATE SET name = excluded.name, price = excluded.price, is_out_of_stock = excluded.is_out_of_stock, sort_order = excluded.sort_order;
INSERT INTO menu_items (id, tenant_id, category_id, name, price, description, badge_text, is_recommended, is_out_of_stock, sort_order)
VALUES ('item_th_dn_06', 'quanthuyhang', 'cat_th_dry_noodles', '火腿米線 Bun cha lua', 110, NULL, NULL, 0, 0, 6)
ON CONFLICT(id) DO UPDATE SET name = excluded.name, price = excluded.price, is_out_of_stock = excluded.is_out_of_stock, sort_order = excluded.sort_order;
INSERT INTO menu_items (id, tenant_id, category_id, name, price, description, badge_text, is_recommended, is_out_of_stock, sort_order)
VALUES ('item_th_dn_07', 'quanthuyhang', 'cat_th_dry_noodles', '炸春捲米線 Bun cha gio', 100, NULL, NULL, 0, 0, 7)
ON CONFLICT(id) DO UPDATE SET name = excluded.name, price = excluded.price, is_out_of_stock = excluded.is_out_of_stock, sort_order = excluded.sort_order;
INSERT INTO menu_items (id, tenant_id, category_id, name, price, description, badge_text, is_recommended, is_out_of_stock, sort_order)
VALUES ('item_th_dn_08', 'quanthuyhang', 'cat_th_dry_noodles', '烤肉春捲米線 Bun thit nuong cha gio', 140, NULL, NULL, 0, 0, 8)
ON CONFLICT(id) DO UPDATE SET name = excluded.name, price = excluded.price, is_out_of_stock = excluded.is_out_of_stock, sort_order = excluded.sort_order;
INSERT INTO menu_items (id, tenant_id, category_id, name, price, description, badge_text, is_recommended, is_out_of_stock, sort_order)
VALUES ('item_th_po_01', 'quanthuyhang', 'cat_th_porridge', '粉腸粥 Chao long', 100, NULL, NULL, 0, 0, 1)
ON CONFLICT(id) DO UPDATE SET name = excluded.name, price = excluded.price, is_out_of_stock = excluded.is_out_of_stock, sort_order = excluded.sort_order;
INSERT INTO menu_items (id, tenant_id, category_id, name, price, description, badge_text, is_recommended, is_out_of_stock, sort_order)
VALUES ('item_th_po_02', 'quanthuyhang', 'cat_th_porridge', '粉腸泡麵 Mitom long', 100, NULL, NULL, 0, 0, 2)
ON CONFLICT(id) DO UPDATE SET name = excluded.name, price = excluded.price, is_out_of_stock = excluded.is_out_of_stock, sort_order = excluded.sort_order;
INSERT INTO menu_items (id, tenant_id, category_id, name, price, description, badge_text, is_recommended, is_out_of_stock, sort_order)
VALUES ('item_th_po_03', 'quanthuyhang', 'cat_th_porridge', '豬肉粥 Chao thit heo', 100, NULL, NULL, 0, 0, 3)
ON CONFLICT(id) DO UPDATE SET name = excluded.name, price = excluded.price, is_out_of_stock = excluded.is_out_of_stock, sort_order = excluded.sort_order;
INSERT INTO menu_items (id, tenant_id, category_id, name, price, description, badge_text, is_recommended, is_out_of_stock, sort_order)
VALUES ('item_th_po_04', 'quanthuyhang', 'cat_th_porridge', '雞肉粥 Chao thit ga', 100, NULL, NULL, 0, 0, 4)
ON CONFLICT(id) DO UPDATE SET name = excluded.name, price = excluded.price, is_out_of_stock = excluded.is_out_of_stock, sort_order = excluded.sort_order;
INSERT INTO menu_items (id, tenant_id, category_id, name, price, description, badge_text, is_recommended, is_out_of_stock, sort_order)
VALUES ('item_th_po_05', 'quanthuyhang', 'cat_th_porridge', '海鮮粥 Chao hai san', 120, NULL, NULL, 0, 0, 5)
ON CONFLICT(id) DO UPDATE SET name = excluded.name, price = excluded.price, is_out_of_stock = excluded.is_out_of_stock, sort_order = excluded.sort_order;
INSERT INTO menu_items (id, tenant_id, category_id, name, price, description, badge_text, is_recommended, is_out_of_stock, sort_order)
VALUES ('item_th_rc_01', 'quanthuyhang', 'cat_th_rice', '鮮蝦飯 Com tom kho', 120, NULL, NULL, 0, 0, 1)
ON CONFLICT(id) DO UPDATE SET name = excluded.name, price = excluded.price, is_out_of_stock = excluded.is_out_of_stock, sort_order = excluded.sort_order;
INSERT INTO menu_items (id, tenant_id, category_id, name, price, description, badge_text, is_recommended, is_out_of_stock, sort_order)
VALUES ('item_th_rc_02', 'quanthuyhang', 'cat_th_rice', '雞翅飯 Com canh ga', 120, NULL, NULL, 0, 0, 2)
ON CONFLICT(id) DO UPDATE SET name = excluded.name, price = excluded.price, is_out_of_stock = excluded.is_out_of_stock, sort_order = excluded.sort_order;
INSERT INTO menu_items (id, tenant_id, category_id, name, price, description, badge_text, is_recommended, is_out_of_stock, sort_order)
VALUES ('item_th_rc_03', 'quanthuyhang', 'cat_th_rice', '烤肉飯 Com suon', 100, NULL, NULL, 0, 0, 3)
ON CONFLICT(id) DO UPDATE SET name = excluded.name, price = excluded.price, is_out_of_stock = excluded.is_out_of_stock, sort_order = excluded.sort_order;
INSERT INTO menu_items (id, tenant_id, category_id, name, price, description, badge_text, is_recommended, is_out_of_stock, sort_order)
VALUES ('item_th_rc_04', 'quanthuyhang', 'cat_th_rice', '香茅雞飯 Com ga kho sa', 100, NULL, NULL, 0, 0, 4)
ON CONFLICT(id) DO UPDATE SET name = excluded.name, price = excluded.price, is_out_of_stock = excluded.is_out_of_stock, sort_order = excluded.sort_order;
INSERT INTO menu_items (id, tenant_id, category_id, name, price, description, badge_text, is_recommended, is_out_of_stock, sort_order)
VALUES ('item_th_rc_05', 'quanthuyhang', 'cat_th_rice', '豬肉炒飯 Com xao thit heo', 100, NULL, NULL, 0, 0, 5)
ON CONFLICT(id) DO UPDATE SET name = excluded.name, price = excluded.price, is_out_of_stock = excluded.is_out_of_stock, sort_order = excluded.sort_order;
INSERT INTO menu_items (id, tenant_id, category_id, name, price, description, badge_text, is_recommended, is_out_of_stock, sort_order)
VALUES ('item_th_rc_06', 'quanthuyhang', 'cat_th_rice', '牛肉炒飯 Com xao thit bo', 100, NULL, NULL, 0, 0, 6)
ON CONFLICT(id) DO UPDATE SET name = excluded.name, price = excluded.price, is_out_of_stock = excluded.is_out_of_stock, sort_order = excluded.sort_order;
INSERT INTO menu_items (id, tenant_id, category_id, name, price, description, badge_text, is_recommended, is_out_of_stock, sort_order)
VALUES ('item_th_rc_07', 'quanthuyhang', 'cat_th_rice', '海鮮炒飯 Com xao hai san', 100, NULL, NULL, 0, 0, 7)
ON CONFLICT(id) DO UPDATE SET name = excluded.name, price = excluded.price, is_out_of_stock = excluded.is_out_of_stock, sort_order = excluded.sort_order;
INSERT INTO menu_items (id, tenant_id, category_id, name, price, description, badge_text, is_recommended, is_out_of_stock, sort_order)
VALUES ('item_th_rc_08', 'quanthuyhang', 'cat_th_rice', '蝦仁炒飯 Com xao tom', 120, NULL, NULL, 0, 0, 8)
ON CONFLICT(id) DO UPDATE SET name = excluded.name, price = excluded.price, is_out_of_stock = excluded.is_out_of_stock, sort_order = excluded.sort_order;
INSERT INTO menu_items (id, tenant_id, category_id, name, price, description, badge_text, is_recommended, is_out_of_stock, sort_order)
VALUES ('item_th_rc_09', 'quanthuyhang', 'cat_th_rice', '炸排骨飯 Com suon dai Loan', 100, NULL, NULL, 0, 0, 9)
ON CONFLICT(id) DO UPDATE SET name = excluded.name, price = excluded.price, is_out_of_stock = excluded.is_out_of_stock, sort_order = excluded.sort_order;
INSERT INTO menu_items (id, tenant_id, category_id, name, price, description, badge_text, is_recommended, is_out_of_stock, sort_order)
VALUES ('item_th_rc_10', 'quanthuyhang', 'cat_th_rice', '蛋炒飯 Com xao trung', 80, NULL, NULL, 0, 0, 10)
ON CONFLICT(id) DO UPDATE SET name = excluded.name, price = excluded.price, is_out_of_stock = excluded.is_out_of_stock, sort_order = excluded.sort_order;
INSERT INTO menu_items (id, tenant_id, category_id, name, price, description, badge_text, is_recommended, is_out_of_stock, sort_order)
VALUES ('item_th_sp_01', 'quanthuyhang', 'cat_th_soup', '牛肉丸湯 Canh bo vien', 80, NULL, NULL, 0, 0, 1)
ON CONFLICT(id) DO UPDATE SET name = excluded.name, price = excluded.price, is_out_of_stock = excluded.is_out_of_stock, sort_order = excluded.sort_order;
INSERT INTO menu_items (id, tenant_id, category_id, name, price, description, badge_text, is_recommended, is_out_of_stock, sort_order)
VALUES ('item_th_sp_02', 'quanthuyhang', 'cat_th_soup', '牛肉片湯 Canh bo tai', 80, NULL, NULL, 0, 0, 2)
ON CONFLICT(id) DO UPDATE SET name = excluded.name, price = excluded.price, is_out_of_stock = excluded.is_out_of_stock, sort_order = excluded.sort_order;
INSERT INTO menu_items (id, tenant_id, category_id, name, price, description, badge_text, is_recommended, is_out_of_stock, sort_order)
VALUES ('item_th_sp_03', 'quanthuyhang', 'cat_th_soup', '海鮮湯 Canh hai san', 90, NULL, NULL, 0, 0, 3)
ON CONFLICT(id) DO UPDATE SET name = excluded.name, price = excluded.price, is_out_of_stock = excluded.is_out_of_stock, sort_order = excluded.sort_order;
INSERT INTO menu_items (id, tenant_id, category_id, name, price, description, badge_text, is_recommended, is_out_of_stock, sort_order)
VALUES ('item_th_sp_04', 'quanthuyhang', 'cat_th_soup', '蛤仔湯 Canh ngeu', 60, NULL, NULL, 0, 0, 4)
ON CONFLICT(id) DO UPDATE SET name = excluded.name, price = excluded.price, is_out_of_stock = excluded.is_out_of_stock, sort_order = excluded.sort_order;
INSERT INTO menu_items (id, tenant_id, category_id, name, price, description, badge_text, is_recommended, is_out_of_stock, sort_order)
VALUES ('item_th_sp_05', 'quanthuyhang', 'cat_th_soup', '蛋花湯 Canh cai trung', 50, NULL, NULL, 0, 0, 5)
ON CONFLICT(id) DO UPDATE SET name = excluded.name, price = excluded.price, is_out_of_stock = excluded.is_out_of_stock, sort_order = excluded.sort_order;
INSERT INTO menu_items (id, tenant_id, category_id, name, price, description, badge_text, is_recommended, is_out_of_stock, sort_order)
VALUES ('item_th_sn_01', 'quanthuyhang', 'cat_th_soup_noodles', '牛肉丸米線 Bun bo vien', 140, NULL, NULL, 0, 0, 1)
ON CONFLICT(id) DO UPDATE SET name = excluded.name, price = excluded.price, is_out_of_stock = excluded.is_out_of_stock, sort_order = excluded.sort_order;
INSERT INTO menu_items (id, tenant_id, category_id, name, price, description, badge_text, is_recommended, is_out_of_stock, sort_order)
VALUES ('item_th_sn_02', 'quanthuyhang', 'cat_th_soup_noodles', '牛肉丸河粉 Pho bo vien', 140, NULL, NULL, 0, 0, 2)
ON CONFLICT(id) DO UPDATE SET name = excluded.name, price = excluded.price, is_out_of_stock = excluded.is_out_of_stock, sort_order = excluded.sort_order;
INSERT INTO menu_items (id, tenant_id, category_id, name, price, description, badge_text, is_recommended, is_out_of_stock, sort_order)
VALUES ('item_th_sn_03', 'quanthuyhang', 'cat_th_soup_noodles', '牛肉河粉 Pho bo tai', 110, NULL, NULL, 0, 0, 3)
ON CONFLICT(id) DO UPDATE SET name = excluded.name, price = excluded.price, is_out_of_stock = excluded.is_out_of_stock, sort_order = excluded.sort_order;
INSERT INTO menu_items (id, tenant_id, category_id, name, price, description, badge_text, is_recommended, is_out_of_stock, sort_order)
VALUES ('item_th_sn_04', 'quanthuyhang', 'cat_th_soup_noodles', '海鮮河粉 Pho hai san', 110, NULL, NULL, 0, 0, 4)
ON CONFLICT(id) DO UPDATE SET name = excluded.name, price = excluded.price, is_out_of_stock = excluded.is_out_of_stock, sort_order = excluded.sort_order;
INSERT INTO menu_items (id, tenant_id, category_id, name, price, description, badge_text, is_recommended, is_out_of_stock, sort_order)
VALUES ('item_th_sn_05', 'quanthuyhang', 'cat_th_soup_noodles', '豬肉河粉 Hu tieu heo', 100, NULL, NULL, 0, 0, 5)
ON CONFLICT(id) DO UPDATE SET name = excluded.name, price = excluded.price, is_out_of_stock = excluded.is_out_of_stock, sort_order = excluded.sort_order;
INSERT INTO menu_items (id, tenant_id, category_id, name, price, description, badge_text, is_recommended, is_out_of_stock, sort_order)
VALUES ('item_th_sn_06', 'quanthuyhang', 'cat_th_soup_noodles', '豬肉米線 Bun heo', 100, NULL, NULL, 0, 0, 6)
ON CONFLICT(id) DO UPDATE SET name = excluded.name, price = excluded.price, is_out_of_stock = excluded.is_out_of_stock, sort_order = excluded.sort_order;
INSERT INTO menu_items (id, tenant_id, category_id, name, price, description, badge_text, is_recommended, is_out_of_stock, sort_order)
VALUES ('item_th_sn_07', 'quanthuyhang', 'cat_th_soup_noodles', '雞肉河粉 Hu tieu ga', 100, NULL, NULL, 0, 0, 7)
ON CONFLICT(id) DO UPDATE SET name = excluded.name, price = excluded.price, is_out_of_stock = excluded.is_out_of_stock, sort_order = excluded.sort_order;
INSERT INTO menu_items (id, tenant_id, category_id, name, price, description, badge_text, is_recommended, is_out_of_stock, sort_order)
VALUES ('item_th_sn_08', 'quanthuyhang', 'cat_th_soup_noodles', '雞肉米線 Bun ga', 100, NULL, NULL, 0, 0, 8)
ON CONFLICT(id) DO UPDATE SET name = excluded.name, price = excluded.price, is_out_of_stock = excluded.is_out_of_stock, sort_order = excluded.sort_order;
INSERT INTO menu_items (id, tenant_id, category_id, name, price, description, badge_text, is_recommended, is_out_of_stock, sort_order)
VALUES ('item_th_sn_09', 'quanthuyhang', 'cat_th_soup_noodles', '粉腸河粉 Hu tieu long', 100, NULL, NULL, 0, 0, 9)
ON CONFLICT(id) DO UPDATE SET name = excluded.name, price = excluded.price, is_out_of_stock = excluded.is_out_of_stock, sort_order = excluded.sort_order;
INSERT INTO menu_items (id, tenant_id, category_id, name, price, description, badge_text, is_recommended, is_out_of_stock, sort_order)
VALUES ('item_th_sn_10', 'quanthuyhang', 'cat_th_soup_noodles', '海鮮米線(蕃茄湯) Bun rieu cua', 120, NULL, NULL, 0, 0, 10)
ON CONFLICT(id) DO UPDATE SET name = excluded.name, price = excluded.price, is_out_of_stock = excluded.is_out_of_stock, sort_order = excluded.sort_order;
INSERT INTO menu_items (id, tenant_id, category_id, name, price, description, badge_text, is_recommended, is_out_of_stock, sort_order)
VALUES ('item_th_sn_11', 'quanthuyhang', 'cat_th_soup_noodles', '海鮮米線(清湯) Bun hai san', 110, NULL, NULL, 0, 0, 11)
ON CONFLICT(id) DO UPDATE SET name = excluded.name, price = excluded.price, is_out_of_stock = excluded.is_out_of_stock, sort_order = excluded.sort_order;
INSERT INTO menu_items (id, tenant_id, category_id, name, price, description, badge_text, is_recommended, is_out_of_stock, sort_order)
VALUES ('item_th_sn_12', 'quanthuyhang', 'cat_th_soup_noodles', '順化牛肉麵 Bun bo hue', 120, NULL, NULL, 0, 0, 12)
ON CONFLICT(id) DO UPDATE SET name = excluded.name, price = excluded.price, is_out_of_stock = excluded.is_out_of_stock, sort_order = excluded.sort_order;
INSERT INTO menu_items (id, tenant_id, category_id, name, price, description, badge_text, is_recommended, is_out_of_stock, sort_order)
VALUES ('item_th_sn_13', 'quanthuyhang', 'cat_th_soup_noodles', '魚醬米線 Bun mam', 120, NULL, NULL, 0, 0, 13)
ON CONFLICT(id) DO UPDATE SET name = excluded.name, price = excluded.price, is_out_of_stock = excluded.is_out_of_stock, sort_order = excluded.sort_order;
INSERT INTO menu_items (id, tenant_id, category_id, name, price, description, badge_text, is_recommended, is_out_of_stock, sort_order)
VALUES ('item_th_sn_14', 'quanthuyhang', 'cat_th_soup_noodles', '牛肉米線 Bun bo tai', 110, NULL, NULL, 0, 0, 14)
ON CONFLICT(id) DO UPDATE SET name = excluded.name, price = excluded.price, is_out_of_stock = excluded.is_out_of_stock, sort_order = excluded.sort_order;
INSERT INTO menu_items (id, tenant_id, category_id, name, price, description, badge_text, is_recommended, is_out_of_stock, sort_order)
VALUES ('item_th_sn_15', 'quanthuyhang', 'cat_th_soup_noodles', '豬肉米苔目 Banh canh heo', 100, NULL, NULL, 0, 0, 15)
ON CONFLICT(id) DO UPDATE SET name = excluded.name, price = excluded.price, is_out_of_stock = excluded.is_out_of_stock, sort_order = excluded.sort_order;
INSERT INTO menu_items (id, tenant_id, category_id, name, price, description, badge_text, is_recommended, is_out_of_stock, sort_order)
VALUES ('item_th_sn_16', 'quanthuyhang', 'cat_th_soup_noodles', '海鮮米苔目 Banh canh hai san', 110, NULL, NULL, 0, 0, 16)
ON CONFLICT(id) DO UPDATE SET name = excluded.name, price = excluded.price, is_out_of_stock = excluded.is_out_of_stock, sort_order = excluded.sort_order;
INSERT INTO menu_items (id, tenant_id, category_id, name, price, description, badge_text, is_recommended, is_out_of_stock, sort_order)
VALUES ('item_th_sn_17', 'quanthuyhang', 'cat_th_soup_noodles', '牛肉米苔目 Banh canh bo', 110, NULL, NULL, 0, 0, 17)
ON CONFLICT(id) DO UPDATE SET name = excluded.name, price = excluded.price, is_out_of_stock = excluded.is_out_of_stock, sort_order = excluded.sort_order;
