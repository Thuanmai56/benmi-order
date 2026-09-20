-- Migration: 0057_create_staff_ordering_and_tables.sql
-- Description: Add staff ordering capabilities, restaurant tables, session authentication, and idempotency requests.

-- 1. Add feature flag to tenant_config (default disabled 0)
ALTER TABLE tenant_config ADD COLUMN staff_ordering_enabled INTEGER NOT NULL DEFAULT 0;

-- 2. Create restaurant_tables table
CREATE TABLE IF NOT EXISTS restaurant_tables (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    label TEXT NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (tenant_id) REFERENCES tenant_config(tenant_id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_restaurant_tables_tenant_label 
ON restaurant_tables(tenant_id, label);

CREATE INDEX IF NOT EXISTS idx_restaurant_tables_tenant_active 
ON restaurant_tables(tenant_id, is_active, sort_order);

-- 3. Add table_id, source, revision to orders table
ALTER TABLE orders ADD COLUMN table_id TEXT DEFAULT NULL REFERENCES restaurant_tables(id);
ALTER TABLE orders ADD COLUMN source TEXT NOT NULL DEFAULT 'legacy';
ALTER TABLE orders ADD COLUMN revision INTEGER NOT NULL DEFAULT 0;

-- 4. Unique partial index to guarantee at most one active staff order per table
CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_active_staff_table
ON orders(tenant_id, table_id)
WHERE source = 'staff' AND status NOT IN ('PAID', 'REJECTED', 'PICKED_UP');

-- 5. Create staff_order_requests table for idempotency
CREATE TABLE IF NOT EXISTS staff_order_requests (
    tenant_id TEXT NOT NULL,
    request_id TEXT NOT NULL,
    request_hash TEXT NOT NULL,
    order_key TEXT NOT NULL,
    round_number INTEGER NOT NULL,
    response_json TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    PRIMARY KEY (tenant_id, request_id)
);

CREATE INDEX IF NOT EXISTS idx_staff_order_requests_order 
ON staff_order_requests(tenant_id, order_key);

-- 6. Create staff_sessions table for 12-hour POS PIN sessions
CREATE TABLE IF NOT EXISTS staff_sessions (
    token_hash TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    revoked_at TEXT DEFAULT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_staff_sessions_tenant 
ON staff_sessions(tenant_id, expires_at);
