import { credentialSchema, type Actor, type Credentials, type CredentialStatus } from '@blab/tenant-contracts';
import { Env } from '../types/env';
import { seal, unseal } from './crypto';
import { OnboardingError } from './errors';
import { inspectLine, type LineFetch } from './line-api';

export type CredentialRow = { draft_id: string; actor_id: string; revision: number; encrypted_json: string; liff_id: string;
  checked_at: string | null; bot_user_id: string | null; bot_display_name: string | null; webhook_endpoint: string | null; webhook_active: number };
export function credentialKey(env: Env): string {
  if (!env.ONBOARDING_CREDENTIAL_KEY) throw new OnboardingError(503, 'CREDENTIAL_KEY_NOT_CONFIGURED');
  return env.ONBOARDING_CREDENTIAL_KEY;
}
export function safeCredentials(row: CredentialRow | null): CredentialStatus {
  return { revision: row?.revision ?? 0, liff_id: row?.liff_id ?? '', configured: !!row, checked_at: row?.checked_at ?? null,
    bot: row?.bot_user_id ? { user_id: row.bot_user_id, display_name: row.bot_display_name ?? '' } : null,
    webhook: row?.checked_at ? { endpoint: row.webhook_endpoint, active: Boolean(row.webhook_active) } : null };
}
export async function getCredentialRow(env: Env, draftId: string, actorId: string, revision?: number): Promise<CredentialRow | null> {
  return env.DB.prepare(`SELECT * FROM onboarding_credentials WHERE draft_id = ? AND actor_id = ?
    AND (? IS NULL OR revision = ?) ORDER BY revision DESC LIMIT 1`).bind(draftId, actorId, revision ?? null, revision ?? null).first<CredentialRow>();
}
export async function openCredentials(env: Env, row: CredentialRow): Promise<Credentials> {
  return credentialSchema.parse(JSON.parse(await unseal(row.encrypted_json, credentialKey(env), `${row.actor_id}:${row.draft_id}:${row.revision}`)));
}
export async function putCredentials(env: Env, actor: Actor, draftId: string, expectedRevision: number, credentials: Credentials, requestId: string): Promise<CredentialStatus> {
  const old = await getCredentialRow(env, draftId, actor.id);
  if ((old?.revision ?? 0) !== expectedRevision) throw new OnboardingError(409, 'CREDENTIAL_CONFLICT');
  if (await env.DB.prepare('SELECT id FROM tenant_provisioning_operations WHERE draft_id = ?').bind(draftId).first())
    throw new OnboardingError(409, 'CREDENTIALS_LOCKED');
  const revision = expectedRevision + 1; const now = new Date().toISOString();
  const ciphertext = await seal(JSON.stringify(credentials), credentialKey(env), `${actor.id}:${draftId}:${revision}`);
  try {
    const [write] = await env.DB.batch([
      env.DB.prepare(`INSERT INTO onboarding_credentials (draft_id, actor_id, revision, encrypted_json, liff_id, created_at)
        SELECT ?, ?, ?, ?, ?, ? WHERE NOT EXISTS(SELECT 1 FROM tenant_provisioning_operations WHERE draft_id = ?)
        AND (SELECT COALESCE(MAX(revision), 0) FROM onboarding_credentials WHERE draft_id = ?) = ? RETURNING revision`)
        .bind(draftId, actor.id, revision, ciphertext, credentials.liff_id, now, draftId, draftId, expectedRevision),
      env.DB.prepare('INSERT INTO tenant_admin_audit (id, actor_id, action, draft_id, request_id, created_at) SELECT ?, ?, ?, ?, ?, ? WHERE changes() = 1')
        .bind(crypto.randomUUID(), actor.id, 'credentials.replaced', draftId, requestId, now),
    ]);
    if (!write.results.length) throw new OnboardingError(409, 'CREDENTIAL_CONFLICT');
  } catch { throw new OnboardingError(409, 'CREDENTIAL_CONFLICT'); }
  return safeCredentials(await getCredentialRow(env, draftId, actor.id));
}
export async function checkLine(env: Env, actor: Actor, draftId: string, revision: number, transport?: LineFetch): Promise<CredentialStatus> {
  const row = await getCredentialRow(env, draftId, actor.id);
  if (!row || row.revision !== revision) throw new OnboardingError(409, 'CREDENTIAL_CONFLICT');
  const credentials = await openCredentials(env, row);
  const result = await inspectLine(credentials.line_channel_token, transport);
  await env.DB.prepare(`UPDATE onboarding_credentials SET checked_at = ?, bot_user_id = ?, bot_display_name = ?, webhook_endpoint = ?, webhook_active = ?
    WHERE draft_id = ? AND actor_id = ? AND revision = ?`)
    .bind(new Date().toISOString(), result.bot.user_id, result.bot.display_name, result.webhook.endpoint, Number(result.webhook.active), draftId, actor.id, revision).run();
  return safeCredentials(await getCredentialRow(env, draftId, actor.id, revision));
}
