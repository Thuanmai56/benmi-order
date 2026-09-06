// Verification script for Review Modal Enhancements (Flavor, Raw Accordion, Lifecycle Buttons)
const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log("=================================================");
console.log("🧪 Testing POS Review Modal Enhancements");
console.log("=================================================");

// 1. Verify I18N keys
const i18nContent = fs.readFileSync(path.join(__dirname, '../js/orders-i18n.js'), 'utf-8');
const requiredKeys = [
  'flavorTitle',
  'customerChangeTitle',
  'viewRawOrder',
  'hideRawOrder',
  'printToolsLabel',
  'rawOrderTitle',
  'btnCopy',
  'copySuccess'
];

for (const key of requiredKeys) {
  assert(i18nContent.includes(`${key}:`), `Missing key in I18N: ${key}`);
}
console.log("✓ All 8 new I18N keys exist in orders-i18n.js");

// 2. Verify POS_SVG icons
const coreContent = fs.readFileSync(path.join(__dirname, '../js/orders-core.js'), 'utf-8');
assert(coreContent.includes('flame:'), "Missing flame SVG in POS_SVG");
assert(coreContent.includes('sparkles:'), "Missing sparkles SVG in POS_SVG");
assert(coreContent.includes('copy:'), "Missing copy SVG in POS_SVG");
assert(coreContent.includes('fileText:'), "Missing fileText SVG in POS_SVG");
console.log("✓ POS_SVG includes flame, sparkles, copy, and fileText");

// 3. Test extractFlavorSettings and extractCustomerChanges logic
// Mock minimal environment
const escapeHtml = str => String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const POS_SVG = {
  flame: '<svg flame></svg>',
  fileText: '<svg fileText></svg>',
  copy: '<svg copy></svg>',
  check: '<svg check></svg>',
  note: '<svg note></svg>',
  printer: '<svg printer></svg>',
  dineIn: '<svg dineIn></svg>'
};
const t = k => k;

// Evaluate orders-live.js functions in isolated scope
const liveContent = fs.readFileSync(path.join(__dirname, '../js/orders-live.js'), 'utf-8');
const vm = require('vm');
const sandbox = {
  window: {},
  document: { getElementById: () => null },
  navigator: {},
  escapeHtml,
  POS_SVG,
  t,
  preparedOrderItems: new Set(),
  PrinterService: {
    parseOrderItems: (order) => [
      { name: "招牌鹹水雞半隻", quantity: 1, options: "去骨、加蔥", note: "" },
      { name: "甜不辣", quantity: 2, options: "切片", note: "不要胡椒" }
    ]
  },
  isOrderMetadataText: (txt) => {
    if (!txt) return true;
    const s = String(txt).trim();
    return s.includes("【") || s.includes("訂單") || s.includes("總金額");
  }
};
vm.createContext(sandbox);
vm.runInContext(liveContent, sandbox);

const extractFlavorSettings = sandbox.window.extractFlavorSettings;
const extractCustomerChanges = sandbox.window.extractCustomerChanges;
const formatContentHtml = sandbox.window.formatContentHtml;

assert(typeof extractFlavorSettings === 'function', "extractFlavorSettings is not a function");
assert(typeof extractCustomerChanges === 'function', "extractCustomerChanges is not a function");
assert(typeof formatContentHtml === 'function', "formatContentHtml is not a function");

// Test sample real order content with flavors
const testOrderWithFlavors = {
  key: "test-001",
  content: `【新訂單】#K0826-GXEQ
內用 (桌號: 5)
取餐時間: 18:30
🧪 口味設定：【口味選擇：特調胡椒 | 鹹度調整：正常 | 辣度選擇 (朝天椒)：不辣】
• 配料：加蔥、加蒜
1 份 招牌鹹水雞半隻 $180
  ↳ 去骨
總金額: $180`
};

const flavors = extractFlavorSettings(testOrderWithFlavors.content);
assert(flavors !== null, "Should extract flavors from test order");
assert(flavors.flavors.length === 3, "Should have 3 flavor choices");
assert(flavors.flavors[0].label === "口味", `First flavor label should be 口味, got: ${flavors.flavors[0].label}`);
assert(flavors.flavors[0].value === "特調胡椒", `First flavor val should be 特調胡椒, got: ${flavors.flavors[0].value}`);
assert(flavors.flavors[1].label === "鹹度", `Second flavor label should be 鹹度, got: ${flavors.flavors[1].label}`);
assert(flavors.flavors[1].value === "正常", `Second flavor val should be 正常, got: ${flavors.flavors[1].value}`);
assert(flavors.flavors[2].label === "辣度", `Third flavor label should be 辣度, got: ${flavors.flavors[2].label}`);
assert(flavors.flavors[2].value === "不辣", `Third flavor val should be 不辣, got: ${flavors.flavors[2].value}`);
assert(flavors.extraIngredients.length === 1, "Should have 1 extra ingredient");
assert(flavors.extraIngredients[0] === "加蔥、加蒜", "Extra ingredients should be 加蔥、加蒜");
console.log("✓ extractFlavorSettings successfully parsed real flavor and ingredients lines");

// Test sample customer change order
const testOrderWithChange = {
  key: "test-002",
  content: `【新訂單】#K0826-GHVU
外帶
【顧客換單】：好喔 還有什麼可以換
----原本訂單 👇----
1 份 原味胡椒鹹水雞 $200`
};

const changes = extractCustomerChanges(testOrderWithChange.content);
assert(changes !== null, "Should extract customer changes");
assert(changes.length === 1, "Should have 1 change request");
assert(changes[0] === "好喔 還有什麼可以換", `Change text mismatch: ${changes[0]}`);
console.log("✓ extractCustomerChanges successfully parsed customer exchange request");

// Test HTML generation
const html1 = formatContentHtml(testOrderWithFlavors);
assert(html1.includes('class="flavor-custom-card"'), "HTML should include flavor-custom-card");
assert(html1.includes('class="flavor-chip"'), "HTML should include flavor-chip");
assert(html1.includes('class="raw-order-accordion"'), "HTML should include raw-order-accordion");
assert(html1.includes('class="mod-chip"'), "HTML should format dish options as mod-chip");
assert(html1.includes('toggleRawOrderViewer'), "HTML should wire toggleRawOrderViewer");
assert(html1.includes('copyRawOrderContent'), "HTML should wire copyRawOrderContent");
console.log("✓ formatContentHtml generated all cards: flavor chips, mod chips, and raw accordion");

const html2 = formatContentHtml(testOrderWithChange);
assert(html2.includes('class="customer-change-card"'), "HTML should include customer-change-card");
assert(html2.includes('好喔 還有什麼可以換'), "HTML should show customer change text");
console.log("✓ formatContentHtml generated customer change alert banner");

// 4. Verify orders.html modal footer structure
const htmlContent = fs.readFileSync(path.join(__dirname, '../orders.html'), 'utf-8');
assert(htmlContent.includes('class="modal-print-toolbar"'), "orders.html missing modal-print-toolbar");
assert(htmlContent.includes('class="modal-lifecycle-footer"'), "orders.html missing modal-lifecycle-footer");
assert(htmlContent.includes('btn-lifecycle-primary'), "orders.html missing btn-lifecycle-primary");
assert(htmlContent.includes('btn-lifecycle-danger'), "orders.html missing btn-lifecycle-danger");
assert(htmlContent.includes('btn-review-ready'), "orders.html missing btn-review-ready");
assert(htmlContent.includes('i18n-print-tools-label'), "orders.html missing i18n-print-tools-label");
console.log("✓ orders.html contains modal-print-toolbar and modal-lifecycle-footer");

// 5. Verify css/orders.css styles
const cssContent = fs.readFileSync(path.join(__dirname, '../css/orders.css'), 'utf-8');
assert(cssContent.includes('.flavor-custom-card'), "orders.css missing .flavor-custom-card");
assert(cssContent.includes('.customer-change-card'), "orders.css missing .customer-change-card");
assert(cssContent.includes('.mod-chip'), "orders.css missing .mod-chip");
assert(cssContent.includes('.raw-order-accordion'), "orders.css missing .raw-order-accordion");
assert(cssContent.includes('.modal-print-toolbar'), "orders.css missing .modal-print-toolbar");
assert(cssContent.includes('.modal-lifecycle-footer'), "orders.css missing .modal-lifecycle-footer");
assert(cssContent.includes('.btn-lifecycle-primary'), "orders.css missing .btn-lifecycle-primary");
console.log("✓ css/orders.css contains all required CSS selectors and responsive rules");

console.log("=================================================");
console.log("🎉 ALL TESTS PASSED SUCCESSFULLY!");
console.log("=================================================");
