// ==========================================================================
// Benmi POS - Module: Adaptive Compact KDS (Kitchen Display & Expediter System)
// Architecture Specification: docs/proposals/live_orders_kds_redesign/pdp_ui_ux_design.md
// Refined Retail Aesthetic & Zero Emojis (Commercial-Safe Lucide SVG Icons)
// ==========================================================================

(function(window) {
  'use strict';

  // --------------------------------------------------------------------------
  // Commercial-Safe SVG Vector Icons (Lucide / Feather - MIT License)
  // --------------------------------------------------------------------------
  const KDS_SVG = {
    bell: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block; vertical-align:-1px;"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>`,
    chef: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block; vertical-align:-1px;"><path d="M6 13.8a4.4 4.4 0 1 1-1.8-8.4A4.5 4.5 0 0 1 12 4a4.5 4.5 0 0 1 7.8 1.4A4.4 4.4 0 1 1 18 13.8V17H6v-3.2z"></path><line x1="6" y1="17" x2="18" y2="17"></line><line x1="6" y1="20" x2="18" y2="20"></line></svg>`,
    bag: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block; vertical-align:-1px;"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"></path><path d="M3 6h18"></path><path d="M16 10a4 4 0 0 1-8 0"></path></svg>`,
    dineIn: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block; vertical-align:-1px;"><path d="M18 2v6a3 3 0 0 1-3 3 3 3 0 0 1-3-3V2"></path><path d="M15 2v10"></path><path d="M15 14v8"></path><path d="M6 2v20"></path><path d="M6 2a3 3 0 0 1 3 3v3a3 3 0 0 1-3 3"></path></svg>`,
    clock: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block; vertical-align:-1px; opacity:0.85;"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>`,
    user: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block; vertical-align:-1px; opacity:0.75;"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>`,
    phone: `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block; vertical-align:-1px; opacity:0.75;"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>`,
    flavor: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block; vertical-align:-1px;"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"></path></svg>`,
    note: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block; vertical-align:-1px;"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>`,
    check: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block; vertical-align:-1px;"><polyline points="20 6 9 17 4 12"></polyline></svg>`,
    printer: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>`,
    utensils: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block; vertical-align:-1px;"><path d="M18 2v6a3 3 0 0 1-3 3 3 3 0 0 1-3-3V2"></path><path d="M15 2v10"></path><path d="M15 14v8"></path><path d="M6 2v20"></path><path d="M6 2a3 3 0 0 1 3 3v3a3 3 0 0 1-3 3"></path></svg>`,
    inbox: `<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"></polyline><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"></path></svg>`
  };

  // Station State: 'pending' | 'cooking' | 'ready' (used for Portrait / Mobile single-station mode)
  let kdsActiveStation = 'cooking';
  let currentDiningFilter = 'all'; // 'all' | 'takeaway' | 'dine_in'
  
  // Checklist State in memory (persists across polls during session)
  const kdsChecklistState = window.__kdsChecklistState || {};
  window.__kdsChecklistState = kdsChecklistState;

  // Track processing keys to prevent double-click
  const processingKeys = new Set();

  // --------------------------------------------------------------------------
  // Helper: Strip Emojis from User/Store Text (Commercial UI Hygiene)
  // --------------------------------------------------------------------------
  function stripEmojis(str) {
    if (!str) return '';
    return String(str)
      .replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1FA00}-\u{1FAFF}\u{1F1E6}-\u{1F1FF}]/gu, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

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
  // --------------------------------------------------------------------------
  // Station Switcher for Portrait / Mobile & Swipe Gestures
  // --------------------------------------------------------------------------
  const KDS_STATIONS = ['pending', 'cooking', 'ready'];

  function switchKdsStation(station, direction) {
    if (!station || !KDS_STATIONS.includes(station)) return;

    const prevStation = kdsActiveStation;
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

    const cols = { pending: colPending, cooking: colCooking, ready: colReady };

    // Clear previous animation classes
    Object.values(cols).forEach(c => {
      if (c) c.classList.remove("slide-from-right", "slide-from-left");
    });

    // Determine direction if not provided
    const prevIdx = KDS_STATIONS.indexOf(prevStation);
    const newIdx = KDS_STATIONS.indexOf(station);
    const dir = direction || (newIdx > prevIdx ? 'next' : (newIdx < prevIdx ? 'prev' : null));

    if (colPending) colPending.classList.toggle("active-station", station === 'pending');
    if (colCooking) colCooking.classList.toggle("active-station", station === 'cooking');
    if (colReady) colReady.classList.toggle("active-station", station === 'ready');

    const targetCol = cols[station];
    if (targetCol && dir) {
      void targetCol.offsetWidth; // Reflow to replay animation
      targetCol.classList.add(dir === 'next' ? 'slide-from-right' : 'slide-from-left');
    }

    if (navigator.vibrate) {
      try { navigator.vibrate(12); } catch (e) {}
    }
  }

  function stepKdsStation(delta) {
    const currentIndex = KDS_STATIONS.indexOf(kdsActiveStation);
    if (currentIndex === -1) return false;
    const nextIndex = currentIndex + delta;
    if (nextIndex >= 0 && nextIndex < KDS_STATIONS.length) {
      switchKdsStation(KDS_STATIONS[nextIndex], delta > 0 ? 'next' : 'prev');
      return true;
    }
    return false;
  }

  // --------------------------------------------------------------------------
  // Temporal Visual Urgency Spectrum Calculator
  // --------------------------------------------------------------------------
  function computeUrgency(order) {
    if (!order) return { level: 'calm', minutesRemaining: 15, label: '' };

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
  // Mise en Place Aggregator (Thanh Gom Món Bếp - Zero Emojis)
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

    const rawTitle = t('kdsBatchMiseTitle', { orders: cookingOrders.length, items: totalPortions }) ||
      `廚房即時備料總攬 (${cookingOrders.length} 張單，共 ${totalPortions} 份)`;
    const titleText = stripEmojis(rawTitle.replace(/^[🔪\s]+/, ''));

    const chipsHtml = sortedItems.map(([name, count]) => `
      <div class="kds-mise-chip">
        <span>${escapeHtml(stripEmojis(name))}</span>
        <span class="kds-mise-chip-count">${count}</span>
      </div>
    `).join("");

    container.innerHTML = `
      <div class="kds-mise-bar">
        <div class="kds-mise-label">
          ${KDS_SVG.chef}
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
      const isNowChecked = !!kdsChecklistState[stateKey];
      itemEl.classList.toggle("checked", isNowChecked);
      const box = itemEl.querySelector(".kds-checkbox-touch");
      if (box) {
        box.innerHTML = isNowChecked ? KDS_SVG.check : '';
      }
    }
  }

  // --------------------------------------------------------------------------
  // Card Renderers (Stylized Retail Aesthetic - Zero Emojis)
  // --------------------------------------------------------------------------

  // Station 1: Pending Order Mini Card
  function renderPendingCard(order) {
    const isDineIn = isOrderDineIn(order);
    const tableNum = getOrderTableNumber(order);
    const tableBadge = tableNum ? `<span class="kds-table-badge">${escapeHtml(tableNum)}</span>` : "";

    const diningBadge = isDineIn
      ? `<span class="kds-dining-pill kds-dining-dinein">${KDS_SVG.dineIn} ${t('badgeDineIn') || '內用'}${tableBadge}</span>`
      : `<span class="kds-dining-pill kds-dining-takeaway">${KDS_SVG.bag} ${t('badgeTakeaway') || '外帶'}</span>`;

    const pickupTimeStr = (typeof formatPickupTimeDisplay === "function")
      ? formatPickupTimeDisplay(order.time, order.createdAt, order.content)
      : (order.time || "");

    let itemsPreview = "";
    if (typeof getOrderItemsPreview === "function") {
      itemsPreview = getOrderItemsPreview(order);
    } else {
      itemsPreview = String(order.content || "").split("\n").slice(0, 2).join(" · ");
    }
    itemsPreview = stripEmojis(itemsPreview);

    const cleanCustomer = escapeHtml(stripEmojis(order.customer) || t('defaultCustomer') || '顧客');

    return `
      <div class="kds-card-mini" onclick="openReview('${escapeHtml(order.key)}')">
        <div class="kds-card-mini-header">
          <span class="kds-card-mini-code">#${escapeHtml(order.key)}</span>
          <span class="kds-card-mini-time">${KDS_SVG.clock} ${escapeHtml(pickupTimeStr)}</span>
        </div>

        <div style="display: flex; align-items: center; justify-content: space-between; gap: 6px;">
          <span class="kds-card-mini-cust">${KDS_SVG.user} ${cleanCustomer}</span>
          ${diningBadge}
        </div>

        ${itemsPreview ? `<div class="kds-card-mini-preview">${escapeHtml(itemsPreview)}</div>` : ''}

        <button type="button" class="kds-btn-bottom-full kds-btn-accept" onclick="acceptKdsOrder('${escapeHtml(order.key)}', event, this)">
          ${KDS_SVG.check}
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
      ? `<span class="kds-dining-pill kds-dining-dinein">${KDS_SVG.dineIn} ${t('badgeDineIn') || '內用'}${tableBadge}</span>`
      : `<span class="kds-dining-pill kds-dining-takeaway">${KDS_SVG.bag} ${t('badgeTakeaway') || '外帶'}</span>`;

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
        ? `<div class="kds-inline-pills">${it.options.map(opt => `<span class="kds-inline-pill">${escapeHtml(stripEmojis(opt))}</span>`).join("")}</div>`
        : "";

      return `
        <div class="kds-checklist-item ${isChecked ? 'checked' : ''}" id="kds-item-${order.key}-${idx}" onclick="toggleKdsItemCheck('${escapeHtml(order.key)}', ${idx}, event)">
          <div class="kds-checkbox-touch">
            ${isChecked ? KDS_SVG.check : ''}
          </div>
          <div class="kds-item-content">
            <div class="kds-item-header">
              <span class="kds-item-name">${escapeHtml(stripEmojis(it.name))}</span>
              <span class="kds-item-qty">x${it.quantity || 1}</span>
            </div>
            ${optionsPills}
          </div>
        </div>
      `;
    }).join("");

    const cleanCustomer = escapeHtml(stripEmojis(order.customer) || t('defaultCustomer') || '顧客');
    const cleanFlavor = stripEmojis(flavorText);
    const cleanNote = order.note ? escapeHtml(stripEmojis(order.note)) : "";

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
              ${KDS_SVG.clock}
              <span class="kds-countdown-text">${escapeHtml(urgency.label)}</span>
            </span>

            <!-- Reprint Vector Icon Button -->
            <button type="button" class="kds-icon-action-btn" title="${t('kdsReprintTooltip') || '列印單據'}" onclick="reprintKdsOrder('${escapeHtml(order.key)}', event)">
              ${KDS_SVG.printer}
            </button>
          </div>
        </div>

        <!-- Customer Sub-Row -->
        <div class="kds-cust-row">
          <span>${KDS_SVG.user} ${cleanCustomer}</span>
          ${order.phone ? `<span>${KDS_SVG.phone} ${escapeHtml(order.phone)}</span>` : ''}
          <span style="color: #cbd5e1;">·</span>
          <span>${escapeHtml(pickupTimeStr)}</span>
        </div>

        <!-- Flavor Strip -->
        ${cleanFlavor ? `
          <div class="kds-flavor-strip">
            ${KDS_SVG.flavor}
            <span>${escapeHtml(cleanFlavor)}</span>
          </div>
        ` : ''}

        <!-- Micro-Checklist Items -->
        <div class="kds-checklist">
          ${itemsChecklistHtml}
        </div>

        <!-- Note callout bubble if exists -->
        ${cleanNote ? `
          <div class="kds-note-bubble">
            ${KDS_SVG.note}
            <div><strong>${t('customerNoteLabel') || '顧客備註'}:</strong> ${cleanNote}</div>
          </div>
        ` : ''}

        <!-- Single 100% Width Primary Action Button -->
        <button type="button" class="kds-btn-bottom-full kds-btn-done" onclick="doneKdsOrder('${escapeHtml(order.key)}', event, this)">
          ${KDS_SVG.check}
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
      ? `<span class="kds-dining-pill kds-dining-dinein">${KDS_SVG.dineIn} ${t('badgeDineIn') || '內用'}${tableBadge}</span>`
      : `<span class="kds-dining-pill kds-dining-takeaway">${KDS_SVG.bag} ${t('badgeTakeaway') || '外帶'}</span>`;

    const totalStr = (order.total || order.total_amount) ? `$${order.total || order.total_amount}` : "";
    const cleanCustomer = escapeHtml(stripEmojis(order.customer) || t('defaultCustomer') || '顧客');

    return `
      <div class="kds-card-ready" onclick="openReview('${escapeHtml(order.key)}')">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span class="kds-ready-code-callout">#${escapeHtml(order.key)}</span>
          ${diningBadge}
        </div>

        <div class="kds-ready-info-row">
          <span>${KDS_SVG.user} ${cleanCustomer}</span>
          <span class="kds-ready-price">${escapeHtml(totalStr)}</span>
        </div>

        <button type="button" class="kds-btn-bottom-full kds-btn-handover" onclick="handoverKdsOrder('${escapeHtml(order.key)}', event, this)">
          ${KDS_SVG.bag}
          <span>${t('kdsActionHandover') || '已取餐'}</span>
        </button>
      </div>
    `;
  }

  // --------------------------------------------------------------------------
  // Core KDS Dispatch & Render Function
  // --------------------------------------------------------------------------
  function renderKdsView(orders) {
    if (typeof initKdsSwipeGestures === "function") initKdsSwipeGestures();
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

    // Update Segmented Tab Counts & Icons
    const tabCountPend = document.getElementById("kds-tab-count-pending");
    if (tabCountPend) tabCountPend.innerText = String(pendingOrders.length);

    const tabCountCook = document.getElementById("kds-tab-count-cooking");
    if (tabCountCook) tabCountCook.innerText = String(cookingOrders.length);

    const tabCountReady = document.getElementById("kds-tab-count-ready");
    if (tabCountReady) tabCountReady.innerText = String(readyOrders.length);

    const tabIconPend = document.getElementById("kds-tab-icon-pending");
    if (tabIconPend) tabIconPend.innerHTML = KDS_SVG.bell;

    const tabIconCook = document.getElementById("kds-tab-icon-cooking");
    if (tabIconCook) tabIconCook.innerHTML = KDS_SVG.chef;

    const tabIconReady = document.getElementById("kds-tab-icon-ready");
    if (tabIconReady) tabIconReady.innerHTML = KDS_SVG.bag;

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
            <div class="kds-empty-icon">${KDS_SVG.inbox}</div>
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
            <div class="kds-empty-icon">${KDS_SVG.chef}</div>
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
            <div class="kds-empty-icon">${KDS_SVG.bag}</div>
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
      btn.innerHTML = `${KDS_SVG.clock} <span>${t('processing') || '處理中...'}</span>`;
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
      btn.innerHTML = `${KDS_SVG.clock} <span>${t('processing') || '處理中...'}</span>`;
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
      btn.innerHTML = `${KDS_SVG.clock} <span>${t('processing') || '處理中...'}</span>`;
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
  // Multi-Mode Swipe Gestures: Touch, Mouse Pointer & Trackpad Navigation
  // --------------------------------------------------------------------------
  const DINING_FILTERS = ['all', 'takeaway', 'dine_in'];

  function stepDiningFilter(delta) {
    const idx = DINING_FILTERS.indexOf(currentDiningFilter);
    if (idx === -1) return false;
    const nextIdx = idx + delta;
    if (nextIdx >= 0 && nextIdx < DINING_FILTERS.length) {
      setDiningFilter(DINING_FILTERS[nextIdx]);
      return true;
    }
    return false;
  }

  function areStationTabsVisible() {
    const tabs = document.getElementById("kds-segmented-tabs");
    if (!tabs) return false;
    if (typeof window.getComputedStyle === "function") {
      const style = window.getComputedStyle(tabs);
      return style && style.display !== "none";
    }
    return false;
  }

  function handleSwipeAction(direction, sourceArea) {
    // direction: 'left' (swipe next) | 'right' (swipe prev)
    const delta = direction === 'left' ? 1 : -1;

    // A. If swipe occurs specifically on dining filter bar
    if (sourceArea === 'dining-filter') {
      stepDiningFilter(delta);
      return;
    }

    // B. If station tabs are visible (portrait / tablet / mobile single-station mode)
    if (areStationTabsVisible()) {
      const moved = stepKdsStation(delta);
      if (!moved) {
        // If at the end of the pipeline ('ready') and user swipes left again, transition to history tab
        if (direction === 'left' && kdsActiveStation === 'ready') {
          if (typeof window.switchTab === "function") {
            window.switchTab("history");
          }
        }
      }
      return;
    }

    // C. If station tabs are not visible (widescreen desktop where all 3 columns are shown side by side)
    // or swipe occurred on topbar / history view:
    if (typeof window.switchTab === "function") {
      if (direction === 'left') {
        window.switchTab("history");
      } else {
        window.switchTab("live");
      }
    }
  }

  function initKdsSwipeGestures() {
    // 1. Swipe on KDS Live View (#view-live)
    const liveView = document.getElementById("view-live");
    if (liveView && typeof liveView.addEventListener === "function" && !liveView.__kdsSwipeAttached) {
      liveView.__kdsSwipeAttached = true;

      let touchStartX = 0;
      let touchStartY = 0;
      let touchStartTime = 0;
      let isVerticalScroll = false;
      let isSwipeHandled = false;
      let touchSourceArea = 'kds-body';

      liveView.addEventListener("touchstart", (e) => {
        if (!e.touches || e.touches.length !== 1) return;
        const target = e.target;
        
        // Don't intercept clicks/taps on actionable form inputs
        if (target.closest("input, select, textarea")) {
          return;
        }

        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
        touchStartTime = Date.now();
        isVerticalScroll = false;
        isSwipeHandled = false;
        touchSourceArea = target.closest(".dining-filter-bar") ? 'dining-filter' : 'kds-body';
      }, { passive: true });

      liveView.addEventListener("touchmove", (e) => {
        if (!touchStartTime || isSwipeHandled || !e.touches || e.touches.length !== 1) return;

        const currentX = e.touches[0].clientX;
        const currentY = e.touches[0].clientY;
        const diffX = currentX - touchStartX;
        const diffY = currentY - touchStartY;

        // If vertical movement dominant, release completely to native card scrolling
        if (!isVerticalScroll && Math.abs(diffY) > 16 && Math.abs(diffY) > Math.abs(diffX)) {
          isVerticalScroll = true;
          return;
        }

        // Fast responsive trigger if horizontal movement exceeds threshold
        if (!isVerticalScroll && Math.abs(diffX) > 46 && Math.abs(diffX) > Math.abs(diffY) * 1.25) {
          isSwipeHandled = true;
          touchStartTime = 0;
          handleSwipeAction(diffX < 0 ? 'left' : 'right', touchSourceArea);
        }
      }, { passive: true });

      liveView.addEventListener("touchend", (e) => {
        if (!touchStartTime || isVerticalScroll || isSwipeHandled) {
          touchStartTime = 0;
          return;
        }

        const elapsed = Date.now() - touchStartTime;
        touchStartTime = 0;
        if (elapsed > 650 || !e.changedTouches || e.changedTouches.length === 0) return;

        const diffX = e.changedTouches[0].clientX - touchStartX;
        const diffY = e.changedTouches[0].clientY - touchStartY;

        if (Math.abs(diffX) >= 40 && Math.abs(diffX) > Math.abs(diffY) * 1.2) {
          handleSwipeAction(diffX < 0 ? 'left' : 'right', touchSourceArea);
        }
      }, { passive: true });

      // 2. Pointer & Mouse drag support (for testing in desktop browsers with mouse drag)
      let mouseStartX = 0;
      let mouseStartY = 0;
      let mouseStartTime = 0;
      let isMouseDown = false;
      let mouseSourceArea = 'kds-body';

      const onMouseDown = (clientX, clientY, target) => {
        if (!target || target.closest("button, input, select, textarea, a, .kds-checkbox-touch, .kds-item-chk, .kds-card-btn")) {
          return;
        }
        mouseStartX = clientX;
        mouseStartY = clientY;
        mouseStartTime = Date.now();
        isMouseDown = true;
        mouseSourceArea = target.closest(".dining-filter-bar") ? 'dining-filter' : 'kds-body';
      };

      const onMouseMove = (clientX, clientY) => {
        if (!isMouseDown) return;
        const diffX = clientX - mouseStartX;
        const diffY = clientY - mouseStartY;

        // Immediate snap when dragged over threshold
        if (Math.abs(diffX) > 42 && Math.abs(diffX) > Math.abs(diffY) * 1.2) {
          isMouseDown = false;
          handleSwipeAction(diffX < 0 ? 'left' : 'right', mouseSourceArea);
        }
      };

      const onMouseUp = (clientX, clientY) => {
        if (!isMouseDown) return;
        isMouseDown = false;
        const elapsed = Date.now() - mouseStartTime;
        if (elapsed > 700) return;

        const diffX = clientX - mouseStartX;
        const diffY = clientY - mouseStartY;

        if (Math.abs(diffX) >= 36 && Math.abs(diffX) > Math.abs(diffY) * 1.15) {
          handleSwipeAction(diffX < 0 ? 'left' : 'right', mouseSourceArea);
        }
      };

      liveView.addEventListener("pointerdown", (e) => {
        if (e.pointerType === "mouse" && e.button === 0) onMouseDown(e.clientX, e.clientY, e.target);
      });
      liveView.addEventListener("mousedown", (e) => {
        if (e.button === 0) onMouseDown(e.clientX, e.clientY, e.target);
      });

      if (typeof document !== "undefined" && typeof document.addEventListener === "function") {
        document.addEventListener("mousemove", (e) => {
          if (isMouseDown) onMouseMove(e.clientX, e.clientY);
        });
        document.addEventListener("pointermove", (e) => {
          if (isMouseDown && e.pointerType === "mouse") onMouseMove(e.clientX, e.clientY);
        });
        document.addEventListener("mouseup", (e) => {
          if (isMouseDown) onMouseUp(e.clientX, e.clientY);
        });
        document.addEventListener("pointerup", (e) => {
          if (isMouseDown && e.pointerType === "mouse") onMouseUp(e.clientX, e.clientY);
        });
      }

      // 3. Trackpad two-finger swipe support
      let wheelCooldown = 0;
      liveView.addEventListener("wheel", (e) => {
        if (Date.now() - wheelCooldown < 380) return;
        if (Math.abs(e.deltaX) > 32 && Math.abs(e.deltaX) > Math.abs(e.deltaY) * 2) {
          wheelCooldown = Date.now();
          handleSwipeAction(e.deltaX > 0 ? 'left' : 'right', 'kds-body');
        }
      }, { passive: true });
    }

    // 2. Swipe on Topbar and History View (#view-history)
    const topbar = document.querySelector(".topbar");
    const viewHistory = document.getElementById("view-history");

    [topbar, viewHistory].forEach(el => {
      if (el && typeof el.addEventListener === "function" && !el.__topbarSwipeAttached) {
        el.__topbarSwipeAttached = true;
        let startX = 0;
        let startY = 0;
        let startTime = 0;

        el.addEventListener("touchstart", (e) => {
          if (!e.touches || e.touches.length !== 1) return;
          if (e.target.closest("button, input, select, textarea, a, .store-status-dropdown, .store-status-menu")) return;
          startX = e.touches[0].clientX;
          startY = e.touches[0].clientY;
          startTime = Date.now();
        }, { passive: true });

        el.addEventListener("touchend", (e) => {
          if (!startTime || !e.changedTouches || e.changedTouches.length === 0) return;
          const elapsed = Date.now() - startTime;
          startTime = 0;
          if (elapsed > 600) return;

          const diffX = e.changedTouches[0].clientX - startX;
          const diffY = e.changedTouches[0].clientY - startY;

          if (Math.abs(diffX) >= 42 && Math.abs(diffX) > Math.abs(diffY) * 1.25) {
            if (diffX < 0 && typeof window.switchTab === "function") {
              window.switchTab("history");
            } else if (diffX > 0 && typeof window.switchTab === "function") {
              window.switchTab("live");
            }
          }
        }, { passive: true });
      }
    });
  }

  // Auto-bind swipe on ready
  if (typeof document !== "undefined") {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", initKdsSwipeGestures);
    } else {
      initKdsSwipeGestures();
    }
  }

  // --------------------------------------------------------------------------
  // Intercept & Bridge to orders-core.js renderAll()
  // --------------------------------------------------------------------------
  window.KDS_SVG = KDS_SVG;
  window.renderKdsView = renderKdsView;
  window.switchKdsStation = switchKdsStation;
  window.stepKdsStation = stepKdsStation;
  window.stepDiningFilter = stepDiningFilter;
  window.initKdsSwipeGestures = initKdsSwipeGestures;
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

