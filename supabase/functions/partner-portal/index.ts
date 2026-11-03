import { createClient } from 'npm:@supabase/supabase-js@2';
import { allowedOrigin, json } from '../_shared/http.ts';
import { authAccount, isAdminEmail, uuidPattern } from '../_shared/counter-security.ts';

const profileFields = 'id,full_name,email,phone,status,referral_code,requested_coupon_code,commission_recipient_id,coupon_id,approved_at,rejection_reason,created_at';

Deno.serve(async (req: Request) => {
  const origin = allowedOrigin(req.headers.get('origin'));
  if (req.method === 'OPTIONS') return json({}, origin ? 204 : 403, origin || undefined);
  if (!origin || req.method !== 'POST') return json({ error: 'request_not_allowed' }, 403, origin || undefined);

  try {
    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false, autoRefreshToken: false } });
    const account = await authAccount(admin, req);
    if (!account) return json({ error: 'unauthorized' }, 401, origin);
    const body = await req.json().catch(() => ({}));
    const requestedPartner = typeof body?.partnerId === 'string' ? body.partnerId.trim() : '';

    const { data: ownProfile, error: profileError } = await admin.from('partner_profiles').select(profileFields).eq('id', account.id).maybeSingle();
    if (profileError) return json({ error: 'unable_to_load_profile' }, 500, origin);

    // Administradores abrem o painel de qualquer parceiro (somente leitura).
    let profile = ownProfile;
    let adminView = false;
    let partners: unknown[] | undefined;
    if (requestedPartner || !ownProfile) {
      if (!await isAdminEmail(admin, account.email)) return ownProfile ? json({ error: 'forbidden' }, 403, origin) : json({ state: 'not_partner' }, 200, origin);
      const { data: list, error: listError } = await admin.from('partner_profiles').select('id,full_name,email,status,referral_code,created_at').order('created_at', { ascending: false }).limit(500);
      if (listError) return json({ error: 'unable_to_load_profile' }, 500, origin);
      partners = list || [];
      if (!requestedPartner) return json({ state: 'admin', partners }, 200, origin);
      if (!uuidPattern.test(requestedPartner)) return json({ error: 'invalid_partner' }, 400, origin);
      const { data: chosen, error: chosenError } = await admin.from('partner_profiles').select(profileFields).eq('id', requestedPartner).maybeSingle();
      if (chosenError) return json({ error: 'unable_to_load_profile' }, 500, origin);
      if (!chosen) return json({ error: 'partner_not_found' }, 404, origin);
      profile = chosen;
      adminView = true;
    }
    if (!profile) return json({ state: 'not_partner' }, 200, origin);
    if (profile.status !== 'approved' || !profile.commission_recipient_id) return json({ profile, metrics: null, orders: [], commissions: [], adminView, partners }, 200, origin);

    await admin.rpc('release_available_commissions');
    const [ordersResult, commissionsResult, couponResult, creditsResult] = await Promise.all([
      admin.from('orders').select('id,total,discount_code,discount_amount,payment_status,status,paid_at,created_at').eq('attributed_recipient_id', profile.commission_recipient_id).order('created_at', { ascending: false }).limit(100),
      admin.from('commissions').select('id,order_id,base_amount,amount,status,available_at,paid_at,created_at,orders(id,total,created_at,payment_status)').eq('recipient_id', profile.commission_recipient_id).order('created_at', { ascending: false }).limit(150),
      profile.coupon_id ? admin.from('discount_coupons').select('code,redeemed_count,max_redemptions,is_active,discount_type,discount_value').eq('id', profile.coupon_id).maybeSingle() : Promise.resolve({ data: null, error: null }),
      admin.from('partner_product_credits').select('id,type,amount,description,invoice_ref,spent_at,created_at').eq('partner_id', profile.id).order('spent_at', { ascending: false }).limit(100),
    ]);
    // Uma falha pontual em um dos blocos de histórico não pode impedir o parceiro
    // de acessar o próprio painel. Os dados disponíveis continuam sendo exibidos.
    if (ordersResult.error || commissionsResult.error || couponResult.error || creditsResult.error) {
      console.error('partner_portal_dashboard_query_failure', {
        orders: ordersResult.error?.message,
        commissions: commissionsResult.error?.message,
        coupon: couponResult.error?.message,
        credits: creditsResult.error?.message,
      });
    }
    const orders = ordersResult.data || [];
    const commissions = commissionsResult.data || [];
    const credits = creditsResult.data || [];
    const paidOrders = orders.filter(order => order.payment_status === 'paid');
    // deno-lint-ignore no-explicit-any
    const sum = (rows: any[], field: string) => rows.reduce((total, item) => total + Number(item[field] || 0), 0);
    const metrics = {
      paidSalesCount: paidOrders.length,
      paidSalesAmount: sum(paidOrders, 'total'),
      pendingCommission: sum(commissions.filter(item => item.status === 'pending'), 'amount'),
      availableCommission: sum(commissions.filter(item => item.status === 'available'), 'amount'),
      paidCommission: sum(commissions.filter(item => item.status === 'paid'), 'amount'),
      conversionOrders: orders.length,
    };
    const grantedCredits = sum(credits.filter(item => item.type === 'grant'), 'amount');
    const usedCredits = sum(credits.filter(item => item.type === 'usage'), 'amount');
    const productCredits = {
      granted: grantedCredits,
      used: usedCredits,
      balance: Math.max(0, grantedCredits - usedCredits),
      movements: credits,
    };
    return json({ profile, metrics, productCredits, coupon: couponResult.data || null, orders, commissions, adminView, partners }, 200, origin);
  } catch (error) {
    console.error('partner_portal_failure', error instanceof Error ? error.message : 'unknown');
    return json({ error: 'internal_error' }, 500, origin || undefined);
  }
});
