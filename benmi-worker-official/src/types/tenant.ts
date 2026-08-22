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
}

export function tenantHasFeature(ctx: TenantContext | null | undefined, featureKey: string): boolean {
  if (!ctx || !Array.isArray(ctx.features)) return false;
  return ctx.features.includes(featureKey);
}
