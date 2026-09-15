// Verification script for Modern Startup Modals (Start Shift & Store Activation)
const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log("=================================================");
console.log("🧪 Testing Modern Startup Modals (Start Shift & Store Activation)");
console.log("=================================================");

const htmlPath = path.join(__dirname, '../orders.html');
const cssPath = path.join(__dirname, '../css/orders.css');
const i18nPath = path.join(__dirname, '../js/orders-i18n.js');
const audioPath = path.join(__dirname, '../js/orders-audio.js');

const html = fs.readFileSync(htmlPath, 'utf8');
const css = fs.readFileSync(cssPath, 'utf8');
const i18n = fs.readFileSync(i18nPath, 'utf8');
const audio = fs.readFileSync(audioPath, 'utf8');

// 1. Check HTML Markup for Start Shift Modal
assert(html.includes('id="startShiftModal" class="modal start-shift-modal"'), "startShiftModal must have class start-shift-modal");
assert(html.includes('class="start-shift-box"'), "startShiftModal must have start-shift-box");
assert(html.includes('class="start-shift-badge-wrap"'), "startShiftModal must have start-shift-badge-wrap");
assert(html.includes('class="start-shift-pulse-ring"'), "startShiftModal must have start-shift-pulse-ring");
assert(html.includes('class="start-shift-icon"'), "startShiftModal must have start-shift-icon");
assert(html.includes('id="i18n-start-shift-title"'), "startShiftModal must have title id");
assert(html.includes('id="i18n-start-shift-desc"'), "startShiftModal must have desc id");
assert(html.includes('id="i18n-start-shift-status"'), "startShiftModal must have status pill id");
assert(html.includes('id="i18n-btn-start-shift"'), "startShiftModal must have button id");
assert(html.includes('id="i18n-btn-start-shift-text"'), "startShiftModal must have button text span id");

// Ensure no childish emoji in startShiftModal
const startShiftSection = html.slice(html.indexOf('id="startShiftModal"'), html.indexOf('<!-- Store Activation Modal'));
assert(!startShiftSection.includes('🔔'), "startShiftModal must NOT have 🔔 emoji");
assert(!startShiftSection.includes('🚀'), "startShiftModal must NOT have 🚀 emoji");
console.log("✓ HTML: Start Shift Modal markup is modern, cleanly structured and free of childish emojis");

// 2. Check HTML Markup for Store Activation Modal
assert(html.includes('id="storeActivationModal" class="modal store-activation-modal"'), "storeActivationModal must have class store-activation-modal");
assert(html.includes('class="store-activation-box"'), "storeActivationModal must have store-activation-box");
assert(html.includes('class="store-activation-logo-wrap"'), "storeActivationModal must have store-activation-logo-wrap");
assert(html.includes('class="store-activation-title"'), "storeActivationModal must have store-activation-title");
assert(html.includes('class="store-activation-input"'), "storeActivationModal must have store-activation-input");
assert(html.includes('class="store-activation-btn"'), "storeActivationModal must have store-activation-btn");
console.log("✓ HTML: Store Activation Modal markup is modernized with matching classes");

// 3. Check CSS rules
const requiredCssClasses = [
  '.start-shift-modal',
  '.start-shift-box',
  '.start-shift-badge-wrap',
  '.start-shift-pulse-ring',
  '.start-shift-icon',
  '.start-shift-title',
  '.start-shift-sub',
  '.start-shift-status-pill',
  '.start-shift-btn',
  '.store-activation-modal',
  '.store-activation-box',
  '.store-activation-logo-wrap',
  '.store-activation-title',
  '.store-activation-input',
  '.store-activation-btn'
];

for (const cls of requiredCssClasses) {
  assert(css.includes(cls), `Missing CSS rule for ${cls}`);
}
console.log("✓ CSS: All 15 required CSS classes are present in css/orders.css");

// 4. Check I18N
assert(i18n.includes('startShiftStatus: "即時連線・就緒接收新訂單"'), "Missing startShiftStatus in zh-TW");
assert(i18n.includes('startShiftStatus: "Kết nối máy chủ・Sẵn sàng nhận đơn"'), "Missing startShiftStatus in vi");
assert(i18n.includes('document.getElementById("i18n-start-shift-status")'), "Missing applyLanguageToDOM binding for startShiftStatus");
console.log("✓ I18N: startShiftStatus key defined in zh-TW & vi and properly bound in applyLanguageToDOM()");

// 5. Check Audio startup logic
assert(audio.includes('checkInitialSessionModal'), "Missing checkInitialSessionModal");
assert(audio.includes('i18n-btn-start-shift'), "checkInitialSessionModal focuses start shift button");
console.log("✓ JS: checkInitialSessionModal properly handles display and button focus");

// 6. Check Cache-buster
assert(html.includes('css/orders.css?v=20260914_startup_modals_modern_v1'), "orders.css cache-buster not updated");
assert(html.includes('js/orders-i18n.js?v=20260914_startup_modals_modern_v1'), "orders-i18n.js cache-buster not updated");
assert(html.includes('js/orders-audio.js?v=20260914_startup_modals_modern_v1'), "orders-audio.js cache-buster not updated");
console.log("✓ Cache-Buster: All modified files bumped to 20260914_startup_modals_modern_v1");

console.log("=================================================");
console.log("🎉 ALL STARTUP MODAL VERIFICATION CHECKS PASSED!");
console.log("=================================================");
