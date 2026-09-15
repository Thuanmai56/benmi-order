/**
 * scripts/verify_history_and_menu_ui.js
 * Verification script for POS Order History and Menu Management UI/UX modernization.
 */
const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('====================================================');
console.log('🧪 Verifying Order History & Menu Management Modernization');
console.log('====================================================\n');

const rootDir = path.resolve(__dirname, '..');

// 1. Emoji Prohibition Check in targeted files
console.log('1. Checking for emojis in orders-history.js and orders-menu.js...');
const historyJs = fs.readFileSync(path.join(rootDir, 'js/orders-history.js'), 'utf8');
const menuJs = fs.readFileSync(path.join(rootDir, 'js/orders-menu.js'), 'utf8');

// Common emojis to guard against in POS code
const forbiddenEmojis = ['📅', '📂', '📁', '⚙️', '✏️', '🗑️', '🍽️', '🏷️', '🧪', '🟢', '🔴', '📷', '➕', '📦', '🪑'];

forbiddenEmojis.forEach(emoji => {
    assert(!historyJs.includes(emoji), `Forbidden emoji found in js/orders-history.js: ${emoji}`);
    assert(!menuJs.includes(emoji), `Forbidden emoji found in js/orders-menu.js: ${emoji}`);
});
console.log('  ✓ No forbidden emojis found in js/orders-history.js & js/orders-menu.js');

// 2. HTML Elements Check
console.log('2. Verifying DOM structure in orders.html...');
const ordersHtml = fs.readFileSync(path.join(rootDir, 'orders.html'), 'utf8');

const requiredHtmlIds = [
    'history-search-input',
    'btn-history-search-clear',
    'history-filter-group',
    'i18n-hist-filter-all',
    'i18n-hist-filter-dinein',
    'i18n-hist-filter-takeaway',
    'history-total-summary-badge',
    'btn-toggle-all-history',
    'btn-menu-save',
    'btn-menu-add-item',
    'menu-categories'
];

requiredHtmlIds.forEach(id => {
    assert(ordersHtml.includes(`id="${id}"`), `Missing required element ID in orders.html: ${id}`);
});
console.log('  ✓ All required IDs for history toolbar and menu management are present in orders.html');

// 3. I18N Parity Check
console.log('3. Verifying I18N keys parity in js/orders-i18n.js...');
const i18nJs = fs.readFileSync(path.join(rootDir, 'js/orders-i18n.js'), 'utf8');

const requiredI18nKeys = [
    'historySearchPlaceholder',
    'historyFilterAll',
    'historyFilterDineIn',
    'historyFilterTakeaway',
    'historyNoSearchResults',
    'historyNoSearchResultsSub',
    'btnClearFilter',
    'categoryTypeCatalogBadge',
    'menuItemBadgePlaceholder',
    'menuItemPricePlaceholder'
];

const vm = require('vm');
const i18nContext = {
    window: {},
    document: {
        documentElement: { lang: 'zh-TW' },
        addEventListener: () => {},
        querySelector: () => null,
        querySelectorAll: () => [],
        getElementById: () => null
    }
};
vm.createContext(i18nContext);
vm.runInContext(i18nJs + '\nthis.I18N = I18N;', i18nContext);
const I18N = i18nContext.I18N;

assert(I18N && I18N['zh-TW'] && I18N['vi'], 'I18N dictionary failed to load in VM');

requiredI18nKeys.forEach(key => {
    assert(I18N['zh-TW'][key], `Missing key '${key}' in I18N['zh-TW']`);
    assert(I18N['vi'][key], `Missing key '${key}' in I18N['vi']`);

    forbiddenEmojis.forEach(emoji => {
        assert(!I18N['zh-TW'][key].includes(emoji), `Emoji found in I18N['zh-TW'][${key}]: ${emoji}`);
        assert(!I18N['vi'][key].includes(emoji), `Emoji found in I18N['vi'][${key}]: ${emoji}`);
    });
});
console.log('  ✓ I18N dictionaries have full key coverage in zh-TW and vi, with 0 emojis in history & menu keys');

// 4. CSS Touch Target & Style Rules
console.log('4. Verifying touch target and styling classes in css/orders.css...');
const ordersCss = fs.readFileSync(path.join(rootDir, 'css/orders.css'), 'utf8');

const requiredClasses = [
    '.history-header',
    '.history-toolbar',
    '.history-search-box',
    '.history-filter-group',
    '.history-filter-btn',
    '.history-empty-state',
    '.menu-sidebar-panel',
    '.menu-manage-cats-btn',
    '.menu-editor-panel',
    '.menu-action-btn',
    '.menu-item-row',
    '.menu-item-main-fields',
    '.menu-item-price-input',
    '.menu-item-status-pill',
    '.status-dot'
];

requiredClasses.forEach(cls => {
    assert(ordersCss.includes(cls), `Missing CSS class in css/orders.css: ${cls}`);
});

// Assert menu-item-price-input is narrow (52px width, <= 60px)
const priceInputMatch = ordersCss.match(/\.menu-item-price-input\s*\{[^}]*width:\s*(\d+)px/);
assert(priceInputMatch && parseInt(priceInputMatch[1], 10) <= 56, `menu-item-price-input must be narrow (<= 56px), found: ${priceInputMatch ? priceInputMatch[1] : 'none'}`);

console.log('  ✓ All required CSS component classes exist and price input is made compact & narrow (<= 56px)');

// 5. JavaScript Logic & Method Verification
console.log('5. Verifying function signatures & logic...');
assert(historyJs.includes('function onHistorySearchInput'), 'Missing onHistorySearchInput in js/orders-history.js');
assert(historyJs.includes('function clearHistorySearch'), 'Missing clearHistorySearch in js/orders-history.js');
assert(historyJs.includes('function setHistoryFilter'), 'Missing setHistoryFilter in js/orders-history.js');
assert(historyJs.includes('historySearchQuery'), 'Missing historySearchQuery state in js/orders-history.js');
assert(historyJs.includes('historyFilterType'), 'Missing historyFilterType state in js/orders-history.js');

assert(menuJs.includes('menu-item-status-pill'), 'Missing menu-item-status-pill rendering in js/orders-menu.js');
assert(menuJs.includes('status-dot'), 'Missing status-dot rendering in js/orders-menu.js');
assert(menuJs.includes('POS_SVG.grip'), 'Missing POS_SVG.grip in js/orders-menu.js');

console.log('  ✓ JavaScript logic, filters, and status pill renderers verified');

// 6. Detailed Search & Filter Execution Verification
console.log('6. Running simulated search & filter tests with real-world sample orders...');

const testVm = {
  window: {},
  document: {
    getElementById: (id) => ({
      style: {},
      value: "",
      focus: () => {},
      innerText: ""
    }),
    querySelectorAll: () => [],
    addEventListener: () => {}
  },
  POS_SVG: { inbox: "", search: "", calendar: "", folder: "", folderOpen: "" },
  t: (k) => k,
  escapeHtml: (s) => s
};
vm.createContext(testVm);
vm.runInContext(historyJs, testVm);

const mockOrders = [
  {
    key: "B0906-T005",
    customer: "NICK EN",
    time: "2026-09-06 19:55",
    content: "訂單編號：B0906-T113\n\n1份 x Set 11 小綜合+飲料\n\n📍 用餐方式：外帶",
    total: 179,
    diningOption: "takeaway"
  },
  {
    key: "B0906-D002",
    customer: "Nguyễn Văn Thuận",
    time: "2026-09-06 12:30",
    content: "1 x Bánh mì thịt nướng\n1 x Cà phê sữa đá\n\n📍 Dịch vụ: Ăn tại chỗ",
    tableNumber: "5",
    total: 95,
    diningOption: "dine_in"
  }
];

// Test matchesHistorySearch
assert(testVm.matchesHistorySearch(mockOrders[0], "T005"), "Should match order by key T005");
assert(testVm.matchesHistorySearch(mockOrders[0], "#005"), "Should match order by key #005");
assert(testVm.matchesHistorySearch(mockOrders[0], "nick"), "Should match customer nick");
assert(testVm.matchesHistorySearch(mockOrders[0], "Set 11"), "Should match dish Set 11");
assert(!testVm.matchesHistorySearch(mockOrders[0], "thuan"), "Should not match different customer");

assert(testVm.matchesHistorySearch(mockOrders[1], "thuan"), "Should match unaccented thuan");
assert(testVm.matchesHistorySearch(mockOrders[1], "banh mi"), "Should match unaccented banh mi");
assert(testVm.matchesHistorySearch(mockOrders[1], "5"), "Should match table 5");

// Test isOrderDineIn
assert(!testVm.isOrderDineIn(mockOrders[0]), "mockOrder 0 should be takeaway");
assert(testVm.isOrderDineIn(mockOrders[1]), "mockOrder 1 should be dine_in");

console.log('  ✓ Search multi-field matching (key, customer, table, dishes, diacritics) and dining detection passed');

console.log('\n====================================================');
console.log('🎉 ALL VERIFICATION CHECKS PASSED SUCCESSFULLY!');
console.log('====================================================\n');
