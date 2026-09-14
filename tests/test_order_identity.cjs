// Run from either branch: node tests/test_order_identity.cjs
// Uses actual local D1 (Miniflare), real source handlers and synthetic data only.
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
const orders = require(path.join(workerRoot, 'src/modules/orders.ts'));
const identity = require(path.join(workerRoot, 'src/modules/order-identity.ts'));
const line = require(path.join(workerRoot, 'src/modules/line.ts'));
function statements(sql) {
  return JSON.parse(execFileSync('python3', ['-c', `import sqlite3,sys,json
s=''; result=[]
for c in sys.stdin.read():
 s+=c
 if c==';' and sqlite3.complete_statement(s): result.append(s);s=''
print(json.dumps(result))`], { input: sql, encoding: 'utf8' }));
}
const mf = new Miniflare({ modules: true, script: 'export default {fetch(){return new Response("local")}}', d1Databases: ['DB'] });
const originalFetch = global.fetch;
const outbound = [];
global.fetch = async (...args) => { outbound.push(args); return new Response('{}', { status: 200 }); };
const tenant = id => ({ tenantId: id, brandName: id, features: ['dine_in'], orderPrefix: 'B', storeStatus: 'open' });
const request = (route, body, id='a') => new Request(`https://local.test${route}?tenant_id=${id}`, body ? {method:'POST',body:JSON.stringify(body)} : {});
let passed=0;
async function check(name, fn) { await fn(); passed++; console.log(`PASS ${name}`); }
(async () => {
 const DB = await mf.getD1Database('DB');
 const env = { DB, ORDER_STATE: { get: async key => key.endsWith(':config_cache') ? JSON.stringify(tenant(key.split(':')[1])) : null, put: async()=>{}, delete:async()=>{} } };
 const apply = async sql => DB.batch(statements(sql).map(s=>DB.prepare(s)));
 await apply(`CREATE TABLE tenants(id TEXT PRIMARY KEY); INSERT INTO tenants VALUES ('a'),('b');`);
 for (const file of ['0005_create_orders_table.sql','0032_create_order_items.sql','0004_add_tenant_id_to_pending_actions.sql','0046_add_order_uuid_and_daily_counter.sql']) {
   await apply(fs.readFileSync(path.join(workerRoot,'migrations',file),'utf8'));
 }
 await apply(`ALTER TABLE orders ADD COLUMN dining_option TEXT DEFAULT 'takeaway'; ALTER TABLE orders ADD COLUMN table_number TEXT;
 ALTER TABLE orders ADD COLUMN round_count INTEGER DEFAULT 1; ALTER TABLE orders ADD COLUMN last_appended_at TEXT;
 ALTER TABLE order_items ADD COLUMN bundle_snapshot_json TEXT;
 CREATE TABLE menu_items(id TEXT, tenant_id TEXT, name TEXT, out_of_stock_until TEXT);
 CREATE TABLE menu_bundle_rules(tenant_id TEXT, parent_item_id TEXT, schema_version INTEGER, config_json TEXT, is_active INTEGER);
 INSERT INTO orders(key,tenant_id,customer_name,pickup_time,total_amount,order_content,created_at,status)
 VALUES ('B0914-T007','a','Legacy','12:00',100,'Old item','2026-09-14 01:00:00','NEW');
 INSERT INTO order_items(tenant_id,order_key,item_name,quantity,unit_price,subtotal) VALUES ('a','B0914-T007','Old item',1,100,100);
 INSERT INTO pending_actions(tenant_id,user_id,order_key,action_type,question_text) VALUES ('a','u','B0914-T007','CHANGE','time?');`);
 await check('migration preserves items/pending/amount and assigns a server UUID', async()=>{
   await apply(fs.readFileSync(path.join(workerRoot,'migrations/0055_expand_order_identity.sql'),'utf8'));
   const old=await DB.prepare('SELECT * FROM orders').first();
   assert(identity.isOrderId(old.order_id)); assert.equal(old.key,'B0914-T007'); assert.equal(old.display_key,'B0914-T007'); assert.equal(old.total_amount,100);
   assert.equal((await DB.prepare('SELECT order_key FROM order_items').first()).order_key,old.key);
   assert.equal((await DB.prepare('SELECT order_key FROM pending_actions').first()).order_key,old.key);
   assert.equal((await DB.prepare('PRAGMA foreign_key_check').all()).results.length,0);
   assert.equal(await identity.resolveOrderKey(env,'a','B0914-T007'),old.key);
   assert.equal(await identity.resolveOrderKey(env,'b','B0914-T007'),null);
 });
 await check('same display number across tenant and year never overwrites another order', async()=>{
   for(const [id,date] of [['a','2027-09-14'],['b','2026-09-14']]) {
     await orders.saveOrder(env,{key:crypto.randomUUID(),displayKey:'B0914-T007',businessDate:date,customer:'New',time:'12:00',total:20,content:'new',status:'NEW',createdAt:Date.parse(date+'T01:00:00Z')},id);
   }
   assert.equal((await DB.prepare('SELECT count(*) n FROM orders').first()).n,3);
   assert.equal((await DB.prepare("SELECT total_amount FROM orders WHERE legacy_key='B0914-T007'").first()).total_amount,100);
 });
 let created;
 await check('create persists UUID and display separately, items keep compatibility key', async()=>{
   const result=await orders.createOrder(request('/api/create',{uuid:'request-a',total:50,time:'12:00',items:[{name:'Item',quantity:1,price:50}]}),env,undefined,tenant('a'));
   assert.equal(result.status,200); created=await result.json(); assert(identity.isOrderId(created.orderId)); assert.notEqual(created.orderId,created.uuid); assert.match(created.displayKey,/^B\d{4}-T\d+$/);
   assert.equal((await DB.prepare('SELECT order_key FROM order_items WHERE item_name=?').bind('Item').first()).order_key,created.key);
 });
 await check('retry returns original ID and receipt; retry token is tenant scoped', async()=>{
   const retry=await (await orders.createOrder(request('/api/create',{uuid:'request-a',total:50}),env,undefined,tenant('a'))).json();
   assert.equal(retry.key,created.key);assert.equal(retry.displayKey,created.displayKey);
   const other=await (await orders.createOrder(request('/api/create',{uuid:'request-a',total:50},'b'),env,undefined,tenant('b'))).json();
   assert.notEqual(other.key,created.key);
 });
 await check('simultaneous retries yield one stored order', async()=>{
   const replies=await Promise.all(Array.from({length:4},()=>orders.createOrder(request('/api/create',{uuid:'race',total:10,items:[{name:'Race',quantity:1,price:10}]}),env,undefined,tenant('a'))));
   const values=await Promise.all(replies.map(r=>r.json()));assert.equal(new Set(values.map(v=>v.key)).size,1);
   assert.equal((await DB.prepare("SELECT count(*) n FROM order_items WHERE item_name='Race'").first()).n,1);
 });
 await check('append old key retains identity and receipt', async()=>{
   const res=await orders.executeAppendOrderInternal(env,'a','B0914-T007','Extra',20,'',undefined,undefined,[{name:'Extra',quantity:1,price:20}],undefined,tenant('a'));
   assert.equal(res.status,200);const data=await res.json();assert.equal(data.key,'B0914-T007');assert(identity.isOrderId(data.orderId));assert.equal(data.displayKey,'B0914-T007');
   assert.equal((await DB.prepare('SELECT total_amount FROM orders WHERE key=?').bind(data.key).first()).total_amount,120);
 });
 await check('update resolves old aliases within tenant only', async()=>{
   const cross=await orders.updateOrder(request('/api/update',{key:'B0914-T007',status:'PAID'},'b'),env,undefined,tenant('b'));assert.equal(cross.status,404);
   const own=await orders.updateOrder(request('/api/update',{key:'B0914-T007',status:'PAID'}),env,undefined,tenant('a'));assert.equal(own.status,200);
 });
 await check('live/history responses include readable display labels', async()=>{
   const list=await (await orders.getOrders(request('/api/orders'),env)).json();assert(Array.isArray(list));
   assert(list.every(o=>identity.isOrderId(o.orderId) && o.displayKey));
   const history=await (await orders.getOrdersByDate(new Request('https://local.test/api/orders/by-date?tenant_id=a&date=2026-09-14'),env)).json();
   assert(history.some(o=>o.displayKey==='B0914-T007'));
 });
 await check('LINE card displays receipt while buttons retain stable references', async()=>{
   const order={key:created.key,displayKey:created.displayKey,customer:'Test',status:'NEW',content:'Item',total:50,time:'12:00',createdAt:Date.now(),diningOption:'dine_in',tableNumber:'1'};
   const card=line.buildProgressFlexMessage(order,0,{...tenant('a'),liffUrl:'https://liff.line.me/test'});
   const text=JSON.stringify(card);assert(text.includes('#'+created.displayKey));assert(text.includes('order_key='+created.key));
   const reject=JSON.stringify(line.createRejectFlexBubble(created.key,'reason','Store',undefined,created.displayKey));
   assert(reject.includes('#'+created.displayKey));assert(reject.includes('orderKey='+created.key));
 });
 await check('LINE receipt links by immutable reference without creating a duplicate', async()=>{
   const before=(await DB.prepare('SELECT count(*) n FROM orders').first()).n;
   const text=`訂單編號：${created.displayKey}\n📦 訂單內容：\nItem\n💰 總金額：$50\n訂單參考：${created.key}`;
   await line.handleLineWebhook(request('/webhook/a',{events:[{type:'message',source:{userId:'u'},message:{type:'text',text}}]}),env,{waitUntil:()=>{}},tenant('a'));
   assert.equal((await DB.prepare('SELECT count(*) n FROM orders').first()).n,before);
   assert.equal((await DB.prepare('SELECT user_id FROM orders WHERE key=?').bind(created.key).first()).user_id,'u');
 });
 await check('LINE fallback allocates UUID and old receipt alias remains stable', async()=>{
   const before=(await DB.prepare('SELECT count(*) n FROM orders').first()).n;
   const text='訂單編號：OFFLINE-001\n📦 訂單內容：\nItem\n💰 總金額：$20';
   await line.handleLineWebhook(request('/webhook/a',{events:[{type:'message',source:{userId:'u'},message:{type:'text',text}}]}),env,{waitUntil:()=>{}},tenant('a'));
   assert.equal((await DB.prepare('SELECT count(*) n FROM orders').first()).n,before+1);
   assert.equal(await identity.resolveOrderKey(env,'a','B0914-T007'),(await DB.prepare("SELECT key FROM orders WHERE legacy_key='B0914-T007'").first()).key);
 });
 await check('counter outage returns 503 and never fabricates a number', async()=>{
   const broken={...env,DB:{prepare(){throw new Error('offline')}}};
   const response=await orders.createOrder(request('/api/create',{total:10}),broken,undefined,tenant('a'));assert.equal(response.status,503);
 });
 await check('database rejects changing immutable identities',async()=>{
   await assert.rejects(DB.prepare('UPDATE orders SET key=? WHERE key=?').bind(crypto.randomUUID(),created.key).run());
   await assert.rejects(DB.prepare('UPDATE orders SET order_id=? WHERE key=?').bind(crypto.randomUUID(),created.key).run());
 });

 await check('UUID lookup supports old orders without changing keys or tenant scope',async()=>{
   assert.equal(await identity.resolveOrderKey(env,'a',created.orderId),created.key);
   assert.equal(await identity.resolveOrderKey(env,'b',created.orderId),null);
   const res=await orders.updateOrder(request('/api/update',{key:created.orderId,status:'PAID'}),env,undefined,tenant('a'));
   assert.equal(res.status,200);
 });
 await check('concurrent stores with the same prefix retain both orders and items',async()=>{
   await DB.prepare('DELETE FROM daily_order_counters').run();
   const replies=await Promise.all(['a','b'].map(id=>orders.createOrder(request('/api/create',{uuid:'prefix-'+id,total:15,items:[{name:'Prefix-'+id,quantity:1,price:15}]},id),env,undefined,tenant(id))));
   const values=await Promise.all(replies.map(r=>r.json()));
   assert(values.every(v=>v.success && identity.isOrderId(v.orderId)));
   assert.notEqual(values[0].key,values[1].key); assert.equal(values[0].displayKey,values[1].displayKey);
   assert.equal((await DB.prepare("SELECT count(*) n FROM order_items WHERE item_name LIKE 'Prefix-%'").first()).n,2);
 });
 await check('legacy Worker create, retry, list and update work on expanded schema',async()=>{
   const Module=require('node:module');
   const legacy=new Module(path.join(workerRoot,'src/modules/legacy-orders.ts'),module);
   legacy.filename=path.join(workerRoot,'src/modules/legacy-orders.ts');legacy.paths=Module._nodeModulePaths(path.dirname(legacy.filename));
   const source=execFileSync('git',['show',(process.env.ORDER_IDENTITY_LEGACY_REF || '2e3600b')+':benmi-worker-official/src/modules/orders.ts'],{cwd:root,encoding:'utf8'});
   legacy._compile(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,legacy.filename);
   const old=legacy.exports;
   const body={uuid:'legacy-live',total:23,time:'12:00',items:[{name:'Old web',quantity:1,price:23}]};
   const response=await old.createOrder(request('/api/create',body),env,undefined,tenant('a'));
   assert.equal(response.status,200); const value=await response.json();
   const row=await DB.prepare('SELECT * FROM orders WHERE key=?').bind(value.key).first();
   assert(identity.isOrderId(row.order_id));assert.equal(row.display_key,value.key);
   const retry=await (await old.createOrder(request('/api/create',body),env,undefined,tenant('a'))).json();assert.equal(retry.key,value.key);
   assert.equal((await old.updateOrder(request('/api/update',{key:created.key,status:'DONE'}),env,undefined,tenant('a'))).status,200);
   const list=await (await old.getOrders(request('/api/orders'),env)).json();assert(Array.isArray(list));
   assert.equal((await DB.prepare('PRAGMA foreign_key_check').all()).results.length,0);
 });

 await check('legacy LINE receipt parser follows compatibility key on a receipt collision',async()=>{
   const id=crypto.randomUUID();
   await orders.saveOrder(env,{key:id,orderId:id,displayKey:'B0914-T007',businessDate:'2027-09-14',customer:'Collision',total:11,content:'Item',time:'12:00',status:'NEW',createdAt:Date.now()},'a',true);
   const Module=require('node:module'); const legacy=new Module(path.join(workerRoot,'src/modules/legacy-line.ts'),module);
   legacy.filename=path.join(workerRoot,'src/modules/legacy-line.ts');legacy.paths=Module._nodeModulePaths(path.dirname(legacy.filename));
   const source=execFileSync('git',['show',(process.env.ORDER_IDENTITY_LEGACY_REF || '2e3600b')+':benmi-worker-official/src/modules/line.ts'],{cwd:root,encoding:'utf8'});
   legacy._compile(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,legacy.filename);
   const before=(await DB.prepare('SELECT count(*) n FROM orders').first()).n;
   const text=`取餐號碼：B0914-T007\n訂單編號：${id}\n📦 訂單內容：\nItem\n💰 總金額：$11\n訂單參考：${id}`;
   await legacy.exports.handleLineWebhook(request('/webhook/a',{events:[{type:'message',source:{userId:'legacy-line-user'},message:{type:'text',text}}]}),env,{waitUntil:()=>{}},tenant('a'));
   assert.equal((await DB.prepare('SELECT count(*) n FROM orders').first()).n,before);
   assert.equal((await DB.prepare('SELECT user_id FROM orders WHERE key=?').bind(id).first()).user_id,'legacy-line-user');
 });
 console.log(`${passed} order identity checks passed`);
})().catch(error=>{console.error(error);process.exitCode=1}).finally(async()=>{global.fetch=originalFetch;await mf.dispose()});
