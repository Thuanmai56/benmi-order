import { Env } from './types/env';
import { corsHeaders } from './utils/http';
import { handleLineWebhook } from './modules/line';
import { createOrder, updateOrder, getOrders } from './modules/orders';
import { getConfig, updateConfig } from './modules/config';
import { getMenu, updateMenu } from './modules/menu';
import { handleAuth, handleAuthChange, handleCreateTempLink, handleVerifyTempLink } from './modules/auth';

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders() });
    }

    if (request.method === "POST" && (path === "/webhook" || path === "/")) {
      return handleLineWebhook(request, env, ctx);
    }
    if (request.method === "POST" && path === "/api/create") return createOrder(request, env);
    if (request.method === "POST" && path === "/api/update") return updateOrder(request, env, ctx);
    if (request.method === "GET" && path === "/api/orders") return getOrders(env);
    if (request.method === "GET" && path === "/api/config") return getConfig(env);
    if (request.method === "POST" && path === "/api/config") return updateConfig(request, env);
    if (request.method === "GET" && path === "/api/menu") return getMenu(env);
    if (request.method === "POST" && path === "/api/menu") return updateMenu(request, env);
    if ((request.method === "POST" || request.method === "GET") && path === "/api/auth") return handleAuth(request, env, url);
    if (request.method === "POST" && path === "/api/auth/change") return handleAuthChange(request, env);
    if (request.method === "POST" && path === "/api/auth/templink") return handleCreateTempLink(request, env);
    if (request.method === "GET" && path === "/api/auth/templink") return handleVerifyTempLink(request, env);

    return new Response("Not Found", { status: 404, headers: corsHeaders() });
  }
};
