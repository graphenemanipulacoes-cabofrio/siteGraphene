import { createClient } from 'npm:@supabase/supabase-js@2';
import { allowedOrigin, json } from '../_shared/http.ts';

const encoder = new TextEncoder();
const hex = (buffer: ArrayBuffer) => [...new Uint8Array(buffer)].map(byte => byte.toString(16).padStart(2, '0')).join('');
const sha256 = async (value: string) => hex(await crypto.subtle.digest('SHA-256', encoder.encode(value)));
const safeEqual = (a: string, b: string) => a.length === b.length && [...a].reduce((result, char, index) => result | (char.charCodeAt(0) ^ b.charCodeAt(index)), 0) === 0;
const clean = (value: unknown, max: number) => typeof value === 'string' ? value.trim().slice(0, max) : '';

Deno.serve(async (req: Request) => {
  const origin = allowedOrigin(req.headers.get('origin'));
  if (req.method === 'OPTIONS') return json({}, origin ? 204 : 403, origin || undefined);
  if (!origin || req.method !== 'POST') return json({ error: 'request_not_allowed' }, 403, origin || undefined);

  try {
    const body = await req.json();
    const username = clean(body.username, 80);
    const password = clean(body.password, 200);
    if (!username || !password) return json({ error: 'invalid_credentials' }, 401, origin);

    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: record } = await admin.from('admins').select('id,username,password').ilike('username', username).maybeSingle();
    if (!record?.password) return json({ error: 'invalid_credentials' }, 401, origin);

    const inputHash = await sha256(password);
    const storedIsHash = /^[a-f0-9]{64}$/i.test(record.password);
    const valid = storedIsHash ? safeEqual(inputHash, record.password.toLowerCase()) : safeEqual(password, record.password);
    if (!valid) return json({ error: 'invalid_credentials' }, 401, origin);

    if (!storedIsHash) await admin.from('admins').update({ password: inputHash }).eq('id', record.id);

    const random = new Uint8Array(32);
    crypto.getRandomValues(random);
    const token = btoa(String.fromCharCode(...random)).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
    const tokenHash = await sha256(token);
    const expiresAt = new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString();

    await admin.from('admin_sessions').delete().lt('expires_at', new Date().toISOString());
    const { error: sessionError } = await admin.from('admin_sessions').insert({
      token_hash: tokenHash, admin_username: record.username, expires_at: expiresAt,
    });
    if (sessionError) return json({ error: 'session_error' }, 500, origin);

    return json({ token, user: record.username, expiresAt }, 200, origin);
  } catch {
    return json({ error: 'internal_error' }, 500, origin || undefined);
  }
});
