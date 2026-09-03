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

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const clean = (value: unknown, max: number) => typeof value === 'string' ? value.trim().slice(0, max) : '';

Deno.serve(async (req: Request) => {
  const origin = allowedOrigin(req.headers.get('origin'));
  if (req.method === 'OPTIONS') return json({}, origin ? 204 : 403, origin || undefined);
  if (!origin || req.method !== 'POST') return json({ error: 'request_not_allowed' }, 403, origin || undefined);
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const authHeader = req.headers.get('Authorization') || '';
    const authClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: authHeader } } });
    const { data: { user }, error: authError } = await authClient.auth.getUser();
    if (authError || !user?.email) return json({ error: 'authentication_required' }, 401, origin);

    const body = await req.json();
    const checkoutKey = clean(body.checkoutKey, 36);
    const couponCode = clean(body.couponCode, 40).toUpperCase();
    const items = Array.isArray(body.items) ? body.items.map((item: Record<string, unknown>) => ({ product_id: Number(item.productId), quantity: Number(item.quantity) })) : [];
    if (!uuidPattern.test(checkoutKey) || !items.length || items.length > 50 || items.some(item => !Number.isSafeInteger(item.product_id) || !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 20)) return json({ error: 'invalid_cart' }, 400, origin);

    const shipping = {
      name: clean(body.shipping?.name, 120), phone: clean(body.shipping?.phone, 24), zip: clean(body.shipping?.zip, 12),
      address: clean(body.shipping?.address, 180), number: clean(body.shipping?.number, 20), complement: clean(body.shipping?.complement, 80),
    };
    if (!shipping.name || !shipping.phone || !shipping.zip || !shipping.address || !shipping.number) return json({ error: 'invalid_shipping' }, 400, origin);
    const customerDocument = clean(body.payerDocument, 14).replace(/\D/g, '');
    if (customerDocument.length !== 11) return json({ error: 'invalid_document' }, 400, origin);

    const admin = createClient(supabaseUrl, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: order, error: orderError } = await admin.rpc('create_checkout_order', {
      p_customer_id: user.id, p_customer_email: user.email, p_checkout_key: checkoutKey, p_items: items, p_shipping_address: shipping,
      p_coupon_code: couponCode || null,
    });
    if (orderError || !order) return json({ error: 'unable_to_create_order' }, 422, origin);
    await admin.from('orders').update({ customer_document: customerDocument }).eq('id', order.order_id);

    const accessToken = Deno.env.get('MERCADO_PAGO_ACCESS_TOKEN');
    if (!accessToken) return json({ error: 'payment_provider_not_configured', orderId: order.order_id }, 503, origin);
    const siteUrl = Deno.env.get('SITE_URL')!;
    const preferenceItems = Number(order.discount || 0) > 0
      ? [{ id: `order-${order.order_id}`, title: `Pedido Graphène${couponCode ? ` · cupom ${couponCode}` : ''}`, currency_id: 'BRL', quantity: 1, unit_price: Number(order.total) }]
      : order.items.map((item: Record<string, unknown>) => ({ id: String(item.product_id), title: item.title, currency_id: 'BRL', quantity: item.quantity, unit_price: Number(item.unit_price) }));

    const preferenceResponse = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json', 'X-Idempotency-Key': checkoutKey },
      body: JSON.stringify({
        external_reference: order.order_id,
        items: preferenceItems,
        payer: { email: user.email, name: shipping.name, identification: body.payerDocument ? { type: 'CPF', number: clean(body.payerDocument, 14).replace(/\D/g, '') } : undefined },
        back_urls: { success: `${siteUrl}/pedido/retorno?status=success`, pending: `${siteUrl}/pedido/retorno?status=pending`, failure: `${siteUrl}/pedido/retorno?status=failure` },
        auto_return: 'approved', notification_url: `${supabaseUrl}/functions/v1/payment-webhook`,
      }),
    });
    const preference = await preferenceResponse.json();
    if (!preferenceResponse.ok || !preference.init_point) {
      await admin.from('orders').update({ payment_status: 'failed', updated_at: new Date().toISOString() }).eq('id', order.order_id);
      return json({ error: 'payment_provider_error', orderId: order.order_id }, 502, origin);
    }
    await admin.from('orders').update({ payment_reference: String(preference.id), payment_url: preference.init_point, updated_at: new Date().toISOString() }).eq('id', order.order_id);
    return json({ orderId: order.order_id, paymentUrl: preference.init_point }, 200, origin);
  } catch {
    return json({ error: 'internal_error' }, 500, origin || undefined);
  }
});
