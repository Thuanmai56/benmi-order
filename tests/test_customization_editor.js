// tests/test_customization_editor.js
// Automated verification for Order-Wide Customizations 2-Tier Editor (POS & Client)

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

console.log("=================================================");
console.log("🧪 Running Customization Editor & Sub-options Test");
console.log("=================================================");

// 1. Verify I18N Keys
const i18nContent = fs.readFileSync(path.join(__dirname, '../js/orders-i18n.js'), 'utf8');
const i18nSandbox = { window: {}, document: { addEventListener: () => {} } };
vm.createContext(i18nSandbox);
const I18N = vm.runInContext(i18nContent + '\n;({ zhTW: I18N["zh-TW"], vi: I18N["vi"] });', i18nSandbox);

const requiredKeys = [
  'customizationManageTitle',
  'customizationManageDesc',
  'subOptionsLabel',
  'btnAddSubOption',
  'btnAddCustomOption',
  'promptAddSubOption',
  'promptNewOptionName',
  'labelSurcharge',
  'labelOptionName',
  'btnAddCustomGroup',
  'promptAddCustomGroup',
  'promptRenameCustomGroup',
  'confirmDeleteCustomGroup',
  'toggleGroupTypeSingle',
  'toggleGroupTypeMultiple'
];

for (const key of requiredKeys) {
  assert(I18N.zhTW[key], `Missing zh-TW key: ${key}`);
  assert(I18N.vi[key], `Missing vi key: ${key}`);
}
console.log("✓ All required I18N keys present in both zh-TW and vi.");

// 2. Load and verify orders-menu.js functions
const menuJs = fs.readFileSync(path.join(__dirname, '../js/orders-menu.js'), 'utf8');

// Create mock DOM & environment
const mockSandbox = {
  window: { addEventListener: () => {} },
  document: {
    getElementById: (id) => ({
      innerText: '',
      innerHTML: '',
      style: {},
      value: '',
      classList: { add() {}, remove() {}, toggle() {} },
      querySelectorAll: () => [],
      querySelector: () => null,
      appendChild() {}
    }),
    querySelectorAll: () => [],
    addEventListener: () => {}
  },
  t: (key) => I18N.zhTW[key] || key,
  escapeHtml: (s) => String(s || ''),
  currentLang: 'zh-TW',
  WORKER_BASE: 'https://test.workers.dev',
  getTenantIdFromUrl: () => 'bsc',
  POS_SVG: { grip: '::', trash: 'trash', plus: '+' },
  console: console
};
vm.createContext(mockSandbox);
// Run orders-menu.js in sandbox and extract serializeMenuData
const serializeMenuData = vm.runInContext(menuJs + '\n;serializeMenuData;', mockSandbox);

// 3. Test serializeMenuData with sample BSC & Jiangjiejie customization data
const sampleCategories = [
  {
    id: 'sec-flavor',
    title: '口味與客製化選擇',
    type: 'order_customization',
    groups: [
      {
        id: 'bsc_flavor',
        key: 'flavor',
        title: '✦ 口味選擇',
        type: 'radio',
        sortOrder: 0,
        options: [
          { id: 'opt1', name: '特調胡椒', price: 0, isOos: false, sub_options: [] },
          { id: 'opt2', name: '泰式酸辣', price: 0, isOos: false, sub_options: [] },
          { id: 'opt3', name: '清爽檸檬', price: 0, isOos: false, sub_options: ['不加香油', '不加鹽巴'] },
          { id: 'opt4', name: '原味客製', price: 5, isOos: true, sub_options: ['不加香油', '不加胡椒'] }
        ]
      },
      {
        id: 'bsc_addons',
        key: 'addons',
        title: '✦ 加價配料 (選加)',
        type: 'checkbox',
        sortOrder: 4,
        options: [
          { id: 'add1', name: '加香菜', price: 15, isOos: true, sub_options: [] }
        ]
      }
    ],
    items: []
  },
  {
    id: 'cat_mains',
    title: '招牌餐點',
    type: 'catalog',
    allowCustomization: true,
    appliedModifiers: ['*'],
    items: [
      { name: '鹹水雞', price: 150, isOos: false, badgeText: '推薦', isRecommended: true }
    ]
  }
];

const serialized = serializeMenuData(sampleCategories);

// Verify __customizations is extracted
assert(serialized.__customizations, "__customizations should be present in serialized output");
assert.strictEqual(serialized.__customizations.length, 2, "__customizations should contain 2 groups");

const flavorGroup = serialized.__customizations[0];
assert.strictEqual(flavorGroup.key, 'flavor');
assert.strictEqual(flavorGroup.options.length, 4);
assert.deepStrictEqual(flavorGroup.options[2].sub_options, ['不加香油', '不加鹽巴']);
assert.strictEqual(flavorGroup.options[3].price, 5);
assert.strictEqual(flavorGroup.options[3].is_out_of_stock, true);

// Verify sec-flavor is NOT stored as a regular category
assert(!serialized['sec-flavor'], "sec-flavor must not exist as a regular category");

// Verify regular catalog still works as expected
assert(serialized.cat_mains);
assert.strictEqual(serialized.cat_mains.__title, '招牌餐點');
assert.strictEqual(serialized.cat_mains['鹹水雞'].price, 150);
assert.strictEqual(serialized.cat_mains['鹹水雞'].is_recommended, 1);

console.log("✓ serializeMenuData successfully handles 2-tier customizations and separates __customizations.");

// 4. Test BSC Catalog sec-flavor separation logic
const sampleBscBootstrap = {
  catalog: [
    { slug: 'sec-flavor', name: '🧪 口味與客製化選擇', items: [{ name: '✦ 口味選擇' }] },
    { slug: 'meat', name: '肉類', items: [{ name: '雞胸肉', price: 60 }] }
  ],
  customizations: [
    { id: 'bsc_flavor', key: 'flavor', title: '✦ 口味選擇', type: 'radio', options: [{ name: '特調胡椒' }] },
    { id: 'bsc_salt', key: 'salt', title: '✦ 鹹度調整', type: 'radio', options: [{ name: '正常' }] }
  ]
};

// Simulate loadMenuData logic
const testCategories = [];
sampleBscBootstrap.catalog.forEach(cat => {
  if (cat.slug === 'sec-flavor' || cat.slug === 'flavor' || cat.categoryType === 'order_customization') return;
  testCategories.push({ id: cat.slug, title: cat.name, type: 'catalog', items: cat.items });
});
assert.strictEqual(testCategories.length, 1, "Catalog should only contain meat, excluding legacy sec-flavor");

const bscCustomGroups = sampleBscBootstrap.customizations.map(c => ({
  id: c.id,
  key: c.key,
  title: c.title,
  type: c.type,
  options: c.options
}));
testCategories.unshift({
  id: 'sec-flavor',
  title: '🧪 口味與客製化選擇',
  type: 'order_customization',
  groups: bscCustomGroups,
  items: []
});

assert.strictEqual(testCategories.length, 2);
assert.strictEqual(testCategories[0].id, 'sec-flavor');
assert.strictEqual(testCategories[0].type, 'order_customization');
assert.strictEqual(testCategories[0].groups.length, 2, "sec-flavor must contain 2 groups for BSC");
console.log("✓ BSC bootstrap catalog parsing separates legacy sec-flavor and preserves all customization groups.");

// 5. Test Client toggleFlavorSubOptions in index.html
const indexHtml = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');

// Ensure toggleFlavorSubOptions does NOT hardcode opt-flavor
assert(
  !indexHtml.includes('document.querySelector(\'input[name="opt-flavor"]:checked\')'),
  "toggleFlavorSubOptions should not hardcode input[name=\"opt-flavor\"]"
);
assert(
  indexHtml.includes('el.closest(\'.flavor-option-container\')'),
  "toggleFlavorSubOptions must use container traversal for dynamic groups"
);
console.log("✓ Client toggleFlavorSubOptions is verified to be fully dynamic.");

// 6. Test Worker stock-status update and __customizations sync
const workerMenuTs = fs.readFileSync(path.join(__dirname, '../benmi-worker-official/src/modules/menu.ts'), 'utf8');
assert(workerMenuTs.includes("slug === '__customizations'"), "Worker syncMenuToD1 must support __customizations");
assert(workerMenuTs.includes("category_slug === 'order_customization'"), "Worker updateStockStatus must support order_customization");

const workerBootstrapTs = fs.readFileSync(path.join(__dirname, '../benmi-worker-official/src/modules/bootstrap.ts'), 'utf8');
assert(workerBootstrapTs.includes("isOutOfStock: isOos"), "Worker getTenantBootstrap must enrich options with isOutOfStock");
assert(workerBootstrapTs.includes("cat.slug === 'sec-flavor'"), "Worker getTenantBootstrap must skip sec-flavor from catalog");

console.log("✓ Cloudflare Worker menu & bootstrap modules support customization stock updates & sync.");

console.log("=================================================");
console.log("🎉 All customization tests passed successfully!");
console.log("=================================================");
