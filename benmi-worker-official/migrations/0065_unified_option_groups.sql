-- Additive schema. Legacy snapshots are immutable; archived bundle rules remain for audit.
ALTER TABLE modifier_groups ADD COLUMN allow_repeats INTEGER NOT NULL DEFAULT 0;
ALTER TABLE modifier_groups ADD COLUMN included INTEGER NOT NULL DEFAULT 0;
ALTER TABLE modifier_groups ADD COLUMN sources_json TEXT NOT NULL DEFAULT '[]';
ALTER TABLE modifier_groups ADD COLUMN labels_json TEXT NOT NULL DEFAULT '{}';
ALTER TABLE modifier_groups ADD COLUMN revision INTEGER NOT NULL DEFAULT 0;
ALTER TABLE modifier_options ADD COLUMN product_id TEXT DEFAULT NULL;
ALTER TABLE modifier_options ADD COLUMN included_quantity INTEGER NOT NULL DEFAULT 1;
ALTER TABLE item_modifier_links ADD COLUMN option_ids_json TEXT DEFAULT NULL;
ALTER TABLE item_modifier_links ADD COLUMN is_disabled INTEGER NOT NULL DEFAULT 0;
ALTER TABLE menu_items ADD COLUMN menu_revision INTEGER NOT NULL DEFAULT 0;
ALTER TABLE menu_items ADD COLUMN image_key TEXT DEFAULT NULL;
CREATE INDEX idx_modifier_product ON modifier_options(tenant_id, product_id);

-- Every legacy rule becomes one or more ordinary, independently editable groups.
INSERT INTO modifier_groups (id,tenant_id,name,selection_type,is_required,min_selection,max_selection,sort_order,scope,allow_repeats,included,sources_json,labels_json,source_metadata_json)
SELECT 'ug_'||r.id||'_'||j.key,r.tenant_id,
 COALESCE(json_extract(j.value,'$.name'),json_extract(j.value,'$.label."zh-TW"'),json_extract(j.value,'$.label.vi'),'Options'),
 'multiple',1,
 CASE WHEN json_extract(j.value,'$.type')='fixed' THEN (SELECT SUM(COALESCE(json_extract(v.value,'$.quantity'),1)) FROM json_each(j.value,'$.items') v) ELSE COALESCE(json_extract(j.value,'$.minQuantity'),json_extract(j.value,'$.minSelections'),json_extract(j.value,'$.requiredCount'),1) END,
 CASE WHEN json_extract(j.value,'$.type')='fixed' THEN (SELECT SUM(COALESCE(json_extract(v.value,'$.quantity'),1)) FROM json_each(j.value,'$.items') v) ELSE COALESCE(json_extract(j.value,'$.maxQuantity'),json_extract(j.value,'$.maxSelections'),json_extract(j.value,'$.requiredCount'),1) END,
 j.key,'item',COALESCE(json_extract(j.value,'$.allowRepeats'),json_extract(j.value,'$.allowRepeat'),0),
 COALESCE(json_extract(j.value,'$.type')='fixed',0),
 COALESCE(json_extract(j.value,'$.sources'),'[]'),COALESCE(json_extract(j.value,'$.label'),'{}'),
 json_object('legacyBundleRuleId',r.id,'legacyGroupId',json_extract(j.value,'$.id'),'legacySurcharges',json(COALESCE(json_extract(j.value,'$.surcharges'),'{}')))
FROM menu_bundle_rules r,json_each(r.config_json,'$.groups') j WHERE r.is_active=1;

INSERT INTO modifier_options (id,tenant_id,group_id,name,price,product_id,included_quantity,sort_order)
SELECT 'uo_'||r.id||'_'||j.key||'_'||v.key,r.tenant_id,'ug_'||r.id||'_'||j.key,p.name,
 COALESCE(json_extract(v.value,'$.surcharge'),0),p.id,COALESCE(json_extract(v.value,'$.quantity'),1),v.key
FROM menu_bundle_rules r,json_each(r.config_json,'$.groups') j,json_each(j.value,'$.items') v
JOIN menu_items p ON p.id=json_extract(v.value,'$.itemId') AND p.tenant_id=r.tenant_id
WHERE r.is_active=1 AND json_extract(j.value,'$.type')='fixed';

INSERT INTO item_modifier_links (tenant_id,item_id,group_id,sort_order)
SELECT r.tenant_id,r.parent_item_id,'ug_'||r.id||'_'||j.key,j.key
FROM menu_bundle_rules r,json_each(r.config_json,'$.groups') j WHERE r.is_active=1;
-- Preserve menu_bundle_rules.is_active=1 so legacy read rollback remains 100% functional while canonical reads ignore menu_bundle_rules.

-- Catalog-wide optimistic guard also covers concurrent stock/category edits.
CREATE TABLE menu_catalog_revisions (tenant_id TEXT PRIMARY KEY, revision INTEGER NOT NULL DEFAULT 0);
INSERT INTO menu_catalog_revisions(tenant_id) SELECT DISTINCT tenant_id FROM menu_items;
CREATE TABLE menu_write_guards (id TEXT PRIMARY KEY, valid INTEGER NOT NULL CHECK(valid=1));
CREATE TRIGGER unified_menu_items_insert AFTER INSERT ON menu_items BEGIN INSERT INTO menu_catalog_revisions (tenant_id,revision) VALUES (NEW.tenant_id,1) ON CONFLICT(tenant_id) DO UPDATE SET revision=revision+1; END;
CREATE TRIGGER unified_menu_items_update AFTER UPDATE ON menu_items BEGIN INSERT INTO menu_catalog_revisions (tenant_id,revision) VALUES (NEW.tenant_id,1) ON CONFLICT(tenant_id) DO UPDATE SET revision=revision+1; END;
CREATE TRIGGER unified_menu_items_delete AFTER DELETE ON menu_items BEGIN INSERT INTO menu_catalog_revisions (tenant_id,revision) VALUES (OLD.tenant_id,1) ON CONFLICT(tenant_id) DO UPDATE SET revision=revision+1; END;
CREATE TRIGGER unified_menu_categories_insert AFTER INSERT ON menu_categories BEGIN INSERT INTO menu_catalog_revisions (tenant_id,revision) VALUES (NEW.tenant_id,1) ON CONFLICT(tenant_id) DO UPDATE SET revision=revision+1; END;
CREATE TRIGGER unified_menu_categories_update AFTER UPDATE ON menu_categories BEGIN INSERT INTO menu_catalog_revisions (tenant_id,revision) VALUES (NEW.tenant_id,1) ON CONFLICT(tenant_id) DO UPDATE SET revision=revision+1; END;
CREATE TRIGGER unified_menu_categories_delete AFTER DELETE ON menu_categories BEGIN INSERT INTO menu_catalog_revisions (tenant_id,revision) VALUES (OLD.tenant_id,1) ON CONFLICT(tenant_id) DO UPDATE SET revision=revision+1; END;
CREATE TRIGGER unified_modifier_groups_insert AFTER INSERT ON modifier_groups BEGIN INSERT INTO menu_catalog_revisions (tenant_id,revision) VALUES (NEW.tenant_id,1) ON CONFLICT(tenant_id) DO UPDATE SET revision=revision+1; END;
CREATE TRIGGER unified_modifier_groups_update AFTER UPDATE ON modifier_groups BEGIN INSERT INTO menu_catalog_revisions (tenant_id,revision) VALUES (NEW.tenant_id,1) ON CONFLICT(tenant_id) DO UPDATE SET revision=revision+1; END;
CREATE TRIGGER unified_modifier_groups_delete AFTER DELETE ON modifier_groups BEGIN INSERT INTO menu_catalog_revisions (tenant_id,revision) VALUES (OLD.tenant_id,1) ON CONFLICT(tenant_id) DO UPDATE SET revision=revision+1; END;
CREATE TRIGGER unified_modifier_options_insert AFTER INSERT ON modifier_options BEGIN INSERT INTO menu_catalog_revisions (tenant_id,revision) VALUES (NEW.tenant_id,1) ON CONFLICT(tenant_id) DO UPDATE SET revision=revision+1; END;
CREATE TRIGGER unified_modifier_options_update AFTER UPDATE ON modifier_options BEGIN INSERT INTO menu_catalog_revisions (tenant_id,revision) VALUES (NEW.tenant_id,1) ON CONFLICT(tenant_id) DO UPDATE SET revision=revision+1; END;
CREATE TRIGGER unified_modifier_options_delete AFTER DELETE ON modifier_options BEGIN INSERT INTO menu_catalog_revisions (tenant_id,revision) VALUES (OLD.tenant_id,1) ON CONFLICT(tenant_id) DO UPDATE SET revision=revision+1; END;
CREATE TRIGGER unified_item_modifier_links_insert AFTER INSERT ON item_modifier_links BEGIN INSERT INTO menu_catalog_revisions (tenant_id,revision) VALUES (NEW.tenant_id,1) ON CONFLICT(tenant_id) DO UPDATE SET revision=revision+1; END;
CREATE TRIGGER unified_item_modifier_links_update AFTER UPDATE ON item_modifier_links BEGIN INSERT INTO menu_catalog_revisions (tenant_id,revision) VALUES (NEW.tenant_id,1) ON CONFLICT(tenant_id) DO UPDATE SET revision=revision+1; END;
CREATE TRIGGER unified_item_modifier_links_delete AFTER DELETE ON item_modifier_links BEGIN INSERT INTO menu_catalog_revisions (tenant_id,revision) VALUES (OLD.tenant_id,1) ON CONFLICT(tenant_id) DO UPDATE SET revision=revision+1; END;
CREATE TRIGGER unified_category_modifier_links_insert AFTER INSERT ON category_modifier_links BEGIN INSERT INTO menu_catalog_revisions (tenant_id,revision) VALUES (NEW.tenant_id,1) ON CONFLICT(tenant_id) DO UPDATE SET revision=revision+1; END;
CREATE TRIGGER unified_category_modifier_links_update AFTER UPDATE ON category_modifier_links BEGIN INSERT INTO menu_catalog_revisions (tenant_id,revision) VALUES (NEW.tenant_id,1) ON CONFLICT(tenant_id) DO UPDATE SET revision=revision+1; END;
CREATE TRIGGER unified_category_modifier_links_delete AFTER DELETE ON category_modifier_links BEGIN INSERT INTO menu_catalog_revisions (tenant_id,revision) VALUES (OLD.tenant_id,1) ON CONFLICT(tenant_id) DO UPDATE SET revision=revision+1; END;

-- Legacy menu/stock writers must also invalidate entity revisions.
CREATE TRIGGER unified_legacy_item_revision AFTER UPDATE ON menu_items WHEN NEW.menu_revision=OLD.menu_revision BEGIN UPDATE menu_items SET menu_revision=menu_revision+1 WHERE id=NEW.id; END;
