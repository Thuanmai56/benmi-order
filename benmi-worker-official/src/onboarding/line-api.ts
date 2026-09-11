import { z } from 'zod';
import { OnboardingError } from './errors';

export type LineFetch = typeof fetch;
async function lineRequest(token: string, path: string, method: string, body: unknown, transport: LineFetch): Promise<unknown> {
  const response = await transport(`https://api.line.me${path}`, { method,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(12000) });
  if (!response.ok) {
    await response.body?.cancel();
    if (response.status === 404 && path.endsWith('/webhook/endpoint')) return null;
    throw new OnboardingError(502, response.status === 401 || response.status === 403 ? 'LINE_TOKEN_INVALID' : 'LINE_REQUEST_FAILED');
  }
  if (Number(response.headers.get('Content-Length')) > 32000) { await response.body?.cancel(); throw new OnboardingError(502, 'LINE_RESPONSE_INVALID'); }
  if (!response.body) throw new OnboardingError(502, 'LINE_RESPONSE_INVALID');
  const reader = response.body.getReader(); let size = 0; let text = ''; const decoder = new TextDecoder();
  try {
    while (true) { const part = await reader.read(); if (part.done) break;
      size += part.value.byteLength;
      if (size > 32000) { await reader.cancel(); throw new OnboardingError(502, 'LINE_RESPONSE_INVALID'); }
      text += decoder.decode(part.value, { stream: true });
    }
    return JSON.parse(text + decoder.decode());
  } finally { reader.releaseLock(); }
}
export async function inspectLine(token: string, transport: LineFetch = fetch) {
  const bot = z.object({ userId: z.string(), displayName: z.string() }).parse(await lineRequest(token, '/v2/bot/info', 'GET', undefined, transport));
  const raw = await lineRequest(token, '/v2/bot/channel/webhook/endpoint', 'GET', undefined, transport);
  const webhook = raw === null ? { endpoint: null, active: false } : z.object({ endpoint: z.string().nullable(), active: z.boolean() }).parse(raw);
  return { bot: { user_id: bot.userId, display_name: bot.displayName }, webhook };
}
export async function connectLine(token: string, endpoint: string, previous: string | null, configure: boolean, transport: LineFetch = fetch) {
  const before = await inspectLine(token, transport);
  if (before.webhook.endpoint !== endpoint) {
    if (!configure) throw new OnboardingError(409, 'LINE_ENDPOINT_NOT_CONFIGURED');
    if (before.webhook.endpoint !== previous) throw new OnboardingError(409, 'LINE_ENDPOINT_CHANGED');
    await lineRequest(token, '/v2/bot/channel/webhook/endpoint', 'PUT', { endpoint }, transport);
  }
  const test = z.object({ success: z.boolean() }).parse(await lineRequest(token, '/v2/bot/channel/webhook/test', 'POST', { endpoint }, transport));
  if (!test.success) throw new OnboardingError(502, 'LINE_WEBHOOK_TEST_FAILED');
  const after = await inspectLine(token, transport);
  if (after.webhook.endpoint !== endpoint) throw new OnboardingError(502, 'LINE_ENDPOINT_PENDING');
  if (!after.webhook.active) throw new OnboardingError(409, 'LINE_WEBHOOK_DISABLED');
  return after;
}
