-- Migration: 0052_rename_tenant_haojihui_to_dapinglin.sql
-- Description: Rename tenant 'haojihui' to 'dapinglin' while preserving brand name, categories, items, and settings.

-- 1. Ensure 'dapinglin' exists in tenants table
INSERT INTO tenants (id, name, created_at)
SELECT 'dapinglin', name, created_at
FROM tenants
WHERE id = 'haojihui'
ON CONFLICT(id) DO UPDATE SET name = excluded.name;

-- Fallback insert if 'haojihui' row was missing in tenants
INSERT OR IGNORE INTO tenants (id, name)
VALUES ('dapinglin', '好雞匯 蔬鮮輕食');

-- 2. Update tenant_config
UPDATE tenant_config
SET tenant_id = 'dapinglin'
WHERE tenant_id = 'haojihui';

-- 3. Update menu_categories
UPDATE menu_categories
SET tenant_id = 'dapinglin'
WHERE tenant_id = 'haojihui';

-- 4. Update menu_items
UPDATE menu_items
SET tenant_id = 'dapinglin'
WHERE tenant_id = 'haojihui';

-- 5. Update menu_customizations
UPDATE menu_customizations
SET tenant_id = 'dapinglin'
WHERE tenant_id = 'haojihui';

-- 6. Update orders
UPDATE orders
SET tenant_id = 'dapinglin'
WHERE tenant_id = 'haojihui';

-- 7. Update order_items
UPDATE order_items
SET tenant_id = 'dapinglin'
WHERE tenant_id = 'haojihui';

-- 8. Update pending_actions
UPDATE pending_actions
SET tenant_id = 'dapinglin'
WHERE tenant_id = 'haojihui';

-- 9. Update menu bundle rules and threshold rules (if applicable)
UPDATE menu_bundle_rules
SET tenant_id = 'dapinglin'
WHERE tenant_id = 'haojihui';

UPDATE menu_customization_option_rules
SET tenant_id = 'dapinglin'
WHERE tenant_id = 'haojihui';

-- 10. Delete old tenant record
DELETE FROM tenants
WHERE id = 'haojihui';
