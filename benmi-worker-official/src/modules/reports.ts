import { Env } from '../types/env';
import { json } from '../utils/http';
import { getTenantId } from './menu';
import { ItemAnalyticsRow, ItemAnalyticsSummary } from '../types/index';

export async function getItemAnalyticsReport(request: Request, env: Env): Promise<Response> {
  const tenantId = getTenantId(request);
  if (!env.DB) {
    return json({ error: "Database not configured", code: "NO_DB" }, 500);
  }

  const url = new URL(request.url);
  const range = url.searchParams.get("range") || "today"; // 'today' | '7d' | '30d' | 'custom'
  const customStart = url.searchParams.get("start_date");
  const customEnd = url.searchParams.get("end_date");

  // Compute UTC+8 (Asia/Taipei) datetime bounds
  const nowTw = new Date(Date.now() + 8 * 3600000);
  const todayTwStr = `${nowTw.getUTCFullYear()}-${String(nowTw.getUTCMonth() + 1).padStart(2, "0")}-${String(nowTw.getUTCDate()).padStart(2, "0")}`;

  let startUtcIso: string;
  let endUtcIso: string = new Date().toISOString().replace("T", " ").replace(/\.\d+Z$/, "");

  let displayStartDate = todayTwStr;
  let displayEndDate = todayTwStr;

  if (range === "today") {
    displayStartDate = todayTwStr;
    displayEndDate = todayTwStr;
    startUtcIso = new Date(new Date(`${todayTwStr}T00:00:00+08:00`).getTime()).toISOString().replace("T", " ").replace(/\.\d+Z$/, "");
  } else if (range === "7d") {
    const d7AgoTw = new Date(nowTw.getTime() - 6 * 86400000);
    displayStartDate = `${d7AgoTw.getUTCFullYear()}-${String(d7AgoTw.getUTCMonth() + 1).padStart(2, "0")}-${String(d7AgoTw.getUTCDate()).padStart(2, "0")}`;
    startUtcIso = new Date(new Date(`${displayStartDate}T00:00:00+08:00`).getTime()).toISOString().replace("T", " ").replace(/\.\d+Z$/, "");
  } else if (range === "30d") {
    const d30AgoTw = new Date(nowTw.getTime() - 29 * 86400000);
    displayStartDate = `${d30AgoTw.getUTCFullYear()}-${String(d30AgoTw.getUTCMonth() + 1).padStart(2, "0")}-${String(d30AgoTw.getUTCDate()).padStart(2, "0")}`;
    startUtcIso = new Date(new Date(`${displayStartDate}T00:00:00+08:00`).getTime()).toISOString().replace("T", " ").replace(/\.\d+Z$/, "");
  } else if (range === "custom" && customStart && /^\d{4}-\d{2}-\d{2}$/.test(customStart)) {
    displayStartDate = customStart;
    displayEndDate = (customEnd && /^\d{4}-\d{2}-\d{2}$/.test(customEnd)) ? customEnd : todayTwStr;
    startUtcIso = new Date(new Date(`${displayStartDate}T00:00:00+08:00`).getTime()).toISOString().replace("T", " ").replace(/\.\d+Z$/, "");
    endUtcIso = new Date(new Date(`${displayEndDate}T23:59:59+08:00`).getTime()).toISOString().replace("T", " ").replace(/\.\d+Z$/, "");
  } else {
    // Default fallback to today
    startUtcIso = new Date(new Date(`${todayTwStr}T00:00:00+08:00`).getTime()).toISOString().replace("T", " ").replace(/\.\d+Z$/, "");
  }

  try {
    const { results } = await env.DB.prepare(
      `SELECT 
         oi.item_name,
         oi.category_name,
         SUM(oi.quantity) AS total_quantity,
         SUM(oi.subtotal) AS total_sales,
         COUNT(DISTINCT oi.order_key) AS order_appearances,
         GROUP_CONCAT(oi.selected_options, '|||') AS all_options_raw
       FROM order_items oi
       JOIN orders o ON oi.order_key = o.key
       WHERE oi.tenant_id = ?
         AND o.status IN ('DONE', 'PICKED_UP', 'PAID')
         AND oi.created_at >= ?
         AND oi.created_at <= ?
       GROUP BY oi.item_name
       ORDER BY total_quantity DESC, total_sales DESC`
    ).bind(tenantId, startUtcIso, endUtcIso).all<any>();

    const rawRows = results || [];
    let totalItemsSold = 0;
    let totalRevenue = 0;
    const allOrderKeys = new Set<string>();

    const items: ItemAnalyticsRow[] = rawRows.map(r => {
      const qty = Number(r.total_quantity) || 0;
      const sales = Number(r.total_sales) || 0;
      const appearances = Number(r.order_appearances) || 0;
      totalItemsSold += qty;
      totalRevenue += sales;

      // Parse options breakdown
      const optionsBreakdown: { [optName: string]: number } = {};
      const allOptRaw = String(r.all_options_raw || "");
      if (allOptRaw) {
        const optionChunks = allOptRaw.split("|||");
        for (const chunk of optionChunks) {
          try {
            const parsed = JSON.parse(chunk.trim());
            if (Array.isArray(parsed)) {
              for (const opt of parsed) {
                const choiceName = opt.choice || opt.name || (typeof opt === 'string' ? opt : "");
                if (choiceName) {
                  optionsBreakdown[choiceName] = (optionsBreakdown[choiceName] || 0) + 1;
                }
              }
            }
          } catch { }
        }
      }

      return {
        itemName: r.item_name,
        categoryName: r.category_name || "Món chính",
        totalQuantity: qty,
        totalSales: sales,
        orderAppearances: appearances,
        optionsBreakdown: Object.keys(optionsBreakdown).length > 0 ? optionsBreakdown : undefined
      };
    });

    // Count distinct total orders in range with status DONE, PICKED_UP, PAID
    const orderCountRow = await env.DB.prepare(
      `SELECT COUNT(DISTINCT o.key) as total_orders
       FROM orders o
       WHERE o.tenant_id = ?
         AND o.status IN ('DONE', 'PICKED_UP', 'PAID')
         AND o.created_at >= ?
         AND o.created_at <= ?`
    ).bind(tenantId, startUtcIso, endUtcIso).first<any>();

    const totalOrders = Number(orderCountRow?.total_orders) || 0;

    const summary: ItemAnalyticsSummary = {
      tenantId,
      range,
      startDate: displayStartDate,
      endDate: displayEndDate,
      totalItemsSold,
      totalRevenue,
      totalOrders,
      topItem: items.length > 0 ? items[0] : null,
      items
    };

    return json(summary);
  } catch (e: any) {
    console.error("[getItemAnalyticsReport] D1 error:", e);
    return json({ error: "Failed to generate item analytics report", details: e.message }, 500);
  }
}
