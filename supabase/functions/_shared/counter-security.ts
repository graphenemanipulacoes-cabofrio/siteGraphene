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

// Login único por e-mail (Supabase Auth). A senha fica só no Supabase Auth; o papel
// vem do e-mail da conta: admins.email (todas as áreas) ou counter_accounts.email (equipe).
export const normalizeEmail = (value: unknown) => typeof value === 'string' ? value.trim().toLowerCase().slice(0, 320) : '';
export const validEmail = (value: string) => value.length <= 320 && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value);
// Senha definida pelo admin ao cadastrar alguém sem conta (mesmo mínimo da tela de cadastro).
export const validAccountPassword = (value: unknown): value is string => typeof value === 'string' && value.length >= 10 && value.length <= 128;
// Conta conectada (cabeçalho Authorization enviado pelo supabase-js). Sem sessão: null.
// deno-lint-ignore no-explicit-any
export async function authAccount(db: any, req: Request) {
  const jwt = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
  if (!jwt) return null;
  const { data, error } = await db.auth.getUser(jwt);
  const email = normalizeEmail(data?.user?.email);
  return error || !data?.user || !email ? null : { id: String(data.user.id), email };
}
// deno-lint-ignore no-explicit-any
export async function isAdminEmail(db: any, email: string) {
  if (!email) return false;
  const { data, error } = await db.from('admins').select('id').eq('email', email).maybeSingle();
  return !error && Boolean(data);
}
// Token do painel: 32 bytes aleatórios em base64url (43 caracteres). Só o resumo SHA-256 fica no banco.
export const newAdminToken = () => btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32)))).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
// deno-lint-ignore no-explicit-any
export async function issueAdminSession(db: any, email: string) {
  const token = newAdminToken();
  const expiresAt = new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString();
  await db.from('admin_sessions').delete().lt('expires_at', new Date().toISOString());
  const { error } = await db.from('admin_sessions').insert({ token_hash: await hashToken(token), admin_username: email, expires_at: expiresAt });
  return error ? null : { token, expiresAt };
}
// Admin cadastra alguém (admin ou equipe): cria a conta já confirmada se ainda não existir,
// ou troca a senha se ele informou uma nova. Sem conta e sem senha, a pessoa cria a própria.
// deno-lint-ignore no-explicit-any
export async function ensureAuthAccount(db: any, email: string, password: string) {
  const { data: existingId, error } = await db.rpc('auth_user_id_by_email', { p_email: email });
  if (error) return { error: 'unable_to_check_account' };
  if (existingId) {
    if (!password) return { id: String(existingId), created: false };
    const { error: updateError } = await db.auth.admin.updateUserById(existingId, { password });
    return updateError ? { error: 'invalid_password' } : { id: String(existingId), created: false, passwordChanged: true };
  }
  if (!password) return { error: 'password_required' };
  const { data, error: createError } = await db.auth.admin.createUser({ email, password, email_confirm: true });
  return createError || !data?.user ? { error: 'invalid_password' } : { id: String(data.user.id), created: true };
}

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
