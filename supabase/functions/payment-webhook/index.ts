import { createClient } from 'npm:@supabase/supabase-js@2';
import { toHex, uuidPattern } from '../_shared/counter-security.ts';
import { mpFetch, mpPaymentIdPattern, normalizePayment } from '../_shared/mercado-pago.ts';

// Aviso do Mercado Pago (Webhooks: ?data.id=<pagamento>&type=payment, com x-signature).
// Toda decisão sobre o pedido fica na RPC apply_mp_payment, que trava o pedido, segue a precedência
// de status e nunca rebaixa um pedido pago. Esta função não grava em orders diretamente.
// O IPN antigo (?id=&topic=) não pode ser validado pela assinatura: recebe 200 "ignored" sem consulta,
// para o Mercado Pago parar de reenviar. O aviso Webhooks do mesmo pagamento chega com data.id.

const safeEqual = (a: string, b: string) => a.length === b.length && [...a].reduce((result, char, index) => result | (char.charCodeAt(0) ^ b.charCodeAt(index)), 0) === 0;
const reply = (body: string, status: number) => new Response(body, { status, headers: { 'Content-Type': 'text/plain', 'Cache-Control': 'no-store' } });

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') return reply('method_not_allowed', 405);
  try {
    const url = new URL(req.url);
    const dataId = url.searchParams.get('data.id') || '';
    if (url.searchParams.get('topic') && !dataId) return reply('ignored', 200);

    const requestId = req.headers.get('x-request-id') || '';
    const parts = Object.fromEntries((req.headers.get('x-signature') || '').split(',').map(part => part.trim().split('=')));
    const secret = Deno.env.get('MERCADO_PAGO_WEBHOOK_SECRET') || '';
    if (!dataId || !requestId || !parts.ts || !parts.v1 || !secret) return reply('unauthorized', 401);
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    const digest = toHex(new Uint8Array(await crypto.subtle.sign('HMAC', key, encoder.encode(`id:${dataId.toLowerCase()};request-id:${requestId};ts:${parts.ts};`))));
    if (!safeEqual(digest, String(parts.v1))) return reply('unauthorized', 401);

    // Só avisos de pagamento, com número de pagamento.
    let type = url.searchParams.get('type') || '';
    if (!type) {
      const body = await req.json().catch(() => null);
      type = typeof body?.type === 'string' ? body.type : '';
    }
    if ((type && type !== 'payment') || !mpPaymentIdPattern.test(dataId)) return reply('ignored', 200);

    const accessToken = Deno.env.get('MERCADO_PAGO_ACCESS_TOKEN');
    if (!accessToken) return reply('provider_not_configured', 503);
    const fetched = await mpFetch(`/v1/payments/${dataId}`, { token: accessToken, timeoutMs: 15000 });
    if (fetched.status === 404) return reply('ignored', 200);
    if (!fetched.ok) {
      console.error('payment_webhook_provider_failed', { paymentId: dataId, status: fetched.status });
      return reply('provider_error', 502);
    }
    const payment = normalizePayment(fetched.data, dataId);
    if (!uuidPattern.test(payment.external_reference || '')) return reply('ignored', 200);

    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: applied, error } = await admin.rpc('apply_mp_payment', { p_payment: payment, p_source: 'webhook' });
    if (error) {
      const code = String(error.message || '');
      // Pagamento malformado ou de outro pedido: reenviar não muda nada.
      if (code === 'invalid_payment' || code === 'attempt_conflict') {
        console.error('payment_webhook_ignored', { paymentId: dataId, code });
        return reply('ignored', 200);
      }
      console.error('payment_webhook_failed', { paymentId: dataId, code: error.code || 'database_error' });
      return reply('database_error', 500);
    }
    if (!applied || applied.decision === 'unknown_order') return reply('ignored', 200);
    return reply('ok', 200);
  } catch {
    console.error('payment_webhook_failed', { code: 'internal_error' });
    return reply('internal_error', 500);
  }
});
