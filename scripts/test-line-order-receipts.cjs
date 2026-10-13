const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { DatabaseSync } = require('node:sqlite');
const ts = require('../benmi-worker-official/node_modules/typescript');
require.extensions['.ts'] = (module, file) => module._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS }
}).outputText, file);
const receipts = require('../benmi-worker-official/src/modules/line-order-receipts.ts');
const orders = require('../benmi-worker-official/src/modules/orders.ts');
const line = require('../benmi-worker-official/src/modules/line.ts');
const userId = 'U' + 'a'.repeat(32);
const tenant = { tenantId: 'tenant-a', brandName: 'Shop A', orderPrefix: 'A', features: ['dine_in'], lineChannelToken: 'test-secret' };
function fixture(t) {
  const db = new DatabaseSync(':memory:');
  t.after(() => db.close());
  db.exec("CREATE TABLE tenants(id TEXT PRIMARY KEY); INSERT INTO tenants VALUES ('tenant-a');");
  for (const file of ['0005_create_orders_table.sql', '0032_create_order_items.sql', '0004_add_tenant_id_to_pending_actions.sql', '0046_add_order_uuid_and_daily_counter.sql']) {
    db.exec(fs.readFileSync('benmi-worker-official/migrations/' + file, 'utf8'));
  }
  db.exec(`ALTER TABLE orders ADD COLUMN dining_option TEXT DEFAULT 'takeaway'; ALTER TABLE orders ADD COLUMN table_number TEXT;
    ALTER TABLE orders ADD COLUMN round_count INTEGER DEFAULT 1; ALTER TABLE orders ADD COLUMN last_appended_at TEXT;
    ALTER TABLE order_items ADD COLUMN bundle_snapshot_json TEXT;
    CREATE TABLE menu_items(id TEXT, tenant_id TEXT, name TEXT, out_of_stock_until TEXT);
    CREATE TABLE menu_bundle_rules(tenant_id TEXT, parent_item_id TEXT, schema_version INTEGER, config_json TEXT, is_active INTEGER);`);
  for (const file of ['0055_expand_order_identity.sql', '0056_add_order_modified_tracking.sql', '0065_line_order_receipts.sql']) db.exec(fs.readFileSync('benmi-worker-official/migrations/' + file, 'utf8'));
  const DB = {
    prepare(sql) {
      const build = params => ({ bind(...p) { return build(p); },
        async first() { return db.prepare(sql).get(...params) || null; },
        async all() { return { results: db.prepare(sql).all(...params) }; },
        async run() { return { meta: { changes: db.prepare(sql).run(...params).changes } }; }
      }); return build([]);
    },
    async batch(statements) {
      db.exec('BEGIN');
      try { const results = []; for (const statement of statements) results.push(await statement.run()); db.exec('COMMIT'); return results; }
      catch (error) { db.exec('ROLLBACK'); throw error; }
    }
  };
  const env = { DB, ORDER_STATE: { get: async () => JSON.stringify(tenant), delete: async () => {}, put: async () => {} } };
  const requests = [];
  t.mock.method(global, 'fetch', async (url, options) => { requests.push({ url, options, body: JSON.parse(options.body) }); return new Response('{}'); });
  t.mock.method(console, 'log', () => {}); t.mock.method(console, 'error', () => {}); t.mock.method(console, 'warn', () => {});
  return { env, db, requests, row: id => db.prepare('SELECT * FROM line_order_receipts WHERE id = ?').get(id) };
}
const req = body => new Request('https://worker.test/api/create?tenant_id=tenant-a', { method: 'POST', body: JSON.stringify(body) });
const base = { uuid: 'request-1', userId, customer: 'Customer', total: 100, content: 'one meal', items: [{ name: 'Meal', quantity: 1, price: 100 }] };
async function create(f, changes = {}) { return (await orders.createOrder(req({ ...base, ...changes }), f.env, undefined, tenant)).json(); }
async function push(f, notification, target = tenant) { return receipts.requestOrderReceiptPush(req(notification), f.env, target); }
const text = result => `訂單編號：${result.key}\n📦 訂單內容：\none meal\n訂單參考：${result.key}\n確認參考：${result.notification.id}`;

test('order and receipt commit together; webhook reply saves quota and redelivery never duplicates', async t => {
  const f = fixture(t), result = await create(f);
  assert(result.notification.token); assert.equal(f.row(result.notification.id).status, 'pending'); assert.equal(f.requests.length, 0);
  const retry = await create(f); assert.equal(retry.key, result.key);
  assert.equal(f.db.prepare('SELECT COUNT(*) n FROM line_order_receipts').get().n, 1);
  const webhook = () => line.handleLineWebhook(req({ events: [{ type: 'message', source: { userId }, replyToken: 'reply-test', message: { type: 'text', text: text(result) } }] }), f.env, { waitUntil() {} }, tenant);
  await webhook(); await webhook(); await push(f, result.notification);
  assert.equal(f.requests.length, 1); assert(f.requests[0].url.endsWith('/reply')); assert.equal(f.requests[0].body.messages[0].type, 'flex');
  assert.equal(f.row(result.notification.id).status, 'sent'); assert.equal(f.row(result.notification.id).method, 'reply');
});

test('missing LIFF permission pushes immediately from server and later webhook does not reply', async t => {
  const f = fixture(t), result = await create(f, { line_delivery_mode: 'push' });
  assert.equal(f.requests.length, 1); assert(f.requests[0].url.endsWith('/push')); assert.equal(f.requests[0].body.to, userId);
  assert.equal(f.requests[0].body.messages[0].type, 'flex');
  await receipts.handleOrderReceiptWebhook(f.env, tenant, userId, text(result), 'late-reply');
  assert.equal(f.requests.length, 1); assert.equal(f.row(result.notification.id).method, 'push');
});

test('fallback rejects forged and cross-tenant capabilities and cannot override recipient or contents', async t => {
  const f = fixture(t), result = await create(f);
  assert.equal((await push(f, { ...result.notification, token: crypto.randomUUID() })).status, 403);
  assert.equal((await push(f, result.notification, { ...tenant, tenantId: 'other' })).status, 403);
  assert.equal(f.requests.length, 0);
  await push(f, { ...result.notification, to: 'attacker', contents: { text: 'injected' } });
  assert.equal(f.requests[0].body.to, userId); assert(!JSON.stringify(f.requests[0].body).includes('injected'));
  await push(f, result.notification); assert.equal(f.requests.length, 1);
});

test('concurrent reply, push and duplicate clients acquire a single D1 claim', async t => {
  const f = fixture(t), result = await create(f);
  await Promise.all([push(f, result.notification), push(f, result.notification), receipts.handleOrderReceiptWebhook(f.env, tenant, userId, text(result), 'reply-test')]);
  assert.equal(f.requests.length, 1); assert.equal(f.row(result.notification.id).status, 'sent');
});

test('reply HTTP failure falls back to Push Flex', async t => {
  const f = fixture(t), result = await create(f);
  t.mock.method(global, 'fetch', async (url, options) => {
    f.requests.push({ url, body: JSON.parse(options.body) });
    return new Response('{}', { status: url.endsWith('/reply') ? 400 : 200 });
  });
  await receipts.handleOrderReceiptWebhook(f.env, tenant, userId, text(result), 'expired-reply');
  assert.equal(f.requests.length, 2); assert(f.requests[1].url.endsWith('/push')); assert.equal(f.row(result.notification.id).status, 'sent');
});

test('Push retries use the same LINE retry key, including cron after client disappears', async t => {
  const f = fixture(t), result = await create(f); const keys = [];
  t.mock.method(global, 'setTimeout', callback => { queueMicrotask(callback); return 0; });
  t.mock.method(global, 'fetch', async (_url, options) => { keys.push(options.headers['X-Line-Retry-Key']); return new Response('{}', { status: 503 }); });
  await push(f, result.notification); assert.equal(keys.length, 2); assert.equal(f.row(result.notification.id).status, 'pending');
  await push(f, result.notification); assert.equal(keys.length, 2); // replay does not accelerate retries
  f.db.prepare('UPDATE line_order_receipts SET next_attempt_at = 0').run();
  t.mock.method(global, 'fetch', async (_url, options) => { keys.push(options.headers['X-Line-Retry-Key']); return new Response('{}', { status: 409, headers: { 'x-line-accepted-request-id': 'accepted' } }); });
  await receipts.processPendingOrderReceipts(f.env);
  assert.equal(keys.length, 3); assert.equal(new Set(keys).size, 1); assert.equal(f.row(result.notification.id).status, 'sent');
});

test('cron sends when LIFF client never reports back; legacy cached client reply is deduplicated', async t => {
  const f = fixture(t), result = await create(f);
  f.db.prepare('UPDATE line_order_receipts SET next_attempt_at = 0').run();
  await receipts.processPendingOrderReceipts(f.env); assert.equal(f.requests.length, 1);
  await receipts.handleOrderReceiptWebhook(f.env, tenant, userId, text(result).split('\n確認參考：')[0], 'legacy-reply');
  assert.equal(f.requests.length, 1);
});

test('append and modify each persist their own Flex snapshot and push with missing permission', async t => {
  const f = fixture(t), result = await create(f, { dining_option: 'dine_in', table_number: '1' });
  const append = await (await orders.executeAppendOrderInternal(f.env, tenant.tenantId, result.key, 'Extra', 20, '', userId, 'Customer', [{ name: 'Extra', price: 20 }], undefined, tenant, true)).json();
  assert.equal(f.row(append.notification.id).flow, 'append'); assert.equal(f.row(append.notification.id).status, 'sent');
  f.db.prepare("UPDATE orders SET status = 'WAITING_CUSTOMER_CHANGE' WHERE key = ?").run(result.key);
  const modify = await (await orders.modifyOrder(req({ order_key: result.key, new_total: 80, items: [{ name: 'Replacement', price: 80 }], line_delivery_mode: 'push' }), f.env, undefined, tenant)).json();
  assert.equal(f.row(modify.notification.id).flow, 'modify'); assert.equal(f.row(modify.notification.id).status, 'sent');
  assert.notEqual(append.notification.id, modify.notification.id); assert.equal(f.requests.filter(x => x.url.includes('api.line.me')).length, 2);
});

test('receipt storage failure rolls back order/items, while guests do not require a LINE recipient', async t => {
  const f = fixture(t);
  f.db.exec('DROP TABLE line_order_receipts');
  await assert.rejects(create(f), /no such table/);
  assert.equal(f.db.prepare('SELECT COUNT(*) n FROM orders').get().n, 0); assert.equal(f.db.prepare('SELECT COUNT(*) n FROM order_items').get().n, 0);
  const guest = await create(f, { userId: 'guest-web' }); assert(guest.success); assert.equal(guest.notification, undefined);
});

function client(t, permissionState = 'granted', contextType = 'utou') {
  const calls = [], send = [];
  const sandbox = { window: {}, document: { readyState: 'loading', addEventListener() {} }, URLSearchParams,
    WORKER_BASE: 'https://worker.test', crypto, AbortSignal, setTimeout, clearTimeout,
    console: { error() {}, warn() {}, log() {} },
    liff: { isInClient: () => true, getContext: () => ({ type: contextType }), permission: { query: async () => ({ state: permissionState }) }, sendMessages: async messages => send.push(messages) },
    fetch: async (url, options) => { calls.push({ url, body: JSON.parse(options.body) }); return new Response('{}', { status: 202 }); }
  };
  vm.createContext(sandbox); vm.runInContext(fs.readFileSync('js/client-checkout.js', 'utf8'), sandbox);
  return { sandbox, calls, send };
}

test('client skips LIFF for missing permission or chat context and requests Push once', async t => {
  for (const [permission, contextType] of [['prompt', 'utou'], ['unavailable', 'utou'], ['granted', 'none']]) {
    const c = client(t, permission, contextType), diagnostic = await c.sandbox.getLiffDeliveryDiagnostic();
    await c.sandbox.sendOrderConfirmation([{ type: 'text', text: 'Order' }], { tenantId: 'tenant-a', flow: 'create', orderKey: 'A-T001' }, { id: 'receipt', token: 'capability' }, diagnostic);
    assert.equal(c.send.length, 0); assert.equal(c.calls.length, 1); assert(c.calls[0].url.includes('/order-receipt/push'));
  }
});

test('client sends LIFF normally, but after two errors uses Push without creating another order', async t => {
  const c = client(t), diagnostic = await c.sandbox.getLiffDeliveryDiagnostic();
  const notification = { id: 'receipt', token: 'secret-capability' };
  const context = { tenantId: 'tenant-a', flow: 'create', orderKey: 'A-T001' };
  await c.sandbox.sendOrderConfirmation([{ type: 'text', text: 'Order' }], context, notification, diagnostic);
  assert(c.send[0][0].text.includes('確認參考：receipt')); assert(!c.send[0][0].text.includes(notification.token)); assert.equal(c.calls.length, 0);
  let attempts = 0;
  c.sandbox.liff.sendMessages = async () => { attempts++; throw Object.assign(new Error('No chat'), { code: '403' }); };
  c.sandbox.setTimeout = callback => { queueMicrotask(callback); return 0; };
  await c.sandbox.sendOrderConfirmation([{ type: 'text', text: 'Order' }], context, notification, diagnostic);
  assert.equal(attempts, 2); assert.equal(c.calls.filter(x => x.url.includes('/order-receipt/push')).length, 1);
  assert.equal(c.calls.some(x => x.url.includes('/api/create')), false);
  assert.equal(c.calls[0].body.permissionState, 'granted');
});

test('permanent LINE errors are recorded and capability replays do not consume more quota', async t => {
  const f = fixture(t), result = await create(f);
  let calls = 0;
  t.mock.method(global, 'fetch', async () => { calls++; return new Response('{}', { status: 400 }); });
  await push(f, result.notification); await push(f, result.notification);
  assert.equal(calls, 1); assert.equal(f.row(result.notification.id).status, 'failed'); assert.equal(f.row(result.notification.id).last_error, 'LINE HTTP 400');
});

test('expired and exhausted delivery jobs stop, and stale leases can be recovered', async t => {
  const f = fixture(t), result = await create(f);
  f.db.prepare("UPDATE line_order_receipts SET status = 'sending', lease_until = 0").run();
  await receipts.processPendingOrderReceipts(f.env); assert.equal(f.row(result.notification.id).status, 'sent');
  const expired = await create(f, { uuid: 'expired' });
  f.db.prepare('UPDATE line_order_receipts SET created_at = 0, next_attempt_at = 0 WHERE id = ?').run(expired.notification.id);
  const exhausted = await create(f, { uuid: 'exhausted' });
  f.db.prepare("UPDATE line_order_receipts SET status = 'sending', attempts = 6, lease_until = 0 WHERE id = ?").run(exhausted.notification.id);
  await receipts.processPendingOrderReceipts(f.env);
  assert.equal(f.row(expired.notification.id).status, 'failed'); assert.equal(f.row(exhausted.notification.id).status, 'failed'); assert.equal(f.requests.length, 1);
});

test('orders without structured items also persist receipt atomically; fallback body is bounded', async t => {
  const f = fixture(t), result = await create(f, { items: [] });
  assert.equal(f.row(result.notification.id).order_key, result.key);
  assert.equal((await push(f, { ...result.notification, junk: 'x'.repeat(3000) })).status, 413);
  assert.equal(f.requests.length, 0);
});
