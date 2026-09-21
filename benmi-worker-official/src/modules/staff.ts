import { Env } from '../types/env';
import { json } from '../utils/http';
import { getTenantId } from './menu';
import { resolveTenantContext } from './tenant';
import { TenantContext, resolveTenantOrderPrefix } from '../types/tenant';
import { getStoredPassword } from './auth';
import {
  getNextDailyOrderSeq,
  formatItemsToText,
  extractAllOrderSearchNames,
  validateOrderBundles,
  validateThresholdCustomizations
} from './orders';
import { resolveOrderKey } from './order-identity';
import { OrderItemInput, DiningOption } from '../types/index';

// ==========================================
// 1. HELPERS & CRYPTO UTILITIES
// ==========================================

export async function sha256Hex(text: string): Promise<string> {
  const msgUint8 = new TextEncoder().encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export function generateBearerToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Directly queries D1 to verify if staff_ordering_enabled is turned on for this tenant.
 * Zero reliance on KV eventual consistency.
 */
export async function checkStaffOrderingEnabled(env: Env, tenantId: string): Promise<boolean> {
  if (!env.DB) return false;
  try {
    const row = await env.DB.prepare(
      "SELECT staff_ordering_enabled FROM tenant_config WHERE tenant_id = ?"
    ).bind(tenantId).first<{ staff_ordering_enabled: number | null }>();
    return Boolean(row?.staff_ordering_enabled);
  } catch (err) {
    console.warn(`[Staff] Failed to read staff_ordering_enabled for ${tenantId}:`, err);
    return false;
  }
}

/**
 * Verifies Bearer token in Authorization header against staff_sessions table.
 */
export async function verifyStaffSession(
  request: Request,
  env: Env,
  tenantId: string
): Promise<{ tokenHash: string; tenantId: string } | null> {
  const authHeader = request.headers.get('Authorization') || request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;

  const rawToken = authHeader.substring(7).trim();
  if (!rawToken || rawToken.length < 16) return null;

  const tokenHash = await sha256Hex(rawToken);

  if (!env.DB) return null;
  try {
    const session = await env.DB.prepare(
      `SELECT token_hash, tenant_id FROM staff_sessions
       WHERE token_hash = ? AND tenant_id = ? AND revoked_at IS NULL AND datetime(expires_at) > datetime('now')`
    ).bind(tokenHash, tenantId).first<{ token_hash: string; tenant_id: string }>();

    if (!session) return null;
    return { tokenHash: session.token_hash, tenantId: session.tenant_id };
  } catch (err) {
    console.warn(`[Staff] Session verification error for ${tenantId}:`, err);
    return null;
  }
}

// ==========================================
// 2. SERVER-SIDE AUTHORITATIVE PRICE CALCULATION
// ==========================================

export async function calculateAuthoritativeItems(
  env: Env,
  tenantId: string,
  rawItems: OrderItemInput[],
  customizations?: any[]
): Promise<{
  valid: boolean;
  error?: string;
  code?: string;
  calculatedItems: OrderItemInput[];
  grandTotal: number;
}> {
  if (!Array.isArray(rawItems) || rawItems.length === 0) {
    return { valid: false, error: "購物車為空 / Giỏ hàng trống", code: "EMPTY_ITEMS", calculatedItems: [], grandTotal: 0 };
  }

  // 1. Stock check in D1
  const rawNames = extractAllOrderSearchNames(rawItems);
  if (rawNames.length > 0 && env.DB) {
    const cleanNames = rawNames.map(n => n.replace(/\s+(L|S|M)$/i, '').replace(/^\[[^\]]+\]\s*/, '').trim());
    const allSearchNames = Array.from(new Set([...rawNames, ...cleanNames]));
    const placeholders = allSearchNames.map(() => '?').join(',');

    try {
      const oosQuery = await env.DB.prepare(
        `SELECT name FROM menu_items 
         WHERE tenant_id = ? 
           AND (name IN (${placeholders}) OR id IN (${placeholders})) 
           AND out_of_stock_until IS NOT NULL 
           AND datetime(out_of_stock_until) > datetime('now')`
      ).bind(tenantId, ...allSearchNames, ...allSearchNames).all<{ name: string }>();

      if (oosQuery.results && oosQuery.results.length > 0) {
        const oosNames = Array.from(new Set(oosQuery.results.map(r => r.name)));
        return {
          valid: false,
          error: `抱歉，您選購的餐點【${oosNames.join('、')}】目前已售完 / Món đã hết hàng`,
          code: "ITEMS_OUT_OF_STOCK",
          calculatedItems: [],
          grandTotal: 0
        };
      }
    } catch (stockErr) {
      console.warn(`[Staff] Stock check warning:`, stockErr);
    }
  }

  // 2. Validate combo bundles
  const bundleCheck = await validateOrderBundles(env, tenantId, rawItems);
  if (!bundleCheck.valid) {
    return { valid: false, error: bundleCheck.error, code: bundleCheck.code, calculatedItems: [], grandTotal: 0 };
  }

  // 3. Validate threshold customizations
  if (customizations && customizations.length > 0) {
    const thresholdCheck = await validateThresholdCustomizations(env, tenantId, rawItems, customizations);
    if (!thresholdCheck.valid) {
      return { valid: false, error: thresholdCheck.error, code: thresholdCheck.code, calculatedItems: [], grandTotal: 0 };
    }
  }

  // 4. Load catalog items & modifier options for price computation
  const itemMap = new Map<string, { id: string; name: string; price: number; category_id: string }>();
  const modifierPriceMap = new Map<string, number>();

  if (env.DB) {
    try {
      const [menuItemsRes, modifierOptsRes] = await env.DB.batch([
        env.DB.prepare("SELECT id, name, price, category_id FROM menu_items WHERE tenant_id = ?").bind(tenantId),
        env.DB.prepare(
          `SELECT mi.id, mi.name, mi.price 
           FROM menu_items mi 
           JOIN menu_categories mc ON mi.category_id = mc.id 
           WHERE mc.tenant_id = ? AND mc.category_type = 'modifier'`
        ).bind(tenantId)
      ]);

      for (const it of (menuItemsRes.results as any[] || [])) {
        itemMap.set(it.id, it);
        itemMap.set(it.name, it);
      }
      for (const opt of (modifierOptsRes.results as any[] || [])) {
        modifierPriceMap.set(opt.name, Number(opt.price) || 0);
        modifierPriceMap.set(opt.id, Number(opt.price) || 0);
      }
    } catch (e) {
      console.warn(`[Staff] Price lookup warning for ${tenantId}:`, e);
    }
  }

  let grandTotal = 0;
  const calculatedItems: OrderItemInput[] = [];

  for (const item of rawItems) {
    const qty = Math.max(1, parseInt(String(item.quantity), 10) || 1);
    const lookupKey = item.itemId || item.item_id || item.name;
    const dbItem = lookupKey ? itemMap.get(lookupKey) : null;
    let baseUnitPrice = dbItem ? dbItem.price : (Number(item.price || item.unit_price) || 0);

    // Modifier options extra
    let optionsExtra = 0;
    const rawOptions = item.options || item.selected_options;
    const parsedOptions: any[] = Array.isArray(rawOptions)
      ? rawOptions
      : (typeof rawOptions === 'string' ? JSON.parse(rawOptions || '[]') : []);

    for (const opt of parsedOptions) {
      const optName = opt.choice || opt.name || (typeof opt === 'string' ? opt : '');
      const optPrice = modifierPriceMap.has(optName) ? modifierPriceMap.get(optName)! : (Number(opt.price) || 0);
      optionsExtra += optPrice;
    }

    // Bundle portion surcharges
    let bundleSurcharge = 0;
    const rawBundle = item.bundleSelections || item.bundle_snapshot_json;
    if (rawBundle) {
      try {
        const bData = typeof rawBundle === 'string' ? JSON.parse(rawBundle) : rawBundle;
        const portions = bData.portions || (Array.isArray(bData) ? (bData[0]?.groups ? bData : [{ groups: bData }]) : []);
        for (const p of portions) {
          for (const g of (p.groups || [])) {
            for (const child of (g.items || [])) {
              const sur = Number(child.surcharge || child.price || 0);
              const bQty = Number(child.quantity) || 1;
              if (sur > 0) bundleSurcharge += sur * bQty;
            }
          }
        }
      } catch (e) {}
    }

    const unitPrice = baseUnitPrice + optionsExtra + bundleSurcharge;
    const subtotal = unitPrice * qty;
    grandTotal += subtotal;

    calculatedItems.push({
      ...item,
      itemId: dbItem?.id || item.itemId || item.item_id,
      name: dbItem?.name || item.name,
      quantity: qty,
      price: unitPrice,
      unit_price: unitPrice,
      subtotal: subtotal,
      options: parsedOptions,
      selected_options: parsedOptions,
      bundle_snapshot_json: typeof rawBundle === 'string' ? rawBundle : (rawBundle ? JSON.stringify(rawBundle) : null)
    });
  }

  return {
    valid: true,
    calculatedItems,
    grandTotal
  };
}

// ==========================================
// 3. MAIN STAFF ROUTE DISPATCHER
// ==========================================

export async function handleStaffRoute(
  request: Request,
  env: Env,
  path: string,
  tenantCtx?: TenantContext | null
): Promise<Response> {
  const url = new URL(request.url);
  const tenantId = url.searchParams.get("tenant_id") || url.searchParams.get("tenant") || tenantCtx?.tenantId || getTenantId(request);

  if (!tenantCtx || tenantCtx.tenantId !== tenantId) {
    tenantCtx = await resolveTenantContext(tenantId, env);
  }
  if (!tenantCtx) {
    return json({ ok: false, error: "invalid_tenant", message: `門市代碼 '${tenantId}' 不存在` }, 404);
  }

  // --- 1. GET /api/staff/capabilities ---
  if (request.method === "GET" && path === "/api/staff/capabilities") {
    const isStaffEnabled = await checkStaffOrderingEnabled(env, tenantId);
    return json({
      ok: true,
      tenantId,
      brandName: tenantCtx.brandName,
      staff_ordering_enabled: isStaffEnabled,
      allowDineIn: tenantCtx.allowDineIn ?? true,
      storeStatus: tenantCtx.storeStatus || 'open'
    });
  }

  // --- 2. POST /api/staff/session (Login via POS PIN) ---
  if (request.method === "POST" && path === "/api/staff/session") {
    const isStaffEnabled = await checkStaffOrderingEnabled(env, tenantId);
    if (!isStaffEnabled) {
      return json({ ok: false, error: "FEATURE_DISABLED", message: "門市尚未啟用桌邊點餐功能 / Quán chưa kích hoạt tính năng nhận đơn tại bàn" }, 403);
    }

    const body: any = await request.json().catch(() => ({}));
    const password = body.password || body.pin;
    if (!password) {
      return json({ ok: false, error: "MISSING_PIN", message: "請提供管理 PIN 碼 / Vui lòng nhập mã PIN" }, 400);
    }

    const storedPassword = await getStoredPassword(env, tenantId, tenantCtx);
    if (password !== storedPassword) {
      return json({ ok: false, error: "INVALID_PIN", message: "管理 PIN 碼錯誤 / Mã PIN không chính xác" }, 401);
    }

    const token = generateBearerToken();
    const tokenHash = await sha256Hex(token);
    const expiresAt = new Date(Date.now() + 12 * 3600000).toISOString();

    if (!env.DB) return json({ ok: false, error: "NO_DB" }, 500);

    await env.DB.prepare(
      `INSERT INTO staff_sessions (token_hash, tenant_id, expires_at, created_at)
       VALUES (?, ?, datetime(?, 'utc'), datetime('now'))`
    ).bind(tokenHash, tenantId, expiresAt).run();

    return json({
      ok: true,
      token,
      expires_at: expiresAt,
      tenant_id: tenantId,
      brand_name: tenantCtx.brandName
    });
  }

  // --- 3. DELETE /api/staff/session (Logout & Revoke Token) ---
  if (request.method === "DELETE" && path === "/api/staff/session") {
    const authHeader = request.headers.get('Authorization') || request.headers.get('authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const rawToken = authHeader.substring(7).trim();
      const tokenHash = await sha256Hex(rawToken);
      if (env.DB) {
        await env.DB.prepare(
          "UPDATE staff_sessions SET revoked_at = datetime('now') WHERE token_hash = ?"
        ).bind(tokenHash).run();
      }
    }
    return json({ ok: true, message: "登出成功 / Đã đăng xuất" });
  }

  // --- GUARD: All subsequent business routes require session authentication & feature flag ---
  const session = await verifyStaffSession(request, env, tenantId);
  if (!session) {
    return json({ ok: false, error: "UNAUTHORIZED", message: "登入權限已過期，請重新輸入 PIN 碼 / Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại" }, 401);
  }

  const isStaffEnabled = await checkStaffOrderingEnabled(env, tenantId);
  if (!isStaffEnabled) {
    return json({ ok: false, error: "FEATURE_DISABLED", message: "門市尚未啟用桌邊點餐功能 / Quán chưa kích hoạt tính năng nhận đơn tại bàn" }, 403);
  }

  // --- 4. GET /api/staff/tables (List tables with active order info) ---
  if (request.method === "GET" && path === "/api/staff/tables") {
    const includeInactive = url.searchParams.get("include_inactive") === "1" || url.searchParams.get("all") === "1";
    if (!env.DB) return json({ ok: false, error: "NO_DB" }, 500);

    const query = `
      SELECT t.id, t.tenant_id, t.label, t.sort_order, t.is_active, t.created_at, t.updated_at,
             o.key AS active_order_key, o.order_id AS active_order_id,
             o.display_key AS active_display_key, o.status AS active_order_status,
             o.total_amount AS active_total_amount, o.round_count AS active_round_count,
             o.revision AS active_revision, o.customer_name AS active_customer_name,
             o.created_at AS active_created_at, o.last_appended_at AS active_last_appended_at,
             (
               SELECT r.response_json 
               FROM staff_order_requests r 
               WHERE r.tenant_id = t.tenant_id AND r.order_key = o.key 
               ORDER BY r.round_number DESC LIMIT 1
             ) AS active_response_json
      FROM restaurant_tables t
      LEFT JOIN orders o ON o.table_id = t.id AND o.source = 'staff' AND o.status NOT IN ('PAID', 'REJECTED', 'PICKED_UP')
      WHERE t.tenant_id = ? ${includeInactive ? '' : 'AND t.is_active = 1'}
      ORDER BY t.sort_order ASC, t.label ASC
    `;
    const { results } = await env.DB.prepare(query).bind(tenantId).all();
    const tables = (results || []).map((row: any) => {
      let activeCustomizations: any[] = [];
      if (row.active_response_json) {
        try {
          const parsed = JSON.parse(row.active_response_json);
          if (Array.isArray(parsed.customizations)) {
            activeCustomizations = parsed.customizations;
          }
        } catch (e) {}
      }
      const cloned = { ...row, active_customizations: activeCustomizations };
      delete cloned.active_response_json;
      return cloned;
    });
    return json({ ok: true, tables });
  }

  // --- 5. POST /api/staff/tables (Add table) ---
  if (request.method === "POST" && path === "/api/staff/tables") {
    const body: any = await request.json().catch(() => ({}));
    const label = String(body.label || "").trim();
    const sortOrder = parseInt(String(body.sort_order ?? body.sortOrder ?? 0), 10) || 0;

    if (!label) {
      return json({ ok: false, error: "INVALID_LABEL", message: "請輸入桌號名稱 / Vui lòng nhập tên bàn" }, 400);
    }

    const tableId = crypto.randomUUID();
    if (!env.DB) return json({ ok: false, error: "NO_DB" }, 500);

    try {
      await env.DB.prepare(
        `INSERT INTO restaurant_tables (id, tenant_id, label, sort_order, is_active, created_at, updated_at)
         VALUES (?, ?, ?, ?, 1, datetime('now'), datetime('now'))`
      ).bind(tableId, tenantId, label, sortOrder).run();

      return json({
        ok: true,
        table: { id: tableId, tenant_id: tenantId, label, sort_order: sortOrder, is_active: 1 }
      }, 201);
    } catch (err: any) {
      if (String(err).includes("UNIQUE constraint failed")) {
        return json({ ok: false, error: "DUPLICATE_LABEL", message: `桌號【${label}】已存在 / Bàn ${label} đã tồn tại` }, 409);
      }
      throw err;
    }
  }

  // --- 6. PATCH /api/staff/tables/:id (Update table label, sort, or active state) ---
  const tablePatchMatch = path.match(/^\/api\/staff\/tables\/([a-zA-Z0-9_-]+)$/);
  if (request.method === "PATCH" && tablePatchMatch) {
    const tableId = tablePatchMatch[1];
    const body: any = await request.json().catch(() => ({}));
    if (!env.DB) return json({ ok: false, error: "NO_DB" }, 500);

    const table = await env.DB.prepare(
      "SELECT * FROM restaurant_tables WHERE id = ? AND tenant_id = ?"
    ).bind(tableId, tenantId).first<any>();

    if (!table) {
      return json({ ok: false, error: "TABLE_NOT_FOUND", message: "找不到該桌號 / Không tìm thấy bàn" }, 404);
    }

    const newLabel = body.label !== undefined ? String(body.label).trim() : table.label;
    const newSort = body.sort_order !== undefined ? parseInt(String(body.sort_order), 10) : (body.sortOrder !== undefined ? parseInt(String(body.sortOrder), 10) : table.sort_order);
    const newActive = body.is_active !== undefined ? (body.is_active ? 1 : 0) : (body.isActive !== undefined ? (body.isActive ? 1 : 0) : table.is_active);

    // Guard: Cannot rename or deactivate a table that has an active un-finalized staff order!
    if ((newLabel !== table.label || newActive === 0) && newActive !== table.is_active || (newLabel !== table.label)) {
      const activeOrder = await env.DB.prepare(
        `SELECT key FROM orders 
         WHERE tenant_id = ? AND table_id = ? AND source = 'staff' AND status NOT IN ('PAID', 'REJECTED', 'PICKED_UP') 
         LIMIT 1`
      ).bind(tenantId, tableId).first();

      if (activeOrder) {
        return json({
          ok: false,
          error: "TABLE_HAS_ACTIVE_ORDER",
          message: "該桌尚有未結帳訂單，無法修改名稱或停用 / Bàn đang có đơn chưa thanh toán, không thể đổi tên hoặc ngừng sử dụng"
        }, 400);
      }
    }

    try {
      await env.DB.prepare(
        `UPDATE restaurant_tables SET
           label = ?,
           sort_order = ?,
           is_active = ?,
           updated_at = datetime('now')
         WHERE id = ? AND tenant_id = ?`
      ).bind(newLabel, newSort, newActive, tableId, tenantId).run();

      return json({
        ok: true,
        table: { id: tableId, tenant_id: tenantId, label: newLabel, sort_order: newSort, is_active: newActive }
      });
    } catch (err: any) {
      if (String(err).includes("UNIQUE constraint failed")) {
        return json({ ok: false, error: "DUPLICATE_LABEL", message: `桌號【${newLabel}】已存在 / Bàn ${newLabel} đã tồn tại` }, 409);
      }
      throw err;
    }
  }

  // --- 6b. POST /api/staff/tables/transfer (Transfer active order from one table to an idle table) ---
  if (request.method === "POST" && path === "/api/staff/tables/transfer") {
    const body: any = await request.json().catch(() => ({}));
    const fromTableId = String(body.fromTableId || body.from_table_id || "").trim();
    const toTableId = String(body.toTableId || body.to_table_id || "").trim();

    if (!fromTableId || !toTableId) {
      return json({ ok: false, error: "MISSING_TABLE_PARAMS", message: "缺少桌號參數 / Thiếu thông tin bàn cần chuyển" }, 400);
    }
    if (fromTableId === toTableId) {
      return json({ ok: false, error: "SAME_TABLE", message: "來源與目的桌號相同 / Bàn nguồn và bàn đích trùng nhau" }, 400);
    }
    if (!env.DB) return json({ ok: false, error: "NO_DB" }, 500);

    // 1. Verify fromTable and its active order
    const fromTable = await env.DB.prepare(
      `SELECT t.id, t.label, o.key AS active_order_key, o.order_id AS active_order_id, o.revision AS active_revision
       FROM restaurant_tables t
       JOIN orders o ON o.table_id = t.id AND o.source = 'staff' AND o.status NOT IN ('PAID', 'REJECTED', 'PICKED_UP')
       WHERE t.id = ? AND t.tenant_id = ?`
    ).bind(fromTableId, tenantId).first<any>();

    if (!fromTable || !fromTable.active_order_key) {
      return json({ ok: false, error: "SOURCE_TABLE_NO_ORDER", message: "來源桌號目前無進行中訂單 / Bàn nguồn hiện không có đơn nào đang mở" }, 400);
    }

    // 2. Verify toTable and ensure it is IDLE (no active un-finalized order)
    const toTable = await env.DB.prepare(
      `SELECT t.id, t.label, t.is_active, o.key AS active_order_key
       FROM restaurant_tables t
       LEFT JOIN orders o ON o.table_id = t.id AND o.source = 'staff' AND o.status NOT IN ('PAID', 'REJECTED', 'PICKED_UP')
       WHERE t.id = ? AND t.tenant_id = ?`
    ).bind(toTableId, tenantId).first<any>();

    if (!toTable || !toTable.is_active) {
      return json({ ok: false, error: "DEST_TABLE_NOT_FOUND", message: "目的桌號不存在或已停用 / Bàn đích không tồn tại hoặc đã ngừng sử dụng" }, 404);
    }
    if (toTable.active_order_key) {
      return json({ ok: false, error: "DEST_TABLE_OCCUPIED", message: `【${toTable.label}】目前已有客人使用，無法轉入 / Bàn ${toTable.label} đang có khách, vui lòng chọn bàn trống khác` }, 409);
    }

    // 3. Move order from fromTable to toTable (atomic D1 update)
    const nextRevision = (Number(fromTable.active_revision) || 0) + 1;
    await env.DB.prepare(
      `UPDATE orders 
       SET table_id = ?, table_number = ?, revision = ?, updated_at = datetime('now')
       WHERE key = ? AND tenant_id = ?`
    ).bind(toTable.id, toTable.label, nextRevision, fromTable.active_order_key, tenantId).run();

    console.log(`[StaffTransfer] Tenant ${tenantId}: Order ${fromTable.active_order_key} transferred from Table ${fromTable.label} (${fromTable.id}) to Table ${toTable.label} (${toTable.id})`);

    return json({
      ok: true,
      message: `已將訂單從【${fromTable.label}】轉至【${toTable.label}】 / Đã chuyển đơn từ bàn ${fromTable.label} sang bàn ${toTable.label}`,
      fromTableId,
      toTableId,
      fromLabel: fromTable.label,
      toLabel: toTable.label,
      orderKey: fromTable.active_order_key
    });
  }

  // --- 7. GET /api/staff/orders/:key (Read staff order details) ---
  const orderGetMatch = path.match(/^\/api\/staff\/orders\/([a-zA-Z0-9_-]+)$/);
  if (request.method === "GET" && orderGetMatch) {
    const rawKey = orderGetMatch[1];
    if (!env.DB) return json({ ok: false, error: "NO_DB" }, 500);

    const resolvedKey = await resolveOrderKey(env, tenantId, rawKey) || rawKey;
    const order = await env.DB.prepare(
      `SELECT * FROM orders 
       WHERE tenant_id = ? AND (key = ? OR order_id = ? OR display_key = ?) AND source = 'staff'`
    ).bind(tenantId, resolvedKey, rawKey, rawKey).first<any>();

    if (!order) {
      return json({ ok: false, error: "ORDER_NOT_FOUND", message: "找不到該訂單 / Không tìm thấy đơn hàng" }, 404);
    }

    const { results: items } = await env.DB.prepare(
      `SELECT * FROM order_items 
       WHERE tenant_id = ? AND order_key = ? 
       ORDER BY round_number ASC, id ASC`
    ).bind(tenantId, order.key).all();

    return json({ ok: true, order, items: items || [] });
  }

  // --- 8. POST /api/staff/orders (Open new order on empty table) ---
  if (request.method === "POST" && path === "/api/staff/orders") {
    if (tenantCtx.storeStatus === 'paused') {
      return json({ ok: false, error: "STORE_PAUSED", message: "店家目前暫停接單中 / Quán đang tạm ngưng nhận đơn" }, 400);
    }

    const body: any = await request.json().catch(() => ({}));
    const requestId = String(body.requestId || body.request_id || "").trim();
    const tableId = String(body.tableId || body.table_id || "").trim();
    const rawItems: OrderItemInput[] = Array.isArray(body.items) ? body.items : [];
    const clientCustomizations: any[] = Array.isArray(body.customizations) ? body.customizations : [];
    const note = String(body.note || "").trim();
    const customer = String(body.customer || "").trim();
    const isTakeout = body.dining_option === 'takeout' || body.diningOption === 'takeout' || tableId === 'takeaway' || tableId === 'takeout';

    if (!requestId) {
      return json({ ok: false, error: "MISSING_REQUEST_ID", message: "缺少 requestId / Thiếu requestId" }, 400);
    }
    if (!isTakeout && !tableId) {
      return json({ ok: false, error: "MISSING_TABLE_ID", message: "請選擇桌號 / Vui lòng chọn bàn" }, 400);
    }
    if (rawItems.length === 0) {
      return json({ ok: false, error: "EMPTY_ITEMS", message: "購物車不能為空 / Giỏ hàng không được để trống" }, 400);
    }

    if (!env.DB) return json({ ok: false, error: "NO_DB" }, 500);

    // Compute deterministic request hash for idempotency
    const requestHash = await sha256Hex(JSON.stringify({ requestId, tableId: isTakeout ? 'takeout' : tableId, items: rawItems, customizations: clientCustomizations, note, customer }));

    // Check staff_order_requests for duplicate submission
    const existingReq = await env.DB.prepare(
      "SELECT request_hash, response_json FROM staff_order_requests WHERE tenant_id = ? AND request_id = ?"
    ).bind(tenantId, requestId).first<{ request_hash: string; response_json: string }>();

    if (existingReq) {
      if (existingReq.request_hash === requestHash) {
        const cachedRes = JSON.parse(existingReq.response_json);
        return json({ ...cachedRes, idempotent: true }, 200);
      } else {
        return json({ ok: false, error: "REQUEST_COLLISION", message: "Request ID 重複且內容不符 / Trùng lặp request ID" }, 409);
      }
    }

    let table: { id: string; label: string; is_active: number } | null = null;
    const defaultTakeoutLabel = tenantCtx.locale === 'vi' ? 'Mang về' : '外帶';
    const resolvedTableName = isTakeout ? defaultTakeoutLabel : '';

    if (!isTakeout) {
      // Verify table exists & active
      table = await env.DB.prepare(
        "SELECT id, label, is_active FROM restaurant_tables WHERE id = ? AND tenant_id = ?"
      ).bind(tableId, tenantId).first<{ id: string; label: string; is_active: number }>();

      if (!table || !table.is_active) {
        return json({ ok: false, error: "TABLE_NOT_AVAILABLE", message: "該桌號不存在或已停用 / Bàn không tồn tại hoặc đã ngừng sử dụng" }, 404);
      }

      // Check table occupancy (Pre-check)
      const activeOrder = await env.DB.prepare(
        `SELECT key, order_id, display_key, total_amount, round_count, revision, created_at 
         FROM orders 
         WHERE tenant_id = ? AND table_id = ? AND source = 'staff' AND status NOT IN ('PAID', 'REJECTED', 'PICKED_UP') 
         LIMIT 1`
      ).bind(tenantId, tableId).first<any>();

      if (activeOrder) {
        return json({
          ok: false,
          error: "TABLE_OCCUPIED",
          message: `桌號【${table.label}】已有使用中訂單 #${activeOrder.display_key || activeOrder.key} / Bàn đang có đơn hoạt động`,
          activeOrder
        }, 409);
      }
    }

    // Authoritative Server-side Price Calculation
    const calcResult = await calculateAuthoritativeItems(env, tenantId, rawItems, clientCustomizations);
    if (!calcResult.valid) {
      return json({ ok: false, error: calcResult.code || "INVALID_ITEMS", message: calcResult.error }, 400);
    }

    // Generate authoritative sequential number
    const prefix = resolveTenantOrderPrefix(tenantCtx, tenantId);
    const createdAt = new Date();
    const diningOption: DiningOption = isTakeout ? 'takeaway' : 'dine_in';
    let displayKey: string;
    try {
      ({ key: displayKey } = await getNextDailyOrderSeq(env, tenantId, diningOption, createdAt, prefix));
    } catch {
      return json({ ok: false, error: "ORDER_COUNTER_UNAVAILABLE", message: "序號產生失敗，請重試 / Lỗi tạo mã đơn" }, 503);
    }

    const orderId = crypto.randomUUID();
    const occupied = await env.DB.prepare('SELECT 1 FROM orders WHERE key = ?').bind(displayKey).first();
    const orderKey = occupied ? orderId : displayKey;
    const businessDate = new Date(createdAt.getTime() + 8 * 3600000).toISOString().slice(0, 10);
    const nowTw = new Date(Date.now() + 8 * 3600000);
    const timeStr = `${String(nowTw.getUTCHours()).padStart(2, "0")}:${String(nowTw.getUTCMinutes()).padStart(2, "0")}`;

    let customSummary = "";
    if (clientCustomizations.length > 0) {
      const flavorLines = clientCustomizations.map((c: any) => `  • ${c.label || 'Vị'}: ${c.value || c.name || ''}`).join("\n");
      customSummary = `\n\n🧂 客製化設定 / Chọn vị:\n${flavorLines}`;
    }
    const headerRoundPrefix = isTakeout
      ? `[${defaultTakeoutLabel} - ${timeStr}]`
      : `[第 1 輪 / Đợt 1 - ${timeStr}]`;
    const formattedContent = `${headerRoundPrefix}\n${formatItemsToText(calcResult.calculatedItems)}${customSummary}`;
    const customerName = customer || (isTakeout ? defaultTakeoutLabel : (table ? table.label : 'Khách'));

    const finalTableName = isTakeout ? defaultTakeoutLabel : (table ? table.label : '');
    const finalTableId = isTakeout ? null : (table ? table.id : null);

    const responsePayload = {
      ok: true,
      success: true,
      key: orderKey,
      orderId,
      displayKey,
      status: "ACCEPTED",
      roundCount: 1,
      revision: 1,
      total: calcResult.grandTotal,
      tableId: finalTableId,
      tableNumber: finalTableName,
      diningOption,
      customerName,
      customizations: clientCustomizations,
      createdAt: createdAt.toISOString()
    };

    // D1 Batch Transaction
    try {
      const batchStatements: any[] = [
        env.DB.prepare(
          `INSERT INTO orders (
             key, order_id, display_key, business_date, tenant_id, customer_name, pickup_time,
             status, total_amount, order_content, note, dining_option, table_number,
             table_id, source, revision, round_count, created_at, updated_at
           ) VALUES (
             ?, ?, ?, ?, ?, ?, ?,
             'ACCEPTED', ?, ?, ?, ?, ?,
             ?, 'staff', 1, 1, datetime('now'), datetime('now')
           )`
        ).bind(
          orderKey,
          orderId,
          displayKey,
          businessDate,
          tenantId,
          customerName,
          timeStr,
          calcResult.grandTotal,
          formattedContent,
          note,
          diningOption,
          finalTableName,
          finalTableId
        ),
        ...calcResult.calculatedItems.map(item => {
          const itemQty = Number(item.quantity) || 1;
          const unitPrice = Number(item.price || item.unit_price) || 0;
          const subtotal = Number(item.subtotal) || (unitPrice * itemQty);
          const optionsJson = JSON.stringify(item.options || item.selected_options || []);
          const bundleJson = item.bundle_snapshot_json || (item.bundleSelections ? JSON.stringify(item.bundleSelections) : null);
          const itemNote = item.note || item.notes || "";
          return env.DB.prepare(
            `INSERT INTO order_items (
               tenant_id, order_key, round_number, item_id, item_name, category_name,
               quantity, unit_price, subtotal, selected_options, bundle_snapshot_json, notes, created_at
             ) VALUES (?, ?, 1, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`
          ).bind(
            tenantId,
            orderKey,
            item.itemId || item.item_id || null,
            item.name || "Món",
            item.category || item.category_name || null,
            itemQty,
            unitPrice,
            subtotal,
            optionsJson,
            bundleJson,
            itemNote
          );
        }),
        env.DB.prepare(
          `INSERT INTO staff_order_requests (tenant_id, request_id, request_hash, order_key, round_number, response_json, created_at)
           VALUES (?, ?, ?, ?, 1, ?, datetime('now'))`
        ).bind(
          tenantId,
          requestId,
          requestHash,
          orderKey,
          JSON.stringify(responsePayload)
        )
      ];

      await env.DB.batch(batchStatements);
      return json(responsePayload, 201);
    } catch (err: any) {
      // Catch unique index violation (Two devices trying to open same table simultaneously)
      if (String(err).includes("idx_orders_active_staff_table") || String(err).includes("UNIQUE constraint failed")) {
        const freshActive = await env.DB.prepare(
          `SELECT key, order_id, display_key, total_amount, round_count, revision 
           FROM orders 
           WHERE tenant_id = ? AND table_id = ? AND source = 'staff' AND status NOT IN ('PAID', 'REJECTED', 'PICKED_UP') 
           LIMIT 1`
        ).bind(tenantId, tableId).first<any>();

        const labelText = table?.label || resolvedTableName || tableId;
        return json({
          ok: false,
          error: "TABLE_OCCUPIED",
          message: `桌號【${labelText}】剛已被其他裝置開單，請確認是否改為加點 / Bàn vừa được mở bởi thiết bị khác, vui lòng kiểm tra lại`,
          activeOrder: freshActive
        }, 409);
      }
      throw err;
    }
  }

  // --- 9. POST /api/staff/orders/:key/rounds (Append round to active staff order) ---
  const roundAppendMatch = path.match(/^\/api\/staff\/orders\/([a-zA-Z0-9_-]+)\/rounds$/);
  if (request.method === "POST" && roundAppendMatch) {
    const rawParentKey = roundAppendMatch[1];
    const body: any = await request.json().catch(() => ({}));
    const requestId = String(body.requestId || body.request_id || "").trim();
    const expectedRevision = Number(body.expectedRevision ?? body.expected_revision);
    const rawItems: OrderItemInput[] = Array.isArray(body.items) ? body.items : [];
    const clientCustomizations: any[] = Array.isArray(body.customizations) ? body.customizations : [];
    const note = String(body.note || "").trim();

    if (!requestId) {
      return json({ ok: false, error: "MISSING_REQUEST_ID", message: "缺少 requestId / Thiếu requestId" }, 400);
    }
    if (isNaN(expectedRevision) || expectedRevision < 0) {
      return json({ ok: false, error: "INVALID_REVISION", message: "缺少 expectedRevision / Thiếu expectedRevision" }, 400);
    }
    if (rawItems.length === 0) {
      return json({ ok: false, error: "EMPTY_ITEMS", message: "加點內容不能為空 / Danh sách món gọi thêm không được để trống" }, 400);
    }

    if (!env.DB) return json({ ok: false, error: "NO_DB" }, 500);

    const resolvedParentKey = await resolveOrderKey(env, tenantId, rawParentKey) || rawParentKey;

    // Compute deterministic request hash for idempotency
    const requestHash = await sha256Hex(JSON.stringify({ requestId, parentKey: resolvedParentKey, expectedRevision, items: rawItems, customizations: clientCustomizations, note }));

    // Check staff_order_requests for duplicate submission
    const existingReq = await env.DB.prepare(
      "SELECT request_hash, response_json FROM staff_order_requests WHERE tenant_id = ? AND request_id = ?"
    ).bind(tenantId, requestId).first<{ request_hash: string; response_json: string }>();

    if (existingReq) {
      if (existingReq.request_hash === requestHash) {
        const cachedRes = JSON.parse(existingReq.response_json);
        return json({ ...cachedRes, idempotent: true }, 200);
      } else {
        return json({ ok: false, error: "REQUEST_COLLISION", message: "Request ID 重複且內容不符 / Trùng lặp request ID" }, 409);
      }
    }

    // Fetch parent order
    const parent = await env.DB.prepare(
      `SELECT * FROM orders 
       WHERE tenant_id = ? AND (key = ? OR order_id = ? OR display_key = ?) AND source = 'staff'`
    ).bind(tenantId, resolvedParentKey, rawParentKey, rawParentKey).first<any>();

    if (!parent) {
      return json({ ok: false, error: "ORDER_NOT_FOUND", message: "找不到該訂單 / Không tìm thấy đơn hàng" }, 404);
    }

    // Lock boundary: Cannot append if order is PAID, REJECTED, or PICKED_UP
    if (parent.status === 'PAID' || parent.status === 'REJECTED' || parent.status === 'PICKED_UP') {
      return json({
        ok: false,
        error: "ORDER_FINALIZED",
        message: "訂單已結帳或已取消，無法再加點 / Đơn hàng đã kết thúc hoặc hủy, không thể gọi thêm"
      }, 409);
    }

    // Optimistic Concurrency Control Check: Verify revision matches
    if (expectedRevision !== undefined && expectedRevision !== null && Number(parent.revision) !== Number(expectedRevision)) {
      return json({
        ok: false,
        error: "REVISION_CONFLICT",
        message: "訂單版本已更新或已結帳，請重新確認最新內容 / Đơn hàng đã được cập nhật bởi thiết bị khác hoặc đã kết thúc, vui lòng kiểm tra lại",
        currentOrder: parent
      }, 409);
    }

    // Server-side Authoritative Price Calculation for appended items
    const calcResult = await calculateAuthoritativeItems(env, tenantId, rawItems, clientCustomizations);
    if (!calcResult.valid) {
      return json({ ok: false, error: calcResult.code || "INVALID_ITEMS", message: calcResult.error }, 400);
    }

    const currentRound = Number(parent.round_count) || 1;
    const nextRound = currentRound + 1;
    const nextRevision = expectedRevision + 1;

    const nowTw = new Date(Date.now() + 8 * 3600000);
    const timeStr = `${String(nowTw.getUTCHours()).padStart(2, "0")}:${String(nowTw.getUTCMinutes()).padStart(2, "0")}`;

    let previousRounds = String(parent.order_content || "").trim();
    if (!previousRounds.includes("[第 1 輪") && !previousRounds.includes("[Đợt 1")) {
      previousRounds = `[第 1 輪 / Đợt 1]\n${previousRounds}`;
    }
    const separator = "--------------------------------";
    let customSummary = "";
    if (clientCustomizations.length > 0) {
      const flavorLines = clientCustomizations.map((c: any) => `  • ${c.label || 'Vị'}: ${c.value || c.name || ''}`).join("\n");
      customSummary = `\n🧂 客製化設定 / Chọn vị:\n${flavorLines}\n`;
    }
    const newRoundBlock = `[第 ${nextRound} 輪 加點 / Đợt ${nextRound} - ${timeStr}]\n${formatItemsToText(calcResult.calculatedItems)}${customSummary ? `\n${customSummary}` : ''}`;
    const updatedContent = `${newRoundBlock}\n\n${separator}\n${previousRounds}`;

    const combinedNote = note
      ? (parent.note ? `${parent.note} | [加點${nextRound}]: ${note}` : `[加點${nextRound}]: ${note}`)
      : (parent.note || "");
    const newTotal = (Number(parent.total_amount) || 0) + calcResult.grandTotal;

    const responsePayload = {
      ok: true,
      success: true,
      key: parent.key,
      orderId: parent.order_id,
      displayKey: parent.display_key,
      status: "ACCEPTED",
      roundCount: nextRound,
      revision: nextRevision,
      total: newTotal,
      tableId: parent.table_id,
      tableNumber: parent.table_number,
      appendedItems: calcResult.calculatedItems,
      appendedTotal: calcResult.grandTotal,
      customizations: clientCustomizations
    };

    // D1 Batch Transaction with Optimistic Concurrency Revision Check
    // If revision != expectedRevision OR status in (PAID, REJECTED, PICKED_UP), revision becomes -1
    // which triggers CHECK(revision >= 0) and causes the entire batch to roll back atomically!
    try {
      const batchStatements: any[] = [
        env.DB.prepare(
          `UPDATE orders SET
             revision = CASE
               WHEN revision = ? AND status NOT IN ('PAID', 'REJECTED', 'PICKED_UP') THEN revision + 1
               ELSE -1
             END,
             total_amount = total_amount + ?,
             round_count = ?,
             last_appended_at = datetime('now'),
             order_content = ?,
             note = ?,
             status = 'ACCEPTED',
             updated_at = datetime('now')
           WHERE key = ? AND tenant_id = ?`
        ).bind(
          expectedRevision,
          calcResult.grandTotal,
          nextRound,
          updatedContent,
          combinedNote,
          parent.key,
          tenantId
        ),
        ...calcResult.calculatedItems.map(item => {
          const itemQty = Number(item.quantity) || 1;
          const unitPrice = Number(item.price || item.unit_price) || 0;
          const subtotal = Number(item.subtotal) || (unitPrice * itemQty);
          const optionsJson = JSON.stringify(item.options || item.selected_options || []);
          const bundleJson = item.bundle_snapshot_json || (item.bundleSelections ? JSON.stringify(item.bundleSelections) : null);
          const itemNote = item.note || item.notes || "";
          return env.DB.prepare(
            `INSERT INTO order_items (
               tenant_id, order_key, round_number, item_id, item_name, category_name,
               quantity, unit_price, subtotal, selected_options, bundle_snapshot_json, notes, created_at
             ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`
          ).bind(
            tenantId,
            parent.key,
            nextRound,
            item.itemId || item.item_id || null,
            item.name || "Món",
            item.category || item.category_name || null,
            itemQty,
            unitPrice,
            subtotal,
            optionsJson,
            bundleJson,
            itemNote
          );
        }),
        env.DB.prepare(
          `INSERT INTO staff_order_requests (tenant_id, request_id, request_hash, order_key, round_number, response_json, created_at)
           VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`
        ).bind(
          tenantId,
          requestId,
          requestHash,
          parent.key,
          nextRound,
          JSON.stringify(responsePayload)
        )
      ];

      await env.DB.batch(batchStatements);
      return json(responsePayload);
    } catch (err: any) {
      if (String(err).includes("CHECK constraint failed") || String(err).includes("revision")) {
        const freshParent = await env.DB.prepare(
          "SELECT key, order_id, display_key, status, total_amount, round_count, revision FROM orders WHERE key = ? AND tenant_id = ?"
        ).bind(parent.key, tenantId).first<any>();

        return json({
          ok: false,
          error: "REVISION_CONFLICT",
          message: "訂單版本已更新或已結帳，請重新確認最新內容 / Đơn hàng đã được cập nhật bởi thiết bị khác hoặc đã kết thúc, vui lòng kiểm tra lại",
          currentOrder: freshParent
        }, 409);
      }
      throw err;
    }
  }

  return json({ ok: false, error: "NOT_FOUND", message: "Endpoint không tồn tại" }, 404);
}
