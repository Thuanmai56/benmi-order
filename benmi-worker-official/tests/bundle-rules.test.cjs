const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const Module = require('node:module');
const path = require('node:path');
const ts = require('typescript');

const sourcePath = path.join(__dirname, '../src/modules/bundle-rules.ts');
const source = fs.readFileSync(sourcePath, 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const bundleModule = new Module(sourcePath);
bundleModule.filename = sourcePath;
bundleModule.paths = Module._nodeModulePaths(path.dirname(sourcePath));
bundleModule._compile(compiled, sourcePath);
const { normalizeBundleConfig, validateBundleOrderItems } = bundleModule.exports;

const items = [
  { id: 'combo', category_id: 'meals', name: 'Combo', price: 100 },
  { id: 'food', category_id: 'meals', name: 'Food', price: 60 },
  { id: 'tea', category_id: 'drinks', name: 'Tea', price: 40 },
  { id: 'milk', category_id: 'drinks', name: 'Milk tea', price: 50 }
];
const categories = [
  { id: 'meals', slug: 'meals', category_type: 'catalog', allow_customization: 0, applied_modifiers: '[]' },
  { id: 'drinks', slug: 'drinks', category_type: 'catalog', allow_customization: 1, applied_modifiers: '["sweetness"]' }
];
const modifierOptions = [
  { group_id: 'sweetness', group_slug: 'sweetness', option_id: 'half', name: 'Half sugar', price: 5, is_required: 1, min_selection: 1, max_selection: 1 },
  { group_id: 'sweetness', group_slug: 'sweetness', option_id: 'none', name: 'No sugar', price: 0, is_required: 1, min_selection: 1, max_selection: 1 }
];
const rule = {
  version: 2,
  groups: [
    { id: 'main', type: 'fixed', label: { 'zh-TW': '主餐', vi: 'Món chính' }, items: [{ itemId: 'food', quantity: 1, surcharge: 0 }], minQuantity: 1, maxQuantity: 1 },
    { id: 'drink', type: 'choice', label: { 'zh-TW': '飲料', vi: 'Nước' }, sources: [{ type: 'item_list', itemIds: ['tea', 'milk'] }], minQuantity: 1, maxQuantity: 1, allowRepeats: false, surcharges: { milk: 10 } }
  ]
};

function mockEnv(activeRule = rule) {
  return { DB: {
    prepare(sql) { return { bind() { return { async all() { return { results: sql.includes('JOIN menu_items') ? modifierOptions : [] }; } }; } }; },
    async batch() { return [{ results: items }, { results: [{ parent_item_id: 'combo', config_json: JSON.stringify(activeRule) }] }, { results: categories }]; }
  } };
}

function makeOrder() {
  return [{ itemId: 'combo', name: 'Combo', quantity: 1, price: 100, subtotal: 115,
    bundleSelections: { portions: [{ portionIndex: 0, groups: [
      { groupId: 'main', items: [{ itemId: 'food', name: 'Forged', quantity: 1 }] },
      { groupId: 'drink', items: [{ itemId: 'milk', name: 'Forged', quantity: 1, modifiers: [{ groupId: 'sweetness', optionId: 'half', name: 'Fake price', price: 0 }] }] }
    ] }] } }];
}

test('v2 config accepts fixed and choice groups with separate translations', () => {
  const allowed = new Map(items.slice(1).map(item => [item.id, item]));
  const result = normalizeBundleConfig(rule, allowed, 'combo');
  assert.equal(result.groups[0].type, 'fixed');
  assert.equal(result.groups[1].label.vi, 'Nước');
  assert.equal(result.groups[1].surcharges.milk, 10);
});

test('validates every group and canonicalizes child names and modifier prices', async () => {
  const order = makeOrder();
  assert.deepEqual(await validateBundleOrderItems(mockEnv(), 'tenant', order), { valid: true });
  assert.equal(order[0].bundleSelections.portions[0].groups[1].items[0].name, 'Milk tea');
  assert.equal(order[0].bundleSelections.portions[0].groups[1].items[0].modifiers[0].price, 5);
});

test('rejects a missing second group', async () => {
  const order = makeOrder();
  order[0].bundleSelections.portions[0].groups.pop();
  const result = await validateBundleOrderItems(mockEnv(), 'tenant', order);
  assert.equal(result.valid, false);
  assert.equal(result.code, 'BUNDLE_INVALID_GROUPS');
});

test('rejects stale prices and invalid child ids', async () => {
  const stale = makeOrder();
  stale[0].subtotal = 100;
  assert.equal((await validateBundleOrderItems(mockEnv(), 'tenant', stale)).code, 'BUNDLE_PRICE_CHANGED');
  const foreign = makeOrder();
  foreign[0].bundleSelections.portions[0].groups[1].items[0].itemId = 'other-tenant-item';
  assert.equal((await validateBundleOrderItems(mockEnv(), 'tenant', foreign)).code, 'BUNDLE_INVALID_CHILD');
});

test('rejects duplicate fixed items before saving a rule', () => {
  const allowed = new Map(items.slice(1).map(item => [item.id, item]));
  const duplicate = structuredClone(rule);
  duplicate.groups[0].items.push({ itemId: 'food', quantity: 1, surcharge: 0 });
  assert.throws(() => normalizeBundleConfig(duplicate, allowed, 'combo'), /BUNDLE_DUPLICATE_FIXED_ITEM/);
});

test('rejects an orphaned bundle snapshot instead of accepting it as a plain item', async () => {
  const order = makeOrder();
  order[0].itemId = 'deleted-combo';
  assert.equal((await validateBundleOrderItems(mockEnv(), 'tenant', order)).code, 'BUNDLE_RULE_NOT_FOUND');
});

test('two portions keep their own modifier selections and charge each once', async () => {
  const order = makeOrder();
  const second = structuredClone(order[0].bundleSelections.portions[0]);
  second.portionIndex = 1;
  second.groups[1].items[0].itemId = 'tea';
  second.groups[1].items[0].modifiers = [{ groupId: 'sweetness', optionId: 'none', name: 'No sugar', price: 0 }];
  order[0].bundleSelections.portions.push(second);
  order[0].quantity = 2;
  order[0].subtotal = 215;
  const result = await validateBundleOrderItems(mockEnv(), 'tenant', order);
  assert.deepEqual(result, { valid: true });
  assert.equal(order[0].subtotal, 215);
  assert.equal(order[0].bundleSelections.portions[0].groups[1].items[0].modifiers.length, 1);
  assert.equal(order[0].bundleSelections.portions[1].groups[1].items[0].modifiers[0].optionId, 'none');
});

test('rejects modifier choices absent from the tenant catalog', async () => {
  const order = makeOrder();
  order[0].bundleSelections.portions[0].groups[1].items[0].modifiers[0].optionId = 'foreign-option';
  assert.equal((await validateBundleOrderItems(mockEnv(), 'tenant', order)).code, 'BUNDLE_MODIFIER_NOT_ALLOWED');
});

test('reads a version-one choice group without forcing new modifier requirements', async () => {
  const oldRule = { version: 1, groups: [{ id: 'old-side', name: '配菜', minQuantity: 1, maxQuantity: 1,
    sources: [{ type: 'item_list', itemIds: ['tea'] }] }] };
  const order = [{ itemId: 'combo', quantity: 1, subtotal: 100,
    bundleSelections: { portions: [{ groups: [{ groupId: 'old-side', items: [{ itemId: 'tea', quantity: 1, price: 40 }] }] }] } }];
  assert.deepEqual(await validateBundleOrderItems(mockEnv(oldRule), 'tenant', order), { valid: true });
  assert.equal(order[0].bundleSelections.portions[0].groups[0].items[0].price, 0);
});
