import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import { test } from "node:test";

const source = (await readFile(new URL("../functions/_middleware.js", import.meta.url), "utf8"))
  .replace("export async function", "async function");

async function dispatch(url) {
  let servedAsset;
  const sandbox = { URL, Request, Response, Headers };
  vm.runInNewContext(source, sandbox);
  const response = await sandbox.onRequest({
    request: new Request(url),
    env: {
      ASSETS: {
        fetch: async (request) => {
          servedAsset = request.url;
          return new Response("marketplace document", { headers: { "Content-Type": "text/html" } });
        },
      },
    },
    next: async () => new Response("default document"),
  });
  return { response, servedAsset };
}

test("explore root serves marketplace without redirect and retains query", async () => {
  const result = await dispatch("https://explore.blabfood.app/?source=qr");
  assert.equal(result.response.status, 200);
  assert.equal(new URL(result.servedAsset).pathname, "/marketplace.html");
  assert.equal(new URL(result.servedAsset).search, "?source=qr");
  assert.equal(result.response.headers.get("location"), null);
});

test("other domains and paths retain the existing Pages behavior", async () => {
  for (const url of [
    "https://blabfood.app/",
    "https://benmi-order.pages.dev/",
    "https://explore.blabfood.app/marketplace",
    "https://explore.blabfood.app/js/marketplace.js",
  ]) {
    const result = await dispatch(url);
    assert.equal(result.servedAsset, undefined);
    assert.equal(await result.response.text(), "default document");
  }
});
