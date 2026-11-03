import { createClient } from 'npm:@supabase/supabase-js@2';
import { allowedOrigin, json } from '../_shared/http.ts';
import { authAccount } from '../_shared/counter-security.ts';

const clean = (value: unknown, max: number) => typeof value === 'string' ? value.trim().slice(0, max) : '';
const digits = (value: string) => value.replace(/\D/g, '');

// Solicitação de parceria pela conta do site, já com o e-mail confirmado.
// Esta função não cria contas: criar aqui, com e-mail confirmado à força, permitiria
// abrir conta com o e-mail de outra pessoa e continuar entrando nela depois.
Deno.serve(async (req: Request) => {
  const origin = allowedOrigin(req.headers.get('origin'));
  if (req.method === 'OPTIONS') return json({}, origin ? 204 : 403, origin || undefined);
  if (!origin || req.method !== 'POST') return json({ error: 'request_not_allowed' }, 403, origin || undefined);

  try {
    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false, autoRefreshToken: false } });
    const account = await authAccount(admin, req);
    if (!account) return json({ error: 'authentication_required' }, 401, origin);

    const body = await req.json();
    const fullName = clean(body.fullName, 120);
    const phone = clean(body.phone, 30);
    const document = digits(clean(body.document, 24));
    const pixKey = clean(body.pixKey, 160);
    const channel = clean(body.channel, 120);
    const requestedCouponCode = clean(body.requestedCouponCode, 40).toUpperCase();

    if (!fullName || digits(phone).length < 10 || document.length < 11 || !pixKey) return json({ error: 'invalid_registration' }, 400, origin);
    if (requestedCouponCode && !/^[A-Z0-9_-]{3,40}$/.test(requestedCouponCode)) return json({ error: 'invalid_coupon_code' }, 400, origin);

    const { data: existing } = await admin.from('partner_profiles').select('id').eq('id', account.id).maybeSingle();
    if (existing) return json({ error: 'already_registered' }, 409, origin);

    const { error } = await admin.from('partner_profiles').insert({
      id: account.id, full_name: fullName, email: account.email, phone, document, pix_key: pixKey,
      channel: channel || null, requested_coupon_code: requestedCouponCode || null, status: 'pending',
    });
    if (error) return json({ error: error.code === '23505' ? 'already_registered' : 'unable_to_create_registration' }, error.code === '23505' ? 409 : 500, origin);
    return json({ ok: true }, 201, origin);
  } catch {
    return json({ error: 'internal_error' }, 500, origin || undefined);
  }
});
