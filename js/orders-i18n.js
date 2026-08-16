// ==========================================
// Benmi POS - Module: I18N & Localization
// ==========================================

const I18N = {
  "zh-TW": {
    langBtn: "Tiếng Việt",
    brandTitle: "🥖 Benmi Dashboard",
    brandSub: "即時訂單",
    tabLive: "即時",
    tabHistory: "歷史",
    tabSound: "測試音效",
    tabMenu: "菜單",
    tabSettings: "設定",
    panelLeftTitle: "待處理",
    panelLeftSub: "近 → 遠 (依取餐時間)",
    panelRightTitle: "已接單",
    panelRightSub: "製作中與等待取餐",
    loading: "載入中...",
    empty: "無訂單",
    emptyHistory: "尚無歷史訂單",
    historyTitle: "訂單歷史",
    historySub: "近 30 天訂單紀錄 (依日期分組)",
    btnExpandAll: "展開全部",
    btnCollapseAll: "收合全部",
    todayTag: "今天",
    orderUnit: "單",
    historyOlderTitle: "查看 30 天前的歷史訂單",
    historyOlderSub: "如需調閱更早歷史紀錄或匯出月報表，請聯繫 BLAB 團隊",
    btnContactBlab: "聯繫 BLAB",
    modalBlabTitle: "歷史訂單進階調閱",
    modalBlabDesc: "系統預設提供近 30 天即時訂單記錄。超過 30 天之歷史資料封存於雲端資料庫，如需查詢或匯出完整財務報表，請聯繫 BLAB 團隊為您處理。",
    blabExportTitle: "月度報表 / 雲端匯出服務",
    blabExportSub: "請聯繫 BLAB 團隊協助調閱歷史資料",
    btnModalBlabLine: "開啟 LINE 支援",
    btnModalBlabExport: "聯絡 BLAB",
    btnModalBlabClose: "我知道了",
    startShiftTitle: "開始接收訂單",
    startShiftDesc: "點擊下方按鈕以啟動即時訂單提示音與工作階段，確保第一時間收到顧客點餐通知。",
    btnStartShift: "開始接單 (啟用提示音)",
    // Badges & Buttons
    badgeNew: "新訂單",
    badgeDoing: "製作中",
    badgeReady: "已完成",
    badgeWaiting: "等客戶確認",
    badgePicked: "已取餐",
    btnReview: "Review 訂單",
    btnReady: "準備好了",
    btnPickedUp: "已取餐",
    btnWaitingReply: "等待客戶回覆",
    btnView: "查看",
    // Time & ETA
    pickupLabel: "取餐:",
    etaArrived: "已到 / {min} 分鐘前",
    etaMinutes: "剩 {min} 分鐘",
    etaHours: "剩 {h} 小時 {m} 分",
    // Alert modal
    alertTitle: "{count} 單 新訂單",
    alertSub: "點擊 “Review 訂單” 查看詳情並接單",
    alertBtnReview: "Review 訂單",
    alertBtnDismiss: "暫時隱藏",
    // Review Modal
    reviewTitle: "Review 訂單",
    labelOrder: "訂單編號",
    labelCustomer: "LINE 顧客",
    labelPickup: "取餐時間",
    labelEta: "剩餘時間",
    labelTotal: "總金額",
    labelStatus: "狀態",
    btnAccept: "接單",
    btnChange: "需要更改",
    btnReject: "無法接單",
    btnCancelOrder: "取消訂單",
    btnClose: "關閉",
    confirmCancelOrder: "確定要取消此訂單嗎？客戶將不會收到通知。",
    confirmForceCancel: "客戶無回應，確定要強制取消此訂單嗎？",
    // Change Modal
    changeTitle: "需要更改",
    changeTabTime: "時間太趕，需延後",
    changeTabTimeSub: "建議延後取餐時間",
    changeTabSoldout: "該口味已售完",
    changeTabSoldoutSub: "選擇已售完的品項",
    origTimeLabel: "客戶原定取餐時間",
    calcFromNowSub: "（以現在/原定時間計算）",
    changeTimeTitle: "⏰ 建議新取餐時間:",
    changeTimeSub: "輸入新時間或點擊下方快速加分",
    changeTimePlaceholder: "例: 11:30",
    changeQuickSelect: "點擊快速選擇延後時間:",
    soldoutTitle: "點擊選擇已售完品項:",
    soldoutClear: "取消全選",
    btnSendSuggest: "傳送建議",
    btnCancel: "取消",
    alertInputTime: "請輸入建議的新取餐時間 (例: 11:30)！",
    alertSelectSoldout: "請至少選擇一項已售完的品項！",
    // Reject Modal
    rejectTitle: "無法接單",
    rejectR1Title: "今日已售完",
    rejectR1Sub: "所有餐點已全數售完",
    rejectR2Title: "訂單過多，暫不接單",
    rejectR2Sub: "現場製作繁忙，暫停接單",
    rejectR3Title: "已過營業時間",
    rejectR3Sub: "目前非營業時段",
    rejectR4Title: "取消並不回復客戶",
    rejectR4Sub: "直接取消且不發送訊息",
    btnConfirmReject: "確認拒絕",
    btnBack: "返回",
    // Settings
    settingsTitle: "系統設定",
    settingStoreStatusTitle: "🏪 門市接單狀態",
    settingStoreStatusSub: "隨時切換一般營業、繁忙延後或暫停接單模式",
    boxOpenTitle: "🟢 正常營業",
    boxOpenDesc: "正常接收新訂單，依照標準預約或排隊時間",
    boxBusyTitle: "🟠 門市繁忙 (+1小時)",
    boxBusyDesc: "新訂單自動延長 1 小時製作時間",
    boxPausedTitle: "🔴 暫停接單",
    boxPausedDesc: "暫停接收新訂單，顧客端無法下單",
    statusOpen: "營業中",
    statusBusy: "繁忙中 (+1小時)",
    statusPaused: "暫停接單",
    statusMenuHeader: "門市接單狀態",
    statusOptOpenTitle: "🟢 營業中",
    statusOptOpenDesc: "正常接單，顧客依一般時間預約",
    statusOptBusyTitle: "🟠 繁忙中 (+1小時)",
    statusOptBusyDesc: "新訂單製作時間自動延長 1 小時",
    statusOptPausedTitle: "🔴 暫停接單",
    statusOptPausedDesc: "暫停接收新訂單，顧客端無法下單",
    orderModeTitle: "🛒 點餐模式 / 取餐時間設定",
    orderModeSub: "自訂允許顧客預約時間或現場排隊即時製作 (ASAP)",
    btnSaveSetting: "儲存設定",
    modeScheduledTitle: "🕒 允許預約取餐",
    modeScheduledSub: "顧客可在點餐頁面自選取餐日期與時間，適合預先排程準備餐點的店家。",
    modeAsapTitle: "⚡ 關閉預約 - 即時排隊製作模式",
    modeAsapSub: "隱藏預約時間選項。顧客下單後將立即依照現場排隊順序製作 (ASAP)。",
    hoursTitle: "⏰ 營業時間",
    btnSaveHours: "儲存時間",
    btnAddShift: "+ 新增時段",
    closedDay: "公休",
    saving: "儲存中...",
    saveSuccess: "設定儲存成功！",
    saveFail: "儲存失敗："
  },
  "vi": {
    langBtn: "繁體中文",
    brandTitle: "🥖 Benmi Dashboard",
    brandSub: "Đơn hàng trực tiếp",
    tabLive: "Trực tiếp",
    tabHistory: "Lịch sử",
    tabSound: "Test âm thanh",
    tabMenu: "Thực đơn",
    tabSettings: "Cài đặt",
    panelLeftTitle: "Chờ xử lý",
    panelLeftSub: "Gần → xa (theo giờ lấy)",
    panelRightTitle: "Đã nhận đơn",
    panelRightSub: "Đang làm & Chờ khách lấy",
    loading: "Đang tải...",
    empty: "Chưa có đơn",
    emptyHistory: "Chưa có lịch sử đơn hàng",
    historyTitle: "Lịch sử đơn hàng",
    historySub: "Đơn hàng 30 ngày gần nhất (theo ngày)",
    btnExpandAll: "Mở tất cả",
    btnCollapseAll: "Thu gọn",
    todayTag: "Hôm nay",
    orderUnit: "đơn",
    historyOlderTitle: "Xem đơn hàng trên 30 ngày",
    historyOlderSub: "Quý khách cần xuất báo cáo hoặc tra cứu lịch sử vui lòng liên hệ đội ngũ BLAB",
    btnContactBlab: "Liên hệ BLAB",
    modalBlabTitle: "Tra cứu dữ liệu lịch sử > 30 ngày",
    modalBlabDesc: "Hệ thống hiển thị dữ liệu 30 ngày gần nhất. Dữ liệu trên 30 ngày được lưu trữ an toàn trên đám mây, quý khách cần tra cứu hoặc xuất báo cáo đối soát vui lòng liên hệ đội ngũ BLAB.",
    blabExportTitle: "Báo cáo theo tháng / Dữ liệu đám mây",
    blabExportSub: "Vui lòng liên hệ đội ngũ BLAB để được hỗ trợ",
    btnModalBlabLine: "Mở LINE hỗ trợ",
    btnModalBlabExport: "Liên hệ BLAB",
    btnModalBlabClose: "Đã hiểu",
    startShiftTitle: "Bắt đầu nhận đơn",
    startShiftDesc: "Nhấn nút bên dưới để kích hoạt chuông báo và sẵn sàng nhận đơn hàng mới từ khách hàng.",
    btnStartShift: "Bắt đầu nhận đơn (Bật chuông)",
    // Badges & Buttons
    badgeNew: "MỚI",
    badgeDoing: "ĐANG LÀM",
    badgeReady: "ĐÃ XONG",
    badgeWaiting: "CHỜ KHÁCH",
    badgePicked: "ĐÃ LẤY",
    btnReview: "Xem đơn",
    btnReady: "Đã xong",
    btnPickedUp: "Đã lấy",
    btnWaitingReply: "Chờ khách phản hồi",
    btnView: "Xem",
    // Time & ETA
    pickupLabel: "Lấy:",
    etaArrived: "Đã đến / {min} phút trước",
    etaMinutes: "Còn {min} phút",
    etaHours: "Còn {h} giờ {m} phút",
    // Alert modal
    alertTitle: "{count} Đơn hàng mới",
    alertSub: "Nhấn “Xem đơn” để xem chi tiết và nhận đơn",
    alertBtnReview: "Xem đơn",
    alertBtnDismiss: "Tạm ẩn",
    // Review Modal
    reviewTitle: "Chi tiết đơn hàng",
    labelOrder: "Mã đơn",
    labelCustomer: "Khách LINE",
    labelPickup: "Giờ lấy",
    labelEta: "Thời gian còn",
    labelTotal: "Tổng tiền",
    labelStatus: "Trạng thái",
    btnAccept: "Nhận đơn",
    btnChange: "Yêu cầu thay đổi",
    btnReject: "Từ chối đơn",
    btnCancelOrder: "Hủy đơn",
    btnClose: "Đóng",
    confirmCancelOrder: "Bạn có chắc muốn hủy đơn này? Khách sẽ KHÔNG nhận được thông báo.",
    confirmForceCancel: "Khách không phản hồi, bạn có chắc muốn hủy đơn này?",
    // Change Modal
    changeTitle: "Yêu cầu thay đổi",
    changeTabTime: "Thời gian quá gấp",
    changeTabTimeSub: "Đề xuất dời giờ lấy bánh",
    changeTabSoldout: "Đã hết món",
    changeTabSoldoutSub: "Chọn món đã hết hàng",
    origTimeLabel: "Khách hẹn ban đầu",
    calcFromNowSub: "（Tính từ giờ hẹn hoặc hiện tại）",
    changeTimeTitle: "⏰ Đề xuất giờ lấy mới:",
    changeTimeSub: "Nhập giờ mới hoặc chọn nhanh cộng phút bên dưới",
    changeTimePlaceholder: "VD: 11:30",
    changeQuickSelect: "Chọn nhanh mốc dời giờ:",
    soldoutTitle: "Chọn các món đã hết:",
    soldoutClear: "Bỏ chọn tất cả",
    btnSendSuggest: "Gửi đề xuất",
    btnCancel: "Hủy",
    alertInputTime: "Vui lòng nhập giờ đề xuất mới (Ví dụ: 11:30)!",
    alertSelectSoldout: "Vui lòng chọn ít nhất một món đã hết hàng!",
    // Reject Modal
    rejectTitle: "Không thể nhận đơn",
    rejectR1Title: "Hôm nay đã bán hết",
    rejectR1Sub: "Tất cả các món đã bán hết hôm nay",
    rejectR2Title: "Đơn quá tải, tạm ngưng",
    rejectR2Sub: "Quán đang quá tải, tạm dừng nhận đơn",
    rejectR3Title: "Đã qua giờ mở cửa",
    rejectR3Sub: "Hiện tại ngoài khung giờ hoạt động",
    rejectR4Title: "Hủy không báo khách",
    rejectR4Sub: "Hủy trực tiếp không gửi tin nhắn",
    btnConfirmReject: "Xác nhận từ chối",
    btnBack: "Quay lại",
    // Settings
    settingsTitle: "Cài đặt hệ thống",
    settingStoreStatusTitle: "🏪 Trạng thái nhận đơn của quán",
    settingStoreStatusSub: "Chuyển đổi linh hoạt giữa Mở quán, Đang bận (+1h) hoặc Tạm dừng nhận đơn",
    boxOpenTitle: "🟢 Mở quán",
    boxOpenDesc: "Nhận đơn bình thường theo thời gian hẹn hoặc xếp hàng",
    boxBusyTitle: "🟠 Đang bận (+1 giờ)",
    boxBusyDesc: "Tự động cộng thêm 1 giờ cho mỗi đơn mới",
    boxPausedTitle: "🔴 Tạm dừng nhận đơn",
    boxPausedDesc: "Tạm dừng nhận đơn mới, khách không thể gửi đơn",
    statusOpen: "Đang mở quán",
    statusBusy: "Đang bận (+1 giờ)",
    statusPaused: "Tạm dừng nhận đơn",
    statusMenuHeader: "Trạng thái nhận đơn",
    statusOptOpenTitle: "🟢 Mở quán",
    statusOptOpenDesc: "Nhận đơn mới bình thường theo thời gian chuẩn",
    statusOptBusyTitle: "🟠 Đang bận (+1 giờ)",
    statusOptBusyDesc: "Quán đang bận, tự động kéo dài thời gian làm thêm 1 tiếng cho mỗi đơn mới",
    statusOptPausedTitle: "🔴 Tạm dừng nhận đơn",
    statusOptPausedDesc: "Tạm dừng nhận đơn mới, khách hàng không thể gửi đơn",
    orderModeTitle: "🛒 Chế độ nhận đơn & Hẹn giờ",
    orderModeSub: "Tùy chỉnh cho phép khách hẹn giờ lấy hoặc nhận đơn làm ngay xếp theo thứ tự (ASAP)",
    btnSaveSetting: "Lưu thiết lập",
    modeScheduledTitle: "🕒 Bật hẹn giờ lấy món",
    modeScheduledSub: "Khách hàng có thể tự chọn ngày và giờ muốn đến lấy bánh trên trang đặt hàng. Thích hợp với các quán chuẩn bị theo giờ hẹn của khách.",
    modeAsapTitle: "⚡ Tắt hẹn giờ - Nhận đơn làm ngay theo hàng đợi (ASAP)",
    modeAsapSub: "Ẩn mục chọn ngày giờ. Khách đặt xong đơn sẽ được tiếp nhận và xử lý làm ngay theo thứ tự xếp hàng (ASAP).",
    hoursTitle: "⏰ Giờ hoạt động",
    btnSaveHours: "Lưu thời gian",
    btnAddShift: "+ Thêm khung giờ",
    closedDay: "Nghỉ",
    saving: "Đang lưu...",
    saveSuccess: "Đã lưu thiết lập thành công!",
    saveFail: "Lưu thất bại: "
  }
};

let currentLang = localStorage.getItem("benmi_lang") || "zh-TW";

function t(key, params = {}) {
  let str = (I18N[currentLang] && I18N[currentLang][key]) || (I18N["zh-TW"] && I18N["zh-TW"][key]) || key;
  Object.keys(params).forEach(p => {
    str = str.replace(new RegExp(`\\{${p}\\}`, 'g'), params[p]);
  });
  return str;
}

function toggleLangDropdown(e) {
  if (e) e.stopPropagation();
  const dd = document.getElementById("lang-dropdown");
  if (dd) dd.classList.toggle("open");
}

function selectLanguage(lang) {
  setLanguage(lang);
  const dd = document.getElementById("lang-dropdown");
  if (dd) dd.classList.remove("open");
}

// Click outside to close dropdown
document.addEventListener("click", (e) => {
  const dd = document.getElementById("lang-dropdown");
  if (dd && !dd.contains(e.target)) {
    dd.classList.remove("open");
  }
});

function setLanguage(lang) {
  currentLang = lang;
  localStorage.setItem("benmi_lang", lang);
  applyLanguageToDOM();
  if (typeof renderAll === "function") renderAll();
  if (typeof activeTab !== "undefined" && activeTab === "settings") {
    if (typeof renderOperatingHours === "function") renderOperatingHours();
    if (typeof renderScheduledPickupSetting === "function") renderScheduledPickupSetting();
  }
}

function applyLanguageToDOM() {
  const dict = I18N[currentLang];
  if (!dict) return;

  // Topbar
  const labelMap = { "zh-TW": "繁體中文", "vi": "Tiếng Việt" };
  const currentLabel = document.getElementById("current-lang-label");
  if (currentLabel) currentLabel.innerText = labelMap[currentLang] || currentLang;

  document.querySelectorAll(".lang-dropdown-item").forEach(item => {
    item.classList.toggle("active", item.dataset.lang === currentLang);
  });

  const brandSub = document.getElementById("i18n-brand-sub");
  if (brandSub) brandSub.innerText = dict.brandSub;
  const tabLive = document.getElementById("tab-live");
  if (tabLive) tabLive.innerText = dict.tabLive;
  const tabHistory = document.getElementById("tab-history");
  if (tabHistory) tabHistory.innerText = dict.tabHistory;
  const tabSound = document.getElementById("tab-sound");
  if (tabSound) tabSound.innerText = dict.tabSound;
  const tabMenu = document.getElementById("tab-menu");
  if (tabMenu) tabMenu.innerText = dict.tabMenu;
  const tabSettings = document.getElementById("tab-settings");
  if (tabSettings) tabSettings.innerText = dict.tabSettings;

  // View Live Headers
  const leftTitle = document.getElementById("i18n-left-title");
  if (leftTitle) leftTitle.innerText = dict.panelLeftTitle;
  const leftSub = document.getElementById("i18n-left-sub");
  if (leftSub) leftSub.innerText = dict.panelLeftSub;
  const rightTitle = document.getElementById("i18n-right-title");
  if (rightTitle) rightTitle.innerText = dict.panelRightTitle;
  const rightSub = document.getElementById("i18n-right-sub");
  if (rightSub) rightSub.innerText = dict.panelRightSub;

  // View History Headers
  const histTitle = document.getElementById("i18n-history-title");
  if (histTitle) histTitle.innerText = dict.historyTitle;
  const histSub = document.getElementById("i18n-history-sub");
  if (histSub) histSub.innerText = dict.historySub;

  // BLAB Modal
  const mBlabT = document.getElementById("i18n-modal-blab-title");
  if (mBlabT) mBlabT.innerText = dict.modalBlabTitle;
  const mBlabD = document.getElementById("i18n-modal-blab-desc");
  if (mBlabD) mBlabD.innerText = dict.modalBlabDesc;
  const blabExpT = document.getElementById("i18n-blab-export-title");
  if (blabExpT) blabExpT.innerText = dict.blabExportTitle;
  const blabExpS = document.getElementById("i18n-blab-export-sub");
  if (blabExpS) blabExpS.innerText = dict.blabExportSub;
  const btnMBlabLine = document.getElementById("i18n-btn-modal-blab-line");
  if (btnMBlabLine) btnMBlabLine.innerText = dict.btnModalBlabLine;
  const btnMBlabExp = document.getElementById("i18n-btn-modal-blab-export");
  if (btnMBlabExp) btnMBlabExp.innerText = dict.btnModalBlabExport;
  const btnMBlabCls = document.getElementById("i18n-btn-modal-blab-close");
  if (btnMBlabCls) btnMBlabCls.innerText = dict.btnModalBlabClose;

  // Start Shift Modal
  const startShiftT = document.getElementById("i18n-start-shift-title");
  if (startShiftT) startShiftT.innerText = dict.startShiftTitle;
  const startShiftD = document.getElementById("i18n-start-shift-desc");
  if (startShiftD) startShiftD.innerText = dict.startShiftDesc;
  const btnStartShiftText = document.getElementById("i18n-btn-start-shift-text");
  if (btnStartShiftText) btnStartShiftText.innerText = dict.btnStartShift;

  // Alert modal
  const alertSub = document.getElementById("new-alert-sub");
  if (alertSub) alertSub.innerText = dict.alertSub;
  const btnAlertRev = document.getElementById("btn-alert-review");
  if (btnAlertRev) btnAlertRev.innerText = dict.alertBtnReview;
  const btnAlertDis = document.getElementById("btn-alert-dismiss");
  if (btnAlertDis) btnAlertDis.innerText = dict.alertBtnDismiss;

  // Review Modal
  const revTitle = document.getElementById("i18n-review-title");
  if (revTitle) revTitle.innerText = dict.reviewTitle;
  const lOrder = document.getElementById("i18n-label-order");
  if (lOrder) lOrder.innerText = dict.labelOrder;
  const lCustomer = document.getElementById("i18n-label-customer");
  if (lCustomer) lCustomer.innerText = dict.labelCustomer;
  const lPickup = document.getElementById("i18n-label-pickup");
  if (lPickup) lPickup.innerText = dict.labelPickup;
  const lEta = document.getElementById("i18n-label-eta");
  if (lEta) lEta.innerText = dict.labelEta;
  const lTotal = document.getElementById("i18n-label-total");
  if (lTotal) lTotal.innerText = dict.labelTotal;
  const lStatus = document.getElementById("i18n-label-status");
  if (lStatus) lStatus.innerText = dict.labelStatus;

  const btnRevAcc = document.getElementById("btn-review-accept");
  if (btnRevAcc) btnRevAcc.innerText = dict.btnAccept;
  const btnRevChg = document.getElementById("btn-review-change");
  if (btnRevChg) btnRevChg.innerText = dict.btnChange;
  const btnRevRej = document.getElementById("btn-review-reject");
  if (btnRevRej) btnRevRej.innerText = dict.btnReject;

  const btnRevRdy = document.getElementById("btn-review-ready");
  if (btnRevRdy) btnRevRdy.innerText = dict.btnReady;
  const btnRevCan1 = document.getElementById("btn-review-cancel-1");
  if (btnRevCan1) btnRevCan1.innerText = dict.btnCancelOrder;
  const btnRevCls1 = document.getElementById("btn-review-close-1");
  if (btnRevCls1) btnRevCls1.innerText = dict.btnClose;

  const btnRevPik = document.getElementById("btn-review-picked");
  if (btnRevPik) btnRevPik.innerText = dict.btnPickedUp;
  const btnRevCan2 = document.getElementById("btn-review-cancel-2");
  if (btnRevCan2) btnRevCan2.innerText = dict.btnCancelOrder;
  const btnRevCls2 = document.getElementById("btn-review-close-2");
  if (btnRevCls2) btnRevCls2.innerText = dict.btnClose;

  const btnRevAccW = document.getElementById("btn-review-accept-wait");
  if (btnRevAccW) btnRevAccW.innerText = dict.btnAccept;
  const btnRevFrcC = document.getElementById("btn-review-force-cancel");
  if (btnRevFrcC) btnRevFrcC.innerText = dict.btnCancelOrder;
  const btnRevCls3 = document.getElementById("btn-review-close-3");
  if (btnRevCls3) btnRevCls3.innerText = dict.btnClose;

  // Change Modal
  const chgTitle = document.getElementById("i18n-change-title");
  if (chgTitle) chgTitle.innerText = dict.changeTitle;
  const chgTabTT = document.getElementById("i18n-change-tab-time-title");
  if (chgTabTT) chgTabTT.innerText = dict.changeTabTime;
  const chgTabTS = document.getElementById("i18n-change-tab-time-sub");
  if (chgTabTS) chgTabTS.innerText = dict.changeTabTimeSub;
  const chgTabST = document.getElementById("i18n-change-tab-soldout-title");
  if (chgTabST) chgTabST.innerText = dict.changeTabSoldout;
  const chgTabSS = document.getElementById("i18n-change-tab-soldout-sub");
  if (chgTabSS) chgTabSS.innerText = dict.changeTabSoldoutSub;
  const origTL = document.getElementById("i18n-orig-time-label");
  if (origTL) origTL.innerText = dict.origTimeLabel;
  const calcSub = document.getElementById("i18n-calc-sub");
  if (calcSub) calcSub.innerText = dict.calcFromNowSub;
  const chgQuick = document.getElementById("i18n-change-quick-select");
  if (chgQuick) chgQuick.innerText = dict.changeQuickSelect;
  const soldT = document.getElementById("i18n-soldout-title");
  if (soldT) soldT.innerText = dict.soldoutTitle;
  const btnSoldClr = document.getElementById("btn-soldout-clear");
  if (btnSoldClr) btnSoldClr.innerText = dict.soldoutClear;
  const btnChgSnd = document.getElementById("btn-change-send");
  if (btnChgSnd) {
    const curVal = document.getElementById("change-note") ? document.getElementById("change-note").value : "";
    const reason = document.getElementById("change-reason") ? document.getElementById("change-reason").value : "";
    if (reason === "時間需調整" && curVal) {
      btnChgSnd.innerText = `${dict.btnSendSuggest} (${curVal})`;
    } else {
      btnChgSnd.innerText = dict.btnSendSuggest;
    }
  }
  const btnChgCan = document.getElementById("btn-change-cancel");
  if (btnChgCan) btnChgCan.innerText = dict.btnCancel;

  // Reject Modal
  const rejTitle = document.getElementById("i18n-reject-title");
  if (rejTitle) rejTitle.innerText = dict.rejectTitle;
  const rejR1T = document.getElementById("i18n-reject-r1-title");
  if (rejR1T) rejR1T.innerText = dict.rejectR1Title;
  const rejR1S = document.getElementById("i18n-reject-r1-sub");
  if (rejR1S) rejR1S.innerText = dict.rejectR1Sub;
  const rejR2T = document.getElementById("i18n-reject-r2-title");
  if (rejR2T) rejR2T.innerText = dict.rejectR2Title;
  const rejR2S = document.getElementById("i18n-reject-r2-sub");
  if (rejR2S) rejR2S.innerText = dict.rejectR2Sub;
  const rejR3T = document.getElementById("i18n-reject-r3-title");
  if (rejR3T) rejR3T.innerText = dict.rejectR3Title;
  const rejR3S = document.getElementById("i18n-reject-r3-sub");
  if (rejR3S) rejR3S.innerText = dict.rejectR3Sub;
  const rejR4T = document.getElementById("i18n-reject-r4-title");
  if (rejR4T) rejR4T.innerText = dict.rejectR4Title;
  const rejR4S = document.getElementById("i18n-reject-r4-sub");
  if (rejR4S) rejR4S.innerText = dict.rejectR4Sub;
  const btnRejCnf = document.getElementById("btn-reject-confirm");
  if (btnRejCnf) btnRejCnf.innerText = dict.btnConfirmReject;
  const btnRejCan = document.getElementById("btn-reject-cancel");
  if (btnRejCan) btnRejCan.innerText = dict.btnBack;

  // Settings
  const setT = document.getElementById("i18n-settings-title");
  if (setT) setT.innerText = dict.settingsTitle;
  const setStT = document.getElementById("i18n-setting-store-status-title");
  if (setStT) setStT.innerText = dict.settingStoreStatusTitle;
  const setStS = document.getElementById("i18n-setting-store-status-sub");
  if (setStS) setStS.innerText = dict.settingStoreStatusSub;
  const boxOpenT = document.getElementById("i18n-box-open-title");
  if (boxOpenT) boxOpenT.innerText = dict.boxOpenTitle;
  const boxOpenD = document.getElementById("i18n-box-open-desc");
  if (boxOpenD) boxOpenD.innerText = dict.boxOpenDesc;
  const boxBusyT = document.getElementById("i18n-box-busy-title");
  if (boxBusyT) boxBusyT.innerText = dict.boxBusyTitle;
  const boxBusyD = document.getElementById("i18n-box-busy-desc");
  if (boxBusyD) boxBusyD.innerText = dict.boxBusyDesc;
  const boxPausedT = document.getElementById("i18n-box-paused-title");
  if (boxPausedT) boxPausedT.innerText = dict.boxPausedTitle;
  const boxPausedD = document.getElementById("i18n-box-paused-desc");
  if (boxPausedD) boxPausedD.innerText = dict.boxPausedDesc;

  // Store Status Dropdown
  const stMenuH = document.getElementById("i18n-status-menu-header");
  if (stMenuH) stMenuH.innerText = dict.statusMenuHeader;
  const stOptOpenT = document.getElementById("i18n-status-opt-open");
  if (stOptOpenT) stOptOpenT.innerText = dict.statusOptOpenTitle;
  const stOptOpenD = document.getElementById("i18n-status-desc-open");
  if (stOptOpenD) stOptOpenD.innerText = dict.statusOptOpenDesc;
  const stOptBusyT = document.getElementById("i18n-status-opt-busy");
  if (stOptBusyT) stOptBusyT.innerText = dict.statusOptBusyTitle;
  const stOptBusyD = document.getElementById("i18n-status-desc-busy");
  if (stOptBusyD) stOptBusyD.innerText = dict.statusOptBusyDesc;
  const stOptPausedT = document.getElementById("i18n-status-opt-paused");
  if (stOptPausedT) stOptPausedT.innerText = dict.statusOptPausedTitle;
  const stOptPausedD = document.getElementById("i18n-status-desc-paused");
  if (stOptPausedD) stOptPausedD.innerText = dict.statusOptPausedDesc;

  if (typeof renderStoreStatusUI === "function" && typeof currentStoreStatus !== "undefined") {
    renderStoreStatusUI(currentStoreStatus);
  }

  const ordMT = document.getElementById("i18n-ordermode-title");
  if (ordMT) ordMT.innerText = dict.orderModeTitle;
  const ordMS = document.getElementById("i18n-ordermode-sub");
  if (ordMS) ordMS.innerText = dict.orderModeSub;
  const btnSavePick = document.getElementById("btn-save-pickup-setting");
  if (btnSavePick) btnSavePick.innerText = dict.btnSaveSetting;
  const modeSchT = document.getElementById("i18n-mode-scheduled-title");
  if (modeSchT) modeSchT.innerText = dict.modeScheduledTitle;
  const modeSchS = document.getElementById("i18n-mode-scheduled-sub");
  if (modeSchS) modeSchS.innerText = dict.modeScheduledSub;
  const modeAsapT = document.getElementById("i18n-mode-asap-title");
  if (modeAsapT) modeAsapT.innerText = dict.modeAsapTitle;
  const modeAsapS = document.getElementById("i18n-mode-asap-sub");
  if (modeAsapS) modeAsapS.innerText = dict.modeAsapSub;
  const hrsT = document.getElementById("i18n-hours-title");
  if (hrsT) hrsT.innerText = dict.hoursTitle;
  const btnSaveHrs = document.getElementById("btn-save-hours");
  if (btnSaveHrs) btnSaveHrs.innerText = dict.btnSaveHours;
}
