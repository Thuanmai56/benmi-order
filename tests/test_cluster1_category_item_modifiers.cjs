/**
 * Test Suite for Cluster 1: Category & Item Modifiers (Scope: 'category' | 'item')
 * 
 * Verifies that the new schema (modifier_groups, modifier_options, 
 * category_modifier_links, item_modifier_links) functions correctly across 
 * Backend bootstrap assembling and Frontend resolvers WITHOUT relying on legacy modifiers.
 * 
 * Follows TDD & strict regression baseline principles:
 * - Runs before code apply (documenting expectations / baseline failures)
 * - Runs after code apply (verifying zero regression and 100% adherence to new schema)
 */

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { DatabaseSync } = require('node:sqlite');

// Synthetic fixtures representing pure Schema Menu Mới (No legacy modifiers)
const FIXTURE_CLUSTER1_NEW_SCHEMA = {
  tenant: {
    id: 'benmi',
    brandName: 'Benmi 越式法國麵包'
  },
  bootstrapVersion: 2,
  menuComplete: true,
  modifiers: [], // Purposely empty: Legacy modifiers table is deprecated in Cluster 1!
  catalog: [
    {
      id: 'cat_small',
      slug: 'small',
      name: '🥖 小麵包',
      allowCustomization: true,
      appliedModifiers: [],
      modifierGroups: [
        {
          id: 'mg_cat_benmi_spicy',
          name: '辣度 (Độ cay)',
          scope: 'category',
          selectionType: 'single',
          isRequired: false,
          minSelection: 0,
          maxSelection: 1,
          options: [
            { id: 'opt_spicy_0', name: '不辣', price: 0, isDefault: true, isOutOfStock: false },
            { id: 'opt_spicy_1', name: '微辣', price: 0, isDefault: false, isOutOfStock: false },
            { id: 'opt_spicy_2', name: '中辣', price: 0, isDefault: false, isOutOfStock: false },
            { id: 'opt_spicy_3', name: '大辣', price: 0, isDefault: false, isOutOfStock: false }
          ]
        },
        {
          id: 'mg_cat_benmi_topping',
          name: '加料選項',
          scope: 'category',
          selectionType: 'multiple',
          isRequired: false,
          minSelection: 0,
          maxSelection: 5,
          options: [
            { id: 'opt_top_egg', name: '加蛋', price: 10, isDefault: false, isOutOfStock: false },
            { id: 'opt_top_cheese', name: '起司', price: 15, isDefault: false, isOutOfStock: false },
            { id: 'opt_top_pate', name: '加肉醬', price: 15, isDefault: false, isOutOfStock: false }
          ]
        }
      ],
      items: [
        {
          id: 'small_pork',
          name: '小 烤肉法國麵包',
          price: 85,
          categoryId: 'cat_small',
          isOutOfStock: false,
          // When assembled by backend, item inherits category modifierGroups:
          modifierGroups: [
            {
              id: 'mg_cat_benmi_spicy',
              name: '辣度 (Độ cay)',
              scope: 'category',
              selectionType: 'single',
              isRequired: false,
              minSelection: 0,
              maxSelection: 1,
              options: [
                { id: 'opt_spicy_0', name: '不辣', price: 0, isDefault: true, isOutOfStock: false },
                { id: 'opt_spicy_1', name: '微辣', price: 0, isDefault: false, isOutOfStock: false },
                { id: 'opt_spicy_2', name: '中辣', price: 0, isDefault: false, isOutOfStock: false },
                { id: 'opt_spicy_3', name: '大辣', price: 0, isDefault: false, isOutOfStock: false }
              ]
            },
            {
              id: 'mg_cat_benmi_topping',
              name: '加料選項',
              scope: 'category',
              selectionType: 'multiple',
              isRequired: false,
              minSelection: 0,
              maxSelection: 5,
              options: [
                { id: 'opt_top_egg', name: '加蛋', price: 10, isDefault: false, isOutOfStock: false },
                { id: 'opt_top_cheese', name: '起司', price: 15, isDefault: false, isOutOfStock: false },
                { id: 'opt_top_pate', name: '加肉醬', price: 15, isDefault: false, isOutOfStock: false }
              ]
            }
          ]
        },
        {
          id: 'small_special_steak',
          name: '特級牛排麵包 (Item-specific modifier)',
          price: 150,
          categoryId: 'cat_small',
          isOutOfStock: false,
          // Item has its own custom modifier group in addition to category group:
          modifierGroups: [
            {
              id: 'mg_item_doneness',
              name: '牛排熟度',
              scope: 'item',
              selectionType: 'single',
              isRequired: true,
              minSelection: 1,
              maxSelection: 1,
              options: [
                { id: 'opt_steak_medium', name: '7分熟', price: 0, isDefault: true, isOutOfStock: false },
                { id: 'opt_steak_well', name: '全熟', price: 0, isDefault: false, isOutOfStock: false }
              ]
            },
            {
              id: 'mg_cat_benmi_spicy',
              name: '辣度 (Độ cay)',
              scope: 'category',
              selectionType: 'single',
              isRequired: false,
              minSelection: 0,
              maxSelection: 1,
              options: [
                { id: 'opt_spicy_0', name: '不辣', price: 0, isDefault: true, isOutOfStock: false },
                { id: 'opt_spicy_1', name: '微辣', price: 0, isDefault: false, isOutOfStock: false },
                { id: 'opt_spicy_2', name: '中辣', price: 0, isDefault: false, isOutOfStock: false },
                { id: 'opt_spicy_3', name: '大辣', price: 0, isDefault: false, isOutOfStock: false }
              ]
            }
          ]
        }
      ]
    },
    {
      id: 'cat_drinks',
      slug: 'drinks',
      name: '🥤 飲料',
      allowCustomization: false,
      appliedModifiers: [],
      modifierGroups: [],
      items: [
        {
          id: 'drink_tea',
          name: '紅茶',
          price: 30,
          categoryId: 'cat_drinks',
          isOutOfStock: false,
          modifierGroups: []
        }
      ]
    }
  ]
};

function setupFrontendSandbox(bootstrapData) {
  const mockWindow = {
    location: { hostname: 'localhost', search: '' },
    addEventListener: () => {},
    removeEventListener: () => {},
    bootstrapData: bootstrapData,
    cart: {},
    customizeData: {},
    cDrinkData: {}
  };
  mockWindow.window = mockWindow;

  const sandbox = vm.createContext({
    window: mockWindow,
    console,
    bootstrapData: mockWindow.bootstrapData,
    cart: mockWindow.cart,
    customizeData: mockWindow.customizeData,
    cDrinkData: mockWindow.cDrinkData,
    document: {
      addEventListener: () => {},
      getElementById: () => null,
      querySelectorAll: () => [],
      querySelector: () => null,
      documentElement: { style: { setProperty: () => {} } }
    },
    localStorage: { getItem: () => null, setItem: () => {} },
    setTimeout, clearTimeout
  });

  const coreJs = fs.readFileSync(path.join(__dirname, '../js/client-core.js'), 'utf8');
  const customJs = fs.readFileSync(path.join(__dirname, '../js/client-customizations.js'), 'utf8');

  vm.runInContext(coreJs, sandbox);
  vm.runInContext(customJs, sandbox);

  return sandbox;
}

describe('Cluster 1: Category & Item Modifiers Test Suite (New Schema)', () => {

  // =========================================================================
  // TEST 1: buildModifierPriceMap must index prices from category & item modifierGroups
  // =========================================================================
  test('Test 1: buildModifierPriceMap indexes option prices from cat.modifierGroups and item.modifierGroups', () => {
    const sandbox = setupFrontendSandbox(FIXTURE_CLUSTER1_NEW_SCHEMA);

    const priceMap = vm.runInContext(`
      buildModifierPriceMap(bootstrapData);
      window.modPriceMap;
    `, sandbox);

    assert.ok(priceMap, 'modPriceMap must be created');
    // Verify prices from category modifier group (加料選項)
    assert.equal(priceMap['加蛋'], 10, 'Price of 加蛋 must be 10');
    assert.equal(priceMap['蛋'], 10, 'Price of 蛋 (stripped) must be 10');
    assert.equal(priceMap['起司'], 15, 'Price of 起司 must be 15');
    assert.equal(priceMap['加起司'], 15, 'Price of 加起司 (added prefix) must be 15');
    assert.equal(priceMap['opt_top_cheese'], 15, 'Price by option ID must be 15');

    // Verify option with price 0
    assert.equal(priceMap['不辣'], 0, 'Price of 不辣 must be 0');
    assert.equal(priceMap['opt_spicy_0'], 0, 'Price of opt_spicy_0 must be 0');
  });

  // =========================================================================
  // TEST 2: getEffectiveItemModifierGroups resolves groups directly from new schema
  // =========================================================================
  test('Test 2: getEffectiveItemModifierGroups resolves category and item groups without legacy modifiers', () => {
    const sandbox = setupFrontendSandbox(FIXTURE_CLUSTER1_NEW_SCHEMA);

    // Case 2A: Query standard item inheriting from category
    const standardItem = FIXTURE_CLUSTER1_NEW_SCHEMA.catalog[0].items[0];
    const resolvedStandard = vm.runInContext(`
      getEffectiveItemModifierGroups(${JSON.stringify(standardItem)}, 'small');
    `, sandbox);

    assert.equal(resolvedStandard.length, 2, 'Standard bread must have 2 modifier groups');
    const spicyGroup = resolvedStandard.find(g => g.name.includes('辣度'));
    assert.ok(spicyGroup, 'Must contain Spicy modifier group');
    assert.equal(spicyGroup.selectionType, 'single', 'Spicy group must be single selection');
    assert.equal(spicyGroup.options.length, 4, 'Spicy group must have 4 options');
    assert.equal(spicyGroup.options[0].name, '不辣');
    assert.equal(spicyGroup.options[0].isDefault, true);

    const toppingGroup = resolvedStandard.find(g => g.name.includes('加料'));
    assert.ok(toppingGroup, 'Must contain Topping modifier group');
    assert.equal(toppingGroup.selectionType, 'multiple', 'Topping group must be multiple selection');
    assert.equal(toppingGroup.options.length, 3, 'Topping group must have 3 options');

    // Case 2B: Query item-specific modifier group (牛排熟度)
    const steakItem = FIXTURE_CLUSTER1_NEW_SCHEMA.catalog[0].items[1];
    const resolvedSteak = vm.runInContext(`
      getEffectiveItemModifierGroups(${JSON.stringify(steakItem)}, 'small');
    `, sandbox);

    assert.equal(resolvedSteak.length, 3, 'Steak bread must have 3 modifier groups (1 item-specific + 2 category groups)');
    const donenessGroup = resolvedSteak.find(g => g.name.includes('熟度'));
    assert.ok(donenessGroup, 'Must contain item-specific doneness group');
    assert.equal(donenessGroup.selectionType, 'single');
    assert.equal(donenessGroup.isRequired, true);
    assert.equal(donenessGroup.options[0].name, '7分熟');

    // Case 2C: Item in non-customizable category (drinks)
    const drinkItem = FIXTURE_CLUSTER1_NEW_SCHEMA.catalog[1].items[0];
    const resolvedDrink = vm.runInContext(`
      getEffectiveItemModifierGroups(${JSON.stringify(drinkItem)}, 'drinks');
    `, sandbox);
    assert.equal(resolvedDrink.length, 0, 'Drinks must have 0 modifier groups');

    // Case 2D: Item without modifierGroups property on item object itself (inheriting strictly from cat.modifierGroups)
    const bareItem = { id: 'small_bare', name: '小 麵包 (No item modifierGroups)', price: 85 };
    const resolvedBare = vm.runInContext(`
      getEffectiveItemModifierGroups(${JSON.stringify(bareItem)}, 'small');
    `, sandbox);
    assert.equal(resolvedBare.length, 2, 'Bare item must inherit 2 modifier groups from catObj.modifierGroups');
  });

  // =========================================================================
  // TEST 3: getCategoryModifiers resolves directly from catObj.modifierGroups
  // =========================================================================
  test('Test 3: getCategoryModifiers returns category modifier groups from catObj.modifierGroups', () => {
    const sandbox = setupFrontendSandbox(FIXTURE_CLUSTER1_NEW_SCHEMA);

    const smallCatMods = vm.runInContext(`getCategoryModifiers('small')`, sandbox);
    assert.equal(smallCatMods.length, 2, 'Category small must return 2 modifier groups');
    assert.ok(smallCatMods.some(g => g.name.includes('辣度')), 'Must include Spicy group');
    assert.ok(smallCatMods.some(g => g.name.includes('加料')), 'Must include Topping group');

    const drinksCatMods = vm.runInContext(`getCategoryModifiers('drinks')`, sandbox);
    assert.equal(drinksCatMods.length, 0, 'Category drinks must return 0 modifier groups');
  });

  // =========================================================================
  // TEST 4: calculatePortionExtra & getModifierPrice calculate surcharges correctly
  // =========================================================================
  test('Test 4: calculatePortionExtra and getModifierPrice compute correct surcharges', () => {
    const sandbox = setupFrontendSandbox(FIXTURE_CLUSTER1_NEW_SCHEMA);

    const standardItem = FIXTURE_CLUSTER1_NEW_SCHEMA.catalog[0].items[0];

    // Subtest: Single option price resolution
    const cheesePrice = vm.runInContext(`getModifierPrice('起司')`, sandbox);
    assert.equal(cheesePrice, 15, 'getModifierPrice(起司) must return 15');

    const eggPrice = vm.runInContext(`getModifierPrice('加蛋')`, sandbox);
    assert.equal(eggPrice, 10, 'getModifierPrice(加蛋) must return 10');

    const spicyPrice = vm.runInContext(`getModifierPrice('大辣')`, sandbox);
    assert.equal(spicyPrice, 0, 'getModifierPrice(大辣) must return 0');

    // Subtest: calculatePortionExtra with selected options
    const portionWithAddons = {
      selectedByGroup: {
        'mg_cat_benmi_spicy': ['opt_spicy_1'], // 微辣 (0)
        'mg_cat_benmi_topping': ['opt_top_egg', 'opt_top_cheese'] // 加蛋 (10) + 起司 (15) = 25
      }
    };

    const extra = vm.runInContext(`
      calculatePortionExtra(${JSON.stringify(standardItem)}, ${JSON.stringify(portionWithAddons)});
    `, sandbox);

    assert.equal(extra, 25, 'Total extra for 加蛋 (10) + 起司 (15) must be 25');
  });

  // =========================================================================
  // TEST 5: initPortionDefaults initializes defaults correctly
  // =========================================================================
  test('Test 5: initPortionDefaults picks isDefault options from new schema modifierGroups', () => {
    const sandbox = setupFrontendSandbox(FIXTURE_CLUSTER1_NEW_SCHEMA);

    const initialPortion = vm.runInContext(`
      initPortionDefaults('small', '小 烤肉法國麵包', 0);
    `, sandbox);

    assert.ok(initialPortion, 'Default portion must be returned');
    assert.ok(initialPortion.single, 'Must contain single selections object');
    // Spicy should default to '不辣'
    const spicySelection = Object.values(initialPortion.single).find(val => val === '不辣');
    assert.equal(spicySelection, '不辣', 'Default single selection for spicy must be 不辣');
  });

  // =========================================================================
  // TEST 6: Backend D1 Assembler (SQL schema & query verification)
  // =========================================================================
  test('Test 6: Backend D1 Query and Assembler correctly extracts and binds modifier groups', () => {
    const db = new DatabaseSync(':memory:');
    db.exec(`PRAGMA foreign_keys=ON;
      CREATE TABLE menu_categories(
        id TEXT PRIMARY KEY, tenant_id TEXT, slug TEXT, name TEXT, short_name TEXT, 
        category_type TEXT, allow_customization INTEGER, applied_modifiers TEXT, sort_order INTEGER
      );
      CREATE TABLE menu_items(
        id TEXT PRIMARY KEY, tenant_id TEXT, category_id TEXT REFERENCES menu_categories(id),
        name TEXT, price REAL, badge_text TEXT, is_recommended INTEGER, sort_order INTEGER, out_of_stock_until TEXT
      );
      CREATE TABLE modifier_groups(
        id TEXT PRIMARY KEY, tenant_id TEXT, name TEXT, scope TEXT DEFAULT 'category',
        selection_type TEXT DEFAULT 'single', is_required INTEGER DEFAULT 0,
        min_selection INTEGER DEFAULT 0, max_selection INTEGER DEFAULT 1, sort_order INTEGER DEFAULT 0
      );
      CREATE TABLE modifier_options(
        id TEXT PRIMARY KEY, tenant_id TEXT, group_id TEXT REFERENCES modifier_groups(id),
        name TEXT, price REAL DEFAULT 0, is_default INTEGER DEFAULT 0, sort_order INTEGER DEFAULT 0, out_of_stock_until TEXT
      );
      CREATE TABLE category_modifier_links(
        category_id TEXT REFERENCES menu_categories(id),
        group_id TEXT REFERENCES modifier_groups(id),
        tenant_id TEXT,
        sort_order INTEGER DEFAULT 0,
        PRIMARY KEY(category_id, group_id)
      );
      CREATE TABLE item_modifier_links(
        item_id TEXT REFERENCES menu_items(id),
        group_id TEXT REFERENCES modifier_groups(id),
        tenant_id TEXT,
        sort_order INTEGER DEFAULT 0,
        PRIMARY KEY(item_id, group_id)
      );
    `);

    // Seed Tenant 'benmi'
    db.prepare('INSERT INTO menu_categories VALUES(?,?,?,?,?,?,?,?,?)')
      .run('cat_small', 'benmi', 'small', '🥖 小麵包', '小麵包', 'catalog', 1, '', 1);
    db.prepare('INSERT INTO menu_items VALUES(?,?,?,?,?,?,?,?,?)')
      .run('item_small_pork', 'benmi', 'cat_small', '小 烤肉法國麵包', 85, '', 0, 1, null);

    // Seed modifier groups
    db.prepare('INSERT INTO modifier_groups VALUES(?,?,?,?,?,?,?,?,?)')
      .run('mg_spicy', 'benmi', '辣度 (Độ cay)', 'category', 'single', 0, 0, 1, 1);
    db.prepare('INSERT INTO modifier_options VALUES(?,?,?,?,?,?,?,?)')
      .run('opt_spicy_0', 'benmi', 'mg_spicy', '不辣', 0, 1, 1, null);
    db.prepare('INSERT INTO modifier_options VALUES(?,?,?,?,?,?,?,?)')
      .run('opt_spicy_1', 'benmi', 'mg_spicy', '微辣', 0, 0, 2, null);

    db.prepare('INSERT INTO modifier_groups VALUES(?,?,?,?,?,?,?,?,?)')
      .run('mg_topping', 'benmi', '加料選項', 'category', 'multiple', 0, 0, 5, 2);
    db.prepare('INSERT INTO modifier_options VALUES(?,?,?,?,?,?,?,?)')
      .run('opt_top_egg', 'benmi', 'mg_topping', '加蛋', 10, 0, 1, null);
    db.prepare('INSERT INTO modifier_options VALUES(?,?,?,?,?,?,?,?)')
      .run('opt_top_cheese', 'benmi', 'mg_topping', '起司', 15, 0, 2, null);

    // Link modifier groups to category 'cat_small'
    db.prepare('INSERT INTO category_modifier_links VALUES(?,?,?,?)').run('cat_small', 'mg_spicy', 'benmi', 1);
    db.prepare('INSERT INTO category_modifier_links VALUES(?,?,?,?)').run('cat_small', 'mg_topping', 'benmi', 2);

    // Run the exact SQL used in bootstrap.ts
    const catModRows = db.prepare(`
      SELECT l.category_id, g.id AS group_id, g.name AS group_name, g.selection_type,
             COALESCE(g.is_required, 0) AS is_required,
             COALESCE(g.min_selection, 0) AS min_selection,
             COALESCE(g.max_selection, 1) AS max_selection,
             COALESCE(g.scope, 'category') AS scope,
             o.id AS option_id, o.name AS option_name, COALESCE(o.price, 0) AS option_price,
             COALESCE(o.is_default, 0) AS is_default, o.out_of_stock_until AS option_out_of_stock_until
      FROM category_modifier_links l
      JOIN modifier_groups g ON g.id = l.group_id AND g.tenant_id = l.tenant_id
      LEFT JOIN modifier_options o ON o.group_id = g.id AND o.tenant_id = g.tenant_id
      WHERE l.tenant_id = 'benmi'
      ORDER BY l.sort_order ASC, g.sort_order ASC, o.sort_order ASC
    `).all();

    assert.equal(catModRows.length, 4, 'Must return 4 joined rows (2 spicy + 2 topping)');

    // Assemble categoryModifierGroupsMap
    const categoryModifierGroupsMap = new Map();
    for (const row of catModRows) {
      if (!categoryModifierGroupsMap.has(row.category_id)) {
        categoryModifierGroupsMap.set(row.category_id, []);
      }
      const groupList = categoryModifierGroupsMap.get(row.category_id);
      let grp = groupList.find(g => g.id === row.group_id);
      if (!grp) {
        grp = {
          id: row.group_id,
          name: row.group_name,
          selectionType: row.selection_type || 'single',
          isRequired: Boolean(row.is_required),
          minSelection: Number(row.min_selection ?? 0),
          maxSelection: Number(row.max_selection ?? 1),
          scope: row.scope || 'category',
          options: []
        };
        groupList.push(grp);
      }
      if (row.option_id) {
        grp.options.push({
          id: row.option_id,
          name: row.option_name,
          price: Number(row.option_price || 0),
          isDefault: Boolean(row.is_default),
          isOutOfStock: false
        });
      }
    }

    const assembledGroups = categoryModifierGroupsMap.get('cat_small');
    assert.equal(assembledGroups.length, 2, 'cat_small must have 2 assembled modifier groups');
    assert.equal(assembledGroups[0].name, '辣度 (Độ cay)');
    assert.equal(assembledGroups[0].options.length, 2);
    assert.equal(assembledGroups[1].name, '加料選項');
    assert.equal(assembledGroups[1].options.length, 2);
    assert.equal(assembledGroups[1].options[1].price, 15);
  });
});
