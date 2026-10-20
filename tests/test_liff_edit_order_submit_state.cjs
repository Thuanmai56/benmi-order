const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

function setup({ editResponse } = {}) {
  const elements = new Map();
  function element(id) {
    if (!elements.has(id)) elements.set(id, {
      id, disabled: false, innerHTML: '', innerText: '', style: {},
    });
    return elements.get(id);
  }
  let menuLoaded;
  const menuPromise = new Promise(resolve => { menuLoaded = resolve; });
  const context = {
    console,
    URLSearchParams,
    setTimeout,
    clearTimeout,
    cart: {},
    customizeData: {},
    comboDrinkData: {},
    bundleCartData: {},
    bootstrapData: { catalog: [{ slug: 'food', items: [{ id: 'rice', name: 'Rice' }] }] },
    storeConfig: { storeStatus: 'open' },
    WORKER_BASE: '',
    isSubmitting: false,
    getTenantIdFromUrl: () => 'test-tenant',
    resolveCatalogItem: () => ({ displayName: 'Rice', origName: 'Rice' }),
    parseCartKey: () => ({ catSlug: 'food', origName: 'Rice', itemName: 'Rice' }),
    isItemOutOfStock: () => false,
    updateDynamicStockAndPrices: () => {},
    renderDynamicCatalog: () => {},
    updateTotal: () => context.updateFooterButtonState(),
    fetch: async () => editResponse || ({ ok: true, json: async () => ({
      success: true,
      order: { displayKey: 'A1', total: 100 },
      soldOutItemNames: [],
      items: [{ itemId: 'rice', name: 'Rice', quantity: 1, unitPrice: 100 }],
    }) }),
    sessionStorage: { setItem() {}, getItem() { return null; } },
    document: {
      readyState: 'loading',
      addEventListener() {},
      getElementById(id) { return ['btn-submit', 'btn-desktop-submit'].includes(id) ? element(id) : null; },
      documentElement: { classList: { remove() {} } },
    },
    location: { search: '?mode=edit_order&order_key=order-1', hash: '' },
  };
  context.window = context;
  context.window.location = context.location;
  context.window.menuPromise = menuPromise;
  vm.createContext(context);
  vm.runInContext(fs.readFileSync('js/client-checkout.js', 'utf8'), context);
  return { context, element, menuLoaded };
}

test('edit-order submit buttons unlock as soon as the restored cart is ready', async () => {
  const { context, element, menuLoaded } = setup();
  context.cart.food_Rice = 1; // A cart from an earlier visit must not unlock this order.
  const loading = context.initEditOrderModeIfPresent();
  assert.equal(element('btn-submit').disabled, true);
  assert.equal(element('btn-desktop-submit').disabled, true);

  menuLoaded();
  await loading;
  assert.equal(context.editOrderContextLoaded, true);
  assert.equal(context.cart.food_Rice, 1);
  assert.equal(element('btn-submit').disabled, false);
  assert.equal(element('btn-desktop-submit').disabled, false);

  context.cart.food_Rice = 0;
  context.updateFooterButtonState();
  assert.equal(element('btn-submit').disabled, true);
  assert.equal(element('btn-desktop-submit').disabled, true);

  context.cart.food_Rice = 1;
  context.storeConfig.storeStatus = 'paused';
  context.updateFooterButtonState();
  assert.equal(element('btn-submit').disabled, true);
  assert.equal(element('btn-desktop-submit').disabled, true);

  context.storeConfig.storeStatus = 'open';
  context.updateFooterButtonState();
  assert.equal(element('btn-submit').disabled, false);
  assert.equal(element('btn-desktop-submit').disabled, false);

  context.isSubmitting = true;
  element('btn-submit').disabled = true;
  context.updateFooterButtonState();
  assert.equal(element('btn-submit').disabled, true);
});

test('failed edit context keeps both submit buttons locked with a reload message', async () => {
  const { context, element, menuLoaded } = setup({
    editResponse: { ok: false, json: async () => ({ error: 'not found' }) },
  });
  const loading = context.initEditOrderModeIfPresent();
  menuLoaded();
  await loading;
  assert.equal(context.editOrderContextFailed, true);
  assert.equal(element('btn-submit').disabled, true);
  assert.equal(element('btn-desktop-submit').disabled, true);
  assert.match(element('btn-submit').innerHTML, /重新整理/);
});
