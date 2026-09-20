-- Migration: 0059_seed_haoshiguoshao_bundle_rules.sql
-- Description: Convert haoshiguoshao guoshao noodles to bundle rules for mandatory noodle selection (意麵, 冬粉, 烏龍, 泡飯, 油麵)

-- 1. Update menu_categories for cat_hs_guoshao to only apply add-ons (mod_hs_guoshao_addons)
-- Noodle selection is now strictly enforced via bundle builder rules
UPDATE menu_categories
SET applied_modifiers = '["mod_hs_guoshao_addons"]'
WHERE tenant_id = 'haoshiguoshao' AND id = 'cat_hs_guoshao';

-- 2. Seed Universal Bundle Selection Rules for all 10 Guoshao noodle flavors
-- Parent item IDs: hs_gs_01 ~ hs_gs_10
INSERT INTO menu_bundle_rules (id, tenant_id, parent_item_id, schema_version, config_json)
VALUES
('rule_hs_bundle_gs_01', 'haoshiguoshao', 'hs_gs_01', 1, '{"version":1,"groups":[{"id":"noodle-type","name":"麵體","label":{"zh-TW":"請選擇 1 樣麵體","vi":"Chọn 1 loại mì"},"minQuantity":1,"maxQuantity":1,"allowRepeat":false,"sources":[{"type":"category","categoryId":"mod_hs_noodle_type"}],"pricing":{"type":"included"}}]}'),
('rule_hs_bundle_gs_02', 'haoshiguoshao', 'hs_gs_02', 1, '{"version":1,"groups":[{"id":"noodle-type","name":"麵體","label":{"zh-TW":"請選擇 1 樣麵體","vi":"Chọn 1 loại mì"},"minQuantity":1,"maxQuantity":1,"allowRepeat":false,"sources":[{"type":"category","categoryId":"mod_hs_noodle_type"}],"pricing":{"type":"included"}}]}'),
('rule_hs_bundle_gs_03', 'haoshiguoshao', 'hs_gs_03', 1, '{"version":1,"groups":[{"id":"noodle-type","name":"麵體","label":{"zh-TW":"請選擇 1 樣麵體","vi":"Chọn 1 loại mì"},"minQuantity":1,"maxQuantity":1,"allowRepeat":false,"sources":[{"type":"category","categoryId":"mod_hs_noodle_type"}],"pricing":{"type":"included"}}]}'),
('rule_hs_bundle_gs_04', 'haoshiguoshao', 'hs_gs_04', 1, '{"version":1,"groups":[{"id":"noodle-type","name":"麵體","label":{"zh-TW":"請選擇 1 樣麵體","vi":"Chọn 1 loại mì"},"minQuantity":1,"maxQuantity":1,"allowRepeat":false,"sources":[{"type":"category","categoryId":"mod_hs_noodle_type"}],"pricing":{"type":"included"}}]}'),
('rule_hs_bundle_gs_05', 'haoshiguoshao', 'hs_gs_05', 1, '{"version":1,"groups":[{"id":"noodle-type","name":"麵體","label":{"zh-TW":"請選擇 1 樣麵體","vi":"Chọn 1 loại mì"},"minQuantity":1,"maxQuantity":1,"allowRepeat":false,"sources":[{"type":"category","categoryId":"mod_hs_noodle_type"}],"pricing":{"type":"included"}}]}'),
('rule_hs_bundle_gs_06', 'haoshiguoshao', 'hs_gs_06', 1, '{"version":1,"groups":[{"id":"noodle-type","name":"麵體","label":{"zh-TW":"請選擇 1 樣麵體","vi":"Chọn 1 loại mì"},"minQuantity":1,"maxQuantity":1,"allowRepeat":false,"sources":[{"type":"category","categoryId":"mod_hs_noodle_type"}],"pricing":{"type":"included"}}]}'),
('rule_hs_bundle_gs_07', 'haoshiguoshao', 'hs_gs_07', 1, '{"version":1,"groups":[{"id":"noodle-type","name":"麵體","label":{"zh-TW":"請選擇 1 樣麵體","vi":"Chọn 1 loại mì"},"minQuantity":1,"maxQuantity":1,"allowRepeat":false,"sources":[{"type":"category","categoryId":"mod_hs_noodle_type"}],"pricing":{"type":"included"}}]}'),
('rule_hs_bundle_gs_08', 'haoshiguoshao', 'hs_gs_08', 1, '{"version":1,"groups":[{"id":"noodle-type","name":"麵體","label":{"zh-TW":"請選擇 1 樣麵體","vi":"Chọn 1 loại mì"},"minQuantity":1,"maxQuantity":1,"allowRepeat":false,"sources":[{"type":"category","categoryId":"mod_hs_noodle_type"}],"pricing":{"type":"included"}}]}'),
('rule_hs_bundle_gs_09', 'haoshiguoshao', 'hs_gs_09', 1, '{"version":1,"groups":[{"id":"noodle-type","name":"麵體","label":{"zh-TW":"請選擇 1 樣麵體","vi":"Chọn 1 loại mì"},"minQuantity":1,"maxQuantity":1,"allowRepeat":false,"sources":[{"type":"category","categoryId":"mod_hs_noodle_type"}],"pricing":{"type":"included"}}]}'),
('rule_hs_bundle_gs_10', 'haoshiguoshao', 'hs_gs_10', 1, '{"version":1,"groups":[{"id":"noodle-type","name":"麵體","label":{"zh-TW":"請選擇 1 樣麵體","vi":"Chọn 1 loại mì"},"minQuantity":1,"maxQuantity":1,"allowRepeat":false,"sources":[{"type":"category","categoryId":"mod_hs_noodle_type"}],"pricing":{"type":"included"}}]}')
ON CONFLICT(tenant_id, parent_item_id) DO UPDATE SET
    schema_version = excluded.schema_version,
    config_json = excluded.config_json,
    is_active = excluded.is_active;
