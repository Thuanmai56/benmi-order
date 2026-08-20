import { Env } from '../types/env';
import { json } from '../utils/http';
import { getTenantId } from './menu';
import { resolveTenantContext } from './tenant';

export interface BootstrapResponse {
  tenant: {
    id: string;
    brandName: string;
    brandSubtitle?: string;
    brandColor: string;
    brandColorDark: string;
    logoUrl: string | null;
    storeAddress: string | null;
    operatingHours: string | null;
    parsedHours: Record<string, Array<{ start: string; end: string }>>;
    deliveryPolicy: string | null;
    allowScheduledPickup: boolean;
    storeStatus: string;
    liffId: string | null;
    liffUrl: string | null;
    locale: string;
  };
  catalog: Array<{
    id: string;
    slug: string;
    name: string;
    sortOrder: number;
    items: Array<{
      id: string;
      name: string;
      price: number;
      description: string | null;
      imageUrl: string | null;
      isOutOfStock: boolean;
      isRecommended: boolean;
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
    // 1. Check KV Edge Cache
    if (env.ORDER_STATE) {
      const cached = await env.ORDER_STATE.get(cacheKey);
      if (cached) {
        return json(JSON.parse(cached));
      }
    }
  } catch (e) {
    console.error(`[Bootstrap] KV read failed for ${tenantId}:`, e);
  }

  try {
    // 2. Fetch Tenant Context
    const tenantCtx = await resolveTenantContext(tenantId, env);
    const brandName = tenantCtx?.brandName || (tenantId === 'benmi' ? 'Benmi 越式法國麵包' : tenantId);
    const brandColor = tenantCtx?.brandColor || '#00b900';
    const brandColorDark = (tenantId === 'benmi') ? '#009900' : brandColor;
    const brandSubtitle = tenantCtx?.brandSubtitle || (tenantId === 'benmi' ? 'Bánh mì Việt Nam / 越式法國麵包' : '');
    const storeAddress = tenantCtx?.storeAddress || (tenantId === 'benmi' ? '新北市土城區中央路二段135號' : null);
    const operatingHours = tenantCtx?.operatingHours || null;
    const deliveryPolicy = tenantCtx?.deliveryPolicy || null;
    const liffId = tenantCtx?.liffId || env.LIFF_ID || null;
    const liffUrl = tenantCtx?.liffUrl || env.LIFF_URL || null;
    const locale = tenantCtx?.locale || 'zh-TW';

    const logoUrl = tenantCtx?.logoUrl || (tenantId === 'benmi' ? './benmi_logo.png' : null);

    // 3. Batch Query D1 Database
    let categories: any[] = [];
    let items: any[] = [];

    if (env.DB) {
      try {
        const [catsRes, itemsRes] = await env.DB.batch([
          env.DB.prepare(
            `SELECT id, name, slug, 
                    COALESCE(category_type, 'catalog') AS category_type, 
                    COALESCE(selection_type, 'single') AS selection_type, 
                    COALESCE(is_required, 0) AS is_required, 
                    COALESCE(min_selection, 0) AS min_selection, 
                    COALESCE(max_selection, 1) AS max_selection, 
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
          ).bind(tenantId)
        ]);
        categories = (catsRes.results as any[]) || [];
        items = (itemsRes.results as any[]) || [];
      } catch (dbErr) {
        console.error(`[Bootstrap] D1 Query error for ${tenantId}:`, dbErr);
      }
    }

    const now = new Date();

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
        sortOrder: item.sort_order || 0
      });
    }

    // 5. Separate Catalog vs Modifiers
    const catalog: BootstrapResponse['catalog'] = [];
    const modifiers: BootstrapResponse['modifiers'] = [];

    for (const cat of categories) {
      const catType = cat.category_type || (cat.slug === 'topping' ? 'modifier' : 'catalog');
      const catItems = itemsByCatId.get(cat.id) || [];

      if (catType === 'modifier') {
        modifiers.push({
          id: cat.id,
          slug: cat.slug,
          name: cat.name,
          selectionType: cat.selection_type || (cat.slug === 'topping' && tenantId === 'zhadantongxue' ? 'multiple' : 'single'),
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
        catalog.push({
          id: cat.id,
          slug: cat.slug,
          name: cat.name,
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
        operatingHours,
        parsedHours: parseOperatingHours(operatingHours, tenantId),
        deliveryPolicy,
        allowScheduledPickup: tenantCtx?.allowScheduledPickup !== undefined ? tenantCtx.allowScheduledPickup : true,
        storeStatus: tenantCtx?.storeStatus || 'open',
        liffId,
        liffUrl,
        locale
      },
      catalog,
      modifiers,
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

    return json(payload);

  } catch (err: any) {
    console.error(`[Bootstrap] Failed to bootstrap tenant ${tenantId}:`, err);
    return json({ error: err.message || 'Internal Server Error' }, 500);
  }
}

export async function invalidateBootstrapCache(tenantId: string, env: Env): Promise<void> {
  const cacheKey = `tenant:${tenantId}:bootstrap`;
  if (env.ORDER_STATE) {
    try {
      await env.ORDER_STATE.delete(cacheKey);
      console.log(`[Bootstrap] Invalidated KV cache for tenant ${tenantId}`);
    } catch (e) {
      console.error(`[Bootstrap] Failed to invalidate cache for ${tenantId}:`, e);
    }
  }
}
