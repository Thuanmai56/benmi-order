-- Additive: existing orders remain legacy revision zero. No historical inference.
ALTER TABLE orders ADD COLUMN detail_revision INTEGER NOT NULL DEFAULT 0;
CREATE TABLE order_detail_snapshots (
  tenant_id TEXT NOT NULL,
  order_key TEXT NOT NULL REFERENCES orders(key) ON DELETE CASCADE,
  revision INTEGER NOT NULL CHECK (revision > 0),
  operation_id TEXT NOT NULL,
  request_hash TEXT NOT NULL,
  operation_kind TEXT NOT NULL CHECK(operation_kind IN ('create','append','modify')),
  snapshot_json TEXT NOT NULL CHECK (json_valid(snapshot_json)),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%f','now')),
  PRIMARY KEY (tenant_id, order_key, revision),
  UNIQUE (tenant_id, operation_id)
);
-- This guard MUST be the first statement of each update transaction. RAISE
-- aborts the whole D1 batch, including projections and receipt outbox writes.
CREATE TRIGGER order_detail_revision_guard BEFORE INSERT ON order_detail_snapshots
BEGIN
  SELECT CASE WHEN NOT EXISTS (
    SELECT 1 FROM orders WHERE key=NEW.order_key AND tenant_id=NEW.tenant_id
      AND detail_revision=NEW.revision-1
  ) THEN RAISE(ABORT,'ORDER_DETAIL_CONFLICT') END;
  SELECT CASE WHEN EXISTS (
    SELECT 1 FROM tenant_lifecycle WHERE tenant_id=NEW.tenant_id AND state<>'active'
  ) THEN RAISE(ABORT,'TENANT_DELETED') END;
  SELECT CASE WHEN EXISTS (SELECT 1 FROM orders WHERE key=NEW.order_key AND tenant_id=NEW.tenant_id
    AND ((NEW.operation_kind='append' AND status IN ('PICKED_UP','REJECTED','PAID','EXPIRED','FORCE_REJECT'))
      OR (NEW.operation_kind='modify' AND status<>'WAITING_CUSTOMER_CHANGE')))
    THEN RAISE(ABORT,'ORDER_LOCKED') END;
END;
CREATE TRIGGER order_detail_immutable BEFORE UPDATE ON order_detail_snapshots
BEGIN SELECT RAISE(ABORT,'ORDER_DETAIL_IMMUTABLE'); END;
