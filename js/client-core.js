// ==========================================
// Benmi Client Menu - Module: Core, Environment & LIFF Auth
// ==========================================

// --- WORKER BASE & TENANT RESOLUTION ---
const hostname = window.location.hostname;
const isDevEnv = (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname.startsWith("dev.") ||
    hostname.includes(".dev.") ||
    hostname.includes("-dev.") ||
    hostname.startsWith("dev-")
);
const isStagingEnv = (
    hostname.startsWith("staging.") ||
    hostname.includes(".staging.") ||
    hostname.includes("-staging.") ||
    hostname.startsWith("test.") ||
    hostname.includes(".test.") ||
    hostname.includes("-test.")
);
const WORKER_BASE = isDevEnv
    ? "https://platform-worker-dev.thuanmnc.workers.dev"
    : (isStagingEnv
        ? "https://platform-worker-staging.thuanmnc.workers.dev"
        : "https://benmi-worker-official.thuanmnc.workers.dev");

window.isDevEnv = isDevEnv;
window.isStagingEnv = isStagingEnv;
window.WORKER_BASE = WORKER_BASE;

function getTenantIdFromUrl() {
    return typeof extractTenantId === 'function' ? extractTenantId() : (window.__INITIAL_TENANT_ID || "benmi");
}

function escapeHtml(str) {
    return String(str || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}
window.escapeHtml = escapeHtml;

// Shared State Declarations
window.storeConfig = window.storeConfig || null;
window.bootstrapData = window.bootstrapData || null;
window.cart = window.cart || {};
window.customizeData = window.customizeData || {};
window.comboDrinkData = window.comboDrinkData || {};
window.bundleCartData = window.bundleCartData || {};
window.modPriceMap = window.modPriceMap || {};
window.currentPopup = window.currentPopup || null;
window.alertCallback = window.alertCallback || null;
window.isSubmitting = false;
window.currentDiningOption = 'takeaway';
window.isPickupTimeManuallyChanged = false;
window.indexOrdersETag = "";

var storeConfig = window.storeConfig;
var bootstrapData = window.bootstrapData;
var cart = window.cart;
var customizeData = window.customizeData;
var comboDrinkData = window.comboDrinkData;
var currentPopup = window.currentPopup;
var alertCallback = window.alertCallback;
var isPickupTimeManuallyChanged = false;
var indexOrdersETag = "";

var itemTranslations = {
    "燒肉": "Braised Pork",
    "火腿": "Vietnamese Ham",
    "雞肉": "Shredded Chicken",
    "烤肉": "Grilled Meat",
    "雙層烤肉": "Double Cheese & Meat",
    "綜合": "Combination Special",
    "越南咖啡": "Vietnamese Milk Coffee",
    "豆漿": "Soy Milk",
    "紅茶": "Black Tea",
    "可樂": "Coca-Cola",
    "雪碧": "Sprite"
};
window.itemTranslations = itemTranslations;

// Dynamic Modifiers Price Resolution Helpers
function buildModifierPriceMap(bData) {
    const data = bData || window.bootstrapData || (typeof bootstrapData !== 'undefined' ? bootstrapData : null);
    const map = {};
    if (data?.modifiers && Array.isArray(data.modifiers)) {
        data.modifiers.forEach(mod => {
            (mod.options || []).forEach(opt => {
                const p = Number(opt.price) || 0;
                if (opt.name) {
                    const name = String(opt.name).trim();
                    map[name] = p;
                    // Provide dual mapping for option names with or without "加" prefix
                    if (name.startsWith('加')) {
                        const stripped = name.substring(1).trim();
                        if (map[stripped] === undefined) map[stripped] = p;
                    } else {
                        const added = '加' + name;
                        if (map[added] === undefined) map[added] = p;
                    }
                }
                if (opt.id) {
                    map[opt.id] = p;
                }
            });
        });
    }
    window.modPriceMap = map;
    return map;
}

function getModifierPrice(optName) {
    if (!optName) return 0;
    if (!window.modPriceMap || Object.keys(window.modPriceMap).length === 0) {
        buildModifierPriceMap(window.bootstrapData || (typeof bootstrapData !== 'undefined' ? bootstrapData : null));
    }
    const cleanName = String(optName).trim();
    if (window.modPriceMap && window.modPriceMap[cleanName] !== undefined) {
        return window.modPriceMap[cleanName];
    }
    if (cleanName.startsWith('加')) {
        const stripped = cleanName.substring(1).trim();
        if (window.modPriceMap && window.modPriceMap[stripped] !== undefined) {
            return window.modPriceMap[stripped];
        }
    } else {
        const added = '加' + cleanName;
        if (window.modPriceMap && window.modPriceMap[added] !== undefined) {
            return window.modPriceMap[added];
        }
    }
    return 0;
}

// Dining Option State ('takeaway' | 'dine_in')
function setCustomerDiningOption(opt) {
    if (opt !== 'takeaway' && opt !== 'dine_in') return;
    window.currentDiningOption = opt;

    // Sync top segmented switcher
    const btnTopTakeaway = document.getElementById('btn-dining-takeaway');
    const btnTopDinein = document.getElementById('btn-dining-dinein');
    if (btnTopTakeaway) {
        btnTopTakeaway.classList.toggle('active', opt === 'takeaway');
        btnTopTakeaway.setAttribute('aria-selected', opt === 'takeaway');
    }
    if (btnTopDinein) {
        btnTopDinein.classList.toggle('active', opt === 'dine_in');
        btnTopDinein.setAttribute('aria-selected', opt === 'dine_in');
    }

    // Sync checkout section switcher
    const btnChkTakeaway = document.getElementById('checkout-btn-takeaway');
    const btnChkDinein = document.getElementById('checkout-btn-dinein');
    if (btnChkTakeaway) btnChkTakeaway.classList.toggle('active', opt === 'takeaway');
    if (btnChkDinein) btnChkDinein.classList.toggle('active', opt === 'dine_in');

    applyPickupConfig();
}

function toggleStoreHours(e) {
    if (e) e.stopPropagation();
    const displayEl = document.getElementById('store-hours-display');
    const arrowEl = document.getElementById('hours-arrow-icon');
    const toggleTextEl = document.getElementById('hours-toggle-text');
    if (displayEl) {
        const isHidden = (displayEl.style.display === 'none' || !displayEl.style.display);
        displayEl.style.display = isHidden ? 'block' : 'none';
        if (arrowEl) arrowEl.style.transform = isHidden ? 'rotate(180deg)' : 'rotate(0deg)';
        if (toggleTextEl) toggleTextEl.innerText = isHidden ? '收合' : '展開';
    }
}

function renderStoreOperatingHours() {
    const displayEl = document.getElementById('store-hours-display');
    const todayPreviewEl = document.getElementById('hours-today-preview');
    if (!displayEl) return;
    
    const twTime = getTaiwanDate();
    const todayIdx = twTime.getDay();
    
    let todayHoursStr = "";
    let isTodayOpen = false;

    if (storeConfig && storeConfig.operatingHours) {
        const hrs = storeConfig.operatingHours;
        const days = ["週日", "週一", "週二", "週三", "週四", "週五", "週六"];
        let html = "";
        
        const getShiftsStr = (dayIdx) => {
            const shifts = hrs[dayIdx] || [];
            if (shifts.length === 0) return "公休";
            return shifts.map(s => `${s.start}-${s.end}`).join(", ");
        };

        const todayShifts = hrs[todayIdx] || [];
        if (todayShifts.length > 0) {
            todayHoursStr = todayShifts.map(s => `${s.start}-${s.end}`).join(", ");
            isTodayOpen = true;
        } else {
            todayHoursStr = "今日公休";
            isTodayOpen = false;
        }
        
        const monStr = getShiftsStr(1);
        const tueStr = getShiftsStr(2);
        const wedStr = getShiftsStr(3);
        const thuStr = getShiftsStr(4);
        const friStr = getShiftsStr(5);
        const satStr = getShiftsStr(6);
        const sunStr = getShiftsStr(0);
        
        const weekdaysEqual = (monStr === tueStr && tueStr === wedStr && wedStr === thuStr && thuStr === friStr);
        const weekendsEqual = (satStr === sunStr);
        
        if (weekdaysEqual && weekendsEqual) {
            const isWeekday = (todayIdx >= 1 && todayIdx <= 5);
            const tagW = isWeekday ? '<span style="font-size: 11px; background: #ecfdf5; color: #059669; padding: 1px 6px; border-radius: 99px; margin-left: 6px; border: 1px solid #a7f3d0;">今天</span>' : '';
            const tagE = !isWeekday ? '<span style="font-size: 11px; background: #ecfdf5; color: #059669; padding: 1px 6px; border-radius: 99px; margin-left: 6px; border: 1px solid #a7f3d0;">今天</span>' : '';
            html = `<div ${isWeekday ? 'style="font-weight: 700; color: #059669;"' : ''}>週一~週五&nbsp;&nbsp;${monStr}${tagW}</div>
                    <div ${!isWeekday ? 'style="font-weight: 700; color: #059669;"' : ''}>週六、週日&nbsp;&nbsp;${satStr}${tagE}</div>`;
        } else {
            for (let i = 1; i <= 7; i++) {
                const dayIdx = i === 7 ? 0 : i;
                const isCurrentDay = (dayIdx === todayIdx);
                const highlightStyle = isCurrentDay ? 'style="font-weight: 700; color: #059669;"' : '';
                const tag = isCurrentDay ? '<span style="font-size: 11px; background: #ecfdf5; color: #059669; padding: 1px 6px; border-radius: 99px; margin-left: 6px; border: 1px solid #a7f3d0;">今天</span>' : '';
                html += `<div ${highlightStyle}>${days[dayIdx]}&nbsp;&nbsp;${getShiftsStr(dayIdx)}${tag}</div>`;
            }
        }
        displayEl.innerHTML = html;
    } else {
        if (todayIdx >= 1 && todayIdx <= 5) {
            todayHoursStr = "11:00-21:00";
            isTodayOpen = true;
        } else {
            todayHoursStr = "9:00-21:00";
            isTodayOpen = true;
        }
        displayEl.innerHTML = `<div>週一~週五&nbsp;&nbsp;11:00-21:00</div>
                               <div>週六、週日&nbsp;&nbsp;9:00-21:00</div>`;
    }

    if (todayPreviewEl) {
        if (isTodayOpen) {
            todayPreviewEl.innerHTML = `今日 <strong style="color: #111827;">${todayHoursStr}</strong>`;
            todayPreviewEl.style.background = '#f0fdf4';
            todayPreviewEl.style.color = '#059669';
            todayPreviewEl.style.borderColor = '#bbf7d0';
        } else {
            todayPreviewEl.innerHTML = `<strong style="color: #dc2626;">今日公休</strong>`;
            todayPreviewEl.style.background = '#fef2f2';
            todayPreviewEl.style.color = '#dc2626';
            todayPreviewEl.style.borderColor = '#fca5a5';
        }
    }
}

function applyTenantTheme(tenant) {
    if (!tenant) return;
    const tenantId = getTenantIdFromUrl();
    try {
        localStorage.setItem("tenant_branding_" + tenantId, JSON.stringify(tenant));
        localStorage.setItem("tenant_theme_" + tenantId, JSON.stringify(tenant));
    } catch(e) {}
    document.documentElement.style.setProperty('--primary', '#00b900');
    document.documentElement.style.setProperty('--primary-dark', '#009900');
    document.title = (tenant.brandName || "點餐系統") + " 點餐";
    const titleEl = document.getElementById('page-title');
    if (titleEl) titleEl.innerText = (tenant.brandName || "點餐系統") + " 點餐";

    const nameEl = document.getElementById('store-name');
    if (nameEl) nameEl.innerText = tenant.brandName || '';

    const subEl = document.getElementById('store-subtitle');
    if (subEl) subEl.innerHTML = tenant.brandSubtitle ? tenant.brandSubtitle.replace(/\n/g, '<br>') : '';

    const addrEl = document.getElementById('store-address');
    const addrRow = document.getElementById('store-address-row');
    if (addrEl) {
        addrEl.innerText = tenant.storeAddress || '';
        if (addrRow) addrRow.style.display = tenant.storeAddress ? 'flex' : 'none';
    }

    const logoEl = document.getElementById('store-logo');
    const logoWrapper = document.getElementById('store-logo-wrapper');
    if (logoEl) {
        if (tenant.logoUrl) {
            logoEl.src = tenant.logoUrl;
            if (logoWrapper) logoWrapper.style.display = 'flex';
        } else {
            if (logoWrapper) logoWrapper.style.display = 'none';
        }
    }

    const statusEl = document.getElementById('store-status');
    if (statusEl) statusEl.style.display = 'block';

    const hoursRow = document.getElementById('store-hours-row');
    if (hoursRow) hoursRow.style.display = 'flex';

    if (!storeConfig) storeConfig = {};
    if (tenant.parsedHours) {
        storeConfig.operatingHours = tenant.parsedHours;
    } else if (tenant.operatingHours) {
        try {
            storeConfig.operatingHours = typeof tenant.operatingHours === 'string' ? JSON.parse(tenant.operatingHours) : tenant.operatingHours;
        } catch(e) {}
    }
    if (tenant.liffId) storeConfig.liffId = tenant.liffId;
    if (tenant.features) storeConfig.features = tenant.features;
    if (tenant.allowScheduledPickup !== undefined) storeConfig.allowScheduledPickup = tenant.allowScheduledPickup;
    if (tenant.allowDineIn !== undefined) storeConfig.allowDineIn = tenant.allowDineIn;
    window.storeConfig = storeConfig;
    renderStoreOperatingHours();

    const annEl = document.getElementById('store-announcement');
    const annRow = document.getElementById('store-announcement-row');
    if (annEl) {
        annEl.innerText = tenant.announcement || '';
        if (annRow) annRow.style.display = tenant.announcement ? 'flex' : 'none';
    }
}

// --- TIME & TIMEZONE HELPERS ---
function getTaiwanDate() {
    const now = new Date();
    try {
        const formatter = new Intl.DateTimeFormat("en-US", {
            timeZone: "Asia/Taipei",
            year: "numeric", month: "numeric", day: "numeric",
            hour: "numeric", minute: "numeric", second: "numeric",
            hour12: false
        });
        const parts = formatter.formatToParts(now);
        const m = {};
        parts.forEach(p => m[p.type] = p.value);
        const h = parseInt(m.hour, 10) % 24;
        return new Date(parseInt(m.year, 10), parseInt(m.month, 10) - 1, parseInt(m.day, 10), h, parseInt(m.minute, 10), parseInt(m.second, 10));
    } catch (e) {
        const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
        return new Date(utc + (8 * 3600000));
    }
}

function formatTaiwanDateTime(d) {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const hh = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    return {
        dateStr: `${yyyy}-${mm}-${dd}`,
        timeStr: `${hh}:${min}`,
        fullStr: `${yyyy}-${mm}-${dd} ${hh}:${min}`
    };
}

function setTodayDate(forceReset = false) {
    const twNow = getTaiwanDate();
    const { dateStr } = formatTaiwanDateTime(twNow);
    const dateEl = document.getElementById('pickup-date');
    if (dateEl) {
        dateEl.min = dateStr;
        if (forceReset || !dateEl.value || dateEl.value < dateStr) {
            dateEl.value = dateStr;
        }
    }
}

function updateAsapTimeDisplay() {
    const timeEl = document.getElementById('asap-current-time');
    const dineinTimeEl = document.getElementById('dinein-current-time');
    const tw = getTaiwanDate();
    const { fullStr } = formatTaiwanDateTime(tw);
    const isBusy = (storeConfig && storeConfig.storeStatus === 'busy');
    if (timeEl) timeEl.innerText = isBusy ? `${fullStr}（門市繁忙：約 1 小時後完成）` : fullStr;
    if (dineinTimeEl) dineinTimeEl.innerText = fullStr;
}

function applyPickupConfig() {
    const pickerGroup = document.getElementById('pickup-time-picker-group');
    const asapNotice = document.getElementById('pickup-time-asap-notice');
    const dineInNotice = document.getElementById('pickup-time-dinein-notice');
    const diningWrapper = document.getElementById('dining-option-wrapper');
    const checkoutDiningGroup = document.getElementById('checkout-dining-option-group');

    if (window.isAppendMode) {
        window.currentDiningOption = 'dine_in';
        if (diningWrapper) diningWrapper.style.display = 'none';
        if (checkoutDiningGroup) checkoutDiningGroup.style.display = 'none';
    } else {
        const hasDineInFeature = Boolean(storeConfig && Array.isArray(storeConfig.features) && storeConfig.features.includes('dine_in'));
        const isDineInAllowed = hasDineInFeature && !(storeConfig && storeConfig.allowDineIn === false);
        if (!isDineInAllowed) {
            window.currentDiningOption = 'takeaway';
            if (diningWrapper) diningWrapper.style.display = 'none';
            if (checkoutDiningGroup) checkoutDiningGroup.style.display = 'none';
        } else {
            if (diningWrapper) diningWrapper.style.display = 'block';
            if (checkoutDiningGroup) checkoutDiningGroup.style.display = 'block';
        }
    }

    const tableGroup = document.getElementById('dinein-table-input-group');
    const secTitleText = document.getElementById('pickup-time-title-text');

    if (window.currentDiningOption === 'dine_in') {
        if (secTitleText) secTitleText.innerText = '點餐時間';
        if (pickerGroup) pickerGroup.style.display = 'none';
        if (asapNotice) asapNotice.style.display = 'none';
        if (dineInNotice) dineInNotice.style.display = 'block';
        if (tableGroup) tableGroup.style.display = window.isAppendMode ? 'none' : 'block';
        updateAsapTimeDisplay();
    } else {
        if (secTitleText) secTitleText.innerText = '取餐時間';
        if (dineInNotice) dineInNotice.style.display = 'none';
        if (tableGroup) tableGroup.style.display = 'none';
        if (storeConfig && storeConfig.allowScheduledPickup === false) {
            if (pickerGroup) pickerGroup.style.display = 'none';
            if (asapNotice) asapNotice.style.display = 'block';
            updateAsapTimeDisplay();
        } else {
            if (pickerGroup) pickerGroup.style.display = 'block';
            if (asapNotice) asapNotice.style.display = 'none';
            setTodayDate(false);
        }
    }
    checkStoreStatus();
}

// --- SCROLL & NAV ---
var isManualScrollLock = false;
var manualScrollTimeout = null;

function scrollToSec(id) {
    const el = document.getElementById(id);
    if (!el) return;

    isManualScrollLock = true;
    clearTimeout(manualScrollTimeout);
    manualScrollTimeout = setTimeout(() => {
        isManualScrollLock = false;
    }, 900);

    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
    const targetBtn = document.querySelector(`.nav-btn[onclick="scrollToSec('${id}')"]`);
    if (targetBtn) {
        targetBtn.classList.add('active');
        targetBtn.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }

    const navEl = document.getElementById('main-nav');
    const authBar = document.querySelector('.desktop-auth-bar');
    const isDesktop = window.innerWidth >= 1024;
    const authHeight = (isDesktop && authBar && authBar.style.display !== 'none') ? (authBar.offsetHeight || 48) : 0;
    const navHeight = navEl ? (navEl.offsetHeight || 50) : 50;
    const totalOffset = authHeight + navHeight + (isDesktop ? 16 : 8);

    const targetY = el.getBoundingClientRect().top + window.pageYOffset - totalOffset;
    window.scrollTo({ top: Math.max(0, targetY), behavior: 'smooth' });

    document.querySelectorAll('.section-container').forEach(s => s.classList.remove('section-highlight-flash'));
    void el.offsetWidth;
    el.classList.add('section-highlight-flash');
    setTimeout(() => {
        el.classList.remove('section-highlight-flash');
    }, 1300);

    if (typeof updateFooterButtonState === 'function') updateFooterButtonState();
}

function updateActiveNavOnScroll() {
    if (isManualScrollLock) return;

    const sections = Array.from(document.querySelectorAll('.section-container'));
    if (sections.length === 0) return;

    const navEl = document.getElementById('main-nav');
    const authBar = document.querySelector('.desktop-auth-bar');
    const isDesktop = window.innerWidth >= 1024;
    const authHeight = (isDesktop && authBar && authBar.style.display !== 'none') ? (authBar.offsetHeight || 48) : 0;
    const navHeight = navEl ? (navEl.offsetHeight || 50) : 50;
    const scanLine = authHeight + navHeight + 40;

    const isBottom = (window.innerHeight + window.scrollY) >= (document.documentElement.scrollHeight - 60);
    let currentActiveId = null;

    if (isBottom) {
        currentActiveId = sections[sections.length - 1].id;
    } else {
        for (let i = 0; i < sections.length; i++) {
            const rect = sections[i].getBoundingClientRect();
            if (rect.top <= scanLine && rect.bottom > scanLine) {
                currentActiveId = sections[i].id;
                break;
            }
        }
        if (!currentActiveId && sections[0] && sections[0].getBoundingClientRect().top > scanLine) {
            currentActiveId = sections[0].id;
        }
    }

    if (currentActiveId) {
        const targetBtn = document.querySelector(`.nav-btn[onclick="scrollToSec('${currentActiveId}')"]`);
        if (targetBtn && !targetBtn.classList.contains('active')) {
            document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
            targetBtn.classList.add('active');
            targetBtn.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
        }
    }
}

var scrollTimeout = null;
window.addEventListener('scroll', () => {
    if (typeof updateFooterButtonState === 'function') updateFooterButtonState();
    updateActiveNavOnScroll();

    const footerEl = document.querySelector('.footer');
    if (footerEl) {
        if (!footerEl.classList.contains('scrolling')) {
            footerEl.classList.add('scrolling');
        }
        clearTimeout(scrollTimeout);
        scrollTimeout = setTimeout(() => {
            footerEl.classList.remove('scrolling');
        }, 200);
    }
}, { passive: true });

// --- ALERT & MODAL HELPERS ---
function customAlert(msg, callback = null) {
    const msgEl = document.getElementById('custom-alert-message');
    if (msgEl) msgEl.innerHTML = msg;
    const alertBox = document.getElementById('custom-alert');
    if (alertBox) alertBox.style.display = 'flex';
    window.alertCallback = callback;
}

function closeCustomAlert() {
    const alertBox = document.getElementById('custom-alert');
    if (alertBox) alertBox.style.display = 'none';
    if (window.alertCallback) {
        const cb = window.alertCallback;
        window.alertCallback = null;
        cb();
    }
}

function closeAndExitLiff() {
    try {
        if (typeof liff !== 'undefined' && liff.closeWindow) {
            liff.closeWindow();
        }
    } catch (e) {
        console.warn("liff.closeWindow failed:", e);
    }
    try {
        window.close();
    } catch (e) {}
}

function closeDesktopQrModal() {
    const modal = document.getElementById('desktop-qr-modal');
    if (modal) modal.style.display = 'none';
}

function openDesktopQrModal() {
    const modal = document.getElementById('desktop-qr-modal');
    const qrImg = document.getElementById('desktop-qr-img');
    if (qrImg) {
        const currentUrl = encodeURIComponent(window.location.href);
        qrImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${currentUrl}`;
    }
    if (modal) modal.style.display = 'flex';
}

// --- LINE LIFF SINGLETON & DESKTOP AUTH ---
function getCleanLiffRedirectUri() {
    try {
        const url = new URL(window.location.href);
        url.searchParams.delete('code');
        url.searchParams.delete('state');
        url.searchParams.delete('liffClientId');
        url.searchParams.delete('liffRedirectUri');
        url.searchParams.delete('liff.state');
        url.hash = '';

        if (url.pathname === '/index.html') {
            url.pathname = '/';
        }

        const currentTenant = (typeof getTenantIdFromUrl === 'function' ? getTenantIdFromUrl() : window.__INITIAL_TENANT_ID) || 'benmi';
        if (currentTenant) {
            url.searchParams.set('tenant_id', currentTenant);
            url.searchParams.delete('tenant');
        }

        if (url.hostname === 'blabfood.app' || url.hostname === 'www.blabfood.app') {
            url.hostname = 'benmi-order.pages.dev';
        }

        return url.toString();
    } catch (e) {
        return window.location.href;
    }
}
window.getCleanLiffRedirectUri = getCleanLiffRedirectUri;

var liffInitPromise = null;
var isLiffInitialized = false;

function ensureLiffReady() {
    if (isLiffInitialized && typeof liff !== 'undefined') return Promise.resolve(liff);
    if (liffInitPromise) return liffInitPromise;

    liffInitPromise = (async () => {
        if (typeof liff === 'undefined' || typeof liff.init !== 'function') {
            return null;
        }
        if (isLiffInitialized) {
            return liff;
        }

        const tenantId = getTenantIdFromUrl();

        let liffId = storeConfig?.liffId || bootstrapData?.tenant?.liffId;
        if (!liffId) {
            try {
                const cachedBootstrap = localStorage.getItem(`tenant_bootstrap_${tenantId}`);
                if (cachedBootstrap) {
                    const parsed = JSON.parse(cachedBootstrap);
                    liffId = parsed?.tenant?.liffId;
                }
            } catch (e) {}
        }
        if (!liffId) {
            try {
                const cachedTheme = localStorage.getItem(`tenant_theme_${tenantId}`) || localStorage.getItem(`tenant_branding_${tenantId}`);
                if (cachedTheme) {
                    const parsed = JSON.parse(cachedTheme);
                    liffId = parsed?.liffId;
                }
            } catch (e) {}
        }

        if (!liffId) {
            try {
                const sp = new URLSearchParams(window.location.search);
                liffId = sp.get('liffClientId') || sp.get('liff_id');
            } catch (e) {}
        }

        if (!liffId) {
            try {
                if (window.menuPromise) {
                    await window.menuPromise;
                    liffId = storeConfig?.liffId || bootstrapData?.tenant?.liffId;
                } else if (!liffId && typeof fetchMenu === 'function') {
                    await fetchMenu();
                    liffId = storeConfig?.liffId || bootstrapData?.tenant?.liffId;
                }
            } catch (e) {
                console.warn('[LIFF] Wait for bootstrap notice:', e);
            }
        }

        if (!liffId && tenantId === 'benmi') {
            liffId = isDevEnv
                ? "2011224566-kLLdMjkq"
                : (isStagingEnv ? "2009555608-DMioljsI" : "2009560906-c5taZfiY");
        }

        if (!liffId) {
            console.warn(`[LIFF] No liffId found for tenant [${tenantId}]. Running in pure web mode.`);
            liffInitPromise = null;
            return null;
        }

        try {
            await liff.init({ liffId });
            isLiffInitialized = true;
            console.log(`[LIFF] Initialized successfully for tenant [${tenantId}] with ID:`, liffId);

            if (window.location.search && (window.location.search.includes('code=') || window.location.search.includes('liffClientId='))) {
                const cleanUrl = getCleanLiffRedirectUri();
                if (window.history && window.history.replaceState) {
                    window.history.replaceState({}, document.title, cleanUrl);
                }
            }
        } catch (initErr) {
            console.warn('[LIFF] Init error for tenant [' + tenantId + ']:', initErr);
            isLiffInitialized = false;
            liffInitPromise = null;
            throw initErr;
        }
        return liff;
    })();

    return liffInitPromise;
}
window.ensureLiffReady = ensureLiffReady;

function isDesktopOutsideLiff() {
    if (!isLiffInitialized || typeof liff === 'undefined' || typeof liff.isInClient !== 'function') {
        const ua = (typeof navigator !== 'undefined' && navigator.userAgent) ? navigator.userAgent : '';
        const isLine = /Line\//i.test(ua);
        const isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(ua);
        return !isLine && !isMobile;
    }
    try {
        return !liff.isInClient();
    } catch(e) {
        return false;
    }
}

function checkDesktopAuthGuard() {
    if (isDesktopOutsideLiff()) {
        let isLoggedIn = false;
        try {
            if (isLiffInitialized && typeof liff !== 'undefined' && typeof liff.isLoggedIn === 'function') {
                isLoggedIn = liff.isLoggedIn();
            }
        } catch(e) {}
        if (!isLoggedIn) {
            openDesktopLoginModal();
            return false;
        }
    }
    return true;
}

function openDesktopLoginModal() {
    const modal = document.getElementById('desktop-center-auth-overlay');
    if (modal) modal.style.display = 'flex';
}

function closeDesktopLoginModal() {
    const modal = document.getElementById('desktop-center-auth-overlay');
    if (modal) modal.style.display = 'none';
}

async function triggerDesktopLineLogin() {
    await ensureLiffReady();
    if (typeof liff !== 'undefined' && liff.login) {
        const tenantId = getTenantIdFromUrl();
        const storageKey = `cart_save_${tenantId}`;
        try {
            sessionStorage.setItem('current_tenant_id', tenantId);
            if (tenantId && tenantId !== 'benmi') {
                localStorage.setItem('current_tenant_id', tenantId);
                localStorage.setItem('benmi_last_tenant_id', tenantId);
            }
            localStorage.setItem(storageKey, JSON.stringify({ cart: window.cart, customizeData: window.customizeData, comboDrinkData: window.comboDrinkData, bundleCartData: window.bundleCartData || {} }));
        } catch(e) {}
        const cleanRedirectUri = getCleanLiffRedirectUri();
        try {
            liff.login({ redirectUri: cleanRedirectUri });
        } catch (loginErr) {
            console.warn('[LIFF] Desktop login with redirectUri notice:', loginErr);
            try {
                liff.login();
            } catch (fallbackErr) {
                console.error('[LIFF] Desktop fallback login error:', fallbackErr);
            }
        }
    }
}

async function updateDesktopAuthUI() {
    const bar = document.getElementById('desktop-auth-bar');
    const centerOverlay = document.getElementById('desktop-center-auth-overlay');
    const pageBody = document.getElementById('page-body-content');

    await ensureLiffReady();

    if (!isDesktopOutsideLiff()) {
        if (bar) bar.style.display = 'none';
        if (centerOverlay) centerOverlay.style.display = 'none';
        if (pageBody) pageBody.classList.remove('desktop-guest-locked');
        return;
    }

    const loggedInEl = document.getElementById('desktop-auth-logged-in');
    const loggedOutEl = document.getElementById('desktop-auth-logged-out');

    let isLoggedIn = false;
    try {
        if (isLiffInitialized && typeof liff !== 'undefined' && typeof liff.isLoggedIn === 'function') {
            isLoggedIn = liff.isLoggedIn();
        }
    } catch(e) {
        console.warn('[LIFF] isLoggedIn check notice:', e);
    }

    if (isLoggedIn) {
        if (bar) bar.style.display = 'block';
        if (loggedOutEl) loggedOutEl.style.display = 'none';
        if (loggedInEl) loggedInEl.style.display = 'flex';
        if (centerOverlay) centerOverlay.style.display = 'none';
        if (pageBody) pageBody.classList.remove('desktop-guest-locked');

        try {
            const profile = await liff.getProfile();
            if (profile) {
                const nameEl = document.getElementById('desktop-user-name');
                if (nameEl) nameEl.innerText = profile.displayName || '顧客';
                const avatarEl = document.getElementById('desktop-user-avatar');
                const placeholderEl = document.getElementById('desktop-user-placeholder-icon');
                if (profile.pictureUrl && avatarEl) {
                    avatarEl.src = profile.pictureUrl;
                    avatarEl.style.display = 'inline-block';
                    if (placeholderEl) placeholderEl.style.display = 'none';
                }
            }
        } catch(e) {}
    } else {
        if (bar) bar.style.display = 'none';
        if (loggedInEl) loggedInEl.style.display = 'none';
        if (loggedOutEl) loggedOutEl.style.display = 'none';
        if (centerOverlay) centerOverlay.style.display = 'flex';
        if (pageBody) pageBody.classList.add('desktop-guest-locked');
    }
}

// --- STORE STATUS & BUSINESS HOURS ---
function isStoreOpen(twTime) {
    if (!storeConfig || !storeConfig.operatingHours) {
        const day = twTime.getDay();
        const hours = twTime.getHours();
        const minutes = twTime.getMinutes();
        const timeValue = hours + minutes / 60;
        if (day >= 1 && day <= 5) {
            return (timeValue >= 11 && timeValue < 21);
        } else {
            return (timeValue >= 9 && timeValue < 21);
        }
    }
    
    const day = twTime.getDay();
    const hours = twTime.getHours();
    const minutes = twTime.getMinutes();
    const timeValue = hours + minutes / 60;
    
    const shifts = storeConfig.operatingHours[day] || [];
    for (let shift of shifts) {
        if (!shift || !shift.start || !shift.end) continue;
        const [sH, sM] = shift.start.split(':').map(Number);
        const [eH, eM] = shift.end.split(':').map(Number);
        const startVal = sH + sM / 60;
        let endVal = eH + eM / 60;
        
        if (shift.end === '00:00' || shift.end === '24:00' || (eH === 0 && eM === 0) || (startVal >= 12 && eH === 12 && eM === 0)) {
            endVal = 24.0;
        }
        
        if (endVal > startVal) {
            if (timeValue >= startVal && timeValue < endVal) {
                return true;
            }
        } else {
            if (timeValue >= startVal) {
                return true;
            }
        }
    }
    
    const yesterday = (day + 6) % 7;
    const yesterdayShifts = storeConfig.operatingHours[yesterday] || [];
    for (let shift of yesterdayShifts) {
        if (!shift || !shift.start || !shift.end) continue;
        const [sH, sM] = shift.start.split(':').map(Number);
        const [eH, eM] = shift.end.split(':').map(Number);
        const startVal = sH + sM / 60;
        let endVal = eH + eM / 60;
        if (shift.end === '00:00' || shift.end === '24:00' || (eH === 0 && eM === 0) || (startVal >= 12 && eH === 12 && eM === 0)) {
            endVal = 24.0;
        }
        if (endVal < startVal && timeValue < endVal) {
            return true;
        }
    }
    
    return false;
}

function checkStoreStatus() {
    const twTime = getTaiwanDate();
    const isOpen = isStoreOpen(twTime);
    const statusEl = document.getElementById('store-status');
    const pausedBanner = document.getElementById('store-paused-banner');
    const busyBanner = document.getElementById('store-busy-banner');
    const submitBtn = document.getElementById('btn-submit');
    const storeStatus = (storeConfig && storeConfig.storeStatus) ? storeConfig.storeStatus : 'open';

    if (storeStatus === 'paused') {
        if (statusEl) {
            statusEl.innerText = '暫停接單';
            statusEl.className = 'store-status paused';
        }
        if (pausedBanner) pausedBanner.style.display = 'flex';
        if (busyBanner) busyBanner.style.display = 'none';
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.innerText = '店家目前暫停接單';
            submitBtn.style.background = '#9ca3af';
            submitBtn.style.cursor = 'not-allowed';
        }
    } else if (storeStatus === 'busy') {
        if (statusEl) {
            statusEl.innerText = isOpen ? '繁忙中 (+1h)' : '休息中';
            statusEl.className = isOpen ? 'store-status busy' : 'store-status closed';
        }
        if (pausedBanner) pausedBanner.style.display = 'none';
        if (busyBanner) busyBanner.style.display = 'flex';
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerText = '確認下單';
            submitBtn.style.background = '';
            submitBtn.style.cursor = '';
        }
    } else {
        if (statusEl) {
            statusEl.innerText = isOpen ? '營業中' : '休息中';
            statusEl.className = isOpen ? 'store-status' : 'store-status closed';
        }
        if (pausedBanner) pausedBanner.style.display = 'none';
        if (busyBanner) busyBanner.style.display = 'none';
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerText = '確認下單';
            submitBtn.style.background = '';
            submitBtn.style.cursor = '';
        }
    }
}

async function fetchWaitingCounter() {
    try {
        const headers = {};
        if (indexOrdersETag) headers["If-None-Match"] = indexOrdersETag;
        const tenantId = getTenantIdFromUrl();
        const res = await fetch(`${WORKER_BASE}/api/orders/waiting-count?tenant_id=${tenantId}`, { headers });
        if (res.status === 304 || !res.ok) return;

        const etag = res.headers.get("ETag");
        if (etag) indexOrdersETag = etag;

        const data = await res.json();
        const badge = document.getElementById("waiting-counter-badge");
        if (badge) {
            const count = data.waitingCount || 0;
            if (count > 0) {
                badge.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg> <span>前方排隊：<strong style="color: #78350f; font-size: 15px;">${count}</strong> 單</span>`;
                badge.style.display = "inline-flex";
            } else {
                badge.style.display = "none";
            }
        }
    } catch (e) {
        console.error("Error fetching waiting counter:", e);
    }
}

// --- INIT APP BOOTLOADER ---
async function initApp() {
    if (window.__appInitialized) return;
    window.__appInitialized = true;
    setTodayDate(true);
    updateAsapTimeDisplay();
    renderStoreOperatingHours();
    const tenantId = getTenantIdFromUrl();

    // 1. Instant 0ms Hydration from LocalStorage for repeat visits
    try {
        const cachedRaw = localStorage.getItem(`tenant_bootstrap_${tenantId}`);
        if (cachedRaw) {
            const parsed = JSON.parse(cachedRaw);
            if (parsed && parsed.tenant) {
                bootstrapData = parsed;
                window.bootstrapData = parsed;
                if (typeof buildModifierPriceMap === 'function') {
                    buildModifierPriceMap(parsed);
                }
                storeConfig = {
                    allowScheduledPickup: parsed.tenant.allowScheduledPickup,
                    allowDineIn: parsed.tenant.allowDineIn,
                    features: parsed.tenant.features || [],
                    orderPrefix: parsed.tenant.orderPrefix,
                    storeStatus: parsed.tenant.storeStatus,
                    operatingHours: parsed.tenant.parsedHours,
                    liffId: parsed.tenant.liffId
                };
                window.storeConfig = storeConfig;
                applyTenantTheme(parsed.tenant);
                if (typeof renderDynamicCatalog === 'function') renderDynamicCatalog();
                renderStoreOperatingHours();
                applyPickupConfig();
            }
        }
    } catch(e) {
        console.warn('[Cache] Instant hydration notice:', e);
    }

    // 2. Fetch fresh bootstrap in background (Stale-While-Revalidate)
    window.menuPromise = (typeof fetchMenu === 'function' ? fetchMenu() : Promise.resolve()).then(() => {
        if (typeof renderDynamicCatalog === 'function') renderDynamicCatalog();
        renderStoreOperatingHours();
        applyPickupConfig();
    }).catch(err => {
        console.warn('[MenuPromise] Background refresh notice:', err);
    });

    // 3. Initialize LIFF asynchronously via Singleton Gate
    ensureLiffReady().then(() => {
        updateDesktopAuthUI();
    });

    await window.menuPromise;

    if (typeof initAppendModeIfPresent === 'function') {
        initAppendModeIfPresent();
    }
    if (typeof initEditOrderModeIfPresent === 'function') {
        initEditOrderModeIfPresent();
    }
    applyPickupConfig();

    try {
        const urlParams = new URLSearchParams(window.location.search);
        const isEditOrderUrl = urlParams.get('mode') === 'edit_order' || urlParams.get('mode') === 'edit';
        if (!window.isEditOrderMode && !isEditOrderUrl) {
            const saved = localStorage.getItem(`cart_save_${tenantId}`);
            if (saved) {
                const parsed = JSON.parse(saved);
                cart = parsed.cart || {};
                window.cart = cart;
                customizeData = parsed.customizeData || {};
                window.customizeData = customizeData;
                comboDrinkData = parsed.comboDrinkData || {};
                window.comboDrinkData = comboDrinkData;
                window.bundleCartData = parsed.bundleCartData || {};
                localStorage.removeItem(`cart_save_${tenantId}`);
                if (typeof updateQty === 'function') {
                    for (let key in cart) {
                        if (cart[key] > 0 && typeof parseCartKey === 'function') {
                            const { catSlug, origName } = parseCartKey(key);
                            updateQty(catSlug, origName, 0);
                        }
                    }
                }
            }
        }
    } catch(e) {}

    setTodayDate(true);
    checkStoreStatus();
    setInterval(checkStoreStatus, 60000);
    if (typeof fetchMenu === 'function') setInterval(fetchMenu, 10000);
    fetchWaitingCounter();
    setInterval(fetchWaitingCounter, 30000);
    setInterval(updateAsapTimeDisplay, 1000);
    setInterval(() => setTodayDate(false), 30000);

    window.addEventListener('pageshow', () => {
        setTodayDate(true);
    });
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
            setTodayDate(false);
        }
    });
}

// Window Public Bindings
window.getTenantIdFromUrl = getTenantIdFromUrl;
window.setCustomerDiningOption = setCustomerDiningOption;
window.toggleStoreHours = toggleStoreHours;
window.renderStoreOperatingHours = renderStoreOperatingHours;
window.applyTenantTheme = applyTenantTheme;
window.getTaiwanDate = getTaiwanDate;
window.formatTaiwanDateTime = formatTaiwanDateTime;
window.setTodayDate = setTodayDate;
window.updateAsapTimeDisplay = updateAsapTimeDisplay;
window.applyPickupConfig = applyPickupConfig;
window.scrollToSec = scrollToSec;
window.updateActiveNavOnScroll = updateActiveNavOnScroll;
window.customAlert = customAlert;
window.closeCustomAlert = closeCustomAlert;
window.closeAndExitLiff = closeAndExitLiff;
window.closeDesktopQrModal = closeDesktopQrModal;
window.openDesktopQrModal = openDesktopQrModal;
window.isDesktopOutsideLiff = isDesktopOutsideLiff;
window.checkDesktopAuthGuard = checkDesktopAuthGuard;
window.openDesktopLoginModal = openDesktopLoginModal;
window.closeDesktopLoginModal = closeDesktopLoginModal;
window.triggerDesktopLineLogin = triggerDesktopLineLogin;
window.updateDesktopAuthUI = updateDesktopAuthUI;
window.isStoreOpen = isStoreOpen;
window.checkStoreStatus = checkStoreStatus;
window.fetchWaitingCounter = fetchWaitingCounter;
window.initApp = initApp;
window.buildModifierPriceMap = buildModifierPriceMap;
window.getModifierPrice = getModifierPrice;
