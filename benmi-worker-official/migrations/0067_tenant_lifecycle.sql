-- Durable lifecycle tombstones survive purges and fence delayed writers.
CREATE TABLE tenant_lifecycle (
  tenant_id TEXT PRIMARY KEY,
  state TEXT NOT NULL DEFAULT 'active' CHECK(state IN ('active','deleted','purging')),
  has_order_history INTEGER CHECK(has_order_history IN (0,1)),
  deleted_at TEXT,
  deleted_by TEXT,
  purged_at TEXT
);
INSERT INTO tenant_lifecycle(tenant_id,has_order_history)
SELECT t.id, EXISTS(SELECT 1 FROM orders o WHERE o.tenant_id=t.id) FROM tenants t;
CREATE INDEX tenant_lifecycle_state ON tenant_lifecycle(state,tenant_id);
CREATE TRIGGER lifecycle_no_delete BEFORE DELETE ON tenant_lifecycle
BEGIN SELECT RAISE(ABORT,'TENANT_LIFECYCLE_IMMUTABLE'); END;
CREATE TRIGGER lifecycle_monotonic BEFORE UPDATE ON tenant_lifecycle
WHEN NEW.tenant_id IS NOT OLD.tenant_id
  OR (OLD.state <> 'active' AND NEW.state='active')
  OR (OLD.state='purging' AND NEW.state<>'purging')
  OR (OLD.has_order_history=1 AND NEW.has_order_history IS NOT 1)
  OR (OLD.has_order_history IS NULL AND NEW.has_order_history=0)
  OR (OLD.purged_at IS NOT NULL AND NEW.purged_at IS NOT OLD.purged_at)
BEGIN SELECT RAISE(ABORT,'TENANT_LIFECYCLE_IMMUTABLE'); END;
CREATE TRIGGER lifecycle_new_tenant AFTER INSERT ON tenants
BEGIN INSERT INTO tenant_lifecycle(tenant_id,has_order_history) VALUES(NEW.id,0)
  ON CONFLICT(tenant_id) DO NOTHING; END;
CREATE TRIGGER lifecycle_order_history AFTER INSERT ON orders
BEGIN INSERT INTO tenant_lifecycle(tenant_id,has_order_history) VALUES(NEW.tenant_id,1)
  ON CONFLICT(tenant_id) DO UPDATE SET has_order_history=1; END;
CREATE TRIGGER lifecycle_order_move AFTER UPDATE OF tenant_id ON orders
BEGIN INSERT INTO tenant_lifecycle(tenant_id,has_order_history) VALUES(NEW.tenant_id,1)
  ON CONFLICT(tenant_id) DO UPDATE SET has_order_history=1; END;
CREATE TRIGGER lifecycle_tenant_delete_guard BEFORE DELETE ON tenants
WHEN NOT EXISTS(SELECT 1 FROM tenant_lifecycle WHERE tenant_id=OLD.id AND state='purging'
  AND has_order_history=0) OR EXISTS(SELECT 1 FROM orders WHERE tenant_id=OLD.id)
BEGIN SELECT RAISE(ABORT,'TENANT_PERMANENT_DELETE_FORBIDDEN'); END;
CREATE TRIGGER lifecycle_tenants_insert BEFORE INSERT ON tenants
WHEN EXISTS(SELECT 1 FROM tenant_lifecycle WHERE tenant_id=NEW.id AND state<>'active')
BEGIN SELECT RAISE(ABORT,'TENANT_DELETED'); END;
CREATE TRIGGER lifecycle_tenants_update BEFORE UPDATE ON tenants
WHEN EXISTS(SELECT 1 FROM tenant_lifecycle WHERE tenant_id=NEW.id AND state<>'active') OR EXISTS(SELECT 1 FROM tenant_lifecycle WHERE tenant_id=OLD.id AND state<>'active')
BEGIN SELECT RAISE(ABORT,'TENANT_DELETED'); END;
CREATE TRIGGER lifecycle_tenant_config_insert BEFORE INSERT ON tenant_config
WHEN EXISTS(SELECT 1 FROM tenant_lifecycle WHERE tenant_id=NEW.tenant_id AND state<>'active')
BEGIN SELECT RAISE(ABORT,'TENANT_DELETED'); END;
CREATE TRIGGER lifecycle_tenant_config_update BEFORE UPDATE ON tenant_config
WHEN EXISTS(SELECT 1 FROM tenant_lifecycle WHERE tenant_id=NEW.tenant_id AND state<>'active') OR EXISTS(SELECT 1 FROM tenant_lifecycle WHERE tenant_id=OLD.tenant_id AND state<>'active')
BEGIN SELECT RAISE(ABORT,'TENANT_DELETED'); END;
CREATE TRIGGER lifecycle_orders_insert BEFORE INSERT ON orders
WHEN EXISTS(SELECT 1 FROM tenant_lifecycle WHERE tenant_id=NEW.tenant_id AND state<>'active')
BEGIN SELECT RAISE(ABORT,'TENANT_DELETED'); END;
CREATE TRIGGER lifecycle_orders_update BEFORE UPDATE ON orders
WHEN EXISTS(SELECT 1 FROM tenant_lifecycle WHERE tenant_id=NEW.tenant_id AND state<>'active') OR EXISTS(SELECT 1 FROM tenant_lifecycle WHERE tenant_id=OLD.tenant_id AND state<>'active')
BEGIN SELECT RAISE(ABORT,'TENANT_DELETED'); END;
CREATE TRIGGER lifecycle_order_items_insert BEFORE INSERT ON order_items
WHEN EXISTS(SELECT 1 FROM tenant_lifecycle WHERE tenant_id=NEW.tenant_id AND state<>'active')
BEGIN SELECT RAISE(ABORT,'TENANT_DELETED'); END;
CREATE TRIGGER lifecycle_order_items_update BEFORE UPDATE ON order_items
WHEN EXISTS(SELECT 1 FROM tenant_lifecycle WHERE tenant_id=NEW.tenant_id AND state<>'active') OR EXISTS(SELECT 1 FROM tenant_lifecycle WHERE tenant_id=OLD.tenant_id AND state<>'active')
BEGIN SELECT RAISE(ABORT,'TENANT_DELETED'); END;
CREATE TRIGGER lifecycle_pending_actions_insert BEFORE INSERT ON pending_actions
WHEN EXISTS(SELECT 1 FROM tenant_lifecycle WHERE tenant_id=NEW.tenant_id AND state<>'active')
BEGIN SELECT RAISE(ABORT,'TENANT_DELETED'); END;
CREATE TRIGGER lifecycle_pending_actions_update BEFORE UPDATE ON pending_actions
WHEN EXISTS(SELECT 1 FROM tenant_lifecycle WHERE tenant_id=NEW.tenant_id AND state<>'active') OR EXISTS(SELECT 1 FROM tenant_lifecycle WHERE tenant_id=OLD.tenant_id AND state<>'active')
BEGIN SELECT RAISE(ABORT,'TENANT_DELETED'); END;
CREATE TRIGGER lifecycle_daily_order_counters_insert BEFORE INSERT ON daily_order_counters
WHEN EXISTS(SELECT 1 FROM tenant_lifecycle WHERE tenant_id=NEW.tenant_id AND state<>'active')
BEGIN SELECT RAISE(ABORT,'TENANT_DELETED'); END;
CREATE TRIGGER lifecycle_daily_order_counters_update BEFORE UPDATE ON daily_order_counters
WHEN EXISTS(SELECT 1 FROM tenant_lifecycle WHERE tenant_id=NEW.tenant_id AND state<>'active') OR EXISTS(SELECT 1 FROM tenant_lifecycle WHERE tenant_id=OLD.tenant_id AND state<>'active')
BEGIN SELECT RAISE(ABORT,'TENANT_DELETED'); END;
CREATE TRIGGER lifecycle_menu_categories_insert BEFORE INSERT ON menu_categories
WHEN EXISTS(SELECT 1 FROM tenant_lifecycle WHERE tenant_id=NEW.tenant_id AND state<>'active')
BEGIN SELECT RAISE(ABORT,'TENANT_DELETED'); END;
CREATE TRIGGER lifecycle_menu_categories_update BEFORE UPDATE ON menu_categories
WHEN EXISTS(SELECT 1 FROM tenant_lifecycle WHERE tenant_id=NEW.tenant_id AND state<>'active') OR EXISTS(SELECT 1 FROM tenant_lifecycle WHERE tenant_id=OLD.tenant_id AND state<>'active')
BEGIN SELECT RAISE(ABORT,'TENANT_DELETED'); END;
CREATE TRIGGER lifecycle_menu_items_insert BEFORE INSERT ON menu_items
WHEN EXISTS(SELECT 1 FROM tenant_lifecycle WHERE tenant_id=NEW.tenant_id AND state<>'active')
BEGIN SELECT RAISE(ABORT,'TENANT_DELETED'); END;
CREATE TRIGGER lifecycle_menu_items_update BEFORE UPDATE ON menu_items
WHEN EXISTS(SELECT 1 FROM tenant_lifecycle WHERE tenant_id=NEW.tenant_id AND state<>'active') OR EXISTS(SELECT 1 FROM tenant_lifecycle WHERE tenant_id=OLD.tenant_id AND state<>'active')
BEGIN SELECT RAISE(ABORT,'TENANT_DELETED'); END;
CREATE TRIGGER lifecycle_menu_customizations_insert BEFORE INSERT ON menu_customizations
WHEN EXISTS(SELECT 1 FROM tenant_lifecycle WHERE tenant_id=NEW.tenant_id AND state<>'active')
BEGIN SELECT RAISE(ABORT,'TENANT_DELETED'); END;
CREATE TRIGGER lifecycle_menu_customizations_update BEFORE UPDATE ON menu_customizations
WHEN EXISTS(SELECT 1 FROM tenant_lifecycle WHERE tenant_id=NEW.tenant_id AND state<>'active') OR EXISTS(SELECT 1 FROM tenant_lifecycle WHERE tenant_id=OLD.tenant_id AND state<>'active')
BEGIN SELECT RAISE(ABORT,'TENANT_DELETED'); END;
CREATE TRIGGER lifecycle_menu_bundle_rules_insert BEFORE INSERT ON menu_bundle_rules
WHEN EXISTS(SELECT 1 FROM tenant_lifecycle WHERE tenant_id=NEW.tenant_id AND state<>'active')
BEGIN SELECT RAISE(ABORT,'TENANT_DELETED'); END;
CREATE TRIGGER lifecycle_menu_bundle_rules_update BEFORE UPDATE ON menu_bundle_rules
WHEN EXISTS(SELECT 1 FROM tenant_lifecycle WHERE tenant_id=NEW.tenant_id AND state<>'active') OR EXISTS(SELECT 1 FROM tenant_lifecycle WHERE tenant_id=OLD.tenant_id AND state<>'active')
BEGIN SELECT RAISE(ABORT,'TENANT_DELETED'); END;
CREATE TRIGGER lifecycle_menu_customization_option_rules_insert BEFORE INSERT ON menu_customization_option_rules
WHEN EXISTS(SELECT 1 FROM tenant_lifecycle WHERE tenant_id=NEW.tenant_id AND state<>'active')
BEGIN SELECT RAISE(ABORT,'TENANT_DELETED'); END;
CREATE TRIGGER lifecycle_menu_customization_option_rules_update BEFORE UPDATE ON menu_customization_option_rules
WHEN EXISTS(SELECT 1 FROM tenant_lifecycle WHERE tenant_id=NEW.tenant_id AND state<>'active') OR EXISTS(SELECT 1 FROM tenant_lifecycle WHERE tenant_id=OLD.tenant_id AND state<>'active')
BEGIN SELECT RAISE(ABORT,'TENANT_DELETED'); END;
CREATE TRIGGER lifecycle_admin_menu_seed_receipts_insert BEFORE INSERT ON admin_menu_seed_receipts
WHEN EXISTS(SELECT 1 FROM tenant_lifecycle WHERE tenant_id=NEW.tenant_id AND state<>'active')
BEGIN SELECT RAISE(ABORT,'TENANT_DELETED'); END;
CREATE TRIGGER lifecycle_admin_menu_seed_receipts_update BEFORE UPDATE ON admin_menu_seed_receipts
WHEN EXISTS(SELECT 1 FROM tenant_lifecycle WHERE tenant_id=NEW.tenant_id AND state<>'active') OR EXISTS(SELECT 1 FROM tenant_lifecycle WHERE tenant_id=OLD.tenant_id AND state<>'active')
BEGIN SELECT RAISE(ABORT,'TENANT_DELETED'); END;
CREATE TRIGGER lifecycle_restaurant_tables_insert BEFORE INSERT ON restaurant_tables
WHEN EXISTS(SELECT 1 FROM tenant_lifecycle WHERE tenant_id=NEW.tenant_id AND state<>'active')
BEGIN SELECT RAISE(ABORT,'TENANT_DELETED'); END;
CREATE TRIGGER lifecycle_restaurant_tables_update BEFORE UPDATE ON restaurant_tables
WHEN EXISTS(SELECT 1 FROM tenant_lifecycle WHERE tenant_id=NEW.tenant_id AND state<>'active') OR EXISTS(SELECT 1 FROM tenant_lifecycle WHERE tenant_id=OLD.tenant_id AND state<>'active')
BEGIN SELECT RAISE(ABORT,'TENANT_DELETED'); END;
CREATE TRIGGER lifecycle_staff_order_requests_insert BEFORE INSERT ON staff_order_requests
WHEN EXISTS(SELECT 1 FROM tenant_lifecycle WHERE tenant_id=NEW.tenant_id AND state<>'active')
BEGIN SELECT RAISE(ABORT,'TENANT_DELETED'); END;
CREATE TRIGGER lifecycle_staff_order_requests_update BEFORE UPDATE ON staff_order_requests
WHEN EXISTS(SELECT 1 FROM tenant_lifecycle WHERE tenant_id=NEW.tenant_id AND state<>'active') OR EXISTS(SELECT 1 FROM tenant_lifecycle WHERE tenant_id=OLD.tenant_id AND state<>'active')
BEGIN SELECT RAISE(ABORT,'TENANT_DELETED'); END;
CREATE TRIGGER lifecycle_staff_sessions_insert BEFORE INSERT ON staff_sessions
WHEN EXISTS(SELECT 1 FROM tenant_lifecycle WHERE tenant_id=NEW.tenant_id AND state<>'active')
BEGIN SELECT RAISE(ABORT,'TENANT_DELETED'); END;
CREATE TRIGGER lifecycle_staff_sessions_update BEFORE UPDATE ON staff_sessions
WHEN EXISTS(SELECT 1 FROM tenant_lifecycle WHERE tenant_id=NEW.tenant_id AND state<>'active') OR EXISTS(SELECT 1 FROM tenant_lifecycle WHERE tenant_id=OLD.tenant_id AND state<>'active')
BEGIN SELECT RAISE(ABORT,'TENANT_DELETED'); END;
