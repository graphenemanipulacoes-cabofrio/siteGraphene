// Isolated mocked checkout tests: no network requests, orders or payment creation.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createContext, SourceTextModule, SyntheticModule } from 'node:vm';

const orderId = '12345678-1234-4234-8234-123456789abc';
const checkoutKey = '87654321-4321-4321-8321-cba987654321';
const customerId = 'abcdef12-1234-4234-8234-123456789abc';
const otherCustomerId = 'bbbbbbbb-1234-4234-8234-123456789abc';
const valid = { orderId, paymentUrl: 'https://www.mercadopago.com.br/checkout/v1/redirect?pref_id=mock' };
const body = { checkoutKey, items: [{ productId: '1', quantity: 1 }] };
const calls = [];
let state;
const supabase = {
    auth: {
        async getSession() { calls.push('getSession'); if (state.sessionThrow) throw state.sessionThrow; return state.session; },
        async refreshSession() { calls.push('refreshSession'); return state.refresh; },
    },
    functions: {
        async invoke(name, options) { calls.push({ name, options }); if (state.invokeThrow) throw state.invokeThrow; return state.result; },
    },
};
const context = createContext({ URL, Date, console });
const mockModule = new SyntheticModule(['supabase'], function () { this.setExport('supabase', supabase); }, { context });
const source = new SourceTextModule(readFileSync('src/lib/checkoutApi.js', 'utf8'), { context });
await source.link(() => mockModule);
await source.evaluate();
const { prepareCheckout, payOrder, orderPaymentStatus, cancelPix, CheckoutError } = source.namespace;
const reset = () => {
    calls.length = 0;
    state = {
        session: { data: { session: { access_token: 'mock-user-token', user: { id: customerId }, expires_at: Math.floor(Date.now() / 1000) + 3600 } }, error: null },
        refresh: { data: { session: { access_token: 'mock-refreshed-token', user: { id: customerId }, expires_at: Math.floor(Date.now() / 1000) + 3600 } }, error: null },
        result: { data: valid, error: null },
    };
};
const httpError = (status, payload) => ({ name: 'FunctionsHttpError', context: { status, clone: () => ({ json: async () => payload }) } });
const rejects = async code => assert.rejects(prepareCheckout(body), error => error instanceof CheckoutError && error.code === code && !error.message.includes('secret'));

reset();
assert.equal((await prepareCheckout(body)).orderId, orderId);
assert.equal(calls.filter(call => typeof call === 'object').length, 1);
assert.equal(calls.at(-1).name, 'create-checkout');
assert.equal(calls.at(-1).options.body, body);
assert.equal(calls.at(-1).options.body.checkoutKey, checkoutKey);
assert.equal(calls.at(-1).options.headers.Authorization, 'Bearer mock-user-token');
assert.ok(!calls.includes('refreshSession'));

reset();
state.session.data.session.expires_at = Math.floor(Date.now() / 1000) + 20;
await prepareCheckout(body);
assert.equal(calls.filter(call => call === 'refreshSession').length, 1);
assert.equal(calls.at(-1).options.headers.Authorization, 'Bearer mock-refreshed-token');
assert.equal(calls.filter(call => typeof call === 'object').length, 1);

reset(); state.session.data.session = null; await rejects('authentication_required');
assert.equal(calls.length, 1);
reset(); state.session.data.session.expires_at = 1; state.refresh = { data: { session: null }, error: { name: 'AuthSessionMissingError', message: 'secret' } }; await rejects('authentication_required');
assert.equal(calls.filter(call => typeof call === 'object').length, 0);
reset(); state.session.data.session.expires_at = 1; state.refresh = { data: null, error: { name: 'AuthRetryableFetchError', message: 'secret' } }; await rejects('network_error');

for (const code of ['invalid_document', 'invalid_cart', 'invalid_shipping', 'invalid_shipping_address', 'invalid_shipping_zip', 'invalid_variant', 'invalid_or_unpriced_product', 'invalid_coupon', 'coupon_minimum_not_reached', 'unable_to_create_order', 'invalid_order_total', 'checkout_already_completed', 'checkout_key_conflict', 'payment_provider_not_configured', 'payment_provider_credentials_invalid', 'payment_provider_request_rejected', 'payment_provider_unavailable', 'internal_error']) {
    reset(); state.result = { data: null, error: httpError(422, { error: code }) }; await rejects(code);
    assert.equal(calls.filter(call => typeof call === 'object').length, 1, 'Never automatically retry a payment');
}
reset(); state.result = { data: { error: 'invalid_document' }, error: null }; await rejects('invalid_document');
reset(); state.result = { data: null, error: httpError(401, { code: 401, message: 'Invalid JWT secret' }) }; await rejects('authentication_required');
reset(); state.result = { data: null, error: { name: 'FunctionsFetchError', message: 'secret' } }; await rejects('network_error');
reset(); state.invokeThrow = { name: 'FunctionsRelayError', message: 'secret' }; await rejects('network_error');
reset(); state.result = { data: null, error: { name: 'FunctionsHttpError', context: { status: 503, clone: () => ({ json: async () => { throw new Error('secret'); } }) } } }; await rejects('payment_provider_unavailable');
reset(); state.result = { data: null, error: httpError(400, { error: 'secret-database-error', requestId: 'secret' }) }; await rejects('internal_error');
reset(); state.result = { data: null, error: httpError(500, { error: 'internal_error', requestId: orderId }) };
await assert.rejects(prepareCheckout(body), error => error.requestId === orderId);

for (const paymentUrl of ['http://www.mercadopago.com.br/pay', 'https://mercadopago.com.br.evil.example/pay', 'https://evil.example/mercadopago.com.br', 'javascript:alert(1)', 'https://secret@www.mercadopago.com.br/pay', 'https://www.mercadopago.com.br:8443/pay', 'invalid']) {
    reset(); state.result = { data: { ...valid, paymentUrl }, error: null }; await rejects('invalid_payment_response');
}
reset(); state.result = { data: { ...valid, orderId: 'secret' }, error: null }; await rejects('invalid_payment_response');
reset(); await assert.rejects(prepareCheckout({}), error => error.code === 'invalid_cart'); assert.equal(calls.length, 0);

reset(); await prepareCheckout(body, { expectedUserId: customerId });
assert.equal(calls.filter(call => typeof call === 'object').length, 1);
reset(); state.session.data.session.user.id = otherCustomerId;
await assert.rejects(prepareCheckout(body, { expectedUserId: customerId }), error => error.code === 'authentication_required');
assert.equal(calls.filter(call => typeof call === 'object').length, 0, 'A different signed-in account must not receive the previous customer form');
assert.ok(!calls.includes('refreshSession'));
reset(); state.session.data.session.expires_at = 1; state.refresh.data.session.user.id = otherCustomerId;
await assert.rejects(prepareCheckout(body, { expectedUserId: customerId }), error => error.code === 'authentication_required');
assert.equal(calls.filter(call => typeof call === 'object').length, 0, 'Refresh cannot switch the checkout owner');
assert.equal(calls.filter(call => call === 'refreshSession').length, 1);

// ===== Pagamento no próprio site (modo brick) =====
// Objetos criados dentro da VM têm outro protótipo: comparar pelo conteúdo.
const plain = value => JSON.parse(JSON.stringify(value));
const publicKey = 'TEST-00000000-mock-public-key';
const brick = { orderId, paymentMode: 'brick', amount: 119.9, publicKey, maxInstallments: 12, requestId: orderId };
reset(); state.result = { data: brick, error: null };
const prepared = await prepareCheckout(body);
assert.deepEqual(plain(prepared), { orderId, paymentMode: 'brick', publicKey, maxInstallments: 12, amount: 119.9, requestId: orderId });
assert.equal(calls.filter(call => typeof call === 'object').length, 1);
reset(); state.result = { data: { ...valid, paymentMode: 'redirect' }, error: null };
assert.equal((await prepareCheckout(body)).paymentMode, 'redirect');
reset(); assert.equal((await prepareCheckout(body)).paymentMode, 'redirect', 'resposta antiga, sem paymentMode, continua sendo redirect');
for (const change of [{ publicKey: 'pk' }, { publicKey: 'APP_USR-' }, { publicKey: 'javascript:alert(1)' }, { publicKey: undefined }, { maxInstallments: 0 }, { maxInstallments: 13 }, { maxInstallments: 1.5 }, { maxInstallments: '12' },
    { amount: 0 }, { amount: -5 }, { amount: 'abc' }, { amount: Infinity }, { orderId: 'secret' }, { paymentMode: 'wallet' }]) {
    reset(); state.result = { data: { ...brick, ...change }, error: null }; await rejects('invalid_payment_response');
}
for (const paymentUrl of ['http://www.mercadopago.com.br/pay', 'https://evil.example/mercadopago.com.br']) {
    reset(); state.result = { data: { ...valid, paymentMode: 'redirect', paymentUrl }, error: null }; await rejects('invalid_payment_response');
}
reset(); state.result = { data: null, error: httpError(409, { error: 'checkout_restart_required' }) }; await rejects('checkout_restart_required');
assert.equal(calls.filter(call => typeof call === 'object').length, 1, 'a página decide refazer a tentativa; a API nunca repete');

// payOrder: uma chamada, sessão do cliente, nada de valor ou e-mail do navegador.
const attemptKey = '11111111-2222-4333-8444-555555555555';
const card = { token: 'tok_mock_0123456789abcdef', paymentMethodId: 'visa', issuerId: '25', installments: 3, identification: { type: 'CPF', number: '12345678909' } };
const pixPayment = { attemptId: attemptKey, method: 'pix', status: 'pending', statusDetail: 'pending_waiting_transfer', paymentMethodId: 'pix', installments: 1,
    pix: { qrCode: '00020126580014br.gov.bcb.pix0136mock-synthetic-code5204000053039865802BR', qrCodeBase64: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', expiresAt: '2026-11-26T15:30:00.000-03:00' } };
const payReply = payment => ({ data: { requestId: orderId, orderId, payment, order: { paymentStatus: 'pending', status: 'awaiting_payment' } }, error: null });
const pay = extra => payOrder({ orderId, attemptKey, method: 'pix', ...extra });
const payRejects = async (code, extra) => assert.rejects(pay(extra), error => error instanceof CheckoutError && error.code === code && !error.message.includes('secret'));
const invocations = () => calls.filter(call => typeof call === 'object');

reset(); state.result = payReply(pixPayment);
const pixResult = await pay({ amount: 1, transaction_amount: 1, email: 'secret@example.invalid', notification_url: 'https://evil.example' });
assert.equal(invocations().length, 1);
assert.equal(calls.at(-1).name, 'process-payment');
assert.equal(calls.at(-1).options.headers.Authorization, 'Bearer mock-user-token');
assert.deepEqual(plain(calls.at(-1).options.body), { action: 'pay', orderId, attemptKey, method: 'pix' }, 'só ação, pedido, chave e método vão ao servidor');
assert.equal(pixResult.payment.pix.qrCodeBase64, pixPayment.pix.qrCodeBase64);
assert.equal(pixResult.payment.pix.expiresAt, '2026-11-26T18:30:00.000Z', 'prazo do Mercado Pago preservado');
assert.equal(pixResult.order.paymentStatus, 'pending');

reset(); state.result = payReply({ attemptId: attemptKey, method: 'card', status: 'rejected', statusDetail: 'cc_rejected_bad_filled_security_code', paymentMethodId: 'visa', installments: 3, pix: null });
await payOrder({ orderId, attemptKey, method: 'card', card, extra: 'secret' });
assert.deepEqual(plain(calls.at(-1).options.body), { action: 'pay', orderId, attemptKey, method: 'card', card });
reset(); state.result = { data: { requestId: orderId, orderId, payment: { attemptId: attemptKey, method: 'card', status: 'approved', statusDetail: 'accredited', paymentMethodId: 'visa', installments: 3 }, order: { paymentStatus: 'confirming', status: 'awaiting_payment' } }, error: null };
assert.equal((await payOrder({ orderId, attemptKey, method: 'card', card })).order.paymentStatus, 'confirming', 'aprovado sem registro no banco ainda');
reset(); state.result = payReply({ ...pixPayment, statusDetail: 'Raw <b>message</b>', paymentMethodId: 'VISA<script>' });
const cleaned = await pay();
assert.equal(cleaned.payment.statusDetail, ''); assert.equal(cleaned.payment.paymentMethodId, '');

// Validação antes da rede.
for (const change of [{ orderId: 'secret' }, { attemptKey: 'secret' }, { attemptKey: undefined }, { method: 'boleto' }, { method: 'card', card: undefined }]) {
    reset(); await payRejects('invalid_payment_request', change); assert.equal(calls.length, 0, 'nada sai do navegador');
}
// Respostas inválidas.
for (const reply of [payReply(null), payReply({ ...pixPayment, status: 'mystery' }), payReply({ ...pixPayment, method: 'boleto' }),
    payReply({ ...pixPayment, pix: { ...pixPayment.pix, qrCodeBase64: 'not base64 <img>' } }), payReply({ ...pixPayment, pix: { ...pixPayment.pix, qrCode: 'short' } }),
    { data: { ...payReply(pixPayment).data, orderId: checkoutKey }, error: null }, { data: { ...payReply(pixPayment).data, order: { paymentStatus: 'secret' } }, error: null }]) {
    reset(); state.result = reply; await payRejects('invalid_payment_response');
}
// Erros do servidor: código conhecido, sem repetição, retryable só por indicação do servidor ou falha de rede.
for (const code of ['already_paid', 'payment_in_progress', 'payment_in_review', 'pix_cancel_failed', 'too_many_requests', 'rate_limit_unavailable', 'order_not_payable', 'order_expired', 'order_not_found', 'attempt_conflict', 'invalid_payment_request', 'invalid_document', 'payment_provider_credentials_invalid', 'payment_provider_request_rejected', 'payment_provider_not_configured', 'card_brand_not_accepted', 'other_order_paid']) {
    reset(); state.result = { data: null, error: httpError(409, { error: code, requestId: 'secret' }) };
    await assert.rejects(pay(), error => error.code === code && error.retryable === false && error.requestId === null);
    assert.equal(invocations().length, 1, 'Never automatically retry a payment');
}
reset(); state.result = { data: null, error: httpError(502, { error: 'payment_provider_unavailable', retryable: true, requestId: orderId }) };
await assert.rejects(pay(), error => error.code === 'payment_provider_unavailable' && error.retryable === true && error.requestId === orderId);
assert.equal(invocations().length, 1);
reset(); state.result = { data: null, error: httpError(502, { error: 'payment_provider_unavailable' }) };
await assert.rejects(pay(), error => error.code === 'payment_provider_unavailable' && error.retryable === false);
reset(); state.result = { data: null, error: { name: 'FunctionsFetchError', message: 'secret' } };
await assert.rejects(pay(), error => error.code === 'network_error' && error.retryable === true);
reset(); state.result = { data: null, error: httpError(500, { error: 'internal_error', retryable: 'yes' }) };
await assert.rejects(pay(), error => error.code === 'internal_error' && error.retryable === false);
reset(); state.result = { data: null, error: httpError(401, { error: 'authentication_required' }) };
await assert.rejects(pay(), error => error.code === 'authentication_required');
reset(); state.session.data.session.user.id = otherCustomerId;
await assert.rejects(payOrder({ orderId, attemptKey, method: 'pix' }, { expectedUserId: customerId }), error => error.code === 'authentication_required');
assert.equal(invocations().length, 0, 'outra conta não paga o pedido');

// orderPaymentStatus: retomar Pix ou cartão em análise.
const statusReply = extra => ({ data: { requestId: orderId, orderId, order: { paymentStatus: 'pending', status: 'awaiting_payment', total: 119.9 }, payment: null, checkout: { publicKey, maxInstallments: 6, amount: 119.9 }, ...extra }, error: null });
reset(); state.result = statusReply();
const status = await orderPaymentStatus(orderId);
assert.deepEqual(plain(calls.at(-1).options.body), { action: 'status', orderId, refresh: false });
assert.deepEqual(plain(status.checkout), { publicKey, maxInstallments: 6, amount: 119.9 });
assert.equal(status.payment, null); assert.equal(status.order.total, 119.9);
reset(); state.result = statusReply({ checkout: null, payment: pixPayment });
const resumed = await orderPaymentStatus(orderId, { refresh: true });
assert.deepEqual(plain(calls.at(-1).options.body), { action: 'status', orderId, refresh: true });
assert.equal(resumed.checkout, null); assert.equal(resumed.payment.pix.qrCode, pixPayment.pix.qrCode);
reset(); state.result = statusReply(); await orderPaymentStatus(orderId, { refresh: 'yes' });
assert.equal(calls.at(-1).options.body.refresh, false, 'refresh só com true');
reset(); state.result = statusReply({ payment: { attemptId: null, method: 'other', status: 'pending' } });
assert.equal((await orderPaymentStatus(orderId)).payment.method, 'other', 'pagamento do Checkout Pro');
// Motivo do bloqueio (order_payment_state): só os códigos conhecidos chegam à tela.
assert.equal(status.reason, null, 'sem motivo, pode pagar');
for (const reason of ['payment_in_progress', 'payment_in_review', 'order_expired', 'order_not_payable', 'already_paid']) {
    reset(); state.result = statusReply({ checkout: null, reason });
    assert.equal((await orderPaymentStatus(orderId)).reason, reason, reason);
}
for (const reason of ['secret <b>raw</b>', 'invalid_payment_request', 42, { code: 'x' }]) {
    reset(); state.result = statusReply({ checkout: null, reason });
    assert.equal((await orderPaymentStatus(orderId)).reason, null, 'motivo desconhecido não aparece');
}
reset(); state.result = statusReply({ checkout: null, payment: { attemptId: attemptKey, method: 'card', status: 'pending', statusDetail: 'pending_contingency' }, reason: 'payment_in_review' });
const cardPending = await orderPaymentStatus(orderId);
assert.equal(cardPending.payment.status, 'pending'); assert.equal(cardPending.payment.pix, null); assert.equal(cardPending.reason, 'payment_in_review');
for (const reply of [statusReply({ checkout: { publicKey: 'pk', maxInstallments: 6, amount: 1 } }), statusReply({ checkout: { publicKey, maxInstallments: 20, amount: 1 } }), statusReply({ orderId: checkoutKey })]) {
    reset(); state.result = reply; await assert.rejects(orderPaymentStatus(orderId), error => error.code === 'invalid_payment_response');
}
reset(); await assert.rejects(orderPaymentStatus('secret'), error => error.code === 'invalid_payment_request'); assert.equal(calls.length, 0);
reset(); state.result = { data: null, error: httpError(404, { error: 'order_not_found' }) };
await assert.rejects(orderPaymentStatus(orderId), error => error.code === 'order_not_found'); assert.equal(invocations().length, 1);

// cancelPix
reset(); state.result = { data: { ok: true, order: { paymentStatus: 'pending', status: 'awaiting_payment' } }, error: null };
assert.equal((await cancelPix(orderId)).ok, true);
assert.deepEqual(plain(calls.at(-1).options.body), { action: 'cancel_pix', orderId });
reset(); state.result = { data: { ok: false }, error: null }; await assert.rejects(cancelPix(orderId), error => error.code === 'invalid_payment_response');
reset(); state.result = { data: null, error: httpError(409, { error: 'pix_cancel_failed' }) }; await assert.rejects(cancelPix(orderId), error => error.code === 'pix_cancel_failed');
reset(); state.result = { data: null, error: httpError(409, { error: 'already_paid' }) }; await assert.rejects(cancelPix(orderId), error => error.code === 'already_paid');
assert.equal(invocations().length, 1);
reset(); await assert.rejects(cancelPix('secret'), error => error.code === 'invalid_payment_request'); assert.equal(calls.length, 0);

// Mensagens novas, sem texto do servidor.
for (const [code, text] of [['already_paid', 'Este pedido já está pago. Confira em Minha conta.'], ['order_expired', 'Este pedido expirou. Volte ao carrinho para gerar um novo.'], ['payment_in_review', 'Há um pagamento deste pedido em análise. Aguarde a resposta antes de pagar de novo.'], ['invalid_payment_request', 'Confira os dados do pagamento e tente de novo.']]) {
    assert.equal(new CheckoutError(code).message, text);
}
assert.equal(new CheckoutError('rate_limit_unavailable').message, new CheckoutError('payment_provider_unavailable').message);
assert.equal(new CheckoutError('attempt_conflict').message, new CheckoutError('checkout_key_conflict').message);

console.log('Checkout API: refresh, safe errors, stable checkout key, single invocation and Mercado Pago URL validation passed (mocked). On-site payment: brick response validated, payOrder/orderPaymentStatus/cancelPix with one Bearer call, no retries, new codes, status reason allowlist, retryable only on server hint or network failure.');
