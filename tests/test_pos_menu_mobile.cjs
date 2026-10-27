const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

const sampleMenu = [
  {
    id: 'cat_main',
    title: '主餐熱銷 (Món chính)',
    type: 'catalog',
    sortOrder: 1,
    items: [
      { id: 'item_1', name: '招牌越式牛肉河粉 Phở Bò', price: 160, isOos: false },
      { id: 'item_2', name: '順化牛肉米線 Bún Bò Huế', price: 170, isOos: true },
      { id: 'item_3', name: '越式烤肉飯 Cơm Thịt Nướng', price: 150, isOos: false }
    ]
  },
  {
    id: 'cat_drinks',
    title: '特色飲品 (Đồ uống)',
    type: 'catalog',
    sortOrder: 2,
    items: [
      { id: 'item_4', name: '越式滴漏冰咖啡 Cà Phê Sữa Đá', price: 75, isOos: false },
      { id: 'item_5', name: '香茅檸檬茶 Trà Chanh Sả', price: 60, isOos: false }
    ]
  },
  {
    id: 'cat_sides',
    title: '小吃點心 (Ăn vặt)',
    type: 'catalog',
    sortOrder: 3,
    items: [
      { id: 'item_6', name: '越式炸春捲 Chả Giò', price: 80, isOos: false },
      { id: 'item_7', name: '生春捲 Gỏi Cuốn', price: 90, isOos: false }
    ]
  },
  {
    id: 'cat_options_sugar',
    title: '甜度選項 (Độ ngọt)',
    type: 'customization',
    scope: 'item',
    sortOrder: 4,
    items: [
      { id: 'opt_1', name: '正常甜 (100%)', price: 0 },
      { id: 'opt_2', name: '半糖 (50%)', price: 0 },
      { id: 'opt_3', name: '無糖 (0%)', price: 0 }
    ]
  }
];

async function run() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  
  const errors = [];
  page.on('pageerror', err => errors.push(err.message));
  page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
  
  await page.route('**/*', route => {
    const url = new URL(route.request().url());
    if (url.pathname === '/orders.html') {
      const html = read('orders.html').replace(/<script\b(?![^>]*\bsrc=)[^>]*>[\s\S]*?<\/script>/gi, '');
      return route.fulfill({ body: html, contentType: 'text/html' });
    }
    if (/^\/(js|css)\/[\w.-]+$/.test(url.pathname)) {
      return route.fulfill({ body: read(url.pathname.slice(1)), contentType: url.pathname.endsWith('.css') ? 'text/css' : 'text/javascript' });
    }
    return route.fulfill({ body: '{}', contentType: 'application/json' });
  });

  await page.addInitScript(() => {
    window.setInterval = () => 0;
    window.fetch = async (url) => {
      return { ok: true, headers: new Headers(), json: async () => ({}) };
    };
  });

  await page.goto('http://pos.test/orders.html?tenant=benmi');

  // Switch to Menu Tab and populate sample data
  await page.evaluate((menuData) => {
    currentMenuData = menuData;
    isMenuLoadedCompletely = true;
    switchTab('menu');
    setMenuSidebarTab('products');
    activeCategoryIndex = 0;
    renderMenuCategories();
    renderMenuCategoryEditor(0);
  }, sampleMenu);

  await page.waitForTimeout(400);

  // 1. Inspect Products Mode on Mobile
  const mobileMetrics = await page.evaluate(() => {
    const heading = document.getElementById('menu-workspace-heading');
    const split = document.getElementById('menu-standard-workspace');
    const sidebar = document.getElementById('menu-sidebar-panel');
    const categories = document.getElementById('menu-categories');
    const editor = document.getElementById('menu-editor-panel');
    const editorBody = document.getElementById('menu-editor-body');
    const cards = [...document.querySelectorAll('.menu-item-row-card')];
    
    return {
      windowH: window.innerHeight,
      headingRect: heading ? heading.getBoundingClientRect() : null,
      splitRect: split ? split.getBoundingClientRect() : null,
      sidebarRect: sidebar ? sidebar.getBoundingClientRect() : null,
      categoriesRect: categories ? categories.getBoundingClientRect() : null,
      editorRect: editor ? editor.getBoundingClientRect() : null,
      cardsCount: cards.length,
      firstCardRect: cards[0] ? cards[0].getBoundingClientRect() : null,
      lastCardRect: cards[cards.length - 1] ? cards[cards.length - 1].getBoundingClientRect() : null,
      hasHorizontalPageOverflow: document.documentElement.scrollWidth > window.innerWidth,
      editorScrollable: editorBody ? editorBody.scrollHeight > editorBody.clientHeight : false
    };
  });

  console.log('Mobile Products Metrics:', JSON.stringify(mobileMetrics, null, 2));

  fs.mkdirSync(path.join(root, 'temp'), { recursive: true });
  await page.screenshot({ path: path.join(root, 'temp/menu_mobile_products.png') });

  // 2. Switch to Options Mode on Mobile
  await page.evaluate(() => {
    setMenuSidebarTab('options');
    renderMenuCategories();
    renderMenuCategoryEditor(3);
  });
  await page.waitForTimeout(300);

  const optionsMetrics = await page.evaluate(() => {
    const categories = document.getElementById('menu-categories');
    const editorBody = document.getElementById('menu-editor-body');
    return {
      categoriesH: categories ? categories.getBoundingClientRect().height : null,
      editorBodyH: editorBody ? editorBody.getBoundingClientRect().height : null,
      hasHorizontalPageOverflow: document.documentElement.scrollWidth > window.innerWidth
    };
  });
  console.log('Mobile Options Metrics:', JSON.stringify(optionsMetrics, null, 2));
  await page.screenshot({ path: path.join(root, 'temp/menu_mobile_options.png') });

  // 3. Category Manager / Reorder Screen
  await page.evaluate(() => {
    setMenuSidebarTab('products');
    openCategoriesManager();
  });
  await page.waitForTimeout(300);

  const reorderMetrics = await page.evaluate(() => {
    const screen = document.getElementById('menu-display-order-screen');
    const cols = document.querySelector('.menu-order-columns');
    return {
      screenVisible: screen && getComputedStyle(screen).display !== 'none',
      colsRect: cols ? cols.getBoundingClientRect() : null,
      hasHorizontalPageOverflow: document.documentElement.scrollWidth > window.innerWidth
    };
  });
  console.log('Mobile Reorder Metrics:', JSON.stringify(reorderMetrics, null, 2));
  await page.screenshot({ path: path.join(root, 'temp/menu_mobile_reorder.png') });

  // 4. Return to products mode
  await page.evaluate(() => {
    closeCategoriesManager();
  });
  await page.waitForTimeout(200);

  // Assertions
  assert(!mobileMetrics.hasHorizontalPageOverflow, 'No horizontal page overflow on mobile');
  assert(!optionsMetrics.hasHorizontalPageOverflow, 'No horizontal page overflow in options mode');
  assert(!reorderMetrics.hasHorizontalPageOverflow, 'No horizontal page overflow in reorder screen');
  assert(mobileMetrics.headingRect.height <= 105, 'Heading height is compact on mobile');
  assert(mobileMetrics.categoriesRect.height >= 44 && mobileMetrics.categoriesRect.height <= 60, 'Categories rail is a horizontal pill bar');
  assert(mobileMetrics.editorRect.bottom <= mobileMetrics.windowH + 1, 'Editor panel stays within viewport');
  assert(mobileMetrics.cardsCount > 0, 'Menu item cards are rendered');

  assert.deepEqual(errors, [], 'No JS runtime errors');
  console.log('PASS: Mobile Menu Layout Verified across Products, Options, and Reorder screens!');

  await browser.close();
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
