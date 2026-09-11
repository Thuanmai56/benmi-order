import { WorkerEntrypoint } from 'cloudflare:workers';
import { platformEnvelope, type Actor, type PlatformCommand } from '@blab/tenant-contracts';
import { Env } from '../types/env';
import { OnboardingError } from './errors';
import { checkLine, getCredentialRow, putCredentials, safeCredentials } from './credentials';
import { advanceOperation, getOperation, provision, safeOperation } from './provision';

function authorize(actor: Actor, command: PlatformCommand, env: Env) {
  const permission = command.command === 'credentials.put' || command.command === 'line.check' ? 'credential:manage'
    : command.command === 'tenant.provision' || command.command === 'operation.retry' ? 'tenant:publish' : 'draft:edit';
  let allowed: unknown;
  try { const roles: Record<string, unknown> = JSON.parse(env.ONBOARDING_STAFF_ROLES || '{}'); allowed = roles[actor.email]; }
  catch { throw new OnboardingError(503, 'ROLES_NOT_CONFIGURED'); }
  if (!actor.permissions.includes(permission) || !Array.isArray(allowed) || !allowed.includes(permission))
    throw new OnboardingError(403, 'PERMISSION_DENIED');
}
export async function executeCommand(env: Env, actor: Actor, command: PlatformCommand, requestId: string) {
  authorize(actor, command, env);
  switch (command.command) {
    case 'tenant.available': return { available: !(await env.DB.prepare('SELECT id FROM tenants WHERE id = ?').bind(command.tenant_id).first()) };
    case 'tenant.list': {
      const { results } = await env.DB.prepare(`SELECT t.id, tc.brand_name, tc.is_active, tc.onboarding_status, tc.liff_id,
        tc.created_at FROM tenants t JOIN tenant_config tc ON tc.tenant_id = t.id WHERE (? IS NULL OR t.id > ?)
        AND (instr(lower(tc.brand_name), lower(?)) > 0 OR instr(t.id, ?) > 0) ORDER BY t.id LIMIT 21`)
        .bind(command.cursor, command.cursor, command.query, command.query).all<{ id: string }>();
      return { tenants: results.slice(0, 20), next_cursor: results.length > 20 ? results[19].id : null };
    }
    case 'credentials.get': return safeCredentials(await getCredentialRow(env, command.draft_id, actor.id));
    case 'credentials.put': return putCredentials(env, actor, command.draft_id, command.expected_revision, command.credentials, requestId);
    case 'line.check': return checkLine(env, actor, command.draft_id, command.credential_revision);
    case 'tenant.provision': return provision(env, actor, command, requestId);
    case 'operation.get': return safeOperation(env, await getOperation(env, command.operation_id, actor.id));
    case 'operation.retry': {
      const row = await getOperation(env, command.operation_id, actor.id);
      if (row.status !== 'succeeded') await advanceOperation(env, row.id);
      return safeOperation(env, await getOperation(env, row.id, actor.id));
    }
  }
}
/** Named service-binding entrypoint. The public fetch handler does not route to this class. */
export class TenantAdminService extends WorkerEntrypoint<Env> {
  async fetch(request: Request): Promise<Response> {
    try {
      if (request.method !== 'POST' || !request.body) throw new OnboardingError(405, 'METHOD_NOT_ALLOWED');
      const reader = request.body.getReader(); let size = 0; let text = ''; const decoder = new TextDecoder();
      try { while (true) { const part = await reader.read(); if (part.done) break; size += part.value.byteLength;
        if (size > 1_000_000) { await reader.cancel(); throw new OnboardingError(413, 'PAYLOAD_TOO_LARGE'); }
        text += decoder.decode(part.value, { stream: true });
      } } finally { reader.releaseLock(); }
      const input = platformEnvelope.parse(JSON.parse(text + decoder.decode()));
      const result = await executeCommand(this.env, input.actor, input.command, input.request_id);
      if (input.command.command === 'tenant.provision' && result && 'id' in result && typeof result.id === 'string') {
        this.ctx.waitUntil(advanceOperation(this.env, result.id).catch(() => console.error('ONBOARDING_RECOVERY_PENDING')));
      }
      return Response.json(result, { headers: { 'Cache-Control': 'no-store' } });
    } catch (error) {
      const known = error instanceof OnboardingError;
      return Response.json({ code: known ? error.code : 'ONBOARDING_REQUEST_FAILED' }, { status: known ? error.status : 500, headers: { 'Cache-Control': 'no-store' } });
    }
  }
}
