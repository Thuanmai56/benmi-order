const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { DatabaseSync } = require('node:sqlite');
const ts = require('../benmi-worker-official/node_modules/typescript');
require.extensions['.ts'] = (module, file) => module._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS }
}).outputText, file);
const cancellation = require('../benmi-worker-official/src/modules/order-cancellations.ts');
const intent = require('../benmi-worker-official/src/modules/cancellation-intent.ts');
const line = require('../benmi-worker-official/src/modules/line.ts');
const user = 'U' + 'a'.repeat(32), other = 'U' + 'b'.repeat(32);
const tenant = { tenantId: 'shop-a', brandName: 'Shop A', locale: 'vi', lineChannelSecret: 'channel-secret', lineChannelToken: 'token',
  aiOrderRedirectEnabled: false, features: [], quickReplies: [], groqApiKey: null, openrouterApiKey: null };

function fixture(t) {
  const db = new DatabaseSync(':memory:'); t.after(() => db.close());
  db.exec(`PRAGMA foreign_keys=ON; CREATE TABLE tenants(id TEXT PRIMARY KEY); INSERT INTO tenants VALUES('shop-a'),('shop-b');
    CREATE TABLE tenant_config(tenant_id TEXT PRIMARY KEY,is_active INTEGER NOT NULL DEFAULT 1); INSERT INTO tenant_config VALUES('shop-a',1),('shop-b',1);`);
  db.exec(fs.readFileSync('benmi-worker-official/migrations/0005_create_orders_table.sql','utf8'));
  db.exec(`ALTER TABLE orders ADD COLUMN order_id TEXT; ALTER TABLE orders ADD COLUMN display_key TEXT;
    ALTER TABLE orders ADD COLUMN uuid TEXT; ALTER TABLE orders ADD COLUMN business_date TEXT; ALTER TABLE orders ADD COLUMN legacy_key TEXT;
    ALTER TABLE orders ADD COLUMN dining_option TEXT; ALTER TABLE orders ADD COLUMN table_number TEXT; ALTER TABLE orders ADD COLUMN round_count INTEGER DEFAULT 1;
    ALTER TABLE orders ADD COLUMN last_appended_at TEXT;
    CREATE TABLE pending_actions(tenant_id TEXT,user_id TEXT,order_key TEXT,action_type TEXT,question_text TEXT,reason TEXT,note TEXT,created_at TEXT);
    CREATE TABLE line_order_receipts(id TEXT,tenant_id TEXT,user_id TEXT,order_key TEXT,flow TEXT,created_at INTEGER);`);
  db.exec(fs.readFileSync('benmi-worker-official/migrations/0066_order_cancellation_requests.sql','utf8'));
  db.exec(fs.readFileSync('benmi-worker-official/migrations/0067_cancellation_intent_improvements.sql','utf8'));
  db.exec("UPDATE tenant_config SET cancellation_detection_enabled=1 WHERE tenant_id='shop-a'");
  const calls=[],jobs=[];
  let probability=.95;
  const DB={prepare(sql){const build=params=>({bind(...p){return build(p);},async first(){return db.prepare(sql).get(...params)||null;},async all(){return {results:db.prepare(sql).all(...params)};},async run(){return {meta:{changes:db.prepare(sql).run(...params).changes}};}});return build([]);},
    async batch(statements){db.exec('BEGIN');try {const result=[];for(const s of statements)result.push(await s.run());db.exec('COMMIT');return result;}catch(e){db.exec('ROLLBACK');throw e;}}};
  const env={DB,CANCELLATION_ENGINE_ENABLED:'true',CANCELLATION_QUEUE:{send:async job=>jobs.push(job)},
    AI:{run:async(model,input)=>{calls.push({model,input});return {answers:{explicit_cancel:{type:'noul',noul:probability},possible_cancel:{type:'noul',noul:0},withdraw_cancel:{type:'noul',noul:0}}};}},
    ORDER_STATE:{get:async key=>key==='tenant:shop-a:config_cache'?JSON.stringify(tenant):null,delete:async()=>{},put:async()=>{}}};
  const sends=[];
  t.mock.method(global,'fetch',async(url,options)=>{sends.push({url,body:JSON.parse(options.body),headers:options.headers});return new Response('{}');});
  t.mock.method(console,'log',()=>{});t.mock.method(console,'warn',()=>{});t.mock.method(console,'error',()=>{});
  const order=(key='order-1',status='NEW',userId=user,tenantId='shop-a',age=60)=>db.prepare(`INSERT INTO orders(key,tenant_id,user_id,customer_name,pickup_time,total_amount,order_content,status,display_key,order_id,created_at)
    VALUES(?,?,?,?,?,?,?,?,?,?,datetime('now',?))`).run(key,tenantId,userId,'Customer','18:30',150,'Meal',status,key,key,`-${age} seconds`);
  const row=()=>db.prepare("SELECT * FROM order_cancellation_requests WHERE status='PENDING'").get();
  return {db,env,calls,jobs,sends,order,row,setProbability(p){probability=p;}};
}
function event(text='hủy đơn giúp mình',id='event-1') {return {type:'message',webhookEventId:id,timestamp:Date.now(),replyToken:'reply-'+id,source:{type:'user',userId:user},message:{type:'text',id:'msg-'+id,text}};}
async function receive(f,e=event()) {const tasks=[];const handled=await cancellation.receiveCancellationEvent(f.env,tenant,e,{waitUntil:p=>tasks.push(p)});await Promise.all(tasks);return handled;}
async function process(f,e) {await receive(f,e);if(f.jobs.length)await cancellation.processCancellationEvent(f.env,'shop-a',e.webhookEventId);}
function request(body,path='') {return new Request('https://worker.test/api/order-cancellation-requests'+path+'?tenant_id=shop-a',{method:body?'POST':'GET',body:body?JSON.stringify(body):undefined});}
async function resolve(f,decision='APPROVED',version=f.row()?.version,reason='') {const r=f.db.prepare('SELECT id FROM order_cancellation_requests').get();return cancellation.resolveCancellationRequest(request({decision,expected_version:version,reason}),f.env,tenant,r.id);}
async function webhook(f,e,valid=true,context=tenant) {const raw=JSON.stringify({events:[e]});const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(tenant.lineChannelSecret),{name:'HMAC',hash:'SHA-256'},false,['sign']);
  const signature=Buffer.from(await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(raw))).toString('base64');const tasks=[];
  const response=await line.handleLineWebhook(new Request('https://worker.test/webhook/shop-a',{method:'POST',headers:valid===null?{}:{'x-line-signature':valid?signature:'invalid'},body:raw}),f.env,{waitUntil:p=>tasks.push(p)},context);await Promise.all(tasks);return response;}

test('regex is conservative across cancellation, negation, item removal and compound messages',()=>{
  for(const text of ['hủy đơn giúp mình','取消訂單','請幫我取消訂單','cancel my order','hủy toàn bộ đơn'])assert.equal(intent.cancellationRegex(text),'cancel',text);
  for(const text of ['đừng hủy đơn','不要取消訂單',"don't cancel my order",'您好，不用取消了','Chào quán, đừng hủy đơn','Hello, do not cancel my order'])assert.equal(intent.cancellationRegex(text),'not_cancel',text);
  for(const text of ['bỏ ly trà thôi','取消珍珠','不取消訂單，取消飲料','hủy đơn nếu không giao kịp','đừng hủy đơn nhưng bỏ trà','đơn này hủy được không?'])assert.equal(intent.cancellationRegex(text),'unknown',text);
  assert.equal(cancellation.cancellationReference('hủy đơn giúp mình'),null);
});
test('Clef schema and thresholds reject malformed probabilities',()=>{
  assert.equal(intent.probabilityDecision(.90,{review:.6,clear:.9}).clarity,'clear');
  assert.equal(intent.probabilityDecision(.6,{review:.6,clear:.9}).clarity,'review');
  assert.equal(intent.probabilityDecision(.599,{review:.6,clear:.9}).clarity,'none');
  for(const value of [NaN,Infinity,-1,1.1])assert.throws(()=>intent.probabilityDecision(value,{review:.6,clear:.9}));
  for(const output of [{},{answers:{explicit_cancel:1}},{answers:{explicit_cancel:{type:'noul',noul:'0.9'}}}])assert.throws(()=>intent.readClefProbability(output));
});
test('indirect inability to collect goes to review despite a low cancellation score',async t=>{
  const f=fixture(t);f.order();
  f.env.AI.run=async(model,input)=>{f.calls.push({model,input});return {answers:{explicit_cancel:{type:'noul',noul:.4547},possible_cancel:{type:'noul',noul:.9427},withdraw_cancel:{type:'noul',noul:0}}};};
  await process(f,event('Tôi nghĩ tôi không thể lấy món'));
  assert.equal(f.row().clarity,'review');assert.equal(f.row().source,'clef-flash');
  assert.equal(f.db.prepare('SELECT status FROM orders').get().status,'NEW');
  assert(f.calls[0].input.questions.possible_cancel);assert.equal(f.sends.length,1);
});
test('review question cannot promote uncertainty to clear, and alternatives stay negative',()=>{
  const answer=(cancel,review)=>({answers:{explicit_cancel:{type:'noul',noul:cancel},possible_cancel:{type:'noul',noul:review},withdraw_cancel:{type:'noul',noul:0}}});
  assert.equal(intent.readClefDecision(answer(.4547,.99),{review:.6,clear:.9}).clarity,'review');
  assert.equal(intent.readClefDecision(answer(.1,.59),{review:.6,clear:.9}).clarity,'none');
  assert.equal(intent.readClefDecision(answer(.95,.1),{review:.6,clear:.9}).clarity,'clear');
  assert.throws(()=>intent.readClefDecision({answers:{explicit_cancel:{type:'noul',noul:.1}}},{review:.6,clear:.9}),/CLEF_BAD_SCHEMA/);
});
test('explicit request is durable, replied once and holds order without changing status',async t=>{
  const f=fixture(t);f.order();assert.equal(await receive(f),true);assert.equal(f.calls.length,0);assert.equal(f.row().clarity,'clear');
  assert.equal(f.db.prepare('SELECT status FROM orders').get().status,'NEW');assert.equal(f.sends.length,1);assert(f.sends[0].url.endsWith('/reply'));
  assert.match(f.sends[0].body.messages[0].text,/Đơn chưa được hủy/);
  await receive(f);assert.equal(f.sends.length,1);assert.equal(f.row().version,1);
  assert.throws(()=>f.db.exec("UPDATE orders SET status='ACCEPTED'"),/CANCELLATION_PENDING/);
});
test('only an owned active order triggers classification; ended and other-tenant orders do not',async t=>{
  const f=fixture(t);f.order('ended','PAID');f.order('other-customer','NEW',other);f.order('other-shop','NEW',user,'shop-b');
  assert.equal(await receive(f,event('mình không qua lấy nữa được rồi')),false);assert.equal(f.calls.length,0);assert.equal(f.jobs.length,0);
});
test('all five active statuses support requests and latest order is snapshotted',async t=>{
  const f=fixture(t);for(const [i,status] of ['NEW','ACCEPTED','DONE','WAITING_CUSTOMER_CHANGE','WAITING_CUSTOMER_REJECT'].entries())f.order('o'+i,status,user,'shop-a',100-i);
  await process(f,event('mình không qua lấy nữa được rồi'));assert.equal(f.row().order_key,'o4');assert.equal(f.row().selected_latest,1);
  assert.equal(f.calls.length,1);assert.equal(f.calls[0].model,'@cf/cloudflare/clef-flash');assert(!('menu' in f.calls[0].input.state));
});
test('AI review, explicit order and negative results follow independent routing',async t=>{
  const f=fixture(t);f.order('o-old','NEW',user,'shop-a',120);f.order('o-new');f.setProbability(.72);
  await process(f,event('xin hủy #o-old cho mình'));assert.equal(f.row().order_key,'o-old');assert.equal(f.row().clarity,'review');
  assert.throws(()=>f.db.exec("UPDATE orders SET status='DONE' WHERE key='o-old'"),/CANCELLATION_PENDING/);
  const r=await resolve(f,'DISMISSED');assert.equal(r.status,200);f.setProbability(.05);
  await process(f,event('bỏ ly trà thôi','event-2'));assert.equal(f.row(),undefined);assert.equal(f.sends.length,1);
});
test('new messages append to one request and stale/out-of-order versions cannot approve',async t=>{
  const f=fixture(t);f.order();await receive(f);const firstVersion=f.row().version;
  const old=event('取消訂單','event-old');old.timestamp=Date.now()-10000;await receive(f,old);
  await receive(f,event('đừng hủy đơn','event-2'));assert.equal(f.row().clarity,'clear');assert.equal(f.row().customer_withdrew,1);assert.equal(f.row().version,3);
  assert.equal((await resolve(f,'APPROVED',firstVersion)).status,409);assert.equal(f.db.prepare('SELECT status FROM orders').get().status,'NEW');
  assert.equal(f.db.prepare('SELECT COUNT(*) n FROM cancellation_request_messages').get().n,3);
});
test('approval commits order and notification together, competing POS cannot overwrite',async t=>{
  const f=fixture(t);f.order();await receive(f);const version=f.row().version,id=f.row().id;
  assert.equal((await resolve(f,'APPROVED',version)).status,200);assert.equal(f.db.prepare('SELECT status FROM orders').get().status,'REJECTED');
  assert.equal((await resolve(f,'DECLINED',version,'already preparing')).status,409);
  assert.equal(f.db.prepare('SELECT status FROM order_cancellation_requests').get().status,'APPROVED');
  await cancellation.deliverCancellationNotification(f.env,'shop-a',id+':resolved');await cancellation.deliverCancellationNotification(f.env,'shop-a',id+':resolved');
  assert.equal(f.sends.length,2);assert(f.sends[1].headers['X-Line-Retry-Key']);assert.match(f.sends[1].body.messages[0].text,/xác nhận hủy/);
});
test('decline requires a reason and leaves the order actionable; dismissal sends no decision',async t=>{
  const f=fixture(t);f.order();await receive(f);assert.equal((await resolve(f,'DECLINED')).status,400);
  assert.equal((await resolve(f,'DECLINED',f.row().version,'Đã làm xong')).status,200);
  f.db.exec("UPDATE orders SET status='ACCEPTED'");assert.equal(f.db.prepare('SELECT status FROM orders').get().status,'ACCEPTED');
  const next=event('取消訂單','event-2');next.timestamp=Date.now()+1;
  await receive(f,next);const notifications=f.db.prepare('SELECT COUNT(*) n FROM cancellation_notifications').get().n;
  assert.equal((await cancellation.resolveCancellationRequest(request({decision:'DISMISSED',expected_version:f.row().version}),f.env,tenant,f.row().id)).status,200);
  assert.equal(f.db.prepare('SELECT COUNT(*) n FROM cancellation_notifications').get().n,notifications);
});
test('terminal change during AI does not resurrect an order, and legacy cancellation closes request',async t=>{
  const f=fixture(t);f.order();await receive(f,event('mình không lấy nữa'));f.db.exec("UPDATE orders SET status='PICKED_UP'");
  await cancellation.processCancellationEvent(f.env,'shop-a','event-1');assert.equal(f.row(),undefined);assert.equal(f.calls.length,0);
  f.order('new');await receive(f,event('取消訂單','event-2'));f.db.exec("UPDATE orders SET status='REJECTED' WHERE key='new'");
  assert.equal(f.db.prepare('SELECT status FROM order_cancellation_requests').get().status,'SUPERSEDED');
});
test('feed has an independent revision, unsend removes text and optimistic decisions stay isolated',async t=>{
  const f=fixture(t);f.order();await receive(f);const feed=await cancellation.getCancellationRequests(request(),f.env,tenant);const etag=feed.headers.get('ETag');
  const cached=request();cached.headers.set('If-None-Match',etag);assert.equal((await cancellation.getCancellationRequests(cached,f.env,tenant)).status,304);
  await cancellation.unsendCancellationMessage(f.env,'shop-a',user,'msg-event-1');assert.equal(f.db.prepare('SELECT message_text FROM cancellation_request_messages').get().message_text,'');
  assert.equal((await cancellation.getCancellationRequests(cached,f.env,tenant)).status,200);
  assert.equal((await cancellation.resolveCancellationRequest(request({decision:'APPROVED',expected_version:1}),f.env,{...tenant,tenantId:'shop-b'},f.row().id)).status,404);
});
test('signed webhook detects independently of LIFF cooldown; invalid signatures cannot mutate',async t=>{
  const f=fixture(t);f.order();assert.equal((await webhook(f,event(),false)).status,401);assert.equal(f.row(),undefined);
  assert.equal((await webhook(f,event())).status,200);assert(f.row());assert.equal(f.calls.length,0);
});
test('explicit signature bypass allows unsigned cancellation with no channel secret',async t=>{
  const f=fixture(t);f.order();f.env.LINE_WEBHOOK_SKIP_SIGNATURE='true';
  assert.equal((await webhook(f,event(),null,{...tenant,lineChannelSecret:null})).status,200);
  assert(f.row());assert.equal(f.row().source,'regex');
  assert.equal(f.db.prepare('SELECT status FROM orders').get().status,'NEW');
});
test('bypass accepts invalid signatures but still requires an owned active order',async t=>{
  const f=fixture(t);f.env.LINE_WEBHOOK_SKIP_SIGNATURE='true';f.order('other-customer','NEW',other);
  assert.equal((await webhook(f,event(),false)).status,200);assert.equal(f.row(),undefined);assert.equal(f.calls.length,0);
  f.order();assert.equal((await webhook(f,event('取消訂單','event-2'),false)).status,200);assert(f.row());
});
test('missing secret without explicit bypass never enables unsigned detection',async t=>{
  const f=fixture(t);f.order();f.env.LINE_WEBHOOK_SKIP_SIGNATURE='false';
  assert.equal((await webhook(f,event(),null,{...tenant,lineChannelSecret:null})).status,200);
  assert.equal(f.row(),undefined);assert.equal(f.jobs.length,0);
});
test('AI outage retries durably then creates a nonblocking technical alert; enqueue failure survives',async t=>{
  const f=fixture(t);f.order();f.env.AI.run=async()=>{throw new Error('outage');};f.env.CANCELLATION_QUEUE.send=async()=>{throw new Error('queue down');};
  await receive(f,event('mình không qua lấy nữa'));for(let i=0;i<2;i++)await assert.rejects(cancellation.processCancellationEvent(f.env,'shop-a','event-1'));
  await cancellation.processCancellationEvent(f.env,'shop-a','event-1');assert.equal(f.row(),undefined);
  assert.equal(f.db.prepare('SELECT status FROM cancellation_events').get().status,'dead');
  assert.equal(f.db.prepare('SELECT COUNT(*) n FROM cancellation_technical_alerts').get().n,1);
  assert.equal(f.db.prepare('SELECT COUNT(*) n FROM cancellation_notifications').get().n,0);
  f.db.exec("UPDATE orders SET status='ACCEPTED'");
  await cancellation.processCancellationEvent(f.env,'shop-a','event-1');
  assert.equal(f.db.prepare('SELECT COUNT(*) n FROM cancellation_technical_alerts').get().n,1);
});
test('LINE failure keeps approved order committed and retries with identical push key',async t=>{
  const f=fixture(t);f.order();await receive(f);const id=f.row().id;await resolve(f);
  t.mock.method(global,'fetch',async(url,options)=>{f.sends.push({url,body:JSON.parse(options.body),headers:options.headers});return new Response('{}',{status:500});});
  await cancellation.deliverCancellationNotification(f.env,'shop-a',id+':resolved');assert.equal(f.db.prepare('SELECT status FROM orders').get().status,'REJECTED');
  f.db.exec('UPDATE cancellation_notifications SET next_attempt_at=0');await cancellation.deliverCancellationNotification(f.env,'shop-a',id+':resolved');
  assert.equal(f.sends[1].headers['X-Line-Retry-Key'],f.sends[2].headers['X-Line-Retry-Key']);
});
test('unsend received before original message and during model execution cannot expose the message',async t=>{
  const f=fixture(t);f.order();await cancellation.unsendCancellationMessage(f.env,'shop-a',user,'msg-event-1');
  assert.equal(await receive(f),true);assert.equal(f.row(),undefined);assert.equal(f.jobs.length,0);
  const e=event('Mình không qua lấy nữa','event-2');await receive(f,e);
  f.env.AI.run=async()=>{await cancellation.unsendCancellationMessage(f.env,'shop-a',user,e.message.id);return {answers:{explicit_cancel:{type:'noul',noul:.99},possible_cancel:{type:'noul',noul:0},withdraw_cancel:{type:'noul',noul:0}}};};
  await cancellation.processCancellationEvent(f.env,'shop-a',e.webhookEventId);assert.equal(f.row(),undefined);
  assert.equal(f.db.prepare('SELECT message_text FROM cancellation_events').get().message_text,'');
});
test('existing shop negotiation keeps priority and automatic cancellation behavior',async t=>{
  const f=fixture(t);f.order('order-1','WAITING_CUSTOMER_CHANGE');
  f.db.prepare(`INSERT INTO pending_actions VALUES('shop-a',?,'order-1','CHANGE','Choose a new pickup time','時間需調整','19:00',datetime('now'))`).run(user);
  assert.equal((await webhook(f,event('取消'))).status,200);
  assert.equal(f.db.prepare('SELECT status FROM orders').get().status,'REJECTED');assert.equal(f.row(),undefined);assert.equal(f.calls.length,0);assert.equal(f.jobs.length,0);
});
test('non-cancellation resumes quick replies once and model fallback never silently approves',async t=>{
  const f=fixture(t);f.order();f.setProbability(.01);
  f.env.ORDER_STATE.get=async key=>key==='tenant:shop-a:config_cache'?JSON.stringify({...tenant,quickReplies:[{triggers:['địa chỉ'],reply:'Store address'}]}):null;
  const e=event('địa chỉ','event-2');await process(f,e);assert.equal(f.row(),undefined);
  assert.equal(f.sends.length,1);assert.match(f.sends[0].body.messages[0].text,/Store address/);
  await cancellation.processCancellationEvent(f.env,'shop-a',e.webhookEventId);assert.equal(f.sends.length,1);
});
test('final notification waits for an acknowledgement in flight, without consuming attempts',async t=>{
  const f=fixture(t);f.order();await receive(f);const id=f.row().id;await resolve(f);
  f.db.prepare("UPDATE cancellation_notifications SET status='sending',lease_until=? WHERE id=?").run(Date.now()+60000,id+':received');
  await cancellation.deliverCancellationNotification(f.env,'shop-a',id+':resolved');assert.equal(f.sends.length,1);
  const result=f.db.prepare('SELECT status,attempts FROM cancellation_notifications WHERE id=?').get(id+':resolved');
  assert.equal(result.status,'pending');assert.equal(result.attempts,0);
  f.db.prepare("UPDATE cancellation_notifications SET status='sent',lease_until=0 WHERE id=?").run(id+':received');
  f.db.exec('UPDATE cancellation_notifications SET next_attempt_at=0');await cancellation.deliverCancellationNotification(f.env,'shop-a',id+':resolved');assert.equal(f.sends.length,2);
});

test('pending unrelated text continues ordinary routing without changing request or history',async t=>{
  const f=fixture(t);f.order();await receive(f);const before={...f.row()};f.setProbability(.02);
  f.env.ORDER_STATE.get=async key=>key==='tenant:shop-a:config_cache'?JSON.stringify({...tenant,quickReplies:[{triggers:['địa chỉ'],reply:'Store address'}]}):null;
  await process(f,event('địa chỉ','unrelated'));
  assert.deepEqual({...f.row()},before);assert.equal(f.db.prepare('SELECT COUNT(*) n FROM cancellation_request_messages').get().n,1);
  assert.equal(f.sends.length,2);assert.match(f.sends[1].body.messages[0].text,/Store address/);
  await cancellation.processCancellationEvent(f.env,'shop-a','unrelated');assert.equal(f.sends.length,2);
});
test('withdrawal keeps hold, renewed cancellation clears flag, equal timestamps use event ID',async t=>{
  const f=fixture(t);f.order();const first=event('Hủy','a');await receive(f,first);
  const withdrawal=event('đừng hủy đơn','c');withdrawal.timestamp=first.timestamp;await receive(f,withdrawal);
  assert.equal(f.row().customer_withdrew,1);assert.throws(()=>f.db.exec("UPDATE orders SET status='ACCEPTED'"),/CANCELLATION_PENDING/);
  const late=event('Hủy','b');late.timestamp=first.timestamp;await receive(f,late);assert.equal(f.row().customer_withdrew,1);
  const renewed=event('取消','d');renewed.timestamp=first.timestamp;await receive(f,renewed);assert.equal(f.row().customer_withdrew,0);
  assert.equal(f.row().latest_event_id,'d');assert.equal(f.sends.length,1);
});
test('context contains only three earlier related non-unsent messages; progress never inherits cancellation',async t=>{
  const f=fixture(t);f.order();const at=Date.now()-5000;
  for(let i=0;i<5;i++){const e=event('Hủy','c'+i);e.timestamp=at+i;await receive(f,e);}
  await cancellation.unsendCancellationMessage(f.env,'shop-a',user,'msg-c3');
  const e=event('tiến độ sao rồi','current');e.timestamp=at+3;f.setProbability(.01);await process(f,e);
  const state=f.calls.at(-1).input.state;assert.equal(state.has_pending_cancellation,true);
  assert.equal(state.related_messages.length,3);assert.deepEqual(state.related_messages.map(m=>m.event_at),[at,at+1,at+2]);
});
test('conflicting signals require review, withdrawal only applies to pending requests',()=>{
  const answer=(cancel,possible,withdraw)=>({answers:{explicit_cancel:{type:'noul',noul:cancel},possible_cancel:{type:'noul',noul:possible},withdraw_cancel:{type:'noul',noul:withdraw}}});
  assert.equal(intent.readClefDecision(answer(.95,.1,.8),{review:.6,clear:.9},true).reasonCode,'conflicting_signals');
  assert.equal(intent.readClefDecision(answer(.1,.1,.8),{review:.6,clear:.9},true).intent,'withdraw_cancel');
  assert.equal(intent.readClefDecision(answer(.1,.1,.8),{review:.6,clear:.9},false).intent,'other');
  for(const text of ['Hủy','Huỷ','huy','取消','cancel'])assert.equal(intent.cancellationRegex(text),'cancel');
});
test('technical alert feed revision and acknowledgement are tenant scoped and never hold orders',async t=>{
  const f=fixture(t);f.order();f.env.AI.run=async()=>{throw new Error('down');};
  await receive(f,event('cảm ơn'));for(let i=0;i<2;i++)await assert.rejects(cancellation.processCancellationEvent(f.env,'shop-a','event-1'));
  await cancellation.processCancellationEvent(f.env,'shop-a','event-1');
  const response=await cancellation.getCancellationRequests(request(),f.env,tenant),body=await response.json();
  assert.equal(body.requests.length,0);assert.equal(body.technicalAlerts.length,1);const id=body.technicalAlerts[0].id;
  assert.equal((await cancellation.acknowledgeCancellationAlert(request({}),f.env,{...tenant,tenantId:'shop-b'},id)).status,404);
  assert.equal((await cancellation.acknowledgeCancellationAlert(request({}),f.env,tenant,id)).status,200);
  const next=await cancellation.getCancellationRequests(request(),f.env,tenant);assert.notEqual(next.headers.get('ETag'),response.headers.get('ETag'));
  assert.equal((await next.json()).technicalAlerts.length,0);f.db.exec("UPDATE orders SET status='ACCEPTED'");
});
test('AI outage preserves an existing valid cancellation request without absorbing unrelated message',async t=>{
  const f=fixture(t);f.order();await receive(f);const before={...f.row()};f.env.AI.run=async()=>{throw new Error('down');};
  await receive(f,event('cảm ơn','outage'));for(let i=0;i<2;i++)await assert.rejects(cancellation.processCancellationEvent(f.env,'shop-a','outage'));
  await cancellation.processCancellationEvent(f.env,'shop-a','outage');assert.deepEqual({...f.row()},before);
  assert.equal(f.db.prepare('SELECT COUNT(*) n FROM cancellation_request_messages').get().n,1);
});

test('model withdrawal adds evidence but never auto-resolves; resolved race cannot resurrect it',async t=>{
  const f=fixture(t);f.order();await receive(f);
  f.env.AI.run=async()=>({answers:{explicit_cancel:{type:'noul',noul:.01},possible_cancel:{type:'noul',noul:.01},withdraw_cancel:{type:'noul',noul:.95}}});
  const e=event('bạn tôi sẽ nhận giúp','withdraw');e.timestamp=Date.now()+1;await process(f,e);
  assert.equal(f.row().customer_withdrew,1);assert.equal(f.row().status,'PENDING');assert.equal(f.sends.length,1);
  assert.equal(JSON.parse(f.row().decision_json).intent,'withdraw_cancel');
  f.env.AI.run=async()=>{await resolve(f,'DISMISSED');return {answers:{explicit_cancel:{type:'noul',noul:0},possible_cancel:{type:'noul',noul:0},withdraw_cancel:{type:'noul',noul:.99}}};};
  await process(f,event('thôi không hủy nữa nhé','race'));assert.equal(f.row(),undefined);
  assert.equal(f.db.prepare('SELECT COUNT(*) n FROM cancellation_request_messages').get().n,2);
});
test('fallback labels remain review and malformed output retries instead of manufacturing cancellation',async t=>{
  const f=fixture(t);f.order();f.env.AI.run=async()=>{throw new Error('down');};
  const groq=require('../benmi-worker-official/src/integrations/groq.ts');
  t.mock.method(groq,'callAI',async()=> 'CANCEL');await process(f,event('please void this meal'));assert.equal(f.row().clarity,'review');
  assert.equal(f.row().source,'legacy');
  t.mock.method(groq,'callAI',async()=> 'UNKNOWN');const e=event('thanks','invalid');await receive(f,e);
  await assert.rejects(cancellation.processCancellationEvent(f.env,'shop-a','invalid'),/CANCELLATION_CLASSIFIER_UNAVAILABLE/);
  assert.equal(f.db.prepare('SELECT status FROM cancellation_events WHERE event_id=?').get('invalid').status,'pending');
});

test('Vietnamese accent normalization and consistent withdrawal preamble remain whole-message guards',()=>{
  for(const text of ['Huy don hang cua toi giup nhe.','hủy đơn của mình giúp nhé'])assert.equal(intent.cancellationRegex(text),'cancel');
  for(const text of ['Minh doi y, dung huy don nua.','Mình đổi ý, đừng hủy đơn nữa'])assert.equal(intent.cancellationRegex(text),'not_cancel');
  for(const text of ['Mình đổi ý, đừng hủy đơn nữa nhưng hủy đơn mới','Huy don neu den muon','huy don nay giup minh, dat nham roi'])assert.equal(intent.cancellationRegex(text),'unknown');
});

test('whole-message pickup arrangements are still wanted; negated or mixed arrangements go to AI',()=>{
  assert.equal(intent.cancellationRegex('Tôi nhờ bạn đến lấy vì không tự đi được.'),'still_wanted');
  assert.equal(intent.regexDecision('still_wanted',false).intent,'other');
  assert.equal(intent.regexDecision('still_wanted',true).intent,'withdraw_cancel');
  for(const text of ['Tôi nhờ bạn đến lấy nhưng bạn không đi được','Tôi nhờ bạn đến lấy, hủy đơn mới đi','Bạn tôi không lấy được'])assert.equal(intent.cancellationRegex(text),'unknown');
});

test('compressed weak ETags and ETag lists return 304; revisions invalidate both forms',async t=>{
  const f=fixture(t);f.order();await receive(f);const feed=await cancellation.getCancellationRequests(request(),f.env,tenant),etag=feed.headers.get('ETag');
  for(const header of ['W/'+etag,'"other", W/'+etag,'*']){const r=request();r.headers.set('If-None-Match',header);assert.equal((await cancellation.getCancellationRequests(r,f.env,tenant)).status,304);}
  const r=request();r.headers.set('If-None-Match','W/'+etag);await cancellation.unsendCancellationMessage(f.env,'shop-a',user,'msg-event-1');
  assert.equal((await cancellation.getCancellationRequests(r,f.env,tenant)).status,200);
});

test('Taiwan whole-order phrases, particles and full-width spacing have conservative regex guards',()=>{
  for(const text of ['退單','撤單','刪單','我要退單','幫我取消訂單啦','不好意思，請幫我退掉這筆訂單，謝謝','這單幫我退掉','整筆取消喔','請　幫我　取消訂單！'])assert.equal(intent.cancellationRegex(text),'cancel',text);
  for(const text of ['不取消了','先不要取消訂單','不要退單喔','不用取消訂單啦'])assert.equal(intent.cancellationRegex(text),'not_cancel',text);
  for(const text of ['這单照做','餐點保留','幫我留著訂單','照常出餐'].filter(text=>!text.includes('单')))assert.equal(intent.cancellationRegex(text),'still_wanted',text);
  for(const text of ['退單要收多少費用','取消訂單會退款嗎？','如果等太久就取消','這單幫我退掉，不過我又想留著','取消珍珠','取消奶茶就好','不要取消飲料','不用取消了，但取消最新那筆','訂單取消不了','請取消訂單？還是先留著'])assert.equal(intent.cancellationRegex(text),'unknown',text);
});
test('Taiwan withdrawal keeps human review and notifications use Traditional Chinese',async t=>{
  const f=fixture(t);f.order();const tw={...tenant,locale:'zh-TW'};
  f.env.ORDER_STATE.get=async key=>key==='tenant:shop-a:config_cache'?JSON.stringify(tw):null;
  await receive(f,event('幫我取消訂單啦'));
  assert.match(f.sends[0].body.messages[0].text,/取消申請轉交店家/);
  assert.match(f.sends[0].body.messages[0].text,/訂單尚未取消/);
  await receive(f,event('照常出餐','tw-withdraw'));assert.equal(f.row().customer_withdrew,1);
  assert.throws(()=>f.db.exec("UPDATE orders SET status='ACCEPTED'"),/CANCELLATION_PENDING/);
  assert.equal(f.sends.length,1);
  const response=await cancellation.resolveCancellationRequest(request({decision:'DISMISSED',expected_version:f.row().version}),f.env,tw,f.row().id);
  assert.equal(response.status,200);f.db.exec("UPDATE orders SET status='ACCEPTED'");
});
