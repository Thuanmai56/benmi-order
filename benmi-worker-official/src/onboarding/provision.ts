import { commandSchema, validateForPublish, type Actor, type OperationStatus, type PlatformCommand } from '@blab/tenant-contracts';
import { Env } from '../types/env';
import { credentialKey, getCredentialRow, openCredentials } from './credentials';
import { digest, hashPassword, seal } from './crypto';
import { OnboardingError } from './errors';
import { connectLine, type LineFetch } from './line-api';
import { invalidateBootstrapCache } from '../modules/bootstrap';
import { invalidateTenantCache } from '../modules/tenant';
import { invalidateMarketplaceCache } from '../modules/marketplace';

type ProvisionCommand = Extract<PlatformCommand, { command: 'tenant.provision' }>;
export type OperationRow = { id: string; draft_id: string; idempotency_key: string; input_hash: string; actor_id: string; tenant_id: string;
  credential_revision: number; snapshot_json: string; status: OperationStatus['status']; step: OperationStatus['step']; error_code: string | null; updated_at: string };
function baseUrl(value: string | undefined): string {
  if (!value) throw new OnboardingError(503, 'ONBOARDING_URLS_NOT_CONFIGURED');
  const url = new URL(value);
  if (url.protocol !== 'https:' && !(url.protocol === 'http:' && ['127.0.0.1', 'localhost'].includes(url.hostname)))
    throw new OnboardingError(503, 'ONBOARDING_URLS_NOT_CONFIGURED');
  if (url.username || url.password || url.search || url.hash || url.pathname !== '/') throw new OnboardingError(503, 'ONBOARDING_URLS_NOT_CONFIGURED');
  return url.origin;
}
export function linksFor(env: Env, tenantId: string, liffId: string): OperationStatus['links'] {
  const customer = baseUrl(env.ONBOARDING_CUSTOMER_BASE_URL);
  const platform = baseUrl(env.ONBOARDING_PLATFORM_BASE_URL);
  return { menu: `${customer}/?tenant_id=${encodeURIComponent(tenantId)}`, pos: `${customer}/orders.html?tenant_id=${encodeURIComponent(tenantId)}`,
    webhook: `${platform}/webhook/${encodeURIComponent(tenantId)}`, liff: `https://liff.line.me/${liffId}` };
}
export async function getOperation(env: Env, id: string, actorId?: string): Promise<OperationRow> {
  const row = await env.DB.prepare('SELECT * FROM tenant_provisioning_operations WHERE id = ? AND (? IS NULL OR actor_id = ?)')
    .bind(id, actorId ?? null, actorId ?? null).first<OperationRow>();
  if (!row) throw new OnboardingError(404, 'OPERATION_NOT_FOUND');
  return row;
}
export async function safeOperation(env: Env, row: OperationRow): Promise<OperationStatus> {
  const credentials = await getCredentialRow(env, row.draft_id, row.actor_id, row.credential_revision);
  if (!credentials) throw new OnboardingError(500, 'CREDENTIALS_MISSING');
  return { id: row.id, tenant_id: row.tenant_id, status: row.status, step: row.step, error_code: row.error_code,
    updated_at: row.updated_at, links: linksFor(env, row.tenant_id, credentials.liff_id) };
}
export async function provision(env: Env, actor: Actor, command: ProvisionCommand, requestId: string): Promise<OperationStatus> {
  const inputHash = await digest(JSON.stringify(command));
  const previous = await env.DB.prepare('SELECT * FROM tenant_provisioning_operations WHERE idempotency_key = ? OR draft_id = ?')
    .bind(command.idempotency_key, command.draft_id).first<OperationRow>();
  if (previous) {
    if (previous.actor_id !== actor.id || previous.input_hash !== inputHash) throw new OnboardingError(409, 'IDEMPOTENCY_CONFLICT');
    return safeOperation(env, previous);
  }
  if (env.ONBOARDING_ENABLED !== 'true') throw new OnboardingError(503, 'ONBOARDING_DISABLED');
  const issues = validateForPublish(command.data);
  if (issues.length) throw new OnboardingError(422, 'MENU_NOT_READY');
  const row = await getCredentialRow(env, command.draft_id, actor.id);
  if (!row || row.revision !== command.credential_revision || row.bot_user_id !== command.bot_user_id || !row.checked_at
    || Date.parse(row.checked_at) < Date.now() - 30 * 60 * 1000) throw new OnboardingError(409, 'LINE_CHECK_REQUIRED');
  if (row.webhook_endpoint !== command.previous_webhook) throw new OnboardingError(409, 'LINE_ENDPOINT_CHANGED');
  const credentials = await openCredentials(env, row);
  const { data } = command; const tenant = data.tenant;
  linksFor(env, tenant.id, credentials.liff_id);
  const id = crypto.randomUUID(); const now = new Date().toISOString();
  const key = credentialKey(env);
  const [token, secret, password] = await Promise.all([
    seal(credentials.line_channel_token, key, `${tenant.id}:line_channel_token`),
    seal(credentials.line_channel_secret, key, `${tenant.id}:line_channel_secret`),
    hashPassword(credentials.pos_password),
  ]);
  const statements: D1PreparedStatement[] = [
    env.DB.prepare(`INSERT INTO tenant_provisioning_operations
      (id, draft_id, idempotency_key, input_hash, actor_id, tenant_id, credential_revision, credential_guard, snapshot_json, status, step, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, (SELECT COUNT(*) FROM onboarding_credentials WHERE draft_id = ? AND actor_id = ? AND revision = ?
        AND bot_user_id = ? AND checked_at >= ? AND revision = (SELECT MAX(revision) FROM onboarding_credentials WHERE draft_id = ?)), ?, 'provisioning', 'cache', ?, ?)`)
      .bind(id, command.draft_id, command.idempotency_key, inputHash, actor.id, tenant.id, row.revision, command.draft_id, actor.id,
        row.revision, command.bot_user_id, new Date(Date.now() - 30 * 60 * 1000).toISOString(), command.draft_id, JSON.stringify(command), now, now),
    env.DB.prepare('INSERT INTO tenants (id, name) VALUES (?, ?)').bind(tenant.id, tenant.brand_name),
    env.DB.prepare(`INSERT INTO tenant_config (tenant_id, brand_name, brand_color, store_address, operating_hours, delivery_policy,
      locale, allow_scheduled_pickup, allow_dine_in, features, default_password, line_channel_token, line_channel_secret,
      liff_id, liff_url, is_active, store_status, onboarding_status, credential_encoding, is_marketplace_visible)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 'paused', 'provisioning', 'enc:v1', 0)`)
      .bind(tenant.id, tenant.brand_name, tenant.brand_color, tenant.store_address, JSON.stringify(tenant.operating_hours), tenant.delivery_policy,
        tenant.locale, Number(tenant.allow_scheduled_pickup), Number(tenant.allow_dine_in), JSON.stringify(tenant.allow_dine_in ? ['dine_in'] : []),
        password, token, secret, credentials.liff_id, `https://liff.line.me/${credentials.liff_id}`),
  ];
  const modifierSlugs = new Map(data.categories.filter(c => c.category_type === 'modifier').map(c => [c.ref, c.slug]));
  for (const [index, category] of data.categories.entries()) {
    const categoryId = `${id}:c:${index}`;
    const catalog = category.category_type === 'catalog';
    statements.push(env.DB.prepare(`INSERT INTO menu_categories (id, tenant_id, name, slug, category_type, selection_type,
      is_required, min_selection, max_selection, sort_order, allow_customization, applied_modifiers)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .bind(categoryId, tenant.id, category.name, category.slug, category.category_type, catalog ? 'single' : category.selection_type,
        catalog ? 0 : Number(category.is_required), catalog ? 0 : category.min_selection, catalog ? 1 : category.max_selection,
        index, catalog ? Number(category.allow_customization) : 0,
        JSON.stringify(catalog ? (category.applied_modifiers ?? []).map(ref => modifierSlugs.get(ref)) : [])));
    for (const [itemIndex, item] of category.items.entries()) statements.push(env.DB.prepare(`INSERT INTO menu_items
      (id, tenant_id, category_id, name, price, description, badge_text, is_recommended, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .bind(`${id}:c:${index}:i:${itemIndex}`, tenant.id, categoryId, item.name, item.price, item.description, item.badge_text, Number(item.is_recommended), itemIndex));
  }
  statements.push(
    env.DB.prepare('INSERT INTO tenant_provisioning_outbox (operation_id, next_attempt_at) VALUES (?, ?)').bind(id, now),
    env.DB.prepare('INSERT INTO tenant_admin_audit (id, actor_id, action, draft_id, tenant_id, operation_id, request_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
      .bind(crypto.randomUUID(), actor.id, 'tenant.provisioned', command.draft_id, tenant.id, id, requestId, now),
  );
  try { await env.DB.batch(statements); }
  catch {
    const replay = await env.DB.prepare('SELECT * FROM tenant_provisioning_operations WHERE idempotency_key = ? OR draft_id = ?')
      .bind(command.idempotency_key, command.draft_id).first<OperationRow>();
    if (replay?.input_hash === inputHash && replay.actor_id === actor.id) return safeOperation(env, replay);
    if (await env.DB.prepare('SELECT id FROM tenants WHERE id = ?').bind(tenant.id).first()) throw new OnboardingError(409, 'TENANT_EXISTS');
    throw new OnboardingError(409, 'PROVISIONING_CONFLICT');
  }
  return safeOperation(env, await getOperation(env, id));
}

async function clearCaches(env: Env, tenantId: string) {
  await invalidateTenantCache(tenantId, env, true);
  await invalidateBootstrapCache(tenantId, env, true);
  await invalidateMarketplaceCache(env, true);
}
/** Durable outbox retries survive a lost HTTP response; every step is repeatable. */
export async function advanceOperation(env: Env, id: string, transport?: LineFetch): Promise<void> {
  const now = new Date().toISOString(); const lease = crypto.randomUUID();
  const claim = await env.DB.prepare(`UPDATE tenant_provisioning_operations SET lease_id = ?, lease_until = ?, status = 'provisioning', error_code = NULL
    WHERE id = ? AND status != 'succeeded' AND (lease_until IS NULL OR lease_until < ?) RETURNING *`)
    .bind(lease, new Date(Date.now() + 180000).toISOString(), id, now).first<OperationRow>();
  if (!claim) return;
  try {
    const parsed = commandSchema.parse(JSON.parse(claim.snapshot_json));
    if (parsed.command !== 'tenant.provision') throw new Error('Invalid snapshot');
    const row = await getCredentialRow(env, claim.draft_id, claim.actor_id, claim.credential_revision);
    if (!row) throw new Error('Missing credentials');
    const credentials = await openCredentials(env, row);
    if (claim.step === 'cache') { await clearCaches(env, claim.tenant_id); }
    if (claim.step === 'cache' || claim.step === 'line') {
      await env.DB.prepare("UPDATE tenant_provisioning_operations SET step = 'line', updated_at = ? WHERE id = ? AND lease_id = ?")
        .bind(new Date().toISOString(), id, lease).run();
      const linked = await connectLine(credentials.line_channel_token, linksFor(env, claim.tenant_id, credentials.liff_id).webhook,
        parsed.previous_webhook, parsed.configure_webhook, transport);
      if (linked.bot.user_id !== parsed.bot_user_id) throw new OnboardingError(409, 'LINE_BOT_CHANGED');
      await env.DB.prepare("UPDATE tenant_provisioning_operations SET step = 'activate', updated_at = ? WHERE id = ? AND lease_id = ?")
        .bind(new Date().toISOString(), id, lease).run();
    }
    await clearCaches(env, claim.tenant_id);
    await env.DB.batch([
      env.DB.prepare(`UPDATE tenant_config SET onboarding_status = 'ready', is_active = 1, store_status = ?, updated_at = datetime('now')
        WHERE tenant_id = ? AND EXISTS(SELECT 1 FROM tenant_provisioning_operations WHERE id = ? AND lease_id = ?)`)
        .bind(parsed.store_status, claim.tenant_id, id, lease),
      env.DB.prepare("UPDATE tenant_provisioning_operations SET status = 'succeeded', step = 'complete', lease_id = NULL, lease_until = NULL, updated_at = ? WHERE id = ? AND lease_id = ?")
        .bind(new Date().toISOString(), id, lease),
      env.DB.prepare(`UPDATE tenant_provisioning_outbox SET completed_at = ? WHERE operation_id = ?
        AND EXISTS(SELECT 1 FROM tenant_provisioning_operations WHERE id = ? AND status = 'succeeded')`)
        .bind(new Date().toISOString(), id, id),
    ]);
    // The authoritative readiness gate prevents pending data from entering public caches.
    await clearCaches(env, claim.tenant_id);
  } catch (error) {
    const code = error instanceof OnboardingError ? error.code : 'PROVISIONING_STEP_FAILED';
    await env.DB.batch([
      env.DB.prepare("UPDATE tenant_provisioning_operations SET status = 'failed', error_code = ?, lease_id = NULL, lease_until = NULL, updated_at = ? WHERE id = ? AND lease_id = ?")
        .bind(code, new Date().toISOString(), id, lease),
      env.DB.prepare(`UPDATE tenant_provisioning_outbox SET attempts = attempts + 1, next_attempt_at = ?
        WHERE operation_id = ? AND completed_at IS NULL`)
        .bind(new Date(Date.now() + 5 * 60000).toISOString(), id),
    ]);
  }
}
export async function drainOutbox(env: Env): Promise<void> {
  if (env.ONBOARDING_ENABLED !== 'true') return;
  const { results } = await env.DB.prepare('SELECT operation_id FROM tenant_provisioning_outbox WHERE completed_at IS NULL AND next_attempt_at <= ? AND attempts < 12 LIMIT 10')
    .bind(new Date().toISOString()).all<{ operation_id: string }>();
  for (const job of results) await advanceOperation(env, job.operation_id);
}
