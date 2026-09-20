-- Idempotency evidence for menus provisioned by blab-admin v3.
-- The admin Worker writes this record in the same D1 batch as tenant/menu data.
CREATE TABLE IF NOT EXISTS admin_menu_seed_receipts (
  request_id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL UNIQUE,
  approved_revision INTEGER NOT NULL CHECK (approved_revision > 0),
  menu_hash TEXT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_admin_menu_seed_receipts_tenant
ON admin_menu_seed_receipts(tenant_id);
