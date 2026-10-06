import { Env } from '../types/env';
import { json } from '../utils/http';
import { invalidateBootstrapCache } from './bootstrap';
import { invalidateMarketplaceCache } from './marketplace';

import { customerOrderConfig, validateLegacyEndpoint, OrderDomainRow } from '../utils/order-domain';

export async function updateOrderDomain(request: Request, env: Env, tenantId: string): Promise<Response> {
  const noStore = { 'Cache-Control': 'no-store' };
  let payload: any;
  try { payload = await request.json(); } catch { return json({ error: 'Invalid JSON' }, 400, noStore); }
  if (!payload || !['legacy', 'blabfood'].includes(payload.customerOrderDomain) ||
      !['legacy', 'blabfood'].includes(payload.expectedCustomerOrderDomain) ||
      typeof payload.expectedLiffId !== 'string' || !payload.expectedLiffId) {
    return json({ error: 'customerOrderDomain, expectedCustomerOrderDomain and expectedLiffId are required' }, 400, noStore);
  }
  try {
    const row = await env.DB.prepare('SELECT liff_id, customer_order_domain, legacy_liff_endpoint_url FROM tenant_config WHERE tenant_id = ? AND is_active = 1')
      .bind(tenantId).first<OrderDomainRow>();
    if (!row) return json({ error: 'Tenant not found' }, 404, noStore);
    if (row.liff_id !== payload.expectedLiffId || row.customer_order_domain !== payload.expectedCustomerOrderDomain) {
      return json({ error: 'Order domain or LIFF ID changed; reload configuration' }, 409, noStore);
    }
    let legacyEndpoint = row.legacy_liff_endpoint_url;
    if (payload.legacyLiffEndpointUrl !== undefined) {
      try { legacyEndpoint = validateLegacyEndpoint(payload.legacyLiffEndpointUrl, tenantId, request.url); }
      catch { return json({ error: 'Invalid legacyLiffEndpointUrl' }, 400, noStore); }
    }
    // Capture the actual Console endpoint before the first cutover, not a guess.
    if (payload.customerOrderDomain === 'blabfood' && !legacyEndpoint) {
      return json({ error: 'Save legacyLiffEndpointUrl from LINE Console before activation' }, 400, noStore);
    }
    const result = await env.DB.prepare(`UPDATE tenant_config SET customer_order_domain = ?, legacy_liff_endpoint_url = ?, updated_at = CURRENT_TIMESTAMP
      WHERE tenant_id = ? AND customer_order_domain = ? AND liff_id = ?
      AND legacy_liff_endpoint_url IS ? AND is_active = 1`)
      .bind(payload.customerOrderDomain, legacyEndpoint || null, tenantId, payload.expectedCustomerOrderDomain, payload.expectedLiffId, row.legacy_liff_endpoint_url || null).run();
    if (!result.meta.changes) return json({ error: 'Configuration changed; reload and retry' }, 409, noStore);
    await invalidateBootstrapCache(tenantId, env);
    await invalidateMarketplaceCache(env);
    return json({ success: true, tenantId, liffId: row.liff_id,
      ...customerOrderConfig(tenantId, { ...row, customer_order_domain: payload.customerOrderDomain, legacy_liff_endpoint_url: legacyEndpoint }, request.url) }, 200, noStore);
  } catch {
    return json({ error: 'Order domain configuration unavailable' }, 503, noStore);
  }
}
