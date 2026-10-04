const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function setupFrontendSandbox(fixtureBootstrap) {
    const mockWindow = {
        location: { hostname: 'localhost', search: '' },
        addEventListener: () => {},
        removeEventListener: () => {},
        bootstrapData: fixtureBootstrap || {},
        cart: {},
        customizeData: {},
        comboDrinkData: {},
        currentDiningOption: 'takeout'
    };
    mockWindow.window = mockWindow;

    const sandbox = {
        window: mockWindow,
        location: mockWindow.location,
        document: {
            createElement: (tag) => {
                const el = {
                    tagName: tag.toUpperCase(),
                    className: '',
                    style: {},
                    innerHTML: '',
                    innerText: '',
                    attributes: {},
                    children: [],
                    classList: {
                        _classes: new Set(),
                        add(c) { this._classes.add(c); el.className = Array.from(this._classes).join(' '); },
                        remove(c) { this._classes.delete(c); el.className = Array.from(this._classes).join(' '); },
                        contains(c) { return this._classes.has(c); }
                    },
                    setAttribute(k, v) { this.attributes[k] = String(v); },
                    getAttribute(k) { return this.attributes[k]; },
                    appendChild(child) { this.children.push(child); return child; },
                    querySelectorAll(sel) {
                        const results = [];
                        function traverse(node) {
                            if (!node || typeof node !== 'object') return;
                            const isMatch = (
                                (sel === '.modifier-pill' && node.className && node.className.includes('modifier-pill')) ||
                                (sel === '.modifier-checkbox-chip' && node.className && node.className.includes('modifier-checkbox-chip')) ||
                                (sel === '.sub-option-chip' && node.className && node.className.includes('sub-option-chip')) ||
                                (sel === '.portion-tab-btn' && node.className && node.className.includes('portion-tab-btn')) ||
                                (sel === '.btn-customize-confirm' && node.className && node.className.includes('btn-customize-confirm'))
                            );
                            if (isMatch) results.push(node);
                            if (Array.isArray(node.children)) {
                                node.children.forEach(traverse);
                            }
                        }
                        traverse(this);
                        return results;
                    },
                    querySelector(sel) {
                        return this.querySelectorAll(sel)[0] || null;
                    },
                    remove() {}
                };
                return el;
            },
            getElementById: () => null,
            querySelectorAll: () => [],
            body: {
                style: {},
                classList: {
                    add: () => {},
                    remove: () => {},
                    contains: () => false
                },
                appendChild: () => {}
            },
            documentElement: {
                style: {},
                classList: {
                    add: () => {},
                    remove: () => {},
                    contains: () => false
                }
            }
        },
        sessionStorage: {
            _store: {},
            getItem(k) { return this._store[k] || null; },
            setItem(k, v) { this._store[k] = String(v); },
            removeItem(k) { delete this._store[k]; }
        },
        localStorage: {
            _store: {},
            getItem(k) { return this._store[k] || null; },
            setItem(k, v) { this._store[k] = String(v); },
            removeItem(k) { delete this._store[k]; }
        },
        console: console,
        setTimeout: () => {},
        clearTimeout: () => {},
        setInterval: () => {},
        clearInterval: () => {},
        alert: () => {},
        customAlert: () => {},
        bootstrapData: fixtureBootstrap || {},
        cart: {},
        customizeData: {},
        comboDrinkData: {},
        currentDiningOption: 'takeout'
    };
    sandbox.addEventListener = () => {};
    sandbox.removeEventListener = () => {};
    sandbox.URLSearchParams = globalThis.URLSearchParams;
    if (sandbox.document) {
        sandbox.document.addEventListener = () => {};
        sandbox.document.removeEventListener = () => {};
    }
    vm.createContext(sandbox);

    const clientCoreCode = fs.readFileSync(path.join(__dirname, '../js/client-core.js'), 'utf8');
    const clientCustCode = fs.readFileSync(path.join(__dirname, '../js/client-customizations.js'), 'utf8');
    const bundleBuilderCode = fs.readFileSync(path.join(__dirname, '../js/bundle-builder-v2.js'), 'utf8');
    const clientCheckoutCode = fs.readFileSync(path.join(__dirname, '../js/client-checkout.js'), 'utf8');

    vm.runInContext(clientCoreCode, sandbox);
    vm.runInContext(clientCustCode, sandbox);
    vm.runInContext(bundleBuilderCode, sandbox);
    vm.runInContext(clientCheckoutCode, sandbox);

    return sandbox;
}

test('Collision Test Suite: Same-Name Customization Options Isolation', async (t) => {

    await t.test('1. getUniqueModifierOptionId produces deterministic and unique IDs', () => {
        const sandbox = setupFrontendSandbox();
        const mod = { id: 'mg_spice', slug: 'spice', name: '辣度' };
        const optWithId = { id: 'opt_spicy_low', name: '微辣' };
        const optNoId1 = { name: '微辣' };
        const optNoId2 = { name: '微辣' };

        const idWithId = vm.runInContext(`getUniqueModifierOptionId(${JSON.stringify(mod)}, ${JSON.stringify(optWithId)}, 0)`, sandbox);
        const idNoId1 = vm.runInContext(`getUniqueModifierOptionId(${JSON.stringify(mod)}, ${JSON.stringify(optNoId1)}, 0)`, sandbox);
        const idNoId2 = vm.runInContext(`getUniqueModifierOptionId(${JSON.stringify(mod)}, ${JSON.stringify(optNoId2)}, 1)`, sandbox);

        assert.equal(idWithId, 'opt_spicy_low', 'Option with id should use opt.id directly');
        assert.equal(idNoId1, 'mg_spice:微辣:0', 'Option without id should use groupKey:name:index');
        assert.equal(idNoId2, 'mg_spice:微辣:1', 'Sibling option without id with same name should have unique index-based ID');
        assert.notEqual(idNoId1, idNoId2, 'Two sibling options with identical name must have different IDs');
    });

    await t.test('2. Single selection: selecting one same-named option does NOT select sibling options', () => {
        const mod = {
            id: 'mg_extra_egg',
            slug: 'extra_egg',
            name: '加蛋方式',
            selectionType: 'single',
            options: [
                { id: 'opt_egg_1', name: '半熟', price: 10 },
                { id: 'opt_egg_2', name: '半熟', price: 15 } // Same name, different spec/price
            ]
        };

        const sandbox = setupFrontendSandbox();

        // Draft selecting the second option 'opt_egg_2'
        const draft = {
            single: {
                extra_egg: 'opt_egg_2'
            },
            selectedDetails: {
                opt_egg_2: { id: 'opt_egg_2', name: '半熟', price: 15, groupId: 'mg_extra_egg' }
            }
        };

        const isOpt1Selected = vm.runInContext(`isOptionSelectedInSingle(${JSON.stringify(draft)}, ${JSON.stringify(mod)}, ${JSON.stringify(mod.options[0])}, 0)`, sandbox);
        const isOpt2Selected = vm.runInContext(`isOptionSelectedInSingle(${JSON.stringify(draft)}, ${JSON.stringify(mod)}, ${JSON.stringify(mod.options[1])}, 1)`, sandbox);

        assert.equal(isOpt1Selected, false, 'First option with same name must NOT be selected');
        assert.equal(isOpt2Selected, true, 'Second option with same name MUST be selected');
    });

    await t.test('3. Multiple selection: toggling one same-named chip does NOT toggle siblings and counts accurately', () => {
        const mod = {
            id: 'mg_toppings',
            slug: 'toppings',
            name: '加配料',
            selectionType: 'multiple',
            minSelection: 1,
            maxSelection: 2,
            options: [
                { id: 'opt_boba_1', name: '珍珠', price: 10 },
                { id: 'opt_boba_2', name: '珍珠', price: 15 } // Same name, different size/price
            ]
        };

        const sandbox = setupFrontendSandbox();

        // Select only opt_boba_1
        const draft1 = {
            multiple: {
                opt_boba_1: true
            },
            selectedDetails: {
                opt_boba_1: { id: 'opt_boba_1', name: '珍珠', price: 10, groupId: 'mg_toppings' }
            }
        };

        const isBoba1Selected = vm.runInContext(`isOptionSelectedInMultiple(${JSON.stringify(draft1)}, ${JSON.stringify(mod)}, ${JSON.stringify(mod.options[0])}, 0)`, sandbox);
        const isBoba2Selected = vm.runInContext(`isOptionSelectedInMultiple(${JSON.stringify(draft1)}, ${JSON.stringify(mod)}, ${JSON.stringify(mod.options[1])}, 1)`, sandbox);

        assert.equal(isBoba1Selected, true, 'Clicked option 1 is selected');
        assert.equal(isBoba2Selected, false, 'Sibling option 2 with same name is NOT selected');

        const valRes1 = vm.runInContext(`validateModifierDraft([${JSON.stringify(mod)}], ${JSON.stringify(draft1)})`, sandbox);
        assert.equal(valRes1.valid, true, '1 option selected meets minSelection 1 and maxSelection 2 without double-counting');

        // Now select BOTH opt_boba_1 and opt_boba_2
        const draft2 = {
            multiple: {
                opt_boba_1: true,
                opt_boba_2: true
            },
            selectedDetails: {
                opt_boba_1: { id: 'opt_boba_1', name: '珍珠', price: 10, groupId: 'mg_toppings' },
                opt_boba_2: { id: 'opt_boba_2', name: '珍珠', price: 15, groupId: 'mg_toppings' }
            }
        };

        const valRes2 = vm.runInContext(`validateModifierDraft([${JSON.stringify(mod)}], ${JSON.stringify(draft2)})`, sandbox);
        assert.equal(valRes2.valid, true, 'Both selected correctly counted as 2');
    });

    await t.test('4. Cross-group isolation: same option name across two different modifier groups do not cross-select', () => {
        const groupA = {
            id: 'mg_drink_sugar',
            slug: 'drink_sugar',
            name: '飲料甜度',
            selectionType: 'single',
            options: [
                { id: 'opt_sugar_half', name: '半糖', price: 0 }
            ]
        };
        const groupB = {
            id: 'mg_jelly_sugar',
            slug: 'jelly_sugar',
            name: '茶凍甜度',
            selectionType: 'multiple',
            options: [
                { id: 'opt_jelly_half', name: '半糖', price: 5 } // Same name "半糖" in another group
            ]
        };

        const sandbox = setupFrontendSandbox();

        // User selected "半糖" only in Group A
        const draft = {
            single: {
                drink_sugar: 'opt_sugar_half'
            },
            multiple: {},
            selectedDetails: {
                opt_sugar_half: { id: 'opt_sugar_half', name: '半糖', price: 0, groupId: 'mg_drink_sugar' }
            }
        };

        const isGroupASelected = vm.runInContext(`isOptionSelectedInSingle(${JSON.stringify(draft)}, ${JSON.stringify(groupA)}, ${JSON.stringify(groupA.options[0])}, 0)`, sandbox);
        const isGroupBSelected = vm.runInContext(`isOptionSelectedInMultiple(${JSON.stringify(draft)}, ${JSON.stringify(groupB)}, ${JSON.stringify(groupB.options[0])}, 0)`, sandbox);

        assert.equal(isGroupASelected, true, 'Group A option 半糖 must be selected');
        assert.equal(isGroupBSelected, false, 'Group B option 半糖 in another group must NOT be selected');
    });

    await t.test('5. Surcharge calculation: calculatePortionExtra uses selectedDetails for accurate independent prices', () => {
        const fixture = {
            catalog: [
                {
                    id: 'cat_bread',
                    slug: 'bread',
                    name: '法國麵包',
                    items: [
                        {
                            id: 'item_pork',
                            name: '烤肉麵包',
                            price: 80,
                            modifierGroups: [
                                {
                                    id: 'mg_adds',
                                    slug: 'adds',
                                    name: '配料加購',
                                    selectionType: 'multiple',
                                    options: [
                                        { id: 'opt_cheese_small', name: '起司', price: 10 },
                                        { id: 'opt_cheese_double', name: '起司', price: 20 }
                                    ]
                                }
                            ]
                        }
                    ]
                }
            ]
        };

        const sandbox = setupFrontendSandbox(fixture);

        // Case A: Only small cheese selected (10)
        const portionA = {
            multiple: { opt_cheese_small: true },
            selectedDetails: {
                opt_cheese_small: { id: 'opt_cheese_small', name: '起司', price: 10, groupId: 'mg_adds' }
            }
        };
        const extraA = vm.runInContext(`calculatePortionExtra('bread_烤肉麵包', ${JSON.stringify(portionA)})`, sandbox);
        assert.equal(extraA, 10, 'Small cheese should calculate +10 extra');

        // Case B: Only double cheese selected (20)
        const portionB = {
            multiple: { opt_cheese_double: true },
            selectedDetails: {
                opt_cheese_double: { id: 'opt_cheese_double', name: '起司', price: 20, groupId: 'mg_adds' }
            }
        };
        const extraB = vm.runInContext(`calculatePortionExtra('bread_烤肉麵包', ${JSON.stringify(portionB)})`, sandbox);
        assert.equal(extraB, 20, 'Double cheese should calculate +20 extra without collision on name');

        // Case C: Both selected (10 + 20 = 30)
        const portionC = {
            multiple: { opt_cheese_small: true, opt_cheese_double: true },
            selectedDetails: {
                opt_cheese_small: { id: 'opt_cheese_small', name: '起司', price: 10, groupId: 'mg_adds' },
                opt_cheese_double: { id: 'opt_cheese_double', name: '起司', price: 20, groupId: 'mg_adds' }
            }
        };
        const extraC = vm.runInContext(`calculatePortionExtra('bread_烤肉麵包', ${JSON.stringify(portionC)})`, sandbox);
        assert.equal(extraC, 30, 'Both cheeses should calculate +30 extra');
    });

    await t.test('6. Backwards compatibility: legacy cart payload without IDs parses safely', () => {
        const fixture = {
            catalog: [
                {
                    id: 'cat_bread',
                    slug: 'bread',
                    name: '法國麵包',
                    items: [
                        {
                            id: 'item_chicken',
                            name: '雞肉麵包',
                            price: 85,
                            modifierGroups: [
                                {
                                    id: 'mg_spicy',
                                    slug: 'spicy',
                                    name: '辣度',
                                    selectionType: 'single',
                                    options: [
                                        { id: 'opt_spicy_0', name: '不辣', price: 0 },
                                        { id: 'opt_spicy_1', name: '小辣', price: 0 }
                                    ]
                                },
                                {
                                    id: 'mg_topping',
                                    slug: 'topping',
                                    name: '加料',
                                    selectionType: 'multiple',
                                    options: [
                                        { id: 'opt_egg', name: '加蛋', price: 10 }
                                    ]
                                }
                            ]
                        }
                    ]
                }
            ]
        };

        const sandbox = setupFrontendSandbox(fixture);

        // Pure legacy portion stored in localStorage by old client
        const legacyPortion = {
            single: { spicy: '小辣' },
            multiple: { '加蛋': true },
            note: '不加香菜'
        };

        const extra = vm.runInContext(`calculatePortionExtra('bread_雞肉麵包', ${JSON.stringify(legacyPortion)})`, sandbox);
        assert.equal(extra, 10, 'Legacy portion extra must compute 10 for 加蛋');

        const modGroups = vm.runInContext(`getItemModifiers('bread', '雞肉麵包')`, sandbox);
        const valRes = vm.runInContext(`validateModifierDraft(${JSON.stringify(modGroups)}, ${JSON.stringify(legacyPortion)})`, sandbox);
        assert.equal(valRes.valid, true, 'Legacy portion validates correctly with validateModifierDraft');
    });

    await t.test('7. Structured cart and order summary text: identical option names produce distinct structured options and accurate summary', () => {
        const fixture = {
            catalog: [
                {
                    id: 'cat_bread',
                    slug: 'bread',
                    name: '法國麵包',
                    items: [
                        {
                            id: 'item_beef',
                            name: '牛肉麵包',
                            price: 90,
                            modifierGroups: [
                                {
                                    id: 'mg_extra',
                                    slug: 'extra',
                                    name: '配料加購',
                                    selectionType: 'multiple',
                                    options: [
                                        { id: 'opt_cheese_regular', name: '起司', price: 10 },
                                        { id: 'opt_cheese_double', name: '起司', price: 20 }
                                    ]
                                }
                            ]
                        }
                    ]
                }
            ]
        };

        const sandbox = setupFrontendSandbox(fixture);

        // Set cart with 1x 'bread_牛肉麵包'
        // Both '起司' options selected (one $10, one $20)
        sandbox.cart['bread_牛肉麵包'] = 1;
        sandbox.window.cart['bread_牛肉麵包'] = 1;
        sandbox.customizeData['bread_牛肉麵包'] = [
            {
                selectedDetails: {
                    opt_cheese_regular: { id: 'opt_cheese_regular', name: '起司', price: 10, groupId: 'mg_extra', groupName: '配料加購' },
                    opt_cheese_double: { id: 'opt_cheese_double', name: '起司', price: 20, groupId: 'mg_extra', groupName: '配料加購' }
                }
            }
        ];
        sandbox.window.customizeData['bread_牛肉麵包'] = sandbox.customizeData['bread_牛肉麵包'];

        const structured = vm.runInContext(`buildStructuredCartItems()`, sandbox);
        assert.equal(structured.length, 1, 'Should produce 1 structured item');
        assert.equal(structured[0].name, '牛肉麵包');
        assert.equal(structured[0].price, 90);
        assert.equal(structured[0].subtotal, 120, 'Subtotal should be 90 + 10 + 20 = 120');
        assert.equal(structured[0].options.length, 2, 'Should have 2 distinct options even with same name');
        assert.equal(structured[0].options[0].choice, '起司');
        assert.equal(structured[0].options[0].price, 10);
        assert.equal(structured[0].options[1].choice, '起司');
        assert.equal(structured[0].options[1].price, 20);

        // Verify formatAppendItemsOnlyText formats both options with correct distinct surcharges
        const appendText = vm.runInContext(`formatAppendItemsOnlyText()`, sandbox);
        assert.match(appendText, /起司 \(\+\$10\)/);
        assert.match(appendText, /起司 \(\+\$20\)/);
    });
});

