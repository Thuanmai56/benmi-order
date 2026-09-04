// ==========================================
// Benmi POS - Module: Store Settings & Hours
// ==========================================

let currentStoreStatus = 'open';
let storeOperatingHours = null;
let allowScheduledPickup = true;
let currentTenantFeatures = [];
window.currentTenantFeatures = currentTenantFeatures;

const DAY_NAMES = {
  "zh-TW": ["星期日", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六"],
  "vi": ["Chủ nhật", "Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7"]
};

function toggleStoreStatusMenu(e) {
  if (e) e.stopPropagation();
  const dd = document.getElementById("store-status-dropdown");
  if (dd) dd.classList.toggle("open");
}

// Click outside to close store status menu
document.addEventListener("click", (e) => {
  const dd = document.getElementById("store-status-dropdown");
  if (dd && !dd.contains(e.target)) {
    dd.classList.remove("open");
  }
});

function renderStoreStatusUI(status) {
  currentStoreStatus = status || 'open';
  const btn = document.getElementById("store-status-btn");
  const label = document.getElementById("store-status-label");
  
  if (btn) {
    btn.className = `store-status-pill ${currentStoreStatus}`;
  }
  if (label) {
    if (currentStoreStatus === 'open') label.innerText = t('statusOpen');
    else if (currentStoreStatus === 'busy') label.innerText = t('statusBusy');
    else if (currentStoreStatus === 'paused') label.innerText = t('statusPaused');
  }

  // Update options in dropdown menu
  document.querySelectorAll(".status-option").forEach(opt => {
    opt.classList.toggle("active", opt.dataset.status === currentStoreStatus);
  });

  // Update boxes in Settings panel
  document.querySelectorAll(".status-select-box").forEach(box => {
    box.classList.toggle("active", box.id === `status-box-${currentStoreStatus}`);
  });
}

async function setStoreStatus(newStatus) {
  if (!['open', 'busy', 'paused'].includes(newStatus)) return;
  const prevStatus = currentStoreStatus;
  renderStoreStatusUI(newStatus);
  const dd = document.getElementById("store-status-dropdown");
  if (dd) dd.classList.remove("open");

  try {
    const res = await fetch(`${WORKER_BASE}/api/config?tenant_id=${getTenantIdFromUrl()}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ storeStatus: newStatus })
    });
    if (!res.ok) throw new Error("API returned " + res.status);
  } catch (e) {
    alert(t("saveFail") + e.message);
    renderStoreStatusUI(prevStatus);
  }
}

function ensureParsedOperatingHours(raw) {
  if (!raw) return createDefaultOperatingHours();
  if (typeof raw === 'string') {
    try {
      raw = JSON.parse(raw);
    } catch {
      const match = raw.match(/(\d{1,2}:\d{2})\s*[-~至到]\s*(\d{1,2}:\d{2})/);
      const start = match ? match[1].padStart(5, '0') : "11:00";
      const end = match ? match[2].padStart(5, '0') : "21:00";
      const res = {};
      for (let i = 0; i < 7; i++) res[i] = [{ start, end }];
      return res;
    }
  }
  if (typeof raw === 'object' && raw !== null) {
    const res = {};
    for (let i = 0; i < 7; i++) {
      const s = raw[i] || raw[String(i)] || [];
      res[i] = Array.isArray(s) ? s : [];
    }
    return res;
  }
  return createDefaultOperatingHours();
}

async function loadStoreStatus() {
  try {
    const res = await fetch(`${WORKER_BASE}/api/config?tenant_id=${getTenantIdFromUrl()}&_t=${Date.now()}`);
    if (res.ok) {
      const data = await res.json();
      if (data.storeStatus) {
        currentStoreStatus = data.storeStatus;
      }
      if (data.allowScheduledPickup !== undefined) {
        allowScheduledPickup = data.allowScheduledPickup;
      }
      if (data.allowDineIn !== undefined) {
        allowDineIn = data.allowDineIn;
      }
      if (data.features) {
        currentTenantFeatures = Array.isArray(data.features) ? data.features : (typeof data.features === 'string' ? JSON.parse(data.features) : []);
        window.currentTenantFeatures = currentTenantFeatures;
      }
      storeOperatingHours = ensureParsedOperatingHours(data.operatingHours);
    }
  } catch (e) {
    console.error("loadStoreStatus error:", e);
  }
  renderStoreStatusUI(currentStoreStatus);
  if (typeof updateDiningFilterStats === "function" && typeof orders !== "undefined") {
    updateDiningFilterStats(orders);
  }
  renderLanguageSetting();
  renderDineInSetting();
  renderReportsSetting();
}

function openSettings() {
  activeTab = "settings";
  document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
  document.querySelectorAll(".mini-btn").forEach(t => t.classList.remove("active"));
  const tabSettings = document.getElementById("tab-settings");
  if (tabSettings) tabSettings.classList.add("active");
  document.querySelectorAll(".content").forEach(c => c.style.display = "none");
  const viewSettings = document.getElementById("view-settings");
  if (viewSettings) viewSettings.style.display = "block";
  loadOperatingHours();
  renderLanguageSetting();
  renderDineInSetting();
  renderReportsSetting();
  renderStorePairingSection();
  loadPOSPrinterSettings();
  initSettingsScrollSpy();
}

async function loadOperatingHours() {
  try {
    const res = await fetch(`${WORKER_BASE}/api/config?tenant_id=${getTenantIdFromUrl()}&_t=${Date.now()}`);
    if (res.ok) {
      const data = await res.json();
      storeOperatingHours = ensureParsedOperatingHours(data.operatingHours);
      allowScheduledPickup = data.allowScheduledPickup !== undefined ? data.allowScheduledPickup : true;
      allowDineIn = data.allowDineIn !== undefined ? data.allowDineIn : true;
      if (data.features) {
        currentTenantFeatures = Array.isArray(data.features) ? data.features : (typeof data.features === 'string' ? JSON.parse(data.features) : []);
        window.currentTenantFeatures = currentTenantFeatures;
      }
      if (data.storeStatus) currentStoreStatus = data.storeStatus;
      if (data.storeAddress !== undefined) {
        const addrInput = document.getElementById("setting-store-address-input");
        if (addrInput) addrInput.value = data.storeAddress || "";
      }
      if (data.announcement !== undefined) {
        const annInput = document.getElementById("setting-store-announcement-input");
        if (annInput) annInput.value = data.announcement || "";
      }
      if (data.logoUrl) {
        currentStoreLogoUrl = data.logoUrl;
        renderStoreLogoUI(data.logoUrl);
      } else {
        currentStoreLogoUrl = null;
        renderStoreLogoUI(null);
      }
    } else {
      storeOperatingHours = createDefaultOperatingHours();
      allowScheduledPickup = true;
      allowDineIn = true;
      renderStoreLogoUI(null);
    }
  } catch (e) {
    storeOperatingHours = createDefaultOperatingHours();
    allowScheduledPickup = true;
    allowDineIn = true;
    renderStoreLogoUI(null);
  }
  renderStoreStatusUI(currentStoreStatus);
  renderOperatingHours();
  renderScheduledPickupSetting();
  renderDineInSetting();
}

function renderScheduledPickupSetting() {
  const radioTrue = document.getElementById("setting-allow-scheduled-true");
  const radioFalse = document.getElementById("setting-allow-scheduled-false");
  if (radioTrue && radioFalse) {
    radioTrue.checked = (allowScheduledPickup === true);
    radioFalse.checked = (allowScheduledPickup === false);
  }
  updateModeCardStyles(allowScheduledPickup);
}

function updateModeCardStyles(isScheduled) {
  const cardScheduled = document.getElementById("mode-card-scheduled");
  const cardAsap = document.getElementById("mode-card-asap");
  if (cardScheduled && cardAsap) {
    if (isScheduled) {
      cardScheduled.style.borderColor = "var(--primary)";
      cardScheduled.style.background = "rgba(0, 185, 0, 0.05)";
      cardAsap.style.borderColor = "var(--border)";
      cardAsap.style.background = "#fff";
    } else {
      cardAsap.style.borderColor = "var(--primary)";
      cardAsap.style.background = "rgba(0, 185, 0, 0.05)";
      cardScheduled.style.borderColor = "var(--border)";
      cardScheduled.style.background = "#fff";
    }
  }
}

function onPickupModeChange(isScheduled) {
  allowScheduledPickup = isScheduled;
  updateModeCardStyles(isScheduled);
}

async function saveScheduledPickupSetting() {
  const btn = document.getElementById("btn-save-pickup-setting");
  const oldText = btn ? btn.innerText : "";
  if (btn) { btn.innerText = t("saving"); btn.disabled = true; }
  try {
    const res = await fetch(`${WORKER_BASE}/api/config?tenant_id=${getTenantIdFromUrl()}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ allowScheduledPickup: allowScheduledPickup })
    });
    if (!res.ok) throw new Error("API returned " + res.status);
    alert(t("saveSuccess"));
  } catch (e) {
    alert(t("saveFail") + e.message);
  } finally {
    if (btn) { btn.innerText = oldText; btn.disabled = false; }
  }
}

function updateTocFeatureItem(tocId, labelId, i18nKey, unlockedSvg, isFeatureEnabled) {
  const tocItem = document.getElementById(tocId);
  if (!tocItem) return;
  const lockSvg = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>`;
  const targetSvg = isFeatureEnabled ? unlockedSvg : lockSvg;
  
  const iconBox = tocItem.querySelector(".toc-icon-box");
  const label = document.getElementById(labelId);
  const chevron = tocItem.querySelector(".toc-chevron");

  if (!iconBox || !label || !chevron) {
    tocItem.innerHTML = `
      <div class="toc-icon-box">${targetSvg}</div>
      <span class="toc-item-label" id="${labelId}">${typeof t === 'function' ? t(i18nKey) : ''}</span>
      <svg class="toc-chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="9 18 15 12 9 6"></polyline>
      </svg>
    `;
  } else {
    iconBox.innerHTML = targetSvg;
    if (typeof t === 'function') label.innerText = t(i18nKey);
  }
}

function renderDineInSetting() {
  const isFeatureEnabled = Array.isArray(window.currentTenantFeatures)
    ? window.currentTenantFeatures.includes('dine_in')
    : (Array.isArray(currentTenantFeatures) ? currentTenantFeatures.includes('dine_in') : false);

  const unlockedBody = document.getElementById("setting-dinein-unlocked-body");
  const lockedBody = document.getElementById("setting-dinein-locked-body");
  const saveBtn = document.getElementById("btn-save-dinein-setting");

  const DINEIN_SVG = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 2v6a3 3 0 0 1-3 3 3 3 0 0 1-3-3V2"></path><path d="M15 2v10"></path><path d="M15 14v8"></path><path d="M6 2v20"></path><path d="M6 2a3 3 0 0 1 3 3v3a3 3 0 0 1-3 3"></path></svg>`;
  updateTocFeatureItem("toc-item-dinein", "i18n-toc-dinein", "tocDineIn", DINEIN_SVG, isFeatureEnabled);

  if (!isFeatureEnabled) {
    if (unlockedBody) unlockedBody.style.display = "none";
    if (lockedBody) lockedBody.style.display = "flex";
    if (saveBtn) saveBtn.style.display = "none";
    return;
  }

  if (unlockedBody) unlockedBody.style.display = "flex";
  if (lockedBody) lockedBody.style.display = "none";
  if (saveBtn) saveBtn.style.display = "block";

  const radioTrue = document.getElementById("setting-allow-dinein-true");
  const radioFalse = document.getElementById("setting-allow-dinein-false");
  if (radioTrue && radioFalse) {
    radioTrue.checked = (allowDineIn === true);
    radioFalse.checked = (allowDineIn === false);
  }
  updateDineInCardStyles(allowDineIn);
}

function updateDineInCardStyles(isAllowed) {
  const cardTrue = document.getElementById("mode-card-dinein-true");
  const cardFalse = document.getElementById("mode-card-dinein-false");
  if (cardTrue && cardFalse) {
    if (isAllowed) {
      cardTrue.style.borderColor = "var(--primary)";
      cardTrue.style.background = "rgba(0, 185, 0, 0.05)";
      cardFalse.style.borderColor = "var(--border)";
      cardFalse.style.background = "#fff";
    } else {
      cardFalse.style.borderColor = "var(--primary)";
      cardFalse.style.background = "rgba(0, 185, 0, 0.05)";
      cardTrue.style.borderColor = "var(--border)";
      cardTrue.style.background = "#fff";
    }
  }
}

function onDineInModeChange(isAllowed) {
  allowDineIn = isAllowed;
  updateDineInCardStyles(isAllowed);
}

async function saveDineInSetting() {
  const btn = document.getElementById("btn-save-dinein-setting");
  const oldText = btn ? btn.innerText : "";
  if (btn) { btn.innerText = t("saving"); btn.disabled = true; }
  try {
    const res = await fetch(`${WORKER_BASE}/api/config?tenant_id=${getTenantIdFromUrl()}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ allowDineIn: allowDineIn })
    });
    if (!res.ok) throw new Error("API returned " + res.status);
    alert(t("dineInSaveSuccess") || t("saveSuccess"));
  } catch (e) {
    alert((t("dineInSaveFail") || t("saveFail")) + e.message);
  } finally {
    if (btn) { btn.innerText = oldText; btn.disabled = false; }
  }
}

function createDefaultOperatingHours() {
  let hrs = {};
  for (let i = 0; i < 7; i++) hrs[i] = [{ start: "08:00", end: "21:00" }];
  return hrs;
}

function renderOperatingHours() {
  const container = document.getElementById("hours-settings-list") || document.getElementById("settings-hours-container");
  if (!container) return;
  container.innerHTML = "";
  const dayNamesList = DAY_NAMES[currentLang] || DAY_NAMES["zh-TW"];
  for (let i = 1; i <= 7; i++) {
    const dayIdx = i === 7 ? 0 : i;
    const shifts = (storeOperatingHours && storeOperatingHours[dayIdx]) || [];
    const isOpen = shifts.length > 0;
    const row = document.createElement("div");
    row.style.cssText = "background: #fff; border: 1.5px solid var(--border, #e2e8f0); border-radius: 12px; padding: 14px 16px; transition: all 0.15s ease;";
    let shiftsHtml = "";
    shifts.forEach((shift, sIdx) => {
      shiftsHtml += `
        <div style="display:flex; gap:10px; align-items:center; margin-top:10px;">
          <input type="time" id="sh-start-${dayIdx}-${sIdx}" value="${shift.start}" style="flex:1; padding:8px 12px; font-family:inherit; border:1.5px solid var(--border, #cbd5e1); border-radius:8px; font-size:15px; font-weight:600; outline:none;">
          <span style="font-weight:900; color:#64748b;">-</span>
          <input type="time" id="sh-end-${dayIdx}-${sIdx}" value="${shift.end}" style="flex:1; padding:8px 12px; font-family:inherit; border:1.5px solid var(--border, #cbd5e1); border-radius:8px; font-size:15px; font-weight:600; outline:none;">
          <button type="button" onclick="removeShift(${dayIdx}, ${sIdx})" style="background:#fee2e2; border:1px solid #fca5a5; color:#dc2626; cursor:pointer; font-size:16px; width:34px; height:34px; border-radius:8px; display:flex; align-items:center; justify-content:center; flex-shrink:0;">✕</button>
        </div>`;
    });
    row.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <label style="display:flex; align-items:center; gap:10px; cursor:pointer; font-size:16px; font-weight:800; color:#1e293b;">
          <input type="checkbox" ${isOpen ? 'checked' : ''} onchange="toggleDayStatus(${dayIdx}, this.checked)" style="width:20px; height:20px; accent-color:var(--primary, #00b900);">
          <span style="color:${isOpen ? '#0f172a' : '#94a3b8'};">${dayNamesList[dayIdx]}</span>
        </label>
        ${isOpen ? `<button type="button" onclick="addShift(${dayIdx})" style="font-size:13px; background:#eff6ff; color:#2563eb; border:1px solid #bfdbfe; padding:6px 12px; border-radius:8px; cursor:pointer; font-weight:800;">${t('btnAddShift')}</button>` : `<span style="font-size:13px; color:#ef4444; font-weight:800; background:#fef2f2; padding:4px 8px; border-radius:6px; border:1px solid #fee2e2;">${t('closedDay')}</span>`}
      </div>
      ${isOpen ? `<div id="shifts-box-${dayIdx}">${shiftsHtml}</div>` : ''}`;
    container.appendChild(row);
  }
}

function syncOperatingHoursFromDOM() {
  if (!storeOperatingHours) return;
  for (let i = 0; i < 7; i++) {
    const shifts = storeOperatingHours[i];
    if (shifts && shifts.length > 0) {
      shifts.forEach((shift, sIdx) => {
        const elStart = document.getElementById(`sh-start-${i}-${sIdx}`);
        const elEnd = document.getElementById(`sh-end-${i}-${sIdx}`);
        if (elStart && elEnd) { shift.start = elStart.value; shift.end = elEnd.value; }
      });
    }
  }
}

function toggleDayStatus(dayIdx, isChecked) {
  if (!storeOperatingHours) storeOperatingHours = createDefaultOperatingHours();
  storeOperatingHours[dayIdx] = isChecked ? [{ start: "08:00", end: "21:00" }] : [];
  renderOperatingHours();
}

function addShift(dayIdx) {
  if (!storeOperatingHours) storeOperatingHours = createDefaultOperatingHours();
  syncOperatingHoursFromDOM();
  if (!storeOperatingHours[dayIdx]) storeOperatingHours[dayIdx] = [];
  storeOperatingHours[dayIdx].push({ start: "12:00", end: "13:00" });
  renderOperatingHours();
}

function removeShift(dayIdx, sIdx) {
  if (!storeOperatingHours) return;
  syncOperatingHoursFromDOM();
  if (storeOperatingHours[dayIdx]) {
    storeOperatingHours[dayIdx].splice(sIdx, 1);
  }
  renderOperatingHours();
}

async function saveOperatingHours() {
  syncOperatingHoursFromDOM();
  const btn = document.getElementById("btn-save-hours");
  const oldText = btn ? btn.innerText : "";
  if (btn) { btn.innerText = t("saving"); btn.disabled = true; }
  try {
    const res = await fetch(`${WORKER_BASE}/api/config?tenant_id=${getTenantIdFromUrl()}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ operatingHours: storeOperatingHours })
    });
    if (!res.ok) throw new Error("API returned " + res.status);
    alert(t("saveSuccess"));
  } catch (e) {
    alert(t("saveFail") + e.message);
  } finally {
    if (btn) { btn.innerText = oldText; btn.disabled = false; }
  }
}

async function saveStoreAddressSetting() {
  const addrInput = document.getElementById("setting-store-address-input");
  const newAddress = addrInput ? addrInput.value.trim() : "";
  const btn = document.getElementById("btn-save-address-setting");
  const oldText = btn ? btn.innerText : "";
  if (btn) { btn.innerText = t("saving"); btn.disabled = true; }
  try {
    const res = await fetch(`${WORKER_BASE}/api/config?tenant_id=${getTenantIdFromUrl()}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ storeAddress: newAddress })
    });
    if (!res.ok) throw new Error("API returned " + res.status);
    alert(t("saveSuccess"));
  } catch (e) {
    alert(t("saveFail") + e.message);
  } finally {
    if (btn) { btn.innerText = oldText; btn.disabled = false; }
  }
}

async function saveStoreAnnouncementSetting() {
  const annInput = document.getElementById("setting-store-announcement-input");
  const newAnnouncement = annInput ? annInput.value.trim() : "";
  const btn = document.getElementById("btn-save-announcement-setting");
  const oldText = btn ? btn.innerText : "";
  if (btn) { btn.innerText = t("saving"); btn.disabled = true; }
  try {
    const res = await fetch(`${WORKER_BASE}/api/config?tenant_id=${getTenantIdFromUrl()}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ announcement: newAnnouncement })
    });
    if (!res.ok) throw new Error("API returned " + res.status);
    alert(t("saveSuccess"));
  } catch (e) {
    alert(t("saveFail") + e.message);
  } finally {
    if (btn) { btn.innerText = oldText; btn.disabled = false; }
  }
}

// --- Logo Management ---
function renderStoreLogoUI(url) {
  const preview = document.getElementById("setting-logo-preview");
  const placeholder = document.getElementById("setting-logo-placeholder");
  const delBtn = document.getElementById("btn-delete-logo-setting");
  if (url) {
    if (preview) { preview.src = url; preview.style.display = "block"; }
    if (placeholder) placeholder.style.display = "none";
    if (delBtn) delBtn.style.display = "inline-block";
  } else {
    if (preview) { preview.src = ""; preview.style.display = "none"; }
    if (placeholder) placeholder.style.display = "block";
    if (delBtn) delBtn.style.display = "none";
  }
}

function handleSettingLogoSelect(event) {
  const file = event.target.files && event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    const rawDataUri = e.target.result;
    // Compress image client-side if needed using Canvas (max 512px)
    const img = new Image();
    img.onload = () => {
      const maxDim = 512;
      let w = img.width;
      let h = img.height;
      if (w > maxDim || h > maxDim) {
        if (w > h) {
          h = Math.round((h * maxDim) / w);
          w = maxDim;
        } else {
          w = Math.round((w * maxDim) / h);
          h = maxDim;
        }
      }
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, w, h);
      pendingLogoDataUri = canvas.toDataURL("image/png");
      renderStoreLogoUI(pendingLogoDataUri);
    };
    img.src = rawDataUri;
  };
  reader.readAsDataURL(file);
}

async function saveStoreLogoSetting() {
  if (!pendingLogoDataUri && !currentStoreLogoUrl) {
    alert(t("logoUploadPrompt"));
    return;
  }

  const btn = document.getElementById("btn-save-logo-setting");
  const oldText = btn ? btn.innerText : "";
  if (btn) { btn.innerText = t("saving"); btn.disabled = true; }

  const tenantId = getTenantIdFromUrl();

  try {
    let finalLogoUrl = currentStoreLogoUrl;

    // If there is a new image selected, upload it via /api/image
    if (pendingLogoDataUri) {
      const imgRes = await fetch(`${WORKER_BASE}/api/image?tenant_id=${tenantId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "store_logo",
          dataUri: pendingLogoDataUri
        })
      });
      if (!imgRes.ok) throw new Error("Upload logo image failed: " + imgRes.status);
      finalLogoUrl = `${WORKER_BASE}/api/image?tenant_id=${tenantId}&name=store_logo&_t=${Date.now()}`;
    }

    // Update config with logoUrl
    const res = await fetch(`${WORKER_BASE}/api/config?tenant_id=${tenantId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ logoUrl: finalLogoUrl })
    });
    if (!res.ok) throw new Error("API returned " + res.status);

    currentStoreLogoUrl = finalLogoUrl;
    pendingLogoDataUri = null;
    renderStoreLogoUI(finalLogoUrl);

    // Update topbar brand-logo immediately
    const bLogo = document.getElementById("brand-logo");
    if (bLogo && finalLogoUrl) {
      bLogo.src = finalLogoUrl;
      bLogo.style.display = "block";
    }

    alert(t("saveSuccess"));
  } catch (e) {
    alert(t("saveFail") + e.message);
  } finally {
    if (btn) { btn.innerText = oldText; btn.disabled = false; }
  }
}

async function deleteStoreLogoSetting() {
  if (!confirm(t("confirmDeleteLogo"))) return;

  const btn = document.getElementById("btn-delete-logo-setting");
  const oldText = btn ? btn.innerText : "";
  if (btn) { btn.innerText = t("saving"); btn.disabled = true; }

  const tenantId = getTenantIdFromUrl();

  try {
    const res = await fetch(`${WORKER_BASE}/api/config?tenant_id=${tenantId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ logoUrl: "" })
    });
    if (!res.ok) throw new Error("API returned " + res.status);

    currentStoreLogoUrl = null;
    pendingLogoDataUri = null;
    renderStoreLogoUI(null);

    const bLogo = document.getElementById("brand-logo");
    if (bLogo) {
      bLogo.src = "";
      bLogo.style.display = "none";
    }

    alert(t("logoDeleteSuccess"));
  } catch (e) {
    alert(t("saveFail") + e.message);
  } finally {
    if (btn) { btn.innerText = oldText; btn.disabled = false; }
  }
}

function renderLanguageSetting() {
  const radioZh = document.getElementById("setting-lang-zh");
  const radioVi = document.getElementById("setting-lang-vi");
  const cardZh = document.getElementById("lang-card-zh");
  const cardVi = document.getElementById("lang-card-vi");
  if (radioZh) radioZh.checked = (currentLang === "zh-TW");
  if (radioVi) radioVi.checked = (currentLang === "vi");
  if (cardZh && cardVi) {
    if (currentLang === "zh-TW") {
      cardZh.style.borderColor = "var(--primary)";
      cardZh.style.background = "rgba(0, 185, 0, 0.05)";
      cardVi.style.borderColor = "var(--border)";
      cardVi.style.background = "#fff";
    } else {
      cardVi.style.borderColor = "var(--primary)";
      cardVi.style.background = "rgba(0, 185, 0, 0.05)";
      cardZh.style.borderColor = "var(--border)";
      cardZh.style.background = "#fff";
    }
  }
}

function renderReportsSetting() {
  const isFeatureEnabled = Array.isArray(window.currentTenantFeatures)
    ? window.currentTenantFeatures.includes('reports')
    : (Array.isArray(currentTenantFeatures) ? currentTenantFeatures.includes('reports') : false);

  const REPORTS_SVG = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="20" x2="12" y2="10"></line><line x1="18" y1="20" x2="18" y2="4"></line><line x1="6" y1="20" x2="6" y2="16"></line></svg>`;
  updateTocFeatureItem("toc-item-reports", "i18n-toc-reports", "tocReports", REPORTS_SVG, isFeatureEnabled);

  const unlockedBody = document.getElementById("setting-reports-unlocked-body");
  const lockedBody = document.getElementById("setting-reports-locked-body");

  if (!isFeatureEnabled) {
    if (unlockedBody) unlockedBody.style.display = "none";
    if (lockedBody) lockedBody.style.display = "flex";
    return;
  }

  if (unlockedBody) unlockedBody.style.display = "flex";
  if (lockedBody) lockedBody.style.display = "none";
}

function openReportsFromSettings() {
  switchTab('reports');
}

// --- Thermal Printer Settings Logic ---
function onPrinterProtocolChange(station) {
  const isKitchen = station === 'kitchen';
  const protoSel = document.getElementById(isKitchen ? 'printer-kitchen-protocol' : 'printer-cashier-protocol');
  const escBox = document.getElementById(isKitchen ? 'printer-kitchen-escpos-box' : 'printer-cashier-escpos-box');
  const tsplBox = document.getElementById(isKitchen ? 'printer-kitchen-tspl-box' : 'printer-cashier-tspl-box');

  const protocol = protoSel ? protoSel.value : 'esc_pos';
  if (protocol === 'tspl') {
    if (escBox) escBox.style.display = 'none';
    if (tsplBox) tsplBox.style.display = 'flex';
    onTsplSizeChange(station);
  } else {
    if (escBox) escBox.style.display = 'block';
    if (tsplBox) tsplBox.style.display = 'none';
  }
}

function onTsplSizeChange(station) {
  const isKitchen = station === 'kitchen';
  const sizeSel = document.getElementById(isKitchen ? 'printer-kitchen-tspl-size' : 'printer-cashier-tspl-size');
  const customBox = document.getElementById(isKitchen ? 'printer-kitchen-tspl-custom-size-box' : 'printer-cashier-tspl-custom-size-box');

  const size = sizeSel ? sizeSel.value : '100x150';
  if (size === 'custom') {
    if (customBox) customBox.style.display = 'grid';
  } else {
    if (customBox) customBox.style.display = 'none';
  }
}

function onPrinterInterfaceChange(station) {
  const isKitchen = station === 'kitchen';
  const sel = document.getElementById(isKitchen ? 'printer-kitchen-interface' : 'printer-cashier-interface');
  const netBox = document.getElementById(isKitchen ? 'printer-kitchen-network-box' : 'printer-cashier-network-box');
  const btBox = document.getElementById(isKitchen ? 'printer-kitchen-bt-box' : 'printer-cashier-bt-box');

  const iface = sel ? sel.value : 'network';
  if (iface === 'bluetooth') {
    if (netBox) netBox.style.display = 'none';
    if (btBox) btBox.style.display = 'flex';
    refreshPairedBluetoothDevices(station);
  } else {
    if (netBox) netBox.style.display = 'flex';
    if (btBox) btBox.style.display = 'none';
  }
}

function onPrinterModeChange(mode) {
  const isAuto = mode === 'auto';
  updatePrintModeCardStyles(isAuto);
  savePOSPrinterSettings(true);
}

function updatePrintModeCardStyles(isAuto) {
  const cardAuto = document.getElementById("mode-card-print-auto");
  const cardManual = document.getElementById("mode-card-print-manual");
  if (cardAuto) {
    cardAuto.style.borderColor = isAuto ? "var(--primary, #00b900)" : "var(--border, #cbd5e1)";
    cardAuto.style.background = isAuto ? "rgba(0, 185, 0, 0.05)" : "#fff";
  }
  if (cardManual) {
    cardManual.style.borderColor = !isAuto ? "var(--primary, #00b900)" : "var(--border, #cbd5e1)";
    cardManual.style.background = !isAuto ? "rgba(0, 185, 0, 0.05)" : "#fff";
  }
}

let printerAutoSaveDebounceTimer = null;
function attachPrinterAutoSave() {
  const card = document.getElementById("setting-card-printer");
  if (!card || card.dataset.autosaveAttached === "true") return;
  card.dataset.autosaveAttached = "true";

  card.addEventListener("input", (e) => {
    if (e.target.tagName === "INPUT" || e.target.tagName === "SELECT") {
      clearTimeout(printerAutoSaveDebounceTimer);
      printerAutoSaveDebounceTimer = setTimeout(() => {
        savePOSPrinterSettings(true);
      }, 400);
    }
  });

  card.addEventListener("change", (e) => {
    if (e.target.tagName === "INPUT" || e.target.tagName === "SELECT") {
      clearTimeout(printerAutoSaveDebounceTimer);
      savePOSPrinterSettings(true);
    }
  });
}

async function refreshPairedBluetoothDevices(station = 'all', targetMacs = null) {
  if (typeof PrinterService === 'undefined') return;
  const stations = station === 'all' ? ['cashier', 'kitchen'] : [station];

  for (const st of stations) {
    const statusEl = document.getElementById(st === 'kitchen' ? 'printer-kitchen-bt-status' : 'printer-cashier-bt-status');
    const selectEl = document.getElementById(st === 'kitchen' ? 'printer-kitchen-bt-device' : 'printer-cashier-bt-device');
    if (statusEl) statusEl.innerText = t('printerBtConnecting', '正在搜尋已配對裝置...');

    try {
      const res = await PrinterService.getPairedBluetoothDevices();
      const devices = res?.devices || [];

      if (selectEl) {
        const explicitMac = targetMacs ? targetMacs[st] : null;
        const currentVal = explicitMac || selectEl.value;
        selectEl.innerHTML = `<option value="">${t('printerBtSelectPlaceholder', '-- 請選擇已配對的藍牙印表機 --')}</option>`;

        if (devices.length === 0) {
          if (statusEl) statusEl.innerText = t('printerBtNoDevices', '未發現已配對裝置，請先至 Android 設定中完成配對');
        } else {
          devices.forEach(dev => {
            const opt = document.createElement('option');
            opt.value = dev.address;
            opt.innerText = `${dev.name} (${dev.address})`;
            opt.dataset.name = dev.name;
            if (dev.address === currentVal) opt.selected = true;
            selectEl.appendChild(opt);
          });
          if (statusEl) statusEl.innerText = `✅ ${devices.length} 個已配對藍牙裝置`;
        }
      }
    } catch (err) {
      console.warn('[PrinterSettings] BT scan error:', err);
      if (statusEl) statusEl.innerText = `⚠️ ${err.message || '無法取得藍牙裝置清單'}`;
    }
  }
}

function loadPOSPrinterSettings() {
  if (typeof PrinterService === 'undefined') return;
  const settings = PrinterService.getSettings();

  const isAuto = !!settings.autoPrintNewOrders;
  const radioAuto = document.getElementById("printer-mode-auto");
  const radioManual = document.getElementById("printer-mode-manual");
  if (radioAuto && radioManual) {
    radioAuto.checked = isAuto;
    radioManual.checked = !isAuto;
    updatePrintModeCardStyles(isAuto);
  }

  // Cashier
  const cashEnabled = document.getElementById("printer-cashier-enabled");
  if (cashEnabled) cashEnabled.checked = !!settings.cashier?.enabled;
  const cashProto = document.getElementById("printer-cashier-protocol");
  if (cashProto) cashProto.value = settings.cashier?.protocol || 'esc_pos';
  const cashInterface = document.getElementById("printer-cashier-interface");
  if (cashInterface) cashInterface.value = settings.cashier?.interface_type || 'network';
  const cashIp = document.getElementById("printer-cashier-ip");
  if (cashIp) cashIp.value = settings.cashier?.ip || "";
  const cashPort = document.getElementById("printer-cashier-port");
  if (cashPort) cashPort.value = settings.cashier?.port || 9100;
  const cashPaper = document.getElementById("printer-cashier-paper");
  if (cashPaper) cashPaper.value = String(settings.cashier?.paperWidth || 80);
  const cashTsplSize = document.getElementById("printer-cashier-tspl-size");
  if (cashTsplSize) cashTsplSize.value = settings.cashier?.tspl_label_size || '100x150';
  const cashTsplW = document.getElementById("printer-cashier-tspl-width");
  if (cashTsplW) cashTsplW.value = settings.cashier?.tspl_custom_width_mm || 100;
  const cashTsplH = document.getElementById("printer-cashier-tspl-height");
  if (cashTsplH) cashTsplH.value = settings.cashier?.tspl_custom_height_mm || 150;
  const cashTsplMode = document.getElementById("printer-cashier-tspl-mode");
  if (cashTsplMode) cashTsplMode.value = settings.cashier?.tspl_mode || 'summary';
  const cashTsplDpi = document.getElementById("printer-cashier-tspl-dpi");
  if (cashTsplDpi) cashTsplDpi.value = String(settings.cashier?.tspl_dpi || 203);
  const cashTsplXOffset = document.getElementById("printer-cashier-tspl-x-offset");
  if (cashTsplXOffset) cashTsplXOffset.value = settings.cashier?.tspl_x_offset_mm ?? 0;
  const cashTsplYOffset = document.getElementById("printer-cashier-tspl-y-offset");
  if (cashTsplYOffset) cashTsplYOffset.value = settings.cashier?.tspl_y_offset_mm ?? 0;

  onPrinterProtocolChange('cashier');
  onPrinterInterfaceChange('cashier');

  // Kitchen
  const kitEnabled = document.getElementById("printer-kitchen-enabled");
  if (kitEnabled) kitEnabled.checked = !!settings.kitchen?.enabled;
  const kitProto = document.getElementById("printer-kitchen-protocol");
  if (kitProto) kitProto.value = settings.kitchen?.protocol || 'esc_pos';
  const kitInterface = document.getElementById("printer-kitchen-interface");
  if (kitInterface) kitInterface.value = settings.kitchen?.interface_type || 'network';
  const kitIp = document.getElementById("printer-kitchen-ip");
  if (kitIp) kitIp.value = settings.kitchen?.ip || "";
  const kitPort = document.getElementById("printer-kitchen-port");
  if (kitPort) kitPort.value = settings.kitchen?.port || 9100;
  const kitPaper = document.getElementById("printer-kitchen-paper");
  if (kitPaper) kitPaper.value = String(settings.kitchen?.paperWidth || 80);
  const kitTsplSize = document.getElementById("printer-kitchen-tspl-size");
  if (kitTsplSize) kitTsplSize.value = settings.kitchen?.tspl_label_size || '40x30';
  const kitTsplW = document.getElementById("printer-kitchen-tspl-width");
  if (kitTsplW) kitTsplW.value = settings.kitchen?.tspl_custom_width_mm || 40;
  const kitTsplH = document.getElementById("printer-kitchen-tspl-height");
  if (kitTsplH) kitTsplH.value = settings.kitchen?.tspl_custom_height_mm || 30;
  const kitTsplMode = document.getElementById("printer-kitchen-tspl-mode");
  if (kitTsplMode) kitTsplMode.value = settings.kitchen?.tspl_mode || 'item_stickers';
  const kitTsplDpi = document.getElementById("printer-kitchen-tspl-dpi");
  if (kitTsplDpi) kitTsplDpi.value = String(settings.kitchen?.tspl_dpi || 203);
  const kitTsplXOffset = document.getElementById("printer-kitchen-tspl-x-offset");
  if (kitTsplXOffset) kitTsplXOffset.value = settings.kitchen?.tspl_x_offset_mm ?? 0;
  const kitTsplYOffset = document.getElementById("printer-kitchen-tspl-y-offset");
  if (kitTsplYOffset) kitTsplYOffset.value = settings.kitchen?.tspl_y_offset_mm ?? 0;

  onPrinterProtocolChange('kitchen');
  onPrinterInterfaceChange('kitchen');

  // Load Bluetooth devices and select saved ones
  const targetMacs = {
    cashier: settings.cashier?.mac_address || "",
    kitchen: settings.kitchen?.mac_address || ""
  };
  refreshPairedBluetoothDevices('all', targetMacs);

  // Attach instant auto-save listener
  attachPrinterAutoSave();
}

function savePOSPrinterSettings(silent = false) {
  if (typeof PrinterService === 'undefined') return;

  const radioAuto = document.getElementById("printer-mode-auto");
  const autoPrintEnabled = radioAuto ? radioAuto.checked : false;

  // Cashier
  const cashEnabled = document.getElementById("printer-cashier-enabled");
  const cashProto = document.getElementById("printer-cashier-protocol");
  const cashInterface = document.getElementById("printer-cashier-interface");
  const cashIp = document.getElementById("printer-cashier-ip");
  const cashPort = document.getElementById("printer-cashier-port");
  const cashBtSelect = document.getElementById("printer-cashier-bt-device");
  const cashPaper = document.getElementById("printer-cashier-paper");
  const cashTsplSize = document.getElementById("printer-cashier-tspl-size");
  const cashTsplW = document.getElementById("printer-cashier-tspl-width");
  const cashTsplH = document.getElementById("printer-cashier-tspl-height");
  const cashTsplMode = document.getElementById("printer-cashier-tspl-mode");
  const cashTsplDpi = document.getElementById("printer-cashier-tspl-dpi");
  const cashTsplXOffset = document.getElementById("printer-cashier-tspl-x-offset");
  const cashTsplYOffset = document.getElementById("printer-cashier-tspl-y-offset");

  const cashBtOpt = cashBtSelect?.selectedOptions?.[0];
  const cashMac = cashBtSelect ? cashBtSelect.value : "";
  const cashDevName = cashBtOpt?.dataset?.name || "";

  // Kitchen
  const kitEnabled = document.getElementById("printer-kitchen-enabled");
  const kitProto = document.getElementById("printer-kitchen-protocol");
  const kitInterface = document.getElementById("printer-kitchen-interface");
  const kitIp = document.getElementById("printer-kitchen-ip");
  const kitPort = document.getElementById("printer-kitchen-port");
  const kitBtSelect = document.getElementById("printer-kitchen-bt-device");
  const kitPaper = document.getElementById("printer-kitchen-paper");
  const kitTsplSize = document.getElementById("printer-kitchen-tspl-size");
  const kitTsplW = document.getElementById("printer-kitchen-tspl-width");
  const kitTsplH = document.getElementById("printer-kitchen-tspl-height");
  const kitTsplMode = document.getElementById("printer-kitchen-tspl-mode");
  const kitTsplDpi = document.getElementById("printer-kitchen-tspl-dpi");
  const kitTsplXOffset = document.getElementById("printer-kitchen-tspl-x-offset");
  const kitTsplYOffset = document.getElementById("printer-kitchen-tspl-y-offset");

  const kitBtOpt = kitBtSelect?.selectedOptions?.[0];
  const kitMac = kitBtSelect ? kitBtSelect.value : "";
  const kitDevName = kitBtOpt?.dataset?.name || "";

  const newSettings = {
    autoPrintNewOrders: autoPrintEnabled,
    cashier: {
      enabled: cashEnabled ? cashEnabled.checked : true,
      protocol: cashProto ? cashProto.value : 'esc_pos',
      interface_type: cashInterface ? cashInterface.value : 'network',
      tspl_label_size: cashTsplSize ? cashTsplSize.value : '100x150',
      tspl_custom_width_mm: cashTsplW ? Number(cashTsplW.value) || 100 : 100,
      tspl_custom_height_mm: cashTsplH ? Number(cashTsplH.value) || 150 : 150,
      tspl_mode: cashTsplMode ? cashTsplMode.value : 'summary',
      tspl_dpi: cashTsplDpi ? Number(cashTsplDpi.value) || 203 : 203,
      tspl_x_offset_mm: cashTsplXOffset ? Number(cashTsplXOffset.value) || 0 : 0,
      tspl_y_offset_mm: cashTsplYOffset ? Number(cashTsplYOffset.value) || 0 : 0,
      ip: cashIp ? cashIp.value.trim() : "192.168.1.100",
      port: cashPort ? Number(cashPort.value) || 9100 : 9100,
      mac_address: cashMac,
      device_name: cashDevName,
      paperWidth: cashPaper ? Number(cashPaper.value) || 80 : 80,
      autoCut: true
    },
    kitchen: {
      enabled: kitEnabled ? kitEnabled.checked : true,
      protocol: kitProto ? kitProto.value : 'esc_pos',
      interface_type: kitInterface ? kitInterface.value : 'network',
      tspl_label_size: kitTsplSize ? kitTsplSize.value : '40x30',
      tspl_custom_width_mm: kitTsplW ? Number(kitTsplW.value) || 40 : 40,
      tspl_custom_height_mm: kitTsplH ? Number(kitTsplH.value) || 30 : 30,
      tspl_mode: kitTsplMode ? kitTsplMode.value : 'item_stickers',
      tspl_dpi: kitTsplDpi ? Number(kitTsplDpi.value) || 203 : 203,
      tspl_x_offset_mm: kitTsplXOffset ? Number(kitTsplXOffset.value) || 0 : 0,
      tspl_y_offset_mm: kitTsplYOffset ? Number(kitTsplYOffset.value) || 0 : 0,
      ip: kitIp ? kitIp.value.trim() : "192.168.1.101",
      port: kitPort ? Number(kitPort.value) || 9100 : 9100,
      mac_address: kitMac,
      device_name: kitDevName,
      paperWidth: kitPaper ? Number(kitPaper.value) || 80 : 80,
      autoCut: true
    }
  };

  const success = PrinterService.saveSettings(newSettings);
  if (!silent) {
    if (success) {
      if (typeof showToast === 'function') showToast("✅ " + (t("saveSuccess") || "印表機設定儲存成功！"));
    } else {
      if (typeof showToast === 'function') showToast("❌ " + (t("saveFail") || "儲存失敗"));
    }
  }
}

async function testPOSPrinterStation(station) {
  if (typeof PrinterService === 'undefined') return;
  const isKitchen = station === 'kitchen';
  const protoSelect = document.getElementById(isKitchen ? "printer-kitchen-protocol" : "printer-cashier-protocol");
  const ifaceSelect = document.getElementById(isKitchen ? "printer-kitchen-interface" : "printer-cashier-interface");
  const ipInput = document.getElementById(isKitchen ? "printer-kitchen-ip" : "printer-cashier-ip");
  const portInput = document.getElementById(isKitchen ? "printer-kitchen-port" : "printer-cashier-port");
  const btSelect = document.getElementById(isKitchen ? "printer-kitchen-bt-device" : "printer-cashier-bt-device");
  const paperInput = document.getElementById(isKitchen ? "printer-kitchen-paper" : "printer-cashier-paper");
  const tsplSizeSelect = document.getElementById(isKitchen ? "printer-kitchen-tspl-size" : "printer-cashier-tspl-size");
  const tsplWInput = document.getElementById(isKitchen ? "printer-kitchen-tspl-width" : "printer-cashier-tspl-width");
  const tsplHInput = document.getElementById(isKitchen ? "printer-kitchen-tspl-height" : "printer-cashier-tspl-height");
  const tsplModeSelect = document.getElementById(isKitchen ? "printer-kitchen-tspl-mode" : "printer-cashier-tspl-mode");
  const tsplDpiSelect = document.getElementById(isKitchen ? "printer-kitchen-tspl-dpi" : "printer-cashier-tspl-dpi");
  const tsplXOffsetInput = document.getElementById(isKitchen ? "printer-kitchen-tspl-x-offset" : "printer-cashier-tspl-x-offset");
  const tsplYOffsetInput = document.getElementById(isKitchen ? "printer-kitchen-tspl-y-offset" : "printer-cashier-tspl-y-offset");

  const protocol = protoSelect ? protoSelect.value : 'esc_pos';
  const iface = ifaceSelect ? ifaceSelect.value : 'network';
  const paperWidth = paperInput ? Number(paperInput.value) || 80 : 80;

  const targetConfig = {
    protocol: protocol,
    interface_type: iface,
    paperWidth: paperWidth,
    tspl_label_size: tsplSizeSelect ? tsplSizeSelect.value : (isKitchen ? '40x30' : '100x150'),
    tspl_custom_width_mm: tsplWInput ? Number(tsplWInput.value) || (isKitchen ? 40 : 100) : (isKitchen ? 40 : 100),
    tspl_custom_height_mm: tsplHInput ? Number(tsplHInput.value) || (isKitchen ? 30 : 150) : (isKitchen ? 30 : 150),
    tspl_mode: tsplModeSelect ? tsplModeSelect.value : (isKitchen ? 'item_stickers' : 'summary'),
    tspl_dpi: tsplDpiSelect ? Number(tsplDpiSelect.value) || 203 : 203,
    tspl_x_offset_mm: tsplXOffsetInput ? Number(tsplXOffsetInput.value) || 0 : 0,
    tspl_y_offset_mm: tsplYOffsetInput ? Number(tsplYOffsetInput.value) || 0 : 0,
    autoCut: true
  };

  if (iface === 'bluetooth') {
    const mac = btSelect ? btSelect.value : '';
    const name = btSelect?.selectedOptions?.[0]?.dataset?.name || mac;
    if (!mac) {
      alert("請先選擇已配對的藍牙印表機 (Please select a paired Bluetooth printer)");
      return;
    }
    targetConfig.mac_address = mac;
    targetConfig.device_name = name;

    if (typeof showToast === 'function') showToast(`📡 正在傳送測試列印 [${protocol.toUpperCase()}] 至藍牙印表機 [${name}]...`);
    try {
      await PrinterService.testPrint(station, targetConfig);
      if (typeof showToast === 'function') showToast(`✅ 藍牙測試列印成功 [${name}]`);
    } catch (err) {
      console.error("BT Test print error:", err);
      if (typeof showToast === 'function') showToast(`❌ 藍牙列印失敗: ${err.message || err}`);
    }
  } else {
    const ip = ipInput ? ipInput.value.trim() : "";
    const port = portInput ? Number(portInput.value) || 9100 : 9100;

    if (!ip) {
      alert("請先輸入印表機 IP 位址 (例如: 192.168.1.100)");
      return;
    }
    targetConfig.ip = ip;
    targetConfig.port = port;

    if (typeof showToast === 'function') showToast(`🖨️ 正在傳送測試列印 [${protocol.toUpperCase()}] 至 ${ip}:${port}...`);
    try {
      await PrinterService.testPrint(station, targetConfig);
      if (typeof showToast === 'function') showToast(`✅ 測試列印已送出至 ${ip}:${port}`);
    } catch (err) {
      console.error("Test print error:", err);
      if (typeof showToast === 'function') showToast(`❌ 測試列印失敗: ${err.message || err}`);
    }
  }
}

// --- Settings Table of Contents (TOC) & ScrollSpy ---
const SETTINGS_SECTIONS = [
  { id: "setting-card-status", tocId: "toc-item-status" },
  { id: "setting-card-ordermode", tocId: "toc-item-ordermode" },
  { id: "setting-card-hours", tocId: "toc-item-hours" },
  { id: "setting-card-address", tocId: "toc-item-address" },
  { id: "setting-card-announcement", tocId: "toc-item-announcement" },
  { id: "setting-card-logo", tocId: "toc-item-logo" },
  { id: "setting-card-language", tocId: "toc-item-language" },
  { id: "setting-card-dinein", tocId: "toc-item-dinein" },
  { id: "setting-card-printer", tocId: "toc-item-printer" },
  { id: "setting-card-reports", tocId: "toc-item-reports" },
  { id: "setting-card-store-pairing", tocId: "toc-item-store-pairing" }
];

let isManualSettingScroll = false;
let settingScrollTimeout = null;

function setActiveTocItem(activeTocId) {
  document.querySelectorAll(".settings-toc-item").forEach(item => {
    if (item.id === activeTocId) {
      item.classList.add("active");
    } else {
      item.classList.remove("active");
    }
  });
}

function scrollToSettingSection(sectionId) {
  const container = document.getElementById("settings-scroll-container");
  const target = document.getElementById(sectionId);
  if (!container || !target) return;

  const found = SETTINGS_SECTIONS.find(s => s.id === sectionId);
  if (found) {
    setActiveTocItem(found.tocId);
  }

  isManualSettingScroll = true;
  if (settingScrollTimeout) clearTimeout(settingScrollTimeout);

  target.scrollIntoView({ behavior: "smooth", block: "start" });

  settingScrollTimeout = setTimeout(() => {
    isManualSettingScroll = false;
  }, 800);
}

function initSettingsScrollSpy() {
  const container = document.getElementById("settings-scroll-container");
  if (!container || container.dataset.scrollSpyInit) return;
  container.dataset.scrollSpyInit = "true";

  container.addEventListener("scroll", () => {
    if (isManualSettingScroll) return;
    const containerTop = container.getBoundingClientRect().top;

    let currentActive = SETTINGS_SECTIONS[0];
    for (const sec of SETTINGS_SECTIONS) {
      const el = document.getElementById(sec.id);
      if (el) {
        const rect = el.getBoundingClientRect();
        // If element top is within upper portion of container
        if (rect.top - containerTop <= 120) {
          currentActive = sec;
        }
      }
    }

    if (currentActive) {
      setActiveTocItem(currentActive.tocId);
    }
  }, { passive: true });
}

function renderStorePairingSection() {
  const tenantId = (typeof getTenantIdFromUrl === "function" && getTenantIdFromUrl()) || "";
  const elTenant = document.getElementById("display-pairing-tenant-id");
  if (elTenant) {
    elTenant.innerText = tenantId || (typeof t === "function" && t("unpaired")) || "未綁定";
  }
}

async function promptUnlinkStoreDevice() {
  const currentTenant = (typeof getTenantIdFromUrl === "function" && getTenantIdFromUrl()) || "";
  if (!currentTenant) {
    if (typeof showStoreActivationModal === "function") {
      showStoreActivationModal();
    }
    return;
  }

  const promptMsg = (typeof t === "function" && t("promptUnlinkPin")) || "請輸入門市管理 PIN 碼以解除綁定：";
  const pin = prompt(promptMsg);
  if (!pin || !pin.trim()) return;

  try {
    const workerUrl = typeof WORKER_BASE !== "undefined" ? WORKER_BASE : "https://benmi-worker-official.thuanmnc.workers.dev";
    const res = await fetch(`${workerUrl}/api/auth?pw=${encodeURIComponent(pin.trim())}&tenant_id=${encodeURIComponent(currentTenant)}`);
    const data = await res.json().catch(() => ({ ok: false }));

    if (data && data.ok) {
      if (typeof localStorage !== "undefined") {
        localStorage.removeItem("pos_device_tenant_id");
        localStorage.removeItem("tenant_branding_" + currentTenant);
        localStorage.removeItem("tenant_theme_" + currentTenant);
      }
      alert((typeof t === "function" && t("unlinkSuccess")) || "已成功解除設備綁定！即將返回門市啟用畫面。");

      const currentUrl = new URL(window.location.href);
      currentUrl.searchParams.delete("tenant");
      currentUrl.searchParams.delete("tenant_id");
      window.location.href = currentUrl.toString();
    } else {
      alert((typeof t === "function" && t("unlinkWrongPin")) || "管理 PIN 碼錯誤，無法解除綁定。");
    }
  } catch (e) {
    alert((typeof t === "function" && t("activationErrorNetwork")) || "連線驗證失敗，請檢查網路連線。");
  }
}

window.renderStorePairingSection = renderStorePairingSection;
window.promptUnlinkStoreDevice = promptUnlinkStoreDevice;


