/**
 * ==========================================================================
 * Benmi Multi-Tenant Marketplace & Interactive Map Discovery Engine
 * ==========================================================================
 */

// 1. SVG Iconography Repository (Lucide Icons - MIT Licensed)
var MARKETPLACE_SVG = {
  search: '<svg class="icon-svg" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>',
  mapPin: '<svg class="icon-svg" viewBox="0 0 24 24"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"></path><circle cx="12" cy="10" r="3"></circle></svg>',
  compass: '<svg class="icon-svg" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"></polygon></svg>',
  clock: '<svg class="icon-svg" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>',
  shoppingBag: '<svg class="icon-svg" viewBox="0 0 24 24"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"></path><path d="M3 6h18"></path><path d="M16 10a4 4 0 0 1-8 0"></path></svg>',
  utensils: '<svg class="icon-svg" viewBox="0 0 24 24"><path d="M18 2v6a3 3 0 0 1-3 3 3 3 0 0 1-3-3V2"></path><path d="M15 2v10"></path><path d="M15 14v8"></path><path d="M6 2v20"></path><path d="M6 2a3 3 0 0 1 3 3v3a3 3 0 0 1-3 3"></path></svg>',
  phone: '<svg class="icon-svg" viewBox="0 0 24 24"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>',
  externalLink: '<svg class="icon-svg" viewBox="0 0 24 24"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>',
  close: '<svg class="icon-svg" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>',
  check: '<svg class="icon-svg" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"></polyline></svg>',
  chevronRight: '<svg class="icon-svg" viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"></polyline></svg>',
  globe: '<svg class="icon-svg" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>',
  layers: '<svg class="icon-svg" viewBox="0 0 24 24"><polygon points="12 2 2 7 12 12 22 7 12 2"></polygon><polyline points="2 17 12 22 22 17"></polyline><polyline points="2 12 12 17 22 12"></polyline></svg>',
  store: '<svg class="icon-svg" viewBox="0 0 24 24"><path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7"></path><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"></path><path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4"></path><path d="M2 7h20"></path><path d="M22 7v3a2 2 0 0 1-2 2v0a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 16 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 12 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 8 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 4 12v0a2 2 0 0 1-2-2V7"></path></svg>'
};
window.MARKETPLACE_SVG = MARKETPLACE_SVG;

// 2. Multi-Language Dictionary (I18N)
var MARKETPLACE_I18N = {
  "zh-TW": {
    brandTitle: "Benmi 美食探索",
    brandSubtitle: "探索全台優質合作店家與線上點餐",
    searchPlaceholder: "搜尋店家名稱、地址、料理類別...",
    locateMe: "尋找附近",
    locating: "定位中...",
    located: "已定位",
    locationDenied: "無法取得您的位置",
    viewList: "列表",
    viewMap: "地圖",
    regionAll: "全部地區",
    regionNewTaipei: "新北",
    regionTaichung: "台中",
    regionTucheng: "土城",
    regionXindian: "新店",
    regionBanqiao: "板橋",
    regionXinzhuang: "新莊",
    cuisineAll: "全部料理",
    cuisineVietnamese: "越式料理",
    cuisineTaiwanese: "台式小吃",
    cuisineSnack: "點心炸物",
    onlyOpen: "僅顯示營業中",
    storesFound: "共找到 {count} 家店家",
    noStoresFound: "找不到符合條件的店家",
    noStoresDesc: "請嘗試調整搜尋關鍵字或清除篩選條件。",
    clearFilters: "清除篩選條件",
    openNow: "營業中",
    closed: "休息中",
    busy: "忙碌中",
    distanceKm: "{dist} 公里",
    distanceM: "{dist} 公尺",
    btnDetails: "店家詳情",
    btnOrder: "線上點餐",
    modalTitle: "店家詳細資訊",
    modalHours: "營業時間",
    modalAddress: "店家地址",
    modalDirections: "Google 地圖導航",
    modalDelivery: "外送與訂餐說明",
    modalDiningDineIn: "支援內用點餐",
    modalDiningTakeaway: "支援外帶自取",
    modalDiningScheduled: "支援預約取餐",
    recenterMap: "重設地圖",
    categories: "推薦品項",
    todaySchedule: "今日營業",
    days: ["週日", "週一", "週二", "週三", "週四", "週五", "週六"],
    dayRest: "公休",
    todayRest: "今日公休",
    todayHours: "今日 {hours}",
    todayLabel: "今日"
  },
  "vi": {
    brandTitle: "Benmi Discovery",
    brandSubtitle: "Khám phá quán ngon & Đặt món trực tuyến",
    searchPlaceholder: "Tìm tên quán, địa chỉ, loại món ăn...",
    locateMe: "Quán gần tôi",
    locating: "Đang định vị...",
    located: "Đã định vị",
    locationDenied: "Không thể truy cập GPS",
    viewList: "Danh Sách",
    viewMap: "Bản Đồ",
    regionAll: "Tất cả",
    regionNewTaipei: "Tân Bắc",
    regionTaichung: "Đài Trung",
    regionTucheng: "Thổ Thành",
    regionXindian: "Tân Điếm",
    regionBanqiao: "Bản Kiều",
    regionXinzhuang: "Tân Trang",
    cuisineAll: "Tất cả món",
    cuisineVietnamese: "Món Việt & Bánh Mì",
    cuisineTaiwanese: "Món Đài Loan",
    cuisineSnack: "Đồ Ăn Vặt",
    onlyOpen: "Chỉ quán đang mở",
    storesFound: "Tìm thấy {count} quán",
    noStoresFound: "Không tìm thấy quán phù hợp",
    noStoresDesc: "Vui lòng thử từ khóa khác hoặc xóa bộ lọc để xem tất cả quán.",
    clearFilters: "Xóa bộ lọc",
    openNow: "Đang mở cửa",
    closed: "Đã đóng cửa",
    busy: "Đang bận",
    distanceKm: "{dist} km",
    distanceM: "{dist} m",
    btnDetails: "Xem chi tiết",
    btnOrder: "Vào đặt món",
    modalTitle: "Thông tin chi tiết quán",
    modalHours: "Giờ mở cửa",
    modalAddress: "Địa chỉ quán",
    modalDirections: "Chỉ đường Google Maps",
    modalDelivery: "Chính sách giao hàng",
    modalDiningDineIn: "Ăn tại quán",
    modalDiningTakeaway: "Mang về",
    modalDiningScheduled: "Hẹn giờ lấy",
    recenterMap: "Toàn bộ bản đồ",
    categories: "Món nổi bật",
    todaySchedule: "Giờ mở hôm nay",
    days: ["Chủ Nhật", "Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7"],
    dayRest: "Nghỉ",
    todayRest: "Hôm nay nghỉ",
    todayHours: "Hôm nay: {hours}",
    todayLabel: "Hôm nay"
  }
};
window.MARKETPLACE_I18N = MARKETPLACE_I18N;

// 3. Worker API Base Resolution
function resolveApiBase() {
  var hostname = window.location.hostname;
  var isDev = (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname.startsWith("dev.") ||
    hostname.includes(".dev.") ||
    hostname.includes("-dev.") ||
    hostname.startsWith("dev-")
  );
  var isStaging = (
    hostname.startsWith("staging.") ||
    hostname.includes(".staging.") ||
    hostname.includes("-staging.") ||
    hostname.startsWith("test.") ||
    hostname.includes(".test.") ||
    hostname.includes("-test.")
  );
  return isDev
    ? "https://platform-worker-dev.thuanmnc.workers.dev"
    : (isStaging
      ? "https://platform-worker-staging.thuanmnc.workers.dev"
      : "https://benmi-worker-official.thuanmnc.workers.dev");
}

// 4. Haversine Distance Calculator (km)
function calculateDistance(lat1, lon1, lat2, lon2) {
  if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) return null;
  var rad = function (x) { return x * Math.PI / 180; };
  var R = 6371; // Earth radius in km
  var dLat = rad(lat2 - lat1);
  var dLon = rad(lon2 - lon1);
  var a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(rad(lat1)) * Math.cos(rad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function formatDistance(distKm, lang) {
  if (distKm == null || isNaN(distKm)) return "";
  var dictionary = MARKETPLACE_I18N[lang] || MARKETPLACE_I18N["zh-TW"];
  if (distKm < 1) {
    var meters = Math.round(distKm * 1000);
    return dictionary.distanceM.replace("{dist}", meters);
  }
  return dictionary.distanceKm.replace("{dist}", distKm.toFixed(1));
}

function formatOperatingHoursPretty(operatingHours, parsedHours, lang, mode) {
  var dict = MARKETPLACE_I18N[lang] || MARKETPLACE_I18N["zh-TW"];
  
  // Calculate current day of week in Taiwan (UTC+8)
  var now = new Date();
  var taiwanTime = new Date(now.getTime() + 8 * 3600000);
  var currentDay = String(taiwanTime.getUTCDay()); // 0 = Sun, 1 = Mon ... 6 = Sat

  var isJson = typeof operatingHours === "string" && operatingHours.trim().startsWith("{");

  if (mode === "card") {
    if (parsedHours && typeof parsedHours === "object") {
      var shifts = parsedHours[currentDay];
      if (Array.isArray(shifts) && shifts.length > 0) {
        var shiftStr = shifts.map(function (s) { return s.start + " - " + s.end; }).join(", ");
        return dict.todayHours.replace("{hours}", shiftStr);
      } else if (Array.isArray(shifts) && shifts.length === 0) {
        return dict.todayRest;
      }
    }
    if (operatingHours && !isJson) {
      return operatingHours.split("\n")[0];
    }
    return "11:00 - 21:00";
  }

  // mode === "modal" (Structured full weekly schedule)
  if (parsedHours && typeof parsedHours === "object") {
    var dayOrder = ["1", "2", "3", "4", "5", "6", "0"];
    var rowsHtml = dayOrder.map(function (d) {
      var idx = parseInt(d, 10);
      var dayName = (dict.days && dict.days[idx]) ? dict.days[idx] : "Day " + d;
      var shifts = parsedHours[d];
      var isToday = (d === currentDay);
      var hoursStr = "";
      if (Array.isArray(shifts) && shifts.length > 0) {
        hoursStr = shifts.map(function (s) { return s.start + " - " + s.end; }).join(", ");
      } else {
        hoursStr = dict.dayRest;
      }
      return '<div class="schedule-row' + (isToday ? ' today' : '') + '">' +
             '  <span class="schedule-day">' + dayName + (isToday ? ' (' + dict.todayLabel + ')' : '') + '</span>' +
             '  <span class="schedule-hours">' + hoursStr + '</span>' +
             '</div>';
    }).join("");

    return '<div class="schedule-list">' + rowsHtml + '</div>';
  }

  if (operatingHours && !isJson) {
    return '<span>' + operatingHours + '</span>';
  }

  return '<span>11:00 - 21:00</span>';
}

// 5. Marketplace Application State
var MarketplaceApp = {
  tenants: [],
  filteredTenants: [],
  userCoords: null,
  activeTenantId: null,
  currentLang: localStorage.getItem("benmi_lang") || "zh-TW",
  currentFilter: {
    search: "",
    region: "all",
    cuisine: "all",
    onlyOpen: false
  },
  viewMode: "list",
  map: null,
  markers: {},
  clusterMarkers: {},
  userMarker: null,

  t: function (key, params) {
    var lang = this.currentLang;
    var dict = MARKETPLACE_I18N[lang] || MARKETPLACE_I18N["zh-TW"];
    var str = dict[key] || key;
    if (params && typeof params === "object") {
      Object.keys(params).forEach(function (k) {
        str = str.replace(new RegExp("\\{" + k + "\\}", "g"), params[k]);
      });
    }
    return str;
  },

  init: function () {
    this.bindEvents();
    this.initMap();
    this.fetchTenants();
    this.updateLanguageUI();
  },

  bindEvents: function () {
    var self = this;

    // Search input with debounce
    var searchInput = document.getElementById("marketplaceSearchInput");
    var clearBtn = document.getElementById("searchClearBtn");
    if (searchInput) {
      var debounceTimer;
      searchInput.addEventListener("input", function (e) {
        var val = e.target.value;
        if (clearBtn) clearBtn.style.display = val ? "block" : "none";
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(function () {
          self.currentFilter.search = val.trim();
          self.applyFilters();
        }, 200);
      });
    }

    if (clearBtn && searchInput) {
      clearBtn.addEventListener("click", function () {
        searchInput.value = "";
        clearBtn.style.display = "none";
        self.currentFilter.search = "";
        self.applyFilters();
      });
    }

    // GPS Locate Me Button
    var gpsBtn = document.getElementById("gpsLocateBtn");
    if (gpsBtn) {
      gpsBtn.addEventListener("click", function () {
        self.requestUserLocation();
      });
    }

    // Language Toggle
    var langBtn = document.getElementById("langSwitchBtn");
    if (langBtn) {
      langBtn.addEventListener("click", function () {
        self.currentLang = self.currentLang === "zh-TW" ? "vi" : "zh-TW";
        localStorage.setItem("benmi_lang", self.currentLang);
        self.updateLanguageUI();
        self.renderStoresList();
        self.updateMapMarkers();
      });
    }

    // Region Filter Chips
    var regionChips = document.querySelectorAll("[data-filter-region]");
    regionChips.forEach(function (chip) {
      chip.addEventListener("click", function () {
        regionChips.forEach(function (c) { c.classList.remove("active"); });
        chip.classList.add("active");
        self.currentFilter.region = chip.getAttribute("data-filter-region");
        self.applyFilters();
      });
    });

    // Cuisine Filter Chips
    var cuisineChips = document.querySelectorAll("[data-filter-cuisine]");
    cuisineChips.forEach(function (chip) {
      chip.addEventListener("click", function () {
        cuisineChips.forEach(function (c) { c.classList.remove("active"); });
        chip.classList.add("active");
        self.currentFilter.cuisine = chip.getAttribute("data-filter-cuisine");
        self.applyFilters();
      });
    });

    // Only Open Switch
    var openSwitch = document.getElementById("openOnlySwitch");
    if (openSwitch) {
      openSwitch.addEventListener("change", function (e) {
        self.currentFilter.onlyOpen = e.target.checked;
        self.applyFilters();
      });
    }

    // View Mode Toggle (Mobile / Tablet)
    var viewBtns = document.querySelectorAll("[data-view-mode]");
    viewBtns.forEach(function (btn) {
      btn.addEventListener("click", function () {
        viewBtns.forEach(function (b) { b.classList.remove("active"); });
        btn.classList.add("active");
        var mode = btn.getAttribute("data-view-mode");
        self.setViewMode(mode);
      });
    });

    // Recenter Map Button
    var recenterBtn = document.getElementById("mapRecenterBtn");
    if (recenterBtn) {
      recenterBtn.addEventListener("click", function () {
        self.fitMapToBounds();
      });
    }

    // Store Detail Modal Backdrop Close
    var modalBackdrop = document.getElementById("storePreviewModal");
    if (modalBackdrop) {
      modalBackdrop.addEventListener("click", function (e) {
        if (e.target === modalBackdrop) {
          self.closeStoreModal();
        }
      });
    }

    var modalCloseBtn = document.getElementById("modalCloseBtn");
    if (modalCloseBtn) {
      modalCloseBtn.addEventListener("click", function () {
        self.closeStoreModal();
      });
    }

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") {
        self.closeStoreModal();
      }
    });
  },

  setViewMode: function (mode) {
    this.viewMode = mode;
    var main = document.querySelector(".marketplace-main");
    if (main) {
      main.setAttribute("data-view", mode);
    }
    if (mode === "map" && this.map) {
      setTimeout(function () {
        if (typeof MarketplaceApp.map.resize === "function") {
          MarketplaceApp.map.resize();
        } else if (typeof MarketplaceApp.map.invalidateSize === "function") {
          MarketplaceApp.map.invalidateSize();
        }
      }, 150);
    }
  },

  updateLanguageUI: function () {
    var self = this;
    document.documentElement.lang = this.currentLang;

    // Update Header
    var brandTitle = document.getElementById("headerBrandTitle");
    if (brandTitle) brandTitle.innerText = this.t("brandTitle");
    var brandSubtitle = document.getElementById("headerBrandSubtitle");
    if (brandSubtitle) brandSubtitle.innerText = this.t("brandSubtitle");

    var searchInput = document.getElementById("marketplaceSearchInput");
    if (searchInput) searchInput.placeholder = this.t("searchPlaceholder");

    var gpsText = document.querySelector(".gps-text");
    if (gpsText) {
      gpsText.innerText = this.userCoords ? this.t("located") : this.t("locateMe");
    }

    var langText = document.getElementById("langSwitchText");
    if (langText) {
      langText.innerText = this.currentLang === "zh-TW" ? "繁體中文" : "Tiếng Việt";
    }

    // Update View Switcher
    var listBtn = document.querySelector('[data-view-mode="list"] span');
    if (listBtn) listBtn.innerText = this.t("viewList");
    var mapBtn = document.querySelector('[data-view-mode="map"] span');
    if (mapBtn) mapBtn.innerText = this.t("viewMap");

    // Update Filter Chips Text
    var chips = {
      'all': 'regionAll',
      'tucheng': 'regionTucheng',
      'xindian': 'regionXindian',
      'banqiao': 'regionBanqiao',
      'xinzhuang': 'regionXinzhuang',
      'taichung': 'regionTaichung'
    };
    Object.keys(chips).forEach(function (key) {
      var el = document.querySelector('[data-filter-region="' + key + '"]');
      if (el) el.innerText = self.t(chips[key]);
    });

    var cuisineMap = {
      'all': 'cuisineAll',
      'vietnamese': 'cuisineVietnamese',
      'taiwanese': 'cuisineTaiwanese',
      'snack': 'cuisineSnack'
    };
    Object.keys(cuisineMap).forEach(function (key) {
      var el = document.querySelector('[data-filter-cuisine="' + key + '"]');
      if (el) el.innerText = self.t(cuisineMap[key]);
    });

    var openLabel = document.getElementById("openOnlyLabel");
    if (openLabel) openLabel.innerText = this.t("onlyOpen");

    var recenterText = document.getElementById("recenterMapText");
    if (recenterText) recenterText.innerText = this.t("recenterMap");
  },

  fetchTenants: function () {
    var self = this;
    var apiBase = resolveApiBase();
    var url = apiBase + "/api/marketplace/tenants";

    fetch(url)
      .then(function (res) {
        if (!res.ok) throw new Error("HTTP " + res.status);
        return res.json();
      })
      .then(function (json) {
        if (json.success && Array.isArray(json.data)) {
          self.tenants = json.data;
          self.recomputeDistances();
          self.applyFilters();
          self.updateMapMarkers();
          self.fitMapToBounds();
        }
      })
      .catch(function (err) {
        console.error("[Marketplace] Fetch error:", err);
      });
  },

  requestUserLocation: function () {
    var self = this;
    var gpsBtn = document.getElementById("gpsLocateBtn");
    var gpsText = document.querySelector(".gps-text");

    if (!navigator.geolocation) {
      alert(this.t("locationDenied"));
      return;
    }

    if (gpsBtn) gpsBtn.classList.add("loading");
    if (gpsText) gpsText.innerText = this.t("locating");

    navigator.geolocation.getCurrentPosition(
      function (pos) {
        var lat = pos.coords.latitude;
        var lon = pos.coords.longitude;
        self.userCoords = { lat: lat, lon: lon };

        if (gpsBtn) {
          gpsBtn.classList.remove("loading");
          gpsBtn.classList.add("active");
        }
        if (gpsText) gpsText.innerText = self.t("located");

        // Add user marker on MapLibre map
        self.updateUserMapMarker(lat, lon);

        // Recompute distances and sort
        self.recomputeDistances();
        self.applyFilters();

        // Pan map smoothly to user location with MapLibre syntax
        if (self.map) {
          self.map.flyTo({
            center: [lon, lat],
            zoom: 13,
            pitch: 35,
            duration: 1200
          });
        }
      },
      function (err) {
        console.warn("[Marketplace] Geolocation error:", err);
        if (gpsBtn) gpsBtn.classList.remove("loading");
        if (gpsText) gpsText.innerText = self.t("locateMe");
        alert(self.t("locationDenied"));
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  },

  recomputeDistances: function () {
    var self = this;
    if (!this.userCoords) return;

    this.tenants.forEach(function (t) {
      if (t.latitude != null && t.longitude != null) {
        t.distanceKm = calculateDistance(
          self.userCoords.lat,
          self.userCoords.lon,
          t.latitude,
          t.longitude
        );
      } else {
        t.distanceKm = null;
      }
    });

    // Sort tenants: Nearest first
    this.tenants.sort(function (a, b) {
      if (a.distanceKm != null && b.distanceKm != null) {
        return a.distanceKm - b.distanceKm;
      }
      if (a.distanceKm != null) return -1;
      if (b.distanceKm != null) return 1;
      return 0;
    });
  },

  applyFilters: function () {
    var self = this;
    var search = (this.currentFilter.search || "").toLowerCase();
    var region = this.currentFilter.region;
    var cuisine = this.currentFilter.cuisine;
    var onlyOpen = this.currentFilter.onlyOpen;

    this.filteredTenants = this.tenants.filter(function (t) {
      // 1. Search Query
      if (search) {
        var matchName = (t.brandName || "").toLowerCase().includes(search);
        var matchSub = (t.brandSubtitle || "").toLowerCase().includes(search);
        var matchAddr = (t.storeAddress || "").toLowerCase().includes(search);
        var matchCuisine = (t.cuisineType || "").toLowerCase().includes(search);
        var matchCats = Array.isArray(t.categoriesSummary) &&
          t.categoriesSummary.some(function (c) { return c.toLowerCase().includes(search); });

        if (!matchName && !matchSub && !matchAddr && !matchCuisine && !matchCats) {
          return false;
        }
      }

      // 2. Region Filter
      if (region && region !== "all") {
        var addr = t.storeAddress || "";
        var regionMatch = false;
        if (region === "tucheng" && addr.includes("土城")) regionMatch = true;
        else if (region === "xindian" && addr.includes("新店")) regionMatch = true;
        else if (region === "banqiao" && addr.includes("板橋")) regionMatch = true;
        else if (region === "xinzhuang" && addr.includes("新莊")) regionMatch = true;
        else if (region === "taichung" && (addr.includes("台中") || addr.includes("南屯"))) regionMatch = true;
        if (!regionMatch) return false;
      }

      // 3. Cuisine Filter
      if (cuisine && cuisine !== "all") {
        if (t.cuisineType !== cuisine) return false;
      }

      // 4. Only Open Filter
      if (onlyOpen && !t.isOpen) {
        return false;
      }

      return true;
    });

    this.renderStoresList();
    this.updateMapMarkers();
  },

  renderStoresList: function () {
    var self = this;
    var container = document.getElementById("storesGrid");
    var countBadge = document.getElementById("storesCountBadge");

    if (countBadge) {
      countBadge.innerHTML = this.t("storesFound", { count: "<b>" + this.filteredTenants.length + "</b>" });
    }

    if (!container) return;

    if (this.filteredTenants.length === 0) {
      container.innerHTML = [
        '<div class="empty-state" style="grid-column: 1 / -1;">',
        '  <div class="empty-state-icon">' + MARKETPLACE_SVG.search + '</div>',
        '  <h3>' + this.t("noStoresFound") + '</h3>',
        '  <p>' + this.t("noStoresDesc") + '</p>',
        '  <button class="btn-card-preview" onclick="MarketplaceApp.resetFilters()" style="margin:0 auto;">' + this.t("clearFilters") + '</button>',
        '</div>'
      ].join("");
      return;
    }

    var html = this.filteredTenants.map(function (t) {
      var isOpen = t.isOpen;
      var brandColor = t.brandColor || "#059669";
      var statusClass = isOpen ? "open" : (t.storeStatus === "busy" ? "busy" : "closed");
      var statusText = isOpen ? self.t("openNow") : (t.storeStatus === "busy" ? self.t("busy") : self.t("closed"));
      var distStr = formatDistance(t.distanceKm, self.currentLang);
      var cuisineText = self.t("cuisine" + (t.cuisineType ? t.cuisineType.charAt(0).toUpperCase() + t.cuisineType.slice(1) : "All")) || t.cuisineType;

      var avatarHtml = t.logoUrl
        ? '<img src="' + t.logoUrl + '" alt="' + t.brandName + '" loading="lazy" onerror="this.parentElement.innerHTML=\'<span class=\\\'card-avatar-text\\\' style=\\\'color:' + brandColor + ';\\\'>' + (t.brandName.charAt(0)) + '</span>\'">'
        : '<span class="card-avatar-text" style="color:' + brandColor + ';">' + (t.brandName.charAt(0)) + '</span>';

      var categoriesHtml = "";
      if (Array.isArray(t.categoriesSummary) && t.categoriesSummary.length > 0) {
        categoriesHtml = '<div class="card-categories">' +
          t.categoriesSummary.slice(0, 3).map(function (c) {
            return '<span class="category-chip">' + c + '</span>';
          }).join("") +
          '</div>';
      }

      var orderUrl = "index.html?tenant=" + encodeURIComponent(t.tenantId);

      return [
        '<div class="store-card' + (self.activeTenantId === t.tenantId ? ' active-focus' : '') + '"',
        '     id="store-card-' + t.tenantId + '"',
        '     data-tenant-id="' + t.tenantId + '"',
        '     style="--card-brand-color:' + brandColor + ';"',
        '     onmouseenter="MarketplaceApp.highlightStore(\'' + t.tenantId + '\')"',
        '     onclick="MarketplaceApp.selectStore(\'' + t.tenantId + '\')">',
        '  <div class="card-accent-bar" style="background: linear-gradient(90deg, ' + brandColor + ', ' + brandColor + '66);"></div>',
        '  <div class="card-header">',
        '    <div class="card-avatar" style="border-color:' + brandColor + '33;">' + avatarHtml + '</div>',
        '    <div class="card-title-group">',
        '      <div class="card-title-row">',
        '        <h3 class="card-brand-name">' + t.brandName + '</h3>',
        '      </div>',
        '      <div class="card-meta-row">',
        '        <span class="card-cuisine-pill">' + cuisineText + '</span>',
        (distStr ? '        <span class="card-distance-pill">' + MARKETPLACE_SVG.mapPin + ' ' + distStr + '</span>' : ''),
        '      </div>',
        '    </div>',
        '  </div>',
        '  <div class="card-status-row">',
        '    <span class="status-badge ' + statusClass + '">',
        '      <span class="status-dot"></span>',
        '      <span>' + statusText + '</span>',
        '    </span>',
        '    <span class="hours-badge">',
        '      ' + MARKETPLACE_SVG.clock + ' ',
        '      <span>' + formatOperatingHoursPretty(t.operatingHours, t.parsedHours, self.currentLang, 'card') + '</span>',
        '    </span>',
        '  </div>',
        '  <div class="card-details">',
        '    <div class="detail-line" title="' + (t.storeAddress || '') + '">',
        '      ' + MARKETPLACE_SVG.mapPin,
        '      <span>' + (t.storeAddress ? t.storeAddress.split('\n')[0] : '台灣') + '</span>',
        '    </div>',
        '  </div>',
        categoriesHtml,
        '  <div class="card-actions" onclick="event.stopPropagation()">',
        '    <button class="btn-card-preview" onclick="MarketplaceApp.openStoreModal(\'' + t.tenantId + '\')">',
        '      ' + MARKETPLACE_SVG.store + ' ' + self.t("btnDetails"),
        '    </button>',
        '    <a class="btn-card-order" href="' + orderUrl + '">',
        '      ' + MARKETPLACE_SVG.shoppingBag + ' ' + self.t("btnOrder") + ' <span class="btn-arrow">→</span>',
        '    </a>',
        '  </div>',
        '</div>'
      ].join("");
    }).join("");

    container.innerHTML = html;
  },

  resetFilters: function () {
    this.currentFilter = { search: "", region: "all", cuisine: "all", onlyOpen: false };
    var searchInput = document.getElementById("marketplaceSearchInput");
    if (searchInput) searchInput.value = "";
    var clearBtn = document.getElementById("searchClearBtn");
    if (clearBtn) clearBtn.style.display = "none";
    var openSwitch = document.getElementById("openOnlySwitch");
    if (openSwitch) openSwitch.checked = false;

    document.querySelectorAll("[data-filter-region]").forEach(function (c) {
      c.classList.toggle("active", c.getAttribute("data-filter-region") === "all");
    });
    document.querySelectorAll("[data-filter-cuisine]").forEach(function (c) {
      c.classList.toggle("active", c.getAttribute("data-filter-cuisine") === "all");
    });

    this.applyFilters();
  },

  // 6. MapLibre GL JS Vector Map Engine Controller (Native GPU Supercluster)
  initMap: function () {
    if (typeof maplibregl === "undefined") {
      console.warn("[Marketplace] MapLibre GL JS not loaded yet");
      return;
    }

    var mapContainer = document.getElementById("marketplaceMap");
    if (!mapContainer) return;

    var self = this;
    // MapLibre uses [lng, lat]
    this.map = new maplibregl.Map({
      container: "marketplaceMap",
      style: "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json",
      center: [121.44288, 24.97022],
      zoom: 11.5,
      pitch: 0,
      bearing: 0,
      antialias: true
    });

    // Add Navigation Control (Zoom +/- and 3D Compass)
    this.map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), "top-left");

    this.map.on("load", function () {
      self.setupMapLayers();
      self.updateMapSource();
      self.fitMapToBounds();
    });

    // Sync HTML cluster badges and unclustered pins continuously during map navigation
    this.map.on("move", function () {
      self.updateHtmlMarkers();
    });
    this.map.on("moveend", function () {
      self.updateHtmlMarkers();
    });
  },

  buildGeoJSON: function () {
    var features = [];
    (this.filteredTenants || []).forEach(function (t) {
      if (t.latitude != null && t.longitude != null) {
        features.push({
          type: "Feature",
          id: t.tenantId,
          geometry: {
            type: "Point",
            coordinates: [Number(t.longitude), Number(t.latitude)]
          },
          properties: {
            tenantId: t.tenantId,
            brandName: t.brandName,
            brandColor: t.brandColor || "#059669",
            logoUrl: t.logoUrl || "",
            isOpen: Boolean(t.isOpen),
            storeStatus: t.storeStatus || "open",
            storeAddress: t.storeAddress || "",
            cuisineType: t.cuisineType || "vietnamese",
            distanceKm: t.distanceKm || 0
          }
        });
      }
    });

    return {
      type: "FeatureCollection",
      features: features
    };
  },

  setupMapLayers: function () {
    var self = this;
    if (!this.map) return;

    // 1. GeoJSON Supercluster Source
    if (!this.map.getSource("tenants-source")) {
      this.map.addSource("tenants-source", {
        type: "geojson",
        data: this.buildGeoJSON(),
        cluster: true,
        clusterMaxZoom: 13,
        clusterRadius: 65
      });
    }

    // 2. Invisible Cluster Target Layer for Supercluster query
    if (!this.map.getLayer("clusters-target")) {
      this.map.addLayer({
        id: "clusters-target",
        type: "circle",
        source: "tenants-source",
        filter: ["has", "point_count"],
        paint: {
          "circle-color": "rgba(0,0,0,0)",
          "circle-radius": 24
        }
      });
    }

    // 3. Invisible Unclustered Target Layer for Supercluster query
    if (!this.map.getLayer("unclustered-target")) {
      this.map.addLayer({
        id: "unclustered-target",
        type: "circle",
        source: "tenants-source",
        filter: ["!", ["has", "point_count"]],
        paint: {
          "circle-color": "rgba(0,0,0,0)",
          "circle-radius": 1
        }
      });
    }
  },

  updateMapSource: function () {
    if (!this.map || typeof maplibregl === "undefined") return;
    var source = this.map.getSource("tenants-source");
    var geojson = this.buildGeoJSON();

    if (source) {
      source.setData(geojson);
    }
    this.updateHtmlMarkers();
  },

  updateMapMarkers: function () {
    this.updateMapSource();
  },

  updateHtmlMarkers: function () {
    var self = this;
    if (!this.map || !this.map.getSource("tenants-source")) return;

    var tenantMap = {};
    (this.filteredTenants || []).forEach(function (t) { tenantMap[t.tenantId] = t; });

    // 1. Process Luxury Cluster Badges
    var clusterFeatures = this.map.queryRenderedFeatures({ layers: ["clusters-target"] });
    var newClusterMarkers = {};

    for (var i = 0; i < clusterFeatures.length; i++) {
      var cFeat = clusterFeatures[i];
      var cCoords = cFeat.geometry.coordinates;
      var cProps = cFeat.properties;
      var clusterId = String(cProps.cluster_id);
      var pointCount = cProps.point_count;

      if (newClusterMarkers[clusterId]) continue;

      var cMarker = self.clusterMarkers[clusterId];
      if (!cMarker) {
        var clusterEl = document.createElement("div");
        clusterEl.className = "custom-cluster-badge";
        clusterEl.innerHTML = [
          '<div class="cluster-halo"></div>',
          '<div class="cluster-core">',
          '  <span class="cluster-count">' + pointCount + '</span>',
          '</div>'
        ].join("");

        (function (cId, coords) {
          clusterEl.addEventListener("click", function (e) {
            e.stopPropagation();
            self.map.getSource("tenants-source").getClusterExpansionZoom(Number(cId), function (err, zoom) {
              if (err) return;
              self.map.flyTo({
                center: coords,
                zoom: Math.min(zoom + 0.6, 15),
                pitch: 35,
                duration: 800
              });
            });
          });
        })(clusterId, cCoords);

        cMarker = new maplibregl.Marker({ element: clusterEl, anchor: "center" })
          .setLngLat([cCoords[0], cCoords[1]])
          .addTo(self.map);
      }

      newClusterMarkers[clusterId] = cMarker;
    }

    // Remove old clusters no longer rendered
    for (var cId in self.clusterMarkers) {
      if (!newClusterMarkers[cId]) {
        self.clusterMarkers[cId].remove();
      }
    }
    self.clusterMarkers = newClusterMarkers;

    // 2. Process Individual Unclustered Pins
    var unclusteredFeatures = this.map.queryRenderedFeatures({ layers: ["unclustered-target"] });
    var newStoreMarkers = {};

    for (var j = 0; j < unclusteredFeatures.length; j++) {
      var uFeat = unclusteredFeatures[j];
      var uCoords = uFeat.geometry.coordinates;
      var uProps = uFeat.properties;
      var storeId = uProps.tenantId;

      if (!storeId || newStoreMarkers[storeId]) continue;
      var t = tenantMap[storeId];
      if (!t) continue;

      var marker = self.markers[storeId];
      if (!marker) {
        var isOpen = t.isOpen;
        var statusClass = isOpen ? "open" : (t.storeStatus === "busy" ? "busy" : "closed");
        var brandColor = t.brandColor || "#059669";

        var pinWrapper = document.createElement("div");
        pinWrapper.className = "custom-marker-anchor" + (self.activeTenantId === t.tenantId ? " active" : "");
        pinWrapper.id = "marker-pin-" + t.tenantId;

        var pinAvatar = t.logoUrl
          ? '<img src="' + t.logoUrl + '" alt="' + t.brandName + '">'
          : MARKETPLACE_SVG.utensils;

        pinWrapper.innerHTML = [
          '<div class="custom-map-pin">',
          '  <div class="pin-shadow"></div>',
          '  <div class="pin-badge ' + statusClass + '" style="background-color: ' + brandColor + ';">',
          '    <div class="pin-icon-wrap">' + pinAvatar + '</div>',
          '    <span class="pin-status-dot"></span>',
          '  </div>',
          '  <div class="pin-needle" style="border-top-color: ' + brandColor + ';"></div>',
          '</div>'
        ].join("");

        // Build Popup Content
        var avatarHtml = t.logoUrl
          ? '<img src="' + t.logoUrl + '" alt="' + t.brandName + '">'
          : '<span>' + (t.brandName.charAt(0)) + '</span>';
        var statusText = isOpen ? self.t("openNow") : (t.storeStatus === "busy" ? self.t("busy") : self.t("closed"));
        var distStr = formatDistance(t.distanceKm, self.currentLang);
        var orderUrl = "index.html?tenant=" + encodeURIComponent(t.tenantId);

        var popupHtml = [
          '<div class="map-popup-card">',
          '  <div class="popup-header">',
          '    <div class="popup-avatar" style="border: 1px solid ' + brandColor + '33;">' + avatarHtml + '</div>',
          '    <div>',
          '      <h4 class="popup-brand-name">' + t.brandName + '</h4>',
          '      <span class="status-badge ' + statusClass + '" style="margin-top:2px;">',
          '        <span class="status-dot"></span> ' + statusText,
          '      </span>',
          (distStr ? '      <span style="font-size:0.75rem; color:var(--text-muted); margin-left:4px;">' + distStr + '</span>' : ''),
          '    </div>',
          '  </div>',
          '  <p class="popup-address">' + (t.storeAddress ? t.storeAddress.split('\n')[0] : '') + '</p>',
          '  <div class="popup-footer">',
          '    <a class="popup-order-btn" href="' + orderUrl + '">',
          '      ' + MARKETPLACE_SVG.shoppingBag + ' ' + self.t("btnOrder") + ' →',
          '    </a>',
          '  </div>',
          '</div>'
        ].join("");

        var popup = new maplibregl.Popup({ offset: [0, -48], closeButton: true })
          .setHTML(popupHtml);

        (function (storeId) {
          pinWrapper.addEventListener("click", function (e) {
            e.stopPropagation();
            self.selectStore(storeId, false);
          });
        })(t.tenantId);

        marker = new maplibregl.Marker({ element: pinWrapper, anchor: "bottom" })
          .setLngLat([uCoords[0], uCoords[1]])
          .setPopup(popup)
          .addTo(self.map);
      }

      newStoreMarkers[storeId] = marker;
    }

    // Remove old unclustered markers no longer visible or now grouped into clusters
    for (var sId in self.markers) {
      if (!newStoreMarkers[sId]) {
        self.markers[sId].remove();
      }
    }
    self.markers = newStoreMarkers;
  },

  updateUserMapMarker: function (lat, lon) {
    if (!this.map || typeof maplibregl === "undefined") return;

    if (this.userMarker) {
      this.userMarker.remove();
    }

    var userEl = document.createElement("div");
    userEl.className = "user-location-marker";

    this.userMarker = new maplibregl.Marker({ element: userEl, anchor: "center" })
      .setLngLat([lon, lat])
      .addTo(this.map);
  },

  fitMapToBounds: function () {
    if (!this.map || typeof maplibregl === "undefined") return;

    var bounds = new maplibregl.LngLatBounds();
    var hasPoints = false;

    if (this.userCoords) {
      bounds.extend([this.userCoords.lon, this.userCoords.lat]);
      hasPoints = true;
    }

    this.filteredTenants.forEach(function (t) {
      if (t.latitude != null && t.longitude != null) {
        bounds.extend([t.longitude, t.latitude]);
        hasPoints = true;
      }
    });

    if (hasPoints) {
      this.map.fitBounds(bounds, {
        padding: { top: 60, bottom: 60, left: 60, right: 60 },
        maxZoom: 14,
        pitch: 0,
        bearing: 0,
        duration: 1000
      });
    }
  },

  highlightStore: function (tenantId) {
    var pinEl = document.getElementById("marker-pin-" + tenantId);
    if (pinEl) {
      document.querySelectorAll(".custom-marker-anchor").forEach(function (p) { p.classList.remove("active"); });
      pinEl.classList.add("active");
    }
  },

  selectStore: function (tenantId, panMap) {
    if (panMap === undefined) panMap = true;
    this.activeTenantId = tenantId;

    // Update active card class
    document.querySelectorAll(".store-card").forEach(function (c) {
      c.classList.remove("active-focus");
    });
    var card = document.getElementById("store-card-" + tenantId);
    if (card) {
      card.classList.add("active-focus");
      card.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }

    var t = this.tenants.find(function (item) { return item.tenantId === tenantId; });
    if (!t || t.latitude == null || t.longitude == null || !this.map) return;

    var self = this;
    if (panMap) {
      var targetZoom = Math.max(this.map.getZoom(), 14.5);
      this.map.flyTo({
        center: [t.longitude, t.latitude],
        zoom: targetZoom,
        pitch: 35,
        duration: 900
      });
    }

    setTimeout(function () {
      self.updateHtmlMarkers();
      self.highlightStore(tenantId);
      var marker = self.markers[tenantId];
      if (marker && marker.getPopup()) {
        if (!marker.getPopup().isOpen()) {
          marker.togglePopup();
        }
      }
    }, 450);
  },

  // 7. Store Detail Modal Controller
  openStoreModal: function (tenantId) {
    var self = this;
    var tenant = this.tenants.find(function (t) { return t.tenantId === tenantId; });
    if (!tenant) return;

    var modal = document.getElementById("storePreviewModal");
    var body = document.getElementById("storeModalContent");
    if (!modal || !body) return;

    var isOpen = tenant.isOpen;
    var statusClass = isOpen ? "open" : (tenant.storeStatus === "busy" ? "busy" : "closed");
    var statusText = isOpen ? this.t("openNow") : (tenant.storeStatus === "busy" ? this.t("busy") : this.t("closed"));
    var distStr = formatDistance(tenant.distanceKm, this.currentLang);

    var avatarHtml = tenant.logoUrl
      ? '<img src="' + tenant.logoUrl + '" alt="' + tenant.brandName + '">'
      : '<span>' + (tenant.brandName.charAt(0)) + '</span>';

    var directionsUrl = tenant.storeAddress
      ? "https://www.google.com/maps/dir/?api=1&destination=" + encodeURIComponent(tenant.storeAddress)
      : (tenant.latitude && tenant.longitude ? "https://www.google.com/maps/dir/?api=1&destination=" + tenant.latitude + "," + tenant.longitude : "#");

    var diningBadges = [];
    if (tenant.allowDineIn) diningBadges.push('<span class="feature-pill">' + MARKETPLACE_SVG.utensils + ' ' + this.t("modalDiningDineIn") + '</span>');
    if (tenant.allowScheduledPickup) diningBadges.push('<span class="feature-pill">' + MARKETPLACE_SVG.clock + ' ' + this.t("modalDiningScheduled") + '</span>');
    diningBadges.push('<span class="feature-pill">' + MARKETPLACE_SVG.shoppingBag + ' ' + this.t("modalDiningTakeaway") + '</span>');

    var orderUrl = "index.html?tenant=" + encodeURIComponent(tenant.tenantId);

    body.innerHTML = [
      '<div class="modal-banner" style="background: linear-gradient(135deg, ' + (tenant.brandColor || '#059669') + ' 0%, #10b981 100%);">',
      '  <button class="modal-close-btn" id="modalCloseBtn" onclick="MarketplaceApp.closeStoreModal()">' + MARKETPLACE_SVG.close + '</button>',
      '</div>',
      '<div class="modal-body">',
      '  <div class="modal-header-row">',
      '    <div class="modal-avatar">' + avatarHtml + '</div>',
      '    <div class="modal-title-group">',
      '      <h2>' + tenant.brandName + '</h2>',
      (tenant.brandSubtitle ? '      <p>' + tenant.brandSubtitle + '</p>' : ''),
      '      <div style="margin-top: 6px; display:flex; align-items:center; gap:8px;">',
      '        <span class="status-badge ' + statusClass + '">',
      '          <span class="status-dot"></span> ' + statusText,
      '        </span>',
      (distStr ? '        <span class="distance-badge">' + MARKETPLACE_SVG.mapPin + ' ' + distStr + '</span>' : ''),
      '      </div>',
      '    </div>',
      '  </div>',
      '  <div class="modal-features-row">',
      diningBadges.join(""),
      '  </div>',
      '  <div class="modal-section-card">',
      '    <div class="modal-info-row">',
      '      ' + MARKETPLACE_SVG.mapPin,
      '      <div>',
      '        <strong>' + this.t("modalAddress") + ':</strong><br>',
      '        <span>' + (tenant.storeAddress || '台灣') + '</span><br>',
      '        <a class="maps-link" href="' + directionsUrl + '" target="_blank" rel="noopener noreferrer">',
      '          ' + MARKETPLACE_SVG.externalLink + ' ' + this.t("modalDirections"),
      '        </a>',
      '      </div>',
      '    </div>',
      '  </div>',
      '  <div class="modal-section-card">',
      '    <div class="modal-info-row">',
      '      ' + MARKETPLACE_SVG.clock,
      '      <div style="width:100%;">',
      '        <strong>' + this.t("modalHours") + ':</strong>',
      '        ' + formatOperatingHoursPretty(tenant.operatingHours, tenant.parsedHours, this.currentLang, 'modal'),
      '      </div>',
      '    </div>',
      '  </div>',
      (tenant.deliveryPolicy ? [
        '  <div class="modal-section-card">',
        '    <div class="modal-info-row">',
        '      ' + MARKETPLACE_SVG.shoppingBag,
        '      <div>',
        '        <strong>' + this.t("modalDelivery") + ':</strong><br>',
        '        <span style="white-space:pre-line;">' + tenant.deliveryPolicy + '</span>',
        '      </div>',
        '    </div>',
        '  </div>'
      ].join("") : ''),
      '  <a class="modal-cta-btn" href="' + orderUrl + '">',
      '    ' + MARKETPLACE_SVG.shoppingBag + ' ' + this.t("btnOrder"),
      '  </a>',
      '</div>'
    ].join("");

    modal.classList.add("open");
    document.body.style.overflow = "hidden";
  },

  closeStoreModal: function () {
    var modal = document.getElementById("storePreviewModal");
    if (modal) modal.classList.remove("open");
    document.body.style.overflow = "";
  }
};

window.MarketplaceApp = MarketplaceApp;

document.addEventListener("DOMContentLoaded", function () {
  MarketplaceApp.init();
});
