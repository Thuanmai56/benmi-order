-- Migration: Sync zhadantongxue from production to staging
-- Generated At: 2026-08-23T03:48:11.533Z

INSERT OR REPLACE INTO tenants (id, name) VALUES ('zhadantongxue', '炸蛋同學');

INSERT OR REPLACE INTO tenant_config (tenant_id, line_channel_token, line_channel_secret, liff_id, liff_url, groq_api_key, groq_model, openrouter_api_key, openrouter_model, brand_name, brand_color, store_address, operating_hours, delivery_policy, quick_replies, flex_template, default_password, locale, google_sheets_url, is_active, created_at, updated_at, allow_scheduled_pickup, store_status, logo_url, announcement) VALUES ('zhadantongxue', 'J6Q8An14F4XKtpgloLIeT/nsFjPX1ePZZkkxyCzICFU+iGHmtV7fLDyS3RR1GkqnJGy6l0/xjapX9PT/znTkCbSR/68fxDS7q3TxT5ibpOl13Yxp2pmZSX9AFK9QMJu6cPT8QtwOmI4LZz1+gpNtDwdB04t89/1O/w1cDnyilFU=', NULL, '2011142254-XRns8O0k', 'https://liff.line.me/2011142254-XRns8O0k', NULL, 'llama-3.1-8b-instant', NULL, 'google/gemini-2.5-flash:free', '炸蛋同學', '#00b900', '新北市新店區中興路二段200-1號
定餐/加盟0902271718
(超過30份請前一天下單)', '{"0":[],"1":[{"start":"14:30","end":"21:00"}],"2":[{"start":"14:30","end":"21:00"}],"3":[{"start":"14:30","end":"21:00"}],"4":[{"start":"14:30","end":"21:00"}],"5":[{"start":"14:30","end":"21:00"}],"6":[{"start":"14:30","end":"21:00"}]}', '🛵 外送請先來電 0902271718 洽詢配送範圍與滿額條件。', '[{"triggers":["電話","訂購","加盟"],"reply":"訂購/加盟專線：0902271718"},{"triggers":["菜單","推薦"],"reply":"招牌推薦：原味炸蛋蔥餅、雙芝士炸蛋蔥餅、雞腿肉卷炸蛋蔥餅！"}]', NULL, '12345678', 'zh-TW', NULL, 1, '2026-08-20 07:10:27', '2026-08-22 09:25:43', 1, 'open', './zhadan_logo.png', '');

DELETE FROM menu_items WHERE tenant_id = 'zhadantongxue';
DELETE FROM menu_categories WHERE tenant_id = 'zhadantongxue';

INSERT INTO menu_categories (id, tenant_id, name, slug, sort_order, category_type, selection_type, is_required, min_selection, max_selection, allow_customization)
VALUES ('cat_zd_main', 'zhadantongxue', '招牌炸蛋蔥餅', 'main', 1, 'catalog', 'single', 0, 0, 1, 1);
INSERT INTO menu_categories (id, tenant_id, name, slug, sort_order, category_type, selection_type, is_required, min_selection, max_selection, allow_customization)
VALUES ('cat_zd_drinks', 'zhadantongxue', '豆漿 意仁漿', 'drinks', 2, 'catalog', 'single', 0, 0, 1, 0);
INSERT INTO menu_categories (id, tenant_id, name, slug, sort_order, category_type, selection_type, is_required, min_selection, max_selection, allow_customization)
VALUES ('zhadantongxue_cat_mt46veog', 'zhadantongxue', '小料單賣', 'cat_mt46veog', 3, 'catalog', 'single', 0, 0, 1, 0);
INSERT INTO menu_categories (id, tenant_id, name, slug, sort_order, category_type, selection_type, is_required, min_selection, max_selection, allow_customization)
VALUES ('cat_zd_spicy', 'zhadantongxue', '加辣選項', 'spicy', 4, 'modifier', 'single', 1, 1, 1, 0);
INSERT INTO menu_categories (id, tenant_id, name, slug, sort_order, category_type, selection_type, is_required, min_selection, max_selection, allow_customization)
VALUES ('cat_zd_egg', 'zhadantongxue', '雞蛋選項', 'egg', 5, 'modifier', 'single', 1, 1, 1, 0);
INSERT INTO menu_categories (id, tenant_id, name, slug, sort_order, category_type, selection_type, is_required, min_selection, max_selection, allow_customization)
VALUES ('cat_zd_lettuce', 'zhadantongxue', '生菜選項', 'lettuce', 6, 'modifier', 'single', 1, 1, 1, 0);
INSERT INTO menu_categories (id, tenant_id, name, slug, sort_order, category_type, selection_type, is_required, min_selection, max_selection, allow_customization)
VALUES ('cat_zd_topping', 'zhadantongxue', '加料選項', 'topping', 7, 'modifier', 'multiple', 0, 0, 10, 0);

INSERT INTO menu_items (id, tenant_id, category_id, name, price, description, badge_text, is_recommended, sort_order)
VALUES ('zhadantongxue_drinks_香濃冰豆漿', 'zhadantongxue', 'cat_zd_drinks', '香濃冰豆漿', 25, NULL, '不濃免錢', 0, 1);
INSERT INTO menu_items (id, tenant_id, category_id, name, price, description, badge_text, is_recommended, sort_order)
VALUES ('zhadantongxue_drinks_無糖冰豆漿', 'zhadantongxue', 'cat_zd_drinks', '無糖冰豆漿', 25, NULL, NULL, 0, 2);
INSERT INTO menu_items (id, tenant_id, category_id, name, price, description, badge_text, is_recommended, sort_order)
VALUES ('zhadantongxue_drinks_香濃薏仁漿', 'zhadantongxue', 'cat_zd_drinks', '香濃薏仁漿', 25, NULL, '微糖', 0, 3);
INSERT INTO menu_items (id, tenant_id, category_id, name, price, description, badge_text, is_recommended, sort_order)
VALUES ('zd_opt_egg_1', 'zhadantongxue', 'cat_zd_egg', '流心蛋 Runny Yolk Egg', 0, NULL, NULL, 0, 1);
INSERT INTO menu_items (id, tenant_id, category_id, name, price, description, badge_text, is_recommended, sort_order)
VALUES ('zd_opt_egg_2', 'zhadantongxue', 'cat_zd_egg', '熟蛋 Over Egg', 0, NULL, NULL, 0, 2);
INSERT INTO menu_items (id, tenant_id, category_id, name, price, description, badge_text, is_recommended, sort_order)
VALUES ('zd_opt_lettuce_1', 'zhadantongxue', 'cat_zd_lettuce', '加生菜', 0, NULL, NULL, 0, 1);
INSERT INTO menu_items (id, tenant_id, category_id, name, price, description, badge_text, is_recommended, sort_order)
VALUES ('zd_opt_lettuce_2', 'zhadantongxue', 'cat_zd_lettuce', '不加生菜', 0, NULL, NULL, 0, 2);
INSERT INTO menu_items (id, tenant_id, category_id, name, price, description, badge_text, is_recommended, sort_order)
VALUES ('zd_item_01', 'zhadantongxue', 'cat_zd_main', '原味炸蛋蔥餅', 45, '招牌經典原味', NULL, 0, 1);
INSERT INTO menu_items (id, tenant_id, category_id, name, price, description, badge_text, is_recommended, sort_order)
VALUES ('zhadantongxue_main_双蛋蛋炸蛋蔥餅', 'zhadantongxue', 'cat_zd_main', '双蛋蛋炸蛋蔥餅', 55, NULL, NULL, 0, 2);
INSERT INTO menu_items (id, tenant_id, category_id, name, price, description, badge_text, is_recommended, sort_order)
VALUES ('zd_item_03', 'zhadantongxue', 'cat_zd_main', '雪花培根炸蛋蔥餅', 60, '嚴選雪花培根', NULL, 0, 3);
INSERT INTO menu_items (id, tenant_id, category_id, name, price, description, badge_text, is_recommended, sort_order)
VALUES ('zd_item_04', 'zhadantongxue', 'cat_zd_main', '韓式泡菜炸蛋蔥餅', 60, '爽脆酸辣解膩', NULL, 0, 4);
INSERT INTO menu_items (id, tenant_id, category_id, name, price, description, badge_text, is_recommended, sort_order)
VALUES ('zhadantongxue_main_双芝士炸蛋蔥餅', 'zhadantongxue', 'cat_zd_main', '双芝士炸蛋蔥餅', 60, NULL, NULL, 0, 5);
INSERT INTO menu_items (id, tenant_id, category_id, name, price, description, badge_text, is_recommended, sort_order)
VALUES ('zhadantongxue_main_双熱狗炸蛋蔥餅', 'zhadantongxue', 'cat_zd_main', '双熱狗炸蛋蔥餅', 60, NULL, NULL, 0, 6);
INSERT INTO menu_items (id, tenant_id, category_id, name, price, description, badge_text, is_recommended, sort_order)
VALUES ('zhadantongxue_main_秘制黑椒豬後腿排炸蛋蔥餅', 'zhadantongxue', 'cat_zd_main', '秘制黑椒豬後腿排炸蛋蔥餅', 70, NULL, '（熱銷）', 0, 7);
INSERT INTO menu_items (id, tenant_id, category_id, name, price, description, badge_text, is_recommended, sort_order)
VALUES ('zhadantongxue_main_特制椒鹽鹽酥雞炸蛋蔥餅', 'zhadantongxue', 'cat_zd_main', '特制椒鹽鹽酥雞炸蛋蔥餅', 70, NULL, NULL, 0, 8);
INSERT INTO menu_items (id, tenant_id, category_id, name, price, description, badge_text, is_recommended, sort_order)
VALUES ('zhadantongxue_main_香酥雞腿肉卷炸蛋蔥餅', 'zhadantongxue', 'cat_zd_main', '香酥雞腿肉卷炸蛋蔥餅', 75, NULL, '（熱銷）雞肉足足100g', 0, 9);
INSERT INTO menu_items (id, tenant_id, category_id, name, price, description, badge_text, is_recommended, sort_order)
VALUES ('zhadantongxue_main_芝士雞排炸蛋蔥餅', 'zhadantongxue', 'cat_zd_main', '芝士雞排炸蛋蔥餅', 80, NULL, '（熱銷）雞排足足80g', 0, 10);
INSERT INTO menu_items (id, tenant_id, category_id, name, price, description, badge_text, is_recommended, sort_order)
VALUES ('zd_item_09', 'zhadantongxue', 'cat_zd_main', '台灣香腸炸蛋蔥餅', 80, '香腸足足15cm', '（熱銷）香腸足足15cm', 0, 11);
INSERT INTO menu_items (id, tenant_id, category_id, name, price, description, badge_text, is_recommended, sort_order)
VALUES ('zd_item_10', 'zhadantongxue', 'cat_zd_main', '泰式月亮蝦餅 (6片)', 50, '外酥內嫩泰式風味', '好吃的零嘴 （6小片）', 0, 12);
INSERT INTO menu_items (id, tenant_id, category_id, name, price, description, badge_text, is_recommended, sort_order)
VALUES ('zd_opt_spicy_1', 'zhadantongxue', 'cat_zd_spicy', '加辣 Add Spice', 0, NULL, NULL, 0, 1);
INSERT INTO menu_items (id, tenant_id, category_id, name, price, description, badge_text, is_recommended, sort_order)
VALUES ('zd_opt_spicy_2', 'zhadantongxue', 'cat_zd_spicy', '不加辣 Non-Spicy', 0, NULL, NULL, 0, 2);
INSERT INTO menu_items (id, tenant_id, category_id, name, price, description, badge_text, is_recommended, sort_order)
VALUES ('zd_top_01', 'zhadantongxue', 'cat_zd_topping', '一片起司', 10, NULL, NULL, 0, 1);
INSERT INTO menu_items (id, tenant_id, category_id, name, price, description, badge_text, is_recommended, sort_order)
VALUES ('zd_top_02', 'zhadantongxue', 'cat_zd_topping', '一支熱狗', 10, NULL, NULL, 0, 2);
INSERT INTO menu_items (id, tenant_id, category_id, name, price, description, badge_text, is_recommended, sort_order)
VALUES ('zd_top_03', 'zhadantongxue', 'cat_zd_topping', '雞蛋', 15, NULL, NULL, 0, 3);
INSERT INTO menu_items (id, tenant_id, category_id, name, price, description, badge_text, is_recommended, sort_order)
VALUES ('zd_top_04', 'zhadantongxue', 'cat_zd_topping', '培根', 15, NULL, NULL, 0, 4);
INSERT INTO menu_items (id, tenant_id, category_id, name, price, description, badge_text, is_recommended, sort_order)
VALUES ('zd_top_05', 'zhadantongxue', 'cat_zd_topping', '泡菜', 15, NULL, NULL, 0, 5);
INSERT INTO menu_items (id, tenant_id, category_id, name, price, description, badge_text, is_recommended, sort_order)
VALUES ('zd_top_06', 'zhadantongxue', 'cat_zd_topping', '豬排', 25, NULL, NULL, 0, 6);
INSERT INTO menu_items (id, tenant_id, category_id, name, price, description, badge_text, is_recommended, sort_order)
VALUES ('zd_top_07', 'zhadantongxue', 'cat_zd_topping', '雞腿肉卷', 35, NULL, NULL, 0, 7);
INSERT INTO menu_items (id, tenant_id, category_id, name, price, description, badge_text, is_recommended, sort_order)
VALUES ('zd_top_08', 'zhadantongxue', 'cat_zd_topping', '台灣香腸', 50, NULL, NULL, 0, 8);
INSERT INTO menu_items (id, tenant_id, category_id, name, price, description, badge_text, is_recommended, sort_order)
VALUES ('zhadantongxue_cat_mt46veog_小熱狗', 'zhadantongxue', 'zhadantongxue_cat_mt46veog', '小熱狗', 20, NULL, '3支', 0, 1);
INSERT INTO menu_items (id, tenant_id, category_id, name, price, description, badge_text, is_recommended, sort_order)
VALUES ('zhadantongxue_cat_mt46veog_台灣香腸1支', 'zhadantongxue', 'zhadantongxue_cat_mt46veog', '台灣香腸1支', 45, NULL, '15cm', 0, 2);
INSERT INTO menu_items (id, tenant_id, category_id, name, price, description, badge_text, is_recommended, sort_order)
VALUES ('zhadantongxue_cat_mt46veog_雞腿肉卷1支', 'zhadantongxue', 'zhadantongxue_cat_mt46veog', '雞腿肉卷1支', 40, NULL, '100g', 0, 3);