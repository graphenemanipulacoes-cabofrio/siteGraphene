import { createClient } from 'npm:@supabase/supabase-js@2';

const json = (body: unknown, status = 200, origin?: string) => new Response(status === 204 ? null : JSON.stringify(body), {
  status,
  headers: {
    'Content-Type': 'application/json', 'Cache-Control': 'no-store',
    'Access-Control-Allow-Origin': origin || 'null',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-admin-token',
    'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Vary': 'Origin',
  },
});

const allowedOrigin = (requestOrigin: string | null) => {
  const siteUrl = Deno.env.get('SITE_URL') || '';
  const localOrigins = ['http://localhost:5173', 'http://127.0.0.1:5173'];
  return requestOrigin && (requestOrigin === siteUrl || localOrigins.includes(requestOrigin)) ? requestOrigin : null;
};

const encoder = new TextEncoder();
const hex = (buffer: ArrayBuffer) => [...new Uint8Array(buffer)].map(byte => byte.toString(16).padStart(2, '0')).join('');
const sha256 = async (value: string) => hex(await crypto.subtle.digest('SHA-256', encoder.encode(value)));
const clean = (value: unknown, max: number) => typeof value === 'string' ? value.trim().slice(0, max) : '';
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const allowedStatuses = new Set(['awaiting_payment', 'paid', 'processing', 'shipped', 'delivered', 'cancelled']);
const recipientRoles = new Set(['influencer', 'marketing', 'development', 'other']);
const commissionTypes = new Set(['percentage', 'fixed']);
const attributionScopes = new Set(['coupon', 'all_paid_orders']);

Deno.serve(async (req: Request) => {
  const origin = allowedOrigin(req.headers.get('origin'));
  if (req.method === 'OPTIONS') return json({}, origin ? 204 : 403, origin || undefined);
  if (!origin || req.method !== 'POST') return json({ error: 'request_not_allowed' }, 403, origin || undefined);

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const token = req.headers.get('x-admin-token') || '';
  if (token.length < 32 || token.length > 100) return json({ error: 'unauthorized' }, 401, origin);
  const tokenHash = await sha256(token);
  const now = new Date().toISOString();
  const { data: session } = await admin.from('admin_sessions').select('admin_username,expires_at').eq('token_hash', tokenHash).gt('expires_at', now).maybeSingle();
  if (!session) return json({ error: 'unauthorized' }, 401, origin);
  await admin.from('admin_sessions').update({ last_used_at: now }).eq('token_hash', tokenHash);

  try {
    const body = await req.json();
    if (body.action === 'logout') {
      await admin.from('admin_sessions').delete().eq('token_hash', tokenHash);
      return json({ ok: true }, 200, origin);
    }

    if (body.action === 'list') {
      const { data, error } = await admin.from('orders').select(`
        id,customer_email,customer_document,shipping_address,subtotal,shipping_amount,total,status,
        payment_status,payment_reference,payment_method,payment_details,paid_at,carrier,tracking_code,
        invoice_number,invoice_url,admin_notes,shipped_at,delivered_at,created_at,updated_at,
        order_items(id,product_id,product_name,unit_price,quantity)
      `).order('created_at', { ascending: false }).limit(250);
      if (error) return json({ error: 'unable_to_load_orders' }, 500, origin);
      return json({ orders: data || [] }, 200, origin);
    }

    if (body.action === 'finance_dashboard') {
      await admin.rpc('release_available_commissions');
      const [ordersResult, recipientsResult, couponsResult, commissionsResult, eventsResult] = await Promise.all([
        admin.from('orders').select('id,customer_email,subtotal,discount_code,discount_amount,total,provider_fee,net_amount,payment_provider,payment_status,payment_method,payment_reference,paid_at,status,created_at,commission_recipients(name,role)').order('created_at', { ascending: false }).limit(300),
        admin.from('commission_recipients').select('*').order('created_at', { ascending: false }),
        admin.from('discount_coupons').select('*,commission_recipients(name)').order('created_at', { ascending: false }),
        admin.from('commissions').select('*,commission_recipients(name,role),orders(id,customer_email,discount_code,total,paid_at)').order('created_at', { ascending: false }).limit(500),
        admin.from('payment_events').select('*').order('created_at', { ascending: false }).limit(120),
      ]);
      if (ordersResult.error || recipientsResult.error || couponsResult.error || commissionsResult.error || eventsResult.error) return json({ error: 'unable_to_load_finance' }, 500, origin);
      return json({ mercadoPagoConfigured: Boolean(Deno.env.get('MERCADO_PAGO_ACCESS_TOKEN')), orders: ordersResult.data || [], recipients: recipientsResult.data || [], coupons: couponsResult.data || [], commissions: commissionsResult.data || [], paymentEvents: eventsResult.data || [] }, 200, origin);
    }

    if (body.action === 'create_recipient') {
      const name = clean(body.name, 120);
      const role = clean(body.role, 30);
      const commissionType = clean(body.commissionType, 20);
      const scope = clean(body.attributionScope, 30);
      const commissionValue = Number(body.commissionValue);
      const holdDays = Number(body.holdDays);
      if (!name || !recipientRoles.has(role) || !commissionTypes.has(commissionType) || !attributionScopes.has(scope) || !Number.isFinite(commissionValue) || commissionValue < 0 || (commissionType === 'percentage' && commissionValue > 100) || !Number.isInteger(holdDays) || holdDays < 0 || holdDays > 180) return json({ error: 'invalid_recipient' }, 400, origin);
      const { data, error } = await admin.from('commission_recipients').insert({ name, role, email: clean(body.email, 320) || null, commission_type: commissionType, commission_value: commissionValue, attribution_scope: scope, hold_days: holdDays, is_active: true }).select().single();
      if (error) return json({ error: 'unable_to_create_recipient' }, 500, origin);
      return json({ recipient: data }, 200, origin);
    }

    if (body.action === 'update_recipient') {
      const id = clean(body.id, 36);
      const commissionValue = Number(body.commissionValue);
      const holdDays = Number(body.holdDays);
      const commissionType = clean(body.commissionType, 20);
      const scope = clean(body.attributionScope, 30);
      if (!uuidPattern.test(id) || !commissionTypes.has(commissionType) || !attributionScopes.has(scope) || !Number.isFinite(commissionValue) || commissionValue < 0 || (commissionType === 'percentage' && commissionValue > 100) || !Number.isInteger(holdDays) || holdDays < 0 || holdDays > 180) return json({ error: 'invalid_recipient' }, 400, origin);
      const { data, error } = await admin.from('commission_recipients').update({ commission_type: commissionType, commission_value: commissionValue, attribution_scope: scope, hold_days: holdDays, is_active: Boolean(body.isActive), updated_at: now }).eq('id', id).select().single();
      if (error) return json({ error: 'unable_to_update_recipient' }, 500, origin);
      return json({ recipient: data }, 200, origin);
    }

    if (body.action === 'create_coupon') {
      const recipientId = clean(body.recipientId, 36);
      const code = clean(body.code, 40).toUpperCase();
      const discountType = clean(body.discountType, 20);
      const discountValue = Number(body.discountValue);
      const minimumOrderAmount = Number(body.minimumOrderAmount || 0);
      const maxRedemptions = body.maxRedemptions === '' || body.maxRedemptions == null ? null : Number(body.maxRedemptions);
      if (!uuidPattern.test(recipientId) || !/^[A-Z0-9_-]{3,40}$/.test(code) || !commissionTypes.has(discountType) || !Number.isFinite(discountValue) || discountValue <= 0 || (discountType === 'percentage' && discountValue > 100) || !Number.isFinite(minimumOrderAmount) || minimumOrderAmount < 0 || (maxRedemptions !== null && (!Number.isInteger(maxRedemptions) || maxRedemptions < 1))) return json({ error: 'invalid_coupon' }, 400, origin);
      const { data, error } = await admin.from('discount_coupons').insert({ recipient_id: recipientId, code, discount_type: discountType, discount_value: discountValue, minimum_order_amount: minimumOrderAmount, max_redemptions: maxRedemptions, is_active: true }).select('*,commission_recipients(name)').single();
      if (error) return json({ error: error.code === '23505' ? 'coupon_exists' : 'unable_to_create_coupon' }, 409, origin);
      return json({ coupon: data }, 200, origin);
    }

    if (body.action === 'toggle_coupon') {
      const id = clean(body.id, 36);
      if (!uuidPattern.test(id)) return json({ error: 'invalid_coupon' }, 400, origin);
      const { data, error } = await admin.from('discount_coupons').update({ is_active: Boolean(body.isActive), updated_at: now }).eq('id', id).select('*,commission_recipients(name)').single();
      if (error) return json({ error: 'unable_to_update_coupon' }, 500, origin);
      return json({ coupon: data }, 200, origin);
    }

    if (body.action === 'settle_recipient_commissions') {
      const recipientId = clean(body.recipientId, 36);
      const reference = clean(body.reference, 160);
      if (!uuidPattern.test(recipientId) || !reference) return json({ error: 'invalid_payout' }, 400, origin);
      const { data: available, error: availableError } = await admin.from('commissions').select('id,amount').eq('recipient_id', recipientId).eq('status', 'available');
      if (availableError || !available?.length) return json({ error: 'no_available_commissions' }, 409, origin);
      const total = available.reduce((sum, commission) => sum + Number(commission.amount || 0), 0);
      const { error } = await admin.from('commissions').update({ status: 'paid', paid_at: now, payout_reference: reference, updated_at: now }).in('id', available.map(commission => commission.id));
      if (error) return json({ error: 'unable_to_register_payout' }, 500, origin);
      return json({ ok: true, total }, 200, origin);
    }

    if (body.action === 'list_admins') {
      const { data, error } = await admin.from('admins').select('id,username,created_at').order('created_at', { ascending: false });
      if (error) return json({ error: 'unable_to_load_admins' }, 500, origin);
      return json({ admins: data || [] }, 200, origin);
    }

    if (body.action === 'add_admin') {
      const username = clean(body.username, 80);
      const password = clean(body.password, 200);
      if (!/^[a-zA-Z0-9._-]{3,80}$/.test(username) || password.length < 10) return json({ error: 'invalid_admin' }, 400, origin);
      const passwordHash = await sha256(password);
      const { error } = await admin.from('admins').insert({ username, password: passwordHash });
      if (error) return json({ error: error.code === '23505' ? 'admin_exists' : 'unable_to_add_admin' }, 409, origin);
      return json({ ok: true }, 200, origin);
    }

    if (body.action === 'delete_admin') {
      const adminId = clean(String(body.adminId ?? ''), 80);
      if (!adminId) return json({ error: 'invalid_admin' }, 400, origin);
      const { data: target } = await admin.from('admins').select('username').eq('id', adminId).maybeSingle();
      const { count } = await admin.from('admins').select('id', { count: 'exact', head: true });
      if (!target) return json({ error: 'admin_not_found' }, 404, origin);
      if (target.username === session.admin_username || Number(count || 0) <= 1) return json({ error: 'protected_admin' }, 409, origin);
      const { error } = await admin.from('admins').delete().eq('id', adminId);
      if (error) return json({ error: 'unable_to_delete_admin' }, 500, origin);
      return json({ ok: true }, 200, origin);
    }

    if (body.action === 'update') {
      const orderId = clean(body.orderId, 36);
      const status = clean(body.status, 30);
      if (!uuidPattern.test(orderId) || !allowedStatuses.has(status)) return json({ error: 'invalid_update' }, 400, origin);
      const { data: current } = await admin.from('orders').select('payment_status,status').eq('id', orderId).maybeSingle();
      if (!current) return json({ error: 'order_not_found' }, 404, origin);
      if (['processing', 'shipped', 'delivered'].includes(status) && current.payment_status !== 'paid') {
        return json({ error: 'payment_not_confirmed' }, 409, origin);
      }

      const carrier = clean(body.carrier, 80);
      const trackingCode = clean(body.trackingCode, 100);
      if (status === 'shipped' && (!carrier || !trackingCode)) return json({ error: 'shipping_data_required' }, 400, origin);
      const update: Record<string, unknown> = {
        status, carrier: carrier || null, tracking_code: trackingCode || null,
        invoice_number: clean(body.invoiceNumber, 80) || null,
        invoice_url: clean(body.invoiceUrl, 500) || null,
        admin_notes: clean(body.adminNotes, 2000) || null,
        updated_at: now,
      };
      if (status === 'shipped' && current.status !== 'shipped') update.shipped_at = now;
      if (status === 'delivered' && current.status !== 'delivered') update.delivered_at = now;
      const { data, error } = await admin.from('orders').update(update).eq('id', orderId).select().single();
      if (error) return json({ error: 'unable_to_update_order' }, 500, origin);
      return json({ order: data }, 200, origin);
    }

    return json({ error: 'invalid_action' }, 400, origin);
  } catch {
    return json({ error: 'internal_error' }, 500, origin);
  }
});
