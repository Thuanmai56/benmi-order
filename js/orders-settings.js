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
      if (data.operatingHours) {
        storeOperatingHours = data.operatingHours;
      }
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
}

async function loadOperatingHours() {
  try {
    const res = await fetch(`${WORKER_BASE}/api/config?tenant_id=${getTenantIdFromUrl()}&_t=${Date.now()}`);
    if (res.ok) {
      const data = await res.json();
      storeOperatingHours = data.operatingHours || createDefaultOperatingHours();
      allowScheduledPickup = data.allowScheduledPickup !== undefined ? data.allowScheduledPickup : true;
      if (data.storeStatus) currentStoreStatus = data.storeStatus;
    } else {
      storeOperatingHours = createDefaultOperatingHours();
      allowScheduledPickup = true;
    }
  } catch (e) {
    storeOperatingHours = createDefaultOperatingHours();
    allowScheduledPickup = true;
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
