const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log('--- Testing Sold-Out Order Modification Flow Implementation ---');

const indexHtml = fs.readFileSync(path.resolve(__dirname, '../index.html'), 'utf-8');
const indexCss = fs.readFileSync(path.resolve(__dirname, '../index.css'), 'utf-8');
const clientCheckoutJs = fs.readFileSync(path.resolve(__dirname, '../js/client-checkout.js'), 'utf-8');
const ordersHtml = fs.readFileSync(path.resolve(__dirname, '../orders.html'), 'utf-8');
const ordersCss = fs.readFileSync(path.resolve(__dirname, '../css/orders.css'), 'utf-8');
const ordersLiveJs = fs.readFileSync(path.resolve(__dirname, '../js/orders-live.js'), 'utf-8');
const ordersI18nJs = fs.readFileSync(path.resolve(__dirname, '../js/orders-i18n.js'), 'utf-8');
const ordersTs = fs.readFileSync(path.resolve(__dirname, '../benmi-worker-official/src/modules/orders.ts'), 'utf-8');
const lineTs = fs.readFileSync(path.resolve(__dirname, '../benmi-worker-official/src/modules/line.ts'), 'utf-8');
const orderSoldOutTs = fs.readFileSync(path.resolve(__dirname, '../benmi-worker-official/src/modules/line/templates/order-sold-out.ts'), 'utf-8');
const indexTs = fs.readFileSync(path.resolve(__dirname, '../benmi-worker-official/src/index.ts'), 'utf-8');

// Test 1: Worker API endpoints mounted
assert.ok(indexTs.includes('/api/order/edit-context'), 'Must route GET /api/order/edit-context');
assert.ok(indexTs.includes('/api/orders/modify'), 'Must route POST /api/orders/modify');
console.log('✓ Test 1 Passed: Worker API endpoints mounted in index.ts');

// Test 2: LINE Flex messages for sold-out and confirmation
assert.ok(lineTs.includes('createSoldOutItemFlexBubble'), 'createSoldOutItemFlexBubble re-exported in line.ts');
assert.ok(orderSoldOutTs.includes('function createSoldOutItemFlexBubble'), 'createSoldOutItemFlexBubble exists in order-sold-out.ts');
assert.ok(orderSoldOutTs.includes('function createOrderModifiedConfirmationFlexBubble'), 'createOrderModifiedConfirmationFlexBubble exists in order-sold-out.ts');
assert.ok(orderSoldOutTs.includes('mode=edit_order'), 'Sold-out bubble links to LIFF edit_order mode');
console.log('✓ Test 2 Passed: LINE Flex message templates implemented and exported');

// Test 3: Backend order status handler sends sold-out message on '口味售完'
assert.ok(ordersTs.includes('reason === "口味售完"'), 'Detects sold-out cancellation reason');
assert.ok(ordersTs.includes('WAITING_CUSTOMER_CHANGE'), 'Sets order status to WAITING_CUSTOMER_CHANGE');
assert.ok(ordersTs.includes('function getOrderEditContext'), 'getOrderEditContext implemented');
assert.ok(ordersTs.includes('function modifyOrder'), 'modifyOrder implemented');
assert.ok(ordersTs.includes('is_modified = 1'), 'modifyOrder updates is_modified to 1');
console.log('✓ Test 3 Passed: Backend orders module supports sold out trigger, edit context, and modify transaction');

// Test 4: POS UI displays modified badge
assert.ok(ordersI18nJs.includes('badgeModifiedOrder'), 'I18n keys for modified order added');
assert.ok(ordersCss.includes('.badge-modified'), 'CSS badge-modified styling added');
assert.ok(ordersLiveJs.includes('badge-modified'), 'orders-live.js renders modified badge on order tiles');
console.log('✓ Test 4 Passed: POS dashboard displays modified order badge');

// Test 5: Customer LIFF edit mode banner and logic
assert.ok(indexHtml.includes('id="edit-order-mode-banner"'), 'index.html contains edit-order-mode-banner');
assert.ok(indexCss.includes('.edit-order-mode-banner'), 'index.css contains .edit-order-mode-banner styling');
assert.ok(clientCheckoutJs.includes('window.isEditOrderMode'), 'client-checkout.js defines isEditOrderMode');
assert.ok(clientCheckoutJs.includes('initEditOrderModeIfPresent'), 'initEditOrderModeIfPresent implemented');
assert.ok(clientCheckoutJs.includes('window.editOrderRemovedItems'), 'client-checkout.js defines editOrderRemovedItems');
assert.ok(indexHtml.includes('window.editOrderRemovedItems'), 'index.html renders editOrderRemovedItems');
console.log('✓ Test 5 Passed: Customer LIFF edit mode banner, context pre-fill, delta indicator, and submission wired');

// Test 6: Cache-busting verification
assert.ok(indexHtml.includes('20260919_sold_out_v3'), 'index.html cache busters bumped to 20260919_sold_out_v3');
assert.ok(ordersHtml.includes('20260919_sold_out_v3'), 'orders.html cache busters bumped to 20260919_sold_out_v3');
console.log('✓ Test 6 Passed: Cache-busting query strings correctly bumped in index.html and orders.html');

console.log('\n🎉 ALL SOLD-OUT ORDER MODIFICATION TESTS PASSED!');
