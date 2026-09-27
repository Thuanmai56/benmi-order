const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('Badge Simplification: orders.html should not contain recommended checkbox', () => {
  const html = fs.readFileSync(path.resolve(__dirname, '../orders.html'), 'utf-8');
  assert.ok(!html.includes('id="item-detail-recommended-checkbox"'), 'Checkbox should be removed from orders.html');
  assert.ok(!html.includes('id="i18n-item-recommended-label"'), 'Checkbox label should be removed from orders.html');
  assert.ok(html.includes('id="item-detail-badge-input"'), 'Badge input must remain present');
});

test('Badge Simplification: js/client-menu.js should not render fallback 推薦 badge', () => {
  const code = fs.readFileSync(path.resolve(__dirname, '../js/client-menu.js'), 'utf-8');
  assert.ok(!code.includes("item.isRecommended ? '推薦' : ''"), 'client-menu.js should not fall back to 推薦 when isRecommended is true');
  assert.ok(code.includes("const badgeText = (item.badgeText || item.badge || '').trim();"), 'client-menu.js should only render explicit badge text');
});

test('Badge Simplification: benmi-worker-official/src/modules/bootstrap.ts should not fallback to 👍 推薦', () => {
  const code = fs.readFileSync(path.resolve(__dirname, '../benmi-worker-official/src/modules/bootstrap.ts'), 'utf-8');
  assert.ok(!code.includes("isRec ? '👍 推薦' : null"), 'bootstrap.ts should not inject phantom 👍 推薦 badge');
});

test('Badge Simplification: js/orders-menu.js should not reference recCheckbox', () => {
  const code = fs.readFileSync(path.resolve(__dirname, '../js/orders-menu.js'), 'utf-8');
  assert.ok(!code.includes('recCheckbox'), 'orders-menu.js should not have references to recCheckbox');
  assert.ok(!code.includes('item-detail-recommended-checkbox'), 'orders-menu.js should not lookup item-detail-recommended-checkbox');
});
