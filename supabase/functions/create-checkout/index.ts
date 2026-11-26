import { createClient } from 'npm:@supabase/supabase-js@2';
import { allowedOrigin, json } from '../_shared/http.ts';
import { uuidPattern } from '../_shared/counter-security.ts';
import { brickEnabledFor, brickSettings, checkoutModeSetting, itemsTotalCents, mpFetch, providerItems } from '../_shared/mercado-pago.ts';

// Modo do pagamento (segredo MERCADO_PAGO_CHECKOUT_MODE):
// - vazio/redirect: Checkout Pro, igual a antes (preferência e link do Mercado Pago);
// - brick: pagamento no próprio site (process-payment) para todos;
// - brick_staff: no site só para contas da equipe; os demais seguem no Checkout Pro.
// No modo do site esta função não chama o Mercado Pago: devolve o pedido, o valor (só para exibir),
// a Public Key e o máximo de parcelas.

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
    if (!uuidPattern.test(checkoutKey) || !items.length || items.length > 50 || items.some((item: { product_id: number; quantity: number }) => !Number.isSafeInteger(item.product_id) || item.product_id < 1 || !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 20)) return fail('invalid_cart', 400);

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
      .select('id,status,payment_status,payment_url,payment_reference,customer_document')
      .eq('id', order.order_id).eq('customer_id', user.id).single();
    if (storedError || !stored) throw new Error('order_read_failed');
    if (!['pending', 'failed'].includes(stored.payment_status)) return fail('checkout_already_completed', 409);

    stage = 'payment_mode';
    const brick = await brickEnabledFor(authClient, checkoutModeSetting());
    if (brick) {
      const settings = brickSettings();
      if (!settings) return fail('payment_provider_not_configured', 503);
      // Pedido reaproveitado pela mesma checkoutKey que não pode mais ser pago (cancelado, com mais de 7 dias
      // ou com produto fora do site): o navegador descarta a chave e cria outro pedido.
      stage = 'payment_state';
      const { data: paymentState, error: stateError } = await admin.rpc('order_payment_state', { p_order_id: order.order_id, p_customer_id: user.id });
      if (stateError || !paymentState || typeof paymentState !== 'object') throw new Error('order_state_failed');
      if (paymentState.reason === 'already_paid') return fail('checkout_already_completed', 409);
      if (stored.status !== 'awaiting_payment' || ['order_not_payable', 'order_expired'].includes(paymentState.reason)) return fail('checkout_restart_required', 409);
      const amount = Number(order.total);
      if (!Array.isArray(order.items) || !order.items.length || !Number.isFinite(amount) || amount <= 0) return fail('invalid_order_total', 422);
      stage = 'save_document';
      const { error: documentError } = await admin.from('orders').update({ customer_document: customerDocument })
        .eq('id', order.order_id).eq('customer_id', user.id);
      if (documentError) throw new Error('order_document_failed');
      return json({ orderId: order.order_id, paymentMode: 'brick', amount, publicKey: settings.publicKey, maxInstallments: settings.maxInstallments, requestId }, 200, origin);
    }

    // Checkout Pro (redirecionamento), igual a antes.
    const existingUrl = paymentUrl(stored.payment_url);
    if (existingUrl && stored.payment_reference) return json({ orderId: order.order_id, paymentMode: 'redirect', paymentUrl: existingUrl, requestId }, 200, origin);
    if (!Array.isArray(order.items) || !order.items.length || !Number.isFinite(Number(order.total)) || Number(order.total) <= 0) return fail('invalid_order_total', 422);
    stage = 'save_document';
    const { error: documentError } = await admin.from('orders').update({ customer_document: customerDocument })
      .eq('id', order.order_id).eq('customer_id', user.id);
    if (documentError) throw new Error('order_document_failed');
    const preferenceItems = providerItems({
      orderId: order.order_id, total: Number(order.total), discount: Number(order.discount || 0), shipping: Number(order.shipping || 0),
      items: order.items, couponCode, currency: true,
    });

    if (itemsTotalCents(preferenceItems) !== Math.round(Number(order.total) * 100)) return fail('invalid_order_total', 422);
    stage = 'payment_provider';
    const preferenceResponse = await mpFetch('/checkout/preferences', {
      token: accessToken, method: 'POST', idempotencyKey: checkoutKey, timeoutMs: 20000,
      body: {
        external_reference: order.order_id,
        items: preferenceItems,
        payer: { email: user.email, name: shipping.name, identification: { type: 'CPF', number: customerDocument } },
        back_urls: { success: `${siteUrl}/pedido/retorno?status=success`, pending: `${siteUrl}/pedido/retorno?status=pending`, failure: `${siteUrl}/pedido/retorno?status=failure` },
        auto_return: 'approved', notification_url: `${supabaseUrl}/functions/v1/payment-webhook`,
      },
    });
    if (preferenceResponse.network) {
      console.error('checkout_provider_unavailable', { requestId, stage });
      return fail('payment_provider_unavailable', 502);
    }
    const preference = preferenceResponse.data;
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
    return json({ orderId: order.order_id, paymentMode: 'redirect', paymentUrl: nextUrl, requestId }, 200, origin);
  } catch {
    console.error('checkout_failed', { requestId, stage });
    return fail('internal_error', 500);
  }
});
