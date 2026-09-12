-- Migration: 0053_seed_dapinglin_bundle_rules.sql
-- Description: Seed Universal Bundle Selection Rules for dapinglin combos (vegetables, braised items, offal, signature dishes)

-- 1. 菜菜餐: 7 樣配菜 ($200)
INSERT INTO menu_bundle_rules (id, tenant_id, parent_item_id, schema_version, config_json)
VALUES (
    'rule_dpl_combo_v7',
    'dapinglin',
    'hjh_combo_v7',
    1,
    '{"version":1,"groups":[{"id":"side-dishes","label":{"zh-TW":"請選擇 7 樣配菜","vi":"Chọn 7 món ăn kèm"},"minQuantity":7,"maxQuantity":7,"allowRepeat":true,"sources":[{"type":"category","categoryId":"cat_hjh_veggie"},{"type":"category","categoryId":"cat_hjh_braised"},{"type":"category","categoryId":"cat_hjh_offal"},{"type":"category","categoryId":"cat_hjh_signature"}],"pricing":{"type":"included"}}]}'
)
ON CONFLICT(tenant_id, parent_item_id) DO UPDATE SET
    schema_version = excluded.schema_version,
    config_json = excluded.config_json,
    is_active = excluded.is_active;

-- 2. 菜菜餐: 11 樣配菜 ($300)
INSERT INTO menu_bundle_rules (id, tenant_id, parent_item_id, schema_version, config_json)
VALUES (
    'rule_dpl_combo_v11',
    'dapinglin',
    'hjh_combo_v11',
    1,
    '{"version":1,"groups":[{"id":"side-dishes","label":{"zh-TW":"請選擇 11 樣配菜","vi":"Chọn 11 món ăn kèm"},"minQuantity":11,"maxQuantity":11,"allowRepeat":true,"sources":[{"type":"category","categoryId":"cat_hjh_veggie"},{"type":"category","categoryId":"cat_hjh_braised"},{"type":"category","categoryId":"cat_hjh_offal"},{"type":"category","categoryId":"cat_hjh_signature"}],"pricing":{"type":"included"}}]}'
)
ON CONFLICT(tenant_id, parent_item_id) DO UPDATE SET
    schema_version = excluded.schema_version,
    config_json = excluded.config_json,
    is_active = excluded.is_active;

-- 3. 菜菜餐: 15 樣配菜 ($400)
INSERT INTO menu_bundle_rules (id, tenant_id, parent_item_id, schema_version, config_json)
VALUES (
    'rule_dpl_combo_v15',
    'dapinglin',
    'hjh_combo_v15',
    1,
    '{"version":1,"groups":[{"id":"side-dishes","label":{"zh-TW":"請選擇 15 樣配菜","vi":"Chọn 15 món ăn kèm"},"minQuantity":15,"maxQuantity":15,"allowRepeat":true,"sources":[{"type":"category","categoryId":"cat_hjh_veggie"},{"type":"category","categoryId":"cat_hjh_braised"},{"type":"category","categoryId":"cat_hjh_offal"},{"type":"category","categoryId":"cat_hjh_signature"}],"pricing":{"type":"included"}}]}'
)
ON CONFLICT(tenant_id, parent_item_id) DO UPDATE SET
    schema_version = excluded.schema_version,
    config_json = excluded.config_json,
    is_active = excluded.is_active;

-- 4. 套餐 A: 小份雞或嫩豬排 + 5樣配菜 ($200)
INSERT INTO menu_bundle_rules (id, tenant_id, parent_item_id, schema_version, config_json)
VALUES (
    'rule_dpl_combo_a',
    'dapinglin',
    'hjh_combo_a',
    1,
    '{"version":1,"groups":[{"id":"side-dishes","label":{"zh-TW":"請選擇 5 樣配菜","vi":"Chọn 5 món ăn kèm"},"minQuantity":5,"maxQuantity":5,"allowRepeat":true,"sources":[{"type":"category","categoryId":"cat_hjh_veggie"},{"type":"category","categoryId":"cat_hjh_braised"},{"type":"category","categoryId":"cat_hjh_offal"},{"type":"category","categoryId":"cat_hjh_signature"}],"pricing":{"type":"included"}}]}'
)
ON CONFLICT(tenant_id, parent_item_id) DO UPDATE SET
    schema_version = excluded.schema_version,
    config_json = excluded.config_json,
    is_active = excluded.is_active;

-- 5. 套餐 B: 小份天使胸 + 6樣配菜 ($250)
INSERT INTO menu_bundle_rules (id, tenant_id, parent_item_id, schema_version, config_json)
VALUES (
    'rule_dpl_combo_b',
    'dapinglin',
    'hjh_combo_b',
    1,
    '{"version":1,"groups":[{"id":"side-dishes","label":{"zh-TW":"請選擇 6 樣配菜","vi":"Chọn 6 món ăn kèm"},"minQuantity":6,"maxQuantity":6,"allowRepeat":true,"sources":[{"type":"category","categoryId":"cat_hjh_veggie"},{"type":"category","categoryId":"cat_hjh_braised"},{"type":"category","categoryId":"cat_hjh_offal"},{"type":"category","categoryId":"cat_hjh_signature"}],"pricing":{"type":"included"}}]}'
)
ON CONFLICT(tenant_id, parent_item_id) DO UPDATE SET
    schema_version = excluded.schema_version,
    config_json = excluded.config_json,
    is_active = excluded.is_active;

-- 6. 套餐 C: 小份雞 + 嫩豬排 + 6樣配菜 ($300)
INSERT INTO menu_bundle_rules (id, tenant_id, parent_item_id, schema_version, config_json)
VALUES (
    'rule_dpl_combo_c',
    'dapinglin',
    'hjh_combo_c',
    1,
    '{"version":1,"groups":[{"id":"side-dishes","label":{"zh-TW":"請選擇 6 樣配菜","vi":"Chọn 6 món ăn kèm"},"minQuantity":6,"maxQuantity":6,"allowRepeat":true,"sources":[{"type":"category","categoryId":"cat_hjh_veggie"},{"type":"category","categoryId":"cat_hjh_braised"},{"type":"category","categoryId":"cat_hjh_offal"},{"type":"category","categoryId":"cat_hjh_signature"}],"pricing":{"type":"included"}}]}'
)
ON CONFLICT(tenant_id, parent_item_id) DO UPDATE SET
    schema_version = excluded.schema_version,
    config_json = excluded.config_json,
    is_active = excluded.is_active;

-- 7. 套餐 D: 小份雞 + 嫩豬排 + 10樣配菜 ($400)
INSERT INTO menu_bundle_rules (id, tenant_id, parent_item_id, schema_version, config_json)
VALUES (
    'rule_dpl_combo_d',
    'dapinglin',
    'hjh_combo_d',
    1,
    '{"version":1,"groups":[{"id":"side-dishes","label":{"zh-TW":"請選擇 10 樣配菜","vi":"Chọn 10 món ăn kèm"},"minQuantity":10,"maxQuantity":10,"allowRepeat":true,"sources":[{"type":"category","categoryId":"cat_hjh_veggie"},{"type":"category","categoryId":"cat_hjh_braised"},{"type":"category","categoryId":"cat_hjh_offal"},{"type":"category","categoryId":"cat_hjh_signature"}],"pricing":{"type":"included"}}]}'
)
ON CONFLICT(tenant_id, parent_item_id) DO UPDATE SET
    schema_version = excluded.schema_version,
    config_json = excluded.config_json,
    is_active = excluded.is_active;

-- 8. 套餐 E: 小份天使胸 + 嫩豬排 + 9樣配菜 ($390)
INSERT INTO menu_bundle_rules (id, tenant_id, parent_item_id, schema_version, config_json)
VALUES (
    'rule_dpl_combo_e',
    'dapinglin',
    'hjh_combo_e',
    1,
    '{"version":1,"groups":[{"id":"side-dishes","label":{"zh-TW":"請選擇 9 樣配菜","vi":"Chọn 9 món ăn kèm"},"minQuantity":9,"maxQuantity":9,"allowRepeat":true,"sources":[{"type":"category","categoryId":"cat_hjh_veggie"},{"type":"category","categoryId":"cat_hjh_braised"},{"type":"category","categoryId":"cat_hjh_offal"},{"type":"category","categoryId":"cat_hjh_signature"}],"pricing":{"type":"included"}}]}'
)
ON CONFLICT(tenant_id, parent_item_id) DO UPDATE SET
    schema_version = excluded.schema_version,
    config_json = excluded.config_json,
    is_active = excluded.is_active;

-- 9. 套餐 F: 大份肉 + 6樣配菜 ($300)
INSERT INTO menu_bundle_rules (id, tenant_id, parent_item_id, schema_version, config_json)
VALUES (
    'rule_dpl_combo_f',
    'dapinglin',
    'hjh_combo_f',
    1,
    '{"version":1,"groups":[{"id":"side-dishes","label":{"zh-TW":"請選擇 6 樣配菜","vi":"Chọn 6 món ăn kèm"},"minQuantity":6,"maxQuantity":6,"allowRepeat":true,"sources":[{"type":"category","categoryId":"cat_hjh_veggie"},{"type":"category","categoryId":"cat_hjh_braised"},{"type":"category","categoryId":"cat_hjh_offal"},{"type":"category","categoryId":"cat_hjh_signature"}],"pricing":{"type":"included"}}]}'
)
ON CONFLICT(tenant_id, parent_item_id) DO UPDATE SET
    schema_version = excluded.schema_version,
    config_json = excluded.config_json,
    is_active = excluded.is_active;

-- 10. 套餐 G: 大份天使胸 + 4樣配菜 ($250)
INSERT INTO menu_bundle_rules (id, tenant_id, parent_item_id, schema_version, config_json)
VALUES (
    'rule_dpl_combo_g',
    'dapinglin',
    'hjh_combo_g',
    1,
    '{"version":1,"groups":[{"id":"side-dishes","label":{"zh-TW":"請選擇 4 樣配菜","vi":"Chọn 4 món ăn kèm"},"minQuantity":4,"maxQuantity":4,"allowRepeat":true,"sources":[{"type":"category","categoryId":"cat_hjh_veggie"},{"type":"category","categoryId":"cat_hjh_braised"},{"type":"category","categoryId":"cat_hjh_offal"},{"type":"category","categoryId":"cat_hjh_signature"}],"pricing":{"type":"included"}}]}'
)
ON CONFLICT(tenant_id, parent_item_id) DO UPDATE SET
    schema_version = excluded.schema_version,
    config_json = excluded.config_json,
    is_active = excluded.is_active;

-- 11. 套餐 H: 大份肉 + 嫩豬排 + 8樣配菜 ($400)
INSERT INTO menu_bundle_rules (id, tenant_id, parent_item_id, schema_version, config_json)
VALUES (
    'rule_dpl_combo_h',
    'dapinglin',
    'hjh_combo_h',
    1,
    '{"version":1,"groups":[{"id":"side-dishes","label":{"zh-TW":"請選擇 8 樣配菜","vi":"Chọn 8 món ăn kèm"},"minQuantity":8,"maxQuantity":8,"allowRepeat":true,"sources":[{"type":"category","categoryId":"cat_hjh_veggie"},{"type":"category","categoryId":"cat_hjh_braised"},{"type":"category","categoryId":"cat_hjh_offal"},{"type":"category","categoryId":"cat_hjh_signature"}],"pricing":{"type":"included"}}]}'
)
ON CONFLICT(tenant_id, parent_item_id) DO UPDATE SET
    schema_version = excluded.schema_version,
    config_json = excluded.config_json,
    is_active = excluded.is_active;

-- 12. 分享餐 1: 雙倍大份雞 + 10樣配菜 ($550)
INSERT INTO menu_bundle_rules (id, tenant_id, parent_item_id, schema_version, config_json)
VALUES (
    'rule_dpl_combo_share_1',
    'dapinglin',
    'hjh_combo_share_1',
    1,
    '{"version":1,"groups":[{"id":"side-dishes","label":{"zh-TW":"請選擇 10 樣配菜","vi":"Chọn 10 món ăn kèm"},"minQuantity":10,"maxQuantity":10,"allowRepeat":true,"sources":[{"type":"category","categoryId":"cat_hjh_veggie"},{"type":"category","categoryId":"cat_hjh_braised"},{"type":"category","categoryId":"cat_hjh_offal"},{"type":"category","categoryId":"cat_hjh_signature"}],"pricing":{"type":"included"}}]}'
)
ON CONFLICT(tenant_id, parent_item_id) DO UPDATE SET
    schema_version = excluded.schema_version,
    config_json = excluded.config_json,
    is_active = excluded.is_active;

-- 13. 分享餐 2: 雙倍大份雞 + 12樣配菜 ($600)
INSERT INTO menu_bundle_rules (id, tenant_id, parent_item_id, schema_version, config_json)
VALUES (
    'rule_dpl_combo_share_2',
    'dapinglin',
    'hjh_combo_share_2',
    1,
    '{"version":1,"groups":[{"id":"side-dishes","label":{"zh-TW":"請選擇 12 樣配菜","vi":"Chọn 12 món ăn kèm"},"minQuantity":12,"maxQuantity":12,"allowRepeat":true,"sources":[{"type":"category","categoryId":"cat_hjh_veggie"},{"type":"category","categoryId":"cat_hjh_braised"},{"type":"category","categoryId":"cat_hjh_offal"},{"type":"category","categoryId":"cat_hjh_signature"}],"pricing":{"type":"included"}}]}'
)
ON CONFLICT(tenant_id, parent_item_id) DO UPDATE SET
    schema_version = excluded.schema_version,
    config_json = excluded.config_json,
    is_active = excluded.is_active;

-- 14. 分享餐 3: 大份雞 + 13樣配菜 ($500)
INSERT INTO menu_bundle_rules (id, tenant_id, parent_item_id, schema_version, config_json)
VALUES (
    'rule_dpl_combo_share_3',
    'dapinglin',
    'hjh_combo_share_3',
    1,
    '{"version":1,"groups":[{"id":"side-dishes","label":{"zh-TW":"請選擇 13 樣配菜","vi":"Chọn 13 món ăn kèm"},"minQuantity":13,"maxQuantity":13,"allowRepeat":true,"sources":[{"type":"category","categoryId":"cat_hjh_veggie"},{"type":"category","categoryId":"cat_hjh_braised"},{"type":"category","categoryId":"cat_hjh_offal"},{"type":"category","categoryId":"cat_hjh_signature"}],"pricing":{"type":"included"}}]}'
)
ON CONFLICT(tenant_id, parent_item_id) DO UPDATE SET
    schema_version = excluded.schema_version,
    config_json = excluded.config_json,
    is_active = excluded.is_active;

-- 15. 分享餐 4: 大份雞 + 17樣配菜 ($600)
INSERT INTO menu_bundle_rules (id, tenant_id, parent_item_id, schema_version, config_json)
VALUES (
    'rule_dpl_combo_share_4',
    'dapinglin',
    'hjh_combo_share_4',
    1,
    '{"version":1,"groups":[{"id":"side-dishes","label":{"zh-TW":"請選擇 17 樣配菜","vi":"Chọn 17 món ăn kèm"},"minQuantity":17,"maxQuantity":17,"allowRepeat":true,"sources":[{"type":"category","categoryId":"cat_hjh_veggie"},{"type":"category","categoryId":"cat_hjh_braised"},{"type":"category","categoryId":"cat_hjh_offal"},{"type":"category","categoryId":"cat_hjh_signature"}],"pricing":{"type":"included"}}]}'
)
ON CONFLICT(tenant_id, parent_item_id) DO UPDATE SET
    schema_version = excluded.schema_version,
    config_json = excluded.config_json,
    is_active = excluded.is_active;

-- 16. 分享餐 5: 大份雞 + 20樣配菜 ($690)
INSERT INTO menu_bundle_rules (id, tenant_id, parent_item_id, schema_version, config_json)
VALUES (
    'rule_dpl_combo_share_5',
    'dapinglin',
    'hjh_combo_share_5',
    1,
    '{"version":1,"groups":[{"id":"side-dishes","label":{"zh-TW":"請選擇 20 樣配菜","vi":"Chọn 20 món ăn kèm"},"minQuantity":20,"maxQuantity":20,"allowRepeat":true,"sources":[{"type":"category","categoryId":"cat_hjh_veggie"},{"type":"category","categoryId":"cat_hjh_braised"},{"type":"category","categoryId":"cat_hjh_offal"},{"type":"category","categoryId":"cat_hjh_signature"}],"pricing":{"type":"included"}}]}'
)
ON CONFLICT(tenant_id, parent_item_id) DO UPDATE SET
    schema_version = excluded.schema_version,
    config_json = excluded.config_json,
    is_active = excluded.is_active;
