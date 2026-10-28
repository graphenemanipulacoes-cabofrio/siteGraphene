import { createClient } from 'npm:@supabase/supabase-js@2.87.1';
import { allowedOrigin, json } from '../_shared/http.ts';

Deno.serve(async (req: Request) => {
  const origin = allowedOrigin(req.headers.get('origin'));
  if (req.method === 'OPTIONS') return json({}, origin ? 204 : 403, origin || undefined);
  if (!origin || req.method !== 'POST') return json({ error: 'request_not_allowed' }, 403, origin || undefined);
  try {
    const authorization = req.headers.get('Authorization') || '';
    if (!authorization.startsWith('Bearer ')) return json({ error: 'authentication_required' }, 401, origin);
    const auth = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authorization } }, auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: { user }, error: authError } = await auth.auth.getUser();
    if (authError || !user?.id) return json({ error: 'authentication_required' }, 401, origin);
    const raw = await req.text();
    if (raw.length > 2000) return json({ error: 'invalid_request' }, 400, origin);
    let body;
    try { body = JSON.parse(raw); } catch { return json({ error: 'invalid_request' }, 400, origin); }
    if (!body || !['search', 'validate'].includes(body.action)) return json({ error: 'invalid_request' }, 400, origin);
    const query = typeof body.query === 'string' ? body.query.trim().toUpperCase() : '';
    // No wildcards, arbitrary PostgREST filters or unbounded catalogue listing.
    if (query.length < 3 || query.length > 40 || !/^[\p{L}0-9 _-]+$/u.test(query)) {
      return body.action === 'search' ? json({ coupons: [] }, 200, origin) : json({ error: 'invalid_coupon' }, 422, origin);
    }
    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data, error } = await admin.rpc('lookup_checkout_coupons', { p_query: query, p_exact: body.action === 'validate' });
    if (error) throw new Error('lookup_failed');
    // Explicit projection: never return recipient IDs, contacts or commissions.
    const coupons = (data || []).slice(0, 6).map((row: Record<string, unknown>) => ({
      code: String(row.code), partnerName: String(row.partner_name),
      discountType: row.discount_type, discountValue: Number(row.discount_value), minimumOrderAmount: Number(row.minimum_order_amount),
    }));
    if (body.action === 'search') return json({ coupons }, 200, origin);
    const coupon = coupons[0];
    if (!coupon) return json({ error: 'invalid_coupon' }, 422, origin);
    if (typeof body.subtotal !== 'number' || !Number.isFinite(body.subtotal) || body.subtotal <= 0 || body.subtotal > 10_000_000) {
      return json({ error: 'invalid_subtotal' }, 400, origin);
    }
    const cents = Math.round(body.subtotal * 100);
    if (cents < Math.round(coupon.minimumOrderAmount * 100)) {
      return json({ error: 'coupon_minimum_not_reached', minimumOrderAmount: coupon.minimumOrderAmount }, 422, origin);
    }
    const discountCents = Math.min(cents, coupon.discountType === 'percentage'
      ? coupon.discountValue >= 100 ? cents : Math.floor((cents * Math.round(coupon.discountValue * 100) + 5000) / 10000)
      : Math.round(coupon.discountValue * 100));
    // Read-only estimate. The existing checkout RPC remains authoritative and
    // creates the order/attribution once; this endpoint never reserves a use.
    return json({ coupon: { ...coupon, discountAmount: discountCents / 100 } }, 200, origin);
  } catch {
    return json({ error: 'coupons_unavailable' }, 503, origin);
  }
});
