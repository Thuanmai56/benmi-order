/**
 * Serve the marketplace on explore.blabfood.app and POS on pos.blabfood.app.
 *
 * This is an internal asset fetch: the address bar remains on the clean
 * domain and no redirect is added to the request path.
 */
const EXPLORE_HOST = "explore.blabfood.app";
const POS_HOST = "pos.blabfood.app";

const RESERVED_POS_PATHS = new Set([
  "orders",
  "orders.html",
  "index",
  "index.html",
  "marketplace",
  "marketplace.html",
  "landing",
  "landing.html",
  "favicon.ico",
  "robots.txt",
  "manifest.json",
  "css",
  "js",
  "icons",
  "fonts",
  "sound",
  "audio",
  "dist",
  "api"
]);

function isPosRoute(pathname) {
  if (pathname === "/" || pathname === "/index.html" || pathname === "/orders" || pathname === "/orders/") {
    return true;
  }
  // Pattern /:tenant/orders or /:tenant/orders/
  const ordersMatch = pathname.match(/^\/([a-zA-Z0-9_-]+)\/orders\/?$/);
  if (ordersMatch) {
    return !RESERVED_POS_PATHS.has(ordersMatch[1]);
  }
  // Pattern /:tenant or /:tenant/ (single segment, no file extension)
  const tenantMatch = pathname.match(/^\/([a-zA-Z0-9_-]+)\/?$/);
  if (tenantMatch) {
    const seg = tenantMatch[1];
    if (!RESERVED_POS_PATHS.has(seg) && !seg.includes(".")) {
      return true;
    }
  }
  return false;
}

async function serveInternalAsset(context, assetPath) {
  const assetUrl = new URL(context.request.url);
  assetUrl.pathname = assetPath;
  let response = await context.env.ASSETS.fetch(new Request(assetUrl, context.request));
  if (response.status >= 300 && response.status < 400 && response.headers.has("location")) {
    const redirectUrl = new URL(response.headers.get("location"), context.request.url);
    response = await context.env.ASSETS.fetch(new Request(redirectUrl, context.request));
  }
  const headers = new Headers(response.headers);
  headers.set("Cache-Control", "public, max-age=0, must-revalidate");

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export async function onRequest(context) {
  const url = new URL(context.request.url);

  // 1. Explore Marketplace routing: explore.blabfood.app -> /marketplace
  if (url.hostname === EXPLORE_HOST && (url.pathname === "/" || url.pathname === "/index.html")) {
    return serveInternalAsset(context, "/marketplace");
  }

  // 2. POS Dashboard routing: pos.blabfood.app -> /orders
  if (url.hostname === POS_HOST && isPosRoute(url.pathname)) {
    return serveInternalAsset(context, "/orders");
  }

  return context.next();
}

