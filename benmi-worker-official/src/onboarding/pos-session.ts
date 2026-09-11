import { Env } from '../types/env';
import { digest } from './crypto';

export async function allowLoginAttempt(request: Request, env: Env, tenantId: string) {
  const slot = Math.floor(Date.now() / (15 * 60000));
  const bucket = await digest(`${tenantId}:${request.headers.get('CF-Connecting-IP') || 'local'}:${slot}`);
  const row = await env.DB.prepare(`INSERT INTO pos_auth_attempts (bucket, attempts, expires_at) VALUES (?, 1, ?)
    ON CONFLICT(bucket) DO UPDATE SET attempts = attempts + 1 RETURNING attempts`)
    .bind(bucket, new Date((slot + 1) * 15 * 60000).toISOString()).first<{ attempts: number }>();
  return !!row && row.attempts <= 20;
}
export async function issuePosSession(env: Env, tenantId: string) {
  const token = crypto.randomUUID() + crypto.randomUUID();
  await env.DB.prepare('INSERT INTO pos_sessions (token_hash, tenant_id, expires_at) VALUES (?, ?, ?)')
    .bind(await digest(token), tenantId, new Date(Date.now() + 12 * 3600000).toISOString()).run();
  return token;
}
export async function hasPosSession(request: Request, env: Env, tenantId: string) {
  const token = request.headers.get('Authorization')?.replace(/^Bearer /, '');
  if (!token || token.length > 200) return false;
  return !!await env.DB.prepare('SELECT token_hash FROM pos_sessions WHERE token_hash = ? AND tenant_id = ? AND expires_at > ?')
    .bind(await digest(token), tenantId, new Date().toISOString()).first();
}
export function needsPosSession(path: string, method: string): boolean {
  if (path === '/api/orders/waiting-count') return false;
  if (path.startsWith('/api/orders') || path.startsWith('/api/reports') || path === '/api/update') return true;
  return !['GET', 'HEAD'].includes(method) && ['/api/config', '/api/menu', '/api/menu/stock-status', '/api/image'].includes(path);
}
