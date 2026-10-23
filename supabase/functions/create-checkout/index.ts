import { createClient } from 'npm:@supabase/supabase-js@2';

const json = (body: unknown, status = 200, origin?: string) => new Response(status === 204 ? null : JSON.stringify(body), {
  status,
  headers: {
    'Content-Type': 'application/json', 'Cache-Control': 'no-store',
    'Access-Control-Allow-Origin': origin || 'null',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-admin-token, x-region, x-retry-count, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version, traceparent, tracestate, baggage',
    'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Vary': 'Origin',
  },
});

const allowedOrigin = (requestOrigin: string | null) => {
  // Exact public origins of this same storefront, including its stable Vercel
  // address. Never allow every *.vercel.app deployment or unknown subdomains.
  const trusted = new Set(['https://www.graphenemanipulacoes.com.br', 'https://graphenemanipulacoes.com.br', 'https://site-graphene.vercel.app']);
  try { trusted.add(new URL(Deno.env.get('SITE_URL') || '').origin); } catch { /* Fail closed for invalid configuration. */ }
  const local = /^http:\/\/(localhost|127\.0\.0\.1):\d{2,5}$/.test(requestOrigin || '');
  return requestOrigin && (trusted.has(requestOrigin) || local) ? requestOrigin : null;
};

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const clean = (value: unknown, max: number) => typeof value === 'string' ? value.trim().slice(0, max) : '';
const paymentUrl = (value: unknown) => {
  try {
    const url = new URL(String(value));
    return url.protocol === 'https:' && !url.username && !url.password && !url.port
      && (url.hostname === 'mercadopago.com.br' || url.hostname.endsWith('.mercadopago.com.br')) ? url.href : null;
  } catch { return null; }
};

Deno.serve(async (req: Request) => {
  const origin = allowedOrigin(req.headers.get('origin'));
  if (req.method === 'OPTIONS') return json({}, origin ? 204 : 403, origin || undefined);
  if (!origin || req.method !== 'POST') return json({ error: 'request_not_allowed' }, 403, origin || undefined);
  const requestId = crypto.randomUUID();
  let stage = 'configuration';
  const fail = (error: string, status: number) => json({ error, requestId }, status, origin);
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const accessToken = Deno.env.get('MERCADO_PAGO_ACCESS_TOKEN');
    const configuredSite = new URL(Deno.env.get('SITE_URL') || 'https://www.graphenemanipulacoes.com.br');
    // Auth storage is origin-scoped. Return to the same trusted HTTPS store
    // that started checkout, so Vercel/apex customers do not lose their session.
    const siteUrl = origin.startsWith('https://') ? origin : configuredSite.origin;
    if (!accessToken || configuredSite.protocol !== 'https:') return fail('payment_provider_not_configured', 503);
    stage = 'authentication';
    const authHeader = req.headers.get('Authorization') || '';
    const authClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: authHeader } } });
    const { data: { user }, error: authError } = await authClient.auth.getUser();
    if (authError || !user?.email) return fail('authentication_required', 401);

    stage = 'validation';
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== 'object') return fail('invalid_cart', 400);
    const checkoutKey = clean(body.checkoutKey, 36);
    const couponCode = clean(body.couponCode, 40).toUpperCase();
    // Quantidade (apresentação) e sabor escolhidos; o preço vem sempre do cadastro, no banco.
    const variantId = (value: unknown) => /^[a-z0-9-]{1,40}$/.test(String(value ?? '')) ? String(value) : null;
    const items = Array.isArray(body.items) ? body.items.map((item: Record<string, unknown> | null) => ({ product_id: Number(item?.productId), quantity: Number(item?.quantity), size: variantId(item?.size), flavor: variantId(item?.flavor) })) : [];
    if (!uuidPattern.test(checkoutKey) || !items.length || items.length > 50 || items.some(item => !Number.isSafeInteger(item.product_id) || item.product_id < 1 || !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 20)) return fail('invalid_cart', 400);

    const shipping = {
      name: clean(body.shipping?.name, 120), phone: clean(body.shipping?.phone, 24), zip: clean(body.shipping?.zip, 12),
      address: clean(body.shipping?.address, 180), number: clean(body.shipping?.number, 20), complement: clean(body.shipping?.complement, 80),
      neighborhood: clean(body.shipping?.neighborhood, 80), city: clean(body.shipping?.city, 80), state: clean(body.shipping?.state, 2).toUpperCase(),
    };
    if (!shipping.name || !shipping.phone || !shipping.zip || !shipping.address || !shipping.number) return fail('invalid_shipping', 400);
    const customerDocument = clean(body.payerDocument, 14).replace(/\D/g, '');
    if (customerDocument.length !== 11) return fail('invalid_document', 400);

    const admin = createClient(supabaseUrl, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false, autoRefreshToken: false } });
    // One authoritative calculation, including delivery, for ALL products.
    stage = 'create_order';
    const { data: order, error: orderError } = await admin.rpc('create_checkout_order_v2', {
      p_customer_id: user.id, p_customer_email: user.email, p_checkout_key: checkoutKey, p_items: items, p_shipping_address: shipping,
      p_coupon_code: couponCode || null,
    });
    if (orderError || !order) {
      const reason = String(orderError?.message || '');
      const knownError = ['invalid_cart', 'invalid_shipping_address', 'invalid_or_unpriced_product', 'invalid_variant', 'invalid_shipping_zip', 'invalid_coupon', 'coupon_minimum_not_reached', 'invalid_order_total', 'checkout_already_completed', 'checkout_key_conflict']
        .find(code => reason.includes(code));
      console.error('checkout_order_failed', { requestId, stage, code: orderError?.code, reason: knownError || 'database_error' });
      return fail(knownError || 'unable_to_create_order', 422);
    }
    stage = 'load_order';
    const { data: stored, error: storedError } = await admin.from('orders')
      .select('id,payment_status,payment_url,payment_reference,customer_document')
      .eq('id', order.order_id).eq('customer_id', user.id).single();
    if (storedError || !stored) throw new Error('order_read_failed');
    if (!['pending', 'failed'].includes(stored.payment_status)) return fail('checkout_already_completed', 409);
    const existingUrl = paymentUrl(stored.payment_url);
    if (existingUrl && stored.payment_reference) return json({ orderId: order.order_id, paymentUrl: existingUrl, requestId }, 200, origin);
    if (!Array.isArray(order.items) || !order.items.length || !Number.isFinite(Number(order.total)) || Number(order.total) <= 0) return fail('invalid_order_total', 422);
    stage = 'save_document';
    const { error: documentError } = await admin.from('orders').update({ customer_document: customerDocument })
      .eq('id', order.order_id).eq('customer_id', user.id);
    if (documentError) throw new Error('order_document_failed');
    const preferenceItems = Number(order.discount || 0) > 0
      ? [{ id: `order-${order.order_id}`, title: `Pedido Graphène${couponCode ? ` · cupom ${couponCode}` : ''}`, currency_id: 'BRL', quantity: 1, unit_price: Number(order.total) }]
      : [
        ...order.items.map((item: Record<string, unknown>) => ({ id: String(item.product_id), title: item.title, currency_id: 'BRL', quantity: item.quantity, unit_price: Number(item.unit_price) })),
        // Frete calculado no pedido (painel admin > Frete e entrega).
        ...(Number(order.shipping || 0) > 0 ? [{ id: 'frete', title: 'Entrega', currency_id: 'BRL', quantity: 1, unit_price: Number(order.shipping) }] : []),
      ];

    const preferenceTotal = preferenceItems.reduce((sum, item) => sum + Math.round(item.unit_price * 100) * Number(item.quantity), 0);
    if (preferenceTotal !== Math.round(Number(order.total) * 100)) return fail('invalid_order_total', 422);
    stage = 'payment_provider';
    let preferenceResponse: Response;
    try {
      preferenceResponse = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json', 'X-Idempotency-Key': checkoutKey },
      body: JSON.stringify({
        external_reference: order.order_id,
        items: preferenceItems,
        payer: { email: user.email, name: shipping.name, identification: { type: 'CPF', number: customerDocument } },
        back_urls: { success: `${siteUrl}/pedido/retorno?status=success`, pending: `${siteUrl}/pedido/retorno?status=pending`, failure: `${siteUrl}/pedido/retorno?status=failure` },
        auto_return: 'approved', notification_url: `${supabaseUrl}/functions/v1/payment-webhook`,
      }),
      signal: AbortSignal.timeout(20000),
      });
    } catch {
      console.error('checkout_provider_unavailable', { requestId, stage });
      return fail('payment_provider_unavailable', 502);
    }
    const preference = await preferenceResponse.json().catch(() => null);
    const nextUrl = paymentUrl(preference?.init_point);
    if (!preferenceResponse.ok || !nextUrl || !preference?.id) {
      const providerError = [401, 403].includes(preferenceResponse.status)
        ? 'payment_provider_credentials_invalid'
        : preferenceResponse.status === 400
          ? 'payment_provider_request_rejected'
          : 'payment_provider_unavailable';
      console.error('mercado_pago_preference_failed', {
        requestId, stage, status: preferenceResponse.status,
      });
      return fail(providerError, 502);
    }
    stage = 'save_payment';
    const { data: saved, error: saveError } = await admin.from('orders')
      .update({ payment_reference: String(preference.id), payment_url: nextUrl, updated_at: new Date().toISOString() })
      .eq('id', order.order_id).eq('customer_id', user.id).in('payment_status', ['pending', 'failed']).select('id').single();
    if (saveError || !saved) throw new Error('order_payment_failed');
    return json({ orderId: order.order_id, paymentUrl: nextUrl, requestId }, 200, origin);
  } catch {
    console.error('checkout_failed', { requestId, stage });
    return fail('internal_error', 500);
  }
});
