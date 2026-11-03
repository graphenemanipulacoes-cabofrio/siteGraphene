import { createClient } from 'npm:@supabase/supabase-js@2';
import { allowedOrigin, json } from '../_shared/http.ts';
import { clientIp, normalizeEmail, takeRateLimit, validAccountPassword, validEmail } from '../_shared/counter-security.ts';

// Cadastro de clientes sem confirmação de e-mail, com limite de tentativas no servidor.
// "Confirm email" continua ligado no Supabase: o cadastro direto pela API pública não gera
// conta utilizável, então este limite não pode ser contornado.
const MAX_SIGNUPS_PER_HOUR = 10;

Deno.serve(async (req: Request) => {
  const origin = allowedOrigin(req.headers.get('origin'));
  if (req.method === 'OPTIONS') return json({}, origin ? 204 : 403, origin || undefined);
  if (!origin || req.method !== 'POST') return json({ error: 'request_not_allowed' }, 403, origin || undefined);

  try {
    const raw = await req.text();
    if (raw.length > 2000) return json({ error: 'invalid_signup' }, 400, origin);
    const body = JSON.parse(raw);
    const email = normalizeEmail(body?.email);
    const password = body?.password;
    const fullName = typeof body?.fullName === 'string' ? body.fullName.trim().slice(0, 120) : '';
    if (!validEmail(email) || !validAccountPassword(password) || fullName.length < 2) return json({ error: 'invalid_signup' }, 400, origin);

    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false, autoRefreshToken: false } });
    const allowed = await takeRateLimit(admin, 'cadastro-ip', clientIp(req), MAX_SIGNUPS_PER_HOUR, 3600);
    if (allowed === null) return json({ error: 'signup_unavailable' }, 503, origin);
    if (!allowed) return json({ error: 'too_many_requests' }, 429, origin);

    const { error } = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { full_name: fullName } });
    if (!error) return json({ ok: true }, 201, origin);
    if (error.code === 'email_exists' || error.code === 'user_already_exists') return json({ error: 'already_registered' }, 409, origin);
    if (error.code === 'weak_password') return json({ error: 'weak_password' }, 400, origin);
    if (error.code === 'email_address_invalid' || error.code === 'validation_failed') return json({ error: 'invalid_signup' }, 400, origin);
    console.error('customer_signup_failed', error.code || 'unknown');
    return json({ error: 'signup_unavailable' }, 503, origin);
  } catch {
    return json({ error: 'invalid_signup' }, 400, origin);
  }
});
