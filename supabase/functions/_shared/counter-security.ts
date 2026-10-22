const encoder = new TextEncoder();
export const toHex = (bytes: Uint8Array) => [...bytes].map(byte => byte.toString(16).padStart(2, '0')).join('');
const fromHex = (value: string) => Uint8Array.from(value.match(/.{2}/g) || [], byte => parseInt(byte, 16));
export const hashToken = async (value: string) => toHex(new Uint8Array(await crypto.subtle.digest('SHA-256', encoder.encode(value))));
export const newToken = () => toHex(crypto.getRandomValues(new Uint8Array(32)));
export const normalizeUsername = (value: unknown) => typeof value === 'string' ? value.trim().toLowerCase() : '';
export const validUsername = (value: string) => /^[a-z0-9._-]{3,60}$/.test(value);
export const validPassword = (value: unknown): value is string => typeof value === 'string' && value.length >= 12 && value.length <= 128;
const derive = async (password: string, salt: Uint8Array) => {
  const key = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits']);
  return toHex(new Uint8Array(await crypto.subtle.deriveBits({ name: 'PBKDF2', salt, iterations: 600_000, hash: 'SHA-256' }, key, 256)));
};
export const hashPassword = async (password: string) => {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  return `pbkdf2-sha256$600000$${toHex(salt)}$${await derive(password, salt)}`;
};
export const verifyPassword = async (password: string, stored: string) => {
  const match = /^pbkdf2-sha256\$600000\$([a-f0-9]{32})\$([a-f0-9]{64})$/.exec(stored);
  if (!match) return false;
  const actual = await derive(password, fromHex(match[1]));
  let difference = 0;
  for (let index = 0; index < actual.length; index++) difference |= actual.charCodeAt(index) ^ match[2].charCodeAt(index);
  return difference === 0;
};

export const orderStatuses = ['awaiting_payment', 'paid', 'processing', 'shipped', 'delivered', 'cancelled'];
export const paymentStatuses = ['pending', 'paid', 'failed', 'refunded'];
export const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export const requestIdPattern = /^\d{1,18}$/;
export function prescriptionReferences(value: unknown) {
  if (typeof value !== 'string') return [];
  try { const parsed = JSON.parse(value); return Array.isArray(parsed) ? parsed.filter(item => typeof item === 'string').slice(0, 15) : []; }
  catch { return value ? [value] : []; }
}
export function prescriptionLocation(reference: string, projectUrl: string) {
  if (/^intake\/[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(jpg|jpeg|png|pdf)$/i.test(reference)) {
    return { bucket: 'receitas-privadas', path: reference };
  }
  // Prescriptions sent by the first form, moved from the public bucket in Oct/2026.
  if (/^legacy\/\d{13}_[a-z0-9]{5,6}\.(jpg|jpeg|png|pdf)$/i.test(reference)) {
    return { bucket: 'receitas-privadas', path: reference };
  }
  try {
    const url = new URL(reference);
    const prefix = '/storage/v1/object/public/receitas/';
    const path = decodeURIComponent(url.pathname.slice(prefix.length));
    // Old references keep the former public URL; the file now lives in the private bucket.
    if (url.origin === new URL(projectUrl).origin && url.pathname.startsWith(prefix) && /^\d{13}_[a-z0-9]{5,6}\.(jpg|jpeg|png|pdf)$/i.test(path)) {
      return { bucket: 'receitas-privadas', path: 'legacy/' + path };
    }
  } catch { /* Never expose arbitrary user-provided URLs to staff. */ }
  return null;
}
