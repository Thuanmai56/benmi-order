-- Keep the existing production prefix when resolving the H collision in dev/staging.
-- Do not overwrite a prefix that has since been customized.
UPDATE tenant_config
SET order_prefix = 'HJ'
WHERE tenant_id = 'haojihui'
  AND UPPER(TRIM(order_prefix)) = 'H';

-- Enforce uniqueness for configured prefixes across all tenants, including inactive
-- ones. Ignore ASCII letter case and surrounding spaces; retain nullable defaults.
CREATE UNIQUE INDEX IF NOT EXISTS idx_tenant_config_order_prefix_unique
ON tenant_config (UPPER(TRIM(order_prefix)));
