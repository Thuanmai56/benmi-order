import { Env } from '../types/env';
import { json } from '../utils/http';
import { getTenantId } from './menu';
import { TenantContext } from '../types/tenant';

export async function getConfig(
  request: Request,
  env: Env,
  tenantCtx?: TenantContext | null
): Promise<Response> {
  const tenantId = tenantCtx?.tenantId || getTenantId(request);

  let operatingHours: any = null;
  let allowScheduledPickup = true;
  let liffId: string | null = null;

  // 1. Read exclusively from D1 Database
  if (env.DB) {
    try {
      const row = await env.DB.prepare(
        "SELECT operating_hours, allow_scheduled_pickup, liff_id FROM tenant_config WHERE tenant_id = ?"
      ).bind(tenantId).first<any>();

      if (row) {
        if (row.operating_hours) {
          try {
            operatingHours = JSON.parse(row.operating_hours);
          } catch {
            operatingHours = row.operating_hours;
          }
        }
        if (row.allow_scheduled_pickup !== undefined && row.allow_scheduled_pickup !== null) {
          allowScheduledPickup = Boolean(row.allow_scheduled_pickup);
        }
        if (row.liff_id) {
          liffId = row.liff_id;
        }
      }
    } catch (e) {
      console.error(`[getConfig] D1 query failed for tenant ${tenantId}:`, e);
    }
  }

  return json({
    liffId: liffId || tenantCtx?.liffId || env.LIFF_ID || null,
    operatingHours: operatingHours,
    allowScheduledPickup: allowScheduledPickup
  });
}

export async function updateConfig(
  request: Request,
  env: Env,
  tenantCtx?: TenantContext | null
): Promise<Response> {
  try {
    const tenantId = tenantCtx?.tenantId || getTenantId(request);
    const payload: any = await request.json();

    const opHoursStr = payload.operatingHours !== undefined
      ? (typeof payload.operatingHours === 'string' ? payload.operatingHours : JSON.stringify(payload.operatingHours))
      : null;
    const allowPickupInt = payload.allowScheduledPickup !== undefined
      ? (payload.allowScheduledPickup ? 1 : 0)
      : null;
    const liffIdVal = payload.liffId !== undefined ? payload.liffId : null;

    // 1. Update D1 database
    if (env.DB) {
      const brandName = tenantCtx?.brandName || (tenantId === 'benmi' ? 'Benmi 越式法國麵包' : tenantId);

      await env.DB.prepare(`
        INSERT INTO tenant_config (tenant_id, brand_name, operating_hours, allow_scheduled_pickup, liff_id, updated_at)
        VALUES (?, ?, ?, COALESCE(?, 1), ?, CURRENT_TIMESTAMP)
        ON CONFLICT(tenant_id) DO UPDATE SET
          operating_hours = CASE WHEN ? IS NOT NULL THEN ? ELSE tenant_config.operating_hours END,
          allow_scheduled_pickup = CASE WHEN ? IS NOT NULL THEN ? ELSE tenant_config.allow_scheduled_pickup END,
          liff_id = CASE WHEN ? IS NOT NULL THEN ? ELSE tenant_config.liff_id END,
          updated_at = CURRENT_TIMESTAMP
      `).bind(
        tenantId,
        brandName,
        opHoursStr,
        allowPickupInt,
        liffIdVal,
        opHoursStr, opHoursStr,
        allowPickupInt, allowPickupInt,
        liffIdVal, liffIdVal
      ).run();
    }

    // 2. Invalidate memory/KV cache in tenant context so next request gets fresh config immediately
    if (env.ORDER_STATE) {
      try {
        await env.ORDER_STATE.delete(`tenant:${tenantId}:config_cache`);
      } catch (cacheErr) {
        console.error(`[updateConfig] Cache invalidation failed for tenant ${tenantId}:`, cacheErr);
      }
    }

    return json({ success: true });
  } catch (e: any) {
    console.error("[updateConfig] Error:", e);
    return json({ error: e.message }, 500);
  }
}
