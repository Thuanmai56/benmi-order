const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { DatabaseSync } = require('node:sqlite');
const ts = require('../benmi-worker-official/node_modules/typescript');
const source = fs.readFileSync('benmi-worker-official/src/modules/menu.ts', 'utf8');
const compiled = ts.transpileModule(source.slice(source.indexOf('function validateMenuUpdate'), source.indexOf('export async function updateMenu')), { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
const backend = vm.createContext({});
vm.runInContext(compiled, backend);
function fixture() {
  const db = new DatabaseSync(':memory:');
  db.exec(`PRAGMA foreign_keys=ON;
    CREATE TABLE menu_categories(id TEXT PRIMARY KEY, tenant_id TEXT, slug TEXT, name TEXT, short_name TEXT, category_type TEXT, allow_customization INTEGER, applied_modifiers TEXT, sort_order INTEGER, UNIQUE(tenant_id,slug));
    CREATE TABLE menu_items(id TEXT PRIMARY KEY, tenant_id TEXT, category_id TEXT REFERENCES menu_categories(id) ON DELETE RESTRICT, name TEXT, price REAL, badge_text TEXT, is_recommended INTEGER, sort_order INTEGER);
    CREATE TABLE menu_customizations(id TEXT PRIMARY KEY, tenant_id TEXT, key TEXT, title TEXT, type TEXT, sort_order INTEGER, options_json TEXT, updated_at TEXT, UNIQUE(tenant_id,key));`);
  for (const tenant of ['a', 'b']) {
    db.prepare('INSERT INTO menu_categories(id,tenant_id,slug,category_type) VALUES(?,?,?,?)').run(`${tenant}_food`,tenant,'food','catalog');
    db.prepare('INSERT INTO menu_categories(id,tenant_id,slug,category_type) VALUES(?,?,?,?)').run(`${tenant}_custom`,tenant,'sec-flavor','order_customization');
    db.prepare('INSERT INTO menu_items(id,tenant_id,category_id,name,price) VALUES(?,?,?,?,?)').run(`${tenant}_one`,tenant,`${tenant}_food`,'One',10);
    for (const key of ['flavor','salt']) db.prepare('INSERT INTO menu_customizations(id,tenant_id,key,options_json) VALUES(?,?,?,?)').run(`custom_${tenant}_${key}`,tenant,key,'[{"name":"Normal"}]');
  }
  const adapter = {
    prepare(sql) { return { bind(...args) { return { sql, args, async all() { return { results: db.prepare(sql).all(...args) }; } }; } }; },
    async batch(statements) { db.exec('BEGIN'); try { for (const {sql,args} of statements) db.prepare(sql).run(...args); db.exec('COMMIT'); } catch(e) { db.exec('ROLLBACK'); throw e; } }
  };
  return {db, save: data => backend.syncMenuToD1('a',data,{DB:adapter}), dump: () => JSON.stringify(['menu_categories','menu_items','menu_customizations'].map(table => db.prepare(`SELECT * FROM ${table} ORDER BY id`).all()))};
}
test('price-only update and empty payload preserve omitted rows and customization category', async () => {
  const f=fixture(); await f.save({food:{One:{id:'a_one',price:20}}}); await f.save({});
  assert.equal(f.db.prepare('SELECT price FROM menu_items WHERE id=?').get('a_one').price,20);
  assert.equal(f.db.prepare('SELECT count(*) n FROM menu_customizations').get().n,4);
  assert.equal(f.db.prepare('SELECT count(*) n FROM menu_categories').get().n,4);
});
test('empty customization list is not a deletion instruction', async () => {
  const f=fixture(); const before=f.dump(); await f.save({__customizations:{groups:[]}}); assert.equal(f.dump(),before);
});
test('malformed customization requests cannot write even valid price changes', async () => {
  for (const value of [null,{},'bad',{groups:null},{groups:[{}]},{groups:[{key:'flavor',options:null}]},{groups:[{key:'flavor',options:[{name:'Normal',price:'bad'}]}]}]) {
    const f=fixture(); const before=f.dump(); await assert.rejects(f.save({food:{One:99},__customizations:value})); assert.equal(f.dump(),before);
  }
});
test('explicit deletion removes only the specified group', async () => {
  const f=fixture(); await f.save({__delete:{customizations:['custom_a_flavor']}});
  assert.equal(f.db.prepare('SELECT count(*) n FROM menu_customizations').get().n,3);
  assert.ok(f.db.prepare('SELECT id FROM menu_customizations WHERE id=?').get('custom_b_flavor'));
});
test('category deletion removes its children, preserves other tenant and customization', async () => {
  const f=fixture(); await f.save({__delete:{categories:['a_food']}});
  assert.equal(f.db.prepare('SELECT count(*) n FROM menu_items').get().n,1);
  assert.equal(f.db.prepare('SELECT count(*) n FROM menu_customizations').get().n,4);
});
test('foreign IDs and conflicting deletions fail before writing', async () => {
  for (const data of [{__delete:{items:['b_one']}},{__delete:{categories:['b_food']}},{__delete:{customizations:['custom_b_salt']}},{food:{One:{id:'b_one',price:1}}},{food:{One:1},__delete:{categories:['a_food']}}]) {
    const f=fixture(); const before=f.dump(); await assert.rejects(f.save(data)); assert.equal(f.dump(),before);
  }
});
test('renaming an item keeps its ID and does not duplicate it', async () => {
  const f=fixture(); await f.save({food:{Renamed:{id:'a_one',price:15}}});
  assert.equal(f.db.prepare('SELECT count(*) n FROM menu_items').get().n,2);
  assert.equal(f.db.prepare('SELECT name FROM menu_items WHERE id=?').get('a_one').name,'Renamed');
});
test('database error rolls back the entire batch', async () => {
  const f=fixture(); const before=f.dump();
  f.db.exec("CREATE TRIGGER reject_delete BEFORE DELETE ON menu_customizations BEGIN SELECT RAISE(ABORT,'test failure'); END;");
  await assert.rejects(f.save({food:{One:99},__delete:{customizations:['custom_a_salt']}})); assert.equal(f.dump(),before);
});
function editor() {
  const requests=[]; const alerts=[]; const body={textContent:'',appendChild(){}};
  const context=vm.createContext({console,Date,Set,JSON,crypto:require('node:crypto').webcrypto,alert:m=>alerts.push(m),confirm:()=>true,t:k=>k,WORKER_BASE:'https://example.test',getTenantIdFromUrl:()=> 'a',
    window:{addEventListener(){}},document:{addEventListener(){},getElementById:id=>id==='menu-editor-body'?body:null,querySelectorAll:()=>[],createElement:()=>({style:{},addEventListener(){}})},
    fetch:async(url,options)=>{requests.push({url,...options});return {ok:true,json:async()=>({})}},localStorage:{removeItem(){}}});
  vm.runInContext(fs.readFileSync('js/orders-menu.js','utf8'),context);
  vm.runInContext('renderMenuCategories=()=>{}; renderMenuCategoryEditor=()=>{};',context);
  return {context,requests,alerts,run:code=>vm.runInContext(code,context)};
}
test('incomplete bootstrap cannot save or delete, no legacy fallback', async()=>{
  const e=editor(); await e.run('loadMenuData()');
  await e.run('saveMenuData(true)'); await e.run('deleteCategoryAtIndex(0)');
  assert.equal(e.requests.length,1); assert.match(e.requests[0].url,/bootstrap/);
  assert.equal(e.run('isMenuLoadedCompletely'),false);
});
test('category delete sends one deletion-only request and preserves unsaved edits',async()=>{
  const e=editor(); e.run(`isMenuLoadedCompletely=true; currentMenuData=[{id:'food',databaseId:'a_food',items:[{id:'a_one',name:'One',price:10}]},{id:'other',items:[]}]; clearMenuDirty(); currentMenuData[1].title='Unsaved';`);
  await e.run('deleteCategoryAtIndex(0)'); assert.equal(e.requests.length,1);
  assert.deepEqual(JSON.parse(e.requests[0].body),{__delete:{categories:['a_food'],items:[],customizations:[]}});
  assert.equal(e.run('currentMenuData[0].title'),'Unsaved'); assert.equal(e.run('isMenuDirty'),true);
});
test('group/item removal produces explicit IDs, rename does not delete',()=>{
  const e=editor(); const result=e.run(`getMenuDeletions([{id:'food',items:[{id:'a_one',name:'One'}]},{id:'sec',groups:[{id:'custom_a_salt'}]}],[{id:'food',items:[{id:'a_one',name:'Renamed'}]},{id:'sec',groups:[]}])`);
  assert.deepEqual(JSON.parse(JSON.stringify(result)),{categories:[],items:[],customizations:['custom_a_salt']});
});
test('new item with an old name gets a distinct stable ID',()=>{
  const e=editor(); e.run(`currentMenuData=[{id:'food',items:[{id:'a_food_One',name:'Renamed',price:10},{name:'One',price:20}]}]; serializeMenuData(currentMenuData);`);
  const id=e.run('currentMenuData[0].items[1].id'); assert.notEqual(id,'a_food_One');
  e.run('serializeMenuData(currentMenuData)'); assert.equal(e.run('currentMenuData[0].items[1].id'),id);
});
test('customization-only data can be saved then its new section explicitly deleted',async()=>{
  const f=fixture(); f.db.prepare('DELETE FROM menu_categories WHERE id=?').run('a_custom');
  const e=editor(); e.run(`currentMenuData=[{id:'sec-flavor',databaseId:null,type:'order_customization',groups:[{id:'custom_a_flavor',key:'flavor',options:[{name:'Normal',price:0}]}]}]`);
  const payload=JSON.parse(JSON.stringify(e.run('serializeMenuData(currentMenuData)'))); await f.save(payload);
  const deletions=JSON.parse(JSON.stringify(e.run('getMenuDeletions(currentMenuData,[])')));
  assert.deepEqual(deletions.categories,['a_sec-flavor']); await f.save({__delete:deletions});
  assert.equal(f.db.prepare('SELECT id FROM menu_categories WHERE id=?').get('a_sec-flavor'),undefined);
});
test('successful empty complete bootstrap permits creating a menu',async()=>{
  const e=editor(); e.context.fetch=async()=>({ok:true,json:async()=>({menuComplete:true,catalog:[],modifiers:[]})});
  await e.run('loadMenuData()'); assert.equal(e.run('isMenuLoadedCompletely'),true); assert.equal(e.run('currentMenuData.length'),0);
});
test('updating one customization group preserves omitted groups',async()=>{
  const f=fixture(); await f.save({__customizations:{groups:[{id:'custom_a_flavor',key:'flavor',options:[{name:'New',price:0}]}]}});
  assert.equal(f.db.prepare('SELECT count(*) n FROM menu_customizations').get().n,4);
  assert.equal(f.db.prepare('SELECT options_json FROM menu_customizations WHERE id=?').get('custom_a_salt').options_json,'[{"name":"Normal"}]');
});
test('explicit item removal preserves its category and other tenant',async()=>{
  const f=fixture(); await f.save({__delete:{items:['a_one']}});
  assert.equal(f.db.prepare('SELECT count(*) n FROM menu_items').get().n,1);
  assert.ok(f.db.prepare('SELECT id FROM menu_categories WHERE id=?').get('a_food'));
});
