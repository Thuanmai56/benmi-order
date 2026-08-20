-- Migration: 0015_fix_zhadan_brand_name.sql
-- Description: Fix tenant name and brand name to Traditional Chinese '炸蛋同學' (remove simplified Chinese and redundant suffix)

UPDATE tenants 
SET name = '炸蛋同學'
WHERE id = 'zhadantongxue';

UPDATE tenant_config 
SET brand_name = '炸蛋同學'
WHERE tenant_id = 'zhadantongxue';
