import type { Env } from '../types/env';
import type { Order } from '../types';

type PrintItem = NonNullable<Order['items']>[number] & { order_key: string };

/** Load the historical sale price, never today's catalog price. */
export async function attachOrderPrintItems(env: Env, tenantId: string, orders: Order[]): Promise<void> {
  if (!env.DB || !orders.length) return;
  const byKey = new Map(orders.map(order => [order.key, order]));
  const keys = [...byKey.keys()];
  for (let start = 0; start < keys.length; start += 50) {
    const chunk = keys.slice(start, start + 50);
    const { results } = await env.DB.prepare(
      `SELECT order_key, item_name, quantity, unit_price, selected_options, notes, round_number
       FROM order_items WHERE tenant_id = ? AND order_key IN (${chunk.map(() => '?').join(',')})
       ORDER BY order_key, round_number, id`
    ).bind(tenantId, ...chunk).all<PrintItem>();
    for (const { order_key, ...item } of results || []) {
      const order = byKey.get(order_key);
      if (order) (order.items ||= []).push(item);
    }
  }
}
