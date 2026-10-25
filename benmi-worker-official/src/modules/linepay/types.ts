export type LinePaySecretBinding = string | { get(): Promise<string> };

export interface LinePayBindings {
  LINE_PAY_ENABLED?: string;
  LINE_PAY_DEPLOYMENT_ENV?: string;
  LINE_PAY_ADMIN_KEY?: LinePaySecretBinding;
  /** Base64-encoded 32-byte AES key, separate from every merchant's channel secret. */
  LINE_PAY_CREDENTIAL_KEY?: LinePaySecretBinding;
}

export type LinePayPaymentStatus = 'CREATING' | 'PENDING' | 'CONFIRMING' | 'PAID'
  | 'REFUNDING' | 'REFUNDED' | 'FAILED' | 'CANCELLED' | 'UNKNOWN';
export type LinePayOperationKind = 'REQUEST' | 'CONFIRM' | 'CHECK' | 'REFUND';
export type LinePayOperationStatus = 'PENDING' | 'RUNNING' | 'SUCCEEDED' | 'FAILED' | 'UNKNOWN';

export interface LinePayTenantConfig {
  tenantId: string;
  enabled: boolean;
  environment: 'sandbox';
  currency: 'TWD';
  lineLoginChannelId: string | null;
  credentialVersion: number | null;
}

export interface LinePayCustomer {
  readonly tenantId: string;
  readonly userId: string;
}

export interface LinePayOwnedOrder {
  orderId: string;
  orderKey: string;
  amount: number;
  status: string;
}

export interface LinePayCredentialContext {
  tenantId: string;
  version: number;
  channelId: string;
}

export class LinePayError extends Error {
  constructor(readonly code: string, readonly status: number) {
    super(code);
    this.name = 'LinePayError';
  }
}
