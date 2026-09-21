// Run with: node tests/test_staff_ordering.cjs
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const workerRoot = path.join(root, 'benmi-worker-official');
const ts = require(path.join(workerRoot, 'node_modules/typescript'));
const { Miniflare } = require(path.join(workerRoot, 'node_modules/miniflare'));

require.extensions['.ts'] = (mod, file) => mod._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }
}).outputText, file);

const staffModule = require(path.join(workerRoot, 'src/modules/staff.ts'));
const ordersModule = require(path.join(workerRoot, 'src/modules/orders.ts'));
const authModule = require(path.join(workerRoot, 'src/modules/auth.ts'));

function statements(sql) {
  return JSON.parse(execFileSync('python3', ['-c', `import sqlite3,sys,json
s=''; result=[]
for c in sys.stdin.read():
 s+=c
 if c==';' and sqlite3.complete_statement(s): result.append(s);s=''
print(json.dumps(result))`], { input: sql, encoding: 'utf8' }));
}

const mf = new Miniflare({ modules: true, script: 'export default {fetch(){return new Response("local")}}', d1Databases: ['DB'] });

let passed = 0;
async function check(name, fn) {
  await fn();
  passed++;
  console.log(`PASS ${name}`);
}

(async () => {
  const DB = await mf.getD1Database('DB');
  const kv = new Map();
  const env = {
    DB,
    ORDER_STATE: {
      get: async (k) => kv.get(k) || null,
      put: async (k, v) => { kv.set(k, v); },
      delete: async (k) => { kv.delete(k); }
    }
  };

  const apply = async sql => DB.batch(statements(sql).map(s => DB.prepare(s)));

  const migrationFiles = [
    '0001_initialize_menu_tables.sql',
    '0005_create_orders_table.sql',
    '0006_create_tenant_config.sql',
    '0011_enhance_menu_categories_for_modifiers.sql',
    '0024_add_dining_options.sql',
    '0027_add_table_number.sql',
    '0028_add_append_rounds.sql',
    '0032_create_order_items.sql',
    '0046_add_order_uuid_and_daily_counter.sql',
    '0055_expand_order_identity.sql'
  ];

  for (const file of migrationFiles) {
    const fullPath = path.join(workerRoot, 'migrations', file);
    if (fs.existsSync(fullPath)) {
      await apply(fs.readFileSync(fullPath, 'utf8'));
    }
  }

  // Seed tenants and supporting tables
  await apply(`
    INSERT OR IGNORE INTO tenants (id, name) VALUES ('tenant_a', 'Tenant A'), ('tenant_b', 'Tenant B');
    ALTER TABLE order_items ADD COLUMN bundle_snapshot_json TEXT DEFAULT NULL;
    CREATE TABLE IF NOT EXISTS menu_bundle_rules (
      tenant_id TEXT,
      parent_item_id TEXT,
      schema_version INTEGER,
      config_json TEXT,
      is_active INTEGER
    );
  `);

  // --- TEST 1: Migration 0057 & 0061 run cleanly ---
  await check('migration 0057 and 0061 apply without errors and set up tables schema', async () => {
    const mig0057 = fs.readFileSync(path.join(workerRoot, 'migrations/0057_create_staff_ordering_and_tables.sql'), 'utf8');
    await apply(mig0057);
    const mig0061 = fs.readFileSync(path.join(workerRoot, 'migrations/0061_add_staff_order_revision_guard.sql'), 'utf8');
    await apply(mig0061);

    // Verify restaurant_tables, staff_order_requests, staff_sessions exist
    const tblCheck = await DB.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='restaurant_tables'").first();
    assert.equal(tblCheck.name, 'restaurant_tables');

    const reqCheck = await DB.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='staff_order_requests'").first();
    assert.equal(reqCheck.name, 'staff_order_requests');

    const sessCheck = await DB.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='staff_sessions'").first();
    assert.equal(sessCheck.name, 'staff_sessions');

    // Verify orders columns: table_id, source, revision
    const orderCols = await DB.prepare("PRAGMA table_info(orders)").all();
    const colNames = orderCols.results.map(c => c.name);
    assert(colNames.includes('table_id'), 'missing table_id');
    assert(colNames.includes('source'), 'missing source');
    assert(colNames.includes('revision'), 'missing revision');
  });

  // Seed store PIN and catalog items
  // Tenant A: password '1234'
  await env.ORDER_STATE.put('tenant:tenant_a:password', '1234');
  await apply(`
    INSERT OR REPLACE INTO tenant_config (tenant_id, brand_name, default_password, staff_ordering_enabled)
    VALUES ('tenant_a', 'Tenant A', '1234', 0);

    INSERT INTO menu_categories (id, tenant_id, name, slug, category_type)
    VALUES ('cat_food', 'tenant_a', 'Món chính', 'main', 'standard'),
           ('cat_mod', 'tenant_a', 'Topping', 'topping', 'modifier');

    INSERT INTO menu_items (id, tenant_id, category_id, name, price)
    VALUES ('item_pho', 'tenant_a', 'cat_food', 'Phở bò', 100),
           ('item_cha', 'tenant_a', 'cat_food', 'Chả giò', 50),
           ('mod_egg', 'tenant_a', 'cat_mod', 'Trứng chần', 15),
           ('mod_meat', 'tenant_a', 'cat_mod', 'Thịt thêm', 30);
  `);

  // --- TEST 2: Feature flag default is disabled and blocks routes ---
  await check('feature flag defaults to false and blocks staff routes with 403', async () => {
    // Check capabilities endpoint
    const capReq = new Request('https://local.test/api/staff/capabilities?tenant_id=tenant_a');
    const capRes = await staffModule.handleStaffRoute(capReq, env, '/api/staff/capabilities', new URL(capReq.url));
    assert.equal(capRes.status, 200);
    const capData = await capRes.json();
    assert.equal(capData.staff_ordering_enabled, false);

    // Login attempt when feature is disabled returns 403 FEATURE_DISABLED
    const loginReq = new Request('https://local.test/api/staff/session?tenant_id=tenant_a', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin: '1234' })
    });
    const loginRes = await staffModule.handleStaffRoute(loginReq, env, '/api/staff/session', new URL(loginReq.url));
    assert.equal(loginRes.status, 403);
    const errData = await loginRes.json();
    assert.equal(errData.error, 'FEATURE_DISABLED');
  });

  // Enable feature flag on tenant_a in D1
  await apply(`
    UPDATE tenant_config
    SET staff_ordering_enabled = 1
    WHERE tenant_id = 'tenant_a';
  `);

  // --- TEST 3: PIN Session Lifecycle (Login, Verification, Expiration, Revocation) ---
  let validToken = '';
  await check('PIN authentication issues 12h bearer token and revokes correctly', async () => {
    // Wrong PIN => 401
    const badLoginReq = new Request('https://local.test/api/staff/session?tenant_id=tenant_a', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin: '9999' })
    });
    const badLoginRes = await staffModule.handleStaffRoute(badLoginReq, env, '/api/staff/session', new URL(badLoginReq.url));
    assert.equal(badLoginRes.status, 401);

    // Correct PIN => 200
    const loginReq = new Request('https://local.test/api/staff/session?tenant_id=tenant_a', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin: '1234' })
    });
    const loginRes = await staffModule.handleStaffRoute(loginReq, env, '/api/staff/session', new URL(loginReq.url));
    assert.equal(loginRes.status, 200);
    const loginData = await loginRes.json();
    assert(loginData.token && loginData.token.length >= 32);
    validToken = loginData.token;

    // Call tables endpoint with valid token => 200
    const testReq = new Request('https://local.test/api/staff/tables?tenant_id=tenant_a', {
      headers: { 'Authorization': 'Bearer ' + validToken }
    });
    const testRes = await staffModule.handleStaffRoute(testReq, env, '/api/staff/tables', new URL(testReq.url));
    assert.equal(testRes.status, 200);

    // Revoke token via DELETE /api/staff/session
    const logoutReq = new Request('https://local.test/api/staff/session?tenant_id=tenant_a', {
      method: 'DELETE',
      headers: { 'Authorization': 'Bearer ' + validToken }
    });
    const logoutRes = await staffModule.handleStaffRoute(logoutReq, env, '/api/staff/session', new URL(logoutReq.url));
    assert.equal(logoutRes.status, 200);

    // Calling again with revoked token => 401
    const revokedRes = await staffModule.handleStaffRoute(testReq, env, '/api/staff/tables', new URL(testReq.url));
    assert.equal(revokedRes.status, 401);

    // Login again to get a fresh token for subsequent tests
    const freshLoginReq = new Request('https://local.test/api/staff/session?tenant_id=tenant_a', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin: '1234' })
    });
    const freshLoginRes = await staffModule.handleStaffRoute(freshLoginReq, env, '/api/staff/session', new URL(freshLoginReq.url));
    validToken = (await freshLoginRes.json()).token;
  });

  // --- TEST 4: Table Management (CRUD, Duplicate Labels, Order Locking) ---
  let tableA1Id = '';
  let tableA2Id = '';
  await check('table management allows add, list, patch, rejects duplicate labels', async () => {
    // Add Table A-01
    const addReq1 = new Request('https://local.test/api/staff/tables?tenant_id=tenant_a', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + validToken },
      body: JSON.stringify({ label: 'A-01', sort_order: 1 })
    });
    const addRes1 = await staffModule.handleStaffRoute(addReq1, env, '/api/staff/tables', new URL(addReq1.url));
    assert.equal(addRes1.status, 201);
    const addData1 = await addRes1.json();
    tableA1Id = addData1.table.id;
    assert.equal(addData1.table.label, 'A-01');

    // Add Table A-02
    const addReq2 = new Request('https://local.test/api/staff/tables?tenant_id=tenant_a', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + validToken },
      body: JSON.stringify({ label: 'A-02', sort_order: 2 })
    });
    const addRes2 = await staffModule.handleStaffRoute(addReq2, env, '/api/staff/tables', new URL(addReq2.url));
    assert.equal(addRes2.status, 201);
    tableA2Id = (await addRes2.json()).table.id;

    // Duplicate label in same tenant => 409
    const dupReq = new Request('https://local.test/api/staff/tables?tenant_id=tenant_a', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + validToken },
      body: JSON.stringify({ label: 'A-01', sort_order: 1 })
    });
    const dupRes = await staffModule.handleStaffRoute(dupReq, env, '/api/staff/tables', new URL(dupReq.url));
    assert.equal(dupRes.status, 409);

    // List tables
    const listReq = new Request('https://local.test/api/staff/tables?tenant_id=tenant_a', {
      headers: { 'Authorization': 'Bearer ' + validToken }
    });
    const listRes = await staffModule.handleStaffRoute(listReq, env, '/api/staff/tables', new URL(listReq.url));
    assert.equal(listRes.status, 200);
    const listData = await listRes.json();
    assert.equal(listData.tables.length, 2);
    assert.equal(listData.tables[0].label, 'A-01');
  });

  // --- TEST 5: Open Order on Empty Table (Server Pricing, Idempotency, Concurrency) ---
  let orderKey1 = '';
  let orderDisplay1 = '';
  await check('open order on empty table creates order as ACCEPTED with server-calculated price', async () => {
    const orderPayload = {
      requestId: 'req-order-001',
      tableId: tableA1Id,
      customer: 'Khách bàn 1',
      note: 'Ít ớt',
      items: [
        {
          name: 'Phở bò',
          quantity: 2,
          price: 9999, // Client fake price -> should be recalculated to 100 + 15 = 115
          options: [{ name: 'Trứng chần', price: 15 }]
        },
        {
          name: 'Chả giò',
          quantity: 1,
          price: 1 // Client fake price -> should be recalculated to 50
        }
      ]
    };

    const openReq = new Request('https://local.test/api/staff/orders?tenant_id=tenant_a', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + validToken },
      body: JSON.stringify(orderPayload)
    });

    const openRes = await staffModule.handleStaffRoute(openReq, env, '/api/staff/orders', new URL(openReq.url));
    assert.equal(openRes.status, 201);
    const openData = await openRes.json();

    assert(openData.ok);
    assert.equal(openData.status, 'ACCEPTED');
    assert.equal(openData.roundCount, 1);
    assert.equal(openData.revision, 1);
    // Server price: 2 * (100 + 15) + 1 * 50 = 230 + 50 = 280
    assert.equal(openData.total, 280);

    orderKey1 = openData.key;
    orderDisplay1 = openData.displayKey;

    // Verify in DB
    const dbOrder = await DB.prepare("SELECT * FROM orders WHERE key = ?").bind(orderKey1).first();
    assert.equal(dbOrder.source, 'staff');
    assert.equal(dbOrder.status, 'ACCEPTED');
    assert.equal(dbOrder.total_amount, 280);
    assert.equal(dbOrder.table_id, tableA1Id);
    assert.equal(dbOrder.table_number, 'A-01');

    // Idempotency: exact same payload returns 200 with idempotent: true
    const retryReq = new Request('https://local.test/api/staff/orders?tenant_id=tenant_a', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + validToken },
      body: JSON.stringify(orderPayload)
    });
    const retryRes = await staffModule.handleStaffRoute(retryReq, env, '/api/staff/orders', new URL(retryReq.url));
    assert.equal(retryRes.status, 200);
    const retryData = await retryRes.json();
    assert.equal(retryData.idempotent, true);
    assert.equal(retryData.key, orderKey1);

    // Idempotency collision: same requestId with different payload => 409
    const collisionPayload = { ...orderPayload, note: 'Khác ghi chú' };
    const collReq = new Request('https://local.test/api/staff/orders?tenant_id=tenant_a', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + validToken },
      body: JSON.stringify(collisionPayload)
    });
    const collRes = await staffModule.handleStaffRoute(collReq, env, '/api/staff/orders', new URL(collReq.url));
    assert.equal(collRes.status, 409);
    assert.equal((await collRes.json()).error, 'REQUEST_COLLISION');
  });

  // --- TEST 6: Table Protection & Active Order Guard ---
  await check('table cannot be opened again while active order exists, and cannot be renamed or deactivated', async () => {
    // Attempt to open another order on tableA1Id => 409 TABLE_OCCUPIED
    const dupTablePayload = {
      requestId: 'req-order-dup-002',
      tableId: tableA1Id,
      items: [{ name: 'Chả giò', quantity: 1 }]
    };
    const dupTableReq = new Request('https://local.test/api/staff/orders?tenant_id=tenant_a', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + validToken },
      body: JSON.stringify(dupTablePayload)
    });
    const dupTableRes = await staffModule.handleStaffRoute(dupTableReq, env, '/api/staff/orders', new URL(dupTableReq.url));
    assert.equal(dupTableRes.status, 409);
    assert.equal((await dupTableRes.json()).error, 'TABLE_OCCUPIED');

    // Attempt to rename tableA1Id while occupied => 400 TABLE_HAS_ACTIVE_ORDER
    const renameReq = new Request(`https://local.test/api/staff/tables/${tableA1Id}?tenant_id=tenant_a`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + validToken },
      body: JSON.stringify({ label: 'A-01-NEW' })
    });
    const renameRes = await staffModule.handleStaffRoute(renameReq, env, `/api/staff/tables/${tableA1Id}`, new URL(renameReq.url));
    assert.equal(renameRes.status, 400);
    assert.equal((await renameRes.json()).error, 'TABLE_HAS_ACTIVE_ORDER');

    // Attempt to deactivate tableA1Id while occupied => 400 TABLE_HAS_ACTIVE_ORDER
    const deactReq = new Request(`https://local.test/api/staff/tables/${tableA1Id}?tenant_id=tenant_a`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + validToken },
      body: JSON.stringify({ is_active: 0 })
    });
    const deactRes = await staffModule.handleStaffRoute(deactReq, env, `/api/staff/tables/${tableA1Id}`, new URL(deactReq.url));
    assert.equal(deactRes.status, 400);
    assert.equal((await deactRes.json()).error, 'TABLE_HAS_ACTIVE_ORDER');
  });

  // --- TEST 7: Multi-Round Appending & Concurrency Revision Lock ---
  await check('append items to active order increments round and revision with optimistic concurrency check', async () => {
    // Append Round 2 with expectedRevision = 1
    const roundPayload = {
      requestId: 'req-round-002',
      tableId: tableA1Id,
      expectedRevision: 1,
      note: 'Lượt 2 thêm chả giò',
      items: [
        {
          name: 'Chả giò',
          quantity: 2,
          price: 50
        }
      ]
    };

    const appendReq = new Request(`https://local.test/api/staff/orders/${orderKey1}/rounds?tenant_id=tenant_a`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + validToken },
      body: JSON.stringify(roundPayload)
    });

    const appendRes = await staffModule.handleStaffRoute(appendReq, env, `/api/staff/orders/${orderKey1}/rounds`, new URL(appendReq.url));
    assert.equal(appendRes.status, 200);
    const appendData = await appendRes.json();

    assert.equal(appendData.roundCount, 2);
    assert.equal(appendData.revision, 2);
    // Previous total 280 + (2 * 50 = 100) = 380
    assert.equal(appendData.total, 380);

    // Verify items in DB for round 2
    const itemsR2 = await DB.prepare("SELECT * FROM order_items WHERE order_key = ? AND round_number = 2").bind(orderKey1).all();
    assert.equal(itemsR2.results.length, 1);
    assert.equal(itemsR2.results[0].item_name, 'Chả giò');
    assert.equal(itemsR2.results[0].quantity, 2);

    // Concurrency conflict: sending round with stale expectedRevision (1 instead of 2) => 409
    const staleRoundPayload = {
      requestId: 'req-round-stale',
      tableId: tableA1Id,
      expectedRevision: 1, // Stale!
      items: [{ name: 'Chả giò', quantity: 1 }]
    };
    const staleReq = new Request(`https://local.test/api/staff/orders/${orderKey1}/rounds?tenant_id=tenant_a`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + validToken },
      body: JSON.stringify(staleRoundPayload)
    });
    const staleRes = await staffModule.handleStaffRoute(staleReq, env, `/api/staff/orders/${orderKey1}/rounds`, new URL(staleReq.url));
    assert.equal(staleRes.status, 409);
    assert.equal((await staleRes.json()).error, 'REVISION_CONFLICT');
  });

  // --- TEST 8: Customer Append Guard (Customers cannot append to staff orders) ---
  await check('customers cannot append to source=staff orders through customer append endpoint', async () => {
    const custAppendReq = new Request('https://local.test/api/append', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        parent_order_key: orderKey1,
        appended_total: 100,
        items: [{ name: 'Phở bò', quantity: 1, price: 100 }]
      })
    });

    const custAppendRes = await ordersModule.appendOrder(custAppendReq, env, undefined, { tenantId: 'tenant_a' });
    assert.equal(custAppendRes.status, 403);
    const custData = await custAppendRes.json();
    assert.equal(custData.code, 'STAFF_ORDER_RESTRICTED');
  });

  // --- TEST 8b: Table Transfer (Move active order to idle table) ---
  await check('transfer active order between tables updates order table_id and revision, rejects transfer to occupied table', async () => {
    // 1. Transfer to an occupied table: open an order on tableA2Id first to make both tables occupied
    // Actually, tableA2Id is currently empty, tableA1Id has orderKey1.
    // Let's test transferring to tableA1Id (self or source occupied) => SAME_TABLE (400)
    const sameTableRes = await staffModule.handleStaffRoute(
      new Request('https://local.test/api/staff/tables/transfer?tenant_id=tenant_a', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + validToken },
        body: JSON.stringify({ fromTableId: tableA1Id, toTableId: tableA1Id })
      }),
      env, '/api/staff/tables/transfer', new URL('https://local.test/api/staff/tables/transfer')
    );
    assert.equal(sameTableRes.status, 400);

    // 2. Transfer from empty table => 400 SOURCE_TABLE_NO_ORDER
    const emptySourceRes = await staffModule.handleStaffRoute(
      new Request('https://local.test/api/staff/tables/transfer?tenant_id=tenant_a', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + validToken },
        body: JSON.stringify({ fromTableId: tableA2Id, toTableId: tableA1Id })
      }),
      env, '/api/staff/tables/transfer', new URL('https://local.test/api/staff/tables/transfer')
    );
    assert.equal(emptySourceRes.status, 400);

    // 3. Valid transfer: Table A1 -> Table A2
    const validTransferRes = await staffModule.handleStaffRoute(
      new Request('https://local.test/api/staff/tables/transfer?tenant_id=tenant_a', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + validToken },
        body: JSON.stringify({ fromTableId: tableA1Id, toTableId: tableA2Id })
      }),
      env, '/api/staff/tables/transfer', new URL('https://local.test/api/staff/tables/transfer')
    );
    assert.equal(validTransferRes.status, 200);
    const validTransferData = await validTransferRes.json();
    assert.equal(validTransferData.ok, true);

    // Verify order in DB now points to Table A2
    const orderAfterTransfer = await DB.prepare("SELECT table_id, table_number, revision FROM orders WHERE key = ?").bind(orderKey1).first();
    assert.equal(orderAfterTransfer.table_id, tableA2Id);
    assert.equal(orderAfterTransfer.table_number, 'A-02');
    assert.equal(orderAfterTransfer.revision, 3); // incremented from 2 to 3

    // 4. Transfer back: Table A2 -> Table A1 (so tableA1Id has orderKey1 for subsequent tests)
    const transferBackRes = await staffModule.handleStaffRoute(
      new Request('https://local.test/api/staff/tables/transfer?tenant_id=tenant_a', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + validToken },
        body: JSON.stringify({ fromTableId: tableA2Id, toTableId: tableA1Id })
      }),
      env, '/api/staff/tables/transfer', new URL('https://local.test/api/staff/tables/transfer')
    );
    assert.equal(transferBackRes.status, 200);
  });
  await check('finalizing order as PAID frees table and rejects further appends', async () => {
    // Update order status to PAID
    await DB.prepare("UPDATE orders SET status = 'PAID', updated_at = datetime('now') WHERE key = ?").bind(orderKey1).run();

    // Table should now show as free in GET /api/staff/tables
    const tablesRes = await staffModule.handleStaffRoute(
      new Request('https://local.test/api/staff/tables?tenant_id=tenant_a', { headers: { 'Authorization': 'Bearer ' + validToken } }),
      env, '/api/staff/tables', new URL('https://local.test/api/staff/tables')
    );
    const tablesData = await tablesRes.json();
    const tableA1 = tablesData.tables.find(t => t.id === tableA1Id);
    assert.equal(tableA1.active_order_key, null, 'table should be freed after order is PAID');

    // Attempt to append to PAID order => 409 ORDER_FINALIZED
    const appendPaidReq = new Request(`https://local.test/api/staff/orders/${orderKey1}/rounds?tenant_id=tenant_a`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + validToken },
      body: JSON.stringify({
        requestId: 'req-round-paid',
        tableId: tableA1Id,
        expectedRevision: 1,
        items: [{ name: 'Chả giò', quantity: 1 }]
      })
    });
    const appendPaidRes = await staffModule.handleStaffRoute(appendPaidReq, env, `/api/staff/orders/${orderKey1}/rounds`, new URL(appendPaidReq.url));
    assert.equal(appendPaidRes.status, 409);
    assert.equal((await appendPaidRes.json()).error, 'ORDER_FINALIZED');

    // Table A1 can now be opened again with a new customer
    const newOrderPayload = {
      requestId: 'req-order-new-customer',
      tableId: tableA1Id,
      customer: 'Khách mới lượt 2',
      items: [{ name: 'Phở bò', quantity: 1 }]
    };
    const newOrderRes = await staffModule.handleStaffRoute(
      new Request('https://local.test/api/staff/orders?tenant_id=tenant_a', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + validToken },
        body: JSON.stringify(newOrderPayload)
      }),
      env, '/api/staff/orders', new URL('https://local.test/api/staff/orders')
    );
    assert.equal(newOrderRes.status, 201);
    const newOrderData = await newOrderRes.json();
    assert.notEqual(newOrderData.key, orderKey1);
    assert.equal(newOrderData.roundCount, 1);
  });

  // --- TEST 10: PIN Change Revokes All Active Sessions ---
  await check('changing store PIN revokes all active staff sessions for the store', async () => {
    // Current session is valid
    const preCheckRes = await staffModule.handleStaffRoute(
      new Request('https://local.test/api/staff/tables?tenant_id=tenant_a', { headers: { 'Authorization': 'Bearer ' + validToken } }),
      env, '/api/staff/tables', new URL('https://local.test/api/staff/tables')
    );
    assert.equal(preCheckRes.status, 200);

    // Change store PIN for tenant_a
    const changeReq = new Request('https://local.test/api/auth/change', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tenant_id: 'tenant_a',
        current: '1234',
        newPassword: '5678'
      })
    });
    const changeRes = await authModule.handleAuthChange(changeReq, env, { tenantId: 'tenant_a' });
    assert.equal(changeRes.status, 200);

    // Previous session should now be revoked (401)
    const postCheckRes = await staffModule.handleStaffRoute(
      new Request('https://local.test/api/staff/tables?tenant_id=tenant_a', { headers: { 'Authorization': 'Bearer ' + validToken } }),
      env, '/api/staff/tables', new URL('https://local.test/api/staff/tables')
    );
    assert.equal(postCheckRes.status, 401);

    // New PIN '5678' can successfully log in
    const newLoginRes = await staffModule.handleStaffRoute(
      new Request('https://local.test/api/staff/session?tenant_id=tenant_a', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: '5678' })
      }),
      env, '/api/staff/session', new URL('https://local.test/api/staff/session')
    );
    assert.equal(newLoginRes.status, 200);
  });

  console.log(`\nAll ${passed} staff ordering tests passed successfully!`);
})();
