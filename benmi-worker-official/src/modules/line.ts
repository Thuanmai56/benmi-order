import { Env } from '../types/env';
import { TenantContext } from '../types/tenant';
import { Order } from '../types/index';
import { corsHeaders } from '../utils/http';
import { resolveSecret } from '../utils/secrets';
import { saveOrder, getPendingMap } from './orders';
import { callAI } from '../integrations/groq';
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
          margin: "lg",
          spacing: "sm",
          contents: [
            { type: "text", text: "✅ 自由選擇餐點 & 客製化", size: "sm", color: "#333333" },
            { type: "text", text: "✅ 設定取餐日期 & 時間", size: "sm", color: "#333333" },
            { type: "text", text: "✅ 快速 & 準確，不易出錯", size: "sm", color: "#333333" }
          ]
        }
      ]
    },
    footer: {
      type: "box",
      layout: "vertical",
      paddingAll: "20px",
      backgroundColor: "#ffffff",
      contents: [
        {
          type: "box",
          layout: "vertical",
          backgroundColor: brandColor,
          cornerRadius: "xxl",
          paddingAll: "18px",
          action: {
            type: "uri",
            label: "🛒 立即點餐",
            uri: liffUrl
          },
          contents: [
            {
              type: "text",
              text: "🛒 立即點餐",
              color: "#ffffff",
              weight: "bold",
              size: "xl",
              align: "center"
            }
          ]
        },
        {
          type: "text",
          text: "點擊按鈕即可開始選餐",
          size: "xs",
          color: "#888888",
          align: "center",
          margin: "md"
        }
      ]
    }
  };

  try {
    const resp = await fetch("https://api.line.me/v2/bot/message/reply", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        replyToken,
        messages: [
          {
            type: "text",
            text: "您好！為了確保您的訂單準確無誤，請點擊下方連結進入系統預訂 🙏"
          },
          {
            type: "flex",
            altText: "點擊進入線上點餐系統",
            contents: flexBubble
          }
        ]
      }),
    });

    if (resp.status === 200) {
      await env.ORDER_STATE.put(`liff_redirected:${userId}`, "1", { expirationTtl: 1800 });
      return true;
    } else {
      const errBody = await resp.text().catch(() => "(unreadable)");
      console.error(`[${brand}] replyWithLiffRedirect FAILED: status=${resp.status} body=${errBody}`);
      return false;
    }
  } catch (e: any) {
    console.error(`[${brand}] replyWithLiffRedirect EXCEPTION: error=${e.message}`);
    return false;
  }
}

export function handleQuickReply(text: string, tenantCtx?: TenantContext | null): string | null {
  const msg = String(text || "").toLowerCase();

  // 1. Dynamic Quick Replies from TenantContext
  if (tenantCtx?.quickReplies && tenantCtx.quickReplies.length > 0) {
    for (const item of tenantCtx.quickReplies) {
      if (item.triggers.some(trig => msg.includes(trig.toLowerCase()))) {
        return item.reply;
      }
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
    if (!event || event.type !== "message") continue;
    const message = event.message || {};
    if (message.type !== "text") continue;

    const replyToken = event.replyToken;
    const source = event.source || {};
    const userId = source.userId;
    if (!userId) continue;

    const userText = message.text || "";
    const pendingKey = `pending:${userId}`;
    const draftKey = `draft:${userId}`;

    // 0) Priority Catch new order from LIFF text message (Bypasses pending states)
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
      const timeStr = timeLine ? timeLine.replace("🕒 取餐時間：", "").trim() : "Unknown";
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

      let custName = "Khách (Web)";

      const existingOrder = await env.DB.prepare(
        "SELECT status, customer_name FROM orders WHERE key = ?"
      ).bind(orderKey).first<{ status: string; customer_name: string }>();

      if (existingOrder) {
        if (existingOrder.customer_name && existingOrder.customer_name !== "Khách (Web)") {
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
          const systemPrompt = `You are an AI order classification system for ${brandName}.\n\n${menuContext}\n\nStrictly analyze if the customer message is related to ordering items on this store menu or answering order details.`;

          const ctxPrompt = `顧客之前的草稿訂單：「${draft.text || '（空）'}」\n顧客剛剛傳來：「${userText}」\n\n請問顧客這句話是：在【繼續點餐/追加餐點/回答取餐時間/確認訂單】嗎？\n如果是 → 回覆「ORDER」\n如果不是（發問、聊天、詢問食材等）→ 回覆「IGNORE」\n請只回覆 ORDER 或 IGNORE。`;
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
            const systemPrompt = `You are an AI order assistant for ${brandName}.\n\n${menuContext}\n\nAnalyze customer answers against the store menu items and availability.`;

            const prompt = `店家剛才詢問顧客：「${questionText}」\n顧客的回覆是：「${userText}」\n請問顧客的回覆是否針對問題做出了決定（如已明確選擇換的口味、同意、拒絕等）？\n注意：如果問題 is about flavor, but customer replied yes without specifying flavor, return NO.\nNếu khách hàng hỏi ngược, return NO. Nếu khách hàng chọn cụ thể hoặc đồng ý hủy, return YES. STRICTLY return YES or NO.`;
            const aiRes = await callAI(prompt, env, tenantCtx, 8000, systemPrompt);
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
              order.content = `【顧客換單】：${userText}\n----原本訂單/Đơn cũ 👇----\n${order.content}`;
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
      const systemPrompt = `You are an AI assistant for ${brandName}.\n\n${menuContext}\n\nYour goal is to evaluate if a customer's message indicates an intent to order food/drinks from this store menu.`;

      const intentPrompt = `顧客傳來：「${userText}」\n這句話是在向店家「下訂單點餐」嗎（包含提到想要某個餐點、詢問如何點餐、說要訂餐等）？\n如果是 → 回覆「YES」\n如果不是（單純發問、聊天、抱怨等）→ 回覆「NO」\n請只回覆 YES 或 NO。`;
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