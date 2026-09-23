import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '..');

function createClientEnvironment() {
  const elements = new Map();
  function getOrCreateElement(id) {
    if (!elements.has(id)) {
      elements.set(id, {
        id,
        classList: {
          classes: new Set(),
          add(c) { this.classes.add(c); },
          remove(c) { this.classes.delete(c); },
          toggle(c, force) {
            if (force === undefined) {
              if (this.classes.has(c)) this.classes.delete(c);
              else this.classes.add(c);
            } else if (force) {
              this.classes.add(c);
            } else {
              this.classes.delete(c);
            }
          },
          contains(c) { return this.classes.has(c); }
        },
        style: {},
        attributes: new Map(),
        setAttribute(k, v) { this.attributes.set(k, String(v)); },
        getAttribute(k) { return this.attributes.get(k) || null; },
        removeAttribute(k) { this.attributes.delete(k); },
        hasAttribute(k) { return this.attributes.has(k); },
        innerHTML: '',
        innerText: '',
        value: '',
        checked: false,
        disabled: false,
        children: [],
        appendChild(child) { this.children.push(child); return child; },
        querySelector() { return null; },
        querySelectorAll() { return []; },
        closest() { return null; }
      });
    }
    return elements.get(id);
  }

  const sandbox = {
    window: {},
    addEventListener: () => {},
    removeEventListener: () => {},
    navigator: { userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X)' },
    document: {
      addEventListener: () => {},
      removeEventListener: () => {},
      documentElement: { style: { setProperty: () => {}, scrollBehavior: '' } },
      body: { style: {}, appendChild: () => {} },
      getElementById: (id) => getOrCreateElement(id),
      querySelector: () => null,
      querySelectorAll: () => [],
      createElement: (tag) => ({
        tag,
        classList: { add: () => {}, remove: () => {}, toggle: () => {} },
        style: {},
        attributes: new Map(),
        setAttribute(k, v) { this.attributes.set(k, String(v)); },
        getAttribute(k) { return this.attributes.get(k) || null; },
        innerHTML: '',
        innerText: '',
        children: [],
        appendChild(c) { this.children.push(c); return c; },
        querySelector: () => null,
        querySelectorAll: () => []
      })
    },
    location: { hostname: 'localhost', search: '?tenant=benmi' },
    localStorage: {
      _data: {},
      getItem(k) { return this._data[k] || null; },
      setItem(k, v) { this._data[k] = String(v); },
      removeItem(k) { delete this._data[k]; }
    },
    sessionStorage: {
      _data: {},
      getItem(k) { return this._data[k] || null; },
      setItem(k, v) { this._data[k] = String(v); },
      removeItem(k) { delete this._data[k]; }
    },
    Intl,
    Date,
    Math,
    JSON,
    RegExp,
    Array,
    Object,
    String,
    Number,
    Boolean,
    Promise,
    Set,
    Map,
    console,
    setTimeout: (fn) => setTimeout(fn, 0),
    setInterval: () => {},
    clearTimeout: () => {},
    clearInterval: () => {},
    fetch: async () => ({
      ok: true,
      status: 200,
      json: async () => ({})
    }),
    alert: () => {},
    confirm: () => true
  };
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;

  const context = vm.createContext(sandbox);

  // Load modules in order
  const scripts = [
    'js/client-core.js',
    'js/client-menu.js',
    'js/client-customizations.js',
    'js/client-bundle.js',
    'js/client-cart.js'
  ];

  for (const src of scripts) {
    const code = fs.readFileSync(path.join(ROOT_DIR, src), 'utf8');
    vm.runInContext(code, context, { filename: src });
  }

  return context;
}

test('Modular Client: Global exports and API bindings exist', () => {
  const ctx = createClientEnvironment();
  assert.equal(typeof ctx.window.getTenantIdFromUrl, 'function');
  assert.equal(typeof ctx.window.fetchMenu, 'function');
  assert.equal(typeof ctx.window.renderDynamicCatalog, 'function');
  assert.equal(typeof ctx.window.resolveCatalogItem, 'function');
  assert.equal(typeof ctx.window.parseCartKey, 'function');
  assert.equal(typeof ctx.window.getCategoryModifiers, 'function');
  assert.equal(typeof ctx.window.toggleCustomize, 'function');
  assert.equal(typeof ctx.window.openBundleBuilderModal, 'function');
  assert.equal(typeof ctx.window.checkAllBundlesComplete, 'function');
  assert.equal(typeof ctx.window.updateQty, 'function');
  assert.equal(typeof ctx.window.updateTotal, 'function');
  assert.equal(typeof ctx.window.calculateCategoryBundleSubtotal, 'function');
});

test('Modular Client: parseCartKey handles prefixes and fallback delimiters', () => {
  const ctx = createClientEnvironment();
  ctx.bootstrapData = {
    catalog: [
      { slug: 'banh_mi', name: 'Bánh Mì' },
      { slug: 'drinks', name: 'Đồ Uống' }
    ]
  };

  const parsed1 = ctx.parseCartKey('banh_mi_Thịt Nướng');
  assert.equal(parsed1.catSlug, 'banh_mi');
  assert.equal(parsed1.origName, 'Thịt Nướng');

  const parsed2 = ctx.parseCartKey('drinks_Trà Sữa');
  assert.equal(parsed2.catSlug, 'drinks');
  assert.equal(parsed2.origName, 'Trà Sữa');

  const parsed3 = ctx.parseCartKey('unknown_Special');
  assert.equal(parsed3.catSlug, 'unknown');
  assert.equal(parsed3.origName, 'Special');
});

test('Modular Client: calculateCategoryBundleSubtotal discount math', () => {
  const ctx = createClientEnvironment();
  const rule = { bundle_qty: 3, bundle_price: 100 };
  const items = [
    { name: 'Item A', price: 40, qty: 2 },
    { name: 'Item B', price: 40, qty: 2 }
  ];

  // Total 4 items: regular total = 4 * 40 = 160.
  // 1 bundle of 3 items = 100. Remainder 1 item = 40. Category total = 140. Discount = 20.
  const res = ctx.calculateCategoryBundleSubtotal(rule, items);
  assert.equal(res.regularTotal, 160);
  assert.equal(res.bundleCount, 1);
  assert.equal(res.remainderCount, 1);
  assert.equal(res.categoryTotal, 140);
  assert.equal(res.discountAmount, 20);
});

test('Modular Client: updateQty increments and decrements cart correctly', () => {
  const ctx = createClientEnvironment();
  ctx.bootstrapData = {
    catalog: [
      {
        slug: 'drinks',
        name: 'Drinks',
        items: [{ id: 'd1', name: 'Cà phê', price: 50 }]
      }
    ]
  };

  ctx.updateQty('drinks', 'Cà phê', 1);
  assert.equal(ctx.cart['drinks_Cà phê'], 1);

  ctx.updateQty('drinks', 'Cà phê', 2);
  assert.equal(ctx.cart['drinks_Cà phê'], 3);

  ctx.updateQty('drinks', 'Cà phê', -1);
  assert.equal(ctx.cart['drinks_Cà phê'], 2);

  ctx.updateQty('drinks', 'Cà phê', -5);
  assert.equal(ctx.cart['drinks_Cà phê'], 0);
});

test('Modular Client: checkAllBundlesComplete detects missing bundle choices', () => {
  const ctx = createClientEnvironment();
  ctx.bootstrapData = {
    catalog: [
      {
        slug: 'combo',
        name: 'Combo',
        items: [
          {
            id: 'c1',
            name: 'Set Meal',
            price: 150,
            bundleRule: {
              groups: [
                {
                  id: 'g1',
                  name: '配菜',
                  minQuantity: 2,
                  maxQuantity: 2,
                  eligibleItems: [
                    { id: 'opt1', name: 'Option 1' },
                    { id: 'opt2', name: 'Option 2' }
                  ]
                }
              ]
            }
          }
        ]
      }
    ]
  };

  ctx.cart['combo_Set Meal'] = 1;
  // No bundleCartData yet -> checkAllBundlesComplete should fail
  const check1 = ctx.checkAllBundlesComplete();
  assert.equal(check1.valid, false);

  // Provide complete bundleCartData
  ctx.window.bundleCartData = {
    'combo_Set Meal': [
      {
        portionIndex: 0,
        groups: [
          {
            groupId: 'g1',
            items: [
              { itemId: 'opt1', quantity: 1 },
              { itemId: 'opt2', quantity: 1 }
            ]
          }
        ]
      }
    ]
  };

  const check2 = ctx.checkAllBundlesComplete();
  assert.equal(check2.valid, true);
});
