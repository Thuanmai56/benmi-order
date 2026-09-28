-- Read-only inventory. Run against one environment at a time.
SELECT g.tenant_id, g.id, g.name, g.scope,
 (SELECT COUNT(*) FROM modifier_options o WHERE o.tenant_id=g.tenant_id AND o.group_id=g.id) AS options_count,
 (SELECT COUNT(*) FROM item_modifier_links l WHERE l.tenant_id=g.tenant_id AND l.group_id=g.id) AS item_links,
 (SELECT COUNT(*) FROM category_modifier_links l WHERE l.tenant_id=g.tenant_id AND l.group_id=g.id) AS category_links,
 (SELECT COUNT(*) FROM menu_customizations c WHERE c.tenant_id=g.tenant_id AND (g.id=c.id OR g.id='mg_'||c.id)) AS legacy_matches
FROM modifier_groups g ORDER BY g.tenant_id,g.id;

-- Legacy groups without a canonical counterpart; do not match by display name.
SELECT c.tenant_id,c.id,c.title FROM menu_customizations c
WHERE NOT EXISTS (SELECT 1 FROM modifier_groups g WHERE g.tenant_id=c.tenant_id AND (g.id=c.id OR g.id='mg_'||c.id));

-- Legacy modifier categories: mapping requires explicit review.
SELECT c.tenant_id,c.id,c.slug,c.name,
 (SELECT COUNT(*) FROM menu_items i WHERE i.tenant_id=c.tenant_id AND i.category_id=c.id) AS options_count
FROM menu_categories c WHERE c.category_type='modifier';

-- A legacy group represented by multiple candidate IDs.
SELECT c.tenant_id,c.id,c.title,COUNT(g.id) AS candidate_count
FROM menu_customizations c JOIN modifier_groups g
 ON g.tenant_id=c.tenant_id AND (g.id=c.id OR g.id='mg_'||c.id)
GROUP BY c.tenant_id,c.id,c.title HAVING COUNT(g.id)>1;

-- Inspect item bindings without reading customer/order data.
SELECT l.tenant_id,i.id AS item_id,i.name AS item_name,g.id AS group_id,g.name AS group_name
FROM item_modifier_links l
LEFT JOIN menu_items i ON i.tenant_id=l.tenant_id AND i.id=l.item_id
LEFT JOIN modifier_groups g ON g.tenant_id=l.tenant_id AND g.id=l.group_id
ORDER BY l.tenant_id,i.id,g.id;
