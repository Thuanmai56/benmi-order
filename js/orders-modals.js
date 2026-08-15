function updateNewAlert() {
  const count = pendingNewOrders.length;
  const alertEl = document.getElementById("new-alert");
  const titleEl = document.getElementById("new-alert-title");
  if (!alertEl || !titleEl) return;

  if (count <= 0) {
    alertEl.style.display = "none";
    newAlertSnoozeUntilMs = 0;
    snoozedNewOrderKeys = new Set();
    if (typeof stopContinuousAlarm === "function") stopContinuousAlarm();
    return;
  }

  const reviewModal = document.getElementById("reviewModal");
  const changeModal = document.getElementById("changeModal");
  const rejectModal = document.getElementById("rejectModal");

  const isReviewing =
    (reviewModal && reviewModal.style.display === "flex") ||
    (changeModal && changeModal.style.display === "flex") ||
    (rejectModal && rejectModal.style.display === "flex");

  if (Date.now() < newAlertSnoozeUntilMs || isReviewing) {
    const hasBrandNew = pendingNewOrders.some(o => o?.key && !snoozedNewOrderKeys.has(o.key));
    if (!hasBrandNew) {
      alertEl.style.display = "none";
      if (typeof stopContinuousAlarm === "function") stopContinuousAlarm();
      return;
    }
  }
  titleEl.innerText = `${count} 單 新訂單`;
  alertEl.style.display = "flex";
  if (typeof startContinuousAlarm === "function") startContinuousAlarm();
}

function dismissNewAlert() {
  newAlertSnoozeUntilMs = Date.now() + 30_000;
  snoozedNewOrderKeys = new Set(pendingNewOrders.map(o => o?.key).filter(Boolean));
  const alertEl = document.getElementById("new-alert");
  if (alertEl) alertEl.style.display = "none";
  if (typeof stopContinuousAlarm === "function") stopContinuousAlarm();
}

function reviewNextNewOrder() {
  if (pendingNewOrders.length <= 0) {
    dismissNewAlert();
    return;
  }
  openReview(pendingNewOrders[0].key);
}

function openReview(orderKey) {
  const order = (latestOrders || []).find(o => o && o.key === orderKey);
  if (!order) return;
  reviewingOrder = order;

  if (order.status === "NEW") {
    dismissNewAlert();
  }

  document.getElementById("review-order-key").innerText = order.key || "-";
  document.getElementById("review-customer").innerText = order.customer || "-";
  document.getElementById("review-pickup").innerText = order.time || "-";
  document.getElementById("review-eta").innerText = formatEta(order.time);
  document.getElementById("review-status").innerHTML = formatStatusHtml(order.status);
  const totalEl = document.getElementById("review-total");
  if (totalEl) totalEl.innerText = formatOrderTotal(order);
  document.getElementById("review-content").innerHTML = formatContentHtml(order);

  const actionsNew = document.getElementById("review-actions");
  const actionsAccepted = document.getElementById("review-actions-accepted");
  const actionsWaiting = document.getElementById("review-actions-waiting");
  const actionsDone = document.getElementById("review-actions-done");

  if (actionsNew) actionsNew.style.display = "none";
  if (actionsAccepted) actionsAccepted.style.display = "none";
  if (actionsWaiting) actionsWaiting.style.display = "none";
  if (actionsDone) actionsDone.style.display = "none";

  if (order.status === "NEW") {
    if (actionsNew) actionsNew.style.display = "grid";
  } else if (order.status === "ACCEPTED") {
    if (actionsAccepted) actionsAccepted.style.display = "grid";
  } else if (order.status === "DONE") {
    if (actionsDone) actionsDone.style.display = "grid";
  } else if (order.status === "WAITING_CUSTOMER_CHANGE" || order.status === "WAITING_CUSTOMER_REJECT") {
    if (actionsWaiting) actionsWaiting.style.display = "grid";
  }

  const reviewModal = document.getElementById("reviewModal");
  if (reviewModal) reviewModal.style.display = "flex";
}

function formatContentHtml(order) {
  const raw = String(order.content || "");
  if (order.reason === "Đơn qua tin nhắn") {
    return `<div style="background:rgba(0,185,0,0.07); border:1.5px solid rgba(0,185,0,0.25); border-radius:16px; padding:18px; white-space:pre-wrap; line-height:1.7; font-size:22px;">${escapeHtml(raw)}</div>`;
  }
  const lines = raw.split("\n").map(l => l.trimEnd()).filter(l => l.trim() !== "");
  if (lines.length === 0) return `<div style="background:rgba(0,185,0,0.07); border:1.5px solid rgba(0,185,0,0.25); border-radius:16px; padding:18px;">-</div>`;

  let inner = lines.map(line => {
    const t = line.trimStart();
    const isSub = t.startsWith("-") || t.startsWith("•") || t.startsWith("↳") || t.startsWith("－");
    return `<div style="${isSub ? 'padding-left:16px; color:#4b5563; font-size:20px;' : 'font-weight:800; margin-top:8px; font-size:22px;'}">${escapeHtml(line)}</div>`;
  }).join("");

  if (order.note) {
    inner += `<div style="color: #555; font-size: 18px; margin-top: 12px; font-weight: 800;">📝 ${escapeHtml(order.note)}</div>`;
  }

  return `<div style="background:rgba(0,185,0,0.07); border:1.5px solid rgba(0,185,0,0.25); border-radius:16px; padding:18px; line-height:1.7;">${inner}</div>`;
}

function closeModal() {
  document.querySelectorAll(".modal").forEach(m => m.style.display = "none");
  reviewingOrder = null;
  currentOrderKey = null;
}

async function updateStatus(key, status, extra = {}, btn = null) {
  if (!key) return;
  if (processingKeys.has(key)) return;
  processingKeys.add(key);

  const oldText = btn ? btn.innerText : "";
  if (btn) {
    btn.disabled = true;
    btn.innerText = "Đang xử lý...";
  }

  try {
    const response = await fetch(`${WORKER_BASE}/api/update`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key, status, ...extra })
    });
    if (!response.ok) throw new Error(`update failed: ${response.status}`);

    // Apply local override immediately for responsiveness
    localOverrides[key] = { status, time: Date.now() };
    renderAll();

    // Still fetch to keep in sync
    await fetchOrders();
  } catch (e) {
    console.error(e);
    alert("處理失敗，請稍後再試。");
  } finally {
    processingKeys.delete(key);
    if (btn) {
      btn.disabled = false;
      btn.innerText = oldText;
    }
  }
}

async function reviewAccept(btn) {
  if (!reviewingOrder?.key) return;
  await updateStatus(reviewingOrder.key, "ACCEPTED", {}, btn);
  closeModal();
  dismissNewAlert();
  switchTab("live");
}

let changeModalBaseDate = null;
let changeModalProposedDeltaMinutes = 15;

function parseOrderTimeToDate(timeStr) {
  if (!timeStr || typeof timeStr !== "string") return new Date();

  // Match YYYY-MM-DD HH:mm
  const dateTimeMatch = timeStr.match(/^(\d{4}-\d{2}-\d{2})\s+(\d{2}:\d{2})/);
  if (dateTimeMatch) {
    const iso = `${dateTimeMatch[1]}T${dateTimeMatch[2]}:00`;
    const d = new Date(iso);
    if (!isNaN(d.getTime())) return d;
  }

  // Match HH:mm
  const timeMatch = timeStr.match(/(\d{1,2}):(\d{2})/);
  if (timeMatch) {
    const now = new Date();
    now.setHours(parseInt(timeMatch[1], 10), parseInt(timeMatch[2], 10), 0, 0);
    return now;
  }

  return new Date();
}

function formatHHmm(dateObj) {
  if (!dateObj || isNaN(dateObj.getTime())) return "12:00";
  const h = String(dateObj.getHours()).padStart(2, "0");
  const m = String(dateObj.getMinutes()).padStart(2, "0");
  return `${h}:${m}`;
}

function updateProposedTimeUI() {
  if (!changeModalBaseDate) {
    changeModalBaseDate = new Date();
  }

  // Update time display labels on preset buttons
  [10, 15, 20, 30, 45, 60].forEach(min => {
    const el = document.getElementById(`preset-time-${min}`);
    if (el) {
      const targetDate = new Date(changeModalBaseDate.getTime() + min * 60000);
      el.innerText = formatHHmm(targetDate);
    }
  });

  // Update active state highlight on preset buttons
  document.querySelectorAll(".time-preset-btn").forEach(btn => {
    const min = parseInt(btn.getAttribute("data-minutes"), 10);
    btn.classList.toggle("active", min === changeModalProposedDeltaMinutes);
  });

  // Calculate proposed target date
  const targetDate = new Date(changeModalBaseDate.getTime() + changeModalProposedDeltaMinutes * 60000);
  const formattedTime = formatHHmm(targetDate);

  const timePicker = document.getElementById("change-time-picker");
  if (timePicker) {
    timePicker.value = formattedTime;
  }

  const noteInput = document.getElementById("change-note");
  if (noteInput) {
    noteInput.value = formattedTime;
  }
}

function selectTimePreset(minutes) {
  changeModalProposedDeltaMinutes = minutes;
  updateProposedTimeUI();
}

function stepProposedTime(deltaMinutes) {
  changeModalProposedDeltaMinutes += deltaMinutes;
  updateProposedTimeUI();
}

function onTimePickerChange() {
  const timePicker = document.getElementById("change-time-picker");
  if (!timePicker || !timePicker.value) return;

  const parts = timePicker.value.split(":");
  if (parts.length < 2) return;

  const pickedH = parseInt(parts[0], 10);
  const pickedM = parseInt(parts[1], 10);

  const pickedDate = new Date(changeModalBaseDate.getTime());
  pickedDate.setHours(pickedH, pickedM, 0, 0);

  const diffMs = pickedDate.getTime() - changeModalBaseDate.getTime();
  changeModalProposedDeltaMinutes = Math.round(diffMs / 60000);

  updateProposedTimeUI();
}

function reviewOpenChange() {
  if (!reviewingOrder?.key) return;
  const savedKey = reviewingOrder.key;
  const orderTimeStr = reviewingOrder.time || "";

  closeModal();
  currentOrderKey = savedKey;

  const orderKeyEl = document.getElementById("change-order-key");
  if (orderKeyEl) orderKeyEl.innerText = savedKey;

  const origTimeEl = document.getElementById("change-original-time");
  if (origTimeEl) origTimeEl.innerText = orderTimeStr || "Chưa xác định";

  changeModalBaseDate = parseOrderTimeToDate(orderTimeStr);
  changeModalProposedDeltaMinutes = 15;

  document.getElementById("change-reason").value = "時間需調整";
  document.getElementById("change-note").value = "";
  const checkboxes = document.querySelectorAll(".sold-item");
  if (checkboxes) checkboxes.forEach(cb => cb.checked = false);

  onChangeReasonChange();
  updateProposedTimeUI();

  document.getElementById("changeModal").style.display = "flex";
}

function reviewOpenReject() {
  if (!reviewingOrder?.key) return;
  const savedKey = reviewingOrder.key;
  closeModal();
  currentOrderKey = savedKey;
  document.getElementById("reject-reason").selectedIndex = 0;
  document.getElementById("rejectModal").style.display = "flex";
}

async function markReadyFromReview(btn) {
  if (!reviewingOrder?.key) return;
  await updateStatus(reviewingOrder.key, "DONE", {}, btn);
  closeModal();
  switchTab("live");
}

async function reviewForceCancel(btn) {
  if (!reviewingOrder?.key) return;
  if (!confirm("Hủy đơn hàng này do khách không phản hồi?")) return;
  await updateStatus(reviewingOrder.key, "FORCE_REJECT", {}, btn);
  closeModal();
  switchTab("live");
}

function onChangeReasonChange() {
  const reason = document.getElementById("change-reason").value;
  const note = document.getElementById("change-note");
  const timeDiv = document.getElementById("change-time-div");
  const itemsDiv = document.getElementById("change-items-div");

  if (reason === "時間需調整") {
    if (timeDiv) timeDiv.style.display = "block";
    if (note) {
      note.style.display = "block";
      note.placeholder = "Ghi chú thời gian mới (VD: 11:15)";
    }
    if (itemsDiv) itemsDiv.style.display = "none";
  } else {
    if (timeDiv) timeDiv.style.display = "none";
    if (note) note.style.display = "none";
    if (itemsDiv) itemsDiv.style.display = "block";
  }
}

async function confirmAction(type, btn) {
  const key = currentOrderKey;
  const isChange = type === "CHANGE";
  const status = isChange ? "CHANGED" : "REJECTED";
  const reason = isChange ? document.getElementById("change-reason").value : document.getElementById("reject-reason").value;
  let note = isChange ? document.getElementById("change-note").value.trim() : undefined;

  if (isChange && reason === "時間需調整" && !note) {
    alert("Vui lòng chọn thời gian gợi ý mới!");
    return;
  }

  if (isChange && reason === "口味售完") {
    const checked = Array.from(document.querySelectorAll(".sold-item:checked")).map(cb => cb.value);
    if (checked.length === 0) {
      alert("Vui lòng chọn ít nhất một món đã hết!");
      return;
    }
    note = checked.join(",");
  }

  await updateStatus(key, status, { reason, note }, btn);
  closeModal();
}

