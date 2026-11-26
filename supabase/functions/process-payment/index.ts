import { createClient } from 'npm:@supabase/supabase-js@2';
import { allowedOrigin, json } from '../_shared/http.ts';
import { clientIp, takeRateLimit, uuidPattern } from '../_shared/counter-security.ts';
import {
  brickEnabledFor, brickSettings, checkoutModeSetting, itemsTotalCents, maxInstallmentsSetting, mpCauseCodes, mpCompact, mpDigits, mpFetch,
  mpPaymentIdPattern, mpSafeCode, normalizePayment, phoneParts, pixExpiration, providerItems, splitName,
} from '../_shared/mercado-pago.ts';

// Pagamento no próprio site (cartão de crédito pelo Payment Brick e Pix próprio), com a conta do cliente.
// Ações: pay (cria ou repete uma tentativa), status (retoma o pagamento e serve de reserva para o aviso)
// e cancel_pix (cancela o Pix aberto do pedido). O valor vem sempre do banco (begin_payment_attempt);
// valor, e-mail, descrição ou referência enviados pelo navegador são ignorados.
// Logs: só requestId, etapa, ids, status, status_detail, método, parcelas, HTTP e códigos numéricos.
// Nunca token do cartão, CPF, e-mail, nome, telefone, endereço, QR do Pix ou corpo do Mercado Pago.

// Bandeiras de crédito aceitas como cartão (a mesma lista de ACCEPTED_CARD_BRANDS em src/lib/brickPayment.js).
// Pix, boleto, lotérica, saldo e débito ficam de fora (invalid_payment_request); outra bandeira de crédito
// recebe card_brand_not_accepted, para a tela dizer quais cartões são aceitos.
const creditCardBrands = new Set(['visa', 'master', 'amex', 'elo', 'hipercard']);
const paymentMethodPattern = /^[a-z_]{2,30}$/;
const nonCardMethod = /^(pix|account_money|pec|bol|deb|ticket|bank_transfer|consumer_credits|digital_)/;
const cardTokenPattern = /^[A-Za-z0-9_-]{16,128}$/;
const issuerPattern = /^\d{1,10}$/;
const deviceIdPattern = /^[A-Za-z0-9_-]{8,128}$/;
const beginErrors: Record<string, number> = {
  invalid_payment_request: 400, invalid_document: 400, order_not_found: 404, already_paid: 409, order_not_payable: 409,
  order_expired: 409, payment_in_progress: 409, payment_in_review: 409, attempt_conflict: 409,
};
const shownPaymentStatuses = new Set(['approved', 'pending', 'in_process', 'authorized', 'rejected', 'cancelled', 'refunded', 'charged_back', 'in_mediation']);
const orderPaymentStatuses = new Set(['pending', 'paid', 'failed', 'refunded']);
// Motivo de o pedido não aceitar pagamento agora (order_payment_state), devolvido na ação status.
const paymentBlockReasons = new Set(['already_paid', 'order_not_payable', 'order_expired', 'payment_in_review', 'payment_in_progress']);
// Tentativa 'creating' sem o id do pagamento: o POST não respondeu, ou o Mercado Pago cobrou e a gravação
// falhou ("confirming"). A consulta procura o pagamento depois de 20 s; com mais de 2 minutos sem resultado,
// a tentativa vira erro (mesma regra do begin_payment_attempt).
const creatingSearchAfterMs = 20_000;
const creatingStaleMs = 2 * 60_000;
// deno-lint-ignore no-explicit-any
const creatingUnresolved = (attempt: any) => attempt?.status === 'creating' && uuidPattern.test(String(attempt?.attempt_id || ''))
  && !mpPaymentIdPattern.test(String(attempt?.provider_payment_id || ''));
// deno-lint-ignore no-explicit-any
const creatingAgeMs = (attempt: any) => {
  const created = Date.parse(String(attempt?.created_at || ''));
  return Number.isFinite(created) ? Date.now() - created : 0;
};

const validCpf = (value: string) => {
  if (!/^\d{11}$/.test(value) || /^(\d)\1{10}$/.test(value)) return false;
  const digit = (length: number) => {
    let sum = 0;
    for (let index = 0; index < length; index++) sum += Number(value[index]) * (length + 1 - index);
    const rest = (sum * 10) % 11;
    return rest === 10 ? 0 : rest;
  };
  return digit(9) === Number(value[9]) && digit(10) === Number(value[10]);
};
const holderDocument = (identification: unknown) => {
  const source = identification && typeof identification === 'object' ? identification as Record<string, unknown> : {};
  const type = String(source.type || '').toUpperCase();
  const number = mpDigits(source.number);
  if (type === 'CPF' && validCpf(number)) return { type, number };
  if (type === 'CNPJ' && /^\d{14}$/.test(number) && !/^(\d)\1{13}$/.test(number)) return { type, number };
  return null;
};

// Tentativa gravada (payment_attempt_json) no formato da resposta. creating/error não vão para a tela.
// deno-lint-ignore no-explicit-any
const attemptPayment = (attempt: any) => {
  if (!attempt || !shownPaymentStatuses.has(attempt.status)) return null;
  const pix = attempt.pix && typeof attempt.pix === 'object' && attempt.pix.qr_code && attempt.pix.qr_code_base64
    ? { qrCode: String(attempt.pix.qr_code), qrCodeBase64: String(attempt.pix.qr_code_base64), expiresAt: attempt.pix.expires_at || attempt.expires_at || null }
    : null;
  return {
    attemptId: attempt.attempt_id, method: attempt.method, status: attempt.status,
    statusDetail: mpSafeCode(attempt.status_detail) || '', paymentMethodId: '',
    installments: Number.isInteger(attempt.installments) ? attempt.installments : null,
    pix: attempt.method === 'pix' && attempt.status === 'pending' ? pix : null,
  };
};
// Pagamento devolvido pelo Mercado Pago no formato da resposta (o Pix vem de point_of_interaction).
// deno-lint-ignore no-explicit-any
const providerPayment = (mp: any, attemptId: string, method: string) => {
  const transaction = mp?.point_of_interaction?.transaction_data;
  const status = mpSafeCode(mp?.status, /^[a-z_]{1,40}$/) || '';
  const pix = method === 'pix' && status === 'pending' && typeof transaction?.qr_code === 'string' && typeof transaction?.qr_code_base64 === 'string'
    ? { qrCode: transaction.qr_code, qrCodeBase64: transaction.qr_code_base64.replace(/\s/g, ''), expiresAt: typeof mp?.date_of_expiration === 'string' ? mp.date_of_expiration : null }
    : null;
  const installments = Number(mp?.installments);
  return {
    attemptId, method, status, statusDetail: mpSafeCode(mp?.status_detail) || '',
    paymentMethodId: mpSafeCode(mp?.payment_method_id, /^[a-z_]{2,30}$/) || '',
    installments: Number.isInteger(installments) && installments >= 1 ? installments : null,
    pix,
  };
};
// deno-lint-ignore no-explicit-any
const stateOrder = (state: any) => ({
  paymentStatus: orderPaymentStatuses.has(state?.order?.payment_status) ? state.order.payment_status : 'pending',
  status: state?.order?.status || null,
  total: Number(state?.order?.total) || null,
});
// Tentativa marcada como erro antes de chegar ao Mercado Pago: a mesma chave devolve o mesmo erro.
const attemptErrors: Record<string, [string, number]> = {
  rate_limited: ['too_many_requests', 429], rate_limit_unavailable: ['rate_limit_unavailable', 503],
  provider_credentials_invalid: ['payment_provider_credentials_invalid', 502], invalid_document: ['invalid_document', 400],
};

Deno.serve(async (req: Request) => {
  const origin = allowedOrigin(req.headers.get('origin'));
  if (req.method === 'OPTIONS') return json({}, origin ? 204 : 403, origin || undefined);
  if (!origin || req.method !== 'POST') return json({ error: 'request_not_allowed' }, 403, origin || undefined);
  const requestId = crypto.randomUUID();
  let stage = 'configuration';
  const fail = (error: string, status: number, extra: Record<string, unknown> = {}) => json({ error, requestId, ...extra }, status, origin);
  // Só campos sem dado pessoal (veja o comentário no topo).
  const log = (event: string, details: Record<string, unknown> = {}) => console.error(event, { requestId, stage, ...details });
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const accessToken = Deno.env.get('MERCADO_PAGO_ACCESS_TOKEN');
    if (!supabaseUrl || !accessToken) return fail('payment_provider_not_configured', 503);
    stage = 'authentication';
    const authClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: req.headers.get('Authorization') || '' } } });
    const { data: { user }, error: authError } = await authClient.auth.getUser();
    if (authError || !user?.id || !user?.email) return fail('authentication_required', 401);

    stage = 'validation';
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== 'object' || Array.isArray(body)) return fail('invalid_payment_request', 400);
    const orderId = String(body.orderId ?? '');
    if (!uuidPattern.test(orderId)) return fail('invalid_payment_request', 400);
    const action = body.action;
    if (!['pay', 'status', 'cancel_pix'].includes(action)) return fail('invalid_payment_request', 400);
    const admin = createClient(supabaseUrl, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false, autoRefreshToken: false } });

    // Aplica um pagamento do Mercado Pago pela RPC. Devolve o resultado, ou null com o código do erro.
    // deno-lint-ignore no-explicit-any
    const apply = async (mp: any, source: string, fallbackId = '') => {
      const { data, error } = await admin.rpc('apply_mp_payment', { p_payment: normalizePayment(mp, fallbackId), p_source: source });
      if (error || !data) {
        // A mensagem só vai para o log quando é um dos códigos da RPC (nunca um texto do banco).
        const message = String(error?.message || '');
        const code = /^[a-z_]{1,40}$/.test(message) ? message : String(error?.code || 'empty').slice(0, 10);
        log('payment_apply_failed', { orderId, paymentId: String(mp?.id ?? fallbackId), code });
        return { data: null, code };
      }
      return { data, code: '' };
    };
    const readState = async () => {
      const { data, error } = await admin.rpc('order_payment_state', { p_order_id: orderId, p_customer_id: user.id });
      if (error?.message === 'order_not_found') return { missing: true, state: null };
      if (error || !data || typeof data !== 'object') throw new Error('order_state_failed');
      return { missing: false, state: data };
    };
    const getPayment = (paymentId: string) => mpFetch(`/v1/payments/${paymentId}`, { token: accessToken, timeoutMs: 15000 });

    // Cancela os Pix em aberto do cliente antes de uma cobrança nova (ou a pedido do cliente).
    // 'ok' = todos cancelados (ou vencidos/recusados); 'already_paid' = o Pix deste pedido foi pago;
    // 'other_order_paid' = o Pix de outro pedido do cliente acabou de ser pago (não cobra este agora: a tela
    // avisa e o cliente decide; uma nova tentativa já não encontra esse Pix aberto).
    // Cada PUT leva uma chave nova: uma recusa passageira guardada pelo Mercado Pago não se repete no próximo
    // pedido de cancelamento. Cancelar já é idempotente, e o GET seguinte confere o resultado.
    const cancelOpenPix = async (attempts: Array<{ order_id?: string; provider_payment_id?: string }>) => {
      let otherPaid = false;
      for (const attempt of attempts.slice(0, 10)) {
        const paymentId = String(attempt?.provider_payment_id || '');
        if (!mpPaymentIdPattern.test(paymentId)) return 'failed';
        const cancelled = await mpFetch(`/v1/payments/${paymentId}`, {
          token: accessToken, method: 'PUT', body: { status: 'cancelled' }, idempotencyKey: crypto.randomUUID(), timeoutMs: 15000,
        });
        log('pix_cancel_requested', { orderId, paymentId, httpStatus: cancelled.status });
        const checked = await getPayment(paymentId);
        if (!checked.ok) { log('pix_cancel_check_failed', { orderId, paymentId, httpStatus: checked.status }); return 'failed'; }
        const status = String(checked.data.status || '');
        const applied = await apply(checked.data, 'process-payment', paymentId);
        if (status === 'approved') {
          if (attempt.order_id === orderId) return 'already_paid';
          otherPaid = true; // Segue cancelando os demais Pix abertos; a cobrança deste pedido não acontece agora.
          continue;
        }
        if (!['cancelled', 'rejected'].includes(status) || !applied.data) return 'failed';
      }
      return otherPaid ? 'other_order_paid' : 'ok';
    };

    // Busca os pagamentos de um pedido do cliente no Mercado Pago e aplica cada um ('reconcile').
    // complete = false: a busca falhou ou algum pagamento não gravou (vale tentar de novo).
    // paid = algum pagamento aprovado deixou o pedido pago.
    const searchAndApply = async (targetOrderId = orderId) => {
      const search = await mpFetch(`/v1/payments/search?external_reference=${targetOrderId}&sort=date_created&criteria=desc`, { token: accessToken, timeoutMs: 15000 });
      if (!search.ok || !Array.isArray(search.data?.results)) { log('payment_reconcile_failed', { orderId: targetOrderId, httpStatus: search.status }); return { complete: false, paid: false }; }
      let complete = true;
      let paid = false;
      for (const result of search.data.results.slice(0, 30)) {
        if (String(result?.external_reference || '') !== targetOrderId) continue;
        const applied = await apply(result, 'reconcile');
        // Pagamento malformado ou já ligado a outro pedido: não adianta repetir; segue para os demais.
        if (!applied.data && !['invalid_payment', 'attempt_conflict'].includes(applied.code)) complete = false;
        if (applied.data && String(result?.status || '') === 'approved' && applied.data.payment_status === 'paid') paid = true;
      }
      return { complete, paid };
    };
    const failAttempt = async (attemptId: string) => {
      const { error } = await admin.rpc('fail_payment_attempt', { p_attempt_id: attemptId, p_status_detail: 'reconcile_not_found' });
      if (error) log('payment_attempt_fail_failed', { orderId, attemptId });
      return !error;
    };
    // Tentativas 'creating' antigas (needs_reconcile): o Mercado Pago pode ter criado o pagamento sem a resposta
    // chegar. Confere cada pedido de 'orders' (este e outros do cliente, até 5 pedidos e 20 tentativas), aplica o
    // que achar e marca como erro as tentativas que continuarem sem pagamento. 'other_order_paid' = outro pedido
    // do cliente estava pago no Mercado Pago (não cobra este agora). 'failed' = vale tentar de novo.
    // deno-lint-ignore no-explicit-any
    const reconcileStale = async (outcome: any) => {
      const listed = Array.isArray(outcome?.orders) ? outcome.orders : [{ order_id: orderId, attempt_ids: outcome?.attempt_ids }];
      let budget = 20;
      let otherPaid = false;
      for (const item of listed.slice(0, 5)) {
        const targetOrderId = String(item?.order_id || '');
        if (!uuidPattern.test(targetOrderId)) continue;
        const searched = await searchAndApply(targetOrderId);
        if (!searched.complete) return 'failed';
        if (searched.paid && targetOrderId !== orderId) otherPaid = true;
        const ids = (Array.isArray(item?.attempt_ids) ? item.attempt_ids : []).filter((id: unknown) => uuidPattern.test(String(id)));
        for (const attemptId of ids.slice(0, budget)) {
          if (!(await failAttempt(String(attemptId)))) return 'failed';
        }
        budget -= Math.min(ids.length, budget);
      }
      return otherPaid ? 'other_order_paid' : 'ok';
    };
    // Tentativa 'creating' sem id na consulta (status ou cancel_pix): procura o pagamento e aplica; a tentativa
    // ganha o id pela attempt_key do metadata. Só com mais de 2 minutos e nada encontrado vira erro.
    // deno-lint-ignore no-explicit-any
    const resolveCreating = async (attempt: any) => {
      const stale = creatingAgeMs(attempt) > creatingStaleMs;
      if (!(await searchAndApply()).complete) return false;
      return stale ? failAttempt(String(attempt.attempt_id)) : true;
    };

    if (action === 'status' || action === 'cancel_pix') {
      stage = action;
      const allowed = await takeRateLimit(admin, 'payment_status_user', user.id, 240, 3600);
      if (allowed === false) return fail('too_many_requests', 429);
      if (allowed === null) return fail('rate_limit_unavailable', 503);
      const first = await readState();
      if (first.missing) return fail('order_not_found', 404);
      let state = first.state;

      if (action === 'cancel_pix') {
        // Pix em criação sem id (resposta perdida, ou cobrado e não gravado): procura o pagamento antes de cancelar.
        if (creatingUnresolved(state.attempt) && state.attempt.method === 'pix') {
          stage = 'cancel_pix_reconcile';
          await resolveCreating(state.attempt);
          state = (await readState()).state;
          if (creatingUnresolved(state?.attempt) && state.attempt.method === 'pix') return fail('pix_cancel_failed', 409);
          stage = action;
        }
        const attempt = state.attempt;
        if (attempt?.method === 'pix' && attempt.status === 'pending' && mpPaymentIdPattern.test(String(attempt.provider_payment_id || ''))) {
          const result = await cancelOpenPix([{ order_id: orderId, provider_payment_id: attempt.provider_payment_id }]);
          if (result === 'already_paid') return fail('already_paid', 409);
          if (result !== 'ok') return fail('pix_cancel_failed', 409);
          state = (await readState()).state;
        }
        if (state?.order?.payment_status === 'paid') return fail('already_paid', 409);
        return json({ ok: true, requestId, orderId, order: stateOrder(state) }, 200, origin);
      }

      const attempt = state.attempt;
      if (creatingUnresolved(attempt)) {
        // Tentativa em criação sem id: o refresh_due depende do id, então, se o aviso também se perder, é a própria
        // consulta que procura o pagamento, com ou sem refresh (a tela recarregada consulta sem refresh).
        if (creatingAgeMs(attempt) >= creatingSearchAfterMs) {
          stage = 'status_reconcile';
          await resolveCreating(attempt);
          state = (await readState()).state;
        }
      } else if (body.refresh === true && state.refresh_due === true && mpPaymentIdPattern.test(String(attempt?.provider_payment_id || ''))) {
        // Reserva para um aviso perdido: consulta o Mercado Pago se a última consulta tiver mais de 25 s.
        const paymentId = String(attempt.provider_payment_id);
        const checked = await getPayment(paymentId);
        if (!checked.ok) log('payment_refresh_failed', { orderId, paymentId, httpStatus: checked.status });
        else if ((await apply(checked.data, 'reconcile', paymentId)).data) state = (await readState()).state;
      }
      // Enquanto a tentativa em criação não se resolve, o pedido fica sem checkout: o cliente pode já ter sido cobrado.
      const unresolved = creatingUnresolved(state.attempt);
      let checkout = null;
      if (!unresolved && state.payable === true && await brickEnabledFor(authClient, checkoutModeSetting())) {
        const settings = brickSettings();
        const total = Number(state.order?.total);
        if (settings && Number.isFinite(total) && total > 0) checkout = { publicKey: settings.publicKey, maxInstallments: settings.maxInstallments, amount: total };
      }
      const reason = unresolved ? 'payment_in_progress' : paymentBlockReasons.has(state.reason) ? state.reason : null;
      return json({ requestId, orderId, order: stateOrder(state), payment: attemptPayment(state.attempt), checkout, reason }, 200, origin);
    }

    // action === 'pay'
    stage = 'pay_validation';
    const attemptKey = String(body.attemptKey ?? '');
    const method = body.method;
    if (!uuidPattern.test(attemptKey) || !['card', 'pix'].includes(method)) return fail('invalid_payment_request', 400);
    const deviceId = body.deviceId == null || body.deviceId === '' ? '' : String(body.deviceId);
    if (deviceId && !deviceIdPattern.test(deviceId)) return fail('invalid_payment_request', 400);
    const maxInstallments = maxInstallmentsSetting();
    let card: { token: string; paymentMethodId: string; issuerId: string; installments: number; identification: { type: string; number: string } } | null = null;
    if (method === 'card') {
      const source = body.card && typeof body.card === 'object' ? body.card : null;
      const token = String(source?.token ?? '');
      const paymentMethodId = String(source?.paymentMethodId ?? '');
      const issuerId = source?.issuerId == null || source.issuerId === '' ? '' : String(source.issuerId);
      const installments = Number(source?.installments);
      if (!source || !cardTokenPattern.test(token) || !paymentMethodPattern.test(paymentMethodId) || nonCardMethod.test(paymentMethodId)
        || (issuerId && !issuerPattern.test(issuerId))
        || !Number.isInteger(installments) || installments < 1 || installments > maxInstallments) return fail('invalid_payment_request', 400);
      if (!creditCardBrands.has(paymentMethodId)) return fail('card_brand_not_accepted', 400);
      const identification = holderDocument(source.identification);
      if (!identification) return fail('invalid_document', 400);
      card = { token, paymentMethodId, issuerId, installments, identification };
    }
    // A chave de modo também vale aqui: com redirect (ou brick_staff para quem não é da equipe), não cobra no site.
    if (!(await brickEnabledFor(authClient, checkoutModeSetting()))) return fail('payment_provider_not_configured', 503);

    stage = 'begin';
    // deno-lint-ignore no-explicit-any
    const begin = async (): Promise<{ error: string | null; data: any }> => {
      const { data, error } = await admin.rpc('begin_payment_attempt', { p_order_id: orderId, p_customer_id: user.id, p_attempt_key: attemptKey, p_method: method });
      if (error) {
        const code = String(error.message || '');
        if (Object.hasOwn(beginErrors, code)) return { error: code, data: null };
        throw new Error('begin_failed');
      }
      if (!data || typeof data !== 'object') throw new Error('begin_failed');
      return { error: null, data };
    };
    let begun = await begin();
    let cancelledPix = false;
    let reconciled = false;
    while (!begun.error && ['pix_pending', 'needs_reconcile'].includes(begun.data.result)) {
      if (begun.data.result === 'pix_pending') {
        if (cancelledPix) return fail('pix_cancel_failed', 409);
        cancelledPix = true;
        stage = 'cancel_pix';
        const result = await cancelOpenPix(Array.isArray(begun.data.attempts) ? begun.data.attempts : []);
        if (result === 'already_paid') return fail('already_paid', 409);
        if (result === 'other_order_paid') return fail('other_order_paid', 409);
        if (result !== 'ok') return fail('pix_cancel_failed', 409);
      } else {
        if (reconciled) return fail('payment_provider_unavailable', 502, { retryable: true });
        reconciled = true;
        stage = 'reconcile';
        const result = await reconcileStale(begun.data);
        if (result === 'other_order_paid') return fail('other_order_paid', 409);
        if (result !== 'ok') return fail('payment_provider_unavailable', 502, { retryable: true });
      }
      stage = 'begin';
      begun = await begin();
    }
    if (begun.error) return fail(begun.error, beginErrors[begun.error]);
    const outcome = begun.data;
    const attemptId = String(outcome.attempt_id || '');
    const attempt = outcome.attempt;

    // Mesma chave já resolvida, ou Pix aberto do pedido: devolve o que está gravado, sem cobrar de novo.
    if (outcome.result === 'reuse_pix' || (outcome.result === 'replay' && attempt?.status !== 'creating')) {
      if (attempt?.status === 'error') {
        const [code, status] = attemptErrors[String(attempt.status_detail || '')] || ['payment_provider_request_rejected', 502];
        return fail(code, status);
      }
      const { state } = await readState();
      return json({ requestId, orderId, payment: attemptPayment(attempt), order: stateOrder(state) }, 200, origin);
    }
    if (!['created', 'replay'].includes(outcome.result) || !uuidPattern.test(attemptId)) throw new Error('begin_unexpected');

    const markError = async (detail: string) => {
      const { error } = await admin.rpc('fail_payment_attempt', { p_attempt_id: attemptId, p_status_detail: detail });
      if (error) log('payment_attempt_fail_failed', { orderId, attemptId });
    };
    // Limites só para tentativas novas (a repetição da mesma chave não conta).
    if (outcome.result === 'created') {
      stage = 'rate_limit';
      for (const [scope, identity, max] of [['payment_attempt_user', user.id, 10], ['payment_attempt_ip', clientIp(req), 30], ['payment_attempt_order', orderId, 8]] as Array<[string, string, number]>) {
        const allowed = await takeRateLimit(admin, scope, identity, max, 3600);
        if (allowed === false) { await markError('rate_limited'); return fail('too_many_requests', 429); }
        if (allowed === null) { await markError('rate_limit_unavailable'); return fail('rate_limit_unavailable', 503); }
      }
    }

    stage = 'build_payment';
    const amount = Number(outcome.amount);
    if (!Number.isFinite(amount) || amount <= 0) { await markError('invalid_order_total'); return fail('invalid_order_total', 422); }
    const shipping = outcome.shipping_address && typeof outcome.shipping_address === 'object' ? outcome.shipping_address : {};
    const name = splitName(shipping.name);
    const phone = phoneParts(shipping.phone);
    const zip = mpDigits(shipping.zip).slice(0, 8);
    const street = String(shipping.address || '').split(',')[0].trim().slice(0, 120);
    const streetNumber = String(shipping.number || '').trim().slice(0, 20);
    const orderItems = (Array.isArray(outcome.items) ? outcome.items : [])
      .map((item: Record<string, unknown>) => ({ product_id: item.product_id, title: item.product_name, quantity: item.quantity, unit_price: item.unit_price }));
    let items = providerItems({ orderId, total: amount, discount: Number(outcome.discount_amount || 0), shipping: Number(outcome.shipping_amount || 0), items: orderItems });
    // Os itens servem à análise antifraude; se não somarem o total, vai um item único com o valor do pedido.
    if (!items.length || itemsTotalCents(items) !== Math.round(amount * 100)) items = [{ id: `order-${orderId}`, title: 'Pedido Graphène', quantity: 1, unit_price: amount }];
    // Data de cadastro em ISO com milissegundos (o Auth devolve microssegundos); inválida fica de fora.
    const registeredAt = Date.parse(String(user.created_at || ''));
    const google = user.app_metadata?.provider === 'google' || (Array.isArray(user.identities) && user.identities.some((identity: { provider?: string }) => identity?.provider === 'google'));
    const common = {
      transaction_amount: amount,
      description: `Pedido Graphène #${orderId.slice(-8).toUpperCase()}`,
      external_reference: orderId,
      notification_url: `${supabaseUrl}/functions/v1/payment-webhook`,
      metadata: { attempt_key: attemptKey, order_id: orderId },
      additional_info: {
        items,
        payer: {
          first_name: name.first, last_name: name.last, phone: phone || undefined,
          address: { zip_code: zip, street_name: street, street_number: streetNumber },
          registration_date: Number.isFinite(registeredAt) ? new Date(registeredAt).toISOString() : undefined,
          authentication_type: google ? 'Gmail' : 'Native web',
        },
        shipments: {
          receiver_address: {
            zip_code: zip, state_name: String(shipping.state || '').slice(0, 2), city_name: String(shipping.city || '').slice(0, 80),
            street_name: street, street_number: streetNumber, apartment: String(shipping.complement || '').slice(0, 80),
          },
        },
      },
    };
    let paymentBody;
    if (method === 'card' && card) {
      paymentBody = {
        ...common, token: card.token, installments: card.installments, payment_method_id: card.paymentMethodId,
        ...(card.issuerId ? { issuer_id: Number(card.issuerId) } : {}),
        payer: { email: user.email, identification: card.identification },
        binary_mode: false,
      };
    } else {
      const document = mpDigits(outcome.customer_document);
      if (document.length !== 11) { await markError('invalid_document'); return fail('invalid_document', 400); }
      paymentBody = {
        ...common, payment_method_id: 'pix', date_of_expiration: pixExpiration(35),
        payer: {
          email: user.email, first_name: name.first, last_name: name.last,
          identification: { type: 'CPF', number: document },
          address: {
            zip_code: zip, street_name: street, street_number: streetNumber,
            neighborhood: String(shipping.neighborhood || '').slice(0, 80), city: String(shipping.city || '').slice(0, 80),
            federal_unit: String(shipping.state || '').slice(0, 2),
          },
        },
      };
    }

    stage = 'payment_provider';
    const created = await mpFetch('/v1/payments', {
      token: accessToken, method: 'POST', body: mpCompact(paymentBody), idempotencyKey: attemptKey, deviceId: deviceId || undefined, timeoutMs: 25000,
    });
    if (created.network) {
      // A tentativa continua 'creating': repetir com a mesma chave devolve o mesmo pagamento.
      log('payment_provider_unavailable', { orderId, attemptId, method });
      return fail('payment_provider_unavailable', 502, { retryable: true });
    }
    if (!created.ok || !mpPaymentIdPattern.test(String(created.data?.id ?? ''))) {
      const httpStatus = created.status;
      log('payment_provider_failed', { orderId, attemptId, method, httpStatus, causes: mpCauseCodes(created.data) });
      if (httpStatus === 401 || httpStatus === 403) { await markError('provider_credentials_invalid'); return fail('payment_provider_credentials_invalid', 502); }
      if (httpStatus === 400 || httpStatus === 422) { await markError('request_rejected'); return fail('payment_provider_request_rejected', 502); }
      return fail('payment_provider_unavailable', 502, { retryable: true });
    }

    stage = 'apply_payment';
    const mpPayment = created.data;
    const payment = providerPayment(mpPayment, attemptId, method);
    log('payment_created', { orderId, attemptId, method, paymentId: String(mpPayment.id), status: payment.status, statusDetail: payment.statusDetail, installments: payment.installments });
    let recorded = await apply(mpPayment, 'process-payment');
    // Falha passageira do banco (trava, prazo): mais uma tentativa depois de uma pausa curta.
    if (!recorded.data && !['invalid_payment', 'attempt_conflict', 'invalid_source'].includes(recorded.code)) {
      await new Promise(resolve => setTimeout(resolve, 800));
      recorded = await apply(mpPayment, 'process-payment');
    }
    const applied = recorded.data;
    // Cobrado no Mercado Pago, mas sem gravar agora: a tela mostra "confirmando"; o aviso grava depois e, se o
    // aviso também falhar, a consulta (status) procura o pagamento pela tentativa em criação e grava.
    if (!applied) return json({ requestId, orderId, payment, order: { paymentStatus: 'confirming', status: null } }, 200, origin);
    return json({
      requestId, orderId, payment,
      order: { paymentStatus: orderPaymentStatuses.has(applied.payment_status) ? applied.payment_status : 'confirming', status: applied.status || null },
    }, 200, origin);
  } catch {
    log('payment_failed');
    return fail('internal_error', 500);
  }
});
