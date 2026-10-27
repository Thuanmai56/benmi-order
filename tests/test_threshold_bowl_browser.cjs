const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const root = path.resolve(__dirname, '..');

test('order threshold disables and dims paid radios, then restores them below the threshold', async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined });
  try {
    const page = await browser.newPage({ viewport: { width: 375, height: 812 }, hasTouch: true });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.route('https://menu.test/**', route => route.fulfill({
      body: '<!doctype html><html><body><div id="options"></div></body></html>', contentType: 'text/html',
    }));
    await page.goto('https://menu.test/');
    await page.addStyleTag({ path: path.join(root, 'index.css') });
    for (const file of ['js/client-core.js', 'js/client-menu.js', 'js/client-cart.js']) {
      await page.addScriptTag({ path: path.join(root, file) });
    }
    await page.evaluate(() => {
      window.foodSubtotal = 249;
      window.calculateCurrentFoodSubtotal = () => window.foodSubtotal;
      window.checkDesktopAuthGuard = () => true;
      window.alerts = [];
      window.customAlert = message => alerts.push(message);
      window.testGroups = [{ key: 'packaging', title: '免洗提碗選擇（滿$250免費）', type: 'radio', options: [
        { id: 'paid', name: '加購提碗 (+5元)', price: 5, is_default: true },
        { id: 'free', name: '滿$250免費附提碗', price: 0, minOrderSubtotal: 250 },
      ] }, { key: 'unrelated', title: '其他選擇', type: 'radio', options: [
        { id: 'other', name: '加購', price: 10 },
      ] }];
      renderCustomizationsPanel(document.getElementById('options'), testGroups);
    });
    const paid = page.locator('input[data-option-id="paid"]');
    const free = page.locator('input[data-option-id="free"]');
    async function verify(subtotal, eligible) {
      await page.evaluate(value => {
        window.foodSubtotal = value;
        updateCustomizationThresholdUI();
      }, subtotal);
      await page.evaluate(() => Promise.all(document.getAnimations().map(animation => animation.finished)));
      assert.equal(await paid.isDisabled(), eligible);
      assert.equal(await paid.isChecked(), !eligible);
      assert.equal(await free.isDisabled(), !eligible);
      assert.equal(await free.isChecked(), eligible);
      assert.equal(await paid.evaluate(input => getComputedStyle(input.closest('label')).opacity), eligible ? '0.42' : '1');
      assert.equal(await page.locator('input[data-option-id="other"]').isDisabled(), false);
      assert.equal(await page.locator('input[name="opt-packaging"]:checked').count(), 1);
    }
    await verify(249, false);
    await verify(250, true);
    await paid.locator('..').click({ force: true });
    await free.focus();
    await page.keyboard.press('ArrowLeft');
    assert.equal(await free.isChecked(), true, 'Pointer and keyboard cannot choose the paid option');
    assert.deepEqual(await page.evaluate(() => alerts), [], 'Paid replacement must not show a misleading minimum-$0 warning');
    await verify(300, true);
    await verify(249, false);
    await verify(250, true);
    // Re-rendering an already eligible cart must apply the same lock immediately.
    await page.evaluate(() => renderCustomizationsPanel(document.getElementById('options'), testGroups));
    await verify(250, true);
    // A sold-out free option must not prevent buying the paid fallback.
    await page.evaluate(() => {
      testGroups[0].options[1].isOutOfStock = true;
      renderCustomizationsPanel(document.getElementById('options'), testGroups);
    });
    assert.equal(await paid.isDisabled(), false);
    assert.equal(await paid.isChecked(), true);
    assert.equal(await free.isDisabled(), true);
    assert.deepEqual(errors, []);
  } finally {
    await browser.close();
  }
});
