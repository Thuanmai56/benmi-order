import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Miniflare } from 'miniflare';
import { readFile, readdir } from 'node:fs/promises';
import { emptySeed, newCategory, type Actor, type Credentials, type PlatformCommand } from '@blab/tenant-contracts';
import { provision, advanceOperation, getOperation } from '../src/onboarding/provision';
import { putCredentials, checkLine, getCredentialRow, openCredentials } from '../src/onboarding/credentials';
import { hashPassword, seal, unseal, verifyPassword, verifyLineSignature } from '../src/onboarding/crypto';
import { tenantReadiness, pendingWebhook } from '../src/onboarding/gate';
import { resolveTenantContext } from '../src/modules/tenant';
import { handleAuth } from '../src/modules/auth';
import { hasPosSession } from '../src/onboarding/pos-session';
import type { Env } from '../src/types/env';

let mf: Miniflare; let env: Env;
const actor: Actor = { id: 'reviewer-1', email: 'reviewer@example.com', permissions: ['tenant:publish', 'draft:edit', 'credential:manage'] };
const credentials: Credentials = { liff_id: '1234567890-AbCdEf', line_channel_token: 'test-access-token-not-real-12345',
  line_channel_secret: '1234567890abcdef1234567890abcdef', pos_password: 'a-unique-test-password' };
let currentEndpoint: string | null = null; let failLine = false;
const lineFetch = async (url: RequestInfo | URL, init?: RequestInit) => {
  if (failLine) return Response.json({ message: 'bad token' }, { status: 401 });
  const path = String(url);
  if (path.endsWith('/info')) return Response.json({ userId: 'bot-test', displayName: 'Test account' });
  if (path.endsWith('/test')) return Response.json({ success: true });
  if (init?.method === 'PUT') { currentEndpoint = JSON.parse(String(init.body)).endpoint; return Response.json({}); }
  return Response.json({ endpoint: currentEndpoint, active: true });
};
beforeAll(async () => {
  mf = new Miniflare({ workers: [{ config: { name: 'onboarding-tests', type: 'worker', compatibilityDate: '2026-09-08',
    env: { DB: { type: 'd1', id: 'onboarding-db' }, ORDER_STATE: { type: 'kv', id: 'onboarding-kv' } },
    manifest: { mainModule: 'index.js', modules: { 'index.js': { type: 'esm', contents: 'export default { fetch() { return new Response("OK"); } }' } } },
  } }] });
  env = { DB: await mf.getD1Database('DB'), ORDER_STATE: await mf.getKVNamespace('ORDER_STATE'), ONBOARDING_ENABLED: 'true',
    ONBOARDING_CREDENTIAL_KEY: btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32)))),
    ONBOARDING_CUSTOMER_BASE_URL: 'https://menu.example.com', ONBOARDING_PLATFORM_BASE_URL: 'https://worker.example.com' };
  // Exercise the real schema DDL, without executing restaurant seed data.
  const names = (await readdir(new URL('../migrations/', import.meta.url))).sort();
  for (const name of names) {
    const sql = await readFile(new URL(`../migrations/${name}`, import.meta.url), 'utf8');
    const statements = sql.match(/^(?:CREATE TABLE(?: IF NOT EXISTS)?|ALTER TABLE) (?:tenants|tenant_config|menu_categories|menu_items|menu_customizations|onboarding_credentials|tenant_provisioning_operations|tenant_provisioning_outbox|tenant_admin_audit|pos_sessions|pos_auth_attempts)\b[\s\S]*?;/gm) ?? [];
    for (const statement of statements) await env.DB.prepare(statement).run();
  }
}, 30000);
afterAll(async () => { await mf?.dispose(); });
async function prepared(tenantId: string) {
  const draftId = crypto.randomUUID();
  await putCredentials(env, actor, draftId, 0, credentials, crypto.randomUUID());
  const check = await checkLine(env, actor, draftId, 1, lineFetch);
  const seed = emptySeed(); seed.tenant = { ...seed.tenant, id: tenantId, brand_name: "Café d'An", store_address: 'Test address',
    operating_hours: { ...seed.tenant.operating_hours, '1': [{ start: '09:00', end: '21:00' }] } };
  const cat = newCategory('catalog'); if (cat.category_type !== 'catalog') throw new Error();
  const mod = newCategory('modifier'); mod.name = 'Extra'; mod.slug = 'extra'; mod.items[0].name = 'Egg'; mod.items[0].price = 0;
  cat.name = 'Main'; cat.slug = 'main'; cat.items[0].name = 'Sandwich'; cat.items[0].price = 50;
  cat.allow_customization = true; cat.applied_modifiers = [mod.ref]; seed.categories = [cat, mod];
  const command: Extract<PlatformCommand, { command: 'tenant.provision' }> = { command: 'tenant.provision', draft_id: draftId,
    draft_revision: 1, credential_revision: 1, data: seed, idempotency_key: crypto.randomUUID(), bot_user_id: 'bot-test',
    liff_confirmed: true, configure_webhook: true, previous_webhook: check.webhook?.endpoint ?? null, store_status: 'open' };
  return command;
}
describe('credential protection', () => {
  it('encrypts credentials, authenticates their context and never exposes them through status', async () => {
    const id = crypto.randomUUID(); const status = await putCredentials(env, actor, id, 0, credentials, crypto.randomUUID());
    expect(JSON.stringify(status)).not.toContain(credentials.line_channel_token);
    const row = (await getCredentialRow(env, id, actor.id))!;
    expect(row.encrypted_json).not.toContain(credentials.pos_password);
    expect(await openCredentials(env, row)).toEqual(credentials);
    const encrypted = await seal('secret', env.ONBOARDING_CREDENTIAL_KEY!, 'tenant-a');
    await expect(unseal(encrypted, env.ONBOARDING_CREDENTIAL_KEY!, 'tenant-b')).rejects.toThrow();
    await expect(putCredentials(env, actor, id, 0, credentials, crypto.randomUUID())).rejects.toThrow('CREDENTIAL_CONFLICT');
  });
  it('hashes POS passwords and verifies signatures against raw bytes', async () => {
    const hash = await hashPassword(credentials.pos_password);
    expect(hash).not.toContain(credentials.pos_password);
    expect(await verifyPassword(credentials.pos_password, hash)).toBe(true);
    expect(await verifyPassword('wrong', hash)).toBe(false);
    const body = '{"events":[]}';
    const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(credentials.line_channel_secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    const signature = btoa(String.fromCharCode(...new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(body)))));
    expect(await verifyLineSignature(body, signature, credentials.line_channel_secret)).toBe(true);
    expect(await verifyLineSignature(body + ' ', signature, credentials.line_channel_secret)).toBe(false);
  });
});
describe('tenant provisioning transaction', () => {
  it('creates a complete inactive tenant and maps modifier references to runtime slugs', async () => {
    const command = await prepared('onboarding-one'); const result = await provision(env, actor, command, crypto.randomUUID());
    expect(result.status).toBe('provisioning');
    const config = await env.DB.prepare('SELECT * FROM tenant_config WHERE tenant_id = ?').bind(command.data.tenant.id).first();
    expect(config).toMatchObject({ is_active: 0, onboarding_status: 'provisioning', liff_id: credentials.liff_id });
    expect(String(config?.line_channel_token)).toMatch(/^enc:v1:/);
    expect(String(config?.default_password)).toMatch(/^pbkdf2:v1:/);
    const catalog = await env.DB.prepare("SELECT applied_modifiers FROM menu_categories WHERE tenant_id = ? AND category_type = 'catalog'").bind(command.data.tenant.id).first();
    expect(JSON.parse(String(catalog?.applied_modifiers))).toEqual(['extra']);
    expect((await tenantReadiness(env, command.data.tenant.id)).blocked).toBe(true);
    expect(await resolveTenantContext(command.data.tenant.id, env)).toBe(null);
    const replay = await provision(env, actor, command, crypto.randomUUID()); expect(replay.id).toBe(result.id);
    await expect(provision(env, actor, { ...command, store_status: 'paused' }, crypto.randomUUID())).rejects.toThrow('IDEMPOTENCY_CONFLICT');
  });
  it('rolls back tenant/config/menu/operation together when an item write fails', async () => {
    const command = await prepared('onboarding-rollback');
    await env.DB.prepare("CREATE TRIGGER fail_menu BEFORE INSERT ON menu_items WHEN NEW.tenant_id = 'onboarding-rollback' BEGIN SELECT RAISE(ABORT, 'test failure'); END").run();
    await expect(provision(env, actor, command, crypto.randomUUID())).rejects.toThrow('PROVISIONING_CONFLICT');
    for (const [table, column] of [['tenants', 'id'], ['tenant_config', 'tenant_id'], ['menu_categories', 'tenant_id'], ['tenant_provisioning_operations', 'tenant_id']])
      expect(await env.DB.prepare(`SELECT * FROM ${table} WHERE ${column} = ?`).bind(command.data.tenant.id).first()).toBeNull();
  });
  it('does not overwrite an existing tenant during an ID race', async () => {
    const a = await prepared('onboarding-race'); const b = await prepared('onboarding-race');
    const results = await Promise.allSettled([provision(env, actor, a, crypto.randomUUID()), provision(env, actor, b, crypto.randomUUID())]);
    expect(results.filter(r => r.status === 'fulfilled')).toHaveLength(1);
    expect(results.filter(r => r.status === 'rejected')).toHaveLength(1);
    const count = await env.DB.prepare('SELECT COUNT(*) AS count FROM menu_items WHERE tenant_id = ?').bind('onboarding-race').first<{ count: number }>();
    expect(count?.count).toBe(2);
  });
  it('recovers a LINE failure without reseeding, then permits hashed POS login', async () => {
    const command = await prepared('onboarding-retry'); const result = await provision(env, actor, command, crypto.randomUUID());
    failLine = true; await advanceOperation(env, result.id, lineFetch);
    expect((await getOperation(env, result.id)).status).toBe('failed');
    expect((await tenantReadiness(env, command.data.tenant.id)).blocked).toBe(true);
    failLine = false; await advanceOperation(env, result.id, lineFetch);
    expect((await getOperation(env, result.id)).status).toBe('succeeded');
    expect((await tenantReadiness(env, command.data.tenant.id)).blocked).toBe(false);
    const ctx = await resolveTenantContext(command.data.tenant.id, env);
    expect(ctx?.lineChannelToken).toBe(credentials.line_channel_token);
    expect(await env.ORDER_STATE.get(`tenant:${command.data.tenant.id}:config_cache`)).toBeNull();
    const response = await handleAuth(new Request(`https://worker.example.com/api/auth?tenant_id=${command.data.tenant.id}`, { method: 'POST',
      body: JSON.stringify({ password: credentials.pos_password }), headers: { 'Content-Type': 'application/json' } }), env, undefined, ctx);
    expect(response.status).toBe(200); const auth = await response.json() as { session_token: string };
    expect(await hasPosSession(new Request('https://worker.example.com', { headers: { Authorization: `Bearer ${auth.session_token}` } }), env, command.data.tenant.id)).toBe(true);
    expect(await hasPosSession(new Request('https://worker.example.com', { headers: { Authorization: `Bearer ${auth.session_token}` } }), env, 'other')).toBe(false);
  });
  it('only accepts signed empty test events for a pending tenant', async () => {
    const command = await prepared('onboarding-webhook'); await provision(env, actor, command, crypto.randomUUID());
    const body = '{"events":[]}'; const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(credentials.line_channel_secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    const signature = btoa(String.fromCharCode(...new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(body)))));
    const request = new Request('https://worker.example.com/webhook/onboarding-webhook', { method: 'POST', body, headers: { 'x-line-signature': signature } });
    expect((await pendingWebhook(request, env, command.data.tenant.id))?.status).toBe(200);
    expect((await pendingWebhook(new Request(request.url, { method: 'POST', body }), env, command.data.tenant.id))?.status).toBe(401);
  });
});
