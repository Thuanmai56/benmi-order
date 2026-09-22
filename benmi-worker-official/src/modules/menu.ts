import { Env } from '../types/env';
import { Menu } from '../types/index';
import { json } from '../utils/http';
import { invalidateBootstrapCache } from './bootstrap';

export const DEFAULT_MENU: Menu = {
  small: { "燒肉": 56, "火腿": 56, "雞肉": 68, "烤肉": 72, "雙層烤肉": 78, "綜合": 79 },
  large: { "燒肉": 80, "火腿": 80, "雞肉": 100, "烤肉": 105, "雙層烤肉": 115, "綜合": 130 },
  combo: { 
    "1 大燒肉+飲料": 90, "2 大火腿+飲料": 90, "3 大雞肉+飲料": 118, "4 大烤肉+飲料": 128, 
    "5 大雙層烤肉+飲料": 135, "6 大綜合+飲料": 142, "7 小燒肉+飲料": 77, "8 小雞肉+飲料": 88,
    "9 小烤肉+飲料": 95, "10 小雙層烤肉+飲料": 99, "11 小綜合+飲料": 100
  },
  drinks: { "越南咖啡": 48, "豆漿": 37, "紅茶": 37, "可樂": 37, "雪碧": 37 },
  topping: { "起司": 15, "火腿": 20, "燒肉": 20, "烤肉": 25, "雞肉": 25 }
};

// Helper để trích xuất Tenant ID từ Request
export function getTenantId(request: Request): string {
  const url = new URL(request.url);
  
  // 1. Ưu tiên query parameter ?tenant_id=... hoặc ?tenant=...
  const queryTenant = url.searchParams.get("tenant_id") || url.searchParams.get("tenant");
  if (queryTenant) {
    console.log("[Tenant] Found in query param:", queryTenant);
    return queryTenant;
  }

  // 2. Kiểm tra Header X-Tenant-ID
  const headerTenant = request.headers.get("X-Tenant-ID");
  if (headerTenant) {
    console.log("[Tenant] Found in header:", headerTenant);
    return headerTenant;
  }

  // 3. Phân tích Subdomain từ URL hostname
  const hostname = url.hostname || "";
  const parts = hostname.split(".");
  const RESERVED_SUBDOMAINS = new Set(["www", "api", "admin", "explore", "pos", "staging", "dev", "order", "test", "preview"]);
  
  console.log("[Tenant] Analyzing hostname:", hostname, "parts length:", parts.length);

  // Nếu là subdomain mặc định của Cloudflare Workers (ví dụ: worker-name.subdomain.workers.dev)
  // parts sẽ có dạng: ['spring-smoke-46ba', 'thuanmnc', 'workers', 'dev'] (4 phần)
  // Chỉ khi cấu hình dạng tenant.worker-name.subdomain.workers.dev (5 phần) ta mới trích xuất parts[0] làm tenant
  if (hostname.endsWith("workers.dev")) {
    if (parts.length >= 5 && !RESERVED_SUBDOMAINS.has(parts[0])) {
      console.log("[Tenant] Found worker subdomain tenant:", parts[0]);
      return parts[0];
    }
  } else {
    // Với domain thông thường (ví dụ: shop.benmi.vn hoặc tenant.localhost:8787)
    if (parts.length > 2 && !RESERVED_SUBDOMAINS.has(parts[0]) && !parts[0].includes("localhost") && !parts[0].includes("127")) {
      console.log("[Tenant] Found custom domain tenant:", parts[0]);
      return parts[0];
    }
  }

  // 4. Mặc định là benmi
  console.log("[Tenant] Using default fallback tenant: benmi");
  return "benmi";
}

// GET /api/menu
export async function getMenu(request: Request, env: Env): Promise<Response> {
  const tenantId = getTenantId(request);
  const cacheKey = `tenant:${tenantId}:menu`;

  try {
    // 1. Kiểm tra bộ nhớ đệm KV trước
    const cachedMenu = await env.ORDER_STATE.get(cacheKey);
    if (cachedMenu) {
      return json(JSON.parse(cachedMenu));
    }
  } catch (e) {
    console.error("KV read failed:", e);
  }

  try {
    // 2. Cache Miss: Truy vấn từ D1 Database
    // Sử dụng batch queries để giảm thiểu số vòng kết nối mạng
    const [categoriesRes, itemsRes] = await env.DB.batch([
      env.DB.prepare("SELECT id, name, short_name, slug FROM menu_categories WHERE tenant_id = ? ORDER BY sort_order ASC").bind(tenantId),
      env.DB.prepare("SELECT id, category_id, name, price, description, out_of_stock_until FROM menu_items WHERE tenant_id = ? ORDER BY sort_order ASC").bind(tenantId)
    ]);

    const categories = categoriesRes.results as Array<{ id: string; name: string; short_name: string | null; slug: string }>;
    const items = itemsRes.results as Array<{
      id: string;
      category_id: string;
      name: string;
      price: number;
      description: string | null;
      out_of_stock_until: string | null;
    }>;

    // Nếu không có dữ liệu nào trong D1 cho Tenant này, trả về DEFAULT_MENU cho benmi, còn tenant khác trả về menu rỗng
    if (categories.length === 0 || items.length === 0) {
      if (tenantId === "benmi") return json(DEFAULT_MENU);
      return json({ out_of_stock: [] });
    }

    // 3. Xây dựng cấu trúc JSON Menu tương thích ngược
    const menuData: Menu = {
      out_of_stock: [],
      _category_names: {} as any,
      _category_short_names: {} as any
    };

    // Tạo các mảng danh mục rỗng
    const catMap = new Map<string, string>(); // category_id -> slug
    for (const cat of categories) {
      menuData[cat.slug] = {};
      catMap.set(cat.id, cat.slug);
      if (menuData._category_names) {
        menuData._category_names[cat.slug] = cat.name;
      }
      if (menuData._category_short_names) {
        menuData._category_short_names[cat.slug] = cat.short_name || cat.name;
      }
    }

    const now = new Date();
    let nextExpirationTime: Date | null = null;

    // Phân bổ món ăn vào các danh mục và xác định món hết hàng
    for (const item of items) {
      const categorySlug = catMap.get(item.category_id);
      if (!categorySlug) continue;

      // Lưu giá tiền
      menuData[categorySlug][item.name] = item.price;

      // Kiểm tra trạng thái hết hàng (out-of-stock)
      if (item.out_of_stock_until) {
        const oosUntil = new Date(item.out_of_stock_until);
        if (oosUntil > now) {
          // Món đang thực sự hết hàng
          menuData.out_of_stock!.push(`${categorySlug}:${item.name}`);

          // Tìm thời điểm phục hồi sớm nhất của món hết hàng tạm thời
          if (oosUntil.getFullYear() < 9000) { // Không tính vô thời hạn (9999)
            if (!nextExpirationTime || oosUntil < nextExpirationTime) {
              nextExpirationTime = oosUntil;
            }
          }
        }
      }
    }

    // 4. Tính toán TTL tối ưu cho KV Cache
    let ttl = 3600; // Mặc định là 1 giờ
    if (nextExpirationTime) {
      const secondsToExpiration = Math.ceil((nextExpirationTime.getTime() - now.getTime()) / 1000);
      // Giới hạn TTL tối thiểu 60 giây và tối đa 3600 giây
      ttl = Math.max(60, Math.min(3600, secondsToExpiration));
    }

    // 5. Ghi đè vào KV cache để phục vụ các request tiếp theo
    try {
      await env.ORDER_STATE.put(cacheKey, JSON.stringify(menuData), { expirationTtl: ttl });
    } catch (e) {
      console.error("KV write failed:", e);
    }

    return json(menuData);

  } catch (err: any) {
    console.error("D1 read failed, falling back to KV/Default:", err);
    
    // Fallback: Trong trường hợp D1 lỗi, đọc từ KV key cũ hoặc trả về DEFAULT_MENU
    try {
      const raw = await env.ORDER_STATE.get("menu:latest");
      if (raw) return json(JSON.parse(raw));
    } catch (e) {}

    return json(DEFAULT_MENU);
  }
}

// POST /api/menu/stock-status
export async function updateStockStatus(request: Request, env: Env): Promise<Response> {
  try {
    const { category_slug, name, status, duration, until_date, customization_key } = (await request.json()) as any;

    if (!category_slug || !name || !status) {
      return json({ error: "Missing category_slug, name, or status" }, 400);
    }

    const tenantId = getTenantId(request);
    let outOfStockUntil: string | null = null;

    if (status === "out_of_stock") {
      if (duration === "today") {
        // Tự động khôi phục lúc 04:00 AM ngày hôm sau (theo múi giờ GMT+7)
        const nowGmt7 = new Date(new Date().getTime() + 7 * 60 * 60 * 1000);
        const tomorrow4AmGmt7 = new Date(nowGmt7);
        tomorrow4AmGmt7.setDate(nowGmt7.getDate() + 1);
        tomorrow4AmGmt7.setHours(4, 0, 0, 0);
        // Chuyển ngược lại UTC để lưu DB
        outOfStockUntil = new Date(tomorrow4AmGmt7.getTime() - 7 * 60 * 60 * 1000).toISOString();
      } else if (duration === "multiple_days") {
        if (!until_date) {
          return json({ error: "Missing until_date for multiple_days duration" }, 400);
        }
        outOfStockUntil = new Date(until_date).toISOString();
      } else {
        // Vô thời hạn: Đặt mốc xa năm 9999
        outOfStockUntil = "9999-12-31T23:59:59.000Z";
      }
    }

    // Helper to update stock status in menu_customizations
    async function updateCustomizationStock(): Promise<boolean> {
      let query = "SELECT id, key, options_json FROM menu_customizations WHERE tenant_id = ?";
      const params: any[] = [tenantId];
      if (customization_key) {
        query += " AND (key = ? OR id = ?)";
        params.push(customization_key, customization_key);
      } else if (category_slug && category_slug !== 'order_customization' && category_slug !== 'sec-flavor') {
        query += " AND (key = ? OR id = ?)";
        params.push(category_slug, category_slug);
      }
      const { results: customRows } = await env.DB.prepare(query).bind(...params).all<any>();
      if (!customRows || customRows.length === 0) return false;

      for (const row of customRows) {
        try {
          const opts = typeof row.options_json === 'string' ? JSON.parse(row.options_json) : (row.options_json || []);
          let found = false;
          for (const opt of opts) {
            const optName = opt.name || opt.id || opt.title;
            if (optName === name || opt.id === name) {
              opt.is_out_of_stock = (status === "out_of_stock");
              opt.out_of_stock_until = outOfStockUntil;
              found = true;
              break;
            }
          }
          if (found) {
            await env.DB.prepare(
              "UPDATE menu_customizations SET options_json = ?, updated_at = datetime('now') WHERE id = ? AND tenant_id = ?"
            ).bind(JSON.stringify(opts), row.id, tenantId).run();

            const cacheKey = `tenant:${tenantId}:menu`;
            await env.ORDER_STATE.delete(cacheKey);
            await invalidateBootstrapCache(tenantId, env);
            return true;
          }
        } catch (e) {
          console.error("Failed to parse/update options_json:", e);
        }
      }
      return false;
    }

    // 1. If explicit customization request, update menu_customizations first
    if (category_slug === 'order_customization' || category_slug === 'sec-flavor' || customization_key) {
      const updated = await updateCustomizationStock();
      if (updated) {
        return json({ success: true, message: "Customization stock status updated and cache invalidated." });
      }
    }

    // 2. Cập nhật trạng thái trong D1 Database
    const dbRes = await env.DB.prepare(
      `UPDATE menu_items 
       SET out_of_stock_until = ?, updated_at = datetime('now') 
       WHERE tenant_id = ? 
         AND name = ? 
         AND category_id = (SELECT id FROM menu_categories WHERE tenant_id = ? AND (slug = ? OR id = ?))`
    ).bind(outOfStockUntil, tenantId, name, tenantId, category_slug, category_slug).run();

    if (dbRes.meta.changes === 0) {
      // Fallback: check menu_customizations if not found in menu_items
      const updatedFallback = await updateCustomizationStock();
      if (updatedFallback) {
        return json({ success: true, message: "Customization stock status updated and cache invalidated." });
      }
      return json({ error: "Menu item not found or unauthorized" }, 404);
    }

    // 3. Invalidate bộ nhớ đệm KV của tenant
    const cacheKey = `tenant:${tenantId}:menu`;
    await env.ORDER_STATE.delete(cacheKey);
    await invalidateBootstrapCache(tenantId, env);

    return json({ success: true, message: "Stock status updated and cache invalidated." });

  } catch (err: any) {
    console.error("Update stock status failed:", err);
    return json({ error: err.message || "Internal Server Error" }, 500);
  }
}

// Missing fields are never deletion instructions. Validate the complete request
// before constructing a batch so malformed customization data cannot erase rows.
function validateMenuUpdate(data: any): void {
  const record = (value: any) => value !== null && typeof value === 'object' && !Array.isArray(value);
  const text = (value: any) => typeof value === 'string' && value.trim().length > 0;
  if (!record(data)) throw new Error('INVALID_MENU_PAYLOAD');
  if ('__delete' in data) {
    if (!record(data.__delete)) throw new Error('INVALID_MENU_DELETIONS');
    for (const [key, ids] of Object.entries(data.__delete)) {
      if (!['categories', 'items', 'customizations'].includes(key) ||
          !Array.isArray(ids) || !ids.every(text) || new Set(ids).size !== ids.length) {
        throw new Error('INVALID_MENU_DELETIONS');
      }
    }
  }
  if ('__customizations' in data) {
    const section = data.__customizations;
    const groups = Array.isArray(section) ? section : record(section) ? (section.groups ?? section.list) : undefined;
    if (!Array.isArray(groups)) throw new Error('INVALID_CUSTOMIZATIONS');
    const keys = new Set();
    const ids = new Set();
    for (const group of groups) {
      if (!record(group) || !text(group.key) || keys.has(group.key) ||
          (group.id !== undefined && (!text(group.id) || ids.has(group.id))) ||
          !Array.isArray(group.options) ||
          (group.type !== undefined && !['radio', 'checkbox'].includes(group.type))) {
        throw new Error('INVALID_CUSTOMIZATION_GROUP');
      }
      keys.add(group.key);
      if (group.id) ids.add(group.id);
      for (const option of group.options) {
        if (!record(option) || !text(option.name) ||
            (option.price !== undefined && (typeof option.price !== 'number' || !Number.isFinite(option.price))) ||
            (option.surcharge !== undefined && (typeof option.surcharge !== 'number' || !Number.isFinite(option.surcharge))) ||
            (option.sub_options !== undefined && !Array.isArray(option.sub_options))) {
          throw new Error('INVALID_CUSTOMIZATION_OPTION');
        }
      }
    }
  }
  for (const [key, category] of Object.entries(data) as [string, any][]) {
    if (key === '__delete' || key === '__customizations') continue;
    if (key.startsWith('_') || !record(category)) throw new Error('INVALID_MENU_CATEGORY');
    for (const [name, item] of Object.entries(category) as [string, any][]) {
      if (name.startsWith('_')) continue;
      const price = record(item) ? item.price : item;
      if (!text(name) || typeof price !== 'number' || !Number.isFinite(price) || price < 0 ||
          (record(item) && item.id !== undefined && !text(item.id))) throw new Error('INVALID_MENU_ITEM');
    }
  }
}

async function syncMenuToD1(tenantId: string, menuData: any, env: Env): Promise<void> {
  validateMenuUpdate(menuData);
  // 1. Nạp danh mục và món ăn hiện có để ánh xạ ID tránh xung đột unique
  const { results: existingCats } = await env.DB.prepare(
    "SELECT id, slug, name, short_name, category_type FROM menu_categories WHERE tenant_id = ?"
  ).bind(tenantId).all();

  const { results: existingItems } = await env.DB.prepare(
    "SELECT id, category_id, name FROM menu_items WHERE tenant_id = ?"
  ).bind(tenantId).all();

  const { results: existingCustomizations } = await env.DB.prepare(
    "SELECT id, key FROM menu_customizations WHERE tenant_id = ?"
  ).bind(tenantId).all();
  const customIdMap = new Map((existingCustomizations || []).map(row => [row.key as string, row.id as string]));
  const ownedItemIds = new Set((existingItems || []).map(row => row.id as string));
  const ownedCustomIds = new Set((existingCustomizations || []).map(row => row.id as string));

  const catIdMap = new Map<string, string>();
  const catNameMap = new Map<string, string>();
  const catShortNameMap = new Map<string, string>();
  for (const cat of (existingCats || [])) {
    catIdMap.set(cat.slug as string, cat.id as string);
    catIdMap.set(cat.id as string, cat.id as string);
    if (cat.name) {
      catNameMap.set(cat.slug as string, cat.name as string);
      catNameMap.set(cat.id as string, cat.name as string);
    }
    if (cat.short_name) {
      catShortNameMap.set(cat.slug as string, cat.short_name as string);
      catShortNameMap.set(cat.id as string, cat.short_name as string);
    }
  }

  const itemIdMap = new Map<string, string>();
  for (const item of (existingItems || [])) {
    itemIdMap.set(`${item.category_id}:${item.name}`, item.id as string);
    itemIdMap.set(item.id as string, item.id as string);
  }

  const statements: any[] = [];
  const defaultCategoryNamesZh: Record<string, string> = {
    main: "招牌炸蛋蔥餅",
    spicy: "加辣選項",
    egg: "雞蛋選項",
    lettuce: "生菜選項",
    topping: "加料選項",
    small: "🥖 小麵包",
    large: "🍔 大麵包",
    combo: "🎁 特惠套餐 (含飲料)",
    drinks: "🥤 單點飲料"
  };

  const deletions = menuData.__delete || {};
  const categoryDeletes: string[] = (deletions.categories || []).map((id: string) => {
    const resolved = catIdMap.get(id);
    if (!resolved) throw new Error('UNKNOWN_MENU_CATEGORY_DELETE');
    return resolved;
  });
  const itemDeletes: string[] = deletions.items || [];
  const customDeletes: string[] = deletions.customizations || [];
  if (itemDeletes.some(id => !ownedItemIds.has(id)) || customDeletes.some(id => !ownedCustomIds.has(id))) {
    throw new Error('UNKNOWN_MENU_DELETE_ID');
  }
  const activeCategoryIds: string[] = [];
  const activeItemIds: string[] = [];

  let catSortOrder = 1;
  for (const slug of Object.keys(menuData)) {
    if (slug === '__delete') continue;
    const currentSortOrder = catSortOrder++;
    if (slug === '__customizations') {
      const customizationData = menuData[slug];
      const customList = Array.isArray(customizationData) ? customizationData : (customizationData?.groups || customizationData?.list || []);
      const activeCustomIds: string[] = [];
      for (const cust of customList) {
        if (!cust || !cust.key) continue;
        const custKey = cust.key;
        const custTitle = cust.title || custKey;
        const custType = cust.type || 'radio';
        const custSort = Number(cust.sortOrder ?? cust.sort_order ?? 0);
        const optionsList = Array.isArray(cust.options) ? cust.options : [];
        const optionsJson = JSON.stringify(optionsList);
        const custId = cust.id || customIdMap.get(custKey) || `custom_${tenantId}_${custKey}`;
        if (cust.id && !ownedCustomIds.has(cust.id) && !cust.id.startsWith(`custom_${tenantId}_`)) {
          throw new Error('INVALID_CUSTOMIZATION_ID');
        }
        if (customDeletes.includes(custId)) throw new Error('CONFLICTING_MENU_DELETE');
        activeCustomIds.push(custId);

        statements.push(
          env.DB.prepare(
            `INSERT INTO menu_customizations (id, tenant_id, key, title, type, sort_order, options_json, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
             ON CONFLICT(id) DO UPDATE SET
               title = excluded.title,
               type = excluded.type,
               sort_order = excluded.sort_order,
               options_json = excluded.options_json,
               updated_at = datetime('now')
             WHERE menu_customizations.tenant_id = excluded.tenant_id`
          ).bind(custId, tenantId, custKey, custTitle, custType, custSort, optionsJson)
        );
      }

      if (activeCustomIds.length > 0) {
        // Persist a lightweight category record so this panel participates in the
        // same ordering mechanism as every other catalog section.
        const customCategoryId = catIdMap.get(customizationData?.id) || catIdMap.get('sec-flavor') || `${tenantId}_sec-flavor`;
        const customCategoryName = customizationData?.title || '口味與客製化選擇';
        const customCategoryShortName = customizationData?.shortName || customCategoryName;
        const customCategorySortOrder = Number(customizationData?.sortOrder ?? currentSortOrder);
        activeCategoryIds.push(customCategoryId);
        statements.push(
          env.DB.prepare(
            `INSERT INTO menu_categories (id, tenant_id, name, short_name, slug, category_type, allow_customization, applied_modifiers, sort_order)
             VALUES (?, ?, ?, ?, 'sec-flavor', 'order_customization', 0, '[]', ?)
             ON CONFLICT(id) DO UPDATE SET
               name = excluded.name,
               short_name = excluded.short_name,
               slug = excluded.slug,
               category_type = excluded.category_type,
               allow_customization = excluded.allow_customization,
               applied_modifiers = excluded.applied_modifiers,
               sort_order = excluded.sort_order
             WHERE menu_categories.tenant_id = excluded.tenant_id`
          ).bind(customCategoryId, tenantId, customCategoryName, customCategoryShortName, customCategorySortOrder)
        );
      }
      continue;
    }

    const itemsMap = menuData[slug];
    const customCatName = (itemsMap && (itemsMap.__title || itemsMap._name)) || null;
    const customCatShortName = (itemsMap && (itemsMap.__short_name || itemsMap._short_name || itemsMap.__short_title || itemsMap._short_title)) || null;
    const customCatType = (itemsMap && (itemsMap.__type || itemsMap._type)) || 'catalog';
    const customCatSort = (itemsMap && (itemsMap.__sort_order !== undefined || itemsMap._sort_order !== undefined))
      ? Number(itemsMap.__sort_order ?? itemsMap._sort_order)
      : currentSortOrder;

    // Skip order_customization / sec-flavor UI containers from being saved to menu_categories
    if (slug === 'sec-flavor' || slug.startsWith('sec-') || customCatType === 'order_customization') {
      continue;
    }

    let catId = catIdMap.get(slug);
    if (!catId) {
      catId = `${tenantId}_${slug}`;
    }
    activeCategoryIds.push(catId);

    const allowCustomization = (itemsMap && (itemsMap.__allow_customization !== undefined || itemsMap._allow_customization !== undefined))
      ? ((itemsMap.__allow_customization ?? itemsMap._allow_customization) ? 1 : 0)
      : (slug === 'drinks' ? 0 : 1);

    let appliedModifiers: string | null = null;
    if (itemsMap && (itemsMap.__applied_modifiers !== undefined || itemsMap._applied_modifiers !== undefined)) {
      const rawMods = itemsMap.__applied_modifiers ?? itemsMap._applied_modifiers;
      appliedModifiers = typeof rawMods === 'string' ? rawMods : JSON.stringify(rawMods);
    } else if (allowCustomization === 0) {
      appliedModifiers = '[]';
    }

    const catName = customCatName || catNameMap.get(slug) || defaultCategoryNamesZh[slug] || slug;
    const catShortName = customCatShortName || (customCatName ? customCatName : (catShortNameMap.get(slug) || catName));

    statements.push(
      env.DB.prepare(
        `INSERT INTO menu_categories (id, tenant_id, name, short_name, slug, category_type, allow_customization, applied_modifiers, sort_order)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET 
           name = excluded.name, 
           short_name = excluded.short_name,
           slug = excluded.slug,
           category_type = excluded.category_type,
           allow_customization = excluded.allow_customization,
           applied_modifiers = excluded.applied_modifiers,
           sort_order = excluded.sort_order
             WHERE menu_categories.tenant_id = excluded.tenant_id`
      ).bind(catId, tenantId, catName, catShortName, slug, customCatType, allowCustomization, appliedModifiers, customCatSort)
    );

    if (itemsMap && typeof itemsMap === "object") {
      let itemSortOrder = 1;
      for (const itemName of Object.keys(itemsMap)) {
        if (itemName.startsWith("_")) continue;
        const itemVal = itemsMap[itemName];
        let price = 0;
        let badgeText: string | null = null;
        let isRec = 0;

        if (typeof itemVal === "object" && itemVal !== null) {
          price = Number(itemVal.price);
          badgeText = itemVal.badge_text || itemVal.badgeText || null;
          isRec = itemVal.is_recommended || itemVal.isRecommended ? 1 : 0;
        } else {
          price = Number(itemVal);
        }
        if (isNaN(price)) continue;

        if (itemVal?.id && !ownedItemIds.has(itemVal.id) && !itemVal.id.startsWith(`${tenantId}_`)) {
          throw new Error('INVALID_MENU_ITEM_ID');
        }
        let itemId = itemVal?.id || itemIdMap.get(`${catId}:${itemName}`);
        if (!itemId) {
          itemId = `${tenantId}_${slug}_${itemName}`;
        }
        activeItemIds.push(itemId);

        statements.push(
          env.DB.prepare(
            `INSERT INTO menu_items (id, tenant_id, category_id, name, price, badge_text, is_recommended, sort_order)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)
             ON CONFLICT(id) DO UPDATE SET 
               category_id = excluded.category_id,
               name = excluded.name,
               price = excluded.price, 
               badge_text = excluded.badge_text, 
               is_recommended = excluded.is_recommended, 
               sort_order = excluded.sort_order
             WHERE menu_items.tenant_id = excluded.tenant_id`
          ).bind(itemId, tenantId, catId, itemName, price, badgeText, isRec, itemSortOrder++)
        );
      }
    }
  }

  if (activeCategoryIds.some(id => categoryDeletes.includes(id)) ||
      activeItemIds.some(id => itemDeletes.includes(id))) throw new Error('CONFLICTING_MENU_DELETE');

  // Explicit category deletion also removes its child items. No absent row is deleted.
  for (const id of categoryDeletes) {
    statements.push(env.DB.prepare('DELETE FROM menu_items WHERE tenant_id = ? AND category_id = ?').bind(tenantId, id));
  }
  for (const [table, ids] of [
    ['menu_items', itemDeletes],
    ['menu_customizations', customDeletes],
    ['menu_categories', categoryDeletes]
  ] as [string, string[]][]) {
    for (let i = 0; i < ids.length; i += 50) {
      const chunk = ids.slice(i, i + 50);
      statements.push(env.DB.prepare(
        `DELETE FROM ${table} WHERE tenant_id = ? AND id IN (${chunk.map(() => '?').join(',')})`
      ).bind(tenantId, ...chunk));
    }
  }

  // One batch keeps the entire menu update atomic if any statement fails.
  if (statements.length > 0) {
    await env.DB.batch(statements);
  }
}

export async function updateMenu(request: Request, env: Env): Promise<Response> {
  try {
    const tenantId = getTenantId(request);
    const data = await request.json();

    if (!env.DB) return json({ error: 'MENU_DATABASE_UNAVAILABLE' }, 503);
    await syncMenuToD1(tenantId, data, env);

    // 3. Xóa cache đa hộ thuê để force reload ở lượt đọc sau
    const cacheKey = `tenant:${tenantId}:menu`;
    await env.ORDER_STATE.delete(cacheKey);
    await invalidateBootstrapCache(tenantId, env);

    return json({ success: true });
  } catch (e: any) {
    console.error("Update menu failed:", e);
    return json({ error: e.message || "Invalid data" }, 400);
  }
}

/**
 * Safely extracts menu items for a specified category from the store menu.
 */
export function getMenuCategoryItems(categoryKey: keyof Menu, menu: Menu = DEFAULT_MENU): Record<string, number> {
  if (!menu || !menu[categoryKey]) {
    return {};
  }
  return menu[categoryKey];
}

/**
 * Retrieves store menu data directly for internal AI/worker processing.
 */
export async function getMenuData(env: Env, tenantId: string): Promise<Menu> {
  const cacheKey = `tenant:${tenantId}:menu`;
  try {
    if (env.ORDER_STATE) {
      const cached = await env.ORDER_STATE.get(cacheKey);
      if (cached) return JSON.parse(cached);
    }
  } catch (e) {
    console.error(`[Menu] KV cache read failed for tenant ${tenantId}:`, e);
  }

  if (env.DB) {
    try {
      const [categoriesRes, itemsRes] = await env.DB.batch([
        env.DB.prepare("SELECT id, name, slug FROM menu_categories WHERE tenant_id = ? ORDER BY sort_order ASC").bind(tenantId),
        env.DB.prepare("SELECT id, category_id, name, price, description, out_of_stock_until FROM menu_items WHERE tenant_id = ? ORDER BY sort_order ASC").bind(tenantId)
      ]);

      const categories = categoriesRes.results as Array<{ id: string; name: string; slug: string }>;
      const items = itemsRes.results as Array<{
        id: string;
        category_id: string;
        name: string;
        price: number;
        description: string | null;
        out_of_stock_until: string | null;
      }>;

      if (categories.length > 0 && items.length > 0) {
        const catMap = new Map<string, string>();
        const menuData: Menu = { out_of_stock: [] };

        for (const cat of categories) {
          menuData[cat.slug] = {};
          catMap.set(cat.id, cat.slug);
        }

        const now = new Date();
        for (const item of items) {
          const categorySlug = catMap.get(item.category_id);
          if (!categorySlug) continue;
          menuData[categorySlug][item.name] = item.price;

          if (item.out_of_stock_until && new Date(item.out_of_stock_until) > now) {
            menuData.out_of_stock!.push(`${categorySlug}:${item.name}`);
          }
        }

        return menuData;
      }
    } catch (e) {
      console.error(`[Menu] D1 read failed for tenant ${tenantId}:`, e);
    }
  }

  return DEFAULT_MENU;
}

/**
 * Formats live store menu into a clean structured prompt text for AI system prompt context.
 */
export function formatMenuForPrompt(menuData: Menu): string {
  const categoryNames: Record<string, string> = {
    small: "小麵包 (Bánh mì nhỏ / Small Banh Mi)",
    large: "大麵包 (Bánh mì lớn / Large Banh Mi)",
    combo: "套餐 (Combo + Đồ uống / Set Combo)",
    drinks: "單點飲料 (Đồ uống / Drinks)",
    topping: "加料 (Topping / Extra Items)"
  };

  const oosSet = new Set(menuData.out_of_stock || []);
  const lines: string[] = ["📋 門市現有菜單 (STORE MENU - LIVE REAL-TIME):"];

  const categories = ["large", "small", "combo", "drinks", "topping"];
  for (const catKey of categories) {
    const items = menuData[catKey];
    if (!items || Object.keys(items).length === 0) continue;

    const catTitle = categoryNames[catKey] || catKey;
    lines.push(`\n- ${catTitle}:`);

    for (const [name, price] of Object.entries(items)) {
      const isOos = oosSet.has(`${catKey}:${name}`);
      const oosTag = isOos ? " [🔴 售完 HẾT HÀNG]" : " [🟢 正常供應 CÒN HÀNG]";
      lines.push(`  + ${name}: $${price}${oosTag}`);
    }
  }

  return lines.join("\n");
}
