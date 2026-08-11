function getOrderDateStr(o) {
  let rawMs = NaN;
  if (o?.createdAt) {
    if (typeof o.createdAt === "number") {
      rawMs = o.createdAt;
    } else {
      rawMs = new Date(o.createdAt).getTime();
    }
  }
  if (Number.isNaN(rawMs) && o?.time && typeof o.time === "string") {
    const match = o.time.match(/^(\d{4}-\d{2}-\d{2})/);
    if (match) return match[1];
    rawMs = new Date(o.time).getTime();
  }
  if (Number.isNaN(rawMs)) return "Unknown";

  // Convert ms to Taiwan (UTC+8) YYYY-MM-DD
  const nowTaiwan = new Date(rawMs + 8 * 3600000);
  const yyyy = nowTaiwan.getUTCFullYear();
  const mm = String(nowTaiwan.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(nowTaiwan.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function groupByDate(orders) {
  const map = new Map();
  orders.forEach(o => {
    const d = getOrderDateStr(o);
    if (!map.has(d)) map.set(d, []);
    map.get(d).push(o);
  });
  return map;
}

function getTodayTaiwanStr() {
  const nowTaiwan = new Date(Date.now() + 8 * 3600000);
  const yyyy = nowTaiwan.getUTCFullYear();
  const mm = String(nowTaiwan.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(nowTaiwan.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function createHistoryTile(order) {
  const tile = document.createElement("div");
  tile.className = "tile";
  tile.onclick = () => openReview(order.key);
  const badge = order.status === "PICKED_UP"
    ? `<span class="badge done">PICKED</span>`
    : `<span class="badge">${escapeHtml(order.status)}</span>`;

  tile.innerHTML = `
    <div>
      <div class="tile-top">
        <span class="tile-customer">${escapeHtml(order.customer || "Khách")}</span>
        ${badge}
        <span class="tile-meta" style="font-weight: 1100; color: #059669;">${formatOrderTotal(order)}</span>
        <span class="tile-meta">#${escapeHtml(order.key)}</span>
      </div>
      <div class="tile-items">${escapeHtml(shortItems(order.content))}</div>
    </div>
    <div class="tile-actions">
      <button class="btn btn-ghost btn-block" onclick="event.stopPropagation(); openReview('${escapeHtml(order.key)}')">Xem</button>
    </div>
  `;
  return tile;
}

function expandAllHistory() {
  document.querySelectorAll("#list-history .history-date-card").forEach(el => {
    el.open = true;
  });
}

function collapsePastHistory() {
  document.querySelectorAll("#list-history .history-date-card").forEach(el => {
    if (el.dataset.isToday !== "true") {
      el.open = false;
    } else {
      el.open = true;
    }
  });
}

function renderHistory(orders) {
  const container = document.getElementById("list-history");
  container.innerHTML = "";
  if (!orders || orders.length === 0) {
    container.innerHTML = `<div style="text-align:center; padding: 22px; color:#999;">Chưa có lịch sử</div>`;
    return;
  }

  const grouped = groupByDate(orders);
  const sortedDates = Array.from(grouped.keys()).sort((a, b) => b.localeCompare(a));
  const todayStr = getTodayTaiwanStr();

  // Top Control Toolbar
  const toolbar = document.createElement("div");
  toolbar.className = "history-toolbar";
  toolbar.innerHTML = `
    <div class="history-toolbar-info">
      📊 Tổng lịch sử: <strong>${sortedDates.length} ngày</strong> (${orders.length} đơn)
    </div>
    <div class="history-toolbar-actions">
      <button class="mini-btn" onclick="expandAllHistory()">📂 Mở tất cả</button>
      <button class="mini-btn" onclick="collapsePastHistory()">📁 Thu gọn ngày trước</button>
    </div>
  `;
  container.appendChild(toolbar);

  for (const date of sortedDates) {
    let items = grouped.get(date) || [];
    items.sort((a, b) => {
      const timeA = a.pickedUpAt || a.createdAt || 0;
      const timeB = b.pickedUpAt || b.createdAt || 0;
      return timeB - timeA;
    });

    const isToday = (date === todayStr);
    const card = document.createElement("details");
    card.className = "history-date-card";
    card.dataset.isToday = String(isToday);
    if (isToday) {
      card.open = true;
    }

    const dayTotal = items.reduce((sum, o) => {
      let val = 0;
      if (typeof o.total === "number" && !Number.isNaN(o.total)) {
        val = o.total;
      } else if (o.content) {
        const match = String(o.content).match(/💰\s*總金額：\s*\$?(\d+)/) || String(o.content).match(/\$(\d+)/);
        if (match && match[1]) val = parseInt(match[1], 10);
      }
      return sum + val;
    }, 0);
    const dayTotalHtml = dayTotal > 0 ? `<span class="summary-badge" style="background: #dcfce7; color: #166534; font-weight: bold;">💰 $${dayTotal.toLocaleString()}</span>` : "";

    const summary = document.createElement("summary");
    summary.className = "history-date-summary";
    const dateTitle = isToday ? `Hôm nay (${date})` : date;
    const icon = isToday ? "⭐" : "📅";
    summary.innerHTML = `
      <div class="summary-left">
        <span style="font-size: 17px;">${icon}</span>
        <span style="font-weight: 1100;">${dateTitle}</span>
        <span class="summary-badge">${items.length} đơn</span>
        ${dayTotalHtml}
      </div>
      <span class="summary-chevron">▼</span>
    `;
    card.appendChild(summary);

    const cardContent = document.createElement("div");
    cardContent.className = "history-date-content";
    items.forEach(order => {
      cardContent.appendChild(createHistoryTile(order));
    });

    card.appendChild(cardContent);
    container.appendChild(card);
  }
}
