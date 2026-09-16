/**
 * Comprehensive Unit Test for Menu Bundle Editor
 * Tests:
 * 1. UI item row rendering with Combo chip vs + Cấu hình Combo
 * 2. Master-Detail modal state transitions and group mutations
 * 3. Stepper quantity, repeat toggle, source categorization
 * 4. Dual I18N dictionary coverage and formatting
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

console.log("=== Running Menu Bundle Editor Test Suite ===");

// 1. Load I18N and Core
const i18nCode = fs.readFileSync(path.join(__dirname, '../js/orders-i18n.js'), 'utf8');
const coreCode = fs.readFileSync(path.join(__dirname, '../js/orders-core.js'), 'utf8');
const menuCode = fs.readFileSync(path.join(__dirname, '../js/orders-menu.js'), 'utf8');

// Mock browser environment
const mockElements = new Map();
function createMockElement(id) {
  const el = {
    id: id,
    textContent: '',
    innerText: '',
    value: '',
    style: {},
    classList: {
      _classes: new Set(),
      add(c) { this._classes.add(c); },
      remove(c) { this._classes.delete(c); },
      contains(c) { return this._classes.has(c); },
      toggle(c, force) {
        if (force === undefined) {
          if (this._classes.has(c)) this._classes.delete(c);
          else this._classes.add(c);
        } else if (force) {
          this._classes.add(c);
        } else {
          this._classes.delete(c);
        }
      }
    },
    children: [],
    appendChild(child) { this.children.push(child); return child; },
    querySelector(sel) { return null; },
    querySelectorAll(sel) { return []; },
    addEventListener() {},
    setAttribute() {},
    getAttribute() { return null; }
  };
  mockElements.set(id, el);
  return el;
}

const windowMock = {
  location: { search: '?tenant=quanthuyhang', hostname: 'localhost' },
  localStorage: { getItem: () => 'zh-TW', setItem: () => {} },
  addEventListener: () => {},
  document: {
    getElementById: (id) => mockElements.get(id) || createMockElement(id),
    querySelectorAll: () => [],
    querySelector: () => null,
    createElement: (tag) => {
      const el = createMockElement(`dyn_${Date.now()}_${Math.random()}`);
      el.tagName = tag.toUpperCase();
      return el;
    },
    addEventListener: () => {}
  },
  alert: (msg) => { windowMock.__lastAlert = msg; },
  confirm: () => true,
  fetch: async () => ({ ok: true, json: async () => ({ success: true }) }),
  URLSearchParams: URLSearchParams,
  console: console,
  Date: Date,
  Math: Math,
  JSON: JSON,
  Set: Set,
  Map: Map,
  Array: Array,
  Number: Number,
  String: String,
  Boolean: Boolean,
  setTimeout: () => 1,
  clearTimeout: () => {},
  setInterval: () => 1,
  clearInterval: () => {}
};

windowMock.window = windowMock;
windowMock.document.defaultView = windowMock;

const context = vm.createContext(windowMock);

vm.runInContext(i18nCode, context);
vm.runInContext(coreCode, context);
vm.runInContext(menuCode, context);

// Test 1: I18N bundle keys in both zh-TW and vi
console.log("1. Testing I18N coverage for bundle keys...");
const requiredKeys = [
  'btnSetBundle', 'btnEditBundle', 'bundleBadge', 'bundleGroupUnit',
  'modalBundleTitle', 'modalBundleSub', 'bundleGroupListTitle', 'btnAddBundleGroup',
  'btnRemoveBundleConfig', 'confirmRemoveBundleConfig', 'bundleGroupDetailTitle',
  'bundleGroupNameZh', 'bundleGroupNameVi', 'bundleQuantityRule', 'bundleAllowRepeat',
  'bundleSourceType', 'bundleSourceCategory', 'bundleSourceItems', 'bundleEligiblePreview',
  'bundleSaveSuccess', 'bundleSaveFail', 'btnBundleSave', 'btnBundleCancel'
];

for (const key of requiredKeys) {
  vm.runInContext(`window.currentLang = 'zh-TW';`, context);
  const zhVal = vm.runInContext(`t('${key}')`, context);
  assert.ok(zhVal && zhVal !== key, `Missing zh-TW key: ${key}`);

  vm.runInContext(`window.currentLang = 'vi';`, context);
  const viVal = vm.runInContext(`t('${key}')`, context);
  assert.ok(viVal && viVal !== key, `Missing vi key: ${key}`);
}
console.log("✓ All bundle I18N keys present and localized in zh-TW and vi.");

// Test 2: Setup sample menu data with a combo and a regular item
console.log("2. Testing bundle state initialization and editing target...");
const sampleDataScript = `
  currentMenuData = [
    {
      id: 'cat_combos',
      catId: 'cat_combos_uuid',
      title: '特惠套餐',
      type: 'catalog',
      items: [
        {
          id: 'item_combo_1',
          name: '招牌雙人特惠套餐',
          price: 250,
          isOos: false,
          bundleRule: {
            version: 1,
            groups: [
              {
                id: 'grp_1',
                label: { 'zh-TW': '請選擇 1 樣主餐', 'vi': 'Chọn 1 món chính' },
                name: '請選擇 1 樣主餐',
                minQuantity: 1,
                maxQuantity: 1,
                allowRepeats: false,
                sources: [{ type: 'category', categoryId: 'cat_mains' }]
              },
              {
                id: 'grp_2',
                label: { 'zh-TW': '請選擇 6 樣配菜', 'vi': 'Chọn 6 món ăn kèm' },
                name: '請選擇 6 樣配菜',
                minQuantity: 6,
                maxQuantity: 6,
                allowRepeats: true,
                sources: [{ type: 'category', categoryId: 'cat_sides' }]
              }
            ]
          }
        },
        {
          id: 'item_regular_1',
          name: '單點原味越式麵包',
          price: 90,
          isOos: false,
          bundleRule: null
        }
      ]
    },
    {
      id: 'cat_mains',
      catId: 'cat_mains_uuid',
      title: '主餐類',
      type: 'catalog',
      items: [
        { id: 'main_1', name: '越式麵包', price: 90 },
        { id: 'main_2', name: '越式河粉', price: 130 }
      ]
    },
    {
      id: 'cat_sides',
      catId: 'cat_sides_uuid',
      title: '精選配菜',
      type: 'catalog',
      items: [
        { id: 'side_1', name: '花椰菜', price: 30 },
        { id: 'side_2', name: '蓮藕片', price: 30 },
        { id: 'side_3', name: '四季豆', price: 30 },
        { id: 'side_4', name: '玉米筍', price: 30 }
      ]
    }
  ];
`;
vm.runInContext(sampleDataScript, context);

// Test openBundleEditorModal on configured combo
vm.runInContext(`openBundleEditorModal(0, 0);`, context);
const editingTarget = vm.runInContext(`bundleEditingTarget`, context);
const draftRule = vm.runInContext(`bundleDraftRule`, context);

assert.ok(editingTarget, "bundleEditingTarget should be set");
assert.strictEqual(editingTarget.item.name, '招牌雙人特惠套餐');
assert.strictEqual(draftRule.groups.length, 2, "Draft rule should have 2 groups");
console.log("✓ Existing bundle rule loaded into draft modal state.");

// Test 3: Mutating groups (Adding, Stepping, Repeating, Toggling Sources)
console.log("3. Testing group mutations...");
// Step quantity on active group
vm.runInContext(`stepBundleQty(1);`, context);
let grp1 = vm.runInContext(`bundleDraftRule.groups[0]`, context);
assert.strictEqual(grp1.minQuantity, 2, "Quantity should increment to 2");

vm.runInContext(`stepBundleQty(-1);`, context);
grp1 = vm.runInContext(`bundleDraftRule.groups[0]`, context);
assert.strictEqual(grp1.minQuantity, 1, "Quantity should decrement back to 1");

// Toggle repeat
vm.runInContext(`toggleBundleRepeat(true);`, context);
grp1 = vm.runInContext(`bundleDraftRule.groups[0]`, context);
assert.strictEqual(grp1.allowRepeats, true, "allowRepeats should be true");

// Add third group
vm.runInContext(`addBundleGroup();`, context);
let groupCount = vm.runInContext(`bundleDraftRule.groups.length`, context);
assert.strictEqual(groupCount, 3, "Should have 3 groups after adding");

// Delete third group
vm.runInContext(`deleteBundleGroup(2);`, context);
groupCount = vm.runInContext(`bundleDraftRule.groups.length`, context);
assert.strictEqual(groupCount, 2, "Should have 2 groups after deleting");

// Eligible items computation
const eligibleMainCount = vm.runInContext(`computeEligibleItemsCount(bundleDraftRule.groups[0])`, context);
assert.strictEqual(eligibleMainCount, 2, "Eligible items count for main group should be 2");

const eligibleSideCount = vm.runInContext(`computeEligibleItemsCount(bundleDraftRule.groups[1])`, context);
assert.strictEqual(eligibleSideCount, 4, "Eligible items count for side group should be 4");
console.log("✓ Group mutations, quantity stepping, and dynamic item counting verified.");

// Test 4: Open on regular item (unconfigured)
console.log("4. Testing new bundle initialization on regular item...");
vm.runInContext(`openBundleEditorModal(0, 1);`, context);
const newDraftRule = vm.runInContext(`bundleDraftRule`, context);
assert.strictEqual(newDraftRule.groups.length, 1, "New bundle should start with 1 default group");
assert.strictEqual(newDraftRule.groups[0].minQuantity, 1);
assert.strictEqual(newDraftRule.groups[0].allowRepeats, false);
console.log("✓ Regular item successfully initializes with standard 1-group template.");

// Test 5: Verify modal HTML and CSS
console.log("5. Testing HTML & CSS integration...");
const htmlContent = fs.readFileSync(path.join(__dirname, '../orders.html'), 'utf8');
const cssContent = fs.readFileSync(path.join(__dirname, '../css/orders.css'), 'utf8');

assert.ok(htmlContent.includes('id="modal-bundle-editor"'), "orders.html must contain #modal-bundle-editor");
assert.ok(htmlContent.includes('id="btn-add-bundle-group"'), "orders.html must contain add group button");
assert.ok(htmlContent.includes('id="btn-bundle-modal-save"'), "orders.html must contain save button");
assert.ok(htmlContent.includes('id="btn-bundle-remove-config"'), "orders.html must contain delete config button");
assert.ok(cssContent.includes('.menu-item-bundle-btn'), "orders.css must contain .menu-item-bundle-btn");
assert.ok(cssContent.includes('.bundle-stepper-btn'), "orders.css must contain .bundle-stepper-btn");
assert.ok(cssContent.includes('.bundle-editor-modal-content'), "orders.css must contain .bundle-editor-modal-content");
assert.ok(htmlContent.includes('orders.css?v=20260916_menu_bundle_editor_v1'), "orders.css cache buster bumped");
assert.ok(htmlContent.includes('orders-menu.js?v=20260916_menu_bundle_editor_v1'), "orders-menu.js cache buster bumped");
console.log("✓ Modal markup, CSS classes, and cache-busting verified.");

console.log("\n====================================================");
console.log("🎉 ALL MENU BUNDLE EDITOR TESTS PASSED SUCCESSFULLY!");
console.log("====================================================");
