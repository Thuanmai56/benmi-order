// Run with PLAYWRIGHT_MODULE pointing to the bundled Playwright package if needed.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');

const root = path.resolve(__dirname, '..');
const readSource = (file, baseline) => baseline
  ? execFileSync('git', ['show', `HEAD:${file}`], { cwd: root, encoding: 'utf8' })
  : fs.readFileSync(path.join(root, file), 'utf8');

async function loadFixture(page, baseline = false) {
  await page.route('**/*', route => route.fulfill({ body: '<html></html>', contentType: 'text/html' }));
  await page.goto('http://pos.test/?tenant=fixture');
  const html = readSource('orders.html', baseline)
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<link\b[^>]*>/gi, '');
  await page.setContent(html);
  await page.addStyleTag({ content: readSource('css/orders.css', baseline) });
  await page.evaluate(() => {
    window.fixtureIntervals = [];
    window.setInterval = (callback, delay) => window.fixtureIntervals.push({ callback, delay });
    window.alert = message => { throw new Error(`Unexpected alert: ${message}`); };
    window.confirm = () => true;
    window.fixturePosts = [];
    window.fetch = async (url, options = {}) => {
      if (url.includes('/api/update')) {
        const update = JSON.parse(options.body);
        window.fixturePosts.push(update);
        window.fixtureOrders.find(order => order.key === update.key).status = update.status;
      }
      return {
        ok: true, status: 200, headers: new Headers(),
        json: async () => url.includes('/api/orders') ? structuredClone(window.fixtureOrders) : {}
      };
    };
  });
  for (const file of ['js/orders-i18n.js', 'js/orders-core.js', 'js/orders-live.js', 'js/orders-modals.js']) {
    await page.addScriptTag({ content: readSource(file, baseline) });
  }
  await page.evaluate(() => {
    window.currentTenantFeatures = ['dine_in'];
    window.fixtureOrders = Array.from({ length: 80 }, (_, index) => ({
      key: `fixture-${index}`, displayKey: index === 1 ? 'K1004-very-long-order-identifier-0123456789' : `K1004-${String(index + 1).padStart(3, '0')}`,
      customer: index === 1 ? 'Khách có tên rất dài để kiểm tra bố cục đơn hàng trên điện thoại' : `Khách ${index + 1}`,
      status: index < 24 ? 'ACCEPTED' : 'DONE',
      diningOption: index % 2 ? 'dine_in' : 'takeaway',
      tableNumber: index % 2 ? 'A-12' : '', round_count: 3, is_modified: 1,
      content: '1 x 招牌特餐\n2 x 鮮奶茶', total: 1234567,
      time: '23:59', createdAt: Date.now()
    }));
    latestOrders = structuredClone(window.fixtureOrders);
    if (typeof initLiveMobileView === 'function') initLiveMobileView();
    applyLanguageToDOM();
    renderAll();
  });
}

async function layout(page) {
  return page.evaluate(() => {
    const selectors = ['#view-live', '.live-split', '.live-panel', '.tile', '.tile-info', '.tile-actions', '.tile-action-btn'];
    return selectors.map(selector => {
      const node = document.querySelector(selector);
      const css = getComputedStyle(node);
      const rect = node.getBoundingClientRect();
      return { selector, display: css.display, columns: css.gridTemplateColumns, direction: css.flexDirection,
        width: rect.width, height: rect.height, padding: css.padding, gap: css.gap };
    });
  });
}

function assertSameLayout(actual, expected, message) {
  actual.forEach((node, index) => {
    Object.entries(node).forEach(([property, value]) => {
      if (typeof value === 'number') {
        assert(Math.abs(value - expected[index][property]) < 1, `${message}: ${node.selector} ${property}`);
      } else {
        assert.equal(value, expected[index][property], `${message}: ${node.selector} ${property}`);
      }
    });
  });
}

async function scrollList(page, selector, position) {
  await page.locator(selector).evaluate((node, value) => { node.scrollTop = value; }, position);
  await page.waitForFunction(({ selector, position }) => document.querySelector(selector).scrollTop === position, { selector, position });
  // Let the browser dispatch the scroll event before switching the panel.
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
}

async function snapshot(page, name) {
  if (!process.env.POS_LIVE_SCREENSHOT_DIR) return;
  fs.mkdirSync(process.env.POS_LIVE_SCREENSHOT_DIR, { recursive: true });
  await page.screenshot({ path: path.join(process.env.POS_LIVE_SCREENSHOT_DIR, `${name}.png`) });
}

async function resize(page, viewport) {
  await page.setViewportSize(viewport);
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
}

(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.CHROME_PATH || (process.platform === 'darwin' ? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' : undefined),
    headless: true
  });
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await loadFixture(page);

    for (const lang of ['zh-TW', 'vi']) {
      await page.evaluate(lang => { currentLang = lang; window.currentLang = lang; applyLanguageToDOM(); renderAll(); }, lang);
      for (const width of [320, 375, 390, 430, 600]) {
        await resize(page, { width, height: 900 });
        assert(await page.locator('#live-mobile-tabs').isVisible());
        assert(await page.locator('#live-panel-pending').isVisible());
        assert(!(await page.locator('#live-panel-ready').isVisible()));
        const metrics = await page.evaluate(() => {
          const list = document.getElementById('list-left');
          const tile = list.querySelector('.tile');
          const info = tile.querySelector('.tile-info').getBoundingClientRect();
          const button = tile.querySelector('button').getBoundingClientRect();
          const visibleNodes = [list, tile, ...tile.querySelectorAll('.tile-info > *, .tile-info span, button'), ...document.querySelectorAll('.live-mobile-tab')];
          return {
            listHeight: list.clientHeight, listBottom: list.getBoundingClientRect().bottom,
            documentWidth: document.documentElement.scrollWidth,
            overflow: visibleNodes.filter(node => node.getBoundingClientRect().right > window.innerWidth + 1 || node.scrollWidth > node.clientWidth + 1).map(node => node.className),
            overlap: button.top < info.bottom,
            buttonHeight: button.height,
            tabHeights: [...document.querySelectorAll('.live-mobile-tab')].map(node => node.getBoundingClientRect().height)
          };
        });
        assert(metrics.listHeight > 100 && metrics.listBottom <= 900, `${lang}/${width}: list must fit viewport`);
        assert.equal(metrics.documentWidth, width);
        assert.deepEqual(metrics.overflow, [], `${lang}/${width}: overflowing content`);
        assert(!metrics.overlap && metrics.buttonHeight >= 48);
        assert(metrics.tabHeights.every(height => height >= 48));
        assert.equal(await page.locator('#live-mobile-count-pending').innerText(), '24');
        assert.equal(await page.locator('#live-mobile-count-ready').innerText(), '56');
      }
    }
    await resize(page, { width: 390, height: 844 });
    await snapshot(page, 'live-mobile-vi');

    const tabPosition = await page.locator('#live-mobile-tabs').boundingBox();
    await scrollList(page, '#list-left', 500);
    assert.deepEqual(await page.locator('#live-mobile-tabs').boundingBox(), tabPosition, 'Tabs remain stationary');
    await page.locator('#live-mobile-tab-ready').click();
    assert.equal(await page.locator('#live-mobile-tab-ready').getAttribute('aria-selected'), 'true');
    assert.equal(await page.locator('#live-panel-pending').getAttribute('inert'), '');
    assert.equal(await page.locator('#list-right').evaluate(node => node.scrollTop), 0);
    await scrollList(page, '#list-right', 700);
    await page.evaluate(() => window.fixtureIntervals.find(timer => timer.delay === 10000).callback());
    assert.equal(await page.locator('#list-right').evaluate(node => node.scrollTop), 700);
    await page.evaluate(() => fetchOrders());
    assert.equal(await page.locator('#list-right').evaluate(node => node.scrollTop), 700, 'Polling preserves scroll');
    await page.locator('#live-mobile-tab-pending').click();
    assert.equal(await page.locator('#list-left').evaluate(node => node.scrollTop), 500, 'Hidden queue retains scroll');

    await page.locator('#live-mobile-tab-pending').focus();
    await page.keyboard.press('ArrowRight');
    assert(await page.locator('#live-mobile-tab-ready').evaluate(node => node === document.activeElement));
    await page.keyboard.press('Home');
    assert(await page.locator('#live-mobile-tab-pending').evaluate(node => node === document.activeElement));
    await page.keyboard.press('End');
    assert(await page.locator('#live-panel-ready').isVisible());

    await page.locator('#tab-settings').click();
    await resize(page, { width: 844, height: 390 });
    await resize(page, { width: 390, height: 844 });
    assert(!(await page.locator('#view-live').isVisible()), 'Resizing must not reveal Live over another main tab');
    await page.locator('#tab-live').click();
    assert(await page.locator('#live-panel-ready').isVisible());
    assert.equal(await page.locator('#list-right').evaluate(node => node.scrollTop), 700);
    const returnedList = await page.locator('#list-right').boundingBox();
    assert(returnedList.y + returnedList.height <= 844, 'Returning to Live retains bounded scrolling');

    await resize(page, { width: 844, height: 390 });
    await page.waitForFunction(() => !document.getElementById('live-panel-pending').inert);
    assert(await page.locator('#live-panel-pending').isVisible());
    assert(await page.locator('#live-panel-ready').isVisible());
    assert.equal(await page.locator('#live-panel-pending').getAttribute('inert'), null);
    await resize(page, { width: 390, height: 844 });
    assert(await page.locator('#live-panel-ready').isVisible());
    assert.equal(await page.locator('#list-right').evaluate(node => node.scrollTop), 700);

    await page.locator('#filter-btn-takeaway').click();
    assert.equal(await page.locator('#list-right').evaluate(node => node.scrollTop), 0);
    await page.locator('#live-mobile-tab-pending').click();
    assert.equal(await page.locator('#list-left').evaluate(node => node.scrollTop), 0);
    await page.locator('#filter-btn-all').click();
    // Use actual action buttons and production status handlers; only HTTP is mocked.
    await page.locator('#list-left .btn-action-ready').first().click();
    await page.waitForFunction(() => document.getElementById('live-mobile-count-pending').innerText === '23');
    assert.equal(await page.locator('#live-mobile-count-ready').innerText(), '57');
    assert(await page.locator('#live-panel-pending').isVisible());
    await page.locator('#live-mobile-tab-ready').click();
    await page.locator('#list-right .btn-action-pickup').first().click();
    await page.waitForFunction(() => document.getElementById('live-mobile-count-ready').innerText === '56');
    await page.locator('#list-right .btn-action-paid').first().click();
    await page.waitForFunction(() => document.getElementById('live-mobile-count-ready').innerText === '55');
    assert(await page.locator('#live-panel-ready').isVisible());
    assert.deepEqual(await page.evaluate(() => window.fixturePosts.map(post => post.status)), ['DONE', 'PICKED_UP', 'PAID']);
    await page.locator('#list-right .tile').first().click();
    assert(await page.locator('#reviewModal').isVisible(), 'Opening order details still works');
    await page.evaluate(() => closeModal());

    await page.locator('#live-mobile-tab-pending').click();
    await page.evaluate(() => {
      latestOrders.find(order => order.status === 'ACCEPTED').status = 'NEW';
      latestOrders.filter(order => order.status === 'ACCEPTED')[0].status = 'WAITING_CUSTOMER_CHANGE';
      latestOrders.filter(order => order.status === 'ACCEPTED')[0].status = 'WAITING_CUSTOMER_REJECT';
      renderAll();
    });
    assert.equal(await page.locator('#list-left .btn-action-waiting:disabled').count(), 2);
    await page.locator('#list-left .btn-action-review').click();
    assert(await page.locator('#reviewModal').isVisible(), 'Reviewing a new order still works');
    await page.evaluate(() => { closeModal(); posReturnContext = null; });

    await page.evaluate(() => { window.currentTenantFeatures = []; renderAll(); });
    assert(!(await page.locator('#dining-filter-bar').isVisible()), 'Takeaway-only tenants retain feature gating');
    assert(await page.locator('#live-mobile-tabs').isVisible());
    await page.locator('#live-mobile-tab-ready').click();

    await page.evaluate(() => { window.fixtureOrders = []; latestOrders = []; renderAll(); });
    assert(await page.locator('#list-right .empty-state-card').isVisible());
    await page.locator('#live-mobile-tab-pending').click();
    assert(await page.locator('#list-left .empty-state-card').isVisible());
    assert.equal(await page.locator('#live-mobile-count-pending').innerText(), '0');
    assert.equal(await page.locator('#live-mobile-count-ready').innerText(), '0');

    // Compare unaffected layouts with the pre-change source, including tab return.
    const baseline = await browser.newPage();
    await loadFixture(baseline, true);
    const current = await browser.newPage();
    await loadFixture(current);
    for (const viewport of [
      { width: 601, height: 900 }, { width: 600, height: 390 }, { width: 844, height: 390 },
      { width: 768, height: 1024 }, { width: 1024, height: 768 }, { width: 1440, height: 900 }
    ]) {
      await resize(baseline, viewport);
      await resize(current, viewport);
      assert(!(await current.locator('#live-mobile-tabs').isVisible()));
      assert(await current.locator('#live-panel-pending').isVisible());
      assert(await current.locator('#live-panel-ready').isVisible());
      assertSameLayout(await layout(current), await layout(baseline), `Unchanged layout at ${viewport.width}x${viewport.height}`);
      for (const target of [baseline, current]) await target.evaluate(() => { switchTab('settings'); switchTab('live'); });
      assertSameLayout(await layout(current), await layout(baseline), 'Unchanged desktop layout after switching main tabs');
    }
    await resize(current, { width: 1024, height: 768 });
    await snapshot(current, 'live-tablet-zh-TW');
    assert.deepEqual(errors, [], 'No browser runtime errors');
    console.log('PASS: mobile widths/languages, keyboard tabs, independent scrolling, timer/polling, rotation, main-tab return, filters, real status actions, details, empty queues, and unchanged wider/landscape layouts.');
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
