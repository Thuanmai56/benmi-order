-- The unified reader resolves explicit item links only. Preserve the category
-- assignments that existed before that cutover, across active tenants in scope.
-- Direct overrides (including disabled links and option subsets) win.
-- Operator-requested scope: this tenant was repaired manually. Keep the
-- exclusion as migration configuration and apply it to every data write below.
CREATE TABLE _option_cutover_exclusions_0072 (tenant_id TEXT PRIMARY KEY);
INSERT INTO _option_cutover_exclusions_0072 (tenant_id) VALUES ('benmi');

INSERT INTO item_modifier_links (tenant_id, item_id, group_id, sort_order)
SELECT l.tenant_id, p.id, l.group_id, l.sort_order
FROM category_modifier_links l
JOIN menu_categories c ON c.id = l.category_id AND c.tenant_id = l.tenant_id
JOIN menu_items p ON p.category_id = c.id AND p.tenant_id = l.tenant_id
JOIN modifier_groups g ON g.id = l.group_id AND g.tenant_id = l.tenant_id
WHERE COALESCE(g.scope, 'item') <> 'order'
  AND NOT EXISTS (SELECT 1 FROM _option_cutover_exclusions_0072 e WHERE e.tenant_id = l.tenant_id)
  AND COALESCE(c.category_type, 'catalog') = 'catalog'
  AND NOT EXISTS (SELECT 1 FROM tenant_lifecycle t WHERE t.tenant_id = l.tenant_id AND t.state <> 'active')
ON CONFLICT (tenant_id, item_id, group_id) DO NOTHING;

-- Some legacy seeds confused pricing.type="included" (zero surcharge) with
-- the canonical included flag (select EVERY option). Only repair untouched
-- seeded groups whose original rule explicitly describes an included-price
-- choice; preserve actual fixed groups and subsequent editor changes.
UPDATE modifier_groups AS g
SET included = 0, revision = revision + 1, updated_at = datetime('now')
WHERE g.included = 1 AND g.revision = 0
  AND NOT EXISTS (SELECT 1 FROM _option_cutover_exclusions_0072 e WHERE e.tenant_id = g.tenant_id)
  AND NOT EXISTS (SELECT 1 FROM tenant_lifecycle t WHERE t.tenant_id = g.tenant_id AND t.state <> 'active')
  AND EXISTS (
    SELECT 1 FROM menu_bundle_rules r, json_each(r.config_json, '$.groups') j
    WHERE r.tenant_id = g.tenant_id AND r.is_active = 1
      AND r.id = json_extract(g.source_metadata_json, '$.legacyBundleRuleId')
      AND json_extract(j.value, '$.id') = json_extract(g.source_metadata_json, '$.legacyGroupId')
      AND COALESCE(json_extract(j.value, '$.type'), 'choice') = 'choice'
      AND json_extract(j.value, '$.pricing.type') = 'included'
  );

DROP TABLE _option_cutover_exclusions_0072;

-- No menu item, price, stock, order or existing option is rewritten. Legacy
-- category links remain available for rollback. Refresh bootstrap caches for
-- affected tenants after applying (see docs/fixes/unified-option-cutover.md).
