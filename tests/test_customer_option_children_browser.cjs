const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const chromium = require(process.env.PLAYWRIGHT_MODULE || 'playwright')[process.env.MENU_QA_BROWSER || 'chromium'];

const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file));
let browser;
before(async () => {
  browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined });
});
after(async () => browser?.close());

for (const width of [320, 435]) {
  for (const lang of ['vi', 'zh-TW']) {
    test(`mixed menu options keep child controls visible on ${width}px LIFF in ${lang}`, async () => {
      const names = lang === 'vi'
        ? ['Chọn món ăn kèm', 'Trứng', 'Lòng đào', 'Đậu phụ', 'Chiên giòn', 'Món lấy từ menu']
        : ['選擇配餐', '雞蛋', '溏心蛋', '豆腐', '酥炸', '從菜單選取的餐點'];
      const rule = { version: 3, groups: [{
        id: 'sides', name: names[0], minSelection: 0, maxSelection: 3,
        eligibleItems: [
          { id: 'egg', name: names[1], price: 5, subOptions: [{ id: 'soft', name: names[2], price: 2 }] },
          { id: 'tofu', name: names[3], price: 4, subOptions: [{ id: 'crispy', name: names[4], price: 3 }] },
          { id: 'menu-dish', name: names[5], productId: 'menu-dish-product', price: 6 },
        ],
      }] };
      const page = await browser.newPage({ viewport: { width, height: 844 }, isMobile: true, hasTouch: true });
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      const html = `<!doctype html><html lang="${lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="stylesheet" href="/index.css"><link rel="stylesheet" href="/css/client-option-groups.css"></head><body><button id="launch">Open</button><script>window.currentLocale=${JSON.stringify(lang)};window.cart={};window.bundleCartData={};window.customizeData={};window.resolveCatalogItem=()=>({targetItem:{price:100},bundleRule:${JSON.stringify(rule)}});window.updateTotal=()=>{};</script><script src="/js/client-option-groups.js"></script><script>document.getElementById('launch').onclick=()=>UnifiedOptions.open('fixture','Meal');</script></body></html>`;
      await page.route('**/*', route => {
        const url = new URL(route.request().url());
        if (url.pathname === '/fixture') return route.fulfill({ body: html, contentType: 'text/html; charset=utf-8' });
        if (['/index.css', '/css/client-option-groups.css', '/js/client-option-groups.js'].includes(url.pathname))
          return route.fulfill({ body: read(url.pathname.slice(1)), contentType: url.pathname.endsWith('.css') ? 'text/css' : 'text/javascript' });
        return route.abort();
      });
      try {
        await page.goto('http://menu.test/fixture');
        await page.locator('#launch').click();
        for (let index = 0; index < 3; index++)
          await page.locator(`[data-add="0"][data-option="${index}"]`).click();
        assert.equal(await page.locator('[data-child]').count(), 0);
        assert.equal(await page.locator('.uoc-inline-subs').count(), 2);
        for (const [path, parent] of [['0.0', names[1]], ['0.1', names[3]]]) {
          const input = page.locator(`[data-sub="${path}"]`);
          assert.match(await input.locator('xpath=ancestor::div[contains(@class,"uoc-option-entry")]').textContent(), new RegExp(parent));
          const bounds = await input.locator('xpath=ancestor::label').boundingBox();
          assert.ok(bounds.height >= 48, `child touch target is ${bounds.height}px`);
          await input.check();
        }
        assert.match(await page.locator('[data-confirm]').textContent(), /\$120/);
        const layout = await page.evaluate(() => ({
          page: document.documentElement.scrollWidth,
          panel: document.querySelector('.uoc-panel').getBoundingClientRect().right,
        }));
        assert.ok(layout.page <= width + 1, `page width ${layout.page}`);
        assert.ok(layout.panel <= width + 1, `panel right ${layout.panel}`);
        await page.locator('[data-confirm]').click();
        const saved = await page.evaluate(() => bundleCartData.fixture_Meal[0].groups[0].items);
        assert.deepEqual(saved.map(item => item.subOptions.length), [1, 1, 0]);
        await page.evaluate(() => UnifiedOptions.open('fixture', 'Meal', 0));
        assert.equal(await page.locator('[data-sub="0.0"]').isChecked(), true);
        assert.equal(await page.locator('[data-sub="0.1"]').isChecked(), true);
        assert.deepEqual(errors, []);
      } finally {
        await page.close();
      }
    });
  }
}
