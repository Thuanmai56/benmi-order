const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('../benmi-worker-official/node_modules/typescript');
require.extensions['.ts'] = (module, file) => module._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS }
}).outputText, file);
const { remainingItemNote } = require('../benmi-worker-official/src/utils/order-item-notes.ts');
const { formatItemsToText } = require('../benmi-worker-official/src/modules/orders.ts');
const { buildOrderFlexMessage } = require('../benmi-worker-official/src/modules/line/templates/order-receipt.ts');
const sandbox = {
  console, URLSearchParams, location: { hostname: 'localhost', search: '' },
  addEventListener() {},
  document: {
    documentElement: { lang: 'vi', classList: { remove() {} } },
    createElement: () => ({ style: {} }), getElementById: () => null, addEventListener() {},
  },
  localStorage: { getItem: () => null, setItem() {} },
  setInterval() {}, clearInterval() {}, setTimeout() {}, clearTimeout() {},
  cart: { food_Meal: 1 }, customizeData: { food_Meal: [{ single: {}, multiple: {}, note: 'Test thôi' }] },
  comboDrinkData: {}, bootstrapData: { unifiedMenu: true },
  resolveCatalogItem: () => ({ catSlug: 'food', origName: 'Meal', displayName: 'Meal', basePrice: 150, itemId: 'meal', categoryName: 'Food' }),
  isItemOutOfStock: () => false,
};
sandbox.window = sandbox;
vm.createContext(sandbox);
for (const file of ['orders-i18n', 'orders-core', 'order-detail-view', 'order-legacy-adapter', 'printer-service', 'orders-live', 'client-checkout'])
  vm.runInContext(fs.readFileSync(`js/${file}.js`, 'utf8'), sandbox);
const service = sandbox.PrinterService;
const count = (value, text = 'Test thôi') => value.split(text).length - 1;
const choice = text => ({ group: '備註', choice: text, price: 0 });
const structured = () => sandbox.buildStructuredCartItems();
const bundle = { portions: [{ portionIndex: 0, groups: [
  { groupName: '✦ Ghi chú dặn dò', items: [{ name: 'Không bạc hà', quantity: 1, surcharge: 0 }] },
] }] };
const oldContent = '1份 x Meal\n   ↳ ✦ Ghi chú dặn dò: Không bạc hà x1\n  - 備註: Test thôi\n  - 備註: Test thôi';
function flexText(value) {
  if (!value || typeof value !== 'object') return '';
  return [value.type === 'text' ? value.text : '', ...Object.values(value).map(v =>
    Array.isArray(v) ? v.map(flexText).join('\n') : typeof v === 'object' ? flexText(v) : ''
  )].join('\n');
}

test('actual checkout payload, server text, POS and printer keep an item note once', () => {
  const items = structured();
  items[0].bundleSelections = bundle;
  const before = JSON.stringify(items);
  // Preserve both compatibility representations in storage; render only once.
  assert.equal(items[0].note, 'Test thôi');
  assert.equal(items[0].options.filter(o => o.group === '備註').length, 1);
  const content = formatItemsToText(items);
  assert.equal(count(content), 1);
  const order = { key: 'fixture', content, items, total: 150 };
  const row = service.parseOrderItems(order, false)[0];
  assert.equal(count(row.options + row.note), 1);
  const html = sandbox.formatContentHtml(order);
  assert.equal(count(html), 1);
  assert.equal(count(html, 'Không bạc hà'), 1);
  assert.equal(sandbox.extractFlavorSettings(content), null);
  assert.equal(service.getGlobalCustomizations(order).length, 0);
  assert.equal(JSON.stringify(items), before, 'formatting must not mutate saved data');
});

test('historical duplicate text is not promoted to global settings or a global note', () => {
  const items = structured();
  items[0].bundleSelections = bundle;
  const order = { key: 'old', content: oldContent, items, total: 150 };
  assert.equal(count(sandbox.formatContentHtml(order)), 1);
  assert.equal(count(sandbox.formatContentHtml(order), 'Không bạc hà'), 1);
  assert.equal(sandbox.extractFlavorSettings(oldContent), null);
  assert.equal(service.getGlobalCustomizations(order).length, 0);
  // Legacy orders without structured rows still show the repeated note line only once.
  assert.equal(count(sandbox.formatContentHtml({ key: 'text-only', content: oldContent })), 1);
});

test('LINE receipt does not repeat item notes in global pills or the item note field', () => {
  const items = structured();
  items[0].bundleSelections = bundle;
  const message = buildOrderFlexMessage({ key: 'fixture', content: oldContent, total: 150 }, null, items);
  const text = flexText(message);
  assert.equal(count(text), 1);
  assert.equal(count(text, 'Không bạc hà'), 1);
});

test('note comparison has the same conservative, portion-aware behavior in both runtimes', () => {
  const cases = [
    [[choice('備註: Test thôi')], 'Test thôi', ''],
    [JSON.stringify([choice('Ghi chú： Test thôi')]), 'Test thôi', ''],
    [[choice('第1份: 備註: Test thôi'), choice('第2份: 備註: Test thôi')], '第1份: Test thôi | 第2份: Test thôi', ''],
    [[choice('第1份: 備註: Test thôi')], '第1份: Test thôi | 第2份: Test thôi', '第2份: Test thôi'],
    [[choice('Phần 1: Ghi chú: Test thôi')], '第1份: Test thôi', ''],
    [[choice('備註: Test thôi')], 'Ghi chú khác', 'Ghi chú khác'],
    [[{ choice: 'Test thôi', group: 'Khẩu vị' }], 'Test thôi', 'Test thôi'],
    [[], 'Ít sốt, nhiều rau | không hành', 'Ít sốt, nhiều rau | không hành'],
    [[], '備註: Test thôi', '備註: Test thôi'],
  ];
  for (const [options, note, expected] of cases) {
    assert.equal(remainingItemNote(options, note), expected);
    assert.equal(service.remainingItemNote(options, note), expected);
  }
});

test('identical notes on separate portions and items are retained with their own scope', () => {
  const item = { name: 'Meal', quantity: 2, price: 150, options: [
    choice('第1份: 備註: Test thôi'), choice('第2份: 備註: Test thôi'),
  ], notes: '第1份: Test thôi | 第2份: Test thôi' };
  const items = [item, { name: 'Tea', quantity: 1, price: 30, options: [choice('備註: Test thôi')], notes: 'Test thôi' }];
  const content = formatItemsToText(items);
  assert.equal(count(content), 3);
  const order = { key: 'portions', content, items };
  assert.equal(count(sandbox.formatContentHtml(order)), 3);
  const stickers = service.parseOrderItems(order, true);
  assert.equal(stickers.length, 3);
  assert.ok(stickers.every(item => count(item.options + item.note) === 1));
});

test('an additional item note is retained when a different note already exists in options', () => {
  const items = [{ name: 'Tea', quantity: 1, price: 30, options: [choice('備註: No ice')], notes: 'Test thôi' }];
  const content = formatItemsToText(items);
  const html = sandbox.formatContentHtml({ key: 'different', content, items });
  assert.equal(count(html), 1);
  assert.equal(count(html, 'No ice'), 1);
  const numeric = service.parseOrderItems({ items: [{ name: 'Tea', quantity: 1, price: 30, options: [{ choice: '123' }] }] }, false);
  assert.equal(numeric[0].options, '123', 'note cleanup must not reinterpret other option labels');
});

test('explicit global settings and global notes stay independent from item notes', () => {
  const content = '口味設定：辣度：不辣\n• 配料：加蔥\n' + oldContent + '\n📝 總備註：Leave at door';
  const order = { key: 'global', content, items: structured(), note: 'Leave at door' };
  const html = sandbox.formatContentHtml(order);
  assert.equal(count(html), 1);
  assert.equal(count(html, 'Leave at door'), 1);
  assert.ok(html.includes('不辣') && html.includes('加蔥'));
  assert.equal(service.getGlobalCustomizations(order).length, 2);
  assert.equal(count(sandbox.formatContentHtml({ ...order, note: 'Test thôi' })), 2,
    'the same text entered explicitly at item and order level is not silently removed');
});

test('text-only global note fallback accepts explicit global labels, never a nested note group', () => {
  assert.equal(count(sandbox.formatContentHtml({ key: 'legacy', content: oldContent }), 'Không bạc hà'), 1);
  const html = sandbox.formatContentHtml({ key: 'legacy', content: '1份 x Meal\n📝 總備註：Leave at door' });
  assert.equal(count(html, 'Leave at door'), 1);
});

test('exact Issue #64 reproduction: combo item without leading digits does not pollute flavor chips or customer note', () => {
  const issue64Raw = 'Combo 2 Món Tiết Kiệm (Phần 1: Bánh mì Pate Cột Đèn...) x1 $180\n   ↳ ✦ Ghi chú dặn dò: Không bạc hà x1\n  - 備註: Test thôi\n  - 備註: Test thôi';
  const order = { key: 'JJ1016-T001', content: issue64Raw, total: 180 };

  // 1. extractFlavorSettings must be null (notes are NOT flavor settings or toppings)
  assert.equal(sandbox.extractFlavorSettings(issue64Raw), null);

  // 2. getGlobalCustomizations must be empty
  assert.equal(service.getGlobalCustomizations(order).length, 0);

  // 3. formatContentHtml must render "Test thôi" exactly 1 time
  const html = sandbox.formatContentHtml(order);
  assert.equal(count(html, 'Test thôi'), 1);

  // 4. "Ghi chú dặn dò" modifier group must NOT be promoted to order-level customer note
  assert.ok(!html.includes('dặn dò: Không bạc hà'));
  assert.ok(!html.includes('order-note-alert'));

  // 5. LINE flex message must not treat "Test thôi" as a flavor pill or extra ingredient
  const flexMsg = buildOrderFlexMessage(order, null);
  const flexStr = flexText(flexMsg);
  assert.equal(count(flexStr, 'Test thôi'), 1);
});

test('renderItemRowHtml suppresses duplicate note row when optionsHtml already includes mod-chip-note', () => {
  const item = {
    name: 'Meal',
    quantity: 1,
    price: '$150',
    options: '備註: Test thôi',
    note: 'Test thôi'
  };
  const rowHtml = sandbox.renderItemRowHtml(item, 0, 'ORDER-1');
  assert.equal(count(rowHtml, 'Test thôi'), 1);
  assert.ok(!rowHtml.includes('review-item-note'));
});

