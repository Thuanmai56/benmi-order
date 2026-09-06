// ==========================================
// Benmi POS - Module: Core & Polling Engine
// ==========================================

const _coreHostname = window.location.hostname;
const _coreParams = new URLSearchParams(window.location.search);
const _forcedEnv = _coreParams.get("env") || (typeof localStorage !== "undefined" && localStorage.getItem("pos_env_override"));

const _isDev = (
  _forcedEnv === "dev" ||
  ((_coreHostname === "localhost" || _coreHostname === "127.0.0.1") && _forcedEnv !== "prod") ||
  _coreHostname.startsWith("dev.") ||
  _coreHostname.includes(".dev.") ||
  _coreHostname.includes("-dev.") ||
  _coreHostname.startsWith("dev-")
);
const _isStaging = (
  _forcedEnv === "staging" ||
  _coreHostname.startsWith("staging.") ||
  _coreHostname.includes(".staging.") ||
  _coreHostname.includes("-staging.") ||
  _coreHostname.startsWith("test.") ||
  _coreHostname.includes(".test.") ||
  _coreHostname.includes("-test.")
);
const WORKER_BASE = _isDev
  ? "https://platform-worker-dev.thuanmnc.workers.dev"
  : (_isStaging
    ? "https://platform-worker-staging.thuanmnc.workers.dev"
    : "https://benmi-worker-official.thuanmnc.workers.dev");

var POS_SVG = {
  takeaway: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block; vertical-align:-1px; margin-right:4px;"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"></path><path d="M3 6h18"></path><path d="M16 10a4 4 0 0 1-8 0"></path></svg>`,
  dineIn: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block; vertical-align:-1px; margin-right:4px;"><path d="M18 2v6a3 3 0 0 1-3 3 3 3 0 0 1-3-3V2"></path><path d="M15 2v10"></path><path d="M15 14v8"></path><path d="M6 2v20"></path><path d="M6 2a3 3 0 0 1 3 3v3a3 3 0 0 1-3 3"></path></svg>`,
  clock: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block; vertical-align:-1px; margin-right:4px; opacity:0.65;"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>`,
  receipt: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block; vertical-align:-1px; margin-right:4px; opacity:0.65;"><path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z"></path><path d="M16 8h-8"></path><path d="M16 12h-8"></path><path d="M10 16h-4"></path></svg>`,
  printer: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block; vertical-align:-1px; margin-right:4px;"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>`,
  tag: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block; vertical-align:-1px; margin-right:4px;"><path d="M12 2H2v10l9.29 9.29c.94.94 2.48.94 3.42 0l6.58-6.58c.94-.94.94-2.48 0-3.42L12 2Z"></path><path d="M7 7h.01"></path></svg>`,
  note: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block; vertical-align:-1px; margin-right:4px; opacity:0.75;"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>`,
  check: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block; vertical-align:-2px; margin-right:4px;"><polyline points="20 6 9 17 4 12"></polyline></svg>`,
  checkAll: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block; vertical-align:-2px; margin-right:4px;"><polyline points="18 6 7 17 2 12"></polyline><path d="m22 10-7.5 7.5L13 16"></path></svg>`,
  eye: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block; vertical-align:-2px; margin-right:4px;"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"></path><circle cx="12" cy="12" r="3"></circle></svg>`,
  inbox: `<svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"></polyline><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"></path></svg>`,
  partyCheck: `<svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>`,
  user: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block; vertical-align:-2px; margin-right:4px;"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>`,
  x: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"></path><path d="m6 6 12 12"></path></svg>`,
  flame: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block; vertical-align:-2px; margin-right:4px;"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"></path></svg>`,
  sparkles: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block; vertical-align:-2px; margin-right:4px;"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"></path><path d="M5 3v4"></path><path d="M19 17v4"></path><path d="M3 5h4"></path><path d="M17 19h4"></path></svg>`,
  copy: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block; vertical-align:-2px; margin-right:4px;"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"></rect><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"></path></svg>`,
  fileText: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block; vertical-align:-2px; margin-right:4px;"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"></path><path d="M14 2v4a2 2 0 0 0 2 2h4"></path><path d="M10 9H8"></path><path d="M16 13H8"></path><path d="M16 17H8"></path></svg>`
};
window.POS_SVG = POS_SVG;

function isNativeAppPlatform() {
  if (typeof window === "undefined") return false;
  if (typeof window.IS_NATIVE_APP !== "undefined") return window.IS_NATIVE_APP;
  try {
    const params = new URLSearchParams(window.location.search);
    const p = params.get("platform");
    if (p === "app" || params.get("app") === "1") return true;
    if (p === "web" || params.get("web") === "1") return false;
    if (window.Capacitor) {
      if (typeof window.Capacitor.isNativePlatform === "function" && window.Capacitor.isNativePlatform()) return true;
      if (typeof window.Capacitor.getPlatform === "function" && window.Capacitor.getPlatform() !== "web") return true;
      if (typeof window.Capacitor.isPluginAvailable === "function" && window.Capacitor.isPluginAvailable("ThermalPrinter")) return true;
    }
  } catch (e) {}
  return false;
}
window.isNativeAppPlatform = isNativeAppPlatform;

const _isProd = !_isDev && !_isStaging;
window._isProdEnv = _isProd;

function shouldHideWebPrinter() {
  if (typeof window === "undefined") return false;
  if (isNativeAppPlatform()) return false;
  try {
    const params = new URLSearchParams(window.location.search);
    const hp = params.get("hide_printer");
    if (hp === "1") return true;
    if (hp === "0") return false;
    return !!_isProd;
  } catch (e) {
    return !!_isProd;
  }
}
window.shouldHideWebPrinter = shouldHideWebPrinter;

function syncPlatformClasses() {
  const isApp = isNativeAppPlatform();
  const hideWebPrinter = shouldHideWebPrinter();
  window.IS_NATIVE_APP = isApp;
  if (typeof document !== "undefined") {
    [document.documentElement, document.body].forEach(el => {
      if (el && el.classList && typeof el.classList.toggle === "function") {
        el.classList.toggle("is-native-app", isApp);
        el.classList.toggle("is-web-platform", !isApp);
        el.classList.toggle("is-prod-env", _isProd);
        el.classList.toggle("is-non-prod-env", !_isProd);
        el.classList.toggle("hide-web-printer", hideWebPrinter);
      }
    });
  }
}
syncPlatformClasses();
if (typeof document !== "undefined" && typeof document.addEventListener === "function") {
  document.addEventListener("DOMContentLoaded", syncPlatformClasses);
}

function getTenantIdFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const fromUrl = params.get("tenant") || params.get("tenant_id");
  if (fromUrl && fromUrl.trim()) {
    return fromUrl.trim();
  }
  if (typeof localStorage !== "undefined") {
    const savedTenant = localStorage.getItem("pos_device_tenant_id");
    if (savedTenant && savedTenant.trim()) {
      return savedTenant.trim();
    }
  }
  return "";
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

  if (tenant && Array.isArray(tenant.features)) {
    window.currentTenantFeatures = tenant.features;
  } else {
    window.currentTenantFeatures = [];
  }
  document.documentElement.style.setProperty('--primary', '#00b900');
}

async function initTenantBranding() {
  const tenantId = getTenantIdFromUrl();
  if (!tenantId) {
    if (typeof showStoreActivationModal === "function") {
      showStoreActivationModal();
    }
    return;
  }

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
var latestOrders = [];
var pendingNewOrders = [];
var reviewingOrder = null;
var currentOrderKey = null;
var activeTab = "live";
var newAlertSnoozeUntilMs = 0;
var snoozedNewOrderKeys = new Set();
var newAlertSnoozeTimerId = null;
var localOverrides = {};
var knownOrderKeys = new Set();
var knownOrderRounds = new Map();
var unacknowledgedAppends = new Map();
var processingKeys = new Set();
var isFirstLoad = true;
var lastOrdersETag = "";

window.latestOrders = latestOrders;
window.pendingNewOrders = pendingNewOrders;
window.reviewingOrder = reviewingOrder;
window.unacknowledgedAppends = unacknowledgedAppends;
window.snoozedNewOrderKeys = snoozedNewOrderKeys;

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

function getOrderEffectiveDineInTimeMs(order) {
  if (!order) return Date.now();
  const appended = order.lastAppendedAt || order.last_appended_at;
  if (appended) {
    const ms = typeof appended === "number" ? appended : new Date(String(appended).includes("Z") ? appended : appended + "Z").getTime();
    if (!Number.isNaN(ms) && ms > 0) return ms;
  }
  if (order.createdAt && !Number.isNaN(Number(order.createdAt))) {
    return Number(order.createdAt);
  }
  if (order.time) {
    const ms = parsePickupTimeMs(order.time);
    if (!Number.isNaN(ms)) return ms;
  }
  return Date.now();
}

function sortByPickupTimeAsc(a, b) {
  const isADineIn = typeof isOrderDineIn === "function" ? isOrderDineIn(a) : a?.diningOption === "dine_in";
  const isBDineIn = typeof isOrderDineIn === "function" ? isOrderDineIn(b) : b?.diningOption === "dine_in";

  const at = isADineIn ? getOrderEffectiveDineInTimeMs(a) : parsePickupTimeMs(a?.time, a?.createdAt);
  const bt = isBDineIn ? getOrderEffectiveDineInTimeMs(b) : parsePickupTimeMs(b?.time, b?.createdAt);

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

function isOrderElapsedMode(order) {
  if (!order) return false;
  if (typeof isOrderDineIn === "function" && isOrderDineIn(order)) return true;
  if (typeof allowScheduledPickup !== "undefined" && allowScheduledPickup === false) return true;
  
  const timeStr = String(order.time || "").trim();
  if (!timeStr || timeStr === "-" || timeStr === "Unknown" || timeStr.includes("即刻") || timeStr.includes("現場") || timeStr.includes("Làm ngay")) {
    return true;
  }
  return false;
}

function formatOrderSubmissionTime(order) {
  if (!order) return "-";
  let createdMs = 0;
  if (order.createdAt) {
    createdMs = typeof order.createdAt === "number" ? order.createdAt : new Date(String(order.createdAt).includes("Z") ? order.createdAt : order.createdAt + "Z").getTime();
  }
  if (!createdMs || Number.isNaN(createdMs)) {
    createdMs = parsePickupTimeMs(order.time);
  }
  if (!createdMs || Number.isNaN(createdMs)) return "-";

  const d = new Date(createdMs + 8 * 3600000);
  const hh = String(d.getUTCHours()).padStart(2, "0");
  const mm = String(d.getUTCMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

function formatSubmissionElapsedTime(order) {
  let createdMs = 0;
  if (order?.createdAt) {
    createdMs = typeof order.createdAt === "number" ? order.createdAt : new Date(String(order.createdAt).includes("Z") ? order.createdAt : order.createdAt + "Z").getTime();
  }
  if (!createdMs || Number.isNaN(createdMs)) {
    createdMs = parsePickupTimeMs(order?.time);
  }
  if (!createdMs || Number.isNaN(createdMs)) {
    return t("dineInElapsedJustNow");
  }

  const diffMs = Date.now() - createdMs;
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin <= 0) {
    return t("dineInElapsedJustNow");
  }
  if (diffMin < 60) {
    return t("dineInElapsedMinutes", { min: diffMin });
  }
  const h = Math.floor(diffMin / 60);
  const m = diffMin % 60;
  return t("dineInElapsedHours", { h, m });
}

function formatDineInElapsedTime(order) {
  return formatSubmissionElapsedTime(order);
}

function formatDineInTimeDisplay(order) {
  return formatOrderSubmissionTime(order);
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

function formatPickupTimeDisplay(timeStr, fallbackCreatedAt, orderContent) {
  let clean = timeStr ? String(timeStr).replace(/\s*\([^)]*\)/g, '').trim() : "";
  
  // If clean is empty, "-" or "Unknown", try extracting from orderContent
  if ((!clean || clean === "Unknown" || clean === "-") && orderContent) {
    const match = String(orderContent).match(/(?:取餐時間|訂餐時間|點餐時間)[：:]\s*([^\n\r]+)/);
    if (match && match[1]) {
      clean = match[1].replace(/\s*\([^)]*\)/g, '').trim();
    }
  }

  // If still empty or "Unknown", fallback to createdAt
  if (!clean || clean === "Unknown" || clean === "-") {
    if (fallbackCreatedAt) {
      const dt = typeof fallbackCreatedAt === "number" ? fallbackCreatedAt : new Date(String(fallbackCreatedAt).endsWith("Z") ? fallbackCreatedAt : fallbackCreatedAt + "Z").getTime();
      if (!Number.isNaN(dt) && dt > 0) {
        const d = new Date(dt + 8 * 3600000);
        const yyyy = d.getUTCFullYear();
        const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
        const dd = String(d.getUTCDate()).padStart(2, "0");
        const hh = String(d.getUTCHours()).padStart(2, "0");
        const min = String(d.getUTCMinutes()).padStart(2, "0");

        const today = new Date();
        const twDate = new Date(today.getTime() + 8 * 3600000);
        const twY = twDate.getUTCFullYear();
        const twM = String(twDate.getUTCMonth() + 1).padStart(2, "0");
        const twD = String(twDate.getUTCDate()).padStart(2, "0");

        if (`${yyyy}-${mm}-${dd}` === `${twY}-${twM}-${twD}`) {
          return `${hh}:${min}`;
        } else {
          return `${mm}/${dd} ${hh}:${min}`;
        }
      }
    }
    return "-";
  }
  
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
  if (tab === "reports" && isNativeAppPlatform()) {
    tab = "live";
  }
  activeTab = tab;
  const tabLive = document.getElementById("tab-live");
  const tabHistory = document.getElementById("tab-history");
  const tabReports = document.getElementById("tab-reports");
  const tabMenu = document.getElementById("tab-menu");
  const tabSettings = document.getElementById("tab-settings");

  if (tabLive) tabLive.classList.toggle("active", tab === "live");
  if (tabHistory) tabHistory.classList.toggle("active", tab === "history");
  if (tabReports) tabReports.classList.toggle("active", tab === "reports");
  if (tabMenu) tabMenu.classList.toggle("active", tab === "menu");
  if (tabSettings) tabSettings.classList.toggle("active", tab === "settings");

  document.querySelectorAll(".mini-btn").forEach(t => t.classList.remove("active"));

  if (typeof updateSidebarActive === "function") {
    updateSidebarActive(tab);
  }

  const viewLive = document.getElementById("view-live");
  const viewHistory = document.getElementById("view-history");
  const viewReports = document.getElementById("view-reports");
  const viewSettings = document.getElementById("view-settings");
  const viewMenu = document.getElementById("view-menu");

  if (viewLive) viewLive.style.display = tab === "live" ? "block" : "none";
  if (viewHistory) viewHistory.style.display = tab === "history" ? "block" : "none";
  if (viewReports) viewReports.style.display = tab === "reports" ? "block" : "none";
  if (viewSettings) viewSettings.style.display = tab === "settings" ? "block" : "none";
  if (viewMenu) viewMenu.style.display = tab === "menu" ? "block" : "none";

  if (tab === "live") {
    renderAll();
  } else if (tab === "history") {
    if (typeof fetchHistoryOrders === "function") {
      fetchHistoryOrders();
    } else if (typeof renderHistory === "function") {
      renderHistory(typeof lastHistoryOrders !== "undefined" ? lastHistoryOrders : []);
    }
  } else if (tab === "reports") {
    if (typeof fetchReportData === "function") {
      fetchReportData(typeof currentReportRange !== "undefined" ? currentReportRange : "today");
    }
  } else if (tab === "menu") {
    if (typeof openMenuSettings === "function") {
      openMenuSettings();
    }
  } else if (tab === "settings") {
    if (typeof openSettings === "function") {
      openSettings();
    }
  }
}

async function fetchOrders() {
  try {
    const tenantId = getTenantIdFromUrl();
    if (!tenantId) return;
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

    // Track round count increases on existing orders (Appended rounds)
    let hasNewlyAppendedRound = false;
    latestOrders.forEach(o => {
      if (o?.key) {
        const currentRound = Number(o.round_count || o.roundCount) || 1;
        if (!isFirstLoad && knownOrderRounds.has(o.key)) {
          const prevRound = knownOrderRounds.get(o.key);
          if (currentRound > prevRound) {
            hasNewlyAppendedRound = true;
            if (typeof localOverrides !== "undefined" && localOverrides[o.key]) {
              delete localOverrides[o.key];
            }
            if (typeof snoozedNewOrderKeys !== "undefined") {
              snoozedNewOrderKeys.delete(o.key);
            }
            if (typeof newAlertSnoozeUntilMs !== "undefined") {
              newAlertSnoozeUntilMs = 0;
            }
            unacknowledgedAppends.set(o.key, {
              key: o.key,
              round: currentRound,
              tableNumber: o.table_number || o.tableNumber || "",
              customer: o.customer_name || o.customer || "",
              time: Date.now()
            });
          }
        }
        knownOrderRounds.set(o.key, currentRound);
      }
    });

    // NEW orders or newly appended rounds => alert sound
    pendingNewOrders = latestOrders.filter(o => o && o.status === "NEW").slice().sort(sortByPickupTimeAsc);
    if (!isFirstLoad && ((newArrivals.length > 0 && pendingNewOrders.length > 0) || hasNewlyAppendedRound || unacknowledgedAppends.size > 0)) {
      if (typeof startContinuousAlarm === "function") startContinuousAlarm();
    }

    // Auto-print newly arrived orders (with built-in deduplication)
    if (typeof PrinterService !== "undefined" && pendingNewOrders.length > 0) {
      PrinterService.handleIncomingOrders(pendingNewOrders);
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
    .filter(o => o && ["PICKED_UP", "REJECTED", "PAID"].includes(o.status))
    .slice()
    .sort((a, b) => (b?.createdAt || 0) - (a?.createdAt || 0));

  const cLeft = document.getElementById("count-left");
  if (cLeft) cLeft.innerText = String(leftOrders.length);
  const cRight = document.getElementById("count-right");
  if (cRight) cRight.innerText = String(rightOrders.length);

  const sidebarLiveBadge = document.getElementById("sidebar-live-count");
  if (sidebarLiveBadge) {
    const totalLive = leftOrders.length + rightOrders.length;
    if (totalLive > 0) {
      sidebarLiveBadge.innerText = String(totalLive);
      sidebarLiveBadge.style.display = "inline-flex";
    } else {
      sidebarLiveBadge.style.display = "none";
    }
  }

  if (typeof updateDiningFilterStats === "function") {
    updateDiningFilterStats(leftOrders.concat(rightOrders));
  }

  if (activeTab === "live") {
    if (typeof renderListLeft === "function") renderListLeft(leftOrders);
    if (typeof renderListRight === "function") renderListRight(rightOrders);
  } else if (activeTab === "history") {
    if (typeof lastHistoryOrders !== "undefined" && Array.isArray(lastHistoryOrders) && lastHistoryOrders.length > 0) {
      const existingKeys = new Set(lastHistoryOrders.map(o => o.key));
      historyOrders.forEach(o => {
        if (o && o.key && !existingKeys.has(o.key)) {
          lastHistoryOrders.unshift(o);
          existingKeys.add(o.key);
        }
      });
      if (typeof renderHistory === "function") renderHistory(lastHistoryOrders);
    } else if (typeof fetchHistoryOrders === "function") {
      fetchHistoryOrders();
    } else if (typeof renderHistory === "function") {
      renderHistory(historyOrders);
    }
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

window.getTenantIdFromUrl = getTenantIdFromUrl;
window.applyTenantBranding = applyTenantBranding;
window.escapeHtml = escapeHtml;
window.parsePickupTimeMs = parsePickupTimeMs;
window.formatOrderTotal = formatOrderTotal;
window.getOrderEffectiveDineInTimeMs = getOrderEffectiveDineInTimeMs;
window.sortByPickupTimeAsc = sortByPickupTimeAsc;
window.formatEta = formatEta;
window.isOrderElapsedMode = isOrderElapsedMode;
window.formatOrderSubmissionTime = formatOrderSubmissionTime;
window.formatSubmissionElapsedTime = formatSubmissionElapsedTime;
window.formatDineInElapsedTime = formatDineInElapsedTime;
window.formatDineInTimeDisplay = formatDineInTimeDisplay;
window.shortItems = shortItems;
window.countItemsFromContent = countItemsFromContent;
window.formatPickupTimeDisplay = formatPickupTimeDisplay;
window.fetchOrders = fetchOrders;
window.renderAll = renderAll;
window.copyToClipboard = copyToClipboard;
window.closeModal = closeModal;



// ==========================================
// Vertical Sidebar Management (Uber Eats Tablet-First)
// ==========================================
function toggleSidebar(forceState) {
  const sidebar = document.getElementById("app-sidebar");
  if (!sidebar) return;
  const isExpanded = forceState !== undefined ? forceState : !sidebar.classList.contains("expanded");
  sidebar.classList.toggle("expanded", isExpanded);
  try {
    localStorage.setItem("pos_sidebar_expanded", isExpanded ? "1" : "0");
  } catch (e) {}
}

function initSidebarState() {
  const sidebar = document.getElementById("app-sidebar");
  if (!sidebar) return;
  try {
    const saved = localStorage.getItem("pos_sidebar_expanded");
    if (saved === "1") {
      sidebar.classList.add("expanded");
    } else {
      sidebar.classList.remove("expanded");
    }
  } catch (e) {}
}

function updateSidebarActive(tabName) {
  const navItems = document.querySelectorAll(".sidebar-nav-item");
  navItems.forEach(item => {
    const itemTab = item.getAttribute("data-tab");
    item.classList.toggle("active", itemTab === tabName);
  });
  updatePageMainTitle(tabName);
  if (typeof showMainTopbar === "function") showMainTopbar();
}

function updatePageMainTitle(tabName) {
  const titleEl = document.getElementById("page-main-title");
  if (!titleEl) return;
  const currentLangCode = (typeof currentLang !== "undefined" ? currentLang : "zh-TW");
  const titles = {
    "live": currentLangCode === "vi" ? "Đơn hàng" : "訂單",
    "history": currentLangCode === "vi" ? "Lịch sử đơn" : "歷史訂單",
    "menu": currentLangCode === "vi" ? "Quản lý thực đơn" : "菜單管理",
    "settings": currentLangCode === "vi" ? "Cài đặt hệ thống" : "系統設定",
    "reports": currentLangCode === "vi" ? "Báo cáo doanh thu" : "營業報表"
  };
  titleEl.textContent = titles[tabName] || (currentLangCode === "vi" ? "Đơn hàng" : "訂單");
}

// ==========================================
// Smart Hide-on-Scroll Topbar (Auto-collapse on scroll down, reveal on scroll up)
// ==========================================
function initSmartHeaderScroll() {
  const mainTopbar = document.getElementById("main-topbar");
  const mainLayout = document.getElementById("main-layout");
  if (!mainTopbar || !mainLayout) return;

  const lastScrollPositions = new WeakMap();
  let ticking = false;
  const THRESHOLD = 6;

  function showMainTopbar() {
    if (mainTopbar.classList.contains("topbar-hidden")) {
      mainTopbar.classList.remove("topbar-hidden");
    }
  }

  function isModalOverlayActive() {
    const modals = document.querySelectorAll(".modal");
    for (let i = 0; i < modals.length; i++) {
      const m = modals[i];
      if (m.id === "reviewModal") continue; // reviewModal is full-page detail with its own header logic
      if (m.style && (m.style.display === "flex" || m.style.display === "block")) {
        return true;
      }
    }
    return false;
  }

  function hideMainTopbar() {
    // Never hide if store status dropdown menu is open
    const statusDropdown = document.getElementById("store-status-dropdown");
    if (statusDropdown && statusDropdown.classList.contains("open")) {
      return;
    }
    const statusMenu = document.getElementById("store-status-menu");
    if (statusMenu && (statusMenu.classList.contains("show") || statusMenu.style.display === "block")) {
      return;
    }
    // Never hide if a modal is open
    if (isModalOverlayActive()) {
      return;
    }
    if (!mainTopbar.classList.contains("topbar-hidden")) {
      mainTopbar.classList.add("topbar-hidden");
    }
  }

  window.showMainTopbar = showMainTopbar;
  window.hideMainTopbar = hideMainTopbar;

  // 1. Capture-phase scroll listener on all scroll containers in mainLayout
  window.addEventListener("scroll", (e) => {
    const target = e.target;
    if (target && target.closest && target.closest(".modal")) return;

    let st = 0;
    if (target === document || target === window) {
      st = window.pageYOffset || document.documentElement.scrollTop;
    } else if (target && typeof target.scrollTop === "number") {
      st = target.scrollTop;
    } else {
      return;
    }

    if (target && typeof target === "object") {
      target.__latestSt = st;
    }

    if (!ticking) {
      const rAF = (typeof window !== "undefined" && window.requestAnimationFrame) || (cb => setTimeout(cb, 16));
      rAF(() => {
        let currentSt = 0;
        if (target === document || target === window) {
          currentSt = window.pageYOffset || document.documentElement.scrollTop;
        } else if (target && typeof target.scrollTop === "number") {
          currentSt = target.scrollTop;
        }

        const prevSt = lastScrollPositions.get(target) || 0;
        const diff = currentSt - prevSt;

        if (currentSt <= 15) {
          showMainTopbar();
        } else if (Math.abs(diff) >= THRESHOLD) {
          if (diff > 0 && currentSt > 25) {
            hideMainTopbar();
          } else if (diff < 0) {
            showMainTopbar();
          }
        }
        lastScrollPositions.set(target, currentSt);
        ticking = false;
      });
      ticking = true;
    }
  }, { capture: true, passive: true });

  // 2. Touch gesture listener on mainLayout for immediate response on touch screens (iPad / Tablets)
  let touchLastY = 0;

  mainLayout.addEventListener("touchstart", (e) => {
    if (e.touches && e.touches.length === 1) {
      touchLastY = e.touches[0].clientY;
    }
  }, { passive: true });

  mainLayout.addEventListener("touchmove", (e) => {
    if (e.target && e.target.closest && e.target.closest(".modal")) return;
    if (e.touches && e.touches.length === 1) {
      const currentY = e.touches[0].clientY;
      const deltaY = currentY - touchLastY; // > 0: pulling down (scroll up), < 0: pushing up (scroll down)
      touchLastY = currentY;

      if (deltaY > 10) {
        showMainTopbar();
      } else if (deltaY < -10) {
        hideMainTopbar();
      }
    }
  }, { passive: true });

  // 3. Wheel event listener on mainLayout for mouse / trackpad
  mainLayout.addEventListener("wheel", (e) => {
    if (e.target && e.target.closest && e.target.closest(".modal")) return;
    if (Math.abs(e.deltaY) > 5) {
      if (e.deltaY > 0) {
        hideMainTopbar();
      } else if (e.deltaY < 0) {
        showMainTopbar();
      }
    }
  }, { passive: true });
}

window.initSmartHeaderScroll = initSmartHeaderScroll;

window.toggleSidebar = toggleSidebar;
window.initSidebarState = initSidebarState;
window.updateSidebarActive = updateSidebarActive;
window.updatePageMainTitle = updatePageMainTitle;



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
