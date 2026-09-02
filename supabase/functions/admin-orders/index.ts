import { createClient } from 'npm:@supabase/supabase-js@2';
import { allowedOrigin, json } from '../_shared/http.ts';

const encoder = new TextEncoder();
const hex = (buffer: ArrayBuffer) => [...new Uint8Array(buffer)].map(byte => byte.toString(16).padStart(2, '0')).join('');
const sha256 = async (value: string) => hex(await crypto.subtle.digest('SHA-256', encoder.encode(value)));
const clean = (value: unknown, max: number) => typeof value === 'string' ? value.trim().slice(0, max) : '';
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const allowedStatuses = new Set(['awaiting_payment', 'paid', 'processing', 'shipped', 'delivered', 'cancelled']);

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
