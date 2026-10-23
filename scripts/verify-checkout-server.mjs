// Runs the real Edge Function in a VM with Auth, database and provider mocks.
// No Supabase/MP network access, credentials, database writes or charges occur.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
import { createContext, SourceTextModule, SyntheticModule } from 'node:vm';
import { webcrypto } from 'node:crypto';

const orderId = '12345678-1234-4234-8234-123456789abc';
const customerId = 'abcdef12-1234-4234-8234-123456789abc';
const checkoutKey = '87654321-4321-4321-8321-cba987654321';
const origin = 'https://www.graphenemanipulacoes.com.br';
const paymentUrl = 'https://www.mercadopago.com.br/checkout/v1/redirect?pref_id=mock';
const env = new Map(Object.entries({
    SUPABASE_URL: 'https://mock-project.supabase.co', SUPABASE_ANON_KEY: 'mock-anon',
    SUPABASE_SERVICE_ROLE_KEY: 'mock-service', MERCADO_PAGO_ACCESS_TOKEN: 'mock-provider',
    SITE_URL: `${origin}/`,
}));
const calls = [];
const logs = [];
let state;
let handler;

class Query {
    constructor(table) { this.table = table; this.operation = 'select'; this.filters = []; }
    select(columns) { this.columns = columns; return this; }
    update(value) { this.operation = 'update'; this.value = value; return this; }
    eq(key, value) { this.filters.push([key, value]); return this; }
    in(key, value) { this.filters.push([key, value]); return this; }
    is(key, value) { this.filters.push([key, value]); return this; }
    limit() { return this; }
    single() { this.isSingle = true; return this; }
    maybeSingle() { this.isSingle = true; return this; }
    then(resolve, reject) {
        calls.push({ kind: 'query', table: this.table, operation: this.operation, value: this.value, filters: this.filters, columns: this.columns });
        let result;
        if (this.operation === 'update' && this.value?.payment_url && state.persistError) result = { data: null, error: { code: 'mock_persist_error', message: 'secret database detail' } };
        else if (this.operation === 'update' && this.value?.customer_document && state.documentError) result = { data: null, error: { code: 'mock_document_error', message: 'secret database detail' } };
        else if (this.operation === 'update') result = { data: this.isSingle ? { id: orderId } : null, error: null };
        else result = { data: state.existingOrder, error: null };
        return Promise.resolve(result).then(resolve, reject);
    }
}

const createClient = (_url, _key, options) => ({
    auth: { getUser: async () => {
        calls.push({ kind: 'auth', authorization: options?.global?.headers?.Authorization });
        return { data: { user: state.user }, error: state.authError };
    } },
    from: table => new Query(table),
    rpc: async (name, args) => {
        calls.push({ kind: 'rpc', name, args });
        return { data: state.order, error: state.rpcError };
    },
});
const providerFetch = async (url, options) => {
    assert.equal(String(url), 'https://api.mercadopago.com/checkout/preferences', 'No network except the mocked preference endpoint');
    calls.push({ kind: 'provider', url: String(url), options, payload: JSON.parse(options.body) });
    if (state.providerMode === 'timeout') throw new DOMException('mock timeout secret', 'TimeoutError');
    if (state.providerMode === 'network') throw new TypeError('mock fetch secret');
    if (state.providerMode === 'non-json') return new Response('mock non-JSON secret', { status: 502 });
    return new Response(JSON.stringify(state.providerPayload), { status: state.providerStatus, headers: { 'Content-Type': 'application/json' } });
};
const context = createContext({
    Request, Response, Headers, URL, AbortController, AbortSignal, DOMException, TextEncoder, TextDecoder,
    crypto: webcrypto, setTimeout, clearTimeout,
    console: { log: (...args) => logs.push(args), error: (...args) => logs.push(args), warn: (...args) => logs.push(args) },
    fetch: providerFetch,
    Deno: { env: { get: key => env.get(key) }, serve: callback => { handler = callback; } },
});
const imported = new SyntheticModule(['createClient'], function () { this.setExport('createClient', createClient); }, { context });
const source = new SourceTextModule(stripTypeScriptTypes(readFileSync('supabase/functions/create-checkout/index.ts', 'utf8'), { mode: 'strip' }), { context });
await source.link(specifier => {
    assert.match(specifier, /^npm:@supabase\/supabase-js@/, 'Only the official Supabase import is mocked');
    return imported;
});
await source.evaluate();
assert.equal(typeof handler, 'function');

const reset = () => {
    calls.length = 0;
    logs.length = 0;
    state = {
        user: { id: customerId, email: 'synthetic@example.invalid' }, authError: null, rpcError: null,
        order: { order_id: orderId, subtotal: 100, discount: 0, shipping: 19.9, total: 119.9, items: [{ product_id: 1, title: 'Synthetic product', quantity: 2, unit_price: 50 }] },
        existingOrder: { id: orderId, customer_id: customerId, payment_status: 'pending', payment_url: null, payment_reference: null, total: 119.9 },
        providerStatus: 201, providerPayload: { id: 'mock-preference', init_point: paymentUrl },
        providerMode: 'json', persistError: false, documentError: false,
    };
};
const body = () => ({
    checkoutKey, items: [{ productId: 1, quantity: 2 }],
    shipping: { name: 'Synthetic Customer', phone: '22999999999', zip: '01001000', address: 'Synthetic street', number: '10' },
    payerDocument: '52998224725',
});
const request = ({ method = 'POST', requestOrigin = origin, payload = body(), authenticated = true } = {}) => {
    const headers = { 'Content-Type': 'application/json' };
    if (requestOrigin) headers.Origin = requestOrigin;
    if (authenticated) headers.Authorization = 'Bearer mock-user-token';
    return new Request('https://mock-project.supabase.co/functions/v1/create-checkout', {
        method, headers, ...(method === 'POST' ? { body: JSON.stringify(payload) } : {}),
    });
};
const invoke = async options => {
    const response = await handler(request(options));
    return { response, payload: response.status === 204 ? null : await response.json() };
};
const providerCalls = () => calls.filter(call => call.kind === 'provider');
const rpcCalls = () => calls.filter(call => call.kind === 'rpc');

// Regression: configured URL with slash/path must not reject mobile preflight.
for (const requestOrigin of [origin, 'https://graphenemanipulacoes.com.br', 'http://127.0.0.1:5173', 'http://localhost:4173']) {
    reset();
    const { response } = await invoke({ method: 'OPTIONS', requestOrigin, authenticated: false });
    assert.equal(response.status, 204, `Allowed preflight: ${requestOrigin}`);
    assert.equal(response.headers.get('Access-Control-Allow-Origin'), requestOrigin);
    assert.match(response.headers.get('Access-Control-Allow-Headers'), /authorization/i);
    assert.match(response.headers.get('Access-Control-Allow-Headers'), /apikey/i);
    assert.match(response.headers.get('Access-Control-Allow-Headers'), /x-retry-count/i);
    assert.match(response.headers.get('Vary'), /Origin/i);
    assert.equal(calls.length, 0, 'OPTIONS must not authenticate, query or create payments');
}
for (const requestOrigin of ['https://evil.example', 'https://graphenemanipulacoes.com.br.evil.example', 'http://graphenemanipulacoes.com.br', null]) {
    reset(); const { response } = await invoke({ method: 'OPTIONS', requestOrigin, authenticated: false });
    assert.equal(response.status, 403, `Disallowed preflight: ${requestOrigin}`);
    assert.notEqual(response.headers.get('Access-Control-Allow-Origin'), '*');
    assert.equal(calls.length, 0);
}
reset(); assert.equal((await invoke({ requestOrigin: 'https://evil.example' })).response.status, 403); assert.equal(calls.length, 0);
reset(); assert.equal((await invoke({ method: 'GET' })).response.status, 403); assert.equal(calls.length, 0);
reset(); state.user = null; state.authError = { message: 'mock rejected token' };
assert.equal((await invoke({ authenticated: false })).response.status, 401);
assert.equal(rpcCalls().length, 0); assert.equal(providerCalls().length, 0);

reset();
let result = await invoke();
assert.equal(result.response.status, 200, JSON.stringify(result.payload));
assert.equal(result.payload.orderId, orderId); assert.equal(result.payload.paymentUrl, paymentUrl);
assert.equal(rpcCalls().length, 1); assert.equal(rpcCalls()[0].name, 'create_checkout_order_v2');
assert.equal(rpcCalls()[0].args.p_customer_id, customerId);
assert.equal(rpcCalls()[0].args.p_checkout_key, checkoutKey);
assert.equal(providerCalls().length, 1);
let preference = providerCalls()[0].payload;
assert.equal(Math.round(preference.items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0) * 100), 11990, 'Provider total includes server-calculated freight');
assert.equal(preference.external_reference, orderId);
assert.equal(preference.back_urls.success, `${origin}/pedido/retorno?status=success`, 'Canonical URL must not contain //pedido');
assert.equal(preference.notification_url, 'https://mock-project.supabase.co/functions/v1/payment-webhook');
assert.ok(providerCalls()[0].options.signal, 'Provider request must have a finite timeout');

reset(); state.order.discount = 10; state.order.total = 109.9;
result = await invoke(); assert.equal(result.response.status, 200, JSON.stringify(result.payload));
preference = providerCalls()[0].payload;
assert.equal(Math.round(preference.items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0) * 100), 10990, 'Discount + freight are charged exactly once');

for (const [status, expected] of [[400, 'payment_provider_request_rejected'], [401, 'payment_provider_credentials_invalid'], [403, 'payment_provider_credentials_invalid'], [503, 'payment_provider_unavailable']]) {
    reset(); state.providerStatus = status; state.providerPayload = { error: 'synthetic_provider_error', message: 'secret private detail' };
    result = await invoke(); assert.equal(result.response.status, 502); assert.equal(result.payload.error, expected);
    assert.equal(providerCalls().length, 1, 'No automatic preference retry');
    assert.ok(!JSON.stringify(result.payload).includes('secret'));
}
for (const providerMode of ['timeout', 'network', 'non-json']) {
    reset(); state.providerMode = providerMode;
    result = await invoke(); assert.ok(result.response.status >= 500);
    assert.equal(result.payload.error, 'payment_provider_unavailable', `Recoverable provider failure: ${providerMode}`);
    assert.equal(providerCalls().length, 1);
    assert.ok(!JSON.stringify(result.payload).includes('secret'));
}
reset(); state.persistError = true;
result = await invoke(); assert.ok(result.response.status >= 500, 'Do not claim a payment URL was saved if persistence failed');
assert.ok(!result.payload.paymentUrl); assert.ok(!JSON.stringify(result.payload).includes('secret'));

reset(); state.order.items = null;
result = await invoke(); assert.ok(result.response.status >= 400, 'Invalid SQL return contract cannot create an unverified charge');
assert.equal(providerCalls().length, 0);

reset(); state.order.total = 1;
result = await invoke(); assert.equal(result.payload.error, 'invalid_order_total'); assert.equal(providerCalls().length, 0);
reset(); state.documentError = true;
result = await invoke(); assert.equal(result.response.status, 500); assert.equal(providerCalls().length, 0);
assert.ok(!JSON.stringify(logs).includes('secret')); assert.ok(!JSON.stringify(logs).includes(body().payerDocument));
assert.ok(!JSON.stringify(logs).includes(state.user.email));
reset(); state.existingOrder = null;
result = await invoke(); assert.equal(result.response.status, 500); assert.equal(providerCalls().length, 0);
reset(); state.existingOrder.payment_url = paymentUrl; state.existingOrder.payment_reference = 'mock-existing';
result = await invoke(); assert.equal(result.response.status, 200); assert.equal(result.payload.paymentUrl, paymentUrl);
assert.equal(providerCalls().length, 0, 'A valid stored preference must be reused without creating a new one');
reset(); state.existingOrder.payment_status = 'paid';
result = await invoke(); assert.equal(result.response.status, 409); assert.equal(result.payload.error, 'checkout_already_completed');
assert.equal(providerCalls().length, 0);
for (const error of ['invalid_order_total', 'checkout_key_conflict', 'checkout_already_completed', 'invalid_variant']) {
    reset(); state.rpcError = { message: error, code: 'P0001' }; state.order = null;
    result = await invoke(); assert.equal(result.response.status, 422); assert.equal(result.payload.error, error);
    assert.equal(providerCalls().length, 0);
}
for (const init_point of ['http://www.mercadopago.com.br/pay', 'https://mercadopago.com.br.evil.example/pay', 'https://secret@www.mercadopago.com.br/pay', 'javascript:alert(1)']) {
    reset(); state.providerPayload.init_point = init_point;
    result = await invoke(); assert.equal(result.response.status, 502); assert.ok(!result.payload.paymentUrl);
}
for (const items of [[], [null], [{ productId: -1, quantity: 2 }], [{ productId: 1, quantity: 21 }]]) {
    reset(); result = await invoke({ payload: { ...body(), items } });
    assert.equal(result.response.status, 400); assert.equal(result.payload.error, 'invalid_cart');
    assert.equal(rpcCalls().length, 0); assert.equal(providerCalls().length, 0);
}

console.log('Checkout server: origins/preflight, Auth, v2 pricing + freight, canonical URLs, provider failure/timeout and persistence checks passed (isolated mocks).');
