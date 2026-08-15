import { Env } from '../types/env';
import { json } from '../utils/http';
import { resolveSecret } from '../utils/secrets';
import { invalidateTenantCache } from './tenant';

async function verifyAdminAuth(request: Request, env: Env): Promise<boolean> {
  const adminKeyHeader = request.headers.get("X-Admin-Key");
  const expectedKey = (await resolveSecret(env.ADMIN_API_KEY)) || "benmi_admin_secret_2026";
  return adminKeyHeader === expectedKey;
}

export async function handleAdminRoute(request: Request, env: Env, path: string): Promise<Response> {
  if (!(await verifyAdminAuth(request, env))) {
    return json({ error: "Unauthorized: Invalid or missing X-Admin-Key header" }, 401);
  }

  // GET /api/admin/tenants
  if (request.method === "GET" && path === "/api/admin/tenants") {
    try {
      const { results } = await env.DB.prepare(
        `SELECT t.id, t.name, tc.brand_name, tc.brand_color, tc.liff_id, tc.liff_url, tc.is_active, tc.created_at, tc.updated_at
         FROM tenants t
         LEFT JOIN tenant_config tc ON t.id = tc.tenant_id
         ORDER BY t.created_at DESC`
      ).all();
      return json({ tenants: results || [] });
    } catch (e: any) {
      return json({ error: e.message }, 500);
    }
  }

  // GET /api/admin/tenants/:id
  const getMatch = path.match(/^\/api\/admin\/tenants\/([a-zA-Z0-9_-]+)$/);
  if (request.method === "GET" && getMatch) {
    const tenantId = getMatch[1];
    try {
      const tenant = await env.DB.prepare(
        "SELECT * FROM tenants WHERE id = ?"
      ).bind(tenantId).first();

      if (!tenant) return json({ error: "Tenant not found" }, 404);

      const config = await env.DB.prepare(
        "SELECT * FROM tenant_config WHERE tenant_id = ?"
      ).bind(tenantId).first();

      return json({ tenant, config });
    } catch (e: any) {
      return json({ error: e.message }, 500);
    }
  }

  // POST /api/admin/tenants (Create or Update tenant)
  if (request.method === "POST" && path === "/api/admin/tenants") {
    try {
      const body: any = await request.json();
      const {
        tenant_id,
        name,
        line_channel_token,
        line_channel_secret,
        liff_id,
        liff_url,
        groq_api_key,
        groq_model,
        openrouter_api_key,
        openrouter_model,
        brand_name,
        brand_color,
        store_address,
        operating_hours,
        delivery_policy,
        quick_replies,
        default_password,
        locale,
        google_sheets_url,
        is_active = 1
      } = body;

      if (!tenant_id || !brand_name) {
        return json({ error: "Missing required fields: tenant_id and brand_name" }, 400);
      }

      const tenantName = name || brand_name;

      // 1. Insert or update tenants table
      await env.DB.prepare(
        `INSERT INTO tenants (id, name, updated_at)
         VALUES (?, ?, datetime('now'))
         ON CONFLICT(id) DO UPDATE SET name = excluded.name, updated_at = datetime('now')`
      ).bind(tenant_id, tenantName).run();

      // 2. Insert or update tenant_config table
      const quickRepliesJson = Array.isArray(quick_replies)
        ? JSON.stringify(quick_replies)
        : (typeof quick_replies === 'string' ? quick_replies : null);

      await env.DB.prepare(
        `INSERT INTO tenant_config (
          tenant_id, line_channel_token, line_channel_secret, liff_id, liff_url,
          groq_api_key, groq_model, openrouter_api_key, openrouter_model,
          brand_name, brand_color, store_address, operating_hours, delivery_policy,
          quick_replies, default_password, locale, google_sheets_url, is_active, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
        ON CONFLICT(tenant_id) DO UPDATE SET
          line_channel_token = COALESCE(excluded.line_channel_token, tenant_config.line_channel_token),
          line_channel_secret = COALESCE(excluded.line_channel_secret, tenant_config.line_channel_secret),
          liff_id = COALESCE(excluded.liff_id, tenant_config.liff_id),
          liff_url = COALESCE(excluded.liff_url, tenant_config.liff_url),
          groq_api_key = COALESCE(excluded.groq_api_key, tenant_config.groq_api_key),
          groq_model = COALESCE(excluded.groq_model, tenant_config.groq_model),
          openrouter_api_key = COALESCE(excluded.openrouter_api_key, tenant_config.openrouter_api_key),
          openrouter_model = COALESCE(excluded.openrouter_model, tenant_config.openrouter_model),
          brand_name = excluded.brand_name,
          brand_color = COALESCE(excluded.brand_color, tenant_config.brand_color),
          store_address = COALESCE(excluded.store_address, tenant_config.store_address),
          operating_hours = COALESCE(excluded.operating_hours, tenant_config.operating_hours),
          delivery_policy = COALESCE(excluded.delivery_policy, tenant_config.delivery_policy),
          quick_replies = COALESCE(excluded.quick_replies, tenant_config.quick_replies),
          default_password = COALESCE(excluded.default_password, tenant_config.default_password),
          locale = COALESCE(excluded.locale, tenant_config.locale),
          google_sheets_url = COALESCE(excluded.google_sheets_url, tenant_config.google_sheets_url),
          is_active = excluded.is_active,
          updated_at = datetime('now')`
      ).bind(
        tenant_id,
        line_channel_token || null,
        line_channel_secret || null,
        liff_id || null,
        liff_url || null,
        groq_api_key || null,
        groq_model || 'openai/gpt-oss-120b',
        openrouter_api_key || null,
        openrouter_model || 'google/gemini-2.5-flash:free',
        brand_name,
        brand_color || '#00b900',
        store_address || null,
        operating_hours || null,
        delivery_policy || null,
        quickRepliesJson,
        default_password || '12345678',
        locale || 'zh-TW',
        google_sheets_url || null,
        is_active
      ).run();

      // Invalidate KV cache for this tenant
      await invalidateTenantCache(tenant_id, env);

      return json({ success: true, tenant_id });
    } catch (e: any) {
      console.error("[Admin API] Failed to save tenant:", e);
      return json({ error: e.message }, 500);
    }
  }

  // DELETE /api/admin/tenants/:id (Deactivate tenant)
  const deleteMatch = path.match(/^\/api\/admin\/tenants\/([a-zA-Z0-9_-]+)$/);
  if (request.method === "DELETE" && deleteMatch) {
    const tenantId = deleteMatch[1];
    try {
      await env.DB.prepare(
        "UPDATE tenant_config SET is_active = 0, updated_at = datetime('now') WHERE tenant_id = ?"
      ).bind(tenantId).run();

      await invalidateTenantCache(tenantId, env);

      return json({ success: true, message: `Tenant ${tenantId} deactivated` });
    } catch (e: any) {
      return json({ error: e.message }, 500);
    }
  }

  return json({ error: "Not Found" }, 404);
}
