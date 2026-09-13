-- Requires a coordinated Worker/client rollout; see docs/order-identity-rollout.md.
-- Keep the client retry UUID (orders.uuid) separate from the server-owned primary key.
PRAGMA defer_foreign_keys = ON;
ALTER TABLE orders ADD COLUMN legacy_key TEXT;
ALTER TABLE orders ADD COLUMN display_key TEXT NOT NULL DEFAULT '';
ALTER TABLE orders ADD COLUMN business_date TEXT NOT NULL DEFAULT '';
CREATE TABLE order_legacy_keys (
  tenant_id TEXT NOT NULL,
  legacy_key TEXT NOT NULL,
  order_id TEXT NOT NULL UNIQUE,
  PRIMARY KEY (tenant_id, legacy_key),
  FOREIGN KEY (order_id) REFERENCES orders(key) ON DELETE CASCADE
);
INSERT INTO order_legacy_keys (tenant_id, legacy_key, order_id)
SELECT tenant_id, key, lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' ||
 substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random() % 4)+1,1) ||
 substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6))) FROM orders;
UPDATE orders SET legacy_key = key, display_key = key, business_date = date(created_at, '+8 hours');
UPDATE order_items SET order_key = (SELECT order_id FROM order_legacy_keys a
 WHERE a.tenant_id = order_items.tenant_id AND a.legacy_key = order_items.order_key)
 WHERE EXISTS (SELECT 1 FROM order_legacy_keys a WHERE a.tenant_id = order_items.tenant_id AND a.legacy_key = order_items.order_key);
UPDATE pending_actions SET order_key = (SELECT order_id FROM order_legacy_keys a
 WHERE a.tenant_id = pending_actions.tenant_id AND a.legacy_key = pending_actions.order_key)
 WHERE EXISTS (SELECT 1 FROM order_legacy_keys a WHERE a.tenant_id = pending_actions.tenant_id AND a.legacy_key = pending_actions.order_key);
UPDATE orders SET key = (SELECT order_id FROM order_legacy_keys a WHERE a.tenant_id = orders.tenant_id AND a.legacy_key = orders.key);
CREATE UNIQUE INDEX idx_orders_tenant_business_display ON orders(tenant_id, business_date, display_key);
-- The same retry token in two stores must not collide.
DROP INDEX idx_orders_uuid;
CREATE UNIQUE INDEX idx_orders_tenant_request_uuid ON orders(tenant_id, uuid);
-- Repair counters for legacy rows created outside the atomic counter path.
INSERT INTO daily_order_counters (tenant_id, order_date, dining_option, last_seq)
SELECT tenant_id, business_date, dining_option, MAX(CAST(substr(display_key, instr(display_key, '-') + 2) AS INTEGER))
FROM orders WHERE display_key GLOB '*-[DT][0-9]*'
GROUP BY tenant_id, business_date, dining_option
ON CONFLICT(tenant_id, order_date, dining_option) DO UPDATE SET last_seq = MAX(last_seq, excluded.last_seq);
CREATE TRIGGER orders_require_identity BEFORE INSERT ON orders
WHEN NEW.key IS NULL OR length(NEW.key) != 36 OR length(replace(NEW.key, '-', '')) != 32
 OR lower(replace(NEW.key, '-', '')) GLOB '*[^0-9a-f]*' OR substr(NEW.key,9,1) != '-' OR substr(NEW.key,14,1) != '-'
 OR substr(NEW.key,19,1) != '-' OR substr(NEW.key,24,1) != '-' OR NEW.display_key = '' OR NEW.business_date = ''
BEGIN SELECT RAISE(ABORT, 'ORDER_IDENTITY_REQUIRED'); END;
CREATE TRIGGER orders_identity_immutable BEFORE UPDATE OF key, tenant_id, display_key, business_date ON orders
WHEN NEW.key IS NOT OLD.key OR NEW.tenant_id IS NOT OLD.tenant_id OR NEW.display_key IS NOT OLD.display_key OR NEW.business_date IS NOT OLD.business_date
BEGIN SELECT RAISE(ABORT, 'ORDER_IDENTITY_IMMUTABLE'); END;
PRAGMA defer_foreign_keys = OFF;
