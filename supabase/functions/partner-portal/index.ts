import { createClient } from 'npm:@supabase/supabase-js@2';
import { allowedOrigin, json } from '../_shared/http.ts';
import { authAccount, isAdminEmail, takeRateLimit, uuidPattern } from '../_shared/counter-security.ts';
import { monthKey, partnerGoal, partnerSales, partnerStatus, todayInBrazil } from '../_shared/partner-results.ts';

const profileFields = 'id,full_name,email,phone,status,referral_code,requested_coupon_code,commission_recipient_id,coupon_id,approved_at,rejection_reason,created_at,avatar_path';
const AVATAR_TYPES: Record<string, string> = { webp: 'image/webp', jpg: 'image/jpeg' };

// Foto de perfil da página do link (/cupom/CODIGO), no bucket público "parceiros", pasta da própria conta.
// Só a própria conta com parceria cadastrada (em análise ou aprovada) troca a foto; o administrador só vê.
// deno-lint-ignore no-explicit-any
async function avatarAction(admin: any, account: { id: string }, body: any, origin: string) {
  const { data: me, error: meError } = await admin.from('partner_profiles').select('id').eq('id', account.id).maybeSingle();
  if (meError) return json({ error: 'unable_to_load_profile' }, 500, origin);
  if (!me) return json({ error: 'not_partner' }, 403, origin);
  const folder = account.id;
  const bucket = admin.storage.from('parceiros');
  // Apaga da pasta tudo o que não for a foto atual (envios abandonados e a foto anterior).
  const clearFolder = async (keep: string | null) => {
    const { data: files } = await bucket.list(folder, { limit: 100 });
    const stale = (files || []).map((file: { name: string }) => `${folder}/${file.name}`).filter((path: string) => path !== keep);
    if (stale.length) await bucket.remove(stale);
  };
  const saveProfile = (avatarPath: string | null) => admin.from('partner_profiles').update({ avatar_path: avatarPath, updated_at: new Date().toISOString() }).eq('id', folder);

  if (body.action === 'avatar_upload') {
    const extension = typeof body.extension === 'string' ? body.extension.toLowerCase() : '';
    if (!AVATAR_TYPES[extension]) return json({ error: 'invalid_image_type' }, 400, origin);
    if (await takeRateLimit(admin, 'foto-parceira', folder, 20, 3600) === false) return json({ error: 'too_many_requests' }, 429, origin);
    const path = `${folder}/avatar-${Date.now()}.${extension}`;
    const { data, error } = await bucket.createSignedUploadUrl(path);
    if (error || !data?.token) return json({ error: 'unable_to_prepare_upload' }, 500, origin);
    return json({ path: data.path, token: data.token, contentType: AVATAR_TYPES[extension] }, 200, origin);
  }
  if (body.action === 'avatar_save') {
    const path = typeof body.path === 'string' ? body.path : '';
    if (!new RegExp(`^${folder}/avatar-[0-9]{10,16}\\.(webp|jpg)$`).test(path)) return json({ error: 'invalid_avatar' }, 400, origin);
    const name = path.slice(folder.length + 1);
    const { data: found } = await bucket.list(folder, { search: name, limit: 10 });
    if (!(found || []).some((file: { name: string }) => file.name === name)) return json({ error: 'invalid_avatar' }, 400, origin);
    const { error } = await saveProfile(path);
    if (error) return json({ error: 'unable_to_save_avatar' }, 500, origin);
    await clearFolder(path);
    return json({ avatarPath: path }, 200, origin);
  }
  if (body.action === 'avatar_remove') {
    const { error } = await saveProfile(null);
    if (error) return json({ error: 'unable_to_save_avatar' }, 500, origin);
    await clearFolder(null);
    return json({ avatarPath: null }, 200, origin);
  }
  return json({ error: 'invalid_action' }, 400, origin);
}

Deno.serve(async (req: Request) => {
  const origin = allowedOrigin(req.headers.get('origin'));
  if (req.method === 'OPTIONS') return json({}, origin ? 204 : 403, origin || undefined);
  if (!origin || req.method !== 'POST') return json({ error: 'request_not_allowed' }, 403, origin || undefined);

  try {
    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false, autoRefreshToken: false } });
    const account = await authAccount(admin, req);
    if (!account) return json({ error: 'unauthorized' }, 401, origin);
    const body = await req.json().catch(() => ({}));
    if (typeof body?.action === 'string' && body.action.startsWith('avatar_')) return await avatarAction(admin, account, body, origin);
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
    const currentMonth = monthKey(new Date());
    const [ordersResult, commissionsResult, couponResult, creditsResult, termsResult, deliveryResult, paidResult] = await Promise.all([
      admin.from('orders').select('id,subtotal,total,discount_code,discount_amount,payment_status,status,paid_at,created_at').eq('attributed_recipient_id', profile.commission_recipient_id).order('created_at', { ascending: false }).limit(100),
      admin.from('commissions').select('id,order_id,base_amount,amount,status,available_at,paid_at,created_at,orders(id,total,created_at,payment_status)').eq('recipient_id', profile.commission_recipient_id).order('created_at', { ascending: false }).limit(150),
      profile.coupon_id ? admin.from('discount_coupons').select('code,redeemed_count,max_redemptions,is_active,discount_type,discount_value').eq('id', profile.coupon_id).maybeSingle() : Promise.resolve({ data: null, error: null }),
      admin.from('partner_product_credits').select('id,type,amount,description,invoice_ref,spent_at,created_at').eq('partner_id', profile.id).order('spent_at', { ascending: false }).limit(100),
      admin.from('partner_terms').select('test_start,test_days,monthly_minimum,monthly_goal,monthly_vale,reels_per_month,stories_per_month,phase').eq('recipient_id', profile.commission_recipient_id).maybeSingle(),
      admin.from('partner_deliveries').select('reels,stories').eq('recipient_id', profile.commission_recipient_id).eq('month', `${currentMonth}-01`).maybeSingle(),
      admin.from('orders').select('subtotal,discount_amount,payment_status,paid_at,created_at,customer_id,customer_email').eq('attributed_recipient_id', profile.commission_recipient_id).eq('payment_status', 'paid').limit(5000),
    ]);
    // Uma falha pontual em um dos blocos de histórico não pode impedir o parceiro
    // de acessar o próprio painel. Os dados disponíveis continuam sendo exibidos.
    if (ordersResult.error || commissionsResult.error || couponResult.error || creditsResult.error || termsResult.error || deliveryResult.error || paidResult.error) {
      console.error('partner_portal_dashboard_query_failure', {
        orders: ordersResult.error?.message,
        commissions: commissionsResult.error?.message,
        coupon: couponResult.error?.message,
        credits: creditsResult.error?.message,
        terms: termsResult.error?.message,
        delivery: deliveryResult.error?.message,
        paid: paidResult.error?.message,
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
      // O volume segue a mesma base da comissão: valor pago em produtos, sem frete.
      paidSalesAmount: paidOrders.reduce((total, order) => total + Math.max(Number(order.subtotal || 0) - Number(order.discount_amount || 0), 0), 0),
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
    // Meta da parceria: só vendas e entregas. Custos e lucro nunca saem desta função.
    const terms = paidResult.error ? null : termsResult.data || null;
    const sales = partnerSales(paidResult.data || [], profile, currentMonth, terms?.test_start || null);
    const goal = partnerGoal(terms, partnerStatus(terms, { today: todayInBrazil(), salesSinceStart: sales.sinceStart, monthlySales: sales.monthlySales, currentMonth }), sales.monthSales, deliveryResult.data || null);
    return json({ profile, metrics, productCredits, coupon: couponResult.data || null, orders, commissions, goal, adminView, partners }, 200, origin);
  } catch (error) {
    console.error('partner_portal_failure', error instanceof Error ? error.message : 'unknown');
    return json({ error: 'internal_error' }, 500, origin || undefined);
  }
});
