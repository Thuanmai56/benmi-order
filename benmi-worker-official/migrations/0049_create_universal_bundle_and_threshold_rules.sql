-- Migration: 0049_create_universal_bundle_and_threshold_rules.sql
-- Description: Create Universal F&B Bundle Rules, Customization Option Threshold Rules, and seed rules for jiangjiejie

-- 1. Create menu_bundle_rules table
CREATE TABLE IF NOT EXISTS menu_bundle_rules (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    parent_item_id TEXT NOT NULL,
    schema_version INTEGER NOT NULL DEFAULT 1,
    config_json TEXT NOT NULL,
    is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    FOREIGN KEY (parent_item_id) REFERENCES menu_items(id) ON DELETE CASCADE,
    UNIQUE (tenant_id, parent_item_id)
);

CREATE INDEX IF NOT EXISTS idx_menu_bundle_rules_lookup
ON menu_bundle_rules (tenant_id, parent_item_id, is_active);

-- 2. Create menu_customization_option_rules table
CREATE TABLE IF NOT EXISTS menu_customization_option_rules (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    customization_key TEXT NOT NULL,
    option_id TEXT NOT NULL,
    rule_type TEXT NOT NULL DEFAULT 'min_order_subtotal',
    min_order_subtotal REAL NOT NULL CHECK (min_order_subtotal >= 0),
    threshold_basis TEXT NOT NULL DEFAULT 'merchandise_subtotal_after_pricing',
    error_message TEXT,
    is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (tenant_id, customization_key, option_id, rule_type)
);

CREATE INDEX IF NOT EXISTS idx_customization_option_rules_lookup
ON menu_customization_option_rules (tenant_id, customization_key, option_id, is_active);

-- 3. Add bundle_snapshot_json to order_items for immutable order history
ALTER TABLE order_items ADD COLUMN bundle_snapshot_json TEXT DEFAULT NULL;

-- 4. Update stable option IDs for jiangjiejie in menu_customizations
UPDATE menu_customizations
SET options_json = '[{"id":"onion_none","name":"不要","price":0,"is_default":false},{"id":"onion_regular","name":"要","price":0,"is_default":false,"min_order_amount":100},{"id":"onion_extra","name":"多","price":20,"is_default":false,"min_order_amount":100}]'
WHERE tenant_id = 'jiangjiejie' AND key = 'onion-pref';

UPDATE menu_customizations
SET options_json = '[{"id":"lemon_none","name":"不要","price":0,"is_default":false},{"id":"lemon_all","name":"全部","price":0,"is_default":false,"min_order_amount":150},{"id":"lemon_half","name":"各半","price":0,"is_default":false,"min_order_amount":150},{"id":"lemon_taste","name":"試吃","price":0,"is_default":false,"min_order_amount":150}]'
WHERE tenant_id = 'jiangjiejie' AND key = 'special-lemon-juice';

-- 5. Seed Threshold Rules for jiangjiejie
INSERT INTO menu_customization_option_rules (id, tenant_id, customization_key, option_id, rule_type, min_order_subtotal, error_message)
VALUES
    ('rule_jj_onion_regular', 'jiangjiejie', 'onion-pref', 'onion_regular', 'min_order_subtotal', 100, '洋蔥「要」需消費滿 $100 元方可選擇'),
    ('rule_jj_onion_extra', 'jiangjiejie', 'onion-pref', 'onion_extra', 'min_order_subtotal', 100, '洋蔥「多」需消費滿 $100 元方可選擇'),
    ('rule_jj_lemon_all', 'jiangjiejie', 'special-lemon-juice', 'lemon_all', 'min_order_subtotal', 150, '特調檸檬汁「全部」需消費滿 $150 元方可選擇'),
    ('rule_jj_lemon_half', 'jiangjiejie', 'special-lemon-juice', 'lemon_half', 'min_order_subtotal', 150, '特調檸檬汁「各半」需消費滿 $150 元方可選擇'),
    ('rule_jj_lemon_taste', 'jiangjiejie', 'special-lemon-juice', 'lemon_taste', 'min_order_subtotal', 150, '特調檸檬汁「試吃」需消費滿 $150 元方可選擇')
ON CONFLICT(tenant_id, customization_key, option_id, rule_type) DO UPDATE SET
    min_order_subtotal = excluded.min_order_subtotal,
    error_message = excluded.error_message,
    is_active = excluded.is_active;

-- 6. Seed Bundle Rules for the 7 Combos of jiangjiejie
-- Combo A1: 3隻鹹水雞翅 + 6樣菜 ($150)
INSERT INTO menu_bundle_rules (id, tenant_id, parent_item_id, schema_version, config_json)
VALUES (
    'rule_jj_combo_a1',
    'jiangjiejie',
    'jj_combo_a1',
    1,
    '{"version":1,"groups":[{"id":"side-dishes","label":{"zh-TW":"請選擇 6 樣配菜","vi":"Chọn 6 món ăn kèm"},"minQuantity":6,"maxQuantity":6,"allowRepeat":true,"sources":[{"type":"category","categoryId":"cat_jj_seafood"},{"type":"category","categoryId":"cat_jj_veggies"},{"type":"category","categoryId":"cat_jj_offal"},{"type":"category","categoryId":"cat_jj_braised"},{"type":"category","categoryId":"cat_jj_others"}],"pricing":{"type":"included"}}]}'
)
ON CONFLICT(tenant_id, parent_item_id) DO UPDATE SET
    schema_version = excluded.schema_version,
    config_json = excluded.config_json,
    is_active = excluded.is_active;

-- Combo A2: 2隻煙燻雞翅 + 6樣菜 ($150)
INSERT INTO menu_bundle_rules (id, tenant_id, parent_item_id, schema_version, config_json)
VALUES (
    'rule_jj_combo_a2',
    'jiangjiejie',
    'jj_combo_a2',
    1,
    '{"version":1,"groups":[{"id":"side-dishes","label":{"zh-TW":"請選擇 6 樣配菜","vi":"Chọn 6 món ăn kèm"},"minQuantity":6,"maxQuantity":6,"allowRepeat":true,"sources":[{"type":"category","categoryId":"cat_jj_seafood"},{"type":"category","categoryId":"cat_jj_veggies"},{"type":"category","categoryId":"cat_jj_offal"},{"type":"category","categoryId":"cat_jj_braised"},{"type":"category","categoryId":"cat_jj_others"}],"pricing":{"type":"included"}}]}'
)
ON CONFLICT(tenant_id, parent_item_id) DO UPDATE SET
    schema_version = excluded.schema_version,
    config_json = excluded.config_json,
    is_active = excluded.is_active;

-- Combo B: 1個鹹水雞胸 + 10樣菜 ($250)
INSERT INTO menu_bundle_rules (id, tenant_id, parent_item_id, schema_version, config_json)
VALUES (
    'rule_jj_combo_b',
    'jiangjiejie',
    'jj_combo_b',
    1,
    '{"version":1,"groups":[{"id":"side-dishes","label":{"zh-TW":"請選擇 10 樣配菜","vi":"Chọn 10 món ăn kèm"},"minQuantity":10,"maxQuantity":10,"allowRepeat":true,"sources":[{"type":"category","categoryId":"cat_jj_seafood"},{"type":"category","categoryId":"cat_jj_veggies"},{"type":"category","categoryId":"cat_jj_offal"},{"type":"category","categoryId":"cat_jj_braised"},{"type":"category","categoryId":"cat_jj_others"}],"pricing":{"type":"included"}}]}'
)
ON CONFLICT(tenant_id, parent_item_id) DO UPDATE SET
    schema_version = excluded.schema_version,
    config_json = excluded.config_json,
    is_active = excluded.is_active;

-- Combo C: 8樣菜 ($150)
INSERT INTO menu_bundle_rules (id, tenant_id, parent_item_id, schema_version, config_json)
VALUES (
    'rule_jj_combo_c',
    'jiangjiejie',
    'jj_combo_c',
    1,
    '{"version":1,"groups":[{"id":"side-dishes","label":{"zh-TW":"請選擇 8 樣配菜","vi":"Chọn 8 món ăn kèm"},"minQuantity":8,"maxQuantity":8,"allowRepeat":true,"sources":[{"type":"category","categoryId":"cat_jj_seafood"},{"type":"category","categoryId":"cat_jj_veggies"},{"type":"category","categoryId":"cat_jj_offal"},{"type":"category","categoryId":"cat_jj_braised"},{"type":"category","categoryId":"cat_jj_others"}],"pricing":{"type":"included"}}]}'
)
ON CONFLICT(tenant_id, parent_item_id) DO UPDATE SET
    schema_version = excluded.schema_version,
    config_json = excluded.config_json,
    is_active = excluded.is_active;

-- Combo E: 11樣菜 ($200)
INSERT INTO menu_bundle_rules (id, tenant_id, parent_item_id, schema_version, config_json)
VALUES (
    'rule_jj_combo_e',
    'jiangjiejie',
    'jj_combo_e',
    1,
    '{"version":1,"groups":[{"id":"side-dishes","label":{"zh-TW":"請選擇 11 樣配菜","vi":"Chọn 11 món ăn kèm"},"minQuantity":11,"maxQuantity":11,"allowRepeat":true,"sources":[{"type":"category","categoryId":"cat_jj_seafood"},{"type":"category","categoryId":"cat_jj_veggies"},{"type":"category","categoryId":"cat_jj_offal"},{"type":"category","categoryId":"cat_jj_braised"},{"type":"category","categoryId":"cat_jj_others"}],"pricing":{"type":"included"}}]}'
)
ON CONFLICT(tenant_id, parent_item_id) DO UPDATE SET
    schema_version = excluded.schema_version,
    config_json = excluded.config_json,
    is_active = excluded.is_active;

-- Combo Family 1: 鹹水半隻 + 12樣菜 ($350)
INSERT INTO menu_bundle_rules (id, tenant_id, parent_item_id, schema_version, config_json)
VALUES (
    'rule_jj_combo_family_1',
    'jiangjiejie',
    'jj_combo_family_1',
    1,
    '{"version":1,"groups":[{"id":"side-dishes","label":{"zh-TW":"請選擇 12 樣配菜","vi":"Chọn 12 món ăn kèm"},"minQuantity":12,"maxQuantity":12,"allowRepeat":true,"sources":[{"type":"category","categoryId":"cat_jj_seafood"},{"type":"category","categoryId":"cat_jj_veggies"},{"type":"category","categoryId":"cat_jj_offal"},{"type":"category","categoryId":"cat_jj_braised"},{"type":"category","categoryId":"cat_jj_others"}],"pricing":{"type":"included"}}]}'
)
ON CONFLICT(tenant_id, parent_item_id) DO UPDATE SET
    schema_version = excluded.schema_version,
    config_json = excluded.config_json,
    is_active = excluded.is_active;

-- Combo Family 2: 煙燻半隻 + 11樣菜 ($350)
INSERT INTO menu_bundle_rules (id, tenant_id, parent_item_id, schema_version, config_json)
VALUES (
    'rule_jj_combo_family_2',
    'jiangjiejie',
    'jj_combo_family_2',
    1,
    '{"version":1,"groups":[{"id":"side-dishes","label":{"zh-TW":"請選擇 11 樣配菜","vi":"Chọn 11 món ăn kèm"},"minQuantity":11,"maxQuantity":11,"allowRepeat":true,"sources":[{"type":"category","categoryId":"cat_jj_seafood"},{"type":"category","categoryId":"cat_jj_veggies"},{"type":"category","categoryId":"cat_jj_offal"},{"type":"category","categoryId":"cat_jj_braised"},{"type":"category","categoryId":"cat_jj_others"}],"pricing":{"type":"included"}}]}'
)
ON CONFLICT(tenant_id, parent_item_id) DO UPDATE SET
    schema_version = excluded.schema_version,
    config_json = excluded.config_json,
    is_active = excluded.is_active;
