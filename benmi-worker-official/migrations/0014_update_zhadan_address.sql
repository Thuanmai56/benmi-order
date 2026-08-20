-- Migration: 0014_update_zhadan_address.sql
-- Description: Update store address for tenant zhadantongxue

UPDATE tenant_config 
SET store_address = '新北市土城區延平街30號',
    updated_at = CURRENT_TIMESTAMP
WHERE tenant_id = 'zhadantongxue';
