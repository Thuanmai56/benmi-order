import { Env } from '../types/env';
import { json } from '../utils/http';
import { getTenantId } from './menu';

import { TenantContext } from '../types/tenant';

export const DEFAULT_PASSWORD = "12345678";

async function getStoredPassword(env: Env, tenantId: string, tenantCtx?: TenantContext | null): Promise<string> {
  const cacheKey = `tenant:${tenantId}:password`;
  let stored = await env.ORDER_STATE.get(cacheKey);
  if (!stored && tenantId === "benmi") {
    stored = await env.ORDER_STATE.get("dashboard:password");
    if (stored) {
      // Auto-migrate
      await env.ORDER_STATE.put(cacheKey, stored);
    }
  }
  return stored || tenantCtx?.defaultPassword || DEFAULT_PASSWORD;
}

export async function handleAuth(request: Request, env: Env, url?: URL, tenantCtx?: TenantContext | null): Promise<Response> {
  let password: string | null = null;
  if (request.method === "GET") {
    password = (url || new URL(request.url)).searchParams.get("pw");
  } else {
    const body: any = await request.json().catch(() => ({}));
    password = body.password;
  }
  if (!password) return json({ ok: false, error: "No password" });
  
  const tenantId = tenantCtx?.tenantId || getTenantId(request);
  const stored = await getStoredPassword(env, tenantId, tenantCtx);
  return json({ ok: password === stored });
}

export async function handleAuthChange(request: Request, env: Env, tenantCtx?: TenantContext | null): Promise<Response> {
  const { current, newPassword }: any = await request.json().catch(() => ({}));
  if (!current || !newPassword) return json({ ok: false, error: "Missing fields" });
  
  const tenantId = tenantCtx?.tenantId || getTenantId(request);
  const stored = await getStoredPassword(env, tenantId, tenantCtx);
  if (current !== stored) return json({ ok: false, error: "Wrong current password" });
  if (newPassword.length < 4) return json({ ok: false, error: "Password too short" });
  
  const cacheKey = `tenant:${tenantId}:password`;
  await env.ORDER_STATE.put(cacheKey, newPassword);
  return json({ ok: true });
}

export async function handleCreateTempLink(request: Request, env: Env, tenantCtx?: TenantContext | null): Promise<Response> {
  const { password, hours = 24 }: any = await request.json().catch(() => ({}));

  const tenantId = tenantCtx?.tenantId || getTenantId(request);
  const stored = await getStoredPassword(env, tenantId, tenantCtx);
  if (password !== stored) return json({ ok: false, error: "Wrong password" });

  const ttl = Math.min(Math.max(parseInt(hours) || 24, 1), 168);
  const token = Array.from(crypto.getRandomValues(new Uint8Array(12)))
    .map(b => b.toString(16).padStart(2, "0")).join("");

  await env.ORDER_STATE.put(`templink:${tenantId}:${token}`, "1", { expirationTtl: ttl * 3600 });
  return json({ ok: true, token, hours: ttl });
}

export async function handleVerifyTempLink(request: Request, env: Env, tenantCtx?: TenantContext | null): Promise<Response> {
  const url = new URL(request.url);
  const token = url.searchParams.get("t");
  if (!token) return json({ ok: false });

  const tenantId = tenantCtx?.tenantId || getTenantId(request);
  const val = await env.ORDER_STATE.get(`templink:${tenantId}:${token}`);
  return json({ ok: val === "1" });
}
