-- Additive rollout: migration first, then backend, then POS; enable per tenant.
ALTER TABLE tenant_config ADD COLUMN cancellation_detection_enabled INTEGER NOT NULL DEFAULT 0 CHECK(cancellation_detection_enabled IN (0,1));
ALTER TABLE tenant_config ADD COLUMN cancellation_review_threshold REAL NOT NULL DEFAULT 0.60 CHECK(cancellation_review_threshold > 0 AND cancellation_review_threshold < 1);
ALTER TABLE tenant_config ADD COLUMN cancellation_clear_threshold REAL NOT NULL DEFAULT 0.90 CHECK(cancellation_clear_threshold > cancellation_review_threshold AND cancellation_clear_threshold <= 1);

CREATE TABLE cancellation_feed_versions (
  tenant_id TEXT PRIMARY KEY REFERENCES tenants(id) ON DELETE CASCADE,
  revision INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE cancellation_events (
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  event_id TEXT NOT NULL,
  message_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  order_key TEXT NOT NULL REFERENCES orders(key) ON DELETE CASCADE,
  selected_latest INTEGER NOT NULL DEFAULT 0,
  message_text TEXT NOT NULL,
  event_at INTEGER NOT NULL,
  reply_token TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','processing','done','ignored','dead')),
  decision_json TEXT,
  attempts INTEGER NOT NULL DEFAULT 0,
  claim_id TEXT,
  lease_until INTEGER NOT NULL DEFAULT 0,
  next_attempt_at INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  PRIMARY KEY(tenant_id,event_id)
);
CREATE INDEX idx_cancel_events_due ON cancellation_events(status,next_attempt_at,lease_until);
CREATE INDEX idx_cancel_events_message ON cancellation_events(tenant_id,user_id,message_id);
CREATE TABLE cancellation_unsent_messages (
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  message_id TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  PRIMARY KEY(tenant_id,user_id,message_id)
);
CREATE INDEX idx_orders_cancel_customer ON orders(tenant_id,user_id,status,created_at DESC);

CREATE TABLE order_cancellation_requests (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  order_key TEXT NOT NULL REFERENCES orders(key) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  source TEXT NOT NULL CHECK(source IN ('regex','clef-flash','legacy','unavailable')),
  probability REAL,
  clarity TEXT NOT NULL CHECK(clarity IN ('clear','review','unavailable')),
  selected_latest INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK(status IN ('PENDING','APPROVED','DECLINED','DISMISSED','SUPERSEDED')),
  version INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  latest_event_at INTEGER NOT NULL,
  resolved_at INTEGER,
  resolution_reason TEXT NOT NULL DEFAULT '',
  resolution_token TEXT
);
CREATE UNIQUE INDEX idx_cancel_one_pending ON order_cancellation_requests(tenant_id,order_key) WHERE status='PENDING';
CREATE INDEX idx_cancel_requests_tenant ON order_cancellation_requests(tenant_id,status,updated_at DESC);
CREATE TABLE cancellation_request_messages (
  tenant_id TEXT NOT NULL,
  event_id TEXT NOT NULL,
  request_id TEXT NOT NULL REFERENCES order_cancellation_requests(id) ON DELETE CASCADE,
  message_id TEXT NOT NULL,
  message_text TEXT NOT NULL,
  event_at INTEGER NOT NULL,
  unsent INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY(tenant_id,event_id)
);
CREATE INDEX idx_cancel_messages_request ON cancellation_request_messages(request_id,event_at);
CREATE TABLE cancellation_notifications (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  request_id TEXT NOT NULL REFERENCES order_cancellation_requests(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  kind TEXT NOT NULL CHECK(kind IN ('received','resolved')),
  message_text TEXT NOT NULL,
  retry_key TEXT NOT NULL,
  reply_token TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','sending','sent','failed')),
  attempts INTEGER NOT NULL DEFAULT 0,
  claim_id TEXT,
  lease_until INTEGER NOT NULL DEFAULT 0,
  next_attempt_at INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  last_error TEXT,
  UNIQUE(request_id,kind)
);
CREATE INDEX idx_cancel_notifications_due ON cancellation_notifications(status,next_attempt_at,lease_until);

CREATE TRIGGER cancel_request_insert_revision AFTER INSERT ON order_cancellation_requests BEGIN
  INSERT INTO cancellation_feed_versions(tenant_id,revision) VALUES(NEW.tenant_id,1)
  ON CONFLICT(tenant_id) DO UPDATE SET revision=revision+1;
END;
CREATE TRIGGER cancel_request_update_revision AFTER UPDATE ON order_cancellation_requests BEGIN
  INSERT INTO cancellation_feed_versions(tenant_id,revision) VALUES(NEW.tenant_id,1)
  ON CONFLICT(tenant_id) DO UPDATE SET revision=revision+1;
END;
CREATE TRIGGER cancel_notification_revision AFTER UPDATE OF status ON cancellation_notifications BEGIN
  INSERT INTO cancellation_feed_versions(tenant_id,revision) VALUES(NEW.tenant_id,1)
  ON CONFLICT(tenant_id) DO UPDATE SET revision=revision+1;
END;
-- D1 is the authority: an older POS or stale save cannot advance a held order.
CREATE TRIGGER cancel_block_order_progress BEFORE UPDATE OF status ON orders
WHEN NEW.status != OLD.status AND NEW.status IN ('ACCEPTED','DONE','PICKED_UP','PAID')
AND EXISTS(SELECT 1 FROM order_cancellation_requests WHERE tenant_id=OLD.tenant_id AND order_key=OLD.key AND status='PENDING')
BEGIN SELECT RAISE(ABORT,'CANCELLATION_PENDING'); END;
CREATE TRIGGER cancel_close_terminal_order AFTER UPDATE OF status ON orders
WHEN NEW.status IN ('REJECTED','FORCE_REJECT','EXPIRED','PICKED_UP','PAID')
BEGIN
  UPDATE order_cancellation_requests SET status='SUPERSEDED',version=version+1,
    resolved_at=CAST(unixepoch('subsec')*1000 AS INTEGER),updated_at=CAST(unixepoch('subsec')*1000 AS INTEGER)
    WHERE tenant_id=NEW.tenant_id AND order_key=NEW.key AND status='PENDING';
END;
CREATE TRIGGER cancel_order_context_revision AFTER UPDATE OF status,pickup_time,total_amount ON orders
WHEN EXISTS(SELECT 1 FROM order_cancellation_requests WHERE tenant_id=NEW.tenant_id AND order_key=NEW.key)
BEGIN
  INSERT INTO cancellation_feed_versions(tenant_id,revision) VALUES(NEW.tenant_id,1)
  ON CONFLICT(tenant_id) DO UPDATE SET revision=revision+1;
END;
