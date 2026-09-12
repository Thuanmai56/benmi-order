-- Migration: 0050_update_order_prefixes_for_j_tenants.sql
-- Description: Give the two J-prefixed tenants distinct order-code prefixes.

UPDATE tenant_config
SET order_prefix = 'JJ'
WHERE tenant_id = 'jiangjiejie';

UPDATE tenant_config
SET order_prefix = 'JD'
WHERE tenant_id = 'jidangaodashu';
