import { LinePayError, type LinePayBindings, type LinePayCredentialContext, type LinePaySecretBinding } from './types';

const encoder = new TextEncoder();

export async function readLinePaySecret(binding: LinePaySecretBinding | undefined): Promise<string> {
  try {
    const value = typeof binding === 'string' ? binding : await binding?.get();
    if (typeof value !== 'string' || !value) throw new Error();
    return value;
  } catch {
    throw new LinePayError('LINE_PAY_SECRET_UNAVAILABLE', 503);
  }
}

export async function linePayHash(value: string): Promise<string> {
  const bytes = new Uint8Array(await crypto.subtle.digest('SHA-256', encoder.encode(value)));
  return Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
}

/** Hash to equal lengths before Workers' native constant-time comparison. */
export async function linePaySecretsEqual(expected: string, supplied: string): Promise<boolean> {
  const [left, right] = await Promise.all([expected, supplied].map(value => crypto.subtle.digest('SHA-256', encoder.encode(value))));
  return crypto.subtle.timingSafeEqual(left, right);
}

function encode(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes));
}

function decode(value: string): Uint8Array {
  const bytes = Uint8Array.from(atob(value), char => char.charCodeAt(0));
  if (encode(bytes) !== value) throw new Error();
  return bytes;
}

function additionalData(context: LinePayCredentialContext): Uint8Array {
  if (!/^[a-zA-Z0-9_-]{1,128}$/.test(context.tenantId) || !Number.isSafeInteger(context.version)
    || context.version < 1 || !/^\d+$/.test(context.channelId)) throw new LinePayError('LINE_PAY_CREDENTIAL_INVALID', 503);
  return encoder.encode(JSON.stringify(['linepay', 1, context.tenantId, context.version, context.channelId]));
}

async function credentialKey(env: LinePayBindings): Promise<CryptoKey> {
  const value = await readLinePaySecret(env.LINE_PAY_CREDENTIAL_KEY);
  try {
    if (value.length !== 44) throw new Error();
    const bytes = decode(value);
    if (bytes.length !== 32) throw new Error();
    return await crypto.subtle.importKey('raw', bytes, 'AES-GCM', false, ['encrypt', 'decrypt']);
  } catch {
    throw new LinePayError('LINE_PAY_SECRET_UNAVAILABLE', 503);
  }
}

export async function encryptLinePayCredential(env: LinePayBindings, context: LinePayCredentialContext, secret: string): Promise<string> {
  if (!secret || encoder.encode(secret).length > 4096) throw new LinePayError('LINE_PAY_CREDENTIAL_INVALID', 400);
  const aad = additionalData(context);
  const key = await credentialKey(env);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv, additionalData: aad }, key, encoder.encode(secret));
  return `v1.${encode(iv)}.${encode(new Uint8Array(ciphertext))}`;
}

export async function decryptLinePayCredential(env: LinePayBindings, context: LinePayCredentialContext, envelope: string): Promise<string> {
  const aad = additionalData(context);
  const key = await credentialKey(env);
  try {
    if (envelope.length > 5600) throw new Error();
    const parts = envelope.split('.');
    if (parts.length !== 3 || parts[0] !== 'v1') throw new Error();
    const iv = decode(parts[1]);
    const ciphertext = decode(parts[2]);
    if (iv.length !== 12 || ciphertext.length < 17) throw new Error();
    const plaintext = await crypto.subtle.decrypt({ name: 'AES-GCM', iv, additionalData: aad }, key, ciphertext);
    return new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(plaintext);
  } catch {
    throw new LinePayError('LINE_PAY_CREDENTIAL_INVALID', 503);
  }
}
