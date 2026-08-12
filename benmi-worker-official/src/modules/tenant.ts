import { Env } from '../types/env';
import { TenantContext } from '../types/tenant';
import { resolveSecret } from '../utils/secrets';

const TENANT_CACHE_TTL = 300; // 5 minutes

export async function resolveTenantContext(
  tenantId: string,
  env: Env
): Promise<TenantContext | null> {
  const cacheKey = `tenant:${tenantId}:config_cache`;

  // 1. Check KV Cache
  if (env.ORDER_STATE) {
    try {
      const cached = await env.ORDER_STATE.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (e) {
      console.error(`[Tenant] KV cache read error for tenant ${tenantId}:`, e);
    }
  }

  // 2. Query D1 Database
  if (env.DB) {
    try {
      const row = await env.DB.prepare(
        "SELECT * FROM tenant_config WHERE tenant_id = ? AND is_active = 1"
      ).bind(tenantId).first<any>();

      if (row) {
        const quickReplies = row.quick_replies ? JSON.parse(row.quick_replies) : [];
        const ctx: TenantContext = {
          tenantId,
          lineChannelToken: row.line_channel_token || '',
          lineChannelSecret: row.line_channel_secret || null,
          liffId: row.liff_id || '',
          liffUrl: row.liff_url || '',
          groqApiKey: row.groq_api_key || null,
          groqModel: row.groq_model || 'openai/gpt-oss-120b',
          openrouterApiKey: row.openrouter_api_key || null,
          openrouterModel: row.openrouter_model || 'google/gemini-2.5-flash:free',
          brandName: row.brand_name || tenantId,
          brandColor: row.brand_color || '#00b900',
          storeAddress: row.store_address || null,
          operatingHours: row.operating_hours || null,
          deliveryPolicy: row.delivery_policy || null,
          quickReplies,
          defaultPassword: row.default_password || '12345678',
          locale: row.locale || 'zh-TW',
          googleSheetsUrl: row.google_sheets_url || null,
        };

        // Cache in KV
        if (env.ORDER_STATE) {
          try {
            await env.ORDER_STATE.put(cacheKey, JSON.stringify(ctx), {
              expirationTtl: TENANT_CACHE_TTL
            });
          } catch (e) {
            console.error(`[Tenant] KV cache write error for tenant ${tenantId}:`, e);
          }
        }

        return ctx;
      }
    } catch (e) {
      console.error(`[Tenant] D1 lookup error for tenant ${tenantId}:`, e);
    }
  }

  // 3. Fallback for "benmi" tenant using env variables (Backward compatibility before migration run)
  if (tenantId === 'benmi') {
    const globalLineToken = await resolveSecret(env.LINE_CHANNEL_TOKEN) || env.LINE_CHANNEL_ACCESS_TOKEN || '';
    const globalLiffId = env.LIFF_ID || '';
    const globalLiffUrl = env.LIFF_URL || 'https://liff.line.me/';
    const globalGroqKey = await resolveSecret(env.GROQ_API_KEY) || null;
    const globalOpenRouterKey = await resolveSecret(env.OPENROUTER_API_KEY) || null;

    const fallbackCtx: TenantContext = {
      tenantId: 'benmi',
      lineChannelToken: globalLineToken,
      lineChannelSecret: null,
      liffId: globalLiffId,
      liffUrl: globalLiffUrl,
      groqApiKey: globalGroqKey,
      groqModel: env.GROQ_MODEL || 'openai/gpt-oss-120b',
      openrouterApiKey: globalOpenRouterKey,
      openrouterModel: env.OPENROUTER_MODEL || 'google/gemini-2.5-flash:free',
      brandName: 'Benmi 越式法國麵包',
      brandColor: '#00b900',
      storeAddress: '新北市土城區中央路二段135號',
      operatingHours: '11:00-21:00（一到五），7:30-21:00（六日）',
      deliveryPolicy: '🛵 滿 2,000 元： 不限距離，土城全區皆享免運！\n🛵 滿 800 元：\n距離店址 2公里內 ➔ 免運 \n距離店址 超過2公里 ➔ 酌收 80元 運費。\n🛵 未滿 800 元： 也別擔心！歡迎直接點擊 UberEats 平台直接下單，美味一樣送到家 👇 👉 https://cutt.ly/Mt9w2fAD',
      quickReplies: [
        { triggers: ['營業時間'], reply: '我們的營業時間：11:00-21:00（一到五），7:30-21:00（六日）。' },
        { triggers: ['地址', '在哪'], reply: '新北市土城區中央路二段135號' },
        {
          triggers: ['外送嗎'],
          reply: 'Benmi 最新外送說明如下：\n🛵 滿 2,000 元： 不限距離，土城全區皆享免運！\n🛵 滿 800 元：\n距離店址 2公里內 ➔ 免運 \n距離店址 超過2公里 ➔ 酌收 80元 運費。\n🛵 未滿 800 元： 也別擔心！歡迎直接點擊 UberEats 平台直接下單，美味一樣送到家 👇 👉 https://cutt.ly/Mt9w2fAD'
        }
      ],
      defaultPassword: '12345678',
      locale: 'zh-TW',
      googleSheetsUrl: env.GOOGLE_SHEETS_URL || null,
    };

    return fallbackCtx;
  }

  return null;
}

export async function invalidateTenantCache(tenantId: string, env: Env): Promise<void> {
  const cacheKey = `tenant:${tenantId}:config_cache`;
  if (env.ORDER_STATE) {
    try {
      await env.ORDER_STATE.delete(cacheKey);
    } catch (e) {
      console.error(`[Tenant] Failed to invalidate cache for ${tenantId}:`, e);
    }
  }
}
