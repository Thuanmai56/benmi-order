const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

console.log('=== Running Bundle Stepper UI Test Suite ===\n');

// 1. Static file assertions
const jsPath = path.resolve(__dirname, '../js/bundle-builder-v2.js');
const cssPath = path.resolve(__dirname, '../index.css');
const htmlPath = path.resolve(__dirname, '../index.html');

const jsContent = fs.readFileSync(jsPath, 'utf-8');
const cssContent = fs.readFileSync(cssPath, 'utf-8');
const htmlContent = fs.readFileSync(htmlPath, 'utf-8');

console.log('Test 1: Verify cache-buster version bump in index.html...');
assert.ok(htmlContent.includes('js/bundle-builder-v2.js?v=20260925_combo_stepper_v1'), 'index.html must reference bundle-builder-v2.js with version 20260925_combo_stepper_v1');
assert.ok(htmlContent.includes('index.css?v=20260925_combo_stepper_v1'), 'index.html must reference index.css with version 20260925_combo_stepper_v1');
console.log('✓ Cache busters verified in index.html.');

console.log('Test 2: Verify original button CSS rules in index.css...');
assert.ok(cssContent.includes('.bundle-btn-add'), 'index.css must style .bundle-btn-add');
assert.ok(cssContent.includes('.bundle-btn-minus'), 'index.css must style .bundle-btn-minus');
assert.ok(cssContent.includes('.bundle-btn-plus'), 'index.css must style .bundle-btn-plus');
assert.ok(cssContent.includes('.bundle-qty-val'), 'index.css must style .bundle-qty-val');
assert.ok(cssContent.includes('.bundle-v2-mod-btn'), 'index.css must style customization button');
console.log('✓ Original button CSS rules verified.');

console.log('Test 3: Verify JS logic and stepper HTML generation...');
// Set up mock DOM and environment
const domElements = {
  'bundle-step-nav': { innerHTML: '' },
  'bundle-refresh-prices': { style: { display: 'none' } },
  'bundle-copy-previous': { style: { display: 'none' } },
  'bundle-cat-tabs': { innerHTML: '' },
  'bundle-items-list': { innerHTML: '' },
  'bundle-modifier-editor': { innerHTML: '', style: { display: 'none' } },
  'bundle-modal-item-name': { textContent: '' },
  'bundle-modal-group-label': { textContent: '' },
  'bundle-modal-current-count': { textContent: '' },
  'bundle-modal-max-count': { textContent: '' },
  'bundle-progress-fill': { style: { width: '0%' } },
  'bundle-quota-badge': { style: { display: 'none' } },
  'bundle-confirm-btn': { disabled: true, textContent: '' },
  'bundle-builder-modal': { style: { display: 'none' } }
};

const sandbox = {
  window: {},
  document: {
    getElementById: id => domElements[id] || { innerHTML: '', style: {}, textContent: '', appendChild: () => {} }
  },
  bootstrapData: {
    catalog: [{ id: 'cat_main', name: '主餐', shortName: '主餐' }],
    modifiers: [
      {
        id: 'mod_sugar',
        name: '甜度',
        isRequired: true,
        selectionType: 'single',
        options: [{ id: 'opt_half', name: '半糖', price: 0 }]
      }
    ]
  },
  cart: {},
  updateTotal: () => {},
  customAlert: msg => console.log('Alert:', msg)
};
sandbox.window = sandbox;

vm.createContext(sandbox);
vm.runInContext(jsContent, sandbox);

assert.strictEqual(typeof sandbox.window.openBundleBuilderModal, 'function', 'openBundleBuilderModal must be a function');
assert.strictEqual(typeof sandbox.window.bundleRemoveLastItemOf, 'function', 'bundleRemoveLastItemOf must be a function');

// Test scenario: Single choice group and Multi choice group
const mockBundleItem = {
  key: 'cat_main_ComboA',
  displayName: '經典套餐',
  basePrice: 120,
  bundleRule: {
    version: 2,
    groups: [
      {
        id: 'grp_main',
        name: '選擇主餐',
        minQuantity: 1,
        maxQuantity: 1,
        type: 'select',
        eligibleItems: [
          { id: 'item_burger', name: '漢堡', surcharge: 0, appliedModifiers: ['mod_sugar'] },
          { id: 'item_sandwich', name: '三明治', surcharge: 10, appliedModifiers: [] }
        ]
      },
      {
        id: 'grp_drink',
        name: '選擇飲料',
        minQuantity: 1,
        maxQuantity: 2,
        allowRepeats: true,
        type: 'select',
        eligibleItems: [
          { id: 'item_tea', name: '紅茶', surcharge: 0, appliedModifiers: [] },
          { id: 'item_coffee', name: '咖啡', surcharge: 15, appliedModifiers: [] }
        ]
      }
    ]
  }
};

sandbox.resolveCatalogItem = () => mockBundleItem;

// Open modal for ComboA
sandbox.window.openBundleBuilderModal('cat_main', 'ComboA', 0);

// Check initial render of group 0 (Single choice: 漢堡, 三明治)
let itemsHtml = domElements['bundle-items-list'].innerHTML;
assert.ok(itemsHtml.includes('bundle-btn-add'), 'Items list must render bundle-btn-add when count is 0');
assert.ok(!itemsHtml.includes('bundle-btn-minus'), 'Minus button must NOT appear when count is 0');
assert.ok(!itemsHtml.includes('bundle-qty-val'), 'Qty value must NOT appear when count is 0');
assert.ok(!itemsHtml.includes('移除'), 'No old 移除 text button should be present for items with 0 count');

console.log('✓ Initial 0-state: only bundle-btn-add is rendered, NO minus button when count is 0.');

// Step 1: Add Burger (single-choice)
sandbox.window.bundleSelectSingle('item_burger');
itemsHtml = domElements['bundle-items-list'].innerHTML;

assert.ok(itemsHtml.includes('bundle-btn-minus'), 'Minus button must appear when count > 0');
assert.ok(itemsHtml.includes('bundle-qty-val">1</span>'), 'Burger quantity should now be 1');
assert.ok(itemsHtml.includes("bundleRemoveLastItemOf('item_burger')"), 'Minus button must call bundleRemoveLastItemOf for burger');
assert.ok(itemsHtml.includes('客製化'), 'Burger has modifiers, so 客製化 button must be rendered');
assert.ok(!itemsHtml.includes('>移除<'), 'Old 移除 button should NOT be in the customization row');

console.log('✓ Single choice selection increments to 1, renders minus and plus, and shows customization button without 移除.');

// Step 2: Remove Burger with minus stepper button
sandbox.window.bundleRemoveLastItemOf('item_burger');
itemsHtml = domElements['bundle-items-list'].innerHTML;
assert.ok(itemsHtml.includes('bundle-btn-add'), 'Reverts back to bundle-btn-add when count returns to 0');
assert.ok(!itemsHtml.includes('bundle-btn-minus'), 'Minus button disappears when count returns to 0');

console.log('✓ bundleRemoveLastItemOf successfully decrements and reverts to bundle-btn-add without minus.');

// Step 3: Test multi-choice group (Drink group: min 1, max 2, allowRepeats)
sandbox.window.bundleChooseGroup(1); // switch to drink group
itemsHtml = domElements['bundle-items-list'].innerHTML;
assert.ok(itemsHtml.includes('紅茶'), 'Must display item 紅茶');

// Add 1 Tea
sandbox.window.bundleAddItem('item_tea');
itemsHtml = domElements['bundle-items-list'].innerHTML;
assert.ok(itemsHtml.includes('bundle-qty-val">1</span>'), 'Tea count should be 1');

// Add 2nd Tea (repeats allowed, max 2 reached)
sandbox.window.bundleAddItem('item_tea');
itemsHtml = domElements['bundle-items-list'].innerHTML;
assert.ok(itemsHtml.includes('bundle-qty-val">2</span>'), 'Tea count should be 2');
assert.ok(itemsHtml.includes('bundle-btn-plus disabled'), 'Plus button must be disabled when group max is reached');

// Decrement 1 Tea
sandbox.window.bundleRemoveLastItemOf('item_tea');
itemsHtml = domElements['bundle-items-list'].innerHTML;
assert.ok(itemsHtml.includes('bundle-qty-val">1</span>'), 'Tea count should return to 1');
assert.ok(!itemsHtml.includes('bundle-btn-plus disabled'), 'Plus button must re-enable when count < max');

console.log('✓ Multi-choice stepper correctly manages quota, repeats, and re-enabling.');

console.log('\n✅ All Bundle Stepper UI tests passed successfully!\n');
