// ==========================================
// Benmi POS - Module: Modals & Change/Reject
// ==========================================

function openReview(orderKey) {
  const order = (latestOrders || []).find(o => o && o.key === orderKey);
  if (!order) return;
  reviewingOrder = order;

  if (order.status === "NEW") {
    dismissNewAlert();
  }

  const elKey = document.getElementById("review-order-key");
  if (elKey) elKey.innerText = order.key || "-";
  const elCust = document.getElementById("review-customer");
  if (elCust) elCust.innerText = order.customer || "-";
  const elPick = document.getElementById("review-pickup");
  if (elPick) elPick.innerText = formatPickupTimeDisplay(order.time);
  const elEta = document.getElementById("review-eta");
  if (elEta) elEta.innerText = formatEta(order.time);
  const elTot = document.getElementById("review-total");
  if (elTot) elTot.innerText = formatOrderTotal(order);
  const elSt = document.getElementById("review-status");
  if (elSt) elSt.innerText = order.status || "-";
  const elDining = document.getElementById("review-dining");
  if (elDining) {
    const isDineIn = typeof isOrderDineIn === "function" ? isOrderDineIn(order) : order.diningOption === "dine_in";
    elDining.innerHTML = isDineIn
      ? `<span style="color:#6d28d9; font-weight:1000;">🍽️ ${t('dineIn')}</span>`
      : `<span style="color:#047857; font-weight:1000;">🛍️ ${t('takeaway')}</span>`;
  }
  const elCont = document.getElementById("review-content");
  if (elCont) elCont.innerHTML = formatContentHtml(order);

  const actionsNew = document.getElementById("review-actions");
  const actionsAccepted = document.getElementById("review-actions-accepted");
  const actionsWaiting = document.getElementById("review-actions-waiting");
  const actionsDone = document.getElementById("review-actions-done");

  if (actionsNew) actionsNew.style.display = "none";
  if (actionsAccepted) actionsAccepted.style.display = "none";
  if (actionsWaiting) actionsWaiting.style.display = "none";
  if (actionsDone) actionsDone.style.display = "none";

  if (order.status === "NEW") {
    if (actionsNew) actionsNew.style.display = "grid";
  } else if (order.status === "ACCEPTED") {
    if (actionsAccepted) actionsAccepted.style.display = "grid";
  } else if (order.status === "DONE") {
    if (actionsDone) actionsDone.style.display = "grid";
  } else if (order.status === "WAITING_CUSTOMER_CHANGE" || order.status === "WAITING_CUSTOMER_REJECT") {
    if (actionsWaiting) actionsWaiting.style.display = "grid";
  }

  const revModal = document.getElementById("reviewModal");
  if (revModal) revModal.style.display = "flex";
}

function selectChangeReason(val) {
  const sel = document.getElementById("change-reason");
  if (sel) {
    sel.value = val;
    onChangeReasonChange();
  }
  const noteEl = document.getElementById("change-note");
  updateChangeSubmitButton(noteEl ? noteEl.value : "");
}

function selectRejectReason(val) {
  const sel = document.getElementById("reject-reason");
  if (sel) {
    sel.value = val;
  }
  document.querySelectorAll(".reject-card").forEach(card => {
    if (card.dataset.val === val || (card.dataset.val === "訂單過多" && val.startsWith("訂單過多"))) {
      card.classList.add("active");
    } else {
      card.classList.remove("active");
    }
  });
}

function getOrderBaseTime() {
  const now = new Date();
  if (reviewingOrder?.time) {
    const timeStr = String(reviewingOrder.time);
    const dateMatch = timeStr.match(/(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
    const timeMatch = timeStr.match(/(\d{1,2}):(\d{2})/);
    if (timeMatch) {
      const h = parseInt(timeMatch[1], 10);
      const m = parseInt(timeMatch[2], 10);
      const orderDate = new Date();
      if (dateMatch) {
        orderDate.setFullYear(parseInt(dateMatch[1], 10), parseInt(dateMatch[2], 10) - 1, parseInt(dateMatch[3], 10));
      }
      orderDate.setHours(h, m, 0, 0);
      return orderDate;
    }
  }
  return now;
}

function formatTimeHHMM(date) {
  const h = String(date.getHours()).padStart(2, "0");
  const m = String(date.getMinutes()).padStart(2, "0");
  return `${h}:${m}`;
}

function renderTimePresets() {
  const baseTime = getOrderBaseTime();
  const origTimeEl = document.getElementById("change-orig-time-val");
  if (origTimeEl) {
    origTimeEl.innerText = formatTimeHHMM(baseTime);
  }

  const presetMinutes = [5, 10, 15, 20, 30, 45];
  presetMinutes.forEach(mins => {
    const target = new Date(baseTime.getTime() + mins * 60000);
    const el = document.getElementById(`preset-target-${mins}`);
    if (el) el.innerText = formatTimeHHMM(target);
  });
}

function applyTimePreset(minutes) {
  const baseTime = getOrderBaseTime();
  const target = new Date(baseTime.getTime() + minutes * 60000);
  const targetStr = formatTimeHHMM(target);
  
  const noteEl = document.getElementById("change-note");
  if (noteEl) noteEl.value = targetStr;

  document.querySelectorAll(".preset-card").forEach(card => {
    card.classList.toggle("active", parseInt(card.dataset.mins, 10) === minutes);
  });

  updateChangeSubmitButton(targetStr);
}

function adjustTimeMinutes(deltaMinutes) {
  const noteEl = document.getElementById("change-note");
  if (!noteEl) return;
  const baseTime = getOrderBaseTime();
  let curr = new Date(baseTime.getTime());
  const match = String(noteEl.value).match(/(\d{1,2}):(\d{2})/);
  if (match) {
    curr.setHours(parseInt(match[1], 10), parseInt(match[2], 10), 0, 0);
  }
  const target = new Date(curr.getTime() + deltaMinutes * 60000);
  const targetStr = formatTimeHHMM(target);
  noteEl.value = targetStr;

  // Check if targetStr matches any preset card
  const diffMins = Math.round((target.getTime() - baseTime.getTime()) / 60000);
  document.querySelectorAll(".preset-card").forEach(card => {
    card.classList.toggle("active", parseInt(card.dataset.mins, 10) === diffMins);
  });

  updateChangeSubmitButton(targetStr);
}

function updateChangeSubmitButton(timeStr) {
  const btn = document.getElementById("btn-change-send");
  if (!btn) return;
  const reason = document.getElementById("change-reason").value;
  if (reason === "時間需調整" && timeStr) {
    btn.innerText = `${t('btnSendSuggest')} (${timeStr})`;
  } else {
    btn.innerText = t('btnSendSuggest');
  }
}

let tenantMenuItemsCache = null;

async function fetchTenantMenuItems() {
  if (tenantMenuItemsCache && tenantMenuItemsCache.length > 0) {
    return tenantMenuItemsCache;
  }
  const tenantId = getTenantIdFromUrl();
  try {
    const res = await fetch(`${WORKER_BASE}/api/tenant/bootstrap?tenant_id=${tenantId}&_t=${Date.now()}`);
    if (res.ok) {
      const data = await res.json();
      const itemsMap = new Map();

      const catalogList = Array.isArray(data.catalog) ? data.catalog : (Array.isArray(data.categories) ? data.categories : []);
      catalogList.forEach(cat => {
        if (Array.isArray(cat.items)) {
          cat.items.forEach(item => {
            if (item && item.name && !itemsMap.has(item.name)) {
              itemsMap.set(item.name, {
                name: item.name,
                category: cat.name || cat.title || ""
              });
            }
          });
        }
      });

      if (Array.isArray(data.items)) {
        data.items.forEach(item => {
          if (item && item.name && !itemsMap.has(item.name)) {
            itemsMap.set(item.name, {
              name: item.name,
              category: ""
            });
          }
        });
      }

      if (itemsMap.size > 0) {
        tenantMenuItemsCache = Array.from(itemsMap.values());
        return tenantMenuItemsCache;
      }
    }
  } catch (e) {
    console.warn("[SoldOutGrid] fetchTenantMenuItems error:", e);
  }

  return [];
}

async function renderSoldOutItemsGrid(order = null) {
  const grid = document.getElementById("change-soldout-grid");
  if (!grid) return;

  const menuItems = await fetchTenantMenuItems();
  if (!menuItems || menuItems.length === 0) {
    grid.innerHTML = `<div style="grid-column: 1 / -1; text-align: center; color: #9ca3af; padding: 16px;">(尚無菜單品項)</div>`;
    return;
  }

  // Detect ordered items from reviewingOrder if available
  const orderItemNames = new Set();
  if (order && order.content) {
    menuItems.forEach(item => {
      if (order.content.includes(item.name)) {
        orderItemNames.add(item.name);
      }
    });
  }

  // Sort items: items appearing in current order come first
  const sortedItems = [...menuItems].sort((a, b) => {
    const aInOrder = orderItemNames.has(a.name) ? 1 : 0;
    const bInOrder = orderItemNames.has(b.name) ? 1 : 0;
    return bInOrder - aInOrder;
  });

  grid.innerHTML = sortedItems.map(item => {
    const isInOrder = orderItemNames.has(item.name);
    const badgeHtml = isInOrder ? `<span style="font-size: 11px; background: #fef3c7; color: #92400e; padding: 2px 6px; border-radius: 4px; font-weight: 800; margin-left: 4px;">本單</span>` : '';
    return `
      <label class="checkbox-card" style="${isInOrder ? 'border-color: #f59e0b; background: #fffdf5;' : ''}">
        <input type="checkbox" value="${escapeHtml(item.name)}" class="sold-item">
        <span>${escapeHtml(item.name)}</span>${badgeHtml}
      </label>
    `;
  }).join("");
}

function clearSoldOutItems() {
  const checkboxes = document.querySelectorAll(".sold-item");
  if (checkboxes) checkboxes.forEach(cb => cb.checked = false);
}

function reviewOpenChange() {
  if (!reviewingOrder?.key) return;
  const savedKey = reviewingOrder.key;  // Save key BEFORE closeModal wipes it
  const savedOrder = reviewingOrder;
  closeModal();
  reviewingOrder = savedOrder;
  currentOrderKey = savedKey;           // Restore after closeModal
  document.getElementById("change-reason").value = "時間需調整";
  renderSoldOutItemsGrid(savedOrder);
  clearSoldOutItems();
  onChangeReasonChange();
  renderTimePresets();
  applyTimePreset(10);
  document.getElementById("changeModal").style.display = "flex";
}

function reviewOpenReject() {
  if (!reviewingOrder?.key) return;
  const savedKey = reviewingOrder.key;  // Save key BEFORE closeModal wipes it
  const savedOrder = reviewingOrder;
  closeModal();
  reviewingOrder = savedOrder;
  currentOrderKey = savedKey;           // Restore after closeModal
  document.getElementById("reject-reason").selectedIndex = 0;
  selectRejectReason("今日已售完");
  document.getElementById("rejectModal").style.display = "flex";
}

function onChangeReasonChange() {
  const reason = document.getElementById("change-reason").value;
  const timeDiv = document.getElementById("change-time-div");
  const itemsDiv = document.getElementById("change-items-div");
  const tabTime = document.getElementById("tab-reason-time");
  const tabSold = document.getElementById("tab-reason-soldout");

  if (reason === "時間需調整") {
    if (timeDiv) timeDiv.style.display = "block";
    if (itemsDiv) itemsDiv.style.display = "none";
    if (tabTime) tabTime.classList.add("active");
    if (tabSold) tabSold.classList.remove("active");
  } else {
    if (timeDiv) timeDiv.style.display = "none";
    if (itemsDiv) itemsDiv.style.display = "block";
    if (tabTime) tabTime.classList.remove("active");
    if (tabSold) tabSold.classList.add("active");
    renderSoldOutItemsGrid(reviewingOrder);
  }
}

// Pre-fetch menu items for instant modal responsiveness
fetchTenantMenuItems();

async function confirmAction(type, btn) {
  const key = currentOrderKey;
  const isChange = type === "CHANGE";
  const status = isChange ? "CHANGED" : "REJECTED";
  const reason = isChange ? document.getElementById("change-reason").value : document.getElementById("reject-reason").value;
  let note = isChange ? document.getElementById("change-note").value.trim() : undefined;

  if (isChange && reason === "時間需調整" && !note) {
    alert(t("alertInputTime"));
    return;
  }

  if (isChange && reason === "口味售完") {
    const checked = Array.from(document.querySelectorAll(".sold-item:checked")).map(cb => cb.value);
    if (checked.length === 0) {
      alert(t("alertSelectSoldout"));
      return;
    }
    note = checked.join(",");
  }

  await updateStatus(key, status, { reason, note }, btn);
  closeModal();
}

function openBlabContactModal() {
  const modal = document.getElementById("blabContactModal");
  if (modal) modal.style.display = "flex";
}

function closeBlabContactModal() {
  const modal = document.getElementById("blabContactModal");
  if (modal) modal.style.display = "none";
}
