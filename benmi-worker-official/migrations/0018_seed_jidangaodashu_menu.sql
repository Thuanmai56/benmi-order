-- Migration: 0018_seed_jidangaodashu_menu.sql
-- Description: Seed initial menu and tenant config for tenant 'jidangaodashu' (雞蛋糕大叔)

-- 1. Thêm thông tin Cửa hàng vào bảng tenants
INSERT OR REPLACE INTO tenants (id, name) 
VALUES ('jidangaodashu', '雞蛋糕大叔');

-- 2. Cấu hình Cửa hàng trong tenant_config
INSERT OR REPLACE INTO tenant_config (
    tenant_id,
    brand_name,
    brand_color,
    store_address,
    operating_hours,
    delivery_policy,
    default_password,
    locale,
    allow_scheduled_pickup,
    store_status,
    liff_id,
    liff_url,
    is_active
) VALUES (
    'jidangaodashu',
    '雞蛋糕大叔',
    '#d97706',
    '新北市土城區延平街30號',
    '{"0":[],"1":[{"start":"12:00","end":"19:00"}],"2":[{"start":"12:00","end":"19:00"}],"3":[{"start":"12:00","end":"19:00"}],"4":[],"5":[{"start":"12:00","end":"19:00"}],"6":[{"start":"12:00","end":"19:00"}]}',
    '',
    '12345678',
    'zh-TW',
    0,
    'open',
    '2009555608-DMioljsI',
    'https://liff.line.me/2009555608-DMioljsI',
    1
);

-- 3. Danh mục Thực đơn (Menu Categories)
INSERT OR REPLACE INTO menu_categories (
    id,
    tenant_id,
    name,
    slug,
    category_type,
    selection_type,
    is_required,
    min_selection,
    max_selection,
    sort_order
) VALUES
('cat_jdgs_main', 'jidangaodashu', '造型雞蛋糕', 'shaped-egg-waffles', 'catalog', 'single', 0, 0, 1, 1);

-- 4. Chi tiết Món ăn (Menu Items)
INSERT OR REPLACE INTO menu_items (
    id,
    tenant_id,
    category_id,
    name,
    price,
    description,
    badge_text,
    is_recommended,
    sort_order
) VALUES
('jdgs_item_01', 'jidangaodashu', 'cat_jdgs_main', '經典原味',       50, '香濃蛋香．經典不敗', '經典必吃',         1, 1),
('jdgs_item_02', 'jidangaodashu', 'cat_jdgs_main', '法國苦甜巧克力', 70, '濃郁可可．大人系首選', NULL,               0, 2),
('jdgs_item_03', 'jidangaodashu', 'cat_jdgs_main', '香濃卡士達',     70, '綿密滑順．香甜不膩', NULL,               0, 3),
('jdgs_item_04', 'jidangaodashu', 'cat_jdgs_main', '黑糖麻糬',       70, 'Q彈麻糬．黑糖香醇', NULL,               0, 4),
('jdgs_item_05', 'jidangaodashu', 'cat_jdgs_main', '相思紅豆',       70, '嚴選紅豆．綿密香甜', NULL,               0, 5),
('jdgs_item_06', 'jidangaodashu', 'cat_jdgs_main', '拔絲起司',       70, '鹹香起司．牽絲爆漿', '起司牽絲超滿足',     1, 6);
