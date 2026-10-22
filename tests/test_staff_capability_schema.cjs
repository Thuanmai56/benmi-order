// Actual local D1, synthetic rows, schema snapshots from the R02 read-only audit.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const { Miniflare, convertV4MiniflareOptions } = require('../benmi-worker-official/node_modules/miniflare');
const schemas = require('./fixtures/staff-ordering/schema-baselines.json');
const migration = fs.readFileSync(path.join(__dirname, '../benmi-worker-official/migrations/0071_add_staff_ordering_capabilities.sql'), 'utf8');
const tables = ['tenants', 'tenant_config', 'orders', 'order_items', 'restaurant_tables', 'staff_sessions', 'staff_order_requests'];
const rows = async (db, table) => (await db.prepare(`SELECT * FROM ${table} ORDER BY 1`).all()).results;
const snapshot = async db => Object.fromEntries(await Promise.all(tables.map(async table => [table, await rows(db, table)])));
const schemaObjects = async db => (await db.prepare("SELECT name,type,sql FROM sqlite_master WHERE name <> 'tenant_config' ORDER BY name").all()).results;

async function seed(db, shape) {
  await db.batch([
    db.prepare('CREATE TABLE tenants(id TEXT PRIMARY KEY, name TEXT NOT NULL)'),
    db.prepare(shape.tenantConfigSql),
    db.prepare("CREATE TABLE orders(key TEXT PRIMARY KEY, tenant_id TEXT NOT NULL REFERENCES tenants(id), table_id TEXT, source TEXT NOT NULL DEFAULT 'legacy', revision INTEGER NOT NULL DEFAULT 0, status TEXT NOT NULL, total_amount REAL NOT NULL)"),
    db.prepare('CREATE TABLE order_items(id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL REFERENCES tenants(id), order_key TEXT NOT NULL REFERENCES orders(key), quantity INTEGER NOT NULL, subtotal REAL NOT NULL)'),
    ...shape.staffObjects.filter(x => x.type === 'table').map(x => db.prepare(x.sql)),
    ...shape.staffObjects.filter(x => x.type !== 'table').map(x => db.prepare(x.sql)),
    db.prepare("INSERT INTO tenants VALUES ('fixture-closed','Closed fixture'),('fixture-enabled','Previously enabled fixture')"),
    db.prepare("INSERT INTO tenant_config(tenant_id,brand_name,staff_ordering_enabled,updated_at) VALUES ('fixture-closed','Closed fixture',0,'2026-01-01 00:00:00'),('fixture-enabled','Previously enabled fixture',1,'2026-01-01 00:00:00')"),
    db.prepare("INSERT INTO restaurant_tables(id,tenant_id,label) VALUES ('fixture-table','fixture-enabled','A1')"),
    db.prepare("INSERT INTO orders VALUES ('fixture-legacy','fixture-closed',NULL,'legacy',0,'NEW',30),('fixture-staff','fixture-enabled','fixture-table','staff',1,'ACCEPTED',50)"),
    db.prepare("INSERT INTO order_items VALUES ('fixture-item','fixture-enabled','fixture-staff',1,50)"),
    db.prepare("INSERT INTO staff_sessions(token_hash,tenant_id,expires_at) VALUES ('synthetic-hash','fixture-enabled','2027-01-01 00:00:00')"),
    db.prepare("INSERT INTO staff_order_requests(tenant_id,request_id,request_hash,order_key,round_number,response_json) VALUES ('fixture-enabled','synthetic-request','synthetic-hash','fixture-staff',1,'{\"ok\":true}')")
  ]);
}

for (const [environment, shape] of Object.entries(schemas.environments)) {
  test(`${environment}: capability migration on the observed schema`, async t => {
    const mf = new Miniflare(convertV4MiniflareOptions({ workers: [{ modules: true, script: 'export default {fetch(){return new Response("local")}}', d1Databases: ['DB'] }] }));
    try {
      const db = await mf.getD1Database('DB');
      await seed(db, shape);

      await t.test('adds an empty object without changing existing data, flags, indexes or triggers', async () => {
        const before = await snapshot(db);
        const objects = await schemaObjects(db);
        await db.prepare(migration).run();
        const after = await snapshot(db);
        assert(after.tenant_config.every(row => row.staff_ordering_capabilities === '{}'));
        after.tenant_config = after.tenant_config.map(({ staff_ordering_capabilities, ...old }) => old);
        assert.deepEqual(after, before);
        assert.deepEqual(await schemaObjects(db), objects);
        const column = (await db.prepare('PRAGMA table_info(tenant_config)').all()).results.find(x => x.name === 'staff_ordering_capabilities');
        assert.equal(column.notnull, 1);
        assert.equal(column.dflt_value, "'{}'");
      });

      await t.test('old insert statements omit the new field and still create a disabled tenant', async () => {
        await db.batch([
          db.prepare("INSERT INTO tenants VALUES ('fixture-new','New fixture')"),
          db.prepare("INSERT INTO tenant_config(tenant_id,brand_name) VALUES ('fixture-new','New fixture')")
        ]);
        const row = await db.prepare("SELECT staff_ordering_enabled,staff_ordering_capabilities FROM tenant_config WHERE tenant_id='fixture-new'").first();
        assert.deepEqual(row, { staff_ordering_enabled: 0, staff_ordering_capabilities: '{}' });
      });

      await t.test('rejects NULL, invalid JSON, arrays and scalar JSON without changing the row', async () => {
        for (const invalid of [null, '', '{broken', '[]', 'null', 'true', '1', '"enabled"']) {
          await assert.rejects(db.prepare("UPDATE tenant_config SET staff_ordering_capabilities=? WHERE tenant_id='fixture-closed'").bind(invalid).run(), /constraint|malformed JSON/i);
          assert.equal((await db.prepare("SELECT staff_ordering_capabilities FROM tenant_config WHERE tenant_id='fixture-closed'").first()).staff_ordering_capabilities, '{}');
        }
      });

      await t.test('legacy config updates preserve an object already stored by a future writer', async () => {
        const value = JSON.stringify({ tables_read: true });
        await db.prepare("UPDATE tenant_config SET staff_ordering_capabilities=? WHERE tenant_id='fixture-closed'").bind(value).run();
        await db.prepare("UPDATE tenant_config SET brand_name='Updated fixture' WHERE tenant_id='fixture-closed'").run();
        const row = await db.prepare("SELECT brand_name,staff_ordering_enabled,staff_ordering_capabilities FROM tenant_config WHERE tenant_id='fixture-closed'").first();
        assert.deepEqual(row, { brand_name: 'Updated fixture', staff_ordering_enabled: 0, staff_ordering_capabilities: value });
      });

      await t.test('a rejected capability write rolls back the entire D1 batch', async () => {
        const before = await snapshot(db);
        await assert.rejects(db.batch([
          db.prepare("UPDATE orders SET status='PAID' WHERE key='fixture-staff'"),
          db.prepare("UPDATE tenant_config SET staff_ordering_capabilities='[]' WHERE tenant_id='fixture-enabled'")
        ]), /constraint/i);
        assert.deepEqual(await snapshot(db), before);
      });

      await t.test('accidental reapply fails without resetting existing capability or business data', async () => {
        const before = await snapshot(db);
        await assert.rejects(db.prepare(migration).run(), /duplicate column/i);
        assert.deepEqual(await snapshot(db), before);
        assert.deepEqual((await db.prepare('PRAGMA foreign_key_check').all()).results, []);
      });
    } finally {
      await mf.dispose();
    }
  });
}
