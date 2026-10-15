-- Additive: never reinterpret existing unavailable requests or auto-release holds.
ALTER TABLE order_cancellation_requests ADD COLUMN customer_withdrew INTEGER NOT NULL DEFAULT 0 CHECK(customer_withdrew IN (0,1));
ALTER TABLE order_cancellation_requests ADD COLUMN latest_event_id TEXT NOT NULL DEFAULT '';
ALTER TABLE order_cancellation_requests ADD COLUMN decision_json TEXT;
ALTER TABLE cancellation_request_messages ADD COLUMN decision_json TEXT;
UPDATE order_cancellation_requests SET latest_event_id=COALESCE((SELECT MAX(event_id) FROM cancellation_request_messages m
  WHERE m.request_id=order_cancellation_requests.id AND m.event_at=order_cancellation_requests.latest_event_at),'');
CREATE TABLE cancellation_technical_alerts (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  event_id TEXT NOT NULL,
  order_key TEXT NOT NULL REFERENCES orders(key) ON DELETE CASCADE,
  error_code TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  acknowledged_at INTEGER,
  UNIQUE(tenant_id,event_id),
  FOREIGN KEY(tenant_id,event_id) REFERENCES cancellation_events(tenant_id,event_id) ON DELETE CASCADE
);
CREATE INDEX idx_cancel_alerts_tenant ON cancellation_technical_alerts(tenant_id,acknowledged_at,created_at);
CREATE TRIGGER cancel_alert_insert_revision AFTER INSERT ON cancellation_technical_alerts BEGIN
  INSERT INTO cancellation_feed_versions(tenant_id,revision) VALUES(NEW.tenant_id,1)
  ON CONFLICT(tenant_id) DO UPDATE SET revision=revision+1;
END;
CREATE TRIGGER cancel_alert_ack_revision AFTER UPDATE OF acknowledged_at ON cancellation_technical_alerts BEGIN
  INSERT INTO cancellation_feed_versions(tenant_id,revision) VALUES(NEW.tenant_id,1)
  ON CONFLICT(tenant_id) DO UPDATE SET revision=revision+1;
END;
