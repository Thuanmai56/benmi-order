const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function createDOMEnvironment() {
  const domElements = {};
  function createElement(id, tagName = 'div') {
    return {
      id,
      tagName,
      value: '',
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
      removeAttribute(k) { delete this.attributes[k]; },
      appendChild(child) { (this.children = this.children || []).push(child); return child; },
      children: [],
      innerHTML: '',
      innerText: '',
      textContent: ''
    };
  }

  // Pre-populate common elements
  const commonIds = [
    'btn-menu-save', 'i18n-btn-menu-save',
    'itemDetailModal', 'item-detail-name', 'item-detail-price', 'item-detail-badge', 'item-detail-recommended',
    'itemModifiersModal', 'item-modifiers-modal-title', 'item-modifiers-groups-container',
    'modal-bundle-editor', 'bundle-modal-item-name', 'bundle-modal-item-price', 'btn-bundle-remove-config', 'bundle-danger-zone-card',
    'menu-editor-body', 'menu-categories', 'tab-menu'
  ];
  commonIds.forEach(id => {
    domElements[id] = createElement(id);
  });

  const queryElements = [];

  const documentMock = {
    getElementById(id) {
      if (!domElements[id]) domElements[id] = createElement(id);
      return domElements[id];
    },
    createElement(tag) {
      return createElement(`mock-${Math.random()}`, tag);
    },
    querySelectorAll(selector) {
      if (selector.includes('#menu-editor-body input')) {
        return queryElements;
      }
      return [];
    },
    addEventListener() {}
  };

  const sandbox = {
    document: documentMock,
    window: null,
    alert: () => {},
    confirm: () => true,
    addEventListener: () => {},
    removeEventListener: () => {},
    getTenantIdFromUrl: () => 'test_tenant',
    WORKER_BASE: 'https://test.workers.dev',
    fetch: () => Promise.resolve({ ok: true, json: () => Promise.resolve([]) }),
    escapeHtml: s => String(s || ''),
    t: k => k,
    renderMenuCategoryEditor: () => {},
    renderMenuCategories: () => {},
    isMenuLoadedCompletely: true,
    currentLang: 'vi',
    POS_SVG: {}
  };
  sandbox.window = sandbox;
  vm.createContext(sandbox);

  const menuJs = fs.readFileSync(path.resolve(__dirname, '../js/orders-menu.js'), 'utf-8');
  vm.runInContext(menuJs, sandbox);

  const getIsMenuDirty = () => vm.runInContext('isMenuDirty', sandbox);
  const setCurrentMenuData = (data) => {
    sandbox._injectData = data;
    vm.runInContext('currentMenuData = _injectData; delete _injectData;', sandbox);
  };
  const getCurrentMenuData = () => vm.runInContext('currentMenuData', sandbox);
  const getTempItemModifierGroups = () => vm.runInContext('tempItemModifierGroups', sandbox);
  const setIsMenuLoadedCompletely = (val) => {
    vm.runInContext(`isMenuLoadedCompletely = ${Boolean(val)};`, sandbox);
  };

  return {
    sandbox,
    domElements,
    queryElements,
    createElement,
    getIsMenuDirty,
    setCurrentMenuData,
    getCurrentMenuData,
    getTempItemModifierGroups,
    setIsMenuLoadedCompletely
  };
}

test('canonicalMenuSnapshot normalizes whitespace, empty modifier lists, and object key order', () => {
  const { sandbox } = createDOMEnvironment();
  const canonical = sandbox.canonicalMenuSnapshot;

  const dataA = [
    {
      id: 'cat_1',
      title: '  Bánh Mì  ',
      type: 'catalog',
      items: [
        {
          name: '  Bánh Mì Thịt  ',
          price: 50,
          badgeText: '',
          modifierGroups: [],
          bundleRule: { groups: [] },
          _internalState: 'discard-me'
        }
      ]
    }
  ];

  const dataB = [
    {
      title: 'Bánh Mì',
      id: 'cat_1',
      type: 'catalog',
      items: [
        {
          price: 50,
          name: 'Bánh Mì Thịt',
          badgeText: null,
          modifierGroups: null,
          bundleRule: null
        }
      ]
    }
  ];

  assert.equal(canonical(dataA), canonical(dataB), 'Snapshots must be identical regardless of whitespace, key order, or empty arrays/nulls');
});

test('Opening Item Detail and closing/saving without changes does NOT mark menu dirty', () => {
  const { sandbox, domElements, setCurrentMenuData, getIsMenuDirty, setIsMenuLoadedCompletely } = createDOMEnvironment();

  setCurrentMenuData([
    {
      id: 'cat_1',
      title: 'Cơm Tấm',
      type: 'catalog',
      items: [
        { id: 'item_1', name: 'Sườn Bì', price: 65, badgeText: '', isRecommended: false, modifierGroups: [] }
      ]
    }
  ]);
  setIsMenuLoadedCompletely(true);
  sandbox.clearMenuDirty();
  assert.equal(getIsMenuDirty(), false, 'Menu starts in saved clean state');

  // Open item detail modal
  sandbox.openItemDetailModal(0, 0);
  assert.equal(domElements.itemDetailModal.style.display, 'flex');

  // Close modal without any changes
  sandbox.closeItemDetailModal();
  assert.equal(domElements.itemDetailModal.style.display, 'none');
  assert.equal(getIsMenuDirty(), false, 'Closing without edit must keep isMenuDirty false');

  // Open item detail modal again and save without modifications
  sandbox.openItemDetailModal(0, 0);
  domElements['item-detail-name'].value = 'Sườn Bì';
  domElements['item-detail-price'].value = '65';
  domElements['item-detail-badge'].value = '';
  domElements['item-detail-recommended'].checked = false;

  sandbox.saveItemDetailModal();
  assert.equal(getIsMenuDirty(), false, 'Saving unchanged values must keep isMenuDirty false');
});

test('Item Detail Modal rolls back draft changes if user cancels / presses Escape / closes modal', () => {
  const { sandbox, domElements, setCurrentMenuData, getCurrentMenuData, getIsMenuDirty, setIsMenuLoadedCompletely } = createDOMEnvironment();

  setCurrentMenuData([
    {
      id: 'cat_1',
      title: 'Cơm Tấm',
      type: 'catalog',
      items: [
        { id: 'item_1', name: 'Sườn Bì', price: 65, badgeText: 'Hot', isRecommended: true, modifierGroups: [] }
      ]
    }
  ]);
  setIsMenuLoadedCompletely(true);
  sandbox.clearMenuDirty();

  sandbox.openItemDetailModal(0, 0);
  // User changes input fields and autoCommit runs
  domElements['item-detail-name'].value = 'Sườn Bì Chả Trứng Đặc Biệt';
  domElements['item-detail-price'].value = '999';
  domElements['item-detail-badge'].value = 'New';
  sandbox.autoCommitItemDetailFields();

  assert.equal(getIsMenuDirty(), true, 'Dirty detected while drafting changes');

  // User decides to cancel
  sandbox.closeItemDetailModal();

  // Assert rollback
  const restoredItem = getCurrentMenuData()[0].items[0];
  assert.equal(restoredItem.name, 'Sườn Bì', 'Item name must be restored to original');
  assert.equal(restoredItem.price, 65, 'Item price must be restored to original');
  assert.equal(restoredItem.badgeText, 'Hot', 'Badge must be restored');
  assert.equal(getIsMenuDirty(), false, 'After cancel, isMenuDirty must revert to false');
});

test('Item Modifiers Modal rolls back draft changes on cancel', () => {
  const { sandbox, setCurrentMenuData, getCurrentMenuData, getIsMenuDirty, getTempItemModifierGroups, setIsMenuLoadedCompletely } = createDOMEnvironment();

  setCurrentMenuData([
    {
      id: 'cat_1',
      title: 'Đồ Uống',
      type: 'catalog',
      items: [
        { id: 'item_1', name: 'Trà Sữa', price: 40, modifierGroups: [{ group_id: 'sugar', name: 'Đường', options: [] }] }
      ]
    }
  ]);
  setIsMenuLoadedCompletely(true);
  sandbox.clearMenuDirty();

  sandbox.openItemModifiersModal(0, 0);
  // Modify draft modifier groups
  getTempItemModifierGroups().push({ group_id: 'ice', name: 'Đá', options: [] });

  // User clicks close/cancel
  sandbox.closeItemModifiersModal();

  assert.equal(getCurrentMenuData()[0].items[0].modifierGroups.length, 1, 'Original modifiers intact');
  assert.equal(getIsMenuDirty(), false, 'isMenuDirty remains false');
});

test('Real-time inline DOM editing toggles isMenuDirty on change and dims back on revert', () => {
  const { sandbox, queryElements, createElement, setCurrentMenuData, getIsMenuDirty, setIsMenuLoadedCompletely } = createDOMEnvironment();

  setCurrentMenuData([
    {
      id: 'cat_1',
      title: 'Món Chính',
      type: 'catalog',
      items: [
        { id: 'item_1', name: 'Phở Bò', price: 60, badgeText: '', modifierGroups: [] }
      ]
    }
  ]);
  setIsMenuLoadedCompletely(true);
  sandbox.clearMenuDirty();

  // Mock DOM input element for price
  const priceInput = createElement('price-input-0-0', 'input');
  priceInput.setAttribute('data-cidx', '0');
  priceInput.setAttribute('data-iidx', '0');
  priceInput.value = '60';
  queryElements.push(priceInput);

  // User edits price to 75
  priceInput.value = '75';
  sandbox.markMenuDirty();
  assert.equal(getIsMenuDirty(), true, 'Changing price turns isMenuDirty to true');

  // User reverts price back to 60
  priceInput.value = '60';
  sandbox.markMenuDirty();
  assert.equal(getIsMenuDirty(), false, 'Reverting price back to 60 automatically turns isMenuDirty to false');
});

test('confirmLeaveMenu returns true without prompting confirm when no changes made', () => {
  const { sandbox, setCurrentMenuData, setIsMenuLoadedCompletely } = createDOMEnvironment();

  setCurrentMenuData([
    {
      id: 'cat_1',
      title: 'Món Chính',
      type: 'catalog',
      items: [
        { id: 'item_1', name: 'Phở Bò', price: 60, badgeText: '', modifierGroups: [] }
      ]
    }
  ]);
  setIsMenuLoadedCompletely(true);
  sandbox.clearMenuDirty();

  let confirmCalled = false;
  sandbox.confirm = () => {
    confirmCalled = true;
    return false;
  };

  const canLeave = sandbox.confirmLeaveMenu();
  assert.equal(canLeave, true, 'Must allow leaving without prompt');
  assert.equal(confirmCalled, false, 'confirm() dialog must NOT be triggered');
});
