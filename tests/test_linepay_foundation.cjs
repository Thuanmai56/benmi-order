// Real Workers Web Crypto and local D1; synthetic identities and mocked LINE HTTP only.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { test } = require('node:test');
const root = path.resolve(__dirname, '..');
const workerRoot = path.join(root, 'benmi-worker-official');
const { Miniflare, convertV4MiniflareOptions } = require(path.join(workerRoot, 'node_modules/miniflare'));
const { buildSync } = require(path.join(workerRoot, 'node_modules/esbuild'));

// This harness is never part of the deployed entrypoint. Execute actual foundation modules
// inside workerd so timingSafeEqual, AES-GCM and D1 constraints use the production runtime.
const script = buildSync({
  stdin: { resolveDir: workerRoot, loader: 'ts', contents: `
    import * as config from './src/modules/linepay/config';
    import * as auth from './src/modules/linepay/auth';
    import * as secrets from './src/modules/linepay/crypto';
    export default { async fetch(request, bindings) {
      const input = await request.json();
      const env = { ...bindings, ...input.bindings };
      if (input.secretBinding === 'getter') env.LINE_PAY_ADMIN_KEY = {get: async () => input.secretValue};
      if (input.secretBinding === 'throw') env.LINE_PAY_ADMIN_KEY = {get: async () => {throw new Error('sensitive binding failure')}};
      const calls = [];
      const fakeFetch = async (url, init) => {
        calls.push({ url: String(url), authorization: init.headers.Authorization,
          redirect: init.redirect, hasSignal: !!init.signal });
        const next = input.responses?.[calls.length - 1];
        if (!next || next.throw) throw new Error('sensitive HTTP failure: ' + String(url));
        return new Response(next.raw ?? JSON.stringify(next.json), {status: next.status ?? 200});
      };
      const req = new Request(input.url || 'https://local.test/future?tenant_id=a', {headers: input.headers});
      try {
        let result;
        switch (input.action) {
          case 'runtime': config.assertLinePaySandboxRuntime(env); result = true; break;
          case 'tenant': result = config.resolveLinePayTenantId(req); break;
          case 'config': result = await config.loadLinePayTenantConfig(env, input.tenantId || 'a'); break;
          case 'admin': await auth.requireLinePayAdmin(req, env); result = true; break;
          case 'customer': result = await auth.requireLinePayCustomer(req, env, input.tenantId || 'a', fakeFetch); break;
          case 'order': result = await auth.loadOwnedLinePayOrder(env, input.customer, input.orderId); break;
          case 'encrypt': result = await secrets.encryptLinePayCredential(env, input.context, input.secret); break;
          case 'decrypt': result = await secrets.decryptLinePayCredential(env, input.context, input.envelope); break;
          case 'hash': result = await secrets.linePayHash(input.value); break;
          case 'unknown-error': throw new Error('private query and secret');
          default: throw new Error('Invalid test action');
        }
        return Response.json({result, calls});
      } catch (error) {
        const response = config.linePayErrorResponse(error);
        return Response.json({...await response.json(), calls}, {status: response.status, headers: response.headers});
      }
    }};
  ` },
  bundle: true, write: false, format: 'esm', target: 'es2022', platform: 'browser', logLevel: 'silent',
}).outputFiles[0].text;

function statements(sql) {
  return JSON.parse(execFileSync('python3', ['-c', `import sqlite3,sys,json
s=''; out=[]
for c in sys.stdin.read():
 s+=c
 if c==';' and sqlite3.complete_statement(s): out.append(s);s=''
assert not s.strip(), 'Incomplete SQL'
print(json.dumps(out))`], { input: sql, encoding: 'utf8' }));
}

const KEY = Buffer.alloc(32, 7).toString('base64');
const CONTEXT = { tenantId: 'a', version: 1, channelId: '10001' };
const ADMIN_KEY = 'synthetic-linepay-admin-key-000001';
const HASH = 'a'.repeat(64);
const MIGRATION = fs.readFileSync(path.join(workerRoot, 'migrations/0072_linepay_v4_foundation.sql'), 'utf8');

async function fixture(t, migrated = true) {
  const mf = new Miniflare(convertV4MiniflareOptions({ workers: [{
    modules: true, script, compatibilityDate: '2026-03-28', d1Databases: ['DB'],
    bindings: { LINE_PAY_DEPLOYMENT_ENV: 'dev', LINE_PAY_ENABLED: 'true', LINE_PAY_CREDENTIAL_KEY: KEY },
  }] }));
  t.after(() => mf.dispose());
  const db = await mf.getD1Database('DB');
  const apply = sql => db.batch(statements(sql).map(statement => db.prepare(statement)));
  await apply(`CREATE TABLE tenants(id TEXT PRIMARY KEY);
    CREATE TABLE tenant_config(tenant_id TEXT PRIMARY KEY REFERENCES tenants(id), is_active INTEGER NOT NULL DEFAULT 1, brand_name TEXT, features TEXT DEFAULT '[]');
    CREATE TABLE tenant_lifecycle(tenant_id TEXT PRIMARY KEY, state TEXT NOT NULL DEFAULT 'active');
    INSERT INTO tenants VALUES ('a'),('b'),('inactive'),('deleted'),('purging');
    INSERT INTO tenant_config(tenant_id,is_active,brand_name) VALUES
      ('a',1,'A'),('b',1,'B'),('inactive',0,'Inactive'),('deleted',1,'Deleted'),('purging',1,'Purging');
    INSERT INTO tenant_lifecycle VALUES ('deleted','deleted'),('purging','purging');`);
  for (const file of ['0005_create_orders_table.sql', '0032_create_order_items.sql', '0046_add_order_uuid_and_daily_counter.sql']) {
    await apply(fs.readFileSync(path.join(workerRoot, 'migrations', file), 'utf8'));
  }
  await apply(`ALTER TABLE orders ADD COLUMN dining_option TEXT DEFAULT 'takeaway';
    INSERT INTO orders(key,tenant_id,user_id,customer_name,pickup_time,total_amount,order_content)
      VALUES ('A-receipt','a','user-a','A customer','12:00',100,'Original A'),
      ('B-receipt','b','user-b','B customer','12:00',200,'Original B');
    INSERT INTO order_items(tenant_id,order_key,item_name,quantity,unit_price,subtotal)
      VALUES ('a','A-receipt','Original item',1,100,100);`);
  await apply(fs.readFileSync(path.join(workerRoot, 'migrations/0055_expand_order_identity.sql'), 'utf8'));
  const orders = (await db.prepare('SELECT tenant_id,order_id FROM orders ORDER BY tenant_id').all()).results;
  const orderA = orders.find(row => row.tenant_id === 'a').order_id;
  const orderB = orders.find(row => row.tenant_id === 'b').order_id;
  if (migrated) await apply(MIGRATION);
  const call = async input => {
    const response = await mf.dispatchFetch('https://local.test/harness', {method: 'POST', body: JSON.stringify(input)});
    return {status: response.status, headers: response.headers, ...await response.json()};
  };
  const merchant = async (tenantId = 'a') => {
    await db.prepare('INSERT INTO linepay_merchant_configs(tenant_id) VALUES (?)').bind(tenantId).run();
    const encryption = await call({action: 'encrypt', context: {...CONTEXT, tenantId}, secret: 'synthetic-channel-secret'});
    assert.equal(encryption.status, 200);
    await db.prepare('INSERT INTO linepay_merchant_credentials(tenant_id,version,channel_id,encrypted_secret) VALUES (?,1,?,?)')
      .bind(tenantId, CONTEXT.channelId, encryption.result).run();
    await db.prepare("UPDATE linepay_merchant_configs SET enabled=1,line_login_channel_id='20001',current_credential_version=1 WHERE tenant_id=?")
      .bind(tenantId).run();
  };
  const payment = async (id, overrides = {}) => {
    const row = {tenantId: 'a', orderId: orderA, version: 1, merchantOrderId: id,
      status: 'CREATING', amount: 100, currency: 'TWD', environment: 'sandbox', transactionId: null, ...overrides};
    return db.prepare(`INSERT INTO linepay_payments(id,tenant_id,order_id,credential_version,merchant_order_id,payer_user_id,
      amount,currency,environment,status,callback_state_hash,transaction_id) VALUES (?,?,?,?,?,'user-a',?,?,?,?,?,?)`)
      .bind(id, row.tenantId, row.orderId, row.version, row.merchantOrderId, row.amount, row.currency,
        row.environment, row.status, HASH, row.transactionId).run();
  };
  const operation = (id, paymentId, overrides = {}) => {
    const row = {tenantId: 'a', kind: 'CONFIRM', status: 'PENDING', key: HASH, ...overrides};
    return db.prepare(`INSERT INTO linepay_operations(id,tenant_id,payment_id,kind,status,idempotency_key_hash,request_hash)
      VALUES (?,?,?,?,?,?,?)`).bind(id, row.tenantId, paymentId, row.kind, row.status, row.key, HASH).run();
  };
  return {db, apply, call, merchant, payment, operation, orderA, orderB};
}

async function fails(call, input, status, error) {
  const result = await call(input);
  assert.equal(result.status, status);
  assert.equal(result.error, error);
  return result;
}

test('migration preserves existing orders/items/config and defaults merchants to disabled', async t => {
  const {db, apply, call} = await fixture(t, false);
  const snapshot = async () => Promise.all(['orders','order_items','tenant_config'].map(async table =>
    (await db.prepare(`SELECT * FROM ${table} ORDER BY 1`).all()).results));
  const before = await snapshot();
  await apply(MIGRATION);
  assert.deepEqual(await snapshot(), before);
  for (const table of ['linepay_merchant_configs','linepay_merchant_credentials','linepay_payments','linepay_operations']) {
    assert.equal((await db.prepare(`SELECT count(*) n FROM ${table}`).first()).n, 0);
  }
  assert.deepEqual((await call({action: 'config'})).result,
    {tenantId: 'a', enabled: false, environment: 'sandbox', currency: 'TWD', lineLoginChannelId: null, credentialVersion: null});
  await db.prepare("INSERT INTO linepay_merchant_configs(tenant_id) VALUES ('a')").run();
  const row = await db.prepare("SELECT enabled,environment,currency,current_credential_version FROM linepay_merchant_configs").first();
  assert.deepEqual(row, {enabled: 0, environment: 'sandbox', currency: 'TWD', current_credential_version: null});
  await db.prepare("UPDATE orders SET status='ACCEPTED',total_amount=110 WHERE tenant_id='a'").run();
  assert.equal((await db.prepare("SELECT total_amount FROM orders WHERE tenant_id='a'").first()).total_amount, 110);
  await db.prepare(`INSERT INTO orders(key,tenant_id,user_id,customer_name,pickup_time,total_amount,order_content)
    VALUES ('legacy-after-migration','b','user-b','Legacy writer','12:00',25,'Old insert columns')`).run();
  const legacy = await db.prepare("SELECT order_id,total_amount,status FROM orders WHERE key='legacy-after-migration'").first();
  assert.match(legacy.order_id, /^[0-9a-f-]{36}$/);
  assert.equal(legacy.total_amount, 25);
  assert.equal(legacy.status, 'NEW');
  const after = await snapshot();
  await assert.rejects(apply(MIGRATION), /already exists/i);
  assert.deepEqual(await snapshot(), after);
  assert.deepEqual((await db.prepare('PRAGMA foreign_key_check').all()).results, []);
});

test('schema prevents cross-tenant credentials/orders/operations and keeps financial identity immutable', async t => {
  const f = await fixture(t);
  await f.merchant('a'); await f.merchant('b');
  await assert.rejects(f.payment('wrong-order', {orderId: f.orderB}), /foreign key/i);
  await assert.rejects(f.payment('wrong-version', {version: 2}), /foreign key/i);
  await f.payment('good');
  await assert.rejects(f.operation('wrong-operation', 'good', {tenantId: 'b'}), /foreign key/i);
  for (const [column, value] of [['amount',101],['tenant_id','b'],['order_id',f.orderB],['credential_version',2],['payer_user_id','user-b'],['merchant_order_id','other']]) {
    await assert.rejects(f.db.prepare(`UPDATE linepay_payments SET ${column}=? WHERE id='good'`).bind(value).run(), /LINE_PAY_PAYMENT_IMMUTABLE/);
  }
  await assert.rejects(f.db.prepare("UPDATE linepay_merchant_credentials SET channel_id='99999' WHERE tenant_id='a'").run(), /LINE_PAY_CREDENTIAL_IMMUTABLE/);
  await f.operation('good-op', 'good');
  await assert.rejects(f.db.prepare("UPDATE linepay_operations SET request_hash=? WHERE id='good-op'").bind('b'.repeat(64)).run(), /LINE_PAY_OPERATION_IMMUTABLE/);
  await assert.rejects(f.db.batch([
    f.db.prepare("UPDATE orders SET status='DONE' WHERE tenant_id='a'"),
    f.db.prepare("UPDATE linepay_payments SET amount=999 WHERE id='good'"),
  ]), /LINE_PAY_PAYMENT_IMMUTABLE/);
  assert.equal((await f.db.prepare("SELECT status FROM orders WHERE tenant_id='a'").first()).status, 'NEW');
  assert.deepEqual((await f.db.prepare('PRAGMA foreign_key_check').all()).results, []);
});

test('schema admits only sandbox/TWD integer amounts and exact 19-digit transaction strings', async t => {
  const f = await fixture(t); await f.merchant();
  for (const overrides of [{amount: 0},{amount: -1},{amount: 1.5},{amount: 9007199254740992},
    {currency: 'USD'},{environment: 'production'},{status: 'OTHER'},
    {transactionId: '20230101123456789'}, {transactionId: '202301011234567891x'}]) {
    await assert.rejects(f.payment('invalid', overrides), /constraint/i);
  }
  const transactionId = '2023010112345678910';
  await f.payment('exact', {transactionId});
  assert.deepEqual(await f.db.prepare("SELECT transaction_id,typeof(transaction_id) type FROM linepay_payments WHERE id='exact'").first(),
    {transaction_id: transactionId, type: 'text'});
  await assert.rejects(f.db.prepare("UPDATE linepay_payments SET transaction_id='2023010112345678911' WHERE id='exact'").run(), /LINE_PAY_PAYMENT_IMMUTABLE/);
  for (const sql of ["UPDATE linepay_merchant_configs SET environment='production'", "UPDATE linepay_merchant_configs SET enabled=2",
    "UPDATE linepay_merchant_configs SET current_credential_version=99", "INSERT INTO linepay_merchant_configs(tenant_id,enabled) VALUES ('b',1)"]) {
    await assert.rejects(f.db.prepare(sql).run(), /constraint/i);
  }
});

test('one open/paid/unknown payment per order; terminal failure or full refund releases the slot', async t => {
  const f = await fixture(t); await f.merchant();
  await f.payment('first');
  for (const status of ['CREATING','PENDING','CONFIRMING','PAID','REFUNDING','UNKNOWN']) {
    await f.db.prepare("UPDATE linepay_payments SET status=? WHERE id='first'").bind(status).run();
    await assert.rejects(f.payment('duplicate'), /unique constraint/i);
  }
  await f.db.prepare("UPDATE linepay_payments SET status='REFUNDED' WHERE id='first'").run();
  await f.payment('second');
  await f.db.prepare("UPDATE linepay_payments SET status='FAILED' WHERE id='second'").run();
  await f.payment('third');
  await f.db.prepare("UPDATE linepay_payments SET status='CANCELLED' WHERE id='third'").run();
  await f.payment('fourth');
  // A second credential version does not permit a parallel charge of the same order.
  await f.db.prepare(`INSERT INTO linepay_merchant_credentials(tenant_id,version,channel_id,encrypted_secret)
    SELECT tenant_id,2,channel_id,encrypted_secret FROM linepay_merchant_credentials WHERE tenant_id='a'`).run();
  await assert.rejects(f.payment('rotation-duplicate', {version: 2}), /unique constraint/i);
});

test('idempotency and operation leases are tenant scoped and UNKNOWN blocks a second mutation', async t => {
  const f = await fixture(t); await f.merchant('a'); await f.merchant('b');
  await f.payment('a-payment'); await f.payment('b-payment', {tenantId: 'b', orderId: f.orderB});
  await f.operation('a-operation', 'a-payment', {status: 'RUNNING'});
  await f.operation('b-operation', 'b-payment', {tenantId: 'b', status: 'RUNNING'});
  await assert.rejects(f.operation('same-key', 'a-payment'), /unique constraint/i);
  await assert.rejects(f.operation('parallel', 'a-payment', {key: 'b'.repeat(64), kind: 'REFUND', status: 'RUNNING'}), /unique constraint/i);
  await f.db.prepare("UPDATE linepay_operations SET status='UNKNOWN' WHERE id='a-operation'").run();
  await assert.rejects(f.operation('unknown-parallel', 'a-payment', {key: 'b'.repeat(64), status: 'RUNNING'}), /unique constraint/i);
  await f.db.prepare("UPDATE linepay_operations SET status='SUCCEEDED' WHERE id='a-operation'").run();
  await f.operation('after-resolution', 'a-payment', {key: 'b'.repeat(64), status: 'RUNNING'});
});

test('runtime fails closed for missing/mistyped enable flags and every production mode', async t => {
  const {call} = await fixture(t);
  assert.equal((await call({action: 'runtime'})).status, 200);
  for (const LINE_PAY_ENABLED of [undefined, null, '', 'false', 'TRUE', '1', true]) {
    // undefined is omitted in JSON; explicitly null represents a missing/invalid binding.
    await fails(call, {action: 'runtime', bindings: {LINE_PAY_ENABLED: LINE_PAY_ENABLED ?? null}}, 503, 'LINE_PAY_DISABLED');
  }
  for (const mode of [undefined, null, '', 'production', 'prod', 'staging', 'unknown']) {
    await fails(call, {action: 'runtime', bindings: {LINE_PAY_DEPLOYMENT_ENV: mode ?? null, LINE_PAY_ENABLED: 'true'}}, 503, 'LINE_PAY_SANDBOX_ONLY');
  }
  assert.equal((await call({action: 'runtime', bindings: {LINE_PAY_DEPLOYMENT_ENV: 'test'}})).status, 200);
});

test('tenant routing requires explicit unambiguous query/header and never falls back to a tenant', async t => {
  const {call} = await fixture(t);
  assert.equal((await call({action: 'tenant'})).result, 'a');
  assert.equal((await call({action: 'tenant', url: 'https://local.test/', headers: {'X-Tenant-ID': 'b'}})).result, 'b');
  assert.equal((await call({action: 'tenant', headers: {'X-Tenant-ID': 'a'}})).result, 'a');
  await fails(call, {action: 'tenant', url: 'https://local.test/'}, 400, 'LINE_PAY_TENANT_REQUIRED');
  for (const input of [
    {headers: {'X-Tenant-ID': 'b'}},
    {url: 'https://local.test/?tenant_id=a&tenant_id=a'},
    {url: 'https://local.test/?tenant_id='},
    {url: 'https://local.test/?tenant_id=a%20b'},
    {url: 'https://local.test/?tenant_id=../a'},
  ]) await fails(call, {action: 'tenant', ...input}, 400, 'LINE_PAY_TENANT_INVALID');
});

test('admin requires a dedicated strong secret and native constant-time comparison', async t => {
  const {call} = await fixture(t);
  const configured = {LINE_PAY_ADMIN_KEY: ADMIN_KEY};
  await fails(call, {action: 'admin', bindings: {ADMIN_API_KEY: ADMIN_KEY}, headers: {'X-Admin-Key': ADMIN_KEY}}, 503, 'LINE_PAY_SECRET_UNAVAILABLE');
  await fails(call, {action: 'admin', bindings: {LINE_PAY_ADMIN_KEY: '12345678'}}, 503, 'LINE_PAY_SECRET_UNAVAILABLE');
  for (const headers of [{},{'X-Admin-Key': ADMIN_KEY},{'X-LinePay-Admin-Key': 'wrong'}, {'X-LinePay-Admin-Key': ADMIN_KEY + 'x'}]) {
    await fails(call, {action: 'admin', bindings: configured, headers}, 401, 'LINE_PAY_UNAUTHORIZED');
  }
  assert.equal((await call({action: 'admin', bindings: configured, headers: {'X-LinePay-Admin-Key': ADMIN_KEY}})).result, true);
  assert.equal((await call({action: 'admin', secretBinding: 'getter', secretValue: ADMIN_KEY, headers: {'X-LinePay-Admin-Key': ADMIN_KEY}})).result, true);
  const failure = await fails(call, {action: 'admin', secretBinding: 'throw'}, 503, 'LINE_PAY_SECRET_UNAVAILABLE');
  assert(!JSON.stringify(failure).includes('sensitive'));
});

const validIdentity = [
  {json: {client_id: '20001', expires_in: 600, scope: 'openid profile'}},
  {json: {userId: 'user-a', displayName: 'Ignored profile name'}},
];
const customerInput = {action: 'customer', headers: {Authorization: 'Bearer synthetic-user-token'}, responses: validIdentity};

test('customer identity comes from verified LINE token/channel/profile; caller userId is ignored', async t => {
  const f = await fixture(t); await f.merchant();
  const result = await f.call({...customerInput, userId: 'forged', url: 'https://local.test/?tenant_id=a&userId=forged'});
  assert.equal(result.status, 200);
  assert.deepEqual(result.result, {tenantId: 'a', userId: 'user-a'});
  assert.equal(result.calls.length, 2);
  const verify = new URL(result.calls[0].url);
  assert.equal(verify.origin, 'https://api.line.me');
  assert.equal(verify.pathname, '/oauth2/v2.1/verify');
  assert.equal(verify.searchParams.get('access_token'), 'synthetic-user-token');
  assert.equal(result.calls[1].url, 'https://api.line.me/v2/profile');
  assert.equal(result.calls[1].authorization, 'Bearer synthetic-user-token');
  assert(result.calls.every(call => call.redirect === 'error' && call.hasSignal));
});

test('disabled, missing, inactive, deleted and purging tenants never reach LINE', async t => {
  const f = await fixture(t);
  for (const [tenantId, status, code] of [
    ['a',503,'LINE_PAY_DISABLED'],['missing',404,'LINE_PAY_TENANT_NOT_FOUND'],
    ['inactive',404,'LINE_PAY_TENANT_NOT_FOUND'],['deleted',404,'LINE_PAY_TENANT_NOT_FOUND'],['purging',404,'LINE_PAY_TENANT_NOT_FOUND'],
  ]) {
    const result = await fails(f.call, {...customerInput, tenantId}, status, code);
    assert.equal(result.calls.length, 0);
  }
  // Existing feature arrays and caches do not grant payment access.
  await f.db.prepare(`UPDATE tenant_config SET features='["line_pay"]' WHERE tenant_id='a'`).run();
  const result = await fails(f.call, customerInput, 503, 'LINE_PAY_DISABLED');
  assert.equal(result.calls.length, 0);
});

test('missing/malformed tokens, wrong audience, expiry and missing profile scope fail before profile lookup', async t => {
  const f = await fixture(t); await f.merchant();
  for (const value of ['', 'Basic token', 'Bearer token,other', 'Bearer too many tokens', 'Bearer ' + 'x'.repeat(8193)]) {
    const result = await fails(f.call, {...customerInput, headers: {Authorization: value}}, 401, 'LINE_PAY_UNAUTHORIZED');
    assert.equal(result.calls.length, 0);
  }
  for (const changes of [{client_id:'other'}, {expires_in:0}, {expires_in:-1}, {expires_in:'600'}, {scope:'openid'}, {scope:'notprofile'}]) {
    const result = await fails(f.call, {...customerInput,
      responses: [{json: {...validIdentity[0].json, ...changes}}, validIdentity[1]]}, 401, 'LINE_PAY_UNAUTHORIZED');
    assert.equal(result.calls.length, 1);
  }
  await f.merchant('b');
  await f.db.prepare("UPDATE linepay_merchant_configs SET line_login_channel_id='30001' WHERE tenant_id='b'").run();
  await fails(f.call, {...customerInput, tenantId: 'b'}, 401, 'LINE_PAY_UNAUTHORIZED');
});

test('LINE outages, invalid/oversized responses and bad profiles fail closed without leaking errors', async t => {
  const f = await fixture(t); await f.merchant();
  for (const response of [{throw:true}, {status:429}, {status:500}, {raw:'not JSON'}, {raw:'[]'}, {raw:'x'.repeat(17000)}]) {
    const result = await fails(f.call, {...customerInput, responses:[response]}, 503, 'LINE_PAY_IDENTITY_UNAVAILABLE');
    assert.equal(result.calls.length, 1);
  }
  for (const status of [400,401]) {
    await fails(f.call, {...customerInput, responses:[{status}]}, 401, 'LINE_PAY_UNAUTHORIZED');
  }
  for (const response of [{throw:true}, {json:{}}, {json:{userId:''}}, {json:{userId:17}}, {json:{userId:'a b'}}]) {
    await fails(f.call, {...customerInput, responses:[validIdentity[0],response]}, 503, 'LINE_PAY_IDENTITY_UNAVAILABLE');
  }
  const result = await f.call({action:'unknown-error'});
  assert.equal(result.status, 503);
  assert.equal(result.error, 'LINE_PAY_UNAVAILABLE');
  assert.equal(result.headers.get('Cache-Control'), 'no-store');
  assert.equal(result.headers.get('Referrer-Policy'), 'no-referrer');
  assert(!JSON.stringify(result).includes('private query'));
});

test('order ownership uses tenant + server UUID + verified user, with no receipt-number fallback', async t => {
  const f = await fixture(t);
  const customer = {tenantId:'a',userId:'user-a'};
  const result = await f.call({action:'order',customer,orderId:f.orderA});
  assert.deepEqual(result.result, {orderId:f.orderA,orderKey:'A-receipt',amount:100,status:'NEW'});
  for (const input of [
    {customer, orderId:f.orderB}, {customer:{tenantId:'b',userId:'user-a'},orderId:f.orderA},
    {customer:{tenantId:'a',userId:'forged'},orderId:f.orderA}, {customer,orderId:'A-receipt'},
  ]) await fails(f.call, {action:'order',...input}, 404, 'LINE_PAY_ORDER_NOT_FOUND');
  await f.db.prepare("UPDATE tenant_config SET is_active=0 WHERE tenant_id='a'").run();
  await fails(f.call, {action:'order',customer,orderId:f.orderA}, 404, 'LINE_PAY_ORDER_NOT_FOUND');
  await f.db.prepare("UPDATE tenant_config SET is_active=1 WHERE tenant_id='a'").run();
  await f.db.prepare("INSERT INTO tenant_lifecycle VALUES ('a','deleted')").run();
  await fails(f.call, {action:'order',customer,orderId:f.orderA}, 404, 'LINE_PAY_ORDER_NOT_FOUND');
});

test('AES-GCM uses random nonces and binds ciphertext to tenant, version and merchant channel', async t => {
  const {call} = await fixture(t);
  const secret = 'synthetic channel secret with Unicode 越';
  const first = await call({action:'encrypt',context:CONTEXT,secret});
  const second = await call({action:'encrypt',context:CONTEXT,secret});
  assert.equal(first.status,200); assert.equal(second.status,200);
  assert.notEqual(first.result,second.result);
  assert(!first.result.includes(secret));
  assert.equal((await call({action:'decrypt',context:CONTEXT,envelope:first.result})).result,secret);
  for (const context of [{...CONTEXT,tenantId:'b'},{...CONTEXT,version:2},{...CONTEXT,channelId:'99999'}]) {
    await fails(call,{action:'decrypt',context,envelope:first.result},503,'LINE_PAY_CREDENTIAL_INVALID');
  }
  const parts = first.result.split('.');
  const bytes = Buffer.from(parts[2],'base64'); bytes[0] ^= 1;
  const tampered = [parts[0],parts[1],bytes.toString('base64')].join('.');
  await fails(call,{action:'decrypt',context:CONTEXT,envelope:tampered},503,'LINE_PAY_CREDENTIAL_INVALID');
  for (const envelope of ['plaintext','v2.a.b','v1.a.b','v1..','x'.repeat(5601)]) {
    await fails(call,{action:'decrypt',context:CONTEXT,envelope},503,'LINE_PAY_CREDENTIAL_INVALID');
  }
  for (const LINE_PAY_CREDENTIAL_KEY of [null,'plain-secret',Buffer.alloc(16).toString('base64')]) {
    await fails(call,{action:'encrypt',context:CONTEXT,secret,bindings:{LINE_PAY_CREDENTIAL_KEY}},503,'LINE_PAY_SECRET_UNAVAILABLE');
  }
  await fails(call,{action:'encrypt',context:CONTEXT,secret:''},400,'LINE_PAY_CREDENTIAL_INVALID');
  assert.equal((await call({action:'hash',value:'abc'})).result,'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
});

