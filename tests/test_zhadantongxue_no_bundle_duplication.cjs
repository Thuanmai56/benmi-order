const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const mockWindow = {
  currentTenantBrandName: '炸蛋同學',
  location: { hostname: 'benmi-order.pages.dev', search: '?tenant_id=zhadantongxue', pathname: '/orders', href: 'https://benmi-order.pages.dev/orders?tenant_id=zhadantongxue' }
};
const mockDocument = {
  documentElement: {
    lang: 'zh-TW',
    style: { setProperty: () => {} }
  },
  getElementById: () => null,
  querySelector: () => null,
  querySelectorAll: () => [],
  createElement: (tag) => ({
    tagName: tag,
    style: {},
    setAttribute: () => {},
    classList: { add: () => {}, remove: () => {}, contains: () => false }
  }),
  addEventListener: () => {}
};

const domSandbox = {
  window: mockWindow,
  document: mockDocument,
  console,
  URLSearchParams,
  localStorage: { getItem: () => null, setItem: () => {} },
  setTimeout,
  clearTimeout,
  setInterval,
  clearInterval
};
mockWindow.window = mockWindow;
mockWindow.document = mockDocument;
vm.createContext(domSandbox);

const i18nJs = fs.readFileSync(path.join(__dirname, '../js/orders-i18n.js'), 'utf8');
const coreJs = fs.readFileSync(path.join(__dirname, '../js/orders-core.js'), 'utf8');
const printerJs = fs.readFileSync(path.join(__dirname, '../js/printer-service.js'), 'utf8');
const liveJs = fs.readFileSync(path.join(__dirname, '../js/orders-live.js'), 'utf8');

vm.runInContext(i18nJs, domSandbox);
vm.runInContext(coreJs, domSandbox);
vm.runInContext(printerJs, domSandbox);
vm.runInContext(liveJs, domSandbox);

const { PrinterService, renderItemRowHtml, extractBundleFromItem } = domSandbox.window;

console.log('🧪 Testing zhadantongxue multi-qty customized item (No Bundle)...');

const mockOrder = {
  key: 'Z0916-T001',
  customer_name: 'Alison',
  reason: 'LINE 點餐',
  content: `訂單編號：Z0916-T001\n\n📦 訂單內容：\n4份 x 香酥雞腿肉卷炸蛋蔥餅 $75\n   ↳ 第一份: 不加辣 Non-Spicy, 加生菜\n   ↳ 第二份: 不加辣 Non-Spicy, 加生菜\n   ↳ 第三份: 不加辣 Non-Spicy, 加生菜\n   ↳ 第四份: 不加辣 Non-Spicy, 加生菜\n\n📍 用餐方式：外帶`,
  items: [
    {
      name: '香酥雞腿肉卷炸蛋蔥餅',
      quantity: 4,
      unit_price: 75,
      subtotal: 300,
      bundle_snapshot_json: null,
      bundleSelections: null,
      options: [
        { group: '辣度', choice: '第1份: 不加辣 Non-Spicy', price: 0 },
        { group: '客製化', choice: '第1份: 加生菜', price: 0 },
        { group: '辣度', choice: '第2份: 不加辣 Non-Spicy', price: 0 },
        { group: '客製化', choice: '第2份: 加生菜', price: 0 },
        { group: '辣度', choice: '第3份: 不加辣 Non-Spicy', price: 0 },
        { group: '客製化', choice: '第3份: 加生菜', price: 0 },
        { group: '辣度', choice: '第4份: 不加辣 Non-Spicy', price: 0 },
        { group: '客製化', choice: '第4份: 加生菜', price: 0 }
      ]
    }
  ]
};

const parsedItems = PrinterService.parseOrderItems(mockOrder, false);
assert.strictEqual(parsedItems.length, 1);
const it = parsedItems[0];

console.log('Parsed item options:\n' + it.options);

const bundleInfo = extractBundleFromItem(it);
console.log('extractBundleFromItem result:', bundleInfo);

const html = renderItemRowHtml(it, 0, mockOrder.key);
console.log('\nGenerated HTML:\n' + html);

assert.strictEqual(bundleInfo, null, 'Item without bundle must return null from extractBundleFromItem');
assert(!html.includes('bundle-components-container'), 'Item without bundle MUST NOT render bundle-components-container');
assert(!html.includes('套餐組合內容'), 'Item without bundle MUST NOT render 套餐組合內容');
assert(!html.includes('↳ 第二份'), 'HTML must not contain raw duplicate options');
assert(html.includes('review-item-portions-container'), 'Must render review-item-portions-container');

console.log('✅ PASS: zhadantongxue non-bundle multi-portion item verified with NO duplication or fake bundle!');
process.exit(0);
