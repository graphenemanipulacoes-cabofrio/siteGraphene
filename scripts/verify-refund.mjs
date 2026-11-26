// Estorno pelo painel (ações refund_order e refund_extra_payment da admin-orders), conferência no
// Mercado Pago (reconcile_order) e alertas do Financeiro, com Mercado Pago e banco simulados.
// Nenhum pagamento real é consultado ou estornado. A gravação no pedido passa pela RPC apply_mp_payment
// (simulada aqui com as mesmas regras de status; as regras reais são testadas em verify-payment-rules-db.sql).
// Uso: node --experimental-vm-modules scripts/verify-refund.mjs
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
import { SourceTextModule, SyntheticModule, createContext } from 'node:vm';
import { webcrypto } from 'node:crypto';
import { canRefund, refundErrorMessage, refundMessages, refundPaymentId } from '../src/utils/refund.js';

const site = 'https://www.graphenemanipulacoes.com.br';
const orderId = '11111111-1111-4111-8111-111111111111';
const otherOrderId = '22222222-2222-4222-8222-222222222222';
const attemptId = '33333333-3333-4333-8333-333333333333';
const paidOrder = { id: orderId, total: 150, status: 'paid', payment_status: 'paid', payment_provider: 'mercado_pago', paid_payment_id: '987654321', payment_details: { provider: 'mercado_pago', payment_id: '987654321' } };
const mpPayment = (id, extra = {}) => ({ id: Number(id), external_reference: orderId, status: 'approved', status_detail: 'accredited', transaction_amount: 150, payment_type_id: 'credit_card', payment_method_id: 'visa', installments: 1, fee_details: [{ amount: 5 }], transaction_details: { net_received_amount: 145 }, ...extra });
const state = {};
const reset = (order = paidOrder) => Object.assign(state, {
  order: order ? structuredClone(order) : null, updates: [], audit: [], rpc: [], calls: [], applyError: null, noToken: false,
  payments: { 987654321: { status: 200, body: mpPayment('987654321') } },
  refundReply: { status: 201, body: { id: 555, amount: 150, status: 'approved' } }, keepApproved: false, refundList: { status: 200, body: [] },
  attempt: null, attemptError: null, staleAttempts: [], search: { status: 200, body: { results: [] } }, alerts: [], attempts: [], events: [],
});

class Query {
  constructor(table) { this.table = table; this.op = 'select'; this.filters = {}; }
  select(_columns, options) { if (options?.head) this.head = true; return this; }
  eq(key, value) { this.filters[key] = value; return this; }
  in(key, value) { this.filters[key] = value; return this; }
  is(key, value) { this.filters[key] = value; return this; }
  neq(key, value) { this.excluded = { ...this.excluded, [key]: value }; return this; }
  gt() { return this; } gte() { return this; } lt() { return this; } order() { return this; } limit() { return this; }
  maybeSingle() { return this; }
  single() { return this; }
  update(value) { this.op = 'update'; this.value = value; return this; }
  insert(value) { this.op = 'insert'; this.value = value; return this; }
  then(resolve, reject) {
    let result = { data: null, error: null };
    if (this.table === 'admin_sessions' && this.op === 'select') result = { data: { admin_username: 'admin@example.invalid', expires_at: '2999-01-01' }, error: null };
    else if (this.table === 'orders' && this.op === 'select') result = { data: state.order && this.filters.id === state.order.id ? structuredClone(state.order) : null, error: null };
    else if (this.table === 'orders' && this.op === 'update') { state.updates.push(this.value); result = { data: null, error: null }; }
    else if (this.table === 'admin_audit_log' && this.op === 'insert') state.audit.push(this.value);
    else if (this.table === 'admin_audit_log' && this.head) result = { data: null, count: state.audit.filter(entry => entry.action === this.filters.action && entry.target === this.filters.target).length, error: null };
    else if (this.table === 'payment_attempts' && this.filters.provider_payment_id) result = { data: state.attempt, error: state.attemptError };
    else if (this.table === 'payment_attempts' && this.filters.status === 'creating') result = { data: state.staleAttempts, error: null };
    else if (this.table === 'payment_attempts' && this.filters.id) result = { data: state.attempts.filter(row => this.filters.id.includes(row.id)), error: null };
    else if (this.table === 'payment_events' && this.filters.decision) result = { data: state.alerts, error: null };
    else if (this.table === 'payment_events') result = { data: state.events.filter(row => Object.entries(this.excluded || {}).every(([key, value]) => row[key] !== value)), error: null };
    else if (this.op === 'select') result = { data: [], error: null };
    return Promise.resolve(result).then(resolve, reject);
  }
}
// apply_mp_payment simulada: estorno do pagamento que pagou o pedido = refunded; o status só vira 'cancelled'
// se o pedido ainda não estava em preparo, enviado ou entregue (refunded_after_fulfillment).
const applyPayment = payment => {
  const order = state.order;
  const main = order?.paid_payment_id || order?.payment_details?.payment_id;
  let decision = 'repeat';
  if (payment.status === 'refunded' && payment.id === main && order.payment_status === 'paid') {
    decision = ['awaiting_payment', 'paid', 'cancelled'].includes(order.status) ? 'refunded' : 'refunded_after_fulfillment';
    Object.assign(order, { payment_status: 'refunded', status: ['awaiting_payment', 'paid'].includes(order.status) ? 'cancelled' : order.status, updated_at: '2026-11-26T13:00:00.000Z' });
  } else if (payment.status === 'refunded' && payment.id !== main) decision = 'reversal_other';
  else if (payment.status === 'rejected') decision = 'failed';
  return { decision, alerts: [], order_id: order?.id || null, payment_status: order?.payment_status || null, status: order?.status || null, paid_payment_id: main || null, attempt_id: null };
};
const client = {
  from: table => new Query(table),
  rpc: async (name, args) => {
    state.rpc.push({ name, args: structuredClone(args) });
    if (name === 'apply_mp_payment') return state.applyError ? { data: null, error: state.applyError } : { data: applyPayment(args.p_payment), error: null };
    return { data: { ok: true }, error: null };
  },
};

const fakeFetch = async (url, init = {}) => {
  const target = String(url);
  assert.match(target, /^https:\/\/api\.mercadopago\.com\/v1\/payments(\/\d{1,20}(\/refunds)?|\/search\?.*)$/, `Só a API de pagamentos: ${target}`);
  const method = init.method || 'GET';
  state.calls.push({ url: target, method, headers: init.headers || {}, body: init.body, signal: init.signal });
  let reply;
  if (target.endsWith('/refunds') && method === 'GET') reply = state.refundList;
  else if (target.endsWith('/refunds')) {
    reply = state.refundReply;
    const id = target.split('/').at(-2);
    if (!reply.mode && reply.status < 300 && reply.body.status === 'approved' && !state.keepApproved && state.payments[id]) state.payments[id].body.status = 'refunded';
  } else if (target.includes('/search?')) reply = state.search;
  else reply = state.payments[target.split('/').pop()] || { status: 404, body: { message: 'Payment not found' } };
  if (reply.mode === 'network') throw new TypeError('rede sintética');
  return new Response(JSON.stringify(reply.body), { status: reply.status, headers: { 'Content-Type': 'application/json' } });
};

let handler;
const env = key => ({ SITE_URL: site, SUPABASE_URL: 'https://project.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'service-role-de-teste', MERCADO_PAGO_ACCESS_TOKEN: state.noToken ? undefined : 'TEST-token-de-teste' })[key];
const context = createContext({ Number, Array, Set, Math, Date, String, JSON, RegExp, Object, Promise, btoa, atob, crypto: webcrypto, TextEncoder, Uint8Array, URL, Request, Response, Headers, AbortSignal, DOMException, structuredClone, console: { ...console, error() {} }, fetch: fakeFetch, Deno: { env: { get: env }, serve: fn => { handler = fn; } } });
const read = path => new SourceTextModule(stripTypeScriptTypes(readFileSync(path, 'utf8')), { context });
const modules = {
  'counter-security': read('supabase/functions/_shared/counter-security.ts'),
  'partner-results': read('supabase/functions/_shared/partner-results.ts'),
  'customer-insights': read('supabase/functions/_shared/customer-insights.ts'),
  'mercado-pago': read('supabase/functions/_shared/mercado-pago.ts'),
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
const route = entry => `${entry.method} ${entry.url.replace('https://api.mercadopago.com', '')}`;
const applies = () => state.rpc.filter(entry => entry.name === 'apply_mp_payment');

// ---- refund_order: sem sessão do painel ou com pedido inválido, nada chega ao Mercado Pago ----
reset();
assert.equal((await call({ action: 'refund_order', orderId }, 'curto')).status, 401);
assert.equal((await refund({ orderId: 'nao-e-pedido' })).status, 400);
reset(null);
assert.deepEqual(await refund(), { status: 404, data: { error: 'order_not_found' } });
for (const [order, error] of [
  [{ ...paidOrder, payment_status: 'pending' }, 'payment_not_confirmed'],
  [{ ...paidOrder, payment_status: 'failed' }, 'payment_not_confirmed'],
  [{ ...paidOrder, payment_status: 'refunded' }, 'already_refunded'],
  [{ ...paidOrder, paid_payment_id: null, payment_details: {} }, 'payment_not_refundable'],
  [{ ...paidOrder, paid_payment_id: null, payment_details: { payment_id: '12; DROP' } }, 'payment_not_refundable'],
  [{ ...paidOrder, payment_provider: 'outro' }, 'payment_not_refundable'],
]) {
  reset(order);
  const result = await refund();
  assert.equal(result.data.error, error, JSON.stringify(order).slice(0, 80));
  assert.equal(state.calls.length, 0, 'não chama o Mercado Pago');
  assert.equal(state.rpc.length, 0);
}
reset(); state.noToken = true;
assert.deepEqual(await refund(), { status: 503, data: { error: 'provider_not_configured' } });
assert.equal(state.calls.length, 0);

// ---- Estorno aprovado: confere, estorna, lê de novo e grava pela RPC (nunca update direto) ----
reset();
const done = await refund();
assert.equal(done.status, 200, JSON.stringify(done.data));
assert.equal(done.data.amount, 150);
assert.deepEqual(done.data.order, { id: orderId, total: 150, status: 'cancelled', payment_status: 'refunded', payment_provider: 'mercado_pago', paid_payment_id: '987654321', payment_details: paidOrder.payment_details, updated_at: '2026-11-26T13:00:00.000Z' });
assert.deepEqual(state.calls.map(route), ['GET /v1/payments/987654321', 'POST /v1/payments/987654321/refunds', 'GET /v1/payments/987654321']);
const refundCall = state.calls[1];
assert.equal(refundCall.body, '{}', 'sem valor = estorno total');
assert.equal(refundCall.headers.Authorization, 'Bearer TEST-token-de-teste');
assert.equal(refundCall.headers['X-Idempotency-Key'], 'graphene-refund-987654321', 'chave pelo pagamento, não pelo pedido');
assert.equal(refundCall.headers['X-Render-In-Process-Refunds'], 'true', 'estorno de Pix em contingência volta in_process, não 400');
assert.ok(state.calls.every(entry => entry.signal), 'toda chamada tem prazo');
assert.equal(state.updates.length, 0, 'o pedido nunca é gravado direto');
assert.equal(applies().length, 1);
assert.equal(applies()[0].args.p_source, 'refund');
assert.equal(applies()[0].args.p_payment.id, '987654321');
assert.equal(applies()[0].args.p_payment.status, 'refunded');
assert.equal(state.rpc.some(entry => entry.name === 'create_order_commissions'), false, 'a RPC já recalcula as comissões');
const refundAudit = state.audit.filter(entry => entry.action === 'refund_order');
assert.equal(refundAudit.length, 1);
assert.equal(refundAudit[0].target, orderId);
assert.equal(refundAudit[0].actor, 'admin@example.invalid');
assert.equal(refundAudit[0].details.amount, 150);
assert.equal(refundAudit[0].details.reason, 'Desistência');
assert.equal(JSON.stringify(state.audit).includes('TEST-token'), false, 'a chave do Mercado Pago não vai para o registro');

// paid_payment_id tem prioridade sobre payment_details.payment_id; pedido antigo usa payment_details.
reset({ ...paidOrder, paid_payment_id: '111222333', payment_details: { payment_id: '987654321' } });
state.payments['111222333'] = { status: 200, body: mpPayment('111222333') };
await refund();
assert.equal(state.calls[1].url, 'https://api.mercadopago.com/v1/payments/111222333/refunds');
reset({ ...paidOrder, paid_payment_id: null });
assert.equal((await refund()).status, 200);
assert.equal(state.calls[1].url, 'https://api.mercadopago.com/v1/payments/987654321/refunds');
assert.equal(refundPaymentId({ paid_payment_id: '1', payment_details: { payment_id: '2' } }), '1');

// Pedido já em preparo, enviado ou entregue: fica estornado e mantém o andamento.
for (const status of ['processing', 'shipped', 'delivered']) {
  reset({ ...paidOrder, status });
  const result = await refund();
  assert.equal(result.status, 200);
  assert.equal(result.data.order.status, status, `estorno mantém ${status}`);
  assert.equal(result.data.order.payment_status, 'refunded');
}

// Antes de estornar: o pagamento precisa ser deste pedido, com o mesmo valor e aprovado.
for (const [payment, error, status] of [
  [mpPayment('987654321', { external_reference: otherOrderId }), 'payment_mismatch', 409],
  [mpPayment('987654321', { transaction_amount: 149.98 }), 'payment_mismatch', 409],
  [mpPayment('987654321', { transaction_amount: null }), 'payment_mismatch', 409],
  [mpPayment('987654321', { status: 'in_mediation' }), 'payment_not_refundable', 409],
  [mpPayment('987654321', { status: 'charged_back' }), 'payment_not_refundable', 409],
  [mpPayment('987654321', { status: 'pending' }), 'payment_not_refundable', 409],
]) {
  reset(); state.payments['987654321'].body = payment;
  assert.deepEqual(await refund(), { status, data: { error } }, JSON.stringify(payment).slice(0, 90));
  assert.deepEqual(state.calls.map(route), ['GET /v1/payments/987654321'], 'nenhum estorno');
  assert.equal(state.rpc.length, 0);
}
reset(); delete state.payments['987654321'];
assert.deepEqual(await refund(), { status: 502, data: { error: 'payment_not_found' } });
reset(); state.payments['987654321'] = { status: 500, body: {} };
assert.deepEqual(await refund(), { status: 502, data: { error: 'payment_provider_unavailable' } });
assert.equal(state.calls.length, 1);

// Repetir o pedido usa a mesma chave de repetição: o Mercado Pago não devolve duas vezes.
reset(); state.keepApproved = true; state.refundReply = { status: 201, body: { id: 555, amount: 150, status: 'in_process' } };
await refund(); await refund();
const keys = state.calls.filter(entry => entry.method === 'POST' && entry.url.endsWith('/refunds')).map(entry => entry.headers['X-Idempotency-Key']);
assert.deepEqual(keys, ['graphene-refund-987654321', 'graphene-refund-987654321']);

// Já estornado no site do Mercado Pago: não estorna de novo, só grava pela RPC.
reset(); state.payments['987654321'].body.status = 'refunded';
const already = await refund();
assert.equal(already.status, 200);
assert.deepEqual(state.calls.map(route), ['GET /v1/payments/987654321', 'GET /v1/payments/987654321']);
assert.equal(applies()[0].args.p_payment.status, 'refunded');
// Estorno recusado porque outro lugar acabou de estornar: confere o pagamento e grava, sem trocar a chave.
reset(); state.refundReply = { status: 400, body: { message: 'Charge already refunded', cause: [] } };
let gets = 0;
state.payments['987654321'] = { status: 200, get body() { gets += 1; return mpPayment('987654321', { status: gets === 1 ? 'approved' : 'refunded' }); } };
const raced = await refund();
assert.equal(raced.status, 200, JSON.stringify(raced.data));
assert.deepEqual(state.calls.map(route), ['GET /v1/payments/987654321', 'POST /v1/payments/987654321/refunds', 'GET /v1/payments/987654321', 'GET /v1/payments/987654321']);
assert.equal(applies().length, 1);
assert.equal(state.audit.filter(entry => entry.action === 'refund_failed').length, 0);

// Recusas do Mercado Pago: nada muda no pedido; recusa definitiva (4xx) troca a chave da próxima tentativa.
for (const [reply, error, rotates] of [
  [{ status: 404, body: { message: 'Payment not found' } }, 'payment_not_found', true],
  [{ status: 400, body: { message: 'Payment too old to be refunded' } }, 'refund_too_old', true],
  [{ status: 400, body: { message: 'bad_request', cause: [{ code: 'insufficient_amount', description: 'Insufficient balance' }] } }, 'refund_insufficient_balance', true],
  [{ status: 500, body: {} }, 'refund_failed', false],
  [{ status: 503, body: {} }, 'refund_failed', false],
  [{ status: 429, body: {} }, 'refund_failed', false],
]) {
  reset(); state.refundReply = reply;
  const result = await refund();
  assert.deepEqual(result, { status: 502, data: { error } }, reply.body.message || String(reply.status));
  assert.equal(state.updates.length, 0);
  assert.equal(applies().length, 0);
  assert.equal(state.audit.filter(entry => entry.action === 'refund_order').length, 0);
  assert.equal(state.audit.filter(entry => entry.action === 'refund_failed').length, rotates ? 1 : 0, `rotação só em 4xx definitivo (${reply.status})`);
  // A próxima tentativa (por exemplo, depois de pôr saldo) usa a chave nova só depois de uma recusa definitiva.
  state.refundReply = { status: 201, body: { id: 556, amount: 150, status: 'approved' } };
  state.calls.length = 0;
  assert.equal((await refund()).status, 200);
  assert.equal(state.calls.find(entry => entry.method === 'POST' && entry.url.endsWith('/refunds')).headers['X-Idempotency-Key'], rotates ? 'graphene-refund-987654321-1' : 'graphene-refund-987654321');
}
// A recusa definitiva só troca a chave depois de conferir os estornos do pagamento (com o mesmo cabeçalho).
reset(); state.refundReply = { status: 400, body: { message: 'Payment too old to be refunded' } };
await refund();
assert.deepEqual(state.calls.map(route), ['GET /v1/payments/987654321', 'POST /v1/payments/987654321/refunds', 'GET /v1/payments/987654321', 'GET /v1/payments/987654321/refunds']);
assert.equal(state.calls[3].headers['X-Render-In-Process-Refunds'], 'true');
// Estorno de Pix em contingência devolvido como 400, com o pagamento ainda 'approved': nunca troca a chave
// (outra chave mandaria um segundo estorno enquanto o primeiro continua em processamento).
const contingency = { status: 400, body: { message: 'bad_request', cause: [] } };
for (const [label, setup, expected] of [
  ['estorno in_process na lista', () => { state.refundList = { status: 200, body: [{ id: 901, amount: 150, status: 'in_process' }] }; }, { status: 202, data: { pending: true } }],
  ['estorno in_process e valor já devolvido', () => { state.payments['987654321'].body.transaction_amount_refunded = 150; state.refundList = { status: 200, body: [{ id: 901, status: 'in_process' }] }; }, { status: 202, data: { pending: true } }],
  ['valor devolvido > 0, lista vazia', () => { state.payments['987654321'].body.transaction_amount_refunded = 150; }, { status: 502, data: { error: 'refund_failed' } }],
  ['estorno aprovado na lista, pagamento ainda approved', () => { state.refundList = { status: 200, body: [{ id: 901, status: 'approved' }] }; }, { status: 502, data: { error: 'refund_failed' } }],
  ['lista indisponível', () => { state.refundList = { status: 503, body: {} }; }, { status: 502, data: { error: 'refund_failed' } }],
  ['lista sem resposta', () => { state.refundList = { mode: 'network', status: 0, body: {} }; }, { status: 502, data: { error: 'refund_failed' } }],
]) {
  reset(); state.refundReply = contingency; setup();
  assert.deepEqual(await refund(), expected, label);
  assert.equal(state.audit.filter(entry => entry.action === 'refund_failed').length, 0, `sem troca de chave: ${label}`);
  assert.equal(applies().length, 0, label);
  assert.equal(state.updates.length, 0, label);
  if (expected.status === 202) assert.equal(state.audit.find(entry => entry.action === 'refund_order').details.status, 'in_process', label);
  // A próxima tentativa repete a mesma chave.
  state.refundReply = { status: 201, body: { id: 556, amount: 150, status: 'in_process' } }; state.keepApproved = true; state.calls.length = 0;
  await refund();
  assert.equal(state.calls.find(entry => entry.method === 'POST' && entry.url.endsWith('/refunds')).headers['X-Idempotency-Key'], 'graphene-refund-987654321', label);
}
// O GET do pagamento depois da recusa falha: não dá para saber se há estorno; mantém a chave.
reset(); state.refundReply = contingency;
let checkGets = 0;
state.payments['987654321'] = { get status() { checkGets += 1; return checkGets === 1 ? 200 : 503; }, body: mpPayment('987654321') };
assert.deepEqual(await refund(), { status: 502, data: { error: 'refund_failed' } });
assert.equal(state.audit.filter(entry => entry.action === 'refund_failed').length, 0);
assert.equal(state.calls.some(entry => entry.method === 'GET' && entry.url.endsWith('/refunds')), false);
// Só estornos recusados ou cancelados na lista e nada devolvido: recusa definitiva, troca a chave.
reset(); state.refundReply = contingency; state.refundList = { status: 200, body: [{ id: 900, status: 'rejected' }, { id: 899, status: 'cancelled' }] };
assert.deepEqual(await refund(), { status: 502, data: { error: 'refund_failed' } });
assert.equal(state.audit.filter(entry => entry.action === 'refund_failed').length, 1);
// Sem resposta do Mercado Pago (rede ou prazo): mantém a chave, que pode ter sido processada.
reset(); state.refundReply = { mode: 'network', status: 0, body: {} };
assert.deepEqual(await refund(), { status: 502, data: { error: 'payment_provider_unavailable' } });
assert.equal(state.audit.length, 0);

// Estorno aceito, mas em processamento: o aviso do Mercado Pago atualiza o pedido depois.
reset(); state.keepApproved = true; state.refundReply = { status: 201, body: { id: 556, amount: 150, status: 'in_process' } };
assert.deepEqual(await refund(), { status: 202, data: { pending: true } });
assert.equal(applies().length, 0);
assert.equal(state.audit[0].details.status, 'in_process');
// Estorno aprovado, mas o pagamento ainda aparece aprovado: 202, o aviso grava depois.
reset(); state.keepApproved = true;
assert.deepEqual(await refund(), { status: 202, data: { pending: true } });
assert.equal(applies().length, 1);

// Dinheiro devolvido, mas o pedido não gravou: avisa e mantém o registro da ação.
reset(); state.applyError = { message: 'down' };
assert.deepEqual(await refund(), { status: 500, data: { error: 'refunded_not_saved' } });
assert.equal(state.audit.filter(entry => entry.action === 'refund_order').length, 1);
assert.equal(state.updates.length, 0);
// O GET depois do estorno falha: dinheiro devolvido, pedido grava depois pelo aviso.
reset();
let afterGets = 0;
state.payments['987654321'] = { get status() { afterGets += 1; return afterGets === 1 ? 200 : 503; }, body: mpPayment('987654321') };
assert.deepEqual(await refund(), { status: 500, data: { error: 'refunded_not_saved' } });
assert.equal(applies().length, 0);
assert.equal(state.audit.filter(entry => entry.action === 'refund_order').length, 1);

// ---- refund_extra_payment: só pagamento aprovado em dobro, que não é o que pagou o pedido ----
const extra = (body = {}) => call({ action: 'refund_extra_payment', orderId, paymentId: '444555666', ...body });
const withExtra = () => { reset(); state.attempt = { id: attemptId, status: 'approved', order_id: orderId }; state.payments['444555666'] = { status: 200, body: mpPayment('444555666') }; };
withExtra();
let result = await extra();
assert.deepEqual(result, { status: 200, data: { ok: true, amount: 150 } });
assert.deepEqual(state.calls.map(route), ['GET /v1/payments/444555666', 'POST /v1/payments/444555666/refunds', 'GET /v1/payments/444555666']);
assert.equal(state.calls[1].headers['X-Idempotency-Key'], 'graphene-refund-444555666');
assert.equal(applies()[0].args.p_source, 'refund');
assert.equal(applies()[0].args.p_payment.id, '444555666');
assert.equal(state.order.payment_status, 'paid', 'o pedido continua pago');
assert.equal(state.order.status, 'paid');
assert.equal(state.updates.length, 0);
const extraAudit = state.audit.find(entry => entry.action === 'refund_extra_payment');
assert.equal(extraAudit.target, orderId); assert.equal(extraAudit.details.paymentId, '444555666'); assert.equal(extraAudit.details.amount, 150);
for (const [setup, error, status] of [
  [() => { state.attempt = null; }, 'payment_not_extra', 409],
  [() => { state.attempt.status = 'refunded'; }, 'payment_not_extra', 409],
  [() => { state.attempt.status = 'pending'; }, 'payment_not_extra', 409],
  [() => { state.payments['444555666'].body.external_reference = otherOrderId; }, 'payment_mismatch', 409],
  [() => { state.payments['444555666'].body.status = 'rejected'; }, 'payment_not_extra', 409],
  [() => { state.payments['444555666'].body.status = 'refunded'; }, 'already_refunded', 409],
  [() => { state.noToken = true; }, 'provider_not_configured', 503],
]) {
  withExtra(); setup();
  result = await extra();
  assert.deepEqual(result, { status, data: { error } }, error);
  assert.equal(state.calls.filter(entry => entry.url.endsWith('/refunds')).length, 0, 'nenhum estorno');
}
// O pagamento principal nunca é estornado por aqui.
withExtra();
assert.deepEqual(await extra({ paymentId: '987654321' }), { status: 409, data: { error: 'payment_not_extra' } });
assert.equal(state.calls.length, 0);
withExtra();
assert.equal((await extra({ paymentId: 'abc' })).status, 400);
withExtra(); state.refundReply = { status: 201, body: { id: 557, amount: 150, status: 'in_process' } }; state.keepApproved = true;
assert.deepEqual(await extra(), { status: 202, data: { pending: true } });
assert.equal(state.calls.find(entry => entry.method === 'POST').headers['X-Render-In-Process-Refunds'], 'true');
// Pagamento extra em contingência devolvido como 400: 202, sem trocar a chave.
withExtra(); state.refundReply = { status: 400, body: { message: 'bad_request' } }; state.refundList = { status: 200, body: [{ id: 902, status: 'in_process' }] };
assert.deepEqual(await extra(), { status: 202, data: { pending: true } });
assert.equal(state.audit.filter(entry => entry.action === 'refund_failed').length, 0);
assert.equal(state.audit.find(entry => entry.action === 'refund_extra_payment').details.status, 'in_process');

// ---- reconcile_order: busca os pagamentos do pedido e aplica cada um ----
reset({ ...paidOrder, status: 'awaiting_payment', payment_status: 'pending', paid_payment_id: null, payment_details: {} });
state.search = { status: 200, body: { results: [mpPayment('700000001', { status: 'rejected' }), mpPayment('700000002', { external_reference: otherOrderId }), mpPayment('700000003', { status: 'approved' })] } };
state.staleAttempts = [{ id: attemptId }];
result = await call({ action: 'reconcile_order', orderId });
assert.equal(result.status, 200, JSON.stringify(result.data));
assert.equal(state.calls[0].url, `https://api.mercadopago.com/v1/payments/search?external_reference=${orderId}&sort=date_created&criteria=desc`);
assert.deepEqual(applies().map(entry => [entry.args.p_payment.id, entry.args.p_source]), [['700000001', 'reconcile'], ['700000003', 'reconcile']], 'pagamento de outro pedido fica de fora');
assert.deepEqual(result.data.applied.map(item => item.paymentId), ['700000001', '700000003']);
assert.equal(result.data.order.id, orderId);
assert.deepEqual(state.rpc.find(entry => entry.name === 'fail_payment_attempt').args, { p_attempt_id: attemptId, p_status_detail: 'reconcile_not_found' });
assert.equal(state.audit.find(entry => entry.action === 'reconcile_order').details.applied, 2);
assert.equal(state.updates.length, 0);
reset(); state.search = { status: 503, body: {} };
assert.deepEqual(await call({ action: 'reconcile_order', orderId }), { status: 502, data: { error: 'payment_provider_unavailable' } });
reset(null); assert.deepEqual(await call({ action: 'reconcile_order', orderId }), { status: 404, data: { error: 'order_not_found' } });
reset(); state.noToken = true; assert.deepEqual(await call({ action: 'reconcile_order', orderId }), { status: 503, data: { error: 'provider_not_configured' } });
assert.equal((await call({ action: 'reconcile_order', orderId: 'x' })).status, 400);

// ---- Financeiro: alertas agrupados por (decisão, pagamento), com a situação atual da tentativa ----
reset();
state.alerts = [
  { id: 3, order_id: orderId, provider_payment_id: '444555666', decision: 'duplicate_approved', status: 'approved', gross_amount: 150, attempt_id: attemptId, created_at: '2026-11-26T12:03:00Z' },
  { id: 2, order_id: orderId, provider_payment_id: '444555666', decision: 'duplicate_approved', status: 'approved', gross_amount: 150, attempt_id: attemptId, created_at: '2026-11-26T12:02:00Z' },
  // Linha de alerta da apply_mp_payment: status 'alert' e o outro pedido em related_order_id.
  { id: 1, order_id: otherOrderId, provider_payment_id: '700000009', decision: 'duplicate_order', status: 'alert', gross_amount: 99, attempt_id: null, related_order_id: orderId, created_at: '2026-11-26T12:01:00Z' },
];
state.attempts = [{ id: attemptId, status: 'approved' }];
state.events = [
  { id: 10, order_id: otherOrderId, provider_payment_id: '700000009', status: 'approved', decision: 'paid', gross_amount: 99, created_at: '2026-11-26T12:01:00Z' },
  { id: 11, order_id: otherOrderId, provider_payment_id: '700000009', status: 'alert', decision: 'duplicate_order', gross_amount: 99, created_at: '2026-11-26T12:01:00Z' },
];
result = await call({ action: 'finance_dashboard' });
assert.equal(result.status, 200);
assert.deepEqual(result.data.paymentAlerts, [
  { id: 3, decision: 'duplicate_approved', order_id: orderId, provider_payment_id: '444555666', status: 'approved', gross_amount: 150, created_at: '2026-11-26T12:03:00Z', attempt_status: 'approved', related_order_id: null },
  { id: 1, decision: 'duplicate_order', order_id: otherOrderId, provider_payment_id: '700000009', status: 'alert', gross_amount: 99, created_at: '2026-11-26T12:01:00Z', attempt_status: null, related_order_id: orderId },
]);
assert.deepEqual(result.data.paymentEvents.map(event => event.id), [10], 'a atividade recente não mostra as linhas de alerta como pagamento');
const adminSource = readFileSync('supabase/functions/admin-orders/index.ts', 'utf8');
for (const decision of ['duplicate_approved', 'amount_mismatch', 'refunded_after_fulfillment', 'mediation', 'partial_refund', 'reversal_other', 'duplicate_order']) assert.match(adminSource, new RegExp(`'${decision}'`));
assert.match(adminSource, /paid_payment_id,payment_provider/, 'a lista de pedidos traz paid_payment_id');
assert.match(adminSource, /payment_attempts\(id,method,status/, 'a lista de pedidos traz as tentativas');
assert.doesNotMatch(adminSource, /update\(\{ payment_status: 'refunded'/, 'o estorno não grava o pedido direto');

// ---- Tela: quando o botão aparece e as mensagens de erro ----
assert.equal(canRefund(paidOrder), true);
assert.equal(canRefund({ ...paidOrder, payment_details: null }), true, 'paid_payment_id basta');
assert.equal(canRefund({ ...paidOrder, paid_payment_id: null }), true, 'pedido antigo com payment_details');
assert.equal(canRefund({ ...paidOrder, payment_status: 'refunded' }), false);
assert.equal(canRefund({ ...paidOrder, paid_payment_id: null, payment_details: null }), false);
assert.equal(canRefund({ ...paidOrder, payment_provider: null }), false);
assert.equal(canRefund(undefined), false);
for (const code of ['already_refunded', 'payment_not_confirmed', 'payment_not_refundable', 'provider_not_configured', 'payment_not_found', 'refund_too_old', 'refund_insufficient_balance', 'refund_failed', 'refunded_not_saved', 'payment_mismatch', 'payment_not_extra']) {
  assert.ok(refundMessages[code], code);
}
assert.match(refundErrorMessage('desconhecido'), /Confira o pagamento no Mercado Pago/);
assert.match(refundErrorMessage('payment_provider_unavailable'), /Confira o pagamento no Mercado Pago/);

console.log('Estorno conferido: validações, conferência antes do estorno (pedido, valor, situação), chave por pagamento com troca só após recusa definitiva sem estorno em andamento (cabeçalho X-Render-In-Process-Refunds e conferência dos estornos do pagamento), gravação pela RPC (andamento mantido em preparo/enviado/entregue), estorno de pagamento extra, conferência no Mercado Pago, alertas do Financeiro e registro. Nenhum pagamento real.');
