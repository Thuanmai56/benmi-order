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

function updateDiningFilterStats(allLiveOrders) {
  const isFeatureEnabled = Array.isArray(window.currentTenantFeatures)
    ? window.currentTenantFeatures.includes('dine_in')
    : false;

  const diningFilterBar = document.getElementById("dining-filter-bar");
  const filterDineInBtn = document.getElementById("filter-btn-dine-in");
  const dineInStatEl = document.getElementById("stat-pill-dinein");

  if (!isFeatureEnabled) {
    if (diningFilterBar) diningFilterBar.style.display = "none";
    if (filterDineInBtn) filterDineInBtn.style.display = "none";
    if (dineInStatEl) dineInStatEl.style.display = "none";
    if (currentDiningFilter === "dine_in") {
      currentDiningFilter = "all";
      const filterAllBtn = document.getElementById("filter-btn-all");
      if (filterAllBtn) filterAllBtn.classList.add("active");
    }
    return;
  } else {
    if (diningFilterBar) diningFilterBar.style.display = "flex";
    if (filterDineInBtn) filterDineInBtn.style.display = "inline-flex";
    if (dineInStatEl) dineInStatEl.style.display = "inline-flex";
  }

  let takeawayCount = 0;
  let dineInCount = 0;

  (allLiveOrders || []).forEach(order => {
    if (isOrderDineIn(order)) {
      dineInCount++;
    } else {
      takeawayCount++;
    }
  });

  const takeawayStatEl = document.getElementById("stat-pill-takeaway");
  if (takeawayStatEl) takeawayStatEl.innerHTML = `${POS_SVG.takeaway} ${t('badgeTakeaway')} ${takeawayCount}`;

  if (dineInStatEl) dineInStatEl.innerHTML = `${POS_SVG.dineIn} ${t('badgeDineIn')} ${dineInCount}`;
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
    container.innerHTML = `<div style="text-align:center; padding: 22px; color:#999;">${t('empty')}</div>`;
    return;
  }

  filteredOrders.forEach(order => {
    const isNew = order.status === "NEW";
    const isDineIn = isOrderDineIn(order);
    const isElapsed = typeof isOrderElapsedMode === "function" ? isOrderElapsedMode(order) : isDineIn;

    const totalFormatted = formatOrderTotal(order);
    const itemCount = countItemsFromContent(order.content);
    const itemCountStr = t("tileItemCount", { count: itemCount > 0 ? itemCount : "?" });

    const isAppendedUnread = (typeof unacknowledgedAppends !== "undefined" && unacknowledgedAppends.has(order.key));

    const tile = document.createElement("div");
    tile.className = `tile ${isNew ? "new" : ""} ${isAppendedUnread ? "append-new" : ""}`;
    tile.onclick = () => {
      if (typeof unacknowledgedAppends !== "undefined") unacknowledgedAppends.delete(order.key);
      openReview(order.key);
    };

    let rightActions = "";
    const printBtn = `<button class="btn btn-ghost tile-action-btn" style="background:#f8fafc; color:#475569; border:1.5px solid #cbd5e1; padding: 6px 10px; margin-right: 4px;" title="${t('btnPrint')}" onclick="event.stopPropagation(); if(typeof PrinterService !== 'undefined') PrinterService.printManual('${escapeHtml(order.key)}')">🖨️ ${t('btnPrint')}</button>`;

    if (isNew) {
      rightActions = `${printBtn}<button class="btn btn-ghost tile-action-btn" style="background:#e0f2fe; color:#0369a1;" onclick="event.stopPropagation(); openReview('${escapeHtml(order.key)}')">${t('btnReview')}</button>`;
    } else if (order.status === "ACCEPTED") {
      rightActions = `${printBtn}<button class="btn btn-primary tile-action-btn" onclick="event.stopPropagation(); updateStatus('${escapeHtml(order.key)}','DONE', {}, this)">${t('btnReady')}</button>`;
    } else {
      rightActions = `${printBtn}<button class="btn tile-action-btn" style="background:#f1f5f9; color:#94a3af; cursor:not-allowed;" disabled>${t('btnWaitingReply')}</button>`;
    }

    const tableNum = getOrderTableNumber(order);
    const lang = window.currentLang || (typeof currentLang !== "undefined" ? currentLang : "zh-TW");
    const tableLabel = tableNum ? (lang === 'vi' ? ` · Bàn ${tableNum}` : ` · 桌號 ${tableNum}`) : "";
    const diningBadge = isDineIn
      ? `<span class="badge badge-dine-in" style="font-size:11px; padding:2px 6px; border-radius:4px; font-weight:800; white-space:nowrap; flex-shrink:0;">${POS_SVG.dineIn}${t('badgeDineIn')}${escapeHtml(tableLabel)}</span>`
      : `<span class="badge badge-takeaway" style="font-size:11px; padding:2px 6px; border-radius:4px; font-weight:800; white-space:nowrap; flex-shrink:0;">${POS_SVG.takeaway}${t('badgeTakeaway')}</span>`;

    const roundCount = Number(order.round_count || order.roundCount) || 1;
    const appendBadge = (isDineIn && roundCount > 1)
      ? `<span class="badge badge-append" style="font-size:11px; padding:2px 6px; border-radius:4px; font-weight:800; white-space:nowrap; flex-shrink:0;">${t('badgeAppendRound', { n: roundCount })}</span>`
      : "";

    const pickupDisplay = isElapsed
      ? (typeof formatOrderSubmissionTime === "function" ? formatOrderSubmissionTime(order) : formatPickupTimeDisplay(order.time))
      : formatPickupTimeDisplay(order.time, order.createdAt, order.content);

    const etaDisplay = isElapsed
      ? (typeof formatSubmissionElapsedTime === "function" ? formatSubmissionElapsedTime(order) : formatDineInElapsedTime(order))
      : formatEta(order.time);

    const etaStyle = isElapsed ? 'color:#7c3aed; font-weight:800;' : '';

    tile.innerHTML = `
      <div class="tile-info">
        <div class="tile-top">
          <span class="tile-customer" title="${escapeHtml(order.customer || t('defaultCustomer'))}">${escapeHtml(order.customer || t('defaultCustomer'))}</span>
          <span class="tile-order-key">#${escapeHtml(order.key)}</span>
          ${diningBadge}
          ${appendBadge}
        </div>
        <div class="tile-meta-row">
          <span class="tile-meta-tag">${POS_SVG.clock}${escapeHtml(pickupDisplay)}</span>
          <span class="tile-meta-tag tile-eta" style="${etaStyle}">${escapeHtml(etaDisplay)}</span>
        </div>
        <div class="tile-count-row">
          <span class="tile-item-count">${POS_SVG.receipt}${itemCountStr}</span>
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
    container.innerHTML = `<div style="text-align:center; padding: 22px; color:#999;">${t('empty')}</div>`;
    return;
  }

  filteredOrders.forEach(order => {
    const isDineIn = isOrderDineIn(order);
    const isElapsed = typeof isOrderElapsedMode === "function" ? isOrderElapsedMode(order) : isDineIn;

    const totalFormatted = formatOrderTotal(order);
    const itemCount = countItemsFromContent(order.content);
    const itemCountStr = t("tileItemCount", { count: itemCount > 0 ? itemCount : "?" });

    const tile = document.createElement("div");
    tile.className = "tile";
    tile.onclick = () => openReview(order.key);

    const tableNum = getOrderTableNumber(order);
    const lang = window.currentLang || (typeof currentLang !== "undefined" ? currentLang : "zh-TW");
    const tableLabel = tableNum ? (lang === 'vi' ? ` · Bàn ${tableNum}` : ` · 桌號 ${tableNum}`) : "";
    const diningBadge = isDineIn
      ? `<span class="badge badge-dine-in" style="font-size:11px; padding:2px 6px; border-radius:4px; font-weight:800; white-space:nowrap; flex-shrink:0;">${POS_SVG.dineIn}${t('badgeDineIn')}${escapeHtml(tableLabel)}</span>`
      : `<span class="badge badge-takeaway" style="font-size:11px; padding:2px 6px; border-radius:4px; font-weight:800; white-space:nowrap; flex-shrink:0;">${POS_SVG.takeaway}${t('badgeTakeaway')}</span>`;

    const roundCount = Number(order.round_count || order.roundCount) || 1;
    const appendBadge = (isDineIn && roundCount > 1)
      ? `<span class="badge badge-append" style="font-size:11px; padding:2px 6px; border-radius:4px; font-weight:800; white-space:nowrap; flex-shrink:0;">${t('badgeAppendRound', { n: roundCount })}</span>`
      : "";

    const pickupDisplay = isElapsed
      ? (typeof formatOrderSubmissionTime === "function" ? formatOrderSubmissionTime(order) : formatPickupTimeDisplay(order.time))
      : formatPickupTimeDisplay(order.time, order.createdAt, order.content);

    const etaDisplay = isElapsed
      ? (typeof formatSubmissionElapsedTime === "function" ? formatSubmissionElapsedTime(order) : formatDineInElapsedTime(order))
      : formatEta(order.time);

    const etaStyle = isElapsed ? 'color:#7c3aed; font-weight:800;' : '';

    tile.innerHTML = `
      <div class="tile-info">
        <div class="tile-top">
          <span class="tile-customer" title="${escapeHtml(order.customer || t('defaultCustomer'))}">${escapeHtml(order.customer || t('defaultCustomer'))}</span>
          <span class="tile-order-key">#${escapeHtml(order.key)}</span>
          ${diningBadge}
          ${appendBadge}
        </div>
        <div class="tile-meta-row">
          <span class="tile-meta-tag">${POS_SVG.clock}${escapeHtml(pickupDisplay)}</span>
          <span class="tile-meta-tag tile-eta" style="${etaStyle}">${escapeHtml(etaDisplay)}</span>
        </div>
        <div class="tile-count-row">
          <span class="tile-item-count">${POS_SVG.receipt}${itemCountStr}</span>
          ${totalFormatted !== '-' ? `<span class="tile-price">${escapeHtml(totalFormatted)}</span>` : ''}
        </div>
      </div>
      <div class="tile-actions">
        <button class="btn btn-ghost tile-action-btn" style="background:#f8fafc; color:#475569; border:1.5px solid #cbd5e1; padding: 6px 10px; margin-right: 4px;" title="${t('btnReprint') || t('btnPrint')}" onclick="event.stopPropagation(); if(typeof PrinterService !== 'undefined') PrinterService.printManual('${escapeHtml(order.key)}')">🖨️ ${t('btnReprint') || t('btnPrint')}</button>
        ${isDineIn
          ? `<button class="btn tile-action-btn" style="background:#7c3aed; color:#ffffff;" onclick="event.stopPropagation(); updateStatus('${escapeHtml(order.key)}','PAID', {}, this)">${t('btnPaid')}</button>`
          : `<button class="btn btn-yellow tile-action-btn" onclick="event.stopPropagation(); updateStatus('${escapeHtml(order.key)}','PICKED_UP', {}, this)">${t('btnPickedUp')}</button>`
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

function renderItemRowHtml(it, idx, orderKey) {
  const isPrepared = preparedOrderItems.has(`${orderKey}_item_${idx}`);
  const optionsHtml = it.options ? `<div class="review-item-options">${escapeHtml(it.options)}</div>` : "";
  const noteHtml = it.note ? `<div class="review-item-note">📝 ${escapeHtml(it.note)}</div>` : "";
  const unitBadge = (it.originalQty && it.originalQty > 1) ? `<span class="review-item-unit-badge">(${it.unitIndex}/${it.originalQty})</span>` : "";
  const printLabel = (typeof t === "function" && t("btnPrintSingleItem")) || "In tem món";
  const printerIcon = (typeof POS_SVG !== "undefined" && POS_SVG.printer) || "";

  return `
    <div class="review-item-row ${isPrepared ? 'item-prepared' : ''}" id="review-item-${escapeHtml(orderKey)}-${idx}">
      <label class="review-item-check-container" title="${isPrepared ? 'Đã hoàn thành' : 'Đánh dấu đã hoàn thành'}">
        <input type="checkbox" class="review-item-checkbox" ${isPrepared ? 'checked' : ''} onchange="toggleItemPreparedState('${escapeHtml(orderKey)}', ${idx}, this)">
      </label>
      <div class="review-item-details">
        <div class="review-item-header">
          <span class="review-item-seq">${idx + 1}.</span>
          <span class="review-item-name">${escapeHtml(it.name)}</span>
          ${unitBadge}
        </div>
        ${optionsHtml}
        ${noteHtml}
      </div>
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
    return `<div style="background:rgba(0,185,0,0.07); border:1.5px solid rgba(0,185,0,0.25); border-radius:16px; padding:18px; white-space:pre-wrap; line-height:1.7; font-size:22px;">${escapeHtml(raw)}</div>`;
  }

  const orderKey = order?.key || "";
  const allParsedItems = (typeof PrinterService !== "undefined" && typeof PrinterService.parseOrderItems === "function")
    ? PrinterService.parseOrderItems(order, true)
    : null;

  // Multi-round detection: [第 X 輪 or [Đợt X
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
        <div class="round-section-block ${isLatest ? 'round-section-latest' : ''}" style="${isLatest ? 'background:#fbf7ff; border:2px solid #a855f7; border-radius:14px; padding:14px 16px; margin-bottom:12px; box-shadow:0 2px 8px rgba(168,85,247,0.15);' : 'background:#f8fafc; border:1.5px solid #e2e8f0; border-radius:14px; padding:14px 16px; margin-bottom:12px;'}">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px; padding-bottom:6px; border-bottom:${isLatest ? '1.5px solid #e9d5ff' : '1px solid #e2e8f0'};">
            <span style="font-weight:900; font-size:18px; color:${isLatest ? '#6b21a8' : '#334155'};">${POS_SVG.dineIn}${escapeHtml(headerText)}</span>
            ${isLatest ? `<span style="background:#7e22ce; color:#ffffff; font-size:12px; font-weight:800; padding:2px 8px; border-radius:6px; letter-spacing:0.3px;">${t('roundBlockLatest')}</span>` : ''}
          </div>
          <div class="round-items-container">
            ${itemsHtml}
          </div>
        </div>
      `;
    }).join("");
  } else if (allParsedItems && allParsedItems.length > 0) {
    contentHtml = `
      <div class="review-items-list" style="display: flex; flex-direction: column; gap: 8px;">
        ${allParsedItems.map((it, idx) => renderItemRowHtml(it, idx, orderKey)).join("")}
      </div>
    `;
  } else {
    const lines = raw.split("\n").map(l => l.trimEnd()).filter(l => l.trim() !== "");
    if (lines.length === 0) return `<div style="background:rgba(0,185,0,0.07); border:1.5px solid rgba(0,185,0,0.25); border-radius:16px; padding:18px;">-</div>`;

    contentHtml = lines.map(line => {
      const text = line.trimStart();
      const isSub = text.startsWith("-") || text.startsWith("•") || text.startsWith("↳") || text.startsWith("－");
      return `<div style="${isSub ? 'padding-left:16px; color:#4b5563; font-size:20px;' : 'font-weight:800; margin-top:8px; font-size:22px;'}">${escapeHtml(line)}</div>`;
    }).join("");
  }

  let footer = "";
  if (order?.note) {
    footer += `<div style="color: #555; font-size: 18px; margin-top: 12px; font-weight: 800;">📝 ${escapeHtml(order.note)}</div>`;
  }

  const totalDisplay = formatOrderTotal(order);
  if (totalDisplay !== "-") {
    footer += `<div style="display:flex; justify-content:space-between; align-items:center; margin-top:16px; padding-top:12px; border-top:1.5px dashed rgba(0,185,0,0.35); font-weight:1000; font-size:22px; color:#111827;"><span>${t('labelTotal')}:</span><span style="color:var(--primary); font-size:26px; font-weight:1100;">${totalDisplay}</span></div>`;
  }

  return `<div style="background:rgba(0,185,0,0.07); border:1.5px solid rgba(0,185,0,0.25); border-radius:16px; padding:18px; line-height:1.7;">${contentHtml}${footer}</div>`;
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
