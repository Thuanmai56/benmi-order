import { Env } from '../types/env';
import { json, corsHeaders } from '../utils/http';
import { getTenantId } from './menu';

export async function getImageList(request: Request, env: Env): Promise<Response> {
  try {
    const tenantId = getTenantId(request);
    const listKey = `tenant:${tenantId}:image_list`;
    let raw = await env.ORDER_STATE.get(listKey);
    if (!raw && tenantId === "benmi") {
      raw = await env.ORDER_STATE.get("image_list");
      if (raw) {
        await env.ORDER_STATE.put(listKey, raw);
      }
    }
    if (raw) return json(JSON.parse(raw));
  } catch (e) { }
  return json([]);
}

export async function getImage(request: Request, env: Env): Promise<Response> {
  try {
    const url = new URL(request.url);
    const name = url.searchParams.get("name");
    if (!name) return new Response("Missing name", { status: 400, headers: corsHeaders() });

    const tenantId = getTenantId(request);
    let dataUri = await env.ORDER_STATE.get(`tenant:${tenantId}:image:${name}`);
    if (!dataUri && tenantId === "benmi") {
      dataUri = await env.ORDER_STATE.get(`image:${name}`);
    }
    if (!dataUri) return new Response("Not found", { status: 404, headers: corsHeaders() });

    const match = dataUri.match(/^data:(.*?);base64,(.*)$/);
    if (!match) return new Response("Invalid format", { status: 500, headers: corsHeaders() });

    const mime = match[1];
    const base64 = match[2];
    const binaryStr = atob(base64);
    const binary = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) {
      binary[i] = binaryStr.charCodeAt(i);
    }

    return new Response(binary, {
      headers: {
        ...corsHeaders(),
        "Content-Type": mime,
        "Cache-Control": "public, max-age=86400"
      }
    });
  } catch (e) {
    return new Response("Server error", { status: 500, headers: corsHeaders() });
  }
}

export async function updateImage(request: Request, env: Env): Promise<Response> {
  try {
    const { name, dataUri }: any = await request.json();
    if (!name || !dataUri) return json({ error: "Missing name or dataUri" }, 400);

    // Limit size check (~5MB base64)
    if (dataUri.length > 5 * 1024 * 1024) {
      return json({ error: "Image too large" }, 400);
    }

    const tenantId = getTenantId(request);
    const imageKey = `tenant:${tenantId}:image:${name}`;
    const listKey = `tenant:${tenantId}:image_list`;

    await env.ORDER_STATE.put(imageKey, dataUri);

    let list: string[] = [];
    let listRaw = await env.ORDER_STATE.get(listKey);
    if (!listRaw && tenantId === "benmi") {
      listRaw = await env.ORDER_STATE.get("image_list");
    }
    if (listRaw) {
      try { list = JSON.parse(listRaw); } catch (e) { }
    }
    if (!list.includes(name)) {
      list.push(name);
      await env.ORDER_STATE.put(listKey, JSON.stringify(list));
    }

    return json({ success: true });
  } catch (e) {
    return json({ error: "Invalid data" }, 400);
  }
}

export async function deleteImage(request: Request, env: Env): Promise<Response> {
  try {
    const { name }: any = await request.json();
    if (!name) return json({ error: "Missing name" }, 400);

    const tenantId = getTenantId(request);
    const imageKey = `tenant:${tenantId}:image:${name}`;
    const listKey = `tenant:${tenantId}:image_list`;

    await env.ORDER_STATE.delete(imageKey);

    let list: string[] = [];
    let listRaw = await env.ORDER_STATE.get(listKey);
    if (!listRaw && tenantId === "benmi") {
      listRaw = await env.ORDER_STATE.get("image_list");
    }
    if (listRaw) {
      try { list = JSON.parse(listRaw); } catch (e) { }
    }
    list = list.filter(n => n !== name);
    await env.ORDER_STATE.put(listKey, JSON.stringify(list));

    return json({ success: true });
  } catch (e) {
    return json({ error: "Server error" }, 500);
  }
}
