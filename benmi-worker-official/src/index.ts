import { Env } from './types/env';
import { corsHeaders, json } from './utils/http';
import { handleLineWebhook } from './modules/line';
import { createOrder, updateOrder, getOrders, getWaitingCount, handleOrdersMigration } from './modules/orders';
import { getConfig, updateConfig } from './modules/config';
import { getMenu, updateMenu, updateStockStatus, getTenantId } from './modules/menu';
import { handleAuth, handleAuthChange, handleCreateTempLink, handleVerifyTempLink } from './modules/auth';
import { getImageList, getImage, updateImage, deleteImage } from './modules/image';
import { debugKV } from './modules/debug';
import { resolveTenantContext } from './modules/tenant';
import { handleAdminRoute } from './modules/admin';
import { getTenantBootstrap } from './modules/bootstrap';

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders() });
    }

    // 1. Admin API Routes
    if (path.startsWith("/api/admin")) {
      return handleAdminRoute(request, env, path);
    }

    // 2. LINE Webhook Routes
    if (request.method === "POST") {
      // Legacy Webhook Path (/webhook or /) -> Fallback to "benmi" tenant
      if (path === "/webhook" || path === "/") {
        const tenantCtx = await resolveTenantContext("benmi", env);
        return handleLineWebhook(request, env, ctx, tenantCtx);
      }

      // Path-Based Webhook Routing (/webhook/:tenantId)
      const webhookMatch = path.match(/^\/webhook\/([a-zA-Z0-9_-]+)$/);
      if (webhookMatch) {
        const tenantId = webhookMatch[1];
        const tenantCtx = await resolveTenantContext(tenantId, env);
        if (!tenantCtx) {
          return json({ error: `Unknown or inactive tenant: ${tenantId}` }, 404);
        }
        return handleLineWebhook(request, env, ctx, tenantCtx);
      }
    }

    // 3. Resolve Tenant Context for API Requests
    const tenantId = getTenantId(request);
    const tenantCtx = await resolveTenantContext(tenantId, env);

    // 4. API Endpoints
    if (request.method === "GET" && (path === "/api/tenant/bootstrap" || path === "/api/bootstrap")) return getTenantBootstrap(request, env);
    if (request.method === "POST" && path === "/api/create") return createOrder(request, env, ctx, tenantCtx);
    if (request.method === "POST" && path === "/api/update") return updateOrder(request, env, ctx, tenantCtx);
    if (request.method === "GET" && path === "/api/orders/waiting-count") return getWaitingCount(request, env);
    if (request.method === "GET" && path === "/api/orders") return getOrders(request, env);
    if (request.method === "GET" && path === "/api/config") return getConfig(request, env, tenantCtx);
    if (request.method === "POST" && path === "/api/config") return updateConfig(request, env, tenantCtx);
    if (request.method === "GET" && path === "/api/menu") return getMenu(request, env);
    if (request.method === "POST" && path === "/api/menu") return updateMenu(request, env);
    if (request.method === "POST" && path === "/api/menu/stock-status") return updateStockStatus(request, env);
    if (request.method === "GET" && path === "/api/image_list") return getImageList(request, env);
    if (request.method === "GET" && path === "/api/image") return getImage(request, env);
    if (request.method === "POST" && path === "/api/image") return updateImage(request, env);
    if (request.method === "DELETE" && path === "/api/image") return deleteImage(request, env);
    if ((request.method === "POST" || request.method === "GET") && path === "/api/auth") return handleAuth(request, env, url, tenantCtx);
    if (request.method === "POST" && path === "/api/auth/change") return handleAuthChange(request, env, tenantCtx);
    if (request.method === "POST" && path === "/api/auth/templink") return handleCreateTempLink(request, env, tenantCtx);
    if (request.method === "GET" && path === "/api/auth/templink") return handleVerifyTempLink(request, env, tenantCtx);
    if (request.method === "GET" && path === "/api/debug") return debugKV(env, url);
    if (request.method === "GET" && path === "/api/health") {
      return json({
        status: "ok",
        service: "benmi-worker",
        tenantId: tenantCtx?.tenantId || tenantId,
        timestamp: new Date().toISOString(),
      });
    }

    return new Response("Not Found", { status: 404, headers: corsHeaders() });
  }
};
