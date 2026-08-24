import { Env } from '../types/env';
import { Order, DiningOption, AppendOrderPayload, OrderItemInput } from '../types/index';
import { corsHeaders, json } from '../utils/http';
import { syncToGoogleSheets } from '../integrations/googleSheets';
import { pushLineMessage, pushLineFlexMessage, buildOrderFlexMessage, buildAppendConfirmationFlexMessage, buildProgressFlexMessage, createRejectFlexBubble, createChangeFlexBubble } from './line';
import { getTenantId } from './menu';

import { TenantContext, tenantHasFeature, resolveTenantOrderPrefix, generateStandardOrderId } from '../types/tenant';

function jsonWithETag(data: any, version: string, status: number = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...corsHeaders(),
      "Content-Type": "application/json",
      "Cache-Control": "no-cache, no-store, must-revalidate",
      "ETag": `"${version}"`,
    },
  });
}

export function formatItemsToText(items: OrderItemInput[]): string {
  if (!items || items.length === 0) return "";
  return items.map(item => {
    const qty = Number(item.quantity) || 1;
    let line = `${qty}份 x ${item.name}`;
    const rawOptions = item.options || item.selected_options;
    const options: any[] = Array.isArray(rawOptions) ? rawOptions : (typeof rawOptions === 'string' ? JSON.parse(rawOptions || '[]') : []);
    if (options.length > 0) {
      const optLines = options.map((opt: any) => {
        const choice = opt.choice || opt.name || (typeof opt === 'string' ? opt : "");
        const priceExtra = opt.price && Number(opt.price) > 0 ? ` (+$${opt.price})` : "";
        return `  - ${choice}${priceExtra}`;
      }).join("\n");
      line += `\n${optLines}`;
    }
    if (item.note || item.notes) {
      line += `\n  - 備註: ${item.note || item.notes}`;
    }
    return line;
  }).join("\n");
}

export const ORDER_INDEX_LATEST = "order_index:latest";
export const MAX_INDEX = 200;

export async function createOrder(
  request: Request,
  env: Env,
  ctx?: ExecutionContext,
  tenantCtx?: TenantContext | null
): Promise<Response> {
  const data: any = await request.json();
  const tenantId = tenantCtx?.tenantId || getTenantId(request);

  if (tenantCtx?.storeStatus === 'paused') {
    return json({ error: "店家目前暫停接單中，暫無法接收新訂單", code: "STORE_PAUSED" }, 400);
  }

  const prefix = resolveTenantOrderPrefix(tenantCtx, tenantId);
  const fallbackOrderKey = generateStandardOrderId(prefix);
  const orderKey = data.orderId || data.key || fallbackOrderKey;

  const cleanTime = String(data.time || "").replace(/\s*\([^)]*\)/g, '').trim();
  let diningOption: DiningOption = (data.dining_option === 'dine_in' || data.diningOption === 'dine_in') ? 'dine_in' : 'takeaway';

  // Feature gate check: if tenant lacks 'dine_in' feature, automatically fallback to 'takeaway'
  if (diningOption === 'dine_in' && tenantCtx && !tenantHasFeature(tenantCtx, 'dine_in')) {
    console.warn(`[Orders] Tenant '${tenantId}' lacks 'dine_in' feature package. Auto-fallback to 'takeaway'.`);
    diningOption = 'takeaway';
  }

  const tableNumber = data.table_number || data.tableNumber || null;
  const userId = data.userId;
  const parentOrderKey = data.parent_order_key || data.parentOrderKey || null;
  const rawItems: OrderItemInput[] = Array.isArray(data.items) ? data.items : [];

  // 1. Nếu client chủ động truyền parent_order_key thì chuyển sang xử lý append
  if (parentOrderKey && env.DB) {
    const isDesktopOrder = data.is_desktop === true || data.isDesktop === true;
    return await executeAppendOrderInternal(
      env,
      tenantId,
      parentOrderKey,
      data.content || formatItemsToText(rawItems),
      Number(data.total) || 0,
      data.note || "",
      userId,
      data.customer,
      rawItems,
      ctx,
      tenantCtx,
      isDesktopOrder
    );
  }

  let orderContent = String(data.content || "").trim();
  if (!orderContent && rawItems.length > 0) {
    orderContent = formatItemsToText(rawItems);
  }

  const order: Order = {
    key: orderKey,
    customer: data.customer || "顧客",
    time: cleanTime,
    content: orderContent,
    status: "NEW",
    createdAt: Date.now(),
    userId: data.userId,
    total: data.total,
    reason: data.reason || "",
    note: data.note || "",
    diningOption: diningOption,
    tableNumber: tableNumber,
    roundCount: 1,
    round_count: 1
  };

  if (rawItems.length > 0 && env.DB) {
    const batchStatements: any[] = [
      env.DB.prepare(
        `INSERT INTO orders (key, tenant_id, user_id, customer_name, pickup_time, status, total_amount, order_content, reason, note, dining_option, table_number, round_count, last_appended_at, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, 'NEW', ?, ?, ?, ?, ?, ?, 1, NULL, datetime(?, 'unixepoch'), datetime('now'))
         ON CONFLICT(key) DO UPDATE SET
           status = CASE
             WHEN orders.status IN ('ACCEPTED', 'DONE', 'REJECTED', 'PICKED_UP', 'PAID') AND excluded.status = 'NEW'
             THEN orders.status
             ELSE excluded.status
           END,
           pickup_time = excluded.pickup_time,
           customer_name = CASE WHEN excluded.customer_name != 'Khách (Web)' THEN excluded.customer_name ELSE orders.customer_name END,
           total_amount = excluded.total_amount,
           order_content = excluded.order_content,
           reason = excluded.reason,
           note = excluded.note,
           dining_option = excluded.dining_option,
           table_number = excluded.table_number,
           round_count = CASE WHEN excluded.round_count > orders.round_count THEN excluded.round_count ELSE orders.round_count END,
           last_appended_at = CASE WHEN excluded.last_appended_at IS NOT NULL THEN excluded.last_appended_at ELSE orders.last_appended_at END,
           updated_at = datetime('now')`
      ).bind(
        order.key,
        tenantId,
        order.userId || null,
        order.customer,
        order.time,
        order.total,
        order.content,
        order.reason || "",
        order.note || "",
        order.diningOption || "takeaway",
        order.tableNumber || null,
        Math.floor((order.createdAt || Date.now()) / 1000)
      ),
      ...rawItems.map(item => {
        const itemQty = Number(item.quantity) || 1;
        const unitPrice = Number(item.price || item.unit_price) || 0;
        const subtotal = Number(item.subtotal) || (unitPrice * itemQty);
        const optionsJson = JSON.stringify(item.options || item.selected_options || []);
        const itemNote = item.note || item.notes || "";
        return env.DB.prepare(
          `INSERT INTO order_items (tenant_id, order_key, round_number, item_id, item_name, category_name, quantity, unit_price, subtotal, selected_options, notes, created_at)
           VALUES (?, ?, 1, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`
        ).bind(
          tenantId,
          order.key,
          item.itemId || item.item_id || null,
          item.name || "Món",
          item.category || item.category_name || null,
          itemQty,
          unitPrice,
          subtotal,
          optionsJson,
          itemNote
        );
      })
    ];
    await env.DB.batch(batchStatements);
  } else {
    await saveOrder(env, order, tenantId);
  }

  // 2. Tự động gửi LINE Flex Message xác nhận tiến độ đơn hàng cho khách đặt qua Desktop
  const isDesktopOrder = data.is_desktop === true || data.isDesktop === true || !data.liffInClient;
  if (order.userId && typeof order.userId === 'string' && order.userId.startsWith('U') && order.userId.length > 20 && isDesktopOrder) {
    try {
      const queueRes = await getOrderQueueAhead(env, tenantId, order.key);
      const queueAheadCount = queueRes ? queueRes.queueAhead : 0;
      const flexBubble = buildProgressFlexMessage(order, queueAheadCount, tenantCtx);
      const brandName = tenantCtx?.brandName || "Benmi";

      const pushPromise = pushLineFlexMessage(
        order.userId,
        `[${brandName}] 📋 訂單進度 #${order.key}`,
        flexBubble,
        env,
        tenantCtx
      );
      if (ctx && typeof ctx.waitUntil === 'function') {
        ctx.waitUntil(pushPromise);
      } else {
        await pushPromise;
      }
    } catch (pushErr) {
      console.error(`[${tenantId}] Failed to push desktop order Flex Message:`, pushErr);
    }
  }

  return json({ success: true, key: orderKey });
}

export async function executeAppendOrderInternal(
  env: Env,
  tenantId: string,
  parentKey: string,
  appendedContent: string,
  appendedTotal: number,
  note: string,
  userId?: string,
  customerName?: string,
  items?: OrderItemInput[],
  ctx?: ExecutionContext,
  tenantCtx?: TenantContext | null,
  isDesktop?: boolean
): Promise<Response> {
  const rawItems: OrderItemInput[] = Array.isArray(items) ? items : [];
  if (!appendedContent && rawItems.length > 0) {
    appendedContent = formatItemsToText(rawItems);
  }

  if (!parentKey || (!appendedContent && rawItems.length === 0) || appendedTotal <= 0) {
    return json({ error: "參數不完整 / Incomplete parameters", code: "INVALID_PARAMS" }, 400);
  }

  if (!env.DB) {
    return json({ error: "Database not configured", code: "NO_DB" }, 500);
  }

  // 1. Fetch parent order
  const row = await env.DB.prepare(
    "SELECT * FROM orders WHERE key = ? AND tenant_id = ?"
  ).bind(parentKey, tenantId).first<any>();

  if (!row) {
    return json({ error: "找不到原訂單 / Order not found", code: "ORDER_NOT_FOUND" }, 404);
  }

  // 2. Lock boundary: Cannot append if order is PICKED_UP, REJECTED, or PAID
  if (row.status === 'PICKED_UP' || row.status === 'REJECTED' || row.status === 'PAID') {
    return json({
      error: "訂單已完成或已取消，無法再加點，請重新開啟新訂單 / Đơn hàng đã kết thúc hoặc đã hủy, không thể gọi thêm",
      code: "ORDER_LOCKED"
    }, 400);
  }

  // 3. Compute next round & time
  const currentRound = Number(row.round_count) || 1;
  const nextRound = currentRound + 1;

  const nowTw = new Date(Date.now() + 8 * 3600000);
  const timeStr = `${String(nowTw.getUTCHours()).padStart(2, "0")}:${String(nowTw.getUTCMinutes()).padStart(2, "0")}`;

  // 4. Multi-round content formatting (Mới -> Cũ: Đợt mới nhất ở trên cùng)
  let previousRounds = String(row.order_content || "").trim();
  if (!previousRounds.includes("[第 1 輪") && !previousRounds.includes("[Đợt 1")) {
    previousRounds = `[第 1 輪 / Đợt 1]\n${previousRounds}`;
  }
  const separator = "--------------------------------";
  const newRoundBlock = `[第 ${nextRound} 輪 加點 / Đợt ${nextRound} - ${timeStr}]\n${appendedContent.trim()}`;
  const updatedContent = `${newRoundBlock}\n\n${separator}\n${previousRounds}`;

  // 5. Combine note & update total
  const combinedNote = note
    ? (row.note ? `${row.note} | [加點${nextRound}]: ${note}` : `[加點${nextRound}]: ${note}`)
    : (row.note || "");
  const newTotal = (Number(row.total_amount) || 0) + appendedTotal;

  // 6. Persist to D1: Luôn chuyển trạng thái về ACCEPTED (kể cả đơn cũ đang là DONE) để POS & Bếp thấy món mới
  if (rawItems.length > 0) {
    const batchStatements: any[] = [
      env.DB.prepare(
        `UPDATE orders SET
           order_content = ?,
           total_amount = ?,
           status = 'ACCEPTED',
           round_count = ?,
           last_appended_at = datetime('now'),
           note = ?,
           updated_at = datetime('now')
         WHERE key = ? AND tenant_id = ?`
      ).bind(
        updatedContent,
        newTotal,
        nextRound,
        combinedNote,
        parentKey,
        tenantId
      ),
      ...rawItems.map(item => {
        const itemQty = Number(item.quantity) || 1;
        const unitPrice = Number(item.price || item.unit_price) || 0;
        const subtotal = Number(item.subtotal) || (unitPrice * itemQty);
        const optionsJson = JSON.stringify(item.options || item.selected_options || []);
        const itemNote = item.note || item.notes || "";
        return env.DB.prepare(
          `INSERT INTO order_items (tenant_id, order_key, round_number, item_id, item_name, category_name, quantity, unit_price, subtotal, selected_options, notes, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`
        ).bind(
          tenantId,
          parentKey,
          nextRound,
          item.itemId || item.item_id || null,
          item.name || "Món",
          item.category || item.category_name || null,
          itemQty,
          unitPrice,
          subtotal,
          optionsJson,
          itemNote
        );
      })
    ];
    await env.DB.batch(batchStatements);
  } else {
    await env.DB.prepare(
      `UPDATE orders SET
         order_content = ?,
         total_amount = ?,
         status = 'ACCEPTED',
         round_count = ?,
         last_appended_at = datetime('now'),
         note = ?,
         updated_at = datetime('now')
       WHERE key = ? AND tenant_id = ?`
    ).bind(
      updatedContent,
      newTotal,
      nextRound,
      combinedNote,
      parentKey,
      tenantId
    ).run();
  }

  // 7. Construct updated order object for notification & response
  const updatedOrder: Order = {
    key: parentKey,
    customer: row.customer_name || customerName || "顧客",
    time: row.pickup_time || "",
    content: updatedContent,
    status: "ACCEPTED",
    createdAt: row.created_at ? new Date(row.created_at + "Z").getTime() : Date.now(),
    userId: row.user_id || userId,
    total: newTotal,
    reason: row.reason || "",
    note: combinedNote,
    diningOption: (row.dining_option as any) || 'dine_in',
    tableNumber: row.table_number || null,
    roundCount: nextRound,
    round_count: nextRound,
    lastAppendedAt: new Date().toISOString()
  };

  // 8. Sync to Google Sheets
  try {
    if (ctx && ctx.waitUntil) {
      ctx.waitUntil(syncToGoogleSheets(updatedOrder, env, tenantCtx));
    } else {
      await syncToGoogleSheets(updatedOrder, env, tenantCtx);
    }
  } catch (sheetErr) {
    console.error("[appendOrder] Google Sheets sync failed:", sheetErr);
  }

  // 9. Tự động gửi LINE Flex Message xác nhận 加點 cho khách đặt qua Desktop
  const targetUserId = row.user_id || userId;
  if (targetUserId && typeof targetUserId === 'string' && targetUserId.startsWith('U') && targetUserId.length > 20 && isDesktop) {
    try {
      const flexBubble = buildAppendConfirmationFlexMessage(
        updatedOrder,
        appendedContent,
        appendedTotal,
        nextRound,
        tenantCtx
      );
      const brandName = tenantCtx?.brandName || "Benmi";
      const pushPromise = pushLineFlexMessage(
        targetUserId,
        `[${brandName}] 🍽️ 現場加點確認 (第 ${nextRound} 輪)`,
        flexBubble,
        env,
        tenantCtx
      );
      if (ctx && typeof ctx.waitUntil === 'function') {
        ctx.waitUntil(pushPromise);
      } else {
        await pushPromise;
      }
    } catch (pushErr) {
      console.error(`[${tenantId}] Failed to push desktop append Flex Message:`, pushErr);
    }
  }

  return json({
    success: true,
    key: parentKey,
    round_count: nextRound,
    total_amount: newTotal,
    status: 'ACCEPTED'
  });
}

export async function appendOrder(
  request: Request,
  env: Env,
  ctx?: ExecutionContext,
  tenantCtx?: TenantContext | null
): Promise<Response> {
  try {
    const payload: AppendOrderPayload = await request.json();
    const tenantId = tenantCtx?.tenantId || payload.tenant_id || getTenantId(request);
    const parentKey = payload.parent_order_key;
    const rawItems: OrderItemInput[] = Array.isArray(payload.items) ? payload.items : (Array.isArray(payload.appended_items) ? payload.appended_items : []);
    const appendedContent = payload.appended_content || formatItemsToText(rawItems);
    const appendedTotal = Number(payload.appended_total) || 0;
    const note = payload.note ? String(payload.note).trim() : "";
    const userId = payload.user_id;
    const customerName = payload.customer_name;
    const isDesktop = payload.is_desktop === true || payload.isDesktop === true;

    return await executeAppendOrderInternal(
      env,
      tenantId,
      parentKey,
      appendedContent,
      appendedTotal,
      note,
      userId,
      customerName,
      rawItems,
      ctx,
      tenantCtx,
      isDesktop
    );
  } catch (e: any) {
    console.error("[appendOrder] Error:", e);
    return json({ error: e.message || "Failed to append order", code: "INTERNAL_ERROR" }, 500);
  }
}

export async function getPendingMap(env: Env, tenantId: string, userId: string): Promise<Record<string, any>> {
  try {
    const { results } = await env.DB.prepare(
      "SELECT * FROM pending_actions WHERE tenant_id = ? AND user_id = ?"
    ).bind(tenantId, userId).all<any>();

    const pMap: Record<string, any> = {};
    if (results) {
      for (const row of results) {
        pMap[row.order_key] = {
          orderKey: row.order_key,
          type: row.action_type,
          createdAt: row.created_at ? new Date(row.created_at + "Z").getTime() : Date.now(),
          questionText: row.question_text,
          reason: row.reason || "",
          note: row.note || ""
        };
      }
    }
    return pMap;
  } catch (e) {
    console.error("[getPendingMap] D1 Error:", e);
    return {};
  }
}

export async function updateOrder(
  request: Request,
  env: Env,
  ctx?: ExecutionContext,
  tenantCtx?: TenantContext | null
): Promise<Response> {
  const data: any = await request.json();
  const orderRow = await env.DB.prepare(
    "SELECT * FROM orders WHERE key = ?"
  ).bind(data.key).first<any>();
  if (!orderRow) return json({ error: "order not found" }, 404);

  const effectiveTenantId = orderRow.tenant_id || tenantCtx?.tenantId || getTenantId(request);
  if (!tenantCtx || tenantCtx.tenantId !== effectiveTenantId) {
    tenantCtx = await resolveTenantContext(effectiveTenantId, env);
  }
  const tenantId = effectiveTenantId;
  const brandName = tenantCtx?.brandName || "Store";

  const order: Order = {
    key: orderRow.key,
    customer: orderRow.customer_name,
    time: orderRow.pickup_time,
    content: orderRow.order_content,
    status: orderRow.status,
    createdAt: new Date(orderRow.created_at + "Z").getTime(),
    userId: orderRow.user_id || undefined,
    total: orderRow.total_amount,
    reason: orderRow.reason || "",
    note: orderRow.note || "",
    diningOption: (orderRow.dining_option as any) || 'takeaway',
    tableNumber: orderRow.table_number || undefined,
    roundCount: Number(orderRow.round_count) || 1,
    round_count: Number(orderRow.round_count) || 1,
    lastAppendedAt: orderRow.last_appended_at || null,
    last_appended_at: orderRow.last_appended_at || null
  };
  const incoming = data.status;

  if (data.reason !== undefined) order.reason = data.reason;
  if (data.note !== undefined) order.note = data.note;

  // Employee 接單
  if (incoming === "ACCEPTED") {
    if (order.status === "ACCEPTED" || order.status === "DONE" || order.status === "PICKED_UP") {
      await saveOrder(env, order, tenantId); // Sync DB
      return json({ success: true });
    }
    order.status = "ACCEPTED";
    await saveOrder(env, order, tenantId);

    if (order.userId) {
      try {
        await env.DB.prepare(
          "DELETE FROM pending_actions WHERE tenant_id = ? AND user_id = ? AND order_key = ?"
        ).bind(tenantId, order.userId, order.key).run();
      } catch { }
    }
    return json({ success: true });
  }

  // Employee 準備好了
  if (incoming === "DONE") {
    if (order.status === "DONE" || order.status === "PICKED_UP") {
      await saveOrder(env, order, tenantId);
      return json({ success: true });
    }
    order.status = "DONE";
    await saveOrder(env, order, tenantId);

    return json({ success: true });
  }

  // Employee 需要更改 -> 等客戶「同意/取消」
  if (incoming === "CHANGED") {
    order.status = "WAITING_CUSTOMER_CHANGE";
    await saveOrder(env, order, tenantId);

    if (order.userId) {
      let notifyText = "";
      const reason = order.reason || "未提供原因";
      const note = order.note || "";
      if (order.reason && order.reason.startsWith("賣完了：")) {
        const items = order.reason.replace("賣完了：", "").split(",").map(s => s.trim()).filter(Boolean);
        let joinedItems = items.join("、");
        if (items.length === 2) {
          joinedItems = items.join("跟");
        } else if (items.length > 2) {
          joinedItems = items.slice(0, -1).join("、") + "跟" + items[items.length - 1];
        }
        notifyText = `不好意思 ${joinedItems}我們現在賣完了，請問可以幫您換別的嗎？`;
      } else {
        notifyText =
          `${brandName} 已收到您的訂單 #${order.key}，但需要微調訂單內容：\n` +
          `原因：${reason}\n` +
          (note ? `備註：${note}\n` : "") +
          `\n請回覆「同意」以接受變更，或回覆「取消 / 不要了」以取消訂單。`;
      }

      await env.DB.prepare(
        `INSERT INTO pending_actions (tenant_id, user_id, order_key, action_type, question_text, reason, note)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(tenant_id, user_id, order_key) DO UPDATE SET
           action_type = excluded.action_type,
           question_text = excluded.question_text,
           reason = excluded.reason,
           note = excluded.note,
           created_at = CURRENT_TIMESTAMP`
      ).bind(tenantId, order.userId, order.key, "CHANGE", notifyText, reason, note).run();

      const changeFlex = createChangeFlexBubble(order.key, reason, note, brandName);
      const flexSent = await pushLineFlexMessage(order.userId, `[${brandName}] 訂單微調通知 #${order.key}`, changeFlex, env, tenantCtx);
      if (!flexSent) {
        await pushLineMessage(order.userId, notifyText, env, tenantCtx);
      }
    }

    return json({ success: true });
  }

  // Employee 無法接單 -> 等客戶「同意/不同意」
  if (incoming === "REJECTED") {
    if (order.reason === "取消並不回復客戶") {
      order.status = "REJECTED";
      await saveOrder(env, order, tenantId);
      if (ctx && ctx.waitUntil) ctx.waitUntil(syncToGoogleSheets(order, env, tenantCtx));
      return json({ success: true });
    }

    order.status = "WAITING_CUSTOMER_REJECT";
    await saveOrder(env, order, tenantId);

    if (order.userId) {
      const reason = order.reason || "商品已售完 / 目前無法接單";
      const notifyText =
        `非常抱歉！${brandName} 目前無法接下您的訂單 #${order.key}。\n` +
        `原因：${reason}\n` +
        `\n請回覆「同意」以取消訂單，或回覆「不同意」以重新確認。`;

      await env.DB.prepare(
        `INSERT INTO pending_actions (tenant_id, user_id, order_key, action_type, question_text, reason, note)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(tenant_id, user_id, order_key) DO UPDATE SET
           action_type = excluded.action_type,
           question_text = excluded.question_text,
           reason = excluded.reason,
           note = excluded.note,
           created_at = CURRENT_TIMESTAMP`
      ).bind(tenantId, order.userId, order.key, "REJECT", notifyText, reason, order.note || "").run();

      const rejectFlex = createRejectFlexBubble(order.key, reason, brandName);
      const flexSent = await pushLineFlexMessage(order.userId, `[${brandName}] 無法接單通知 #${order.key}`, rejectFlex, env, tenantCtx);
      if (!flexSent) {
        await pushLineMessage(order.userId, notifyText, env, tenantCtx);
      }
    }

    return json({ success: true });
  }

  // Employee 強制取消
  if (incoming === "FORCE_REJECT") {
    order.status = "REJECTED";
    await saveOrder(env, order, tenantId);

    if (order.userId) {
      try {
        await env.DB.prepare(
          "DELETE FROM pending_actions WHERE tenant_id = ? AND user_id = ? AND order_key = ?"
        ).bind(tenantId, order.userId, order.key).run();
      } catch { }
      await pushLineMessage(order.userId, `${brandName}：由於未收到您的回覆，訂單 #${order.key} 已自動取消。期待下次為您服務！`, env, tenantCtx);
    }

    if (ctx && ctx.waitUntil) ctx.waitUntil(syncToGoogleSheets(order, env, tenantCtx));
    return json({ success: true });
  }

  // Employee 已取餐 (PICKED_UP - Dành cho đơn mang đi)
  if (incoming === "PICKED_UP") {
    if (order.status === "PICKED_UP") {
      await saveOrder(env, order, tenantId);
      return json({ success: true });
    }
    order.status = "PICKED_UP";
    await saveOrder(env, order, tenantId);

    if (ctx && ctx.waitUntil) ctx.waitUntil(syncToGoogleSheets(order, env, tenantCtx));
    return json({ success: true });
  }

  // Employee 已結帳 (PAID - Dành cho đơn ăn tại bàn)
  if (incoming === "PAID") {
    if (order.status === "PAID") {
      await saveOrder(env, order, tenantId);
      return json({ success: true });
    }
    order.status = "PAID";
    await saveOrder(env, order, tenantId);

    if (ctx && ctx.waitUntil) ctx.waitUntil(syncToGoogleSheets(order, env, tenantCtx));
    return json({ success: true });
  }

  order.status = incoming;
  await saveOrder(env, order, tenantId);

  return json({ success: true });
}

export async function getWaitingCount(request: Request, env: Env): Promise<Response> {
  const tenantId = getTenantId(request);

  if (!env.DB) return jsonWithETag({ waitingCount: 0 }, "0");

  try {
    const activeRows = await env.DB.prepare(
      `SELECT key, pickup_time, order_content, created_at, updated_at FROM orders 
       WHERE tenant_id = ? 
         AND status = 'ACCEPTED'
         AND created_at >= DATETIME('now', '-24 hours')`
    ).bind(tenantId).all<any>();

    const now = Date.now();
    // Các đơn trong hàng đợi hiện tại: đơn có giờ nhận từ quá khứ (đang làm/chưa xong) đến trong vòng 1 giờ tới (60 phút)
    const thresholdMs = now + 60 * 60 * 1000;

    let waitingCount = 0;
    let lastUpdated = "0";

    if (activeRows && activeRows.results) {
      for (const item of activeRows.results) {
        if (item.updated_at && item.updated_at > lastUpdated) {
          lastUpdated = item.updated_at;
        }
        const itemPickupMs = parsePickupTimeToMs(item.pickup_time, item.created_at, item.order_content);
        if (itemPickupMs <= thresholdMs) {
          waitingCount++;
        }
      }
    }

    const currentVersion = `${waitingCount}_${lastUpdated}`;

    const clientETag = request.headers.get("if-none-match")?.replace(/^W\//, '').replace(/"/g, '');
    if (clientETag && clientETag === currentVersion) {
      return new Response(null, {
        status: 304,
        headers: {
          "Cache-Control": "no-cache, no-store, must-revalidate",
          "ETag": `"${currentVersion}"`,
          ...corsHeaders(),
        },
      });
    }

    return jsonWithETag({ waitingCount }, currentVersion);
  } catch (e: any) {
    console.error("[getWaitingCount] D1 error:", e);
    return jsonWithETag({ waitingCount: 0 }, "0");
  }
}

function mapOrderRows(results: any[]): Order[] {
  return (results || []).map(row => {
    let parsedCreatedAt = Date.now();
    if (row.created_at) {
      const rawStr = String(row.created_at).trim();
      const isoStr = rawStr.includes("T") ? (rawStr.endsWith("Z") ? rawStr : rawStr + "Z") : rawStr.replace(" ", "T") + "Z";
      const t = new Date(isoStr).getTime();
      if (!isNaN(t)) parsedCreatedAt = t;
    }

    let parsedLastAppendedAt: number | null = null;
    if (row.last_appended_at) {
      const rawStr = String(row.last_appended_at).trim();
      const isoStr = rawStr.includes("T") ? (rawStr.endsWith("Z") ? rawStr : rawStr + "Z") : rawStr.replace(" ", "T") + "Z";
      const t = new Date(isoStr).getTime();
      if (!isNaN(t)) parsedLastAppendedAt = t;
    }

    return {
      key: row.key,
      customer: row.customer_name || "顧客",
      time: row.pickup_time || "",
      content: row.order_content || "",
      status: row.status || "NEW",
      createdAt: parsedCreatedAt,
      userId: row.user_id || undefined,
      total: Number(row.total_amount) || 0,
      reason: row.reason || "",
      note: row.note || "",
      diningOption: (row.dining_option as any) || 'takeaway',
      tableNumber: row.table_number || undefined,
      roundCount: Number(row.round_count) || 1,
      round_count: Number(row.round_count) || 1,
      lastAppendedAt: parsedLastAppendedAt || row.last_appended_at || null,
      last_appended_at: parsedLastAppendedAt || row.last_appended_at || null
    };
  });
}

export async function getOrders(request: Request, env: Env): Promise<Response> {
  const tenantId = getTenantId(request);

  if (!env.DB) return jsonWithETag([], "0");

  try {
    // 1. Tính toán ETag version tức thì dựa trên Index D1 (Tối ưu O(1) - Chỉ đọc đúng 1 dòng)
    const verRow = await env.DB.prepare(
      "SELECT updated_at, key, status, round_count FROM orders WHERE tenant_id = ? ORDER BY updated_at DESC LIMIT 1"
    ).bind(tenantId).first<{ updated_at: string | null; key: string | null; status: string | null; round_count: number | null }>();

    const lastUpdated = verRow?.updated_at || "0";
    const lastKey = verRow?.key || "empty";
    const lastStatus = verRow?.status || "none";
    const lastRound = verRow?.round_count || 1;
    const currentVersion = `${lastUpdated}_${lastKey}_${lastStatus}_${lastRound}`;

    // 2. Client gửi Header "If-None-Match" -> So sánh với D1 version
    const clientETag = request.headers.get("if-none-match")?.replace(/^W\//, '').replace(/"/g, '');
    if (clientETag && clientETag === currentVersion) {
      return new Response(null, {
        status: 304,
        headers: {
          "Cache-Control": "no-cache, no-store, must-revalidate",
          "ETag": `"${currentVersion}"`,
          ...corsHeaders(),
        },
      });
    }

    // 3. Live Query: Lấy các đơn active + đơn hôm nay (UTC+8)
    const nowTw = new Date(Date.now() + 8 * 3600000);
    const todayTwStr = `${nowTw.getUTCFullYear()}-${String(nowTw.getUTCMonth() + 1).padStart(2, "0")}-${String(nowTw.getUTCDate()).padStart(2, "0")}`;
    const startOfTodayUTC = new Date(new Date(`${todayTwStr}T00:00:00+08:00`).getTime()).toISOString().replace("T", " ").replace(/\.\d+Z$/, "");

    const { results } = await env.DB.prepare(
      `SELECT key, customer_name, pickup_time, status, total_amount, order_content, reason, note, dining_option, table_number, round_count, last_appended_at, created_at 
       FROM orders 
       WHERE tenant_id = ? 
         AND (status IN ('NEW', 'ACCEPTED', 'WAITING_CUSTOMER_CHANGE', 'WAITING_CUSTOMER_REJECT', 'DONE') 
              OR created_at >= ?)
       ORDER BY created_at DESC LIMIT 500`
    ).bind(tenantId, startOfTodayUTC).all<any>();

    const orders = mapOrderRows(results || []);
    return jsonWithETag(orders, currentVersion);
  } catch (e: any) {
    console.error("[getOrders] D1 error:", e);
    return json({ error: "Failed to fetch orders", details: e.message }, 500);
  }
}

export async function getHistorySummary(request: Request, env: Env): Promise<Response> {
  const tenantId = getTenantId(request);
  if (!env.DB) return json([]);

  try {
    const { results } = await env.DB.prepare(
      `SELECT 
         DATE(DATETIME(created_at, '+8 hours')) as date_group,
         COUNT(*) as total_orders,
         SUM(total_amount) as total_revenue
       FROM orders
       WHERE tenant_id = ? 
         AND status IN ('PICKED_UP', 'REJECTED', 'PAID')
         AND created_at >= DATETIME('now', '-30 days')
       GROUP BY date_group
       ORDER BY date_group DESC`
    ).bind(tenantId).all<any>();

    const summary = (results || []).map(r => ({
      date: r.date_group,
      count: Number(r.total_orders) || 0,
      total: Number(r.total_revenue) || 0
    }));

    return json(summary);
  } catch (e: any) {
    console.error("[getHistorySummary] D1 error:", e);
    return json({ error: "Failed to fetch history summary", details: e.message }, 500);
  }
}

export async function getOrdersByDate(request: Request, env: Env): Promise<Response> {
  const tenantId = getTenantId(request);
  if (!env.DB) return json([]);

  const url = new URL(request.url);
  const dateStr = url.searchParams.get("date");
  if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return json({ error: "Invalid date format, expected YYYY-MM-DD" }, 400);
  }

  try {
    const { results } = await env.DB.prepare(
      `SELECT key, customer_name, pickup_time, status, total_amount, order_content, reason, note, dining_option, table_number, round_count, last_appended_at, created_at 
       FROM orders 
       WHERE tenant_id = ? 
         AND status IN ('PICKED_UP', 'REJECTED', 'PAID')
         AND DATE(DATETIME(created_at, '+8 hours')) = ?
       ORDER BY created_at DESC LIMIT 500`
    ).bind(tenantId, dateStr).all<any>();

    const orders = mapOrderRows(results || []);
    return json(orders);
  } catch (e: any) {
    console.error("[getOrdersByDate] D1 error:", e);
    return json({ error: "Failed to fetch orders by date", details: e.message }, 500);
  }
}

export async function getHistoryAll(request: Request, env: Env): Promise<Response> {
  const tenantId = getTenantId(request);
  if (!env.DB) return json([]);

  try {
    const { results } = await env.DB.prepare(
      `SELECT key, customer_name, pickup_time, status, total_amount, order_content, reason, note, dining_option, table_number, round_count, last_appended_at, created_at 
       FROM orders 
       WHERE tenant_id = ? 
         AND status IN ('PICKED_UP', 'REJECTED', 'PAID')
         AND created_at >= DATETIME('now', '-30 days')
       ORDER BY created_at DESC LIMIT 1000`
    ).bind(tenantId).all<any>();

    const orders = mapOrderRows(results || []);
    return json(orders);
  } catch (e: any) {
    console.error("[getHistoryAll] D1 error:", e);
    return json({ error: "Failed to fetch all history orders", details: e.message }, 500);
  }
}

export async function saveOrder(env: Env, order: Order, tenantId: string): Promise<void> {
  // Save order to D1
  await env.DB.prepare(
    `INSERT INTO orders (key, tenant_id, user_id, customer_name, pickup_time, status, total_amount, order_content, reason, note, dining_option, table_number, round_count, last_appended_at, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, COALESCE(?, 1), ?, datetime(?, 'unixepoch'), datetime('now'))
     ON CONFLICT(key) DO UPDATE SET
       status = CASE
         WHEN orders.status IN ('ACCEPTED', 'DONE', 'REJECTED', 'PICKED_UP', 'PAID') AND excluded.status = 'NEW'
         THEN orders.status
         ELSE excluded.status
       END,
       pickup_time = excluded.pickup_time,
       customer_name = CASE WHEN excluded.customer_name != 'Khách (Web)' THEN excluded.customer_name ELSE orders.customer_name END,
       total_amount = excluded.total_amount,
       order_content = excluded.order_content,
       reason = excluded.reason,
       note = excluded.note,
       dining_option = excluded.dining_option,
       table_number = excluded.table_number,
       round_count = CASE WHEN excluded.round_count > orders.round_count THEN excluded.round_count ELSE orders.round_count END,
       last_appended_at = CASE WHEN excluded.last_appended_at IS NOT NULL THEN excluded.last_appended_at ELSE orders.last_appended_at END,
       updated_at = datetime('now')`
  ).bind(
    order.key,
    tenantId,
    order.userId || null,
    order.customer,
    order.time,
    order.status,
    order.total,
    order.content,
    order.reason || "",
    order.note || "",
    order.diningOption || "takeaway",
    order.tableNumber || null,
    order.roundCount || order.round_count || 1,
    order.lastAppendedAt || order.last_appended_at || null,
    Math.floor((order.createdAt || Date.now()) / 1000)
  ).run();
}

export async function handleOrdersMigration(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const secret = url.searchParams.get("secret");
  if (secret !== "benmi_migrate_2026") {
    return new Response("Unauthorized", { status: 401 });
  }

  const batchSize = parseInt(url.searchParams.get("limit") || "40", 10);
  const reqCursor = url.searchParams.get("cursor") || "";

  const logs: string[] = [];
  let migratedCount = 0;

  try {
    const listRes = await env.ORDER_STATE.list({ 
      prefix: "order:", 
      cursor: reqCursor,
      limit: batchSize
    });

    for (const keyObj of listRes.keys) {
      const key = keyObj.name;
      if (key === "order_index:latest" || key === "order_view:cache") continue;

      const raw = await env.ORDER_STATE.get(key);
      if (!raw) continue;

      try {
        const order = JSON.parse(raw);
        const tenantId = order.tenantId || "benmi";

        await env.DB.prepare(
          `INSERT OR IGNORE INTO orders (key, tenant_id, user_id, customer_name, pickup_time, status, total_amount, order_content, reason, note, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime(?, 'unixepoch'), datetime('now'))`
        ).bind(
          order.key,
          tenantId,
          order.userId || null,
          order.customer,
          order.time,
          order.status || "NEW",
          order.total || 0,
          order.content,
          order.reason || "",
          order.note || "",
          Math.floor((order.createdAt || Date.now()) / 1000)
        ).run();
        migratedCount++;
      } catch (e: any) {
        logs.push(`Failed to migrate order ${key}: ${e.message}`);
      }
    }

    const nextCursor = ("cursor" in listRes) ? (listRes.cursor || "") : "";
    const isComplete = listRes.list_complete || nextCursor === "";

    return json({
      success: true,
      migrated_count: migratedCount,
      completed: isComplete,
      next_cursor: nextCursor,
      logs
    });
  } catch (err: any) {
    return json({ success: false, error: err.message, logs }, 500);
  }
}

export function parsePickupTimeToMs(timeStr: string | null | undefined, createdAtStr: string | null | undefined, orderContent?: string): number {
  const createdDate = createdAtStr ? new Date(createdAtStr.endsWith("Z") ? createdAtStr : createdAtStr + "Z") : new Date();
  const createdMs = !isNaN(createdDate.getTime()) ? createdDate.getTime() : Date.now();

  let targetStr = (timeStr || "").trim();

  // If timeStr is missing, "Unknown", or only date without time, try finding "取餐時間", "訂餐時間", or "點餐時間" in orderContent
  if ((!targetStr || targetStr === "Unknown" || !targetStr.match(/\d{1,2}:\d{2}/)) && orderContent) {
    const match = orderContent.match(/(?:取餐時間|訂餐時間|點餐時間)[：:]\s*([^\n\r]+)/);
    if (match && match[1]) {
      targetStr = match[1].trim();
    }
  }

  // 1. Matches "YYYY-MM-DD" + "HH:mm" (even if followed by extra text like "(即時取餐)")
  const dateTimeMatch = targetStr.match(/(\d{4}-\d{2}-\d{2})[T\s]+(\d{1,2}):(\d{2})/);
  if (dateTimeMatch) {
    const yyyyMmDd = dateTimeMatch[1];
    const hh = dateTimeMatch[2].padStart(2, "0");
    const min = dateTimeMatch[3].padStart(2, "0");
    const iso = `${yyyyMmDd}T${hh}:${min}:00+08:00`;
    const d = new Date(iso);
    if (!isNaN(d.getTime())) return d.getTime();
  }

  // 2. Matches only "HH:mm" -> attach the YYYY-MM-DD from created_at in Taiwan UTC+8 timezone
  const timeMatch = targetStr.match(/(\d{1,2}):(\d{2})/);
  if (timeMatch) {
    const twDate = new Date(createdMs + 8 * 3600000);
    const yyyy = twDate.getUTCFullYear();
    const mm = String(twDate.getUTCMonth() + 1).padStart(2, "0");
    const dd = String(twDate.getUTCDate()).padStart(2, "0");
    const hh = String(parseInt(timeMatch[1], 10)).padStart(2, "0");
    const min = String(parseInt(timeMatch[2], 10)).padStart(2, "0");
    const iso = `${yyyy}-${mm}-${dd}T${hh}:${min}:00+08:00`;
    const d = new Date(iso);
    if (!isNaN(d.getTime())) return d.getTime();
  }

  // 3. Fallback: if only date "YYYY-MM-DD" with no time at all, it was placed as ASAP at createdMs
  return createdMs;
}

export async function getOrderQueueAhead(env: Env, tenantId: string, orderKey: string): Promise<{ order: Order | null; queueAhead: number }> {
  if (!env.DB) return { order: null, queueAhead: 0 };
  try {
    const row = await env.DB.prepare(
      "SELECT key, customer_name, pickup_time, status, total_amount, order_content, reason, note, dining_option, table_number, round_count, last_appended_at, created_at, user_id FROM orders WHERE key = ?"
    ).bind(orderKey).first<any>();

    if (!row) return { order: null, queueAhead: 0 };

    const order: Order = {
      key: row.key,
      customer: row.customer_name,
      time: row.pickup_time,
      content: row.order_content,
      status: row.status,
      createdAt: new Date(row.created_at + "Z").getTime(),
      userId: row.user_id || undefined,
      total: row.total_amount,
      reason: row.reason || "",
      note: row.note || "",
      diningOption: (row.dining_option as any) || 'takeaway',
      tableNumber: row.table_number || undefined,
      roundCount: Number(row.round_count) || 1,
      round_count: Number(row.round_count) || 1,
      lastAppendedAt: row.last_appended_at || null,
      last_appended_at: row.last_appended_at || null
    };

    if (order.status === 'DONE' || order.status === 'PICKED_UP' || order.status === 'REJECTED') {
      return { order, queueAhead: 0 };
    }

    const activeRows = await env.DB.prepare(
      `SELECT key, pickup_time, order_content, created_at FROM orders
       WHERE tenant_id = ?
         AND status IN ('NEW', 'ACCEPTED')
         AND created_at >= DATETIME('now', '-24 hours')`
    ).bind(tenantId).all<any>();

    const targetPickupMs = parsePickupTimeToMs(row.pickup_time, row.created_at, row.order_content);
    const targetCreatedMs = new Date(row.created_at + "Z").getTime();

    let queueAhead = 0;
    if (activeRows && activeRows.results) {
      for (const item of activeRows.results) {
        if (item.key === row.key) continue;
        const itemPickupMs = parsePickupTimeToMs(item.pickup_time, item.created_at, item.order_content);
        const itemCreatedMs = new Date(item.created_at + "Z").getTime();

        // Xếp theo thứ tự thời gian nhận hàng (pickup_time):
        // 1. Đơn có giờ nhận hàng sớm hơn được ưu tiên làm trước (xếp lên trước)
        // 2. Nếu cùng giờ nhận hàng, đơn nào đặt trước (created_at trước) thì làm trước
        if (itemPickupMs < targetPickupMs) {
          queueAhead++;
        } else if (itemPickupMs === targetPickupMs && itemCreatedMs < targetCreatedMs) {
          queueAhead++;
        }
      }
    }

    return { order, queueAhead };
  } catch (e: any) {
    console.error("[getOrderQueueAhead] error:", e);
    return { order: null, queueAhead: 0 };
  }
}

export async function getUserLatestActiveOrder(env: Env, tenantId: string, userId: string): Promise<{ order: Order | null; queueAhead: number }> {
  if (!env.DB) return { order: null, queueAhead: 0 };
  try {
    const row = await env.DB.prepare(
      `SELECT key FROM orders 
       WHERE tenant_id = ? AND user_id = ?
         AND status IN ('NEW', 'ACCEPTED', 'WAITING_CUSTOMER_CHANGE', 'WAITING_CUSTOMER_REJECT', 'DONE')
       ORDER BY created_at DESC LIMIT 1`
    ).bind(tenantId, userId).first<any>();

    if (!row) return { order: null, queueAhead: 0 };

    return await getOrderQueueAhead(env, tenantId, row.key);
  } catch (e: any) {
    console.error("[getUserLatestActiveOrder] error:", e);
    return { order: null, queueAhead: 0 };
  }
}


