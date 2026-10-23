import { createClient } from 'npm:@supabase/supabase-js@2';
import { allowedOrigin, json } from '../_shared/http.ts';
import { adminUsernamePattern, hashPassword, hashToken, normalizeUsername, verifyAdminPassword } from '../_shared/counter-security.ts';

const clean = (value: unknown, max: number) => typeof value === 'string' ? value.trim().slice(0, max) : '';
// Token do painel: 32 bytes aleatórios em base64url (43 caracteres). Só o resumo SHA-256 fica no banco.
const newAdminToken = () => btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32)))).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');

Deno.serve(async (req: Request) => {
  const origin = allowedOrigin(req.headers.get('origin'));
  if (req.method === 'OPTIONS') return json({}, origin ? 204 : 403, origin || undefined);
  if (!origin || req.method !== 'POST') return json({ error: 'request_not_allowed' }, 403, origin || undefined);

  try {
    const body = await req.json();
    const username = clean(body?.username, 80);
    const password = clean(body?.password, 200);
    if (!username || !password) return json({ error: 'invalid_credentials' }, 401, origin);

    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // Limite no servidor: 12 tentativas a cada 15 minutos, por endereço e por usuário.
    // São as mesmas chaves do login da equipe, então errar lá também conta aqui.
    const ip = req.headers.get('cf-connecting-ip') || req.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown';
    const keys = ['ip:' + await hashToken(ip), 'user:' + await hashToken(normalizeUsername(username).slice(0, 100))];
    const { data: allowed, error: rateError } = await admin.rpc('counter_take_login_attempt', { p_keys: keys });
    if (rateError) return json({ error: 'login_unavailable' }, 503, origin);
    if (!allowed) return json({ error: 'too_many_attempts' }, 429, origin);

    const { data: record } = username.includes('*')
      ? { data: null }
      : await admin.from('admins').select('id,username,password').ilike('username', adminUsernamePattern(username)).maybeSingle();
    const match = record && String(record.username).toLowerCase() === username.toLowerCase() ? record : null;
    const { valid, upgrade } = await verifyAdminPassword(password, match?.password);
    if (!match || !valid) return json({ error: 'invalid_credentials' }, 401, origin);

    // Senhas antigas passam para o formato forte assim que o admin entra.
    if (upgrade) await admin.from('admins').update({ password: await hashPassword(password) }).eq('id', match.id);

    const token = newAdminToken();
    const expiresAt = new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString();
    await admin.from('admin_sessions').delete().lt('expires_at', new Date().toISOString());
    const { error: sessionError } = await admin.from('admin_sessions').insert({
      token_hash: await hashToken(token), admin_username: match.username, expires_at: expiresAt,
    });
    if (sessionError) return json({ error: 'session_error' }, 500, origin);
    await admin.from('counter_login_limits').delete().eq('key', keys[1]);

    return json({ token, user: match.username, expiresAt }, 200, origin);
  } catch {
    return json({ error: 'internal_error' }, 500, origin || undefined);
  }
});
