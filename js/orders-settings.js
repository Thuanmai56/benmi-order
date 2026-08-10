let storeOperatingHours = null;
const DAY_NAMES = ["星期日", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六"];

function openSettings() {
  activeTab = "settings";
  document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
  document.querySelectorAll(".content").forEach(c => c.style.display = "none");
  document.getElementById("view-settings").style.display = "block";
  loadOperatingHours();
}

async function loadOperatingHours() {
  try {
    const res = await fetch(`${WORKER_BASE}/api/config?tenant_id=${getTenantIdFromUrl()}&_t=${Date.now()}`);
    if (res.ok) {
      const data = await res.json();
      storeOperatingHours = data.operatingHours || createDefaultOperatingHours();
    } else {
      storeOperatingHours = createDefaultOperatingHours();
    }
  } catch (e) {
    storeOperatingHours = createDefaultOperatingHours();
  }
  renderOperatingHours();
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
  for (let i = 1; i <= 7; i++) {
    const dayIdx = i === 7 ? 0 : i;
    const shifts = storeOperatingHours[dayIdx] || [];
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
      <div style="display:flex; justify-content: space-between; align-items:center;">
        <label style="display:flex; align-items:center; gap:10px; cursor:pointer; font-size:16px;">
          <input type="checkbox" ${isOpen ? 'checked' : ''} onchange="toggleDayStatus(${dayIdx}, this.checked)" style="width:18px; height:18px;">
          <span style="font-weight:900; color:${isOpen ? '#111' : '#999'};">${DAY_NAMES[dayIdx]}</span>
        </label>
        ${isOpen ? `<button onclick="addShift(${dayIdx})" style="font-size:13px; background:#eff6ff; color:#3b82f6; border:none; padding:6px 12px; border-radius:6px; cursor:pointer; font-weight:900;">+ 新增時段</button>` : `<span style="font-size:13px; color:var(--brand-red); font-weight:900;">公休</span>`}
      </div>
      ${isOpen ? `<div id="shifts-box-${dayIdx}">${shiftsHtml}</div>` : ''}`;
    container.appendChild(row);
  }
}

function syncOperatingHoursFromDOM() {
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
  storeOperatingHours[dayIdx] = isChecked ? [{ start: "08:00", end: "21:00" }] : [];
  renderOperatingHours();
}

function addShift(dayIdx) {
  syncOperatingHoursFromDOM();
  storeOperatingHours[dayIdx].push({ start: "12:00", end: "13:00" });
  renderOperatingHours();
}

function removeShift(dayIdx, sIdx) {
  syncOperatingHoursFromDOM();
  storeOperatingHours[dayIdx].splice(sIdx, 1);
  renderOperatingHours();
}

async function saveOperatingHours() {
  syncOperatingHoursFromDOM();
  const btn = document.getElementById("btn-save-hours");
  const oldText = btn ? btn.innerText : "";
  if (btn) { btn.innerText = "儲存中..."; btn.disabled = true; }
  try {
    const res = await fetch(`${WORKER_BASE}/api/config?tenant_id=${getTenantIdFromUrl()}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ operatingHours: storeOperatingHours })
    });
    if (!res.ok) throw new Error("API returned " + res.status);
    alert("營業時間儲存成功！");
  } catch (e) {
    alert("儲存失敗：" + e.message);
  } finally {
    if (btn) { btn.innerText = oldText; btn.disabled = false; }
  }
}
