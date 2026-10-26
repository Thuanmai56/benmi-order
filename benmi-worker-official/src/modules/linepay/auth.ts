import type { Env } from '../../types/env';
import { isOrderId } from '../order-identity';
import { assertLinePaySandboxRuntime, loadLinePayTenantConfig } from './config';
import { linePaySecretsEqual, readLinePaySecret } from './crypto';
import { LinePayError, type LinePayBindings, type LinePayCustomer, type LinePayOwnedOrder } from './types';

/** Dedicated key only. Neither the legacy admin fallback nor a store PIN is accepted. */
export async function requireLinePayAdmin(request: Request, env: LinePayBindings): Promise<void> {
  const expected = await readLinePaySecret(env.LINE_PAY_ADMIN_KEY);
  if (expected.length < 32 || expected.length > 4096) throw new LinePayError('LINE_PAY_SECRET_UNAVAILABLE', 503);
  const supplied = request.headers.get('X-LinePay-Admin-Key');
  if (!supplied || supplied.length > 4096 || !await linePaySecretsEqual(expected, supplied)) {
    throw new LinePayError('LINE_PAY_UNAUTHORIZED', 401);
  }
}

function object(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

async function lineIdentityJson(url: string, headers: Record<string, string>, fetcher: typeof fetch): Promise<Record<string, unknown>> {
  try {
    const response = await fetcher(url, { headers, signal: AbortSignal.timeout(5000), redirect: 'error' });
    if (!response.ok) {
      await response.body?.cancel();
      throw new LinePayError(response.status === 400 || response.status === 401 ? 'LINE_PAY_UNAUTHORIZED' : 'LINE_PAY_IDENTITY_UNAVAILABLE',
        response.status === 400 || response.status === 401 ? 401 : 503);
    }
    const reader = response.body?.getReader();
    if (!reader) throw new Error();
    const decoder = new TextDecoder();
    let text = '', size = 0;
    try {
      while (true) {
        const chunk = await reader.read();
        if (chunk.done) break;
        size += chunk.value.byteLength;
        if (size > 16384) { await reader.cancel(); throw new Error(); }
        text += decoder.decode(chunk.value, { stream: true });
      }
      text += decoder.decode();
    } finally { reader.releaseLock(); }
    const value: unknown = JSON.parse(text);
    if (!object(value)) throw new Error();
    return value;
  } catch (error) {
    // Never include LINE's response, URL/access token, or original exception in an API error.
    if (error instanceof LinePayError) throw error;
    throw new LinePayError('LINE_PAY_IDENTITY_UNAVAILABLE', 503);
  }
}

/** Verify the access token AND its channel before fetching the server-authenticated profile. */
export async function requireLinePayCustomer(request: Request, env: Env, tenantId: string,
  fetcher: typeof fetch = fetch): Promise<LinePayCustomer> {
  assertLinePaySandboxRuntime(env);
  const config = await loadLinePayTenantConfig(env, tenantId);
  if (!config.enabled) throw new LinePayError('LINE_PAY_DISABLED', 503);
  if (!config.lineLoginChannelId || config.credentialVersion === null) throw new LinePayError('LINE_PAY_NOT_CONFIGURED', 503);
  const match = request.headers.get('Authorization')?.match(/^Bearer ([^\s,]{1,8192})$/i);
  if (!match) throw new LinePayError('LINE_PAY_UNAUTHORIZED', 401);
  const token = match[1];
  const verify = new URL('https://api.line.me/oauth2/v2.1/verify');
  verify.searchParams.set('access_token', token);
  const validity = await lineIdentityJson(verify.href, {}, fetcher);
  if (validity.client_id !== config.lineLoginChannelId || typeof validity.expires_in !== 'number'
    || !Number.isFinite(validity.expires_in) || validity.expires_in <= 0
    || typeof validity.scope !== 'string' || !validity.scope.split(/\s+/).includes('profile')) {
    throw new LinePayError('LINE_PAY_UNAUTHORIZED', 401);
  }
  const profile = await lineIdentityJson('https://api.line.me/v2/profile', { Authorization: `Bearer ${token}` }, fetcher);
  if (typeof profile.userId !== 'string' || !profile.userId || profile.userId.length > 128 || /\s/.test(profile.userId)) {
    throw new LinePayError('LINE_PAY_IDENTITY_UNAVAILABLE', 503);
  }
  return { tenantId, userId: profile.userId };
}

/** UUID only, tenant + owner scoped. Caller-supplied profile data is never consulted. */
export async function loadOwnedLinePayOrder(env: Env, customer: LinePayCustomer, orderId: string): Promise<LinePayOwnedOrder> {
  if (!isOrderId(orderId)) throw new LinePayError('LINE_PAY_ORDER_NOT_FOUND', 404);
  const row = await env.DB.prepare(`SELECT o.order_id, o.key, o.total_amount, o.status FROM orders o
    JOIN tenant_config tc ON tc.tenant_id = o.tenant_id AND tc.is_active = 1
    LEFT JOIN tenant_lifecycle lifecycle ON lifecycle.tenant_id = o.tenant_id
    WHERE o.tenant_id = ? AND o.order_id = ? AND o.user_id = ?
      AND (lifecycle.state IS NULL OR lifecycle.state = 'active')`)
    .bind(customer.tenantId, orderId, customer.userId)
    .first<{ order_id: string; key: string; total_amount: number; status: string }>();
  if (!row) throw new LinePayError('LINE_PAY_ORDER_NOT_FOUND', 404);
  return { orderId: row.order_id, orderKey: row.key, amount: row.total_amount, status: row.status };
}
