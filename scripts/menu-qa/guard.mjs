import assert from 'node:assert/strict';
export const target = Object.freeze({ frontend: 'https://dev.benmi-order.pages.dev', worker: 'https://platform-worker-dev.thuanmnc.workers.dev', tenant: 'jiangjiejie' });

export function verifyIdentity({ frontend, worker, tenant, commit }, metadata) {
  assert.equal(frontend, target.frontend, 'QA frontend must be dev');
  assert.equal(worker, target.worker, 'QA Worker must be dev');
  assert.equal(tenant, target.tenant, 'Tenant has not been designated for QA');
  assert.match(commit || '', /^[a-f0-9]{40}$/, 'A full expected commit is required');
  for (const [name, value] of Object.entries(metadata)) {
    assert.equal(value?.commit, commit, `${name}: deployment commit not verified`);
    assert.equal(value?.environment, 'dev', `${name}: deployment environment not verified`);
    assert.equal(value?.dirty, false, `${name}: deployment contains uncommitted changes or missing provenance`);
  }
  assert.ok(metadata.frontend && metadata.worker, 'Both deployments must be verified');
}

export function guardWrite(url, method, payload, manifest) {
  const parsed = new URL(url);
  assert.equal(parsed.origin, target.worker);
  assert.equal(parsed.searchParams.get('tenant_id'), target.tenant);
  if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') return;
  assert.equal(method, 'POST');
  if (parsed.pathname === '/api/create') {
    assert.equal(payload.userId || payload.user_id, `guest_${manifest.runId}`);
    assert.equal(payload.detailVersion, 1, 'Only the D1 snapshot order path is allowed');
    assert.ok(payload.items?.length, 'No test items');
    assert.ok(payload.items.every(i => manifest.products.includes(i.itemId)), 'Order references an unowned product');
    assert.match(payload.uuid || '', /^[a-f0-9-]{36}$/i);
    if (!manifest.orderUuids.includes(payload.uuid)) manifest.orderUuids.push(payload.uuid);
    return;
  }
  const kind = parsed.pathname === '/api/menu/product' ? 'products' : parsed.pathname === '/api/menu/option-group' ? 'groups' : null;
  assert.ok(kind, `Unexpected write endpoint: ${parsed.pathname}`);
  assert.ok(payload?.id && !manifest.existingIds.includes(payload.id), 'Cannot modify a pre-existing entity');
  if (!manifest[kind].includes(payload.id)) {
    assert.ok(!payload.delete && payload.name?.startsWith(manifest.runId), 'New records must carry the run marker');
    manifest[kind].push(payload.id);
  }
  if (payload.delete) return;
  if (kind === 'groups') {
    assert.equal(payload.scope, 'item', 'Remote tests must not alter order-wide defaults');
    assert.equal((payload.categoryIds || []).length, 0, 'Cannot attach defaults to existing categories');
    assert.ok((payload.itemIds || []).every(id => manifest.products.includes(id)), 'Cannot link existing products');
  } else {
    assert.ok((payload.links || []).every(link => manifest.groups.includes(link.groupId)), 'Cannot link an existing group');
  }
}
