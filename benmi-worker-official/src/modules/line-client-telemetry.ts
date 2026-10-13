import type { TenantContext } from '../types/tenant';
import { json } from '../utils/http';

const MAX_BODY_BYTES = 4096;
const FLOWS = new Set(['create', 'append', 'modify', 'create_fallback', 'append_fallback', 'modify_fallback']);
const CONTEXT_TYPES = new Set(['utou', 'room', 'group', 'none', 'external']);

function safeText(value: unknown, limit: number): string | null {
  if (typeof value !== 'string') return null;
  return value
    .replace(/Bearer\s+[^\s"&]+/gi, 'Bearer [redacted]')
    .replace(/((?:access_token|id_token|refresh_token)=)[^\s&"]+/gi, '$1[redacted]')
    .slice(0, limit);
}

export async function recordLiffClientError(request: Request, tenantCtx?: Pick<TenantContext, 'tenantId'> | null): Promise<Response> {
  if (!tenantCtx) return json({ error: 'Unknown or inactive tenant' }, 404);
  const reader = request.body?.getReader();
  if (!reader) return json({ error: 'Missing diagnostic payload' }, 400);

  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_BODY_BYTES) {
        await reader.cancel();
        return json({ error: 'Diagnostic payload too large' }, 413);
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  let payload: Record<string, unknown>;
  try {
    const parsed: unknown = JSON.parse(new TextDecoder().decode(bytes));
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('Invalid payload');
    payload = parsed as Record<string, unknown>;
  } catch {
    return json({ error: 'Invalid diagnostic payload' }, 400);
  }

  if ((payload.attempt !== 1 && payload.attempt !== 2) ||
      typeof payload.flow !== 'string' || !FLOWS.has(payload.flow) ||
      typeof payload.orderKey !== 'string' || !/^[a-zA-Z0-9_-]{1,128}$/.test(payload.orderKey)) {
    return json({ error: 'Invalid diagnostic fields' }, 400);
  }

  // Client diagnostics are untrusted. Log only bounded, explicitly allowed fields.
  console.error(JSON.stringify({
    event: 'liff_send_message_failed',
    source: 'liff_client',
    tenantId: tenantCtx.tenantId,
    orderKey: payload.orderKey,
    flow: payload.flow,
    correlationId: safeText(payload.correlationId, 96),
    attempt: payload.attempt,
    maxAttempts: 2,
    errorCode: safeText(payload.errorCode, 64) || 'UNKNOWN',
    errorMessage: safeText(payload.errorMessage, 500),
    contextType: typeof payload.contextType === 'string' && CONTEXT_TYPES.has(payload.contextType) ? payload.contextType : null,
    liffId: safeText(payload.liffId, 64),
    chatMessageWriteScope: typeof payload.chatMessageWriteScope === 'boolean' ? payload.chatMessageWriteScope : null,
    permissionState: ['granted', 'prompt', 'unavailable', 'unknown'].includes(String(payload.permissionState)) ? payload.permissionState : null,
    isInClient: typeof payload.isInClient === 'boolean' ? payload.isInClient : null,
    clientTimestamp: typeof payload.clientTimestamp === 'number' && Number.isSafeInteger(payload.clientTimestamp) ? payload.clientTimestamp : null,
    receivedAt: new Date().toISOString()
  }));
  return json({ success: true }, 202, { 'Cache-Control': 'no-store' });
}
