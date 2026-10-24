// Actual CSS/layout regression for #61. Optional env: PLAYWRIGHT_MODULE,
// CHROME_PATH, OPTION_STEPS_BASE_URL (verify deployed assets), OPTION_STEPS_ARTIFACT_DIR.
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const chromium = require(process.env.PLAYWRIGHT_MODULE || 'playwright')[process.env.MENU_QA_BROWSER || 'chromium'];
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const html = read('index.html');
const assets = [
  html.match(/href="(\/index\.css\?v=[^"]+)"/)[1],
  html.match(/href="(\/css\/client-option-groups\.css\?v=[^"]+)"/)[1],
  html.match(/src="(\/js\/client-option-groups\.js\?v=[^"]+)"/)[1],
];
let browser;
before(async () => {
  browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined });
});
after(async () => browser?.close());

async function fixture(page, lang) {
  const names = lang === 'vi'
    ? ['Chọn rau ăn kèm', 'Tự chọn độ cay', 'Chọn nước sốt và gia vị', 'Ghi chú dặn dò thêm cho món', 'Nhóm tùy chọn có tên rất dài '.repeat(5)]
    : ['請選擇 6 樣配菜', '自選辣度', '醬料與調味選擇', '餐點的其他特別需求', '名稱非常長的餐點客製化選項群組'.repeat(5)];
  const rule = {
    version: 3,
    groups: names.map((name, i) => ({
      id: `group-${i}`, name, minSelection: 1, maxSelection: i === 0 ? 2 : 1,
      allowRepeats: i === 0,
      eligibleItems: Array.from({ length: i === 0 ? 12 : 1 }, (_, j) => ({
        id: `option-${i}-${j}`, name: lang === 'vi' ? `Lựa chọn ${i}-${j}` : `配菜 ${i}-${j}`,
        price: i === 0 ? 3 : 2, ...(i === 0 ? { productId: `product-${j}`, retailPrice: 48 } : {}),
      })),
    })),
  };
  const body = `<!doctype html><html lang="${lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
    <link rel="stylesheet" href="${assets[0]}"><link rel="stylesheet" href="${assets[1]}"></head><body>
    <button id="launch">Open</button><script>
    window.currentLocale=${JSON.stringify(lang)};window.cart={};window.bundleCartData={};window.customizeData={};
    window.resolveCatalogItem=()=>({targetItem:{price:100},bundleRule:${JSON.stringify(rule)}});
    window.updateTotal=()=>{};
    </script><script src="${assets[2]}"></script><script>
    document.getElementById('launch').onclick=()=>UnifiedOptions.open('fixture','Meal');
    </script></body></html>`;
  const base = process.env.OPTION_STEPS_BASE_URL || 'http://menu.test';
  await page.route('**/*', route => {
    const url = new URL(route.request().url());
    if (url.pathname === '/__option_steps_test__')
      return route.fulfill({ body, contentType: 'text/html; charset=utf-8' });
    if (assets.includes(url.pathname + url.search)) {
      if (process.env.OPTION_STEPS_BASE_URL) return route.continue();
      return route.fulfill({ body: read(url.pathname.slice(1)), contentType: url.pathname.endsWith('.css') ? 'text/css' : 'text/javascript' });
    }
    return route.abort();
  });
  await page.goto(base + '/__option_steps_test__');
  await page.locator('#launch').click();
  await page.evaluate(() => Promise.all(document.getAnimations().map(a => a.finished)));
}

async function assertStepVisible(page, index) {
  const bounds = await page.locator(`[data-step="${index}"]`).evaluate(button => {
    const nav = button.parentElement, b = button.getBoundingClientRect(), n = nav.getBoundingClientRect();
    return { left: b.left - n.left, right: b.right - n.left, width: b.width, available: nav.clientWidth };
  });
  assert.ok(bounds.left >= -1 && bounds.left < bounds.available, JSON.stringify(bounds));
  if (bounds.width <= bounds.available - 16)
    assert.ok(bounds.right <= bounds.available + 1, JSON.stringify(bounds));
}

for (const [width, height] of [[320, 740], [390, 844], [435, 941], [768, 1024], [1024, 768]]) {
  for (const lang of ['vi', 'zh-TW']) {
    test(`option steps stay contained and operable: ${width}x${height} ${lang}`, async () => {
      const page = await browser.newPage({ viewport: { width, height } });
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      try {
        await fixture(page, lang);
        const nav = page.locator('.uoc-panel nav');
        const layout = await nav.evaluate(nav => {
          const panel = nav.closest('.uoc-panel').getBoundingClientRect();
          const buttons = [...nav.children];
          return {
            allLabelsFit: buttons.every(b => b.scrollWidth <= b.clientWidth + 1),
            touchTargets: buttons.every(b => {
              const rect = b.getBoundingClientRect();
              return rect.height >= 48 && rect.width >= 48;
            }),
            oneRow: buttons.every(b => b.offsetTop === buttons[0].offsetTop),
            overflowsStrip: nav.scrollWidth > nav.clientWidth,
            panelLeft: panel.left, panelRight: panel.right,
            pageWidth: document.documentElement.scrollWidth,
          };
        });
        assert.equal(layout.allLabelsFit, true, 'text must fit inside each button');
        assert.equal(layout.touchTargets, true);
        assert.equal(layout.oneRow, true);
        assert.equal(layout.overflowsStrip, true);
        assert.ok(layout.panelLeft >= 0 && layout.panelRight <= width + 1);
        assert.ok(layout.pageWidth <= width + 1, 'overflow belongs to the strip, not the page');

        // Invalid confirmation also reveals the first required step, even from the far end.
        await page.locator('[data-step="4"]').focus();
        await page.keyboard.press('Enter');
        await page.locator('[data-confirm]').click();
        assert.equal(await page.locator('[aria-current="step"]').getAttribute('data-step'), '0');
        await assertStepVisible(page, 0);
        assert.ok(await page.locator('[role="alert"]').textContent());

        // Pan away from the active step; editing a visible option must not snap back.
        const add = page.locator('[data-add="0"][data-option="3"]');
        await add.scrollIntoViewIfNeeded();
        await nav.evaluate(nav => { nav.scrollLeft = nav.scrollWidth; });
        const before = await page.evaluate(() => ({
          x: document.querySelector('.uoc-panel nav').scrollLeft,
          y: document.querySelector('.uoc-body').scrollTop,
        }));
        await add.click();
        await add.click();
        assert.equal(await nav.evaluate(nav => nav.scrollLeft), before.x);
        assert.equal(await page.locator('.uoc-body').evaluate(body => body.scrollTop), before.y);
        assert.match(await page.locator('[data-step="0"]').textContent(), /^✓ /);
        const panelY = await page.locator('.uoc-panel').evaluate(panel => panel.getBoundingClientRect().top);
        await page.locator('[data-note]').fill('Less sauce');
        await page.locator('[data-confirm]').click();
        await assertStepVisible(page, 1);
        assert.equal(await page.locator('.uoc-panel').evaluate(panel => panel.getBoundingClientRect().top), panelY);

        // Native Tab/Enter navigation reveals focused steps, including a name wider than the popup.
        await page.locator('[data-close]').focus();
        for (let index = 0; index < 5; index++) {
          await page.keyboard.press('Tab');
          assert.equal(await page.evaluate(() => document.activeElement.dataset.step), String(index));
          await assertStepVisible(page, index);
        }
        await page.keyboard.press('Enter');
        assert.equal(await page.locator('[aria-current="step"]').getAttribute('data-step'), '4');
        assert.equal(await page.evaluate(() => document.activeElement.dataset.step), '4');
        await assertStepVisible(page, 4);
        assert.equal(await page.locator('.uoc-panel').evaluate(panel => panel.getBoundingClientRect().top), panelY);

        // Going back preserves selections; Next advances horizontally without changing prices/rules.
        await page.locator('[data-step="0"]').focus();
        await page.keyboard.press('Enter');
        assert.equal(await page.locator('.bundle-qty-val').textContent(), '2');
        assert.equal(await page.locator('[data-note]').inputValue(), 'Less sauce');
        await page.locator('[data-confirm]').click();
        for (let index = 1; index < 5; index++) {
          await assertStepVisible(page, index);
          await page.locator(`[data-choose="${index}"]`).click();
          if (index === 4) assert.match(await page.locator('[data-confirm]').textContent(), /\$114/);
          await page.locator('[data-confirm]').click();
        }
        assert.equal(await page.locator('#unified-option-modal').isHidden(), true);
        const snapshot = await page.evaluate(() => ({
          qty: cart.fixture_Meal,
          groups: bundleCartData.fixture_Meal[0].groups,
          note: customizeData.fixture_Meal[0].note,
        }));
        assert.equal(snapshot.qty, 1);
        assert.equal(snapshot.groups.length, 5);
        assert.equal(snapshot.groups[0].items.reduce((n, item) => n + item.quantity, 0), 2);
        assert.equal(snapshot.note, 'Less sauce');

        await page.evaluate(() => UnifiedOptions.open('fixture', 'Meal', 0));
        await page.evaluate(() => Promise.all(document.getAnimations().map(a => a.finished)));
        assert.equal(await nav.evaluate(nav => nav.scrollLeft), 0, 'opening again starts at the first step');
        await assertStepVisible(page, 0);
        if (process.env.OPTION_STEPS_ARTIFACT_DIR && width === 435) {
          fs.mkdirSync(process.env.OPTION_STEPS_ARTIFACT_DIR, { recursive: true });
          await page.screenshot({ path: path.join(process.env.OPTION_STEPS_ARTIFACT_DIR, `option-steps-${lang}.png`) });
        }
        assert.deepEqual(errors, []);
      } finally {
        await page.close();
      }
    });
  }
}
