-- Migration: 0036_enable_weiweibao_dine_in.sql
-- Description: Enable dine-in feature and allow dine-in orders for tenant 'weiweibao' (微為飽小吃)

UPDATE tenant_config 
SET 
    allow_dine_in = 1,
    features = '["dine_in"]',
    updated_at = CURRENT_TIMESTAMP
WHERE tenant_id = 'weiweibao';
