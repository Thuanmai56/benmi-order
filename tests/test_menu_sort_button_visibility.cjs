const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

test('Menu Sidebar Tab: display order button is only visible on products tab', () => {
  const domElements = {};
  function createElement(id, tagName = 'div') {
    return {
      id,
      tagName,
      style: {},
      classList: {
        _classes: new Set(),
        add(c) { this._classes.add(c); },
        remove(c) { this._classes.delete(c); },
        toggle(c, force) {
          if (force === undefined) {
            if (this._classes.has(c)) this._classes.delete(c);
            else this._classes.add(c);
          } else if (force) {
            this._classes.add(c);
          } else {
            this._classes.delete(c);
          }
          return this._classes.has(c);
        },
        contains(c) { return this._classes.has(c); }
      },
      attributes: {},
      addEventListener() {},
      removeEventListener() {},
      setAttribute(k, v) { this.attributes[k] = String(v); },
      getAttribute(k) { return this.attributes[k]; },
      appendChild(child) { (this.children = this.children || []).push(child); return child; },
      children: [],
      innerHTML: '',
      innerText: '',
      textContent: ''
    };
  }

  // Setup DOM elements expected by setMenuSidebarTab & renderMenuCategories
  domElements['btn-seg-products'] = createElement('btn-seg-products', 'button');
  domElements['btn-seg-options'] = createElement('btn-seg-options', 'button');
  domElements['menu-sidebar-products-actions'] = createElement('menu-sidebar-products-actions', 'div');
  domElements['btn-menu-manage-cats'] = createElement('btn-menu-manage-cats', 'button');
  domElements['menu-categories'] = createElement('menu-categories', 'div');
  domElements['menu-editor-title'] = createElement('menu-editor-title', 'div');
  domElements['i18n-menu-edit-sub'] = createElement('i18n-menu-edit-sub', 'div');
  domElements['btn-category-rename'] = createElement('btn-category-rename', 'button');
  domElements['btn-category-delete'] = createElement('btn-category-delete', 'button');
  domElements['btn-menu-create-unified'] = createElement('btn-menu-create-unified', 'button');
  domElements['btn-menu-add-cat-top'] = createElement('btn-menu-add-cat-top', 'button');
  domElements['btn-menu-manage-close'] = createElement('btn-menu-manage-close', 'button');
  domElements['menu-editor-body'] = createElement('menu-editor-body', 'div');

  const documentMock = {
    getElementById(id) {
      if (!domElements[id]) domElements[id] = createElement(id);
      return domElements[id];
    },
    createElement(tag) {
      return createElement(`mock-${Math.random()}`, tag);
    },
    querySelectorAll() { return []; },
    addEventListener() {}
  };

  const sandbox = {
    addEventListener() {},
    document: documentMock,
    confirmLeaveMenu: () => true,
    syncMenuDataFromDOM: () => {},
    isMenuDirty: false,
    currentMenuData: [
      { id: 'cat-1', title: 'Cơm tấm', type: 'catalog', sortOrder: 1, items: [] },
      { id: 'sec-flavor', title: 'Tùy chọn', type: 'order_customization', sortOrder: 2, groups: [] }
    ],
    activeCategoryIndex: 0,
    renderMenuCategoryEditor: () => {},
    escapeHtml: (s) => String(s || ''),
    t: (k) => k,
    isMenuLoadedCompletely: true,
    POS_SVG: {}
  };
  sandbox.window = sandbox;
  vm.createContext(sandbox);

  const menuJs = fs.readFileSync(path.resolve(__dirname, '../js/orders-menu.js'), 'utf-8');
  vm.runInContext(menuJs, sandbox);
  vm.runInContext(`
    isMenuLoadedCompletely = true;
    currentMenuData = [
      { id: 'cat-1', title: 'Cơm tấm', type: 'catalog', sortOrder: 1, items: [] },
      { id: 'sec-flavor', title: 'Tùy chọn', type: 'order_customization', sortOrder: 2, groups: [] }
    ];
  `, sandbox);

  // 1. Initial / products tab
  sandbox.setMenuSidebarTab('products');
  assert.equal(domElements['menu-sidebar-products-actions'].style.display, 'block', 'Products actions must be visible on products tab');
  assert.equal(domElements['btn-seg-products'].classList.contains('active'), true);
  assert.equal(domElements['btn-seg-options'].classList.contains('active'), false);

  // Re-run renderMenuCategories on products tab
  sandbox.renderMenuCategories();
  assert.equal(domElements['menu-sidebar-products-actions'].style.display, 'block', 'Products actions must stay visible after renderMenuCategories on products tab');

  // 2. Switch to options tab
  sandbox.setMenuSidebarTab('options');
  assert.equal(domElements['menu-sidebar-products-actions'].style.display, 'none', 'Products actions must be HIDDEN on options tab');
  assert.equal(domElements['btn-seg-products'].classList.contains('active'), false);
  assert.equal(domElements['btn-seg-options'].classList.contains('active'), true);

  // Re-run renderMenuCategories on options tab
  sandbox.renderMenuCategories();
  assert.equal(domElements['menu-sidebar-products-actions'].style.display, 'none', 'Products actions must STAY HIDDEN after renderMenuCategories on options tab');

  // 3. Switch back to products tab
  sandbox.setMenuSidebarTab('products');
  assert.equal(domElements['menu-sidebar-products-actions'].style.display, 'block', 'Products actions must reappear when switching back to products tab');

  // 4. Opening category manager aligns to products tab
  sandbox.openCategoriesManager();
  assert.equal(domElements['menu-sidebar-products-actions'].style.display, 'block', 'Products actions must be visible in category manager');
  assert.equal(domElements['btn-menu-manage-cats'].classList.contains('active'), true, 'Manage cats button has active class when category manager is open');

  // 5. Closing category manager
  sandbox.closeCategoriesManager();
  assert.equal(domElements['btn-menu-manage-cats'].classList.contains('active'), false, 'Manage cats button removes active class when closed');
});

test('Cache buster bumped in orders.html for orders.css and orders-menu.js', () => {
  const html = fs.readFileSync(path.resolve(__dirname, '../orders.html'), 'utf-8');
  assert.ok(/css\/orders\.css\?v=20261004_sort_order_products_tab_v1/.test(html), 'orders.css cache buster bumped');
  assert.ok(/js\/orders-menu\.js\?v=20261004_sort_order_products_tab_v1/.test(html), 'orders-menu.js cache buster bumped');
});
