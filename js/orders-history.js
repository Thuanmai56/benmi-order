// ==========================================
// Benmi POS - Module: Order History (30 Days)
// ==========================================

let historySummaryList = [];
const historyDayCache = new Map();
let expandedHistoryDates = new Set();
let isHistoryStateInitialized = false;
let loadingDateSet = new Set();

function getTaiwanTodayStr() {
  const nowTw = new Date(Date.now() + 8 * 3600000);
  const yyyy = nowTw.getUTCFullYear();
  const mm = String(nowTw.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(nowTw.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

async function loadHistorySummary() {
  const container = document.getElementById("list-history");
  if (!container) return;

  const todayStr = getTaiwanTodayStr();
  if (!isHistoryStateInitialized) {
    expandedHistoryDates = new Set([todayStr]);
    isHistoryStateInitialized = true;
  }

  // Pre-populate today in cache if available from latestOrders
  if (!historyDayCache.has(todayStr) && Array.isArray(latestOrders)) {
    const todayHistoryOrders = latestOrders.filter(o => {
      if (!o || !["PICKED_UP", "REJECTED"].includes(o.status)) return false;
      if (o.createdAt) {
        const dt = new Date(o.createdAt);
        const nowTaiwan = new Date(dt.getTime() + 8 * 3600000);
        const d = `${nowTaiwan.getUTCFullYear()}-${String(nowTaiwan.getUTCMonth() + 1).padStart(2, "0")}-${String(nowTaiwan.getUTCDate()).padStart(2, "0")}`;
        return d === todayStr;
      }
      return false;
    });
    if (todayHistoryOrders.length > 0) {
      historyDayCache.set(todayStr, todayHistoryOrders);
    }
  }

  try {
    const tenantId = getTenantIdFromUrl();
    const res = await fetch(`${WORKER_BASE}/api/orders/history-summary?tenant_id=${encodeURIComponent(tenantId)}`);
    if (res.ok) {
      historySummaryList = await res.json();
      if (!Array.isArray(historySummaryList)) historySummaryList = [];
    }
  } catch (e) {
    console.error("loadHistorySummary failed:", e);
  }

  // Graceful fallback if summary list is empty but latestOrders has completed orders
  if ((!Array.isArray(historySummaryList) || historySummaryList.length === 0) && Array.isArray(latestOrders)) {
    const completed = latestOrders.filter(o => o && ["PICKED_UP", "REJECTED"].includes(o.status));
    if (completed.length > 0) {
      const map = new Map();
      completed.forEach(o => {
        let d = "Unknown";
        if (o?.createdAt) {
          const dt = new Date(o.createdAt);
          const nowTaiwan = new Date(dt.getTime() + 8 * 3600000);
          d = `${nowTaiwan.getUTCFullYear()}-${String(nowTaiwan.getUTCMonth() + 1).padStart(2, "0")}-${String(nowTaiwan.getUTCDate()).padStart(2, "0")}`;
        }
        if (!map.has(d)) map.set(d, []);
        map.get(d).push(o);
      });
      historySummaryList = Array.from(map.entries()).map(([date, items]) => ({
        date,
        count: items.length,
        total: items.reduce((sum, o) => sum + (Number(o.total) || 0), 0)
      })).sort((a, b) => b.date.localeCompare(a.date));
      map.forEach((orders, d) => {
        historyDayCache.set(d, orders);
      });
    }
  }

  renderHistory();

  // If today is expanded and not cached, load today
  if (expandedHistoryDates.has(todayStr) && !historyDayCache.has(todayStr)) {
    fetchHistoryForDate(todayStr);
  }
}

async function fetchHistoryForDate(date) {
  if (loadingDateSet.has(date)) return;
  loadingDateSet.add(date);
  renderHistory();

  try {
    const tenantId = getTenantIdFromUrl();
    const res = await fetch(`${WORKER_BASE}/api/orders/by-date?date=${encodeURIComponent(date)}&tenant_id=${encodeURIComponent(tenantId)}`);
    if (res.ok) {
      const orders = await res.json();
      historyDayCache.set(date, Array.isArray(orders) ? orders : []);
    }
  } catch (e) {
    console.error("fetchHistoryForDate error:", e);
  } finally {
    loadingDateSet.delete(date);
    renderHistory();
  }
}

function renderHistory() {
  const container = document.getElementById("list-history");
  if (!container) return;
  container.innerHTML = "";

  const todayStr = getTaiwanTodayStr();

  if (!Array.isArray(historySummaryList) || historySummaryList.length === 0) {
    if (historyDayCache.size === 0) {
      container.innerHTML = `<div style="text-align:center; padding: 22px; color:#999;">${t('emptyHistory')}</div>`;
      const summaryBadge = document.getElementById("history-total-summary-badge");
      if (summaryBadge) summaryBadge.innerText = `0 ${t('orderUnit')}`;
      return;
    }
  }

  const totalCount = historySummaryList.reduce((sum, item) => sum + (item.count || 0), 0);
  const summaryBadge = document.getElementById("history-total-summary-badge");
  if (summaryBadge) {
    summaryBadge.innerText = `${totalCount} ${t('orderUnit')}`;
  }

  const allDates = historySummaryList.map(item => item.date);
  const isAllExpanded = allDates.length > 0 && allDates.every(d => expandedHistoryDates.has(d));
  const toggleAllText = document.getElementById("btn-toggle-all-text");
  const toggleAllIcon = document.getElementById("btn-toggle-all-icon");
  if (toggleAllText) toggleAllText.innerText = isAllExpanded ? t('btnCollapseAll') : t('btnExpandAll');
  if (toggleAllIcon) toggleAllIcon.innerText = isAllExpanded ? '📁' : '📂';

  for (const summaryItem of historySummaryList) {
    const date = summaryItem.date;
    const isToday = (date === todayStr);
    const isExpanded = expandedHistoryDates.has(date);
    const isLoading = loadingDateSet.has(date);
    const count = summaryItem.count || 0;
    const dayTotal = summaryItem.total || 0;

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
        <span class="badge" style="background:#f3f4f6; color:#374151; font-weight:800; font-size:13px;">${count} ${t('orderUnit')}</span>
        <span class="badge" style="background:rgba(0,185,0,0.1); color:var(--primary); font-weight:1000; font-size:14px;">當日總計: $${dayTotal.toLocaleString()}</span>
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

    if (isExpanded) {
      if (isLoading) {
        body.innerHTML = `<div style="text-align:center; padding: 18px; color:#6b7280; font-weight:800;">⏳ ${t('loadingHistory') || '載入訂單中...'}</div>`;
      } else if (historyDayCache.has(date)) {
        const items = historyDayCache.get(date) || [];
        if (items.length === 0) {
          body.innerHTML = `<div style="text-align:center; padding: 14px; color:#999;">${t('emptyDayHistory') || '此日期無詳細訂單'}</div>`;
        } else {
          items.forEach(order => {
            const tile = document.createElement("div");
            tile.className = "tile";
            tile.onclick = () => openReview(order.key);
            const badge = order.status === "PICKED_UP"
              ? `<span class="badge done">${t('badgePicked')}</span>`
              : `<span class="badge">${escapeHtml(order.status)}</span>`;
            const totalFormatted = formatOrderTotal(order);

            tile.innerHTML = `
              <div>
                <div class="tile-top">
                  <span class="tile-customer">${escapeHtml(order.customer || "Khách")}</span>
                  ${badge}
                  <span class="tile-meta">#${escapeHtml(order.key)}</span>
                </div>
                <div class="tile-top" style="margin-top: 6px;">
                  <span class="tile-meta">${t('pickupLabel')} ${escapeHtml(formatPickupTimeDisplay(order.time))}</span>
                  ${totalFormatted !== '-' ? `<span class="tile-meta" style="color: var(--primary); font-weight: 1000;">${escapeHtml(totalFormatted)}</span>` : ''}
                </div>
                <div class="tile-items">${escapeHtml(shortItems(order.content))}</div>
              </div>
              <div class="tile-actions">
                <button class="btn btn-ghost btn-block" onclick="event.stopPropagation(); openReview('${escapeHtml(order.key)}')">${t('btnView')}</button>
              </div>
            `;
            body.appendChild(tile);
          });
        }
      } else {
        body.innerHTML = `<div style="text-align:center; padding: 18px; color:#6b7280; font-weight:800;">⏳ ${t('loadingHistory') || '載入訂單中...'}</div>`;
      }
    }

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

async function toggleHistoryDateGroup(date) {
  if (expandedHistoryDates.has(date)) {
    expandedHistoryDates.delete(date);
    renderHistory();
  } else {
    expandedHistoryDates.add(date);
    if (!historyDayCache.has(date)) {
      fetchHistoryForDate(date);
    } else {
      renderHistory();
    }
  }
}

async function toggleAllHistoryGroups() {
  const allDates = historySummaryList.map(item => item.date);
  const isAllExpanded = allDates.length > 0 && allDates.every(d => expandedHistoryDates.has(d));
  if (isAllExpanded) {
    expandedHistoryDates.clear();
    renderHistory();
  } else {
    expandedHistoryDates = new Set(allDates);
    const toggleAllText = document.getElementById("btn-toggle-all-text");
    if (toggleAllText) toggleAllText.innerText = "Loading...";

    try {
      const tenantId = getTenantIdFromUrl();
      const res = await fetch(`${WORKER_BASE}/api/orders/history-all?tenant_id=${encodeURIComponent(tenantId)}`);
      if (res.ok) {
        const allOrders = await res.json();
        if (Array.isArray(allOrders)) {
          const map = new Map();
          allOrders.forEach(o => {
            let d = "Unknown";
            if (o?.createdAt) {
              const dt = new Date(o.createdAt);
              const nowTaiwan = new Date(dt.getTime() + 8 * 3600000);
              d = `${nowTaiwan.getUTCFullYear()}-${String(nowTaiwan.getUTCMonth() + 1).padStart(2, "0")}-${String(nowTaiwan.getUTCDate()).padStart(2, "0")}`;
            }
            if (!map.has(d)) map.set(d, []);
            map.get(d).push(o);
          });
          map.forEach((orders, d) => {
            historyDayCache.set(d, orders);
          });
        }
      }
    } catch (e) {
      console.error("toggleAllHistoryGroups error:", e);
    } finally {
      renderHistory();
    }
  }
}
