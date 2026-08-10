function renderListLeft(orders) {
  const container = document.getElementById("list-left");
  container.innerHTML = "";
  if (orders.length === 0) {
    container.innerHTML = `<div style="text-align:center; padding: 22px; color:#999;">Chưa có</div>`;
    return;
  }

  orders.forEach(order => {
    const isNew = order.status === "NEW";
    const eta = formatEta(order.time);

    const tile = document.createElement("div");
    tile.className = `tile ${isNew ? "new" : ""}`;
    tile.onclick = () => openReview(order.key);

    let badge = "";
    let rightActions = "";

    if (isNew) {
      badge = `<span class="badge new">NEW</span>`;
      rightActions = `<button class="btn btn-ghost btn-block" onclick="event.stopPropagation(); openReview('${escapeHtml(order.key)}')">Review</button>`;
    } else if (order.status === "ACCEPTED") {
      badge = `<span class="badge wait">DOING</span>`;
      rightActions = `<button class="btn btn-primary btn-block" onclick="event.stopPropagation(); updateStatus('${escapeHtml(order.key)}','DONE', {}, this)">准备好了</button>`;
    } else {
      badge = `<span class="badge wait" style="background:#e5e7eb; color:#4b5563;">等客戶確認</span>`;
      rightActions = `<button class="btn btn-block" style="background:#f3f4f6; color:#9ca3af; cursor:not-allowed;" disabled>等待回覆</button>`;
    }

    tile.innerHTML = `
      <div>
        <div class="tile-top">
          <span class="tile-customer">${escapeHtml(order.customer || "Khách")}</span>
          ${badge}
          <span class="tile-meta">#${escapeHtml(order.key)}</span>
        </div>
        <div class="tile-top" style="margin-top: 6px;">
          <span class="tile-meta">取餐: ${escapeHtml(order.time || "-")}</span>
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
  container.innerHTML = "";
  if (orders.length === 0) {
    container.innerHTML = `<div style="text-align:center; padding: 22px; color:#999;">Chưa có</div>`;
    return;
  }

  orders.forEach(order => {
    const eta = formatEta(order.time);
    const tile = document.createElement("div");
    tile.className = "tile";
    tile.onclick = () => openReview(order.key);

    tile.innerHTML = `
      <div>
        <div class="tile-top">
          <span class="tile-customer">${escapeHtml(order.customer || "Khách")}</span>
          <span class="badge done">READY</span>
          <span class="tile-meta">#${escapeHtml(order.key)}</span>
        </div>
        <div class="tile-top" style="margin-top: 6px;">
          <span class="tile-meta">取餐: ${escapeHtml(order.time || "-")}</span>
          <span class="tile-meta" style="color: var(--brand-red); font-weight: 1100;">${escapeHtml(eta)}</span>
        </div>
        <div class="tile-items">${escapeHtml(shortItems(order.content))}</div>
      </div>
      <div class="tile-actions">
        <button class="btn btn-yellow btn-block" onclick="event.stopPropagation(); updateStatus('${escapeHtml(order.key)}','PICKED_UP', {}, this)">已取餐</button>
      </div>
    `;
    container.appendChild(tile);
  });
}
