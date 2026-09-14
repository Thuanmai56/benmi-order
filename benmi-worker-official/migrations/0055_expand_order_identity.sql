-- Online expansion: never rewrite existing keys or foreign keys.
-- Legacy Workers can continue inserting/updating their original columns.
ALTER TABLE orders ADD COLUMN order_id TEXT;
ALTER TABLE orders ADD COLUMN legacy_key TEXT;
ALTER TABLE orders ADD COLUMN display_key TEXT NOT NULL DEFAULT '';
ALTER TABLE orders ADD COLUMN business_date TEXT NOT NULL DEFAULT '';
UPDATE orders SET order_id = lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' ||
 substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random() % 4)+1,1) ||
 substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6))),
 legacy_key = key, display_key = key, business_date = date(created_at, '+8 hours');
CREATE UNIQUE INDEX idx_orders_order_id ON orders(order_id);
CREATE INDEX idx_orders_tenant_business_display ON orders(tenant_id, business_date, display_key);
DROP INDEX idx_orders_uuid;
CREATE UNIQUE INDEX idx_orders_tenant_request_uuid ON orders(tenant_id, uuid);
CREATE TRIGGER orders_fill_identity AFTER INSERT ON orders
BEGIN
 UPDATE orders SET
 order_id = COALESCE(NEW.order_id, lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' ||
 substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random() % 4)+1,1) ||
 substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
 display_key = CASE WHEN NEW.display_key = '' THEN NEW.key ELSE NEW.display_key END,
 business_date = CASE WHEN NEW.business_date = '' THEN date(NEW.created_at, '+8 hours') ELSE NEW.business_date END
 WHERE key = NEW.key;
END;
CREATE TRIGGER orders_identity_immutable BEFORE UPDATE OF key, tenant_id, order_id ON orders
WHEN NEW.key IS NOT OLD.key OR NEW.tenant_id IS NOT OLD.tenant_id
 OR (OLD.order_id IS NOT NULL AND NEW.order_id IS NOT OLD.order_id)
BEGIN SELECT RAISE(ABORT, 'ORDER_IDENTITY_IMMUTABLE'); END;
INSERT INTO daily_order_counters (tenant_id, order_date, dining_option, last_seq)
SELECT tenant_id, business_date, dining_option, MAX(CAST(substr(display_key, instr(display_key, '-') + 2) AS INTEGER))
FROM orders WHERE display_key GLOB '*-[DT][0-9]*'
GROUP BY tenant_id, business_date, dining_option
ON CONFLICT(tenant_id, order_date, dining_option) DO UPDATE SET last_seq = MAX(last_seq, excluded.last_seq);
