export type CustomerOrderDomain = 'legacy' | 'blabfood';
export interface OrderDomainRow {
  customer_order_domain?: string;
  legacy_liff_endpoint_url?: string | null;
  liff_id?: string | null;
}

export function legacyCustomerOrigin(requestUrl: string): string {
  const host = new URL(requestUrl).hostname;
  if (host.includes('-dev.') || host.startsWith('dev.')) return 'https://dev.benmi-order.pages.dev';
  if (host.includes('-staging.') || host.startsWith('staging.') || host.startsWith('test.')) return 'https://staging.benmi-order.pages.dev';
  return 'https://benmi-order.pages.dev';
}

export function validateLegacyEndpoint(value: unknown, tenantId: string, requestUrl: string): string {
  if (typeof value !== 'string' || value.length > 2048) throw new Error('Invalid legacy endpoint');
  const url = new URL(value);
  const origins = [legacyCustomerOrigin(requestUrl), 'https://blabfood.app', 'https://www.blabfood.app'];
  if (url.protocol !== 'https:' || !origins.includes(url.origin) || url.username || url.password || url.hash) {
    throw new Error('Legacy endpoint must use an approved customer origin');
  }
  const queryTenants = [...url.searchParams.getAll('tenant_id'), ...url.searchParams.getAll('tenant')];
  if (queryTenants.some(value => value !== tenantId)) throw new Error('Legacy endpoint tenant mismatch');
  if (!['/', '/index.html', `/${tenantId}`, `/${tenantId}/`].includes(url.pathname)) throw new Error('Invalid legacy endpoint path');
  return url.toString();
}

export function customerOrderConfig(tenantId: string, row: OrderDomainRow, requestUrl: string) {
  const customerOrderDomain: CustomerOrderDomain = row.customer_order_domain === 'blabfood' ? 'blabfood' : 'legacy';
  const fallback = new URL('/', legacyCustomerOrigin(requestUrl));
  fallback.searchParams.set('tenant_id', tenantId);
  const legacyEndpoint = row.legacy_liff_endpoint_url
    ? validateLegacyEndpoint(row.legacy_liff_endpoint_url, tenantId, requestUrl)
    : fallback.toString();
  const liffEndpointUrl = customerOrderDomain === 'blabfood'
    ? `https://order.blabfood.app/${encodeURIComponent(tenantId)}`
    : legacyEndpoint;
  return { customerOrderDomain, liffEndpointUrl, orderUrl: liffEndpointUrl };
}

