import { Env } from '../types/env';
import { json } from '../utils/http';
import { getTenantId } from './menu';
import { TenantContext, tenantHasFeature } from '../types/tenant';
import { invalidateBootstrapCache, parseOperatingHours } from './bootstrap';
import { invalidateMarketplaceCache } from './marketplace';

export async function getConfig(
  request: Request,
  env: Env,
  tenantCtx?: TenantContext | null
): Promise<Response> {
  const tenantId = tenantCtx?.tenantId || getTenantId(request);

  let operatingHours: any = null;
  let allowScheduledPickup = true;
  let allowDineIn = true;
  let storeStatus = 'open';
  let liffId: string | null = null;
  let announcement: string | null = null;
  let features: string[] = [];

  // 1. Read exclusively from D1 Database
  if (env.DB) {
    try {
      const row = await env.DB.prepare(
        "SELECT operating_hours, allow_scheduled_pickup, allow_dine_in, store_status, liff_id, announcement, features FROM tenant_config WHERE tenant_id = ?"
      ).bind(tenantId).first<any>();

      if (row) {
        operatingHours = parseOperatingHours(row.operating_hours, tenantId);
        if (row.allow_scheduled_pickup !== undefined && row.allow_scheduled_pickup !== null) {
          allowScheduledPickup = Boolean(row.allow_scheduled_pickup);
        }
        if (row.allow_dine_in !== undefined && row.allow_dine_in !== null) {
          allowDineIn = Boolean(row.allow_dine_in);
        }
        if (row.store_status) {
          storeStatus = row.store_status;
        }
        if (row.liff_id) {
          liffId = row.liff_id;
        }
        if (row.announcement !== undefined) {
          announcement = row.announcement;
        }
        try {
          if (row.features) {
            features = typeof row.features === 'string' ? JSON.parse(row.features) : row.features;
          }
        } catch (e) {
          features = [];
        }
      }
    } catch (e) {
      console.error(`[getConfig] D1 query failed for tenant ${tenantId}:`, e);
    }
  }

  if (!operatingHours) {
    operatingHours = parseOperatingHours(null, tenantId);
  }

  const finalFeatures = Array.isArray(features) && features.length > 0 ? features : (tenantCtx?.features || []);

  return json({
    liffId: liffId || tenantCtx?.liffId || env.LIFF_ID || null,
    operatingHours: operatingHours,
    allowScheduledPickup: allowScheduledPickup,
    allowDineIn: allowDineIn,
    features: finalFeatures,
    storeStatus: storeStatus || tenantCtx?.storeStatus || 'open',
    announcement: announcement !== null ? announcement : (tenantCtx?.announcement || null)
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
    const hasDineInFeature = tenantCtx ? tenantHasFeature(tenantCtx, 'dine_in') : true;
    let allowDineInInt = payload.allowDineIn !== undefined
      ? (payload.allowDineIn ? 1 : 0)
      : null;

    // Guard: Unsubscribed tenant cannot enable allowDineIn
    if (allowDineInInt === 1 && !hasDineInFeature) {
      console.warn(`[updateConfig] Tenant ${tenantId} tried to enable allowDineIn without 'dine_in' feature.`);
      allowDineInInt = 0;
    }

    const storeStatusVal = payload.storeStatus !== undefined ? payload.storeStatus : null;
    const liffIdVal = payload.liffId !== undefined ? payload.liffId : null;

    const logoUrlVal = payload.logoUrl !== undefined ? payload.logoUrl : null;
    const storeAddressVal = payload.storeAddress !== undefined ? payload.storeAddress : null;
    const announcementVal = payload.announcement !== undefined ? payload.announcement : null;
    const featuresVal = payload.features !== undefined
      ? (typeof payload.features === 'string' ? payload.features : JSON.stringify(payload.features))
      : null;

    // 1. Update D1 database
    if (env.DB) {
      const brandName = tenantCtx?.brandName || (tenantId === 'benmi' ? 'Benmi 越式法國麵包' : tenantId);

      await env.DB.prepare(`
        INSERT INTO tenant_config (tenant_id, brand_name, operating_hours, allow_scheduled_pickup, allow_dine_in, store_status, liff_id, logo_url, store_address, announcement, features, updated_at)
        VALUES (?, ?, ?, COALESCE(?, 1), COALESCE(?, 1), COALESCE(?, 'open'), ?, ?, ?, ?, COALESCE(?, '[]'), CURRENT_TIMESTAMP)
        ON CONFLICT(tenant_id) DO UPDATE SET
          operating_hours = CASE WHEN ? IS NOT NULL THEN ? ELSE tenant_config.operating_hours END,
          allow_scheduled_pickup = CASE WHEN ? IS NOT NULL THEN ? ELSE tenant_config.allow_scheduled_pickup END,
          allow_dine_in = CASE WHEN ? IS NOT NULL THEN ? ELSE tenant_config.allow_dine_in END,
          store_status = CASE WHEN ? IS NOT NULL THEN ? ELSE tenant_config.store_status END,
          liff_id = CASE WHEN ? IS NOT NULL THEN ? ELSE tenant_config.liff_id END,
          logo_url = CASE WHEN ? IS NOT NULL THEN ? ELSE tenant_config.logo_url END,
          store_address = CASE WHEN ? IS NOT NULL THEN ? ELSE tenant_config.store_address END,
          announcement = CASE WHEN ? IS NOT NULL THEN ? ELSE tenant_config.announcement END,
          features = CASE WHEN ? IS NOT NULL THEN ? ELSE tenant_config.features END,
          updated_at = CURRENT_TIMESTAMP
      `).bind(
        tenantId,
        brandName,
        opHoursStr,
        allowPickupInt,
        allowDineInInt,
        storeStatusVal,
        liffIdVal,
        logoUrlVal,
        storeAddressVal,
        announcementVal,
        featuresVal,
        opHoursStr, opHoursStr,
        allowPickupInt, allowPickupInt,
        allowDineInInt, allowDineInInt,
        storeStatusVal, storeStatusVal,
        liffIdVal, liffIdVal,
        logoUrlVal, logoUrlVal,
        storeAddressVal, storeAddressVal,
        announcementVal, announcementVal,
        featuresVal, featuresVal
      ).run();
    }

    // 2. Invalidate memory/KV cache in tenant context so next request gets fresh config immediately
    if (env.ORDER_STATE) {
      try {
        await env.ORDER_STATE.delete(`tenant:${tenantId}:config_cache`);
        await invalidateBootstrapCache(tenantId, env);
        await invalidateMarketplaceCache(env);
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
