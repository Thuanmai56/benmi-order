import { Env } from '../types/env';
import { json } from '../utils/http';
import { getTenantId } from './menu';
import { resolveTenantContext } from './tenant';

export interface BootstrapBundleGroup {
  id: string;
  name: string;
  label?: any;
  minQuantity: number;
  maxQuantity: number;
  allowRepeats: boolean;
  sources: Array<{
    type: 'category' | 'item_list';
    refId?: string;
    itemIds?: string[];
  }>;
  eligibleItems?: Array<{
    id: string;
    name: string;
    price: number;
    surcharge: number;
    isOutOfStock: boolean;
    categoryId?: string;
  }>;
}

export interface BootstrapBundleRule {
  version: number;
  groups: BootstrapBundleGroup[];
}

export interface BootstrapResponse {
  tenant: {
    id: string;
    brandName: string;
    brandSubtitle?: string;
    brandColor: string;
    brandColorDark: string;
    logoUrl: string | null;
    storeAddress: string | null;
    announcement?: string | null;
    operatingHours: string | null;
    parsedHours: Record<string, Array<{ start: string; end: string }>>;
    deliveryPolicy: string | null;
    allowScheduledPickup: boolean;
    allowDineIn: boolean;
    features: string[];
    orderPrefix?: string;
    storeStatus: string;
    liffId: string | null;
    liffUrl: string | null;
    locale: string;
  };
  catalog: Array<{
    id: string;
    slug: string;
    name: string;
    shortName?: string | null;
    allowCustomization: boolean;
    appliedModifiers: string[];
    pricingRules?: any | null;
    sortOrder: number;
    items: Array<{
      id: string;
      name: string;
      price: number;
      description: string | null;
      imageUrl: string | null;
      isOutOfStock: boolean;
      isRecommended: boolean;
      badgeText?: string | null;
      badge?: string | null;
      bundleRule?: BootstrapBundleRule | null;
      sortOrder: number;
    }>;
  }>;
  modifiers: Array<{
    id: string;
    slug: string;
    name: string;
    selectionType: 'single' | 'multiple' | 'combo_drink';
    isRequired: boolean;
    minSelection: number;
    maxSelection: number;
    options: Array<{
      id: string;
      name: string;
      price: number;
      isDefault: boolean;
      isOutOfStock: boolean;
    }>;
  }>;
  customizations?: Array<{
    id: string;
    key: string;
    title: string;
    type: 'radio' | 'checkbox';
    sortOrder: number;
    options: Array<{
      id?: string;
      name: string;
      price?: number;
      min_order_amount?: number;
      minOrderSubtotal?: number;
      thresholdBasis?: string;
      ruleErrorMessage?: string;
      sub_options?: string[];
    }>;
  }>;
  translations?: Record<string, string>;
  recommended?: string[];
}

const BENMI_TRANSLATIONS: Record<string, string> = {
  "燒肉": "Braised pork / Thịt nguội",
  "火腿": "Ham / Chả",
  "雞肉": "Chicken / Thịt gà",
  "烤肉": "Grilled Meat / Thịt nướng",
  "雙層烤肉": "Double Cheesebanhmi / Thịt nướng phô mai",
  "綜合": "Mixed / Thập cẩm",
  "越南咖啡": "Coffee with Condensed Milk / Cà phê sữa",
  "豆漿": "Soy milk / Sữa đậu nành",
  "紅茶": "Black Tea / Hồng trà",
  "可樂": "Cocacola / Sprite",
  "雪碧": "Cocacola / Sprite"
};

export function parseOperatingHours(raw: string | null, tenantId: string): Record<string, Array<{ start: string; end: string }>> {
  const result: Record<string, Array<{ start: string; end: string }>> = {};

  if (!raw || raw.trim() === '') {
    const defaultShifts = [{ start: "11:00", end: "21:00" }];
    for (let i = 0; i < 7; i++) result[String(i)] = defaultShifts;
    return result;
  }

  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed === 'object' && parsed !== null) {
      return parsed;
    }
  } catch (e) {
    // Plain text parser
  }

  const timeMatch = raw.match(/(\d{1,2}:\d{2})\s*[-~至到]\s*(\d{1,2}:\d{2})/);
  if (timeMatch) {
    const start = timeMatch[1].padStart(5, '0');
    const end = timeMatch[2].padStart(5, '0');
    const shift = [{ start, end }];
    for (let i = 0; i < 7; i++) {
      result[String(i)] = shift;
    }
    if (tenantId === 'benmi' && raw.includes('7:30')) {
      result['0'] = [{ start: '07:30', end: '21:00' }]; // Sun
      result['6'] = [{ start: '07:30', end: '21:00' }]; // Sat
    }
    return result;
  }

  const fallback = [{ start: "11:00", end: "21:00" }];
  for (let i = 0; i < 7; i++) result[String(i)] = fallback;
  return result;
}

export async function getTenantBootstrap(request: Request, env: Env): Promise<Response> {
  const tenantId = getTenantId(request);
  const cacheKey = `tenant:${tenantId}:bootstrap`;

  try {
    // 1. Check KV Edge Cache (bypass if _t or nocache query param is present)
    const url = new URL(request.url);
    const noCache = url.searchParams.has('nocache') || url.searchParams.has('_t');
    if (!noCache && env.ORDER_STATE) {
      const cached = await env.ORDER_STATE.get(cacheKey);
      if (cached) {
        return json(JSON.parse(cached), 200, {
          "X-Cache": "HIT",
          "Cache-Control": "no-cache, must-revalidate"
        });
      }
    }
  } catch (e) {
    console.error(`[Bootstrap] KV read failed for ${tenantId}:`, e);
  }

  try {
    // 2. Fetch Tenant Context
    const tenantCtx = await resolveTenantContext(tenantId, env);
    const brandName = tenantCtx?.brandName || (tenantId === 'benmi' ? 'Benmi 越式法國麵包' : tenantId);
    const brandColor = '#00b900';
    const brandColorDark = '#009900';
    const brandSubtitle = tenantCtx?.brandSubtitle || (tenantId === 'benmi' ? 'Bánh mì Việt Nam / 越式法國麵包' : '');
    const storeAddress = tenantCtx?.storeAddress || (tenantId === 'benmi' ? '新北市土城區中央路二段135號' : null);
    const operatingHours = tenantCtx?.operatingHours || null;
    const deliveryPolicy = tenantCtx?.deliveryPolicy || null;
    const liffId = tenantCtx?.liffId || (tenantId === 'benmi' ? (env.LIFF_ID || null) : null);
    const liffUrl = tenantCtx?.liffUrl || (tenantId === 'benmi' ? (env.LIFF_URL || null) : null);
    const locale = tenantCtx?.locale || 'zh-TW';

    const logoUrl = tenantCtx?.logoUrl || (tenantId === 'benmi' ? './benmi_logo.png' : null);

    // 3. Batch Query D1 Database
    let categories: any[] = [];
    let items: any[] = [];
    let rawCustomizations: any[] = [];
    let bundleRulesRows: any[] = [];
    let customRulesRows: any[] = [];

    if (env.DB) {
      try {
        const [catsRes, itemsRes, customRes] = await env.DB.batch([
          env.DB.prepare(
            `SELECT id, name, short_name, slug, 
                    COALESCE(category_type, 'catalog') AS category_type, 
                    COALESCE(selection_type, 'single') AS selection_type, 
                    COALESCE(is_required, 0) AS is_required, 
                    COALESCE(min_selection, 0) AS min_selection, 
                    COALESCE(max_selection, 1) AS max_selection, 
                    COALESCE(allow_customization, 1) AS allow_customization,
                    COALESCE(applied_modifiers, '') AS applied_modifiers,
                    pricing_rules,
                    sort_order 
             FROM menu_categories 
             WHERE tenant_id = ? 
             ORDER BY sort_order ASC`
          ).bind(tenantId),
          env.DB.prepare(
            `SELECT id, category_id, name, price, description, out_of_stock_until, sort_order,
                    COALESCE(badge_text, '') AS badge_text,
                    COALESCE(is_recommended, 0) AS is_recommended
             FROM menu_items 
             WHERE tenant_id = ? 
             ORDER BY sort_order ASC`
          ).bind(tenantId),
          env.DB.prepare(
            `SELECT id, key, title, type, sort_order, options_json
             FROM menu_customizations
             WHERE tenant_id = ?
             ORDER BY sort_order ASC`
          ).bind(tenantId)
        ]);
        categories = (catsRes.results as any[]) || [];
        items = (itemsRes.results as any[]) || [];
        rawCustomizations = (customRes.results as any[]) || [];

        try {
          const [bRes, rRes] = await env.DB.batch([
            env.DB.prepare(
              `SELECT parent_item_id, schema_version, config_json
               FROM menu_bundle_rules
               WHERE tenant_id = ? AND is_active = 1`
            ).bind(tenantId),
            env.DB.prepare(
              `SELECT customization_key, option_id, rule_type, min_order_subtotal, threshold_basis, error_message
               FROM menu_customization_option_rules
               WHERE tenant_id = ? AND is_active = 1`
            ).bind(tenantId)
          ]);
          bundleRulesRows = (bRes.results as any[]) || [];
          customRulesRows = (rRes.results as any[]) || [];
        } catch (subRulesErr) {
          console.warn(`[Bootstrap] menu_bundle_rules or option_rules query warning for ${tenantId}:`, subRulesErr);
        }
      } catch (dbErr) {
        console.error(`[Bootstrap] D1 Query error for ${tenantId}:`, dbErr);
      }
    }

    const now = new Date();

    // Map customization option rules
    const customRulesMap = new Map<string, any>();
    for (const r of customRulesRows) {
      customRulesMap.set(`${r.customization_key}::${r.option_id}`, r);
    }

    const customizations: BootstrapResponse['customizations'] = [];
    for (const c of rawCustomizations) {
      try {
        const opts = typeof c.options_json === 'string' ? JSON.parse(c.options_json) : (c.options_json || []);
        const enrichedOpts = opts.map((opt: any) => {
          const optId = opt.id || opt.name;
          const rule = customRulesMap.get(`${c.key}::${optId}`) || customRulesMap.get(`${c.key}::${opt.name}`);
          const minSubtotal = rule ? rule.min_order_subtotal : (opt.min_order_amount || 0);
          const isOos = Boolean(
            opt.is_out_of_stock ||
            opt.isOutOfStock ||
            (opt.out_of_stock_until && new Date(opt.out_of_stock_until) > now)
          );

          return {
            ...opt,
            id: optId,
            isOutOfStock: isOos,
            is_out_of_stock: isOos,
            minOrderSubtotal: minSubtotal > 0 ? minSubtotal : undefined,
            min_order_amount: minSubtotal > 0 ? minSubtotal : (opt.min_order_amount || undefined),
            thresholdBasis: rule?.threshold_basis,
            ruleErrorMessage: rule?.error_message
          };
        });

        customizations.push({
          id: c.id,
          key: c.key,
          title: c.title,
          type: c.type || 'radio',
          sortOrder: c.sort_order || 0,
          options: enrichedOpts
        });
      } catch (e) {
        console.error(`[Bootstrap] Failed to parse options_json for ${c.id}:`, e);
      }
    }

    // Resolve bundle rules and populate eligibleItems
    const bundleRulesByItemId = new Map<string, BootstrapBundleRule>();
    for (const row of bundleRulesRows) {
      try {
        const parsed = typeof row.config_json === 'string' ? JSON.parse(row.config_json) : row.config_json;
        if (!parsed || !Array.isArray(parsed.groups)) continue;

        const resolvedGroups: BootstrapBundleGroup[] = parsed.groups.map((group: any) => {
          const eligibleItems: any[] = [];
          const seenItemIds = new Set<string>();

          if (Array.isArray(group.sources)) {
            for (const src of group.sources) {
              const targetCatId = src.refId || src.categoryId;
              if (src.type === 'category' && targetCatId) {
                const catItems = items.filter(it => it.category_id === targetCatId);
                for (const it of catItems) {
                  if (!seenItemIds.has(it.id)) {
                    seenItemIds.add(it.id);
                    const isOos = Boolean(it.out_of_stock_until && new Date(it.out_of_stock_until) > now);
                    eligibleItems.push({
                      id: it.id,
                      name: it.name,
                      price: it.price,
                      surcharge: 0,
                      isOutOfStock: isOos,
                      categoryId: it.category_id
                    });
                  }
                }
              } else if (src.type === 'item_list' && Array.isArray(src.itemIds)) {
                for (const itemId of src.itemIds) {
                  const it = items.find(i => i.id === itemId);
                  if (it && !seenItemIds.has(it.id)) {
                    seenItemIds.add(it.id);
                    const isOos = Boolean(it.out_of_stock_until && new Date(it.out_of_stock_until) > now);
                    eligibleItems.push({
                      id: it.id,
                      name: it.name,
                      price: it.price,
                      surcharge: 0,
                      isOutOfStock: isOos,
                      categoryId: it.category_id
                    });
                  }
                }
              }
            }
          }

          const groupName = group.name || (typeof group.label === 'object' ? (group.label[locale] || group.label['zh-TW'] || group.label['vi'] || Object.values(group.label)[0]) : group.label) || `任選 ${group.minQuantity} 樣菜`;
          const allowRepeats = group.allowRepeats !== undefined ? Boolean(group.allowRepeats) : (group.allowRepeat !== undefined ? Boolean(group.allowRepeat) : true);

          return {
            id: group.id,
            name: groupName,
            label: group.label || groupName,
            minQuantity: group.minQuantity ?? 1,
            maxQuantity: group.maxQuantity ?? 1,
            allowRepeats: allowRepeats,
            sources: group.sources || [],
            eligibleItems: eligibleItems
          };
        });

        bundleRulesByItemId.set(row.parent_item_id, {
          version: parsed.version || 1,
          groups: resolvedGroups
        });
      } catch (e) {
        console.error(`[Bootstrap] Failed to parse bundle rule for ${row.parent_item_id}:`, e);
      }
    }

    // Load image_list to accurately attach imageUrl only to items with uploaded image
    let imageList: string[] = [];
    if (env.ORDER_STATE) {
      const listKey = `tenant:${tenantId}:image_list`;
      let listRaw = await env.ORDER_STATE.get(listKey);
      if (!listRaw && tenantId === "benmi") {
        listRaw = await env.ORDER_STATE.get("image_list");
      }
      if (listRaw) {
        try { imageList = JSON.parse(listRaw); } catch (e) { }
      }
    }

    // 4. Organize Items by Category
    const itemsByCatId = new Map<string, any[]>();
    for (const item of items) {
      if (!itemsByCatId.has(item.category_id)) {
        itemsByCatId.set(item.category_id, []);
      }
      const isOos = Boolean(item.out_of_stock_until && new Date(item.out_of_stock_until) > now);
      const isRec = Boolean(item.is_recommended);
      const badge = item.badge_text ? item.badge_text : (isRec ? '👍 推薦' : null);

      const hasImage = imageList.includes(item.name) ||
                       imageList.some(k => k.endsWith(`_${item.name}`) || (k.includes('_') && k.split('_').slice(1).join('_') === item.name));
      const imageUrl = hasImage ? `/api/image?tenant_id=${tenantId}&name=${encodeURIComponent(item.name)}` : null;
      const bundleRule = bundleRulesByItemId.get(item.id) || null;

      itemsByCatId.get(item.category_id)!.push({
        id: item.id,
        name: item.name,
        price: item.price,
        description: item.description || null,
        imageUrl: imageUrl,
        isOutOfStock: isOos,
        isRecommended: isRec,
        badgeText: item.badge_text || null,
        badge: badge,
        bundleRule: bundleRule,
        sortOrder: item.sort_order || 0
      });
    }

    // 5. Separate Catalog vs Modifiers
    const catalog: BootstrapResponse['catalog'] = [];
    const modifiers: BootstrapResponse['modifiers'] = [];

    for (const cat of categories) {
      if (cat.slug === 'sec-flavor' || cat.slug === 'flavor' || cat.category_type === 'order_customization') {
        continue;
      }
      const catType = cat.category_type || (cat.slug === 'topping' ? 'modifier' : 'catalog');
      const catItems = itemsByCatId.get(cat.id) || [];

      if (catType === 'modifier') {
        modifiers.push({
          id: cat.id,
          slug: cat.slug,
          name: cat.name,
          selectionType: (cat.slug === 'topping' ? 'multiple' : (cat.selection_type || 'single')),
          isRequired: Boolean(cat.is_required),
          minSelection: cat.min_selection || 0,
          maxSelection: cat.max_selection || 1,
          options: catItems.map((opt, idx) => ({
            id: opt.id,
            name: opt.name,
            price: opt.price,
            isDefault: idx === 0 && Boolean(cat.is_required),
            isOutOfStock: opt.isOutOfStock
          }))
        });
      } else {
        // Catalog Category
        let appliedModifiers: string[] = ['*'];
        if (cat.allow_customization === 0) {
          appliedModifiers = [];
        } else if (cat.applied_modifiers && cat.applied_modifiers.trim() !== '') {
          try {
            appliedModifiers = JSON.parse(cat.applied_modifiers);
          } catch {
            appliedModifiers = cat.applied_modifiers.split(',').map((s: string) => s.trim()).filter(Boolean);
          }
        }

        let pricingRules: any = null;
        if (cat.pricing_rules && String(cat.pricing_rules).trim() !== '') {
          try {
            pricingRules = JSON.parse(cat.pricing_rules);
          } catch (e) {
            console.error(`[Bootstrap] Failed to parse pricing_rules for ${cat.id}:`, e);
          }
        }

        catalog.push({
          id: cat.id,
          slug: cat.slug,
          name: cat.name,
          shortName: cat.short_name || null,
          allowCustomization: Boolean(cat.allow_customization ?? 1) && appliedModifiers.length > 0,
          appliedModifiers: appliedModifiers,
          pricingRules: pricingRules,
          sortOrder: cat.sort_order || 0,
          items: catItems
        });
      }
    }

    // Synthesize Default Spicy modifier for Benmi if not present in DB
    if (tenantId === 'benmi' && !modifiers.some(m => m.slug === 'spicy')) {
      modifiers.unshift({
        id: 'benmi_spicy',
        slug: 'spicy',
        name: '辣度 (Độ cay)',
        selectionType: 'single',
        isRequired: false,
        minSelection: 0,
        maxSelection: 1,
        options: [
          { id: 'spicy_0', name: '不辣', price: 0, isDefault: true, isOutOfStock: false },
          { id: 'spicy_1', name: '微辣', price: 0, isDefault: false, isOutOfStock: false },
          { id: 'spicy_2', name: '中辣', price: 0, isDefault: false, isOutOfStock: false },
          { id: 'spicy_3', name: '大辣', price: 0, isDefault: false, isOutOfStock: false }
        ]
      });
    }

    const payload: BootstrapResponse = {
      tenant: {
        id: tenantId,
        brandName,
        brandSubtitle,
        brandColor,
        brandColorDark: brandColorDark || '#047857',
        logoUrl,
        storeAddress,
        announcement: tenantCtx?.announcement || null,
        operatingHours,
        parsedHours: parseOperatingHours(operatingHours, tenantId),
        deliveryPolicy,
        allowScheduledPickup: tenantCtx?.allowScheduledPickup !== undefined ? tenantCtx.allowScheduledPickup : true,
        allowDineIn: tenantCtx?.allowDineIn !== undefined ? tenantCtx.allowDineIn : true,
        features: tenantCtx?.features || [],
        orderPrefix: tenantCtx?.orderPrefix || (tenantId === 'benmi' ? 'B' : tenantId.charAt(0).toUpperCase()),
        storeStatus: tenantCtx?.storeStatus || 'open',
        liffId,
        liffUrl,
        locale
      },
      catalog,
      modifiers,
      customizations: customizations.length > 0 ? customizations : undefined,
      translations: tenantId === 'benmi' ? BENMI_TRANSLATIONS : undefined,
      recommended: items.filter(it => it.is_recommended || it.badge_text).map(it => it.name)
    };

    // 6. Cache in KV Edge Cache
    if (env.ORDER_STATE) {
      try {
        await env.ORDER_STATE.put(cacheKey, JSON.stringify(payload), { expirationTtl: 3600 });
      } catch (kvErr) {
        console.error(`[Bootstrap] KV put error for ${tenantId}:`, kvErr);
      }
    }

    return json(payload, 200, {
      "X-Cache": "MISS",
      "Cache-Control": "no-cache, must-revalidate"
    });

  } catch (err: any) {
    console.error(`[Bootstrap] Failed to bootstrap tenant ${tenantId}:`, err);
    return json({ error: err.message || 'Internal Server Error' }, 500);
  }
}

export async function invalidateBootstrapCache(tenantId: string, env: Env): Promise<void> {
  if (env.ORDER_STATE) {
    try {
      await Promise.all([
        env.ORDER_STATE.delete(`tenant:${tenantId}:bootstrap`),
        env.ORDER_STATE.delete(`tenant:${tenantId}:config_cache`)
      ]);
      console.log(`[Bootstrap] Invalidated KV cache and config_cache for tenant ${tenantId}`);
    } catch (e) {
      console.error(`[Bootstrap] Failed to invalidate cache for ${tenantId}:`, e);
    }
  }
}
