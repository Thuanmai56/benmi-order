-- Applied projections only. Admin drafts and LINE Login credentials stay in ADMIN_DB.
CREATE TABLE tenant_line_runtime (
  tenant_id TEXT PRIMARY KEY REFERENCES tenants(id) ON DELETE CASCADE,
  environment TEXT NOT NULL,
  connection_id TEXT NOT NULL,
  revision INTEGER NOT NULL CHECK (revision > 0),
  operation_id TEXT NOT NULL,
  bot_user_id TEXT NOT NULL,
  messaging_channel_id TEXT,
  token_encrypted_value TEXT NOT NULL,
  token_key_version TEXT NOT NULL,
  secret_encrypted_value TEXT NOT NULL,
  secret_key_version TEXT NOT NULL,
  liff_id TEXT,
  liff_url TEXT,
  applied_at TEXT NOT NULL,
  webhook_verified_at TEXT,
  webhook_verified_revision INTEGER,
  UNIQUE(environment, bot_user_id)
);

-- Short-lived signed test callbacks, separate from operational event delivery.
CREATE TABLE tenant_line_webhook_probes (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  environment TEXT NOT NULL,
  connection_id TEXT NOT NULL,
  revision INTEGER NOT NULL CHECK (revision > 0),
  bot_user_id TEXT NOT NULL,
  secret_encrypted_value TEXT NOT NULL,
  secret_key_version TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  verified_at TEXT
);
CREATE INDEX tenant_line_webhook_probes_expiry ON tenant_line_webhook_probes(expires_at);
