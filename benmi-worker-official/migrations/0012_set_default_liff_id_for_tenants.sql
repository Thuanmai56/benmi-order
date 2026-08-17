-- Migration: 0012_set_default_liff_id_for_tenants.sql
-- Description: Update liff_id and liff_url for tenants in tenant_config

UPDATE tenant_config 
SET 
    liff_id = COALESCE(NULLIF(liff_id, ''), '2009560906-c5taZfiY'),
    liff_url = COALESCE(NULLIF(liff_url, ''), 'https://liff.line.me/2009560906-c5taZfiY')
WHERE liff_id IS NULL OR liff_id = '';
