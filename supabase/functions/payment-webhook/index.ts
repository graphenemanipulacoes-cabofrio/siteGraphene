import { createClient } from 'npm:@supabase/supabase-js@2';

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const encoder = new TextEncoder();
const hex = (buffer: ArrayBuffer) => [...new Uint8Array(buffer)].map(byte => byte.toString(16).padStart(2, '0')).join('');
const safeEqual = (a: string, b: string) => a.length === b.length && [...a].reduce((result, char, index) => result | (char.charCodeAt(0) ^ b.charCodeAt(index)), 0) === 0;

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') return new Response('method_not_allowed', { status: 405 });
  const url = new URL(req.url);
  const dataId = url.searchParams.get('data.id') || url.searchParams.get('id') || '';
  const requestId = req.headers.get('x-request-id') || '';
  const parts = Object.fromEntries((req.headers.get('x-signature') || '').split(',').map(part => part.trim().split('=')));
  const secret = Deno.env.get('MERCADO_PAGO_WEBHOOK_SECRET') || '';
  if (!dataId || !requestId || !parts.ts || !parts.v1 || !secret) return new Response('unauthorized', { status: 401 });

  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const digest = hex(await crypto.subtle.sign('HMAC', key, encoder.encode(`id:${dataId};request-id:${requestId};ts:${parts.ts};`)));
  if (!safeEqual(digest, parts.v1)) return new Response('unauthorized', { status: 401 });

  const paymentResponse = await fetch(`https://api.mercadopago.com/v1/payments/${encodeURIComponent(dataId)}`, { headers: { Authorization: `Bearer ${Deno.env.get('MERCADO_PAGO_ACCESS_TOKEN')!}` } });
  if (!paymentResponse.ok) return new Response('provider_error', { status: 502 });
  const payment = await paymentResponse.json();
  const orderId = String(payment.external_reference || '');
  if (!uuidPattern.test(orderId)) return new Response('ignored', { status: 200 });

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
  const { data: order } = await admin.from('orders').select('id,total,payment_status').eq('id', orderId).maybeSingle();
  if (!order) return new Response('ignored', { status: 200 });
  const paid = payment.status === 'approved' && Math.abs(Number(payment.transaction_amount) - Number(order.total)) < 0.01;
  const cancelled = ['cancelled', 'refunded', 'charged_back'].includes(String(payment.status));
  const providerFee = Array.isArray(payment.fee_details) ? payment.fee_details.reduce((sum: number, fee: Record<string, unknown>) => sum + Number(fee.amount || 0), 0) : 0;
  const netAmount = Number(payment.transaction_details?.net_received_amount ?? (Number(payment.transaction_amount || 0) - providerFee));
  const paymentStatus = paid ? 'paid' : payment.status === 'refunded' ? 'refunded' : payment.status === 'rejected' ? 'failed' : cancelled ? 'failed' : 'pending';
  const { error: updateError } = await admin.from('orders').update({
    payment_status: paymentStatus,
    status: paid ? 'paid' : cancelled ? 'cancelled' : order.payment_status === 'paid' ? 'paid' : 'awaiting_payment',
    payment_method: payment.payment_type_id || payment.payment_method_id || null,
    payment_provider: 'mercado_pago', provider_fee: providerFee, net_amount: netAmount,
    payment_details: {
      provider: 'mercado_pago',
      payment_id: String(payment.id || dataId),
      installments: Number(payment.installments || 1),
      status_detail: String(payment.status_detail || ''),
    },
    paid_at: paid ? new Date().toISOString() : null, updated_at: new Date().toISOString(),
  }).eq('id', order.id);
  if (updateError) return new Response('database_error', { status: 502 });
  await admin.from('payment_events').insert({
    order_id: order.id, provider: 'mercado_pago', provider_payment_id: String(payment.id || dataId),
    status: String(payment.status || 'unknown'), status_detail: String(payment.status_detail || ''),
    payment_method: payment.payment_type_id || payment.payment_method_id || null,
    gross_amount: Number(payment.transaction_amount || 0), provider_fee: providerFee, net_amount: netAmount,
  });
  await admin.rpc('create_order_commissions', { p_order_id: order.id });
  return new Response('ok', { status: 200 });
});
