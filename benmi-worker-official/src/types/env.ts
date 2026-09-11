export interface Env {
  // Bindings
  ORDER_STATE: KVNamespace;
  DB: D1Database;

  // Internal onboarding service. No browser may supply these settings.
  ONBOARDING_ENABLED?: string;
  ONBOARDING_CREDENTIAL_KEY?: string;
  ONBOARDING_CUSTOMER_BASE_URL?: string;
  ONBOARDING_PLATFORM_BASE_URL?: string;
  ONBOARDING_STAFF_ROLES?: string;

  // Global Admin Secret
  ADMIN_API_KEY?: any;

  // Secrets & Env Variables (Fallback for primary/legacy tenant)
  LINE_CHANNEL_TOKEN?: any;
  LINE_TOKEN_BSC?: any;
  LINE_CHANNEL_ACCESS_TOKEN?: string;
  LIFF_ID?: string;
  LIFF_URL?: string;
  OPENROUTER_API_KEY?: string;
  OPENROUTER_MODEL?: string;
  GOOGLE_SHEETS_URL?: string;
  GROQ_API_KEY?: any;
  GROQ_MODEL?: string;
}
