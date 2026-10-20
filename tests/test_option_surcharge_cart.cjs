const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function client() {
  const elements = {};
  const element = id => elements[id] ||= {
    style: {}, innerText: '', innerHTML: '',
    classList: { contains: () => false, add() {}, remove() {} },
    querySelector: () => null, querySelectorAll: () => [],
    getBoundingClientRect: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
  };
  const context = {
    console,
    document: {
      getElementById: element, querySelector: () => null, querySelectorAll: () => [],
      addEventListener() {}, body: { style: {}, appendChild() {} },
      documentElement: { style: { setProperty() {} } },
    },
    location: { search: '', hostname: 'localhost' },
    localStorage: { getItem: () => null, setItem() {} },
    sessionStorage: { getItem: () => null, setItem() {} },
    navigator: { userAgent: 'Node' },
    addEventListener() {}, removeEventListener() {},
    setTimeout: () => 1, clearTimeout() {}, setInterval: () => 1, clearInterval() {},
    URLSearchParams,
  };
  context.window = context;
  vm.createContext(context);
  for (const file of [
    'js/client-core.js', 'js/client-menu.js', 'js/client-customizations.js',
    'js/client-cart.js', 'js/bundle-builder-v2.js', 'js/client-checkout.js',
  ]) {
    vm.runInContext(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), context, { filename: file });
  }
  return context;
}

test('LIFF cart, threshold and order item include parent, child and repeated option surcharges', () => {
  const app = client();
  const key = 'food_Meal';
  app.bootstrapData = { catalog: [{ slug: 'food', name: 'Food', items: [{
    id: 'meal', name: 'Meal', price: 100, bundleRule: { version: 3, groups: [{ id: 'sides' }] },
  }] }] };
  app.cart = { [key]: 2 };
  app.customizeData = { [key]: [{ single: {}, multiple: {} }, { single: {}, multiple: {} }] };
  const option = (surcharge, child) => ({
    optionId: 'egg', name: 'Egg', quantity: 1, surcharge, price: 0,
    groups: [], subOptions: child ? [{ id: 'soft', name: 'Soft', price: child }] : [],
    // The receipt includes this display-only projection. It must not be counted twice.
    modifiers: child ? [{ name: 'Soft', price: child }] : [],
  });
  app.bundleCartData = { [key]: [
    { groups: [{ groupId: 'sides', items: [option(5, 2), option(5, 3)] }] },
    { groups: [{ groupId: 'sides', items: [option(4, 0)] }] },
  ] };
  assert.equal(app.resolveCatalogItem(key).bundleRule.version, 3);
  assert.equal(app.bundlePortionExtra(app.bundleCartData[key][0]), 15);
  assert.equal(app.calculateCurrentFoodSubtotal(), 219);
  assert.equal(app.updateTotal(), 219);
  assert.equal(app.buildStructuredCartItems()[0].subtotal, 219);
  assert.equal(app.document.getElementById('total-price').innerText, 219);
});

test('LIFF cart includes item modifier and its child surcharge exactly once', () => {
  const app = client();
  const key = 'food_Meal';
  app.bootstrapData = { catalog: [{ slug: 'food', name: 'Food', items: [{ id: 'meal', name: 'Meal', price: 100 }] }] };
  app.cart = { [key]: 1 };
  app.customizeData = { [key]: [{
    single: { topping: 'Egg' }, multiple: {},
    selectedDetails: { egg: { id: 'egg', name: 'Egg', price: 5, subOption: { id: 'soft', name: 'Soft', price: 2 } } },
    subOptions: { egg: { id: 'soft', name: 'Soft', price: 2 } },
  }] };
  assert.equal(app.calculateCurrentFoodSubtotal(), 107);
  assert.equal(app.updateTotal(), 107);
  assert.equal(app.buildStructuredCartItems()[0].subtotal, 107);
});

test('legacy bundle modifier surcharges remain in the total', () => {
  const app = client();
  const portion = { groups: [{ groupId: 'sides', items: [{
    itemId: 'coffee', quantity: 2, surcharge: 3, groups: [],
    modifiers: [{ name: 'Ice', price: 2 }],
  }] }] };
  assert.equal(app.bundlePortionExtra(portion), 10);
});
