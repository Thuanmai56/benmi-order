// ==========================================
// Benmi POS - Module: Order History (30 Days)
// ==========================================

let lastHistoryOrders = [];
let lastHistoryTenantId = null;
let expandedHistoryDates = new Set();
let isHistoryStateInitialized = false;
let isHistoryLoading = false;
let historyLastFetchedAt = 0;
let historySearchQuery = "";
let historyFilterType = "all"; // 'all' | 'dine_in' | 'takeaway'

function onHistorySearchInput(val) {
  historySearchQuery = (val || "").trim().toLowerCase();
  const clearBtn = document.getElementById("btn-history-search-clear");
  if (clearBtn) clearBtn.style.display = historySearchQuery ? "inline-flex" : "none";
  renderHistory(lastHistoryOrders);
}

function clearHistorySearch() {
  const input = document.getElementById("history-search-input");
  if (input) input.value = "";
  onHistorySearchInput("");
}

function setHistoryFilter(type) {
  historyFilterType = type || "all";
  document.querySelectorAll("#history-filter-group .history-filter-btn").forEach(btn => {
    btn.classList.toggle("active", btn.getAttribute("data-filter") === historyFilterType);
  });
  renderHistory(lastHistoryOrders);
}

async function fetchHistoryOrders(force = false) {
  const tenantId = getTenantIdFromUrl();
  const now = Date.now();
  if (!force && lastHistoryTenantId === tenantId && lastHistoryOrders.length > 0 && (now - historyLastFetchedAt < 15000)) {
    renderHistory(lastHistoryOrders);
    return;
  }

  const container = document.getElementById("list-history");
  if (container && (lastHistoryOrders.length === 0 || lastHistoryTenantId !== tenantId)) {
    container.innerHTML = `<div style="text-align:center; padding: 22px; color:#999;" id="list-history-loading">${t('loading')}</div>`;
  }

  isHistoryLoading = true;
  try {
    const res = await fetch(`${WORKER_BASE}/api/orders/history-all?tenant_id=${tenantId}&_t=${Date.now()}`);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) {
        lastHistoryOrders = data;
        lastHistoryTenantId = tenantId;
        historyLastFetchedAt = Date.now();
      }
    }
  } catch (e) {
    console.error("[fetchHistoryOrders] Error:", e);
  } finally {
    isHistoryLoading = false;
  }

  renderHistory(lastHistoryOrders);
}

function getTaiwanTodayStr() {
  const nowTw = new Date(Date.now() + 8 * 3600000);
  const yyyy = nowTw.getUTCFullYear();
  const mm = String(nowTw.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(nowTw.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function groupByDate(orders) {
  const map = new Map();
  orders.forEach(o => {
    let d = "Unknown";
    if (o.time && typeof o.time === "string" && o.time.match(/\d{4}-\d{2}-\d{2}/)) {
      const m = o.time.match(/\d{4}-\d{2}-\d{2}/);
      d = m[0];
    } else if (o.createdAt) {
      const dt = new Date(o.createdAt);
      const nowTaiwan = new Date(dt.getTime() + 8 * 3600000);
      const yyyy = nowTaiwan.getUTCFullYear();
      const mm = String(nowTaiwan.getUTCMonth() + 1).padStart(2, "0");
      const dd = String(nowTaiwan.getUTCDate()).padStart(2, "0");
      d = `${yyyy}-${mm}-${dd}`;
    }
    if (!map.has(d)) map.set(d, []);
    map.get(d).push(o);
  });
  return map;
}

function renderHistory(orders) {
  lastHistoryOrders = orders;
  const container = document.getElementById("list-history");
  if (!container) return;
  container.innerHTML = "";

  const todayStr = getTaiwanTodayStr();

  // Mặc định khởi tạo: tất cả ngày đều đóng (không tự động mở ngày hôm nay)
  if (!isHistoryStateInitialized) {
    expandedHistoryDates = new Set();
    isHistoryStateInitialized = true;
  }

  if (!orders || orders.length === 0) {
    container.innerHTML = `
      <div class="history-empty-state">
        <div class="history-empty-icon">${(typeof POS_SVG !== "undefined" && POS_SVG.inbox) || ""}</div>
        <div class="history-empty-title">${t('emptyHistory')}</div>
      </div>
    `;
    const summaryBadge = document.getElementById("history-total-summary-badge");
    if (summaryBadge) summaryBadge.innerText = `0 ${t('orderUnit')}`;
    return;
  }

  // Filter orders by filterType & searchQuery
  let filteredOrders = orders;
  if (historyFilterType === "dine_in") {
    filteredOrders = filteredOrders.filter(o => (typeof isOrderDineIn === "function" ? isOrderDineIn(o) : o.diningOption === "dine_in"));
  } else if (historyFilterType === "takeaway") {
    filteredOrders = filteredOrders.filter(o => !(typeof isOrderDineIn === "function" ? isOrderDineIn(o) : o.diningOption === "dine_in"));
  }

  if (historySearchQuery) {
    filteredOrders = filteredOrders.filter(o => {
      const keyMatch = (o.key || "").toLowerCase().includes(historySearchQuery);
      const custMatch = (o.customer || "").toLowerCase().includes(historySearchQuery);
      const tableMatch = (String(o.tableNumber || "")).toLowerCase().includes(historySearchQuery);
      const phoneMatch = (o.phone || "").toLowerCase().includes(historySearchQuery);
      return keyMatch || custMatch || tableMatch || phoneMatch;
    });
  }

  const summaryBadge = document.getElementById("history-total-summary-badge");
  if (summaryBadge) {
    if (filteredOrders.length !== orders.length) {
      summaryBadge.innerText = `${filteredOrders.length} / ${orders.length} ${t('orderUnit')}`;
    } else {
      summaryBadge.innerText = `${orders.length} ${t('orderUnit')}`;
    }
  }

  if (filteredOrders.length === 0) {
    container.innerHTML = `
      <div class="history-empty-state">
        <div class="history-empty-icon">${(typeof POS_SVG !== "undefined" && POS_SVG.search) || ""}</div>
        <div class="history-empty-title">${t('historyNoSearchResults')}</div>
        <div class="history-empty-sub">${t('historyNoSearchResultsSub')}</div>
        <button type="button" class="btn btn-ghost history-clear-filter-btn" onclick="clearHistorySearch(); setHistoryFilter('all');">
          ${t('btnClearFilter')}
        </button>
      </div>
    `;
    return;
  }

  const grouped = groupByDate(filteredOrders);
  // Sort groups by date descending
  const sortedDates = Array.from(grouped.keys()).sort((a, b) => b.localeCompare(a));

  // Cập nhật trạng thái nút "Mở tất cả / Thu gọn"
  const isAllExpanded = sortedDates.length > 0 && sortedDates.every(d => expandedHistoryDates.has(d));
  const toggleAllText = document.getElementById("btn-toggle-all-text");
  const toggleAllIcon = document.getElementById("btn-toggle-all-icon");
  if (toggleAllText) toggleAllText.innerText = isAllExpanded ? t('btnCollapseAll') : t('btnExpandAll');
  if (toggleAllIcon) {
    const folderIconSvg = (typeof POS_SVG !== "undefined")
      ? (isAllExpanded ? POS_SVG.folder : POS_SVG.folderOpen)
      : "";
    toggleAllIcon.innerHTML = folderIconSvg;
  }

  for (const date of sortedDates) {
    let items = grouped.get(date) || [];
    // Sort items: newest picked up at top (descending), fallback to newest created at top
    items.sort((a, b) => {
      const timeA = a.pickedUpAt || a.createdAt || 0;
      const timeB = b.pickedUpAt || b.createdAt || 0;
      return timeB - timeA;
    });

    const isToday = (date === todayStr);
    const isExpanded = expandedHistoryDates.has(date);
    const dayTotal = items.reduce((sum, o) => sum + (Number(o.total) || 0), 0);

    const groupEl = document.createElement("div");
    groupEl.className = "history-date-group";
    groupEl.id = `history-group-${date}`;

    const calendarSvg = (typeof POS_SVG !== "undefined" && POS_SVG.calendar) || "";

    // Header (Accordion Toggle)
    const header = document.createElement("div");
    header.className = `history-date-header ${isExpanded ? 'expanded' : ''}`;
    header.onclick = () => toggleHistoryDateGroup(date);
    header.innerHTML = `
      <div class="history-date-left">
        <div class="history-date-icon-box">${calendarSvg}</div>
        <span class="history-date-text">${escapeHtml(date)}</span>
        ${isToday ? `<span class="history-today-tag">${t('todayTag')}</span>` : ''}
      </div>
      <div class="history-date-right">
        <span class="badge" style="background:#f3f4f6; color:#374151; font-weight:800; font-size:13px;">${items.length} ${t('orderUnit')}</span>
        <span class="badge" style="background:rgba(0,185,0,0.1); color:var(--primary); font-weight:1000; font-size:14px;">$${dayTotal.toLocaleString()}</span>
        <svg class="history-chevron ${isExpanded ? 'open' : ''}" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="6 9 12 15 18 9"></polyline>
        </svg>
      </div>
    `;
    groupEl.appendChild(header);

    // Body (Order Tiles)
    const body = document.createElement("div");
    body.className = "history-date-body";
    body.id = `history-body-${date}`;
    body.style.display = isExpanded ? "flex" : "none";

    items.forEach(order => {
      const tile = document.createElement("div");
      tile.className = "history-tile";
      tile.onclick = () => openReview(order.key);
      const isPickedUp = order.status === "PICKED_UP";
      const isPaid = order.status === "PAID";
      const isRejected = order.status === "REJECTED" || order.status === "FORCE_REJECT";
      let badge = "";
      if (isPaid) {
        badge = `<span class="badge done" style="background:#ede9fe; color:#6d28d9; border:1px solid #ddd6fe;">${t('badgePaid')}</span>`;
      } else if (isPickedUp) {
        badge = `<span class="badge done">${t('badgePicked')}</span>`;
      } else if (isRejected) {
        badge = `<span class="badge new" style="background:#fee2e2; color:#b91c1c;">${t('badgeRejected')}</span>`;
      } else {
        badge = `<span class="badge">${escapeHtml(order.status)}</span>`;
      }
      const totalFormatted = formatOrderTotal(order);
      const itemsSummary = shortItems(order.content) || "";
      const isDineIn = typeof isOrderDineIn === "function" ? isOrderDineIn(order) : order.diningOption === "dine_in";
      const isElapsed = typeof isOrderElapsedMode === "function" ? isOrderElapsedMode(order) : isDineIn;

      const tableNum = typeof getOrderTableNumber === "function" ? getOrderTableNumber(order) : (order.tableNumber || "");
      const tableLabel = tableNum ? (currentLang === 'vi' ? ` · Bàn ${tableNum}` : ` · 桌號 ${tableNum}`) : "";

      const svgTakeaway = (typeof POS_SVG !== "undefined" && POS_SVG.takeaway) || "";
      const svgDineIn = (typeof POS_SVG !== "undefined" && POS_SVG.dineIn) || "";
      const svgClock = (typeof POS_SVG !== "undefined" && POS_SVG.clock) || "";
      const svgReceipt = (typeof POS_SVG !== "undefined" && POS_SVG.receipt) || "";

      const diningBadge = isDineIn
        ? `<span class="badge badge-dine-in" style="font-size:11px; padding:2px 6px; margin-left:4px;">${svgDineIn}${t('badgeDineIn')}${escapeHtml(tableLabel)}</span>`
        : `<span class="badge badge-takeaway" style="font-size:11px; padding:2px 6px; margin-left:4px;">${svgTakeaway}${t('badgeTakeaway')}</span>`;

      const roundCount = Number(order.round_count || order.roundCount) || 1;
      const appendBadge = (isDineIn && roundCount > 1)
        ? `<span class="badge badge-append" style="font-size:11px; padding:2px 6px; border-radius:4px; font-weight:800; white-space:nowrap; flex-shrink:0;">${t('badgeAppendRound', { n: roundCount })}</span>`
        : "";

      const formattedTime = isElapsed
        ? (typeof formatOrderSubmissionTime === "function" ? formatOrderSubmissionTime(order) : formatPickupTimeDisplay(order.time))
        : formatPickupTimeDisplay(order.time, order.createdAt, order.content);

      const pickupDisplay = isDineIn
        ? `${t('dineInTimeLabel')}: ${formattedTime}`
        : `${t('pickupLabel')} ${formattedTime}`;

      tile.innerHTML = `
        <div class="history-tile-info">
          <div class="history-tile-top">
            <span class="history-tile-customer" title="${escapeHtml(order.customer || t('defaultCustomer'))}">${escapeHtml(order.customer || t('defaultCustomer'))}</span>
            <span class="history-tile-key">#${escapeHtml(order.key)}</span>
            ${diningBadge}
            ${appendBadge}
            ${badge}
          </div>
          <div class="history-tile-meta-row">
            <span class="history-tile-meta">${svgClock}${escapeHtml(pickupDisplay)}</span>
            ${totalFormatted !== '-' ? `<span class="history-tile-price">${escapeHtml(totalFormatted)}</span>` : ''}
          </div>
          ${itemsSummary ? `<div class="history-tile-items">${svgReceipt}${escapeHtml(itemsSummary)}</div>` : ''}
        </div>
        <div class="history-tile-actions">
          <button type="button" class="btn btn-ghost history-tile-btn" onclick="event.stopPropagation(); openReview('${escapeHtml(order.key)}')">
            ${(typeof POS_SVG !== "undefined" && POS_SVG.eye) || ""}
            <span>${t('btnView')}</span>
          </button>
        </div>
      `;
      body.appendChild(tile);
    });

    groupEl.appendChild(body);
    container.appendChild(groupEl);
  }

  // Footer Banner: Older Data / Contact BLAB
  const olderCard = document.createElement("div");
  olderCard.className = "history-older-card";
  olderCard.onclick = () => openBlabContactModal('history');
  olderCard.innerHTML = `
    <div class="history-older-left">
      <div class="history-older-icon" style="width: 40px; height: 40px; border-radius: 10px; background: #f1f5f9; border: 1px solid #e2e8f0; color: #475569; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 8v13H3V8"></path><path d="M1 3h22v5H1z"></path><path d="M10 12h4"></path></svg>
      </div>
      <div>
        <div class="history-older-title">
          <span>${t('historyOlderTitle')}</span>
        </div>
        <div class="history-older-sub">${t('historyOlderSub')}</div>
      </div>
    </div>
    <button class="btn btn-primary history-older-btn" onclick="event.stopPropagation(); openBlabContactModal('history')" style="min-height: 44px; display: inline-flex; align-items: center; gap: 8px;">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
      <span>${t('btnContactBlab')}</span>
    </button>
  `;
  container.appendChild(olderCard);
}

function toggleHistoryDateGroup(date) {
  if (expandedHistoryDates.has(date)) {
    expandedHistoryDates.delete(date);
  } else {
    expandedHistoryDates.add(date);
  }
  renderHistory(lastHistoryOrders);
}

function toggleAllHistoryGroups() {
  const grouped = groupByDate(lastHistoryOrders);
  const allDates = Array.from(grouped.keys());
  const isAllExpanded = allDates.length > 0 && allDates.every(d => expandedHistoryDates.has(d));
  if (isAllExpanded) {
    expandedHistoryDates.clear();
  } else {
    expandedHistoryDates = new Set(allDates);
  }
  renderHistory(lastHistoryOrders);
}
