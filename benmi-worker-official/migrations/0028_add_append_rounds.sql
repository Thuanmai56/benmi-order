-- Migration: 0028_add_append_rounds.sql
-- Description: Add round_count and last_appended_at to orders table for multi-round dine-in append orders

ALTER TABLE orders ADD COLUMN round_count INTEGER DEFAULT 1;
ALTER TABLE orders ADD COLUMN last_appended_at TEXT DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_orders_tenant_table_status ON orders (tenant_id, table_number, status);
