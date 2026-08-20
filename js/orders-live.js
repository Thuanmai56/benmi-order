// ==========================================
// Benmi POS - Module: Live Orders & Processing
// ==========================================

function renderListLeft(orders) {
  const container = document.getElementById("list-left");
  if (!container) return;
  container.innerHTML = "";
  if (orders.length === 0) {
    container.innerHTML = `<div style="text-align:center; padding: 22px; color:#999;">${t('empty')}</div>`;
    return;
  }

  orders.forEach(order => {
    const isNew = order.status === "NEW";
    const eta = formatEta(order.time);
    const totalFormatted = formatOrderTotal(order);

    const tile = document.createElement("div");
    tile.className = `tile ${isNew ? "new" : ""}`;
    tile.onclick = () => openReview(order.key);

    let badge = "";
    let rightActions = "";

    if (isNew) {
      badge = `<span class="badge new">${t('badgeNew')}</span>`;
      rightActions = `<button class="btn btn-ghost btn-block" onclick="event.stopPropagation(); openReview('${escapeHtml(order.key)}')">${t('btnReview')}</button>`;
    } else if (order.status === "ACCEPTED") {
      badge = `<span class="badge wait">${t('badgeDoing')}</span>`;
      rightActions = `<button class="btn btn-primary btn-block" onclick="event.stopPropagation(); updateStatus('${escapeHtml(order.key)}','DONE', {}, this)">${t('btnReady')}</button>`;
    } else {
      badge = `<span class="badge wait" style="background:#e5e7eb; color:#4b5563;">${t('badgeWaiting')}</span>`;
      rightActions = `<button class="btn btn-block" style="background:#f3f4f6; color:#9ca3af; cursor:not-allowed;" disabled>${t('btnWaitingReply')}</button>`;
    }

    tile.innerHTML = `
      <div>
        <div class="tile-top">
          <span class="tile-customer">${escapeHtml(order.customer || t('defaultCustomer'))}</span>
          ${badge}
          <span class="tile-meta">#${escapeHtml(order.key)}</span>
        </div>
        <div class="tile-top" style="margin-top: 6px;">
          <span class="tile-meta">${t('pickupLabel')} ${escapeHtml(formatPickupTimeDisplay(order.time))}</span>
          ${totalFormatted !== '-' ? `<span class="tile-meta" style="color: var(--primary); font-weight: 1000;">${escapeHtml(totalFormatted)}</span>` : ''}
          <span class="tile-meta" style="color: var(--brand-red); font-weight: 1100;">${escapeHtml(eta)}</span>
        </div>
        <div class="tile-items">${escapeHtml(shortItems(order.content))}</div>
      </div>
      <div class="tile-actions">
        ${rightActions}
      </div>
    `;

    container.appendChild(tile);
  });
}

function renderListRight(orders) {
  const container = document.getElementById("list-right");
  if (!container) return;
  container.innerHTML = "";
  if (orders.length === 0) {
    container.innerHTML = `<div style="text-align:center; padding: 22px; color:#999;">${t('empty')}</div>`;
    return;
  }

  orders.forEach(order => {
    const eta = formatEta(order.time);
    const totalFormatted = formatOrderTotal(order);
    const tile = document.createElement("div");
    tile.className = "tile";
    tile.onclick = () => openReview(order.key);

    tile.innerHTML = `
      <div>
        <div class="tile-top">
          <span class="tile-customer">${escapeHtml(order.customer || t('defaultCustomer'))}</span>
          <span class="badge done">${t('badgeReady')}</span>
          <span class="tile-meta">#${escapeHtml(order.key)}</span>
        </div>
        <div class="tile-top" style="margin-top: 6px;">
          <span class="tile-meta">${t('pickupLabel')} ${escapeHtml(formatPickupTimeDisplay(order.time))}</span>
          ${totalFormatted !== '-' ? `<span class="tile-meta" style="color: var(--primary); font-weight: 1000;">${escapeHtml(totalFormatted)}</span>` : ''}
          <span class="tile-meta" style="color: var(--brand-red); font-weight: 1100;">${escapeHtml(eta)}</span>
        </div>
        <div class="tile-items">${escapeHtml(shortItems(order.content))}</div>
      </div>
      <div class="tile-actions">
        <button class="btn btn-yellow btn-block" onclick="event.stopPropagation(); updateStatus('${escapeHtml(order.key)}','PICKED_UP', {}, this)">${t('btnPickedUp')}</button>
      </div>
    `;
    container.appendChild(tile);
  });
}

function updateNewAlert() {
  const count = pendingNewOrders.length;
  const alertEl = document.getElementById("new-alert");
  const titleEl = document.getElementById("new-alert-title");
  if (!alertEl || !titleEl) return;

  if (count <= 0) {
    alertEl.style.display = "none";
    newAlertSnoozeUntilMs = 0;
    snoozedNewOrderKeys = new Set();
    if (typeof newAlertSnoozeTimerId !== 'undefined' && newAlertSnoozeTimerId) {
      clearTimeout(newAlertSnoozeTimerId);
      newAlertSnoozeTimerId = null;
    }
    if (typeof stopContinuousAlarm === "function") stopContinuousAlarm();
    return;
  }

  // Check if any review-related modals are currently open
  const isReviewing =
    (document.getElementById("reviewModal") && document.getElementById("reviewModal").style.display === "flex") ||
    (document.getElementById("changeModal") && document.getElementById("changeModal").style.display === "flex") ||
    (document.getElementById("rejectModal") && document.getElementById("rejectModal").style.display === "flex");

  if (isReviewing) {
    alertEl.style.display = "none";
    if (typeof stopContinuousAlarm === "function") stopContinuousAlarm();
    return;
  }

  if (Date.now() < newAlertSnoozeUntilMs) {
    // If a brand-new order arrived that wasn't in the snoozed set, wake up immediately!
    const hasBrandNew = pendingNewOrders.some(o => o?.key && !snoozedNewOrderKeys.has(o.key));
    if (!hasBrandNew) {
      alertEl.style.display = "none";
      if (typeof stopContinuousAlarm === "function") stopContinuousAlarm();
      return;
    }
  }

  // Otherwise, snooze has expired or was interrupted by new order -> show modal & alarm!
  titleEl.innerText = t("alertTitle", { count });
  alertEl.style.display = "flex";
  if (typeof startContinuousAlarm === "function") startContinuousAlarm();
}

function dismissNewAlert() {
  newAlertSnoozeUntilMs = Date.now() + 30_000;
  snoozedNewOrderKeys = new Set(pendingNewOrders.map(o => o?.key).filter(Boolean));
  const alertEl = document.getElementById("new-alert");
  if (alertEl) alertEl.style.display = "none";
  if (typeof stopContinuousAlarm === "function") stopContinuousAlarm();

  if (typeof newAlertSnoozeTimerId !== 'undefined' && newAlertSnoozeTimerId) {
    clearTimeout(newAlertSnoozeTimerId);
  }
  newAlertSnoozeTimerId = setTimeout(() => {
    newAlertSnoozeUntilMs = 0;
    updateNewAlert();
  }, 30_000);
}

function reviewNextNewOrder() {
  if (pendingNewOrders.length <= 0) {
    dismissNewAlert();
    return;
  }
  openReview(pendingNewOrders[0].key);
}

function formatContentHtml(order) {
  const raw = String(order?.content || "");
  if (order?.reason === "Đơn qua tin nhắn") {
    return `<div style="background:rgba(0,185,0,0.07); border:1.5px solid rgba(0,185,0,0.25); border-radius:16px; padding:18px; white-space:pre-wrap; line-height:1.7; font-size:22px;">${escapeHtml(raw)}</div>`;
  }
  const lines = raw.split("\n").map(l => l.trimEnd()).filter(l => l.trim() !== "");
  if (lines.length === 0) return `<div style="background:rgba(0,185,0,0.07); border:1.5px solid rgba(0,185,0,0.25); border-radius:16px; padding:18px;">-</div>`;

  let inner = lines.map(line => {
    const text = line.trimStart();
    const isSub = text.startsWith("-") || text.startsWith("•") || text.startsWith("↳") || text.startsWith("－");
    return `<div style="${isSub ? 'padding-left:16px; color:#4b5563; font-size:20px;' : 'font-weight:800; margin-top:8px; font-size:22px;'}">${escapeHtml(line)}</div>`;
  }).join("");

  if (order?.note) {
    inner += `<div style="color: #555; font-size: 18px; margin-top: 12px; font-weight: 800;">📝 ${escapeHtml(order.note)}</div>`;
  }

  const totalDisplay = formatOrderTotal(order);
  if (totalDisplay !== "-") {
    inner += `<div style="display:flex; justify-content:space-between; align-items:center; margin-top:16px; padding-top:12px; border-top:1.5px dashed rgba(0,185,0,0.35); font-weight:1000; font-size:22px; color:#111827;"><span>${t('labelTotal')}:</span><span style="color:var(--primary); font-size:26px; font-weight:1100;">${totalDisplay}</span></div>`;
  }

  return `<div style="background:rgba(0,185,0,0.07); border:1.5px solid rgba(0,185,0,0.25); border-radius:16px; padding:18px; line-height:1.7;">${inner}</div>`;
}

async function updateStatus(key, status, extra = {}, btn = null) {
  if (!key) return;
  if (processingKeys.has(key)) return;
  processingKeys.add(key);

  const oldText = btn ? btn.innerText : "";
  if (btn) {
    btn.disabled = true;
    btn.innerText = t("processing");
  }

  try {
    const response = await fetch(`${WORKER_BASE}/api/update?tenant_id=${getTenantIdFromUrl()}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key, status, ...extra })
    });
    if (!response.ok) throw new Error(`update failed: ${response.status}`);

    // Apply local override immediately for responsiveness
    localOverrides[key] = { status, time: Date.now() };
    renderAll();

    // Keep in sync with server
    await fetchOrders();
  } catch (e) {
    console.error(e);
    alert(t("processFail"));
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

async function markReadyFromReview(btn) {
  if (!reviewingOrder?.key) return;
  await updateStatus(reviewingOrder.key, "DONE", {}, btn);
  closeModal();
  switchTab("live");
}

async function reviewForceCancel(btn) {
  if (!reviewingOrder?.key) return;
  if (!confirm(t("confirmForceCancel"))) return;
  await updateStatus(reviewingOrder.key, "FORCE_REJECT", {}, btn);
  closeModal();
  switchTab("live");
}
