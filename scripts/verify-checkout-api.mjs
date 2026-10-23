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
const { prepareCheckout, CheckoutError } = source.namespace;
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

console.log('Checkout API: refresh, safe errors, stable checkout key, single invocation and Mercado Pago URL validation passed (mocked).');
