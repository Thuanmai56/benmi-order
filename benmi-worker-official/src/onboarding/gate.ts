import { Env } from '../types/env';
import { unseal, verifyLineSignature } from './crypto';
import { credentialKey } from './credentials';
import { json } from '../utils/http';

/** Read D1 before public caches. Turning publication off does not disable this gate. */
export async function tenantReadiness(env: Env, tenantId: string) {
  const row = await env.DB.prepare('SELECT * FROM tenant_config WHERE tenant_id = ?').bind(tenantId)
    .first<{ is_active: number; onboarding_status?: string | null; credential_encoding?: string | null; line_channel_secret?: string }>();
  return { row, blocked: !!row?.onboarding_status && (row.onboarding_status !== 'ready' || row.is_active !== 1) };
}
export async function pendingWebhook(request: Request, env: Env, tenantId: string): Promise<Response | null> {
  const { row, blocked } = await tenantReadiness(env, tenantId);
  if (!blocked) return null;
  if (row?.onboarding_status !== 'provisioning' || !row.line_channel_secret || row.credential_encoding !== 'enc:v1')
    return json({ error: 'Tenant unavailable' }, 404);
  if (Number(request.headers.get('Content-Length')) > 65536) return json({ error: 'Payload too large' }, 413);
  if (!request.body) return json({ error: 'Invalid signature' }, 401);
  const reader = request.body.getReader(); const decoder = new TextDecoder(); let raw = ''; let size = 0;
  try { while (true) { const { value, done } = await reader.read(); if (done) break; size += value.byteLength;
    if (size > 65536) { await reader.cancel(); return json({ error: 'Payload too large' }, 413); }
    raw += decoder.decode(value, { stream: true });
  } raw += decoder.decode(); } finally { reader.releaseLock(); }
  const secret = await unseal(row.line_channel_secret, credentialKey(env), `${tenantId}:line_channel_secret`);
  if (!await verifyLineSignature(raw, request.headers.get('x-line-signature'), secret)) return json({ error: 'Invalid signature' }, 401);
  try { const body = JSON.parse(raw);
    if (Array.isArray(body.events) && body.events.length === 0) return json({ ok: true });
  } catch { return json({ error: 'Invalid body' }, 400); }
  return json({ error: 'Tenant not ready' }, 409);
}
