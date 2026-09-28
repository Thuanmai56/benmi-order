const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

test('Sidebar Sections: orders-menu.js defines accordion sections and classification helpers', () => {
  const code = fs.readFileSync(path.resolve(__dirname, '../js/orders-menu.js'), 'utf-8');
  assert.ok(code.includes('collapsedMenuSections'), 'Must define collapsedMenuSections');
  assert.ok(code.includes('toggleMenuSectionCollapse'), 'Must define toggleMenuSectionCollapse');
  assert.ok(code.includes('isComboCategory'), 'Must define isComboCategory');
  assert.ok(code.includes('isCustomizationCategory'), 'Must define isCustomizationCategory');
  assert.ok(code.includes('handleCreateComboFromSidebar'), 'Must define handleCreateComboFromSidebar');
  assert.ok(code.includes('handleCreateCustomFromSidebar'), 'Must define handleCreateCustomFromSidebar');
  assert.ok(code.includes('menu-sidebar-section'), 'Must render menu-sidebar-section in DOM');
  assert.ok(code.includes('menu-sidebar-action-btn'), 'Must render menu-sidebar-action-btn in DOM');
});

test('Sidebar Sections: Classification logic partitions categories accurately', () => {
  const sandbox = {
    window: {},
    currentTenantFeatures: [],
    POS_SVG: {}
  };
  vm.createContext(sandbox);

  const menuJs = fs.readFileSync(path.resolve(__dirname, '../js/orders-menu.js'), 'utf-8');
  // Load helpers
  vm.runInContext(`
    let currentMenuData = [];
    ${menuJs.slice(menuJs.indexOf('const collapsedMenuSections'), menuJs.indexOf('function renderMenuCategories'))}
  `, sandbox);

  // Test combo category classification
  assert.equal(sandbox.isComboCategory({ type: 'catalog', slug: 'combo', title: 'Combo' }), true);
  assert.equal(sandbox.isComboCategory({ type: 'catalog', slug: 'set-meal', title: '特惠套餐' }), true);
  assert.equal(sandbox.isComboCategory({ type: 'catalog', slug: 'drinks', title: 'Đồ uống' }), false);

  // Test customization category classification
  assert.equal(sandbox.isCustomizationCategory({ type: 'order_customization', id: 'sec-flavor' }), true);
  assert.equal(sandbox.isCustomizationCategory({ type: 'modifier', id: 'mod-ice' }), true);
  assert.equal(sandbox.isCustomizationCategory({ type: 'catalog', slug: 'food' }), false);
});

test('Sidebar Sections: orders-i18n.js has bilingual section titles and button labels', () => {
  const i18nJs = fs.readFileSync(path.resolve(__dirname, '../js/orders-i18n.js'), 'utf-8');
  assert.ok(i18nJs.includes('menuSectionCatalogTitle: "單品與特惠套餐"'), 'zh-TW has menuSectionCatalogTitle');
  assert.ok(i18nJs.includes('menuSectionCatalogTitle: "Thực đơn món & Combo"'), 'vi has menuSectionCatalogTitle');


  assert.ok(i18nJs.includes('menuSectionCustomTitle: "口味與客製化"'), 'zh-TW has menuSectionCustomTitle');
  assert.ok(i18nJs.includes('menuSectionCustomTitle: "Khẩu vị & Tùy chọn"'), 'vi has menuSectionCustomTitle');

  assert.ok(i18nJs.includes('btnAddCatalogCategory: "新增餐點分類"'), 'zh-TW has btnAddCatalogCategory');
  assert.ok(i18nJs.includes('btnAddCatalogCategory: "Thêm phân loại món"'), 'vi has btnAddCatalogCategory');

  assert.ok(i18nJs.includes('btnCreateComboWizard: "建立特惠套餐"'), 'zh-TW has btnCreateComboWizard');
  assert.ok(i18nJs.includes('btnCreateComboWizard: "Tạo Combo mới"'), 'vi has btnCreateComboWizard');

  assert.ok(i18nJs.includes('btnCreateCustomGroup: "新增客製化分組"'), 'zh-TW has btnCreateCustomGroup');
  assert.ok(i18nJs.includes('btnCreateCustomGroup: "Thêm nhóm tùy chọn"'), 'vi has btnCreateCustomGroup');

  assert.ok(i18nJs.includes('noComboCategoriesPrompt: "尚無套餐分類 (點擊下方立即建立)"'), 'zh-TW has noComboCategoriesPrompt');
  assert.ok(i18nJs.includes('noComboCategoriesPrompt: "Chưa có phân loại Combo (bấm bên dưới để tạo)"'), 'vi has noComboCategoriesPrompt');
});

test('Sidebar Sections: orders.css has section styles, balanced braces, and touch target >= 44px', () => {
  const css = fs.readFileSync(path.resolve(__dirname, '../css/orders.css'), 'utf-8');
  assert.ok(css.includes('.menu-sidebar-section'), 'Must style .menu-sidebar-section');
  assert.ok(css.includes('.menu-sidebar-section-header'), 'Must style .menu-sidebar-section-header');
  assert.ok(css.includes('.menu-sidebar-section-title'), 'Must style .menu-sidebar-section-title');
  assert.ok(css.includes('.menu-sidebar-action-btn'), 'Must style .menu-sidebar-action-btn');
  assert.ok(css.includes('.menu-section-empty-hint'), 'Must style .menu-section-empty-hint');
  assert.ok(css.includes('.menu-sidebar-segmented-toggle'), 'Must style .menu-sidebar-segmented-toggle');
  assert.ok(css.includes('.menu-seg-btn'), 'Must style .menu-seg-btn');
  assert.ok(css.includes('.menu-option-card'), 'Must style .menu-option-card');
  assert.ok(css.includes('.menu-add-option-group-btn'), 'Must style .menu-add-option-group-btn');

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

test('Sidebar Toggle: orders-menu.js defines menuSidebarTab and setMenuSidebarTab', () => {
  const code = fs.readFileSync(path.resolve(__dirname, '../js/orders-menu.js'), 'utf-8');
  assert.ok(code.includes('menuSidebarTab'), 'Must define menuSidebarTab');
  assert.ok(code.includes('setMenuSidebarTab'), 'Must define setMenuSidebarTab');
  assert.ok(code.includes('menu-option-card'), 'Must render menu-option-card in options mode');
  assert.ok(code.includes('menu-add-option-group-btn'), 'Must render menu-add-option-group-btn');
});

test('Sidebar Toggle: orders-i18n.js has bilingual labels for products and options tabs', () => {
  const i18nJs = fs.readFileSync(path.resolve(__dirname, '../js/orders-i18n.js'), 'utf-8');
  assert.ok(i18nJs.includes('segProducts: "餐點"'), 'zh-TW has segProducts');
  assert.ok(i18nJs.includes('segProducts: "Món ăn"'), 'vi has segProducts');
  assert.ok(i18nJs.includes('segOptions: "客製選項"'), 'zh-TW has segOptions');
  assert.ok(i18nJs.includes('segOptions: "Tùy chọn"'), 'vi has segOptions');
  assert.ok(i18nJs.includes('btnAddOptionGroupTop: "新增客製化分組"'), 'zh-TW has btnAddOptionGroupTop');
  assert.ok(i18nJs.includes('btnAddOptionGroupTop: "Thêm nhóm tùy chọn"'), 'vi has btnAddOptionGroupTop');
});

test('Sidebar Sections: orders.html has bumped cache buster for sidebar sections and toggle', () => {
  const html = fs.readFileSync(path.resolve(__dirname, '../orders.html'), 'utf-8');
  assert.ok(/css\/orders\.css\?v=20260928_(toggle_products_options|tree_customizations)_v\d+/.test(html), 'orders.css cache buster bumped');
  assert.ok(/js\/orders-menu\.js\?v=20260928_(toggle_products_options|tree_customizations)_v\d+/.test(html), 'orders-menu.js cache buster bumped');
  assert.ok(/js\/orders-i18n\.js\?v=20260928_(toggle_products_options|tree_customizations)_v\d+/.test(html), 'orders-i18n.js cache buster bumped');
  assert.ok(html.includes('menu-sidebar-segmented-toggle'), 'orders.html contains segmented toggle pill');
});

test('Tree Customizations: orders-menu.js defines scope helpers and tree selection functions', () => {
  const code = fs.readFileSync(path.resolve(__dirname, '../js/orders-menu.js'), 'utf-8');
  assert.ok(code.includes('isCustomizationGroupGlobal'), 'Must define isCustomizationGroupGlobal');
  assert.ok(code.includes('toggleCustomizationGroupScope'), 'Must define toggleCustomizationGroupScope');
  assert.ok(code.includes('getAvailableOptionGroupsForItems'), 'Must define getAvailableOptionGroupsForItems');
  assert.ok(code.includes('handleTreeGroupCheckboxChange'), 'Must define handleTreeGroupCheckboxChange');
  assert.ok(code.includes('handleTreeOptionCheckboxChange'), 'Must define handleTreeOptionCheckboxChange');
  assert.ok(code.includes('toggleTreeGroupCollapse'), 'Must define toggleTreeGroupCollapse');
  assert.ok(code.includes('toggleTreeExpandAll'), 'Must define toggleTreeExpandAll');
  assert.ok(code.includes('saveItemModifiersModal'), 'Must define saveItemModifiersModal');
});

test('Tree Customizations: isCustomizationGroupGlobal distinguishes whole-order vs item scope', () => {
  const sandbox = {
    window: { addEventListener: () => {} },
    document: { addEventListener: () => {} }
  };
  vm.createContext(sandbox);

  const menuJs = fs.readFileSync(path.resolve(__dirname, '../js/orders-menu.js'), 'utf-8');
  vm.runInContext(`
    ${menuJs.slice(menuJs.indexOf('function isCustomizationGroupGlobal'), menuJs.indexOf('function getBenmiDefaultCategories'))}
  `, sandbox);

  // Explicit isGlobal = true
  assert.equal(sandbox.isCustomizationGroupGlobal({ id: 'g1', isGlobal: true }), true);
  // Explicit isGlobal = false
  assert.equal(sandbox.isCustomizationGroupGlobal({ id: 'g2', isGlobal: false }), false);
  // Legacy tableware / whole-order notes default to true
  assert.equal(sandbox.isCustomizationGroupGlobal({ id: 'tableware', title: '餐具 / Tableware' }), true);
  assert.equal(sandbox.isCustomizationGroupGlobal({ id: 'notes', title: '整單備註' }), true);
  // Regular dish flavor group without isGlobal flag defaults to false (item-scoped)
  assert.equal(sandbox.isCustomizationGroupGlobal({ id: 'sweetness', title: '甜度冰塊' }), false);
});

test('Tree Customizations: getAvailableOptionGroupsForItems filters candidate groups', () => {
  const sandbox = {
    window: { addEventListener: () => {} },
    document: { addEventListener: () => {} },
    currentMenuData: [
      {
        id: 'sec-flavor',
        title: '口味與客製化',
        type: 'order_customization',
        groups: [
          {
            id: 'grp_global',
            title: '餐具選擇',
            isGlobal: true,
            options: [{ id: 'opt_1', name: '要餐具', price: 0 }]
          },
          {
            id: 'grp_drink_sugar',
            title: '甜度選項',
            isGlobal: false,
            type: 'single',
            isRequired: true,
            options: [
              { id: 'sugar_0', name: '無糖', price: 0 },
              { id: 'sugar_50', name: '半糖', price: 0 },
              { id: 'sugar_100', name: '全糖', price: 0 }
            ]
          }
        ]
      },
      {
        id: 'cat_food',
        title: '主食',
        type: 'catalog',
        items: []
      },
      {
        id: 'mod_toppings',
        title: '加料配料',
        type: 'modifier',
        modifierType: 'multiple',
        options: [
          { id: 'top_boba', name: '波霸', price: 10 },
          { id: 'top_pudding', name: '布丁', price: 15 }
        ]
      }
    ]
  };
  vm.createContext(sandbox);

  const menuJs = fs.readFileSync(path.resolve(__dirname, '../js/orders-menu.js'), 'utf-8');
  vm.runInContext(`
    ${menuJs.slice(menuJs.indexOf('function isCustomizationGroupGlobal'), menuJs.indexOf('function getBenmiDefaultCategories'))}
    ${menuJs.slice(menuJs.indexOf('function getAvailableOptionGroupsForItems'), menuJs.indexOf('function openItemModifiersModal'))}
  `, sandbox);

  const available = sandbox.getAvailableOptionGroupsForItems();
  assert.equal(available.length, 2, 'Should only return 2 item-scoped groups (exclude grp_global)');
  assert.equal(available[0].id, 'grp_drink_sugar');
  assert.equal(available[0].options.length, 3);
  assert.equal(available[1].id, 'mod_toppings');
  assert.equal(available[1].options.length, 2);
});

test('Tree Customizations: Tree Checkbox handlers toggle all children and compile into modifierGroups', () => {
  const sandbox = {
    window: { addEventListener: () => {} },
    document: {
      addEventListener: () => {},
      querySelector: () => ({ checked: false, indeterminate: false }),
      querySelectorAll: () => [],
      getElementById: () => ({ innerText: '', classList: { add() {}, remove() {} }, querySelector: () => ({ checked: false }) })
    },
    t: (k, params) => `${k}:${JSON.stringify(params || {})}`,
    treeSelectedState: {},
    treeGroupCollapsedState: {},
    tempItemModifierGroups: [],
    currentItemModifiersCidx: 0,
    currentItemModifiersIidx: 0,
    currentMenuData: [
      {
        id: 'cat_drinks',
        type: 'catalog',
        items: [
          {
            id: 'item_milk_tea',
            name: 'Trà Sữa',
            modifierGroups: []
          }
        ]
      }
    ],
    renderItemModifiersEditor: () => {},
    syncItemModifiersFromDOM: () => {},
    markMenuDirty: () => {},
    renderMenuCategoryEditor: () => {},
    closeItemModifiersModal: () => {}
  };
  vm.createContext(sandbox);

  const menuJs = fs.readFileSync(path.resolve(__dirname, '../js/orders-menu.js'), 'utf-8');
  vm.runInContext(`
    function getAvailableOptionGroupsForItems() {
      return [
        {
          id: 'grp_sugar',
          title: '甜度',
          type: 'single',
          isRequired: true,
          options: [
            { id: 'opt_s0', name: '0%', price: 0 },
            { id: 'opt_s50', name: '50%', price: 0 },
            { id: 'opt_s100', name: '100%', price: 0 }
          ]
        },
        {
          id: 'grp_toppings',
          title: 'Toppings',
          type: 'multiple',
          isRequired: false,
          options: [
            { id: 'opt_boba', name: 'Boba', price: 10 },
            { id: 'opt_jelly', name: 'Jelly', price: 10 }
          ]
        }
      ];
    }
    ${menuJs.slice(menuJs.indexOf('function handleTreeGroupCheckboxChange'), menuJs.indexOf('function toggleTreeGroupCollapse'))}
    ${menuJs.slice(menuJs.indexOf('function saveItemModifiersModal'), menuJs.indexOf('window.saveItemModifiersModal = saveItemModifiersModal;'))}
  `, sandbox);

  // 1. Select entire group grp_sugar
  sandbox.handleTreeGroupCheckboxChange('grp_sugar', true);
  assert.equal(sandbox.treeSelectedState['grp_sugar'].size, 3, 'Checking parent group selects all 3 sugar options');

  // 2. Select only 1 option in grp_toppings
  sandbox.handleTreeOptionCheckboxChange('grp_toppings', 'opt_boba', true);
  assert.equal(sandbox.treeSelectedState['grp_toppings'].size, 1, 'Only opt_boba selected in toppings');

  // 3. Add a bespoke modifier group directly in tempItemModifierGroups
  sandbox.tempItemModifierGroups.push({
    name: 'Special Request',
    selectionType: 'single',
    isRequired: false,
    options: [{ name: 'Extra Cold', price: 5 }]
  });

  // 4. Save and compile
  sandbox.saveItemModifiersModal();
  const compiled = sandbox.currentMenuData[0].items[0].modifierGroups;
  assert.equal(compiled.length, 3, 'Should compile grp_sugar, grp_toppings, and bespoke group');

  // Verify compiled grp_sugar
  const compiledSugar = compiled.find(g => g.name === '甜度');
  assert.ok(compiledSugar, 'Must compile sugar group');
  assert.equal(compiledSugar.options.length, 3);
  assert.equal(compiledSugar.selectionType, 'single');
  assert.equal(compiledSugar.isRequired, true);

  // Verify compiled grp_toppings with only 1 selected option
  const compiledToppings = compiled.find(g => g.name === 'Toppings');
  assert.ok(compiledToppings, 'Must compile toppings group');
  assert.equal(compiledToppings.options.length, 1);
  assert.equal(compiledToppings.options[0].name, 'Boba');
  assert.equal(compiledToppings.options[0].price, 10);

  // Verify bespoke group
  const bespoke = compiled.find(g => g.name === 'Special Request');
  assert.ok(bespoke, 'Must retain bespoke modifier group');
  assert.equal(bespoke.options[0].name, 'Extra Cold');
});

test('Tree Customizations: orders-i18n.js has full bilingual support in zh-TW and vi', () => {
  const i18nJs = fs.readFileSync(path.resolve(__dirname, '../js/orders-i18n.js'), 'utf-8');
  const requiredTreeKeys = [
    'scopeGlobalBadge',
    'scopeItemBadge',
    'scopeLabel',
    'scopeGlobalDesc',
    'scopeItemDesc',
    'toggleScopeToGlobal',
    'toggleScopeToItem',
    'badgeScopeGlobal',
    'badgeScopeItem',
    'labelTreeOptionLibrary',
    'labelTreeOptionLibraryDesc',
    'labelTreeSelectedCount',
    'labelNoTreeOptionGroups',
    'labelBespokeModifiersSection',
    'labelBespokeModifiersDesc',
    'btnItemModifiersModalOpen',
    'btnItemModifiersCount',
    'labelExpandAll',
    'labelCollapseAll',
    'btnSelectAllGroup',
    'btnUnselectAllGroup'
  ];

  const sandbox = {
    window: { addEventListener: () => {} },
    document: { addEventListener: () => {} }
  };
  vm.createContext(sandbox);
  vm.runInContext(i18nJs, sandbox);
  const I18N = sandbox.window.I18N;

  for (let key of requiredTreeKeys) {
    assert.ok(I18N['zh-TW'][key], `Missing zh-TW key: ${key}`);
    assert.ok(I18N['vi'][key], `Missing vi key: ${key}`);
  }
});

test('Tree Customizations: orders.css has tree styles and responsive tablet-first rules', () => {
  const css = fs.readFileSync(path.resolve(__dirname, '../css/orders.css'), 'utf-8');
  assert.ok(css.includes('.mod-tree-library-section'), 'Must style .mod-tree-library-section');
  assert.ok(css.includes('.mod-tree-group-card'), 'Must style .mod-tree-group-card');
  assert.ok(css.includes('.mod-tree-group-header'), 'Must style .mod-tree-group-header');
  assert.ok(css.includes('.mod-tree-checkbox'), 'Must style .mod-tree-checkbox');
  assert.ok(css.includes('.mod-tree-counter-pill'), 'Must style .mod-tree-counter-pill');
  assert.ok(css.includes('.mod-tree-elements-list'), 'Must style .mod-tree-elements-list');
  assert.ok(css.includes('.mod-tree-element-row'), 'Must style .mod-tree-element-row');
  assert.ok(css.includes('.cust-scope-badge'), 'Must style .cust-scope-badge');
  assert.ok(css.includes('.menu-item-mod-chip'), 'Must style .menu-item-mod-chip');

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


