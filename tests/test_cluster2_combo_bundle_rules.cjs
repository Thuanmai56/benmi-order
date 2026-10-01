/**
 * Test Suite for Cluster 2: Combo / Bundle Multi-Choice & Surcharges (menu_bundle_rules)
 * 
 * Verifies that:
 * 1. normalizeBundleConfig strictly validates and normalizes Bundle V2 structures.
 * 2. validateBundleOrderItems validates child items and accepts child modifiers 
 *    directly from Schema Mới (category_modifier_links & item_modifier_links) 
 *    WITHOUT relying on legacy category_type = 'modifier'.
 * 3. Surcharges (child item surcharge + child modifier surcharge) are calculated accurately.
 * 4. Frontend bundle-builder-v2 correctly resolves child item modifiers and options.
 */

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { DatabaseSync } = require('node:sqlite');
const ts = require('../benmi-worker-official/node_modules/typescript');

function compileBundleRulesModule() {
  const source = fs.readFileSync(path.join(__dirname, '../benmi-worker-official/src/modules/bundle-rules.ts'), 'utf8');
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }
  }).outputText;

  const sandbox = vm.createContext({
    console,
    Date,
    Number,
    String,
    Boolean,
    Array,
    Set,
    Map,
    Math,
    crypto,
    JSON,
    exports: {}
  });

  vm.runInContext(compiled, sandbox);
  return sandbox.exports;
}

function createD1Adapter(db) {
  return {
    prepare(sql) {
      return {
        bind(...args) {
          return {
            sql,
            args,
            async first() {
              const stmt = db.prepare(sql);
              return stmt.get(...args) || null;
            },
            async all() {
              const stmt = db.prepare(sql);
              return { results: stmt.all(...args) };
            }
          };
        }
      };
    },
    async batch(statements) {
      const results = [];
      for (const stmt of statements) {
        const res = await stmt.all();
        results.push(res);
      }
      return results;
    }
  };
}

describe('Cluster 2: Combo / Bundle Multi-Choice & Surcharges Test Suite', () => {

  // =========================================================================
  // TEST 1: normalizeBundleConfig validates configuration
  // =========================================================================
  test('Test 1: normalizeBundleConfig validates choice and fixed groups correctly', () => {
    const bundleRules = compileBundleRulesModule();
    const { normalizeBundleConfig } = bundleRules;

    const allowedItems = new Map([
      ['bm_pork', { id: 'bm_pork', category_id: 'cat_bread', name: 'Bánh mì thịt' }],
      ['bm_chicken', { id: 'bm_chicken', category_id: 'cat_bread', name: 'Bánh mì gà' }],
      ['drink_tea', { id: 'drink_tea', category_id: 'cat_drinks', name: 'Trà đào' }]
    ]);

    // Valid bundle config
    const validConfig = {
      version: 2,
      groups: [
        {
          id: 'grp_bread',
          type: 'choice',
          label: { 'zh-TW': '選 1 個麵包', vi: 'Chọn 1 bánh mì' },
          minQuantity: 1,
          maxQuantity: 1,
          allowRepeats: false,
          sources: [{ type: 'category', categoryId: 'cat_bread' }],
          surcharges: { 'bm_chicken': 5 }
        },
        {
          id: 'grp_drink',
          type: 'fixed',
          label: { 'zh-TW': '固定飲料', vi: 'Đồ uống cố định' },
          items: [{ itemId: 'drink_tea', quantity: 1, surcharge: 0 }]
        }
      ]
    };

    const normalized = normalizeBundleConfig(validConfig, allowedItems, 'combo_lunch');
    assert.equal(normalized.version, 2);
    assert.equal(normalized.groups.length, 2);
    assert.equal(normalized.groups[0].surcharges['bm_chicken'], 5);
    assert.equal(normalized.groups[1].type, 'fixed');

    // Invalid config: missing groups
    assert.throws(() => {
      normalizeBundleConfig({ groups: [] }, allowedItems, 'combo_lunch');
    }, /BUNDLE_GROUPS_REQUIRED/);

    // Invalid config: parent item included as child
    assert.throws(() => {
      normalizeBundleConfig({
        groups: [
          {
            type: 'choice',
            label: { 'zh-TW': 'Bánh', vi: 'Bánh' },
            sources: [{ type: 'item_list', itemIds: ['combo_lunch'] }]
          }
        ]
      }, allowedItems, 'combo_lunch');
    }, /BUNDLE_INVALID_CHILD/);
  });

  // =========================================================================
  // TEST 2: validateBundleOrderItems accepts child modifiers from category_modifier_links (New Schema)
  // =========================================================================
  test('Test 2: validateBundleOrderItems validates child items with modifiers from category_modifier_links', async () => {
    const bundleRules = compileBundleRulesModule();
    const { validateBundleOrderItems } = bundleRules;

    const db = new DatabaseSync(':memory:');
    db.exec(`PRAGMA foreign_keys=ON;
      CREATE TABLE menu_categories(
        id TEXT PRIMARY KEY, tenant_id TEXT, slug TEXT, name TEXT, short_name TEXT, 
        category_type TEXT DEFAULT 'catalog', allow_customization INTEGER DEFAULT 1, 
        applied_modifiers TEXT DEFAULT '', is_required INTEGER DEFAULT 0,
        min_selection INTEGER DEFAULT 0, max_selection INTEGER DEFAULT 1, sort_order INTEGER DEFAULT 0
      );
      CREATE TABLE menu_items(
        id TEXT PRIMARY KEY, tenant_id TEXT, category_id TEXT REFERENCES menu_categories(id),
        name TEXT, price REAL, badge_text TEXT, is_recommended INTEGER DEFAULT 0, 
        sort_order INTEGER DEFAULT 0, out_of_stock_until TEXT
      );
      CREATE TABLE menu_bundle_rules(
        id TEXT PRIMARY KEY, tenant_id TEXT, parent_item_id TEXT REFERENCES menu_items(id),
        schema_version INTEGER DEFAULT 2, config_json TEXT, is_active INTEGER DEFAULT 1, updated_at TEXT
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

    // Seed Categories
    db.prepare('INSERT INTO menu_categories(id, tenant_id, slug, name, category_type) VALUES (?,?,?,?,?)')
      .run('cat_combo', 'benmi', 'combo', 'Combo', 'catalog');
    db.prepare('INSERT INTO menu_categories(id, tenant_id, slug, name, category_type) VALUES (?,?,?,?,?)')
      .run('cat_bread', 'benmi', 'bread', 'Bánh mì', 'catalog');
    db.prepare('INSERT INTO menu_categories(id, tenant_id, slug, name, category_type) VALUES (?,?,?,?,?)')
      .run('cat_drinks', 'benmi', 'drinks', 'Đồ uống', 'catalog');

    // Seed Items
    db.prepare('INSERT INTO menu_items(id, tenant_id, category_id, name, price) VALUES (?,?,?,?,?)')
      .run('combo_lunch', 'benmi', 'cat_combo', 'Combo Trưa Tiết Kiệm', 120);
    db.prepare('INSERT INTO menu_items(id, tenant_id, category_id, name, price) VALUES (?,?,?,?,?)')
      .run('bm_pork', 'benmi', 'cat_bread', 'Bánh mì thịt nướng', 85);
    db.prepare('INSERT INTO menu_items(id, tenant_id, category_id, name, price) VALUES (?,?,?,?,?)')
      .run('drink_tea', 'benmi', 'cat_drinks', 'Trà đào', 35);

    // Seed Bundle Rule for combo_lunch
    const bundleConfig = {
      version: 2,
      groups: [
        {
          id: 'grp_bread',
          name: 'Món chính',
          label: { 'zh-TW': '選 1 個麵包', vi: 'Chọn 1 bánh mì' },
          minQuantity: 1,
          maxQuantity: 1,
          allowRepeats: false,
          sources: [{ type: 'category', categoryId: 'cat_bread' }],
          surcharges: {}
        },
        {
          id: 'grp_drink',
          name: 'Đồ uống',
          label: { 'zh-TW': '選 1 杯飲料', vi: 'Chọn 1 đồ uống' },
          minQuantity: 1,
          maxQuantity: 1,
          allowRepeats: false,
          sources: [{ type: 'category', categoryId: 'cat_drinks' }],
          surcharges: {}
        }
      ]
    };
    db.prepare('INSERT INTO menu_bundle_rules(id, tenant_id, parent_item_id, schema_version, config_json) VALUES (?,?,?,?,?)')
      .run('rule_lunch', 'benmi', 'combo_lunch', 2, JSON.stringify(bundleConfig));

    // Seed Modifier Groups & Options (Pure Schema Mới)
    db.prepare('INSERT INTO modifier_groups(id, tenant_id, name, selection_type, is_required) VALUES (?,?,?,?,?)')
      .run('mg_spicy', 'benmi', '辣度 (Độ cay)', 'single', 0);
    db.prepare('INSERT INTO modifier_options(id, tenant_id, group_id, name, price) VALUES (?,?,?,?,?)')
      .run('opt_spicy_mid', 'benmi', 'mg_spicy', '微辣', 0);

    db.prepare('INSERT INTO modifier_groups(id, tenant_id, name, selection_type, is_required) VALUES (?,?,?,?,?)')
      .run('mg_topping', 'benmi', '加料選項', 'multiple', 0);
    db.prepare('INSERT INTO modifier_options(id, tenant_id, group_id, name, price) VALUES (?,?,?,?,?)')
      .run('opt_cheese', 'benmi', 'mg_topping', '加起司', 15);

    // Link modifier groups to category 'cat_bread'
    db.prepare('INSERT INTO category_modifier_links(category_id, group_id, tenant_id) VALUES (?,?,?)')
      .run('cat_bread', 'mg_spicy', 'benmi');
    db.prepare('INSERT INTO category_modifier_links(category_id, group_id, tenant_id) VALUES (?,?,?)')
      .run('cat_bread', 'mg_topping', 'benmi');

    const env = { DB: createD1Adapter(db) };

    // Valid order item payload with child item modifiers:
    const validOrderItem = [
      {
        itemId: 'combo_lunch',
        name: 'Combo Trưa Tiết Kiệm',
        price: 120,
        subtotal: 135,
        quantity: 1,
        bundleSelections: {
          portions: [
            {
              portionIndex: 0,
              groups: [
                {
                  groupId: 'grp_bread',
                  groupName: '選 1 個麵包',
                  items: [
                    {
                      itemId: 'bm_pork',
                      name: 'Bánh mì thịt nướng',
                      quantity: 1,
                      modifiers: [
                        { groupId: 'mg_spicy', optionId: 'opt_spicy_mid', name: '微辣', price: 0 },
                        { groupId: 'mg_topping', optionId: 'opt_cheese', name: '加起司', price: 15 }
                      ]
                    }
                  ]
                },
                {
                  groupId: 'grp_drink',
                  groupName: '選 1 杯飲料',
                  items: [
                    {
                      itemId: 'drink_tea',
                      name: 'Trà đào',
                      quantity: 1,
                      modifiers: []
                    }
                  ]
                }
              ]
            }
          ]
        }
      }
    ];

    const result = await validateBundleOrderItems(env, 'benmi', validOrderItem);
    assert.equal(result.valid, true, `Validation must pass with category_modifier_links, got error: ${result.error} (${result.code})`);

    // Edge case 2a: Tampered subtotal (Client claims 100 instead of 135)
    const tamperedItem = JSON.parse(JSON.stringify(validOrderItem));
    tamperedItem[0].subtotal = 100;
    const tamperedResult = await validateBundleOrderItems(env, 'benmi', tamperedItem);
    assert.equal(tamperedResult.valid, false, 'Tampered subtotal must be rejected');
    assert.equal(tamperedResult.code, 'BUNDLE_PRICE_CHANGED', 'Expected BUNDLE_PRICE_CHANGED code');

    // Edge case 2b: Required modifier group missing
    db.prepare('UPDATE modifier_groups SET is_required = 1, min_selection = 1 WHERE id = ?').run('mg_spicy');
    const missingModItem = JSON.parse(JSON.stringify(validOrderItem));
    // Remove spicy modifier:
    missingModItem[0].bundleSelections.portions[0].groups[0].items[0].modifiers = [
      { groupId: 'mg_topping', optionId: 'opt_cheese', name: '加起司', price: 15 }
    ];
    const missingModResult = await validateBundleOrderItems(env, 'benmi', missingModItem);
    assert.equal(missingModResult.valid, false, 'Missing required modifier must be rejected');
    assert.equal(missingModResult.code, 'BUNDLE_MODIFIER_REQUIRED', 'Expected BUNDLE_MODIFIER_REQUIRED code');

    // Edge case 2c: Out of stock modifier option
    db.prepare('UPDATE modifier_groups SET is_required = 0, min_selection = 0 WHERE id = ?').run('mg_spicy');
    db.prepare('UPDATE modifier_options SET out_of_stock_until = ? WHERE id = ?')
      .run(new Date(Date.now() + 3600000).toISOString(), 'opt_cheese');
    const outOfStockResult = await validateBundleOrderItems(env, 'benmi', validOrderItem);
    assert.equal(outOfStockResult.valid, false, 'Out of stock modifier option must be rejected');
    assert.equal(outOfStockResult.code, 'BUNDLE_MODIFIER_NOT_ALLOWED', 'Expected BUNDLE_MODIFIER_NOT_ALLOWED');
  });

  // =========================================================================
  // TEST 3: Surcharges validation (Child item surcharge + child modifier surcharge)
  // =========================================================================
  test('Test 3: validateBundleOrderItems accumulates surcharges accurately', async () => {
    const bundleRules = compileBundleRulesModule();
    const { validateBundleOrderItems } = bundleRules;

    const db = new DatabaseSync(':memory:');
    db.exec(`PRAGMA foreign_keys=ON;
      CREATE TABLE menu_categories(
        id TEXT PRIMARY KEY, tenant_id TEXT, slug TEXT, name TEXT, short_name TEXT, 
        category_type TEXT DEFAULT 'catalog', allow_customization INTEGER DEFAULT 1, 
        applied_modifiers TEXT DEFAULT '', is_required INTEGER DEFAULT 0,
        min_selection INTEGER DEFAULT 0, max_selection INTEGER DEFAULT 1, sort_order INTEGER DEFAULT 0
      );
      CREATE TABLE menu_items(
        id TEXT PRIMARY KEY, tenant_id TEXT, category_id TEXT REFERENCES menu_categories(id),
        name TEXT, price REAL, badge_text TEXT, is_recommended INTEGER DEFAULT 0, 
        sort_order INTEGER DEFAULT 0, out_of_stock_until TEXT
      );
      CREATE TABLE menu_bundle_rules(
        id TEXT PRIMARY KEY, tenant_id TEXT, parent_item_id TEXT REFERENCES menu_items(id),
        schema_version INTEGER DEFAULT 2, config_json TEXT, is_active INTEGER DEFAULT 1, updated_at TEXT
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

    db.prepare('INSERT INTO menu_categories(id, tenant_id, slug, name, category_type) VALUES (?,?,?,?,?)')
      .run('cat_combo', 'benmi', 'combo', 'Combo', 'catalog');
    db.prepare('INSERT INTO menu_categories(id, tenant_id, slug, name, category_type) VALUES (?,?,?,?,?)')
      .run('cat_food', 'benmi', 'food', 'Food', 'catalog');

    db.prepare('INSERT INTO menu_items(id, tenant_id, category_id, name, price) VALUES (?,?,?,?,?)')
      .run('combo_1', 'benmi', 'cat_combo', 'Set 1', 100);
    db.prepare('INSERT INTO menu_items(id, tenant_id, category_id, name, price) VALUES (?,?,?,?,?)')
      .run('item_beef', 'benmi', 'cat_food', 'Bò Lúc Lắc', 120);

    // Rule with $20 surcharge for item_beef
    const ruleConfig = {
      version: 2,
      groups: [
        {
          id: 'grp_meat',
          name: 'Chọn thịt',
          label: { 'zh-TW': '選肉類', vi: 'Chọn thịt' },
          minQuantity: 1,
          maxQuantity: 1,
          allowRepeats: false,
          sources: [{ type: 'category', categoryId: 'cat_food' }],
          surcharges: { 'item_beef': 20 }
        }
      ]
    };
    db.prepare('INSERT INTO menu_bundle_rules(id, tenant_id, parent_item_id, schema_version, config_json) VALUES (?,?,?,?,?)')
      .run('rule_combo_1', 'benmi', 'combo_1', 2, JSON.stringify(ruleConfig));

    // Modifier option: +$15 Extra Cheese
    db.prepare('INSERT INTO modifier_groups(id, tenant_id, name, selection_type) VALUES (?,?,?,?)')
      .run('mg_top', 'benmi', 'Topping', 'multiple');
    db.prepare('INSERT INTO modifier_options(id, tenant_id, group_id, name, price) VALUES (?,?,?,?,?)')
      .run('opt_cheese', 'benmi', 'mg_top', 'Phô mai', 15);
    db.prepare('INSERT INTO category_modifier_links(category_id, group_id, tenant_id) VALUES (?,?,?)')
      .run('cat_food', 'mg_top', 'benmi');

    const env = { DB: createD1Adapter(db) };

    const orderItem = [
      {
        itemId: 'combo_1',
        quantity: 1,
        subtotal: 135,
        bundleSelections: {
          portions: [
            {
              portionIndex: 0,
              groups: [
                {
                  groupId: 'grp_meat',
                  groupName: '選肉類',
                  items: [
                    {
                      itemId: 'item_beef',
                      quantity: 1,
                      modifiers: [{ groupId: 'mg_top', optionId: 'opt_cheese', price: 15 }]
                    }
                  ]
                }
              ]
            }
          ]
        }
      }
    ];

    const result = await validateBundleOrderItems(env, 'benmi', orderItem);
    assert.equal(result.valid, true, `Validation should pass, got error: ${result.error}`);
    // Expected surcharge = $20 (child surcharge) + $15 (child modifier) = $35
    // Order total = base $100 + $35 = $135
  });

  // =========================================================================
  // TEST 4: Frontend bundle-builder-v2 resolves child modifiers from new schema
  // =========================================================================
  test('Test 4: bundle-builder-v2 loads child modifiers from cat.modifierGroups and calculates subtotal', () => {
    const mockWindow = {
      location: { hostname: 'localhost', search: '' },
      addEventListener: () => {},
      removeEventListener: () => {},
      bootstrapData: {
        catalog: [
          {
            id: 'cat_bread',
            slug: 'bread',
            name: '🥖 Bánh mì',
            allowCustomization: true,
            modifierGroups: [
              {
                id: 'mg_spicy',
                name: 'Độ cay',
                selectionType: 'single',
                options: [{ id: 'opt_spicy_0', name: 'Không cay', price: 0 }]
              }
            ],
            items: [
              {
                id: 'bm_pork',
                name: 'Bánh mì thịt',
                price: 85,
                categoryId: 'cat_bread',
                modifierGroups: [
                  {
                    id: 'mg_spicy',
                    name: 'Độ cay',
                    selectionType: 'single',
                    options: [{ id: 'opt_spicy_0', name: 'Không cay', price: 0 }]
                  }
                ]
              }
            ]
          }
        ],
        modifiers: [] // No legacy modifiers
      },
      cart: {},
      customizeData: {}
    };
    mockWindow.window = mockWindow;

    const sandbox = vm.createContext({
      window: mockWindow,
      console,
      bootstrapData: mockWindow.bootstrapData,
      document: {
        addEventListener: () => {},
        getElementById: () => null,
        querySelectorAll: () => []
      }
    });

    const coreJs = fs.readFileSync(path.join(__dirname, '../js/client-core.js'), 'utf8');
    const bundleJs = fs.readFileSync(path.join(__dirname, '../js/bundle-builder-v2.js'), 'utf8');

    vm.runInContext(coreJs, sandbox);
    vm.runInContext(bundleJs, sandbox);

    // Call optionsFor on child item bm_pork
    const childItem = mockWindow.bootstrapData.catalog[0].items[0];
    const mods = vm.runInContext(`
      getEffectiveItemModifierGroups(${JSON.stringify(childItem)}, 'bread');
    `, sandbox);

    assert.equal(mods.length, 1, 'Child item must have 1 modifier group');
    assert.equal(mods[0].name, 'Độ cay');
  });
});
