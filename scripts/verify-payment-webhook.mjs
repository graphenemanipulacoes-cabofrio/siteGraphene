// Aviso do Mercado Pago (payment-webhook) numa VM, com Mercado Pago e banco simulados.
// Nenhum pagamento real é consultado; nenhum dado real de cliente. Os módulos _shared reais são ligados.
// Uso: node --experimental-vm-modules scripts/verify-payment-webhook.mjs
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
import { SourceTextModule, SyntheticModule, createContext } from 'node:vm';
import { createHmac, webcrypto } from 'node:crypto';

const orderId = '22222222-2222-4222-8222-222222222222';
const secret = 'segredo-sintetico-do-webhook';
const qrCode = '00020126SYNTHETICPIXCODE5204000053039865802BR';
const payerEmail = 'pagador.sintetico@example.invalid';
const env = new Map();
const logs = [];
let state;
let handler;

const reset = (extraEnv = {}) => {
  env.clear();
  for (const [key, value] of Object.entries({ SUPABASE_URL: 'https://project.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'service-role-de-teste', MERCADO_PAGO_ACCESS_TOKEN: 'TEST-token-de-teste', MERCADO_PAGO_WEBHOOK_SECRET: secret, ...extraEnv })) {
    if (value !== undefined) env.set(key, value);
  }
  logs.length = 0;
  state = {
    fetches: [], rpc: [], queries: [],
    paymentReply: { status: 200, body: payment() },
    rpcResult: { data: { decision: 'paid', alerts: [], order_id: orderId, payment_status: 'paid', status: 'paid' }, error: null },
  };
};
function payment(extra = {}) {
  return {
    id: 1234567890, external_reference: orderId, status: 'approved', status_detail: 'accredited',
    transaction_amount: 119.9, transaction_amount_refunded: 0, payment_type_id: 'credit_card', payment_method_id: 'visa',
    installments: 3, fee_details: [{ type: 'mercadopago_fee', amount: 3.99 }, { type: 'financing_fee', amount: 1 }],
    transaction_details: { net_received_amount: 114.91 }, date_approved: '2026-11-26T10:00:00.000-03:00',
    metadata: { attempt_key: '33333333-3333-4333-8333-333333333333', order_id: orderId },
    payer: { email: payerEmail, identification: { type: 'CPF', number: '52998224725' }, first_name: 'Maria' },
    ...extra,
  };
}

class Query {
  constructor(table) { this.table = table; state.queries.push(table); }
  select() { return this; } update() { return this; } insert() { return this; } eq() { return this; } maybeSingle() { return this; }
  then(resolve, reject) { return Promise.resolve({ data: null, error: null }).then(resolve, reject); }
}
const client = {
  from: table => new Query(table),
  rpc: async (name, args) => { state.rpc.push({ name, args: structuredClone(args) }); return state.rpcResult; },
};
const fakeFetch = async (url, init = {}) => {
  const target = String(url);
  assert.match(target, /^https:\/\/api\.mercadopago\.com\/v1\/payments\/\d{1,20}$/, `Only the payment lookup is allowed: ${target}`);
  state.fetches.push({ url: target, method: init.method || 'GET', headers: init.headers || {}, signal: init.signal });
  const reply = state.paymentReply;
  if (reply.mode === 'network') throw new TypeError('rede sintética');
  if (reply.mode === 'non-json') return new Response('não é json', { status: reply.status });
  return new Response(JSON.stringify(reply.body), { status: reply.status, headers: { 'Content-Type': 'application/json' } });
};
const context = createContext({
  Request, Response, Headers, URL, AbortSignal, DOMException, TextEncoder, TextDecoder, Uint8Array, crypto: webcrypto, structuredClone,
  console: { log: (...args) => logs.push(args), error: (...args) => logs.push(args), warn: (...args) => logs.push(args) },
  fetch: fakeFetch, btoa, atob,
  Deno: { env: { get: key => env.get(key) }, serve: fn => { handler = fn; } },
});
const read = path => new SourceTextModule(stripTypeScriptTypes(readFileSync(path, 'utf8')), { context });
const shared = { 'counter-security': read('supabase/functions/_shared/counter-security.ts'), 'mercado-pago': read('supabase/functions/_shared/mercado-pago.ts') };
const supabase = new SyntheticModule(['createClient'], function () { this.setExport('createClient', () => client); }, { context });
const main = read('supabase/functions/payment-webhook/index.ts');
await main.link(specifier => {
  if (specifier.startsWith('npm:@supabase/supabase-js')) return supabase;
  const module = Object.keys(shared).find(name => specifier === `../_shared/${name}.ts`);
  assert.ok(module, `Unexpected import ${specifier}`);
  return shared[module];
});
await main.evaluate();
assert.equal(typeof handler, 'function');

const sign = (dataId, requestId = 'req-sintetica-1', ts = '1764158400') => `ts=${ts},v1=${createHmac('sha256', secret).update(`id:${dataId.toLowerCase()};request-id:${requestId};ts:${ts};`).digest('hex')}`;
const call = async ({ query = 'data.id=1234567890&type=payment', signature, requestId = 'req-sintetica-1', method = 'POST', body = { type: 'payment', data: { id: '1234567890' } } } = {}) => {
  const params = new URLSearchParams(query);
  const dataId = params.get('data.id') || '';
  const headers = { 'content-type': 'application/json', 'x-request-id': requestId };
  const value = signature === undefined ? sign(dataId, requestId) : signature;
  if (value) headers['x-signature'] = value;
  const response = await handler(new Request(`https://project.supabase.co/functions/v1/payment-webhook?${query}`, { method, headers, ...(method === 'POST' ? { body: JSON.stringify(body) } : {}) }));
  return { status: response.status, text: await response.text() };
};

// Só POST.
reset();
assert.equal((await call({ method: 'GET' })).status, 405);

// IPN antigo (?id=&topic=): não dá para validar a assinatura; 200 "ignored" sem consultar o Mercado Pago.
for (const query of ['id=1234567890&topic=payment', 'id=1234567890&topic=merchant_order']) {
  reset();
  assert.deepEqual(await call({ query, signature: 'ts=1,v1=errada' }), { status: 200, text: 'ignored' });
  assert.equal(state.fetches.length, 0); assert.equal(state.rpc.length, 0);
}

// Assinatura ausente, errada, de outro id ou sem segredo configurado: 401, sem consulta.
for (const [options, extraEnv] of [
  [{ signature: '' }, {}],
  [{ signature: 'ts=1764158400,v1=' + '0'.repeat(64) }, {}],
  [{ signature: sign('999') }, {}],
  [{ signature: sign('1234567890', 'outro-request') }, {}],
  [{ requestId: '' }, {}],
  [{ query: 'type=payment' }, {}],
  [{}, { MERCADO_PAGO_WEBHOOK_SECRET: undefined }],
]) {
  reset(extraEnv);
  assert.equal((await call(options)).status, 401, JSON.stringify(options));
  assert.equal(state.fetches.length, 0); assert.equal(state.rpc.length, 0);
}

// Outro tipo de aviso ou id que não é número de pagamento: 200 "ignored" sem consulta.
for (const options of [
  { query: 'data.id=1234567890&type=merchant_order' },
  { query: 'data.id=1234567890', body: { type: 'subscription_preapproval' } },
  { query: 'data.id=abc123&type=payment' },
  { query: 'data.id=123456789012345678901&type=payment' },
]) {
  reset();
  assert.deepEqual(await call(options), { status: 200, text: 'ignored' }, JSON.stringify(options));
  assert.equal(state.fetches.length, 0); assert.equal(state.rpc.length, 0);
}

// Aviso válido: consulta o pagamento e grava só pela RPC, com o pagamento normalizado.
reset();
assert.deepEqual(await call(), { status: 200, text: 'ok' });
assert.equal(state.fetches.length, 1);
assert.equal(state.fetches[0].url, 'https://api.mercadopago.com/v1/payments/1234567890');
assert.equal(state.fetches[0].method, 'GET');
assert.equal(state.fetches[0].headers.Authorization, 'Bearer TEST-token-de-teste');
assert.ok(state.fetches[0].signal, 'A consulta tem prazo');
assert.equal(state.rpc.length, 1);
assert.equal(state.rpc[0].name, 'apply_mp_payment');
assert.equal(state.rpc[0].args.p_source, 'webhook');
assert.deepEqual(state.rpc[0].args.p_payment, {
  id: '1234567890', external_reference: orderId, status: 'approved', status_detail: 'accredited', amount: 119.9, refunded_amount: 0,
  method_type: 'credit_card', method_id: 'visa', installments: 3, fee: 4.99, net: 114.91, date_approved: '2026-11-26T10:00:00.000-03:00',
  attempt_key: '33333333-3333-4333-8333-333333333333', pix: null,
});
assert.deepEqual(state.queries, [], 'A função não lê nem grava tabelas diretamente; tudo passa pela RPC');
assert.ok(!JSON.stringify(state.rpc[0].args).includes(payerEmail), 'Dados do pagador não vão para a RPC');

// O tipo pode vir só no corpo do aviso.
reset();
assert.equal((await call({ query: 'data.id=1234567890', body: { type: 'payment' } })).text, 'ok');

// Líquido sem net_received_amount: valor menos taxa (regra antiga). Pix leva o QR e o prazo do Mercado Pago.
reset();
state.paymentReply.body = payment({
  status: 'pending', status_detail: 'pending_waiting_transfer', payment_type_id: 'bank_transfer', payment_method_id: 'pix', installments: 1,
  fee_details: [{ amount: 1.19 }], transaction_details: {}, date_approved: null, date_of_expiration: '2026-11-26T15:35:00.000-03:00',
  point_of_interaction: { type: 'PIX', transaction_data: { qr_code: qrCode, qr_code_base64: 'iVBORw0KGgo\nAAAA', ticket_url: 'https://www.mercadopago.com.br/sintetico' } },
});
assert.equal((await call()).text, 'ok');
const pixPayment = state.rpc[0].args.p_payment;
assert.equal(pixPayment.fee, 1.19); assert.equal(pixPayment.net, 118.71);
assert.deepEqual(pixPayment.pix, { qr_code: qrCode, qr_code_base64: 'iVBORw0KGgoAAAA', expires_at: '2026-11-26T15:35:00.000-03:00' });
assert.equal(JSON.stringify(pixPayment).includes('ticket_url'), false, 'O link para fora do site não é usado');

// Valores malformados seguem como texto para a RPC recusar (invalid_payment), em vez de virar zero.
reset(); state.paymentReply.body = payment({ transaction_amount: 'abc' });
await call(); assert.equal(state.rpc[0].args.p_payment.amount, 'abc');

// Pagamento inexistente: 200 "ignored". Outras falhas do Mercado Pago: 502 (o Mercado Pago reenvia).
reset(); state.paymentReply = { status: 404, body: { message: 'Payment not found' } };
assert.deepEqual(await call(), { status: 200, text: 'ignored' }); assert.equal(state.rpc.length, 0);
for (const reply of [{ status: 500, body: { message: 'secret provider detail' } }, { status: 401, body: {} }, { mode: 'network', status: 0 }, { mode: 'non-json', status: 200 }]) {
  reset(); state.paymentReply = reply;
  assert.equal((await call()).status, 502, JSON.stringify(reply)); assert.equal(state.rpc.length, 0);
}
reset({ MERCADO_PAGO_ACCESS_TOKEN: undefined });
assert.equal((await call()).status, 503); assert.equal(state.fetches.length, 0);

// Pagamento de fora da loja (external_reference que não é pedido): 200 "ignored", sem RPC.
for (const reference of [null, '', 'pedido-123', '123']) {
  reset(); state.paymentReply.body = payment({ external_reference: reference });
  assert.deepEqual(await call(), { status: 200, text: 'ignored' }); assert.equal(state.rpc.length, 0);
}

// RPC: pedido desconhecido ou pagamento sem conserto = 200 "ignored"; erro do banco = 500 (o Mercado Pago reenvia).
reset(); state.rpcResult = { data: { decision: 'unknown_order' }, error: null };
assert.deepEqual(await call(), { status: 200, text: 'ignored' });
for (const message of ['invalid_payment', 'attempt_conflict']) {
  reset(); state.rpcResult = { data: null, error: { message, code: 'P0001' } };
  assert.deepEqual(await call(), { status: 200, text: 'ignored' });
}
for (const error of [{ message: 'canceling statement due to lock timeout', code: '55P03' }, { message: 'invalid_source', code: 'P0001' }, { message: 'fetch failed' }]) {
  reset(); state.rpcResult = { data: null, error };
  assert.deepEqual(await call(), { status: 500, text: 'database_error' });
}
// Decisões que não pagam (recusa, pendente, fora de ordem, em dobro) continuam 200 "ok": quem decide é a RPC.
for (const decision of ['failed', 'pending', 'stale', 'duplicate_approved', 'ignored_settled', 'refunded', 'repeat']) {
  reset(); state.rpcResult = { data: { decision }, error: null };
  assert.deepEqual(await call(), { status: 200, text: 'ok' });
}

// Logs sem dados do pagador, QR ou mensagens do Mercado Pago.
const logText = JSON.stringify(logs);
for (const forbidden of [payerEmail, '52998224725', qrCode, 'secret provider detail', 'TEST-token', secret]) assert.ok(!logText.includes(forbidden), `log sem ${forbidden}`);

// Estrutura: nenhuma gravação direta em orders e nenhuma cópia local de nomes do _shared (bundle do painel).
const source = readFileSync('supabase/functions/payment-webhook/index.ts', 'utf8');
assert.doesNotMatch(source, /from\('orders'\)/);
assert.doesNotMatch(source, /^const (encoder|uuidPattern|hex)\b/m);

console.log('Webhook conferido: assinatura, IPN ignorado, tipo e id, consulta com prazo, normalização (taxa, líquido, Pix), erros do Mercado Pago e do banco, gravação só pela RPC e logs sem dados pessoais. Nenhum pagamento real.');
