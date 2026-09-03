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

Deno.serve(async (req: Request) => {
  const origin = allowedOrigin(req.headers.get('origin'));
  if (req.method === 'OPTIONS') return new Response(null, { status: origin ? 204 : 403, headers: { 'Access-Control-Allow-Origin': origin || 'null', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Vary': 'Origin' } });
  if (!origin || req.method !== 'POST') return json({ error: 'request_not_allowed' }, 403, origin || undefined);

  try {
    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false, autoRefreshToken: false } });
    const token = req.headers.get('authorization') || '';
    const { data: auth, error: authError } = await admin.auth.getUser(token.replace(/^Bearer\s+/i, ''));
    if (authError || !auth.user) return json({ error: 'unauthorized' }, 401, origin);

    const { data: profile, error: profileError } = await admin.from('partner_profiles').select('id,full_name,email,phone,status,referral_code,requested_coupon_code,commission_recipient_id,coupon_id,approved_at,rejection_reason,created_at').eq('id', auth.user.id).maybeSingle();
    if (profileError) return json({ error: 'unable_to_load_profile' }, 500, origin);
    if (!profile) return json({ state: 'not_partner' }, 200, origin);
    if (profile.status !== 'approved' || !profile.commission_recipient_id) return json({ profile, metrics: null, orders: [], commissions: [] }, 200, origin);

    await admin.rpc('release_available_commissions');
    const [ordersResult, commissionsResult, couponResult] = await Promise.all([
      admin.from('orders').select('id,total,discount_code,discount_amount,payment_status,status,paid_at,created_at').eq('attributed_recipient_id', profile.commission_recipient_id).order('created_at', { ascending: false }).limit(100),
      admin.from('commissions').select('id,order_id,base_amount,amount,status,available_at,paid_at,created_at,orders(id,total,created_at,payment_status)').eq('recipient_id', profile.commission_recipient_id).order('created_at', { ascending: false }).limit(150),
      profile.coupon_id ? admin.from('discount_coupons').select('code,redeemed_count,max_redemptions,is_active,discount_type,discount_value').eq('id', profile.coupon_id).maybeSingle() : Promise.resolve({ data: null, error: null }),
    ]);
    // Uma falha pontual em um dos blocos de histórico não pode impedir o parceiro
    // de acessar o próprio painel. Os dados disponíveis continuam sendo exibidos.
    if (ordersResult.error || commissionsResult.error || couponResult.error) {
      console.error('partner_portal_dashboard_query_failure', {
        orders: ordersResult.error?.message,
        commissions: commissionsResult.error?.message,
        coupon: couponResult.error?.message,
      });
    }
    const orders = ordersResult.data || [];
    const commissions = commissionsResult.data || [];
    const paidOrders = orders.filter(order => order.payment_status === 'paid');
    const sum = (rows: any[], field: string) => rows.reduce((total, item) => total + Number(item[field] || 0), 0);
    const metrics = {
      paidSalesCount: paidOrders.length,
      paidSalesAmount: sum(paidOrders, 'total'),
      pendingCommission: sum(commissions.filter(item => item.status === 'pending'), 'amount'),
      availableCommission: sum(commissions.filter(item => item.status === 'available'), 'amount'),
      paidCommission: sum(commissions.filter(item => item.status === 'paid'), 'amount'),
      conversionOrders: orders.length,
    };
    return json({ profile, metrics, coupon: couponResult.data || null, orders, commissions }, 200, origin);
  } catch (error) {
    console.error('partner_portal_failure', error instanceof Error ? error.message : 'unknown');
    return json({ error: 'internal_error' }, 500, origin || undefined);
  }
});
