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
    tabReports: "報表",
    tabSound: "測試音效",
    tabPrinter: "印表機",
    tabMenu: "菜單",
    tabSettings: "設定",
    headerStore: "門市: ",
    headerSwitch: "(切換)",
    reportsTitle: "餐點銷量與營收分析",
    reportsSub: "即時統計門市各品項銷售數據與加料偏好",
    rangeToday: "今天",
    range7d: "近 7 天",
    range30d: "近 30 天",
    kpiTopItem: "熱銷第一名",
    kpiTotalSold: "總銷售份數",
    kpiTotalRevenue: "餐點總營收",
    kpiTotalOrders: "成交訂單數",
    revenueSub: "餐點銷售總額",
    completedOrdersSub: "已完成 / 已結帳",
    tableTitle: "品項銷售明細排行榜",
    colRank: "排名",
    colItem: "品項名稱",
    colCategory: "分類",
    colQuantity: "銷量",
    colSales: "營收",
    colRatio: "佔比",
    colOptions: "熱門加料與選項",
    itemUnit: "品項",
    portionUnit: "份",
    emptyReports: "此期間尚無銷售數據",
    panelLeftTitle: "待處理",
    panelLeftSub: "近 → 遠 (依取餐時間)",
    panelRightTitle: "已接單",
    panelRightSub: "製作中與等待取餐",
    loading: "載入中...",
    empty: "無訂單",
    emptyLivePendingTitle: "目前沒有待處理訂單",
    emptyLivePendingSub: "新進訂單將即時推播並顯示於此",
    emptyLiveAcceptedTitle: "目前無製作中訂單",
    emptyLiveAcceptedSub: "已接單的餐點將在此顯示製作進度",
    badgeNewOrder: "新訂單",
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
    badgePaid: "已結帳",
    badgeRejected: "已取消",
    btnReview: "Review 訂單",
    btnReady: "準備好了",
    btnPickedUp: "已取餐",
    btnPaid: "已結帳",
    btnWaitingReply: "等待客戶回覆",
    btnView: "查看",
    defaultCustomer: "顧客",
    processing: "處理中...",
    processFail: "處理失敗，請稍後再試。",
    // Time & ETA
    pickupLabel: "取餐:",
    tileItemCount: "{count} 項",
    etaArrived: "已到 / {min} 分鐘前",
    etaMinutes: "剩 {min} 分鐘",
    etaHours: "剩 {h} 小時 {m} 分",
    dineInElapsedJustNow: "剛剛下單",
    dineInElapsedMinutes: "{min} 分鐘前下單",
    dineInElapsedHours: "{h} 小時 {m} 分前下單",
    dineInAppendedJustNow: "剛剛加點",
    dineInAppendedMinutes: "{min} 分鐘前加點",
    dineInAppendedHours: "{h} 小時 {m} 分前加點",
    dineInTimeLabel: "點餐時間",
    dineInAppendedTimeLabel: "加點時間",
    dineInElapsedHeader: "下單進度",
    // Alert modal
    alertTitle: "{count} 單 新訂單",
    alertTitleAppend: "{count} 單 現場加點",
    alertTitleCombined: "{newCount} 單新訂單，{appendCount} 單現場加點",
    alertSub: "點擊 “Review 訂單” 查看詳情並接單",
    alertSubAppend: "桌號：{tables} 剛加點新品項，請盡速製作",
    alertBtnReview: "審核訂單",
    alertBtnDismiss: "暫時隱藏",
    // Review Modal
    reviewTitle: "訂單詳情",
    reviewTitleNew: "審核訂單",
    labelOrder: "訂單編號",
    labelCustomer: "LINE 顧客",
    labelPickup: "取餐時間",
    labelEta: "剩餘時間",
    labelTotal: "總金額",
    labelStatus: "狀態",
    labelDiningOption: "用餐方式",
    labelOrderItems: "餐點明細",
    statusPillNew: "待處理",
    statusPillAccepted: "製作中",
    statusPillDone: "待取餐",
    statusPillPicked: "已取餐",
    statusPillPaid: "已結帳",
    statusPillWaiting: "待客人確認",
    statusPillRejected: "已取消",
    customerNoteLabel: "顧客備註",
    flavorTitle: "口味與客製設定",
    customerChangeTitle: "顧客換單 / 特殊需求",
    viewRawOrder: "查看原始訂單內容",
    hideRawOrder: "收起原始內容",
    printToolsLabel: "出單與列印工具",
    rawOrderTitle: "原始訂單文字（Raw Data）",
    btnCopy: "複製",
    copySuccess: "已複製",
    btnPrintStickerShort: "印貼紙",
    itemPreparedBadge: "已完成",
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
    settingsSub: "門市營運參數、出單列印與設備偏好",
    settingsSyncStatus: "雲端即時同步",
    tocSettingsTitle: "設定目錄",
    tocSettingsSub: "系統與門市參數",
    tocStoreStatus: "門市接單狀態",
    tocOrderMode: "點餐取餐模式",
    tocHours: "營業時間設定",
    tocAddress: "門市地址設定",
    tocLogo: "門市 Logo",
    settingStoreStatusTitle: "門市接單狀態",
    settingStoreStatusSub: "隨時切換一般營業、繁忙延後或暫停接單模式",
    boxOpenTitle: "正常營業",
    boxOpenDesc: "正常接收新訂單，依照標準預約或排隊時間",
    boxBusyTitle: "門市繁忙 (+1小時)",
    boxBusyDesc: "新訂單自動延長 1 小時製作時間",
    boxPausedTitle: "暫停接單",
    boxPausedDesc: "暫停接收新訂單，顧客端無法下單",
    statusOpen: "營業中",
    statusBusy: "繁忙中 (+1小時)",
    statusPaused: "暫停接單",
    statusMenuHeader: "門市接單狀態",
    statusOptOpenTitle: "營業中",
    statusOptOpenDesc: "正常接單，顧客依一般時間預約",
    statusOptBusyTitle: "繁忙中 (+1小時)",
    statusOptBusyDesc: "新訂單製作時間自動延長 1 小時",
    statusOptPausedTitle: "暫停接單",
    statusOptPausedDesc: "暫停接收新訂單，顧客端無法下單",
    orderModeTitle: "點餐模式 / 取餐時間設定",
    orderModeSub: "自訂允許顧客預約時間或現場排隊即時製作 (ASAP)",
    btnSaveSetting: "儲存設定",
    modeScheduledTitle: "允許預約取餐",
    modeScheduledSub: "顧客可在點餐頁面自選取餐日期與時間，適合預先排程準備餐點的店家。",
    modeAsapTitle: "關閉預約 - 即時排隊製作模式",
    modeAsapSub: "隱藏預約時間選項。顧客下單後將立即依照現場排隊順序製作 (ASAP)。",
    hoursTitle: "營業時間設定",
    hoursSub: "設定每日營業時段與公休日",
    btnSaveHours: "儲存時間",
    settingAddressTitle: "門市地址",
    settingAddressSub: "顯示於顧客點餐頁面與 LINE 官方帳號回覆",
    settingAddressPlaceholder: "請輸入門市地址",
    btnSaveAddress: "儲存地址",
    tocAnnouncement: "門市公告設定",
    settingAnnouncementTitle: "門市公告設定",
    settingAnnouncementSub: "顯示於顧客點餐頁面 Header 最下方，留空則自動隱藏",
    settingAnnouncementPlaceholder: "請輸入門市公告（例如：今日特餐全面 9 折 / 國定假日公休公告...）",
    btnSaveAnnouncement: "儲存公告",
    settingLogoTitle: "門市 Logo",
    settingLogoSub: "顯示於顧客點餐頁面頂部與 POS 系統",
    btnChooseLogo: "選擇圖片",
    logoHint: "支援 PNG, JPG, WebP 格式（建議正方形 512x512px 以達最佳效果）",
    btnSaveLogo: "儲存 Logo",
    btnDeleteLogo: "刪除 Logo",
    logoUploadPrompt: "請先選擇要上傳的 Logo 圖片",
    confirmDeleteLogo: "確定要刪除門市 Logo 嗎？",
    logoDeleteSuccess: "已成功移除門市 Logo！",
    btnAddShift: "+ 新增時段",
    closedDay: "公休",
    saving: "儲存中...",
    saveSuccess: "設定儲存成功！",
    saveFail: "儲存失敗：",
    // Printer Settings
    btnPrint: "列印",
    btnReprint: "補印",
    tocPrinter: "出單與印表機",
    settingPrinterTitle: "出單與印表機設定 (ESC/POS)",
    settingPrinterSub: "設定 Wi-Fi / LAN 區域網路熱感應出單機 (Port 9100) 與自動列印模式",
    printerAutoPrintTitle: "新訂單自動列印 (Auto-Print)",
    printerAutoPrintDesc: "當系統收到新訂單時，自動出單至已啟用的印表機",
    printerCashierTitle: "櫃檯印表機 (客人聯)",
    printerCashierDesc: "出明細發票、含金額、客製化與 QR Code",
    printerKitchenTitle: "出餐/廚房標籤機 (廚房聯)",
    printerKitchenDesc: "大字號、桌號、備註清單、不顯示金額",
    printerInterfaceLabel: "連線方式",
    printerInterfaceNetwork: "區域網路 / Wi-Fi (TCP/IP)",
    printerInterfaceBluetooth: "藍牙無線 (Bluetooth SPP)",
    printerEnableLabel: "啟用",
    printerBtDeviceLabel: "已配對藍牙裝置",
    printerBtSelectPlaceholder: "-- 請選擇已配對的藍牙印表機 --",
    printerBtDevicePlaceholder: "-- 請選擇已配對的藍牙印表機 --",
    printerBtRefreshBtn: "重新整理",
    printerBtNoDevices: "未發現已配對裝置，請先至 Android 設定中完成配對",
    printerIpLabel: "IP 位址 (LAN / Wi-Fi)",
    printerPortLabel: "Port 端口",
    printerPaperLabel: "紙張規格",
    printerPaper80: "80mm (標準大票)",
    printerPaper58: "58mm (小票)",
    printerProtocolLabel: "列印指令協定 (Protocol)",
    printerOptEscPos: "ESC/POS (收據/小票 58-80mm)",
    printerOptTspl: "TSPL (貼紙/標籤機 如 Aimo D520BT, Xprinter)",
    printerTsplSizeLabel: "標籤紙張尺寸",
    printerOptTspl100x150: "100 x 150 mm (4x6\" 貨運/大袋貼紙)",
    printerOptTspl76x130: "76 x 130 mm (3x5\" 訂單明細貼紙)",
    printerOptTspl50x30: "50 x 30 mm (餐盒/單品標籤)",
    printerOptTspl40x30: "40 x 30 mm (飲料杯貼/單品標籤)",
    printerOptTsplCustom: "自訂尺寸 (Custom mm)",
    printerTsplWidthLabel: "寬度 (mm)",
    printerTsplHeightLabel: "高度 (mm)",
    printerTsplModeLabel: "標籤列印模式",
    printerOptTsplModeSummary: "訂單總表貼紙 (1張/每張訂單)",
    printerOptTsplModeItems: "單品/杯貼標籤 (1張/每份餐點)",
    printerTsplDpiLabel: "解析度 (DPI)",
    printerOptTsplDpi203: "203 DPI (8 dots/mm - 標準)",
    printerOptTsplDpi300: "300 DPI (11.8 dots/mm - 高解析度)",
    printerTsplXOffsetLabel: "水平邊距 X (mm)",
    printerTsplYOffsetLabel: "垂直邊距 Y (mm)",
    btnTestPrint: "測試列印 (Test Print)",
    btnSavePrinterSettings: "儲存印表機設定",
    // Print Mode Settings (Auto vs Manual)
    printModeTitle: "列印出單模式",
    printModeSub: "選擇新訂單進來時的列印行為",
    printModeAutoTitle: "自動列印模式 (Auto-print)",
    printModeAutoDesc: "收到新訂單時，系統發出提示音並自動列印全部明細 (Bill) 與標籤貼紙 (Tem)，無需觸碰螢幕。適合尖峰繁忙時段。",
    printModeManualTitle: "手動列印模式 (Manual-print)",
    printModeManualDesc: "店員須在螢幕點選 [整單全印] 機器才會出單。適合需要先核對確認訂單的門市。",
    // 3 Print Levels
    btnPrintFullOrder: "整單全印 (1 聯收銀 + {n} 張貼紙)",
    btnPrintBillOnly: "僅印收銀明細",
    btnPrintCustomOption: "補印客製標籤",
    btnPrintSingleItem: "印此品項貼紙",
    itemPrepared: "已完成",
    markPrepared: "標記已出餐",
    printSingleItemSuccess: "已列印「{name}」貼紙！",
    // Quick Sticker / Emergency Note Modal
    quickStickerModalTitle: "補印客製標籤 (緊急貼紙)",
    quickStickerModalSub: "點擊下方常見選項，立即列印 1 張獨立備註貼紙粘貼於餐點上：",
    quickStickerCustomLabel: "或輸入自訂備註文字：",
    quickStickerCustomPlaceholder: "輸入自訂備註 (例如：少冰、不要酸菜)...",
    quickStickerCustomPrintBtn: "列印此備註",
    quickStickerPrinting: "正在列印備註貼紙...",
    quickStickerSuccess: "已出標籤: 「{text}」！",
    quickStickerLoading: "正在載入選項...",
    quickStickerGroupSpice: "辣度選項",
    quickStickerGroupVeggie: "蔥花與香菜",
    quickStickerGroupIceSugar: "甜度與冰量",
    quickStickerGroupKitchen: "出餐與分裝",
    // Printer Usage Guide
    printerGuideTitle: "出單與印表機功能使用指南",
    printerGuideSub: "深入了解自動出單、單據規格與 3 段式列印操作技巧",
    btnPrinterGuide: "出單指南",
    btnViewPrinterGuide: "查看完整指南",
    btnCloseGuide: "我知道了",
    printerGuideStripTitle: "需要了解自動出單、雙機搭配或 3 段式列印技巧？",
    printerGuideModeTitle: "1. 列印出單模式說明 (Auto vs. Manual)",
    printerGuideModeAutoTitle: "自動列印模式 (Auto-print)",
    printerGuideModeAutoDesc: "當客人送出訂單後，系統立即發出提示音並自動列印「1 張收銀明細」與「全部餐點貼紙」，適合尖峰繁忙時段，省去店員手動點選步驟。",
    printerGuideModeManualTitle: "手動列印模式 (Manual-print)",
    printerGuideModeManualDesc: "收到新單時僅發出通知音，店員需點進訂單詳細頁確認餐點內容後，點選 [整單全印] 才會出單。適合需先確認庫存或客製化說明的門市。",
    printerGuideLevelsTitle: "2. 訂單詳細頁 3 段式列印控制",
    printerGuideLevelFullTitle: "整單全印 (1 聯收銀 + N 張貼紙)",
    printerGuideLevelFullDesc: "一鍵送出：1 張櫃檯明細 (給客人或留底) + N 張廚房貼紙 (每份餐點 1 張獨立杯貼/盒貼)。",
    printerGuideLevelBillTitle: "僅印收銀明細 (Bill)",
    printerGuideLevelBillDesc: "僅出單張收據小票，適合結帳找零、補開客人明細或退換貨核對。",
    printerGuideLevelSingleTitle: "單品貼紙列印與備餐勾選",
    printerGuideLevelSingleDesc: "每道餐點左側設有 [ ] 勾選方塊供廚房備餐核對；右側設有 [印單品貼紙] 鈕，遇卡紙或貼紙破損時可單獨補印該品項。",
    printerGuideLevelCustomTitle: "補印客製/緊急貼紙",
    printerGuideLevelCustomDesc: "點開可快選常見備註 (如：不要香菜、去冰、微辣) 或手動輸入特殊要求，立即印出獨立小貼紙貼在餐盒上。",
    printerGuideHardwareTitle: "3. 雙印表機 (Dual-Station) 建議設定",
    printerGuideHwCashier: "• 櫃檯印表機：建議使用 ESC/POS 協定熱感應小票機 (80mm 或 58mm)，連接 Wi-Fi (Port 9100) 或藍牙。",
    printerGuideHwKitchen: "• 廚房/吧台印表機：建議使用 TSPL 協定標籤貼紙機 (如 Aimo, Xprinter 40x30mm / 50x30mm)，模式選「單品/杯貼標籤」。",
    printerGuideHwTest: "• 每日開班前建議點選「測試列印」確認連線通暢。",
    // Menu Editor
    menuCatTitle: "菜單分類",
    menuCatSub: "點擊左側分類以管理品項",
    btnManageCategories: "管理分類",
    manageCategoriesTitle: "管理菜單分類",
    manageCategoriesSub: "拖曳調整分類順序，亦可新增或刪除分類",
    btnCloseManager: "✕ 關閉",
    btnAddCategory: "+ 新增分類",
    btnMenuAddCategory: "+ 新增分類",
    btnAddCategoryBottom: "+ 新增菜單分類",
    btnCategoryDelete: "刪除分類",
    btnCategoryRename: "重新命名",
    addCategoryModalTitle: "新增菜單分類",
    categoryNameLabel: "分類名稱",
    categoryNamePlaceholder: "例: 豆漿 意仁漿, 經典主食",
    categoryTypeLabel: "分類類型",
    categoryTypeCatalog: "菜單品項 (主餐 / 飲料)",
    categoryTypeModifier: "客製化選項 (加辣 / 加料 / 甜度)",
    confirmDeleteCategory: "確定要刪除整個「{name}」分類及其內部所有品項嗎？",
    promptCategoryNameEmpty: "請輸入有效的分類名稱！",
    promptCategoryNamePrompt: "請輸入新的分類名稱：",
    allowCustomizationLabel: "允許客製化選項 (加料 / 辣度 / 備註)",
    allowCustomizationDesc: "開啟後，顧客在點選此分類餐點時可選擇客製化設定",
    appliedModifiersTitle: "適用客製化選項",
    appliedModifiersDesc: "勾選顧客在點選此分類餐點時可使用的客製化選項 (預設為全部勾選)",
    btnSelectAll: "全選",
    btnUnselectAll: "清除 (全不選)",
    noModifiersInStore: "目前尚未建立任何客製化分類 (如加辣、加料等)",
    menuEditorTitle: "分類項目",
    menuEditSub: "拖曳排序 ✦ 點擊欄位直接修改",
    btnMenuRestore: "恢復預設菜單",
    btnMenuAddItem: "+ 新增項目",
    btnMenuSave: "儲存變更",
    btnMenuDirty: "儲存變更 (尚未儲存 *)",
    menuSelectPrompt: "請先從左側選擇分類",
    menuLoading: "載入菜單中...",
    menuItemTotalCount: "(全部 {count} 項)",
    menuItemUnit: "項",
    modifierPrefix: "[客製化]",
    stockStatusInStock: "🟢 正常供應",
    stockStatusOutOfStock: "🔴 暫時售完",
    btnItemImage: "📷 圖片",
    btnItemDelete: "刪除",
    confirmDeleteItem: "確定要刪除這個項目嗎？",
    newItemPlaceholder: "新項目",
    confirmSaveMenu: "確定要儲存所有變更嗎？這會直接即時影響顧客端點餐頁面。",
    menuSaving: "儲存中...",
    menuSaveSuccess: "菜單儲存成功！",
    menuSaveFail: "儲存失敗：",
    restoreOnlyBenmi: "恢復預設菜單功能目前僅支援 Benmi。",
    confirmRestoreMenu: "您確定要將菜單恢復為原始預設狀態嗎？所有已修改的項目都將被覆蓋！",
    restoreSuccess: "已成功恢復預設菜單！",
    restoreFail: "恢復菜單失敗：",
    menuLoadFail: "無法載入菜單資料：",
    priceHiddenPlaceholder: "隱藏",
    // Image Modal
    imageModalTitle: "圖片管理",
    imageModalItem: "圖片：{name}",
    imageChecking: "正在檢查圖片...",
    imageHasImage: "此品項已有圖片",
    imageNoImage: "此品項尚未設定圖片",
    imageLoadFail: "載入圖片失敗",
    btnImageSelect: "選擇圖片",
    btnImageDelete: "刪除圖片",
    imageUploading: "正在上傳圖片...",
    imageUploadSuccess: "圖片上傳成功！",
    imageUploadFail: "上傳圖片失敗：",
    confirmDeleteImage: "確定要刪除這張圖片嗎？",
    imageDeleting: "正在刪除圖片...",
    imageDeleteFail: "刪除圖片失敗：",
    // Stock Modal
    stockModalTitle: "庫存狀態設定",
    stockModalItem: "庫存設定：{name}",
    stockLabelStatus: "狀態：",
    stockOptInStock: "🟢 正常供應 (In Stock)",
    stockOptOutOfStock: "🔴 暫時售完 (Out of Stock)",
    stockLabelDuration: "售完時限：",
    stockOptToday: "今日 (明日凌晨 4:00 自動恢復)",
    stockOptMultipleDays: "指定日期 (選擇恢復日期)",
    stockOptIndefinite: "無限期 (手動恢復)",
    stockLabelDate: "恢復供應日期：",
    btnStockSave: "儲存變更",
    alertSelectOosDate: "請選擇恢復供應日期！",
    stockUpdateFail: "庫存狀態更新失敗：",
    // Dining Options & Filter
    diningOption: "用餐方式",
    takeaway: "外帶",
    dineIn: "內用",
    filterAll: "全部",
    filterTakeaway: "外帶",
    filterDineIn: "內用",
    badgeTakeaway: "外帶",
    badgeDineIn: "內用",
    tableNumber: "桌號",
    tableNumberLabel: "桌號：",
    labelDiningOption: "用餐方式",
    printDineIn: "【內用】",
    printTakeaway: "【外帶】",
    // Dine In Setting
    tocDineIn: "內用接單模式",
    settingDineInTitle: "內用接單設定",
    settingDineInSub: "自訂是否允許顧客選擇「內用」或僅接受「外帶」",
    settingDineInTrueTitle: "開啟內用與外帶 (預設)",
    settingDineInTrueSub: "顧客可在點餐頁面自由切換「外帶」或「內用」模式。",
    settingDineInFalseTitle: "僅限外帶 (關閉內用)",
    settingDineInFalseSub: "隱藏內用選項，所有訂單一律為外帶自取。",
    btnSaveDineInSetting: "儲存設定",
    dineInSaveSuccess: "內用設定已成功儲存！",
    dineInSaveFail: "內用設定儲存失敗：",
    featureLockedTitle: "進階功能 (未啟用)",
    featureLockedDesc: "此功能為 BLAB 進階模組，如需啟用「內用接單」請聯繫 BLAB 團隊升級方案。",
    btnContactUpgrade: "聯繫升級方案",
    // Language & Reports Settings
    tocLanguage: "介面語言",
    tocReports: "銷量與營收報表",
    settingLangTitle: "系統介面語言",
    settingLangSub: "設定 POS 系統的操作與顯示語言",
    settingReportsTitle: "銷量與營收報表",
    settingReportsSub: "查看門市餐點銷售統計、營收排行與加料偏好",
    reportsUnlockedName: "即時餐點銷量與營收分析",
    reportsUnlockedDesc: "依時間區間（今日、近7天、近30天）統計門市各品項銷售數量、營收總額及顧客加料分析。",
    btnOpenReports: "查看銷量報表",
    reportsLockedTitle: "進階功能 (未啟用)",
    reportsLockedDesc: "此功能為 BLAB 進階模組，如需啟用「銷量與營收報表分析」請聯繫 BLAB 團隊升級方案。",
    btnBackToSettings: "← 返回設定",
    // Multi-Round Append Orders
    badgeAppendRound: "第 {n} 輪",
    badgeAppendShort: "加點",
    roundBlockTitle: "第 {n} 輪餐點",
    roundBlockLatest: "最新加點",
    roundBlockInitial: "第 1 輪 (最初點餐)",
    alertNewAppended: "🔔 桌號 {table} (單號 #{key}) 有新加點餐點！",
    // Store Pairing & Activation (Universal Multi-Tenant POS)
    tocStorePairing: "門市終端綁定",
    settingPairingTitle: "門市終端與設備綁定",
    settingPairingSub: "管理此平板電腦與雲端門市之連線設定",
    pairingTenantLabel: "當前綁定門市代碼",
    pairingStatusLabel: "終端連線狀態",
    pairingStatusConnected: "已連線運作中",
    unlinkTitle: "解除此設備綁定 / 切換門市",
    unlinkDesc: "解除後此終端機將停止同步該門市訂單，需輸入管理 PIN 碼確認。",
    btnUnlinkStore: "切換門市 / 解除綁定",
    modalActivationTitle: "門市終端啟用",
    modalActivationSub: "請輸入門市代碼與管理 PIN 碼以綁定此終端設備",
    activationTenantLabel: "門市代碼 (Tenant ID)",
    activationTenantPlaceholder: "例如: bsc, benmi...",
    activationPinLabel: "管理 PIN 碼",
    activationPinPlaceholder: "預設 12345678",
    btnSubmitActivation: "啟用終端並開始接單",
    btnVerifying: "正在驗證中...",
    activationErrorInvalid: "門市代碼或管理 PIN 碼錯誤，請重新確認。",
    activationErrorTenantNotFound: "門市代碼不存在或已停用，請重新確認。",
    activationErrorWrongPin: "管理 PIN 碼錯誤，請重新確認。",
    activationErrorRequired: "請完整填寫門市代碼與管理 PIN 碼。",
    activationErrorNetwork: "連線驗證失敗，請檢查網路連線後重試。",
    promptUnlinkPin: "請輸入門市管理 PIN 碼以解除綁定：",
    unlinkSuccess: "已成功解除設備綁定！即將返回門市啟用畫面。",
    unlinkWrongPin: "管理 PIN 碼錯誤，無法解除綁定。",
    unpaired: "未綁定"
  },
  "vi": {
    langBtn: "Tiếng Việt",
    brandTitle: "Benmi Dashboard",
    brandSub: "Đơn hàng trực tiếp",
    tabLive: "Trực tiếp",
    tabHistory: "Lịch sử",
    tabReports: "Báo cáo",
    tabSound: "Thử âm thanh",
    tabPrinter: "Máy in",
    tabMenu: "Thực đơn",
    tabSettings: "Cài đặt",
    headerStore: "Quán: ",
    headerSwitch: "(Đổi)",
    reportsTitle: "Phân tích doanh số & Doanh thu món",
    reportsSub: "Thống kê thời gian thực doanh số từng món và tùy biến",
    rangeToday: "Hôm nay",
    range7d: "7 ngày qua",
    range30d: "30 ngày qua",
    kpiTopItem: "Top 1 Bán chạy nhất",
    kpiTotalSold: "Tổng phần đã bán",
    kpiTotalRevenue: "Tổng doanh thu món",
    kpiTotalOrders: "Tổng đơn thành công",
    revenueSub: "Doanh thu món bán",
    completedOrdersSub: "Đã xong / Đã thanh toán",
    tableTitle: "Bảng xếp hạng chi tiết món bán",
    colRank: "Hạng",
    colItem: "Tên món",
    colCategory: "Danh mục",
    colQuantity: "Số lượng",
    colSales: "Doanh thu",
    colRatio: "Tỷ trọng",
    colOptions: "Tùy chọn / Topping chọn nhiều",
    itemUnit: "món",
    portionUnit: "phần",
    emptyReports: "Không có dữ liệu bán hàng trong khoảng thời gian này",
    panelLeftTitle: "Chờ xử lý",
    panelLeftSub: "Gần → xa (theo giờ lấy)",
    panelRightTitle: "Đã nhận đơn",
    panelRightSub: "Đang làm & Chờ khách lấy",
    loading: "Đang tải...",
    empty: "Chưa có đơn",
    emptyLivePendingTitle: "Không có đơn chờ xử lý",
    emptyLivePendingSub: "Đơn mới sẽ tự động hiển thị và đổ chuông tại đây",
    emptyLiveAcceptedTitle: "Không có đơn đang thực hiện",
    emptyLiveAcceptedSub: "Các đơn đã nhận sẽ hiển thị tiến độ tại đây",
    badgeNewOrder: "ĐƠN MỚI",
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
    badgePaid: "ĐÃ THANH TOÁN",
    badgeRejected: "ĐÃ HỦY",
    btnReview: "Xem đơn",
    btnReady: "Đã xong",
    btnPickedUp: "Đã lấy",
    btnPaid: "Đã thanh toán",
    btnWaitingReply: "Chờ khách phản hồi",
    btnView: "Xem",
    defaultCustomer: "Khách",
    processing: "Đang xử lý...",
    processFail: "Xử lý thất bại, vui lòng thử lại sau.",
    // Time & ETA
    pickupLabel: "Lấy:",
    tileItemCount: "{count} món",
    etaArrived: "Đã đến / {min} phút trước",
    etaMinutes: "Còn {min} phút",
    etaHours: "Còn {h} giờ {m} phút",
    dineInElapsedJustNow: "Vừa gửi đơn",
    dineInElapsedMinutes: "Gửi đơn {min} phút trước",
    dineInElapsedHours: "Gửi đơn {h} giờ {m} phút trước",
    dineInAppendedJustNow: "Vừa gọi thêm",
    dineInAppendedMinutes: "Gọi thêm {min} phút trước",
    dineInAppendedHours: "Gọi thêm {h} giờ {m} phút trước",
    dineInTimeLabel: "Thời gian gửi đơn",
    dineInAppendedTimeLabel: "Thời gian gọi thêm",
    dineInElapsedHeader: "Thời gian đã qua",
    // Alert modal
    alertTitle: "{count} Đơn hàng mới",
    alertTitleAppend: "{count} Đơn gọi thêm món",
    alertTitleCombined: "{newCount} đơn mới, {appendCount} đơn gọi thêm",
    alertSub: "Nhấn “Xem đơn” để xem chi tiết và nhận đơn",
    alertSubAppend: "Bàn: {tables} vừa gọi thêm món, vui lòng chuẩn bị",
    alertBtnReview: "Xem đơn",
    alertBtnDismiss: "Tạm ẩn",
    // Review Modal
    reviewTitle: "Chi tiết đơn hàng",
    reviewTitleNew: "Duyệt đơn hàng",
    labelOrder: "Mã đơn",
    labelCustomer: "Khách LINE",
    labelPickup: "Giờ lấy",
    labelEta: "Thời gian còn",
    labelTotal: "Tổng tiền",
    labelStatus: "Trạng thái",
    labelDiningOption: "Hình thức phục vụ",
    labelOrderItems: "Danh sách món",
    statusPillNew: "Chờ xử lý",
    statusPillAccepted: "Đang làm",
    statusPillDone: "Chờ lấy",
    statusPillPicked: "Đã lấy",
    statusPillPaid: "Đã thanh toán",
    statusPillWaiting: "Chờ khách xác nhận",
    statusPillRejected: "Đã hủy",
    customerNoteLabel: "Ghi chú từ khách",
    flavorTitle: "Tùy chọn hương vị & Khẩu vị",
    customerChangeTitle: "Yêu cầu đổi món / Ghi chú đặc biệt",
    viewRawOrder: "Xem toàn văn đơn gốc",
    hideRawOrder: "Thu gọn đơn gốc",
    printToolsLabel: "Công cụ in ấn & Tem nhãn",
    rawOrderTitle: "Dữ liệu đơn hàng gốc (Raw Data)",
    btnCopy: "Sao chép",
    copySuccess: "Đã sao chép",
    btnPrintStickerShort: "In tem",
    itemPreparedBadge: "Đã xong",
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
    changeTabTimeSub: "Đề xuất dời giờ lấy món",
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
    settingsSub: "Thông số vận hành, in ấn hoá đơn và thiết bị quầy",
    settingsSyncStatus: "Đồng bộ đám mây",
    tocSettingsTitle: "Mục lục cài đặt",
    tocSettingsSub: "Cấu hình hệ thống",
    tocStoreStatus: "Trạng thái nhận đơn",
    tocOrderMode: "Chế độ nhận đơn",
    tocHours: "Giờ hoạt động",
    tocAddress: "Địa chỉ cửa hàng",
    tocLogo: "Logo cửa hàng",
    settingStoreStatusTitle: "Trạng thái nhận đơn",
    settingStoreStatusSub: "Chuyển đổi linh hoạt giữa Mở quán, Đang bận (+1h) hoặc Tạm dừng nhận đơn",
    boxOpenTitle: "Mở quán",
    boxOpenDesc: "Nhận đơn bình thường theo thời gian hẹn hoặc xếp hàng",
    boxBusyTitle: "Đang bận (+1 giờ)",
    boxBusyDesc: "Tự động cộng thêm 1 giờ cho mỗi đơn mới",
    boxPausedTitle: "Tạm dừng nhận đơn",
    boxPausedDesc: "Tạm dừng nhận đơn mới, khách không thể gửi đơn",
    statusOpen: "Đang mở quán",
    statusBusy: "Đang bận (+1 giờ)",
    statusPaused: "Tạm dừng nhận đơn",
    statusMenuHeader: "Trạng thái nhận đơn",
    statusOptOpenTitle: "Mở quán",
    statusOptOpenDesc: "Nhận đơn mới bình thường theo thời gian chuẩn",
    statusOptBusyTitle: "Đang bận (+1 giờ)",
    statusOptBusyDesc: "Quán đang bận, tự động kéo dài thời gian làm thêm 1 tiếng cho mỗi đơn mới",
    statusOptPausedTitle: "Tạm dừng nhận đơn",
    statusOptPausedDesc: "Tạm dừng nhận đơn mới, khách hàng không thể gửi đơn",
    orderModeTitle: "Chế độ nhận đơn & Hẹn giờ",
    orderModeSub: "Tùy chỉnh cho phép khách hẹn giờ lấy hoặc nhận đơn làm ngay xếp theo thứ tự (ASAP)",
    btnSaveSetting: "Lưu thiết lập",
    modeScheduledTitle: "Bật hẹn giờ lấy món",
    modeScheduledSub: "Khách hàng có thể tự chọn ngày và giờ muốn đến lấy món trên trang đặt hàng. Thích hợp với các quán chuẩn bị theo giờ hẹn của khách.",
    modeAsapTitle: "Tắt hẹn giờ - Nhận đơn làm ngay theo hàng đợi (ASAP)",
    modeAsapSub: "Ẩn mục chọn ngày giờ. Khách đặt xong đơn sẽ được tiếp nhận và xử lý làm ngay theo thứ tự xếp hàng (ASAP).",
    hoursTitle: "Giờ hoạt động",
    hoursSub: "Cài đặt khung giờ mở cửa và ngày nghỉ định kỳ",
    btnSaveHours: "Lưu thời gian",
    settingAddressTitle: "Địa chỉ cửa hàng",
    settingAddressSub: "Hiển thị trên trang đặt món của khách và tin nhắn tự động LINE",
    settingAddressPlaceholder: "Nhập địa chỉ cửa hàng",
    btnSaveAddress: "Lưu địa chỉ",
    tocAnnouncement: "Thông báo cửa hàng",
    settingAnnouncementTitle: "Thông báo của quán",
    settingAnnouncementSub: "Hiển thị dưới cùng của Header trên trang đặt món của khách, để trống sẽ tự động ẩn",
    settingAnnouncementPlaceholder: "Nhập thông báo cửa hàng (ví dụ: Hôm nay có món mới / Nghỉ lễ 2/9...)",
    btnSaveAnnouncement: "Lưu thông báo",
    settingLogoTitle: "Logo cửa hàng",
    settingLogoSub: "Hiển thị ở đầu trang đặt món của khách và hệ thống POS",
    btnChooseLogo: "Chọn ảnh",
    logoHint: "Hỗ trợ định dạng PNG, JPG, WebP (Khuyến nghị hình vuông 512x512px)",
    btnSaveLogo: "Lưu Logo",
    btnDeleteLogo: "Xóa Logo",
    logoUploadPrompt: "Vui lòng chọn ảnh Logo trước khi lưu",
    confirmDeleteLogo: "Bạn có chắc muốn xóa Logo cửa hàng không?",
    logoDeleteSuccess: "Đã xóa Logo cửa hàng thành công!",
    btnAddShift: "+ Thêm khung giờ",
    closedDay: "Nghỉ",
    saving: "Đang lưu...",
    saveSuccess: "Đã lưu thiết lập thành công!",
    saveFail: "Lưu thất bại: ",
    // Menu Editor
    menuCatTitle: "Danh mục thực đơn",
    menuCatSub: "Chọn danh mục bên trái để quản lý món",
    btnManageCategories: "Quản lý phân loại",
    manageCategoriesTitle: "Quản lý phân loại thực đơn",
    manageCategoriesSub: "Kéo thả để đổi thứ tự, thêm mới hoặc xóa phân loại",
    btnCloseManager: "✕ Đóng",
    btnAddCategory: "+ Thêm phân loại",
    btnMenuAddCategory: "+ Thêm phân loại",
    btnAddCategoryBottom: "+ Thêm phân loại mới",
    btnCategoryDelete: "Xóa phân loại",
    btnCategoryRename: "Đổi tên phân loại",
    addCategoryModalTitle: "Thêm phân loại thực đơn mới",
    categoryNameLabel: "Tên phân loại",
    categoryNamePlaceholder: "VD: Đồ uống, Món chính",
    categoryTypeLabel: "Loại phân loại",
    categoryTypeCatalog: "Danh mục món (Món chính / Đồ uống)",
    categoryTypeModifier: "Tùy biến chọn kèm (Thêm cay / Topping)",
    confirmDeleteCategory: "Bạn có chắc muốn xóa toàn bộ phân loại「{name}」và các món bên trong không?",
    promptCategoryNameEmpty: "Vui lòng nhập tên phân loại hợp lệ!",
    promptCategoryNamePrompt: "Nhập tên phân loại mới:",
    allowCustomizationLabel: "Cho phép tùy chỉnh món (Topping / Độ cay / Ghi chú)",
    allowCustomizationDesc: "Khi bật, khách hàng có thể tùy chỉnh thêm topping, mức cay cho các món trong loại này",
    appliedModifiersTitle: "Tùy biến áp dụng cho loại này",
    appliedModifiersDesc: "Chọn các tùy biến khách hàng có thể chọn khi gọi món trong loại này (Mặc định chọn tất cả)",
    btnSelectAll: "Chọn tất cả",
    btnUnselectAll: "Bỏ chọn tất cả",
    noModifiersInStore: "Hiện tại quán chưa thiết lập nhóm tùy biến nào (như Thêm cay, Topping...)",
    menuEditorTitle: "Danh sách món",
    menuEditSub: "Kéo thả để sắp xếp ✦ Nhấn vào ô để sửa trực tiếp",
    btnMenuRestore: "Khôi phục Menu gốc",
    btnMenuAddItem: "+ Thêm món mới",
    btnMenuSave: "Lưu thay đổi",
    btnMenuDirty: "Lưu thay đổi (Chưa lưu *)",
    menuSelectPrompt: "Vui lòng chọn danh mục ở bên trái",
    menuLoading: "Đang tải thực đơn...",
    menuItemTotalCount: "(Tất cả {count} món)",
    menuItemUnit: "món",
    modifierPrefix: "[Tùy biến]",
    stockStatusInStock: "🟢 Còn hàng",
    stockStatusOutOfStock: "🔴 Hết hàng",
    btnItemImage: "📷 Ảnh",
    btnItemDelete: "Xóa",
    confirmDeleteItem: "Bạn có chắc muốn xóa món này không?",
    newItemPlaceholder: "Món mới",
    confirmSaveMenu: "Bạn có chắc chắn muốn lưu mọi thay đổi không? Thay đổi sẽ cập nhật ngay lập tức lên trang đặt hàng của khách.",
    menuSaving: "Đang lưu...",
    menuSaveSuccess: "Lưu thực đơn thành công!",
    menuSaveFail: "Lưu thất bại: ",
    restoreOnlyBenmi: "Tính năng khôi phục mặc định hiện chỉ áp dụng cho Benmi.",
    confirmRestoreMenu: "Bạn có chắc chắn muốn KHÔI PHỤC MENU về trạng thái gốc mặc định không? Tất cả các món bạn đã sửa sẽ bị ghi đè!",
    restoreSuccess: "Đã khôi phục menu gốc thành công!",
    restoreFail: "Khôi phục menu thất bại: ",
    menuLoadFail: "Không thể tải dữ liệu thực đơn: ",
    priceHiddenPlaceholder: "Ẩn",
    // Image Modal
    imageModalTitle: "Quản lý hình ảnh",
    imageModalItem: "Ảnh: {name}",
    imageChecking: "Đang kiểm tra ảnh...",
    imageHasImage: "Món này đã có ảnh",
    imageNoImage: "Món này chưa có ảnh",
    imageLoadFail: "Lỗi khi tải ảnh",
    btnImageSelect: "Chọn ảnh",
    btnImageDelete: "Xóa ảnh",
    imageUploading: "Đang tải ảnh lên...",
    imageUploadSuccess: "Tải ảnh thành công!",
    imageUploadFail: "Lỗi tải ảnh: ",
    confirmDeleteImage: "Bạn có chắc muốn xóa ảnh này không?",
    imageDeleting: "Đang xóa ảnh...",
    imageDeleteFail: "Lỗi xóa ảnh: ",
    // Stock Modal
    stockModalTitle: "Cài đặt trạng thái kho",
    stockModalItem: "Cài đặt kho: {name}",
    stockLabelStatus: "Trạng thái:",
    stockOptInStock: "🟢 Còn hàng (In Stock)",
    stockOptOutOfStock: "🔴 Hết hàng (Out of Stock)",
    stockLabelDuration: "Thời hạn hết hàng:",
    stockOptToday: "Hôm nay (Tự hồi phục lúc 4h sáng mai)",
    stockOptMultipleDays: "Nhiều ngày (Chọn ngày khôi phục)",
    stockOptIndefinite: "Vô thời hạn (Chờ mở thủ công)",
    stockLabelDate: "Ngày khôi phục bán:",
    btnStockSave: "Lưu thay đổi",
    alertSelectOosDate: "Vui lòng chọn ngày khôi phục bán!",
    stockUpdateFail: "Lỗi cập nhật trạng thái kho: ",
    // Dining Options & Filter
    diningOption: "Hình thức",
    takeaway: "Mang đi",
    dineIn: "Ăn tại quán",
    filterAll: "Tất cả",
    filterTakeaway: "Mang đi",
    filterDineIn: "Ăn tại quán",
    badgeTakeaway: "Mang đi",
    badgeDineIn: "Ăn tại quán",
    tableNumber: "Số bàn",
    tableNumberLabel: "Số bàn: ",
    labelDiningOption: "Hình thức",
    printDineIn: "【ĂN TẠI QUÁN】",
    printTakeaway: "【MANG ĐI】",
    // Dine In Setting
    tocDineIn: "Thiết lập ăn tại quán",
    settingDineInTitle: "Thiết lập ăn tại quán",
    settingDineInSub: "Bật/tắt tùy chọn ăn tại quán hoặc chỉ bán mang đi",
    settingDineInTrueTitle: "Mở cả Ăn tại quán & Mang đi (Mặc định)",
    settingDineInTrueSub: "Khách có thể tự do chuyển đổi giữa Ăn tại quán và Mang đi.",
    settingDineInFalseTitle: "Chỉ bán mang đi (Tắt ăn tại quán)",
    settingDineInFalseSub: "Ẩn tùy chọn ăn tại quán trên menu, tất cả đơn hàng đều là mang đi.",
    btnSaveDineInSetting: "Lưu thiết lập",
    dineInSaveSuccess: "Đã lưu thiết lập ăn tại quán thành công!",
    dineInSaveFail: "Lưu thiết lập thất bại: ",
    featureLockedTitle: "Tính năng nâng cao (Chưa kích hoạt)",
    featureLockedDesc: "Tính năng này thuộc gói mô-đun nâng cao. Để kích hoạt 'Ăn tại quán', vui lòng liên hệ BLAB để nâng cấp gói.",
    btnContactUpgrade: "Liên hệ nâng cấp gói",
    // Language & Reports Settings
    tocLanguage: "Ngôn ngữ POS",
    tocReports: "Báo cáo doanh thu",
    settingLangTitle: "Ngôn ngữ hiển thị POS",
    settingLangSub: "Cài đặt ngôn ngữ hiển thị và thao tác của hệ thống POS",
    settingReportsTitle: "Báo cáo doanh thu & sản lượng món",
    settingReportsSub: "Xem thống kê bán hàng, doanh thu các món và tùy biến chọn kèm",
    reportsUnlockedName: "Phân tích doanh thu & sản lượng món thời gian thực",
    reportsUnlockedDesc: "Thống kê số lượng bán, tổng doanh thu theo mốc thời gian (Hôm nay, 7 ngày, 30 ngày) và phân tích topping/tùy biến.",
    btnOpenReports: "Xem báo cáo doanh thu",
    reportsLockedTitle: "Tính năng nâng cao (Chưa kích hoạt)",
    reportsLockedDesc: "Tính năng thuộc gói BLAB Analytics nâng cao, vui lòng liên hệ đội ngũ BLAB để nâng cấp.",
    btnBackToSettings: "← Quay lại Cài đặt",
    // Printer Settings
    btnPrint: "In phiếu",
    btnReprint: "In lại",
    tocPrinter: "Máy in & Xuất vé",
    settingPrinterTitle: "Cài Đặt Máy In Nhiệt (ESC/POS)",
    settingPrinterSub: "Cấu hình máy in mạng LAN / Wi-Fi (Cổng 9100) và chế độ tự động in",
    printerAutoPrintTitle: "Tự động in khi có đơn mới (Auto-Print)",
    printerAutoPrintDesc: "Tự động xuất vé ra máy in ngay khi hệ thống nhận đơn hàng mới",
    printerCashierTitle: "Máy in Quầy (Hóa đơn khách)",
    printerCashierDesc: "In hóa đơn chi tiết, hiển thị giá tiền, tùy biến và mã QR",
    printerKitchenTitle: "Máy in Bếp (Phiếu chế biến)",
    printerKitchenDesc: "Font chữ lớn, số bàn, ghi chú món, không hiển thị giá tiền",
    printerInterfaceLabel: "Hình thức kết nối",
    printerInterfaceNetwork: "Mạng nội bộ / Wi-Fi (TCP/IP)",
    printerInterfaceBluetooth: "Bluetooth không dây (SPP)",
    printerEnableLabel: "Kích hoạt",
    printerBtDeviceLabel: "Thiết bị Bluetooth đã ghép đôi",
    printerBtSelectPlaceholder: "-- Chọn máy in Bluetooth đã ghép đôi --",
    printerBtDevicePlaceholder: "-- Vui lòng chọn máy in Bluetooth đã kết nối --",
    printerBtRefreshBtn: "Quét lại",
    printerBtNoDevices: "Chưa tìm thấy máy in Bluetooth nào. Vui lòng ghép đôi trong Cài đặt Android trước",
    printerIpLabel: "Địa chỉ IP (LAN / Wi-Fi)",
    printerPortLabel: "Cổng Port",
    printerPaperLabel: "Khổ giấy",
    printerPaper80: "80mm (Khổ tiêu chuẩn)",
    printerPaper58: "58mm (Khổ nhỏ)",
    printerProtocolLabel: "Giao thức lệnh in (Protocol)",
    printerOptEscPos: "ESC/POS (Hóa đơn cuộn 58-80mm)",
    printerOptTspl: "TSPL (Máy in tem nhãn/decal như Aimo D520BT, Xprinter)",
    printerTsplSizeLabel: "Kích thước nhãn/decal",
    printerOptTspl100x150: "100 x 150 mm (4x6\" Tem dán túi/thùng lớn)",
    printerOptTspl76x130: "76 x 130 mm (3x5\" Tem đơn hàng trung bình)",
    printerOptTspl50x30: "50 x 30 mm (Tem hộp/món chuẩn)",
    printerOptTspl40x30: "40 x 30 mm (Tem dán ly/phiếu chế biến)",
    printerOptTsplCustom: "Kích thước tùy chỉnh (Custom mm)",
    printerTsplWidthLabel: "Chiều rộng (mm)",
    printerTsplHeightLabel: "Chiều cao (mm)",
    printerTsplModeLabel: "Chế độ in tem nhãn",
    printerOptTsplModeSummary: "Tem tổng đơn hàng (1 tem/mỗi đơn)",
    printerOptTsplModeItems: "Tem dán từng ly/từng món (1 tem/mỗi món)",
    printerTsplDpiLabel: "Độ phân giải (DPI)",
    printerOptTsplDpi203: "203 DPI (8 dots/mm - Tiêu chuẩn)",
    printerOptTsplDpi300: "300 DPI (11.8 dots/mm - Siêu nét)",
    printerTsplXOffsetLabel: "Lề ngang X (mm)",
    printerTsplYOffsetLabel: "Lề dọc Y (mm)",
    btnTestPrint: "In thử nghiệm (Test Print)",
    btnSavePrinterSettings: "Lưu Cấu Hình Máy In",
    // Print Mode Settings (Auto vs Manual)
    printModeTitle: "Chế độ xuất vé / in",
    printModeSub: "Tùy chỉnh hành vi in khi hệ thống tiếp nhận đơn hàng mới",
    printModeAutoTitle: "Chế độ In tự động (Auto-print)",
    printModeAutoDesc: "Đơn được nhận, Web tự động phát tiếng chuông Ting Ting và tự động xả toàn bộ Tem + Bill ra máy in mà không cần nhân viên chạm vào màn hình. Rất thích hợp cho quán lúc cực kỳ đông khách.",
    printModeManualTitle: "Chế độ In thủ công (Manual-print)",
    printModeManualDesc: "Nhân viên phải bấm nút [ IN CẢ ĐƠN ] trên màn hình thì máy mới in. Thích hợp cho quán muốn kiểm tra lại đơn trước khi nhận.",
    // 3 Print Levels
    btnPrintFullOrder: "IN CẢ ĐƠN (1 Bill + {n} Tem)",
    btnPrintBillOnly: "IN BILL THU NGÂN",
    btnPrintCustomOption: "IN TEM TÙY CHỌN",
    btnPrintSingleItem: "In tem món",
    itemPrepared: "Đã hoàn thành",
    markPrepared: "Đánh dấu đã hoàn thành",
    printSingleItemSuccess: "Đã in tem món \"{name}\"!",
    // Quick Sticker / Emergency Note Modal
    quickStickerModalTitle: "In tem tùy chọn / Tem chữa cháy",
    quickStickerModalSub: "Chạm các tùy chọn bên dưới để xả ngay 1 tem ghi chú dán lên món:",
    quickStickerCustomLabel: "Hoặc nhập ghi chú tùy ý cần in:",
    quickStickerCustomPlaceholder: "Nhập ghi chú tùy ý (ví dụ: Ít đá, Bàn 2 thêm thìa)...",
    quickStickerCustomPrintBtn: "In ghi chú này",
    quickStickerPrinting: "Đang in tem ghi chú...",
    quickStickerSuccess: "Đã in tem: \"{text}\"!",
    quickStickerLoading: "Đang tải danh sách tùy chọn...",
    quickStickerGroupSpice: "Gia vị cay",
    quickStickerGroupVeggie: "Rau gia vị",
    quickStickerGroupIceSugar: "Đá & Đường",
    quickStickerGroupKitchen: "Ghi chú bếp",
    // Printer Usage Guide
    printerGuideTitle: "Hướng dẫn sử dụng chức năng In ấn POS",
    printerGuideSub: "Tìm hiểu chi tiết cơ chế in tự động, quy cách tem nhãn và thao tác in 3 cấp độ",
    btnPrinterGuide: "Hướng dẫn in",
    btnViewPrinterGuide: "Xem hướng dẫn",
    btnCloseGuide: "Đã hiểu",
    printerGuideStripTitle: "Tìm hiểu chế độ in tự động, phối hợp 2 máy in hoặc mẹo in 3 cấp độ?",
    printerGuideModeTitle: "1. Các chế độ in đơn (Auto-print vs. Manual-print)",
    printerGuideModeAutoTitle: "Chế độ In tự động (Auto-print)",
    printerGuideModeAutoDesc: "Khi có đơn mới vào hệ thống, POS tự động phát chuông Ting Ting và xả toàn bộ 1 Bill thu ngân + toàn bộ Tem dán món mà không cần chạm màn hình. Rất thích hợp cho giờ cao điểm đông khách.",
    printerGuideModeManualTitle: "Chế độ In thủ công (Manual-print)",
    printerGuideModeManualDesc: "Khi có đơn mới hệ thống chỉ báo chuông. Nhân viên bấm mở đơn kiểm tra rồi nhấn [IN CẢ ĐƠN] máy mới in. Phù hợp quán cần kiểm tra lại món hoặc xác nhận với khách trước khi làm.",
    printerGuideLevelsTitle: "2. Thao tác in 3 cấp độ trong chi tiết đơn hàng",
    printerGuideLevelFullTitle: "IN CẢ ĐƠN (1 Bill + N Tem)",
    printerGuideLevelFullDesc: "1 chạm xuất đầy đủ: 1 hoá đơn thu ngân cho khách + N tem nhãn cho quầy bar/bếp (mỗi ly/phần ăn 1 tem dán riêng).",
    printerGuideLevelBillTitle: "IN BILL THU NGÂN",
    printerGuideLevelBillDesc: "Chỉ in 1 phiếu hoá đơn tính tiền, dùng khi thanh toán, kẹp hoá đơn bàn giao cho khách hoặc lưu sổ sách.",
    printerGuideLevelSingleTitle: "In tem từng món & Checkbox bếp",
    printerGuideLevelSingleDesc: "Mỗi dòng món ăn có checkbox [ ] cho bếp tích đánh dấu hoàn thành (tự động gạch ngang món); nút [In tem món] cho phép in lại đúng món đó khi rách tem hoặc kẹt giấy.",
    printerGuideLevelCustomTitle: "IN TEM TÙY CHỌN (Tem chữa cháy)",
    printerGuideLevelCustomDesc: "Bấm mở popup để chạm nhanh các tùy biến (Không hành, Ít đá, Cay vừa...) hoặc nhập chữ tự do để xả ngay 1 tem ghi chú dán chữa cháy lên ly/hộp.",
    printerGuideHardwareTitle: "3. Cấu hình khuyến nghị cho mô hình 2 máy in (Dual-Station)",
    printerGuideHwCashier: "• Máy in thu ngân: Dùng máy in hoá đơn nhiệt ESC/POS (khổ 80mm hoặc 58mm), kết nối mạng Wi-Fi LAN (Port 9100) hoặc Bluetooth.",
    printerGuideHwKitchen: "• Máy in bếp/pha chế: Dùng máy in tem nhãn TSPL (như Aimo, Xprinter khổ 40x30mm hoặc 50x30mm), chọn chế độ in \"Đơn từng món/ly\".",
    printerGuideHwTest: "• Đầu mỗi ca bán hàng, nên bấm nút \"Kiểm tra in (Test Print)\" để đảm bảo kết nối thông suốt.",
    // Multi-Round Append Orders
    badgeAppendRound: "Đợt {n}",
    badgeAppendShort: "Gọi thêm",
    roundBlockTitle: "Đợt {n}",
    roundBlockLatest: "Mới gọi thêm",
    roundBlockInitial: "Đợt 1 (Đơn ban đầu)",
    alertNewAppended: "🔔 Bàn {table} (Đơn #{key}) vừa gọi thêm món mới!",
    // Store Pairing & Activation (Universal Multi-Tenant POS)
    tocStorePairing: "Điểm bán & Thiết bị",
    settingPairingTitle: "Điểm Bán & Thiết Bị POS",
    settingPairingSub: "Quản lý kết nối giữa máy tính bảng này và điểm bán trên hệ thống đám mây",
    pairingTenantLabel: "Mã điểm bán hiện tại",
    pairingStatusLabel: "Trạng thái kết nối",
    pairingStatusConnected: "Đã kết nối và hoạt động",
    unlinkTitle: "Hủy ghép đôi thiết bị / Đổi điểm bán",
    unlinkDesc: "Sau khi hủy, thiết bị sẽ ngừng đồng bộ đơn của quán này. Cần nhập mã PIN quản lý để xác nhận.",
    btnUnlinkStore: "Đổi Quán / Hủy Ghép Đôi",
    modalActivationTitle: "Kích Hoạt Điểm Bán",
    modalActivationSub: "Vui lòng nhập Mã Quán (Tenant ID) và Mã PIN Quản Lý để liên kết thiết bị POS",
    activationTenantLabel: "Mã Điểm Bán (Tenant ID)",
    activationTenantPlaceholder: "Ví dụ: bsc, benmi...",
    activationPinLabel: "Mã PIN Quản Lý",
    activationPinPlaceholder: "Mặc định 12345678",
    btnSubmitActivation: "Kích Hoạt Điểm Bán & Bắt Đầu",
    btnVerifying: "Đang xác thực...",
    activationErrorInvalid: "Mã quán hoặc mã PIN quản lý không chính xác. Vui lòng kiểm tra lại.",
    activationErrorTenantNotFound: "Mã điểm bán không tồn tại hoặc đã ngưng hoạt động. Vui lòng kiểm tra lại.",
    activationErrorWrongPin: "Mã PIN quản lý không chính xác. Vui lòng kiểm tra lại.",
    activationErrorRequired: "Vui lòng nhập đầy đủ mã quán và mã PIN quản lý.",
    activationErrorNetwork: "Kết nối xác thực thất bại. Vui lòng kiểm tra lại đường truyền mạng.",
    promptUnlinkPin: "Vui lòng nhập mã PIN quản lý của quán để hủy ghép đôi:",
    unlinkSuccess: "Đã hủy ghép đôi thiết bị thành công! Đang chuyển về màn hình kích hoạt.",
    unlinkWrongPin: "Mã PIN quản lý không đúng. Không thể hủy ghép đôi.",
    unpaired: "Chưa liên kết"
  }
};

var currentLang = (typeof localStorage !== "undefined" && localStorage.getItem("benmi_lang")) || "zh-TW";
window.currentLang = currentLang;

function t(key, params = {}) {
  const lang = window.currentLang || currentLang || "zh-TW";
  let str = (I18N[lang] && I18N[lang][key]) || (I18N["zh-TW"] && I18N["zh-TW"][key]) || key;
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
  window.currentLang = lang;
  if (typeof localStorage !== "undefined") localStorage.setItem("benmi_lang", lang);
  applyLanguageToDOM();
  if (typeof renderAll === "function") renderAll();
  if (typeof activeTab !== "undefined" && activeTab === "settings") {
    if (typeof renderOperatingHours === "function") renderOperatingHours();
    if (typeof renderScheduledPickupSetting === "function") renderScheduledPickupSetting();
    if (typeof renderDineInSetting === "function") renderDineInSetting();
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
  const tabReports = document.getElementById("tab-reports");
  if (tabReports) tabReports.innerText = dict.tabReports;
  const tabSound = document.getElementById("tab-sound");
  if (tabSound) tabSound.innerText = dict.tabSound;
  const tabMenu = document.getElementById("tab-menu");
  if (tabMenu) tabMenu.innerText = dict.tabMenu;
  const tabPrinter = document.getElementById("tab-printer-quick");
  if (tabPrinter) tabPrinter.innerText = dict.tabPrinter;
  const tabSettings = document.getElementById("tab-settings");
  if (tabSettings) tabSettings.innerText = dict.tabSettings;

  // View Reports Elements
  const repTitle = document.getElementById("i18n-reports-title");
  if (repTitle) repTitle.innerText = dict.reportsTitle;
  const repSub = document.getElementById("i18n-reports-sub");
  if (repSub) repSub.innerText = dict.reportsSub;
  const rngToday = document.getElementById("i18n-range-today");
  if (rngToday) rngToday.innerText = dict.rangeToday;
  const rng7d = document.getElementById("i18n-range-7d");
  if (rng7d) rng7d.innerText = dict.range7d;
  const rng30d = document.getElementById("i18n-range-30d");
  if (rng30d) rng30d.innerText = dict.range30d;
  const kpiTopItem = document.getElementById("i18n-kpi-top-item");
  if (kpiTopItem) kpiTopItem.innerText = dict.kpiTopItem;
  const kpiTotalSold = document.getElementById("i18n-kpi-total-sold");
  if (kpiTotalSold) kpiTotalSold.innerText = dict.kpiTotalSold;
  const kpiTotalRev = document.getElementById("i18n-kpi-total-revenue");
  if (kpiTotalRev) kpiTotalRev.innerText = dict.kpiTotalRevenue;
  const kpiTotalOrders = document.getElementById("i18n-kpi-total-orders");
  if (kpiTotalOrders) kpiTotalOrders.innerText = dict.kpiTotalOrders;
  const revSub = document.getElementById("i18n-revenue-sub");
  if (revSub) revSub.innerText = dict.revenueSub;
  const compOrdersSub = document.getElementById("i18n-completed-orders-sub");
  if (compOrdersSub) compOrdersSub.innerText = dict.completedOrdersSub;
  const repTblTitle = document.getElementById("i18n-table-title");
  if (repTblTitle) repTblTitle.innerText = dict.tableTitle;

  // View Live Headers
  const leftTitle = document.getElementById("i18n-left-title");
  if (leftTitle) leftTitle.innerText = dict.panelLeftTitle;
  const leftSub = document.getElementById("i18n-left-sub");
  if (leftSub) leftSub.innerText = dict.panelLeftSub;
  const rightTitle = document.getElementById("i18n-right-title");
  if (rightTitle) rightTitle.innerText = dict.panelRightTitle;
  const rightSub = document.getElementById("i18n-right-sub");
  if (rightSub) rightSub.innerText = dict.panelRightSub;

  const fAll = document.getElementById("i18n-filter-all");
  if (fAll) fAll.innerText = dict.filterAll || "全部";
  const fTakeaway = document.getElementById("i18n-filter-takeaway");
  if (fTakeaway) fTakeaway.innerText = dict.filterTakeaway || "外帶";
  const fDinein = document.getElementById("i18n-filter-dinein");
  if (fDinein) fDinein.innerText = dict.filterDineIn || "內用";

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
  const btnRevPrn = document.getElementById("i18n-review-btn-print");
  if (btnRevPrn) btnRevPrn.innerText = dict.btnPrint;
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
  const lDining = document.getElementById("i18n-label-dining");
  if (lDining) lDining.innerText = dict.labelDiningOption;
  const lItemsTitle = document.getElementById("i18n-review-items-title");
  if (lItemsTitle) lItemsTitle.innerText = dict.labelOrderItems;
  const lPrintTools = document.getElementById("i18n-print-tools-label");
  if (lPrintTools) lPrintTools.innerText = dict.printToolsLabel;

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
  const btnRevPaid = document.getElementById("btn-review-paid");
  if (btnRevPaid) btnRevPaid.innerText = dict.btnPaid;
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
  const setS = document.getElementById("i18n-settings-sub");
  if (setS) setS.innerText = dict.settingsSub;
  const setSync = document.getElementById("i18n-settings-sync-status");
  if (setSync) setSync.innerText = dict.settingsSyncStatus;
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

  const tocTitle = document.getElementById("i18n-toc-settings-title");
  if (tocTitle) tocTitle.innerText = dict.tocSettingsTitle;
  const tocSub = document.getElementById("i18n-toc-settings-sub");
  if (tocSub) tocSub.innerText = dict.tocSettingsSub || (currentLang === "vi" ? "Cấu hình hệ thống" : "系統與門市參數");
  const tocStatus = document.getElementById("i18n-toc-status");
  if (tocStatus) tocStatus.innerText = dict.tocStoreStatus;
  const tocOrderMode = document.getElementById("i18n-toc-ordermode");
  if (tocOrderMode) tocOrderMode.innerText = dict.tocOrderMode;
  const tocHours = document.getElementById("i18n-toc-hours");
  if (tocHours) tocHours.innerText = dict.tocHours;
  const tocAddress = document.getElementById("i18n-toc-address");
  if (tocAddress) tocAddress.innerText = dict.tocAddress;
  const tocAnn = document.getElementById("i18n-toc-announcement");
  if (tocAnn) tocAnn.innerText = dict.tocAnnouncement;
  const tocLogo = document.getElementById("i18n-toc-logo");
  if (tocLogo) tocLogo.innerText = dict.tocLogo;
  const tocLang = document.getElementById("i18n-toc-language");
  if (tocLang) tocLang.innerText = dict.tocLanguage;
  const tocDine = document.getElementById("i18n-toc-dinein");
  if (tocDine) tocDine.innerText = dict.tocDineIn;
  const tocPrn = document.getElementById("i18n-toc-printer");
  if (tocPrn) tocPrn.innerText = dict.tocPrinter;
  const tocRep = document.getElementById("i18n-toc-reports");
  if (tocRep) tocRep.innerText = dict.tocReports;
  const tocStoreP = document.getElementById("i18n-toc-store-pairing");
  if (tocStoreP) tocStoreP.innerText = dict.tocStorePairing;

  // Language Setting Card
  const setLangT = document.getElementById("i18n-setting-lang-title");
  if (setLangT) setLangT.innerText = dict.settingLangTitle;
  const setLangS = document.getElementById("i18n-setting-lang-sub");
  if (setLangS) setLangS.innerText = dict.settingLangSub;
  const radioZh = document.getElementById("setting-lang-zh");
  const radioVi = document.getElementById("setting-lang-vi");
  const cardZh = document.getElementById("lang-card-zh");
  const cardVi = document.getElementById("lang-card-vi");
  if (radioZh) radioZh.checked = (currentLang === "zh-TW");
  if (radioVi) radioVi.checked = (currentLang === "vi");
  if (cardZh && cardVi) {
    if (currentLang === "zh-TW") {
      cardZh.style.borderColor = "var(--primary)";
      cardZh.style.background = "rgba(0, 185, 0, 0.05)";
      cardVi.style.borderColor = "var(--border)";
      cardVi.style.background = "#fff";
    } else {
      cardVi.style.borderColor = "var(--primary)";
      cardVi.style.background = "rgba(0, 185, 0, 0.05)";
      cardZh.style.borderColor = "var(--border)";
      cardZh.style.background = "#fff";
    }
  }

  // Reports Setting Card
  const setRepT = document.getElementById("i18n-setting-reports-title");
  if (setRepT) setRepT.innerText = dict.settingReportsTitle;
  const setRepS = document.getElementById("i18n-setting-reports-sub");
  if (setRepS) setRepS.innerText = dict.settingReportsSub;
  const repUnName = document.getElementById("i18n-reports-unlocked-name");
  if (repUnName) repUnName.innerText = dict.reportsUnlockedName;
  const repUnDesc = document.getElementById("i18n-reports-unlocked-desc");
  if (repUnDesc) repUnDesc.innerText = dict.reportsUnlockedDesc;
  const btnOpRep = document.getElementById("i18n-btn-open-reports");
  if (btnOpRep) btnOpRep.innerText = dict.btnOpenReports;
  const repLkT = document.getElementById("i18n-reports-locked-title");
  if (repLkT) repLkT.innerText = dict.reportsLockedTitle;
  const repLkD = document.getElementById("i18n-reports-locked-desc");
  if (repLkD) repLkD.innerText = dict.reportsLockedDesc;
  const btnUpRep = document.getElementById("i18n-btn-contact-upgrade-rep");
  if (btnUpRep) btnUpRep.innerText = dict.btnContactUpgrade;
  const btnBackSet = document.getElementById("i18n-btn-back-settings");
  if (btnBackSet) btnBackSet.innerText = dict.btnBackToSettings;

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
  const hrsS = document.getElementById("i18n-hours-sub");
  if (hrsS) hrsS.innerText = dict.hoursSub;
  const btnSaveHrs = document.getElementById("btn-save-hours");
  if (btnSaveHrs) btnSaveHrs.innerText = dict.btnSaveHours;

  const setAddrT = document.getElementById("i18n-setting-address-title");
  if (setAddrT) setAddrT.innerText = dict.settingAddressTitle;
  const setAddrS = document.getElementById("i18n-setting-address-sub");
  if (setAddrS) setAddrS.innerText = dict.settingAddressSub;
  const setAddrInp = document.getElementById("setting-store-address-input");
  if (setAddrInp) setAddrInp.placeholder = dict.settingAddressPlaceholder;
  const btnSaveAddr = document.getElementById("btn-save-address-setting");
  if (btnSaveAddr) btnSaveAddr.innerText = dict.btnSaveAddress;

  const setAnnT = document.getElementById("i18n-setting-announcement-title");
  if (setAnnT) setAnnT.innerText = dict.settingAnnouncementTitle;
  const setAnnS = document.getElementById("i18n-setting-announcement-sub");
  if (setAnnS) setAnnS.innerText = dict.settingAnnouncementSub;
  const setAnnInp = document.getElementById("setting-store-announcement-input");
  if (setAnnInp) setAnnInp.placeholder = dict.settingAnnouncementPlaceholder;
  const btnSaveAnn = document.getElementById("btn-save-announcement-setting");
  if (btnSaveAnn) btnSaveAnn.innerText = dict.btnSaveAnnouncement;

  const setLogoT = document.getElementById("i18n-setting-logo-title");
  if (setLogoT) setLogoT.innerText = dict.settingLogoTitle;
  const setLogoS = document.getElementById("i18n-setting-logo-sub");
  if (setLogoS) setLogoS.innerText = dict.settingLogoSub;
  const btnChooseLogoTxt = document.getElementById("i18n-btn-choose-logo-text");
  if (btnChooseLogoTxt) {
    btnChooseLogoTxt.innerText = dict.btnChooseLogo;
  } else {
    const btnChooseLogo = document.getElementById("btn-setting-choose-logo");
    if (btnChooseLogo) btnChooseLogo.innerText = dict.btnChooseLogo;
  }
  const logoHint = document.getElementById("i18n-logo-hint");
  if (logoHint) logoHint.innerText = dict.logoHint;
  const btnSaveLogo = document.getElementById("btn-save-logo-setting");
  if (btnSaveLogo) btnSaveLogo.innerText = dict.btnSaveLogo;
  const btnDeleteLogo = document.getElementById("btn-delete-logo-setting");
  if (btnDeleteLogo) btnDeleteLogo.innerText = dict.btnDeleteLogo;

  // Menu Editor
  const menuCatT = document.getElementById("i18n-menu-cat-title");
  if (menuCatT) menuCatT.innerText = dict.menuCatTitle;
  const menuCatS = document.getElementById("i18n-menu-cat-sub");
  if (menuCatS) menuCatS.innerText = dict.menuCatSub;

  const btnManageCats = document.getElementById("btn-menu-manage-cats");
  if (btnManageCats) btnManageCats.innerText = dict.btnManageCategories;
  const btnManageClose = document.getElementById("btn-menu-manage-close");
  if (btnManageClose) btnManageClose.innerText = dict.btnCloseManager;
  const btnAddCatTop = document.getElementById("btn-menu-add-cat-top");
  if (btnAddCatTop) btnAddCatTop.innerText = dict.btnAddCategory;
  const btnCatDel = document.getElementById("btn-category-delete");
  if (btnCatDel) btnCatDel.innerText = dict.btnCategoryDelete;
  const btnCatRen = document.getElementById("btn-category-rename");
  if (btnCatRen) btnCatRen.innerText = dict.btnCategoryRename;
  const addCatModT = document.getElementById("i18n-add-cat-modal-title");
  if (addCatModT) addCatModT.innerText = dict.addCategoryModalTitle;
  const addCatLblN = document.getElementById("i18n-add-cat-label-name");
  if (addCatLblN) addCatLblN.innerText = dict.categoryNameLabel;
  const addCatInpN = document.getElementById("add-cat-input-name");
  if (addCatInpN) addCatInpN.placeholder = dict.categoryNamePlaceholder;
  const addCatLblT = document.getElementById("i18n-add-cat-label-type");
  if (addCatLblT) addCatLblT.innerText = dict.categoryTypeLabel;
  const addCatOptCat = document.getElementById("i18n-add-cat-opt-catalog");
  if (addCatOptCat) addCatOptCat.innerText = dict.categoryTypeCatalog;
  const addCatOptMod = document.getElementById("i18n-add-cat-opt-modifier");
  if (addCatOptMod) addCatOptMod.innerText = dict.categoryTypeModifier;
  const addCatCustLbl = document.getElementById("i18n-add-cat-customization-label");
  if (addCatCustLbl) addCatCustLbl.innerText = dict.allowCustomizationLabel;
  const addCatCustDesc = document.getElementById("i18n-add-cat-customization-desc");
  if (addCatCustDesc) addCatCustDesc.innerText = dict.allowCustomizationDesc;
  const allowCustLbl = document.getElementById("i18n-allow-customization-label");
  if (allowCustLbl) allowCustLbl.innerText = dict.allowCustomizationLabel;
  const allowCustDesc = document.getElementById("i18n-allow-customization-desc");
  if (allowCustDesc) allowCustDesc.innerText = dict.allowCustomizationDesc;
  const btnAddCatCnf = document.getElementById("btn-add-cat-confirm");
  if (btnAddCatCnf) btnAddCatCnf.innerText = dict.btnConfirm || "確認";
  const btnAddCatCan = document.getElementById("btn-add-cat-cancel");
  if (btnAddCatCan) btnAddCatCan.innerText = dict.btnCancel || "取消";
  const menuEdT = document.getElementById("menu-editor-title");
  if (menuEdT && (typeof currentMenuData === 'undefined' || !currentMenuData || typeof activeCategoryIndex === 'undefined' || activeCategoryIndex < 0)) menuEdT.innerText = dict.menuEditorTitle;
  const menuEdS = document.getElementById("i18n-menu-edit-sub");
  if (menuEdS) menuEdS.innerText = dict.menuEditSub;
  const btnMenuAdd = document.getElementById("btn-menu-add-item");
  if (btnMenuAdd) btnMenuAdd.innerText = dict.btnMenuAddItem;
  const btnMenuSv = document.getElementById("btn-menu-save");
  if (btnMenuSv) {
    if (typeof isMenuDirty !== "undefined" && isMenuDirty) {
      btnMenuSv.innerText = dict.btnMenuDirty;
    } else {
      btnMenuSv.innerText = dict.btnMenuSave;
    }
  }
  const menuPrompt = document.getElementById("i18n-menu-select-prompt");
  if (menuPrompt) menuPrompt.innerText = dict.menuSelectPrompt;

  // Image Modal
  const imgModT = document.getElementById("image-modal-title");
  if (imgModT && (typeof currentImageItemName === 'undefined' || !currentImageItemName)) imgModT.innerText = dict.imageModalTitle;
  const btnImgSel = document.getElementById("btn-image-select");
  if (btnImgSel) btnImgSel.innerText = dict.btnImageSelect;
  const btnImgDel = document.getElementById("btn-delete-image");
  if (btnImgDel) btnImgDel.innerText = dict.btnImageDelete;
  const btnImgCls = document.getElementById("btn-image-close");
  if (btnImgCls) btnImgCls.innerText = dict.btnClose;

  // Stock Modal
  const stkModT = document.getElementById("stock-modal-title");
  if (stkModT && (typeof currentStockCidx === 'undefined' || currentStockCidx === null)) stkModT.innerText = dict.stockModalTitle;
  const stkLblSt = document.getElementById("i18n-stock-label-status");
  if (stkLblSt) stkLblSt.innerText = dict.stockLabelStatus;
  const stkOptIn = document.getElementById("stock-opt-in-stock");
  if (stkOptIn) stkOptIn.innerText = dict.stockOptInStock;
  const stkOptOut = document.getElementById("stock-opt-out-stock");
  if (stkOptOut) stkOptOut.innerText = dict.stockOptOutOfStock;
  const stkLblDur = document.getElementById("i18n-stock-label-duration");
  if (stkLblDur) stkLblDur.innerText = dict.stockLabelDuration;
  const stkOptTd = document.getElementById("stock-opt-today");
  if (stkOptTd) stkOptTd.innerText = dict.stockOptToday;
  const stkOptMd = document.getElementById("stock-opt-multiple-days");
  if (stkOptMd) stkOptMd.innerText = dict.stockOptMultipleDays;
  const stkOptInd = document.getElementById("stock-opt-indefinite");
  if (stkOptInd) stkOptInd.innerText = dict.stockOptIndefinite;
  const stkLblDt = document.getElementById("i18n-stock-label-date");
  if (stkLblDt) stkLblDt.innerText = dict.stockLabelDate;
  const btnStkSv = document.getElementById("btn-stock-save");
  if (btnStkSv) btnStkSv.innerText = dict.btnStockSave;
  const btnStkCan = document.getElementById("btn-stock-cancel");
  if (btnStkCan) btnStkCan.innerText = dict.btnCancel;

  // Dining Filter Buttons
  const btnFilterAll = document.getElementById("filter-btn-all");
  if (btnFilterAll) btnFilterAll.innerText = dict.filterAll;
  const btnFilterTakeaway = document.getElementById("filter-btn-takeaway");
  if (btnFilterTakeaway) btnFilterTakeaway.innerText = dict.filterTakeaway;
  const btnFilterDineIn = document.getElementById("filter-btn-dine-in");
  if (btnFilterDineIn) btnFilterDineIn.innerText = dict.filterDineIn;

  // Dine-in Settings
  const setDineInT = document.getElementById("i18n-setting-dinein-title");
  if (setDineInT) setDineInT.innerText = dict.settingDineInTitle;
  const setDineInS = document.getElementById("i18n-setting-dinein-sub");
  if (setDineInS) setDineInS.innerText = dict.settingDineInSub;
  const btnSaveDineIn = document.getElementById("btn-save-dinein-setting");
  if (btnSaveDineIn) btnSaveDineIn.innerText = dict.btnSaveDineInSetting;
  const modeDineInTT = document.getElementById("i18n-mode-dinein-true-title");
  if (modeDineInTT) modeDineInTT.innerText = dict.settingDineInTrueTitle;
  const modeDineInTS = document.getElementById("i18n-mode-dinein-true-sub");
  if (modeDineInTS) modeDineInTS.innerText = dict.settingDineInTrueSub;
  const modeDineInFT = document.getElementById("i18n-mode-dinein-false-title");
  if (modeDineInFT) modeDineInFT.innerText = dict.settingDineInFalseTitle;
  const modeDineInFS = document.getElementById("i18n-mode-dinein-false-sub");
  if (modeDineInFS) modeDineInFS.innerText = dict.settingDineInFalseSub;

  const featLockT = document.getElementById("i18n-feature-locked-title");
  if (featLockT) featLockT.innerText = dict.featureLockedTitle;
  const featLockD = document.getElementById("i18n-feature-locked-desc");
  if (featLockD) featLockD.innerText = dict.featureLockedDesc;
  const btnContUpgTxt = document.getElementById("i18n-btn-contact-upgrade-text");
  if (btnContUpgTxt) {
    btnContUpgTxt.innerText = dict.btnContactUpgrade;
  } else {
    const btnContUpg = document.getElementById("i18n-btn-contact-upgrade");
    if (btnContUpg) btnContUpg.innerText = dict.btnContactUpgrade;
  }

  // Thermal Printer Settings DOM mappings
  const setPrnT = document.getElementById("i18n-setting-printer-title");
  if (setPrnT) setPrnT.innerText = dict.settingPrinterTitle;
  const setPrnS = document.getElementById("i18n-setting-printer-sub");
  if (setPrnS) setPrnS.innerText = dict.settingPrinterSub;
  const prnAutoT = document.getElementById("i18n-printer-autoprint-title");
  if (prnAutoT) prnAutoT.innerText = dict.printerAutoPrintTitle;
  const prnAutoD = document.getElementById("i18n-printer-autoprint-desc");
  if (prnAutoD) prnAutoD.innerText = dict.printerAutoPrintDesc;
  const prnModeT = document.getElementById("i18n-printer-mode-title");
  if (prnModeT) prnModeT.innerText = dict.printModeTitle;
  const prnModeS = document.getElementById("i18n-printer-mode-sub");
  if (prnModeS) prnModeS.innerText = dict.printModeSub;
  const prnAutoTitle = document.getElementById("i18n-print-mode-auto-title");
  if (prnAutoTitle) prnAutoTitle.innerText = dict.printModeAutoTitle;
  const prnAutoDesc = document.getElementById("i18n-print-mode-auto-desc");
  if (prnAutoDesc) prnAutoDesc.innerText = dict.printModeAutoDesc;
  const prnManualTitle = document.getElementById("i18n-print-mode-manual-title");
  if (prnManualTitle) prnManualTitle.innerText = dict.printModeManualTitle;
  const prnManualDesc = document.getElementById("i18n-print-mode-manual-desc");
  if (prnManualDesc) prnManualDesc.innerText = dict.printModeManualDesc;

  // Review 3 Print levels
  const btnPrintFull = document.getElementById("i18n-btn-print-full");
  if (btnPrintFull) {
    const order = (typeof reviewingOrder !== "undefined" && reviewingOrder) ? reviewingOrder : null;
    let n = 1;
    if (order && typeof PrinterService !== "undefined" && typeof PrinterService.parseOrderItems === "function") {
      n = PrinterService.parseOrderItems(order, true).length || 1;
    }
    btnPrintFull.innerText = dict.btnPrintFullOrder ? dict.btnPrintFullOrder.replace("{n}", n) : `IN CẢ ĐƠN (1 Bill + ${n} Tem)`;
  }
  const btnPrintBillOnly = document.getElementById("i18n-btn-print-bill-only");
  if (btnPrintBillOnly) btnPrintBillOnly.innerText = dict.btnPrintBillOnly;
  const btnPrintCustomOpt = document.getElementById("i18n-btn-print-custom-opt");
  if (btnPrintCustomOpt) btnPrintCustomOpt.innerText = dict.btnPrintCustomOption;

  // Quick Sticker Modal
  const qStickerTitle = document.getElementById("i18n-quick-sticker-title");
  if (qStickerTitle) qStickerTitle.innerText = dict.quickStickerModalTitle;
  const qStickerSub = document.getElementById("i18n-quick-sticker-sub");
  if (qStickerSub) qStickerSub.innerText = dict.quickStickerModalSub;
  const qStickerCustomLbl = document.getElementById("i18n-quick-sticker-custom-label");
  if (qStickerCustomLbl) qStickerCustomLbl.innerText = dict.quickStickerCustomLabel;
  const qStickerInput = document.getElementById("quick-sticker-custom-input");
  if (qStickerInput) qStickerInput.placeholder = dict.quickStickerCustomPlaceholder;
  const qStickerBtn = document.getElementById("i18n-btn-print-quick-custom");
  if (qStickerBtn) qStickerBtn.innerText = dict.quickStickerCustomPrintBtn;

  // Printer Usage Guide DOM mappings
  const gTitle = document.getElementById("i18n-printer-guide-title");
  if (gTitle) gTitle.innerText = dict.printerGuideTitle;
  const gSub = document.getElementById("i18n-printer-guide-sub");
  if (gSub) gSub.innerText = dict.printerGuideSub;
  const gModeT = document.getElementById("i18n-printer-guide-mode-title");
  if (gModeT) gModeT.innerText = dict.printerGuideModeTitle;
  const gModeAutoT = document.getElementById("i18n-printer-guide-mode-auto-title");
  if (gModeAutoT) gModeAutoT.innerText = dict.printerGuideModeAutoTitle;
  const gModeAutoD = document.getElementById("i18n-printer-guide-mode-auto-desc");
  if (gModeAutoD) gModeAutoD.innerText = dict.printerGuideModeAutoDesc;
  const gModeManualT = document.getElementById("i18n-printer-guide-mode-manual-title");
  if (gModeManualT) gModeManualT.innerText = dict.printerGuideModeManualTitle;
  const gModeManualD = document.getElementById("i18n-printer-guide-mode-manual-desc");
  if (gModeManualD) gModeManualD.innerText = dict.printerGuideModeManualDesc;
  const gLevelsT = document.getElementById("i18n-printer-guide-levels-title");
  if (gLevelsT) gLevelsT.innerText = dict.printerGuideLevelsTitle;
  const gLevelFullT = document.getElementById("i18n-printer-guide-level-full-title");
  if (gLevelFullT) gLevelFullT.innerText = dict.printerGuideLevelFullTitle;
  const gLevelFullD = document.getElementById("i18n-printer-guide-level-full-desc");
  if (gLevelFullD) gLevelFullD.innerText = dict.printerGuideLevelFullDesc;
  const gLevelBillT = document.getElementById("i18n-printer-guide-level-bill-title");
  if (gLevelBillT) gLevelBillT.innerText = dict.printerGuideLevelBillTitle;
  const gLevelBillD = document.getElementById("i18n-printer-guide-level-bill-desc");
  if (gLevelBillD) gLevelBillD.innerText = dict.printerGuideLevelBillDesc;
  const gLevelSingleT = document.getElementById("i18n-printer-guide-level-single-title");
  if (gLevelSingleT) gLevelSingleT.innerText = dict.printerGuideLevelSingleTitle;
  const gLevelSingleD = document.getElementById("i18n-printer-guide-level-single-desc");
  if (gLevelSingleD) gLevelSingleD.innerText = dict.printerGuideLevelSingleDesc;
  const gLevelCustomT = document.getElementById("i18n-printer-guide-level-custom-title");
  if (gLevelCustomT) gLevelCustomT.innerText = dict.printerGuideLevelCustomTitle;
  const gLevelCustomD = document.getElementById("i18n-printer-guide-level-custom-desc");
  if (gLevelCustomD) gLevelCustomD.innerText = dict.printerGuideLevelCustomDesc;
  const gHwT = document.getElementById("i18n-printer-guide-hardware-title");
  if (gHwT) gHwT.innerText = dict.printerGuideHardwareTitle;
  const gHwCashier = document.getElementById("i18n-printer-guide-hw-cashier");
  if (gHwCashier) gHwCashier.innerText = dict.printerGuideHwCashier;
  const gHwKitchen = document.getElementById("i18n-printer-guide-hw-kitchen");
  if (gHwKitchen) gHwKitchen.innerText = dict.printerGuideHwKitchen;
  const gHwTest = document.getElementById("i18n-printer-guide-hw-test");
  if (gHwTest) gHwTest.innerText = dict.printerGuideHwTest;
  const btnPGuide = document.getElementById("i18n-btn-printer-guide");
  if (btnPGuide) btnPGuide.innerText = dict.btnPrinterGuide;
  const btnCloseG = document.getElementById("i18n-btn-close-guide");
  if (btnCloseG) btnCloseG.innerText = dict.btnCloseGuide;

  // Re-render open modal contents if active
  if (typeof reviewingOrder !== "undefined" && reviewingOrder) {
    const elCont = document.getElementById("review-content");
    if (elCont && typeof formatContentHtml === "function") {
      elCont.innerHTML = formatContentHtml(reviewingOrder);
    }
  }
  const qModal = document.getElementById("quickStickerModal");
  if (qModal && qModal.style.display === "flex" && typeof renderQuickStickerOptions === "function") {
    renderQuickStickerOptions();
  }

  const prnCashT = document.getElementById("i18n-printer-cashier-title");
  if (prnCashT) prnCashT.innerText = dict.printerCashierTitle;
  const prnCashD = document.getElementById("i18n-printer-cashier-desc");
  if (prnCashD) prnCashD.innerText = dict.printerCashierDesc;
  const prnKitT = document.getElementById("i18n-printer-kitchen-title");
  if (prnKitT) prnKitT.innerText = dict.printerKitchenTitle;
  const prnKitD = document.getElementById("i18n-printer-kitchen-desc");
  if (prnKitD) prnKitD.innerText = dict.printerKitchenDesc;
  const btnSvPrn = document.getElementById("i18n-btn-save-printer-settings");
  if (btnSvPrn) btnSvPrn.innerText = dict.btnSavePrinterSettings;

  // Bluetooth & Interface DOM Labels
  const labelsEnable = document.querySelectorAll(".i18n-printer-enable-lbl");
  labelsEnable.forEach(el => el.innerText = dict.printerEnableLabel);

  const optsBtPlaceholder = document.querySelectorAll(".i18n-opt-bt-placeholder");
  optsBtPlaceholder.forEach(el => el.innerText = dict.printerBtDevicePlaceholder);

  const labelsInterface = document.querySelectorAll(".i18n-printer-interface-lbl");
  labelsInterface.forEach(el => el.innerText = dict.printerInterfaceLabel);

  const labelsBt = document.querySelectorAll(".i18n-printer-bt-lbl");
  labelsBt.forEach(el => el.innerText = dict.printerBtDeviceLabel);

  const btRefreshBtns = document.querySelectorAll(".i18n-printer-bt-refresh");
  btRefreshBtns.forEach(el => el.innerText = dict.printerBtRefreshBtn);

  const labelsIp = document.querySelectorAll(".i18n-printer-ip-lbl");
  labelsIp.forEach(el => el.innerText = dict.printerIpLabel);

  const labelsPaper = document.querySelectorAll(".i18n-printer-paper-lbl");
  labelsPaper.forEach(el => el.innerText = dict.printerPaperLabel);

  const optNets = document.querySelectorAll(".i18n-opt-network");
  optNets.forEach(el => el.innerText = dict.printerInterfaceNetwork);

  const optBts = document.querySelectorAll(".i18n-opt-bluetooth");
  optBts.forEach(el => el.innerText = dict.printerInterfaceBluetooth);

  const optP80s = document.querySelectorAll(".i18n-opt-p80");
  optP80s.forEach(el => el.innerText = dict.printerPaper80);

  const optP58s = document.querySelectorAll(".i18n-opt-p58");
  optP58s.forEach(el => el.innerText = dict.printerPaper58);

  // Protocol & TSPL Labels
  const labelsProto = document.querySelectorAll(".i18n-printer-protocol-lbl");
  labelsProto.forEach(el => el.innerText = dict.printerProtocolLabel);

  const optEscs = document.querySelectorAll(".i18n-opt-escpos");
  optEscs.forEach(el => el.innerText = dict.printerOptEscPos);

  const optTspls = document.querySelectorAll(".i18n-opt-tspl");
  optTspls.forEach(el => el.innerText = dict.printerOptTspl);

  const labelsTsplSize = document.querySelectorAll(".i18n-printer-tspl-size-lbl");
  labelsTsplSize.forEach(el => el.innerText = dict.printerTsplSizeLabel);

  const optTspl100s = document.querySelectorAll(".i18n-opt-tspl-100x150");
  optTspl100s.forEach(el => el.innerText = dict.printerOptTspl100x150);

  const optTspl76s = document.querySelectorAll(".i18n-opt-tspl-76x130");
  optTspl76s.forEach(el => el.innerText = dict.printerOptTspl76x130);

  const optTspl50s = document.querySelectorAll(".i18n-opt-tspl-50x30");
  optTspl50s.forEach(el => el.innerText = dict.printerOptTspl50x30);

  const optTspl40s = document.querySelectorAll(".i18n-opt-tspl-40x30");
  optTspl40s.forEach(el => el.innerText = dict.printerOptTspl40x30);

  const optTsplCustoms = document.querySelectorAll(".i18n-opt-tspl-custom");
  optTsplCustoms.forEach(el => el.innerText = dict.printerOptTsplCustom);

  const labelsTsplW = document.querySelectorAll(".i18n-printer-tspl-width-lbl");
  labelsTsplW.forEach(el => el.innerText = dict.printerTsplWidthLabel);

  const labelsTsplH = document.querySelectorAll(".i18n-printer-tspl-height-lbl");
  labelsTsplH.forEach(el => el.innerText = dict.printerTsplHeightLabel);

  const labelsTsplMode = document.querySelectorAll(".i18n-printer-tspl-mode-lbl");
  labelsTsplMode.forEach(el => el.innerText = dict.printerTsplModeLabel);

  const optTsplModSums = document.querySelectorAll(".i18n-opt-tspl-mode-summary");
  optTsplModSums.forEach(el => el.innerText = dict.printerOptTsplModeSummary);

  const optTsplModIts = document.querySelectorAll(".i18n-opt-tspl-mode-items");
  optTsplModIts.forEach(el => el.innerText = dict.printerOptTsplModeItems);

  const labelsTsplDpi = document.querySelectorAll(".i18n-printer-tspl-dpi-lbl");
  labelsTsplDpi.forEach(el => el.innerText = dict.printerTsplDpiLabel);

  const optTsplDpi203s = document.querySelectorAll(".i18n-opt-tspl-dpi-203");
  optTsplDpi203s.forEach(el => el.innerText = dict.printerOptTsplDpi203);

  const optTsplDpi300s = document.querySelectorAll(".i18n-opt-tspl-dpi-300");
  optTsplDpi300s.forEach(el => el.innerText = dict.printerOptTsplDpi300);

  const labelsTsplXOff = document.querySelectorAll(".i18n-printer-tspl-x-offset-lbl");
  labelsTsplXOff.forEach(el => el.innerText = dict.printerTsplXOffsetLabel);

  const labelsTsplYOff = document.querySelectorAll(".i18n-printer-tspl-y-offset-lbl");
  labelsTsplYOff.forEach(el => el.innerText = dict.printerTsplYOffsetLabel);

  const labelsTestPrint = document.querySelectorAll(".i18n-btn-test-print");
  labelsTestPrint.forEach(el => el.innerText = dict.btnTestPrint);

  // Store Pairing DOM mappings
  const setPairT = document.getElementById("i18n-setting-pairing-title");
  if (setPairT) setPairT.innerText = dict.settingPairingTitle;
  const setPairS = document.getElementById("i18n-setting-pairing-sub");
  if (setPairS) setPairS.innerText = dict.settingPairingSub;
  const pairTLbl = document.getElementById("i18n-pairing-tenant-label");
  if (pairTLbl) pairTLbl.innerText = dict.pairingTenantLabel;
  const pairStLbl = document.getElementById("i18n-pairing-status-label");
  if (pairStLbl) pairStLbl.innerText = dict.pairingStatusLabel;
  const pairStConn = document.getElementById("i18n-pairing-status-connected");
  if (pairStConn) pairStConn.innerText = dict.pairingStatusConnected;
  const unlT = document.getElementById("i18n-unlink-title");
  if (unlT) unlT.innerText = dict.unlinkTitle;
  const unlD = document.getElementById("i18n-unlink-desc");
  if (unlD) unlD.innerText = dict.unlinkDesc;
  const btnUnlSt = document.getElementById("i18n-btn-unlink-store");
  if (btnUnlSt) btnUnlSt.innerText = dict.btnUnlinkStore;

  // Store Activation Modal DOM mappings
  const actModT = document.getElementById("i18n-modal-activation-title");
  if (actModT) actModT.innerText = dict.modalActivationTitle;
  const actModS = document.getElementById("i18n-modal-activation-sub");
  if (actModS) actModS.innerText = dict.modalActivationSub;
  const actTLbl = document.getElementById("i18n-activation-tenant-label");
  if (actTLbl) actTLbl.innerText = dict.activationTenantLabel;
  const actInpT = document.getElementById("activation-tenant-id");
  if (actInpT) actInpT.placeholder = dict.activationTenantPlaceholder;
  const actPLbl = document.getElementById("i18n-activation-pin-label");
  if (actPLbl) actPLbl.innerText = dict.activationPinLabel;
  const actInpP = document.getElementById("activation-pin");
  if (actInpP) actInpP.placeholder = dict.activationPinPlaceholder;
  const btnActTxt = document.getElementById("i18n-btn-submit-activation-text");
  if (btnActTxt) btnActTxt.innerText = dict.btnSubmitActivation;
}

