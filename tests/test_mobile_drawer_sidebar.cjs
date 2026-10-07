const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

test('Mobile Drawer: orders.html markup contains required elements', () => {
  const html = fs.readFileSync(path.resolve(__dirname, '../orders.html'), 'utf-8');

  // Drawer brand and close button in sidebar header
  assert.ok(html.includes('class="sidebar-mobile-brand"'), 'orders.html must have sidebar-mobile-brand');
  assert.ok(html.includes('id="sidebar-mobile-title"'), 'orders.html must have sidebar-mobile-title');
  assert.ok(html.includes('id="sidebar-mobile-logo"'), 'orders.html must have sidebar-mobile-logo');
  assert.ok(html.includes('id="sidebar-mobile-sub"'), 'orders.html must have sidebar-mobile-sub');

  // Mobile Drawer footer
  assert.ok(html.includes('class="sidebar-mobile-footer"'), 'orders.html must have sidebar-mobile-footer');

  // Backdrop overlay
  assert.ok(html.includes('id="sidebar-backdrop"'), 'orders.html must have sidebar-backdrop');
  assert.ok(html.includes('class="sidebar-backdrop"'), 'orders.html must have class sidebar-backdrop');

  // Hamburger toggle button in topbar left
  assert.ok(html.includes('id="mobile-nav-toggle-btn"'), 'orders.html must have mobile-nav-toggle-btn');
  assert.ok(html.includes('class="mobile-nav-toggle-btn"'), 'orders.html must have class mobile-nav-toggle-btn');

  // Cache buster check
  assert.ok(html.includes('orders.css?v=20261007_mobile_hamburger_left_v4'), 'orders.css must have mobile drawer version cache buster');
  assert.ok(html.includes('orders-core.js?v=20261007_mobile_drawer_sidebar_v1'), 'orders-core.js must have mobile drawer version cache buster');
  assert.ok(html.includes('orders-i18n.js?v=20261007_mobile_drawer_sidebar_v1'), 'orders-i18n.js must have mobile drawer version cache buster');
  assert.ok(html.includes('orders-settings.js?v=20261007_mobile_drawer_sidebar_v1'), 'orders-settings.js must have mobile drawer version cache buster');
});

test('Mobile Drawer: orders.css has desktop hidden rules and mobile off-canvas drawer styles', () => {
  const css = fs.readFileSync(path.resolve(__dirname, '../css/orders.css'), 'utf-8');

  // Desktop/Tablet baseline (hidden)
  assert.ok(css.includes('.mobile-nav-toggle-btn {\n  display: none !important;\n}'), 'mobile-nav-toggle-btn must be hidden by default');
  assert.ok(css.includes('.sidebar-backdrop {\n  display: none !important;\n}'), 'sidebar-backdrop must be hidden by default');
  assert.ok(css.includes('.sidebar-mobile-brand {\n  display: none !important;\n}'), 'sidebar-mobile-brand must be hidden by default');
  assert.ok(css.includes('.sidebar-mobile-footer {\n  display: none !important;\n}'), 'sidebar-mobile-footer must be hidden by default');

  // Mobile max-width: 680px styles
  assert.ok(css.includes('@media (max-width: 680px)'), 'Must define media query for max-width: 680px');
  assert.ok(css.includes('transform: translateX(-100%) !important;'), 'Sidebar must be off-canvas translateX(-100%) on mobile');
  assert.ok(css.includes('transform: translateX(0) !important;'), 'Expanded sidebar must slide in translateX(0) on mobile');
  assert.ok(css.includes('.sidebar-backdrop.active'), 'Must define active backdrop rule');
  assert.ok(css.includes('.mobile-nav-toggle-btn {\n    display: inline-flex !important;'), 'Must display mobile hamburger button on mobile');
  assert.ok(css.includes('border-radius: 0 !important;'), 'Mobile hamburger button must have no card border-radius');

  // Verify pure light theme for mobile sidebar drawer
  assert.ok(css.includes('/* Fixed Off-Canvas Sidebar (Pure Light Theme matching Original POS) */'), 'Sidebar must use pure light theme');
  assert.ok(css.includes('font-size: 15.5px !important;'), 'Sidebar label must use 15.5px balanced font size');

  // Verify standardized font sizes in menu item cards
  assert.ok(css.includes('.menu-item-row-card .menu-item-name-input {\n  width: 100% !important;\n  height: 36px !important;\n  font-size: 14.5px !important;'), 'Menu item name must be 14.5px');
  assert.ok(css.includes('.menu-item-price-wrapper .menu-item-price-input {\n  width: 56px !important;\n  border: none !important;\n  background: transparent !important;\n  font-size: 15px !important;'), 'Menu item price must be 15px');

  // Verify balanced braces across entire CSS file
  let depth = 0;
  for (let c of css) {
    if (c === '{') depth++;
    else if (c === '}') {
      depth--;
      assert.ok(depth >= 0, 'Excess closing brace in orders.css');
    }
  }
  assert.equal(depth, 0, 'Unclosed brace in orders.css');
});

test('Mobile Drawer: orders-core.js handles drawer state, backdrop, and auto-close', () => {
  // Simulate DOM and window
  const classListSet = (initial = []) => {
    const list = new Set(initial);
    return {
      add: (c) => list.add(c),
      remove: (c) => list.delete(c),
      toggle: (c, force) => {
        if (force !== undefined) {
          if (force) list.add(c); else list.delete(c);
          return force;
        }
        if (list.has(c)) { list.delete(c); return false; }
        list.add(c); return true;
      },
      contains: (c) => list.has(c)
    };
  };

  const sidebarEl = {
    id: 'app-sidebar',
    classList: classListSet(),
    style: {}
  };
  const backdropEl = {
    id: 'sidebar-backdrop',
    classList: classListSet(),
    style: {}
  };
  const toggleBtnEl = {
    id: 'sidebar-toggle-btn',
    querySelector: () => ({ innerHTML: '' }),
    setAttribute: () => {},
    title: ''
  };

  const dom = {
    'app-sidebar': sidebarEl,
    'sidebar-backdrop': backdropEl,
    'sidebar-toggle-btn': toggleBtnEl,
    'brand-title': { innerText: 'Blab POS' },
    'sidebar-mobile-title': { innerText: '' },
    'sidebar-mobile-logo': { textContent: '', innerHTML: '' }
  };

  const sandbox = {
    window: {
      innerWidth: 400,
      location: { hostname: 'localhost', search: '' },
      addEventListener: () => {}
    },
    URLSearchParams: URLSearchParams,
    setInterval: () => {},
    clearInterval: () => {},
    document: {
      getElementById: (id) => dom[id] || null,
      querySelectorAll: () => [],
      addEventListener: () => {}
    },
    localStorage: {
      _data: {},
      getItem: function(k) { return this._data[k] || null; },
      setItem: function(k, v) { this._data[k] = String(v); }
    },
    currentLang: 'vi'
  };

  vm.createContext(sandbox);

  const coreJs = fs.readFileSync(path.resolve(__dirname, '../js/orders-core.js'), 'utf-8');
  vm.runInContext(coreJs, sandbox);

  // 1. Initial state on mobile (400px width) must remain closed even if localStorage has expanded = 1
  sandbox.localStorage.setItem('pos_sidebar_expanded', '1');
  sandbox.initSidebarState();
  assert.equal(sidebarEl.classList.contains('expanded'), false, 'Mobile sidebar must initialize closed');
  assert.equal(backdropEl.classList.contains('active'), false, 'Mobile backdrop must initialize inactive');

  // 2. Open drawer via toggleSidebar(true)
  sandbox.toggleSidebar(true);
  assert.equal(sidebarEl.classList.contains('expanded'), true, 'Sidebar must be expanded when opened');
  assert.equal(backdropEl.classList.contains('active'), true, 'Backdrop must be active when sidebar is opened');

  // 3. Close drawer via toggleSidebar(false)
  sandbox.toggleSidebar(false);
  assert.equal(sidebarEl.classList.contains('expanded'), false, 'Sidebar must close');
  assert.equal(backdropEl.classList.contains('active'), false, 'Backdrop must deactivate');

  // 4. Test desktop behavior (> 680px)
  sandbox.window.innerWidth = 1024;
  sandbox.initSidebarState();
  assert.equal(sidebarEl.classList.contains('expanded'), true, 'Desktop sidebar must honor localStorage expanded state');
});
