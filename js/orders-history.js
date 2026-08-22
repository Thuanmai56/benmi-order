// ==========================================
// Benmi POS - Module: Order History (30 Days)
// ==========================================

let lastHistoryOrders = [];
let expandedHistoryDates = new Set();
let isHistoryStateInitialized = false;

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

  // Mặc định khởi tạo: chỉ mở ngày hôm nay, các ngày cũ thu gọn
  if (!isHistoryStateInitialized) {
    expandedHistoryDates = new Set([todayStr]);
    isHistoryStateInitialized = true;
  }

  if (orders.length === 0) {
    container.innerHTML = `<div style="text-align:center; padding: 22px; color:#999;">${t('emptyHistory')}</div>`;
    const summaryBadge = document.getElementById("history-total-summary-badge");
    if (summaryBadge) summaryBadge.innerText = `0 ${t('orderUnit')}`;
    return;
  }

  const summaryBadge = document.getElementById("history-total-summary-badge");
  if (summaryBadge) {
    summaryBadge.innerText = `${orders.length} ${t('orderUnit')}`;
  }

  const grouped = groupByDate(orders);
  // Sort groups by date descending
  const sortedDates = Array.from(grouped.keys()).sort((a, b) => b.localeCompare(a));

  // Cập nhật trạng thái nút "Mở tất cả / Thu gọn"
  const isAllExpanded = sortedDates.length > 0 && sortedDates.every(d => expandedHistoryDates.has(d));
  const toggleAllText = document.getElementById("btn-toggle-all-text");
  const toggleAllIcon = document.getElementById("btn-toggle-all-icon");
  if (toggleAllText) toggleAllText.innerText = isAllExpanded ? t('btnCollapseAll') : t('btnExpandAll');
  if (toggleAllIcon) toggleAllIcon.innerText = isAllExpanded ? '📁' : '📂';

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

    // Header (Accordion Toggle)
    const header = document.createElement("div");
    header.className = `history-date-header ${isExpanded ? 'expanded' : ''}`;
    header.onclick = () => toggleHistoryDateGroup(date);
    header.innerHTML = `
      <div class="history-date-left">
        <span class="history-date-icon">📅</span>
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
      const isRejected = order.status === "REJECTED" || order.status === "FORCE_REJECT";
      let badge = "";
      if (isPickedUp) {
        badge = `<span class="badge done">${t('badgePicked')}</span>`;
      } else if (isRejected) {
        badge = `<span class="badge new" style="background:#fee2e2; color:#b91c1c;">${t('badgeRejected')}</span>`;
      } else {
        badge = `<span class="badge">${escapeHtml(order.status)}</span>`;
      }
      const totalFormatted = formatOrderTotal(order);
      const itemsSummary = shortItems(order.content) || "";
      const isDineIn = typeof isOrderDineIn === "function" ? isOrderDineIn(order) : order.diningOption === "dine_in";
      const diningBadge = isDineIn
        ? `<span class="badge badge-dine-in" style="font-size:11px; padding:2px 6px; margin-left:4px;">🍽️ ${t('badgeDineIn')}</span>`
        : `<span class="badge badge-takeaway" style="font-size:11px; padding:2px 6px; margin-left:4px;">🛍️ ${t('badgeTakeaway')}</span>`;

      const pickupDisplay = isDineIn && (!order.time || order.time === "Unknown" || order.time.includes("現場內用"))
        ? `🍽️ ${t('dineIn')} (ASAP)`
        : `${t('pickupLabel')} ${formatPickupTimeDisplay(order.time)}`;

      tile.innerHTML = `
        <div class="history-tile-info">
          <div class="history-tile-top">
            <span class="history-tile-customer">${escapeHtml(order.customer || t('defaultCustomer'))}</span>
            <span class="history-tile-key">#${escapeHtml(order.key)}</span>
            ${diningBadge}
            ${badge}
          </div>
          <div class="history-tile-meta-row">
            <span class="history-tile-meta"><span style="color:var(--muted); margin-right:4px;">🕒</span>${escapeHtml(pickupDisplay)}</span>
            ${totalFormatted !== '-' ? `<span class="history-tile-price">${escapeHtml(totalFormatted)}</span>` : ''}
          </div>
          ${itemsSummary ? `<div class="history-tile-items">🧾 ${escapeHtml(itemsSummary)}</div>` : ''}
        </div>
        <div class="history-tile-actions">
          <button class="history-tile-btn" onclick="event.stopPropagation(); openReview('${escapeHtml(order.key)}')">${t('btnView')}</button>
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
  olderCard.onclick = openBlabContactModal;
  olderCard.innerHTML = `
    <div class="history-older-left">
      <div class="history-older-icon">📦</div>
      <div>
        <div class="history-older-title">
          <span>${t('historyOlderTitle')}</span>
        </div>
        <div class="history-older-sub">${t('historyOlderSub')}</div>
      </div>
    </div>
    <button class="btn btn-primary history-older-btn" onclick="event.stopPropagation(); openBlabContactModal()">
      <span>💬</span>
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
