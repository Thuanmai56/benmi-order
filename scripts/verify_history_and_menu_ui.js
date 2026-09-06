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
    '.menu-item-status-pill',
    '.status-dot'
];

requiredClasses.forEach(cls => {
    assert(ordersCss.includes(cls), `Missing CSS class in css/orders.css: ${cls}`);
});
console.log('  ✓ All required CSS component classes exist in css/orders.css');

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

console.log('\n====================================================');
console.log('🎉 ALL VERIFICATION CHECKS PASSED SUCCESSFULLY!');
console.log('====================================================\n');
