import type { Env } from '../../types/env';
import { json } from '../../utils/http';
import { LinePayError, type LinePayBindings, type LinePayTenantConfig } from './types';

const TENANT_ID = /^[a-zA-Z0-9_-]{1,128}$/;

/** Payment routes must never inherit the legacy default tenant. */
export function resolveLinePayTenantId(request: Request): string {
  const query = new URL(request.url).searchParams.getAll('tenant_id');
  const header = request.headers.get('X-Tenant-ID');
  if (query.length > 1 || (query.length === 1 && header !== null && query[0] !== header)) {
    throw new LinePayError('LINE_PAY_TENANT_INVALID', 400);
  }
  const tenantId = query[0] ?? header;
  if (tenantId === undefined || tenantId === null) throw new LinePayError('LINE_PAY_TENANT_REQUIRED', 400);
  if (!TENANT_ID.test(tenantId)) throw new LinePayError('LINE_PAY_TENANT_INVALID', 400);
  return tenantId;
}

export function assertLinePaySandboxRuntime(env: LinePayBindings): void {
  if (env.LINE_PAY_DEPLOYMENT_ENV !== 'dev' && env.LINE_PAY_DEPLOYMENT_ENV !== 'test') {
    throw new LinePayError('LINE_PAY_SANDBOX_ONLY', 503);
  }
  if (env.LINE_PAY_ENABLED !== 'true') throw new LinePayError('LINE_PAY_DISABLED', 503);
}

/** D1 only: stale KV and publicly editable feature arrays cannot enable payments. */
export async function loadLinePayTenantConfig(env: Env, tenantId: string): Promise<LinePayTenantConfig> {
  if (!TENANT_ID.test(tenantId)) throw new LinePayError('LINE_PAY_TENANT_INVALID', 400);
  const row = await env.DB.prepare(`SELECT tc.tenant_id, p.enabled, p.environment, p.currency,
      p.line_login_channel_id, p.current_credential_version
    FROM tenant_config tc
    LEFT JOIN tenant_lifecycle lifecycle ON lifecycle.tenant_id = tc.tenant_id
    LEFT JOIN linepay_merchant_configs p ON p.tenant_id = tc.tenant_id
    WHERE tc.tenant_id = ? AND tc.is_active = 1
      AND (lifecycle.state IS NULL OR lifecycle.state = 'active')`)
    .bind(tenantId).first<{
      tenant_id: string; enabled: number | null; environment: string | null; currency: string | null;
      line_login_channel_id: string | null; current_credential_version: number | null;
    }>();
  if (!row) throw new LinePayError('LINE_PAY_TENANT_NOT_FOUND', 404);
  if ((row.environment !== null && row.environment !== 'sandbox') || (row.currency !== null && row.currency !== 'TWD')) {
    throw new LinePayError('LINE_PAY_NOT_CONFIGURED', 503);
  }
  return {
    tenantId: row.tenant_id,
    enabled: row.enabled === 1,
    environment: 'sandbox',
    currency: 'TWD',
    lineLoginChannelId: row.line_login_channel_id,
    credentialVersion: row.current_credential_version,
  };
}

/** Future routes must catch errors here rather than returning the Worker's fatal stack. */
export function linePayErrorResponse(error: unknown): Response {
  const known = error instanceof LinePayError;
  return json({ error: known ? error.code : 'LINE_PAY_UNAVAILABLE' }, known ? error.status : 503,
    { 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' });
}
