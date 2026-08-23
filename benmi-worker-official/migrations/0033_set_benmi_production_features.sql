-- Migration: 0033_set_benmi_production_features.sql
-- Description: Configure benmi tenant features for production (disable dine-in, enable reports)

UPDATE tenant_config 
SET allow_dine_in = 0,
    features = '["reports"]'
WHERE tenant_id = 'benmi';
