import test from 'node:test';
import assert from 'node:assert/strict';
import { target, verifyIdentity, guardWrite } from '../../scripts/menu-qa/guard.mjs';
import { cacheBusterErrors } from '../../scripts/check-cache-busters.mjs';
import { testOutcome } from '../../scripts/menu-qa/suites.mjs';
test('dev gate rejects unknown, mismatched, dirty and production deployments', () => {
  const options = { ...target, commit: 'a'.repeat(40) };
  const m = { commit: options.commit, environment: 'dev', dirty: false };
  verifyIdentity(options, { frontend: m, worker: m });
  for (const bad of [{}, { ...m, dirty: true }, { ...m, commit: 'b'.repeat(40) }, { ...m, environment: 'production' }])
    assert.throws(() => verifyIdentity(options, { frontend: m, worker: bad }));
  assert.throws(() => verifyIdentity({ ...options, worker: 'https://benmi-worker-official.thuanmnc.workers.dev' }, { frontend: m, worker: m }));
  assert.throws(() => verifyIdentity({ ...options, tenant: 'benmi' }, { frontend: m, worker: m }));
});
test('ownership guard blocks pre-existing entities, cross-tenant writes and broad links', () => {
  const manifest = { runId: 'qa_test', existingIds: ['existing'], products: [], groups: [], orderUuids: [] };
  const url = target.worker + '/api/menu/option-group?tenant_id=' + target.tenant;
  const payload = { id: 'new', name: 'qa_test group', scope: 'item', itemIds: [], categoryIds: [] };
  assert.throws(() => guardWrite(url, 'POST', { ...payload, id: 'existing' }, manifest));
  assert.throws(() => guardWrite(url.replace(target.tenant, 'benmi'), 'POST', payload, manifest));
  assert.throws(() => guardWrite(url, 'POST', { ...payload, itemIds: ['existing'] }, manifest));
  assert.throws(() => guardWrite(url, 'POST', { ...payload, categoryIds: ['existing'] }, manifest));
  guardWrite(url, 'POST', payload, manifest);
  assert.deepEqual(manifest.groups, ['new']);
});
test('cache-buster must change at every referencing page, irrespective of calendar month', () => {
  const old = { 'a.html': '<script src="/js/menu.js?v=202610_a"></script>', 'b.html': '<script src="js/menu.js?v=202610_a"></script>' };
  const next = { ...old, 'a.html': '<script src="/js/menu.js?v=202610_b"></script>' };
  assert.equal(cacheBusterErrors(['js/menu.js'], old, next).length, 1);
  next['b.html'] = next['a.html'];
  assert.deepEqual(cacheBusterErrors(['js/menu.js'], old, next), []);
});
test('required suites reject skips, zero tests, timeouts and nonzero exit', () => {
  const passed = '# tests 3\n# skipped 0\n# todo 0\n';
  assert.equal(testOutcome({ status: 0 }, passed, true), 'passed');
  for (const log of ['', '# tests 0\n# skipped 0\n# todo 0\n', passed.replace('skipped 0', 'skipped 1'), passed.replace('todo 0', 'todo 1')])
    assert.equal(testOutcome({ status: 0 }, log, true), 'failed');
  assert.equal(testOutcome({ status: 1 }, passed, true), 'failed');
  assert.equal(testOutcome({ status: null, error: new Error('timeout') }, passed, true), 'failed');
});
