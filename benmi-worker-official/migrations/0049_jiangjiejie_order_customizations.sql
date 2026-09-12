-- Move jiangjiejie order-wide seasoning to the first customization panel.
-- Every group is single-select, with no inferred default. Preserve paid choices.
-- Apply with the accompanying customer radio pricing support.

INSERT INTO menu_customizations (id, tenant_id, key, title, type, sort_order, options_json)
SELECT 'custom_mod_jj_pepper', 'jiangjiejie', 'pepper-level', '胡椒粉', 'radio', 0, '[{"name":"不要","price":0,"is_default":false},{"name":"一滴滴 (撒半次)","price":0,"is_default":false},{"name":"微鹹 (撒一次)","price":0,"is_default":false},{"name":"清淡 (撒兩次)","price":0,"is_default":false},{"name":"正常","price":0,"is_default":false},{"name":"重鹹","price":0,"is_default":false}]' WHERE EXISTS (SELECT 1 FROM tenants WHERE id = 'jiangjiejie')
ON CONFLICT(id) DO UPDATE SET title=excluded.title, type=excluded.type, sort_order=excluded.sort_order, options_json=excluded.options_json;

INSERT INTO menu_customizations (id, tenant_id, key, title, type, sort_order, options_json)
SELECT 'custom_mod_jj_chili', 'jiangjiejie', 'chili-level', '辣椒', 'radio', 1, '[{"name":"包辣","price":0,"is_default":false},{"name":"微","price":0,"is_default":false},{"name":"小","price":0,"is_default":false},{"name":"中","price":0,"is_default":false},{"name":"大","price":0,"is_default":false}]' WHERE EXISTS (SELECT 1 FROM tenants WHERE id = 'jiangjiejie')
ON CONFLICT(id) DO UPDATE SET title=excluded.title, type=excluded.type, sort_order=excluded.sort_order, options_json=excluded.options_json;

INSERT INTO menu_customizations (id, tenant_id, key, title, type, sort_order, options_json)
SELECT 'custom_mod_jj_ma', 'jiangjiejie', 'szechuan-pepper', '椒麻', 'radio', 2, '[{"name":"微麻","price":0,"is_default":false},{"name":"小麻","price":0,"is_default":false},{"name":"中麻","price":0,"is_default":false},{"name":"大麻","price":0,"is_default":false}]' WHERE EXISTS (SELECT 1 FROM tenants WHERE id = 'jiangjiejie')
ON CONFLICT(id) DO UPDATE SET title=excluded.title, type=excluded.type, sort_order=excluded.sort_order, options_json=excluded.options_json;

INSERT INTO menu_customizations (id, tenant_id, key, title, type, sort_order, options_json)
SELECT 'custom_mod_jj_onion', 'jiangjiejie', 'onion-pref', '洋蔥（加洋蔥需滿100元，多加20元）', 'radio', 3, '[{"name":"不要","price":0,"is_default":false},{"name":"要","price":0,"is_default":false,"min_order_amount":100},{"name":"多","price":20,"is_default":false,"min_order_amount":100}]' WHERE EXISTS (SELECT 1 FROM tenants WHERE id = 'jiangjiejie')
ON CONFLICT(id) DO UPDATE SET title=excluded.title, type=excluded.type, sort_order=excluded.sort_order, options_json=excluded.options_json;

INSERT INTO menu_customizations (id, tenant_id, key, title, type, sort_order, options_json)
SELECT 'custom_mod_jj_garlic', 'jiangjiejie', 'garlic-pref', '蒜泥', 'radio', 4, '[{"name":"不要","price":0,"is_default":false},{"name":"要","price":0,"is_default":false},{"name":"多","price":0,"is_default":false}]' WHERE EXISTS (SELECT 1 FROM tenants WHERE id = 'jiangjiejie')
ON CONFLICT(id) DO UPDATE SET title=excluded.title, type=excluded.type, sort_order=excluded.sort_order, options_json=excluded.options_json;

INSERT INTO menu_customizations (id, tenant_id, key, title, type, sort_order, options_json)
SELECT 'custom_mod_jj_scallion', 'jiangjiejie', 'scallion-pref', '蔥', 'radio', 5, '[{"name":"不要","price":0,"is_default":false},{"name":"要","price":0,"is_default":false},{"name":"多","price":0,"is_default":false}]' WHERE EXISTS (SELECT 1 FROM tenants WHERE id = 'jiangjiejie')
ON CONFLICT(id) DO UPDATE SET title=excluded.title, type=excluded.type, sort_order=excluded.sort_order, options_json=excluded.options_json;

INSERT INTO menu_customizations (id, tenant_id, key, title, type, sort_order, options_json)
SELECT 'custom_mod_jj_sesame_oil', 'jiangjiejie', 'sesame-oil', '香油', 'radio', 6, '[{"name":"不要","price":0,"is_default":false},{"name":"小","price":0,"is_default":false},{"name":"正常","price":0,"is_default":false},{"name":"多","price":0,"is_default":false}]' WHERE EXISTS (SELECT 1 FROM tenants WHERE id = 'jiangjiejie')
ON CONFLICT(id) DO UPDATE SET title=excluded.title, type=excluded.type, sort_order=excluded.sort_order, options_json=excluded.options_json;

INSERT INTO menu_customizations (id, tenant_id, key, title, type, sort_order, options_json)
SELECT 'custom_mod_jj_veg_soup', 'jiangjiejie', 'vegetable-broth', '蔬菜湯', 'radio', 7, '[{"name":"極少","price":0,"is_default":false},{"name":"少","price":0,"is_default":false},{"name":"正常","price":0,"is_default":false},{"name":"多","price":0,"is_default":false}]' WHERE EXISTS (SELECT 1 FROM tenants WHERE id = 'jiangjiejie')
ON CONFLICT(id) DO UPDATE SET title=excluded.title, type=excluded.type, sort_order=excluded.sort_order, options_json=excluded.options_json;

INSERT INTO menu_customizations (id, tenant_id, key, title, type, sort_order, options_json)
SELECT 'custom_mod_jj_chicken_prep', 'jiangjiejie', 'chicken-preparation', '雞肉', 'radio', 8, '[{"name":"去骨","price":0,"is_default":false},{"name":"去皮","price":0,"is_default":false},{"name":"不去骨","price":0,"is_default":false}]' WHERE EXISTS (SELECT 1 FROM tenants WHERE id = 'jiangjiejie')
ON CONFLICT(id) DO UPDATE SET title=excluded.title, type=excluded.type, sort_order=excluded.sort_order, options_json=excluded.options_json;

INSERT INTO menu_customizations (id, tenant_id, key, title, type, sort_order, options_json)
SELECT 'custom_mod_jj_lemon_juice', 'jiangjiejie', 'special-lemon-juice', '特調檸檬汁（加檸檬汁需滿150元）', 'radio', 9, '[{"name":"不要","price":0,"is_default":false},{"name":"全部","price":0,"is_default":false,"min_order_amount":150},{"name":"各半","price":0,"is_default":false,"min_order_amount":150},{"name":"試吃","price":0,"is_default":false,"min_order_amount":150}]' WHERE EXISTS (SELECT 1 FROM tenants WHERE id = 'jiangjiejie')
ON CONFLICT(id) DO UPDATE SET title=excluded.title, type=excluded.type, sort_order=excluded.sort_order, options_json=excluded.options_json;

DELETE FROM menu_items WHERE tenant_id='jiangjiejie' AND category_id IN ('mod_jj_pepper', 'mod_jj_chili', 'mod_jj_ma', 'mod_jj_onion', 'mod_jj_garlic', 'mod_jj_scallion', 'mod_jj_sesame_oil', 'mod_jj_veg_soup', 'mod_jj_chicken_prep', 'mod_jj_lemon_juice');
DELETE FROM menu_categories WHERE tenant_id='jiangjiejie' AND id IN ('mod_jj_pepper', 'mod_jj_chili', 'mod_jj_ma', 'mod_jj_onion', 'mod_jj_garlic', 'mod_jj_scallion', 'mod_jj_sesame_oil', 'mod_jj_veg_soup', 'mod_jj_chicken_prep', 'mod_jj_lemon_juice');
-- The seven seeded catalog groups previously applied all ten seasoning modifiers.
UPDATE menu_categories SET allow_customization=0, applied_modifiers='[]' WHERE tenant_id='jiangjiejie' AND id IN ('cat_jj_combo','cat_jj_chicken','cat_jj_seafood','cat_jj_veggies','cat_jj_offal','cat_jj_braised','cat_jj_others') AND NOT EXISTS (SELECT 1 FROM menu_categories WHERE tenant_id='jiangjiejie' AND category_type='modifier');
