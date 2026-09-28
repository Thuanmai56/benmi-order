import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import ts from '../benmi-worker-official/node_modules/typescript/lib/typescript.js';

function moduleUrl(path, replacements = {}) {
  let code = ts.transpileModule(readFileSync(new URL(path, import.meta.url), 'utf8'), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 },
  }).outputText;
  for (const [from, to] of Object.entries(replacements)) code = code.replaceAll(from, to);
  return `data:text/javascript;base64,${Buffer.from(code).toString('base64')}`;
}
const runtimeUrl = moduleUrl('../benmi-worker-official/src/modules/line-runtime.ts');
const { decryptRuntimeSecret, readVerifiedLineWebhook, readLineProjection } = await import(runtimeUrl);
const tenantUrl = moduleUrl('../benmi-worker-official/src/modules/tenant.ts', {
  "'./line-runtime'": JSON.stringify(runtimeUrl),
  "'../utils/secrets'": JSON.stringify(moduleUrl('../benmi-worker-official/src/utils/secrets.ts')),
});
const { resolveTenantContext } = await import(tenantUrl);
const keyBytes = new Uint8Array(32).fill(7);
const keyring = JSON.stringify({ v1: Buffer.from(keyBytes).toString('base64') });
const base = { tenant_id: 'test-cafe', environment: 'dev', connection_id: 'connection-1', revision: 2,
  bot_user_id: 'Uexample', token_key_version: 'v1', secret_key_version: 'v1', is_active: 1,
  liff_id: '1234-abcd', liff_url: 'https://liff.line.me/1234-abcd' };
async function encrypted(value, kind) {
  const key = await crypto.subtle.importKey('raw', keyBytes, 'AES-GCM', false, ['encrypt']);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const additionalData = new TextEncoder().encode(JSON.stringify(['blab-line-v1', base.environment, base.tenant_id,
    base.connection_id, base.revision, kind]));
  const bytes = await crypto.subtle.encrypt({ name: 'AES-GCM', iv, additionalData }, key, new TextEncoder().encode(value));
  return `v1.${Buffer.from(iv).toString('base64')}.${Buffer.from(bytes).toString('base64')}`;
}
async function fixture() {
  const row = { ...base, token_encrypted_value: await encrypted('new-token', 'messaging_token'),
    secret_encrypted_value: await encrypted('new-secret', 'messaging_secret') };
  const db = new DatabaseSync(':memory:');
  db.exec('PRAGMA foreign_keys=ON; CREATE TABLE tenants(id TEXT PRIMARY KEY); CREATE TABLE tenant_config(tenant_id TEXT PRIMARY KEY,is_active INTEGER,brand_name TEXT,line_channel_token TEXT,line_channel_secret TEXT);');
  db.exec(readFileSync(new URL('../benmi-worker-official/migrations/0062_tenant_line_runtime.sql', import.meta.url), 'utf8'));
  db.prepare('INSERT INTO tenants VALUES(?)').run(row.tenant_id);
  db.prepare('INSERT INTO tenant_config VALUES(?,1,?,?,?)').run(row.tenant_id, 'Test café', 'legacy-token', 'legacy-secret');
  const { is_active, ...values } = row;
  values.operation_id = 'operation-1'; values.applied_at = new Date().toISOString();
  db.prepare(`INSERT INTO tenant_line_runtime(${Object.keys(values).join(',')}) VALUES(${Object.keys(values).map(() => '?').join(',')})`).run(...Object.values(values));
  const env = { LINE_RUNTIME_ENABLED: 'true', LINE_RUNTIME_ENVIRONMENT: 'dev', LINE_SECRET_KEYS: keyring,
    DB: { prepare(sql) { return { bind(...params) { return {
      async first() { return db.prepare(sql).get(...params) || null; },
      async run() { return { meta: { changes: Number(db.prepare(sql).run(...params).changes) } }; },
    }; } }; } },
    ORDER_STATE: { async get() { throw Error('managed context must bypass stale KV'); }, async put() { throw Error('managed credentials must never enter KV'); } },
  };
  const context = { tenantId: row.tenant_id, lineChannelSecret: 'new-secret', lineRuntime: {
    environment: row.environment, connectionId: row.connection_id, revision: row.revision, botUserId: row.bot_user_id,
  } };
  return { row, db, env, context };
}
async function request(body = '{"destination":"Uexample","events":[]}', secret = 'new-secret') {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const signature = Buffer.from(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(body))).toString('base64');
  return new Request('https://runtime.example/webhook/test-cafe', { method: 'POST', body, headers: { 'x-line-signature': signature } });
}

test('runtime decrypts admin envelopes and rejects cross-tenant, environment, revision and kind', async () => {
  const { env, row, db } = await fixture();
  try {
    assert.equal(await decryptRuntimeSecret(env, row, 'messaging_token'), 'new-token');
    for (const change of [{ tenant_id: 'other' }, { environment: 'production' }, { revision: 3 }, { connection_id: 'other' },
      { token_encrypted_value: row.secret_encrypted_value }]) {
      await assert.rejects(decryptRuntimeSecret(env, { ...row, ...change }, 'messaging_token'), { code: 'LINE_RUNTIME_CREDENTIALS_UNAVAILABLE' });
    }
    await assert.rejects(decryptRuntimeSecret({ ...env, LINE_SECRET_KEYS: '{}' }, row, 'messaging_token'), { code: 'LINE_RUNTIME_CREDENTIALS_UNAVAILABLE' });
  } finally { db.close(); }
});
test('managed context bypasses cached legacy tokens and never caches decrypted credentials', async () => {
  const { env, db } = await fixture();
  try {
    const ctx = await resolveTenantContext('test-cafe', env);
    assert.equal(ctx.lineChannelToken, 'new-token');
    assert.equal(ctx.lineChannelSecret, 'new-secret');
    assert.equal(ctx.liffId, base.liff_id);
    assert.equal(ctx.lineRuntime.revision, 2);
    db.prepare('UPDATE tenant_config SET is_active=0').run();
    assert.equal(await resolveTenantContext('test-cafe', env), null);
  } finally { db.close(); }
});
test('managed DB/key failures cannot downgrade to legacy credentials', async () => {
  const { env, db } = await fixture();
  try {
    await assert.rejects(resolveTenantContext('test-cafe', { ...env, LINE_SECRET_KEYS: '{}' }), { code: 'LINE_RUNTIME_CREDENTIALS_UNAVAILABLE' });
    db.exec('DROP TABLE tenant_line_runtime');
    await assert.rejects(resolveTenantContext('test-cafe', env), { code: 'LINE_RUNTIME_UNAVAILABLE' });
    assert.equal(await readLineProjection({ ...env, LINE_RUNTIME_ENABLED: 'false', LINE_RUNTIME_TENANTS: '[]' }, 'test-cafe'), null);
  } finally { db.close(); }
});
test('valid signed empty webhook records exact revision receipt', async () => {
  const { env, context, db } = await fixture();
  try {
    assert.deepEqual((await readVerifiedLineWebhook(await request(), env, context)).events, []);
    const receipt = db.prepare('SELECT webhook_verified_at,webhook_verified_revision FROM tenant_line_runtime').get();
    assert.ok(receipt.webhook_verified_at); assert.equal(receipt.webhook_verified_revision, 2);
  } finally { db.close(); }
});
test('invalid/missing signatures, changed bytes, wrong destination and malformed bodies leave no receipt', async () => {
  const { env, context, db } = await fixture();
  try {
    const signed = await request();
    const tampered = new Request(signed.url, { method: 'POST', headers: signed.headers, body: '{ "destination":"Uexample","events":[]}' });
    for (const bad of [tampered, new Request(signed.url, { method: 'POST', body: '{}' }), await request(undefined, 'other-secret')]) {
      await assert.rejects(readVerifiedLineWebhook(bad, env, context), { code: 'LINE_WEBHOOK_SIGNATURE_INVALID' });
    }
    await assert.rejects(readVerifiedLineWebhook(await request('{"destination":"other","events":[]}'), env, context), { code: 'LINE_WEBHOOK_DESTINATION_MISMATCH' });
    await assert.rejects(readVerifiedLineWebhook(await request('not JSON'), env, context), { code: 'LINE_WEBHOOK_INVALID_BODY' });
    assert.equal(db.prepare('SELECT webhook_verified_at FROM tenant_line_runtime').get().webhook_verified_at, null);
  } finally { db.close(); }
});
test('signature verifies raw UTF-8 bytes with whitespace and escaped characters', async () => {
  const { env, context, db } = await fixture();
  try {
    const body = '{ "destination": "Uexample", "events": [{"text":"Tiếng Việt\\n繁體中文"}] }\n';
    assert.equal((await readVerifiedLineWebhook(await request(body), env, context)).events[0].text, 'Tiếng Việt\n繁體中文');
  } finally { db.close(); }
});
test('old revision webhook cannot mark newer revision verified', async () => {
  const { env, context, db } = await fixture();
  try {
    db.exec('UPDATE tenant_line_runtime SET revision=3');
    await assert.rejects(readVerifiedLineWebhook(await request(), env, context), { code: 'LINE_WEBHOOK_REVISION_CHANGED' });
    assert.equal(db.prepare('SELECT webhook_verified_at FROM tenant_line_runtime').get().webhook_verified_at, null);
  } finally { db.close(); }
});
test('oversized streamed webhook is rejected without trusting content-length', async () => {
  const { env, context, db } = await fixture();
  try {
    const input = new Request('https://example.test', { method: 'POST', body: new ReadableStream({ start(c) { c.enqueue(new Uint8Array(1024 * 1024 + 1)); c.close(); } }), duplex: 'half' });
    await assert.rejects(readVerifiedLineWebhook(input, env, context), { code: 'LINE_WEBHOOK_TOO_LARGE' });
  } finally { db.close(); }
});
