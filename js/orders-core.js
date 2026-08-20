// ==========================================
// Benmi POS - Module: Core & Polling Engine
// ==========================================

const WORKER_BASE = (window.location.hostname.includes("staging") || window.location.hostname.includes("test") || window.location.hostname.includes("localhost") || window.location.hostname.includes("127.0.0.1"))
  ? "https://platform-worker-staging.thuanmnc.workers.dev"
  : "https://benmi-worker-official.thuanmnc.workers.dev";

function getTenantIdFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get("tenant_id") || "benmi";
}

function applyTenantBranding(tenant) {
  if (!tenant) return;
  const brandName = tenant.brandName || "Dashboard";
  const bTitle = document.getElementById('brand-title');
  const bLogo = document.getElementById('brand-logo');

  if (bTitle) bTitle.innerText = `${brandName} Dashboard`;
  document.title = `${brandName} Dashboard`;

  if (bLogo) {
    if (tenant.logoUrl) {
      bLogo.src = tenant.logoUrl;
      bLogo.style.display = "block";
    } else {
      bLogo.style.display = "none";
    }
  }
  document.documentElement.style.setProperty('--primary', '#00b900');
}

async function initTenantBranding() {
  const tenantId = getTenantIdFromUrl();

  // 1. Instant Cache Render (0ms latency, eliminates any flash of unstyled content)
  try {
    const cached = localStorage.getItem("tenant_branding_" + tenantId) || localStorage.getItem("tenant_theme_" + tenantId);
    if (cached) {
      applyTenantBranding(JSON.parse(cached));
    }
  } catch(e) {}

  // 2. Fetch fresh config from Server and update cache
  try {
    const res = await fetch(`${WORKER_BASE}/api/tenant/bootstrap?tenant_id=${tenantId}&_t=${Date.now()}`);
    if (res.ok) {
      const data = await res.json();
      if (data.tenant) {
        try {
          localStorage.setItem("tenant_branding_" + tenantId, JSON.stringify(data.tenant));
          localStorage.setItem("tenant_theme_" + tenantId, JSON.stringify(data.tenant));
        } catch(e) {}
        applyTenantBranding(data.tenant);
      }
    }
  } catch(e) {}
}
initTenantBranding();

// Global POS State
let latestOrders = [];
let pendingNewOrders = [];
let reviewingOrder = null;
let currentOrderKey = null;
let activeTab = "live";
let newAlertSnoozeUntilMs = 0;
let snoozedNewOrderKeys = new Set();
let newAlertSnoozeTimerId = null;
let localOverrides = {};
const knownOrderKeys = new Set();
const processingKeys = new Set();
let isFirstLoad = true;
let lastOrdersETag = "";

function escapeHtml(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function parsePickupTimeMs(timeStr, createdAtMs) {
  if (!timeStr || typeof timeStr !== "string") return Number(createdAtMs) || NaN;
  const m = timeStr.match(/(\d{4}-\d{2}-\d{2})[T\s]+(\d{1,2}):(\d{2})/);
  if (m) {
    const hh = m[2].padStart(2, "0");
    const min = m[3].padStart(2, "0");
    const iso = `${m[1]}T${hh}:${min}:00`;
    const ms = new Date(iso).getTime();
    if (!Number.isNaN(ms)) return ms;
  }
  const timeOnly = timeStr.match(/(\d{1,2}):(\d{2})/);
  if (timeOnly) {
    const base = createdAtMs ? new Date(createdAtMs) : new Date();
    const yyyy = base.getFullYear();
    const mm = String(base.getMonth() + 1).padStart(2, "0");
    const dd = String(base.getDate()).padStart(2, "0");
    const hh = String(parseInt(timeOnly[1], 10)).padStart(2, "0");
    const min = String(parseInt(timeOnly[2], 10)).padStart(2, "0");
    const iso = `${yyyy}-${mm}-${dd}T${hh}:${min}:00`;
    const ms = new Date(iso).getTime();
    if (!Number.isNaN(ms)) return ms;
  }
  return Number(createdAtMs) || NaN;
}

function sortByPickupTimeAsc(a, b) {
  const at = parsePickupTimeMs(a?.time, a?.createdAt);
  const bt = parsePickupTimeMs(b?.time, b?.createdAt);
  if (Number.isNaN(at) && Number.isNaN(bt)) return (a?.createdAt || 0) - (b?.createdAt || 0);
  if (Number.isNaN(at)) return (a?.createdAt || 0) - bt;
  if (Number.isNaN(bt)) return at - (b?.createdAt || 0);
  if (at === bt) return (a?.createdAt || 0) - (b?.createdAt || 0);
  return at - bt;
}

function formatEta(timeStr) {
  const target = parsePickupTimeMs(timeStr);
  if (Number.isNaN(target)) return "-";
  const diffMs = target - Date.now();
  const diffMin = Math.round(diffMs / 60000);
  if (diffMin <= 0) return t("etaArrived", { min: Math.abs(diffMin) });
  if (diffMin < 60) return t("etaMinutes", { min: diffMin });
  const h = Math.floor(diffMin / 60);
  const m = diffMin % 60;
  return t("etaHours", { h, m });
}

function shortItems(content) {
  if (!content) return "";
  const lines = String(content).split("\n").map(s => s.trim()).filter(Boolean);
  return lines.slice(0, 6).join("\n");
}

function countItemsFromContent(content) {
  if (!content) return 0;
  const lines = String(content).split("\n").map(s => s.trim()).filter(Boolean);
  let total = 0;
  for (const line of lines) {
    // Match "1份 x 商品名" or "2份x商品名"
    const m = line.match(/^(\d+)\s*份\s*[xX×]\s*.+/);
    if (m) total += parseInt(m[1], 10);
  }
  return total;
}

function formatPickupTimeDisplay(timeStr) {
  if (!timeStr) return "-";
  const clean = String(timeStr).replace(/\s*\([^)]*\)/g, '').trim();
  if (!clean) return "-";
  
  // If format is "YYYY-MM-DD HH:mm", check if YYYY-MM-DD is today in Taiwan time
  const m = clean.match(/^(\d{4})-(\d{2})-(\d{2})\s+(\d{1,2}:\d{2})$/);
  if (m) {
    const today = new Date();
    const twDate = new Date(today.getTime() + 8 * 3600000);
    const twY = twDate.getUTCFullYear();
    const twM = String(twDate.getUTCMonth() + 1).padStart(2, "0");
    const twD = String(twDate.getUTCDate()).padStart(2, "0");
    const datePart = `${m[1]}-${m[2]}-${m[3]}`;
    const todayPart = `${twY}-${twM}-${twD}`;
    
    if (datePart === todayPart) {
      return m[4];
    } else {
      return `${m[2]}/${m[3]} ${m[4]}`;
    }
  }
  return clean;
}

function formatOrderTotal(order) {
  if (order?.total !== undefined && order?.total !== null && !isNaN(order.total) && Number(order.total) > 0) {
    return `$${Number(order.total).toLocaleString()}`;
  }
  if (order?.content) {
    const match = String(order.content).match(/💰\s*總金額[：:]\s*\$?(\d+)/) || String(order.content).match(/Tổng\s*(?:tiền)?[：:]\s*(\d+)/i);
    if (match) {
      return `$${Number(match[1]).toLocaleString()}`;
    }
  }
  return order?.total !== undefined && order?.total !== null && order?.total !== "" ? `$${order.total}` : "-";
}

function switchTab(tab) {
  activeTab = tab;
  document.getElementById("tab-live").classList.toggle("active", tab === "live");
  document.getElementById("tab-history").classList.toggle("active", tab === "history");
  document.getElementById("view-live").style.display = tab === "live" ? "block" : "none";
  document.getElementById("view-history").style.display = tab === "history" ? "block" : "none";
  document.getElementById("view-settings").style.display = "none";
  document.getElementById("view-menu").style.display = "none";
  if (tab === "live" || tab === "history") renderAll();
}

async function fetchOrders() {
  try {
    const tenantId = getTenantIdFromUrl();
    const headers = { "X-Tenant-ID": tenantId };
    if (lastOrdersETag) {
      headers["If-None-Match"] = lastOrdersETag;
    }

    const response = await fetch(`${WORKER_BASE}/api/orders?tenant_id=${tenantId}`, { headers });
    if (response.status === 304) {
      // Even on 304, re-check snooze expiration for new alert
      if (typeof updateNewAlert === "function") updateNewAlert();
      return;
    }
    if (!response.ok) throw new Error(`fetch failed: ${response.status}`);

    const etag = response.headers.get("ETag");
    if (etag) lastOrdersETag = etag;

    let orders = await response.json();
    if (!Array.isArray(orders)) orders = [];

    // Deduplicate
    const uniqueMap = new Map();
    orders.forEach(o => { if (o?.key) uniqueMap.set(o.key, o); });
    latestOrders = Array.from(uniqueMap.values());

    // New arrivals => sound
    const newArrivals = latestOrders.filter(o => o && o.key && !knownOrderKeys.has(o.key));
    newArrivals.forEach(o => { if (o?.key) knownOrderKeys.add(o.key); });

    // NEW orders => fullscreen alert
    pendingNewOrders = latestOrders.filter(o => o && o.status === "NEW").slice().sort(sortByPickupTimeAsc);
    if (!isFirstLoad && newArrivals.length > 0 && pendingNewOrders.length > 0) {
      if (typeof startContinuousAlarm === "function") startContinuousAlarm();
    }
    isFirstLoad = false;
    if (typeof updateNewAlert === "function") updateNewAlert();

    renderAll();
  } catch (e) {
    console.error(e);
    const leftEl = document.getElementById("list-left");
    if (leftEl) leftEl.innerHTML = `<div style="text-align:center; padding: 22px; color:#d32f2f;">${escapeHtml(e?.message || e)}</div>`;
    const rightEl = document.getElementById("list-right");
    if (rightEl) rightEl.innerHTML = `<div style="text-align:center; padding: 22px; color:#d32f2f;">-</div>`;
    const histEl = document.getElementById("list-history");
    if (histEl) histEl.innerHTML = `<div style="text-align:center; padding: 22px; color:#d32f2f;">-</div>`;
  }
}

function renderAll() {
  if (!Array.isArray(latestOrders)) return;

  // Filter/Apply local overrides (ignore server data if override is < 15s old)
  const now = Date.now();
  const currentOrders = latestOrders.map(o => {
    const override = localOverrides[o.key];
    if (override && (now - override.time < 15000)) {
      return { ...o, status: override.status };
    }
    if (override && (now - override.time >= 15000)) {
      delete localOverrides[o.key];
    }
    return o;
  });

  const leftOrders = currentOrders
    .filter(o => o && (o.status === "NEW" || o.status === "ACCEPTED" || o.status === "WAITING_CUSTOMER_CHANGE" || o.status === "WAITING_CUSTOMER_REJECT"))
    .slice()
    .sort(sortByPickupTimeAsc);

  const rightOrders = currentOrders
    .filter(o => o && o.status === "DONE")
    .slice()
    .sort(sortByPickupTimeAsc);

  const historyOrders = currentOrders
    .filter(o => o && ["PICKED_UP", "REJECTED"].includes(o.status))
    .slice()
    .sort((a, b) => (b?.createdAt || 0) - (a?.createdAt || 0));

  const cLeft = document.getElementById("count-left");
  if (cLeft) cLeft.innerText = String(leftOrders.length);
  const cRight = document.getElementById("count-right");
  if (cRight) cRight.innerText = String(rightOrders.length);

  if (activeTab === "live") {
    if (typeof renderListLeft === "function") renderListLeft(leftOrders);
    if (typeof renderListRight === "function") renderListRight(rightOrders);
  } else if (activeTab === "history") {
    if (typeof renderHistory === "function") renderHistory(historyOrders);
  }
}

function copyToClipboard(text, msgZh, msgVi) {
  navigator.clipboard.writeText(text).then(() => {
    alert(currentLang === 'vi' ? msgVi : msgZh);
  }).catch(() => {
    alert(text);
  });
}

function closeModal() {
  document.querySelectorAll(".modal").forEach(m => {
    if (m.id !== "startShiftModal") {
      m.style.display = "none";
    }
  });
  reviewingOrder = null;
  currentOrderKey = null;
  if (typeof updateNewAlert === "function") updateNewAlert();
}

// 1.5s Polling loop for active order updates - ALWAYS runs across all dashboard tabs!
setInterval(() => {
  fetchOrders();
}, 1500);

// Dynamic 10s timer to automatically refresh ETA time countdowns
setInterval(() => {
  if (activeTab === "live" || activeTab === "history") renderAll();
}, 10000);

// 1s timer to ensure new alert and alarms are evaluated without delay
setInterval(() => {
  if (typeof updateNewAlert === "function") updateNewAlert();
}, 1000);
