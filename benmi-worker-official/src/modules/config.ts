import { Env } from '../types/env';
import { json } from '../utils/http';
import { getTenantId } from './menu';
import { TenantContext, tenantHasFeature } from '../types/tenant';
import { invalidateBootstrapCache, parseOperatingHours } from './bootstrap';
import { invalidateMarketplaceCache } from './marketplace';
import { customerOrderConfig } from '../utils/order-domain';
import { createTenantRepository } from '../repositories/tenant.repository';
import { getCancellationConfig } from './order-cancellations';

export async function getConfig(
  request: Request,
  env: Env,
  tenantCtx?: TenantContext | null
): Promise<Response> {
  const tenantId = tenantCtx?.tenantId || getTenantId(request);
  const tenantRepo = createTenantRepository(env.DB, env.ORDER_STATE, env);

  let domainRow;
  try {
    domainRow = await tenantRepo.getTenantConfigRow(tenantId);
  } catch (e) {
    console.error('[getConfig] D1 configuration unavailable');
    return json({ error: 'Tenant configuration unavailable' }, 503, { 'Cache-Control': 'no-store' });
  }

  if (!domainRow) {
    return json({ error: 'Tenant not found' }, 404, { 'Cache-Control': 'no-store' });
  }

  let operatingHours = parseOperatingHours(domainRow.operating_hours, tenantId);
  if (!operatingHours) {
    operatingHours = parseOperatingHours(null, tenantId);
  }

  let allowScheduledPickup = true;
  if (domainRow.allow_scheduled_pickup !== undefined && domainRow.allow_scheduled_pickup !== null) {
    allowScheduledPickup = Boolean(domainRow.allow_scheduled_pickup);
  }

  let allowDineIn = true;
  if (domainRow.allow_dine_in !== undefined && domainRow.allow_dine_in !== null) {
    allowDineIn = Boolean(domainRow.allow_dine_in);
  }

  let features: string[] = [];
  try {
    if (domainRow.features) {
      features = typeof domainRow.features === 'string' ? JSON.parse(domainRow.features) : domainRow.features;
    }
  } catch {
    features = [];
  }

  const finalFeatures = Array.isArray(features) && features.length > 0 ? features : (tenantCtx?.features || []);

  let orderConfig;
  try {
    orderConfig = customerOrderConfig(tenantId, domainRow, request.url);
  } catch {
    return json({ error: 'Invalid tenant endpoint configuration' }, 503, { 'Cache-Control': 'no-store' });
  }

  return json({
    tenantId,
    cancellationDetection: await getCancellationConfig(env,tenantId),
    cancellationDetectionAvailable: env.CANCELLATION_ENGINE_ENABLED==='true' && (env.LINE_WEBHOOK_SKIP_SIGNATURE==='true' || !!tenantCtx?.lineChannelSecret),
    liffId: domainRow.liff_id || null,
    ...orderConfig,
    operatingHours,
    allowScheduledPickup,
    allowDineIn,
    features: finalFeatures,
    storeStatus: domainRow.store_status || tenantCtx?.storeStatus || 'open',
    logoUrl: domainRow.logo_url || tenantCtx?.logoUrl || null,
    storeAddress: domainRow.store_address || tenantCtx?.storeAddress || null,
    announcement: domainRow.announcement !== undefined && domainRow.announcement !== null ? domainRow.announcement : (tenantCtx?.announcement || null)
  }, 200, { 'Cache-Control': 'no-store' });
}

export async function updateConfig(
  request: Request,
  env: Env,
  tenantCtx?: TenantContext | null
): Promise<Response> {
  try {
    const tenantId = tenantCtx?.tenantId || getTenantId(request);
    const payload: any = await request.json();
    const tenantRepo = createTenantRepository(env.DB, env.ORDER_STATE, env);

    const cancellation = payload.cancellationDetection;
    if (cancellation !== undefined) {
      if (!cancellation || typeof cancellation.enabled!=='boolean' || typeof cancellation.review!=='number' || typeof cancellation.clear!=='number'
        || !Number.isFinite(cancellation.review) || !Number.isFinite(cancellation.clear) || cancellation.review<=0 || cancellation.review>=cancellation.clear || cancellation.clear>1) {
        return json({error:'Invalid cancellation thresholds'},400);
      }
      if (cancellation.enabled && (env.CANCELLATION_ENGINE_ENABLED!=='true' || (env.LINE_WEBHOOK_SKIP_SIGNATURE!=='true' && !tenantCtx?.lineChannelSecret))) {
        return json({error:'Cancellation detection requires an enabled engine and configured LINE channel secret'},400);
      }
    }

    const hasDineInFeature = tenantCtx ? tenantHasFeature(tenantCtx, 'dine_in') : true;
    let allowDineInVal = payload.allowDineIn !== undefined ? payload.allowDineIn : null;
    if (allowDineInVal && !hasDineInFeature) {
      console.warn(`[updateConfig] Tenant ${tenantId} tried to enable allowDineIn without 'dine_in' feature.`);
      allowDineInVal = false;
    }

    const brandName = tenantCtx?.brandName || (tenantId === 'benmi' ? 'Benmi 越式法國麵包' : tenantId);

    await tenantRepo.updateTenantConfig(tenantId, {
      operatingHours: payload.operatingHours,
      allowScheduledPickup: payload.allowScheduledPickup,
      allowDineIn: allowDineInVal,
      storeStatus: payload.storeStatus,
      liffId: payload.liffId,
      logoUrl: payload.logoUrl,
      storeAddress: payload.storeAddress,
      announcement: payload.announcement,
      features: payload.features,
      brandName
    });

    if (cancellation !== undefined) {
      await env.DB.prepare(`UPDATE tenant_config SET cancellation_detection_enabled=?,cancellation_review_threshold=?,cancellation_clear_threshold=?,updated_at=datetime('now') WHERE tenant_id=?`)
        .bind(cancellation.enabled?1:0,cancellation.review,cancellation.clear,tenantId).run();
      await env.ORDER_STATE.delete(`tenant:${tenantId}:config_cache`);
    }

    await invalidateBootstrapCache(tenantId, env);
    await invalidateMarketplaceCache(env);

    return json({ success: true });
  } catch (e: any) {
    console.error('[updateConfig] Error:', e);
    return json({ error: e.message }, 500);
  }
}
