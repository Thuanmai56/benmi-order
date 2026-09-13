/**
 * Serve the marketplace as the root page only on explore.blabfood.app.
 *
 * This is an internal asset fetch: the address bar remains on the clean
 * marketplace domain and no redirect is added to the request path.
 */
const EXPLORE_HOST = "explore.blabfood.app";

export async function onRequest(context) {
  const url = new URL(context.request.url);

  if (url.hostname !== EXPLORE_HOST || (url.pathname !== "/" && url.pathname !== "/index.html")) {
    return context.next();
  }

  const assetUrl = new URL(context.request.url);
  assetUrl.pathname = "/marketplace.html";
  const response = await context.env.ASSETS.fetch(new Request(assetUrl, context.request));
  const headers = new Headers(response.headers);
  headers.set("Cache-Control", "public, max-age=0, must-revalidate");

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
