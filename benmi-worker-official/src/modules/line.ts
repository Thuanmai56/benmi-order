import { Env } from '../types/env';
import { TenantContext } from '../types/tenant';
import { Order } from '../types/index';
import { corsHeaders } from '../utils/http';
import { resolveSecret } from '../utils/secrets';
import { saveOrder, getPendingMap, getOrderQueueAhead, getUserLatestActiveOrder } from './orders';
import { callAI, FewShotExample } from '../integrations/groq';
import { syncToGoogleSheets } from '../integrations/googleSheets';
import { getTenantId, getMenuData, formatMenuForPrompt } from './menu';

async function getLineToken(env: Env, tenantCtx?: TenantContext | null): Promise<string> {
  if (tenantCtx?.lineChannelToken) {
    return tenantCtx.lineChannelToken;
  }
  return await resolveSecret(env.LINE_CHANNEL_TOKEN);
}

export async function pushLineMessage(
  userId: string,
  text: string,
  env: Env,
  tenantCtx?: TenantContext | null
): Promise<void> {
  const token = await getLineToken(env, tenantCtx);
  const brand = tenantCtx?.brandName || "Bot";
  if (!token) { console.error(`[${brand}] pushLineMessage: LINE_CHANNEL_TOKEN missing`); return; }
  if (!userId) { console.error(`[${brand}] pushLineMessage: userId is empty, cannot push`); return; }

  try {
    const res = await fetch("https://api.line.me/v2/bot/message/push", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        to: userId,
        messages: [{ type: "text", text }],
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "(unreadable)");
      console.error(`[${brand}] pushLineMessage FAILED: status=${res.status} userId=${userId} body=${body}`);
    } else {
      console.log(`[${brand}] pushLineMessage OK: userId=${userId}`);
    }
  } catch (e: any) {
    console.error(`[${brand}] pushLineMessage EXCEPTION: userId=${userId} error=${e.message}`);
  }
}

export async function replyText(
  replyToken: string,
  text: string,
  env: Env,
  tenantCtx?: TenantContext | null
): Promise<boolean> {
  const token = await getLineToken(env, tenantCtx);
  const brand = tenantCtx?.brandName || "Bot";
  if (!token || !replyToken) return false;

  try {
    const res = await fetch("https://api.line.me/v2/bot/message/reply", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        replyToken,
        messages: [{ type: "text", text }],
      }),
    });

    if (!res.ok) {
      const errBody = await res.text().catch(() => "(unreadable)");
      console.error(`[${brand}] replyText FAILED: status=${res.status} body=${errBody}`);
      return false;
    }
    return true;
  } catch (e: any) {
    console.error(`[${brand}] replyText EXCEPTION: error=${e.message}`);
    return false;
  }
}

export async function pushLineFlexMessage(
  userId: string,
  altText: string,
  contents: any,
  env: Env,
  tenantCtx?: TenantContext | null
): Promise<boolean> {
  const token = await getLineToken(env, tenantCtx);
  const brand = tenantCtx?.brandName || "Bot";
  if (!token || !userId) return false;

  try {
    const res = await fetch("https://api.line.me/v2/bot/message/push", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        to: userId,
        messages: [{ type: "flex", altText, contents }],
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "(unreadable)");
      console.error(`[${brand}] pushLineFlexMessage FAILED: status=${res.status} userId=${userId} body=${body}`);
      return false;
    }
    return true;
  } catch (e: any) {
    console.error(`[${brand}] pushLineFlexMessage EXCEPTION: userId=${userId} error=${e.message}`);
    return false;
  }
}

export async function replyLineFlexMessage(
  replyToken: string,
  altText: string,
  contents: any,
  env: Env,
  tenantCtx?: TenantContext | null
): Promise<boolean> {
  const token = await getLineToken(env, tenantCtx);
  const brand = tenantCtx?.brandName || "Bot";
  if (!token || !replyToken) return false;

  try {
    const res = await fetch("https://api.line.me/v2/bot/message/reply", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        replyToken,
        messages: [{ type: "flex", altText, contents }],
      }),
    });

    if (!res.ok) {
      const errBody = await res.text().catch(() => "(unreadable)");
      console.error(`[${brand}] replyLineFlexMessage FAILED: status=${res.status} body=${errBody}`);
      return false;
    }
    return true;
  } catch (e: any) {
    console.error(`[${brand}] replyLineFlexMessage EXCEPTION: error=${e.message}`);
    return false;
  }
}

export function buildOrderFlexMessage(order: Order, tenantCtx?: TenantContext | null): any {
  const brandColor = tenantCtx?.brandColor || "#00b900";

  const contentLines = (order.content || "").split("\n").filter(l => l.trim().length > 0);
  const contentComponents = contentLines.slice(0, 50).map(line => ({
    type: "text",
    text: line,
    size: "sm",
    color: line.startsWith("↳") ? "#666666" : "#111111",
    weight: line.includes("x ") ? "bold" : "regular",
    wrap: true
  }));

  return {
    type: "bubble",
    size: "mega",
    header: {
      type: "box",
      layout: "vertical",
      backgroundColor: brandColor,
      paddingAll: "15px",
      contents: [
        {
          type: "box",
          layout: "horizontal",
          contents: [
            { type: "text", text: "🛍️ 訂單明細", weight: "bold", color: "#ffffff", size: "lg", flex: 0 },
            { type: "text", text: `#${order.key}`, color: "#ffffff", size: "sm", align: "end", flex: 1, gravity: "center" }
          ]
        }
      ]
    },
    body: {
      type: "box",
      layout: "vertical",
      paddingAll: "15px",
      spacing: "md",
      contents: [
        {
          type: "box",
          layout: "vertical",
          spacing: "xs",
          contents: [
            { type: "text", text: "📦 訂單內容：", weight: "bold", size: "sm", color: "#333333" },
            ...contentComponents
          ]
        },
        ...(order.note ? [
          { type: "separator", margin: "md" },
          {
            type: "box",
            layout: "horizontal",
            contents: [
              { type: "text", text: "📝 備註：", size: "xs", color: "#888888", flex: 3 },
              { type: "text", text: order.note, size: "xs", color: "#333333", wrap: true, flex: 7 }
            ]
          }
        ] : []),
        { type: "separator", margin: "md" },
        {
          type: "box",
          layout: "horizontal",
          contents: [
            { type: "text", text: "🕒 取餐時間：", size: "sm", color: "#666666", flex: 3 },
            { type: "text", text: String(order.time || "").replace(/\s*\([^)]*\)/g, '').trim(), size: "sm", weight: "bold", color: "#111111", align: "end", flex: 7, wrap: true }
          ]
        },
        {
          type: "box",
          layout: "horizontal",
          contents: [
            { type: "text", text: "💰 總金額：", size: "sm", color: "#666666", flex: 3 },
            { type: "text", text: `$${order.total}`, size: "md", weight: "bold", color: "#e53e3e", align: "end", flex: 7 }
          ]
        }
      ]
    },
    footer: {
      type: "box",
      layout: "vertical",
      paddingAll: "12px",
      contents: [
        {
          type: "button",
          style: "primary",
          color: brandColor,
          height: "sm",
          action: {
            type: "postback",
            label: "🔍 查詢製作進度",
            data: `action=check_progress&order_key=${order.key}`,
            displayText: `🔍 查詢訂單進度 (${order.key})`
          }
        }
      ]
    }
  };
}

export function buildProgressFlexMessage(order: Order, queueAheadCount: number, tenantCtx?: TenantContext | null): any {
  const brandColor = tenantCtx?.brandColor || "#00b900";
  
  let statusTitle = "待店家確認";
  let statusBadgeColor = "#f59e0b";
  let statusIcon = "⏳";
  let queueText = "";

  if (order.status === "NEW") {
    statusTitle = "待店家確認";
    statusBadgeColor = "#f59e0b";
    statusIcon = "⏳";
    queueText = queueAheadCount > 0
      ? `前方還有 ${queueAheadCount} 張訂單正在排隊`
      : "前方已無排隊訂單，即將為您確認！";
  } else if (order.status === "ACCEPTED") {
    statusTitle = "店家製作中";
    statusBadgeColor = "#3b82f6";
    statusIcon = "🍳";
    queueText = queueAheadCount > 0
      ? `前方還有 ${queueAheadCount} 張訂單正在排隊製作`
      : "🔥 前方已無排隊訂單，您的餐點正由店家製作中！";
  } else if (order.status === "DONE") {
    statusTitle = "製作完成，可取餐！";
    statusBadgeColor = "#10b981";
    statusIcon = "🎉";
    queueText = "您的餐點已準備完畢，請儘快前來取餐！";
  } else if (order.status === "PICKED_UP") {
    statusTitle = "已完成取餐";
    statusBadgeColor = "#6b7280";
    statusIcon = "✅";
    queueText = "感謝您的訂購，歡迎下次光臨！";
  } else if (order.status === "WAITING_CUSTOMER_CHANGE" || order.status === "WAITING_CUSTOMER_REJECT") {
    statusTitle = "訂單變更/確認中";
    statusBadgeColor = "#ec4899";
    statusIcon = "⚠️";
    queueText = "請查看 LINE 對話紀錄並回覆店家。";
  } else if (order.status === "REJECTED") {
    statusTitle = "訂單已取消";
    statusBadgeColor = "#ef4444";
    statusIcon = "❌";
    queueText = "該訂單已被取消。";
  }

  return {
    type: "bubble",
    size: "mega",
    header: {
      type: "box",
      layout: "vertical",
      backgroundColor: brandColor,
      paddingAll: "15px",
      contents: [
        {
          type: "box",
          layout: "horizontal",
          contents: [
            { type: "text", text: "📋 訂單進度狀態", weight: "bold", color: "#ffffff", size: "md", flex: 0 },
            { type: "text", text: `#${order.key}`, color: "#ffffff", size: "sm", align: "end", flex: 1, gravity: "center" }
          ]
        }
      ]
    },
    body: {
      type: "box",
      layout: "vertical",
      paddingAll: "16px",
      spacing: "md",
      contents: [
        {
          type: "box",
          layout: "horizontal",
          contents: [
            { type: "text", text: `${statusIcon} ${statusTitle}`, weight: "bold", size: "lg", color: statusBadgeColor, flex: 1, wrap: true }
          ]
        },
        {
          type: "box",
          layout: "vertical",
          backgroundColor: "#f9fafb",
          cornerRadius: "md",
          paddingAll: "10px",
          contents: [
            { type: "text", text: queueText, size: "sm", color: "#374151", wrap: true, weight: "bold" }
          ]
        },
        { type: "separator", margin: "sm" },
        {
          type: "box",
          layout: "horizontal",
          contents: [
            { type: "text", text: "🕒 取餐時間：", size: "sm", color: "#6b7280", flex: 3 },
            { type: "text", text: String(order.time || "").replace(/\s*\([^)]*\)/g, '').trim(), size: "sm", weight: "bold", color: "#111827", align: "end", flex: 7, wrap: true }
          ]
        }
      ]
    },
    footer: {
      type: "box",
      layout: "vertical",
      paddingAll: "12px",
      contents: [
        {
          type: "button",
          style: "secondary",
          height: "sm",
          action: {
            type: "postback",
            label: "🔄 重新整理進度",
            data: `action=check_progress&order_key=${order.key}`,
            displayText: `🔄 重新整理進度 (${order.key})`
          }
        }
      ]
    }
  };
}

export async function replyWithLiffRedirect(
  replyToken: string,
  userId: string,
  env: Env,
  tenantCtx?: TenantContext | null
): Promise<boolean> {
  const token = await getLineToken(env, tenantCtx);
  const brand = tenantCtx?.brandName || "Bot";
  if (!token || !replyToken) return false;

  const liffUrl = tenantCtx?.liffUrl || (await resolveSecret(env.LIFF_URL)) || "https://liff.line.me/";
  const brandColor = tenantCtx?.brandColor || "#00b900";
  const brandTitle = tenantCtx?.brandName || "線上點餐";

  const flexBubble = {
    type: "bubble",
    size: "mega",
    header: {
      type: "box",
      layout: "vertical",
      backgroundColor: brandColor,
      paddingAll: "20px",
      contents: [
        {
          type: "box",
          layout: "horizontal",
          spacing: "md",
          contents: [
            { type: "text", text: "📝", size: "3xl", flex: 0 },
            {
              type: "box",
              layout: "vertical",
              justifyContent: "center",
              contents: [
                { type: "text", text: brandTitle, weight: "bold", size: "xl", color: "#ffffff" },
                { type: "text", text: "Online Order", size: "sm", color: "#ffffff" }
              ]
            }
          ]
        }
      ]
    },
    body: {
      type: "box",
      layout: "vertical",
      paddingAll: "20px",
      spacing: "md",
      contents: [
        {
          type: "text",
          text: "輕鬆選餐、自訂時間",
          weight: "bold",
          size: "lg",
          color: "#111111"
        },
        {
          type: "text",
          text: "透過線上系統挑選餐點，確保每個細節都精準記錄 ✨",
          wrap: true,
          color: "#555555",
          size: "sm"
        },
        { type: "separator", margin: "lg", color: "#eeeeee" },
        {
          type: "box",
          layout: "vertical",
          margin: "md",
          spacing: "sm",
          contents: [
            {
              type: "box",
              layout: "horizontal",
              spacing: "sm",
              contents: [
                { type: "text", text: "•", color: brandColor, flex: 0, weight: "bold" },
                { type: "text", text: "清楚瀏覽完整菜單與即時價格", size: "xs", color: "#666666" }
              ]
            },
            {
              type: "box",
              layout: "horizontal",
              spacing: "sm",
              contents: [
                { type: "text", text: "•", color: brandColor, flex: 0, weight: "bold" },
                { type: "text", text: "自由備註客製化需求與取餐時間", size: "xs", color: "#666666" }
              ]
            },
            {
              type: "box",
              layout: "horizontal",
              spacing: "sm",
              contents: [
                { type: "text", text: "•", color: brandColor, flex: 0, weight: "bold" },
                { type: "text", text: "送出後即時接收訂單進度通知", size: "xs", color: "#666666" }
              ]
            }
          ]
        }
      ]
    },
    footer: {
      type: "box",
      layout: "vertical",
      paddingAll: "15px",
      contents: [
        {
          type: "button",
          style: "primary",
          color: brandColor,
          height: "md",
          action: {
            type: "uri",
            label: "👉 前往線上點餐",
            uri: liffUrl
          }
        }
      ]
    }
  };

  try {
    const res = await fetch("https://api.line.me/v2/bot/message/reply", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        replyToken,
        messages: [{
          type: "flex",
          altText: `歡迎使用 ${brandTitle} 線上點餐！`,
          contents: flexBubble
        }],
      }),
    });

    if (!res.ok) {
      const errBody = await res.text().catch(() => "(unreadable)");
      console.error(`[${brand}] replyWithLiffRedirect FAILED: status=${res.status} body=${errBody}`);
      return false;
    }

    try {
      await env.ORDER_STATE.put(`liff_redirected:${userId}`, "1", { expirationTtl: 300 });
    } catch { }

    return true;
  } catch (e: any) {
    console.error(`[${brand}] replyWithLiffRedirect EXCEPTION: error=${e.message}`);
    return false;
  }
}

export function handleQuickReply(text: string, tenantCtx?: TenantContext | null): string | null {
  const msg = String(text || "").trim();

  // 1. Dynamic Config from TenantContext
  if (tenantCtx) {
    if (msg.includes("營業時間") && tenantCtx.operatingHours) {
      return `我們的營業時間：${tenantCtx.operatingHours}`;
    }
    if ((msg.includes("地址") || msg.includes("在哪")) && tenantCtx.storeAddress) {
      return tenantCtx.storeAddress;
    }
    if (msg.includes("外送嗎") && tenantCtx.deliveryPolicy) {
      return tenantCtx.deliveryPolicy;
    }
  }

  // 2. Fallback to hardcoded keywords if matching Benmi defaults
  if (msg.includes("營業時間")) {
    return tenantCtx?.operatingHours
      ? `我們的營業時間：${tenantCtx.operatingHours}`
      : "我們的營業時間：11:00-21:00（一到五），7:30-21:00（六日）。";
  }
  if (msg.includes("地址") || msg.includes("在哪")) {
    return tenantCtx?.storeAddress || "新北市土城區中央路二段135號";
  }
  if (msg.includes("外送嗎")) {
    return tenantCtx?.deliveryPolicy ||
      "Benmi 最新外送說明如下：\n" +
      "🛵 滿 2,000 元： 不限距離，土城全區皆享免運！\n" +
      "🛵 滿 800 元：\n" +
      "距離店址 2公里內 ➔ 免運 \n" +
      "距離店址 超過2公里 ➔ 酌收 80元 運費。\n" +
      "🛵 未滿 800 元： 也別擔心！歡迎直接點擊 UberEats 平台直接下單，美味一樣送到家 👇 👉 https://cutt.ly/Mt9w2fAD";
  }

  return null;
}

export function normalizeCustomerReply(text: string) {
  const t = String(text || "").trim().toLowerCase();
  const hasAgree =
    t.includes("同意") || t.includes("agree") || t === "ok" || t === "okay" || t === "yes" || t === "好";
  const hasCancel =
    t.includes("取消") || t.includes("cancel") || t.includes("不要了") || t.includes("不用了");
  const hasDifferent =
    t.includes("不同意") || t.includes("disagree") || t === "no" || t === "not" || t.includes("不要");
  return { hasAgree, hasCancel, hasDifferent };
}

export async function handleLineWebhook(
  request: Request,
  env: Env,
  ctx: ExecutionContext,
  tenantCtx?: TenantContext | null
): Promise<Response> {
  const body: any = await request.json().catch(() => ({}));
  const events = Array.isArray(body.events) ? body.events : [];
  const tenantId = tenantCtx?.tenantId || getTenantId(request);
  const brandName = tenantCtx?.brandName || tenantId;

  for (const event of events) {
    if (!event) continue;

    const replyToken = event.replyToken;
    const source = event.source || {};
    const userId = source.userId;
    if (!userId) continue;

    // 0.1) Handle postback events (e.g. Progress Check button tap)
    if (event.type === "postback") {
      const dataStr = event.postback?.data || "";
      if (dataStr.includes("action=check_progress")) {
        let orderKey = "";
        const match = dataStr.match(/order_key=([^&]+)/);
        if (match) {
          orderKey = match[1];
        }

        const res = orderKey ? await getOrderQueueAhead(env, tenantId, orderKey) : await getUserLatestActiveOrder(env, tenantId, userId);
        if (res && res.order) {
          const flex = buildProgressFlexMessage(res.order, res.queueAhead, tenantCtx);
          await replyLineFlexMessage(replyToken, `📋 訂單進度 #${res.order.key}`, flex, env, tenantCtx);
        } else {
          await replyText(replyToken, "找不到您的相關訂單紀錄。", env, tenantCtx);
        }
        continue;
      }
    }

    if (event.type !== "message") continue;
    const message = event.message || {};
    if (message.type !== "text") continue;

    const userText = message.text || "";
    const pendingKey = `pending:${userId}`;
    const draftKey = `draft:${userId}`;

    // 0.2) Handle text progress triggers (e.g. 查詢進度 / 進度 / tiến độ / check progress)
    const lowerText = userText.toLowerCase();
    if (
      (lowerText.includes("進度") || lowerText.includes("tiến độ") || lowerText.includes("check progress")) &&
      !userText.includes("訂單編號：")
    ) {
      let orderKey = "";
      const match = userText.match(/B\d{4}-\d{4}-\d{4}/) || userText.match(/BD\d+-\d+-\d+/);
      if (match) {
        orderKey = match[0];
      }

      const res = orderKey ? await getOrderQueueAhead(env, tenantId, orderKey) : await getUserLatestActiveOrder(env, tenantId, userId);
      if (res && res.order) {
        const flex = buildProgressFlexMessage(res.order, res.queueAhead, tenantCtx);
        await replyLineFlexMessage(replyToken, `📋 訂單進度 #${res.order.key}`, flex, env, tenantCtx);
      } else {
        await replyText(replyToken, "目前查無您的進行中訂單。", env, tenantCtx);
      }
      continue;
    }

    // 0.3) Priority Catch new order from LIFF text message (Bypasses pending states)
    if (userText.includes("訂單編號：") && userText.includes("📦 訂單內容：")) {
      if (userText.includes("[已收到]") || userText.includes("[Đã nhận]")) {
        console.log(`[${brandName}] Webhook received receipt message. Skipping to avoid overwrite.`);
        try {
          await env.DB.prepare("DELETE FROM pending_actions WHERE tenant_id = ? AND user_id = ?")
            .bind(tenantId, userId).run();
        } catch { }
        try { await env.ORDER_STATE.delete(draftKey); } catch { }
        continue;
      }

      const lines = userText.split("\n");
      const keyLine = lines.find((l: string) => l.includes("訂單編號："));
      const timeLine = lines.find((l: string) => l.includes("🕒 取餐時間："));
      const totalLine = lines.find((l: string) => l.includes("💰 總金額："));

      const nowTaiwan = new Date(Date.now() + 8 * 3600000);
      const mm = String(nowTaiwan.getUTCMonth() + 1).padStart(2, "0");
      const dd = String(nowTaiwan.getUTCDate()).padStart(2, "0");
      const hh = String(nowTaiwan.getUTCHours()).padStart(2, "0");
      const min = String(nowTaiwan.getUTCMinutes()).padStart(2, "0");
      const todayKey = mm + dd;
      const timeKey = hh + min;
      const tempRandomId = Math.floor(1000 + Math.random() * 9000);
      const orderKey = keyLine ? keyLine.replace("訂單編號：", "").trim() : `BD${todayKey}-${timeKey}-${tempRandomId}`;
      const timeStr = timeLine ? timeLine.replace("🕒 取餐時間：", "").replace(/\s*\([^)]*\)/g, '').trim() : "Unknown";
      const totalStr = totalLine ? totalLine.replace("💰 總金額：", "").replace("$", "").trim() : "0";

      let noteStr = "";
      const noteStart = userText.indexOf("總備註");
      const totalStartIdx = userText.indexOf("💰 總金額");

      if (noteStart !== -1) {
        let colonIdx = userText.indexOf("：", noteStart);
        if (colonIdx === -1) colonIdx = userText.indexOf(":", noteStart);
        if (colonIdx === -1) colonIdx = noteStart + 3;

        if (totalStartIdx !== -1 && totalStartIdx > colonIdx) {
          noteStr = userText.substring(colonIdx + 1, totalStartIdx).trim();
        } else {
          noteStr = userText.substring(colonIdx + 1).trim();
        }
      }

      let custName = "顧客 (線上)";

      const existingOrder = await env.DB.prepare(
        "SELECT status, customer_name FROM orders WHERE key = ?"
      ).bind(orderKey).first<{ status: string; customer_name: string }>();

      if (existingOrder) {
        if (existingOrder.customer_name && existingOrder.customer_name !== "顧客 (線上)" && existingOrder.customer_name !== "Khách (Web)") {
          custName = existingOrder.customer_name;
        }
        // If order already exists and status has changed from NEW, do not re-create/overwrite status back to NEW
        if (existingOrder.status !== "NEW") {
          console.log(`[${brandName}] Order ${orderKey} already processed with status ${existingOrder.status}. Skipping webhook re-creation.`);
          try {
            await env.DB.prepare("DELETE FROM pending_actions WHERE tenant_id = ? AND user_id = ?")
              .bind(tenantId, userId).run();
          } catch { }
          try { await env.ORDER_STATE.delete(draftKey); } catch { }
          continue;
        }
      }

      const contentStart = userText.indexOf("📦 訂單內容：");
      const contentEnd = userText.indexOf("🕒 取餐時間：");
      let extractedContent = userText;
      if (contentStart > -1 && contentEnd > contentStart) {
        extractedContent = userText.substring(contentStart + 8, contentEnd).replace("📦 訂單內容：", "").trim();
      }

      const orderData: Order = {
        key: orderKey,
        customer: custName,
        time: timeStr,
        content: extractedContent,
        status: "NEW",
        createdAt: Date.now(),
        userId: userId,
        total: parseInt(totalStr, 10) || 0,
        reason: "",
        note: noteStr
      };

      await saveOrder(env, orderData, tenantId);

      // Push Flex message with order details and progress check button to customer
      try {
        const flexBubble = buildOrderFlexMessage(orderData, tenantCtx);
        if (replyToken) {
          await replyLineFlexMessage(replyToken, `🧾 訂單明細 #${orderKey}`, flexBubble, env, tenantCtx);
        } else {
          await pushLineFlexMessage(userId, `🧾 訂單明細 #${orderKey}`, flexBubble, env, tenantCtx);
        }
      } catch (flexErr) {
        console.error(`[${brandName}] Push flex order receipt error:`, flexErr);
      }

      // Fetch real LINE name in background and update customer_name safely in DB
      if (ctx && ctx.waitUntil) {
        ctx.waitUntil((async () => {
          try {
            const token = await getLineToken(env, tenantCtx);
            const profUrl = `https://api.line.me/v2/bot/profile/${userId}`;
            const resp = await fetch(profUrl, { headers: { Authorization: `Bearer ${token}` } });
            if (resp.ok) {
              const p: any = await resp.json();
              if (p && p.displayName) {
                await env.DB.prepare(
                  "UPDATE orders SET customer_name = ? WHERE key = ?"
                ).bind(p.displayName, orderKey).run();
              }
            } else {
              const errBody = await resp.text().catch(() => "(unreadable)");
              console.error(`[${brandName}] Background profile fetch FAILED: status=${resp.status} userId=${userId} body=${errBody}`);
            }
          } catch (e: any) {
            console.error(`[${brandName}] Background profile fetch EXCEPTION:`, e);
          }
        })());
      }

      // Auto-clear any stuck pending state
      try {
        await env.DB.prepare("DELETE FROM pending_actions WHERE tenant_id = ? AND user_id = ?")
          .bind(tenantId, userId).run();
      } catch { }

      continue;
    }

    // 0.5) If stale draft exists, check intent and redirect to LIFF or stay silent
    const draftRaw = await env.ORDER_STATE.get(draftKey);
    if (draftRaw) {
      let draft: any = {};
      try { draft = JSON.parse(draftRaw); } catch { }

      const draftAge = Date.now() - (draft.lastUpdate || 0);
      if (draftAge > 2 * 60 * 60 * 1000) {
        await env.ORDER_STATE.delete(draftKey);
      } else {
        const processDraft = async () => {
          const alreadySent = await env.ORDER_STATE.get(`liff_redirected:${userId}`);
          if (alreadySent) {
            try { await env.ORDER_STATE.delete(draftKey); } catch { }
            return;
          }

          const menuData = await getMenuData(env, tenantId);
          const menuContext = formatMenuForPrompt(menuData);
          const systemPrompt = `你是 ${brandName} 的 AI 訂單意圖判斷系統。\n\n${menuContext}\n\n請嚴格分析顧客訊息是否與在此店家菜單點餐或回答訂單細節相關。`;

          const ctxPrompt = `顧客之前的草稿訂單：「${draft.text || '（空）'}」\n顧客剛剛傳來：「${userText}」\n\n請問顧客這句話是：在【繼續點餐 / 追加餐點 / 回答取餐時間 / 確認訂單】嗎？\n如果是 → 回覆「ORDER」\n如果不是（單純發問、聊天、詢問食材等）→ 回覆「IGNORE」\n請嚴格只回覆 ORDER 或 IGNORE。`;
          const ctxRes = await callAI(ctxPrompt, env, tenantCtx, 8000, systemPrompt);
          const upper = (ctxRes || "").toUpperCase();
          if (upper.includes("ORDER") || !ctxRes) {
            try { await env.ORDER_STATE.delete(draftKey); } catch { }
            await replyWithLiffRedirect(replyToken, userId, env, tenantCtx);
          } else {
            try { await env.ORDER_STATE.delete(draftKey); } catch { }
          }
        };
        if (ctx && ctx.waitUntil) {
          ctx.waitUntil(processDraft());
        } else {
          await processDraft();
        }
        continue;
      }
    }

    // 1) Pending flow priority
    const pMap = await getPendingMap(env, tenantId, userId);
    const pKeys = Object.keys(pMap).sort((a, b) => (pMap[b].createdAt || 0) - (pMap[a].createdAt || 0));

    if (pKeys.length > 0) {
      const orderKey = pKeys[0];
      const pending = pMap[orderKey];
      const questionText = pending?.questionText || "";
      const lowerText = userText.trim().toLowerCase();

      if (orderKey) {
        const orderRow = await env.DB.prepare(
          "SELECT * FROM orders WHERE key = ?"
        ).bind(orderKey).first<any>();
        if (orderRow) {
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
          const pendingType = pending?.type;

          const finishPending = async () => {
            await env.DB.prepare(
              "DELETE FROM pending_actions WHERE tenant_id = ? AND user_id = ? AND order_key = ?"
            ).bind(tenantId, userId, orderKey).run();
          };

          const currentReason = pending?.reason || order.reason || "";
          const currentNote = pending?.note || order.note || "";

          // TÁCH RIÊNG TRƯỜNG HỢP "ĐỔI GIỜ NHẬN HÀNG" KHÔNG DÙNG AI
          if (pendingType === "CHANGE" && currentReason === "時間需調整") {
            const exactMatch = lowerText === "好" || lowerText === "同意" || lowerText === "ok" || lowerText === "可以" || lowerText === "好的";
            const isCancel = lowerText.includes("不要") || lowerText.includes("取消") || lowerText.includes("不用");

            if (isCancel) {
              order.status = "REJECTED";
              await replyText(replyToken, `收到，謝謝您！`, env, tenantCtx);
              const cleanup = async () => { await saveOrder(env, order, tenantId); await finishPending(); await syncToGoogleSheets(order, env, tenantCtx); };
              if (ctx && ctx.waitUntil) ctx.waitUntil(cleanup()); else await cleanup();
            }
            else if (exactMatch) {
              const timeParts = (order.time || "").split(" ");
              const oldDate = timeParts[0] || "";
              const newSuggestedTime = currentNote;

              if (oldDate && oldDate.includes("-")) {
                order.time = `${oldDate} ${newSuggestedTime}`;
              } else {
                order.time = newSuggestedTime;
              }
              order.reason = "";
              order.note = "";
              order.status = "NEW";
              await replyText(replyToken, `收到您的同意！取餐時間已為您更改為 ${newSuggestedTime}`, env, tenantCtx);
              const cleanup = async () => { await saveOrder(env, order, tenantId); await finishPending(); };
              if (ctx && ctx.waitUntil) ctx.waitUntil(cleanup()); else await cleanup();
            }
            else {
              await replyText(replyToken, `請簡單回覆「好 / 同意」以確認，或回覆「不要了 / 取消」取消訂單。`, env, tenantCtx);
            }
            continue;
          }

          // CÁC TRƯỜNG HỢP KHÁC: DÙNG AI ĐỂ XỬ LÝ
          let aiSaysNo = false;
          if (questionText) {
            const menuData = await getMenuData(env, tenantId);
            const menuContext = formatMenuForPrompt(menuData);
            const systemPrompt = `你是 ${brandName} 的 AI 訂單助理。\n\n${menuContext}\n\n請對照店家菜單品項與庫存狀況，分析顧客的回覆內容。`;

            const prompt = `店家剛才詢問顧客：「${questionText}」\n顧客的回覆是：「${userText}」\n\n請問顧客的回覆是否已針對問題做出明確決定（例如：已明確選擇欲更換的口味、同意變更、同意取消等）？\n注意：\n1. 若問題是詢問更換口味，但顧客僅回覆「好/同意」而未說明要換什麼口味，請回覆 NO。\n2. 若顧客是反問問題，請回覆 NO。\n3. 若顧客已明確選擇具體品項或同意取消，請回覆 YES。\n請嚴格只回覆 YES 或 NO。`;
            const changeFewShot: FewShotExample[] = [
              {
                role: "user",
                content: `店家剛才詢問顧客：「不好意思 越南咖啡我們現在賣完了，請問可以幫您換別的嗎？」\n顧客的回覆是：「換雞肉」\n\n請問顧客的回覆是否已針對問題做出明確決定（例如：已明確選擇欲更換的口味、同意變更、同意取消等）？\n注意：\n1. 若問題是詢問更換口味，但顧客僅回覆「好/同意」而未說明要換什麼口味，請回覆 NO。\n2. 若顧客是反問問題，請回覆 NO。\n3. 若顧客已明確選擇具體品項或同意取消，請回覆 YES。\n請嚴格只回覆 YES 或 NO。`
              },
              {
                role: "assistant",
                content: "YES"
              },
              {
                role: "user",
                content: `店家剛才詢問顧客：「不好意思 越南咖啡我們現在賣完了，請問可以幫您換別的嗎？」\n顧客的回覆是：「換雞肉好了」\n\n請問顧客的回覆是否已針對問題做出明確決定（例如：已明確選擇欲更換的口味、同意變更、同意取消等）？\n注意：\n1. 若問題是詢問更換口味，但顧客僅回覆「好/同意」而未說明要換什麼口味，請回覆 NO。\n2. 若顧客是反問問題，請回覆 NO。\n3. 若顧客已明確選擇具體品項或同意取消，請回覆 YES。\n請嚴格只回覆 YES 或 NO。`
              },
              {
                role: "assistant",
                content: "YES"
              },
              {
                role: "user",
                content: `店家剛才詢問顧客：「不好意思 燒肉賣完了，請問可以幫您換別的嗎？」\n顧客的回覆是：「換烤肉麵包」\n\n請問顧客的回覆是否已針對問題做出明確決定（例如：已明確選擇欲更換的口味、同意變更、同意取消等）？\n注意：\n1. 若問題是詢問更換口味，但顧客僅回覆「好/同意」而未說明要換什麼口味，請回覆 NO。\n2. 若顧客是反問問題，請回覆 NO。\n3. 若顧客已明確選擇具體品項或同意取消，請回覆 YES。\n請嚴格只回覆 YES 或 NO。`
              },
              {
                role: "assistant",
                content: "YES"
              },
              {
                role: "user",
                content: `店家剛才詢問顧客：「不好意思 越南咖啡我們現在賣完了，請問可以幫您換別的嗎？」\n顧客的回覆是：「不要換」\n\n請問顧客的回覆是否已針對問題做出明確決定（例如：已明確選擇欲更換的口味、同意變更、同意取消等）？\n注意：\n1. 若問題是詢問更換口味，但顧客僅回覆「好/同意」而未說明要換什麼口味，請回覆 NO。\n2. 若顧客是反問問題，請回覆 NO。\n3. 若顧客已明確選擇具體品項或同意取消，請回覆 YES。\n請嚴格只回覆 YES 或 NO。`
              },
              {
                role: "assistant",
                content: "YES"
              },
              {
                role: "user",
                content: `店家剛才詢問顧客：「不好意思 越南咖啡賣完了，請問想換成拿鐵還是美式？」\n顧客的回覆是：「好」\n\n請問顧客的回覆是否已針對問題做出明確決定（例如：已明確選擇欲更換的口味、同意變更、同意取消等）？\n注意：\n1. 若問題是詢問更換口味，但顧客僅回覆「好/同意」而未說明要換什麼口味，請回覆 NO。\n2. 若顧客是反問問題，請回覆 NO。\n3. 若顧客已明確選擇具體品項或同意取消，請回覆 YES。\n請嚴格只回覆 YES 或 NO。`
              },
              {
                role: "assistant",
                content: "NO"
              }
            ];

            const aiRes = await callAI(prompt, env, tenantCtx, 8000, systemPrompt, changeFewShot);
            if (aiRes) {
              const up = aiRes.toUpperCase();
              if (up.includes("NO") && !up.includes("YES")) {
                aiSaysNo = true;
              }
            }
          }

          if (pendingType === "CHANGE") {
            const isCancel = lowerText.includes("不要了") || lowerText.includes("取消") || lowerText.includes("不用了") || lowerText === "不要";

            if (isCancel) {
              order.status = "REJECTED";
              await replyText(replyToken, `好的，已為您取消訂單 #${orderKey}。`, env, tenantCtx);
              const cleanup = async () => { await saveOrder(env, order, tenantId); await finishPending(); await syncToGoogleSheets(order, env, tenantCtx); };
              if (ctx && ctx.waitUntil) ctx.waitUntil(cleanup()); else await cleanup();
              continue;
            }

            if (aiSaysNo) {
              await replyText(replyToken, `請您明確告訴我們想換什麼品項，或者回覆「取消」直接取消訂單。`, env, tenantCtx);
              continue;
            }

            if (currentReason === "口味售完") {
              order.content = `【顧客換單】：${userText}\n----原本訂單 👇----\n${order.content}`;
              order.reason = "";
              order.note = "";
              order.status = "NEW";
              await replyText(replyToken, `收到您的回覆！我們會依您的需求修改訂單。`, env, tenantCtx);
              const cleanup = async () => { await saveOrder(env, order, tenantId); await finishPending(); };
              if (ctx && ctx.waitUntil) ctx.waitUntil(cleanup()); else await cleanup();
              continue;
            }

            const isAgree = lowerText === "好" || lowerText === "同意" || lowerText === "ok";
            if (isAgree) {
              order.status = "ACCEPTED";
              await replyText(replyToken, `${brandName} 收到您的同意！我們會開始準備您的訂單 #${orderKey}。🥖`, env, tenantCtx);
              const cleanup = async () => { await saveOrder(env, order, tenantId); await finishPending(); };
              if (ctx && ctx.waitUntil) ctx.waitUntil(cleanup()); else await cleanup();
              continue;
            }

            await replyText(replyToken, `請再明確回覆您的決定。`, env, tenantCtx);
            continue;
          }

          if (pendingType === "REJECT") {
            const isAgree = lowerText === "同意" || lowerText === "好" || lowerText === "ok";
            const isDifferent = lowerText.includes("不同意") || lowerText.includes("不要") || lowerText === "取消";

            if (isAgree) {
              order.status = "REJECTED";
              const reason = order.reason || "（未提供原因）";
              await replyText(
                replyToken,
                `非常抱歉！${brandName} 無法接下您的訂單 #${orderKey}。\n原因：${reason}\n感謝您訂購 ${brandName}，歡迎您下次再訂購。`,
                env,
                tenantCtx
              );
              const cleanup = async () => { await saveOrder(env, order, tenantId); await finishPending(); await syncToGoogleSheets(order, env, tenantCtx); };
              if (ctx && ctx.waitUntil) ctx.waitUntil(cleanup()); else await cleanup();
              continue;
            }

            if (isDifferent) {
              order.status = "NEW";
              await replyText(
                replyToken,
                `謝謝您的回覆！我已將訂單 #${orderKey} 回到「等待店家接單」狀態，店家會再為您確認。`,
                env,
                tenantCtx
              );
              const cleanup = async () => { await saveOrder(env, order, tenantId); await finishPending(); };
              if (ctx && ctx.waitUntil) ctx.waitUntil(cleanup()); else await cleanup();
              continue;
            }

            await replyText(replyToken, `請回覆「同意」或「不同意」。`, env, tenantCtx);
            continue;
          }
        }
      }

      try {
        await env.DB.prepare("DELETE FROM pending_actions WHERE tenant_id = ? AND user_id = ?")
          .bind(tenantId, userId).run();
      } catch { }
      await replyText(replyToken, `目前有點狀況，請稍後再確認一次。`, env, tenantCtx);
      continue;
    }

    // 2) Quick reply
    const quick = handleQuickReply(userText, tenantCtx);
    if (quick) {
      await replyText(replyToken, quick, env, tenantCtx);
      continue;
    }

    // 3) AI fallback - Detect ordering intent and redirect to LIFF
    const aiPromise = async () => {
      const alreadySent = await env.ORDER_STATE.get(`liff_redirected:${userId}`);
      if (alreadySent) return;

      const menuData = await getMenuData(env, tenantId);
      const menuContext = formatMenuForPrompt(menuData);
      const systemPrompt = `你是 ${brandName} 的 AI 助理。\n\n${menuContext}\n\n你的任務是評估顧客訊息是否具有向本店家點餐或訂購餐點飲料的意圖。`;

      const intentPrompt = `顧客傳來：「${userText}」\n\n這句話是在向店家「下訂單點餐」嗎（包含提到想要點某個餐點、詢問如何點餐、說要訂餐等）？\n如果是 → 回覆「YES」\n如果不是（單純發問、聊天、抱怨等）→ 回覆「NO」\n請嚴格只回覆 YES 或 NO。`;
      const intentRes = await callAI(intentPrompt, env, tenantCtx, 8000, systemPrompt);
      const resUpper = (intentRes || "").toUpperCase();

      if (resUpper.includes("YES")) {
        await replyWithLiffRedirect(replyToken, userId, env, tenantCtx);
        return;
      }

      if (resUpper.includes("NO")) return;

      await replyWithLiffRedirect(replyToken, userId, env, tenantCtx);
    };
    if (ctx && ctx.waitUntil) {
      ctx.waitUntil(aiPromise());
    } else {
      await aiPromise();
    }
  }

  return new Response("OK", { status: 200, headers: corsHeaders() });
}