import type { Env } from '../types/env';

export const isOrderId = (value: string): boolean => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

/** Resolve a UUID or the stable compatibility key; never resolve a display number. */
export async function resolveOrderKey(env: Env, tenantId: string, reference: string): Promise<string | null> {
  if (!reference) return null;
  const row = await env.DB.prepare(`SELECT key FROM orders WHERE tenant_id = ? AND key = ?
    UNION ALL SELECT key FROM orders WHERE tenant_id = ? AND order_id = ? LIMIT 1`)
    .bind(tenantId, reference, tenantId, reference).first<{ key: string }>();
  return row?.key || null;
}

/** Read-only human lookup: never pick an arbitrary order when a display number repeats. */
export async function findOrderForCustomer(env: Env, tenantId: string, reference: string, userId: string): Promise<any | null> {
  const rows = await env.DB.prepare(`SELECT * FROM orders WHERE tenant_id = ? AND user_id = ?
    AND (key = ? OR order_id = ? OR display_key = ?) ORDER BY created_at DESC LIMIT 2`)
    .bind(tenantId, userId, reference, reference, reference).all();
  return rows.results.length === 1 ? rows.results[0] : null;
}
