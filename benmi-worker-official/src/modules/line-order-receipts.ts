import type { Env } from '../types/env';
import type { TenantContext } from '../types/tenant';
import { json } from '../utils/http';
import { getLineToken } from './line';
import { resolveTenantContext } from './tenant';

type Flow = 'create' | 'append' | 'modify';
interface Receipt {
  id: string; tenant_id: string; order_key: string; user_id: string; flow: Flow;
  alt_text: string; contents_json: string; fallback_token_hash: string; retry_key: string;
  status: string; attempts: number; created_at: number;
}
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_ATTEMPTS = 6;
const MAX_AGE = 23 * 60 * 60 * 1000; // LINE retry keys are valid for 24 hours.

async function hash(value: string): Promise<string> {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(bytes), byte => byte.toString(16).padStart(2, '0')).join('');
}

// Caller includes the statement in the same D1 batch as the order/items mutation.
export async function prepareOrderReceipt(
  env: Env, tenantId: string, orderKey: string, userId: unknown,
  flow: Flow, altText: string, contents: unknown
) {
  if (typeof userId !== 'string' || !/^U[0-9a-f]{32}$/i.test(userId)) return null;
  const id = crypto.randomUUID(), token = crypto.randomUUID(), now = Date.now();
  return {
    notification: { id, token },
    statement: env.DB.prepare(`INSERT INTO line_order_receipts
      (id, tenant_id, order_key, user_id, flow, alt_text, contents_json, fallback_token_hash, retry_key, next_attempt_at, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .bind(id, tenantId, orderKey, userId, flow, altText, JSON.stringify(contents), await hash(token), crypto.randomUUID(), now + 30000, now)
  };
}

function logReceipt(row: Receipt, event: string, fields: Record<string, unknown> = {}) {
  const record = JSON.stringify({ event, tenantId: row.tenant_id, orderKey: row.order_key, receiptId: row.id, flow: row.flow, ...fields });
  if (event.endsWith('failed')) console.error(record); else console.log(record);
}

function receiptPages(row: Receipt): unknown[] {
  const contents = JSON.parse(row.contents_json);
  return contents?.type === 'receipt-pages' && Array.isArray(contents.pages) ? contents.pages : [contents];
}

function receiptMessages(row: Receipt, offset = 0) {
  const pages = receiptPages(row);
  // LINE accepts five messages in one reply/push. Reserve the fifth for navigation when needed.
  const count = pages.length - offset > 5 ? 4 : 5;
  const messages = pages.slice(offset, offset + count).map(contents => ({ type: 'flex', altText: row.alt_text, contents }));
  if (pages.length > offset + count) messages.push({ type: 'flex', altText: row.alt_text, contents: {
    type: 'bubble', size: 'kilo', body: { type: 'box', layout: 'vertical', contents: [
      { type: 'text', text: `尚有 ${pages.length - offset - count} 頁訂單明細`, wrap: true, size: 'sm' },
      { type: 'button', action: { type: 'postback', label: '查看後續明細',
        data: `action=receipt_page&receipt_id=${row.id}&offset=${offset + count}` } }
    ] }
  } });
  return messages;
}

// Continuation pages are bound to the stored tenant and LINE recipient, never to a supplied order payload.
export async function handleOrderReceiptPageWebhook(
  env: Env, tenantCtx: TenantContext | null | undefined, userId: string, data: string, replyToken?: string
): Promise<boolean> {
  const params = new URLSearchParams(data);
  if (params.get('action') !== 'receipt_page') return false;
  const id = params.get('receipt_id') || '', offsetText = params.get('offset') || '';
  if (!tenantCtx || !replyToken || !UUID.test(id) || !/^\d{1,6}$/.test(offsetText)) return true;
  const row = await env.DB.prepare("SELECT * FROM line_order_receipts WHERE id = ? AND tenant_id = ? AND user_id = ? AND status = 'sent'")
    .bind(id, tenantCtx.tenantId, userId).first<Receipt>();
  const offset = Number(offsetText);
  if (!row || offset < 1 || offset >= receiptPages(row).length) return true;
  try {
    const token = await getLineToken(env, tenantCtx);
    if (!token) return true;
    const response = await fetch('https://api.line.me/v2/bot/message/reply', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ replyToken, messages: receiptMessages(row, offset) }), signal: AbortSignal.timeout(8000)
    });
    if (!response.ok) logReceipt(row, 'line_order_receipt_page_failed', { httpStatus: response.status });
    await response.body?.cancel();
  } catch {
    logReceipt(row, 'line_order_receipt_page_failed', { error: 'Network error or timeout' });
  }
  return true;
}

export async function deliverOrderReceipt(
  env: Env, id: string, tenantCtx: TenantContext, replyToken?: string
): Promise<void> {
  const now = Date.now(), claim = crypto.randomUUID();
  // D1 compare-and-set arbitrates webhook, client fallback and cron concurrently.
  const row = await env.DB.prepare(`UPDATE line_order_receipts SET status = 'sending', claim_id = ?, lease_until = ?
    WHERE id = ? AND tenant_id = ? AND attempts < ? AND created_at > ?
      AND (status = 'pending' OR (status = 'sending' AND lease_until < ?))
    RETURNING *`).bind(claim, now + 60000, id, tenantCtx.tenantId, MAX_ATTEMPTS, now - MAX_AGE, now).first<Receipt>();
  if (!row) return;
  let sent = false, method: 'reply' | 'push' = replyToken ? 'reply' : 'push', lastError = 'Unknown failure';
  let retryable = true;
  try {
    const token = await getLineToken(env, tenantCtx);
    if (!token) throw new Error('LINE_CHANNEL_TOKEN missing');
    const messages = receiptMessages(row);
    if (replyToken) {
      try {
        const response = await fetch('https://api.line.me/v2/bot/message/reply', {
          method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ replyToken, messages }), signal: AbortSignal.timeout(8000)
        });
        sent = response.ok;
        if (!sent) logReceipt(row, 'line_order_receipt_reply_failed', { httpStatus: response.status });
        await response.body?.cancel();
      } catch {
        logReceipt(row, 'line_order_receipt_reply_failed', { error: 'Network error or timeout' });
      }
    }
    if (!sent) {
      method = 'push';
      await env.DB.prepare('UPDATE line_order_receipts SET attempts = attempts + 1 WHERE id = ? AND claim_id = ?').bind(id, claim).run();
      // Same retry key on immediate retry and later cron retries prevents duplicate pushes.
      for (let attempt = 1; attempt <= 2; attempt++) {
        try {
          const response = await fetch('https://api.line.me/v2/bot/message/push', {
            method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, 'X-Line-Retry-Key': row.retry_key },
            body: JSON.stringify({ to: row.user_id, messages }), signal: AbortSignal.timeout(8000)
          });
          sent = response.ok || (response.status === 409 && Boolean(response.headers.get('x-line-accepted-request-id')));
          lastError = `LINE HTTP ${response.status}`;
          retryable = response.status === 429 || response.status >= 500;
          const requestId = response.headers.get('x-line-request-id');
          await response.body?.cancel();
          if (sent) { logReceipt(row, 'line_order_receipt_api_accepted', { method, requestId }); break; }
          logReceipt(row, 'line_order_receipt_push_failed', { httpStatus: response.status, attempt, requestId });
        } catch {
          lastError = 'Network error or timeout'; retryable = true;
          logReceipt(row, 'line_order_receipt_push_failed', { attempt, error: lastError });
        }
        if (!retryable) break;
        if (attempt === 1) await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  } catch (error) {
    lastError = error instanceof Error ? error.message.slice(0, 160) : 'Receipt delivery error';
    retryable = false;
    logReceipt(row, 'line_order_receipt_push_failed', { error: lastError });
  }
  const exhausted = row.attempts + 1 >= MAX_ATTEMPTS;
  await env.DB.prepare(`UPDATE line_order_receipts SET status = ?, method = ?, claim_id = NULL, lease_until = 0,
    sent_at = ?, last_error = ?, next_attempt_at = ? WHERE id = ? AND claim_id = ?`)
    .bind(sent ? 'sent' : (!retryable || exhausted ? 'failed' : 'pending'), method, sent ? Date.now() : null,
      sent ? null : lastError, Date.now() + Math.min(60000 * 2 ** row.attempts, 1800000), id, claim).run();
  logReceipt(row, sent ? 'line_order_receipt_sent' : 'line_order_receipt_failed', { method, error: sent ? null : lastError });
}

export function pushOrderReceiptInBackground(env: Env, id: string | undefined, ctx?: ExecutionContext, tenantCtx?: TenantContext | null) {
  if (!id || !tenantCtx) return Promise.resolve();
  const task = deliverOrderReceipt(env, id, tenantCtx).catch(error => {
    console.error(JSON.stringify({ event: 'line_order_receipt_processing_failed', tenantId: tenantCtx.tenantId, receiptId: id, error: String(error).slice(0, 160) }));
  });
  if (ctx) { ctx.waitUntil(task); return Promise.resolve(); }
  return task;
}

export async function handleOrderReceiptWebhook(env: Env, tenantCtx: TenantContext | null | undefined, userId: string, text: string, replyToken?: string): Promise<boolean> {
  if (!tenantCtx) return false;
  const marker = text.match(/^確認參考：([0-9a-f-]{36})$/im);
  const flow: Flow | null = text.includes('[更換品項') ? 'modify' : text.includes('[加點') ? 'append'
    : text.includes('訂單編號：') && text.includes('📦 訂單內容：') ? 'create' : null;
  if (!flow) return false;
  const reference = text.match(/^訂單參考：([^\s\n]+)$/m)?.[1];
  const row = marker ? await env.DB.prepare('SELECT * FROM line_order_receipts WHERE id = ? AND tenant_id = ? AND user_id = ? AND flow = ?')
    .bind(marker[1], tenantCtx.tenantId, userId, flow).first<Receipt>()
    : reference ? await env.DB.prepare(`SELECT * FROM line_order_receipts WHERE tenant_id = ? AND user_id = ? AND order_key = ? AND flow = ? AND created_at > ? ORDER BY created_at DESC LIMIT 1`)
      .bind(tenantCtx.tenantId, userId, reference, flow, Date.now() - MAX_AGE).first<Receipt>() : null;
  // A managed receipt marker must never fall through to legacy order creation.
  if (!row) return Boolean(marker);
  await deliverOrderReceipt(env, row.id, tenantCtx, replyToken);
  return true;
}

export async function requestOrderReceiptPush(request: Request, env: Env, tenantCtx?: TenantContext | null): Promise<Response> {
  if (!tenantCtx) return json({ error: 'Unknown or inactive tenant' }, 404);
  const reader = request.body?.getReader();
  if (!reader) return json({ error: 'Missing receipt capability' }, 400);
  let text = '', size = 0;
  const decoder = new TextDecoder();
  try {
    while (true) {
      const { done, value } = await reader.read(); if (done) break;
      size += value.byteLength;
      if (size > 2048) { await reader.cancel(); return json({ error: 'Payload too large' }, 413); }
      text += decoder.decode(value, { stream: true });
    }
    text += decoder.decode();
  } finally { reader.releaseLock(); }
  let payload: { id?: unknown; token?: unknown };
  try { payload = JSON.parse(text); } catch { return json({ error: 'Invalid receipt capability' }, 400); }
  if (!payload || typeof payload.id !== 'string' || !UUID.test(payload.id) || typeof payload.token !== 'string' || !UUID.test(payload.token)) {
    return json({ error: 'Invalid receipt capability' }, 400);
  }
  // Recipient and Flex payload are selected exclusively from the committed server snapshot.
  const row = await env.DB.prepare('SELECT * FROM line_order_receipts WHERE id = ? AND tenant_id = ? AND fallback_token_hash = ? AND created_at > ?')
    .bind(payload.id, tenantCtx.tenantId, await hash(payload.token), Date.now() - MAX_AGE).first<Receipt>();
  if (!row) return json({ error: 'Invalid receipt capability' }, 403);
  // Replayed client requests cannot accelerate retries after an unsuccessful push.
  if (row.attempts === 0) await deliverOrderReceipt(env, row.id, tenantCtx);
  const result = await env.DB.prepare('SELECT status FROM line_order_receipts WHERE id = ?').bind(row.id).first<{ status: string }>();
  return json({ success: true, status: result?.status }, 202, { 'Cache-Control': 'no-store' });
}

export async function processPendingOrderReceipts(env: Env): Promise<void> {
  const now = Date.now();
  await env.DB.prepare(`UPDATE line_order_receipts SET status = 'failed', last_error = 'Retry window or attempts exhausted'
    WHERE status IN ('pending', 'sending') AND (created_at <= ? OR (attempts >= ? AND lease_until < ?))`)
    .bind(now - MAX_AGE, MAX_ATTEMPTS, now).run();
  const due = await env.DB.prepare(`SELECT id, tenant_id FROM line_order_receipts
    WHERE (status = 'pending' AND next_attempt_at <= ?) OR (status = 'sending' AND lease_until < ?)
    ORDER BY next_attempt_at LIMIT 50`).bind(now, now).all<{ id: string; tenant_id: string }>();
  for (let start = 0; start < due.results.length; start += 5) {
    await Promise.all(due.results.slice(start, start + 5).map(async row => {
      try {
        const tenantCtx = await resolveTenantContext(row.tenant_id, env);
        if (tenantCtx) await deliverOrderReceipt(env, row.id, tenantCtx);
      } catch (error) {
        console.error(JSON.stringify({ event: 'line_order_receipt_processing_failed', tenantId: row.tenant_id, receiptId: row.id, error: String(error).slice(0, 160) }));
      }
    }));
  }
}
