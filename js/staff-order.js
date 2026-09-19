/* ============================================================
   BLAB STAFF ORDERING - IN-STORE TABLE ORDERING CLIENT
   ============================================================ */

(function () {
  'use strict';

  // --- 1. ENVIRONMENT & BASE URL RESOLUTION ---
  function resolveWorkerBase() {
    try {
      const hostname = window.location.hostname || "";
      const searchParams = new URLSearchParams(window.location.search);
      const forcedEnv = searchParams.get("env") || (typeof localStorage !== "undefined" && localStorage.getItem("pos_env_override"));

      if (forcedEnv === "dev" || hostname.startsWith("dev.") || hostname.includes(".dev.") || hostname.includes("-dev.")) {
        return "https://platform-worker-dev.thuanmnc.workers.dev";
      }
      if (forcedEnv === "staging" || forcedEnv === "test" || hostname.startsWith("staging.") || hostname.includes(".staging.")) {
        return "https://platform-worker-staging.thuanmnc.workers.dev";
      }
      return "https://benmi-worker-official.thuanmnc.workers.dev";
    } catch (e) {
      return "https://benmi-worker-official.thuanmnc.workers.dev";
    }
  }

  const WORKER_BASE = resolveWorkerBase();

  // --- 2. I18N DICTIONARY ---
  const I18N = {
    "vi": {
      staffBadge: "Nhận đơn tại bàn",
      loginTitle: "Đăng nhập nhân viên",
      loginDesc: "Nhập mã PIN POS để bắt đầu nhận đơn tại bàn",
      labelPin: "Mã PIN cửa hàng",
      btnLogin: "Đăng nhập",
      logout: "Đăng xuất",
      tablesTitle: "Chọn bàn phục vụ",
      tablesDesc: "Chọn bàn trống để mở đơn hoặc bàn đang phục vụ để gọi thêm món",
      btnRefresh: "Làm mới",
      searchPlaceholder: "Tìm kiếm bàn...",
      filterAll: "Tất cả",
      filterEmpty: "Bàn trống",
      filterOccupied: "Đang phục vụ",
      emptyStatus: "Trống",
      occupiedStatus: "Đang phục vụ",
      btnOpenOrder: "Mở đơn",
      btnAppendRound: "Gọi thêm",
      modeNew: "Mở đơn mới",
      modeAppend: "Gọi thêm món",
      bannerNewSub: "Chưa có đơn nào. Chọn món để bắt đầu lượt gọi món đầu tiên.",
      bannerAppendSub: "Đơn hiện tại: #{displayKey} • {total} • Lượt {round}",
      btnChangeTable: "Đổi bàn",
      btnBackTables: "Đổi bàn",
      cartViewBtn: "Xem giỏ hàng",
      cartItemsPreviewEmpty: "Chưa có món nào",
      cartTitle: "Giỏ hàng nhận đơn",
      labelCustomer: "Tên khách (không bắt buộc)",
      labelNote: "Ghi chú đơn (không bắt buộc)",
      summarySubtotal: "Tạm tính:",
      summaryTotal: "Tổng tiền:",
      btnContinueOrdering: "Tiếp tục chọn món",
      btnConfirmOrder: "Xác nhận gửi đơn",
      btnSending: "Đang gửi đơn...",
      btnAddItem: "Thêm vào đơn",
      successTitle: "Gửi đơn thành công!",
      successDesc: "Đơn hàng đã xuất hiện trên POS và máy in quầy.",
      successOrderKey: "Mã đơn:",
      successTable: "Bàn:",
      successRound: "Lượt gửi:",
      successTotal: "Tổng tiền:",
      btnSuccessBack: "Trở về danh sách bàn",
      conflictTitle: "Xung đột dữ liệu (409)",
      conflictDesc: "Bàn đã có đơn mới hoặc đơn vừa được cập nhật lượt mới. Giỏ hàng của bạn vẫn được giữ nguyên an toàn.",
      btnResolveConflict: "Tải lại bàn & Kiểm tra lại giỏ hàng",
      pinError: "Mã PIN không đúng hoặc cửa hàng chưa kích hoạt tính năng.",
      featureDisabled: "Cửa hàng chưa kích hoạt tính năng nhận đơn tại bàn.",
      soldOut: "Hết hàng",
      allItems: "Tất cả món",
      emptyTablesList: "Không tìm thấy bàn nào.",
      noItemsInCat: "Không có món trong danh mục này."
    },
    "zh-TW": {
      staffBadge: "桌邊點餐",
      loginTitle: "門市點餐登入",
      loginDesc: "請輸入門市管理 PIN 碼開始桌邊點餐",
      labelPin: "門市管理 PIN 碼",
      btnLogin: "登入",
      logout: "登出",
      tablesTitle: "選擇服務桌號",
      tablesDesc: "選擇空桌開啟新訂單，或選擇使用中桌號進行加點",
      btnRefresh: "重新整理",
      searchPlaceholder: "搜尋桌號...",
      filterAll: "全部",
      filterEmpty: "空桌",
      filterOccupied: "使用中",
      emptyStatus: "空桌",
      occupiedStatus: "使用中",
      btnOpenOrder: "開啟訂單",
      btnAppendRound: "加點餐點",
      modeNew: "開啟新訂單",
      modeAppend: "加點餐點",
      bannerNewSub: "尚未有點餐紀錄。請選取餐點進行首輪點餐。",
      bannerAppendSub: "目前訂單：#{displayKey} • {total} • 第 {round} 輪",
      btnChangeTable: "更換桌號",
      btnBackTables: "更換桌號",
      cartViewBtn: "查看購物車",
      cartItemsPreviewEmpty: "尚未選取餐點",
      cartTitle: "點餐購物車",
      labelCustomer: "顧客姓名 (選填)",
      labelNote: "整單備註 (選填)",
      summarySubtotal: "小計：",
      summaryTotal: "總金額：",
      btnContinueOrdering: "繼續選購",
      btnConfirmOrder: "確認送出訂單",
      btnSending: "送出處理中...",
      btnAddItem: "加入清單",
      successTitle: "點餐送出成功！",
      successDesc: "訂單已送達 POS 櫃台與出單機。",
      successOrderKey: "訂單編號：",
      successTable: "桌號：",
      successRound: "點餐輪次：",
      successTotal: "總金額：",
      btnSuccessBack: "返回桌號清單",
      conflictTitle: "訂單狀態更新衝突 (409)",
      conflictDesc: "該桌已有新訂單或已更新輪次。您的購物車內容已完整保留，請重新整理確認。",
      btnResolveConflict: "重新整理並檢查購物車",
      pinError: "PIN 碼錯誤或門市尚未啟用桌邊點餐功能。",
      featureDisabled: "店家尚未啟用桌邊點餐功能。",
      soldOut: "已售完",
      allItems: "全部餐點",
      emptyTablesList: "找不到符合條件的桌號。",
      noItemsInCat: "此分類目前尚無餐點。"
    }
  };

  // --- 3. APPLICATION STATE ---
  const state = {
    tenantId: "",
    token: "",
    brandName: "",
    storeStatus: "open",
    allowDineIn: true,
    tables: [],
    tableFilter: "all",
    tableSearchQuery: "",
    currentTable: null,
    catalog: [],
    categories: [],
    customizations: [],
    activeCategory: "all",
    cart: [],
    selectedItem: null,
    modalQty: 1,
    modalSelectedOptions: [],
    currentLang: (typeof localStorage !== "undefined" && localStorage.getItem("staff_order_lang")) || "vi",
    pollTimer: null
  };

  function t(key, vars = {}) {
    let str = (I18N[state.currentLang] && I18N[state.currentLang][key]) || (I18N["vi"] && I18N["vi"][key]) || key;
    for (const [k, v] of Object.entries(vars)) {
      str = str.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
    }
    return str;
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // --- 4. INITIALIZATION ---
  async function initApp() {
    const params = new URLSearchParams(window.location.search);
    state.tenantId = params.get("tenant_id") || params.get("tenant") || (typeof localStorage !== "undefined" && localStorage.getItem("pos_device_tenant_id")) || "benmi";

    applyI18nLabels();

    // Check capability first
    try {
      const capRes = await fetch(`${WORKER_BASE}/api/staff/capabilities?tenant_id=${encodeURIComponent(state.tenantId)}&_t=${Date.now()}`);
      if (capRes.ok) {
        const capData = await capRes.json();
        state.brandName = capData.brand_name || "";
        state.storeStatus = capData.store_status || "open";
        state.allowDineIn = capData.allow_dine_in !== false;
        const brandEl = document.getElementById("display-brand-name");
        if (brandEl && state.brandName) {
          brandEl.innerText = state.brandName;
        }

        if (!capData.staff_ordering_enabled) {
          showLoginError(t("featureDisabled"));
        }
      }
    } catch (e) {
      console.warn("[StaffOrder] Capability check error:", e);
    }

    // Check existing session in sessionStorage
    const savedToken = typeof sessionStorage !== "undefined" ? sessionStorage.getItem(`staff_session_token_${state.tenantId}`) : null;
    if (savedToken) {
      state.token = savedToken;
      await showTablesView();
    } else {
      showLoginView();
    }
  }

  // --- 5. I18N & LANGUAGE TOGGLE ---
  function applyI18nLabels() {
    const langBtn = document.getElementById("current-lang-text");
    if (langBtn) {
      langBtn.innerText = state.currentLang === "vi" ? "VI / 中文" : "中文 / VI";
    }

    const mapping = {
      "i18n-staff-badge": "staffBadge",
      "i18n-login-title": "loginTitle",
      "i18n-login-desc": "loginDesc",
      "i18n-label-pin": "labelPin",
      "i18n-btn-login": "btnLogin",
      "i18n-logout": "logout",
      "i18n-tables-title": "tablesTitle",
      "i18n-tables-desc": "tablesDesc",
      "i18n-btn-refresh": "btnRefresh",
      "i18n-filter-all": "filterAll",
      "i18n-filter-empty": "filterEmpty",
      "i18n-filter-occupied": "filterOccupied",
      "i18n-btn-change-table": "btnChangeTable",
      "i18n-btn-back-tables": "btnBackTables",
      "i18n-btn-view-cart": "cartViewBtn",
      "i18n-cart-title": "cartTitle",
      "i18n-label-customer": "labelCustomer",
      "i18n-label-note": "labelNote",
      "i18n-summary-subtotal": "summarySubtotal",
      "i18n-summary-total": "summaryTotal",
      "i18n-btn-continue-ordering": "btnContinueOrdering",
      "i18n-btn-confirm-order": "btnConfirmOrder",
      "i18n-btn-add-item": "btnAddItem",
      "i18n-success-title": "successTitle",
      "i18n-success-order-key": "successOrderKey",
      "i18n-success-table": "successTable",
      "i18n-success-round": "successRound",
      "i18n-success-total": "successTotal",
      "i18n-btn-success-back": "btnSuccessBack",
      "i18n-btn-resolve-conflict": "btnResolveConflict"
    };

    for (const [domId, key] of Object.entries(mapping)) {
      const el = document.getElementById(domId);
      if (el) el.innerText = t(key);
    }

    const searchInp = document.getElementById("inp-table-search");
    if (searchInp) searchInp.placeholder = t("searchPlaceholder");
  }

  function toggleLanguage() {
    state.currentLang = state.currentLang === "vi" ? "zh-TW" : "vi";
    try {
      localStorage.setItem("staff_order_lang", state.currentLang);
    } catch (e) {}
    applyI18nLabels();

    if (state.currentTable) {
      updateOrderBanner();
    }
    renderTablesGrid();
    renderCategories();
    renderMenuItems();
    renderCartDrawer();
  }

  // --- 6. AUTHENTICATION (PIN LOGIN & LOGOUT) ---
  function showLoginView() {
    stopTablePolling();
    document.getElementById("view-login").style.display = "block";
    document.getElementById("view-tables").style.display = "none";
    document.getElementById("view-menu").style.display = "none";
    document.getElementById("btn-logout").style.display = "none";
    document.getElementById("header-table-badge").style.display = "none";
    document.getElementById("sticky-cart-bar").style.display = "none";

    const pinInp = document.getElementById("inp-pin");
    if (pinInp) {
      pinInp.value = "";
      pinInp.focus();
    }
  }

  function showLoginError(msg) {
    const errEl = document.getElementById("login-error-msg");
    if (errEl) {
      errEl.innerText = msg;
      errEl.style.display = "block";
    }
  }

  async function handleStaffLogin(e) {
    if (e) e.preventDefault();
    const pinInp = document.getElementById("inp-pin");
    const pin = pinInp ? pinInp.value.trim() : "";
    if (!pin) return;

    const btn = document.getElementById("btn-submit-login");
    if (btn) btn.disabled = true;

    try {
      const res = await fetch(`${WORKER_BASE}/api/staff/session?tenant_id=${encodeURIComponent(state.tenantId)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin })
      });

      const data = await res.json().catch(() => ({}));
      if (res.ok && data && data.ok && data.token) {
        state.token = data.token;
        if (typeof sessionStorage !== "undefined") {
          sessionStorage.setItem(`staff_session_token_${state.tenantId}`, data.token);
        }
        if (data.brand_name) {
          state.brandName = data.brand_name;
          const bEl = document.getElementById("display-brand-name");
          if (bEl) bEl.innerText = data.brand_name;
        }
        await showTablesView();
      } else {
        showLoginError((data && data.message) || t("pinError"));
      }
    } catch (err) {
      showLoginError("Lỗi kết nối / 連線失敗: " + (err.message || err));
    } finally {
      if (btn) btn.disabled = false;
    }
  }

  async function handleStaffLogout() {
    if (state.token) {
      try {
        await fetch(`${WORKER_BASE}/api/staff/session?tenant_id=${encodeURIComponent(state.tenantId)}`, {
          method: "DELETE",
          headers: { "Authorization": "Bearer " + state.token }
        });
      } catch (e) {}
    }
    state.token = "";
    if (typeof sessionStorage !== "undefined") {
      sessionStorage.removeItem(`staff_session_token_${state.tenantId}`);
    }
    showLoginView();
  }

  // --- 7. TABLE SELECTION VIEW ---
  async function showTablesView() {
    document.getElementById("view-login").style.display = "none";
    document.getElementById("view-tables").style.display = "block";
    document.getElementById("view-menu").style.display = "none";
    document.getElementById("btn-logout").style.display = "inline-flex";
    document.getElementById("header-table-badge").style.display = "none";
    document.getElementById("sticky-cart-bar").style.display = "none";

    await loadTablesData();
    startTablePolling();
  }

  function startTablePolling() {
    stopTablePolling();
    state.pollTimer = setInterval(loadTablesData, 10000);
  }

  function stopTablePolling() {
    if (state.pollTimer) {
      clearInterval(state.pollTimer);
      state.pollTimer = null;
    }
  }

  async function loadTablesData() {
    if (!state.token) return;

    try {
      const res = await fetch(`${WORKER_BASE}/api/staff/tables?tenant_id=${encodeURIComponent(state.tenantId)}&_t=${Date.now()}`, {
        headers: { "Authorization": "Bearer " + state.token }
      });

      if (res.status === 401) {
        showLoginView();
        showLoginError(t("pinError"));
        return;
      }

      if (res.ok) {
        const data = await res.json();
        state.tables = data.tables || [];
        renderTablesGrid();
      }
    } catch (e) {
      console.warn("[StaffOrder] Error loading tables:", e);
    }
  }

  function setTableFilter(filter, el) {
    state.tableFilter = filter;
    document.querySelectorAll(".filter-chip").forEach(chip => chip.classList.remove("active"));
    if (el) el.classList.add("active");
    renderTablesGrid();
  }

  function handleTableSearch(query) {
    state.tableSearchQuery = (query || "").trim().toLowerCase();
    renderTablesGrid();
  }

  function renderTablesGrid() {
    const grid = document.getElementById("tables-grid");
    if (!grid) return;

    let filtered = state.tables.filter(t => {
      if (state.tableSearchQuery) {
        const lbl = (t.label || "").toLowerCase();
        if (!lbl.includes(state.tableSearchQuery)) return false;
      }
      const isOccupied = !!t.active_order_key;
      if (state.tableFilter === "empty" && isOccupied) return false;
      if (state.tableFilter === "occupied" && !isOccupied) return false;
      return true;
    });

    if (filtered.length === 0) {
      grid.innerHTML = `<div style="grid-column: 1 / -1; text-align: center; padding: 48px 16px; color: #94a3b8; font-size: 15px;">${t("emptyTablesList")}</div>`;
      return;
    }

    grid.innerHTML = filtered.map(tbl => {
      const isOccupied = !!tbl.active_order_key;
      const statusPill = isOccupied
        ? `<span class="table-card-status-pill">${t("occupiedStatus")}</span>`
        : `<span class="table-card-status-pill">${t("emptyStatus")}</span>`;

      const actionText = isOccupied ? t("btnAppendRound") : t("btnOpenOrder");

      let detailHtml = "";
      if (isOccupied) {
        const roundText = state.currentLang === "vi" ? `Lượt ${tbl.active_round_count || 1}` : `第 ${tbl.active_round_count || 1} 輪`;
        detailHtml = `
          <div class="table-card-occupied-info">
            <div class="order-id">#${escapeHtml(tbl.active_display_key || tbl.active_order_id || '')}</div>
            <div class="order-summary">$${tbl.active_total_amount || 0} • ${roundText}</div>
          </div>
        `;
      } else {
        detailHtml = `<div class="table-card-empty-info" style="color: #94a3b8; font-size: 13px;">${state.currentLang === "vi" ? "Sẵn sàng đón khách" : "隨時可開桌"}</div>`;
      }

      return `
        <div class="table-card ${isOccupied ? 'occupied' : 'empty'}" onclick="handleSelectTable('${tbl.id}')">
          <div class="table-card-top">
            <div class="table-card-label">${escapeHtml(tbl.label)}</div>
            ${statusPill}
          </div>
          <div class="table-card-body">
            ${detailHtml}
          </div>
          <div class="table-card-bottom">
            <span></span>
            <button type="button" class="btn-card-action">${actionText}</button>
          </div>
        </div>
      `;
    }).join("");
  }

  // --- 8. SELECT TABLE & ENTER MENU ORDERING ---
  async function handleSelectTable(tableId) {
    const table = state.tables.find(t => t.id === tableId);
    if (!table) return;

    state.currentTable = table;

    // Load draft cart for this table if exists
    loadDraftCart(table.id);

    stopTablePolling();
    await showMenuView();
  }

  function goToTableSelection() {
    if (state.currentTable) {
      saveDraftCart(state.currentTable.id);
    }
    state.currentTable = null;
    showTablesView();
  }

  async function showMenuView() {
    document.getElementById("view-login").style.display = "none";
    document.getElementById("view-tables").style.display = "none";
    document.getElementById("view-menu").style.display = "block";
    document.getElementById("btn-logout").style.display = "inline-flex";

    // Header table badge
    const headBadge = document.getElementById("header-table-badge");
    const headLabel = document.getElementById("header-table-label");
    if (headBadge && headLabel && state.currentTable) {
      headLabel.innerText = `${state.currentLang === "vi" ? "Bàn" : "桌號"}: ${state.currentTable.label}`;
      headBadge.style.display = "inline-flex";
    }

    updateOrderBanner();
    updateStickyCartBar();

    // Load catalog if not yet loaded
    if (state.catalog.length === 0) {
      await loadBootstrapMenu();
    } else {
      renderCategories();
      renderMenuItems();
    }
  }

  function updateOrderBanner() {
    if (!state.currentTable) return;
    const isAppend = !!state.currentTable.active_order_key;
    const nameEl = document.getElementById("banner-table-name");
    const pillEl = document.getElementById("banner-mode-pill");
    const subEl = document.getElementById("banner-subtext");

    if (nameEl) nameEl.innerText = `${state.currentLang === "vi" ? "Bàn" : "桌號"} ${state.currentTable.label}`;

    if (pillEl) {
      pillEl.className = `order-mode-pill ${isAppend ? 'append' : 'new'}`;
      pillEl.innerText = isAppend ? t("modeAppend") : t("modeNew");
    }

    if (subEl) {
      if (isAppend) {
        subEl.innerText = t("bannerAppendSub", {
          displayKey: state.currentTable.active_display_key || state.currentTable.active_order_id || "",
          total: `$${state.currentTable.active_total_amount || 0}`,
          round: state.currentTable.active_round_count || 1
        });
      } else {
        subEl.innerText = t("bannerNewSub");
      }
    }
  }

  // --- 9. CATALOG & BOOTSTRAP LOADING ---
  async function loadBootstrapMenu() {
    try {
      const res = await fetch(`${WORKER_BASE}/api/tenant/bootstrap?tenant_id=${encodeURIComponent(state.tenantId)}&_t=${Date.now()}`);
      if (res.ok) {
        const data = await res.json();
        state.catalog = (data.catalog && (data.catalog.items || data.catalog)) || [];
        state.categories = (data.catalog && data.catalog.categories) || [];
        state.customizations = data.customizations || [];

        renderCategories();
        renderMenuItems();
      }
    } catch (e) {
      console.warn("[StaffOrder] Error loading catalog:", e);
    }
  }

  function renderCategories() {
    const nav = document.getElementById("category-tabs-nav");
    if (!nav) return;

    const allBtn = `
      <button type="button" class="cat-tab-btn ${state.activeCategory === 'all' ? 'active' : ''}" onclick="selectCategory('all', this)">
        ${t("allItems")}
      </button>
    `;

    const catBtns = state.categories.map(cat => `
      <button type="button" class="cat-tab-btn ${state.activeCategory === cat.id ? 'active' : ''}" onclick="selectCategory('${cat.id}', this)">
        ${escapeHtml(cat.name)}
      </button>
    `).join("");

    nav.innerHTML = allBtn + catBtns;
  }

  function selectCategory(catId, el) {
    state.activeCategory = catId;
    document.querySelectorAll(".cat-tab-btn").forEach(btn => btn.classList.remove("active"));
    if (el) el.classList.add("active");
    renderMenuItems();
  }

  function renderMenuItems() {
    const grid = document.getElementById("menu-items-grid");
    if (!grid) return;

    let items = state.catalog;
    if (state.activeCategory !== "all") {
      items = items.filter(it => it.category_id === state.activeCategory || it.categoryId === state.activeCategory);
    }

    if (items.length === 0) {
      grid.innerHTML = `<div style="grid-column: 1 / -1; text-align: center; padding: 48px 16px; color: #94a3b8; font-size: 15px;">${t("noItemsInCat")}</div>`;
      return;
    }

    grid.innerHTML = items.map(it => {
      const isOos = it.out_of_stock_until && new Date(it.out_of_stock_until) > new Date();
      const priceStr = `$${it.price || 0}`;

      return `
        <div class="menu-item-card ${isOos ? 'sold-out' : ''}">
          ${it.image_url ? `<img src="${escapeHtml(it.image_url)}" class="menu-item-image" loading="lazy" alt="${escapeHtml(it.name)}">` : ''}
          <div class="menu-item-content">
            <div class="menu-item-name">${escapeHtml(it.name)}</div>
            ${it.description ? `<div class="menu-item-desc">${escapeHtml(it.description)}</div>` : ''}
            <div class="menu-item-footer">
              <div class="menu-item-price">${priceStr}</div>
              <button type="button" class="btn-add-item" ${isOos ? 'disabled' : ''} onclick="openItemModal('${it.id}')">
                ${isOos ? t("soldOut") : `+ ${t("btnAddItem")}`}
              </button>
            </div>
          </div>
        </div>
      `;
    }).join("");
  }

  // --- 10. ITEM CUSTOMIZATION MODAL ---
  function openItemModal(itemId) {
    const item = state.catalog.find(i => i.id === itemId);
    if (!item) return;

    state.selectedItem = item;
    state.modalQty = 1;
    state.modalSelectedOptions = [];

    document.getElementById("modal-item-name").innerText = item.name;
    document.getElementById("modal-item-base-price").innerText = `$${item.price || 0}`;
    document.getElementById("modal-item-qty").innerText = "1";

    renderModalOptions(item);
    updateModalCalculatedPrice();

    document.getElementById("itemModal").style.display = "flex";
  }

  function closeItemModal() {
    document.getElementById("itemModal").style.display = "none";
    state.selectedItem = null;
  }

  function changeModalQty(delta) {
    state.modalQty = Math.max(1, state.modalQty + delta);
    document.getElementById("modal-item-qty").innerText = state.modalQty;
    updateModalCalculatedPrice();
  }

  function renderModalOptions(item) {
    const container = document.getElementById("modal-item-options-body");
    if (!container) return;

    if (!state.customizations || state.customizations.length === 0) {
      container.innerHTML = `
        <div class="form-group" style="margin-top: 10px;">
          <label style="font-size: 13px; font-weight: 700; color: #475569; margin-bottom: 6px;">${state.currentLang === "vi" ? "Ghi chú món" : "餐點備註"}</label>
          <input type="text" id="modal-item-single-note" placeholder="${state.currentLang === "vi" ? "Ví dụ: ít đường, không đá..." : "例如：微糖、去冰..."}" style="width: 100%; min-height: 44px; padding: 8px 12px; border: 1.5px solid var(--border); border-radius: 8px;">
        </div>
      `;
      return;
    }

    let html = "";
    state.customizations.forEach((grp, gIdx) => {
      const isRadio = grp.type === "radio";
      const grpTitle = escapeHtml(grp.title || grp.name || `Tùy chọn ${gIdx + 1}`);

      html += `
        <div class="option-group">
          <div class="option-group-title">
            <span>${grpTitle}</span>
            <span class="option-group-badge">${isRadio ? (state.currentLang === "vi" ? "Chọn 1" : "單選") : (state.currentLang === "vi" ? "Tùy chọn" : "可複選")}</span>
          </div>
          <div class="option-choices-list">
      `;

      const options = grp.options || [];
      options.forEach((opt, oIdx) => {
        const optName = typeof opt === "string" ? opt : opt.name;
        const optPrice = typeof opt === "object" ? Number(opt.price) || 0 : 0;
        const priceLabel = optPrice > 0 ? ` +$${optPrice}` : "";
        const inputName = `modal-opt-${grp.key || gIdx}`;
        const inputType = isRadio ? "radio" : "checkbox";
        const isChecked = isRadio && oIdx === 0;

        html += `
          <label class="option-chip-label">
            <input type="${inputType}" name="${inputName}" value="${escapeHtml(optName)}" data-price="${optPrice}" ${isChecked ? 'checked' : ''} onchange="updateModalCalculatedPrice()">
            <span>${escapeHtml(optName)}</span>
            ${optPrice > 0 ? `<span style="font-size: 12px; color: var(--primary-hover);">${priceLabel}</span>` : ''}
          </label>
        `;
      });

      html += `
          </div>
        </div>
      `;
    });

    html += `
      <div class="form-group" style="margin-top: 16px;">
        <label style="font-size: 13px; font-weight: 700; color: #475569; margin-bottom: 6px;">${state.currentLang === "vi" ? "Ghi chú riêng món này" : "餐點專屬備註"}</label>
        <input type="text" id="modal-item-single-note" placeholder="${state.currentLang === "vi" ? "Ví dụ: ít cay, chia 2 đĩa..." : "例如：少辣、分開裝..."}" style="width: 100%; min-height: 44px; padding: 8px 12px; border: 1.5px solid var(--border); border-radius: 8px;">
      </div>
    `;

    container.innerHTML = html;
  }

  function getModalSelectedOptions() {
    const selected = [];
    const container = document.getElementById("modal-item-options-body");
    if (!container) return selected;

    container.querySelectorAll("input:checked").forEach(inp => {
      const price = Number(inp.getAttribute("data-price")) || 0;
      selected.push({
        name: inp.value,
        choice: inp.value,
        price: price
      });
    });

    return selected;
  }

  function updateModalCalculatedPrice() {
    if (!state.selectedItem) return;
    let unitPrice = Number(state.selectedItem.price) || 0;
    const opts = getModalSelectedOptions();
    opts.forEach(o => { unitPrice += o.price; });

    const total = unitPrice * state.modalQty;
    const priceEl = document.getElementById("modal-item-calculated-price");
    if (priceEl) priceEl.innerText = `$${total}`;
  }

  function confirmAddItemToCart() {
    if (!state.selectedItem) return;

    const options = getModalSelectedOptions();
    let unitPrice = Number(state.selectedItem.price) || 0;
    options.forEach(o => { unitPrice += o.price; });

    const noteInp = document.getElementById("modal-item-single-note");
    const note = noteInp ? noteInp.value.trim() : "";

    const cartItem = {
      uid: crypto.randomUUID(),
      itemId: state.selectedItem.id,
      name: state.selectedItem.name,
      price: unitPrice,
      quantity: state.modalQty,
      options: options,
      note: note
    };

    state.cart.push(cartItem);
    if (state.currentTable) {
      saveDraftCart(state.currentTable.id);
    }

    closeItemModal();
    updateStickyCartBar();
  }

  // --- 11. CART MANAGEMENT & STICKY BAR ---
  function updateStickyCartBar() {
    const bar = document.getElementById("sticky-cart-bar");
    if (!bar) return;

    const totalCount = state.cart.reduce((sum, item) => sum + item.quantity, 0);
    const totalPrice = state.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    if (totalCount > 0 && state.currentTable) {
      bar.style.display = "block";
      document.getElementById("cart-total-count").innerText = totalCount;
      document.getElementById("cart-total-price").innerText = `$${totalPrice}`;

      const previewText = state.cart.map(i => `${i.name} x${i.quantity}`).join(", ");
      document.getElementById("cart-items-preview").innerText = previewText;
    } else {
      bar.style.display = "none";
    }
  }

  function openCartModal() {
    renderCartDrawer();
    document.getElementById("cartModal").style.display = "flex";
  }

  function closeCartModal() {
    document.getElementById("cartModal").style.display = "none";
  }

  function renderCartDrawer() {
    const contextEl = document.getElementById("cart-order-context-desc");
    if (contextEl && state.currentTable) {
      const isAppend = !!state.currentTable.active_order_key;
      contextEl.innerText = `${state.currentLang === "vi" ? "Bàn" : "桌號"} ${state.currentTable.label} • ${isAppend ? t("modeAppend") : t("modeNew")}`;
    }

    const listEl = document.getElementById("cart-items-list");
    if (!listEl) return;

    if (state.cart.length === 0) {
      listEl.innerHTML = `<div style="text-align: center; padding: 32px 0; color: #94a3b8;">${t("cartItemsPreviewEmpty")}</div>`;
      document.getElementById("cart-summary-subtotal").innerText = "$0";
      document.getElementById("cart-summary-total").innerText = "$0";
      return;
    }

    let grandTotal = 0;
    listEl.innerHTML = state.cart.map((item, idx) => {
      const lineTotal = item.price * item.quantity;
      grandTotal += lineTotal;
      const optsText = (item.options || []).map(o => o.name + (o.price > 0 ? `(+$${o.price})` : '')).join(", ");

      return `
        <div class="cart-item-row">
          <div class="cart-item-info">
            <div class="cart-item-name">${escapeHtml(item.name)}</div>
            ${optsText ? `<div class="cart-item-options">${escapeHtml(optsText)}</div>` : ''}
            ${item.note ? `<div class="cart-item-note">↳ ${escapeHtml(item.note)}</div>` : ''}
            <div class="cart-item-price">$${lineTotal}</div>
          </div>
          <div class="cart-item-actions">
            <div class="qty-stepper">
              <button type="button" class="btn-qty" onclick="changeCartItemQty(${idx}, -1)">-</button>
              <span class="qty-val">${item.quantity}</span>
              <button type="button" class="btn-qty" onclick="changeCartItemQty(${idx}, 1)">+</button>
            </div>
            <button type="button" class="btn-remove-cart-item" onclick="removeCartItem(${idx})" title="Xóa món">✕</button>
          </div>
        </div>
      `;
    }).join("");

    document.getElementById("cart-summary-subtotal").innerText = `$${grandTotal}`;
    document.getElementById("cart-summary-total").innerText = `$${grandTotal}`;
  }

  function changeCartItemQty(index, delta) {
    if (!state.cart[index]) return;
    state.cart[index].quantity += delta;
    if (state.cart[index].quantity <= 0) {
      state.cart.splice(index, 1);
    }
    if (state.currentTable) {
      saveDraftCart(state.currentTable.id);
    }
    renderCartDrawer();
    updateStickyCartBar();
  }

  function removeCartItem(index) {
    if (!state.cart[index]) return;
    state.cart.splice(index, 1);
    if (state.currentTable) {
      saveDraftCart(state.currentTable.id);
    }
    renderCartDrawer();
    updateStickyCartBar();
  }

  function saveDraftCart(tableId) {
    if (!tableId || typeof sessionStorage === "undefined") return;
    sessionStorage.setItem(`staff_cart_${state.tenantId}_${tableId}`, JSON.stringify(state.cart));
  }

  function loadDraftCart(tableId) {
    if (!tableId || typeof sessionStorage === "undefined") {
      state.cart = [];
      return;
    }
    try {
      const raw = sessionStorage.getItem(`staff_cart_${state.tenantId}_${tableId}`);
      state.cart = raw ? JSON.parse(raw) : [];
    } catch (e) {
      state.cart = [];
    }
  }

  function clearDraftCart(tableId) {
    if (!tableId || typeof sessionStorage === "undefined") return;
    sessionStorage.removeItem(`staff_cart_${state.tenantId}_${tableId}`);
    state.cart = [];
  }

  // --- 12. SUBMIT STAFF ORDER (NEW OR APPEND ROUND) ---
  async function submitStaffOrder() {
    if (!state.currentTable || state.cart.length === 0) return;

    const btnSubmit = document.getElementById("btn-submit-order");
    if (btnSubmit) {
      btnSubmit.disabled = true;
      btnSubmit.innerText = t("btnSending");
    }

    const customerInp = document.getElementById("cart-customer-name");
    const noteInp = document.getElementById("cart-order-note");
    const customer = customerInp ? customerInp.value.trim() : "";
    const note = noteInp ? noteInp.value.trim() : "";

    const requestId = crypto.randomUUID();
    const isAppend = !!state.currentTable.active_order_key;

    const payload = {
      requestId,
      tableId: state.currentTable.id,
      customer,
      note,
      items: state.cart.map(c => ({
        itemId: c.itemId,
        name: c.name,
        quantity: c.quantity,
        price: c.price,
        options: c.options || [],
        note: c.note || '',
        bundleSelections: c.bundleSelections || null
      }))
    };

    try {
      let endpoint = `${WORKER_BASE}/api/staff/orders?tenant_id=${encodeURIComponent(state.tenantId)}`;
      if (isAppend) {
        endpoint = `${WORKER_BASE}/api/staff/orders/${encodeURIComponent(state.currentTable.active_order_key)}/rounds?tenant_id=${encodeURIComponent(state.tenantId)}`;
        payload.expectedRevision = state.currentTable.active_revision || 0;
      }

      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer " + state.token
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json().catch(() => ({}));

      if (res.status === 409) {
        // Revision mismatch or duplicate table opening
        closeCartModal();
        showConflictModal((data && data.message) || t("conflictDesc"));
        return;
      }

      if (res.ok && data && data.ok) {
        // SUCCESS!
        clearDraftCart(state.currentTable.id);
        closeCartModal();
        updateStickyCartBar();

        showSuccessModal({
          displayKey: data.displayKey || data.orderId || "---",
          tableName: state.currentTable.label,
          roundCount: data.roundCount || 1,
          total: data.total || data.grandTotal || 0
        });
      } else {
        alert((data && data.message) || "Gửi đơn thất bại / 送出失敗");
      }
    } catch (err) {
      alert("Lỗi kết nối / 連線錯誤: " + (err.message || err));
    } finally {
      if (btnSubmit) {
        btnSubmit.disabled = false;
        btnSubmit.innerText = t("btnConfirmOrder");
      }
    }
  }

  // --- 13. SUCCESS & CONFLICT MODALS ---
  function showSuccessModal({ displayKey, tableName, roundCount, total }) {
    document.getElementById("success-display-key").innerText = `#${displayKey}`;
    document.getElementById("success-table-name").innerText = tableName;
    document.getElementById("success-round-count").innerText = state.currentLang === "vi" ? `Lượt ${roundCount}` : `第 ${roundCount} 輪`;
    document.getElementById("success-total-amount").innerText = `$${total}`;

    document.getElementById("successModal").style.display = "flex";
  }

  function handleSuccessBackToTables() {
    document.getElementById("successModal").style.display = "none";
    goToTableSelection();
  }

  function showConflictModal(msg) {
    const desc = document.getElementById("conflict-desc-text");
    if (desc && msg) desc.innerText = msg;
    document.getElementById("conflictModal").style.display = "flex";
  }

  async function handleResolveConflict() {
    document.getElementById("conflictModal").style.display = "none";
    // Refresh table status while preserving cart!
    if (state.currentTable) {
      await loadTablesData();
      const updatedTable = state.tables.find(t => t.id === state.currentTable.id);
      if (updatedTable) {
        state.currentTable = updatedTable;
        updateOrderBanner();
      }
      openCartModal();
    }
  }

  // --- 14. EXPOSE GLOBAL FUNCTIONS ---
  window.toggleLanguage = toggleLanguage;
  window.handleStaffLogin = handleStaffLogin;
  window.handleStaffLogout = handleStaffLogout;
  window.loadTablesData = loadTablesData;
  window.setTableFilter = setTableFilter;
  window.handleTableSearch = handleTableSearch;
  window.handleSelectTable = handleSelectTable;
  window.goToTableSelection = goToTableSelection;
  window.selectCategory = selectCategory;
  window.openItemModal = openItemModal;
  window.closeItemModal = closeItemModal;
  window.changeModalQty = changeModalQty;
  window.updateModalCalculatedPrice = updateModalCalculatedPrice;
  window.confirmAddItemToCart = confirmAddItemToCart;
  window.openCartModal = openCartModal;
  window.closeCartModal = closeCartModal;
  window.changeCartItemQty = changeCartItemQty;
  window.removeCartItem = removeCartItem;
  window.submitStaffOrder = submitStaffOrder;
  window.handleSuccessBackToTables = handleSuccessBackToTables;
  window.handleResolveConflict = handleResolveConflict;

  // Run on DOM ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initApp);
  } else {
    initApp();
  }
})();
