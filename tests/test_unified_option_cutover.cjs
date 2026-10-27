const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { fixture } = require('./helpers/option-groups.cjs');
const sql = fs.readFileSync('benmi-worker-official/migrations/0072_repair_unified_option_cutover.sql', 'utf8');

function setup() {
  const f = fixture();
  f.db.exec("CREATE TABLE tenant_lifecycle (tenant_id TEXT PRIMARY KEY, state TEXT)");
  return f;
}

test('cutover preserves category choices for in-scope tenants and respects direct overrides', async () => {
  const f = setup();
  try {
    for (const tenant of ['a', 'b']) {
      f.db.prepare(`INSERT INTO modifier_groups(id,tenant_id,name,scope,min_selection,max_selection)
        VALUES (?,?,?,'category',0,1)`).run(`${tenant}_flavor`, tenant, 'Flavor');
      f.db.prepare(`INSERT INTO modifier_options(id,tenant_id,group_id,name,price)
        VALUES (?,?,?,'Spicy',5)`).run(`${tenant}_hot`, tenant, `${tenant}_flavor`);
      f.db.prepare('INSERT INTO category_modifier_links(tenant_id,category_id,group_id,sort_order) VALUES (?,?,?,7)')
        .run(tenant, `${tenant}_food`, `${tenant}_flavor`);
    }
    f.db.exec(`INSERT INTO item_modifier_links(tenant_id,item_id,group_id,is_disabled,option_ids_json)
      VALUES ('a','a_tea','a_flavor',1,NULL), ('b','b_coffee','b_flavor',0,'[]')`);
    assert.equal(f.api.projectOptionRule(await f.api.loadOptionCatalog(f.env, 'a'), 'a_main'), null);
    const beforeProducts = JSON.stringify(f.db.prepare('SELECT * FROM menu_items ORDER BY id').all());
    const beforeOptions = JSON.stringify(f.db.prepare('SELECT * FROM modifier_options ORDER BY id').all());
    f.db.exec(sql);
    for (const tenant of ['a', 'b']) {
      const catalog = await f.api.loadOptionCatalog(f.env, tenant);
      const rule = f.api.projectOptionRule(catalog, `${tenant}_main`);
      assert.equal(rule.groups[0].id, `${tenant}_flavor`);
      assert.equal(rule.groups[0].eligibleItems[0].surcharge, 5);
      assert.ok(catalog.links.every(l => l.itemId.startsWith(`${tenant}_`)));
    }
    assert.equal(f.api.projectOptionRule(await f.api.loadOptionCatalog(f.env, 'a'), 'a_tea'), null);
    assert.equal(f.api.effectiveGroups(await f.api.loadOptionCatalog(f.env, 'b'), 'b_coffee')[0].options.length, 0);
    assert.equal(JSON.stringify(f.db.prepare('SELECT * FROM menu_items ORDER BY id').all()), beforeProducts);
    assert.equal(JSON.stringify(f.db.prepare('SELECT * FROM modifier_options ORDER BY id').all()), beforeOptions);
    const links = JSON.stringify(f.db.prepare('SELECT * FROM item_modifier_links ORDER BY tenant_id,item_id,group_id').all());
    f.db.exec(sql);
    assert.equal(JSON.stringify(f.db.prepare('SELECT * FROM item_modifier_links ORDER BY tenant_id,item_id,group_id').all()), links);
    // This is a one-time conversion, not renewed category inheritance.
    f.db.exec("INSERT INTO menu_items(id,tenant_id,category_id,name,price) VALUES ('a_new','a','a_food','New',20)");
    assert.equal(f.api.projectOptionRule(await f.api.loadOptionCatalog(f.env, 'a'), 'a_new'), null);
  } finally { f.db.close(); }
});

test('manually repaired Benmi remains byte-for-byte unchanged by every repair step', () => {
  const f = setup();
  try {
    f.db.exec(`INSERT INTO menu_categories(id,tenant_id,name,category_type)
      VALUES ('manual_sets','benmi','Manual sets','catalog');
      INSERT INTO menu_items(id,tenant_id,category_id,name,price)
      VALUES ('manual_set','benmi','manual_sets','Manual meal',125),
             ('unlinked_set','benmi','manual_sets','Intentionally unlinked',90);
      INSERT INTO modifier_groups(id,tenant_id,name,scope,included,revision,source_metadata_json)
      VALUES ('manual_group','benmi','Manual options','item',1,0,
              '{"legacyBundleRuleId":"manual_rule","legacyGroupId":"choice"}');
      INSERT INTO modifier_options(id,tenant_id,group_id,name,price,is_default)
      VALUES ('manual_option','benmi','manual_group','Manual option',7,1);
      INSERT INTO category_modifier_links(tenant_id,category_id,group_id)
      VALUES ('benmi','manual_sets','manual_group');
      INSERT INTO item_modifier_links(tenant_id,item_id,group_id,option_ids_json,is_disabled)
      VALUES ('benmi','manual_set','manual_group','["manual_option"]',1);
      INSERT INTO menu_bundle_rules(id,tenant_id,parent_item_id,schema_version,config_json)
      VALUES ('manual_rule','benmi','manual_set',1,
              '{"groups":[{"id":"choice","pricing":{"type":"included"}}]}');`);
    const tables = ['menu_categories', 'menu_items', 'modifier_groups', 'modifier_options',
      'item_modifier_links', 'category_modifier_links', 'menu_bundle_rules', 'menu_catalog_revisions'];
    const snapshot = () => JSON.stringify(Object.fromEntries(tables.map(table => [table,
      f.db.prepare(`SELECT * FROM ${table} WHERE tenant_id='benmi' ORDER BY rowid`).all()])));
    const before = snapshot();
    f.db.exec(sql);
    assert.equal(snapshot(), before);
    f.db.exec(sql);
    assert.equal(snapshot(), before);
    assert.equal(f.db.prepare("SELECT count(*) n FROM sqlite_master WHERE name='_option_cutover_exclusions_0072'").get().n, 0);
  } finally { f.db.close(); }
});

test('deleted tenants and order-scoped groups are excluded from the cutover', () => {
  const f = setup();
  try {
    f.db.exec(`INSERT INTO tenant_lifecycle VALUES ('a','purging');
      INSERT INTO modifier_groups(id,tenant_id,name,scope) VALUES ('a_group','a','Old','category'), ('b_global','b','Global','order');
      INSERT INTO category_modifier_links(tenant_id,category_id,group_id) VALUES ('a','a_food','a_group'), ('b','b_food','b_global');`);
    f.db.exec(sql);
    assert.equal(f.db.prepare('SELECT count(*) n FROM item_modifier_links').get().n, 0);
    assert.equal(f.db.prepare("SELECT count(*) n FROM modifier_groups WHERE tenant_id='benmi'").get().n, 0);
  } finally { f.db.close(); }
});

test('included-price choice stays selectable; fixed groups and edited groups are preserved', async () => {
  const f = setup();
  try {
    for (const [suffix, type, revision] of [['choice', 'choice', 0], ['fixed', 'fixed', 0], ['edited', 'choice', 2]]) {
      const groupId = `a_${suffix}`;
      f.db.prepare(`INSERT INTO modifier_groups(id,tenant_id,name,included,min_selection,max_selection,revision,sources_json,source_metadata_json)
        VALUES (?,'a',?,1,1,1,?,?,?)`).run(groupId, suffix, revision,
          JSON.stringify([{ type: 'item_list', itemIds: ['a_coffee', 'a_tea'] }]),
          JSON.stringify({ legacyBundleRuleId: `rule_${suffix}`, legacyGroupId: 'drink' }));
      f.db.prepare(`INSERT INTO menu_bundle_rules(id,tenant_id,parent_item_id,schema_version,config_json)
        VALUES (?,'a',?,1,?)`).run(`rule_${suffix}`, `parent_${suffix}`,
          JSON.stringify({ groups: [{ id: 'drink', type, pricing: { type: 'included' } }] }));
    }
    f.db.exec("INSERT INTO item_modifier_links(tenant_id,item_id,group_id) VALUES ('a','a_main','a_choice')");
    const before = await f.api.loadOptionCatalog(f.env, 'a');
    assert.throws(() => f.api.validateOptionGraph(before), /INSUFFICIENT_OPTIONS/);
    f.db.exec(sql);
    const catalog = await f.api.loadOptionCatalog(f.env, 'a');
    f.api.validateOptionGraph(catalog);
    assert.equal(catalog.groups.find(g => g.id === 'a_choice').included, false);
    assert.equal(catalog.groups.find(g => g.id === 'a_fixed').included, true);
    assert.equal(catalog.groups.find(g => g.id === 'a_edited').included, true);
    const g = f.api.projectOptionRule(catalog, 'a_main').groups[0];
    assert.equal(g.type, 'choice');
    assert.equal(g.eligibleItems.length, 2);
    assert.equal(f.api.validateOptionSelection(catalog, 'a_main', [{ groupId: g.id,
      items: [{ optionId: g.eligibleItems[0].id, quantity: 1 }] }], [], 100).extra, 0);
  } finally { f.db.close(); }
});

test('current tenant seed writes direct flavor links and a selectable beverage group', async () => {
  const f = setup();
  try {
    const source = fs.readFileSync('scripts/seed-new-tenants-unified-menu.mjs', 'utf8');
    const start = source.indexOf('const sqlStatements = ') + 'const sqlStatements = '.length;
    const end = source.indexOf('\n];', start) + 2;
    // Evaluate only the SQL data array; never run the remote CLI seed loop.
    const statements = require('node:vm').runInNewContext(source.slice(start, end));
    f.db.exec(`INSERT INTO menu_categories(id,tenant_id,name,category_type) VALUES
      ('cat_yanzisuchun_combos','yanxiansuji','Meals','catalog'),
      ('cat_yanzisuchun_drink_choice','yanxiansuji','Beverages','bundle_pool');
      INSERT INTO menu_items(id,tenant_id,category_id,name,price) VALUES
      ('yzs_cb_04','yanxiansuji','cat_yanzisuchun_combos','Meal',100),
      ('drink_1','yanxiansuji','cat_yanzisuchun_drink_choice','Tea',0),
      ('drink_2','yanxiansuji','cat_yanzisuchun_drink_choice','Cola',0);`);
    for (const statement of statements) f.db.exec(statement);
    const catalog = await f.api.loadOptionCatalog(f.env, 'yanxiansuji');
    f.api.validateOptionGraph(catalog);
    const groups = f.api.projectOptionRule(catalog, 'yzs_cb_04').groups;
    assert.ok(groups.some(g => g.id === 'mg_cat_yanxiansuji_cat_yanzisuchun_flavor'));
    const drink = groups.find(g => g.id === 'ug_rule_yzs_cb_04_drink_0');
    assert.equal(drink.type, 'choice');
    assert.equal(drink.eligibleItems.length, 2);
    assert.equal(drink.maxSelection, 1);
    assert.equal(f.db.prepare('SELECT count(*) n FROM category_modifier_links').get().n, 0);
  } finally { f.db.close(); }
});
