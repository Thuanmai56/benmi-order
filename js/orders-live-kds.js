// ==========================================================================
// Benmi POS - Module: Adaptive Compact KDS (Kitchen Display & Expediter System)
// Architecture Specification: docs/proposals/live_orders_kds_redesign/pdp_ui_ux_design.md
// ==========================================================================

(function(window) {
  'use strict';

  // Station State: 'pending' | 'cooking' | 'ready' (used for Portrait / Mobile single-station mode)
  let kdsActiveStation = 'cooking';
  let currentDiningFilter = 'all'; // 'all' | 'takeaway' | 'dine_in'
  
  // Checklist State in memory (persists across polls during session)
  const kdsChecklistState = window.__kdsChecklistState || {};
  window.__kdsChecklistState = kdsChecklistState;

  // Track processing keys to prevent double-click
  const processingKeys = new Set();

  // --------------------------------------------------------------------------
  // Helper: Dining Option & Table Number
  // --------------------------------------------------------------------------
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

    renderKdsView(window.latestOrders || []);
  }

  function updateDiningFilterStats(orders) {
    if (!Array.isArray(orders)) return;
    let takeawayCount = 0;
    let dineInCount = 0;

    orders.forEach(o => {
      if (isOrderDineIn(o)) dineInCount++;
      else takeawayCount++;
    });

    const fCountAll = document.getElementById("filter-count-all");
    if (fCountAll) fCountAll.innerText = String(orders.length);

    const fCountTakeaway = document.getElementById("filter-count-takeaway");
    if (fCountTakeaway) fCountTakeaway.innerText = String(takeawayCount);

    const fCountDinein = document.getElementById("filter-count-dinein");
    if (fCountDinein) fCountDinein.innerText = String(dineInCount);

    const statTakeaway = document.getElementById("stat-pill-takeaway");
    if (statTakeaway) statTakeaway.innerText = `${t('filterTakeaway') || '外帶'} ${takeawayCount}`;

    const statDinein = document.getElementById("stat-pill-dinein");
    if (statDinein) statDinein.innerText = `${t('filterDineIn') || '內用'} ${dineInCount}`;
  }

  // --------------------------------------------------------------------------
  // Station Switcher for Portrait / Mobile
  // --------------------------------------------------------------------------
  function switchKdsStation(station) {
    kdsActiveStation = station;

    // Update tab buttons
    const btnPending = document.getElementById("kds-tab-btn-pending");
    const btnCooking = document.getElementById("kds-tab-btn-cooking");
    const btnReady = document.getElementById("kds-tab-btn-ready");

    if (btnPending) btnPending.classList.toggle("active", station === 'pending');
    if (btnCooking) btnCooking.classList.toggle("active", station === 'cooking');
    if (btnReady) btnReady.classList.toggle("active", station === 'ready');

    // Update columns
    const colPending = document.getElementById("kds-col-pending");
    const colCooking = document.getElementById("kds-col-cooking");
    const colReady = document.getElementById("kds-col-ready");

    if (colPending) colPending.classList.toggle("active-station", station === 'pending');
    if (colCooking) colCooking.classList.toggle("active-station", station === 'cooking');
    if (colReady) colReady.classList.toggle("active-station", station === 'ready');
  }

  // --------------------------------------------------------------------------
  // Temporal Visual Urgency Spectrum Calculator
  // --------------------------------------------------------------------------
  function computeUrgency(order) {
    if (!order) return { level: 'calm', minutesRemaining: 15, label: '' };

    const isDineIn = isOrderDineIn(order);
    const now = Date.now();

    // Parse target pickup time
    let targetTimeMs = 0;
    if (order.scheduled_time) {
      targetTimeMs = new Date(order.scheduled_time).getTime();
    } else if (order.time) {
      const m = String(order.time).match(/(\d{1,2}):(\d{2})/);
      if (m) {
        const d = new Date(order.createdAt || now);
        d.setHours(parseInt(m[1], 10), parseInt(m[2], 10), 0, 0);
        targetTimeMs = d.getTime();
      }
    }

    if (!targetTimeMs || isNaN(targetTimeMs)) {
      // Default: 20 minutes from creation
      targetTimeMs = (order.createdAt || now) + (20 * 60 * 1000);
    }

    const diffMs = targetTimeMs - now;
    const diffMin = Math.round(diffMs / 60000);

    let level = 'calm';
    let label = '';

    if (diffMin < 0) {
      level = 'overdue';
      const lateMin = Math.abs(diffMin);
      label = t('kdsOverdueMin', { m: lateMin }) || `逾時 ${lateMin} 分鐘`;
    } else if (diffMin <= 5) {
      level = 'urgent';
      label = t('kdsCountdownMin', { m: diffMin }) || `剩餘 ${diffMin} 分鐘`;
    } else if (diffMin <= 10) {
      level = 'warning';
      label = t('kdsCountdownMin', { m: diffMin }) || `剩餘 ${diffMin} 分鐘`;
    } else {
      level = 'calm';
      label = t('kdsCountdownMin', { m: diffMin }) || `剩餘 ${diffMin} 分鐘`;
    }

    return { level, minutesRemaining: diffMin, label };
  }

  // --------------------------------------------------------------------------
  // Flavor Settings Extractor
  // --------------------------------------------------------------------------
  function extractFlavorText(content) {
    if (!content) return "";
    const lines = String(content).split("\n");
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.includes("口味設定") || trimmed.includes("Khẩu vị") || trimmed.includes("Hương vị")) {
        return trimmed.replace(/^.*?[：:]\s*/, "").replace(/[【】]/g, "").trim();
      }
    }
    return "";
  }

  // --------------------------------------------------------------------------
  // Mise en Place Aggregator (Thanh Gom Món Bếp)
  // --------------------------------------------------------------------------
  function renderMiseEnPlaceBar(cookingOrders) {
    const container = document.getElementById("kds-mise-container");
    if (!container) return;

    if (!Array.isArray(cookingOrders) || cookingOrders.length === 0) {
      container.innerHTML = "";
      return;
    }

    const itemCounts = new Map();
    let totalPortions = 0;

    cookingOrders.forEach(order => {
      let parsed = [];
      if (typeof PrinterService !== "undefined" && typeof PrinterService.parseOrderItems === "function") {
        try {
          parsed = PrinterService.parseOrderItems(order, false) || [];
        } catch (e) {}
      }

      if (!parsed || parsed.length === 0) {
        // Fallback regex parser
        const lines = String(order.content || "").split("\n").map(l => l.trim()).filter(Boolean);
        lines.forEach(l => {
          if (typeof isOrderMetadataText === "function" && isOrderMetadataText(l)) return;
          if (l.startsWith("↳") || l.startsWith("-") || l.startsWith("+")) return;
          const m = l.match(/^(\d+)\s*(?:份|x|X)\s*(?:x\s*)?(.+)$/) || l.match(/^(.+?)\s*[xX*]\s*(\d+)$/);
          if (m) {
            parsed.push({ name: (m[2] || m[1] || "").trim(), quantity: Number(m[1] || m[2]) || 1 });
          }
        });
      }

      parsed.forEach(it => {
        if (!it || !it.name) return;
        const cleanName = it.name.replace(/\$[\d,]+/g, '').trim();
        if (cleanName.includes("口味設定") || cleanName.includes("Khẩu vị") || cleanName.includes("Hương vị") || cleanName.startsWith("🧂") || cleanName.startsWith("📦")) return;
        if (typeof isOrderMetadataText === "function" && isOrderMetadataText(cleanName)) return;
        const qty = Number(it.quantity) || 1;
        totalPortions += qty;
        itemCounts.set(cleanName, (itemCounts.get(cleanName) || 0) + qty);
      });
    });

    if (itemCounts.size === 0) {
      container.innerHTML = "";
      return;
    }

    // Sort descending by portion count
    const sortedItems = Array.from(itemCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10); // Show top 10 ingredients

    const titleText = t('kdsBatchMiseTitle', { orders: cookingOrders.length, items: totalPortions }) ||
      `🔪 廚房即時備料總攬 (${cookingOrders.length} 張單，共 ${totalPortions} 份)`;

    const chipsHtml = sortedItems.map(([name, count]) => `
      <div class="kds-mise-chip">
        <span>${escapeHtml(name)}</span>
        <span class="kds-mise-chip-count">${count}</span>
      </div>
    `).join("");

    container.innerHTML = `
      <div class="kds-mise-bar">
        <div class="kds-mise-label">
          <span>🔪</span>
          <span>${escapeHtml(titleText)}</span>
        </div>
        <div class="kds-mise-chips">
          ${chipsHtml}
        </div>
      </div>
    `;
  }

  // --------------------------------------------------------------------------
  // Micro-Checklist Item Toggle
  // --------------------------------------------------------------------------
  function toggleKdsItemCheck(orderKey, itemIdx, event) {
    if (event) event.stopPropagation();
    const stateKey = `${orderKey}_${itemIdx}`;
    kdsChecklistState[stateKey] = !kdsChecklistState[stateKey];

    const itemEl = document.getElementById(`kds-item-${orderKey}-${itemIdx}`);
    if (itemEl) {
      itemEl.classList.toggle("checked", !!kdsChecklistState[stateKey]);
      const box = itemEl.querySelector(".kds-checkbox-touch");
      if (box) {
        box.innerHTML = kdsChecklistState[stateKey] ? '✓' : '';
      }
    }
  }

  // --------------------------------------------------------------------------
  // Card Renderers
  // --------------------------------------------------------------------------

  // Station 1: Pending Order Mini Card
  function renderPendingCard(order) {
    const isDineIn = isOrderDineIn(order);
    const tableNum = getOrderTableNumber(order);
    const tableBadge = tableNum ? `<span class="kds-table-badge">${escapeHtml(tableNum)}</span>` : "";

    const diningBadge = isDineIn
      ? `<span class="kds-dining-pill kds-dining-dinein">🍽️ ${t('badgeDineIn') || '內用'}${tableBadge}</span>`
      : `<span class="kds-dining-pill kds-dining-takeaway">🛍️ ${t('badgeTakeaway') || '外帶'}</span>`;

    const pickupTimeStr = (typeof formatPickupTimeDisplay === "function")
      ? formatPickupTimeDisplay(order.time, order.createdAt, order.content)
      : (order.time || "");

    let itemsPreview = "";
    if (typeof getOrderItemsPreview === "function") {
      itemsPreview = getOrderItemsPreview(order);
    } else {
      itemsPreview = String(order.content || "").split("\n").slice(0, 2).join(" · ");
    }

    return `
      <div class="kds-card-mini" onclick="openReview('${escapeHtml(order.key)}')">
        <div class="kds-card-mini-header">
          <span class="kds-card-mini-code">#${escapeHtml(order.key)}</span>
          <span class="kds-card-mini-time">⏱️ ${escapeHtml(pickupTimeStr)}</span>
        </div>

        <div style="display: flex; align-items: center; justify-content: space-between; gap: 6px;">
          <span class="kds-card-mini-cust">👤 ${escapeHtml(order.customer || t('defaultCustomer') || '顧客')}</span>
          ${diningBadge}
        </div>

        ${itemsPreview ? `<div class="kds-card-mini-preview">${escapeHtml(itemsPreview)}</div>` : ''}

        <button type="button" class="kds-btn-bottom-full kds-btn-accept" onclick="acceptKdsOrder('${escapeHtml(order.key)}', event, this)">
          <span>✓</span>
          <span>${t('kdsActionAccept') || '接單'}</span>
        </button>
      </div>
    `;
  }

  // Station 2: Cooking Expansive Card
  function renderCookingCard(order) {
    const isDineIn = isOrderDineIn(order);
    const tableNum = getOrderTableNumber(order);
    const tableBadge = tableNum ? `<span class="kds-table-badge">${escapeHtml(tableNum)}</span>` : "";

    const diningBadge = isDineIn
      ? `<span class="kds-dining-pill kds-dining-dinein">🍽️ ${t('badgeDineIn') || '內用'}${tableBadge}</span>`
      : `<span class="kds-dining-pill kds-dining-takeaway">🛍️ ${t('badgeTakeaway') || '外帶'}</span>`;

    const urgency = computeUrgency(order);

    const pickupTimeStr = (typeof formatPickupTimeDisplay === "function")
      ? formatPickupTimeDisplay(order.time, order.createdAt, order.content)
      : (order.time || "");

    const flavorText = extractFlavorText(order.content);

    // Parse items
    let parsedItems = [];
    if (typeof PrinterService !== "undefined" && typeof PrinterService.parseOrderItems === "function") {
      try {
        parsedItems = PrinterService.parseOrderItems(order, true) || [];
      } catch (e) {}
    }

    parsedItems = (parsedItems || []).filter(it => {
      if (!it || !it.name) return false;
      const n = String(it.name).trim();
      if (n.includes("口味設定") || n.includes("Khẩu vị") || n.includes("Hương vị") || n.startsWith("🧂") || n.startsWith("📦")) return false;
      if (typeof isOrderMetadataText === "function" && isOrderMetadataText(n)) return false;
      return true;
    });

    const itemsChecklistHtml = parsedItems.map((it, idx) => {
      const stateKey = `${order.key}_${idx}`;
      const isChecked = !!kdsChecklistState[stateKey];

      // Format options as horizontal inline pills (NO vertical indentation ↳)
      const optionsPills = (Array.isArray(it.options) && it.options.length > 0)
        ? `<div class="kds-inline-pills">${it.options.map(opt => `<span class="kds-inline-pill">${escapeHtml(opt)}</span>`).join("")}</div>`
        : "";

      return `
        <div class="kds-checklist-item ${isChecked ? 'checked' : ''}" id="kds-item-${order.key}-${idx}" onclick="toggleKdsItemCheck('${escapeHtml(order.key)}', ${idx}, event)">
          <div class="kds-checkbox-touch">
            ${isChecked ? '✓' : ''}
          </div>
          <div class="kds-item-content">
            <div class="kds-item-header">
              <span class="kds-item-name">${escapeHtml(it.name)}</span>
              <span class="kds-item-qty">x${it.quantity || 1}</span>
            </div>
            ${optionsPills}
          </div>
        </div>
      `;
    }).join("");

    return `
      <div class="kds-card-cooking urgency-${urgency.level}" id="kds-card-${order.key}">
        <!-- Header -->
        <div class="kds-card-header">
          <div class="kds-card-id-block">
            <span class="kds-card-code">#${escapeHtml(order.key)}</span>
            ${diningBadge}
          </div>

          <div class="kds-card-header-actions">
            <span class="kds-countdown-pill kds-countdown-${urgency.level}">
              <span>⏱️</span>
              <span class="kds-countdown-text">${escapeHtml(urgency.label)}</span>
            </span>

            <!-- Reprint Vector Icon Button -->
            <button type="button" class="kds-icon-action-btn" title="${t('kdsReprintTooltip') || '列印單據'}" onclick="reprintKdsOrder('${escapeHtml(order.key)}', event)">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="6 9 6 2 18 2 18 9"></polyline>
                <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
                <rect x="6" y="14" width="12" height="8"></rect>
              </svg>
            </button>
          </div>
        </div>

        <!-- Customer Sub-Row -->
        <div class="kds-cust-row">
          <span>👤 ${escapeHtml(order.customer || t('defaultCustomer') || '顧客')}</span>
          ${order.phone ? `<span>📞 ${escapeHtml(order.phone)}</span>` : ''}
          <span style="color: #94a3b8;">·</span>
          <span>${escapeHtml(pickupTimeStr)}</span>
        </div>

        <!-- Flavor Strip -->
        ${flavorText ? `
          <div class="kds-flavor-strip">
            <span>🧂</span>
            <span>${escapeHtml(flavorText)}</span>
          </div>
        ` : ''}

        <!-- Micro-Checklist Items -->
        <div class="kds-checklist">
          ${itemsChecklistHtml}
        </div>

        <!-- Note callout bubble if exists -->
        ${order.note ? `
          <div class="kds-note-bubble">
            <span>💬</span>
            <div><strong>${t('customerNoteLabel') || '顧客備註'}:</strong> ${escapeHtml(order.note)}</div>
          </div>
        ` : ''}

        <!-- Single 100% Width Primary Action Button -->
        <button type="button" class="kds-btn-bottom-full kds-btn-done" onclick="doneKdsOrder('${escapeHtml(order.key)}', event, this)">
          <span>✓</span>
          <span>${t('kdsActionDone') || '準備好了'}</span>
        </button>
      </div>
    `;
  }

  // Station 3: Ready for Pickup Card
  function renderReadyCard(order) {
    const isDineIn = isOrderDineIn(order);
    const tableNum = getOrderTableNumber(order);
    const tableBadge = tableNum ? `<span class="kds-table-badge">${escapeHtml(tableNum)}</span>` : "";

    const diningBadge = isDineIn
      ? `<span class="kds-dining-pill kds-dining-dinein">🍽️ ${t('badgeDineIn') || '內用'}${tableBadge}</span>`
      : `<span class="kds-dining-pill kds-dining-takeaway">🛍️ ${t('badgeTakeaway') || '外帶'}</span>`;

    const totalStr = (order.total || order.total_amount) ? `$${order.total || order.total_amount}` : "";

    return `
      <div class="kds-card-ready" onclick="openReview('${escapeHtml(order.key)}')">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span class="kds-ready-code-callout">#${escapeHtml(order.key)}</span>
          ${diningBadge}
        </div>

        <div class="kds-ready-info-row">
          <span>👤 ${escapeHtml(order.customer || t('defaultCustomer') || '顧客')}</span>
          <span class="kds-ready-price">${escapeHtml(totalStr)}</span>
        </div>

        <button type="button" class="kds-btn-bottom-full kds-btn-handover" onclick="handoverKdsOrder('${escapeHtml(order.key)}', event, this)">
          <span>🛍️</span>
          <span>${t('kdsActionHandover') || '已取餐'}</span>
        </button>
      </div>
    `;
  }

  // --------------------------------------------------------------------------
  // Core KDS Dispatch & Render Function
  // --------------------------------------------------------------------------
  function renderKdsView(orders) {
    if (!Array.isArray(orders)) return;

    // Apply local overrides
    const now = Date.now();
    const currentOrders = orders.map(o => {
      const override = (window.localOverrides && window.localOverrides[o.key]);
      if (override && (now - override.time < 15000)) {
        return { ...o, status: override.status };
      }
      return o;
    });

    // Apply dining filter
    const filteredOrders = currentOrders.filter(o => {
      if (!o) return false;
      if (currentDiningFilter === "all") return true;
      const dine = isOrderDineIn(o);
      if (currentDiningFilter === "dine_in") return dine;
      if (currentDiningFilter === "takeaway") return !dine;
      return true;
    });

    updateDiningFilterStats(currentOrders.filter(o => o && ["NEW", "ACCEPTED", "DONE"].includes(o.status)));

    // Partition into 3 Stations
    const pendingOrders = filteredOrders
      .filter(o => o && ["NEW", "WAITING_CUSTOMER_CHANGE", "WAITING_CUSTOMER_REJECT"].includes(o.status))
      .slice()
      .sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));

    const cookingOrders = filteredOrders
      .filter(o => o && o.status === "ACCEPTED")
      .slice()
      .sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));

    const readyOrders = filteredOrders
      .filter(o => o && o.status === "DONE")
      .slice()
      .sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));

    // Update Header Counts
    const countPendEl = document.getElementById("kds-count-pending");
    if (countPendEl) countPendEl.innerText = String(pendingOrders.length);

    const countCookEl = document.getElementById("kds-count-cooking");
    if (countCookEl) countCookEl.innerText = String(cookingOrders.length);

    const countReadyEl = document.getElementById("kds-count-ready");
    if (countReadyEl) countReadyEl.innerText = String(readyOrders.length);

    // Update Segmented Tab Counts
    const tabCountPend = document.getElementById("kds-tab-count-pending");
    if (tabCountPend) tabCountPend.innerText = String(pendingOrders.length);

    const tabCountCook = document.getElementById("kds-tab-count-cooking");
    if (tabCountCook) tabCountCook.innerText = String(cookingOrders.length);

    const tabCountReady = document.getElementById("kds-tab-count-ready");
    if (tabCountReady) tabCountReady.innerText = String(readyOrders.length);

    // Pulse Alert on Pending Tab if staff is looking at cooking or ready
    const tabBtnPending = document.getElementById("kds-tab-btn-pending");
    if (tabBtnPending) {
      tabBtnPending.classList.toggle("has-orders", pendingOrders.length > 0);
      tabBtnPending.classList.toggle("pulse-alert", pendingOrders.length > 0 && kdsActiveStation !== 'pending');
    }

    // Render Station 1 (Pending)
    const listPendEl = document.getElementById("kds-list-pending");
    if (listPendEl) {
      if (pendingOrders.length === 0) {
        listPendEl.innerHTML = `
          <div class="kds-empty-card">
            <div class="kds-empty-icon">🔔</div>
            <div class="kds-empty-title">${t('kdsEmptyPending') || '目前無待處理訂單'}</div>
            <div class="kds-empty-sub">${t('emptyLivePendingSub') || '新進訂單將即時推播於此'}</div>
          </div>
        `;
      } else {
        listPendEl.innerHTML = pendingOrders.map(renderPendingCard).join("");
      }
    }

    // Render Station 2 (Cooking)
    renderMiseEnPlaceBar(cookingOrders);
    const listCookEl = document.getElementById("kds-list-cooking");
    if (listCookEl) {
      if (cookingOrders.length === 0) {
        listCookEl.innerHTML = `
          <div class="kds-empty-card">
            <div class="kds-empty-icon">🍳</div>
            <div class="kds-empty-title">${t('kdsEmptyCooking') || '目前無製作中訂單'}</div>
            <div class="kds-empty-sub">${t('emptyLiveAcceptedSub') || '接單後餐點將在此顯示製作進度'}</div>
          </div>
        `;
      } else {
        listCookEl.innerHTML = cookingOrders.map(renderCookingCard).join("");
      }
    }

    // Render Station 3 (Ready)
    const listReadyEl = document.getElementById("kds-list-ready");
    if (listReadyEl) {
      if (readyOrders.length === 0) {
        listReadyEl.innerHTML = `
          <div class="kds-empty-card">
            <div class="kds-empty-icon">🛍️</div>
            <div class="kds-empty-title">${t('kdsEmptyReady') || '目前無待取餐訂單'}</div>
            <div class="kds-empty-sub">${t('completedOrdersSub') || '製作完成的訂單將顯示於此'}</div>
          </div>
        `;
      } else {
        listReadyEl.innerHTML = readyOrders.map(renderReadyCard).join("");
      }
    }
  }

  // --------------------------------------------------------------------------
  // Dynamic Countdown Ticker (Runs every 20s in background)
  // --------------------------------------------------------------------------
  function updateKdsCountdowns() {
    if (!Array.isArray(window.latestOrders)) return;
    const cookingOrders = window.latestOrders.filter(o => o && o.status === "ACCEPTED");

    cookingOrders.forEach(order => {
      const card = document.getElementById(`kds-card-${order.key}`);
      if (!card) return;

      const urgency = computeUrgency(order);

      // Update card classes
      card.className = `kds-card-cooking urgency-${urgency.level}`;

      // Update countdown pill
      const pill = card.querySelector(".kds-countdown-pill");
      if (pill) {
        pill.className = `kds-countdown-pill kds-countdown-${urgency.level}`;
        const text = pill.querySelector(".kds-countdown-text");
        if (text) text.innerText = urgency.label;
      }
    });
  }

  // Start ticker
  setInterval(updateKdsCountdowns, 20000);

  // --------------------------------------------------------------------------
  // Order Lifecycle Actions
  // --------------------------------------------------------------------------
  async function acceptKdsOrder(key, event, btn) {
    if (event) event.stopPropagation();
    if (processingKeys.has(key)) return;
    processingKeys.add(key);

    const oldText = btn ? btn.innerHTML : "";
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = `<span>⏳</span><span>${t('processing') || '處理中...'}</span>`;
    }

    try {
      if (typeof updateStatus === "function") {
        await updateStatus(key, "ACCEPTED", {}, null);
      }
      if (typeof dismissNewAlert === "function") {
        dismissNewAlert();
      }
    } catch (err) {
      console.error("[KDS] Accept failed:", err);
    } finally {
      processingKeys.delete(key);
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = oldText;
      }
    }
  }

  async function doneKdsOrder(key, event, btn) {
    if (event) event.stopPropagation();
    if (processingKeys.has(key)) return;
    processingKeys.add(key);

    const oldText = btn ? btn.innerHTML : "";
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = `<span>⏳</span><span>${t('processing') || '處理中...'}</span>`;
    }

    try {
      if (typeof updateStatus === "function") {
        await updateStatus(key, "DONE", {}, null);
      }
    } catch (err) {
      console.error("[KDS] Done failed:", err);
    } finally {
      processingKeys.delete(key);
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = oldText;
      }
    }
  }

  async function handoverKdsOrder(key, event, btn) {
    if (event) event.stopPropagation();
    if (processingKeys.has(key)) return;
    processingKeys.add(key);

    const oldText = btn ? btn.innerHTML : "";
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = `<span>⏳</span><span>${t('processing') || '處理中...'}</span>`;
    }

    try {
      if (typeof updateStatus === "function") {
        await updateStatus(key, "PICKED_UP", {}, null);
      }
    } catch (err) {
      console.error("[KDS] Handover failed:", err);
    } finally {
      processingKeys.delete(key);
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = oldText;
      }
    }
  }

  function reprintKdsOrder(key, event) {
    if (event) event.stopPropagation();
    if (typeof PrinterService !== "undefined" && typeof PrinterService.printFullOrder === "function") {
      PrinterService.printFullOrder(key);
    } else if (typeof openReview === "function") {
      openReview(key);
    }
  }

  // --------------------------------------------------------------------------
  // Intercept & Bridge to orders-core.js renderAll()
  // --------------------------------------------------------------------------
  window.renderKdsView = renderKdsView;
  window.switchKdsStation = switchKdsStation;
  window.toggleKdsItemCheck = toggleKdsItemCheck;
  window.acceptKdsOrder = acceptKdsOrder;
  window.doneKdsOrder = doneKdsOrder;
  window.handoverKdsOrder = handoverKdsOrder;
  window.reprintKdsOrder = reprintKdsOrder;
  window.setDiningFilter = setDiningFilter;
  window.isOrderDineIn = isOrderDineIn;
  window.getOrderTableNumber = getOrderTableNumber;
  window.updateDiningFilterStats = updateDiningFilterStats;

  // Compatibility stubs for orders-core.js
  window.renderListLeft = function(orders) {
    renderKdsView(window.latestOrders || []);
  };
  window.renderListRight = function(orders) {
    // Already rendered in renderKdsView
  };

})(window);
