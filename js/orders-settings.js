// ==========================================
// Benmi POS - Module: Store Settings & Hours
// ==========================================

let currentStoreStatus = 'open';
let storeOperatingHours = null;
let allowScheduledPickup = true;

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
      storeOperatingHours = ensureParsedOperatingHours(data.operatingHours);
    }
  } catch (e) {
    console.error("loadStoreStatus error:", e);
  }
  renderStoreStatusUI(currentStoreStatus);
}

function openSettings() {
  activeTab = "settings";
  document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
  document.querySelectorAll(".content").forEach(c => c.style.display = "none");
  const viewSettings = document.getElementById("view-settings");
  if (viewSettings) viewSettings.style.display = "block";
  loadOperatingHours();
  initSettingsScrollSpy();
}

async function loadOperatingHours() {
  try {
    const res = await fetch(`${WORKER_BASE}/api/config?tenant_id=${getTenantIdFromUrl()}&_t=${Date.now()}`);
    if (res.ok) {
      const data = await res.json();
      storeOperatingHours = ensureParsedOperatingHours(data.operatingHours);
      allowScheduledPickup = data.allowScheduledPickup !== undefined ? data.allowScheduledPickup : true;
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
      renderStoreLogoUI(null);
    }
  } catch (e) {
    storeOperatingHours = createDefaultOperatingHours();
    allowScheduledPickup = true;
    renderStoreLogoUI(null);
  }
  renderStoreStatusUI(currentStoreStatus);
  renderOperatingHours();
  renderScheduledPickupSetting();
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

function createDefaultOperatingHours() {
  let hrs = {};
  for (let i = 0; i < 7; i++) hrs[i] = [{ start: "08:00", end: "21:00" }];
  return hrs;
}

function renderOperatingHours() {
  const container = document.getElementById("settings-hours-container");
  if (!container) return;
  container.innerHTML = "";
  const dayNamesList = DAY_NAMES[currentLang] || DAY_NAMES["zh-TW"];
  for (let i = 1; i <= 7; i++) {
    const dayIdx = i === 7 ? 0 : i;
    const shifts = (storeOperatingHours && storeOperatingHours[dayIdx]) || [];
    const isOpen = shifts.length > 0;
    const row = document.createElement("div");
    row.style.cssText = "background: #fff; border: 1px solid #eee; border-radius: 8px; padding: 12px;";
    let shiftsHtml = "";
    shifts.forEach((shift, sIdx) => {
      shiftsHtml += `
        <div style="display:flex; gap:8px; align-items:center; margin-top:10px;">
          <input type="time" id="sh-start-${dayIdx}-${sIdx}" value="${shift.start}" style="flex:1; padding:8px; font-family:inherit; border:1px solid #ccc; border-radius:6px; font-size:15px;">
          <span style="font-weight:900;">-</span>
          <input type="time" id="sh-end-${dayIdx}-${sIdx}" value="${shift.end}" style="flex:1; padding:8px; font-family:inherit; border:1px solid #ccc; border-radius:6px; font-size:15px;">
          <button onclick="removeShift(${dayIdx}, ${sIdx})" style="background:none; border:none; color:var(--brand-red); cursor:pointer; font-size:20px; padding:0 4px;">✕</button>
        </div>`;
    });
    row.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <label style="display:flex; align-items:center; gap:10px; cursor:pointer; font-size:16px;">
          <input type="checkbox" ${isOpen ? 'checked' : ''} onchange="toggleDayStatus(${dayIdx}, this.checked)" style="width:18px; height:18px;">
          <span style="font-weight:900; color:${isOpen ? '#111' : '#999'};">${dayNamesList[dayIdx]}</span>
        </label>
        ${isOpen ? `<button onclick="addShift(${dayIdx})" style="font-size:13px; background:#eff6ff; color:#3b82f6; border:none; padding:6px 12px; border-radius:6px; cursor:pointer; font-weight:900;">${t('btnAddShift')}</button>` : `<span style="font-size:13px; color:var(--brand-red); font-weight:900;">${t('closedDay')}</span>`}
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

// --- Settings Table of Contents (TOC) & ScrollSpy ---
const SETTINGS_SECTIONS = [
  { id: "setting-card-status", tocId: "toc-item-status" },
  { id: "setting-card-ordermode", tocId: "toc-item-ordermode" },
  { id: "setting-card-hours", tocId: "toc-item-hours" },
  { id: "setting-card-address", tocId: "toc-item-address" },
  { id: "setting-card-announcement", tocId: "toc-item-announcement" },
  { id: "setting-card-logo", tocId: "toc-item-logo" }
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

