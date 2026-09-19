-- Migration: 0056_staff_ordering_tables.sql
-- Description: Add staff ordering flag, restaurant tables, order table_id/source/revision, staff order requests idempotency and staff sessions

-- 1. Feature Flag in tenant_config
ALTER TABLE tenant_config ADD COLUMN staff_ordering_enabled INTEGER NOT NULL DEFAULT 0;

-- 2. Restaurant Tables Directory
CREATE TABLE IF NOT EXISTS restaurant_tables (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    label TEXT NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    UNIQUE(tenant_id, label)
);

CREATE INDEX IF NOT EXISTS idx_tables_tenant ON restaurant_tables(tenant_id, is_active, sort_order);

-- 3. Expand Orders Table for Staff Orders
ALTER TABLE orders ADD COLUMN table_id TEXT DEFAULT NULL;
ALTER TABLE orders ADD COLUMN source TEXT NOT NULL DEFAULT 'legacy';
ALTER TABLE orders ADD COLUMN revision INTEGER NOT NULL DEFAULT 0 CHECK(revision >= 0);

-- Ensure a table has at most one active (un-finalized) staff order at any given moment
CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_active_staff_table 
ON orders(tenant_id, table_id) 
WHERE source = 'staff' AND table_id IS NOT NULL AND status NOT IN ('PAID', 'REJECTED', 'PICKED_UP');

-- 4. Idempotency Tracking for Staff Order Requests
CREATE TABLE IF NOT EXISTS staff_order_requests (
    tenant_id TEXT NOT NULL,
    request_id TEXT NOT NULL,
    request_hash TEXT NOT NULL,
    order_key TEXT NOT NULL,
    round_number INTEGER NOT NULL DEFAULT 1,
    response_body TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (tenant_id, request_id),
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

-- 5. Staff Auth Sessions (PIN authenticated, 12h bearer token)
CREATE TABLE IF NOT EXISTS staff_sessions (
    token_hash TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    expires_at DATETIME NOT NULL,
    revoked_at DATETIME DEFAULT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_staff_sessions_tenant ON staff_sessions(tenant_id, expires_at);
