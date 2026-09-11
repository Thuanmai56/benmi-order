-- Additive schema: legacy tenants retain NULL onboarding_status.
ALTER TABLE tenant_config ADD COLUMN onboarding_status TEXT CHECK(onboarding_status IN ('provisioning', 'ready', 'failed'));
ALTER TABLE tenant_config ADD COLUMN credential_encoding TEXT;

CREATE TABLE onboarding_credentials (
  draft_id TEXT NOT NULL,
  actor_id TEXT NOT NULL,
  revision INTEGER NOT NULL CHECK(revision > 0),
  encrypted_json TEXT NOT NULL,
  liff_id TEXT NOT NULL,
  checked_at TEXT,
  bot_user_id TEXT,
  bot_display_name TEXT,
  webhook_endpoint TEXT,
  webhook_active INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  PRIMARY KEY(draft_id, revision)
);
CREATE INDEX onboarding_credentials_actor ON onboarding_credentials(actor_id, draft_id, revision DESC);

CREATE TABLE tenant_provisioning_operations (
  id TEXT PRIMARY KEY,
  draft_id TEXT NOT NULL UNIQUE,
  idempotency_key TEXT NOT NULL UNIQUE,
  input_hash TEXT NOT NULL,
  actor_id TEXT NOT NULL,
  tenant_id TEXT NOT NULL UNIQUE,
  credential_revision INTEGER NOT NULL,
  credential_guard INTEGER NOT NULL CHECK(credential_guard = 1),
  snapshot_json TEXT NOT NULL CHECK(json_valid(snapshot_json)),
  status TEXT NOT NULL CHECK(status IN ('provisioning', 'failed', 'succeeded')),
  step TEXT NOT NULL CHECK(step IN ('cache', 'line', 'activate', 'complete')),
  error_code TEXT,
  lease_id TEXT,
  lease_until TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY(draft_id, credential_revision) REFERENCES onboarding_credentials(draft_id, revision)
);
CREATE INDEX provisioning_status ON tenant_provisioning_operations(status, updated_at);
CREATE INDEX provisioning_actor ON tenant_provisioning_operations(actor_id, created_at DESC);

CREATE TABLE tenant_provisioning_outbox (
  operation_id TEXT PRIMARY KEY REFERENCES tenant_provisioning_operations(id),
  attempts INTEGER NOT NULL DEFAULT 0,
  next_attempt_at TEXT NOT NULL,
  completed_at TEXT
);
CREATE INDEX provisioning_outbox_due ON tenant_provisioning_outbox(completed_at, next_attempt_at);

CREATE TABLE tenant_admin_audit (
  id TEXT PRIMARY KEY,
  actor_id TEXT NOT NULL,
  action TEXT NOT NULL,
  draft_id TEXT,
  tenant_id TEXT,
  operation_id TEXT,
  request_id TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX tenant_admin_audit_tenant ON tenant_admin_audit(tenant_id, created_at);

CREATE TABLE pos_sessions (
  token_hash TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id),
  expires_at TEXT NOT NULL
);
CREATE INDEX pos_sessions_expiry ON pos_sessions(expires_at);
CREATE TABLE pos_auth_attempts (
  bucket TEXT PRIMARY KEY,
  attempts INTEGER NOT NULL,
  expires_at TEXT NOT NULL
);
