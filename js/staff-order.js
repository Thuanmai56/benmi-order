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
      soldOutToday: "Hết hàng",
      allItems: "Tất cả món",
      emptyTablesList: "Không tìm thấy bàn nào.",
      noItemsInCat: "Không có món trong danh mục này.",
      btnQuickAdd: "Thêm",
      btnCustomize: "Tùy biến",
      optSingleChoice: "Chọn 1",
      optMultiChoice: "Tùy chọn",
      optItemNote: "Ghi chú riêng món này",
      optItemNotePlaceholder: "Ví dụ: ít đường, không đá, ít cay...",
      flavorNavTitle: "Chọn vị",
      flavorSectionTitle: "Chọn vị & Tùy chọn chung",
      flavorCartHeader: "Vị chung cho bàn:",
      btnBackPos: "Quay lại POS",
      transferTitle: "Đổi số bàn phục vụ",
      transferDesc: "Chuyển đơn từ {tableName} sang bàn trống khác:",
      btnCancelTransfer: "Hủy",
      destTableOccupied: "Bàn đích đang có khách phục vụ, không thể chuyển sang bàn này!",
      transferSuccess: "Đã chuyển đơn sang {tableName} thành công!",
      changeDraftTitle: "Đổi bàn đang chọn món",
      changeDraftDesc: "Chọn bàn mới để chuyển giỏ hàng sang:",
      btnCancelChangeDraft: "Hủy",
      takeawayTableLabel: "Mang về",
      takeawayBannerSub: "Đơn mang về • Chọn món để bắt đầu",
      transferBtnCard: "Đổi bàn"
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
      soldOutToday: "今日已售完",
      allItems: "全部餐點",
      emptyTablesList: "找不到符合條件的桌號。",
      noItemsInCat: "此分類目前尚無餐點。",
      btnQuickAdd: "點餐",
      btnCustomize: "客製化",
      optSingleChoice: "單選",
      optMultiChoice: "可複選",
      optItemNote: "餐點專屬備註",
      optItemNotePlaceholder: "例如：微糖、去冰、少辣...",
      flavorNavTitle: "口味選擇",
      flavorSectionTitle: "口味與客製化選擇",
      flavorCartHeader: "整單口味：",
      btnBackPos: "返回 POS",
      transferTitle: "更換服務桌號",
      transferDesc: "將 {tableName} 的訂單轉移至其他空桌：",
      btnCancelTransfer: "取消",
      destTableOccupied: "目標桌號使用中，無法轉移至此桌！",
      transferSuccess: "已成功轉移訂單至 {tableName}！",
      changeDraftTitle: "變更點餐桌號",
      changeDraftDesc: "請選擇要轉入目前購物車內容的桌號：",
      btnCancelChangeDraft: "取消",
      takeawayTableLabel: "外帶",
      takeawayBannerSub: "外帶訂單 • 請選取餐點",
      transferBtnCard: "轉桌"
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
    catalog: [],                  // Flattened list of all items across categories with cat metadata
    categories: [],               // List of category objects from bootstrap: { id, slug, name, shortName, items: [...], appliedModifiers, ... }
    modifiers: [],                // Per-category modifier groups from bootstrap
    customizations: [],           // Global customization groups (chọn vị chung) from bootstrap
    customizationSortOrder: 0,    // Position of global customizations panel among catalog sections
    selectedGlobalCustomizations: {}, // Table's selected flavor options: { [groupKey]: string[] }
    translations: {},             // Translations mapping from bootstrap
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
      "i18n-back-pos": "btnBackPos",
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
      "i18n-label-note": "labelNote",
      "i18n-summary-subtotal": "summarySubtotal",
      "i18n-summary-total": "summaryTotal",
      "i18n-btn-continue-ordering": "btnContinueOrdering",
      "i18n-btn-add-item": "btnAddItem",
      "i18n-success-title": "successTitle",
      "i18n-success-order-key": "successOrderKey",
      "i18n-success-table": "successTable",
      "i18n-success-round": "successRound",
      "i18n-success-total": "successTotal",
      "i18n-btn-success-back": "btnSuccessBack",
      "i18n-btn-resolve-conflict": "btnResolveConflict",
      "i18n-transfer-title": "transferTitle",
      "i18n-btn-cancel-transfer": "btnCancelTransfer",
      "i18n-change-draft-title": "changeDraftTitle",
      "i18n-btn-cancel-change-draft": "btnCancelChangeDraft"
    };

    for (const [domId, key] of Object.entries(mapping)) {
      const el = document.getElementById(domId);
      if (el) el.innerText = t(key);
    }

    // Safely update or restore confirm order button text & span
    const spanConfirm = document.getElementById("i18n-btn-confirm-order");
    if (spanConfirm) {
      spanConfirm.innerText = t("btnConfirmOrder");
    } else {
      const btnSubmit = document.getElementById("btn-submit-order");
      if (btnSubmit) {
        btnSubmit.innerHTML = `<span id="i18n-btn-confirm-order">${t("btnConfirmOrder")}</span>`;
      }
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

  function goToPosScreen() {
    const params = new URLSearchParams();
    if (state.tenantId) params.set("tenant_id", state.tenantId);
    const searchParams = new URLSearchParams(window.location.search);
    const env = searchParams.get("env");
    if (env) params.set("env", env);
    const qs = params.toString();
    window.location.href = `orders.html${qs ? '?' + qs : ''}`;
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

        // Auto-skip table selection for Takeaway stores (no tables configured or allowDineIn === false)
        if (state.tables.length === 0 || state.allowDineIn === false) {
          stopTablePolling();
          state.currentTable = {
            id: "takeaway",
            label: t("takeawayTableLabel"),
            is_takeout: true
          };
          loadDraftCart("takeaway");
          await showMenuView();
          return;
        }

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

      const transferBtn = isOccupied
        ? `<button type="button" class="btn-card-transfer" onclick="event.stopPropagation(); openTransferTableModal('${tbl.id}')">${t("transferBtnCard")}</button>`
        : '';

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
            <div class="table-card-actions">
              ${transferBtn}
              <button type="button" class="btn-card-action">${actionText}</button>
            </div>
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

    // Load draft cart and draft global flavor for this table
    loadDraftCart(table.id);

    stopTablePolling();
    await showMenuView();
  }

  function goToTableSelection() {
    if (state.currentTable && (state.currentTable.is_takeout || state.currentTable.id === 'takeaway')) {
      goToPosScreen();
      return;
    }
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
    const btnChangeTbl = document.getElementById("i18n-btn-change-table");
    const isTakeout = state.currentTable && (state.currentTable.is_takeout || state.currentTable.id === 'takeaway');

    if (headBadge && headLabel && state.currentTable) {
      if (isTakeout) {
        headLabel.innerText = t("takeawayTableLabel");
        if (btnChangeTbl) btnChangeTbl.style.display = "none";
      } else {
        headLabel.innerText = `${state.currentLang === "vi" ? "Bàn" : "桌號"}: ${state.currentTable.label}`;
        if (btnChangeTbl) btnChangeTbl.style.display = "inline-block";
      }
      headBadge.style.display = "inline-flex";
    }

    // Hide or show back button in View 3
    const backBtn = document.querySelector(".btn-back-tables");
    if (backBtn) {
      backBtn.style.display = isTakeout ? "none" : "inline-flex";
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
    const isTakeout = state.currentTable.is_takeout || state.currentTable.id === 'takeaway';
    const isAppend = !isTakeout && !!state.currentTable.active_order_key;
    const nameEl = document.getElementById("banner-table-name");
    const pillEl = document.getElementById("banner-mode-pill");
    const subEl = document.getElementById("banner-subtext");

    if (nameEl) {
      nameEl.innerText = isTakeout ? t("takeawayTableLabel") : `${state.currentLang === "vi" ? "Bàn" : "桌號"} ${state.currentTable.label}`;
    }

    if (pillEl) {
      pillEl.className = `order-mode-pill ${isTakeout ? 'new' : (isAppend ? 'append' : 'new')}`;
      pillEl.innerText = isTakeout ? t("takeawayTableLabel") : (isAppend ? t("modeAppend") : t("modeNew"));
    }

    if (subEl) {
      if (isTakeout) {
        subEl.innerText = t("takeawayBannerSub");
      } else if (isAppend) {
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

  // --- 9. CATALOG & BOOTSTRAP LOADING (GROUPED BY CATEGORIES LIKE INDEX.HTML) ---
  async function loadBootstrapMenu() {
    try {
      const res = await fetch(`${WORKER_BASE}/api/tenant/bootstrap?tenant_id=${encodeURIComponent(state.tenantId)}&_t=${Date.now()}`);
      if (res.ok) {
        const data = await res.json();
        
        const rawCatalog = Array.isArray(data.catalog) ? data.catalog : (data.catalog?.categories || []);
        state.categories = rawCatalog.map(cat => ({
          id: cat.id || cat.slug,
          slug: cat.slug || cat.id,
          name: cat.name || "",
          shortName: cat.shortName || "",
          sortOrder: cat.sortOrder || 0,
          allowCustomization: cat.allowCustomization !== false,
          appliedModifiers: cat.appliedModifiers || ['*'],
          pricingRules: cat.pricingRules || null,
          items: Array.isArray(cat.items) ? cat.items : []
        }));

        // Flatten all items across categories with category metadata
        const allItems = [];
        state.categories.forEach(cat => {
          (cat.items || []).forEach(item => {
            allItems.push({
              ...item,
              categoryId: cat.id,
              categorySlug: cat.slug,
              categoryName: cat.name
            });
          });
        });
        state.catalog = allItems;
        state.modifiers = data.modifiers || [];
        state.customizations = data.customizations || [];
        state.customizationSortOrder = data.customizationSortOrder ?? 0;
        state.translations = data.translations || {};

        // Initialize default global flavor selections if not set from draft
        if (Object.keys(state.selectedGlobalCustomizations).length === 0) {
          if (state.currentTable && state.currentTable.active_customizations && state.currentTable.active_customizations.length > 0) {
            state.selectedGlobalCustomizations = hydrateGlobalCustomizationsFromActive(state.currentTable.active_customizations);
          } else {
            state.selectedGlobalCustomizations = initDefaultGlobalCustomizations();
          }
        }

        renderCategories();
        renderMenuItems();
        setupScrollSpy();
      }
    } catch (e) {
      console.warn("[StaffOrder] Error loading catalog:", e);
    }
  }

  function initDefaultGlobalCustomizations() {
    const defaults = {};
    (state.customizations || []).forEach(group => {
      if (group.type === 'radio') {
        const firstOpt = (group.options || []).find(o => {
          const isOos = Boolean(o && typeof o === 'object' && (o.is_out_of_stock || o.isOutOfStock));
          return !isOos;
        });
        const optName = firstOpt ? (typeof firstOpt === 'string' ? firstOpt : firstOpt.name) : "";
        defaults[group.key] = optName ? [optName] : [];
      } else {
        defaults[group.key] = [];
      }
    });
    return defaults;
  }

  function hydrateGlobalCustomizationsFromActive(activeCustomizations) {
    if (!Array.isArray(activeCustomizations) || activeCustomizations.length === 0) {
      return initDefaultGlobalCustomizations();
    }
    const result = {};
    (state.customizations || []).forEach(group => {
      result[group.key] = [];
      const matches = activeCustomizations.filter(c => c.key === group.key || c.label === group.title);
      if (matches.length > 0) {
        matches.forEach(m => {
          const rawVal = m.value || "";
          const foundOpt = (group.options || []).find(opt => {
            const optName = typeof opt === 'string' ? opt : opt.name;
            return rawVal === optName || rawVal.startsWith(optName);
          });
          if (foundOpt) {
            const optName = typeof foundOpt === 'string' ? foundOpt : foundOpt.name;
            if (!result[group.key].includes(optName)) {
              result[group.key].push(optName);
            }
          }
        });
      }
      // If radio group and nothing matched, fallback to default first non-oos option
      if (group.type === 'radio' && result[group.key].length === 0) {
        const firstOpt = (group.options || []).find(o => !o?.is_out_of_stock && !o?.isOutOfStock);
        if (firstOpt) {
          result[group.key] = [typeof firstOpt === 'string' ? firstOpt : firstOpt.name];
        }
      }
    });
    return result;
  }

  function getCatalogSections() {
    const sections = state.categories.map(cat => ({
      type: 'catalog',
      sortOrder: cat.sortOrder || 0,
      category: cat
    }));

    if (state.customizations && state.customizations.length > 0) {
      sections.push({
        type: 'customizations',
        sortOrder: state.customizationSortOrder ?? 0
      });
    }
    sections.sort((a, b) => a.sortOrder - b.sortOrder);
    return sections;
  }

  function renderCategories() {
    const nav = document.getElementById("category-tabs-nav");
    if (!nav) return;

    const sections = getCatalogSections();
    if (sections.length === 0) {
      nav.innerHTML = "";
      return;
    }

    nav.innerHTML = sections.map((sec, idx) => {
      if (sec.type === 'customizations') {
        const isActive = (state.activeCategory === 'flavor' || (state.activeCategory === 'all' && idx === 0));
        return `
          <button type="button" class="cat-tab-btn ${isActive ? 'active' : ''}" data-cat-slug="flavor" onclick="scrollToCategory('flavor', this)">
            ${escapeHtml(t("flavorNavTitle"))}
          </button>
        `;
      }
      const cat = sec.category;
      const navTitle = (cat.shortName && cat.name && cat.name.includes(cat.shortName)) ? cat.shortName : cat.name;
      const isActive = (state.activeCategory === cat.slug || (state.activeCategory === 'all' && idx === 0));
      return `
        <button type="button" class="cat-tab-btn ${isActive ? 'active' : ''}" data-cat-slug="${escapeHtml(cat.slug)}" onclick="scrollToCategory('${escapeHtml(cat.slug)}', this)">
          ${escapeHtml(navTitle)}
        </button>
      `;
    }).join("");
  }

  function scrollToCategory(slug, el) {
    state.activeCategory = slug;
    document.querySelectorAll("#category-tabs-nav .cat-tab-btn").forEach(btn => btn.classList.remove("active"));
    if (el) el.classList.add("active");

    const targetSec = document.getElementById(`sec-${slug}`);
    if (targetSec) {
      targetSec.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  let isScrollSpyActive = false;
  function setupScrollSpy() {
    if (isScrollSpyActive) return;
    isScrollSpyActive = true;

    let scrollTimeout = null;
    window.addEventListener("scroll", () => {
      if (scrollTimeout) return;
      scrollTimeout = setTimeout(() => {
        scrollTimeout = null;
        updateActiveNavOnScroll();
      }, 80);
    }, { passive: true });
  }

  function updateActiveNavOnScroll() {
    const menuView = document.getElementById("view-menu");
    if (!menuView || menuView.style.display === "none") return;

    const sections = document.querySelectorAll(".section-container");
    if (sections.length === 0) return;

    let currentSlug = "";
    const offset = 140;

    sections.forEach(sec => {
      const rect = sec.getBoundingClientRect();
      if (rect.top <= offset && rect.bottom > offset) {
        currentSlug = sec.id.replace(/^sec-/, '');
      }
    });

    if (!currentSlug && sections.length > 0) {
      const firstRect = sections[0].getBoundingClientRect();
      if (firstRect.top > offset) {
        currentSlug = sections[0].id.replace(/^sec-/, '');
      }
    }

    if (currentSlug && currentSlug !== state.activeCategory) {
      state.activeCategory = currentSlug;
      const btns = document.querySelectorAll("#category-tabs-nav .cat-tab-btn");
      btns.forEach(btn => {
        const match = btn.getAttribute("data-cat-slug") === currentSlug;
        btn.classList.toggle("active", match);
        if (match) {
          btn.scrollIntoView({ behavior: "smooth", inline: "nearest", block: "nearest" });
        }
      });
    }
  }

  function getItemTotalCartQty(itemId) {
    return state.cart
      .filter(c => c.itemId === itemId)
      .reduce((sum, c) => sum + c.quantity, 0);
  }

  function getCategoryModifiers(cat) {
    if (!cat || cat.allowCustomization === false) return [];
    const applied = cat.appliedModifiers || ['*'];
    if (applied.length === 0) return [];
    const allMods = state.modifiers || [];
    if (applied.includes('*')) return allMods;
    return allMods.filter(m => applied.includes(m.slug) || applied.includes(m.id));
  }

  // Dishes only have per-item customization if their category has applied modifiers or combo bundle rule!
  // Global customizations (chọn vị chung) are NOT per-item!
  function hasCustomizations(cat, item) {
    if (item && item.bundleRule) return true;
    const mods = getCategoryModifiers(cat);
    return mods.length > 0;
  }

  function getItemActionControlInner(itemId, qty) {
    if (qty <= 0) {
      return `<button type="button" class="btn-quick-add" onclick="handleItemAddClick('${itemId}', event)">+ ${t("btnQuickAdd")}</button>`;
    }
    return `
      <div class="qty-control">
        <button type="button" class="btn-qty" onclick="handleQuickQty('${itemId}', -1, event)">-</button>
        <span class="qty-text" id="card-qty-${itemId}">${qty}</span>
        <button type="button" class="btn-qty" onclick="handleQuickQty('${itemId}', 1, event)">+</button>
      </div>
    `;
  }

  function updateCardActionUI(itemId) {
    const wrap = document.getElementById(`card-action-${itemId}`);
    if (!wrap) return;
    const qty = getItemTotalCartQty(itemId);
    wrap.innerHTML = getItemActionControlInner(itemId, qty);
  }

  function refreshAllCardActionUIs() {
    state.catalog.forEach(item => {
      updateCardActionUI(item.id);
    });
  }

  function handleItemAddClick(itemId, e) {
    if (e) e.stopPropagation();
    const item = state.catalog.find(i => i.id === itemId);
    if (!item) return;

    state.cart.push({
      uid: crypto.randomUUID(),
      itemId: item.id,
      name: item.name,
      price: Number(item.price) || 0,
      quantity: 1,
      options: [],
      note: ""
    });

    if (state.currentTable) {
      saveDraftCart(state.currentTable.id);
    }

    updateCardActionUI(itemId);
    updateStickyCartBar();
  }

  function handleQuickQty(itemId, delta, e) {
    if (e) e.stopPropagation();
    if (delta > 0) {
      const existing = [...state.cart].reverse().find(c => c.itemId === itemId);
      if (existing) {
        existing.quantity += 1;
      } else {
        const item = state.catalog.find(i => i.id === itemId);
        if (!item) return;
        state.cart.push({
          uid: crypto.randomUUID(),
          itemId: item.id,
          name: item.name,
          price: Number(item.price) || 0,
          quantity: 1,
          options: [],
          note: ""
        });
      }
    } else if (delta < 0) {
      const idx = state.cart.map(c => c.itemId).lastIndexOf(itemId);
      if (idx >= 0) {
        state.cart[idx].quantity -= 1;
        if (state.cart[idx].quantity <= 0) {
          state.cart.splice(idx, 1);
        }
      }
    }

    if (state.currentTable) {
      saveDraftCart(state.currentTable.id);
    }

    updateCardActionUI(itemId);
    updateStickyCartBar();
  }

  function createItemCardHtml(cat, item) {
    const isOos = Boolean(item.isOutOfStock || (item.out_of_stock_until && new Date(item.out_of_stock_until) > new Date()));
    const priceStr = `$${item.price || 0}`;

    const badgeText = item.badge || item.badgeText || (item.isRecommended ? (state.currentLang === 'vi' ? 'Đặc trưng' : '推薦') : '');
    const badgeHtml = badgeText ? `<span class="badge">${escapeHtml(badgeText)}</span>` : '';

    const canCustomize = hasCustomizations(cat, item);
    const cardClickAction = canCustomize ? `openItemModal('${item.id}')` : `handleItemAddClick('${item.id}', event)`;

    let imgHtml = '';
    if (item.imageUrl) {
      const fullImg = item.imageUrl.startsWith('http') ? item.imageUrl : `${WORKER_BASE}${item.imageUrl}`;
      imgHtml = `<img src="${escapeHtml(fullImg)}" class="item-img" loading="lazy" alt="${escapeHtml(item.name)}" onclick="${cardClickAction}" onerror="this.style.display='none'">`;
    }

    const trans = (state.translations && state.translations[item.name]) || item.description || '';
    const transHtml = trans ? `<div class="card-trans">${escapeHtml(trans)}</div>` : '';

    const currentQty = getItemTotalCartQty(item.id);

    let actionControlsHtml = "";
    if (isOos) {
      actionControlsHtml = `<div class="sold-out-tag">${t("soldOutToday")}</div>`;
    } else {
      actionControlsHtml = `
        <div class="card-action-wrap" id="card-action-${item.id}">
          ${getItemActionControlInner(item.id, currentQty)}
        </div>
      `;
    }

    const customizeBtnHtml = (!isOos && canCustomize) ? `
      <button type="button" class="btn-customize-item" onclick="openItemModal('${item.id}')">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="4" y1="21" x2="4" y2="14"></line>
          <line x1="4" y1="10" x2="4" y2="3"></line>
          <line x1="12" y1="21" x2="12" y2="12"></line>
          <line x1="12" y1="8" x2="12" y2="3"></line>
          <line x1="20" y1="21" x2="20" y2="16"></line>
          <line x1="20" y1="12" x2="20" y2="3"></line>
          <line x1="1" y1="14" x2="7" y2="14"></line>
          <line x1="9" y1="8" x2="15" y2="8"></line>
          <line x1="17" y1="16" x2="23" y2="16"></line>
        </svg>
        <span>${t("btnCustomize")}</span>
      </button>
    ` : '';

    return `
      <div class="card ${isOos ? 'sold-out' : ''}" id="card-item-${item.id}">
        <div class="card-main">
          ${imgHtml}
          <div class="card-info">
            <div onclick="${cardClickAction}" style="cursor: pointer;">
              <div class="card-title">
                <span>${escapeHtml(item.name)}</span>
                ${badgeHtml}
              </div>
              ${transHtml}
            </div>
            <div class="card-footer">
              <div class="card-price">${priceStr}</div>
              ${actionControlsHtml}
            </div>
          </div>
        </div>
        ${customizeBtnHtml}
      </div>
    `;
  }

  // Render Global Customizations Section (#sec-flavor like index.html)
  function renderFlavorSectionHtml() {
    if (!state.customizations || state.customizations.length === 0) return "";

    let groupsHtml = "";
    state.customizations.forEach((group, gIdx) => {
      const isRadio = group.type === "radio";
      const selectedVals = state.selectedGlobalCustomizations[group.key] || [];
      const topMargin = gIdx > 0 ? 'margin-top: 14px; padding-top: 14px; border-top: 1px dashed #e2e8f0;' : '';

      const optionsHtml = (group.options || []).map((opt) => {
        const optName = typeof opt === "string" ? opt : opt.name;
        const optPrice = typeof opt === "object" ? Number(opt.price) || 0 : 0;
        const priceLabel = optPrice > 0 ? ` <span class="flavor-price">(+$${optPrice})</span>` : "";
        const isChecked = selectedVals.includes(optName);

        return `
          <label class="flavor-chip-label ${isChecked ? 'checked' : ''}">
            <input type="${isRadio ? 'radio' : 'checkbox'}" 
                   name="global-flavor-${escapeHtml(group.key)}" 
                   value="${escapeHtml(optName)}" 
                   data-group-key="${escapeHtml(group.key)}"
                   data-price="${optPrice}"
                   ${isChecked ? 'checked' : ''} 
                   onchange="handleGlobalFlavorChange('${escapeHtml(group.key)}', '${escapeHtml(optName)}', ${isRadio}, this.checked)">
            <span class="flavor-name">${escapeHtml(optName)}</span>${priceLabel}
          </label>
        `;
      }).join("");

      groupsHtml += `
        <div class="custom-group" style="${topMargin}">
          <div class="custom-group-header">
            <label class="custom-label">${escapeHtml(group.title)}</label>
            <span class="custom-group-badge">${isRadio ? t("optSingleChoice") : t("optMultiChoice")}</span>
          </div>
          <div class="custom-options-grid">
            ${optionsHtml}
          </div>
        </div>
      `;
    });

    return `
      <div class="section-container" id="sec-flavor">
        <div class="section-title">
          <span>${t("flavorSectionTitle")}</span>
        </div>
        <div class="custom-panel">
          ${groupsHtml}
        </div>
      </div>
    `;
  }

  function handleGlobalFlavorChange(groupKey, optName, isRadio, isChecked) {
    if (isRadio) {
      state.selectedGlobalCustomizations[groupKey] = [optName];
      document.querySelectorAll(`input[name="global-flavor-${groupKey}"]`).forEach(inp => {
        const label = inp.closest('.flavor-chip-label');
        if (label) label.classList.toggle('checked', inp.value === optName);
      });
    } else {
      let current = state.selectedGlobalCustomizations[groupKey] || [];
      if (isChecked) {
        if (!current.includes(optName)) current.push(optName);
      } else {
        current = current.filter(v => v !== optName);
      }
      state.selectedGlobalCustomizations[groupKey] = current;
      const inp = document.querySelector(`input[name="global-flavor-${groupKey}"][value="${optName}"]`);
      if (inp) {
        const label = inp.closest('.flavor-chip-label');
        if (label) label.classList.toggle('checked', isChecked);
      }
    }

    if (state.currentTable) {
      saveDraftCart(state.currentTable.id);
    }
  }

  function getSelectedGlobalCustomizations() {
    const result = [];
    if (!state.customizations || state.customizations.length === 0) return result;

    state.customizations.forEach(group => {
      const selectedVals = state.selectedGlobalCustomizations[group.key] || [];
      selectedVals.forEach(val => {
        const optObj = (group.options || []).find(o => (typeof o === 'string' ? o : o.name) === val);
        const optPrice = (optObj && typeof optObj === 'object' && Number(optObj.price)) || 0;
        const cleanTitle = (group.title || '').replace(/^✦\s*/, '').replace(/選擇|調整/g, '').trim();
        result.push({
          key: group.key,
          label: cleanTitle || group.title || 'Vị',
          value: val + (optPrice > 0 ? ` (+$${optPrice})` : ''),
          price: optPrice
        });
      });
    });

    return result;
  }

  function formatGlobalCustomizationsSummary() {
    const structured = getSelectedGlobalCustomizations();
    if (structured.length === 0) return "";
    return structured.map(s => `${s.label}: ${s.value}`).join(" • ");
  }

  function renderMenuItems() {
    const container = document.getElementById("catalog-sections");
    if (!container) return;

    const sections = getCatalogSections();
    if (sections.length === 0) {
      container.innerHTML = `<div style="text-align: center; padding: 48px 16px; color: #94a3b8; font-size: 15px;">${t("noItemsInCat")}</div>`;
      return;
    }

    container.innerHTML = sections.map(sec => {
      if (sec.type === 'customizations') {
        return renderFlavorSectionHtml();
      }
      const cat = sec.category;
      const items = cat.items || [];
      if (items.length === 0) return "";

      const promoBadge = cat.pricingRules?.promo_label 
        ? `<span class="cat-promo-badge">${escapeHtml(cat.pricingRules.promo_label)}</span>` 
        : '';

      const cardsHtml = items.map(item => createItemCardHtml(cat, item)).join("");

      return `
        <div class="section-container" id="sec-${escapeHtml(cat.slug)}">
          <div class="section-title">
            <span>${escapeHtml(cat.name)}</span>
            ${promoBadge}
          </div>
          <div class="items-grid" id="grid-${escapeHtml(cat.slug)}">
            ${cardsHtml}
          </div>
        </div>
      `;
    }).join("");
  }

  // --- 10. PER-ITEM CUSTOMIZATION MODAL (MODIFIERS ONLY, NO GLOBAL FLAVOR) ---
  function getItemCustomizationGroups(item) {
    const groups = [];
    const cat = state.categories.find(c => c.id === item.categoryId || c.slug === item.categorySlug);
    const catMods = getCategoryModifiers(cat);

    catMods.forEach(m => {
      groups.push({
        key: m.slug || m.id,
        title: m.name || m.title || (state.currentLang === 'vi' ? 'Tùy chọn' : '客製化'),
        type: m.type || (m.max_selection === 1 || m.single_choice ? "radio" : "checkbox"),
        options: (m.options || []).map(opt => ({
          name: typeof opt === 'string' ? opt : (opt.name || opt.label),
          price: typeof opt === 'object' ? (Number(opt.price) || 0) : 0
        }))
      });
    });

    return groups;
  }

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

    const groups = getItemCustomizationGroups(item);

    if (groups.length === 0) {
      container.innerHTML = `
        <div class="form-group" style="margin-top: 10px;">
          <label style="font-size: 13px; font-weight: 700; color: #475569; margin-bottom: 6px;">${t("optItemNote")}</label>
          <input type="text" id="modal-item-single-note" placeholder="${t("optItemNotePlaceholder")}" style="width: 100%; min-height: 44px; padding: 8px 12px; border: 1.5px solid var(--border); border-radius: 8px;">
        </div>
      `;
      return;
    }

    let html = "";
    groups.forEach((grp, gIdx) => {
      const isRadio = grp.type === "radio";
      const grpTitle = escapeHtml(grp.title || `Tùy chọn ${gIdx + 1}`);

      html += `
        <div class="option-group">
          <div class="option-group-title">
            <span>${grpTitle}</span>
            <span class="option-group-badge">${isRadio ? t("optSingleChoice") : t("optMultiChoice")}</span>
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
        <label style="font-size: 13px; font-weight: 700; color: #475569; margin-bottom: 6px;">${t("optItemNote")}</label>
        <input type="text" id="modal-item-single-note" placeholder="${t("optItemNotePlaceholder")}" style="width: 100%; min-height: 44px; padding: 8px 12px; border: 1.5px solid var(--border); border-radius: 8px;">
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

    updateCardActionUI(state.selectedItem.id);
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
      const isTakeout = state.currentTable.is_takeout || state.currentTable.id === 'takeaway';
      if (isTakeout) {
        contextEl.innerText = t("takeawayTableLabel");
      } else {
        const isAppend = !!state.currentTable.active_order_key;
        contextEl.innerText = `${state.currentLang === "vi" ? "Bàn" : "桌號"} ${state.currentTable.label} • ${isAppend ? t("modeAppend") : t("modeNew")}`;
      }
    }

    const listEl = document.getElementById("cart-items-list");
    if (!listEl) return;

    // Render flavor summary in cart body (above items list)
    const flavorSummaryText = formatGlobalCustomizationsSummary();
    let flavorBox = document.getElementById("cart-flavor-summary-box");
    if (!flavorBox && listEl.parentNode) {
      flavorBox = document.createElement("div");
      flavorBox.id = "cart-flavor-summary-box";
      flavorBox.className = "cart-flavor-summary";
      listEl.parentNode.insertBefore(flavorBox, listEl);
    }
    if (flavorBox) {
      flavorBox.innerHTML = `
        <div class="cart-flavor-title">${t("flavorCartHeader")}</div>
        <div class="cart-flavor-content">${escapeHtml(flavorSummaryText) || (state.currentLang === "vi" ? "Tiêu chuẩn / Mặc định" : "標準口味")}</div>
      `;
    }

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
    const itemId = state.cart[index].itemId;
    state.cart[index].quantity += delta;
    if (state.cart[index].quantity <= 0) {
      state.cart.splice(index, 1);
    }
    if (state.currentTable) {
      saveDraftCart(state.currentTable.id);
    }
    renderCartDrawer();
    updateCardActionUI(itemId);
    updateStickyCartBar();
  }

  function removeCartItem(index) {
    if (!state.cart[index]) return;
    const itemId = state.cart[index].itemId;
    state.cart.splice(index, 1);
    if (state.currentTable) {
      saveDraftCart(state.currentTable.id);
    }
    renderCartDrawer();
    updateCardActionUI(itemId);
    updateStickyCartBar();
  }

  function saveDraftCart(tableId) {
    if (!tableId || typeof sessionStorage === "undefined") return;
    sessionStorage.setItem(`staff_cart_${state.tenantId}_${tableId}`, JSON.stringify(state.cart));
    sessionStorage.setItem(`staff_flavor_${state.tenantId}_${tableId}`, JSON.stringify(state.selectedGlobalCustomizations));
  }

  function loadDraftCart(tableId) {
    if (!tableId || typeof sessionStorage === "undefined") {
      state.cart = [];
      state.selectedGlobalCustomizations = initDefaultGlobalCustomizations();
      refreshAllCardActionUIs();
      return;
    }
    try {
      const raw = sessionStorage.getItem(`staff_cart_${state.tenantId}_${tableId}`);
      state.cart = raw ? JSON.parse(raw) : [];

      const rawFlavor = sessionStorage.getItem(`staff_flavor_${state.tenantId}_${tableId}`);
      if (rawFlavor) {
        state.selectedGlobalCustomizations = JSON.parse(rawFlavor);
      } else {
        const table = state.tables.find(t => t.id === tableId);
        if (table && table.active_customizations && table.active_customizations.length > 0) {
          state.selectedGlobalCustomizations = hydrateGlobalCustomizationsFromActive(table.active_customizations);
        } else {
          state.selectedGlobalCustomizations = initDefaultGlobalCustomizations();
        }
      }
    } catch (e) {
      state.cart = [];
      state.selectedGlobalCustomizations = initDefaultGlobalCustomizations();
    }
    refreshAllCardActionUIs();
  }

  function clearDraftCart(tableId) {
    if (!tableId || typeof sessionStorage === "undefined") return;
    sessionStorage.removeItem(`staff_cart_${state.tenantId}_${tableId}`);
    sessionStorage.removeItem(`staff_flavor_${state.tenantId}_${tableId}`);
    state.cart = [];
    state.selectedGlobalCustomizations = initDefaultGlobalCustomizations();
    refreshAllCardActionUIs();
  }

  // --- 12. TABLE TRANSFER & CHANGE DRAFT TABLE ---
  let transferSourceTableId = null;

  function openTransferTableModal(tableId) {
    const table = state.tables.find(t => t.id === tableId);
    if (!table) return;

    transferSourceTableId = tableId;
    const modal = document.getElementById("transferModal");
    const descEl = document.getElementById("transfer-modal-desc");
    const gridEl = document.getElementById("transfer-tables-grid");

    if (descEl) {
      descEl.innerText = t("transferDesc", { tableName: `${state.currentLang === "vi" ? "Bàn" : "桌號"} ${table.label}` });
    }

    if (gridEl) {
      const targetTables = state.tables.filter(t => t.id !== tableId);
      if (targetTables.length === 0) {
        gridEl.innerHTML = `<div style="grid-column: 1 / -1; text-align: center; color: #94a3b8; padding: 20px;">${t("emptyTablesList")}</div>`;
      } else {
        gridEl.innerHTML = targetTables.map(tDest => {
          const isDestOccupied = !!tDest.active_order_key;
          const statusText = isDestOccupied ? t("occupiedStatus") : t("emptyStatus");
          const chipClass = isDestOccupied ? "transfer-table-chip occupied disabled" : "transfer-table-chip";
          const clickHandler = isDestOccupied
            ? `alert('${t("destTableOccupied")}')`
            : `confirmTransferTable('${tDest.id}')`;

          return `
            <div class="${chipClass}" onclick="${clickHandler}">
              <span class="chip-table-name">${escapeHtml(tDest.label)}</span>
              <span class="chip-table-status">${statusText}</span>
            </div>
          `;
        }).join("");
      }
    }

    if (modal) modal.style.display = "flex";
  }

  function closeTransferModal() {
    transferSourceTableId = null;
    const modal = document.getElementById("transferModal");
    if (modal) modal.style.display = "none";
  }

  async function confirmTransferTable(toTableId) {
    if (!transferSourceTableId || !toTableId) return;
    const fromTable = state.tables.find(t => t.id === transferSourceTableId);
    const toTable = state.tables.find(t => t.id === toTableId);
    if (!fromTable || !toTable) return;

    try {
      const res = await fetch(`${WORKER_BASE}/api/staff/tables/transfer?tenant_id=${encodeURIComponent(state.tenantId)}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer " + state.token
        },
        body: JSON.stringify({
          fromTableId: transferSourceTableId,
          toTableId: toTableId
        })
      });

      const data = await res.json().catch(() => ({}));
      if (res.status === 409) {
        alert(t("destTableOccupied"));
        return;
      }

      if (res.ok && data && data.ok) {
        // Migrate any draft cart in sessionStorage if exists
        try {
          const oldDraft = sessionStorage.getItem(`staff_cart_${state.tenantId}_${transferSourceTableId}`);
          const oldFlavor = sessionStorage.getItem(`staff_flavor_${state.tenantId}_${transferSourceTableId}`);
          if (oldDraft) {
            sessionStorage.setItem(`staff_cart_${state.tenantId}_${toTableId}`, oldDraft);
            sessionStorage.removeItem(`staff_cart_${state.tenantId}_${transferSourceTableId}`);
          }
          if (oldFlavor) {
            sessionStorage.setItem(`staff_flavor_${state.tenantId}_${toTableId}`, oldFlavor);
            sessionStorage.removeItem(`staff_flavor_${state.tenantId}_${transferSourceTableId}`);
          }
        } catch (e) {}

        closeTransferModal();
        alert(t("transferSuccess", { tableName: `${state.currentLang === "vi" ? "Bàn" : "桌號"} ${toTable.label}` }));
        await loadTablesData();
      } else {
        alert((data && data.message) || (state.currentLang === "vi" ? "Đổi bàn thất bại" : "轉桌失敗"));
      }
    } catch (err) {
      alert((state.currentLang === "vi" ? "Lỗi kết nối: " : "連線錯誤: ") + (err.message || err));
    }
  }

  function openChangeDraftTableModal() {
    if (!state.currentTable) return;

    const modal = document.getElementById("changeDraftTableModal");
    const gridEl = document.getElementById("change-draft-tables-grid");

    if (gridEl) {
      const availableTables = state.tables;
      if (availableTables.length === 0) {
        gridEl.innerHTML = `<div style="grid-column: 1 / -1; text-align: center; color: #94a3b8; padding: 20px;">${t("emptyTablesList")}</div>`;
      } else {
        gridEl.innerHTML = availableTables.map(tbl => {
          const isCurrent = tbl.id === state.currentTable.id;
          const isOccupied = !!tbl.active_order_key;
          const statusText = isCurrent
            ? (state.currentLang === "vi" ? "Hiện tại" : "目前")
            : (isOccupied ? t("occupiedStatus") : t("emptyStatus"));
          const chipClass = isCurrent ? "transfer-table-chip current" : "transfer-table-chip";

          return `
            <div class="${chipClass}" onclick="${isCurrent ? '' : `changeDraftTable('${tbl.id}')`}">
              <span class="chip-table-name">${escapeHtml(tbl.label)}</span>
              <span class="chip-table-status">${statusText}</span>
            </div>
          `;
        }).join("");
      }
    }

    if (modal) modal.style.display = "flex";
  }

  function closeChangeDraftTableModal() {
    const modal = document.getElementById("changeDraftTableModal");
    if (modal) modal.style.display = "none";
  }

  function changeDraftTable(newTableId) {
    const newTable = state.tables.find(t => t.id === newTableId);
    if (!newTable || !state.currentTable || newTable.id === state.currentTable.id) return;

    const oldTableId = state.currentTable.id;
    // Migrate active draft cart and flavor selections in sessionStorage
    try {
      sessionStorage.setItem(`staff_cart_${state.tenantId}_${newTable.id}`, JSON.stringify(state.cart));
      sessionStorage.setItem(`staff_flavor_${state.tenantId}_${newTable.id}`, JSON.stringify(state.selectedGlobalCustomizations));
      sessionStorage.removeItem(`staff_cart_${state.tenantId}_${oldTableId}`);
      sessionStorage.removeItem(`staff_flavor_${state.tenantId}_${oldTableId}`);
    } catch (e) {}

    state.currentTable = newTable;
    closeChangeDraftTableModal();

    // Update UI elements
    updateOrderBanner();
    updateStickyCartBar();
    const headLabel = document.getElementById("header-table-label");
    if (headLabel) {
      headLabel.innerText = `${state.currentLang === "vi" ? "Bàn" : "桌號"}: ${newTable.label}`;
    }
    const contextEl = document.getElementById("cart-order-context-desc");
    if (contextEl) {
      const isAppend = !!newTable.active_order_key;
      contextEl.innerText = `${state.currentLang === "vi" ? "Bàn" : "桌號"} ${newTable.label} • ${isAppend ? t("modeAppend") : t("modeNew")}`;
    }
  }

  // --- 13. SUBMIT STAFF ORDER (NEW OR APPEND ROUND) ---
  async function submitStaffOrder() {
    if (!state.currentTable || state.cart.length === 0) return;

    const btnSubmit = document.getElementById("btn-submit-order");
    const spanConfirm = document.getElementById("i18n-btn-confirm-order");
    if (btnSubmit) {
      btnSubmit.disabled = true;
      if (spanConfirm) {
        spanConfirm.innerText = t("btnSending");
      } else {
        btnSubmit.innerHTML = `<span id="i18n-btn-confirm-order">${t("btnSending")}</span>`;
      }
    }

    const noteInp = document.getElementById("cart-order-note");
    const note = noteInp ? noteInp.value.trim() : "";

    const requestId = crypto.randomUUID();
    const isTakeout = state.currentTable.is_takeout || state.currentTable.id === 'takeaway';
    const isAppend = !isTakeout && !!state.currentTable.active_order_key;

    const payload = {
      requestId,
      tableId: state.currentTable.id,
      dining_option: isTakeout ? 'takeout' : 'dine_in',
      customer: '',
      note,
      customizations: getSelectedGlobalCustomizations(),
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
        closeCartModal();
        showConflictModal((data && data.message) || t("conflictDesc"));
        return;
      }

      if (res.ok && data && data.ok) {
        clearDraftCart(state.currentTable.id);
        if (noteInp) noteInp.value = "";
        closeCartModal();
        updateStickyCartBar();

        showSuccessModal({
          displayKey: data.displayKey || data.orderId || "---",
          tableName: isTakeout ? t("takeawayTableLabel") : state.currentTable.label,
          roundCount: data.roundCount || 1,
          total: data.total || data.grandTotal || 0
        });
      } else {
        alert((data && data.message) || (state.currentLang === "vi" ? "Gửi đơn thất bại" : "送出失敗"));
      }
    } catch (err) {
      alert((state.currentLang === "vi" ? "Lỗi kết nối: " : "連線錯誤: ") + (err.message || err));
    } finally {
      if (btnSubmit) {
        btnSubmit.disabled = false;
        const curSpan = document.getElementById("i18n-btn-confirm-order");
        if (curSpan) {
          curSpan.innerText = t("btnConfirmOrder");
        } else {
          btnSubmit.innerHTML = `<span id="i18n-btn-confirm-order">${t("btnConfirmOrder")}</span>`;
        }
      }
    }
  }

  // --- 14. SUCCESS & CONFLICT MODALS ---
  function showSuccessModal({ displayKey, tableName, roundCount, total }) {
    document.getElementById("success-display-key").innerText = `#${displayKey}`;
    document.getElementById("success-table-name").innerText = tableName;
    document.getElementById("success-round-count").innerText = state.currentLang === "vi" ? `Lượt ${roundCount}` : `第 ${roundCount} 輪`;
    document.getElementById("success-total-amount").innerText = `$${total}`;

    document.getElementById("successModal").style.display = "flex";
  }

  function handleSuccessBackToTables() {
    document.getElementById("successModal").style.display = "none";
    if (state.currentTable && (state.currentTable.is_takeout || state.currentTable.id === 'takeaway')) {
      clearDraftCart("takeaway");
      showMenuView();
      return;
    }
    goToTableSelection();
  }

  function showConflictModal(msg) {
    const desc = document.getElementById("conflict-desc-text");
    if (desc && msg) desc.innerText = msg;
    document.getElementById("conflictModal").style.display = "flex";
  }

  async function handleResolveConflict() {
    document.getElementById("conflictModal").style.display = "none";
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

  // --- 15. EXPOSE GLOBAL FUNCTIONS ---
  window.toggleLanguage = toggleLanguage;
  window.goToPosScreen = goToPosScreen;
  window.handleStaffLogin = handleStaffLogin;
  window.handleStaffLogout = handleStaffLogout;
  window.loadTablesData = loadTablesData;
  window.setTableFilter = setTableFilter;
  window.handleTableSearch = handleTableSearch;
  window.handleSelectTable = handleSelectTable;
  window.goToTableSelection = goToTableSelection;
  window.selectCategory = scrollToCategory;
  window.scrollToCategory = scrollToCategory;
  window.handleGlobalFlavorChange = handleGlobalFlavorChange;
  window.handleItemAddClick = handleItemAddClick;
  window.handleQuickQty = handleQuickQty;
  window.openItemModal = openItemModal;
  window.closeItemModal = closeItemModal;
  window.changeModalQty = changeModalQty;
  window.updateModalCalculatedPrice = updateModalCalculatedPrice;
  window.confirmAddItemToCart = confirmAddItemToCart;
  window.openCartModal = openCartModal;
  window.closeCartModal = closeCartModal;
  window.changeCartItemQty = changeCartItemQty;
  window.removeCartItem = removeCartItem;
  window.openTransferTableModal = openTransferTableModal;
  window.closeTransferModal = closeTransferModal;
  window.confirmTransferTable = confirmTransferTable;
  window.openChangeDraftTableModal = openChangeDraftTableModal;
  window.closeChangeDraftTableModal = closeChangeDraftTableModal;
  window.changeDraftTable = changeDraftTable;
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
