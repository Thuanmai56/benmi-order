import type { Env } from '../types/env';
import type { TenantContext } from '../types/tenant';
import { json, corsHeaders } from '../utils/http';
import { cancellationRegex, regexDecision, CLASSIFIER_VERSION, classifyCancellation, type CancellationDecision } from './cancellation-intent';
import { resolveTenantContext } from './tenant';
import { getLineToken, handleLineEvents } from './line';

export interface CancellationJob { kind: 'classify' | 'notify'; tenantId: string; id: string }
interface CancellationConfig { enabled: boolean; review: number; clear: number }
interface EventRow {
  tenant_id: string; event_id: string; message_id: string; user_id: string; order_key: string;
  message_text: string; reply_token: string | null; event_at: number; selected_latest: number;
  attempts: number; claim_id: string; decision_json: string | null;
}
interface RequestRow {
  id: string; tenant_id: string; order_key: string; user_id: string; clarity: string;
  status: string; version: number; created_at: number; updated_at: number; latest_event_at: number;
  selected_latest: number; resolution_reason: string;
}
const ACTIVE = "('NEW','ACCEPTED','DONE','WAITING_CUSTOMER_CHANGE','WAITING_CUSTOMER_REJECT')";
const RETRY_WINDOW = 23 * 3600000;
const errorCode = (error: unknown) => error instanceof Error ? error.message.startsWith('CANCELLATION_') ? error.message : 'PROCESSING_ERROR' : 'PROCESSING_ERROR';

export async function getCancellationConfig(env: Env, tenantId: string): Promise<CancellationConfig> {
  if (env.CANCELLATION_ENGINE_ENABLED !== 'true') return { enabled: false, review: .6, clear: .9 };
  const row = await env.DB.prepare(`SELECT cancellation_detection_enabled enabled,cancellation_review_threshold review,
    cancellation_clear_threshold clear FROM tenant_config WHERE tenant_id=? AND is_active=1`).bind(tenantId).first<{enabled:number;review:number;clear:number}>();
  return { enabled: row?.enabled === 1, review: row?.review ?? .6, clear: row?.clear ?? .9 };
}

export function cancellationReference(text: string): string | null {
  return text.match(/#([\p{L}\p{N}][\p{L}\p{N}_-]{2,80})/iu)?.[1]
    || text.match(/\b(?:[0-9a-f]{8}-[0-9a-f-]{27}|[A-Z0-9]{0,6}\d{4}-[DT]\d{3,4})\b/i)?.[0] || null;
}

function customerText(tenant: TenantContext, kind: string, displayKey: string, reason = ''): string {
  const vi = tenant.locale === 'vi';
  if (kind === 'invalid') return vi ? 'Không tìm thấy đơn đang hoạt động khớp mã bạn gửi. Vui lòng kiểm tra lại mã đơn.' : '找不到與您提供編號相符的進行中訂單，請確認訂單編號。';
  if (kind === 'clear') return vi ? `Đã chuyển yêu cầu hủy đơn #${displayKey} tới quán. Đơn chưa được hủy; vui lòng chờ quán xác nhận.` : `已將訂單 #${displayKey} 的取消申請轉交店家。訂單尚未取消，請等候店家確認。`;
  if (kind === 'review') return vi ? `Đã chuyển tin nhắn của bạn tới quán để kiểm tra đơn #${displayKey}.` : `已將您的訊息轉交店家，確認訂單 #${displayKey} 的需求。`;
  if (kind === 'APPROVED') return vi ? `Quán đã xác nhận hủy đơn #${displayKey}.` : `店家已確認取消訂單 #${displayKey}。`;
  return vi ? `Quán chưa thể hủy đơn #${displayKey} vì ${reason}.` : `店家無法取消訂單 #${displayKey}，原因：${reason}。`;
}

async function dispatchJob(env: Env, job: CancellationJob): Promise<void> {
  // Failed enqueue is recovered from the committed D1 inbox/outbox by cron.
  try { await env.CANCELLATION_QUEUE?.send(job); }
  catch { console.error(JSON.stringify({ event: 'cancellation_enqueue_failed', tenantId: job.tenantId, kind: job.kind })); }
}

/** Returns true when this event has been durably routed to the new flow. */
export async function receiveCancellationEvent(
  env: Env, tenant: TenantContext, event: { webhookEventId?: string; timestamp?: number; replyToken?: string; message: { id?: string; text: string }; source: { userId: string } },
  ctx: ExecutionContext
): Promise<boolean> {
  const config = await getCancellationConfig(env, tenant.tenantId);
  if (!config.enabled) return false;
  if (await env.DB.prepare('SELECT message_id FROM cancellation_unsent_messages WHERE tenant_id=? AND user_id=? AND message_id=?')
    .bind(tenant.tenantId,event.source.userId,event.message.id || '').first()) return true;
  const hard = cancellationRegex(event.message.text);
  const eventId = event.webhookEventId || event.message.id;
  if (!eventId || !event.message.id) return false;
  const existing = await env.DB.prepare('SELECT status FROM cancellation_events WHERE tenant_id=? AND event_id=?')
    .bind(tenant.tenantId, eventId).first<{status:string}>();
  if (existing) return true;
  const at = Number.isFinite(event.timestamp) ? Number(event.timestamp) : Date.now();
  const reference = cancellationReference(event.message.text);
  // Capture the candidate at receipt time: delayed AI must never choose a newer order.
  const candidates = await env.DB.prepare(`SELECT key,display_key,status FROM orders WHERE tenant_id=? AND user_id=?
    AND status IN ${ACTIVE} AND unixepoch(created_at) <= CAST(? / 1000 AS INTEGER)
    ${reference ? 'AND (key=? OR order_id=? OR display_key=?)' : ''}
    ORDER BY unixepoch(created_at) DESC,rowid DESC LIMIT 2`).bind(tenant.tenantId, event.source.userId, at,
      ...(reference ? [reference,reference,reference] : [])).all<{key:string;display_key:string;status:string}>();
  if (!candidates.results.length || (reference && candidates.results.length !== 1)) {
    if (reference && hard !== 'not_cancel' && /(?:hủy|huy|取消|cancel)/iu.test(event.message.text)) {
      const { replyText } = await import('./line');
      await replyText(event.replyToken || '', customerText(tenant, 'invalid', ''), env, tenant);
      return true;
    }
    return false;
  }
  const candidate = candidates.results[0];
  const pending = await env.DB.prepare("SELECT id FROM order_cancellation_requests WHERE tenant_id=? AND order_key=? AND status='PENDING'")
    .bind(tenant.tenantId,candidate.key).first<{id:string}>();
  if ((hard === 'not_cancel' || hard === 'still_wanted') && !pending) return false;
  const decision: CancellationDecision | null = hard !== 'unknown' ? regexDecision(hard, !!pending) : null;
  await env.DB.prepare(`INSERT OR IGNORE INTO cancellation_events
    (tenant_id,event_id,message_id,user_id,order_key,selected_latest,message_text,event_at,reply_token,decision_json,next_attempt_at,created_at)
    VALUES(?,?,?,?,?,?,?,?,?,?,?,?)`).bind(tenant.tenantId,eventId,event.message.id,event.source.userId,candidate.key,
      !reference && candidates.results.length > 1 ? 1 : 0,event.message.text,at,event.replyToken || null,
      decision ? JSON.stringify(decision) : null,Date.now(),Date.now()).run();
  if (decision) ctx.waitUntil(processCancellationEvent(env,tenant.tenantId,eventId));
  else await dispatchJob(env,{kind:'classify',tenantId:tenant.tenantId,id:eventId});
  return true;
}

export async function processCancellationEvent(env: Env, tenantId: string, eventId: string): Promise<void> {
  const claim = crypto.randomUUID(), now = Date.now();
  const event = await env.DB.prepare(`UPDATE cancellation_events SET status='processing',claim_id=?,lease_until=?,attempts=attempts+1
    WHERE tenant_id=? AND event_id=? AND (status='pending' OR (status='processing' AND lease_until<?))
    RETURNING *`).bind(claim,now+60000,tenantId,eventId,now).first<EventRow>();
  if (!event) return;
  try {
    const tenant = await resolveTenantContext(tenantId,env);
    const config = await getCancellationConfig(env,tenantId);
    const order = await env.DB.prepare(`SELECT status,display_key,order_content,total_amount FROM orders WHERE tenant_id=? AND key=? AND user_id=? AND status IN ${ACTIVE}`)
      .bind(tenantId,event.order_key,event.user_id).first<{status:string;display_key:string;order_content?:string;total_amount?:number}>();
    if (!tenant || !config.enabled || !order || !event.message_text) {
      await finishEvent(env,event,'ignored'); return;
    }
    const open = await env.DB.prepare("SELECT id FROM order_cancellation_requests WHERE tenant_id=? AND order_key=? AND status='PENDING'")
      .bind(tenantId,event.order_key).first<{id:string}>();
    const history = open ? await env.DB.prepare(`SELECT message_text,event_at FROM cancellation_request_messages
      WHERE tenant_id=? AND request_id=? AND unsent=0 AND message_text!=''
      AND (event_at<? OR (event_at=? AND event_id<?)) ORDER BY event_at DESC,event_id DESC LIMIT 3`)
      .bind(tenantId,open.id,event.event_at,event.event_at,eventId).all<{message_text:string;event_at:number}>() : {results:[]};
    let decision: CancellationDecision;
    try {
      decision = event.decision_json ? JSON.parse(event.decision_json) : await classifyCancellation(event.message_text,order.status,config,env,tenant,
        {
          pending: !!open,
          history: history.results.reverse(),
          orderDetails: {
            order_content: order.order_content,
            total_amount: order.total_amount,
            display_key: order.display_key
          }
        });
      // Compatibility for durable jobs written by the previous deployment.
      if (!decision.intent) decision.intent = decision.clarity==='unavailable' ? 'unavailable' : decision.clarity==='none'
        ? cancellationRegex(event.message_text)==='not_cancel' && open ? 'withdraw_cancel' : 'other'
        : decision.clarity==='clear' ? 'cancel' : 'possible_cancel';
    } catch (error) {
      if (event.attempts < 3) throw error;
      decision = {source:'unavailable',probability:null,clarity:'unavailable',intent:'unavailable',
        classifierVersion:CLASSIFIER_VERSION,reasonCode:'classifier_unavailable'};
    }
    await env.DB.prepare('UPDATE cancellation_events SET decision_json=? WHERE tenant_id=? AND event_id=? AND claim_id=?')
      .bind(JSON.stringify(decision),tenantId,eventId,claim).run();
    const stillOwned=await env.DB.prepare("SELECT event_id FROM cancellation_events WHERE tenant_id=? AND event_id=? AND claim_id=? AND status='processing'")
      .bind(tenantId,eventId,claim).first();
    if (!stillOwned) return; // A LINE unsend can invalidate a job while AI is running.
    console.log(JSON.stringify({event:'cancellation_classified',tenantId,intent:decision.intent,source:decision.source,scores:decision.scores,
      probability:decision.probability,classifierVersion:decision.classifierVersion,reasonCode:decision.reasonCode,
      processingMs:Date.now()-now,webhookToClassificationMs:Date.now()-event.event_at}));
    if (decision.intent === 'unavailable') {
      await env.DB.batch([
        env.DB.prepare(`INSERT OR IGNORE INTO cancellation_technical_alerts(id,tenant_id,event_id,order_key,error_code,created_at)
          SELECT ?,?,?,?,?,? WHERE EXISTS(SELECT 1 FROM cancellation_events WHERE tenant_id=? AND event_id=? AND claim_id=? AND status='processing')`)
          .bind(crypto.randomUUID(),tenantId,eventId,event.order_key,'CLASSIFIER_UNAVAILABLE',Date.now(),tenantId,eventId,claim),
        env.DB.prepare("UPDATE cancellation_events SET status='dead',reply_token=NULL,claim_id=NULL,lease_until=0 WHERE tenant_id=? AND event_id=? AND claim_id=?")
          .bind(tenantId,eventId,claim)
      ]);
      console.warn(JSON.stringify({event:'cancellation_technical_alert',tenantId,classifierVersion:CLASSIFIER_VERSION,reason:'CLASSIFIER_UNAVAILABLE'}));
      await resumeOrdinaryMessage(env,event,tenant);
      return;
    }
    if (decision.intent === 'other' || decision.intent === 'withdraw_cancel' && !open) {
      await finishEvent(env,event,'ignored');
      await resumeOrdinaryMessage(env,event,tenant);
      return;
    }
    if (decision.intent === 'withdraw_cancel' && open) {
      // Never release a hold automatically. A late event cannot overwrite a newer intent.
      await env.DB.batch([
        env.DB.prepare(`UPDATE order_cancellation_requests SET customer_withdrew=CASE WHEN ? > latest_event_at OR (?=latest_event_at AND ?>latest_event_id) THEN 1 ELSE customer_withdrew END,
          decision_json=CASE WHEN ? > latest_event_at OR (?=latest_event_at AND ?>latest_event_id) THEN ? ELSE decision_json END,
          latest_event_id=CASE WHEN ? > latest_event_at OR (?=latest_event_at AND ?>latest_event_id) THEN ? ELSE latest_event_id END,
          latest_event_at=MAX(latest_event_at,?),version=version+1,updated_at=?
          WHERE tenant_id=? AND id=? AND status='PENDING'
          AND EXISTS(SELECT 1 FROM cancellation_events WHERE tenant_id=? AND event_id=? AND claim_id=? AND status='processing')`)
          .bind(event.event_at,event.event_at,eventId,event.event_at,event.event_at,eventId,JSON.stringify(decision),
            event.event_at,event.event_at,eventId,eventId,event.event_at,now,tenantId,open.id,tenantId,eventId,claim),
        env.DB.prepare(`INSERT OR IGNORE INTO cancellation_request_messages(tenant_id,event_id,request_id,message_id,message_text,event_at,decision_json)
          SELECT ?,?,id,?,?,?,? FROM order_cancellation_requests WHERE tenant_id=? AND id=? AND status='PENDING'
          AND EXISTS(SELECT 1 FROM cancellation_events WHERE tenant_id=? AND event_id=? AND claim_id=? AND status='processing')`)
          .bind(tenantId,eventId,event.message_id,event.message_text,event.event_at,JSON.stringify(decision),tenantId,open.id,tenantId,eventId,claim),
        env.DB.prepare("UPDATE cancellation_events SET status='done',reply_token=NULL,claim_id=NULL,lease_until=0 WHERE tenant_id=? AND event_id=? AND claim_id=?")
          .bind(tenantId,eventId,claim)
      ]);
      return;
    }
    const id = open?.id || crypto.randomUUID();
    const clarity = decision.clarity;
    await env.DB.batch([
      env.DB.prepare(`INSERT INTO order_cancellation_requests
        (id,tenant_id,order_key,user_id,source,probability,clarity,selected_latest,created_at,updated_at,latest_event_at,latest_event_id,decision_json)
        SELECT ?,?,?,?,?,?,?,?,?,?,?,?,? WHERE EXISTS(SELECT 1 FROM orders WHERE tenant_id=? AND key=? AND user_id=? AND status IN ${ACTIVE})
        AND EXISTS(SELECT 1 FROM cancellation_events WHERE tenant_id=? AND event_id=? AND claim_id=? AND status='processing')
        AND NOT EXISTS(SELECT 1 FROM order_cancellation_requests WHERE tenant_id=? AND order_key=? AND status!='PENDING' AND resolved_at>=?)
        ON CONFLICT(tenant_id,order_key) WHERE status='PENDING' DO UPDATE SET
          source=CASE WHEN (excluded.latest_event_at>latest_event_at OR (excluded.latest_event_at=latest_event_at AND excluded.latest_event_id>latest_event_id)) THEN excluded.source ELSE source END,
          probability=CASE WHEN (excluded.latest_event_at>latest_event_at OR (excluded.latest_event_at=latest_event_at AND excluded.latest_event_id>latest_event_id)) THEN excluded.probability ELSE probability END,
          clarity=CASE WHEN (excluded.latest_event_at>latest_event_at OR (excluded.latest_event_at=latest_event_at AND excluded.latest_event_id>latest_event_id)) THEN excluded.clarity ELSE clarity END,
          customer_withdrew=CASE WHEN excluded.latest_event_at>latest_event_at OR (excluded.latest_event_at=latest_event_at AND excluded.latest_event_id>latest_event_id) THEN 0 ELSE customer_withdrew END,
          decision_json=CASE WHEN excluded.latest_event_at>latest_event_at OR (excluded.latest_event_at=latest_event_at AND excluded.latest_event_id>latest_event_id) THEN excluded.decision_json ELSE decision_json END,
          latest_event_id=CASE WHEN excluded.latest_event_at>latest_event_at OR (excluded.latest_event_at=latest_event_at AND excluded.latest_event_id>latest_event_id) THEN excluded.latest_event_id ELSE latest_event_id END,
          latest_event_at=MAX(latest_event_at,excluded.latest_event_at),updated_at=excluded.updated_at,version=version+1`)
        .bind(id,tenantId,event.order_key,event.user_id,decision.source,decision.probability,clarity,event.selected_latest,now,now,event.event_at,eventId,JSON.stringify(decision),
          tenantId,event.order_key,event.user_id,tenantId,eventId,claim,tenantId,event.order_key,event.event_at),
      env.DB.prepare(`INSERT OR IGNORE INTO cancellation_request_messages(tenant_id,event_id,request_id,message_id,message_text,event_at,decision_json)
        SELECT ?,?,id,?,?,?,? FROM order_cancellation_requests WHERE tenant_id=? AND order_key=? AND status='PENDING'
        AND EXISTS(SELECT 1 FROM cancellation_events WHERE tenant_id=? AND event_id=? AND claim_id=? AND status='processing')`)
        .bind(tenantId,eventId,event.message_id,event.message_text,event.event_at,JSON.stringify(decision),tenantId,event.order_key,tenantId,eventId,claim),
      env.DB.prepare(`INSERT OR IGNORE INTO cancellation_notifications(id,tenant_id,request_id,user_id,kind,message_text,retry_key,reply_token,created_at)
        SELECT id||':received',tenant_id,id,user_id,'received',?,?,?,? FROM order_cancellation_requests
        WHERE tenant_id=? AND order_key=? AND status='PENDING'
        AND EXISTS(SELECT 1 FROM cancellation_events WHERE tenant_id=? AND event_id=? AND claim_id=? AND status='processing')`)
        .bind(customerText(tenant,clarity === 'clear' ? 'clear' : 'review',order.display_key),crypto.randomUUID(),event.reply_token,now,tenantId,event.order_key,tenantId,eventId,claim),
      env.DB.prepare("UPDATE cancellation_events SET status='done',reply_token=NULL,claim_id=NULL,lease_until=0 WHERE tenant_id=? AND event_id=? AND claim_id=?")
        .bind(tenantId,eventId,claim)
    ]);
    const request = await env.DB.prepare("SELECT id FROM order_cancellation_requests WHERE tenant_id=? AND order_key=? AND status='PENDING'")
      .bind(tenantId,event.order_key).first<{id:string}>();
    if (request) await deliverCancellationNotification(env,tenantId,request.id+':received');
    console.log(JSON.stringify({event:'cancellation_detected',tenantId,source:decision.source,clarity,probability:decision.probability,scores:decision.scores,intent:decision.intent,classifierVersion:decision.classifierVersion,reasonCode:decision.reasonCode,latencyMs:Date.now()-now,webhookToPosMs:Date.now()-event.event_at}));
  } catch (error) {
    await env.DB.prepare("UPDATE cancellation_events SET status='pending',claim_id=NULL,lease_until=0,next_attempt_at=? WHERE tenant_id=? AND event_id=? AND claim_id=?")
      .bind(Date.now()+30000,tenantId,eventId,claim).run();
    console.error(JSON.stringify({event:'cancellation_processing_failed',tenantId,reason:errorCode(error)}));
    throw error;
  }
}

async function resumeOrdinaryMessage(env:Env,event:EventRow,tenant:TenantContext) {
  // Consume each durable event once; never run both routers concurrently.
  const continuations: Promise<unknown>[] = [];
  await handleLineEvents({events:[{type:'message',webhookEventId:event.event_id,timestamp:event.event_at,
    source:{type:'user',userId:event.user_id},replyToken:event.reply_token,message:{type:'text',id:event.message_id,text:event.message_text}}]},
    env,{waitUntil(p:Promise<unknown>){ continuations.push(p); }} as ExecutionContext,tenant,false,true);
  await Promise.all(continuations);
}

async function finishEvent(env:Env,event:EventRow,status:string) {
  await env.DB.prepare('UPDATE cancellation_events SET status=?,reply_token=NULL,claim_id=NULL,lease_until=0 WHERE tenant_id=? AND event_id=? AND claim_id=?')
    .bind(status,event.tenant_id,event.event_id,event.claim_id).run();
}

export async function getCancellationRequests(request:Request,env:Env,tenant:TenantContext|null):Promise<Response> {
  if (!tenant) return json({error:'Unknown tenant'},404);
  const revision = await env.DB.prepare('SELECT revision FROM cancellation_feed_versions WHERE tenant_id=?').bind(tenant.tenantId).first<{revision:number}>();
  const etag = `"cancellation-${revision?.revision || 0}"`;
  // Cloudflare compression can weaken an ETag. If-None-Match uses weak comparison.
  const matches = request.headers.get('if-none-match')?.split(',').some(tag => tag.trim() === '*' || tag.trim().replace(/^W\//, '') === etag);
  if (matches) return new Response(null,{status:304,headers:{...corsHeaders(),ETag:etag,'Cache-Control':'no-store'}});
  const rows = await env.DB.prepare(`SELECT r.*,o.display_key,o.customer_name,o.pickup_time,o.status order_status,o.total_amount,
    (SELECT status FROM cancellation_notifications WHERE request_id=r.id AND kind='resolved') notification_status
    FROM order_cancellation_requests r JOIN orders o ON o.key=r.order_key AND o.tenant_id=r.tenant_id
    WHERE r.tenant_id=? AND (r.status='PENDING' OR r.updated_at>?) ORDER BY (r.status='PENDING') DESC,r.created_at LIMIT 300`)
    .bind(tenant.tenantId,Date.now()-86400000).all<RequestRow>();
  const messages = await env.DB.prepare(`SELECT m.request_id,m.message_id,m.message_text,m.event_at,m.unsent,m.decision_json FROM cancellation_request_messages m
    JOIN order_cancellation_requests r ON r.id=m.request_id WHERE r.tenant_id=? AND (r.status='PENDING' OR r.updated_at>?) ORDER BY m.event_at,m.event_id`)
    .bind(tenant.tenantId,Date.now()-86400000).all<{request_id:string;message_text:string;event_at:number;unsent:number}>();
  const alerts = await env.DB.prepare(`SELECT a.id,a.order_key,a.error_code,a.created_at,o.display_key
    FROM cancellation_technical_alerts a JOIN orders o ON o.key=a.order_key AND o.tenant_id=a.tenant_id
    WHERE a.tenant_id=? AND a.acknowledged_at IS NULL ORDER BY a.created_at DESC LIMIT 300`).bind(tenant.tenantId).all();
  return json({technicalAlerts:alerts.results,revision:revision?.revision || 0,requests:rows.results.map(row=>({...row,messages:messages.results.filter(m=>m.request_id===row.id)}))},200,{ETag:etag,'Cache-Control':'no-store'});
}

export async function acknowledgeCancellationAlert(_request:Request,env:Env,tenant:TenantContext|null,id:string):Promise<Response> {
  if (!tenant) return json({error:'Unknown tenant'},404);
  const alert=await env.DB.prepare('SELECT id FROM cancellation_technical_alerts WHERE tenant_id=? AND id=?').bind(tenant.tenantId,id).first();
  if (!alert) return json({error:'Alert not found'},404);
  await env.DB.prepare('UPDATE cancellation_technical_alerts SET acknowledged_at=? WHERE tenant_id=? AND id=? AND acknowledged_at IS NULL')
    .bind(Date.now(),tenant.tenantId,id).run();
  return json({success:true},200,{'Cache-Control':'no-store'});
}

export async function resolveCancellationRequest(request:Request,env:Env,tenant:TenantContext|null,id:string):Promise<Response> {
  if (!tenant) return json({error:'Unknown tenant'},404);
  const input = await request.json().catch(()=>null) as {decision?:string;expected_version?:number;reason?:string}|null;
  if (!input || !['APPROVED','DECLINED','DISMISSED'].includes(input.decision || '') || !Number.isInteger(input.expected_version) || Number(input.expected_version)<1) return json({error:'Invalid decision'},400);
  const reason = typeof input.reason==='string' ? input.reason.trim() : '';
  if (reason.length>500 || (input.decision==='DECLINED' && !reason)) return json({error:'Reason required (maximum 500 characters)'},400);
  const row = await env.DB.prepare(`SELECT r.*,o.display_key FROM order_cancellation_requests r JOIN orders o ON o.key=r.order_key AND o.tenant_id=r.tenant_id
    WHERE r.id=? AND r.tenant_id=?`).bind(id,tenant.tenantId).first<RequestRow & {display_key:string}>();
  if (!row) return json({error:'Request not found'},404);
  const token = crypto.randomUUID(), now=Date.now();
  const statements = [env.DB.prepare(`UPDATE order_cancellation_requests SET status=?,resolution_reason=?,resolution_token=?,resolved_at=?,updated_at=?,version=version+1
    WHERE id=? AND tenant_id=? AND status='PENDING' AND version=? AND EXISTS(SELECT 1 FROM orders WHERE key=order_key AND tenant_id=? AND status IN ${ACTIVE})`)
    .bind(input.decision,reason,token,now,now,id,tenant.tenantId,input.expected_version,tenant.tenantId)];
  if (input.decision==='APPROVED') {
    statements.push(env.DB.prepare(`UPDATE orders SET status='REJECTED',reason=?,updated_at=strftime('%Y-%m-%d %H:%M:%f','now')
      WHERE tenant_id=? AND key=? AND EXISTS(SELECT 1 FROM order_cancellation_requests WHERE id=? AND resolution_token=?)`)
      .bind(tenant.locale==='vi'?'Khách yêu cầu hủy':'顧客申請取消',tenant.tenantId,row.order_key,id,token));
    statements.push(env.DB.prepare(`DELETE FROM pending_actions WHERE tenant_id=? AND order_key=? AND EXISTS(SELECT 1 FROM order_cancellation_requests WHERE id=? AND resolution_token=?)`)
      .bind(tenant.tenantId,row.order_key,id,token));
  }
  if (input.decision!=='DISMISSED') statements.push(env.DB.prepare(`INSERT OR IGNORE INTO cancellation_notifications(id,tenant_id,request_id,user_id,kind,message_text,retry_key,created_at)
    SELECT id||':resolved',tenant_id,id,user_id,'resolved',?,?,? FROM order_cancellation_requests WHERE id=? AND resolution_token=?`)
    .bind(customerText(tenant,input.decision!,row.display_key,reason),crypto.randomUUID(),now,id,token));
  const results=await env.DB.batch(statements);
  if (!results[0].meta.changes) return json({error:'Request changed or already resolved',code:'CANCELLATION_CONFLICT'},409);
  if (input.decision!=='DISMISSED') await dispatchJob(env,{kind:'notify',tenantId:tenant.tenantId,id:id+':resolved'});
  return json({success:true,status:input.decision},200,{'Cache-Control':'no-store'});
}

export async function unsendCancellationMessage(env:Env,tenantId:string,userId:string,messageId:string):Promise<void> {
  await env.DB.batch([
    env.DB.prepare('INSERT OR IGNORE INTO cancellation_unsent_messages(tenant_id,user_id,message_id,created_at) VALUES(?,?,?,?)').bind(tenantId,userId,messageId,Date.now()),
    env.DB.prepare("UPDATE cancellation_events SET message_text='',reply_token=NULL,status=CASE WHEN status IN ('pending','processing') THEN 'ignored' ELSE status END WHERE tenant_id=? AND user_id=? AND message_id=?").bind(tenantId,userId,messageId),
    env.DB.prepare(`UPDATE cancellation_request_messages SET message_text='',unsent=1 WHERE tenant_id=? AND message_id=?
      AND request_id IN (SELECT id FROM order_cancellation_requests WHERE tenant_id=? AND user_id=?)`).bind(tenantId,messageId,tenantId,userId),
    env.DB.prepare(`UPDATE order_cancellation_requests SET version=version+1,updated_at=? WHERE tenant_id=? AND user_id=? AND id IN
      (SELECT request_id FROM cancellation_request_messages WHERE tenant_id=? AND message_id=?)`).bind(Date.now(),tenantId,userId,tenantId,messageId)
  ]);
}

export async function deliverCancellationNotification(env:Env,tenantId:string,id:string):Promise<void> {
  const tenant=await resolveTenantContext(tenantId,env);
  if (!tenant) return;
  const claim=crypto.randomUUID(),now=Date.now();
  const row=await env.DB.prepare(`UPDATE cancellation_notifications SET status='sending',claim_id=?,lease_until=?,attempts=attempts+1
    WHERE tenant_id=? AND id=? AND created_at>? AND attempts<6 AND next_attempt_at<=?
    AND (status='pending' OR (status='sending' AND lease_until<?)) RETURNING *`)
    .bind(claim,now+60000,tenantId,id,now-RETRY_WINDOW,now,now).first<{request_id:string;user_id:string;message_text:string;retry_key:string;attempts:number;kind:string;reply_token:string|null}>();
  if (!row) return;
  if (row.kind==='resolved') {
    const acknowledgement=await env.DB.prepare("SELECT id FROM cancellation_notifications WHERE tenant_id=? AND request_id=? AND kind='received' AND status='sending' AND lease_until>?")
      .bind(tenantId,row.request_id,now).first();
    if (acknowledgement) {
      // Do not submit a final result ahead of an acknowledgement already in flight.
      await env.DB.prepare("UPDATE cancellation_notifications SET status='pending',attempts=attempts-1,claim_id=NULL,lease_until=0,next_attempt_at=? WHERE id=? AND tenant_id=? AND claim_id=?")
        .bind(now+5000,id,tenantId,claim).run();
      try {await env.CANCELLATION_QUEUE?.send({kind:'notify',tenantId,id},{delaySeconds:5});} catch { /* cron recovers the outbox */ }
      return;
    }
  }
  let accepted=false,retryable=true,permanentError=false;
  try {
    const token=await getLineToken(env,tenant);
    if (!token) { permanentError=true; throw new Error('LINE token unavailable'); }
    if (row.kind==='received') {
      const request=await env.DB.prepare('SELECT status FROM order_cancellation_requests WHERE id=? AND tenant_id=?').bind(row.request_id,tenantId).first<{status:string}>();
      if (request?.status!=='PENDING') {
        await env.DB.prepare("UPDATE cancellation_notifications SET status='failed',claim_id=NULL,lease_until=0,last_error='Request already closed' WHERE id=? AND tenant_id=? AND claim_id=?")
          .bind(id,tenantId,claim).run(); return;
      }
    }
    const messages=[{type:'text',text:row.message_text}];
    if (row.reply_token) {
      // Consume the token once; later recovery only retries the keyed push.
      await env.DB.prepare('UPDATE cancellation_notifications SET reply_token=NULL WHERE tenant_id=? AND id=? AND claim_id=?').bind(tenantId,id,claim).run();
      const response=await fetch('https://api.line.me/v2/bot/message/reply',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},
        body:JSON.stringify({replyToken:row.reply_token,messages}),signal:AbortSignal.timeout(8000)});
      accepted=response.ok;
      await response.body?.cancel();
    }
    if (!accepted) {
    const response=await fetch('https://api.line.me/v2/bot/message/push',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`,'X-Line-Retry-Key':row.retry_key},
      body:JSON.stringify({to:row.user_id,messages}),signal:AbortSignal.timeout(8000)});
    accepted=response.ok || (response.status===409 && !!response.headers.get('x-line-accepted-request-id'));
    retryable=response.status===429 || response.status>=500;
    await response.body?.cancel();
    }
  } catch { retryable=!permanentError; }
  await env.DB.prepare(`UPDATE cancellation_notifications SET status=?,claim_id=NULL,lease_until=0,next_attempt_at=?,last_error=? WHERE id=? AND tenant_id=? AND claim_id=?`)
    .bind(accepted?'sent':(!retryable || row.attempts>=6?'failed':'pending'),Date.now()+Math.min(30000*2**row.attempts,1800000),accepted?null:'LINE notification not accepted',id,tenantId,claim).run();
}

export async function retryCancellationNotification(request:Request,env:Env,tenant:TenantContext|null,id:string):Promise<Response> {
  if (!tenant) return json({error:'Unknown tenant'},404);
  const row=await env.DB.prepare(`UPDATE cancellation_notifications SET status='pending',attempts=0,next_attempt_at=0 WHERE tenant_id=? AND request_id=? AND kind='resolved' AND status='failed' AND created_at>? RETURNING id`)
    .bind(tenant.tenantId,id,Date.now()-RETRY_WINDOW).first<{id:string}>();
  if (!row) return json({error:'Notification cannot be retried'},409);
  await dispatchJob(env,{kind:'notify',tenantId:tenant.tenantId,id:row.id});
  return json({success:true},202);
}

export async function processCancellationQueue(batch:MessageBatch<CancellationJob>,env:Env):Promise<void> {
  for (const message of batch.messages) {
    try {
      const job=message.body;
      if (!job || typeof job.id!=='string' || typeof job.tenantId!=='string' || !['classify','notify'].includes(job.kind)) {message.ack();continue;}
      if (job.kind==='classify') await processCancellationEvent(env,job.tenantId,job.id);
      else await deliverCancellationNotification(env,job.tenantId,job.id);
      message.ack();
    } catch {message.retry({delaySeconds:30});}
  }
}

export async function recoverCancellations(env:Env):Promise<void> {
  const now=Date.now();
  const events=await env.DB.prepare(`SELECT tenant_id,event_id FROM cancellation_events WHERE (status='pending' AND next_attempt_at<=?) OR (status='processing' AND lease_until<?) ORDER BY created_at LIMIT 30`)
    .bind(now,now).all<{tenant_id:string;event_id:string}>();
  for (const row of events.results) {
    try {await processCancellationEvent(env,row.tenant_id,row.event_id);} catch { /* durable retry on next cron */ }
  }
  await env.DB.prepare("UPDATE cancellation_notifications SET status='failed',last_error='Retry window exhausted' WHERE status IN ('pending','sending') AND created_at<=?").bind(now-RETRY_WINDOW).run();
  const notifications=await env.DB.prepare(`SELECT id,tenant_id FROM cancellation_notifications WHERE (status='pending' AND next_attempt_at<=?) OR (status='sending' AND lease_until<?) ORDER BY created_at LIMIT 30`)
    .bind(now,now).all<{id:string;tenant_id:string}>();
  for (const row of notifications.results) await deliverCancellationNotification(env,row.tenant_id,row.id);
  await env.DB.prepare(`UPDATE cancellation_request_messages SET message_text='' WHERE message_text!='' AND request_id IN
    (SELECT id FROM order_cancellation_requests WHERE status!='PENDING' AND resolved_at<?)`)
    .bind(now-30*86400000).run();
  await env.DB.prepare("UPDATE cancellation_events SET message_text='',reply_token=NULL WHERE status IN ('done','ignored','dead') AND created_at<? AND message_text!=''").bind(now-86400000).run();
  await env.DB.prepare('DELETE FROM cancellation_technical_alerts WHERE acknowledged_at IS NOT NULL AND acknowledged_at<?').bind(now-30*86400000).run();
  await env.DB.prepare('DELETE FROM cancellation_unsent_messages WHERE created_at<?').bind(now-30*86400000).run();
}

