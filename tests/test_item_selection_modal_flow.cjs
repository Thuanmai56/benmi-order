const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

console.log('=== Running Item Selection Modal Flow Test Suite ===\n');

// Mock browser environment
const domMock = {
    elements: {},
    getElementById(id) {
        if (!this.elements[id]) {
            this.elements[id] = {
                id,
                style: {},
                classList: {
                    contains: () => false,
                    add: () => {},
                    remove: () => {}
                },
                innerText: '',
                textContent: '',
                innerHTML: '',
                appendChild: () => {},
                querySelectorAll: () => [],
                querySelector: () => null,
                addEventListener: () => {},
                setAttribute: () => {},
                getAttribute: () => null
            };
        }
        return this.elements[id];
    },
    querySelectorAll: () => [],
    querySelector: () => null,
    addEventListener: () => {},
    removeEventListener: () => {},
    createElement: (tag) => ({
        tagName: tag,
        style: {},
        classList: {
            contains: () => false,
            add: () => {},
            remove: () => {}
        },
        innerText: '',
        textContent: '',
        innerHTML: '',
        appendChild: () => {},
        querySelectorAll: () => [],
        querySelector: () => null,
        setAttribute: () => {},
        getAttribute: () => null,
        remove: () => {}
    }),
    body: {
        style: {},
        appendChild: () => {},
        removeChild: () => {}
    },
    documentElement: { style: {} }
};

const windowMock = {
    cart: {},
    customizeData: {},
    bundleCartData: {},
    comboDrinkData: {},
    bootstrapData: {
        catalog: [
            {
                slug: 'mains',
                name: '主食',
                allowCustomization: true,
                appliedModifiers: ['spice_level'],
                items: [
                    { id: 'item_noodles', name: '紅燒牛肉麵', price: 150 }
                ]
            },
            {
                slug: 'combos',
                name: '精選套餐',
                allowCustomization: true,
                appliedModifiers: ['spice_level'],
                items: [
                    {
                        id: 'item_combo_a',
                        name: 'A套餐 (牛肉麵+飲料)',
                        price: 180,
                        bundleRule: {
                            id: 'rule_combo_a',
                            version: 2,
                            groups: [
                                {
                                    id: 'g_drinks',
                                    name: '選擇飲料',
                                    type: 'single',
                                    minSelection: 1,
                                    maxSelection: 1,
                                    eligibleItems: [
                                        { id: 'drink_tea', name: '紅茶', surcharge: 0 },
                                        { id: 'drink_milk_tea', name: '奶茶', surcharge: 10 }
                                    ]
                                }
                            ]
                        }
                    }
                ]
            },
            {
                slug: 'snacks',
                name: '小點',
                allowCustomization: false,
                items: [
                    { id: 'item_egg', name: '滷蛋', price: 15 }
                ]
            }
        ],
        modifiers: [
            {
                id: 'spice_level',
                slug: 'spice_level',
                name: '辣度',
                selectionType: 'single',
                isRequired: true,
                options: [
                    { id: 'opt_no_spice', name: '不辣', price: 0, isDefault: true },
                    { id: 'opt_mild', name: '微辣', price: 0 },
                    { id: 'opt_spicy', name: '大辣', price: 5 }
                ]
            }
        ]
    },
    document: domMock,
    scrollTo: () => {},
    setTimeout: (fn) => fn(),
    clearTimeout: () => {},
    Number,
    Array,
    Object,
    String,
    Boolean,
    JSON,
    Math
};

windowMock.window = windowMock;
const ctx = vm.createContext(windowMock);

// Load client-customizations.js, client-cart.js, client-menu.js, bundle-builder-v2.js
const customizationsCode = fs.readFileSync(path.resolve(__dirname, '../js/client-customizations.js'), 'utf-8');
const menuCode = fs.readFileSync(path.resolve(__dirname, '../js/client-menu.js'), 'utf-8');
const builderCode = fs.readFileSync(path.resolve(__dirname, '../js/bundle-builder-v2.js'), 'utf-8');
const cartCode = fs.readFileSync(path.resolve(__dirname, '../js/client-cart.js'), 'utf-8');

vm.runInContext(customizationsCode, ctx);
vm.runInContext(menuCode, ctx);
vm.runInContext(builderCode, ctx);
vm.runInContext(cartCode, ctx);

let modalOpened = null;
ctx.openItemCustomizeModal = (category, origName, portionIndex) => {
    modalOpened = { type: 'customize', category, origName, portionIndex };
};
ctx.openBundleBuilderModal = (category, origName, portionIndex) => {
    modalOpened = { type: 'bundle', category, origName, portionIndex };
};
windowMock.openItemCustomizeModal = ctx.openItemCustomizeModal;
windowMock.openBundleBuilderModal = ctx.openBundleBuilderModal;

console.log('Test 1: Pure Customize item (紅燒牛肉麵) opens customize modal on card click and + click...');
modalOpened = null;
ctx.handleItemCardClick('mains', '紅燒牛肉麵', null);
assert.ok(modalOpened, 'Should open a modal');
assert.strictEqual(modalOpened.type, 'customize', 'Should open customize modal');
assert.strictEqual(modalOpened.origName, '紅燒牛肉麵');

modalOpened = null;
ctx.updateQty('mains', '紅燒牛肉麵', 1);
assert.ok(modalOpened, 'Should open a modal when clicking +');
assert.strictEqual(modalOpened.type, 'customize');
assert.strictEqual(ctx.cart['mains_紅燒牛肉麵'] || 0, 0, 'Cart should not increment until confirmed in modal');
console.log('✓ Pure Customize item correctly routed to customize modal.');

console.log('\nTest 2: Combined Combo + Customize item (A套餐) opens bundle builder modal...');
modalOpened = null;
ctx.handleItemCardClick('combos', 'A套餐 (牛肉麵+飲料)', null);
assert.ok(modalOpened, 'Should open a modal');
assert.strictEqual(modalOpened.type, 'bundle', 'Should open bundle builder modal');

modalOpened = null;
ctx.updateQty('combos', 'A套餐 (牛肉麵+飲料)', 1);
assert.ok(modalOpened, 'Should open bundle builder modal on +');
assert.strictEqual(modalOpened.type, 'bundle');
console.log('✓ Combined Combo item correctly routed to bundle builder modal.');

console.log('\nTest 3: Plain item with 0 options (滷蛋) directly increments cart (fast 1-tap add)...');
modalOpened = null;
ctx.handleItemCardClick('snacks', '滷蛋', null);
assert.strictEqual(modalOpened, null, 'Plain item should NOT open any modal');
assert.strictEqual(ctx.cart['snacks_滷蛋'], 1, 'Plain item cart should increment directly to 1');

ctx.updateQty('snacks', '滷蛋', 1);
assert.strictEqual(modalOpened, null, 'Plain item should NOT open any modal on +');
assert.strictEqual(ctx.cart['snacks_滷蛋'], 2, 'Plain item cart should increment directly to 2');
console.log('✓ Plain item adds to cart directly with zero modal overhead.');

console.log('\nTest 4: Verify combined combo item customization options detection...');
const itemMods = ctx.getItemModifiers('combos', 'A套餐 (牛肉麵+飲料)');
assert.ok(Array.isArray(itemMods) && itemMods.length > 0, 'Combo item should detect applied modifiers from category');
assert.strictEqual(itemMods[0].slug, 'spice_level');
console.log('✓ Combined Combo + Customize correctly detects spice_level modifier.');

console.log('\n✅ All Item Selection Modal Flow tests passed successfully!');
