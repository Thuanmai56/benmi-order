const WORKER_BASE = (window.location.hostname.includes("staging") || window.location.hostname.includes("localhost") || window.location.hostname.includes("127.0.0.1"))
  ? "https://platform-worker-staging.thuanmnc.workers.dev"
  : "https://benmi-worker-official.thuanmnc.workers.dev";

function getTenantIdFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get("tenant_id") || "benmi";
}

let latestOrders = [];
let pendingNewOrders = [];
let reviewingOrder = null;
let currentOrderKey = null;
let activeTab = "live";
let newAlertSnoozeUntilMs = 0;
let snoozedNewOrderKeys = new Set();
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

function parsePickupTimeMs(timeStr) {
  if (!timeStr || typeof timeStr !== "string") return NaN;
  const m = timeStr.match(/^(\d{4}-\d{2}-\d{2})\s+(\d{2}:\d{2})/);
  if (!m) return NaN;
  const iso = `${m[1]}T${m[2]}:00`;
  const ms = new Date(iso).getTime();
  return Number.isNaN(ms) ? NaN : ms;
}

function sortByPickupTimeAsc(a, b) {
  const at = parsePickupTimeMs(a?.time);
  const bt = parsePickupTimeMs(b?.time);
  if (Number.isNaN(at) || Number.isNaN(bt)) return (a?.createdAt || 0) - (b?.createdAt || 0);
  return at - bt;
}

function formatEta(timeStr) {
  const target = parsePickupTimeMs(timeStr);
  if (Number.isNaN(target)) return "-";
  const diffMs = target - Date.now();
  const diffMin = Math.round(diffMs / 60000);
  if (diffMin <= 0) return `已到 / ${Math.abs(diffMin)} 分鐘前`;
  if (diffMin < 60) return `剩 ${diffMin} 分鐘`;
  const h = Math.floor(diffMin / 60);
  const m = diffMin % 60;
  return `剩 ${h} 小時 ${m} 分`;
}

function shortItems(content) {
  if (!content) return "";
  const lines = String(content).split("\n").map(s => s.trim()).filter(Boolean);
  return lines.slice(0, 6).join("\n");
}

function getInitialTab() {
  const hash = window.location.hash.replace("#", "").trim();
  const saved = localStorage.getItem("benmi_active_tab");
  const candidate = hash || saved || "live";
  return ["live", "history", "menu", "settings"].includes(candidate) ? candidate : "live";
}

function switchTab(tab, updateUrl = true) {
  if (!["live", "history", "menu", "settings"].includes(tab)) tab = "live";
  activeTab = tab;

  if (updateUrl) {
    try {
      localStorage.setItem("benmi_active_tab", tab);
      const newUrl = `${window.location.pathname}${window.location.search}#${tab}`;
      if (window.location.hash !== `#${tab}`) {
        history.replaceState(null, "", newUrl);
      }
    } catch (e) {}
  }

  ["live", "history", "menu", "settings"].forEach(t => {
    const navBtn = document.getElementById(`tab-${t}`);
    if (navBtn) navBtn.classList.toggle("active", t === tab);
    const viewEl = document.getElementById(`view-${t}`);
    if (viewEl) viewEl.style.display = t === tab ? "block" : "none";
  });

  if (tab === "live" || tab === "history") renderAll();
  if (tab === "menu" && typeof loadMenuData === "function" && typeof currentMenuData !== "undefined" && !currentMenuData) {
    loadMenuData();
  }
  if (tab === "settings" && typeof loadOperatingHours === "function") {
    loadOperatingHours();
  }
}

window.addEventListener("hashchange", () => {
  const tabFromHash = window.location.hash.replace("#", "").trim();
  if (["live", "history", "menu", "settings"].includes(tabFromHash) && tabFromHash !== activeTab) {
    switchTab(tabFromHash, false);
  }
});

async function fetchOrders() {
  try {
    const headers = {};
    if (lastOrdersETag) {
      headers["If-None-Match"] = lastOrdersETag;
    }

    const response = await fetch(`${WORKER_BASE}/api/orders`, { headers });
    if (response.status === 304) {
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
    if (leftEl) leftEl.innerHTML = `<div style="text-align:center; padding: 22px; color:#d32f2f;">Không tải được: ${escapeHtml(e?.message || e)}</div>`;
    const rightEl = document.getElementById("list-right");
    if (rightEl) rightEl.innerHTML = `<div style="text-align:center; padding: 22px; color:#d32f2f;">Không tải được</div>`;
    const histEl = document.getElementById("list-history");
    if (histEl) histEl.innerHTML = `<div style="text-align:center; padding: 22px; color:#d32f2f;">Không tải được</div>`;
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
    // Cleanup old overrides
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

  const countLeft = document.getElementById("count-left");
  if (countLeft) countLeft.innerText = String(leftOrders.length);
  const countRight = document.getElementById("count-right");
  if (countRight) countRight.innerText = String(rightOrders.length);

  if (activeTab === "live") {
    if (typeof renderListLeft === "function") renderListLeft(leftOrders);
    if (typeof renderListRight === "function") renderListRight(rightOrders);
  } else if (activeTab === "history") {
    if (typeof renderHistory === "function") renderHistory(historyOrders);
  }
}
