-- Migration: 0020_update_zhadan_store_address.sql
-- Description: Update store address for tenant zhadantongxue

UPDATE tenant_config
SET 
    store_address = '新北市新店區中興路二段200-1號',
    updated_at = CURRENT_TIMESTAMP
WHERE tenant_id = 'zhadantongxue';
