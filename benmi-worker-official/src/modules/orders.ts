import { Env } from '../types/env';
import { Order } from '../types/index';
import { corsHeaders, json } from '../utils/http';
import { syncToGoogleSheets } from '../integrations/googleSheets';
import { pushLineMessage, pushLineFlexMessage, buildOrderFlexMessage } from './line';
import { getTenantId } from './menu';

import { TenantContext } from '../types/tenant';

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

  // Taiwan time UTC+8
  const nowTaiwan = new Date(Date.now() + 8 * 3600000);
  const mm = String(nowTaiwan.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(nowTaiwan.getUTCDate()).padStart(2, "0");
  const dateStr = `${mm}${dd}`; // MMDD

  const tempRandomId = Math.floor(1000 + Math.random() * 9000);
  const orderKey = data.orderId || data.key || `B${dateStr}-${tempRandomId}`;

  const order: Order = {
    key: orderKey,
    customer: data.customer || "顧客",
    time: data.time,
    content: data.content,
    status: "NEW",
    createdAt: Date.now(),
    userId: data.userId,
    total: data.total,
    reason: data.reason || "",
    note: data.note || ""
  };

  await saveOrder(env, order, tenantId);

  // Push Flex message with order details and progress check button to customer
  if (order.userId) {
    const sendFlex = async () => {
      try {
        const flex = buildOrderFlexMessage(order, tenantCtx);
        await pushLineFlexMessage(order.userId, `🧾 訂單明細 #${order.key}`, flex, env, tenantCtx);
      } catch (e) {
        console.error(`[createOrder] Push flex error:`, e);
      }
    };
    if (ctx && ctx.waitUntil) {
      ctx.waitUntil(sendFlex());
    } else {
      sendFlex();
    }
  }

  return json({ success: true, key: orderKey });
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
  const tenantId = tenantCtx?.tenantId || getTenantId(request);
  const brandName = tenantCtx?.brandName || "Store";

  const orderRow = await env.DB.prepare(
    "SELECT * FROM orders WHERE key = ?"
  ).bind(data.key).first<any>();
  if (!orderRow) return json({ error: "order not found" }, 404);

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
    note: orderRow.note || ""
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
      await pushLineMessage(order.userId, `${brandName} 已收到您的訂單 #${order.key}，謝謝您！`, env, tenantCtx);
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
      if (order.reason === "時間需調整") {
        const t = order.note || "稍後";
        notifyText = `時間有點趕，請問可以改成${t}嗎？\n\n(回覆「好 / 同意」以確認， or 回覆「不要了」取消訂單)`;
      } else if (order.reason === "口味售完") {
        const items = (order.note || "").split(",");
        let joinedItems = items[0] || "";
        if (items.length === 2) {
          joinedItems = items.join("跟");
        } else if (items.length > 2) {
          joinedItems = items.slice(0, -1).join("、") + "跟" + items[items.length - 1];
        }
        notifyText = `不好意思 ${joinedItems}我們現在賣完了，請問可以幫您換別的嗎？`;
      } else {
        const reason = order.reason || "未提供原因";
        const note = order.note || "";
        notifyText =
          `${brandName} 已收到您的訂單 #${order.key}， need to do small modification.\n` +
          `原因：${reason}\n` +
          (note ? `備註：${note}\n` : "") +
          `\n請回覆「同意」以接受變更， or 回覆「取消 / 不要了」以取消訂單。`;
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
      ).bind(tenantId, order.userId, order.key, "CHANGE", notifyText, order.reason || "", order.note || "").run();

      await pushLineMessage(order.userId, notifyText, env, tenantCtx);
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
      const reason = order.reason || "未提供原因";
      const notifyText =
        `非常抱歉！${brandName} 目前無法接下您的訂單 #${order.key}。\n` +
        `原因：${reason}\n` +
        `\n請回覆「同意」以取消訂單， or 回覆「不同意」以重新確認。`;

      await env.DB.prepare(
        `INSERT INTO pending_actions (tenant_id, user_id, order_key, action_type, question_text, reason, note)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(tenant_id, user_id, order_key) DO UPDATE SET
           action_type = excluded.action_type,
           question_text = excluded.question_text,
           reason = excluded.reason,
           note = excluded.note,
           created_at = CURRENT_TIMESTAMP`
      ).bind(tenantId, order.userId, order.key, "REJECT", notifyText, order.reason || "", order.note || "").run();

      await pushLineMessage(order.userId, notifyText, env, tenantCtx);
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

  // Employee 已取餐
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
    // Các đơn trong hàng đợi hiện tại: đơn có giờ nhận từ quá khứ (đang làm/chưa xong) đến trong vòng 30 phút tới
    const thresholdMs = now + 30 * 60 * 1000;

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

export async function getOrders(request: Request, env: Env): Promise<Response> {
  const tenantId = getTenantId(request);

  if (!env.DB) return jsonWithETag([], "0");

  try {
    // 1. Tính toán ETag version tức thì dựa trên dữ liệu 30 ngày gần nhất trong D1
    const verRow = await env.DB.prepare(
      "SELECT MAX(updated_at) as last_updated, COUNT(*) as cnt FROM orders WHERE tenant_id = ? AND created_at >= DATETIME('now', '-30 days')"
    ).bind(tenantId).first<{ last_updated: string | null; cnt: number }>();

    const lastUpdated = verRow?.last_updated || "0";
    const cnt = verRow?.cnt || 0;
    const currentVersion = `${lastUpdated}_${cnt}`;

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

    // 3. ETag thay đổi -> Truy vấn danh sách đơn hàng 30 ngày gần nhất từ D1 Database (tối đa 1000 đơn)
    const { results } = await env.DB.prepare(
      "SELECT key, customer_name, pickup_time, status, total_amount, order_content, reason, note, created_at FROM orders WHERE tenant_id = ? AND created_at >= DATETIME('now', '-30 days') ORDER BY created_at DESC LIMIT 1000"
    ).bind(tenantId).all<any>();

    const orders: Order[] = (results || []).map(row => ({
      key: row.key,
      customer: row.customer_name,
      time: row.pickup_time,
      content: row.order_content,
      status: row.status,
      createdAt: new Date(row.created_at + "Z").getTime(),
      userId: row.user_id || undefined,
      total: row.total_amount,
      reason: row.reason || "",
      note: row.note || ""
    }));

    return jsonWithETag(orders, currentVersion);
  } catch (e: any) {
    console.error("[getOrders] D1 error:", e);
    return json({ error: "Failed to fetch orders", details: e.message }, 500);
  }
}

export async function saveOrder(env: Env, order: Order, tenantId: string): Promise<void> {
  // Save order to D1
  await env.DB.prepare(
    `INSERT INTO orders (key, tenant_id, user_id, customer_name, pickup_time, status, total_amount, order_content, reason, note, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime(?, 'unixepoch'), datetime('now'))
     ON CONFLICT(key) DO UPDATE SET
       status = CASE
         WHEN orders.status IN ('ACCEPTED', 'DONE', 'REJECTED', 'PICKED_UP') AND excluded.status = 'NEW'
         THEN orders.status
         ELSE excluded.status
       END,
       pickup_time = excluded.pickup_time,
       customer_name = CASE WHEN excluded.customer_name != 'Khách (Web)' THEN excluded.customer_name ELSE orders.customer_name END,
       total_amount = excluded.total_amount,
       order_content = excluded.order_content,
       reason = excluded.reason,
       note = excluded.note,
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

  // If timeStr is missing, "Unknown", or only date without time, try finding "取餐時間" in orderContent
  if ((!targetStr || targetStr === "Unknown" || !targetStr.match(/\d{1,2}:\d{2}/)) && orderContent) {
    const match = orderContent.match(/取餐時間[：:]\s*([^\n\r]+)/);
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
      "SELECT key, customer_name, pickup_time, status, total_amount, order_content, reason, note, created_at, user_id FROM orders WHERE key = ?"
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
      note: row.note || ""
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


