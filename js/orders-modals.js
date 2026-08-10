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
  document.getElementById("review-status").innerText = order.status || "-";
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

function reviewOpenChange() {
  if (!reviewingOrder?.key) return;
  const savedKey = reviewingOrder.key;
  closeModal();
  currentOrderKey = savedKey;
  document.getElementById("change-reason").value = "時間需調整";
  document.getElementById("change-note").value = "";
  const checkboxes = document.querySelectorAll(".sold-item");
  if (checkboxes) checkboxes.forEach(cb => cb.checked = false);
  onChangeReasonChange();
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
  const itemsDiv = document.getElementById("change-items-div");

  if (reason === "時間需調整") {
    note.style.display = "block";
    itemsDiv.style.display = "none";
    note.placeholder = "建議時間/Gợi ý thời gian mới (VD: 11:00)";
  } else {
    note.style.display = "none";
    itemsDiv.style.display = "block";
  }
}

async function confirmAction(type, btn) {
  const key = currentOrderKey;
  const isChange = type === "CHANGE";
  const status = isChange ? "CHANGED" : "REJECTED";
  const reason = isChange ? document.getElementById("change-reason").value : document.getElementById("reject-reason").value;
  let note = isChange ? document.getElementById("change-note").value.trim() : undefined;

  if (isChange && reason === "時間需調整" && !note) {
    alert("Vui lòng nhập thời gian gợi ý mới (Ví dụ: 11:00)!");
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
