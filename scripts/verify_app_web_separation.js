const fs = require("fs");
const assert = require("assert");

console.log("=================================================");
console.log("🔍 Verifying Platform Separation & Printer Status...");
console.log("=================================================");

const html = fs.readFileSync("orders.html", "utf8");
const css = fs.readFileSync("css/orders.css", "utf8");
const coreJs = fs.readFileSync("js/orders-core.js", "utf8");
const settingsJs = fs.readFileSync("js/orders-settings.js", "utf8");
const i18nJs = fs.readFileSync("js/orders-i18n.js", "utf8");
const escPosJava = fs.readFileSync("apps/android-pos/android/app/src/main/java/com/benmi/pos/EscPosBitmapConverter.java", "utf8");
const pluginJava = fs.readFileSync("apps/android-pos/android/app/src/main/java/com/benmi/pos/ThermalPrinterPlugin.java", "utf8");

// 1. HTML Verification
assert(html.includes("isApp ? 'is-native-app' : 'is-web-platform'"), "orders.html must have early platform detection in head");
console.log("✓ Early platform detection script present in orders.html head");

assert(!html.includes("settings-sync-badge"), "settings-sync-badge must be removed from orders.html");
console.log("✓ Cloud sync badge (settings-sync-badge) removed from orders.html");

assert(html.includes('id="settings-printer-status-bar"'), "settings-printer-status-bar pill must be in orders.html");
assert(html.includes('id="settings-printer-status-text"'), "settings-printer-status-text must be in orders.html");
console.log("✓ Real-time printer status pill element present in settings header");

// 2. CSS Verification
assert(css.includes(".is-native-app #toc-item-reports"), "css must hide #toc-item-reports in native app");
assert(css.includes(".is-native-app #setting-card-reports"), "css must hide #setting-card-reports in native app");
assert(css.includes(".is-native-app #view-reports"), "css must hide #view-reports in native app");
console.log("✓ Native App mode: Analytics/Reports (#toc-item-reports, #setting-card-reports, #view-reports) hidden via CSS");

assert(css.includes(".is-web-platform.is-prod-env #toc-item-printer") || css.includes(".hide-web-printer #toc-item-printer"), "css must hide #toc-item-printer on web production");
assert(css.includes(".is-web-platform.is-prod-env #setting-card-printer") || css.includes(".hide-web-printer #setting-card-printer"), "css must hide #setting-card-printer on web production");
assert(css.includes(".is-web-platform.is-prod-env .modal-print-toolbar") || css.includes(".hide-web-printer .modal-print-toolbar"), "css must hide .modal-print-toolbar on web production");
assert(css.includes(".is-web-platform.is-prod-env .review-item-print-btn") || css.includes(".hide-web-printer .review-item-print-btn"), "css must hide .review-item-print-btn on web production");
assert(css.includes(".is-web-platform.is-prod-env #settings-printer-status-bar") || css.includes(".hide-web-printer #settings-printer-status-bar"), "css must hide #settings-printer-status-bar on web production");
console.log("✓ Web Production mode: Print features (#toc-item-printer, #setting-card-printer, print toolbar, item print buttons) hidden via CSS in production only, allowing testing on dev/staging/localhost");

assert(css.includes(".settings-printer-status-pill.connected"), "css must have .settings-printer-status-pill.connected");
assert(css.includes(".settings-printer-status-pill.disconnected"), "css must have .settings-printer-status-pill.disconnected");
assert(css.includes(".printer-status-dot.online"), "css must have .printer-status-dot.online");
console.log("✓ Printer status pill styles (connected, disconnected, online dot) defined in css/orders.css");

// 3. JavaScript Verification
assert(coreJs.includes("function isNativeAppPlatform()"), "orders-core.js must declare isNativeAppPlatform");
assert(coreJs.includes("function shouldHideWebPrinter()"), "orders-core.js must declare shouldHideWebPrinter");
assert(coreJs.includes("const _isProd = !_isDev && !_isStaging;"), "orders-core.js must detect production environment");
assert(coreJs.includes("if (tab === \"reports\" && isNativeAppPlatform())"), "switchTab must guard reports tab on native app");
console.log("✓ isNativeAppPlatform(), shouldHideWebPrinter() and switchTab() guard implemented in orders-core.js");

assert(settingsJs.includes("function updateSettingsPrinterStatusDisplay()"), "orders-settings.js must implement updateSettingsPrinterStatusDisplay");
assert(settingsJs.includes("el.offsetParent !== null"), "initSettingsScrollSpy must skip hidden elements (offsetParent === null)");
console.log("✓ updateSettingsPrinterStatusDisplay() and ScrollSpy hidden-element skip implemented in orders-settings.js");

assert(i18nJs.includes("printerStatusConnected: \"已連線印表機\""), "i18n zh-TW must have printerStatusConnected");
assert(i18nJs.includes("printerStatusConnected: \"Đã kết nối máy in\""), "i18n vi must have printerStatusConnected");
assert(i18nJs.includes("printerStatusNone: \"未連線印表機\""), "i18n zh-TW must have printerStatusNone");
assert(i18nJs.includes("printerStatusNone: \"Chưa kết nối máy in\""), "i18n vi must have printerStatusNone");
console.log("✓ I18N keys for printer connection status present in both zh-TW and vi dictionaries");

// 4. Java ESC/POS & Bluetooth Print Fixes
assert(escPosJava.includes("MAX_CHUNK_HEIGHT = 200"), "EscPosBitmapConverter must chunk raster bitmap into max 200 lines");
assert(escPosJava.includes("stream.write(0x1B);\n            stream.write(0x64);\n            stream.write(0x04);"), "EscPosBitmapConverter must feed lines before cutting");
console.log("✓ EscPosBitmapConverter slices raster bitmaps into max 200-line chunks to prevent buffer overflow/page splitting");

assert(pluginJava.includes("final int chunkSize = 1024;"), "ThermalPrinterPlugin must chunk Bluetooth writes into 1024-byte packets");
assert(pluginJava.includes("Math.max(800,"), "ThermalPrinterPlugin must wait dynamically before closing Bluetooth RFCOMM socket");
console.log("✓ ThermalPrinterPlugin paces Bluetooth writes and prevents premature socket closure");

console.log("\n=================================================");
console.log("🎉 ALL PLATFORM SEPARATION & PRINT FIX CHECKS PASSED!");
console.log("=================================================");
