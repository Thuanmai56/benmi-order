const encode = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes));
const decode = (value: string) => Uint8Array.from(atob(value), c => c.charCodeAt(0));
const utf8 = new TextEncoder();

export async function digest(value: string): Promise<string> {
  return encode(new Uint8Array(await crypto.subtle.digest('SHA-256', utf8.encode(value))));
}
export async function seal(value: string, keyBase64: string, context: string): Promise<string> {
  const keyBytes = decode(keyBase64);
  if (keyBytes.byteLength !== 32) throw new Error('CREDENTIAL_KEY_INVALID');
  const key = await crypto.subtle.importKey('raw', keyBytes, 'AES-GCM', false, ['encrypt']);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv, additionalData: utf8.encode(context) }, key, utf8.encode(value));
  return `enc:v1:${encode(iv)}:${encode(new Uint8Array(ciphertext))}`;
}
export async function unseal(value: string, keyBase64: string, context: string): Promise<string> {
  const parts = value.split(':');
  if (parts.length !== 4 || parts[0] !== 'enc' || parts[1] !== 'v1') throw new Error('CREDENTIAL_ENCODING_INVALID');
  const key = await crypto.subtle.importKey('raw', decode(keyBase64), 'AES-GCM', false, ['decrypt']);
  const clear = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: decode(parts[2]), additionalData: utf8.encode(context) }, key, decode(parts[3]));
  return new TextDecoder().decode(clear);
}
export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey('raw', utf8.encode(password), 'PBKDF2', false, ['deriveBits']);
  const hash = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' }, key, 256);
  return `pbkdf2:v1:${encode(salt)}:${encode(new Uint8Array(hash))}`;
}
export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  if (!stored.startsWith('pbkdf2:')) return await digest(password) === await digest(stored);
  try {
    const [scheme, version, salt, expected] = stored.split(':');
    if (scheme !== 'pbkdf2' || version !== 'v1' || !salt || !expected) return false;
    const key = await crypto.subtle.importKey('raw', utf8.encode(password), 'PBKDF2', false, ['deriveBits']);
    const actual = new Uint8Array(await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: decode(salt), iterations: 100000, hash: 'SHA-256' }, key, 256));
    const target = decode(expected);
    if (actual.length !== target.length) return false;
    let difference = 0; for (let i = 0; i < actual.length; i++) difference |= actual[i] ^ target[i];
    return difference === 0;
  } catch { return false; }
}
export async function verifyLineSignature(body: string, signature: string | null, secret: string): Promise<boolean> {
  if (!signature || !secret) return false;
  try {
    const key = await crypto.subtle.importKey('raw', utf8.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']);
    return crypto.subtle.verify('HMAC', key, decode(signature), utf8.encode(body));
  } catch { return false; }
}
