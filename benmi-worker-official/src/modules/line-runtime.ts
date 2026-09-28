import type { Env } from '../types/env';
import type { TenantContext } from '../types/tenant';

export class LineRuntimeError extends Error {
  constructor(readonly code: string, readonly status = 503) { super(code); }
}
export type LineProjection = {
  tenant_id: string; environment: string; connection_id: string; revision: number; bot_user_id: string;
  token_encrypted_value: string; token_key_version: string;
  secret_encrypted_value: string; secret_key_version: string;
  liff_id: string | null; liff_url: string | null; is_active: number;
};
export function lineRuntimeEnabled(env: Env, tenantId: string): boolean {
  if ((env.LINE_RUNTIME_ENABLED as string) === 'true') return true;
  try {
    const tenants: unknown = JSON.parse(env.LINE_RUNTIME_TENANTS || '[]');
    return Array.isArray(tenants) && tenants.every(t => typeof t === 'string') && tenants.includes(tenantId);
  } catch { return false; }
}
function decode(value: string): Uint8Array<ArrayBuffer> {
  return Uint8Array.from(atob(value), c => c.charCodeAt(0));
}
export async function decryptRuntimeSecret(env: Env, row: LineProjection, kind: 'messaging_token' | 'messaging_secret'): Promise<string> {
  try {
    if (row.environment !== env.LINE_RUNTIME_ENVIRONMENT) throw new Error();
    const prefix = kind === 'messaging_token' ? 'token' : 'secret';
    const ring = JSON.parse(env.LINE_SECRET_KEYS || '{}');
    const version = row[`${prefix}_key_version`];
    const material: unknown = Object.getOwnPropertyDescriptor(ring, version)?.value;
    if (typeof material !== 'string' || decode(material).length !== 32) throw new Error();
    const [format, iv, ciphertext, extra] = row[`${prefix}_encrypted_value`].split('.');
    if (format !== 'v1' || !iv || !ciphertext || extra || decode(iv).length !== 12) throw new Error();
    const key = await crypto.subtle.importKey('raw', decode(material), 'AES-GCM', false, ['decrypt']);
    const aad = new TextEncoder().encode(JSON.stringify(['blab-line-v1', row.environment,
      row.tenant_id, row.connection_id, row.revision, kind]));
    const result = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: decode(iv), additionalData: aad }, key, decode(ciphertext));
    const value = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(result);
    if (!value) throw new Error();
    return value;
  } catch { throw new LineRuntimeError('LINE_RUNTIME_CREDENTIALS_UNAVAILABLE'); }
}

// Never use KV for the applied revision or cache decrypted credentials. An error
// reading a managed connection must not downgrade it to legacy credentials.
export async function readLineProjection(env: Env, tenantId: string): Promise<LineProjection | null> {
  if (!lineRuntimeEnabled(env, tenantId)) return null;
  try {
    const row = await env.DB.prepare(`SELECT r.*,c.is_active FROM tenant_line_runtime r
      JOIN tenant_config c ON c.tenant_id=r.tenant_id WHERE r.tenant_id=?`).bind(tenantId).first<LineProjection>();
    if (row && (row.environment !== env.LINE_RUNTIME_ENVIRONMENT || !row.bot_user_id)) throw new Error();
    return row;
  } catch { throw new LineRuntimeError('LINE_RUNTIME_UNAVAILABLE'); }
}
export async function applyLineProjection(env: Env, context: TenantContext, row: LineProjection): Promise<TenantContext> {
  const [token, secret] = await Promise.all([
    decryptRuntimeSecret(env, row, 'messaging_token'), decryptRuntimeSecret(env, row, 'messaging_secret'),
  ]);
  return { ...context, lineChannelToken: token, lineChannelSecret: secret,
    liffId: row.liff_id || '', liffUrl: row.liff_url || '',
    lineRuntime: { connectionId: row.connection_id, environment: row.environment,
      revision: row.revision, botUserId: row.bot_user_id } };
}

const MAX_WEBHOOK_BYTES = 1024 * 1024;
async function readBody(request: Request): Promise<Uint8Array<ArrayBuffer>> {
  if (Number(request.headers.get('content-length')) > MAX_WEBHOOK_BYTES) throw new LineRuntimeError('LINE_WEBHOOK_TOO_LARGE', 413);
  const reader = request.body?.getReader();
  if (!reader) throw new LineRuntimeError('LINE_WEBHOOK_INVALID_BODY', 400);
  const parts: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > MAX_WEBHOOK_BYTES) { await reader.cancel(); throw new LineRuntimeError('LINE_WEBHOOK_TOO_LARGE', 413); }
      parts.push(value);
    }
  } finally { reader.releaseLock(); }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const part of parts) { bytes.set(part, offset); offset += part.length; }
  return bytes;
}
export async function readVerifiedLineWebhook(request: Request, env: Env,
  context?: Pick<TenantContext, 'tenantId' | 'lineChannelSecret' | 'lineRuntime'> | null) {
  const raw = await readBody(request);
  const secret = context?.lineChannelSecret;
  if (context?.lineRuntime && !secret) throw new LineRuntimeError('LINE_RUNTIME_CREDENTIALS_UNAVAILABLE');
  if (secret) {
    const signature = request.headers.get('x-line-signature');
    let valid = false;
    if (signature && /^[A-Za-z0-9+/]{43}=$/.test(signature)) {
      const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']);
      valid = await crypto.subtle.verify('HMAC', key, decode(signature), raw);
    }
    if (!valid) throw new LineRuntimeError('LINE_WEBHOOK_SIGNATURE_INVALID', 401);
  }
  // Legacy tenants without a secret retain their previous behavior until migrated.
  let body: { destination?: string; events: unknown[] };
  try {
    const parsed = JSON.parse(new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(raw));
    if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.events)) throw new Error();
    body = parsed;
  } catch { throw new LineRuntimeError('LINE_WEBHOOK_INVALID_BODY', 400); }
  const managed = context?.lineRuntime;
  if (managed) {
    if (body.destination !== managed.botUserId) throw new LineRuntimeError('LINE_WEBHOOK_DESTINATION_MISMATCH', 403);
    // The revision predicate prevents an in-flight request proving a newer secret.
    const receipt = await env.DB.prepare(`UPDATE tenant_line_runtime SET webhook_verified_at=?,webhook_verified_revision=?
      WHERE tenant_id=? AND environment=? AND connection_id=? AND revision=? AND bot_user_id=?`)
      .bind(new Date().toISOString(), managed.revision, context.tenantId, managed.environment,
        managed.connectionId, managed.revision, managed.botUserId).run();
    if (!receipt.meta.changes) throw new LineRuntimeError('LINE_WEBHOOK_REVISION_CHANGED', 409);
  }
  return body;
}

// Only a signed LINE verification event (events:[]) is accepted here. A probe
// proves candidate secrets before changing an active bot's configuration.
export async function handleLineWebhookProbe(request: Request, env: Env, tenantId: string, probeId: string): Promise<Response> {
  if (!lineRuntimeEnabled(env, tenantId)) return Response.json({ error: 'LINE_RUNTIME_DISABLED' }, { status: 404 });
  try {
    const timestamp = new Date().toISOString();
    const probe = await env.DB.prepare(`SELECT p.* FROM tenant_line_webhook_probes p JOIN tenant_config c ON c.tenant_id=p.tenant_id
      WHERE p.id=? AND p.tenant_id=? AND p.environment=? AND p.expires_at>? AND c.is_active=1`)
      .bind(probeId, tenantId, env.LINE_RUNTIME_ENVIRONMENT || '', timestamp).first<LineProjection>();
    if (!probe) return Response.json({ error: 'LINE_PROBE_NOT_FOUND' }, { status: 404 });
    const secret = await decryptRuntimeSecret(env, probe, 'messaging_secret');
    // Use the same raw-body verification path without writing an active-revision receipt.
    const body = await readVerifiedLineWebhook(request, env, { tenantId, lineChannelSecret: secret });
    if (body.destination !== probe.bot_user_id || body.events.length !== 0) return Response.json({ error: 'LINE_PROBE_INVALID_EVENT' }, { status: 403 });
    const result = await env.DB.prepare(`UPDATE tenant_line_webhook_probes SET verified_at=? WHERE id=? AND tenant_id=? AND expires_at>?`)
      .bind(timestamp, probeId, tenantId, timestamp).run();
    if (!result.meta.changes) return Response.json({ error: 'LINE_PROBE_EXPIRED' }, { status: 409 });
    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: error instanceof LineRuntimeError ? error.code : 'LINE_PROBE_UNAVAILABLE' },
      { status: error instanceof LineRuntimeError ? error.status : 503 });
  }
}
