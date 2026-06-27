let memoryCacheOrders = null;
let memoryCacheTime = 0;

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders() });
    }

    if (request.method === "POST" && (path === "/webhook" || path === "/")) return handleLineWebhook(request, env, ctx);
    if (request.method === "POST" && path === "/api/create") return createOrder(request, env);
    if (request.method === "POST" && path === "/api/update") return updateOrder(request, env, ctx);
    if (request.method === "GET" && path === "/api/orders") return getOrders(env);
    if (request.method === "GET" && path === "/api/config") return getConfig(env);
    if (request.method === "POST" && path === "/api/config") return updateConfig(request, env);
    if (request.method === "GET" && path === "/api/menu") return getMenu(env);
    if (request.method === "POST" && path === "/api/menu") return updateMenu(request, env);
    if (request.method === "GET" && path === "/api/image_list") return getImageList(env);
    if (request.method === "GET" && path === "/api/image") return getImage(request, env);
    if (request.method === "POST" && path === "/api/image") return updateImage(request, env);
    if (request.method === "DELETE" && path === "/api/image") return deleteImage(request, env);
    if ((request.method === "POST" || request.method === "GET") && path === "/api/auth") return handleAuth(request, env, url);
    if (request.method === "POST" && path === "/api/auth/change") return handleAuthChange(request, env);
    if (request.method === "POST" && path === "/api/auth/templink") return handleCreateTempLink(request, env);
    if (request.method === "GET" && path === "/api/auth/templink") return handleVerifyTempLink(request, env);
    if (request.method === "GET" && path === "/api/debug") return debugKV(env, url);

    return new Response("Not Found", { status: 404, headers: corsHeaders() });
  }
};

// ================= CONFIG =================
async function getConfig(env) {
  let stored = {};
  try {
    const raw = await env.ORDER_STATE.get("store_config");
    if (raw) stored = JSON.parse(raw);
  } catch (e) { }

  return json({
    liffId: env.LIFF_ID || null,
    operatingHours: stored.operatingHours || null
  });
}

async function updateConfig(request, env) {
  try {
    const payload = await request.json();
    let stored = {};
    const raw = await env.ORDER_STATE.get("store_config");
    if (raw) stored = JSON.parse(raw);

    if (payload.operatingHours) stored.operatingHours = payload.operatingHours;

    await env.ORDER_STATE.put("store_config", JSON.stringify(stored));
    return json({ success: true });
  } catch (e) {
    return json({ error: e.message }, 500);
  }
}

const ORDER_INDEX_LATEST = "order_index:latest"; // no KV.list
const MAX_INDEX = 200;

async function syncToGoogleSheets(order, env) {
  const sheetUrl = env.GOOGLE_SHEETS_URL || "https://script.google.com/macros/s/AKfycbw2zpueE7DmkcrHU0fMgfHWhWhhMsEFprJJEo4-kfirRrcDY7NZNeRMduy_aAf-AX0few/exec";
  try {
    await fetch(sheetUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        key: order.key,
        customer: order.customer || order.userName || order.userId || "Unknown",
        status: order.status,
        content: order.content,
        total: order.total,
        time: order.time,
        reason: order.reason || "",
        note: order.note || ""
      })
    });
  } catch (e) {
    console.error("Failed to sync to Google Sheets:", e);
  }
}

// ================= API =================
function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,DELETE,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type,Authorization",
  };
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders(), "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate" },
  });
}

async function createOrder(request, env) {
  const data = await request.json();

  // Taiwan time UTC+8
  const nowTaiwan = new Date(Date.now() + 8 * 3600000);
  const mm = String(nowTaiwan.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(nowTaiwan.getUTCDate()).padStart(2, "0");
  const dateStr = `${mm}${dd}`; // MMDD

  // Keep your old key style (so you don't introduce more mismatches)
  const tempRandomId = Math.floor(1000 + Math.random() * 9000);
  const orderKey = data.orderId || data.key || `B${dateStr}-${tempRandomId}`;

  const order = {
    key: orderKey,
    customer: data.customer || "顧客",
    time: data.time,
    content: data.content,
    status: "NEW",
    createdAt: Date.now(),
    userId: data.userId,
    total: data.total,
    // employee fields (optional)
    reason: data.reason || "",
    note: data.note || ""
  };

  await saveOrder(env, order);

  if (data.liffFallback && data.userId) {
    let notifyText = `請稍等，店員會馬上確認\n` +
      `訂單編號：${orderKey}\n` +
      `📦 訂單內容：\n\n` +
      `${order.content}\n\n` +
      `🕒 取餐時間：${order.time}`;

    if (order.note) notifyText += `\n📝 總備註：${order.note}`;
    notifyText += `\n💰 總金額：$${order.total}`;

    await pushLineMessage(data.userId, notifyText, env);
  }

  return json({ success: true, key: orderKey });
}

// Logic help for pending states: Stores as object { [orderKey]: question } to avoid overwriting
async function getPendingMap(env, userId) {
  const raw = await env.ORDER_STATE.get(`pending:${userId}`);
  if (!raw) return {};
  try {
    const data = JSON.parse(raw);
    // Compatibility: If it's an old style single object, convert it
    if (data.orderKey && !data[data.orderKey]) {
      return { [data.orderKey]: data };
    }
    return data;
  } catch { return {}; }
}

async function updateOrder(request, env, ctx) {
  const data = await request.json();
  const raw = await env.ORDER_STATE.get(`order:${data.key}`);
  if (!raw) return json({ error: "order not found" }, 404);

  const order = JSON.parse(raw);
  const incoming = data.status;

  if (data.reason) order.reason = data.reason;
  if (data.note) order.note = data.note;

  // Employee 接單
  if (incoming === "ACCEPTED") {
    if (order.status === "ACCEPTED" || order.status === "DONE" || order.status === "PICKED_UP") {
      await saveOrder(env, order); // Sync cache
      return json({ success: true });
    }
    const wasWaiting = order.status && order.status.startsWith("WAITING");
    order.status = "ACCEPTED";
    await saveOrder(env, order);

    if (order.userId) {
      try {
        const pMap = await getPendingMap(env, order.userId);
        if (pMap[order.key]) {
          delete pMap[order.key];
          await env.ORDER_STATE.put(`pending:${order.userId}`, JSON.stringify(pMap));
        }
      } catch { }
      if (!wasWaiting) {
        await pushLineMessage(order.userId, `Benmi 已收到您的訂單 #${order.key}，謝謝您！`, env);
      }
    }
    return json({ success: true });
  }

  // Employee 準備好了 (Chỉ lưu trạng thái DONE, KHÔNG báo thông báo cho khách)
  if (incoming === "DONE") {
    if (order.status === "DONE" || order.status === "PICKED_UP") {
      await saveOrder(env, order); // Sync cache
      return json({ success: true });
    }
    order.status = "DONE";
    await saveOrder(env, order);

    return json({ success: true });
  }

  // Employee 需要更改 -> 等客戶「同意/取消」
  if (incoming === "CHANGED") {
    order.status = "WAITING_CUSTOMER_CHANGE";
    await saveOrder(env, order);

    if (order.userId) {
      let notifyText = "";
      if (order.reason === "時間需調整") {
        const t = order.note || "稍後";
        notifyText = `時間有點趕，請問可以改成${t}嗎？\n\n(回覆「好 / 同意」以確認，或回覆「不要了」取消訂單)`;
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
          `Benmi 已收到您的訂單 #${order.key}，需要做小幅調整。\n` +
          `原因：${reason}\n` +
          (note ? `備註：${note}\n` : "") +
          `\n請回覆「同意」以接受變更，或回覆「取消 / 不要了」以取消訂單。`;
      }

      const pMap = await getPendingMap(env, order.userId);
      pMap[order.key] = { orderKey: order.key, type: "CHANGE", createdAt: Date.now(), questionText: notifyText, reason: order.reason, note: order.note };
      await env.ORDER_STATE.put(`pending:${order.userId}`, JSON.stringify(pMap));

      await pushLineMessage(order.userId, notifyText, env);
    }

    return json({ success: true });
  }

  // Employee 無法接單 -> 等客戶「同意/不同意」
  if (incoming === "REJECTED") {
    if (order.reason === "取消並不回復客戶") {
      order.status = "REJECTED";
      await saveOrder(env, order);
      if (ctx && ctx.waitUntil) ctx.waitUntil(syncToGoogleSheets(order, env));
      return json({ success: true });
    }

    order.status = "WAITING_CUSTOMER_REJECT";
    await saveOrder(env, order);

    if (order.userId) {
      const reason = order.reason || "未提供原因";
      const notifyText =
        `非常抱歉！Benmi 目前無法接下您的訂單 #${order.key}。\n` +
        `原因：${reason}\n` +
        `\n請回覆「同意」以取消訂單，或回覆「不同意」以重新確認。`;

      const pMap = await getPendingMap(env, order.userId);
      pMap[order.key] = { orderKey: order.key, type: "REJECT", createdAt: Date.now(), questionText: notifyText, reason: order.reason, note: order.note };
      await env.ORDER_STATE.put(`pending:${order.userId}`, JSON.stringify(pMap));

      await pushLineMessage(order.userId, notifyText, env);
    }

    return json({ success: true });
  }

  // Employee 強制取消 (Quá lâu khách không rep -> Nhấn Hủy trực tiếp)
  if (incoming === "FORCE_REJECT") {
    order.status = "REJECTED";
    await saveOrder(env, order);

    if (order.userId) {
      try {
        const pMap = await getPendingMap(env, order.userId);
        if (pMap[order.key]) {
          delete pMap[order.key];
          await env.ORDER_STATE.put(`pending:${order.userId}`, JSON.stringify(pMap));
        }
      } catch { }
      await pushLineMessage(order.userId, `Benmi：由於未收到您的回覆，訂單 #${order.key} 已自動取消。期待下次為您服務！`, env);
    }

    if (ctx && ctx.waitUntil) ctx.waitUntil(syncToGoogleSheets(order, env));
    return json({ success: true });
  }

  // Employee 已取餐 (Không gửi thêm thông báo để tiết kiệm LINE API quota)
  if (incoming === "PICKED_UP") {
    if (order.status === "PICKED_UP") {
      await saveOrder(env, order); // Sync cache
      return json({ success: true });
    }
    order.status = "PICKED_UP";
    await saveOrder(env, order);

    if (ctx && ctx.waitUntil) ctx.waitUntil(syncToGoogleSheets(order, env));
    return json({ success: true });
  }

  // Các trạng thái kết thúc khác
  order.status = incoming;
  await saveOrder(env, order);

  return json({ success: true });
}

async function getOrders(env) {
  const now = Date.now();
  // Giảm 70-80% số lượt gọi KV get() bằng cách dùng Memory Cache trong 2 giây cho mỗi Isolate
  if (memoryCacheOrders && (now - memoryCacheTime < 2000)) {
    return json(memoryCacheOrders);
  }

  let orders = [];
  try {
    const cacheRaw = await env.ORDER_STATE.get("order_view:cache");
    if (cacheRaw) orders = JSON.parse(cacheRaw);

    const indexRaw = await env.ORDER_STATE.get(ORDER_INDEX_LATEST);
    let keys = [];
    if (indexRaw) keys = JSON.parse(indexRaw);
    if (!Array.isArray(keys)) keys = [];

    // Chỉ quan tâm các đơn gần đây
    const maxRebuild = 30;
    const latestKeys = keys.slice(0, maxRebuild);
    const missingKeys = latestKeys.filter(k => !orders.find(o => o.key === k));

    if (missingKeys.length > 0) {
      const promises = missingKeys.map(k =>
        env.ORDER_STATE.get(`order:${k}`)
          .then(raw => {
            if (raw) {
              try { return JSON.parse(raw); } catch (err) { return "FAILED"; }
            }
            // Nếu khóa thực sự không tồn tại trong KV (trả về null), trả về placeholder để cache lại, tránh loop GET vô hạn
            return { key: k, status: "NOT_FOUND", createdAt: 0 };
          })
          .catch(err => {
            console.error(`Error fetching missing key ${k}:`, err);
            return "FAILED";
          })
      );

      const results = await Promise.all(promises);

      // Nếu có bất kỳ request nào bị FAILED (do vượt limit hoặc mạng lỗi), tuyệt đối KHÔNG ghi đè cache
      const hasFailed = results.includes("FAILED");
      const rebuiltOrders = results.filter(r => r && r !== "FAILED");

      if (rebuiltOrders.length > 0) {
        const rebuiltKeys = rebuiltOrders.map(o => o.key);
        const oldOrders = orders.filter(o => !rebuiltKeys.includes(o.key));
        orders = [...rebuiltOrders, ...oldOrders].slice(0, MAX_INDEX);
        orders.sort((a, b) => (b?.createdAt || 0) - (a?.createdAt || 0));

        if (!hasFailed) {
          // Chỉ ghi lại cache nếu KHÔNG có lỗi FAILED nào để tránh xóa nhầm đơn hàng mới
          await env.ORDER_STATE.put("order_view:cache", JSON.stringify(orders));
        }
      }
    }
  } catch (e) {
    // Nếu KV get limit bị vượt quá, nó sẽ văng lỗi. Ta trả về memory cache cũ nhất có thể thay vì báo lỗi 500
    console.error("KV get() limit error:", e);
    if (memoryCacheOrders) return json(memoryCacheOrders);
    return json([]);
  }

  memoryCacheOrders = orders;
  memoryCacheTime = now;
  return json(orders);
}

// ================= MENU & AUTH =================
const DEFAULT_MENU = {
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

async function getMenu(env) {
  try {
    const raw = await env.ORDER_STATE.get("menu:latest");
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") return json(parsed);
    }
  } catch (e) { }
  return json(DEFAULT_MENU);
}

async function updateMenu(request, env) {
  try {
    const data = await request.json();
    await env.ORDER_STATE.put("menu:latest", JSON.stringify(data));
    return json({ success: true });
  } catch (e) {
    return json({ error: "Invalid data" }, 400);
  }
}

async function getImageList(env) {
  try {
    const raw = await env.ORDER_STATE.get("image_list");
    if (raw) return json(JSON.parse(raw));
  } catch (e) { }
  return json([]);
}

async function getImage(request, env) {
  try {
    const url = new URL(request.url);
    const name = url.searchParams.get("name");
    if (!name) return new Response("Missing name", { status: 400, headers: corsHeaders() });

    const dataUri = await env.ORDER_STATE.get(`image:${name}`);
    if (!dataUri) return new Response("Not found", { status: 404, headers: corsHeaders() });

    const match = dataUri.match(/^data:(.*?);base64,(.*)$/);
    if (!match) return new Response("Invalid format", { status: 500, headers: corsHeaders() });

    const mime = match[1];
    const base64 = match[2];
    const binaryStr = atob(base64);
    const binary = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) {
      binary[i] = binaryStr.charCodeAt(i);
    }

    return new Response(binary, {
      headers: {
        ...corsHeaders(),
        "Content-Type": mime,
        "Cache-Control": "public, max-age=86400"
      }
    });
  } catch (e) {
    return new Response("Server error", { status: 500, headers: corsHeaders() });
  }
}

async function updateImage(request, env) {
  try {
    const { name, dataUri } = await request.json();
    if (!name || !dataUri) return json({ error: "Missing name or dataUri" }, 400);

    // Limit size check (~5MB base64)
    if (dataUri.length > 5 * 1024 * 1024) {
      return json({ error: "Image too large" }, 400);
    }

    await env.ORDER_STATE.put(`image:${name}`, dataUri);

    let list = [];
    const listRaw = await env.ORDER_STATE.get("image_list");
    if (listRaw) {
      try { list = JSON.parse(listRaw); } catch (e) { }
    }
    if (!list.includes(name)) {
      list.push(name);
      await env.ORDER_STATE.put("image_list", JSON.stringify(list));
    }

    return json({ success: true });
  } catch (e) {
    return json({ error: "Invalid data" }, 400);
  }
}

async function deleteImage(request, env) {
  try {
    const { name } = await request.json();
    if (!name) return json({ error: "Missing name" }, 400);

    await env.ORDER_STATE.delete(`image:${name}`);

    let list = [];
    const listRaw = await env.ORDER_STATE.get("image_list");
    if (listRaw) {
      try { list = JSON.parse(listRaw); } catch (e) { }
    }
    list = list.filter(n => n !== name);
    await env.ORDER_STATE.put("image_list", JSON.stringify(list));

    return json({ success: true });
  } catch (e) {
    return json({ error: "Server error" }, 500);
  }
}

const DEFAULT_PASSWORD = "12345678";

async function handleAuth(request, env, url) {
  let password = null;
  if (request.method === "GET") {
    password = (url || new URL(request.url)).searchParams.get("pw");
  } else {
    const body = await request.json().catch(() => ({}));
    password = body.password;
  }
  if (!password) return json({ ok: false, error: "No password" });
  const stored = await env.ORDER_STATE.get("dashboard:password") || DEFAULT_PASSWORD;
  return json({ ok: password === stored });
}

async function handleAuthChange(request, env) {
  const { current, newPassword } = await request.json().catch(() => ({}));
  if (!current || !newPassword) return json({ ok: false, error: "Missing fields" });
  const stored = await env.ORDER_STATE.get("dashboard:password") || DEFAULT_PASSWORD;
  if (current !== stored) return json({ ok: false, error: "Wrong current password" });
  if (newPassword.length < 4) return json({ ok: false, error: "Password too short" });
  await env.ORDER_STATE.put("dashboard:password", newPassword);
  return json({ ok: true });
}

async function handleCreateTempLink(request, env) {
  const { password, hours = 24 } = await request.json().catch(() => ({}));
  const stored = await env.ORDER_STATE.get("dashboard:password") || DEFAULT_PASSWORD;
  if (password !== stored) return json({ ok: false, error: "Wrong password" });
  const ttl = Math.min(Math.max(parseInt(hours) || 24, 1), 168);
  const token = Array.from(crypto.getRandomValues(new Uint8Array(12)))
    .map(b => b.toString(16).padStart(2, "0")).join("");
  await env.ORDER_STATE.put(`templink:${token}`, "1", { expirationTtl: ttl * 3600 });
  return json({ ok: true, token, hours: ttl });
}

async function handleVerifyTempLink(request, env) {
  const url = new URL(request.url);
  const token = url.searchParams.get("t");
  if (!token) return json({ ok: false });
  const val = await env.ORDER_STATE.get(`templink:${token}`);
  return json({ ok: val === "1" });
}

// ================= DATA LOGIC =================
async function saveOrder(env, order) {
  try {
    // 1. Gửi đồng thời các yêu cầu đọc và ghi độc lập (Parallel Read & Write)
    const [indexRaw, cacheRaw] = await Promise.all([
      env.ORDER_STATE.get(ORDER_INDEX_LATEST),
      env.ORDER_STATE.get("order_view:cache"),
      env.ORDER_STATE.put(`order:${order.key}`, JSON.stringify(order)),
      order.userId
        ? (order.status === "PICKED_UP" || order.status === "REJECTED"
          ? env.ORDER_STATE.delete(`active_order:${order.userId}`)
          : env.ORDER_STATE.put(`active_order:${order.userId}`, order.key))
        : Promise.resolve()
    ]);

    // 2. Cập nhật chỉ mục (Index) trong bộ nhớ
    let keys = [];
    try { keys = indexRaw ? JSON.parse(indexRaw) : []; } catch { keys = []; }
    if (!Array.isArray(keys)) keys = [];
    let keysChanged = false;
    if (!keys.includes(order.key)) {
      keys.unshift(order.key);
      keys = keys.filter(Boolean).slice(0, MAX_INDEX);
      keysChanged = true;
    }

    // 3. Cập nhật cache hiển thị (Cache latest View Data)
    let orders = [];
    try { orders = cacheRaw ? JSON.parse(cacheRaw) : []; } catch { orders = []; }

    if (!cacheRaw || orders.length === 0) {
      // Chỉ lấy tối đa 30 đơn hàng gần nhất để rebuild cache, tránh vượt quá giới hạn 50 subrequests của Cloudflare Free Tier
      const maxRebuild = 30;
      const keysToFetch = keys.slice(0, maxRebuild);

      const promises = keysToFetch.map(k => {
        if (k === order.key) return Promise.resolve(order); // Tiết kiệm 1 lần đọc KV
        return env.ORDER_STATE.get(`order:${k}`).then(raw => {
          if (raw) { try { return JSON.parse(raw); } catch { } }
          return null;
        });
      });
      const results = await Promise.all(promises);
      orders = results.filter(Boolean);
      orders.sort((a, b) => (b?.createdAt || 0) - (a?.createdAt || 0));

      const updates = [
        env.ORDER_STATE.put("order_view:cache", JSON.stringify(orders))
      ];
      if (keysChanged) {
        updates.push(env.ORDER_STATE.put(ORDER_INDEX_LATEST, JSON.stringify(keys)));
      }
      await Promise.all(updates);

      // Cập nhật memory cache của isolate để getOrders lấy được ngay đơn mới
      memoryCacheOrders = orders;
      memoryCacheTime = Date.now();
      return;
    }

    const idx = orders.findIndex(o => o.key === order.key);
    if (idx >= 0) {
      orders[idx] = order;
    } else {
      orders.unshift(order);
    }

    orders = orders.filter(Boolean).slice(0, MAX_INDEX);
    orders.sort((a, b) => (b?.createdAt || 0) - (a?.createdAt || 0));

    const finalUpdates = [
      env.ORDER_STATE.put("order_view:cache", JSON.stringify(orders))
    ];
    if (keysChanged) {
      finalUpdates.push(env.ORDER_STATE.put(ORDER_INDEX_LATEST, JSON.stringify(keys)));
    }
    await Promise.all(finalUpdates);

    // Cập nhật memory cache của isolate để getOrders lấy được ngay đơn mới
    memoryCacheOrders = orders;
    memoryCacheTime = Date.now();
  } catch (err) {
    console.error("Error in saveOrder:", err);
    try {
      await env.ORDER_STATE.put("last_save_error", JSON.stringify({
        message: err.message,
        stack: err.stack,
        time: new Date(Date.now() + 8 * 3600000).toISOString(),
        orderKey: order.key
      }));
    } catch (e) { }
    throw err;
  }
}

// ================= LINE PUSH/REPLY =================
async function pushLineMessage(userId, text, env) {
  const token = env.LINE_CHANNEL_TOKEN;
  if (!token) { console.error("[Benmi] pushLineMessage: LINE_CHANNEL_TOKEN missing"); return; }
  if (!userId) { console.error("[Benmi] pushLineMessage: userId is empty, cannot push"); return; }

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
      console.error(`[Benmi] pushLineMessage FAILED: status=${res.status} userId=${userId} body=${body}`);
    } else {
      console.log(`[Benmi] pushLineMessage OK: userId=${userId}`);
    }
  } catch (e) {
    console.error(`[Benmi] pushLineMessage EXCEPTION: userId=${userId} error=${e.message}`);
  }
}

async function replyText(replyToken, text, env) {
  const token = env.LINE_CHANNEL_TOKEN;
  if (!token || !replyToken) return;

  await fetch("https://api.line.me/v2/bot/message/reply", {
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
}

// ================= LINE FLEX REDIRECT =================
async function replyWithLiffRedirect(replyToken, userId, env) {
  const token = env.LINE_CHANNEL_TOKEN;
  if (!token || !replyToken) return;

  const liffUrl = env.LIFF_URL || "https://liff.line.me/";

  const flexBubble = {
    type: "bubble",
    size: "mega",
    header: {
      type: "box",
      layout: "vertical",
      backgroundColor: "#00b900",
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
                { type: "text", text: "線上點餐", weight: "bold", size: "xl", color: "#ffffff" },
                { type: "text", text: "Online Order", size: "sm", color: "#d4f5d4" }
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
          backgroundColor: "#06C755",
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

  // Double check and Optimistic lock để tránh race condition khi khách nhắn nhiều câu liên tiếp
  const alreadySent = await env.ORDER_STATE.get(`liff_redirected:${userId}`);
  if (alreadySent) return;
  await env.ORDER_STATE.put(`liff_redirected:${userId}`, "1", { expirationTtl: 3600 }); // Đổi thành 60 phút theo yêu cầu

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
}

// ================= AI =================
async function callAI(prompt, env) {
  try {
    if (!env.OPENROUTER_API_KEY) {
      return null;
    }

    const resp = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: env.OPENROUTER_MODEL || "openrouter/auto",
        messages: [
          {
            role: "user",
            content: `請用繁體中文（台灣用語）回覆，語氣禮貌、簡短清楚。\n${prompt}`
          }
        ]
      })
    });

    const result = await resp.json();
    if (result.error) {
      return null;
    }

    return result?.choices?.[0]?.message?.content || null;
  } catch (e) {
    return null;
  }
}

// ================= Quick Reply =================
async function getOperatingHoursText(env) {
  try {
    const raw = await env.ORDER_STATE.get("store_config");
    if (raw) {
      const config = JSON.parse(raw);
      if (config && config.operatingHours) {
        const hrs = config.operatingHours;
        const days = ["週日", "週一", "週二", "週三", "週四", "週五", "週六"];
        let lines = [];
        for (let i = 0; i < 7; i++) {
          const shifts = hrs[i] || [];
          if (shifts.length === 0) {
            lines.push(`${days[i]}：公休`);
          } else {
            const shiftStr = shifts.map(s => `${s.start}-${s.end}`).join(", ");
            lines.push(`${days[i]}：${shiftStr}`);
          }
        }
        return "我們的營業時間：\n" + lines.join("\n");
      }
    }
  } catch (e) { }
  return "我們的營業時間：週一到週五 11:00-21:00，週六週日 09:00-21:00。";
}

async function handleQuickReply(text, env) {
  const msg = String(text || "").toLowerCase();
  if (msg.includes("營業時間"))
    return await getOperatingHoursText(env);
  if (msg.includes("地址") || msg.includes("在哪"))
    return "新北市土城區中央路二段135號";
  if (msg.includes("外送嗎"))
    return `感謝您聯絡本米！外送說明如下：
🛵 滿 2000 元：不限距離，土城全區免運。
🛵 滿 800 元：
 - 距離店址 2公里內 ➔ 免運。
 - 距離店址 超過2公里 ➔ 酌收 80元 運費。
🛵 未滿 800 元：請直接點 UberEats 平台下單。
👉 https://cutt.ly/Mt9w2fAD`;
  return null;
}

// ================= WEBHOOK =================
function normalizeCustomerReply(text) {
  const t = String(text || "").trim().toLowerCase();
  const hasAgree =
    t.includes("同意") || t.includes("agree") || t === "ok" || t === "okay" || t === "yes" || t === "好";
  const hasCancel =
    t.includes("取消") || t.includes("cancel") || t.includes("不要了") || t.includes("不用了");
  const hasDifferent =
    t.includes("不同意") || t.includes("disagree") || t === "no" || t === "not" || t.includes("不要");
  return { hasAgree, hasCancel, hasDifferent };
}

async function handleLineWebhook(request, env, ctx) {
  const body = await request.json().catch(() => ({}));
  if (ctx && ctx.waitUntil) {
    ctx.waitUntil(processEvents(body, env, ctx));
  } else {
    // Fallback for environment without waitUntil
    await processEvents(body, env, ctx);
  }
  return new Response("OK", { status: 200, headers: corsHeaders() });
}

async function processEvents(body, env, ctx) {
  const events = Array.isArray(body.events) ? body.events : [];

  for (const event of events) {
    if (!event || event.type !== "message") continue;
    // Nếu cửa hàng bật Manual Chat (Chat thủ công), webhook sẽ nhận event.mode = "standby". 
    // Ta phải bỏ qua để bot không chen ngang nhân viên.
    if (event.mode === "standby") continue;
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
    if (userText.includes("訂單編號") && userText.includes("訂單內容")) {
      const nowTaiwan = new Date(Date.now() + 8 * 3600000);
      const mm = String(nowTaiwan.getUTCMonth() + 1).padStart(2, "0");
      const dd = String(nowTaiwan.getUTCDate()).padStart(2, "0");
      const hh = String(nowTaiwan.getUTCHours()).padStart(2, "0");
      const min = String(nowTaiwan.getUTCMinutes()).padStart(2, "0");
      const todayKey = mm + dd;
      const timeKey = hh + min;
      const tempRandomId = Math.floor(1000 + Math.random() * 9000);

      // Trích xuất Order Key
      const keyMatch = userText.match(/訂單編號[：:\s]*([A-Za-z0-9-]+)/);
      const orderKey = keyMatch ? keyMatch[1].trim() : `BD${todayKey}-${timeKey}-${tempRandomId}`;

      // Check if order already exists to avoid redundant save & race conditions
      // Chờ 1.5 giây để api/create kịp ghi vào Edge Cache, tránh lỗi ghi đè đồng thời
      await new Promise(r => setTimeout(r, 1500));
      try {
        const existingRaw = await env.ORDER_STATE.get(`order:${orderKey}`);
        if (existingRaw) {
          try { await env.ORDER_STATE.delete(pendingKey); } catch { }
          continue;
        }
      } catch (e) {
        console.error("[Benmi Webhook] Check existing order failed:", e);
      }

      // Trích xuất Giờ nhận
      const timeMatch = userText.match(/取餐時間[：:\s]*([^\n]*)/);
      const timeStr = timeMatch ? timeMatch[1].trim() : "Unknown";

      // Trích xuất Tổng tiền (Lọc lấy đúng số)
      const totalMatch = userText.match(/總金額[：:\s]*\$?(\d+)/);
      const totalStr = totalMatch ? totalMatch[1] : "0";

      // Trích xuất Nội dung
      let extractedContent = userText;
      const contentMatch = userText.match(/訂單內容[：:\s]*([\s\S]*?)(?:🕒\s*)?取餐時間/);
      if (contentMatch) {
        extractedContent = contentMatch[1].trim();
      }

      // Trích xuất Ghi chú
      let noteStr = "";
      const noteMatch = userText.match(/(?:總備註|備註)[：:\s]*([\s\S]*?)(?=💰|總金額|$)/);
      if (noteMatch) {
        noteStr = noteMatch[1].trim();
      }

      let custName = "Khách (Web)";
      try {
        const token = env.LINE_CHANNEL_TOKEN;
        const profUrl = `https://api.line.me/v2/bot/profile/${userId}`;
        const resp = await fetch(profUrl, { headers: { Authorization: `Bearer ${token}` } });
        if (resp.ok) {
          const p = await resp.json();
          if (p && p.displayName) custName = p.displayName;
        }
      } catch (e) { }

      const orderData = {
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

      await saveOrder(env, orderData);

      // Auto-clear any stuck pending state
      try { await env.ORDER_STATE.delete(pendingKey); } catch { }

      continue;
    }

    // 0.5) If stale draft exists, check intent and redirect to LIFF or stay silent
    const draftRaw = await env.ORDER_STATE.get(draftKey);
    if (draftRaw) {
      let draft = {};
      try { draft = JSON.parse(draftRaw); } catch { }

      // Auto-expire drafts older than 2 hours
      const draftAge = Date.now() - (draft.lastUpdate || 0);
      if (draftAge > 2 * 60 * 60 * 1000) {
        await env.ORDER_STATE.delete(draftKey);
        // Fall through to normal handling below
      } else {
        const processDraft = async () => {
          // If already redirected once in the last 30 min, stay silent
          const alreadySent = await env.ORDER_STATE.get(`liff_redirected:${userId}`);
          if (alreadySent) {
            // Clear the stuck draft so it won't interfere next time
            try { await env.ORDER_STATE.delete(draftKey); } catch { }
            return;
          }

          const ctxPrompt = `顧客之前的草稿訂單：「${draft.text || '（空）'}」\n顧客剛剛傳來：「${userText}」\n\n請問顧客這句話是：在【繼續點餐/追加餐點/回答取餐時間/確認訂單】嗎？\n如果是 → 回覆「ORDER」\n如果不是（在發問、聊天、詢問食材等）→ 回覆「IGNORE」\n請只回覆 ORDER 或 IGNORE。`;
          const ctxRes = await callAI(ctxPrompt, env);
          const upper = (ctxRes || "").toUpperCase();
          if (upper.includes("ORDER") || !ctxRes) {
            // ORDER intent detected, or AI failed → redirect to LIFF as safe fallback
            try { await env.ORDER_STATE.delete(draftKey); } catch { }
            await replyWithLiffRedirect(replyToken, userId, env);
          } else {
            // IGNORE: clear draft so bot doesn't trap future messages
            try { await env.ORDER_STATE.delete(draftKey); } catch { }
          }
        };
        await processDraft();
        continue;
      }
    }

    // 1) Pending flow priority
    const pMap = await getPendingMap(env, userId);
    // Find latest pending entry for this user
    const pKeys = Object.keys(pMap).sort((a, b) => (pMap[b].createdAt || 0) - (pMap[a].createdAt || 0));

    if (pKeys.length > 0) {
      const orderKey = pKeys[0]; // Respond to the most recent one
      const pending = pMap[orderKey];
      const questionText = pending?.questionText || "";
      const lowerText = userText.trim().toLowerCase();

      if (orderKey) {
        const orderRaw = await env.ORDER_STATE.get(`order:${orderKey}`);
        if (orderRaw) {
          const order = JSON.parse(orderRaw);
          const pendingType = pending?.type;

          // If handled:
          const finishPending = async () => {
            delete pMap[orderKey];
            if (Object.keys(pMap).length === 0) {
              await env.ORDER_STATE.delete(pendingKey);
            } else {
              await env.ORDER_STATE.put(pendingKey, JSON.stringify(pMap));
            }
          };

          // Xử lý độ trễ lan truyền của Cloudflare KV
          const currentReason = pending?.reason || order.reason || "";
          const currentNote = pending?.note || order.note || "";

          // TÁCH RIÊNG TRƯỜNG HỢP "ĐỔI GIỜ NHẬN HÀNG" KHÔNG DÙNG AI
          if (pendingType === "CHANGE" && currentReason === "時間需調整") {
            // Sử dụng so sánh tuyệt đối thay vì includes để tránh nhầm lẫn "好啊不要"
            const exactMatch = lowerText === "好" || lowerText === "同意" || lowerText === "ok" || lowerText === "可以" || lowerText === "好的";
            const isCancel = lowerText.includes("不要") || lowerText.includes("取消") || lowerText.includes("不用");

            if (isCancel) {
              order.status = "REJECTED"; // Tự động huỷ
              await replyText(replyToken, `收到，謝謝您！`, env);
              await saveOrder(env, order);
              await finishPending();
              await syncToGoogleSheets(order, env);
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
              order.status = "NEW"; // Tái xuất hiện thông báo đơn mới trên Dashboard
              await replyText(replyToken, `收到您的同意！取餐時間已為您更改為 ${newSuggestedTime}`, env);
              await saveOrder(env, order);
              await finishPending();
            }
            else {
              await replyText(replyToken, `請簡單回覆「好 / 同意」以確認，或回覆「不要了 / 取消」取消訂單。`, env);
            }
            continue; // KẾT THÚC LUỒNG XỬ LÝ RIÊNG
          }

          // CÁC TRƯỜNG HỢP KHÁC (ví dụ: Hết món, Đổi món): DÙNG AI ĐỂ XỬ LÝ
          let aiSaysNo = false;
          if (questionText) {
            const prompt = `店家剛才詢問顧客：「${questionText}」\n顧客的回覆是：「${userText}」\n請問顧客的回覆是否針對問題做出了決定（如已明確選擇換的口味、同意、拒絕等）？\n注意：如果問題是問想換什麼口味，但顧客只回答「好/同意」而沒有說明要換什麼品項，表示未做出完整決定，請回答「NO」。\n如果顧客只是在反問、抱怨、尋求資訊，也請回答「NO」。\n如果顧客已經給出明確選項或決定取消，請回答「YES」。\n請嚴格只回覆「YES」或「NO」，不要有其他文字。`;
            const aiRes = await callAI(prompt, env);
            // Mặc định cho qua nếu AI lỗi, tránh rơi rớt đơn của khách. Chỉ chặn khi AI chắc chắn trả lời NO.
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
              order.status = "REJECTED"; // Tự động huỷ
              await replyText(replyToken, `好的，已為您取消訂單 #${orderKey}。`, env);
              await saveOrder(env, order);
              await finishPending();
              await syncToGoogleSheets(order, env);
              continue;
            }

            if (aiSaysNo) {
              await replyText(replyToken, `請您明確告訴我們想換什麼品項，或者回覆「取消」直接取消訂單。`, env);
              continue; // Yêu cầu khách nhập rõ ràng
            }

            if (currentReason === "口味售完") {
              order.content = `【顧客換單】：${userText}\n----原本訂單/Đơn cũ 👇----\n${order.content}`;
              order.reason = "";
              order.note = "";
              order.status = "NEW";
              await replyText(replyToken, `收到您的回覆！我們會依您的需求修改訂單。`, env);
              await saveOrder(env, order);
              await finishPending();
              continue;
            }

            // Fallback for explicitly agreed non-flavor changes
            const isAgree = lowerText === "好" || lowerText === "同意" || lowerText === "ok";
            if (isAgree) {
              order.status = "ACCEPTED";
              await replyText(replyToken, `Benmi 收到您的同意！我們會開始準備您的訂單 #${orderKey}。🥖`, env);
              await saveOrder(env, order);
              await finishPending();
              continue;
            }

            await replyText(replyToken, `請再明確回覆您的決定。`, env);
            continue;
          }

          if (pendingType === "REJECT") {
            const isAgree = lowerText === "同意" || lowerText === "好" || lowerText === "ok";
            const isDifferent = lowerText.includes("不同意") || lowerText.includes("不要") || lowerText === "取消";

            if (isAgree) {
              order.status = "REJECTED";
              await replyText(replyToken, `謝謝您！`, env);
              await saveOrder(env, order);
              await finishPending();
              await syncToGoogleSheets(order, env);
              continue;
            }

            if (isDifferent) {
              order.status = "NEW";
              await replyText(
                replyToken,
                `謝謝您的回覆！我已將訂單 #${orderKey} 回到「等待店家接單」狀態，店家會再為您確認。`,
                env
              );
              await saveOrder(env, order);
              await finishPending();
              continue;
            }

            await replyText(replyToken, `請回覆「同意」或「不同意」。`, env);
            continue;
          }
        }
      }

      // pending exists but invalid state
      try { await env.ORDER_STATE.delete(pendingKey); } catch { }
      await replyText(replyToken, `目前有點狀況，請稍後再確認一次。`, env);
      continue;
    }

    // 2) Quick reply
    const quick = await handleQuickReply(userText, env);
    if (quick) {
      await replyText(replyToken, quick, env);
      continue;
    }

    // 3) AI fallback - Detect ordering intent and redirect to LIFF (once per 30 min)
    const aiPromise = async () => {
      // Nếu khách hàng đang có đơn hàng hoạt động, Bot giữ im lặng để nhân viên chat tay
      const activeOrderKey = await env.ORDER_STATE.get(`active_order:${userId}`);
      if (activeOrderKey) return;

      // If already redirected once in the last 30 min, stay silent — let human staff handle
      const alreadySent = await env.ORDER_STATE.get(`liff_redirected:${userId}`);
      if (alreadySent) return;

      const intentPrompt = `顧客傳來：「${userText}」\n這句話是在向店家「下訂單點餐」嗎（包含提到想要某個餐點、詢問如何點餐、說要訂餐等）？\n如果是 → 回覆「YES」\n如果不是（單純發問、聊天、抱怨等）→ 回覆「NO」\n請只回覆 YES 或 NO。`;
      const intentRes = await callAI(intentPrompt, env);
      const resUpper = (intentRes || "").toUpperCase();

      if (resUpper.includes("YES")) {
        await replyWithLiffRedirect(replyToken, userId, env);
        return;
      }

      // If AI explicitly said NO: stay silent, let human staff handle
      if (resUpper.includes("NO")) return;

      // If AI failed (null/error/empty): send LIFF redirect as safe fallback
      await replyWithLiffRedirect(replyToken, userId, env);
    };
    await aiPromise();
  }
}

// ================= DEBUG =================
async function debugKV(env, url) {
  const targetKey = url.searchParams.get("key");
  if (targetKey) {
    const val = await env.ORDER_STATE.get(targetKey);
    return new Response(val || "Not found", { headers: corsHeaders() });
  }

  const rebuild = url.searchParams.get("rebuild");
  if (rebuild === "1") {
    try {
      // 1. List all keys in KV with prefix "order:"
      let allKeys = [];
      let cursor = "";
      while (true) {
        const listRes = await env.ORDER_STATE.list({ prefix: "order:", cursor });
        allKeys.push(...listRes.keys.map(k => k.name.replace("order:", "")));
        if (listRes.list_complete || !listRes.cursor) break;
        cursor = listRes.cursor;
      }

      // 2. Sort keys descending so newest are first (e.g. B0617 before B0614)
      allKeys.sort((a, b) => {
        const matchA = a.match(/^B(?:D)?(\d{4})(?:-(\d{4}))?/);
        const matchB = b.match(/^B(?:D)?(\d{4})(?:-(\d{4}))?/);
        if (matchA && matchB) {
          const dateA = matchA[1];
          const dateB = matchB[1];
          if (dateA !== dateB) return dateB.localeCompare(dateA);
          const timeA = matchA[2] || "";
          const timeB = matchB[2] || "";
          return timeB.localeCompare(timeA);
        }
        return b.localeCompare(a);
      });

      // Keep only up to MAX_INDEX (200)
      const newIndex = allKeys.slice(0, MAX_INDEX);

      // 3. Write new index to ORDER_INDEX_LATEST
      await env.ORDER_STATE.put(ORDER_INDEX_LATEST, JSON.stringify(newIndex));

      // 4. Fetch the first 30 orders to rebuild the cache
      const maxRebuild = 30;
      const keysToFetch = newIndex.slice(0, maxRebuild);
      const promises = keysToFetch.map(k => env.ORDER_STATE.get(`order:${k}`).then(raw => {
        if (raw) { try { return JSON.parse(raw); } catch { } }
        return null;
      }));
      const results = await Promise.all(promises);
      const rebuiltOrders = results.filter(Boolean);
      rebuiltOrders.sort((a, b) => (b?.createdAt || 0) - (a?.createdAt || 0));

      // Write to cache
      await env.ORDER_STATE.put("order_view:cache", JSON.stringify(rebuiltOrders));

      // Clear memory cache so it reloads
      memoryCacheOrders = null;
      memoryCacheTime = 0;

      return json({
        success: true,
        message: `Successfully rebuilt index and cache with ${newIndex.length} keys.`,
        index: newIndex.slice(0, 10),
        cache: rebuiltOrders.map(o => o.key)
      });
    } catch (err) {
      return json({ success: false, error: err.message }, 500);
    }
  }

  let list = { keys: [], list_complete: true };
  try {
    list = await env.ORDER_STATE.list({ prefix: "order:" });
  } catch (e) {
    console.error("KV List Error in Debug", e);
  }

  const index = await env.ORDER_STATE.get(ORDER_INDEX_LATEST);
  const cache = await env.ORDER_STATE.get("order_view:cache");
  const lastSaveError = await env.ORDER_STATE.get("last_save_error");

  return json({
    total_orders_in_first_1000: list.keys.length,
    list_complete: list.list_complete,
    cursor: list.cursor,
    keys: list.keys.map(k => k.name),
    index: index ? JSON.parse(index) : null,
    cache: cache ? JSON.parse(cache).map(o => o.key) : null,
    last_save_error: lastSaveError ? JSON.parse(lastSaveError) : null,
    error: list.keys.length === 0 ? "KV list() limit exceeded for the day" : null
  });
}
