// Estorno pelo painel (ação refund_order da admin-orders) com Mercado Pago e banco simulados.
// Nenhum pagamento real é consultado ou estornado.
// Uso: node --experimental-vm-modules scripts/verify-refund.mjs
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
import { SourceTextModule, SyntheticModule, createContext } from 'node:vm';
import { webcrypto } from 'node:crypto';
import { canRefund, refundErrorMessage, refundMessages } from '../src/utils/refund.js';

const site = 'https://www.graphenemanipulacoes.com.br';
const orderId = '11111111-1111-4111-8111-111111111111';
const paidOrder = { id: orderId, total: 150, payment_status: 'paid', payment_provider: 'mercado_pago', payment_details: { provider: 'mercado_pago', payment_id: '987654321' } };
const state = {};
const reset = (order = paidOrder) => Object.assign(state, {
  order: structuredClone(order), updates: [], audit: [], rpc: [], calls: [], updateError: null, noToken: false,
  refundReply: { status: 201, body: { id: 555, amount: 150, status: 'approved' } }, paymentReply: { status: 200, body: { status: 'approved' } },
});

class Query {
  constructor(table) { this.table = table; this.op = 'select'; }
  select() { return this; }
  eq() { return this; }
  gt() { return this; }
  maybeSingle() { return this; }
  single() { return this; }
  update(value) { this.op = 'update'; this.value = value; return this; }
  insert(value) { this.op = 'insert'; this.value = value; return this; }
  then(resolve, reject) {
    let result = { data: null, error: null };
    if (this.table === 'admin_sessions' && this.op === 'select') result = { data: { admin_username: 'admin@example.invalid', expires_at: '2999-01-01' }, error: null };
    else if (this.table === 'orders' && this.op === 'select') result = { data: state.order, error: null };
    else if (this.table === 'orders' && this.op === 'update') {
      state.updates.push(this.value);
      result = state.updateError ? { data: null, error: state.updateError } : { data: { id: orderId, ...this.value }, error: null };
    } else if (this.table === 'admin_audit_log' && this.op === 'insert') state.audit.push(this.value);
    return Promise.resolve(result).then(resolve, reject);
  }
}
const client = { from: table => new Query(table), rpc: async (name, args) => { state.rpc.push({ name, args }); return { data: null, error: null }; } };

const fakeFetch = async (url, init = {}) => {
  state.calls.push({ url: String(url), method: init.method || 'GET', headers: init.headers || {}, body: init.body });
  const reply = String(url).endsWith('/refunds') ? state.refundReply : state.paymentReply;
  return new Response(JSON.stringify(reply.body), { status: reply.status, headers: { 'Content-Type': 'application/json' } });
};

let handler;
const env = key => ({ SITE_URL: site, SUPABASE_URL: 'https://project.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'service-role-de-teste', MERCADO_PAGO_ACCESS_TOKEN: state.noToken ? undefined : 'TEST-token-de-teste' })[key];
const context = createContext({ Number, Array, Set, Math, Date, String, JSON, RegExp, Object, Promise, btoa, atob, crypto: webcrypto, TextEncoder, Uint8Array, URL, Request, Response, console: { ...console, error() {} }, fetch: fakeFetch, Deno: { env: { get: env }, serve: fn => { handler = fn; } } });
const read = path => new SourceTextModule(stripTypeScriptTypes(readFileSync(path, 'utf8')), { context });
const modules = {
  'counter-security': read('supabase/functions/_shared/counter-security.ts'),
  'partner-results': read('supabase/functions/_shared/partner-results.ts'),
  'customer-insights': read('supabase/functions/_shared/customer-insights.ts'),
  http: read('supabase/functions/_shared/http.ts'),
};
const supabase = new SyntheticModule(['createClient'], function () { this.setExport('createClient', () => client); }, { context });
const main = read('supabase/functions/admin-orders/index.ts');
await main.link(specifier => specifier.includes('supabase-js') ? supabase : modules[Object.keys(modules).find(name => specifier.includes(name))] || modules.http);
await main.evaluate();

const call = async (body, token = 'x'.repeat(43)) => {
  const response = await handler(new Request('https://project.supabase.co/functions/v1/admin-orders', { method: 'POST', headers: { origin: site, 'content-type': 'application/json', 'x-admin-token': token }, body: JSON.stringify(body) }));
  return { status: response.status, data: await response.json() };
};
const refund = (extra = {}) => call({ action: 'refund_order', orderId, reason: 'Desistência', ...extra });

// Sem sessão do painel ou com pedido inválido: nada chega ao Mercado Pago.
reset();
assert.equal((await call({ action: 'refund_order', orderId }, 'curto')).status, 401);
assert.equal((await refund({ orderId: 'nao-e-pedido' })).status, 400);
reset(null);
assert.deepEqual(await refund(), { status: 404, data: { error: 'order_not_found' } });
for (const [order, error] of [
  [{ ...paidOrder, payment_status: 'pending' }, 'payment_not_confirmed'],
  [{ ...paidOrder, payment_status: 'failed' }, 'payment_not_confirmed'],
  [{ ...paidOrder, payment_status: 'refunded' }, 'already_refunded'],
  [{ ...paidOrder, payment_details: {} }, 'payment_not_refundable'],
  [{ ...paidOrder, payment_details: { payment_id: '12; DROP' } }, 'payment_not_refundable'],
  [{ ...paidOrder, payment_provider: 'outro' }, 'payment_not_refundable'],
]) {
  reset(order);
  const result = await refund();
  assert.equal(result.data.error, error, JSON.stringify(order).slice(0, 80));
  assert.equal(state.calls.length, 0, 'não chama o Mercado Pago');
  assert.equal(state.updates.length, 0);
}
reset(); state.noToken = true;
assert.deepEqual(await refund(), { status: 503, data: { error: 'provider_not_configured' } });
assert.equal(state.calls.length, 0);

// Estorno aprovado: pedido estornado e cancelado, comissão recalculada e ação registrada.
reset();
const done = await refund();
assert.equal(done.status, 200);
assert.equal(done.data.amount, 150);
assert.deepEqual(done.data.order, { id: orderId, payment_status: 'refunded', status: 'cancelled', updated_at: done.data.order.updated_at });
assert.equal(state.calls.length, 1);
assert.equal(state.calls[0].url, 'https://api.mercadopago.com/v1/payments/987654321/refunds');
assert.equal(state.calls[0].method, 'POST');
assert.equal(state.calls[0].body, '{}', 'sem valor = estorno total');
assert.equal(state.calls[0].headers.Authorization, 'Bearer TEST-token-de-teste');
assert.equal(state.calls[0].headers['X-Idempotency-Key'], `graphene-refund-${orderId}`);
assert.equal(JSON.stringify(state.rpc), JSON.stringify([{ name: 'create_order_commissions', args: { p_order_id: orderId } }]));
assert.equal(state.audit.length, 1);
assert.equal(state.audit[0].action, 'refund_order');
assert.equal(state.audit[0].target, orderId);
assert.equal(state.audit[0].actor, 'admin@example.invalid');
assert.equal(state.audit[0].details.amount, 150);
assert.equal(state.audit[0].details.reason, 'Desistência');
assert.equal(JSON.stringify(state.audit).includes('TEST-token'), false, 'a chave do Mercado Pago não vai para o registro');

// Repetir o pedido usa a mesma chave de repetição: o Mercado Pago não devolve duas vezes.
reset();
await refund(); await refund();
assert.equal(state.calls[0].headers['X-Idempotency-Key'], state.calls[1].headers['X-Idempotency-Key']);

// Já estornado no site do Mercado Pago: confere o pagamento e só então marca o pedido.
reset(); state.refundReply = { status: 400, body: { message: 'Charge already refunded', cause: [] } }; state.paymentReply = { status: 200, body: { status: 'refunded' } };
const already = await refund();
assert.equal(already.status, 200);
assert.equal(state.calls[1].url, 'https://api.mercadopago.com/v1/payments/987654321');
assert.equal(state.updates[0].payment_status, 'refunded');

// Recusas do Mercado Pago: nada muda no pedido nem nas comissões.
for (const [reply, error] of [
  [{ status: 404, body: { message: 'Payment not found' } }, 'payment_not_found'],
  [{ status: 400, body: { message: 'Payment too old to be refunded' } }, 'refund_too_old'],
  [{ status: 400, body: { message: 'bad_request', cause: [{ code: 'insufficient_amount', description: 'Insufficient balance' }] } }, 'refund_insufficient_balance'],
  [{ status: 500, body: {} }, 'refund_failed'],
]) {
  reset(); state.refundReply = reply;
  const result = await refund();
  assert.deepEqual(result, { status: 502, data: { error } }, reply.body.message || 'erro');
  assert.equal(state.updates.length, 0);
  assert.equal(state.rpc.length, 0);
  assert.equal(state.audit.length, 0);
}

// Estorno aceito, mas em processamento: o aviso do Mercado Pago atualiza o pedido depois.
reset(); state.refundReply = { status: 201, body: { id: 556, amount: 150, status: 'in_process' } };
assert.deepEqual(await refund(), { status: 202, data: { pending: true } });
assert.equal(state.updates.length, 0);
assert.equal(state.audit[0].details.status, 'in_process');

// Dinheiro devolvido, mas o pedido não gravou: avisa e mantém o registro da ação.
reset(); state.updateError = { message: 'down' };
assert.deepEqual(await refund(), { status: 500, data: { error: 'refunded_not_saved' } });
assert.equal(state.audit.length, 1);
assert.equal(state.rpc.length, 0);

// Tela: quando o botão aparece e as mensagens de erro.
assert.equal(canRefund(paidOrder), true);
assert.equal(canRefund({ ...paidOrder, payment_status: 'refunded' }), false);
assert.equal(canRefund({ ...paidOrder, payment_details: null }), false);
assert.equal(canRefund({ ...paidOrder, payment_provider: null }), false);
assert.equal(canRefund(undefined), false);
for (const code of ['already_refunded', 'payment_not_confirmed', 'payment_not_refundable', 'provider_not_configured', 'payment_not_found', 'refund_too_old', 'refund_insufficient_balance', 'refund_failed', 'refunded_not_saved']) {
  assert.ok(refundMessages[code], code);
}
assert.match(refundErrorMessage('desconhecido'), /Confira o pagamento no Mercado Pago/);

console.log('Estorno conferido: validações, chamada ao Mercado Pago, chave de repetição, recusas, processamento, comissões e registro. Nenhum pagamento real.');
