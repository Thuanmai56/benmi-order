import { Env } from '../types/env';
import { json } from '../utils/http';
import { getTenantBootstrap } from './bootstrap';
import { getTenantId } from './menu';

/** Read adapter only: retain legacy identities until the data migration is complete. */
export function buildModifierLibrary(bootstrap: any, groups: any[], options: any[], itemLinks: any[], categoryLinks: any[]) {
  const library: any[] = [];
  const represented = new Set<string>();
  const add = (group: any, source: string) => {
    const aliases = [group.id, `mg_${group.id}`].filter(Boolean);
    const matches = groups.filter(g => aliases.includes(g.id));
    // Never silently choose between two stored identities.
    if (matches.length > 1) throw new Error('AMBIGUOUS_MODIFIER_IDENTITY');
    const canonical = matches[0];
    if (canonical) represented.add(canonical.id);
    const canonicalId = canonical?.id || null;
    library.push({ ...group, minSelection: canonical?.min_selection, maxSelection: canonical?.max_selection, source, sourceId: group.id, canonicalId,
      itemIds: itemLinks.filter(l => l.group_id === canonicalId).map(l => l.item_id),
      categoryIds: categoryLinks.filter(l => l.group_id === canonicalId).map(l => l.category_id)
    });
  };
  for (const group of bootstrap.customizations || []) add({
    ...group, name: group.title, scope: group.scope || 'order',
    selectionType: group.type === 'checkbox' ? 'multiple' : 'single'
  }, 'customization');
  for (const group of bootstrap.modifiers || []) add({ ...group, scope: 'category' }, 'modifier_category');
  for (const group of groups) {
    if (represented.has(group.id)) continue;
    library.push({
      id: group.id, canonicalId: group.id, sourceId: group.id, source: 'canonical',
      name: group.name, scope: group.scope || 'item', selectionType: group.selection_type,
      isRequired: Boolean(group.is_required), minSelection: group.min_selection,
      maxSelection: group.max_selection, sortOrder: group.sort_order,
      options: options.filter(o => o.group_id === group.id).map(o => ({
        id: o.id, name: o.name, price: o.price, isDefault: Boolean(o.is_default),
        outOfStockUntil: o.out_of_stock_until,
        isOutOfStock: Boolean(o.out_of_stock_until && Date.parse(o.out_of_stock_until) > Date.now())
      })),
      itemIds: itemLinks.filter(l => l.group_id === group.id).map(l => l.item_id),
      categoryIds: categoryLinks.filter(l => l.group_id === group.id).map(l => l.category_id)
    });
  }
  return library;
}

export async function getModifierLibrary(request: Request, env: Env): Promise<Response> {
  const tenantId = getTenantId(request);
  const bootstrapResponse = await getTenantBootstrap(request, env);
  if (!bootstrapResponse.ok) return bootstrapResponse;
  const bootstrap: any = await bootstrapResponse.json();
  if (!bootstrap.menuComplete) return json({ error: 'INCOMPLETE_MENU' }, 503);
  try {
    const results = await env.DB.batch([
      env.DB.prepare('SELECT * FROM modifier_groups WHERE tenant_id = ? ORDER BY sort_order,id').bind(tenantId),
      env.DB.prepare('SELECT * FROM modifier_options WHERE tenant_id = ? ORDER BY sort_order,id').bind(tenantId),
      env.DB.prepare('SELECT item_id,group_id FROM item_modifier_links WHERE tenant_id = ? ORDER BY sort_order').bind(tenantId),
      env.DB.prepare('SELECT category_id,group_id FROM category_modifier_links WHERE tenant_id = ? ORDER BY sort_order').bind(tenantId)
    ]);
    if (results.some(r => !r.success)) throw new Error('INCOMPLETE_MODIFIER_LIBRARY');
    const [groups, options, items, categories] = results.map(r => r.results);
    return json({ complete: true, groups: buildModifierLibrary(bootstrap, groups, options, items, categories) });
  } catch (error) {
    console.error('Modifier library failed', tenantId, error);
    return json({ error: 'INCOMPLETE_MODIFIER_LIBRARY' }, 503);
  }
}
