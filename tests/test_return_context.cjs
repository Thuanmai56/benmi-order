const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');

// Setup mock browser/DOM environment
let activeTab = 'live';
let reviewingOrder = null;
let currentOrderKey = null;
let pendingNewOrders = [];
let unacknowledgedAppends = new Map();
let currentStoreStatus = 'open';
let lastHistoryOrders = [];
let latestOrders = [];

const mockDom = {
  elements: {},
  getElementById(id) {
    if (!this.elements[id]) {
      this.elements[id] = { id, style: {}, classList: new Set(), dataset: {}, innerText: '' };
      this.elements[id].classList.add = function (c) { this.has(c) || Set.prototype.add.call(this, c); };
      this.elements[id].classList.remove = function (c) { Set.prototype.delete.call(this, c); };
      this.elements[id].classList.toggle = function (c, force) {
        if (force === undefined) force = !this.has(c);
        force ? this.add(c) : this.remove(c);
        return force;
      };
      this.elements[id].classList.contains = function (c) { return this.has(c); };
    }
    return this.elements[id];
  },
  querySelector(sel) {
    if (sel === '.settings-card.active') return { id: 'setting-card-hours' };
    return null;
  },
  querySelectorAll(sel) {
    return [];
  },
  addEventListener() {}
};

const sandbox = {
  console,
  setTimeout,
  clearTimeout,
  document: mockDom,
  window: {},
  activeTab,
  get activeTab() { return activeTab; },
  set activeTab(v) { activeTab = v; },
  reviewingOrder,
  get reviewingOrder() { return reviewingOrder; },
  set reviewingOrder(v) { reviewingOrder = v; },
  currentOrderKey,
  get currentOrderKey() { return currentOrderKey; },
  set currentOrderKey(v) { currentOrderKey = v; },
  pendingNewOrders,
  get pendingNewOrders() { return pendingNewOrders; },
  set pendingNewOrders(v) { pendingNewOrders = v; },
  unacknowledgedAppends,
  get unacknowledgedAppends() { return unacknowledgedAppends; },
  set unacknowledgedAppends(v) { unacknowledgedAppends = v; },
  latestOrders,
  get latestOrders() { return latestOrders; },
  set latestOrders(v) { latestOrders = v; },
  lastHistoryOrders,
  get lastHistoryOrders() { return lastHistoryOrders; },
  set lastHistoryOrders(v) { lastHistoryOrders = v; },
  sessionStorage: { getItem: () => 'setting-card-hours', setItem: () => {} },
  t: k => k,
  getTenantIdFromUrl: () => 'fixture',
  WORKER_BASE: 'https://test.workers.dev',
  fetch: async () => ({ ok: true, json: async () => ({}) }),
  localOverrides: {},
  processingKeys: new Set(),
  renderAll: () => {},
  fetchOrders: async () => {},
  dismissNewAlert: () => {},
  updateNewAlert: () => {},
  closeModal: () => {
    reviewingOrder = null;
    currentOrderKey = null;
  },
  switchTab: (tab) => {
    activeTab = tab;
  },
  switchSettingTab: (subTab) => {
    sandbox.lastSwitchedSettingSubTab = subTab;
  },
  openReview: (key) => {
    sandbox.lastOpenedReviewKey = key;
    const order = latestOrders.find(o => o.key === key) || lastHistoryOrders.find(o => o.key === key);
    if (order) reviewingOrder = order;
  }
};

// Mirror window
sandbox.window = sandbox;

// Load orders-live.js
const code = fs.readFileSync(path.join(root, 'js/orders-live.js'), 'utf8');
vm.runInNewContext(code, sandbox);

console.log('--- RUNNING RETURN CONTEXT STACK TESTS ---');

// Test 1: User is on tab-settings, reviews new order, accepts -> returns to settings with sub-tab intact
activeTab = 'settings';
reviewingOrder = null;
pendingNewOrders = [{ key: 'ORDER-NEW-1', status: 'NEW' }];
latestOrders = [{ key: 'ORDER-NEW-1', status: 'NEW' }];

sandbox.captureReturnContext();
assert.equal(sandbox.posReturnContext.tab, 'settings');
assert.equal(sandbox.posReturnContext.settingsSubTab, 'setting-card-hours');
assert.equal(sandbox.posReturnContext.orderKey, null);

// Simulate review & accept
reviewingOrder = pendingNewOrders[0];
pendingNewOrders = []; // After accept, no more new orders

sandbox.finishReviewFlow();
assert.equal(activeTab, 'settings', 'Should return to settings tab');
assert.equal(sandbox.lastSwitchedSettingSubTab, 'setting-card-hours', 'Should restore setting-card-hours sub-tab');
assert.equal(sandbox.posReturnContext, null, 'Context should be cleared after finishing');
console.log('✅ Test 1 Passed: Returns to settings tab & sub-tab after accepting new order');

// Test 2: User is on tab-history, viewing order HIST-001, reviews new order, accepts -> reopens HIST-001
activeTab = 'history';
reviewingOrder = { key: 'HIST-001', status: 'PAID' };
lastHistoryOrders = [{ key: 'HIST-001', status: 'PAID' }];
pendingNewOrders = [{ key: 'ORDER-NEW-2', status: 'NEW' }];
latestOrders = [{ key: 'ORDER-NEW-2', status: 'NEW' }];

sandbox.captureReturnContext();
assert.equal(sandbox.posReturnContext.tab, 'history');
assert.equal(sandbox.posReturnContext.orderKey, 'HIST-001');

// Simulate accepting new order
reviewingOrder = pendingNewOrders[0];
pendingNewOrders = [];

sandbox.finishReviewFlow();
assert.equal(activeTab, 'history', 'Should remain on history tab');
setTimeout(() => {
  assert.equal(sandbox.lastOpenedReviewKey, 'HIST-001', 'Should reopen HIST-001');
  console.log('✅ Test 2 Passed: Returns to history tab and reopens previous viewing order');
}, 100);

// Test 3: Multiple new orders queue progression
activeTab = 'menu';
reviewingOrder = null;
pendingNewOrders = [
  { key: 'NEW-A', status: 'NEW' },
  { key: 'NEW-B', status: 'NEW' }
];

sandbox.captureReturnContext();
assert.equal(sandbox.posReturnContext.tab, 'menu');

// Handling NEW-A, NEW-B remains
const nextKey = sandbox.getRemainingNewOrderKey('NEW-A');
assert.equal(nextKey, 'NEW-B', 'Queue should detect NEW-B is remaining');

// Still in queue, context should NOT be lost or cleared
sandbox.captureReturnContext(); // idempotent call
assert.equal(sandbox.posReturnContext.tab, 'menu', 'Context preserved during queue');

// Finish NEW-B
pendingNewOrders = [];
assert.equal(sandbox.getRemainingNewOrderKey('NEW-B'), null, 'Queue now empty');
sandbox.finishReviewFlow();
assert.equal(activeTab, 'menu', 'Should return to menu tab after all orders in queue are handled');
console.log('✅ Test 3 Passed: Multi-order queue progresses and restores context at end');

// Test 4: Dismissing review modal
activeTab = 'reports';
sandbox.captureReturnContext();
assert.equal(sandbox.posReturnContext.tab, 'reports');

sandbox.dismissReviewModal();
assert.equal(activeTab, 'reports');
assert.equal(sandbox.posReturnContext, null);
console.log('✅ Test 4 Passed: Dismiss review modal restores previous context');

console.log('🎉 ALL RETURN CONTEXT UNIT TESTS PASSED!');
