const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { DatabaseSync } = require('node:sqlite');
const ts = require('../benmi-worker-official/node_modules/typescript');
require.extensions['.ts'] = (module, file) => module._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS }
}).outputText, file);
const worker = require('../benmi-worker-official/src/index.ts').default;
const { getTenantBootstrap } = require('../benmi-worker-official/src/modules/bootstrap.ts');
const { getMarketplaceTenants } = require('../benmi-worker-official/src/modules/marketplace.ts');
const { createTenantRepository } = require('../benmi-worker-official/src/repositories/tenant.repository.ts');
const { resolveTenantContext } = require('../benmi-worker-official/src/modules/tenant.ts');
function fixture(includeOptional = true) {
  const db = new DatabaseSync(':memory:');
  const tables = ['tenant_config','orders','order_items','pending_actions','daily_order_counters','menu_categories','menu_items',
    'menu_customizations','menu_bundle_rules','menu_customization_option_rules','modifier_groups','modifier_options',
    'item_modifier_links','category_modifier_links','admin_menu_seed_receipts','restaurant_tables','staff_order_requests',
    'staff_sessions','tenant_line_runtime','tenant_line_webhook_probes'];
  db.exec('CREATE TABLE tenants(id TEXT PRIMARY KEY);');
  for (const table of tables.filter(table => includeOptional || !['modifier_groups','modifier_options','item_modifier_links','category_modifier_links','tenant_line_runtime','tenant_line_webhook_probes'].includes(table))) db.exec(`CREATE TABLE ${table}(id TEXT PRIMARY KEY,tenant_id TEXT);`);
  db.exec("INSERT INTO tenants VALUES('primary'),('other'),('benmi'); INSERT INTO orders VALUES('cancelled','primary');");
  db.exec(fs.readFileSync('benmi-worker-official/migrations/0067_tenant_lifecycle.sql', 'utf8'));
  const env = { DB: {
    prepare(sql) { const build=params=>({ bind(...args){return build(args);},async first(){return db.prepare(sql).get(...params)||null;},
      async all(){return {results:db.prepare(sql).all(...params)};} }); return build([]); }
  }, ORDER_STATE: { async get(key){return key==='marketplace:tenants_catalog' ? JSON.stringify({data:[
      {tenantId:'primary',storeStatus:'open',parsedHours:{}},{tenantId:'other',storeStatus:'open',parsedHours:{}}
    ]}) : JSON.stringify({tenantId:'primary',bootstrapVersion:2,menuComplete:true});} } };
  return {db,env};
}
test('backfill remembers orders; cancellation/removal cannot erase history; other tenant stays active',()=>{
  const {db}=fixture();
  assert.equal(db.prepare("SELECT has_order_history FROM tenant_lifecycle WHERE tenant_id='primary'").get().has_order_history,1);
  db.exec("DELETE FROM orders WHERE tenant_id='primary'; UPDATE tenant_lifecycle SET state='deleted' WHERE tenant_id='primary';");
  assert.throws(()=>db.exec("UPDATE tenant_lifecycle SET has_order_history=0 WHERE tenant_id='primary'"),/IMMUTABLE/);
  assert.throws(()=>db.exec("INSERT INTO orders VALUES('late','primary')"),/TENANT_DELETED/);
  db.exec("INSERT INTO orders VALUES('valid','other')");
  assert.equal(db.prepare("SELECT has_order_history FROM tenant_lifecycle WHERE tenant_id='other'").get().has_order_history,1);
  db.close();
});
test('deleted lifecycle overrides cached context, cached bootstrap, and legacy environment fallback',async()=>{
  const {db,env}=fixture();db.exec("UPDATE tenant_lifecycle SET state='deleted' WHERE tenant_id IN ('primary','benmi')");
  const poison={...env,LIFF_ID:'cached-fallback',LINE_CHANNEL_ACCESS_TOKEN:'fallback',ORDER_STATE:{get(){throw Error('cache must not be read');}}};
  assert.equal(await createTenantRepository(poison.DB,poison.ORDER_STATE,poison).getTenantContext('primary'),null);
  assert.equal(await createTenantRepository(poison.DB,poison.ORDER_STATE,poison).getTenantContext('benmi'),null);
  assert.equal(await resolveTenantContext('primary',poison),null);
  assert.equal((await getTenantBootstrap(new Request('https://example.com/api/tenant/bootstrap?tenant_id=primary'),poison)).status,410);
  db.close();
});
test('all customer/POS APIs and both webhook routes reject deleted tenants before cache or LINE work',async()=>{
  const {db,env}=fixture();db.exec("UPDATE tenant_lifecycle SET state='deleted' WHERE tenant_id IN ('primary','benmi')");
  const context={waitUntil(){}};
  for(const [path,method] of [['/api/menu','GET'],['/api/config','GET'],['/api/orders','GET'],['/api/orders/history-all','GET'],
    ['/api/auth','POST'],['/api/create','POST'],['/api/orders/append','POST'],['/api/orders/modify','POST'],['/api/image','GET']]) {
    const response=await worker.fetch(new Request(`https://example.com${path}?tenant_id=primary`,{method}),env,context);
    assert.equal(response.status,410,path);assert.equal(response.headers.get('cache-control'),'no-store');
  }
  assert.equal((await worker.fetch(new Request('https://example.com/webhook/primary',{method:'POST'}),env,context)).status,410);
  assert.equal((await worker.fetch(new Request('https://example.com/webhook',{method:'POST'}),env,context)).status,404);
  assert.equal((await worker.fetch(new Request('https://example.com/webhook/primary/verify/11111111-1111-1111-1111-111111111111',{method:'POST'}),env,context)).status,410);
  db.close();
});
test('marketplace strips deleted tenants even from an old KV catalog',async()=>{
  const {db,env}=fixture();db.exec("UPDATE tenant_lifecycle SET state='deleted' WHERE tenant_id='primary'");
  const response=await getMarketplaceTenants(new Request('https://example.com/api/marketplace'),env);
  assert.equal(response.status,200);assert.deepEqual((await response.json()).data.map(t=>t.tenantId),['other']);db.close();
});
test('purge fences re-creation, cross-tenant row moves, and late menu/config/runtime writes',()=>{
  const {db}=fixture();db.exec("INSERT INTO menu_items VALUES('deleted-item','primary'); UPDATE tenant_lifecycle SET state='purging' WHERE tenant_id='primary'");
  assert.throws(()=>db.exec("UPDATE menu_items SET tenant_id='other' WHERE id='deleted-item'"),/TENANT_DELETED/);
  for(const table of ['tenant_config','menu_items','staff_order_requests'])
    assert.throws(()=>db.exec(`INSERT INTO ${table} VALUES('late-${table}','primary')`),/TENANT_DELETED/);
  assert.throws(()=>db.exec("DELETE FROM tenants WHERE id='primary'"),/PERMANENT_DELETE_FORBIDDEN/);
  assert.throws(()=>db.exec("DELETE FROM tenant_lifecycle WHERE tenant_id='primary'"),/IMMUTABLE/);db.close();
});

test('migration applies without optional development menu or LINE projection tables', () => {
  const {db} = fixture(false);
  assert.equal(db.prepare("SELECT state FROM tenant_lifecycle WHERE tenant_id='other'").get().state, 'active');
  db.close();
});
