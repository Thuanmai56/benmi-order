import { Env } from '../types/env';
import { OrderItemInput } from '../types/index';

type BundleSource = { type: 'category' | 'item_list'; refId?: string; categoryId?: string; itemIds?: string[] };
export type BundleGroup = {
  id: string;
  type: 'choice' | 'fixed';
  label: { 'zh-TW': string; vi: string };
  name: string;
  minQuantity: number;
  maxQuantity: number;
  allowRepeats: boolean;
  sources: BundleSource[];
  items: Array<{ itemId: string; quantity: number; surcharge: number }>;
  surcharges: Record<string, number>;
};

const money = (value: unknown): number => Number(value);
const validMoney = (value: unknown): boolean => Number.isFinite(money(value)) && money(value) >= 0 && Math.abs(Math.round(money(value) * 100) - money(value) * 100) < 0.000001;
const positiveInt = (value: unknown): boolean => Number.isInteger(Number(value)) && Number(value) > 0;

export function normalizeBundleConfig(input: any, allowedItems: Map<string, any>, parentId: string): { version: 2; groups: BundleGroup[] } {
  if (!Array.isArray(input?.groups) || !input.groups.length) throw new Error('BUNDLE_GROUPS_REQUIRED');
  const ids = new Set<string>();
  const groups = input.groups.map((raw: any, index: number): BundleGroup => {
    const id = String(raw.id || `group_${index + 1}_${crypto.randomUUID()}`);
    if (ids.has(id)) throw new Error('BUNDLE_DUPLICATE_GROUP');
    ids.add(id);
    const type = raw.type === 'fixed' ? 'fixed' : 'choice';
    const label = {
      'zh-TW': String(raw.label?.['zh-TW'] || raw.name || '').trim(),
      vi: String(raw.label?.vi || '').trim()
    };
    if (!label['zh-TW'] || !label.vi) throw new Error(`BUNDLE_GROUP_LABEL_REQUIRED:${index}`);
    const minQuantity = Number(raw.minQuantity ?? 1);
    const maxQuantity = Number(raw.maxQuantity ?? minQuantity);
    if (!positiveInt(minQuantity) || !positiveInt(maxQuantity) || maxQuantity < minQuantity) throw new Error(`BUNDLE_INVALID_QUANTITY:${index}`);
    const sources: BundleSource[] = type === 'choice' && Array.isArray(raw.sources) ? raw.sources : [];
    const items = type === 'fixed' && Array.isArray(raw.items) ? raw.items.map((it: any) => ({
      itemId: String(it.itemId || ''), quantity: Number(it.quantity), surcharge: Number(it.surcharge || 0)
    })) : [];
    const surcharges: Record<string, number> = type === 'choice' && raw.surcharges && typeof raw.surcharges === 'object' ? raw.surcharges : {};
    const eligible = new Set<string>();
    for (const source of sources) {
      if (source.type === 'category') {
        const categoryId = source.refId || source.categoryId;
        for (const item of allowedItems.values()) if (item.category_id === categoryId) eligible.add(item.id);
      } else if (source.type === 'item_list') {
        for (const itemId of source.itemIds || []) eligible.add(itemId);
      } else throw new Error(`BUNDLE_INVALID_SOURCE:${index}`);
    }
    for (const itemId of eligible) if (itemId === parentId || !allowedItems.has(itemId)) throw new Error(`BUNDLE_INVALID_CHILD:${index}`);
    for (const item of items) {
      if (!allowedItems.has(item.itemId) || item.itemId === parentId || !positiveInt(item.quantity) || !validMoney(item.surcharge)) throw new Error(`BUNDLE_INVALID_CHILD:${index}`);
    }
    if (new Set(items.map((item: { itemId: string }) => item.itemId)).size !== items.length) throw new Error(`BUNDLE_DUPLICATE_FIXED_ITEM:${index}`);
    for (const [itemId, amount] of Object.entries(surcharges)) {
      if (!eligible.has(itemId) || !validMoney(amount)) throw new Error(`BUNDLE_INVALID_SURCHARGE:${index}`);
    }
    if (type === 'fixed' && !items.length) throw new Error(`BUNDLE_ITEMS_REQUIRED:${index}`);
    if (type === 'choice' && (eligible.size < 1 || (!raw.allowRepeats && eligible.size < minQuantity))) throw new Error(`BUNDLE_INSUFFICIENT_ITEMS:${index}`);
    return { id, type, label, name: label['zh-TW'], minQuantity: type === 'fixed' ? items.reduce((s: number, it: { quantity: number }) => s + it.quantity, 0) : minQuantity,
      maxQuantity: type === 'fixed' ? items.reduce((s: number, it: { quantity: number }) => s + it.quantity, 0) : maxQuantity,
      allowRepeats: type === 'choice' && Boolean(raw.allowRepeats), sources, items, surcharges };
  });
  return { version: 2, groups };
}

export async function loadBundleCatalog(env: Env, tenantId: string) {
  const [itemsResult, rulesResult, categoriesResult] = await env.DB.batch([
    env.DB.prepare('SELECT id, category_id, name, price, out_of_stock_until FROM menu_items WHERE tenant_id = ?').bind(tenantId),
    env.DB.prepare('SELECT parent_item_id, config_json FROM menu_bundle_rules WHERE tenant_id = ? AND is_active = 1').bind(tenantId),
    env.DB.prepare("SELECT id, slug, COALESCE(category_type, 'catalog') AS category_type, COALESCE(allow_customization, 1) AS allow_customization, COALESCE(applied_modifiers, '') AS applied_modifiers FROM menu_categories WHERE tenant_id = ?").bind(tenantId)
  ]);
  const rules = new Map<string, any>();
  for (const row of rulesResult.results as any[]) {
    try { rules.set(row.parent_item_id, JSON.parse(row.config_json)); }
    catch { throw new Error(`BUNDLE_CONFIG_INVALID:${row.parent_item_id}`); }
  }
  return { items: new Map((itemsResult.results as any[]).map(row => [row.id, row])), rules,
    categories: new Map((categoriesResult.results as any[]).map(row => [row.id, row])) };
}

export type BundleCheck = { valid: boolean; error?: string; code?: string; itemIndex?: number; portionIndex?: number; groupId?: string; childId?: string; expectedSubtotal?: number };

export async function validateBundleOrderItems(env: Env, tenantId: string, rawItems: OrderItemInput[]): Promise<BundleCheck> {
  if (!env.DB || !rawItems.length) return { valid: true };
  const hasSnapshot = rawItems.some(item => Boolean(item.bundleSelections || item.bundle_snapshot_json));
  if (!hasSnapshot) {
    const itemIds = [...new Set(rawItems.map(item => item.itemId || item.item_id).filter(Boolean))];
    if (!itemIds.length) return { valid: true };
    try {
      const placeholders = itemIds.map(() => '?').join(',');
      const active = await env.DB.prepare(`SELECT 1 FROM menu_bundle_rules WHERE tenant_id = ? AND parent_item_id IN (${placeholders}) AND is_active = 1 LIMIT 1`).bind(tenantId, ...itemIds).first();
      if (!active) return { valid: true };
    } catch { return { valid: false, code: 'BUNDLE_CONFIG_UNAVAILABLE', error: '無法讀取套餐設定，請稍後再試' }; }
  }
  let catalog: Awaited<ReturnType<typeof loadBundleCatalog>>;
  try { catalog = await loadBundleCatalog(env, tenantId); }
  catch { return { valid: false, code: 'BUNDLE_CONFIG_UNAVAILABLE', error: '無法讀取套餐設定，請稍後再試' }; }
  const modifiersResult = await env.DB.prepare('SELECT c.id AS group_id, c.slug AS group_slug, i.id AS option_id, i.name, i.price, i.out_of_stock_until, c.is_required, c.min_selection, c.max_selection FROM menu_categories c JOIN menu_items i ON i.category_id = c.id AND i.tenant_id = c.tenant_id WHERE c.tenant_id = ? AND c.category_type = ?').bind(tenantId, 'modifier').all<any>();
  const options = new Map((modifiersResult.results || []).map((row: any) => [row.option_id, row]));

  let itemModifiersResult: any = { results: [] };
  let catModifiersResult: any = { results: [] };
  try {
    const [itemRes, catRes] = await env.DB.batch([
      env.DB.prepare(
        `SELECT l.item_id, g.id AS group_id, g.name AS group_name, g.selection_type,
                COALESCE(g.is_required, 0) AS is_required,
                COALESCE(g.min_selection, 0) AS min_selection,
                COALESCE(g.max_selection, 1) AS max_selection,
                o.id AS option_id, o.name AS option_name, COALESCE(o.price, 0) AS price,
                o.out_of_stock_until
         FROM item_modifier_links l
         JOIN modifier_groups g ON g.id = l.group_id AND g.tenant_id = l.tenant_id
         LEFT JOIN modifier_options o ON o.group_id = g.id AND o.tenant_id = g.tenant_id
         WHERE l.tenant_id = ?`
      ).bind(tenantId),
      env.DB.prepare(
        `SELECT l.category_id, g.id AS group_id, g.name AS group_name, g.selection_type,
                COALESCE(g.is_required, 0) AS is_required,
                COALESCE(g.min_selection, 0) AS min_selection,
                COALESCE(g.max_selection, 1) AS max_selection,
                o.id AS option_id, o.name AS option_name, COALESCE(o.price, 0) AS price,
                o.out_of_stock_until
         FROM category_modifier_links l
         JOIN modifier_groups g ON g.id = l.group_id AND g.tenant_id = l.tenant_id
         LEFT JOIN modifier_options o ON o.group_id = g.id AND o.tenant_id = g.tenant_id
         WHERE l.tenant_id = ?`
      ).bind(tenantId)
    ]);
    itemModifiersResult = itemRes || { results: [] };
    catModifiersResult = catRes || { results: [] };
  } catch (err) {
    // Graceful fallback if tables do not exist
  }
  const itemOptionsByItem = new Map<string, Map<string, any>>();
  const itemGroupsByItem = new Map<string, Map<string, any>>();
  for (const row of (itemModifiersResult.results || [])) {
    if (!row.item_id || !row.option_id) continue;
    if (!itemOptionsByItem.has(row.item_id)) {
      itemOptionsByItem.set(row.item_id, new Map());
      itemGroupsByItem.set(row.item_id, new Map());
    }
    itemOptionsByItem.get(row.item_id)!.set(row.option_id, row);
    if (!itemGroupsByItem.get(row.item_id)!.has(row.group_id)) {
      itemGroupsByItem.get(row.item_id)!.set(row.group_id, {
        group_id: row.group_id,
        group_name: row.group_name,
        selection_type: row.selection_type,
        is_required: Boolean(row.is_required),
        min_selection: Number(row.min_selection || 0),
        max_selection: Number(row.max_selection || 1),
      });
    }
  }

  const catOptionsByCat = new Map<string, Map<string, any>>();
  const catGroupsByCat = new Map<string, Map<string, any>>();
  for (const row of (catModifiersResult.results || [])) {
    if (!row.category_id || !row.option_id) continue;
    if (!catOptionsByCat.has(row.category_id)) {
      catOptionsByCat.set(row.category_id, new Map());
      catGroupsByCat.set(row.category_id, new Map());
    }
    catOptionsByCat.get(row.category_id)!.set(row.option_id, row);
    if (!catGroupsByCat.get(row.category_id)!.has(row.group_id)) {
      catGroupsByCat.get(row.category_id)!.set(row.group_id, {
        group_id: row.group_id,
        group_name: row.group_name,
        selection_type: row.selection_type,
        is_required: Boolean(row.is_required),
        min_selection: Number(row.min_selection || 0),
        max_selection: Number(row.max_selection || 1),
      });
    }
  }

  for (let itemIndex = 0; itemIndex < rawItems.length; itemIndex++) {
    const orderItem = rawItems[itemIndex];
    const parentId = orderItem.itemId || orderItem.item_id || '';
    const rule = catalog.rules.get(parentId);
    if (!rule) {
      if (orderItem.bundleSelections || orderItem.bundle_snapshot_json) return { valid: false, code: 'BUNDLE_RULE_NOT_FOUND', error: '套餐設定已變更，請重新選擇', itemIndex };
      continue;
    }
    const fail = (code: string, portionIndex?: number, groupId?: string, expectedSubtotal?: number, childId?: string): BundleCheck => ({ valid: false, code, error: '套餐內容或價格已變更，請重新確認', itemIndex, portionIndex, groupId, childId, expectedSubtotal });
    if (!Array.isArray(rule.groups) || !rule.groups.length) return fail('BUNDLE_CONFIG_INVALID');
    const parent = catalog.items.get(parentId);
    if (!parent) return fail('BUNDLE_PARENT_MISSING');
    if (parent.out_of_stock_until && new Date(parent.out_of_stock_until).getTime() > Date.now()) return fail('BUNDLE_PARENT_OUT_OF_STOCK');
    const qty = Number(orderItem.quantity);
    if (!positiveInt(qty)) return fail('BUNDLE_INVALID_QUANTITY');
    let snapshot: any;
    try {
      const rawSnapshot = orderItem.bundleSelections || orderItem.bundle_snapshot_json;
      snapshot = typeof rawSnapshot === 'string' ? JSON.parse(rawSnapshot) : rawSnapshot;
    }
    catch { return fail('BUNDLE_INVALID_SELECTION'); }
    const portions: any[] = snapshot?.portions || (Array.isArray(snapshot) ? snapshot : []);
    if (!Array.isArray(portions) || portions.length !== qty) return fail('BUNDLE_SELECTION_REQUIRED');
    let surchargeTotal = 0;
    for (let portionIndex = 0; portionIndex < portions.length; portionIndex++) {
      const portion = portions[portionIndex];
      if (!portion || !Array.isArray(portion.groups) || portion.groups.length !== (rule.groups || []).length || new Set(portion.groups.map((group: any) => group.groupId)).size !== portion.groups.length) return fail('BUNDLE_INVALID_GROUPS', portionIndex);
      for (const groupRule of rule.groups || []) {
        const selectedGroup = (portion.groups || []).find((group: any) => group.groupId === groupRule.id);
        if (!selectedGroup || !Array.isArray(selectedGroup.items)) return fail('BUNDLE_GROUP_REQUIRED', portionIndex, groupRule.id);
        const validLabels = Object.values(groupRule.label || {}).filter(Boolean);
        selectedGroup.groupName = validLabels.includes(selectedGroup.groupName) ? selectedGroup.groupName : (groupRule.label?.['zh-TW'] || groupRule.name || '套餐內容');
        const count = selectedGroup.items.reduce((sum: number, it: any) => sum + Number(it.quantity || 0), 0);
        const min = Number(groupRule.minQuantity ?? groupRule.minSelections ?? groupRule.requiredCount ?? 1);
        const max = Number(groupRule.maxQuantity ?? groupRule.maxSelections ?? groupRule.requiredCount ?? min);
        if (count < min || count > max) return fail('BUNDLE_GROUP_QUANTITY', portionIndex, groupRule.id);
        const seen = new Set<string>();
        const allowed = new Set<string>();
        for (const source of groupRule.sources || []) {
          if (source.type === 'category') for (const child of catalog.items.values()) if (child.category_id === (source.refId || source.categoryId)) allowed.add(child.id);
          if (source.type === 'item_list') for (const id of source.itemIds || []) allowed.add(id);
        }
        const fixed = new Map((groupRule.items || []).map((it: any) => [it.itemId, Number(it.quantity)]));
        for (const selected of selectedGroup.items) {
          const childId = selected.itemId || selected.item_id;
          const child = catalog.items.get(childId);
          if (!child || childId === parentId || catalog.rules.has(childId) || !positiveInt(selected.quantity)) return fail('BUNDLE_INVALID_CHILD', portionIndex, groupRule.id, undefined, childId);
          if (child.out_of_stock_until && new Date(child.out_of_stock_until).getTime() > Date.now()) return fail('BUNDLE_CHILD_OUT_OF_STOCK', portionIndex, groupRule.id, undefined, childId);
          if (groupRule.type === 'fixed') {
            if (!fixed.has(childId)) return fail('BUNDLE_INVALID_CHILD', portionIndex, groupRule.id, undefined, childId);
            fixed.set(childId, Number(fixed.get(childId)) - Number(selected.quantity));
          } else if (!allowed.has(childId)) return fail('BUNDLE_INVALID_CHILD', portionIndex, groupRule.id, undefined, childId);
          if (groupRule.type !== 'fixed' && groupRule.allowRepeats === false && (seen.has(childId) || Number(selected.quantity) > 1)) return fail('BUNDLE_REPEATED_CHILD', portionIndex, groupRule.id, undefined, childId);
          seen.add(childId);
          const extra = groupRule.type === 'fixed' ? (groupRule.items || []).find((it: any) => it.itemId === childId)?.surcharge || 0 : groupRule.surcharges?.[childId] || 0;
          surchargeTotal += Number(extra) * Number(selected.quantity);
          selected.itemId = childId;
          selected.name = child.name;
          selected.surcharge = Number(extra);
          selected.price = 0;
          const category = catalog.categories.get(child.category_id);
          let applied: string[] = [];
          try { applied = JSON.parse(category?.applied_modifiers || '[]'); }
          catch { applied = String(category?.applied_modifiers || '').split(',').map((value: string) => value.trim()).filter(Boolean); }
          if (!Array.isArray(applied)) applied = [];
          const mods = Array.isArray(selected.modifiers) ? selected.modifiers : [];

          const itemOpts = itemOptionsByItem.get(childId);
          const catOpts = catOptionsByCat.get(child.category_id);
          const hasItemMods = Boolean(itemOpts && itemOpts.size > 0);
          const hasCatMods = Boolean(category?.allow_customization && (Boolean(catOpts && catOpts.size > 0) || applied.length > 0));

          if (mods.length && !hasCatMods && !hasItemMods) return fail('BUNDLE_MODIFIER_NOT_ALLOWED', portionIndex, groupRule.id, undefined, childId);

          const countByCatGroup = new Map<string, number>();
          const countByItemGroup = new Map<string, number>();
          const seenOptions = new Set<string>();
          for (const mod of mods) {
            const itemOpt = itemOpts?.get(mod.optionId);
            if (itemOpt && itemOpt.group_id === mod.groupId) {
              if (seenOptions.has(itemOpt.option_id) || (itemOpt.out_of_stock_until && new Date(itemOpt.out_of_stock_until).getTime() > Date.now())) {
                return fail('BUNDLE_MODIFIER_NOT_ALLOWED', portionIndex, groupRule.id, undefined, childId);
              }
              seenOptions.add(itemOpt.option_id);
              countByItemGroup.set(itemOpt.group_id, (countByItemGroup.get(itemOpt.group_id) || 0) + 1);
              mod.name = itemOpt.option_name || mod.name;
              mod.price = Number(itemOpt.price || 0);
              surchargeTotal += Number(itemOpt.price || 0) * Number(selected.quantity);
              continue;
            }

            const catOpt = catOpts?.get(mod.optionId);
            if (catOpt && catOpt.group_id === mod.groupId) {
              if (seenOptions.has(catOpt.option_id) || (catOpt.out_of_stock_until && new Date(catOpt.out_of_stock_until).getTime() > Date.now())) {
                return fail('BUNDLE_MODIFIER_NOT_ALLOWED', portionIndex, groupRule.id, undefined, childId);
              }
              seenOptions.add(catOpt.option_id);
              countByCatGroup.set(catOpt.group_id, (countByCatGroup.get(catOpt.group_id) || 0) + 1);
              mod.name = catOpt.option_name || mod.name;
              mod.price = Number(catOpt.price || 0);
              surchargeTotal += Number(catOpt.price || 0) * Number(selected.quantity);
              continue;
            }

            const option = options.get(mod.optionId);
            if (option && option.group_id === mod.groupId && (applied.includes('*') || applied.includes(option.group_id) || applied.includes(option.group_slug))) {
              if (seenOptions.has(option.option_id) || (option.out_of_stock_until && new Date(option.out_of_stock_until).getTime() > Date.now())) {
                return fail('BUNDLE_MODIFIER_NOT_ALLOWED', portionIndex, groupRule.id, undefined, childId);
              }
              seenOptions.add(option.option_id);
              countByCatGroup.set(option.group_id, (countByCatGroup.get(option.group_id) || 0) + 1);
              mod.name = option.name;
              mod.price = Number(option.price || 0);
              surchargeTotal += Number(option.price || 0) * Number(selected.quantity);
              continue;
            }

            return fail('BUNDLE_MODIFIER_NOT_ALLOWED', portionIndex, groupRule.id, undefined, childId);
          }

          if (Number(rule.version || 1) >= 2) {
            const catGroups = catGroupsByCat.get(child.category_id);
            if (catGroups && catGroups.size > 0) {
              for (const [modId, config] of catGroups) {
                const count = countByCatGroup.get(modId) || 0;
                const minReq = Number(config.min_selection ?? (config.is_required ? 1 : 0));
                const maxReq = config.max_selection ? Number(config.max_selection) : undefined;
                if (count < minReq || (maxReq !== undefined && count > maxReq)) {
                  return fail('BUNDLE_MODIFIER_REQUIRED', portionIndex, groupRule.id, undefined, childId);
                }
              }
            } else if (hasCatMods) {
              const allowedGroups = new Map<string, any>();
              for (const option of options.values()) {
                if (applied.includes('*') || applied.includes(option.group_id) || applied.includes(option.group_slug)) {
                  allowedGroups.set(option.group_id, option);
                }
              }
              for (const [modId, config] of allowedGroups) {
                const count = countByCatGroup.get(modId) || 0;
                const minReq = Number(config.min_selection ?? (config.is_required ? 1 : 0));
                const maxReq = config.max_selection ? Number(config.max_selection) : undefined;
                if (count < minReq || (maxReq !== undefined && count > maxReq)) {
                  return fail('BUNDLE_MODIFIER_REQUIRED', portionIndex, groupRule.id, undefined, childId);
                }
              }
            }

            if (hasItemMods) {
              const itemGroups = itemGroupsByItem.get(childId);
              if (itemGroups) {
                for (const [modId, config] of itemGroups) {
                  const count = countByItemGroup.get(modId) || 0;
                  const minReq = Number(config.min_selection ?? (config.is_required ? 1 : 0));
                  const maxReq = config.max_selection ? Number(config.max_selection) : undefined;
                  if (count < minReq || (maxReq !== undefined && count > maxReq)) {
                    return fail('BUNDLE_MODIFIER_REQUIRED', portionIndex, groupRule.id, undefined, childId);
                  }
                }
              }
            }
          }
        }
        if (groupRule.type === 'fixed' && [...fixed.values()].some(remaining => remaining !== 0)) return fail('BUNDLE_FIXED_ITEMS_CHANGED', portionIndex, groupRule.id);
      }
    }
    let parentOpts: any[] = [];
    const rawParentOpts = orderItem.options || orderItem.selected_options;
    if (Array.isArray(rawParentOpts)) {
      parentOpts = rawParentOpts;
    } else if (typeof rawParentOpts === 'string') {
      try { parentOpts = JSON.parse(rawParentOpts); } catch {}
    }
    const parentOptionsExtra = (Array.isArray(parentOpts) ? parentOpts : []).reduce((sum: number, opt: any) => sum + (Number(opt.price || 0) * (Number(opt.quantity || 1))), 0) * qty;
    const expectedSubtotal = Math.round((Number(parent.price) * qty + surchargeTotal + parentOptionsExtra) * 100) / 100;
    if (!Number.isFinite(Number(orderItem.subtotal)) || Math.abs(Number(orderItem.subtotal) - expectedSubtotal) > 0.001) return fail('BUNDLE_PRICE_CHANGED', undefined, undefined, expectedSubtotal);
    orderItem.name = parent.name;
    orderItem.price = Number(parent.price);
    orderItem.subtotal = expectedSubtotal;
    orderItem.bundleSelections = snapshot;
    orderItem.bundle_snapshot_json = JSON.stringify(snapshot);
  }
  return { valid: true };
}
