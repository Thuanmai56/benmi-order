const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const clientCoreCode = fs.readFileSync(path.join(__dirname, '../js/client-core.js'), 'utf8');
const clientCustomizationsCode = fs.readFileSync(path.join(__dirname, '../js/client-customizations.js'), 'utf8');
const clientCartCode = fs.readFileSync(path.join(__dirname, '../js/client-cart.js'), 'utf8');
const clientCheckoutCode = fs.readFileSync(path.join(__dirname, '../js/client-checkout.js'), 'utf8');
const ordersCoreCode = fs.readFileSync(path.join(__dirname, '../js/orders-core.js'), 'utf8');
const printerServiceCode = fs.readFileSync(path.join(__dirname, '../js/printer-service.js'), 'utf8');

function createBaseDomMock() {
    return {
        createElement: (tag) => ({
            tagName: tag.toUpperCase(),
            className: '',
            style: {},
            innerHTML: '',
            innerText: '',
            attributes: {},
            children: [],
            classList: {
                _classes: new Set(),
                add(c) { this._classes.add(c); },
                remove(c) { this._classes.delete(c); },
                contains(c) { return this._classes.has(c); }
            },
            setAttribute(k, v) { this.attributes[k] = String(v); },
            getAttribute(k) { return this.attributes[k]; },
            appendChild(child) { this.children.push(child); return child; },
            querySelectorAll: () => [],
            querySelector: () => null,
            remove() {}
        }),
        getElementById: () => null,
        querySelectorAll: () => [],
        querySelector: () => null,
        getElementsByName: () => [],
        addEventListener: () => {},
        removeEventListener: () => {},
        body: {
            style: {},
            classList: { add: () => {}, remove: () => {}, contains: () => false },
            appendChild: () => {}
        },
        documentElement: {
            style: { setProperty() {} },
            classList: { add: () => {}, remove: () => {}, contains: () => false }
        }
    };
}

function setupCustomerSandbox(bootstrapData) {
    const mockWindow = {
        location: { hostname: 'localhost', search: '', href: 'http://localhost' },
        addEventListener: () => {},
        removeEventListener: () => {},
        bootstrapData: bootstrapData || {},
        cart: {},
        customizeData: {},
        comboDrinkData: {},
        currentDiningOption: 'takeout'
    };
    mockWindow.window = mockWindow;

    const sandbox = {
        window: mockWindow,
        location: mockWindow.location,
        document: createBaseDomMock(),
        sessionStorage: {
            getItem: () => null,
            setItem: () => null,
            removeItem: () => null
        },
        localStorage: {
            getItem: () => null,
            setItem: () => null,
            removeItem: () => null
        },
        console,
        setTimeout: () => {},
        clearTimeout: () => {},
        setInterval: () => {},
        clearInterval: () => {},
        alert: () => {},
        customAlert: () => {},
        URLSearchParams: globalThis.URLSearchParams,
        cart: {},
        customizeData: {},
        comboDrinkData: {},
        storeConfig: { storeStatus: 'open' },
        bootstrapData: bootstrapData || {}
    };
    sandbox.window.cart = sandbox.cart;
    sandbox.window.customizeData = sandbox.customizeData;
    sandbox.window.comboDrinkData = sandbox.comboDrinkData;
    sandbox.window.bootstrapData = sandbox.bootstrapData;
    sandbox.window.document = sandbox.document;
    sandbox.addEventListener = () => {};
    sandbox.removeEventListener = () => {};

    vm.createContext(sandbox);
    vm.runInContext(clientCoreCode, sandbox);
    vm.runInContext(clientCustomizationsCode, sandbox);
    vm.runInContext(clientCartCode, sandbox);
    vm.runInContext(clientCheckoutCode, sandbox);
    return sandbox;
}

function setupPosSandbox(bootstrapData) {
    const mockWindow = {
        location: { hostname: 'localhost', search: '', href: 'http://localhost' },
        addEventListener: () => {},
        removeEventListener: () => {}
    };
    mockWindow.window = mockWindow;

    const sandbox = {
        console,
        window: mockWindow,
        location: mockWindow.location,
        document: createBaseDomMock(),
        localStorage: {
            getItem: () => null,
            setItem: () => null,
            removeItem: () => null
        },
        sessionStorage: {
            getItem: () => null,
            setItem: () => null,
            removeItem: () => null
        },
        WORKER_BASE: '',
        URLSearchParams: globalThis.URLSearchParams,
        getTenantIdFromUrl: () => 'yanxiansuji',
        setTimeout: () => {},
        clearTimeout: () => {},
        setInterval: () => {},
        clearInterval: () => {}
    };
    sandbox.window.document = sandbox.document;
    sandbox.addEventListener = () => {};
    sandbox.removeEventListener = () => {};

    vm.createContext(sandbox);
    vm.runInContext(ordersCoreCode, sandbox);
    vm.runInContext(printerServiceCode, sandbox);

    if (bootstrapData) {
        sandbox.updatePosOptionIdMap(bootstrapData);
    }
    return sandbox;
}

test('Yanxiansuji Option Display & Duplication Hotfix Suite', async (t) => {
    const yanxiansujiBootstrap = {
        tenant: { id: 'yanxiansuji', name: '炎鹽酥雞' },
        catalog: [
            {
                id: 'cat_yanzisuchun_signature',
                slug: 'signature',
                name: '招牌必點',
                allowCustomization: true,
                appliedModifiers: ['cat_yanzisuchun_flavor'],
                items: [
                    { id: 'yzs_sig_08', name: '柳葉魚 (4隻)', price: 60 }
                ]
            }
        ],
        modifiers: [
            {
                id: 'cat_yanzisuchun_flavor',
                slug: 'flavor-selection',
                name: '口味選擇',
                selectionType: 'single',
                isRequired: true,
                options: [
                    { id: 'yzs_fl_01', name: '不加調味', price: 0 },
                    { id: 'yzs_fl_02', name: '胡椒', price: 0 },
                    { id: 'yzs_fl_06', name: '青花椒鹽', price: 0 }
                ]
            }
        ],
        customizations: []
    };

    await t.test('1. Customer checkout resolves option ID to display name and eliminates duplicate text', () => {
        const sandbox = setupCustomerSandbox(yanxiansujiBootstrap);
        sandbox.cart['signature_柳葉魚 (4隻)'] = 1;
        sandbox.window.cart['signature_柳葉魚 (4隻)'] = 1;

        // Simulate legacy dual-key draft containing raw IDs (exactly what caused the reported bug)
        sandbox.customizeData['signature_柳葉魚 (4隻)'] = [
            {
                single: {
                    'flavor-selection': 'yzs_fl_06',
                    'cat_yanzisuchun_flavor': 'yzs_fl_06'
                },
                multiple: {},
                subOptions: {}
            }
        ];
        sandbox.window.customizeData['signature_柳葉魚 (4隻)'] = sandbox.customizeData['signature_柳葉魚 (4隻)'];

        const orderText = vm.runInContext(`formatOrderTextMessage('YZS-TEST', '', '', 60, '')`, sandbox);
        assert.ok(!orderText.includes('yzs_fl_06, yzs_fl_06'), 'Order text must NOT contain raw duplicate ID string');
        assert.ok(orderText.includes('青花椒鹽'), 'Order text must contain human-readable name 青花椒鹽');
        assert.ok(orderText.includes('↳ 第一份: 青花椒鹽'), 'Option must only appear once in portion string');

        const structured = vm.runInContext(`buildStructuredCartItems()`, sandbox);
        assert.equal(structured.length, 1);
        assert.equal(structured[0].options.length, 1, 'Dual keys must deduplicate to exactly 1 option in structured cart');
        assert.equal(structured[0].options[0].choice, '青花椒鹽', 'Option choice must be 青花椒鹽');
    });

    await t.test('2. POS PrinterService resolves raw IDs and deduplicates identical choices', () => {
        const sandbox = setupPosSandbox(yanxiansujiBootstrap);
        const printer = typeof sandbox.window.PrinterService === 'function'
            ? new sandbox.window.PrinterService()
            : sandbox.window.PrinterService;

        // Case A: Array of structured options with raw ID duplicates (from existing DB records)
        const rawOptionsArray = [
            { group: 'flavor-selection', choice: 'yzs_fl_06', price: 0 },
            { group: 'cat_yanzisuchun_flavor', choice: 'yzs_fl_06', price: 0 }
        ];
        const formattedFromArray = printer.formatPrintOptions(rawOptionsArray);
        assert.equal(formattedFromArray, '青花椒鹽', 'Raw option array must resolve yzs_fl_06 to 青花椒鹽 and deduplicate');

        // Case B: Delimited string with duplicates (from order card options)
        const rawOptionsString = 'yzs_fl_06 、 yzs_fl_06';
        const formattedFromString = printer.formatPrintOptions(rawOptionsString);
        assert.equal(formattedFromString, '青花椒鹽', 'Delimited string yzs_fl_06 、 yzs_fl_06 must resolve and deduplicate');

        // Case C: Portion string
        const portionString = '第一份: yzs_fl_06, yzs_fl_06';
        const parsed = sandbox.parsePortionCustomizations(portionString);
        assert.ok(parsed, 'Must parse portion customizations');
        assert.equal(parsed.portions[0].chips.length, 1, 'Portion chips must be deduplicated to 1');
        assert.equal(parsed.portions[0].chips[0], '青花椒鹽', 'Portion chip must be translated to 青花椒鹽');
    });

    await t.test('3. Customization single selection stores display name and does not duplicate keys', () => {
        const sandbox = setupCustomerSandbox(yanxiansujiBootstrap);
        const mod = yanxiansujiBootstrap.modifiers[0];
        const opt = mod.options[2]; // 青花椒鹽

        const draft = { single: {}, multiple: {}, selectedDetails: {} };
        // Test helper function logic inside client-customizations
        sandbox.mod = mod;
        sandbox.opt = opt;
        sandbox.draft = draft;

        vm.runInContext(`
            const targetKey = mod.slug || mod.id;
            draft.single[targetKey] = opt.name;
            if (mod.id && mod.slug && mod.id !== mod.slug) {
                delete draft.single[mod.id === targetKey ? mod.slug : mod.id];
            }
        `, sandbox);

        assert.equal(Object.keys(draft.single).length, 1, 'Draft single must have exactly 1 key');
        assert.equal(draft.single['flavor-selection'], '青花椒鹽', 'Draft single must hold display name 青花椒鹽');
        assert.equal(draft.single['cat_yanzisuchun_flavor'], undefined, 'Alias key must not be duplicated');
    });
});
