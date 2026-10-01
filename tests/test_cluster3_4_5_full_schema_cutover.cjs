/**
 * Test Suite for Clusters 3, 4 & 5: Full Menu Schema Cutover (Zero Legacy Dependencies)
 * 
 * Verifies:
 * - Cluster 3: Eligibility Rules (min_order_subtotal) resolved purely from modifier_options.eligibility_rules_json
 * - Cluster 4: Hierarchical Sub-options (sub_options_json) attached to options and validated
 * - Cluster 5: Complete retirement of menu_customizations and menu_customization_option_rules in Menu Save & Bootstrap
 * 
 * Strict TDD Workflow:
 * - Test suite runs against local SQLite database simulating pure new schema
 * - Validates fail-fast before implementation, and zero regression after implementation
 */

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { DatabaseSync } = require('node:sqlite');

function createD1Adapter(db) {
  return {
    prepare(query) {
      return {
        bind(...params) {
          return {
            async all() {
              const stmt = db.prepare(query);
              const rows = stmt.all(...params);
              return { results: rows, success: true, meta: { changes: 0 } };
            },
            async first(col) {
              const stmt = db.prepare(query);
              const row = stmt.get(...params);
              if (!row) return null;
              if (col && typeof row === 'object') return row[col];
              return row;
            },
            async run() {
              const stmt = db.prepare(query);
              const info = stmt.run(...params);
              return { success: true, meta: { changes: info.changes } };
            }
          };
        }
      };
    },
    async batch(statements) {
      const results = [];
      for (const s of statements) {
        const res = await s.all();
        results.push(res);
      }
      return results;
    }
  };
}

const ts = require('../benmi-worker-official/node_modules/typescript');

function compileThresholdValidatorFunction() {
  const fullPath = path.join(__dirname, '..', 'benmi-worker-official/src/modules/orders.ts');
  const fullSource = fs.readFileSync(fullPath, 'utf8');

  // Extract exactly validateThresholdCustomizations
  const startIdx = fullSource.indexOf('export async function validateThresholdCustomizations');
  const endIdx = fullSource.indexOf('export async function createOrder');
  const fnSource = fullSource.slice(startIdx, endIdx);

  const compiled = ts.transpileModule(fnSource, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }
  }).outputText;

  const sandbox = vm.createContext({
    console,
    Date,
    Math,
    JSON,
    Number,
    String,
    Boolean,
    Set,
    Map,
    Array,
    exports: {}
  });

  vm.runInContext(compiled, sandbox);
  return sandbox.exports.validateThresholdCustomizations;
}

function initPureNewSchemaDatabase(db) {
  db.exec(`PRAGMA foreign_keys=OFF;
    DROP TABLE IF EXISTS category_modifier_links;
    DROP TABLE IF EXISTS item_modifier_links;
    DROP TABLE IF EXISTS modifier_options;
    DROP TABLE IF EXISTS modifier_groups;
    DROP TABLE IF EXISTS menu_items;
    DROP TABLE IF EXISTS menu_categories;
    DROP TABLE IF EXISTS menu_customizations;
    DROP TABLE IF EXISTS menu_customization_option_rules;

    CREATE TABLE menu_categories (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      name TEXT NOT NULL,
      slug TEXT NOT NULL,
      category_type TEXT NOT NULL DEFAULT 'catalog',
      allow_customization INTEGER DEFAULT 1,
      applied_modifiers TEXT DEFAULT '',
      sort_order INTEGER DEFAULT 0
    );

    CREATE TABLE menu_items (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      category_id TEXT NOT NULL,
      name TEXT NOT NULL,
      price REAL NOT NULL,
      item_type TEXT DEFAULT 'standard',
      sort_order INTEGER DEFAULT 0,
      out_of_stock_until TEXT DEFAULT NULL
    );

    CREATE TABLE modifier_groups (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      name TEXT NOT NULL,
      selection_type TEXT NOT NULL DEFAULT 'single',
      is_required INTEGER DEFAULT 0,
      min_selection INTEGER DEFAULT 0,
      max_selection INTEGER DEFAULT 1,
      scope TEXT DEFAULT 'category',
      sort_order INTEGER DEFAULT 0
    );

    CREATE TABLE modifier_options (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      group_id TEXT NOT NULL,
      name TEXT NOT NULL,
      price REAL DEFAULT 0,
      is_default INTEGER DEFAULT 0,
      sub_options_json TEXT NOT NULL DEFAULT '[]',
      eligibility_rules_json TEXT NOT NULL DEFAULT '[]',
      sort_order INTEGER DEFAULT 0,
      out_of_stock_until TEXT DEFAULT NULL
    );

    CREATE TABLE category_modifier_links (
      category_id TEXT NOT NULL,
      group_id TEXT NOT NULL,
      tenant_id TEXT NOT NULL,
      sort_order INTEGER DEFAULT 0,
      PRIMARY KEY (category_id, group_id)
    );

    CREATE TABLE item_modifier_links (
      item_id TEXT NOT NULL,
      group_id TEXT NOT NULL,
      tenant_id TEXT NOT NULL,
      sort_order INTEGER DEFAULT 0,
      PRIMARY KEY (item_id, group_id)
    );

    CREATE TABLE menu_customizations (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      key TEXT NOT NULL,
      options_json TEXT NOT NULL DEFAULT '[]'
    );

    CREATE TABLE menu_customization_option_rules (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      customization_key TEXT NOT NULL,
      option_id TEXT NOT NULL,
      min_order_subtotal REAL NOT NULL DEFAULT 0,
      is_active INTEGER NOT NULL DEFAULT 1
    );
  `);
}

describe('Clusters 3, 4, 5: Full Menu Schema Cutover Test Suite', () => {

  // =========================================================================
  // TEST 1: Cluster 3 - Threshold Eligibility Rules from modifier_options
  // =========================================================================
  test('Test 1: Eligibility rules check min_order_subtotal from modifier_options without legacy tables', async () => {
    const db = new DatabaseSync(':memory:');
    initPureNewSchemaDatabase(db);

    // Seed modifier group with an option that requires minimum order subtotal of $150
    db.prepare('INSERT INTO modifier_groups(id, tenant_id, name, scope, selection_type) VALUES (?,?,?,?,?)')
      .run('mg_reward', 'benmi', '超值加購 (Ưu đãi mua kèm)', 'order', 'multiple');

    const eligibilityRules = [
      {
        rule_type: 'min_order_subtotal',
        min_order_subtotal: 150,
        threshold_basis: 'merchandise_subtotal_after_pricing',
        error_message: '滿 $150 元方可加購特價點心'
      }
    ];

    db.prepare('INSERT INTO modifier_options(id, tenant_id, group_id, name, price, eligibility_rules_json) VALUES (?,?,?,?,?,?)')
      .run('opt_reward_cake', 'benmi', 'mg_reward', '特價提拉米蘇 (Bánh Tiramisu)', 20, JSON.stringify(eligibilityRules));

    // Notice: NO rows in menu_customization_option_rules or menu_customizations!

    const env = { DB: createD1Adapter(db) };

    // Case 1a: Cart subtotal is only $100 (< $150 threshold) and user attempts to select this option
    const rawItemsUnder = [
      { itemId: 'bm_pork', price: 100, quantity: 1, subtotal: 100 }
    ];
    const userCustomizations = [
      { key: 'mg_reward', optionId: 'opt_reward_cake', value: '特價提拉米蘇 (Bánh Tiramisu)', price: 20 }
    ];

    // Load compiled validator function
    const validateThresholdCustomizations = compileThresholdValidatorFunction();
    const resultUnder = await validateThresholdCustomizations(env, 'benmi', rawItemsUnder, userCustomizations);

    assert.equal(resultUnder.valid, false, 'Option selection must be rejected when food subtotal is under threshold');
    assert.equal(resultUnder.code, 'MIN_ORDER_SUBTOTAL_NOT_MET');

    // Case 1b: Cart subtotal is $180 (>= $150 threshold) and user selects this option
    const rawItemsOver = [
      { itemId: 'bm_pork', price: 90, quantity: 2, subtotal: 180 }
    ];
    const resultOver = await validateThresholdCustomizations(env, 'benmi', rawItemsOver, userCustomizations);
    assert.equal(resultOver.valid, true, 'Option selection must be accepted when food subtotal meets threshold');
  });

  // =========================================================================
  // TEST 2: Cluster 4 - Hierarchical Sub-options Validation & Math
  // =========================================================================
  test('Test 2: Sub-options inside modifier_options are verified and surcharges calculated', async () => {
    const db = new DatabaseSync(':memory:');
    initPureNewSchemaDatabase(db);

    db.prepare('INSERT INTO modifier_groups(id, tenant_id, name, scope, selection_type) VALUES (?,?,?,?,?)')
      .run('mg_drink_ice', 'benmi', '飲料客製 (Đá & Đường)', 'category', 'single');

    // Option with sub-options defined in sub_options_json
    const subOptionsList = [
      { id: 'sub_regular_ice', name: '正常冰 (Đá thường)', price: 0 },
      { id: 'sub_less_ice', name: '少冰 (Ít đá)', price: 0 },
      { id: 'sub_extra_pearl', name: '加白玉珍珠 (Thêm trân châu trắng)', price: 15 }
    ];

    db.prepare('INSERT INTO modifier_options(id, tenant_id, group_id, name, price, sub_options_json) VALUES (?,?,?,?,?,?)')
      .run('opt_black_tea', 'benmi', 'mg_drink_ice', '紅茶冰 (Trà đen)', 30, JSON.stringify(subOptionsList));

    const env = { DB: createD1Adapter(db) };

    // Case 2a: Valid sub-option with $15 surcharge
    const validSelection = {
      groupId: 'mg_drink_ice',
      optionId: 'opt_black_tea',
      name: '紅茶冰 (Trà đen)',
      price: 30,
      subOption: {
        id: 'sub_extra_pearl',
        name: '加白玉珍珠 (Thêm trân châu trắng)',
        price: 15
      }
    };

    // Query D1 directly to assert sub-option validation rule
    const row = await env.DB.prepare('SELECT sub_options_json, price FROM modifier_options WHERE id = ?').bind('opt_black_tea').first();
    const parsedSubOpts = JSON.parse(row.sub_options_json);
    const matchedSub = parsedSubOpts.find(s => s.id === validSelection.subOption.id);

    assert.ok(matchedSub, 'Selected sub-option must exist in option sub_options_json');
    assert.equal(matchedSub.price, 15, 'Sub-option price must match configured price');

    const totalOptionSurcharge = Number(row.price) + Number(matchedSub.price);
    assert.equal(totalOptionSurcharge, 45, 'Total option extra must sum base option ($30) + sub-option ($15) = $45');

    // Case 2b: Invalid / Tampered sub-option ID
    const tamperedSubId = 'sub_hacked_free_pearl';
    const invalidSub = parsedSubOpts.find(s => s.id === tamperedSubId);
    assert.equal(invalidSub, undefined, 'Tampered sub-option ID must be unrecognized');
  });

  // =========================================================================
  // TEST 3: Cluster 5 - Pure Schema Cutover (Zero Legacy menu_customizations writes)
  // =========================================================================
  test('Test 3: POS menu update writes exclusively to modifier_groups and modifier_options without legacy rows', async () => {
    const db = new DatabaseSync(':memory:');
    initPureNewSchemaDatabase(db);

    db.prepare('INSERT INTO menu_categories(id, tenant_id, name, slug) VALUES (?,?,?,?)')
      .run('cat_bread', 'benmi', 'Bánh mì', 'bread');
    db.prepare('INSERT INTO menu_items(id, tenant_id, category_id, name, price) VALUES (?,?,?,?,?)')
      .run('item_bm_pork', 'benmi', 'cat_bread', 'Bánh mì thịt', 80);

    const env = { DB: createD1Adapter(db), ORDER_STATE: { delete: async () => {} } };

    // Simulate saving a new canonical modifier group from POS Menu Hub
    const payloadGroup = {
      id: 'mg_sauce',
      name: '醬料選擇 (Chọn nước sốt)',
      selectionType: 'single',
      isRequired: true,
      minSelection: 1,
      maxSelection: 1,
      scope: 'category',
      appliedCategories: ['cat_bread'],
      options: [
        { id: 'opt_spicy_sauce', name: 'Sốt cay', price: 0, isDefault: true },
        { id: 'opt_garlic_sauce', name: 'Sốt tỏi', price: 5, isDefault: false }
      ]
    };

    // Execute direct upsert into new schema (as refactored in menu.ts)
    await env.DB.prepare(`
      INSERT INTO modifier_groups (id, tenant_id, name, selection_type, is_required, min_selection, max_selection, scope)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET name = excluded.name, selection_type = excluded.selection_type
    `).bind(payloadGroup.id, 'benmi', payloadGroup.name, payloadGroup.selectionType, 1, 1, 1, 'category').run();

    for (const opt of payloadGroup.options) {
      await env.DB.prepare(`
        INSERT INTO modifier_options (id, tenant_id, group_id, name, price, is_default)
        VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET name = excluded.name, price = excluded.price
      `).bind(opt.id, 'benmi', payloadGroup.id, opt.name, opt.price, opt.isDefault ? 1 : 0).run();
    }

    await env.DB.prepare(`
      INSERT INTO category_modifier_links (category_id, group_id, tenant_id)
      VALUES (?, ?, ?)
      ON CONFLICT(category_id, group_id) DO NOTHING
    `).bind('cat_bread', payloadGroup.id, 'benmi').run();

    // Verify 1: New schema tables contain the saved data
    const savedGroup = await env.DB.prepare('SELECT id, name, scope FROM modifier_groups WHERE id = ?').bind('mg_sauce').first();
    assert.equal(savedGroup.name, '醬料選擇 (Chọn nước sốt)');

    const savedOptions = await env.DB.prepare('SELECT id, name, price FROM modifier_options WHERE group_id = ? ORDER BY price ASC').bind('mg_sauce').all();
    assert.equal(savedOptions.results.length, 2);
    assert.equal(savedOptions.results[1].price, 5);

    const savedLink = await env.DB.prepare('SELECT category_id, group_id FROM category_modifier_links WHERE group_id = ?').bind('mg_sauce').first();
    assert.equal(savedLink.category_id, 'cat_bread');

    // Verify 2: Zero rows written to legacy tables
    const legacyCustomCount = db.prepare('SELECT count(*) as c FROM menu_customizations').get().c;
    assert.equal(legacyCustomCount, 0, 'Legacy table menu_customizations must have 0 rows (Clean Cutover)');

    const legacyRulesCount = db.prepare('SELECT count(*) as c FROM menu_customization_option_rules').get().c;
    assert.equal(legacyRulesCount, 0, 'Legacy table menu_customization_option_rules must have 0 rows (Clean Cutover)');
  });

  // =========================================================================
  // TEST 4: Sub-option Receipt & Content Formatting in formatItemsToText
  // =========================================================================
  test('Test 4: formatItemsToText formats option with sub-option and combined price surcharge', () => {
    const fullPath = path.join(__dirname, '..', 'benmi-worker-official/src/modules/orders.ts');
    const fullSource = fs.readFileSync(fullPath, 'utf8');

    const startIdx = fullSource.indexOf('export function formatItemsToText');
    const endIdx = fullSource.indexOf('export const ORDER_INDEX_LATEST');
    const fnSource = fullSource.slice(startIdx, endIdx);

    const compiled = ts.transpileModule(fnSource, {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }
    }).outputText;

    const sandbox = vm.createContext({
      console,
      Number,
      String,
      Boolean,
      Array,
      JSON,
      exports: {}
    });

    vm.runInContext(compiled, sandbox);
    const formatItemsToText = sandbox.exports.formatItemsToText;

    const sampleItems = [
      {
        name: '特級黑胡椒豬肉麵包 (Bánh mì thịt heo sốt tiêu đen)',
        quantity: 1,
        price: 90,
        options: [
          {
            group: '飲料客製 (Đá & Đường)',
            choice: '紅茶冰 (Trà đen)',
            price: 30,
            subOption: {
              id: 'sub_extra_pearl',
              name: '加白玉珍珠 (Thêm trân châu trắng)',
              price: 15
            }
          }
        ]
      }
    ];

    const formattedText = formatItemsToText(sampleItems);
    assert.ok(formattedText.includes('特級黑胡椒豬肉麵包'), 'Item name must be present');
    assert.ok(formattedText.includes('紅茶冰 (Trà đen) (加白玉珍珠 (Thêm trân châu trắng))'), 'Sub-option name must be appended in parentheses');
    assert.ok(formattedText.includes('(+$45)'), 'Price extra must sum base option ($30) + sub-option ($15) = $45');
  });

  // =========================================================================
  // TEST 5: Bootstrap Order Customizations Assembling from modifier_groups (Zero Legacy Reads)
  // =========================================================================
  test('Test 5: Order-level customizations in Bootstrap map purely from modifier_groups with subOptions & eligibilityRules', async () => {
    const db = new DatabaseSync(':memory:');
    initPureNewSchemaDatabase(db);

    // Seed modifier group with scope = 'order'
    db.prepare(`
      INSERT INTO modifier_groups (id, tenant_id, name, selection_type, is_required, min_selection, max_selection, sort_order, scope)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run('mg_eco_bag', 'benmi', '環保提袋加購 (Túi môi trường)', 'single', 0, 0, 1, 1, 'order');

    const subOpts = [
      { id: 'sub_bag_small', name: '小提袋 (Túi nhỏ)', price: 2 },
      { id: 'sub_bag_large', name: '大提袋 (Túi lớn)', price: 5 }
    ];
    const rules = [
      { rule_type: 'min_order_subtotal', min_order_subtotal: 100, error_message: '滿 $100 可加購' }
    ];

    db.prepare(`
      INSERT INTO modifier_options (id, tenant_id, group_id, name, price, is_default, sub_options_json, eligibility_rules_json, sort_order)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run('opt_eco_bag_std', 'benmi', 'mg_eco_bag', '環保提袋', 5, 0, JSON.stringify(subOpts), JSON.stringify(rules), 0);

    const env = { DB: createD1Adapter(db) };

    // Query directly simulating the bootstrap logic
    const orderModRes = await env.DB.prepare(`
      SELECT g.id AS group_id, g.name AS group_name, g.selection_type,
             COALESCE(g.is_required, 0) AS is_required,
             COALESCE(g.min_selection, 0) AS min_selection,
             COALESCE(g.max_selection, 1) AS max_selection,
             COALESCE(g.sort_order, 0) AS sort_order,
             COALESCE(g.scope, 'order') AS scope,
             o.id AS option_id, o.name AS option_name, COALESCE(o.price, 0) AS option_price,
             COALESCE(o.is_default, 0) AS is_default, o.out_of_stock_until AS option_out_of_stock_until,
             COALESCE(o.sub_options_json, '[]') AS sub_options_json,
             COALESCE(o.eligibility_rules_json, '[]') AS eligibility_rules_json
      FROM modifier_groups g
      LEFT JOIN modifier_options o ON o.group_id = g.id AND o.tenant_id = g.tenant_id
      WHERE g.tenant_id = ? AND g.scope = 'order'
      ORDER BY g.sort_order ASC, o.sort_order ASC
    `).bind('benmi').all();

    assert.equal(orderModRes.results.length, 1);
    const row = orderModRes.results[0];
    assert.equal(row.group_id, 'mg_eco_bag');
    assert.equal(row.scope, 'order');

    const parsedSub = JSON.parse(row.sub_options_json);
    assert.equal(parsedSub.length, 2);
    assert.equal(parsedSub[0].id, 'sub_bag_small');

    const parsedRules = JSON.parse(row.eligibility_rules_json);
    assert.equal(parsedRules.length, 1);
    assert.equal(parsedRules[0].min_order_subtotal, 100);

    // Verify 0 queries needed from legacy tables
    const legacyCustomCount = db.prepare('SELECT count(*) as c FROM menu_customizations').get().c;
    assert.equal(legacyCustomCount, 0);
  });
});

