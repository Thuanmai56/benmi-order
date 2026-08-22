-- Migration: 0024_add_order_prefix.sql
-- Description: Add configurable order_prefix to tenant_config for custom order ID prefix

-- 1. Bổ sung trường order_prefix vào bảng tenant_config
ALTER TABLE tenant_config ADD COLUMN order_prefix TEXT DEFAULT NULL;

-- 2. Khởi tạo tiền tố mặc định cho các quán hiện có
UPDATE tenant_config SET order_prefix = 'B' WHERE tenant_id = 'benmi';
UPDATE tenant_config SET order_prefix = 'Z' WHERE tenant_id = 'zhadantongxue';
UPDATE tenant_config SET order_prefix = 'K' WHERE tenant_id = 'bsc';
UPDATE tenant_config SET order_prefix = 'J' WHERE tenant_id = 'jidangaodashu';
