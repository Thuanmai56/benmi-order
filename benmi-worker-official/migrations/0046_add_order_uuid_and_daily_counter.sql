-- Migration: 0046_add_order_uuid_and_daily_counter.sql
-- Description: Add technical uuid column to orders and create atomic daily sequence counters table

-- 1. Thêm cột uuid vào bảng orders (nếu chưa có)
ALTER TABLE orders ADD COLUMN uuid TEXT DEFAULT NULL;

-- 2. Chỉ mục Unique cho uuid để hỗ trợ Idempotency và tra cứu siêu tốc
CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_uuid ON orders (uuid);
CREATE INDEX IF NOT EXISTS idx_orders_tenant_date_key ON orders (tenant_id, created_at, key);

-- 3. Bảng quản lý bộ đếm số thứ tự đơn trong ngày theo loại đơn cho từng quán
CREATE TABLE IF NOT EXISTS daily_order_counters (
    tenant_id TEXT NOT NULL,
    order_date TEXT NOT NULL, -- Định dạng: YYYY-MM-DD theo múi giờ quán (UTC+8)
    dining_option TEXT NOT NULL, -- 'dine_in' hoặc 'takeaway'
    last_seq INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (tenant_id, order_date, dining_option)
);
