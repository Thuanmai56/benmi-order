// ==========================================
// Benmi POS - Module: Live Orders & Processing
// ==========================================

let currentDiningFilter = "all"; // 'all' | 'takeaway' | 'dine_in'

function isOrderDineIn(order) {
  if (!order) return false;
  return order.diningOption === "dine_in" ||
         (order.content || "").includes("📍 用餐方式：🍽️ 內用") ||
         (order.content || "").includes("【內用】") ||
         (order.time || "").includes("現場內用");
}

function getOrderTableNumber(order) {
  if (!order) return "";
  if (order.tableNumber) return String(order.tableNumber).trim();
  if (order.table_number) return String(order.table_number).trim();
  const timeMatch = (order.time || "").match(/桌號[：:\s]*([a-zA-Z0-9_-]+)/);
  if (timeMatch) return timeMatch[1];
  const contentMatch = (order.content || "").match(/(?:用餐桌號|桌號)[：:\s]*([a-zA-Z0-9_-]+)/);
  if (contentMatch) return contentMatch[1];
  const noteMatch = (order.note || "").match(/(?:用餐桌號|桌號)[：:\s]*([a-zA-Z0-9_-]+)/);
  if (noteMatch) return noteMatch[1];
  return "";
}

function setDiningFilter(filter) {
  currentDiningFilter = filter;
  const filterAllBtn = document.getElementById("filter-btn-all");
  const filterTakeawayBtn = document.getElementById("filter-btn-takeaway");
  const filterDineInBtn = document.getElementById("filter-btn-dine-in");

  if (filterAllBtn) filterAllBtn.classList.toggle("active", filter === "all");
  if (filterTakeawayBtn) filterTakeawayBtn.classList.toggle("active", filter === "takeaway");
  if (filterDineInBtn) filterDineInBtn.classList.toggle("active", filter === "dine_in");

  renderAll();
}

function isOrderMetadataText(text) {
  if (!text) return true;
  const s = String(text).trim();
  if (s.startsWith("----") || s.startsWith("====") || s.includes("【") || s.includes("訂單")) return true;
  if (s.includes("用餐方式") || s.includes("桌號") || s.includes("聯絡電話") || s.includes("備註") || s.includes("付款方式") || s.includes("總金額") || s.includes("總計") || s.includes("時間") || s.includes("取餐")) return true;
  if (s.includes("Hình thức") || s.includes("Bàn số") || s.includes("Số bàn") || s.includes("SĐT") || s.includes("Ghi chú") || s.includes("Thanh toán") || s.includes("Tổng cộng")) return true;
  if (/^[📍📞👤📝🕒💰🏷️]/.test(s)) return true;
  return false;
}

function getOrderItemsPreview(order) {
  if (!order) return "";
  let items = [];
  if (typeof PrinterService !== "undefined" && typeof PrinterService.parseOrderItems === "function") {
    try {
      items = PrinterService.parseOrderItems(order, false) || [];
    } catch (e) {}
  }
  if (!items || items.length === 0) {
    const rawLines = String(order.content || "").split("\n").map(s => s.trim()).filter(Boolean);
    for (const line of rawLines) {
      if (isOrderMetadataText(line)) continue;
      if (line.startsWith("↳") || line.startsWith("-") || line.startsWith("+") || line.startsWith("•") || line.startsWith("－")) continue;
      const m = line.match(/^(\d+)\s*(?:份|x|X)\s*(?:x\s*)?(.+)$/) || line.match(/^(.+?)\s*[xX*]\s*(\d+)$/);
      if (m) {
        items.push({ name: (m[2] || m[1] || "").trim(), quantity: Number(m[1] || m[2]) || 1 });
      } else if (!line.startsWith("[") && line.length > 1 && line.length < 30) {
        items.push({ name: line.replace(/\$[\d,]+/g, '').trim(), quantity: 1 });
      }
    }
  }

  // Filter out any metadata that might have been parsed as item names
  items = items.filter(it => it && it.name && !isOrderMetadataText(it.name));

  if (items.length === 0) return "";
  const maxShown = 2;
  const shownItems = items.slice(0, maxShown).map(it => `${it.name} x${it.quantity}`);
  const remaining = items.length - maxShown;
  if (remaining > 0) {
    return shownItems.join(" · ") + ` · +${remaining}`;
  }
  return shownItems.join(" · ");
}

function renderEmptyLiveState(type) {
  const isPending = type === 'pending';
  const title = isPending ? t('emptyLivePendingTitle') : t('emptyLiveAcceptedTitle');
  const sub = isPending ? t('emptyLivePendingSub') : t('emptyLiveAcceptedSub');
  const iconSvg = isPending ? (POS_SVG.inbox || "") : (POS_SVG.partyCheck || "");
  return `
    <div class="empty-state-card">
      <div class="empty-state-icon-circle ${isPending ? 'pending' : 'accepted'}">
        ${iconSvg}
      </div>
      <div class="empty-state-title">${escapeHtml(title)}</div>
      <div class="empty-state-desc">${escapeHtml(sub)}</div>
    </div>
  `;
}

function updateDiningFilterStats(allLiveOrders) {
  const isFeatureEnabled = Array.isArray(window.currentTenantFeatures)
    ? window.currentTenantFeatures.includes('dine_in')
    : false;

  const diningFilterBar = document.getElementById("dining-filter-bar");
  const filterDineInBtn = document.getElementById("filter-btn-dine-in");
  const dineInStatEl = document.getElementById("stat-pill-dinein");

  let takeawayCount = 0;
  let dineInCount = 0;

  (allLiveOrders || []).forEach(order => {
    if (isOrderDineIn(order)) {
      dineInCount++;
    } else {
      takeawayCount++;
    }
  });

  const totalCount = (allLiveOrders || []).length;

  const countAllEl = document.getElementById("filter-count-all");
  if (countAllEl) countAllEl.innerText = totalCount;

  const countTakeawayEl = document.getElementById("filter-count-takeaway");
  if (countTakeawayEl) countTakeawayEl.innerText = takeawayCount;

  const countDineInEl = document.getElementById("filter-count-dinein");
  if (countDineInEl) countDineInEl.innerText = dineInCount;

  const takeawayStatEl = document.getElementById("stat-pill-takeaway");
  if (takeawayStatEl) takeawayStatEl.innerHTML = `${POS_SVG.takeaway} ${t('badgeTakeaway')} ${takeawayCount}`;

  if (dineInStatEl) dineInStatEl.innerHTML = `${POS_SVG.dineIn} ${t('badgeDineIn')} ${dineInCount}`;

  if (!isFeatureEnabled) {
    if (diningFilterBar) diningFilterBar.style.display = "none";
    if (filterDineInBtn) filterDineInBtn.style.display = "none";
    if (dineInStatEl) dineInStatEl.style.display = "none";
    if (currentDiningFilter === "dine_in") {
      currentDiningFilter = "all";
      const filterAllBtn = document.getElementById("filter-btn-all");
      if (filterAllBtn) filterAllBtn.classList.add("active");
    }
  } else {
    if (diningFilterBar) diningFilterBar.style.display = "flex";
    if (filterDineInBtn) filterDineInBtn.style.display = "inline-flex";
    if (dineInStatEl) dineInStatEl.style.display = "inline-flex";
  }
}

function renderListLeft(orders) {
  const container = document.getElementById("list-left");
  if (!container) return;
  container.innerHTML = "";

  const filteredOrders = (orders || []).filter(order => {
    if (currentDiningFilter === "all") return true;
    const dineIn = isOrderDineIn(order);
    return currentDiningFilter === "dine_in" ? dineIn : !dineIn;
  });

  if (filteredOrders.length === 0) {
    container.innerHTML = renderEmptyLiveState('pending');
    return;
  }

  filteredOrders.forEach(order => {
    const isNew = order.status === "NEW";
    const isDineIn = isOrderDineIn(order);
    const isElapsed = typeof isOrderElapsedMode === "function" ? isOrderElapsedMode(order) : isDineIn;

    const totalFormatted = formatOrderTotal(order);
    const itemCount = countItemsFromContent(order.content);
    const itemCountStr = t("tileItemCount", { count: itemCount > 0 ? itemCount : "?" });
    const itemsPreview = getOrderItemsPreview(order);

    const isAppendedUnread = (typeof unacknowledgedAppends !== "undefined" && unacknowledgedAppends.has(order.key));

    const tile = document.createElement("div");
    tile.className = `tile ${isNew ? "is-new" : ""} ${isDineIn ? "is-dine-in" : "is-takeaway"} ${isAppendedUnread ? "is-append-new" : ""}`;
    tile.onclick = () => {
      if (typeof unacknowledgedAppends !== "undefined") unacknowledgedAppends.delete(order.key);
      openReview(order.key);
    };

    let rightActions = "";
    if (isNew) {
      rightActions = `<button type="button" class="btn tile-action-btn btn-action-review" onclick="event.stopPropagation(); openReview('${escapeHtml(order.key)}')">${POS_SVG.eye}<span>${t('btnReview')}</span></button>`;
    } else if (order.status === "ACCEPTED") {
      rightActions = `<button type="button" class="btn tile-action-btn btn-action-ready" onclick="event.stopPropagation(); updateStatus('${escapeHtml(order.key)}','DONE', {}, this)">${POS_SVG.check}<span>${t('btnReady')}</span></button>`;
    } else {
      rightActions = `<button type="button" class="btn tile-action-btn btn-action-waiting" disabled><span>${t('btnWaitingReply')}</span></button>`;
    }

    const tableNum = getOrderTableNumber(order);
    const lang = window.currentLang || (typeof currentLang !== "undefined" ? currentLang : "zh-TW");
    const tableLabel = tableNum ? (lang === 'vi' ? ` · Bàn ${tableNum}` : ` · 桌號 ${tableNum}`) : "";
    const diningBadge = isDineIn
      ? `<span class="tile-badge badge-dine-in">${POS_SVG.dineIn}${t('badgeDineIn')}${escapeHtml(tableLabel)}</span>`
      : `<span class="tile-badge badge-takeaway">${POS_SVG.takeaway}${t('badgeTakeaway')}</span>`;

    const roundCount = Number(order.round_count || order.roundCount) || 1;
    const appendBadge = (isDineIn && roundCount > 1)
      ? `<span class="tile-badge badge-append">${t('badgeAppendRound', { n: roundCount })}</span>`
      : "";

    const newBadge = isNew
      ? `<span class="tile-badge badge-new-pulse">${POS_SVG.tag}${t('badgeNewOrder')}</span>`
      : "";

    const pickupDisplay = isElapsed
      ? (typeof formatOrderSubmissionTime === "function" ? formatOrderSubmissionTime(order) : formatPickupTimeDisplay(order.time))
      : formatPickupTimeDisplay(order.time, order.createdAt, order.content);

    const etaDisplay = isElapsed
      ? (typeof formatSubmissionElapsedTime === "function" ? formatSubmissionElapsedTime(order) : formatDineInElapsedTime(order))
      : formatEta(order.time);

    const etaClass = isElapsed ? 'tile-eta-dinein' : 'tile-eta-pickup';

    tile.innerHTML = `
      <div class="tile-info">
        <div class="tile-top">
          <span class="tile-customer" title="${escapeHtml(order.customer || t('defaultCustomer'))}">${escapeHtml(order.customer || t('defaultCustomer'))}</span>
          <span class="tile-order-key">#${escapeHtml(order.key)}</span>
          ${newBadge}
          ${diningBadge}
          ${appendBadge}
        </div>
        <div class="tile-meta-row">
          <span class="tile-meta-tag"><span class="tile-meta-icon">${POS_SVG.clock}</span><span class="tile-pickup-time">${escapeHtml(pickupDisplay)}</span></span>
          <span class="tile-meta-tag tile-eta ${etaClass}">${escapeHtml(etaDisplay)}</span>
        </div>
        <div class="tile-count-row">
          <div class="tile-item-summary">
            <span class="tile-item-count"><span class="tile-meta-icon">${POS_SVG.receipt}</span>${itemCountStr}</span>
            ${itemsPreview ? `<span class="tile-item-preview" title="${escapeHtml(itemsPreview)}">${escapeHtml(itemsPreview)}</span>` : ''}
          </div>
          ${totalFormatted !== '-' ? `<span class="tile-price">${escapeHtml(totalFormatted)}</span>` : ''}
        </div>
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

  const filteredOrders = (orders || []).filter(order => {
    if (currentDiningFilter === "all") return true;
    const dineIn = isOrderDineIn(order);
    return currentDiningFilter === "dine_in" ? dineIn : !dineIn;
  });

  if (filteredOrders.length === 0) {
    container.innerHTML = renderEmptyLiveState('accepted');
    return;
  }

  filteredOrders.forEach(order => {
    const isDineIn = isOrderDineIn(order);
    const isElapsed = typeof isOrderElapsedMode === "function" ? isOrderElapsedMode(order) : isDineIn;

    const totalFormatted = formatOrderTotal(order);
    const itemCount = countItemsFromContent(order.content);
    const itemCountStr = t("tileItemCount", { count: itemCount > 0 ? itemCount : "?" });
    const itemsPreview = getOrderItemsPreview(order);

    const tile = document.createElement("div");
    tile.className = `tile ${isDineIn ? "is-dine-in" : "is-takeaway"}`;
    tile.onclick = () => openReview(order.key);

    const tableNum = getOrderTableNumber(order);
    const lang = window.currentLang || (typeof currentLang !== "undefined" ? currentLang : "zh-TW");
    const tableLabel = tableNum ? (lang === 'vi' ? ` · Bàn ${tableNum}` : ` · 桌號 ${tableNum}`) : "";
    const diningBadge = isDineIn
      ? `<span class="tile-badge badge-dine-in">${POS_SVG.dineIn}${t('badgeDineIn')}${escapeHtml(tableLabel)}</span>`
      : `<span class="tile-badge badge-takeaway">${POS_SVG.takeaway}${t('badgeTakeaway')}</span>`;

    const roundCount = Number(order.round_count || order.roundCount) || 1;
    const appendBadge = (isDineIn && roundCount > 1)
      ? `<span class="tile-badge badge-append">${t('badgeAppendRound', { n: roundCount })}</span>`
      : "";

    const pickupDisplay = isElapsed
      ? (typeof formatOrderSubmissionTime === "function" ? formatOrderSubmissionTime(order) : formatPickupTimeDisplay(order.time))
      : formatPickupTimeDisplay(order.time, order.createdAt, order.content);

    const etaDisplay = isElapsed
      ? (typeof formatSubmissionElapsedTime === "function" ? formatSubmissionElapsedTime(order) : formatDineInElapsedTime(order))
      : formatEta(order.time);

    const etaClass = isElapsed ? 'tile-eta-dinein' : 'tile-eta-pickup';

    tile.innerHTML = `
      <div class="tile-info">
        <div class="tile-top">
          <span class="tile-customer" title="${escapeHtml(order.customer || t('defaultCustomer'))}">${escapeHtml(order.customer || t('defaultCustomer'))}</span>
          <span class="tile-order-key">#${escapeHtml(order.key)}</span>
          ${diningBadge}
          ${appendBadge}
        </div>
        <div class="tile-meta-row">
          <span class="tile-meta-tag"><span class="tile-meta-icon">${POS_SVG.clock}</span><span class="tile-pickup-time">${escapeHtml(pickupDisplay)}</span></span>
          <span class="tile-meta-tag tile-eta ${etaClass}">${escapeHtml(etaDisplay)}</span>
        </div>
        <div class="tile-count-row">
          <div class="tile-item-summary">
            <span class="tile-item-count"><span class="tile-meta-icon">${POS_SVG.receipt}</span>${itemCountStr}</span>
            ${itemsPreview ? `<span class="tile-item-preview" title="${escapeHtml(itemsPreview)}">${escapeHtml(itemsPreview)}</span>` : ''}
          </div>
          ${totalFormatted !== '-' ? `<span class="tile-price">${escapeHtml(totalFormatted)}</span>` : ''}
        </div>
      </div>
      <div class="tile-actions">
        ${isDineIn
          ? `<button type="button" class="btn tile-action-btn btn-action-paid" onclick="event.stopPropagation(); updateStatus('${escapeHtml(order.key)}','PAID', {}, this)">${POS_SVG.checkAll}<span>${t('btnPaid')}</span></button>`
          : `<button type="button" class="btn tile-action-btn btn-action-pickup" onclick="event.stopPropagation(); updateStatus('${escapeHtml(order.key)}','PICKED_UP', {}, this)">${POS_SVG.checkAll}<span>${t('btnPickedUp')}</span></button>`
        }
      </div>
    `;
    container.appendChild(tile);
  });
}

function updateNewAlert() {
  const newCount = pendingNewOrders.length;
  const appendCount = (typeof unacknowledgedAppends !== "undefined") ? unacknowledgedAppends.size : 0;
  const totalCount = newCount + appendCount;
  const alertEl = document.getElementById("new-alert");
  const titleEl = document.getElementById("new-alert-title");
  const subEl = document.getElementById("new-alert-sub");
  if (!alertEl || !titleEl) return;

  if (totalCount <= 0) {
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
    // If a brand-new order or append arrived that wasn't in the snoozed set, wake up immediately!
    const hasBrandNew = pendingNewOrders.some(o => o?.key && !snoozedNewOrderKeys.has(o.key));
    const hasBrandNewAppend = (typeof unacknowledgedAppends !== "undefined") && Array.from(unacknowledgedAppends.keys()).some(k => !snoozedNewOrderKeys.has(k));
    if (!hasBrandNew && !hasBrandNewAppend) {
      alertEl.style.display = "none";
      if (typeof stopContinuousAlarm === "function") stopContinuousAlarm();
      return;
    }
  }

  // Format title & subtitle based on mix of new vs append orders
  if (newCount > 0 && appendCount > 0) {
    titleEl.innerText = t("alertTitleCombined", { newCount, appendCount });
    if (subEl) subEl.innerText = t("alertSub");
  } else if (appendCount > 0) {
    titleEl.innerText = t("alertTitleAppend", { count: appendCount });
    const tableList = Array.from(unacknowledgedAppends.values())
      .map(a => a.tableNumber ? `${a.tableNumber}號桌` : a.key)
      .join(", ");
    if (subEl) subEl.innerText = t("alertSubAppend", { tables: tableList || "—" });
  } else {
    titleEl.innerText = t("alertTitle", { count: newCount });
    if (subEl) subEl.innerText = t("alertSub");
  }

  alertEl.style.display = "flex";
  if (typeof startContinuousAlarm === "function") startContinuousAlarm();
}

function dismissNewAlert() {
  newAlertSnoozeUntilMs = Date.now() + 30_000;
  const appendKeys = (typeof unacknowledgedAppends !== "undefined") ? Array.from(unacknowledgedAppends.keys()) : [];
  snoozedNewOrderKeys = new Set([
    ...pendingNewOrders.map(o => o?.key).filter(Boolean),
    ...appendKeys
  ]);
  if (typeof unacknowledgedAppends !== "undefined") {
    unacknowledgedAppends.clear();
  }
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
  if (pendingNewOrders.length > 0) {
    openReview(pendingNewOrders[0].key);
    return;
  }
  if (typeof unacknowledgedAppends !== "undefined" && unacknowledgedAppends.size > 0) {
    const firstAppendKey = unacknowledgedAppends.keys().next().value;
    unacknowledgedAppends.delete(firstAppendKey);
    openReview(firstAppendKey);
    return;
  }
  dismissNewAlert();
}

var preparedOrderItems = window.preparedOrderItems || new Set();
window.preparedOrderItems = preparedOrderItems;

function toggleItemPreparedState(orderKey, itemIdx, checkbox) {
  const itemKey = `${orderKey}_item_${itemIdx}`;
  if (checkbox && checkbox.checked) {
    preparedOrderItems.add(itemKey);
  } else {
    preparedOrderItems.delete(itemKey);
  }
  const row = document.getElementById(`review-item-${orderKey}-${itemIdx}`);
  if (row) {
    if (checkbox && checkbox.checked) {
      row.classList.add('item-prepared');
    } else {
      row.classList.remove('item-prepared');
    }
  }
}
window.toggleItemPreparedState = toggleItemPreparedState;

function extractFlavorSettings(rawContent) {
  if (!rawContent) return null;
  const lines = String(rawContent).split("\n");
  const flavors = [];
  const extraIngredients = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.includes("口味設定") || line.includes("Hương vị") || line.includes("Khẩu vị")) {
      const inline = line.replace(/.*(?:口味設定|Hương vị|Khẩu vị)[：:]\s*/, "").replace(/[【】]/g, "").trim();
      if (inline) {
        const parts = inline.split(/[・·|,|｜]/).map(p => p.trim()).filter(Boolean);
        parts.forEach(p => {
          const m = p.match(/^([^：:]+)[：:]\s*(.+)$/);
          if (m) {
            const key = m[1].replace(/✦/g, "").replace(/選擇|調整/g, "").replace(/[\(（]朝天椒[\)）]/g, "").trim();
            const val = m[2].trim();
            flavors.push({ label: key, value: val });
          } else {
            flavors.push({ label: "", value: p });
          }
        });
      }
    } else {
      const extraMatch = line.match(/^[•\-*]\s*([^：:]+)[：:]\s*(.+)$/);
      if (extraMatch) {
        const label = extraMatch[1].replace(/✦/g, "").replace(/選擇|調整/g, "").trim();
        const val = extraMatch[2].trim();
        if (label && val && !label.includes("訂單") && !label.includes("總金額") && !label.includes("時間") && !label.includes("取餐") && !label.includes("用餐方式")) {
          extraIngredients.push(val);
        }
      } else if (line.includes("| 口味:") || line.includes("| 口味：") || line.includes("｜ 口味:") || line.includes("｜ 口味：")) {
        const flavorPart = line.split(/[|｜]/).slice(1).join("|").trim();
        const parts = flavorPart.split(/[/／]/).map(p => p.trim()).filter(Boolean);
        parts.forEach(p => {
          const m = p.match(/^([^：:]+)[：:]\s*(.+)$/);
          if (m) {
            flavors.push({ label: m[1].trim(), value: m[2].trim() });
          } else {
            flavors.push({ label: "", value: p });
          }
        });
      }
    }
  }

  if (flavors.length === 0 && extraIngredients.length === 0) return null;
  return { flavors, extraIngredients };
}
window.extractFlavorSettings = extractFlavorSettings;

function extractCustomerChanges(rawContent) {
  if (!rawContent) return null;
  const lines = String(rawContent).split("\n");
  const changes = [];
  for (const line of lines) {
    const l = line.trim();
    if (l.includes("【顧客換單】") || l.includes("【換單】") || l.includes("【Đổi món】") || l.includes("【Thay đổi】")) {
      const text = l.replace(/.*【(?:顧客換單|換單|Đổi món|Thay đổi)】[：:]\s*/, "").trim();
      if (text) changes.push(text);
    }
  }
  return changes.length > 0 ? changes : null;
}
window.extractCustomerChanges = extractCustomerChanges;

function toggleRawOrderViewer(orderKey) {
  const body = document.getElementById(`raw-order-body-${orderKey}`);
  const btn = document.getElementById(`raw-order-toggle-btn-${orderKey}`);
  const textSpan = document.getElementById(`raw-order-btn-text-${orderKey}`);
  if (!body) return;
  const isHidden = body.style.display === "none";
  body.style.display = isHidden ? "block" : "none";
  if (btn) {
    if (isHidden) {
      btn.classList.add("expanded");
    } else {
      btn.classList.remove("expanded");
    }
  }
  if (textSpan && typeof t === "function") {
    textSpan.innerText = isHidden ? t("hideRawOrder") : t("viewRawOrder");
  }
}
window.toggleRawOrderViewer = toggleRawOrderViewer;

async function copyRawOrderContent(orderKey) {
  const pre = document.getElementById(`raw-order-text-${orderKey}`);
  const copyBtn = document.getElementById(`raw-order-copy-btn-${orderKey}`);
  if (!pre) return;
  const text = pre.innerText || "";
  try {
    await navigator.clipboard.writeText(text);
    if (copyBtn) {
      const originalHtml = copyBtn.innerHTML;
      const successText = (typeof t === "function" && t("copySuccess")) || "已複製";
      const checkIcon = (typeof POS_SVG !== "undefined" && POS_SVG.check) || "";
      copyBtn.innerHTML = `${checkIcon}<span>${escapeHtml(successText)}</span>`;
      setTimeout(() => {
        if (copyBtn) copyBtn.innerHTML = originalHtml;
      }, 2000);
    }
  } catch (err) {
    console.error("Failed to copy raw order: ", err);
  }
}
window.copyRawOrderContent = copyRawOrderContent;

function renderItemRowHtml(it, idx, orderKey) {
  const isPrepared = preparedOrderItems.has(`${orderKey}_item_${idx}`);
  let optionsHtml = "";
  if (it.options) {
    const rawOpts = String(it.options);
    const splitOpts = rawOpts.split(/[、,，\n]+/).map(s => s.trim()).filter(Boolean);
    if (splitOpts.length > 0) {
      optionsHtml = `<div class="review-item-options">${splitOpts.map(opt => `<span class="mod-chip">${escapeHtml(opt)}</span>`).join("")}</div>`;
    }
  }
  const noteIcon = (typeof POS_SVG !== "undefined" && POS_SVG.note) || "";
  const noteHtml = it.note ? `<div class="review-item-note">${noteIcon}${escapeHtml(it.note)}</div>` : "";
  const unitBadge = (it.originalQty && it.originalQty > 1) ? `<span class="review-item-unit-badge">(${it.unitIndex}/${it.originalQty})</span>` : "";
  const qtyBadge = (it.quantity && it.quantity > 1) ? `<span class="review-item-qty-badge">x${it.quantity}</span>` : "";
  const printLabel = (typeof t === "function" && t("btnPrintStickerShort")) || "印貼紙";
  const printerIcon = (typeof POS_SVG !== "undefined" && POS_SVG.printer) || "";
  const checkTitle = isPrepared
    ? ((typeof t === "function" && t("itemPreparedBadge")) || "已完成")
    : ((typeof t === "function" && t("markPrepared")) || "標記已出餐");

  return `
    <div class="review-item-row ${isPrepared ? 'item-prepared' : ''}" id="review-item-${escapeHtml(orderKey)}-${idx}">
      <label class="review-item-check-container" title="${escapeHtml(checkTitle)}">
        <input type="checkbox" class="review-item-checkbox" ${isPrepared ? 'checked' : ''} onchange="toggleItemPreparedState('${escapeHtml(orderKey)}', ${idx}, this)">
      </label>
      <div class="review-item-seq-badge">${idx + 1}</div>
      <div class="review-item-details">
        <div class="review-item-header">
          <span class="review-item-name">${escapeHtml(it.name)}</span>
          ${qtyBadge}
          ${unitBadge}
        </div>
        ${optionsHtml}
        ${noteHtml}
      </div>
      ${it.price ? `<div class="review-item-price">${escapeHtml(it.price)}</div>` : ''}
      <button type="button" class="btn btn-ghost review-item-print-btn" onclick="if(typeof PrinterService !== 'undefined') PrinterService.printSingleItemSticker('${escapeHtml(orderKey)}', ${idx})" title="${escapeHtml(printLabel)}">
        ${printerIcon}
        <span>${escapeHtml(printLabel)}</span>
      </button>
    </div>
  `;
}
window.renderItemRowHtml = renderItemRowHtml;

function formatContentHtml(order) {
  const raw = String(order?.content || "");
  if (order?.reason === "Đơn qua tin nhắn") {
    return `<div class="review-content-raw">${escapeHtml(raw)}</div>`;
  }

  const orderKey = order?.key || "";
  let allParsedItems = (typeof PrinterService !== "undefined" && typeof PrinterService.parseOrderItems === "function")
    ? PrinterService.parseOrderItems(order, true)
    : null;

  // Filter out any metadata lines that might have been parsed as items
  if (allParsedItems && Array.isArray(allParsedItems)) {
    allParsedItems = allParsedItems.filter(it => it && it.name && !isOrderMetadataText(it.name));
  }

  // 1. Extract and render Customer Change Requests
  const customerChanges = extractCustomerChanges(raw);
  let changeHtml = "";
  if (customerChanges && customerChanges.length > 0) {
    const changeTitle = (typeof t === "function" && t("customerChangeTitle")) || "顧客換單 / 特殊需求";
    changeHtml = `
      <div class="customer-change-card">
        <div class="customer-change-header">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block; vertical-align:-2px; margin-right:4px;"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
          <span>${escapeHtml(changeTitle)}</span>
        </div>
        <div class="customer-change-body">
          ${customerChanges.map(c => `<div class="customer-change-line">${escapeHtml(c)}</div>`).join("")}
        </div>
      </div>
    `;
  }

  // 2. Extract and render Global Flavor Settings
  const flavorData = extractFlavorSettings(raw);
  let flavorHtml = "";
  if (flavorData) {
    const flameIcon = (typeof POS_SVG !== "undefined" && POS_SVG.flame) || "";
    const flavorTitle = (typeof t === "function" && t("flavorTitle")) || "口味與客製設定";
    const optLabelFallback = (typeof t === "function" && t("colOptions")) || "配料";
    const chips = [
      ...flavorData.flavors.map(f => `
        <span class="flavor-chip">
          ${f.label ? `<span class="flavor-label">${escapeHtml(f.label)}:</span>` : ""}
          <strong class="flavor-val">${escapeHtml(f.value)}</strong>
        </span>
      `),
      ...flavorData.extraIngredients.map(e => {
        const lbl = (typeof e === 'object' && e && e.label) ? e.label : optLabelFallback;
        const val = (typeof e === 'object' && e && e.value) ? e.value : String(e);
        return `
          <span class="flavor-chip extra-chip">
            <span class="flavor-label">${escapeHtml(lbl)}:</span>
            <strong class="flavor-val">${escapeHtml(val)}</strong>
          </span>
        `;
      })
    ].join("");

    flavorHtml = `
      <div class="flavor-custom-card">
        <div class="flavor-card-header">
          ${flameIcon}
          <span>${escapeHtml(flavorTitle)}</span>
        </div>
        <div class="flavor-chips-grid">
          ${chips}
        </div>
      </div>
    `;
  }

  // 3. Multi-round detection: [第 X 輪 or [Đợt X
  const hasMultiRound = raw.includes("[第") || raw.includes("[Đợt");
  let contentHtml = "";

  if (hasMultiRound && allParsedItems && allParsedItems.length > 0) {
    const roundMap = new Map();
    allParsedItems.forEach((it, idx) => {
      const rdHeader = it.round || (typeof t === "function" ? t("roundBlockInitial") : "Đợt 1");
      if (!roundMap.has(rdHeader)) {
        roundMap.set(rdHeader, []);
      }
      roundMap.get(rdHeader).push({ item: it, globalIdx: idx });
    });

    const rounds = Array.from(roundMap.entries()).map(([header, itemsList]) => ({ header, itemsList }));

    const getRoundNum = (rd, fallbackIdx) => {
      const m = (rd.header || "").match(/(?:第\s*(\d+)\s*輪|Đợt\s*(\d+))/i);
      if (m) {
        return parseInt(m[1] || m[2], 10);
      }
      return fallbackIdx + 1;
    };

    rounds.sort((a, b) => getRoundNum(b, 0) - getRoundNum(a, 0));

    contentHtml = rounds.map((rd, idx) => {
      const isLatest = (rounds.length > 1 && idx === 0);
      const headerText = rd.header
        ? rd.header.replace(/^\[/, '').replace(/\]$/, '')
        : (idx === 0 ? t('roundBlockInitial') : t('roundBlockTitle', { n: idx + 1 }));

      const itemsHtml = rd.itemsList.map(entry => renderItemRowHtml(entry.item, entry.globalIdx, orderKey)).join("");

      return `
        <div class="round-section-block ${isLatest ? 'round-section-latest' : ''}">
          <div class="round-section-header">
            <span class="round-title">${POS_SVG.dineIn}${escapeHtml(headerText)}</span>
            ${isLatest ? `<span class="round-latest-badge">${t('roundBlockLatest')}</span>` : ''}
          </div>
          <div class="round-items-container">
            ${itemsHtml}
          </div>
        </div>
      `;
    }).join("");
  } else if (allParsedItems && allParsedItems.length > 0) {
    contentHtml = `
      <div class="review-items-list">
        ${allParsedItems.map((it, idx) => renderItemRowHtml(it, idx, orderKey)).join("")}
      </div>
    `;
  } else {
    const lines = raw.split("\n")
      .map(l => l.trimEnd())
      .filter(l => l.trim() !== "" && !isOrderMetadataText(l));

    if (lines.length === 0) return `<div class="review-content-empty">-</div>`;

    contentHtml = `
      <div class="review-items-list-raw">
        ${lines.map(line => {
          const text = line.trimStart();
          const isSub = text.startsWith("-") || text.startsWith("•") || text.startsWith("↳") || text.startsWith("－");
          return `<div class="${isSub ? 'review-raw-sub' : 'review-raw-item'}">${escapeHtml(line)}</div>`;
        }).join("")}
      </div>
    `;
  }

  // 4. Customer note section
  let noteHtml = "";
  if (order?.note) {
    const noteIcon = (typeof POS_SVG !== "undefined" && POS_SVG.note) || "";
    const noteTitle = (typeof t === "function" && t("customerNoteLabel")) || "顧客備註";
    noteHtml = `
      <div class="order-note-alert">
        <div class="order-note-alert-header">${noteIcon}<span>${escapeHtml(noteTitle)}</span></div>
        <div class="order-note-alert-body">${escapeHtml(order.note)}</div>
      </div>
    `;
  }

  // 5. Raw order accordion (Unstructured data fallback)
  const fileTextIcon = (typeof POS_SVG !== "undefined" && POS_SVG.fileText) || "";
  const copyIcon = (typeof POS_SVG !== "undefined" && POS_SVG.copy) || "";
  const viewRawLabel = (typeof t === "function" && t("viewRawOrder")) || "查看原始訂單內容";
  const rawOrderTitle = (typeof t === "function" && t("rawOrderTitle")) || "原始訂單文字（Raw Data）";
  const btnCopyLabel = (typeof t === "function" && t("btnCopy")) || "複製";

  const rawAccordionHtml = `
    <div class="raw-order-accordion">
      <button type="button" class="btn btn-ghost raw-order-toggle-btn" id="raw-order-toggle-btn-${escapeHtml(orderKey)}" onclick="toggleRawOrderViewer('${escapeHtml(orderKey)}')">
        <span class="raw-order-toggle-left">${fileTextIcon}<span id="raw-order-btn-text-${escapeHtml(orderKey)}">${escapeHtml(viewRawLabel)}</span></span>
        <svg class="raw-order-chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
      </button>
      <div id="raw-order-body-${escapeHtml(orderKey)}" class="raw-order-body" style="display:none;">
        <div class="raw-order-header">
          <span class="raw-order-title">${escapeHtml(rawOrderTitle)}</span>
          <button type="button" class="btn btn-ghost raw-order-copy-btn" id="raw-order-copy-btn-${escapeHtml(orderKey)}" onclick="copyRawOrderContent('${escapeHtml(orderKey)}')">
            ${copyIcon}
            <span>${escapeHtml(btnCopyLabel)}</span>
          </button>
        </div>
        <pre id="raw-order-text-${escapeHtml(orderKey)}" class="raw-order-pre">${escapeHtml(raw)}</pre>
      </div>
    </div>
  `;

  return `<div class="review-content-card">${changeHtml}${flavorHtml}${contentHtml}${noteHtml}${rawAccordionHtml}</div>`;
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

window.isOrderDineIn = isOrderDineIn;
window.getOrderTableNumber = getOrderTableNumber;
window.setDiningFilter = setDiningFilter;
window.updateDiningFilterStats = updateDiningFilterStats;
window.renderListLeft = renderListLeft;
window.renderListRight = renderListRight;
window.updateNewAlert = updateNewAlert;
window.dismissNewAlert = dismissNewAlert;
window.reviewNextNewOrder = reviewNextNewOrder;
window.updateStatus = updateStatus;
window.formatContentHtml = formatContentHtml;
window.reviewAccept = reviewAccept;
window.markReadyFromReview = markReadyFromReview;
window.reviewForceCancel = reviewForceCancel;
window.toggleRawOrderViewer = toggleRawOrderViewer;
window.copyRawOrderContent = copyRawOrderContent;
window.extractFlavorSettings = extractFlavorSettings;
window.extractCustomerChanges = extractCustomerChanges;
