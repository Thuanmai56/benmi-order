import test from 'node:test';
import assert from 'node:assert/strict';
import { startRuntime, tenant } from './runtime.mjs';

for (const upgrade of [false, true]) test(`Worker HTTP / D1 / KV: ${upgrade ? 'upgrade from HEAD migrations' : 'fresh migrations'}`, { timeout: 120000 }, async () => {
  const app = await startRuntime({ upgrade });
  try {
    const read = async endpoint => { const r = await app.request(endpoint); assert.equal(r.status, 200, await r.clone().text()); return r.json(); };
    const before = await read('/api/menu/options');
    assert.ok(before.groups.length > 0);
    const bootstrap = await read('/api/tenant/bootstrap');
    assert.equal(bootstrap.menuComplete, true);
    assert.ok(await app.kv.get(`tenant:${tenant}:bootstrap:v2`), 'normal bootstrap must warm real KV');
    const id = 'qa_http_group';
    const payload = { id, revision: 0, name: 'QA HTTP group', scope: 'item', minSelection: 0, maxSelection: 1,
      options: [{ id: 'qa_http_option', name: 'Zero surcharge', price: 0, quantity: 1 }], itemIds: [], categoryIds: [], sources: [] };
    const save = body => app.request('/api/menu/option-group', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const response = await save(payload);
    assert.equal(response.status, 200, await response.clone().text());
    const row = await app.db.prepare('SELECT name FROM modifier_groups WHERE tenant_id=? AND id=?').bind(tenant, id).first();
    assert.equal(row.name, payload.name);
    assert.equal(await app.kv.get(`tenant:${tenant}:bootstrap:v2`), null);
    const catalog = await read('/api/menu/options');
    const saved = catalog.groups.find(g => g.id === id);
    assert.equal(saved.options[0].price, 0);
    assert.equal((await save({ ...payload, name: 'Stale overwrite' })).status, 409);
    assert.equal((await read('/api/menu/options')).groups.find(g => g.id === id).name, payload.name);
    const warm = await read('/api/tenant/bootstrap');
    const fresh = await read('/api/tenant/bootstrap?nocache=1');
    assert.deepEqual(warm, fresh, 'normal cached and uncached customer payloads agree');
    const deleted = await save({ ...saved, delete: true });
    assert.equal(deleted.status, 200, await deleted.clone().text());
    assert.equal((await read('/api/menu/options')).groups.some(g => g.id === id), false);
    assert.deepEqual((await read('/api/menu/options')).products, before.products);
  } finally { await app.close(); }
});
