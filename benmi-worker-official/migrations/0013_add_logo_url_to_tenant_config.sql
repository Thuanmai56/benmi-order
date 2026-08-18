-- Migration: 0013_add_logo_url_to_tenant_config.sql
-- Description: Add logo_url column to tenant_config for fully dynamic tenant branding

ALTER TABLE tenant_config ADD COLUMN logo_url TEXT;

UPDATE tenant_config SET logo_url = './benmi_logo.png' WHERE tenant_id = 'benmi';
UPDATE tenant_config SET logo_url = './zhadan_logo.png' WHERE tenant_id = 'zhadantongxue';
