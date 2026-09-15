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

// Live tiles show the clock time only; dates are not useful in the active queue.
function formatLiveOrderTimeDisplay(order) {
  if (!order) return "-";

  const isElapsed = typeof isOrderElapsedMode === "function"
    ? isOrderElapsedMode(order)
    : isOrderDineIn(order);
  const rawDisplay = isElapsed
    ? (typeof formatOrderSubmissionTime === "function" ? formatOrderSubmissionTime(order) : formatPickupTimeDisplay(order.time))
    : formatPickupTimeDisplay(order.time, order.createdAt, order.content);
  const timeMatch = String(rawDisplay || "").match(/(\d{1,2}):(\d{2})/);

  if (!timeMatch) return rawDisplay || "-";
  return `${String(parseInt(timeMatch[1], 10)).padStart(2, "0")}:${timeMatch[2]}`;
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
        items.push({ name: (m[2] || m[1] || "").replace(/\$[\d,.]+/g, '').trim(), quantity: Number(m[1] || m[2]) || 1 });
      } else if (!line.startsWith("[") && line.length > 1 && line.length < 30) {
        items.push({ name: line.replace(/\$[\d,.]+/g, '').trim(), quantity: 1 });
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

    const pickupDisplay = formatLiveOrderTimeDisplay(order);

    const etaDisplay = isElapsed
      ? (typeof formatSubmissionElapsedTime === "function" ? formatSubmissionElapsedTime(order) : formatDineInElapsedTime(order))
      : formatEta(order.time);

    const etaClass = isElapsed ? 'tile-eta-dinein' : 'tile-eta-pickup';

    tile.innerHTML = `
      <div class="tile-info">
        <div class="tile-top">
          <span class="tile-customer" title="${escapeHtml(order.customer || t('defaultCustomer'))}">${escapeHtml(order.customer || t('defaultCustomer'))}</span>
          <span class="tile-order-key">#${escapeHtml(order.displayKey || order.key)}</span>
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

    const pickupDisplay = formatLiveOrderTimeDisplay(order);

    const etaDisplay = isElapsed
      ? (typeof formatSubmissionElapsedTime === "function" ? formatSubmissionElapsedTime(order) : formatDineInElapsedTime(order))
      : formatEta(order.time);

    const etaClass = isElapsed ? 'tile-eta-dinein' : 'tile-eta-pickup';

    tile.innerHTML = `
      <div class="tile-info">
        <div class="tile-top">
          <span class="tile-customer" title="${escapeHtml(order.customer || t('defaultCustomer'))}">${escapeHtml(order.customer || t('defaultCustomer'))}</span>
          <span class="tile-order-key">#${escapeHtml(order.displayKey || order.key)}</span>
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
  const isReviewOpen = document.getElementById("reviewModal") && document.getElementById("reviewModal").style.display === "flex";
  const currentKey = (isReviewOpen && typeof reviewingOrder !== "undefined" && reviewingOrder) ? reviewingOrder.key : null;

  // Prioritize another pending new order if current order is already displayed
  let targetOrder = pendingNewOrders.find(o => o && o.key && o.key !== currentKey);
  if (!targetOrder && pendingNewOrders.length > 0) {
    targetOrder = pendingNewOrders[0];
  }

  if (targetOrder) {
    dismissNewAlert();
    openReview(targetOrder.key);
    return;
  }

  if (typeof unacknowledgedAppends !== "undefined" && unacknowledgedAppends.size > 0) {
    let nextAppendKey = Array.from(unacknowledgedAppends.keys()).find(k => k !== currentKey);
    if (!nextAppendKey) nextAppendKey = unacknowledgedAppends.keys().next().value;
    unacknowledgedAppends.delete(nextAppendKey);
    dismissNewAlert();
    openReview(nextAppendKey);
    return;
  }

  dismissNewAlert();
}

function extractCustomizationsFromLines(lines) {
  if (!lines || lines.length === 0) return { customItems: [], remainingLines: [] };
  const customItems = [];
  const remainingLines = [];
  let inCustomSection = false;

  const storeCusts = (typeof tenantCustomizations !== "undefined" && Array.isArray(tenantCustomizations))
    ? tenantCustomizations
    : ((typeof window !== "undefined" && Array.isArray(window.tenantCustomizations)) ? window.tenantCustomizations : []);

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const line = String(rawLine || "").trim();
    if (!line) continue;

    const isCustomHeader = (
      line.includes("口味設定") ||
      line.includes("客製化設定") ||
      line.includes("口味調整") ||
      line.includes("Tùy chọn khẩu vị") ||
      line.includes("Khẩu vị")
    );

    if (isCustomHeader) {
      const colonIdx = line.indexOf("：") !== -1 ? line.indexOf("：") : line.indexOf(":");
      const inlinePart = colonIdx !== -1 ? line.substring(colonIdx + 1).trim() : "";

      if (inlinePart) {
        const parts = inlinePart.split(/[・·|,]\s*|\s+[・·|]\s+/).map(p => p.trim()).filter(Boolean);
        const radioGroups = storeCusts.filter(g => g && (g.type === 'radio' || !g.type));
        const targetGroups = (radioGroups.length === parts.length) ? radioGroups : storeCusts;

        parts.forEach((part, idx) => {
          const pColon = part.indexOf("：") !== -1 ? part.indexOf("：") : part.indexOf(":");
          if (pColon !== -1) {
            const lbl = part.substring(0, pColon).replace(/^[✦•\-*●]\s*/, '').replace(/選擇|調整/g, '').trim();
            const val = part.substring(pColon + 1).trim();
            customItems.push({ label: lbl, value: val });
          } else if (targetGroups.length > 0 && targetGroups[idx]) {
            const group = targetGroups[idx];
            const cleanTitle = (group.title || group.name || '')
              .replace(/^[✦•\-*●]\s*/, '')
              .replace(/選擇|調整/g, '')
              .replace(/\(朝天椒\)/g, '')
              .replace(/（朝天椒）/g, '')
              .trim();
            customItems.push({ label: cleanTitle || '', value: part });
          } else {
            customItems.push({ label: '', value: part });
          }
        });
      }
      inCustomSection = true;
      continue;
    }

    const isBullet = line.startsWith("•") || line.startsWith("-") || line.startsWith("*") || line.startsWith("●");
    if (inCustomSection && isBullet) {
      const cleanBullet = line.replace(/^[•\-*●]\s*/, "");
      const bColon = cleanBullet.indexOf("：") !== -1 ? cleanBullet.indexOf("：") : cleanBullet.indexOf(":");
      if (bColon !== -1) {
        const lbl = cleanBullet.substring(0, bColon).replace(/^[✦•\-*●]\s*/, '').replace(/選擇|調整/g, '').trim();
        const val = cleanBullet.substring(bColon + 1).trim();
        customItems.push({ label: lbl, value: val });
        continue;
      }
    } else if (inCustomSection && (
      line.includes("訂單內容") ||
      line.includes("Món") ||
      line.startsWith("1份") ||
      line.startsWith("2份") ||
      line.startsWith("3份") ||
      line.startsWith("4份") ||
      line.startsWith("5份") ||
      line.match(/^\d+\s*份\s*[xX×]/) ||
      line.includes("用餐方式") ||
      line.includes("取餐時間") ||
      line.startsWith("[")
    )) {
      inCustomSection = false;
    }

    remainingLines.push(rawLine);
  }

  return { customItems, remainingLines };
}

function renderCustomizationsHtml(customItems) {
  if (!customItems || customItems.length === 0) return "";
  const lang = window.currentLang || (typeof currentLang !== "undefined" ? currentLang : "zh-TW");
  const title = (typeof t === "function" ? t("customizationSettings") : null) || (lang === "vi" ? "Tùy chọn khẩu vị" : "客製化設定");
  const svgIcon = (typeof POS_SVG !== "undefined" && POS_SVG.sliders) || `
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block; vertical-align:-2px; margin-right:6px;">
      <line x1="4" y1="21" x2="4" y2="14"></line><line x1="4" y1="10" x2="4" y2="3"></line>
      <line x1="12" y1="21" x2="12" y2="12"></line><line x1="12" y1="8" x2="12" y2="3"></line>
      <line x1="20" y1="21" x2="20" y2="16"></line><line x1="20" y1="12" x2="20" y2="3"></line>
      <line x1="1" y1="14" x2="7" y2="14"></line><line x1="9" y1="8" x2="15" y2="8"></line>
      <line x1="17" y1="16" x2="23" y2="16"></line>
    </svg>
  `;

  const itemsHtml = customItems.map(it => {
    const lbl = escapeHtml(it.label);
    const val = escapeHtml(it.value);
    if (lbl) {
      return `<div class="pos-custom-item"><b class="pos-custom-label">${lbl}：</b><span class="pos-custom-value">${val}</span></div>`;
    }
    return `<div class="pos-custom-item"><span class="pos-custom-value">${val}</span></div>`;
  }).join("");

  return `
    <div class="pos-custom-settings-card">
      <div class="pos-custom-header">
        ${svgIcon}
        <span>${escapeHtml(title)}</span>
      </div>
      <div class="pos-custom-list">
        ${itemsHtml}
      </div>
    </div>
  `;
}
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

function extractBundleFromItem(it) {
  if (!it) return null;
  let bData = it.bundleData;
  if (!bData && it.bundle_snapshot_json) {
    try {
      bData = typeof it.bundle_snapshot_json === 'string' ? JSON.parse(it.bundle_snapshot_json) : it.bundle_snapshot_json;
    } catch {}
  }
  if (!bData && it.bundleSelections) {
    try {
      bData = typeof it.bundleSelections === 'string' ? JSON.parse(it.bundleSelections) : it.bundleSelections;
    } catch {}
  }

  if (bData) {
    const portions = Array.isArray(bData.portions) ? bData.portions : (Array.isArray(bData) ? (bData[0]?.groups ? bData : [{ groups: bData }]) : null);
    if (portions && portions.length > 0) {
      return {
        isStructured: true,
        portions: portions
      };
    }
  }

  if (it.options) {
    const lines = String(it.options).split('\n').map(l => l.trim()).filter(Boolean);
    const parsedGroups = [];
    const remainingOptions = [];

    lines.forEach(line => {
      const cleanLine = line.replace(/^[↳\-+•*]\s*/, '').trim();
      const m = cleanLine.match(/^(?:(第\d+份|Phần \d+)\s*)?([^：:\n]+)[：:]\s*(.+)$/);
      if (m && !m[2].includes('備註') && !m[2].includes('Ghi chú') && !m[2].includes('口味') && !m[2].includes('Khẩu vị') && !m[2].includes('Hương vị')) {
        const portionLabel = m[1] || '';
        const groupName = m[2].trim();
        const itemsStr = m[3].trim();
        const rawItems = itemsStr.split(/[、,]+/).map(s => s.trim()).filter(Boolean);
        const groupItems = rawItems.map(rawIt => {
          const addMatch = rawIt.match(/(?:\(\s*\+\s*\$|\+\s*\$)(\d+(?:\.\d+)?)/);
          const surcharge = addMatch ? Number(addMatch[1]) || 0 : 0;
          const cleanName = rawIt.replace(/\s*\(\s*\+\s*\$\d+(?:\.\d+)?\s*\)/, '').trim();
          const qMatch = cleanName.match(/^(.+?)\s*[xX*]\s*(\d+)$/) || cleanName.match(/^(\d+)\s*[xX*]\s*(.+)$/);
          const name = qMatch ? (cleanName.match(/^(.+?)\s*[xX*]\s*(\d+)$/) ? qMatch[1] : qMatch[2]) : cleanName;
          const qty = qMatch ? Number(qMatch[2] || qMatch[1]) || 1 : 1;
          return { name, quantity: qty, surcharge };
        });

        parsedGroups.push({
          portionLabel,
          groupName,
          items: groupItems
        });
      } else {
        remainingOptions.push(line);
      }
    });

    if (parsedGroups.length > 0) {
      return {
        isStructured: false,
        textGroups: parsedGroups,
        remainingOptionsStr: remainingOptions.join('\n')
      };
    }
  }

  return null;
}
window.extractBundleFromItem = extractBundleFromItem;

function renderBundleComponentsHtml(bundleInfo) {
  if (!bundleInfo) return "";
  const bundleTitle = (typeof t === "function" && t("bundleSelectionsTitle")) || "套餐組合內容";
  const groupFallback = (typeof t === "function" && t("bundleGroupFallback")) || "搭配";
  const bundleIcon = (typeof POS_SVG !== "undefined" && POS_SVG.bundle) || "";

  let listHtml = "";

  if (bundleInfo.isStructured && bundleInfo.portions) {
    const portions = bundleInfo.portions;
    listHtml = portions.map((p, pIdx) => {
      const pNum = typeof p.portionIndex === "number" ? p.portionIndex + 1 : pIdx + 1;
      const pPrefix = portions.length > 1
        ? (typeof t === "function" ? t("bundlePortionPrefix", { n: pNum }) : `第 ${pNum} 份`)
        : "";
      const groups = p.groups || [];

      const groupsHtml = groups.map(g => {
        const groupName = g.groupName || g.group_name || groupFallback;
        const items = g.items || [];
        const itemsHtml = items.map(bi => {
          const bName = bi.name || bi.item_name || "";
          const bQty = Number(bi.quantity) || 1;
          const bSur = Number(bi.surcharge || bi.price || 0);
          return `
            <span class="bundle-item-chip">
              <span class="bundle-item-name">${escapeHtml(bName)}</span>
              <span class="bundle-item-qty">x${bQty}</span>
              ${bSur > 0 ? `<span class="bundle-item-surcharge">(+$${bSur * bQty})</span>` : ""}
            </span>
          `;
        }).join("");

        return `
          <div class="bundle-group-row">
            <span class="bundle-group-label">${pPrefix ? `${escapeHtml(pPrefix)} ` : ""}${escapeHtml(groupName)}</span>
            <div class="bundle-group-items">${itemsHtml}</div>
          </div>
        `;
      }).join("");

      return `<div class="bundle-portion-block">${groupsHtml}</div>`;
    }).join("");
  } else if (bundleInfo.textGroups) {
    listHtml = bundleInfo.textGroups.map(tg => {
      const label = tg.portionLabel ? `${tg.portionLabel} ${tg.groupName}` : tg.groupName;
      const itemsHtml = tg.items.map(bi => `
        <span class="bundle-item-chip">
          <span class="bundle-item-name">${escapeHtml(bi.name)}</span>
          <span class="bundle-item-qty">x${bi.quantity}</span>
          ${bi.surcharge > 0 ? `<span class="bundle-item-surcharge">(+$${bi.surcharge * bi.quantity})</span>` : ""}
        </span>
      `).join("");

      return `
        <div class="bundle-group-row">
          <span class="bundle-group-label">${escapeHtml(label)}</span>
          <div class="bundle-group-items">${itemsHtml}</div>
        </div>
      `;
    }).join("");
  }

  if (!listHtml) return "";

  return `
    <div class="bundle-components-container">
      <div class="bundle-components-header">
        ${bundleIcon}
        <span>${escapeHtml(bundleTitle)}</span>
      </div>
      <div class="bundle-portions-list">
        ${listHtml}
      </div>
    </div>
  `;
}
window.renderBundleComponentsHtml = renderBundleComponentsHtml;

function renderItemRowHtml(it, idx, orderKey) {
  let optionsHtml = "";
  const startStickerIndex = (typeof it.stickerIndex === "number") ? it.stickerIndex : idx;
  const itemQty = Math.max(1, parseInt(it.quantity, 10) || 1);
  const printLabel = (typeof t === "function" && t("btnPrintStickerShort")) || "印貼紙";
  const printerIcon = (typeof POS_SVG !== "undefined" && POS_SVG.printer) || "";
  const canPrintStickers = typeof PrinterService !== "undefined"
    && typeof PrinterService.getPrintCapabilities === "function"
    && PrinterService.getPrintCapabilities().stickers;

  const bundleInfo = extractBundleFromItem(it);
  const bundleHtml = renderBundleComponentsHtml(bundleInfo);

  let optsToRender = it.options;
  if (it.baseOptions !== undefined && it.baseOptions !== null) {
    optsToRender = it.baseOptions;
  } else if (bundleInfo && bundleInfo.remainingOptionsStr !== undefined) {
    optsToRender = bundleInfo.remainingOptionsStr;
  }

  if (optsToRender) {
    const rawOpts = String(optsToRender).trim();
    const parsed = typeof parsePortionCustomizations === "function" ? parsePortionCustomizations(rawOpts) : null;
    if (parsed && parsed.portions && parsed.portions.length > 0) {
      let commonHtml = "";
      if (parsed.commonChips && parsed.commonChips.length > 0) {
        commonHtml = `<div class="review-item-options">${parsed.commonChips.map(c => `<span class="mod-chip">${escapeHtml(c)}</span>`).join("")}</div>`;
      }
      const portionsHtml = `
        <div class="review-item-portions-container">
          ${parsed.portions.map((p, pIdx) => {
            const portionStickerIdx = startStickerIndex + pIdx;
            const portionPrintTitle = (typeof t === "function" && t("btnPrintPortion")) || (document.documentElement.lang === "vi" ? `In tem ${p.label}` : `列印${p.label}標籤`);
            return `
            <div class="review-item-portion-row">
              <span class="portion-badge">${escapeHtml(p.label)}</span>
              <div class="portion-chips-wrap">
                ${p.chips.length > 0 ? p.chips.map(chip => `<span class="mod-chip">${escapeHtml(chip)}</span>`).join("") : `<span class="portion-default-chip">—</span>`}
              </div>
              <button type="button" class="btn btn-ghost portion-print-btn" data-print-action="stickers" ${canPrintStickers ? "" : "disabled aria-disabled=\"true\""} onclick="if(typeof PrinterService !== 'undefined') PrinterService.printSingleItemSticker('${escapeHtml(orderKey)}', ${portionStickerIdx})" title="${escapeHtml(portionPrintTitle)}">
                ${printerIcon}
                <span>${escapeHtml(printLabel)}</span>
              </button>
            </div>
          `;
          }).join("")}
        </div>
      `;
      optionsHtml = commonHtml + portionsHtml;
    } else if (rawOpts) {
      const splitOpts = rawOpts.split(/[、,，\n]+/).map(s => s.trim()).filter(Boolean);
      if (splitOpts.length > 0) {
        optionsHtml = `<div class="review-item-options">${splitOpts.map(opt => `<span class="mod-chip">${escapeHtml(opt)}</span>`).join("")}</div>`;
      }
    }
  }
  const noteIcon = (typeof POS_SVG !== "undefined" && POS_SVG.note) || "";
  const noteHtml = it.note ? `<div class="review-item-note">${noteIcon}${escapeHtml(it.note)}</div>` : "";

  let displayPrice = it.price;
  if ((!displayPrice || displayPrice === "—") && it.name && typeof lookupItemPrice === "function") {
    const lp = lookupItemPrice(it.name);
    const qty = Math.max(1, Number(it.quantity) || 1);
    if (lp != null) displayPrice = `$${Number(lp) * qty}`;
  }
  const isEmptyPrice = !displayPrice || displayPrice === "—";

  const mainPrintLabel = (itemQty > 1 && typeof t === "function") ? t("btnPrintAllPortionsShort", { n: itemQty }) : printLabel;
  const mainPrintAction = (itemQty > 1)
    ? `if(typeof PrinterService !== 'undefined') PrinterService.printItemRangeStickers('${escapeHtml(orderKey)}', ${startStickerIndex}, ${itemQty}, '${escapeHtml(it.name)}')`
    : `if(typeof PrinterService !== 'undefined') PrinterService.printSingleItemSticker('${escapeHtml(orderKey)}', ${startStickerIndex})`;

  return `
    <div class="review-item-row" id="review-item-${escapeHtml(orderKey)}-${idx}">
      <div class="review-item-header">
        <span class="review-item-name">${it.quantity || 1} x ${escapeHtml(it.name)}</span>
        <div class="review-item-meta-right">
          <span class="review-item-price ${isEmptyPrice ? 'is-empty' : ''}">${escapeHtml(displayPrice || "—")}</span>
          <button type="button" class="btn btn-ghost review-item-print-btn" data-print-action="stickers" data-print-action-title="${escapeHtml(mainPrintLabel)}" ${canPrintStickers ? "" : "disabled aria-disabled=\"true\""} onclick="${mainPrintAction}" title="${escapeHtml(mainPrintLabel)}">
            ${printerIcon}
            <span>${escapeHtml(mainPrintLabel)}</span>
          </button>
        </div>
      </div>
      ${bundleHtml}
      ${optionsHtml}
      ${noteHtml}
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
    ? PrinterService.parseOrderItems(order, false)
    : null;

  // Filter out any metadata lines that might have been parsed as items
  if (allParsedItems && Array.isArray(allParsedItems)) {
    allParsedItems = allParsedItems.filter(it => it && it.name && !isOrderMetadataText(it.name));
    let stickerIndex = 0;
    allParsedItems = allParsedItems.map(item => {
      const result = { ...item, stickerIndex };
      stickerIndex += Math.max(1, parseInt(item.quantity, 10) || 1);
      return result;
    });
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

  // 2. Extract and render Global Flavor Settings & Customer Note (merged in top section)
  const flavorData = extractFlavorSettings(raw);
  let noteText = (order?.note || "").trim();
  if (!noteText && raw) {
    const m = raw.match(/(?:📝\s*)?(?:顧客備註|備註|Ghi chú)[：:\s]+([^\n]+)/i);
    if (m && m[1]) {
      noteText = m[1].trim();
    }
  }

  let flavorHtml = "";
  if (flavorData || noteText) {
    const flameIcon = (typeof POS_SVG !== "undefined" && POS_SVG.flame) || "";
    const noteIcon = (typeof POS_SVG !== "undefined" && POS_SVG.note) || "";
    const flavorTitle = (typeof t === "function" && t("flavorTitle")) || "口味與客製設定";
    const noteTitle = (typeof t === "function" && t("customerNoteLabel")) || "顧客備註";
    const optLabelFallback = (typeof t === "function" && t("colOptions")) || "配料";

    let chipsHtml = "";
    if (flavorData) {
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

      chipsHtml = `<div class="flavor-chips-grid">${chips}</div>`;
    }

    let noteRowHtml = "";
    if (noteText) {
      const cleanNote = noteText.replace(/^["“”']+|["“”']+$/g, '').trim();
      noteRowHtml = `
        <div class="flavor-card-note order-note-alert ${flavorData ? 'has-flavors' : 'note-only'}">
          <span class="flavor-note-label order-note-alert-header">${noteIcon}<span>${escapeHtml(noteTitle)}：</span></span>
          <span class="flavor-note-val order-note-alert-body">“${escapeHtml(cleanNote)}”</span>
        </div>
      `;
    }

    const headerIcon = flavorData ? flameIcon : noteIcon;
    const headerTitle = flavorData ? flavorTitle : noteTitle;

    flavorHtml = `
      <div class="flavor-custom-card">
        ${flavorData ? `
          <div class="flavor-card-header">
            ${headerIcon}
            <span>${escapeHtml(headerTitle)}</span>
          </div>
        ` : ''}
        ${chipsHtml}
        ${noteRowHtml}
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

  return `<div class="review-content-card">${changeHtml}${flavorHtml}${contentHtml}</div>`;
}

window.extractCustomizationsFromLines = extractCustomizationsFromLines;
window.renderCustomizationsHtml = renderCustomizationsHtml;

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
  if (typeof updateNewAlert === "function") updateNewAlert();
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
