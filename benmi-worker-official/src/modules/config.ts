import { Env } from '../types/env';
import { json } from '../utils/http';
import { getTenantId } from './menu';

import { TenantContext } from '../types/tenant';

export async function getConfig(request: Request, env: Env, tenantCtx?: TenantContext | null): Promise<Response> {
  const tenantId = tenantCtx?.tenantId || getTenantId(request);
  const cacheKey = `tenant:${tenantId}:config`;

  let stored: any = {};
  try {
    let raw = await env.ORDER_STATE.get(cacheKey);
    if (!raw && tenantId === "benmi") {
      // Fallback & Auto-migration for benmi
      raw = await env.ORDER_STATE.get("store_config");
      if (raw) {
        // Copy to the new key silently
        await env.ORDER_STATE.put(cacheKey, raw);
      }
    }
    if (raw) stored = JSON.parse(raw);
  } catch (e) {
    console.error("getConfig failed:", e);
  }
  
  return json({ 
    liffId: stored.liffId || tenantCtx?.liffId || env.LIFF_ID || null,
    operatingHours: stored.operatingHours || tenantCtx?.operatingHours || null
  });
}

export async function updateConfig(request: Request, env: Env, tenantCtx?: TenantContext | null): Promise<Response> {
  try {
    const tenantId = tenantCtx?.tenantId || getTenantId(request);
    const cacheKey = `tenant:${tenantId}:config`;
    const payload: any = await request.json();
    
    let stored: any = {};
    let raw = await env.ORDER_STATE.get(cacheKey);
    if (!raw && tenantId === "benmi") {
      raw = await env.ORDER_STATE.get("store_config");
    }
    if (raw) stored = JSON.parse(raw);
    
    if (payload.operatingHours !== undefined) {
      stored.operatingHours = payload.operatingHours;
    }
    if (payload.liffId !== undefined) {
      stored.liffId = payload.liffId;
    }
    
    await env.ORDER_STATE.put(cacheKey, JSON.stringify(stored));
    return json({ success: true });
  } catch (e: any) {
    return json({ error: e.message }, 500);
  }
}
