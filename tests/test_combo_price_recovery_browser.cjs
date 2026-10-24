const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const chromium = require(process.env.PLAYWRIGHT_MODULE || 'playwright')[process.env.MENU_QA_BROWSER || 'chromium'];
const root = path.resolve(__dirname, '..');

test('mobile combo checkout can recover from parent and child price changes and submit again', async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined });
  try {
    const scenarios = ['create', 'append', 'modify'].flatMap(flow =>
      ['vi', 'zh-TW'].flatMap(lang => [false, true].map(changed => ({ flow, lang, changed }))));
    for (const { flow, lang, changed } of scenarios) {
      const page = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.route('https://menu.test/**', route => route.fulfill({ body: '<!doctype html><html><body></body></html>', contentType: 'text/html' }));
      await page.goto('https://menu.test/');
      await page.setContent(`<html lang="${lang}"><body>
        <button id="submit-btn" onclick="doSubmitOrderExecution('2026-10-20','12:00')">Submit</button>
        <span id="total-price"></span><div id="cart-summary"></div>
        <div id="custom-alert" class="custom-alert-overlay"><div class="custom-alert-box">
          <div id="custom-alert-message"></div><button onclick="closeCustomAlert()">OK</button>
        </div></div></body></html>`);
      for (const file of ['index.css', 'css/client-option-groups.css'])
        await page.addStyleTag({ content: fs.readFileSync(path.join(root, file), 'utf8') });
      for (const file of ['js/client-core.js', 'js/client-menu.js', 'js/client-customizations.js',
        'js/client-cart.js', 'js/bundle-builder-v2.js', 'js/client-option-groups.js', 'js/client-checkout.js'])
        await page.addScriptTag({ content: fs.readFileSync(path.join(root, file), 'utf8') });
      await page.evaluate(({ locale, flow }) => {
        window.currentLocale = locale;
        window.WORKER_BASE = 'https://worker.test';
        window.getTenantIdFromUrl = () => 'test';
        window.ensureLiffReady = async () => {};
        window.validateCartStockBeforeSubmit = async () => ({ valid: true });
        window.updateFooterButtonState = () => {};
        window.sendOrderConfirmation = async () => {};
        window.DetailCheckout = { prepare: async value => value, enabled: () => false, completed() {} };
        window.isAppendMode = flow === 'append';
        window.isEditOrderMode = flow === 'modify';
        window.parentOrderKey = 'parent-order';
        window.editOrderKey = 'existing-order';
        window.cart = { food_Meal: 1 };
        window.customizeData = { food_Meal: [{ single: {}, multiple: {}, note: 'Keep note' }] };
        window.bootstrapData = { tenant: { id: 'test' }, menuComplete: true, catalog: [{
          slug: 'food', name: 'Food', items: [{ id: 'meal', name: 'Meal', price: 100, bundleRule: {
            version: 3, groups: [{ id: 'sides', name: 'Sides', minSelection: 1, maxSelection: 1,
              eligibleItems: [{ id: 'egg', productId: 'egg-product', name: 'Egg', price: 5,
                subOptions: [{ id: 'soft', name: 'Soft', price: 2 }] }] }],
          } }],
        }] };
        window.bundleCartData = { food_Meal: [{ groups: [{ groupId: 'sides', items: [{
          itemId: 'egg-product', optionId: 'egg', name: 'Egg', quantity: 1, surcharge: 5,
          groups: [], subOptions: [{ id: 'soft', name: 'Soft', price: 2 }],
          modifiers: [{ name: 'Soft', price: 2 }],
        }] }] }] };
        window.sent = [];
        window.serverPrice = 107;
        window.fetch = async (url, init = {}) => {
          if (url.includes('/api/tenant/bootstrap')) {
            const fresh = structuredClone(bootstrapData);
            const option = fresh.catalog[0].items[0].bundleRule.groups[0].eligibleItems[0];
            option.price = 8;
            option.subOptions[0].price = 4;
            return { ok: true, json: async () => fresh };
          }
          if (url.includes('/api/create') || url.includes('/api/orders/')) {
            const payload = JSON.parse(init.body);
            sent.push(payload);
            const valid = (payload.appended_total ?? payload.total) === serverPrice && payload.items[0].subtotal === serverPrice;
            return { ok: valid, status: valid ? 200 : 409, json: async () => valid
              ? { success: true, key: 'test-order' }
              : { code: 'OPTION_PRICE_CHANGED', itemIndex: 0, expectedSubtotal: serverPrice } };
          }
          throw new Error(`Unexpected request ${url}`);
        };
        updateTotal();
      }, { locale: lang, flow });
      // Unchanged prices: current total and payload must agree, avoiding the original false warning.
      assert.equal(await page.evaluate(() => updateTotal()), 107);
      if (changed) {
        await page.evaluate(() => { window.serverPrice = 112; });
        await page.locator('#submit-btn').click();
        await page.locator('#custom-alert').waitFor({ state: 'visible' });
        assert.equal(await page.evaluate(() => isSubmitting), false);
        assert.equal(await page.locator('#submit-btn').isEnabled(), true);
        await page.locator('#custom-alert button').click();
        await page.locator('#unified-option-modal').waitFor({ state: 'visible' });
        assert.match(await page.locator('[data-confirm]').textContent(), /\$112/);
        await page.locator('[data-confirm]').click();
        await page.locator('#unified-option-modal').waitFor({ state: 'hidden', timeout: 2000 });
        assert.equal(await page.evaluate(() => document.querySelectorAll('[data-uoc-inert]').length), 0);
        assert.equal(await page.locator('#total-price').textContent(), '112');
        assert.equal(await page.evaluate(() => customizeData.food_Meal[0].note), 'Keep note');
      }
      await page.locator('#submit-btn').click();
      await page.locator('#custom-alert').waitFor({ state: 'visible' });
      assert.equal(await page.locator('#submit-btn').isDisabled(), true);
      assert.deepEqual(await page.evaluate(() => cart), {});
      const sent = await page.evaluate(() => sent);
      assert.deepEqual(sent.map(payload => payload.appended_total ?? payload.total), changed ? [107, 112] : [107]);
      assert.equal(sent.at(-1).items[0].subtotal, changed ? 112 : 107);
      assert.deepEqual(errors, []);
      await page.close();
    }
  } finally {
    await browser.close();
  }
});
