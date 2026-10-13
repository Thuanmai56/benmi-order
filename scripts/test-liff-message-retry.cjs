const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('../benmi-worker-official/node_modules/typescript');

require.extensions['.ts'] = (module, file) => module._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS }
}).outputText, file);
const { recordLiffClientError } = require('../benmi-worker-official/src/modules/line-client-telemetry.ts');

const messages = [{ type: 'text', text: 'Private order content must never be logged' }];
const context = { tenantId: 'tenant-a', orderKey: 'A1013-T009', flow: 'create' };
const flush = () => new Promise(resolve => setImmediate(resolve));

function client(sendMessages, fetchOverride) {
  const requests = [], delays = [], errors = [];
  const sandbox = {
    window: {}, URLSearchParams,
    document: { readyState: 'loading', addEventListener() {} },
    WORKER_BASE: 'https://worker.example',
    crypto: { randomUUID: () => 'incident-123' },
    liff: { sendMessages, id: '1234567890-abc', getContext: () => ({ type: 'none', scope: ['profile'] }) },
    setTimeout: (callback, delay) => { delays.push(delay); queueMicrotask(callback); },
    console: { error: (...args) => errors.push(args), warn() {}, log() {} },
    fetch: async (url, options) => {
      requests.push({ url, options });
      if (fetchOverride) return fetchOverride(url, options);
      return recordLiffClientError(new Request(url, options), { tenantId: 'tenant-a' });
    }
  };
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../js/client-checkout.js'), 'utf8'), sandbox);
  return { sandbox, requests, delays, errors };
}

test('successful LINE send is not retried and produces no error telemetry', async () => {
  let calls = 0;
  const c = client(async sent => { calls++; assert.equal(sent, messages); });
  await c.sandbox.sendLiffMessagesWithRetry(messages, context);
  assert.equal(calls, 1);
  assert.equal(c.requests.length, 0);
  assert.equal(c.errors.length, 0);
  assert.equal(c.delays.length, 0);
});

test('first failure reaches Worker logs and the same message is retried once', async t => {
  const logs = [];
  t.mock.method(console, 'error', line => logs.push(JSON.parse(line)));
  let calls = 0;
  const c = client(async sent => {
    assert.equal(sent, messages);
    if (++calls === 1) throw Object.assign(new Error('Temporary failure'), { code: '500' });
  });
  await c.sandbox.sendLiffMessagesWithRetry(messages, context);
  await flush();
  assert.equal(calls, 2);
  assert.deepEqual(c.delays, [1000]);
  assert.equal(c.requests.length, 1);
  assert.equal(new URL(c.requests[0].url).pathname, '/api/line/client-error');
  assert.equal(c.requests[0].options.keepalive, true);
  assert.equal(logs.length, 1);
  assert.equal(logs[0].event, 'liff_send_message_failed');
  assert.equal(logs[0].tenantId, context.tenantId);
  assert.equal(logs[0].orderKey, context.orderKey);
  assert.equal(logs[0].attempt, 1);
  assert.equal(logs[0].errorCode, '500');
  assert.equal(logs[0].contextType, 'none');
  assert.equal(logs[0].chatMessageWriteScope, false);
  assert.equal(JSON.stringify(logs).includes(messages[0].text), false);
});

test('two failures are both logged, share a correlation ID and never cause a third send', async t => {
  const logs = [];
  t.mock.method(console, 'error', line => logs.push(JSON.parse(line)));
  const failure = Object.assign(new Error('Permission denied'), { code: '403' });
  let calls = 0;
  const c = client(async () => { calls++; throw failure; });
  await assert.rejects(c.sandbox.sendLiffMessagesWithRetry(messages, context), error => error === failure);
  await flush();
  assert.equal(calls, 2);
  assert.deepEqual(c.delays, [1000]);
  assert.deepEqual(logs.map(log => log.attempt), [1, 2]);
  assert.equal(logs[0].correlationId, logs[1].correlationId);
  assert.equal(logs[1].maxAttempts, 2);
  assert.equal(c.requests.every(request => new URL(request.url).pathname === '/api/line/client-error'), true);
});

test('unreachable telemetry cannot block the LINE retry', async () => {
  let calls = 0;
  const c = client(async () => {
    if (++calls === 1) throw new Error('LINE unavailable');
  }, async () => new Promise(() => {}));
  await c.sandbox.sendLiffMessagesWithRetry(messages, context);
  assert.equal(calls, 2);
  assert.deepEqual(c.delays, [1000]);
});

test('Worker bounds and sanitizes telemetry, uses resolved tenant and drops other payload fields', async t => {
  const logs = [];
  t.mock.method(console, 'error', line => logs.push(JSON.parse(line)));
  const payload = {
    ...context, tenantId: 'spoofed', attempt: 2, maxAttempts: 99,
    errorCode: '403', errorMessage: 'Bearer hidden-token access_token=another-secret&next=1',
    contextType: 'none', accessToken: 'never-log-this', messages
  };
  const response = await recordLiffClientError(new Request('https://worker.example/api/line/client-error', {
    method: 'POST', body: JSON.stringify(payload)
  }), { tenantId: 'tenant-a' });
  assert.equal(response.status, 202);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.equal(logs[0].tenantId, 'tenant-a');
  assert.equal(logs[0].maxAttempts, 2);
  for (const secret of ['hidden-token', 'another-secret', 'never-log-this', messages[0].text]) {
    assert.equal(JSON.stringify(logs).includes(secret), false);
  }
});

test('Worker rejects unknown tenants, malformed fields and oversized streaming payloads', async t => {
  const logs = [];
  t.mock.method(console, 'error', line => logs.push(line));
  const request = body => new Request('https://worker.example/api/line/client-error', { method: 'POST', body });
  assert.equal((await recordLiffClientError(request('{}'), null)).status, 404);
  for (const body of ['invalid JSON', 'null', '[]', JSON.stringify({ ...context, attempt: 3 })]) {
    assert.equal((await recordLiffClientError(request(body), context)).status, 400);
  }
  assert.equal((await recordLiffClientError(request('x'.repeat(4097)), context)).status, 413);
  assert.equal(logs.length, 0);
});
