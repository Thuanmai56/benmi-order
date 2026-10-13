-- A receipt is committed with the order mutation, independently of the LIFF tab.
CREATE TABLE IF NOT EXISTS line_order_receipts (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  order_key TEXT NOT NULL,
  user_id TEXT NOT NULL,
  flow TEXT NOT NULL CHECK (flow IN ('create', 'append', 'modify')),
  alt_text TEXT NOT NULL,
  contents_json TEXT NOT NULL,
  fallback_token_hash TEXT NOT NULL,
  retry_key TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sending', 'sent', 'failed')),
  method TEXT CHECK (method IN ('reply', 'push')),
  attempts INTEGER NOT NULL DEFAULT 0,
  next_attempt_at INTEGER NOT NULL,
  lease_until INTEGER NOT NULL DEFAULT 0,
  claim_id TEXT,
  last_error TEXT,
  created_at INTEGER NOT NULL,
  sent_at INTEGER
);
CREATE INDEX IF NOT EXISTS idx_line_receipts_due ON line_order_receipts(status, next_attempt_at);
CREATE INDEX IF NOT EXISTS idx_line_receipts_order ON line_order_receipts(tenant_id, order_key, flow, created_at);
