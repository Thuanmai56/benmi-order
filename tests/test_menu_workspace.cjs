const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

function setup() {
  const elements = {
    'menu-item-search': { value: '' },
    'menu-stock-filter': { value: 'all' },
    'menu-filter-empty': {},
    'btn-menu-save': { classList: { toggle() {} } },
    'btn-menu-save-text': {}
  };
  let rows = [];
  const context = {
    window: { addEventListener() {} },
    document: {
      addEventListener() {},
      getElementById: id => elements[id] || null,
      querySelector: () => null,
      querySelectorAll: selector => {
        if (selector === '#menu-editor-body .menu-catalog-row') return rows;
        if (selector === '#menu-editor-body input[data-name-cidx]') return rows.map(row => row.name);
        if (selector === '#menu-editor-body input[data-cidx]') return rows.map(row => row.price);
        return [];
      }
    },
    t: key => key
  };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../js/orders-menu.js'), 'utf8'), context);
  vm.runInContext(`currentMenuData = [{id:'cat',type:'catalog',items:[
    {id:'a',name:'Bánh mì đặc biệt',price:129,isOos:false,badgeText:'Bán chạy'},
    {id:'b',name:'Bánh mì chả lụa',price:125,isOos:true}
  ]}]; activeCategoryIndex=0; isMenuLoadedCompletely=true; clearMenuDirty();`, context);
  const data = () => vm.runInContext('currentMenuData', context);
  const render = () => {
    rows = data()[0].items.map((item, index) => {
      const input = (value, kind) => ({
        value: String(value),
        getAttribute: key => key === (kind === 'name' ? 'data-name-cidx' : 'data-cidx') ? '0' : String(index)
      });
      const row = {
        name: input(item.name, 'name'), price: input(item.price, 'price'),
        getAttribute: () => String(index), querySelector: () => row.name
      };
      return row;
    });
  };
  const renderMenuCategoryEditor = context.renderMenuCategoryEditor;
  context.renderMenuCategoryEditor = render;
  render();
  return { context, elements, rows: () => rows, data, renderMenuCategoryEditor };
}

test('search supports Vietnamese accents, đ, Traditional Chinese, badges and stock filters', () => {
  const { context } = setup();
  assert.equal(context.menuItemMatchesFilters({name:'Bánh mì đặc biệt'}, 'DAC BIET', 'all'), true);
  assert.equal(context.menuItemMatchesFilters({name:'烤肉麵包'}, '烤肉', 'all'), true);
  assert.equal(context.menuItemMatchesFilters({badgeText:'Bán chạy'}, 'ban chay', 'all'), true);
  assert.equal(context.menuItemMatchesFilters({isOos:true}, '', 'available'), false);
  assert.equal(context.menuItemMatchesFilters({isOos:true}, '', 'unavailable'), true);
});

test('filtering preserves hidden edits and restores all items without dirtying the menu', () => {
  const app = setup();
  app.rows()[0].name.value = 'Bánh mì đặc biệt mới';
  app.rows()[0].price.value = '149';
  app.context.markMenuDirty();
  app.elements['menu-item-search'].value = 'cha lua';
  app.context.applyMenuItemFilters();
  assert.equal(app.rows()[0].hidden, true);
  assert.equal(app.rows()[1].hidden, false);
  assert.equal(app.rows()[0].draggable, false);
  assert.equal(app.data()[0].items[0].price, 149);
  app.elements['menu-stock-filter'].value = 'available';
  app.context.applyMenuItemFilters();
  assert.equal(app.elements['menu-filter-empty'].hidden, false);
  app.context.clearMenuItemFilters();
  assert.equal(app.rows()[0].hidden, false);
  assert.equal(app.rows()[0].draggable, true);
  assert.equal(app.rows()[0].name.value, 'Bánh mì đặc biệt mới');
  assert.equal(app.elements['btn-menu-save'].disabled, false);
  const clean = setup();
  clean.elements['menu-stock-filter'].value = 'unavailable';
  clean.context.applyMenuItemFilters();
  assert.equal(vm.runInContext('checkMenuDirty()', clean.context), false);
});

test('touch reordering keeps item identity, inline name and price together and respects boundaries', () => {
  const app = setup();
  app.rows()[0].name.value = 'Tên mới';
  app.rows()[0].price.value = '149';
  app.context.moveMenuItem(0, 0, 1);
  assert.equal(app.data()[0].items[1].id, 'a');
  assert.equal(app.data()[0].items[1].name, 'Tên mới');
  assert.equal(app.data()[0].items[1].price, 149);
  assert.equal(app.data()[0].items[0].name, 'Bánh mì chả lụa');
  assert.equal(app.rows()[1].name.value, 'Tên mới');
  assert.equal(app.elements['btn-menu-save'].disabled, false);
  app.context.moveMenuItem(0, 0, -1);
  assert.equal(app.data()[0].items[0].id, 'b');
});

test('an options tab with no groups shows an empty state instead of stale product rows', () => {
  const app = setup();
  app.elements['menu-editor-body'] = { classList: { remove() {}, toggle() {} }, textContent: 'Old products' };
  app.elements['menu-editor-title'] = {};
  app.context.renderMenuCategories = () => {};
  app.context.renderMenuCategoryEditor = app.renderMenuCategoryEditor;
  app.context.setMenuSidebarTab('options');
  assert.equal(vm.runInContext('activeCategoryIndex', app.context), -1);
  assert.equal(app.elements['menu-editor-body'].textContent, 'optionSectionEmpty');
});

test('switching menu modes hides the empty toolbar and restores product header controls', () => {
  const app = setup();
  const classes = () => {
    const values = new Set();
    return {
      toggle(name, on) { if (on) values.add(name); else values.delete(name); },
      contains(name) { return values.has(name); }
    };
  };
  app.elements['menu-catalog-tools'] = {};
  app.elements['menu-workspace-toolbar'] = {};
  app.elements['menu-editor-body'] = { classList: classes() };
  app.elements['menu-editor-panel'] = { classList: classes() };
  app.elements['menu-categories'] = { classList: classes() };
  app.elements['menu-editor-help'] = {};
  app.elements['btn-option-group-edit'] = { hidden: false };
  app.elements['btn-option-add'] = { hidden: false };
  app.context.window.UnifiedMenu = { enabled: true };
  vm.runInContext("menuSidebarTab = 'options'; updateMenuWorkspace();", app.context);
  assert.equal(app.elements['menu-workspace-toolbar'].hidden, true);
  assert.equal(app.elements['menu-editor-body'].classList.contains('is-option-workspace'), true);
  assert.equal(app.elements['menu-editor-help'].hidden, true);
  vm.runInContext("menuSidebarTab = 'products'; updateMenuWorkspace();", app.context);
  assert.equal(app.elements['menu-workspace-toolbar'].hidden, false);
  assert.equal(app.elements['menu-editor-body'].classList.contains('is-option-workspace'), false);
  assert.equal(app.elements['menu-categories'].classList.contains('is-option-groups'), false);
  assert.equal(app.elements['menu-editor-help'].hidden, false);
  assert.equal(app.elements['btn-option-add'].hidden, true);
  assert.equal(app.elements['btn-option-group-edit'].hidden, true);
  vm.runInContext("isCategoryManagerOpen = true; updateMenuWorkspace();", app.context);
  assert.equal(app.elements['menu-workspace-toolbar'].hidden, true);
});
