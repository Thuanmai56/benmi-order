-- Extend lifecycle fences to the canonical menu and LINE projection tables.
-- Keep DELETE available for the existing purge flow; revision bookkeeping is not fenced.
CREATE TRIGGER lifecycle_modifier_groups_insert BEFORE INSERT ON modifier_groups
WHEN EXISTS(SELECT 1 FROM tenant_lifecycle WHERE tenant_id=NEW.tenant_id AND state<>'active')
BEGIN SELECT RAISE(ABORT,'TENANT_DELETED'); END;
CREATE TRIGGER lifecycle_modifier_groups_update BEFORE UPDATE ON modifier_groups
WHEN EXISTS(SELECT 1 FROM tenant_lifecycle WHERE tenant_id=NEW.tenant_id AND state<>'active') OR EXISTS(SELECT 1 FROM tenant_lifecycle WHERE tenant_id=OLD.tenant_id AND state<>'active')
BEGIN SELECT RAISE(ABORT,'TENANT_DELETED'); END;
CREATE TRIGGER lifecycle_modifier_options_insert BEFORE INSERT ON modifier_options
WHEN EXISTS(SELECT 1 FROM tenant_lifecycle WHERE tenant_id=NEW.tenant_id AND state<>'active')
BEGIN SELECT RAISE(ABORT,'TENANT_DELETED'); END;
CREATE TRIGGER lifecycle_modifier_options_update BEFORE UPDATE ON modifier_options
WHEN EXISTS(SELECT 1 FROM tenant_lifecycle WHERE tenant_id=NEW.tenant_id AND state<>'active') OR EXISTS(SELECT 1 FROM tenant_lifecycle WHERE tenant_id=OLD.tenant_id AND state<>'active')
BEGIN SELECT RAISE(ABORT,'TENANT_DELETED'); END;
CREATE TRIGGER lifecycle_item_modifier_links_insert BEFORE INSERT ON item_modifier_links
WHEN EXISTS(SELECT 1 FROM tenant_lifecycle WHERE tenant_id=NEW.tenant_id AND state<>'active')
BEGIN SELECT RAISE(ABORT,'TENANT_DELETED'); END;
CREATE TRIGGER lifecycle_item_modifier_links_update BEFORE UPDATE ON item_modifier_links
WHEN EXISTS(SELECT 1 FROM tenant_lifecycle WHERE tenant_id=NEW.tenant_id AND state<>'active') OR EXISTS(SELECT 1 FROM tenant_lifecycle WHERE tenant_id=OLD.tenant_id AND state<>'active')
BEGIN SELECT RAISE(ABORT,'TENANT_DELETED'); END;
CREATE TRIGGER lifecycle_category_modifier_links_insert BEFORE INSERT ON category_modifier_links
WHEN EXISTS(SELECT 1 FROM tenant_lifecycle WHERE tenant_id=NEW.tenant_id AND state<>'active')
BEGIN SELECT RAISE(ABORT,'TENANT_DELETED'); END;
CREATE TRIGGER lifecycle_category_modifier_links_update BEFORE UPDATE ON category_modifier_links
WHEN EXISTS(SELECT 1 FROM tenant_lifecycle WHERE tenant_id=NEW.tenant_id AND state<>'active') OR EXISTS(SELECT 1 FROM tenant_lifecycle WHERE tenant_id=OLD.tenant_id AND state<>'active')
BEGIN SELECT RAISE(ABORT,'TENANT_DELETED'); END;
CREATE TRIGGER lifecycle_tenant_line_runtime_insert BEFORE INSERT ON tenant_line_runtime
WHEN EXISTS(SELECT 1 FROM tenant_lifecycle WHERE tenant_id=NEW.tenant_id AND state<>'active')
BEGIN SELECT RAISE(ABORT,'TENANT_DELETED'); END;
CREATE TRIGGER lifecycle_tenant_line_runtime_update BEFORE UPDATE ON tenant_line_runtime
WHEN EXISTS(SELECT 1 FROM tenant_lifecycle WHERE tenant_id=NEW.tenant_id AND state<>'active') OR EXISTS(SELECT 1 FROM tenant_lifecycle WHERE tenant_id=OLD.tenant_id AND state<>'active')
BEGIN SELECT RAISE(ABORT,'TENANT_DELETED'); END;
CREATE TRIGGER lifecycle_tenant_line_webhook_probes_insert BEFORE INSERT ON tenant_line_webhook_probes
WHEN EXISTS(SELECT 1 FROM tenant_lifecycle WHERE tenant_id=NEW.tenant_id AND state<>'active')
BEGIN SELECT RAISE(ABORT,'TENANT_DELETED'); END;
CREATE TRIGGER lifecycle_tenant_line_webhook_probes_update BEFORE UPDATE ON tenant_line_webhook_probes
WHEN EXISTS(SELECT 1 FROM tenant_lifecycle WHERE tenant_id=NEW.tenant_id AND state<>'active') OR EXISTS(SELECT 1 FROM tenant_lifecycle WHERE tenant_id=OLD.tenant_id AND state<>'active')
BEGIN SELECT RAISE(ABORT,'TENANT_DELETED'); END;
