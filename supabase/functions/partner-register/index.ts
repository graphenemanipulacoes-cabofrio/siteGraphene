import { createClient } from 'npm:@supabase/supabase-js@2';

const json = (body: unknown, status = 200, origin?: string) => new Response(JSON.stringify(body), {
  status,
  headers: {
    'Content-Type': 'application/json', 'Cache-Control': 'no-store',
    'Access-Control-Allow-Origin': origin || 'null',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Vary': 'Origin',
  },
});

const allowedOrigin = (requestOrigin: string | null) => {
  const siteUrl = Deno.env.get('SITE_URL') || '';
  const localOrigins = ['http://localhost:5173', 'http://127.0.0.1:5173'];
  return requestOrigin && (requestOrigin === siteUrl || localOrigins.includes(requestOrigin)) ? requestOrigin : null;
};

const clean = (value: unknown, max: number) => typeof value === 'string' ? value.trim().slice(0, max) : '';
const digits = (value: string) => value.replace(/\D/g, '');

Deno.serve(async (req: Request) => {
  const origin = allowedOrigin(req.headers.get('origin'));
  if (req.method === 'OPTIONS') return new Response(null, { status: origin ? 204 : 403, headers: { 'Access-Control-Allow-Origin': origin || 'null', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Vary': 'Origin' } });
  if (!origin || req.method !== 'POST') return json({ error: 'request_not_allowed' }, 403, origin || undefined);

  try {
    const body = await req.json();
    const fullName = clean(body.fullName, 120);
    const email = clean(body.email, 320).toLowerCase();
    const password = clean(body.password, 200);
    const phone = clean(body.phone, 30);
    const document = digits(clean(body.document, 24));
    const pixKey = clean(body.pixKey, 160);
    const channel = clean(body.channel, 120);
    const requestedCouponCode = clean(body.requestedCouponCode, 40).toUpperCase();

    if (!fullName || !/^\S+@\S+\.\S+$/.test(email) || password.length < 10 || digits(phone).length < 10 || document.length < 11 || !pixKey) {
      return json({ error: 'invalid_registration' }, 400, origin);
    }
    if (requestedCouponCode && !/^[A-Z0-9_-]{3,40}$/.test(requestedCouponCode)) return json({ error: 'invalid_coupon_code' }, 400, origin);

    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: existingProfile } = await admin.from('partner_profiles').select('id').eq('email', email).maybeSingle();
    if (existingProfile) return json({ error: 'email_already_registered' }, 409, origin);

    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName, account_type: 'partner' },
    });
    if (createError || !created.user) return json({ error: 'email_already_registered' }, 409, origin);

    const { error: profileError } = await admin.from('partner_profiles').insert({
      id: created.user.id, full_name: fullName, email, phone, document, pix_key: pixKey,
      channel: channel || null, requested_coupon_code: requestedCouponCode || null, status: 'pending',
    });
    if (profileError) {
      await admin.auth.admin.deleteUser(created.user.id);
      return json({ error: 'unable_to_create_registration' }, 500, origin);
    }
    return json({ ok: true }, 201, origin);
  } catch {
    return json({ error: 'internal_error' }, 500, origin || undefined);
  }
});
