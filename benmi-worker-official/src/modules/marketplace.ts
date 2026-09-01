import { Env } from '../types/env';
import { json } from '../utils/http';
import { parseOperatingHours } from './bootstrap';

export interface MarketplaceTenantItem {
  tenantId: string;
  brandName: string;
  brandSubtitle: string | null;
  brandColor: string;
  logoUrl: string | null;
  storeAddress: string | null;
  latitude: number | null;
  longitude: number | null;
  operatingHours: string | null;
  parsedHours: Record<string, Array<{ start: string; end: string }>>;
  cuisineType: string;
  isOpen: boolean;
  storeStatus: 'open' | 'busy' | 'paused';
  deliveryPolicy: string | null;
  allowDineIn: boolean;
  allowScheduledPickup: boolean;
  categoriesSummary: string[];
  locale: string;
  liffUrl: string | null;
}

const MARKETPLACE_CACHE_KEY = 'marketplace:tenants_catalog';
const MARKETPLACE_CACHE_TTL = 300; // 5 minutes

/**
 * Checks if a restaurant is currently open based on store_status, parsed operating hours, and Taiwan time (UTC+8).
 */
export function isStoreCurrentlyOpen(
  storeStatus: string | undefined | null,
  parsedHours: Record<string, Array<{ start: string; end: string }>>,
  dateObj: Date = new Date()
): boolean {
  if (storeStatus === 'paused') {
    return false;
  }

  // Calculate current Taiwan time (UTC+8)
  const taiwanTime = new Date(dateObj.getTime() + 8 * 3600000);
  const dayOfWeek = String(taiwanTime.getUTCDay()); // 0 = Sun, 1 = Mon ... 6 = Sat
  const currentHours = String(taiwanTime.getUTCHours()).padStart(2, '0');
  const currentMinutes = String(taiwanTime.getUTCMinutes()).padStart(2, '0');
  const currentTimeStr = `${currentHours}:${currentMinutes}`;

  const shifts = parsedHours[dayOfWeek];
  if (!shifts || !Array.isArray(shifts) || shifts.length === 0) {
    // If no specific shifts defined, fallback to 11:00 - 21:00
    return currentTimeStr >= '11:00' && currentTimeStr <= '21:00';
  }

  for (const shift of shifts) {
    if (shift.start && shift.end) {
      if (currentTimeStr >= shift.start && currentTimeStr <= shift.end) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Endpoint GET /api/marketplace/tenants
 * Returns all active, marketplace-visible restaurants with their public metadata.
 */
export async function getMarketplaceTenants(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const noCache = url.searchParams.has('nocache') || url.searchParams.has('_t');

  // 1. Check KV Edge Cache
  if (!noCache && env.ORDER_STATE) {
    try {
      const cached = await env.ORDER_STATE.get(MARKETPLACE_CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        // Refresh isOpen flag on cached response dynamically based on real-time Taiwan clock
        const now = new Date();
        const refreshedData = (parsed.data || []).map((t: MarketplaceTenantItem) => ({
          ...t,
          isOpen: isStoreCurrentlyOpen(t.storeStatus, t.parsedHours, now)
        }));

        return json({
          success: true,
          count: refreshedData.length,
          data: refreshedData
        }, 200, {
          'X-Cache': 'HIT',
          'Cache-Control': 'public, max-age=60, s-maxage=300'
        });
      }
    } catch (e) {
      console.error('[Marketplace] KV Cache read error:', e);
    }
  }

  // 2. Fetch from D1 Database
  if (!env.DB) {
    return json({ error: 'Database binding unavailable' }, 500);
  }

  try {
    const [tenantsRes, categoriesRes] = await env.DB.batch([
      env.DB.prepare(`
        SELECT tenant_id, brand_name, announcement, brand_color, logo_url, store_address,
               operating_hours, delivery_policy, 
               COALESCE(allow_dine_in, 1) AS allow_dine_in, 
               COALESCE(allow_scheduled_pickup, 1) AS allow_scheduled_pickup,
               COALESCE(store_status, 'open') AS store_status, 
               COALESCE(cuisine_type, 'vietnamese') AS cuisine_type, 
               latitude, longitude, locale, liff_url
        FROM tenant_config
        WHERE is_active = 1 AND COALESCE(is_marketplace_visible, 1) = 1
        ORDER BY rowid ASC
      `),
      env.DB.prepare(`
        SELECT tenant_id, name, sort_order 
        FROM menu_categories 
        WHERE COALESCE(category_type, 'catalog') = 'catalog'
        ORDER BY tenant_id, sort_order ASC
      `)
    ]);

    const rawTenants = (tenantsRes.results as any[]) || [];
    const rawCategories = (categoriesRes.results as any[]) || [];

    // Group categories summary by tenant
    const catMap = new Map<string, string[]>();
    for (const c of rawCategories) {
      if (!catMap.has(c.tenant_id)) {
        catMap.set(c.tenant_id, []);
      }
      const list = catMap.get(c.tenant_id)!;
      if (list.length < 5 && c.name && !list.includes(c.name)) {
        list.push(c.name);
      }
    }

    const now = new Date();
    const tenants: MarketplaceTenantItem[] = [];

    for (const row of rawTenants) {
      const tenantId = row.tenant_id;
      const parsedHours = parseOperatingHours(row.operating_hours, tenantId);
      const storeStatus = (row.store_status as 'open' | 'busy' | 'paused') || 'open';
      const isOpen = isStoreCurrentlyOpen(storeStatus, parsedHours, now);

      let logoUrl = row.logo_url || null;
      if (!logoUrl && tenantId === 'benmi') {
        logoUrl = './benmi_logo.png';
      }

      tenants.push({
        tenantId,
        brandName: row.brand_name || tenantId,
        brandSubtitle: row.announcement || null,
        brandColor: row.brand_color || '#00b900',
        logoUrl,
        storeAddress: row.store_address || null,
        latitude: row.latitude !== null && row.latitude !== undefined ? Number(row.latitude) : null,
        longitude: row.longitude !== null && row.longitude !== undefined ? Number(row.longitude) : null,
        operatingHours: row.operating_hours || null,
        parsedHours,
        cuisineType: row.cuisine_type || 'vietnamese',
        isOpen,
        storeStatus,
        deliveryPolicy: row.delivery_policy || null,
        allowDineIn: Boolean(row.allow_dine_in),
        allowScheduledPickup: Boolean(row.allow_scheduled_pickup),
        categoriesSummary: catMap.get(tenantId) || [],
        locale: row.locale || 'zh-TW',
        liffUrl: row.liff_url || null
      });
    }

    const payload = {
      success: true,
      count: tenants.length,
      data: tenants
    };

    // 3. Cache in KV
    if (env.ORDER_STATE) {
      try {
        await env.ORDER_STATE.put(MARKETPLACE_CACHE_KEY, JSON.stringify(payload), {
          expirationTtl: MARKETPLACE_CACHE_TTL
        });
      } catch (kvErr) {
        console.error('[Marketplace] KV Cache write error:', kvErr);
      }
    }

    return json(payload, 200, {
      'X-Cache': 'MISS',
      'Cache-Control': 'public, max-age=60, s-maxage=300'
    });

  } catch (err: any) {
    console.error('[Marketplace] Error fetching tenants:', err);
    return json({ error: err.message || 'Internal Server Error' }, 500);
  }
}

/**
 * Invalidates the Marketplace KV Cache across edge nodes.
 */
export async function invalidateMarketplaceCache(env: Env): Promise<void> {
  if (env.ORDER_STATE) {
    try {
      await env.ORDER_STATE.delete(MARKETPLACE_CACHE_KEY);
      console.log('[Marketplace] Invalidated marketplace cache');
    } catch (e) {
      console.error('[Marketplace] Failed to invalidate marketplace cache:', e);
    }
  }
}
