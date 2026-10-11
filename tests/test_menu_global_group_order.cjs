const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('../benmi-worker-official/node_modules/typescript');
const { fixture } = require('./helpers/option-groups.cjs');
const { Element } = require('./helpers/menu-drawer-dom.cjs');

async function setup() {
  const f = fixture();
  f.db.exec('ALTER TABLE menu_categories ADD COLUMN short_name TEXT;');
  const definitions = [];
  for (const [id, scope, tenant] of [['a_utensils', 'order', 'a'], ['a_notes', 'order', 'a'], ['a_item', 'item', 'a'], ['b_notes', 'order', 'b']]) {
    const definition = { id, name: id, revision: 0, minSelection: 0, maxSelection: 2,
      allowRepeats: true, included: false, sources: [], itemIds: [],
      options: [{ id: id + '_option', name: 'Option', price: 3, quantity: 1 }] };
    const response = await f.save('group', definition, tenant);
    assert.equal(response.status, 200, await response.clone().text());
    f.db.prepare('UPDATE modifier_groups SET scope=?,source_metadata_json=? WHERE id=?')
      .run(scope, JSON.stringify({ keep: 'migration metadata' }), id);
    definitions.push(definition);
  }
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync('benmi-worker-official/src/modules/menu.ts', 'utf8') + '\nexport {syncMenuToD1};', {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, { exports, console, Date, JSON, Map, Set, Response, Request, URL,
    crypto: require('node:crypto').webcrypto,
    require: name => name.includes('option-groups') ? f.api : name.includes('http') ? {
      json: (body, status = 200) => new Response(JSON.stringify(body), { status }),
    } : name.includes('bootstrap') ? {
      invalidateBootstrapCache: async tenant => f.deleted.push('bootstrap:' + tenant),
    } : { getTenantId: request => new URL(request.url).searchParams.get('tenant_id') },
  });
  const groupPayload = (id, position) => ({ id, key: id, scope: 'order', displaySortOrder: position, options: [] });
  return { ...f, definitions, groupPayload,
    sync: data => exports.syncMenuToD1('a', data, f.env),
    update: data => exports.updateMenu(new Request('https://test.invalid/api/menu?tenant_id=a', {
      method: 'POST', body: JSON.stringify(data),
    }), f.env),
  };
}

test('whole-order positions persist independently and preserve rules, options, links and metadata', async () => {
  const f = await setup();
  const before = await f.api.loadOptionCatalog(f.env, 'a');
  const foreign = f.db.prepare('SELECT * FROM modifier_groups WHERE id=?').get('b_notes');
  const response = await f.update({ a_food: { __sort_order: 2 }, __customizations: { groups: [
    f.groupPayload('a_utensils', 0), f.groupPayload('a_notes', 3),
  ] } });
  assert.equal(response.status, 200, await response.clone().text());
  const after = await f.api.loadOptionCatalog(f.env, 'a');
  for (const [id, position] of [['a_utensils', 0], ['a_notes', 3]]) {
    const old = before.groups.find(g => g.id === id), current = after.groups.find(g => g.id === id);
    const { revision, metadata, displaySortOrder, ...unchanged } = current;
    const { revision: oldRevision, metadata: oldMetadata, ...original } = old;
    assert.deepEqual(unchanged, original);
    assert.equal(revision, oldRevision + 1);
    assert.deepEqual(metadata, { ...oldMetadata, displaySortOrder: position });
    assert.equal(displaySortOrder, position);
  }
  assert.deepEqual(after.products, before.products);
  assert.deepEqual(after.links, before.links);
  assert.deepEqual(after.categoryLinks, before.categoryLinks);
  assert.deepEqual(after.groups.find(g => g.id === 'a_item'), before.groups.find(g => g.id === 'a_item'));
  assert.deepEqual(f.db.prepare('SELECT * FROM modifier_groups WHERE id=?').get('b_notes'), foreign);
  assert.equal(after.categories.find(c => c.id === 'a_food').sort_order, 2);
  assert.ok(f.deleted.includes('bootstrap:a'));
  assert.ok(f.deleted.includes('tenant:a:menu'));

  // Execute the exact order-group query used by bootstrap, including the optional position.
  const source = fs.readFileSync('benmi-worker-official/src/modules/bootstrap.ts', 'utf8');
  const query = source.match(/`(SELECT g\.id AS group_id,[\s\S]+?WHERE g\.tenant_id = \? AND g\.scope = 'order'[\s\S]+?)`/)[1];
  const rows = f.db.prepare(query).all('a');
  assert.equal(rows.find(row => row.group_id === 'a_utensils').display_sort_order, 0);
  assert.equal(rows.find(row => row.group_id === 'a_notes').display_sort_order, 3);
});

test('unchanged positions do not advance group revisions, and group editing preserves position', async () => {
  const f = await setup(), payload = { __customizations: { groups: [f.groupPayload('a_notes', 4)] } };
  await f.sync(payload);
  const before = await f.api.loadOptionCatalog(f.env, 'a');
  await f.sync(payload);
  const unchanged = await f.api.loadOptionCatalog(f.env, 'a');
  assert.equal(unchanged.revision, before.revision);
  const group = before.groups.find(g => g.id === 'a_notes');
  const stale = await f.save('group', f.definitions.find(g => g.id === group.id));
  assert.equal(stale.status, 409);
  const saved = await f.save('group', { ...group, itemIds: [], name: 'Updated notes' });
  assert.equal(saved.status, 200, await saved.clone().text());
  const after = await f.api.loadOptionCatalog(f.env, 'a');
  assert.equal(after.groups.find(g => g.id === group.id).displaySortOrder, 4);
});

test('invalid, foreign and per-item positions reject the entire menu update', async () => {
  const f = await setup();
  for (const [id, value] of [['a_notes', -1], ['a_notes', 1.5], ['a_notes', '2'], ['a_notes', null], ['a_item', 2], ['b_notes', 2]]) {
    const before = await f.api.loadOptionCatalog(f.env, 'a');
    await assert.rejects(() => f.sync({ a_food: { __sort_order: 9 }, __customizations: {
      groups: [f.groupPayload('a_utensils', 1), f.groupPayload(id, value)],
    } }));
    assert.deepEqual(await f.api.loadOptionCatalog(f.env, 'a'), before);
  }
});

test('a failed transaction rolls back every display position', async () => {
  const f = await setup(), before = await f.api.loadOptionCatalog(f.env, 'a');
  f.db.exec("CREATE TRIGGER fail_position BEFORE UPDATE ON modifier_groups WHEN NEW.id='a_notes' BEGIN SELECT RAISE(ABORT,'TEST_FAILURE'); END;");
  await assert.rejects(() => f.sync({ __customizations: { groups: [f.groupPayload('a_utensils', 1), f.groupPayload('a_notes', 3)] } }), /TEST_FAILURE/);
  assert.deepEqual(await f.api.loadOptionCatalog(f.env, 'a'), before);
});

function customerMenu(customizations) {
  const doc = { createElement(tag) { const el = new Element(tag, doc); el.style = {}; return el; } };
  doc.body = doc.createElement('body');
  doc.getElementById = id => doc.body.querySelector('#' + id);
  doc.querySelectorAll = selector => doc.body.querySelectorAll(selector);
  for (const id of ['main-nav', 'catalog-sections']) { const el = doc.createElement('div'); el.id = id; doc.body.appendChild(el); }
  const context = { document: doc, console,
    escapeHtml: s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])),
    bootstrapData: { customizationSortOrder: 0, customizationTitle: 'Global options', customizationShortName: 'Options',
      customizations, catalog: [{ slug: 'food', name: 'Food', sortOrder: 2, items: [] }, { slug: 'drinks', name: 'Drinks', sortOrder: 4, items: [] }] },
  };
  context.window = context;
  vm.createContext(context);
  vm.runInContext(fs.readFileSync('js/client-menu.js', 'utf8'), context);
  context.renderDynamicCatalog();
  return { doc, sections: doc.getElementById('catalog-sections').children, nav: doc.getElementById('main-nav') };
}
const customerGroup = (id, position) => ({ id, key: id, title: id, scope: 'order', type: 'radio',
  ...(position === undefined ? {} : { displaySortOrder: position }),
  options: [{ id: id + '_option', name: 'Option', price: 3, is_default: true }],
});

test('customer sections and navigation interleave each order group without duplicating its title', () => {
  const app = customerMenu([customerGroup('餐具', 0), customerGroup('Ghi chú', 3), { ...customerGroup('Topping', 1), scope: 'item' }]);
  assert.deepEqual(app.sections.map(s => s.id), ['sec-order-option-' + encodeURIComponent('餐具'), 'sec-food', 'sec-order-option-Ghi%20ch%C3%BA', 'sec-drinks']);
  assert.deepEqual(app.nav.children.map(el => el.textContent), ['餐具', 'Food', 'Ghi chú', 'Drinks', '結帳']);
  const group = app.sections[2];
  assert.equal(group.querySelector('.section-title').textContent, 'Ghi chú');
  assert.equal(group.querySelectorAll('.custom-label').length, 0);
  const input = group.querySelector('input');
  assert.equal(input.getAttribute('name'), 'opt-Ghi chú');
  assert.equal(input.dataset.price, '3');
  assert.equal(input.checked, true);
});

test('unpositioned legacy groups retain the shared container and their library order', () => {
  const app = customerMenu([{ ...customerGroup('second'), sortOrder: 2 }, { ...customerGroup('first'), sortOrder: 1 }, customerGroup('Last', 5)]);
  assert.deepEqual(app.sections.map(s => s.id), ['sec-order-option', 'sec-food', 'sec-drinks', 'sec-order-option-Last']);
  assert.deepEqual(app.sections[0].querySelectorAll('.custom-label').map(el => el.textContent), ['first', 'second']);
});
