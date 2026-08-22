export interface QuickReply {
  triggers: string[];
  reply: string;
}

export interface TenantContext {
  tenantId: string;
  // LINE Integration
  lineChannelToken: string;
  lineChannelSecret: string | null;
  liffId: string;
  liffUrl: string;
  // AI Integration
  groqApiKey: string | null;
  groqModel: string;
  openrouterApiKey: string | null;
  openrouterModel: string;
  // Branding
  brandName: string;
  brandSubtitle?: string | null;
  brandColor: string;
  logoUrl?: string | null;
  storeAddress: string | null;
  announcement?: string | null;
  // Business Config
  operatingHours: string | null;
  deliveryPolicy: string | null;
  allowScheduledPickup?: boolean;
  allowDineIn?: boolean;
  storeStatus?: 'open' | 'busy' | 'paused';
  quickReplies: QuickReply[];
  defaultPassword: string;
  locale: string;
  // Google Sheets
  googleSheetsUrl: string | null;
  // Subscription & Packaging Features
  features: string[];
  orderPrefix?: string | null;
}

export const ORDER_ID_ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";

export function generateBase32Suffix(length: number = 4): string {
  let suffix = "";
  for (let i = 0; i < length; i++) {
    const idx = Math.floor(Math.random() * ORDER_ID_ALPHABET.length);
    suffix += ORDER_ID_ALPHABET[idx];
  }
  return suffix;
}

export function resolveTenantOrderPrefix(ctx: TenantContext | null | undefined, tenantId: string): string {
  if (ctx?.orderPrefix && ctx.orderPrefix.trim().length > 0) {
    return ctx.orderPrefix.trim().toUpperCase();
  }
  return tenantId.charAt(0).toUpperCase() || 'O';
}

export function generateStandardOrderId(prefix: string, dateObj: Date = new Date()): string {
  // Taiwan time UTC+8
  const nowTaiwan = new Date(dateObj.getTime() + 8 * 3600000);
  const mm = String(nowTaiwan.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(nowTaiwan.getUTCDate()).padStart(2, "0");
  const suffix = generateBase32Suffix(4);
  return `${prefix}${mm}${dd}-${suffix}`;
}

export function tenantHasFeature(ctx: TenantContext | null | undefined, featureKey: string): boolean {
  if (!ctx || !Array.isArray(ctx.features)) return false;
  return ctx.features.includes(featureKey);
}
