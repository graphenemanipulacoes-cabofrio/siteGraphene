// Run the real coupon handler and reporting functions against synthetic data.
// No network, real customers, coupon writes, reservations or payments.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
import { createContext, SourceTextModule, SyntheticModule } from 'node:vm';
import { couponOrdersCsv, filterCouponOrders, summarizeCouponOrders } from '../src/utils/couponReporting.js';

let handler;
let user = { id: 'synthetic-user' };
let lookupError = null;
let rows = [];
const calls = [];
const env = { SITE_URL: 'https://www.graphenemanipulacoes.com.br', SUPABASE_URL: 'https://mock.supabase.co', SUPABASE_ANON_KEY: 'mock-anon', SUPABASE_SERVICE_ROLE_KEY: 'mock-service' };
const context = createContext({ Request, Response, URL, console, Deno: { serve: callback => { handler = callback; }, env: { get: key => env[key] } } });
const sdk = new SyntheticModule(['createClient'], function () {
    this.setExport('createClient', () => ({
        auth: { getUser: async () => ({ data: { user }, error: null }) },
        rpc: async (name, args) => { calls.push({ name, args }); return { data: rows, error: lookupError }; },
        from: () => { throw new Error('No direct table writes or reads allowed in this handler'); },
    }));
}, { context });
const http = new SourceTextModule(stripTypeScriptTypes(readFileSync('supabase/functions/_shared/http.ts', 'utf8')), { context });
await http.link(() => { throw new Error('Unexpected HTTP import'); });
const module = new SourceTextModule(stripTypeScriptTypes(readFileSync('supabase/functions/customer-coupons/index.ts', 'utf8')), { context });
await module.link(name => name.startsWith('npm:') ? sdk : http);
await module.evaluate();
const invoke = async ({ payload = { action: 'search', query: 'syn' }, origin = env.SITE_URL, auth = true, method = 'POST' } = {}) => {
    calls.length = 0;
    const response = await handler(new Request('https://mock.supabase.co/functions/v1/customer-coupons', {
        method, headers: { Origin: origin, ...(auth ? { Authorization: 'Bearer synthetic' } : {}) },
        ...(method === 'POST' ? { body: JSON.stringify(payload) } : {}),
    }));
    return { response, data: response.status === 204 ? null : await response.json() };
};
for (const origin of [env.SITE_URL, 'https://graphenemanipulacoes.com.br', 'https://site-graphene.vercel.app', 'http://127.0.0.1:5173']) {
    const result = await invoke({ origin, method: 'OPTIONS', auth: false });
    assert.equal(result.response.status, 204); assert.equal(result.response.headers.get('Access-Control-Allow-Origin'), origin); assert.equal(calls.length, 0);
}
assert.equal((await invoke({ origin: 'https://unknown.vercel.app' })).response.status, 403);
assert.equal((await invoke({ auth: false })).response.status, 401); assert.equal(calls.length, 0);
user = null; assert.equal((await invoke()).response.status, 401); assert.equal(calls.length, 0); user = { id: 'synthetic-user' };
for (const query of ['sy', '', '%', '_%', 'x'.repeat(41)]) {
    assert.deepEqual((await invoke({ payload: { action: 'search', query } })).data, { coupons: [] }); assert.equal(calls.length, 0);
}
const synthetic = { code: 'SYNTHETIC15', partner_name: 'SYNTHETIC', discount_type: 'percentage', discount_value: 15, minimum_order_amount: 0, email: 'private@example.invalid', commission_value: 99, recipient_id: 'private' };
rows = [synthetic];
let result = await invoke();
assert.equal(calls[0].name, 'lookup_checkout_coupons');
assert.deepEqual(JSON.parse(JSON.stringify(calls[0].args)), { p_query: 'SYN', p_exact: false });
assert.equal(result.data.coupons[0].code, 'SYNTHETIC15');
for (const privateValue of ['private@example.invalid', 'commission_value', 'recipient_id']) assert.ok(!JSON.stringify(result.data).includes(privateValue));
rows = Array.from({ length: 12 }, () => synthetic); assert.equal((await invoke()).data.coupons.length, 6); rows = [synthetic];
const validate = (subtotal, query = 'synthetic15') => invoke({ payload: { action: 'validate', query, subtotal } });
result = await validate(199.9); assert.equal(result.data.coupon.discountAmount, 29.99); assert.equal(calls[0].args.p_exact, true);
for (const subtotal of [0, -1, null, '100', 10_000_001]) assert.equal((await validate(subtotal)).response.status, 400);
rows = [{ ...synthetic, minimum_order_amount: 200 }];
result = await validate(100); assert.equal(result.data.error, 'coupon_minimum_not_reached'); assert.equal(result.data.minimumOrderAmount, 200);
rows = [{ ...synthetic, discount_type: 'fixed', discount_value: 30 }]; assert.equal((await validate(100)).data.coupon.discountAmount, 30);
assert.equal((await validate(20)).data.coupon.discountAmount, 20, 'Discount never exceeds products and never discounts freight');
rows = [{ ...synthetic, discount_value: 200 }]; assert.equal((await validate(100)).data.coupon.discountAmount, 100);
rows = []; assert.equal((await validate(100)).data.error, 'invalid_coupon');
lookupError = { message: 'private query secret' }; result = await invoke(); assert.equal(result.response.status, 503); assert.ok(!JSON.stringify(result.data).includes('secret')); lookupError = null;
assert.equal((await invoke({ payload: { action: 'delete', query: 'syn' } })).response.status, 400); assert.equal(calls.length, 0);

const orders = [
    { id: '1', customer_email: 'synthetic@example.invalid', discount_code: 'SYNTHETIC15', commission_recipients: { name: 'Parceiro Sintético' }, payment_status: 'paid', subtotal: 100, total: 85, discount_amount: 15, provider_fee: 4, created_at: '2026-10-23T01:00:00Z' },
    { id: '2', discount_code: 'SYNTHETIC15', commission_recipients: { name: 'Parceiro Sintético' }, payment_status: 'pending', total: 85, discount_amount: 15, created_at: '2026-10-23T12:00:00Z' },
    { id: '3', discount_code: 'SYNTHETIC15', payment_status: 'refunded', total: 85, discount_amount: 15, created_at: '2026-10-23T12:00:00Z' },
    { id: '4', payment_status: 'paid', subtotal: 50, total: 50, created_at: '2026-10-23T12:00:00Z' },
];
assert.equal(filterCouponOrders(orders, { search: 'sintetico' }).length, 2);
assert.equal(filterCouponOrders(orders, { attributedOnly: true }).length, 3);
assert.equal(filterCouponOrders(orders, { status: 'paid', search: 'synthetic15' }).length, 1);
assert.equal(filterCouponOrders(orders, { from: '2026-10-23', to: '2026-10-23' }).length, 3, 'Dates use Brasília, not UTC day');
assert.deepEqual(summarizeCouponOrders(filterCouponOrders(orders, { attributedOnly: true })), { paidCount: 1, gross: 85, discounts: 15, pendingCount: 1 });
const csv = couponOrdersCsv([{ ...orders[0], customer_email: '=SUM(1;1)', commission_recipients: { name: '@formula' } }]);
assert.ok(csv.startsWith('\uFEFF')); assert.ok(csv.includes('"\'=SUM(1;1)"')); assert.ok(csv.includes('"\'@formula"')); assert.ok(csv.includes('"81,00"')); assert.ok(csv.includes('SYNTHETIC15'));
console.log('Coupon checks passed: authenticated safe projection, min 3 characters, uppercase, CORS, limits, exact validation, minimum, rounding, fixed/percentage/cap, failures, paid attribution filters, Brasília dates and CSV formula safety.');
