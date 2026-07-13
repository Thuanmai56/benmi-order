export interface Env {
  // Bindings
  ORDER_STATE: KVNamespace;

  // Secrets & Env Variables
  LINE_CHANNEL_TOKEN?: any;
  LINE_CHANNEL_ACCESS_TOKEN?: string;
  LIFF_ID?: string;
  LIFF_URL?: string;
  OPENROUTER_API_KEY?: string;
  OPENROUTER_MODEL?: string;
  GROQ_API_KEY?: string;
  GROQ_MODEL?: string;
  GOOGLE_SHEETS_URL?: string;
}
