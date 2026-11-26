// Pagamento no próprio site (process-payment) numa VM, com Auth, banco (RPCs) e Mercado Pago simulados.
// Nenhuma cobrança real, nenhuma rede, nenhum dado real de cliente. Os módulos _shared reais são ligados.
// Uso: node --experimental-vm-modules scripts/verify-process-payment.mjs
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
import { SourceTextModule, SyntheticModule, createContext } from 'node:vm';
import { webcrypto } from 'node:crypto';

const site = 'https://www.graphenemanipulacoes.com.br';
const orderId = '44444444-4444-4444-8444-444444444444';
const otherOrderId = '55555555-5555-4555-8555-555555555555';
const customerId = '66666666-6666-4666-8666-666666666666';
const attemptKey = '77777777-7777-4777-8777-777777777777';
const attemptId = '88888888-8888-4888-8888-888888888888';
const staleAttemptId = '99999999-9999-4999-8999-999999999999';
const publicKey = 'APP_USR-00000000-mock-public-key';
const accountEmail = 'conta.sintetica@example.invalid';
const cardToken = 'tok_SINTETICO_0123456789abcdef';
const holderCpf = '52998224725';
const customerCpf = '11144477735';
const qrCode = '00020126SYNTHETICPIXCODE5204000053039865802BR5925GRAPHENE';
const qrBase64 = 'iVBORw0KGgoSYNTHETICQRBASE64AAAA';
const personal = ['Maria', 'Sintética', '99999-0000', '999990000', 'Rua Sintética', '28900000', 'apto 2'];
const uuidV4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const ago = ms => new Date(Date.now() - ms).toISOString();
const env = new Map();
const logs = [];
let state;
let handler;

const attempt = (extra = {}) => ({
  attempt_id: attemptId, attempt_key: attemptKey, order_id: orderId, method: 'card', provider_payment_id: null, status: 'creating',
  status_detail: null, amount: 119.9, installments: null, expires_at: null, last_checked_at: null, created_at: '2026-11-26T12:00:00+00:00', pix: null, ...extra,
});
const payload = (extra = {}) => ({
  order_id: orderId, amount: 119.9, subtotal: 109.9, discount_amount: 0, shipping_amount: 10,
  customer_email: 'pedido.sintetico@example.invalid', customer_document: customerCpf,
  shipping_address: { name: 'Maria Sintética da Silva', phone: '(22) 99999-0000', zip: '28900-000', address: 'Rua Sintética, Centro', number: '10', complement: 'apto 2', neighborhood: 'Centro', city: 'Cabo Frio', state: 'RJ' },
  items: [{ product_id: 14, product_name: 'Produto sintético', unit_price: 54.95, quantity: 2, variant: null }],
  ...extra,
});
const created = (method = 'card', extra = {}) => ({ result: 'created', attempt_id: attemptId, attempt: attempt({ method }), ...payload(), ...extra });
const mpPayment = (extra = {}) => ({
  id: 1234567890, external_reference: orderId, status: 'approved', status_detail: 'accredited', transaction_amount: 119.9,
  payment_type_id: 'credit_card', payment_method_id: 'visa', installments: 3, fee_details: [{ amount: 4.99 }],
  transaction_details: { net_received_amount: 114.91 }, metadata: { attempt_key: attemptKey, order_id: orderId },
  payer: { email: accountEmail, identification: { type: 'CPF', number: holderCpf } }, ...extra,
});
const pixPayment = (extra = {}) => mpPayment({
  status: 'pending', status_detail: 'pending_waiting_transfer', payment_type_id: 'bank_transfer', payment_method_id: 'pix', installments: 1,
  date_of_expiration: '2026-11-26T15:35:00.000-03:00', date_approved: null,
  point_of_interaction: { type: 'PIX', transaction_data: { qr_code: qrCode, qr_code_base64: qrBase64, ticket_url: 'https://www.mercadopago.com.br/sintetico' } },
  ...extra,
});
const paymentState = (extra = {}) => ({
  order: { id: orderId, status: 'awaiting_payment', payment_status: 'pending', total: 119.9, created_at: '2026-11-26T12:00:00+00:00', paid_payment_id: null },
  payable: true, reason: null, attempt: null, refresh_due: false, ...extra,
});

const reset = (extraEnv = {}) => {
  env.clear();
  for (const [key, value] of Object.entries({
    SUPABASE_URL: 'https://project.supabase.co', SUPABASE_ANON_KEY: 'anon-de-teste', SUPABASE_SERVICE_ROLE_KEY: 'service-role-de-teste',
    MERCADO_PAGO_ACCESS_TOKEN: 'TEST-token-de-teste', MERCADO_PAGO_PUBLIC_KEY: publicKey, MERCADO_PAGO_CHECKOUT_MODE: 'brick', ...extraEnv,
  })) if (value !== undefined) env.set(key, value);
  logs.length = 0;
  state = {
    // O Auth devolve a data de cadastro com microssegundos.
    user: { id: customerId, email: accountEmail, created_at: '2026-10-01T10:00:00.123456Z', app_metadata: { provider: 'email' } }, authError: null,
    staffRole: null, rpc: [], fetches: [],
    begin: [created()], beginError: null,
    applyResult: { data: { decision: 'paid', alerts: [], order_id: orderId, payment_status: 'paid', status: 'paid', attempt_id: attemptId }, error: null },
    states: [paymentState()], stateError: null,
    rate: {}, failAttempt: { data: { ok: true }, error: null },
    create: { status: 201, body: mpPayment() },
    cancel: { status: 200, body: { status: 'cancelled' } },
    payments: {}, search: { status: 200, body: { results: [] } },
  };
};

const rpc = async (name, args) => {
  state.rpc.push({ name, args: structuredClone(args) });
  if (name === 'current_staff_role') return { data: state.staffRole, error: null };
  if (name === 'take_rate_limit') {
    const scope = args.p_key.split(':')[0];
    if (state.rate[scope] === null) return { data: null, error: { message: 'down' } };
    return { data: state.rate[scope] !== false, error: null };
  }
  if (name === 'begin_payment_attempt') {
    if (state.beginError) return { data: null, error: state.beginError };
    const next = state.begin.length > 1 ? state.begin.shift() : state.begin[0];
    return next?.error ? { data: null, error: next.error } : { data: structuredClone(next), error: null };
  }
  if (name === 'apply_mp_payment') return state.applyResult;
  if (name === 'order_payment_state') {
    if (state.stateError) return { data: null, error: state.stateError };
    const next = state.states.length > 1 ? state.states.shift() : state.states[0];
    return { data: structuredClone(next), error: null };
  }
  if (name === 'fail_payment_attempt') return state.failAttempt;
  throw new Error(`RPC inesperada ${name}`);
};
const createClient = (_url, key, options) => ({
  auth: { getUser: async () => ({ data: { user: options?.global?.headers?.Authorization === 'Bearer sessao-sintetica' ? state.user : null }, error: state.authError }) },
  rpc,
  from: table => { throw new Error(`Acesso direto à tabela ${table} não é esperado (key ${key === 'service-role-de-teste' ? 'service' : 'anon'})`); },
});
const reply = ({ status, body, mode }) => {
  if (mode === 'timeout') throw new DOMException('prazo sintético secret', 'TimeoutError');
  if (mode === 'network') throw new TypeError('rede sintética secret');
  if (mode === 'non-json') return new Response('não é json secret', { status });
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
};
const fakeFetch = async (url, init = {}) => {
  const target = String(url);
  assert.match(target, /^https:\/\/api\.mercadopago\.com\/v1\/payments(\/\d{1,20}|\/search\?.*)?$/, `Só a API de pagamentos do Mercado Pago: ${target}`);
  const method = init.method || 'GET';
  state.fetches.push({ url: target, method, headers: init.headers || {}, body: init.body ? JSON.parse(init.body) : undefined, signal: init.signal });
  if (method === 'POST' && target.endsWith('/v1/payments')) return reply(state.create);
  if (method === 'PUT') return reply(state.cancel);
  if (target.includes('/search?')) return reply(state.searchByOrder?.[new URL(target).searchParams.get('external_reference')] || state.search);
  const id = target.split('/').pop();
  return reply(state.payments[id] || { status: 404, body: { message: 'not found' } });
};
const context = createContext({
  Request, Response, Headers, URL, AbortSignal, DOMException, TextEncoder, TextDecoder, Uint8Array, crypto: webcrypto, structuredClone, btoa, atob, setTimeout, clearTimeout,
  console: { log: (...args) => logs.push(args), error: (...args) => logs.push(args), warn: (...args) => logs.push(args) },
  fetch: fakeFetch,
  Deno: { env: { get: key => env.get(key) }, serve: fn => { handler = fn; } },
});
const read = path => new SourceTextModule(stripTypeScriptTypes(readFileSync(path, 'utf8')), { context });
const shared = { http: read('supabase/functions/_shared/http.ts'), 'counter-security': read('supabase/functions/_shared/counter-security.ts'), 'mercado-pago': read('supabase/functions/_shared/mercado-pago.ts') };
const supabase = new SyntheticModule(['createClient'], function () { this.setExport('createClient', createClient); }, { context });
const main = read('supabase/functions/process-payment/index.ts');
await main.link(specifier => {
  if (specifier.startsWith('npm:@supabase/supabase-js')) return supabase;
  const module = Object.keys(shared).find(name => specifier === `../_shared/${name}.ts`);
  assert.ok(module, `Import inesperado ${specifier}`);
  return shared[module];
});
await main.evaluate();
assert.equal(typeof handler, 'function');

const invoke = async (body, { origin = site, method = 'POST', session = 'Bearer sessao-sintetica', raw } = {}) => {
  const headers = { 'content-type': 'application/json', 'cf-connecting-ip': '203.0.113.7' };
  if (origin) headers.origin = origin;
  if (session) headers.authorization = session;
  const response = await handler(new Request('https://project.supabase.co/functions/v1/process-payment', { method, headers, ...(method === 'POST' ? { body: raw ?? JSON.stringify(body) } : {}) }));
  return { status: response.status, data: response.status === 204 ? null : await response.json(), headers: response.headers };
};
const cardBody = (card = {}, extra = {}) => ({
  action: 'pay', orderId, attemptKey, method: 'card',
  card: { token: cardToken, paymentMethodId: 'visa', issuerId: '25', installments: 3, identification: { type: 'CPF', number: holderCpf }, ...card }, ...extra,
});
const pixBody = (extra = {}) => ({ action: 'pay', orderId, attemptKey, method: 'pix', ...extra });
const calls = name => state.rpc.filter(call => call.name === name);
const posts = () => state.fetches.filter(call => call.method === 'POST');
const noProvider = () => assert.equal(state.fetches.length, 0, 'Nada chega ao Mercado Pago');

// ---- CORS e método ----
for (const origin of [site, 'https://graphenemanipulacoes.com.br', 'https://site-graphene.vercel.app', 'http://localhost:5173']) {
  reset();
  const result = await invoke(null, { origin, method: 'OPTIONS', session: '' });
  assert.equal(result.status, 204); assert.equal(result.headers.get('Access-Control-Allow-Origin'), origin);
  assert.equal(state.rpc.length, 0);
}
for (const origin of ['https://evil.example', 'https://another-store.vercel.app', 'http://graphenemanipulacoes.com.br', null]) {
  reset();
  assert.equal((await invoke(null, { origin, method: 'OPTIONS', session: '' })).status, 403);
  assert.equal((await invoke(cardBody(), { origin })).status, 403);
  assert.equal(state.rpc.length, 0); noProvider();
}
reset(); assert.equal((await invoke(null, { method: 'GET' })).status, 403);

// ---- Sessão e configuração ----
reset(); let result = await invoke(cardBody(), { session: '' });
assert.equal(result.status, 401); assert.equal(result.data.error, 'authentication_required'); assert.equal(state.rpc.length, 0);
reset(); state.user = { id: customerId, email: '' }; assert.equal((await invoke(cardBody())).status, 401);
reset({ MERCADO_PAGO_ACCESS_TOKEN: undefined }); result = await invoke(cardBody());
assert.equal(result.status, 503); assert.equal(result.data.error, 'payment_provider_not_configured'); assert.equal(state.rpc.length, 0);

// ---- Validação do corpo: nada chega ao banco nem ao Mercado Pago ----
const invalidBodies = [
  ['corpo que não é JSON', null, 'invalid_payment_request', '{nao-json'],
  ['ação desconhecida', { ...cardBody(), action: 'refund' }, 'invalid_payment_request'],
  ['pedido inválido', { ...cardBody(), orderId: 'pedido-1' }, 'invalid_payment_request'],
  ['chave inválida', { ...cardBody(), attemptKey: '123' }, 'invalid_payment_request'],
  ['método boleto', { ...cardBody(), method: 'boleto' }, 'invalid_payment_request'],
  ['cartão ausente', { ...cardBody(), card: undefined }, 'invalid_payment_request'],
  ['token curto', cardBody({ token: 'abc' }), 'invalid_payment_request'],
  ['token com caracteres', cardBody({ token: 'tok_<script>0123456789' }), 'invalid_payment_request'],
  ['bandeira fora do formato', cardBody({ paymentMethodId: 'Visa' }), 'invalid_payment_request'],
  // Bandeira de crédito fora da lista: código próprio, para a tela dizer quais cartões são aceitos.
  ['bandeira desconhecida', cardBody({ paymentMethodId: 'naoexiste' }), 'card_brand_not_accepted'],
  ['bandeira cabal', cardBody({ paymentMethodId: 'cabal' }), 'card_brand_not_accepted'],
  ['bandeira diners', cardBody({ paymentMethodId: 'diners' }), 'card_brand_not_accepted'],
  ['emissor inválido', cardBody({ issuerId: 'abc' }), 'invalid_payment_request'],
  ['0 parcelas', cardBody({ installments: 0 }), 'invalid_payment_request'],
  ['13 parcelas', cardBody({ installments: 13 }), 'invalid_payment_request'],
  ['parcela fracionada', cardBody({ installments: 1.5 }), 'invalid_payment_request'],
  ['CPF inválido', cardBody({ identification: { type: 'CPF', number: '12345678900' } }), 'invalid_document'],
  ['CPF repetido', cardBody({ identification: { type: 'CPF', number: '11111111111' } }), 'invalid_document'],
  ['documento sem tipo', cardBody({ identification: { number: holderCpf } }), 'invalid_document'],
  ['CNPJ curto', cardBody({ identification: { type: 'CNPJ', number: '1234567800019' } }), 'invalid_document'],
  ['deviceId inválido', { ...cardBody(), deviceId: 'x' }, 'invalid_payment_request'],
];
// Com method 'card', só bandeiras de crédito: Pix, boletos, lotérica, saldo e débito são recusados no servidor.
for (const paymentMethodId of ['pix', 'bolbradesco', 'pec', 'account_money', 'debelo', 'debvisa', 'debmaster', 'consumer_credits']) {
  invalidBodies.push([`meio ${paymentMethodId} como cartão`, cardBody({ paymentMethodId }), 'invalid_payment_request']);
}
for (const [label, body, error, raw] of invalidBodies) {
  reset();
  result = await invoke(body, { raw });
  assert.equal(result.status, 400, label); assert.equal(result.data.error, error, label);
  assert.equal(calls('begin_payment_attempt').length, 0, label); noProvider();
}
// Máximo de parcelas vem do segredo MERCADO_PAGO_MAX_INSTALLMENTS.
reset({ MERCADO_PAGO_MAX_INSTALLMENTS: '6' });
assert.equal((await invoke(cardBody({ installments: 7 }))).data.error, 'invalid_payment_request');
reset({ MERCADO_PAGO_MAX_INSTALLMENTS: '6' });
assert.equal((await invoke(cardBody({ installments: 6 }))).status, 200);
// CNPJ do titular é aceito.
reset(); assert.equal((await invoke(cardBody({ identification: { type: 'CNPJ', number: '11222333000181' } }))).status, 200);

// ---- Chave de modo: redirect (ou brick_staff para quem não é da equipe) não cobra no site ----
for (const [mode, role, expected] of [['redirect', null, 503], ['', null, 503], ['brick_staff', null, 503], ['brick_staff', 'cliente', 503], ['brick_staff', 'admin', 200], ['brick_staff', 'farmaceutico', 200], ['brick_staff', 'balcao', 200]]) {
  reset({ MERCADO_PAGO_CHECKOUT_MODE: mode }); state.staffRole = role;
  result = await invoke(cardBody());
  assert.equal(result.status, expected, `${mode}/${role}`);
  if (expected === 503) { assert.equal(result.data.error, 'payment_provider_not_configured'); assert.equal(calls('begin_payment_attempt').length, 0); noProvider(); }
}

// ---- Cartão: valor, referência, e-mail e chave de repetição vêm do servidor ----
reset();
result = await invoke(cardBody({ email: 'atacante@example.invalid', amount: 1 }, { amount: 1, transaction_amount: 1, email: 'atacante@example.invalid', external_reference: otherOrderId, description: 'grátis', notification_url: 'https://evil.example/hook', payer: { email: 'atacante@example.invalid' } }));
assert.equal(result.status, 200, JSON.stringify(result.data));
assert.deepEqual(calls('begin_payment_attempt')[0].args, { p_order_id: orderId, p_customer_id: customerId, p_attempt_key: attemptKey, p_method: 'card' });
assert.equal(posts().length, 1);
let sent = posts()[0];
assert.equal(sent.url, 'https://api.mercadopago.com/v1/payments');
assert.equal(sent.headers['X-Idempotency-Key'], attemptKey);
assert.equal(sent.headers.Authorization, 'Bearer TEST-token-de-teste');
assert.equal(sent.headers['Content-Type'], 'application/json');
assert.ok(sent.signal, 'O POST tem prazo');
assert.equal(sent.body.transaction_amount, 119.9, 'O valor vem do banco, nunca do navegador');
assert.equal(sent.body.external_reference, orderId);
assert.equal(sent.body.notification_url, 'https://project.supabase.co/functions/v1/payment-webhook');
assert.equal(sent.body.description, 'Pedido Graphène #44444444');
assert.deepEqual(sent.body.payer, { email: accountEmail, identification: { type: 'CPF', number: holderCpf } }, 'payer.email é o da conta');
assert.equal(sent.body.token, cardToken);
assert.equal(sent.body.installments, 3);
assert.equal(sent.body.payment_method_id, 'visa');
assert.equal(sent.body.issuer_id, 25);
assert.equal(sent.body.binary_mode, false);
assert.equal('three_d_secure_mode' in sent.body, false, 'Fase 1 sem 3DS');
assert.equal('date_of_expiration' in sent.body, false);
assert.deepEqual(sent.body.metadata, { attempt_key: attemptKey, order_id: orderId });
assert.equal(JSON.stringify(sent.body).includes('atacante'), false);
assert.equal(JSON.stringify(sent.body).includes('evil.example'), false);
assert.equal(Math.round(sent.body.additional_info.items.reduce((sum, item) => sum + item.unit_price * item.quantity, 0) * 100), 11990, 'Itens + entrega somam o total');
assert.deepEqual(sent.body.additional_info.items.at(-1), { id: 'frete', title: 'Entrega', quantity: 1, unit_price: 10 });
assert.deepEqual(sent.body.additional_info.payer.phone, { area_code: '22', number: '999990000' });
assert.equal(sent.body.additional_info.payer.first_name, 'Maria'); assert.equal(sent.body.additional_info.payer.last_name, 'Sintética da Silva');
assert.equal(sent.body.additional_info.payer.authentication_type, 'Native web');
assert.equal(sent.body.additional_info.payer.registration_date, '2026-10-01T10:00:00.123Z', 'Data de cadastro em ISO com milissegundos');
assert.deepEqual(sent.body.additional_info.shipments.receiver_address, { zip_code: '28900000', state_name: 'RJ', city_name: 'Cabo Frio', street_name: 'Rua Sintética', street_number: '10', apartment: 'apto 2' });
assert.deepEqual(result.data.payment, { attemptId, method: 'card', status: 'approved', statusDetail: 'accredited', paymentMethodId: 'visa', installments: 3, pix: null });
assert.deepEqual(result.data.order, { paymentStatus: 'paid', status: 'paid' });
assert.equal(result.data.orderId, orderId);
assert.equal(calls('apply_mp_payment')[0].args.p_source, 'process-payment');
assert.equal(calls('apply_mp_payment')[0].args.p_payment.id, '1234567890');
assert.equal(calls('apply_mp_payment')[0].args.p_payment.attempt_key, attemptKey);
assert.deepEqual(calls('take_rate_limit').map(call => [call.args.p_key.split(':')[0], call.args.p_max, call.args.p_window_seconds]), [['payment_attempt_user', 10, 3600], ['payment_attempt_ip', 30, 3600], ['payment_attempt_order', 8, 3600]]);
assert.ok(!JSON.stringify(result.data).includes('TEST-token'));

// Conta Google: authentication_type 'Gmail'. Cartão sem emissor: sem issuer_id.
reset(); state.user.app_metadata = { provider: 'google' };
await invoke(cardBody({ issuerId: undefined }));
assert.equal(posts()[0].body.additional_info.payer.authentication_type, 'Gmail'); assert.equal('issuer_id' in posts()[0].body, false);

// Data de cadastro inválida ou ausente: o campo fica de fora.
for (const createdAt of ['não-é-data', undefined]) {
  reset(); state.user.created_at = createdAt;
  await invoke(cardBody());
  assert.equal('registration_date' in posts()[0].body.additional_info.payer, false, String(createdAt));
}

// Com desconto: item único com o total. Itens que não somam o total: item único também.
reset(); state.begin = [created('card', { discount_amount: 5, amount: 114.9 })];
await invoke(cardBody());
assert.deepEqual(posts()[0].body.additional_info.items, [{ id: `order-${orderId}`, title: 'Pedido Graphène', quantity: 1, unit_price: 114.9 }]);
assert.equal(posts()[0].body.transaction_amount, 114.9);
reset(); state.begin = [created('card', { amount: 150 })];
await invoke(cardBody());
assert.deepEqual(posts()[0].body.additional_info.items, [{ id: `order-${orderId}`, title: 'Pedido Graphène', quantity: 1, unit_price: 150 }]);
// Campos vazios não vão ao Mercado Pago.
reset(); state.begin = [created('card', { shipping_address: { name: 'Maria', phone: '', zip: '28900000', address: 'Rua Sintética', number: '10', complement: '', neighborhood: '', city: 'Cabo Frio', state: 'RJ' } })];
await invoke(cardBody());
assert.equal('last_name' in posts()[0].body.additional_info.payer, false); assert.equal('phone' in posts()[0].body.additional_info.payer, false);
assert.equal('apartment' in posts()[0].body.additional_info.shipments.receiver_address, false);

// ---- Pix próprio: CPF do pedido, prazo de 35 min em -03:00 e QR devolvido pelo Mercado Pago ----
reset(); state.begin = [created('pix')]; state.create = { status: 201, body: pixPayment() };
state.applyResult = { data: { decision: 'pending', alerts: [], order_id: orderId, payment_status: 'pending', status: 'awaiting_payment' }, error: null };
const before = Date.now();
result = await invoke(pixBody({ card: { token: cardToken } }));
assert.equal(result.status, 200, JSON.stringify(result.data));
sent = posts()[0];
assert.equal(sent.body.payment_method_id, 'pix');
assert.equal('token' in sent.body, false); assert.equal('installments' in sent.body, false);
assert.equal(sent.body.transaction_amount, 119.9);
assert.match(sent.body.date_of_expiration, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}-03:00$/);
const minutes = (Date.parse(sent.body.date_of_expiration) - before) / 60000;
assert.ok(minutes >= 31 && minutes <= 36, `Prazo do Pix com folga sobre o mínimo de 30 min (${minutes.toFixed(2)})`);
assert.deepEqual(sent.body.payer.identification, { type: 'CPF', number: customerCpf }, 'CPF gravado no pedido');
assert.equal(sent.body.payer.email, accountEmail);
assert.equal(sent.body.payer.first_name, 'Maria'); assert.equal(sent.body.payer.last_name, 'Sintética da Silva');
assert.deepEqual(sent.body.payer.address, { zip_code: '28900000', street_name: 'Rua Sintética', street_number: '10', neighborhood: 'Centro', city: 'Cabo Frio', federal_unit: 'RJ' });
assert.deepEqual(result.data.payment, { attemptId, method: 'pix', status: 'pending', statusDetail: 'pending_waiting_transfer', paymentMethodId: 'pix', installments: 1, pix: { qrCode, qrCodeBase64: qrBase64, expiresAt: '2026-11-26T15:35:00.000-03:00' } });
assert.deepEqual(result.data.order, { paymentStatus: 'pending', status: 'awaiting_payment' });
assert.equal(JSON.stringify(result.data).includes('ticket_url'), false, 'O link para fora do site não é usado');
assert.deepEqual(calls('apply_mp_payment')[0].args.p_payment.pix, { qr_code: qrCode, qr_code_base64: qrBase64, expires_at: '2026-11-26T15:35:00.000-03:00' });

// ---- Erros do begin_payment_attempt: códigos mapeados, sem Mercado Pago ----
for (const [code, status] of [['already_paid', 409], ['payment_in_review', 409], ['payment_in_progress', 409], ['order_not_payable', 409], ['order_expired', 409], ['attempt_conflict', 409], ['order_not_found', 404], ['invalid_document', 400], ['invalid_payment_request', 400]]) {
  reset(); state.beginError = { message: code, code: 'P0001' };
  result = await invoke(cardBody());
  assert.equal(result.status, status, code); assert.equal(result.data.error, code); noProvider();
  assert.equal(calls('take_rate_limit').length, 0, 'Limite só conta tentativa nova');
}
reset(); state.beginError = { message: 'canceling statement due to lock timeout secret', code: '55P03' };
result = await invoke(cardBody()); assert.equal(result.status, 500); assert.equal(result.data.error, 'internal_error'); noProvider();
assert.ok(!JSON.stringify(result.data).includes('secret'));

// ---- Repetição da mesma chave ----
// Já resolvida: devolve o gravado, sem chamar o Mercado Pago e sem contar limite.
reset(); state.begin = [{ result: 'replay', attempt_id: attemptId, attempt: attempt({ status: 'rejected', status_detail: 'cc_rejected_other_reason', provider_payment_id: '1234567890', installments: 2 }), ...payload() }];
state.states = [paymentState({ order: { id: orderId, status: 'awaiting_payment', payment_status: 'failed', total: 119.9 } })];
result = await invoke(cardBody());
assert.equal(result.status, 200); noProvider(); assert.equal(calls('take_rate_limit').length, 0);
assert.deepEqual(result.data.payment, { attemptId, method: 'card', status: 'rejected', statusDetail: 'cc_rejected_other_reason', paymentMethodId: '', installments: 2, pix: null });
assert.deepEqual(result.data.order, { paymentStatus: 'failed', status: 'awaiting_payment', total: 119.9 });
// Tentativa que ficou em erro antes do Mercado Pago: a mesma chave devolve o mesmo erro, sem reenviar.
for (const [detail, error, status] of [['rate_limited', 'too_many_requests', 429], ['rate_limit_unavailable', 'rate_limit_unavailable', 503], ['request_rejected', 'payment_provider_request_rejected', 502], [null, 'payment_provider_request_rejected', 502]]) {
  reset(); state.begin = [{ result: 'replay', attempt_id: attemptId, attempt: attempt({ status: 'error', status_detail: detail }), ...payload() }];
  result = await invoke(cardBody());
  assert.equal(result.status, status); assert.equal(result.data.error, error); noProvider();
}
// Ainda 'creating' (resposta perdida): reenvia o mesmo POST com a mesma chave, sem contar limite.
reset(); state.begin = [{ result: 'replay', attempt_id: attemptId, attempt: attempt(), ...payload() }];
result = await invoke(cardBody());
assert.equal(result.status, 200); assert.equal(posts().length, 1); assert.equal(posts()[0].headers['X-Idempotency-Key'], attemptKey);
assert.equal(calls('take_rate_limit').length, 0);
// Pix aberto deste pedido com prazo: devolve o mesmo QR, sem criar outro.
reset(); state.begin = [{ result: 'reuse_pix', attempt_id: attemptId, attempt: attempt({ method: 'pix', status: 'pending', provider_payment_id: '1234567890', expires_at: '2026-11-26T18:35:00+00:00', pix: { qr_code: qrCode, qr_code_base64: qrBase64, expires_at: '2026-11-26T18:35:00+00:00' } }) }];
result = await invoke(pixBody());
assert.equal(result.status, 200); noProvider();
assert.deepEqual(result.data.payment.pix, { qrCode, qrCodeBase64: qrBase64, expiresAt: '2026-11-26T18:35:00+00:00' });
assert.equal(result.data.payment.status, 'pending');

// ---- Pix aberto (deste ou de outro pedido) antes de uma cobrança nova ----
const pixPending = (extra = {}) => ({ result: 'pix_pending', provider_payment_ids: ['2222222222'], attempts: [{ attempt_id: staleAttemptId, order_id: orderId, provider_payment_id: '2222222222', expires_at: '2026-11-26T18:35:00+00:00' }], ...extra });
// Cancelado: PUT + GET + gravação, e begin de novo (cria a tentativa do cartão).
reset(); state.begin = [pixPending(), created()]; state.payments['2222222222'] = { status: 200, body: pixPayment({ id: 2222222222, status: 'cancelled', status_detail: 'by_collector' }) };
result = await invoke(cardBody());
assert.equal(result.status, 200, JSON.stringify(result.data));
assert.deepEqual(state.fetches.map(call => `${call.method} ${call.url.replace('https://api.mercadopago.com', '')}`), ['PUT /v1/payments/2222222222', 'GET /v1/payments/2222222222', 'POST /v1/payments']);
assert.deepEqual(state.fetches[0].body, { status: 'cancelled' });
// Chave nova a cada pedido de cancelamento (nunca fixa por pagamento): uma recusa guardada não se repete.
const firstCancelKey = state.fetches[0].headers['X-Idempotency-Key'];
assert.match(firstCancelKey, uuidV4);
assert.equal(calls('begin_payment_attempt').length, 2);
assert.equal(calls('apply_mp_payment')[0].args.p_payment.status, 'cancelled');
// Continua pendente depois do PUT: pix_cancel_failed, sem cobrar o cartão.
reset(); state.begin = [pixPending(), created()]; state.payments['2222222222'] = { status: 200, body: pixPayment({ id: 2222222222 }) };
result = await invoke(cardBody());
assert.equal(result.status, 409); assert.equal(result.data.error, 'pix_cancel_failed'); assert.equal(posts().length, 0);
// GET falha: pix_cancel_failed.
reset(); state.begin = [pixPending(), created()]; state.payments['2222222222'] = { status: 500, body: {} };
assert.equal((await invoke(cardBody())).data.error, 'pix_cancel_failed'); assert.equal(posts().length, 0);
// O Pix deste pedido foi pago durante o cancelamento: grava e responde already_paid.
reset(); state.begin = [pixPending(), created()]; state.payments['2222222222'] = { status: 200, body: pixPayment({ id: 2222222222, status: 'approved', status_detail: 'accredited' }) };
result = await invoke(cardBody());
assert.equal(result.status, 409); assert.equal(result.data.error, 'already_paid'); assert.equal(posts().length, 0);
assert.equal(calls('apply_mp_payment').length, 1);
// O Pix aprovado é de outro pedido: grava (o outro pedido fica pago) e não cobra este agora (other_order_paid).
// O cliente vê o aviso e decide; uma nova tentativa já não encontra esse Pix aberto.
reset(); state.begin = [pixPending({ attempts: [{ attempt_id: staleAttemptId, order_id: otherOrderId, provider_payment_id: '2222222222' }] }), created()];
state.payments['2222222222'] = { status: 200, body: pixPayment({ id: 2222222222, external_reference: otherOrderId, status: 'approved' }) };
result = await invoke(cardBody());
assert.equal(result.status, 409); assert.equal(result.data.error, 'other_order_paid'); assert.equal(posts().length, 0, 'Não cobra este pedido');
assert.equal(calls('apply_mp_payment').length, 1, 'O pagamento do outro pedido é gravado'); assert.equal(calls('begin_payment_attempt').length, 1);
// Dois Pix abertos: o do outro pedido foi pago e o seguinte é cancelado mesmo assim; a resposta é other_order_paid.
reset(); state.begin = [pixPending({ attempts: [{ attempt_id: staleAttemptId, order_id: otherOrderId, provider_payment_id: '2222222222' }, { attempt_id: attemptId, order_id: orderId, provider_payment_id: '2222222223' }] }), created()];
state.payments['2222222222'] = { status: 200, body: pixPayment({ id: 2222222222, external_reference: otherOrderId, status: 'approved' }) };
state.payments['2222222223'] = { status: 200, body: pixPayment({ id: 2222222223, status: 'cancelled' }) };
result = await invoke(cardBody());
assert.equal(result.data.error, 'other_order_paid'); assert.equal(posts().length, 0);
assert.deepEqual(state.fetches.map(call => call.method), ['PUT', 'GET', 'PUT', 'GET']);
// O begin pede para cancelar de novo: pix_cancel_failed (uma tentativa só).
reset(); state.begin = [pixPending(), pixPending(), created()]; state.payments['2222222222'] = { status: 200, body: pixPayment({ id: 2222222222, status: 'cancelled' }) };
assert.equal((await invoke(cardBody())).data.error, 'pix_cancel_failed'); assert.equal(posts().length, 0);

// ---- Tentativa 'creating' antiga: busca no Mercado Pago, aplica, marca erro e tenta de novo ----
reset(); state.begin = [{ result: 'needs_reconcile', order_id: orderId, attempt_ids: [staleAttemptId] }, created()];
state.search = { status: 200, body: { results: [mpPayment({ id: 3333333333, status: 'rejected', status_detail: 'cc_rejected_other_reason' }), mpPayment({ id: 4444444444, external_reference: otherOrderId })] } };
result = await invoke(cardBody());
assert.equal(result.status, 200);
assert.equal(state.fetches[0].url, `https://api.mercadopago.com/v1/payments/search?external_reference=${orderId}&sort=date_created&criteria=desc`);
assert.equal(calls('apply_mp_payment')[0].args.p_source, 'reconcile');
assert.equal(calls('apply_mp_payment')[0].args.p_payment.id, '3333333333');
assert.equal(calls('apply_mp_payment').filter(call => call.args.p_payment.id === '4444444444').length, 0, 'Pagamento de outro pedido é ignorado');
assert.deepEqual(calls('fail_payment_attempt')[0].args, { p_attempt_id: staleAttemptId, p_status_detail: 'reconcile_not_found' });
assert.equal(posts().length, 1);
// Busca falha, ou o begin continua pedindo conciliação: 502 com retryable.
reset(); state.begin = [{ result: 'needs_reconcile', order_id: orderId, attempt_ids: [staleAttemptId] }, created()]; state.search = { status: 503, body: {} };
result = await invoke(cardBody()); assert.equal(result.status, 502); assert.equal(result.data.error, 'payment_provider_unavailable'); assert.equal(result.data.retryable, true); assert.equal(posts().length, 0);
reset(); state.begin = [{ result: 'needs_reconcile', order_id: orderId, attempt_ids: [] }, { result: 'needs_reconcile', order_id: orderId, attempt_ids: [] }];
result = await invoke(cardBody()); assert.equal(result.status, 502); assert.equal(result.data.retryable, true); assert.equal(posts().length, 0);
// Tentativa antiga em OUTRO pedido do cliente ('orders'): busca por aquele pedido, aplica, marca erro e cobra este.
const otherSearchRoute = `GET /v1/payments/search?external_reference=${otherOrderId}&sort=date_created&criteria=desc`;
const searchRouteHere = `GET /v1/payments/search?external_reference=${orderId}&sort=date_created&criteria=desc`;
const staleElsewhere = (extra = {}) => ({ result: 'needs_reconcile', order_id: orderId, attempt_ids: [], orders: [{ order_id: otherOrderId, attempt_ids: [staleAttemptId] }], ...extra });
reset(); state.begin = [staleElsewhere(), created()];
state.searchByOrder = { [otherOrderId]: { status: 200, body: { results: [mpPayment({ id: 3333333334, external_reference: otherOrderId, status: 'rejected', status_detail: 'cc_rejected_other_reason' }), mpPayment({ id: 3333333335 })] } } };
state.applyResult = { data: { decision: 'failed', alerts: [], order_id: otherOrderId, payment_status: 'failed', status: 'awaiting_payment' }, error: null };
result = await invoke(cardBody());
assert.equal(result.status, 200, JSON.stringify(result.data));
assert.equal(`${state.fetches[0].method} ${state.fetches[0].url.replace('https://api.mercadopago.com', '')}`, otherSearchRoute);
assert.deepEqual(calls('apply_mp_payment').filter(call => call.args.p_source === 'reconcile').map(call => call.args.p_payment.id), ['3333333334'], 'Só os pagamentos daquele pedido');
assert.deepEqual(calls('fail_payment_attempt').map(call => call.args), [{ p_attempt_id: staleAttemptId, p_status_detail: 'reconcile_not_found' }]);
assert.equal(calls('begin_payment_attempt').length, 2); assert.equal(posts().length, 1);
// Este pedido e outro: este primeiro (a ordem de 'orders'), e as tentativas de cada um.
reset(); state.begin = [staleElsewhere({ attempt_ids: [attemptId], orders: [{ order_id: orderId, attempt_ids: [attemptId] }, { order_id: otherOrderId, attempt_ids: [staleAttemptId] }] }), created()];
state.applyResult = { data: { decision: 'failed', alerts: [], order_id: orderId, payment_status: 'failed', status: 'awaiting_payment' }, error: null };
result = await invoke(cardBody());
assert.equal(result.status, 200);
assert.deepEqual(state.fetches.filter(call => call.method === 'GET').map(call => `GET ${call.url.replace('https://api.mercadopago.com', '')}`), [searchRouteHere, otherSearchRoute]);
assert.deepEqual(calls('fail_payment_attempt').map(call => call.args.p_attempt_id), [attemptId, staleAttemptId]);
// O outro pedido estava pago no Mercado Pago: grava e não cobra este agora (other_order_paid).
reset(); state.begin = [staleElsewhere(), created()];
state.searchByOrder = { [otherOrderId]: { status: 200, body: { results: [mpPayment({ id: 3333333336, external_reference: otherOrderId })] } } };
result = await invoke(cardBody());
assert.equal(result.status, 409); assert.equal(result.data.error, 'other_order_paid'); assert.equal(posts().length, 0);
assert.equal(calls('apply_mp_payment')[0].args.p_payment.id, '3333333336'); assert.equal(calls('begin_payment_attempt').length, 1);
// Busca do outro pedido falha: 502 retryable, sem marcar erro e sem cobrar.
reset(); state.begin = [staleElsewhere(), created()]; state.searchByOrder = { [otherOrderId]: { status: 503, body: {} } };
result = await invoke(cardBody());
assert.equal(result.status, 502); assert.equal(result.data.retryable, true); assert.equal(calls('fail_payment_attempt').length, 0); assert.equal(posts().length, 0);
// No máximo 5 pedidos e 20 tentativas por conciliação.
const manyIds = index => Array.from({ length: 6 }, (_, item) => `${String(index * 10 + item).padStart(8, '0')}-aaaa-4aaa-8aaa-aaaaaaaaaaaa`);
const manyOrders = Array.from({ length: 7 }, (_, index) => ({ order_id: `${String(index + 1).repeat(8)}-0000-4000-8000-000000000000`, attempt_ids: manyIds(index) }));
reset(); state.begin = [staleElsewhere({ orders: manyOrders }), created()];
state.applyResult = { data: { decision: 'failed', alerts: [], order_id: orderId, payment_status: 'failed', status: 'awaiting_payment' }, error: null };
await invoke(cardBody());
assert.equal(state.fetches.filter(call => call.url.includes('/search?')).length, 5, 'Até 5 pedidos');
assert.equal(calls('fail_payment_attempt').length, 20, 'Até 20 tentativas');

// ---- Limites (só tentativas novas): falso = 429, banco fora = 503; os dois marcam a tentativa como erro ----
for (const [scope, value, status, error, detail] of [['payment_attempt_user', false, 429, 'too_many_requests', 'rate_limited'], ['payment_attempt_ip', false, 429, 'too_many_requests', 'rate_limited'], ['payment_attempt_order', false, 429, 'too_many_requests', 'rate_limited'], ['payment_attempt_user', null, 503, 'rate_limit_unavailable', 'rate_limit_unavailable']]) {
  reset(); state.rate[scope] = value;
  result = await invoke(cardBody());
  assert.equal(result.status, status, scope); assert.equal(result.data.error, error); noProvider();
  assert.deepEqual(calls('fail_payment_attempt').map(call => call.args), [{ p_attempt_id: attemptId, p_status_detail: detail }]);
}

// ---- Respostas do Mercado Pago ----
for (const [create, error, retryable, detail] of [
  [{ status: 400, body: { message: 'secret provider message', cause: [{ code: 4020, description: 'secret cause' }, { code: '2067' }] } }, 'payment_provider_request_rejected', undefined, 'request_rejected'],
  [{ status: 422, body: { message: 'secret' } }, 'payment_provider_request_rejected', undefined, 'request_rejected'],
  [{ status: 401, body: { message: 'secret' } }, 'payment_provider_credentials_invalid', undefined, 'provider_credentials_invalid'],
  [{ status: 403, body: { message: 'secret' } }, 'payment_provider_credentials_invalid', undefined, 'provider_credentials_invalid'],
  [{ status: 500, body: { message: 'secret' } }, 'payment_provider_unavailable', true, null],
  [{ status: 503, body: {} }, 'payment_provider_unavailable', true, null],
  [{ status: 429, body: {} }, 'payment_provider_unavailable', true, null],
  [{ mode: 'timeout' }, 'payment_provider_unavailable', true, null],
  [{ mode: 'network' }, 'payment_provider_unavailable', true, null],
  [{ mode: 'non-json', status: 201 }, 'payment_provider_unavailable', true, null],
  [{ status: 201, body: { status: 'approved' } }, 'payment_provider_unavailable', true, null],
]) {
  reset(); state.create = create;
  result = await invoke(cardBody());
  const label = JSON.stringify(create).slice(0, 60);
  assert.equal(result.status, 502, label); assert.equal(result.data.error, error, label);
  assert.equal(result.data.retryable, retryable, `retryable só em rede, prazo, 5xx: ${label}`);
  assert.equal(posts().length, 1, 'Sem repetição automática');
  assert.deepEqual(calls('fail_payment_attempt').map(call => call.args.p_status_detail), detail ? [detail] : [], `Só erro definitivo marca a tentativa: ${label}`);
  assert.equal(calls('apply_mp_payment').length, 0);
  assert.ok(!JSON.stringify(result.data).includes('secret'), 'Sem mensagem do Mercado Pago na resposta');
  assert.equal('message' in result.data || 'cause' in result.data, false);
}
// O log do 400 guarda só os códigos numéricos de cause.
reset(); state.create = { status: 400, body: { message: 'secret provider message', cause: [{ code: 4020, description: 'secret cause' }] } };
await invoke(cardBody());
assert.deepEqual(logs.find(entry => entry[0] === 'payment_provider_failed')[1].causes, ['4020']);

// ---- Cobrado no Mercado Pago, mas a gravação falhou: 200 com o pagamento e "confirming" ----
// Falha passageira do banco: mais uma gravação depois de uma pausa; attempt_conflict não se repete.
for (const [applyResult, tries] of [[{ data: null, error: { message: 'canceling statement due to statement timeout' } }, 2], [{ data: null, error: { message: 'attempt_conflict', code: 'P0001' } }, 1], [{ data: null, error: null }, 2]]) {
  reset(); state.applyResult = applyResult;
  result = await invoke(cardBody());
  assert.equal(result.status, 200, JSON.stringify(result.data));
  assert.equal(result.data.payment.status, 'approved');
  assert.deepEqual(result.data.order, { paymentStatus: 'confirming', status: null });
  assert.equal(calls('apply_mp_payment').length, tries, `gravações: ${JSON.stringify(applyResult.error)}`);
  assert.equal(posts().length, 1, 'Nunca cobra de novo');
}
// A segunda gravação dá certo: resposta normal.
reset();
let applyTries = 0;
const appliedOk = state.applyResult;
Object.defineProperty(state, 'applyResult', { get: () => (++applyTries === 1 ? { data: null, error: { message: 'down' } } : appliedOk) });
result = await invoke(cardBody());
assert.deepEqual(result.data.order, { paymentStatus: 'paid', status: 'paid' }); assert.equal(applyTries, 2);
reset(); state.begin = [created('pix')]; state.create = { status: 201, body: pixPayment() }; state.applyResult = { data: null, error: { message: 'down' } };
result = await invoke(pixBody());
assert.equal(result.status, 200); assert.equal(result.data.order.paymentStatus, 'confirming'); assert.equal(result.data.payment.pix.qrCode, qrCode);

// ---- Ação status ----
// Sem refresh: não consulta o Mercado Pago. Devolve o checkout (Public Key, parcelas, valor) quando dá para pagar.
reset(); state.states = [paymentState({ attempt: attempt({ method: 'pix', status: 'pending', provider_payment_id: '2222222222', expires_at: '2026-11-26T18:35:00+00:00', pix: { qr_code: qrCode, qr_code_base64: qrBase64, expires_at: '2026-11-26T18:35:00+00:00' } }), refresh_due: true })];
result = await invoke({ action: 'status', orderId, refresh: false });
assert.equal(result.status, 200); noProvider();
assert.deepEqual(result.data.order, { paymentStatus: 'pending', status: 'awaiting_payment', total: 119.9 });
assert.equal(result.data.payment.pix.qrCode, qrCode);
assert.deepEqual(result.data.checkout, { publicKey, maxInstallments: 12, amount: 119.9 });
assert.equal(result.data.reason, null);
assert.deepEqual(calls('order_payment_state')[0].args, { p_order_id: orderId, p_customer_id: customerId });
assert.equal(calls('take_rate_limit')[0].args.p_key.split(':')[0], 'payment_status_user');
assert.equal(calls('take_rate_limit')[0].args.p_max, 240);
// Com refresh, mas consultado há menos de 25 s (refresh_due falso): não consulta.
reset(); state.states = [paymentState({ attempt: attempt({ method: 'pix', status: 'pending', provider_payment_id: '2222222222' }), refresh_due: false })];
await invoke({ action: 'status', orderId, refresh: true }); noProvider();
// Com refresh e consulta vencida: GET + apply 'reconcile' + nova leitura.
reset(); state.states = [paymentState({ attempt: attempt({ method: 'pix', status: 'pending', provider_payment_id: '2222222222' }), refresh_due: true }), paymentState({ order: { id: orderId, status: 'paid', payment_status: 'paid', total: 119.9 }, payable: false, reason: 'already_paid', attempt: attempt({ method: 'pix', status: 'approved', provider_payment_id: '2222222222' }) })];
state.payments['2222222222'] = { status: 200, body: pixPayment({ id: 2222222222, status: 'approved' }) };
result = await invoke({ action: 'status', orderId, refresh: true });
assert.deepEqual(state.fetches.map(call => `${call.method} ${call.url}`), ['GET https://api.mercadopago.com/v1/payments/2222222222']);
assert.equal(calls('apply_mp_payment')[0].args.p_source, 'reconcile');
assert.equal(result.data.order.paymentStatus, 'paid'); assert.equal(result.data.checkout, null, 'Pedido pago não recebe checkout');
// Cartão em análise ou em criação: sem checkout; tentativa em criação não aparece como pagamento.
reset(); state.states = [paymentState({ payable: false, reason: 'payment_in_review', attempt: attempt({ status: 'in_process', status_detail: 'pending_review_manual', provider_payment_id: '1234567890' }) })];
result = await invoke({ action: 'status', orderId }); assert.equal(result.data.checkout, null); assert.equal(result.data.payment.status, 'in_process');
reset(); state.states = [paymentState({ payable: false, reason: 'payment_in_progress', attempt: attempt({ created_at: ago(5_000) }) })];
result = await invoke({ action: 'status', orderId, refresh: true }); assert.equal(result.data.payment, null); assert.equal(result.data.checkout, null);
assert.equal(result.data.reason, 'payment_in_progress');
noProvider(); // Tentativa em criação com menos de 20 s: ainda não procura no Mercado Pago.
// Modo redirect ou sem Public Key: sem checkout (o status continua respondendo para retomar).
reset({ MERCADO_PAGO_CHECKOUT_MODE: 'redirect' }); result = await invoke({ action: 'status', orderId });
assert.equal(result.status, 200); assert.equal(result.data.checkout, null);
reset({ MERCADO_PAGO_PUBLIC_KEY: undefined }); assert.equal((await invoke({ action: 'status', orderId })).data.checkout, null);
// Pedido de outra conta: 404. Limite: 429 ou 503.
reset(); state.stateError = { message: 'order_not_found', code: 'P0001' };
result = await invoke({ action: 'status', orderId }); assert.equal(result.status, 404); assert.equal(result.data.error, 'order_not_found');
reset(); state.rate.payment_status_user = false; assert.equal((await invoke({ action: 'status', orderId })).status, 429);
reset(); state.rate.payment_status_user = null; assert.equal((await invoke({ action: 'status', orderId })).status, 503);

// ---- "confirming" (cobrado e não gravado) se resolve pela consulta, mesmo sem o aviso ----
const route = call => `${call.method} ${call.url.replace('https://api.mercadopago.com', '')}`;
const searchRoute = `GET /v1/payments/search?external_reference=${orderId}&sort=date_created&criteria=desc`;
// O pagamento volta "confirming"; 30 s depois, a consulta com refresh busca pela referência, aplica com 'reconcile'
// (a tentativa ganha o id pela attempt_key do metadata) e lê de novo. Antes de 2 minutos, nada vira erro.
reset(); state.applyResult = { data: null, error: { message: 'down' } };
assert.equal((await invoke(cardBody())).data.order.paymentStatus, 'confirming');
reset();
state.states = [
  paymentState({ payable: false, reason: 'payment_in_progress', attempt: attempt({ created_at: ago(30_000) }) }),
  paymentState({ order: { id: orderId, status: 'paid', payment_status: 'paid', total: 119.9 }, payable: false, reason: 'already_paid', attempt: attempt({ status: 'approved', status_detail: 'accredited', provider_payment_id: '1234567890', installments: 3 }) }),
];
state.search = { status: 200, body: { results: [mpPayment(), mpPayment({ id: 4444444444, external_reference: otherOrderId })] } };
result = await invoke({ action: 'status', orderId, refresh: true });
assert.equal(result.status, 200, JSON.stringify(result.data));
assert.deepEqual(state.fetches.map(route), [searchRoute]);
assert.deepEqual(calls('apply_mp_payment').map(call => [call.args.p_source, call.args.p_payment.id, call.args.p_payment.attempt_key]), [['reconcile', '1234567890', attemptKey]], 'Pagamento de outro pedido fica de fora');
assert.equal(calls('fail_payment_attempt').length, 0, 'Antes de 2 minutos a tentativa não vira erro');
assert.equal(result.data.order.paymentStatus, 'paid'); assert.equal(result.data.payment.status, 'approved');
assert.equal(result.data.checkout, null); assert.equal(result.data.reason, 'already_paid');
// Mais de 2 minutos (o pedido voltaria a ser pagável) e a busca falha: sem checkout, sem marcar erro. Vale sem refresh
// também (a tela recarregada consulta sem refresh).
reset(); state.states = [paymentState({ attempt: attempt({ created_at: ago(3 * 60_000) }) })]; state.search = { status: 503, body: {} };
result = await invoke({ action: 'status', orderId });
assert.equal(result.status, 200); assert.deepEqual(state.fetches.map(route), [searchRoute]);
assert.equal(calls('fail_payment_attempt').length, 0);
assert.equal(result.data.checkout, null, 'Sem checkout enquanto a tentativa em criação não se resolve');
assert.equal(result.data.payment, null); assert.equal(result.data.reason, 'payment_in_progress');
// Pagamento achado, mas a gravação falha: a tentativa não vira erro e o pedido continua sem checkout.
reset(); state.states = [paymentState({ attempt: attempt({ created_at: ago(3 * 60_000) }) })];
state.search = { status: 200, body: { results: [mpPayment()] } }; state.applyResult = { data: null, error: { message: 'down' } };
result = await invoke({ action: 'status', orderId, refresh: true });
assert.equal(calls('fail_payment_attempt').length, 0); assert.equal(result.data.checkout, null);
// Mais de 2 minutos e nada no Mercado Pago: a tentativa vira erro (mesma regra do begin) e o pedido volta a aceitar pagamento.
reset(); state.states = [paymentState({ attempt: attempt({ created_at: ago(3 * 60_000) }) }), paymentState({ attempt: attempt({ status: 'error', status_detail: 'reconcile_not_found', created_at: ago(3 * 60_000) }) })];
result = await invoke({ action: 'status', orderId, refresh: true });
assert.deepEqual(calls('fail_payment_attempt').map(call => call.args), [{ p_attempt_id: attemptId, p_status_detail: 'reconcile_not_found' }]);
assert.deepEqual(result.data.checkout, { publicKey, maxInstallments: 12, amount: 119.9 });
assert.equal(result.data.payment, null); assert.equal(result.data.reason, null);
// Pix "confirming": a consulta acha o Pix pendente e devolve o QR gravado.
reset();
state.states = [
  paymentState({ attempt: attempt({ method: 'pix', created_at: ago(40_000) }), payable: false, reason: 'payment_in_progress' }),
  paymentState({ attempt: attempt({ method: 'pix', status: 'pending', provider_payment_id: '2222222222', expires_at: '2999-01-01T00:00:00+00:00', pix: { qr_code: qrCode, qr_code_base64: qrBase64, expires_at: '2999-01-01T00:00:00+00:00' } }) }),
];
state.search = { status: 200, body: { results: [pixPayment({ id: 2222222222 })] } };
state.applyResult = { data: { decision: 'pending', alerts: [], order_id: orderId, payment_status: 'pending', status: 'awaiting_payment' }, error: null };
result = await invoke({ action: 'status', orderId, refresh: true });
assert.deepEqual(calls('apply_mp_payment')[0].args.p_payment.pix, { qr_code: qrCode, qr_code_base64: qrBase64, expires_at: '2026-11-26T15:35:00.000-03:00' });
assert.equal(result.data.payment.pix.qrCode, qrCode);

// ---- Ação cancel_pix ----
const openPix = () => paymentState({ attempt: attempt({ method: 'pix', status: 'pending', provider_payment_id: '2222222222' }) });
reset(); state.states = [openPix(), paymentState()]; state.payments['2222222222'] = { status: 200, body: pixPayment({ id: 2222222222, status: 'cancelled' }) };
result = await invoke({ action: 'cancel_pix', orderId });
assert.equal(result.status, 200); assert.equal(result.data.ok, true); assert.equal(result.data.order.paymentStatus, 'pending');
assert.deepEqual(state.fetches.map(call => call.method), ['PUT', 'GET']);
assert.equal(calls('begin_payment_attempt').length, 0, 'Cancelar não cria tentativa');
reset(); state.states = [openPix()]; state.payments['2222222222'] = { status: 200, body: pixPayment({ id: 2222222222 }) };
result = await invoke({ action: 'cancel_pix', orderId }); assert.equal(result.status, 409); assert.equal(result.data.error, 'pix_cancel_failed');
reset(); state.states = [openPix()]; state.payments['2222222222'] = { status: 200, body: pixPayment({ id: 2222222222, status: 'approved' }) };
result = await invoke({ action: 'cancel_pix', orderId }); assert.equal(result.status, 409); assert.equal(result.data.error, 'already_paid');
reset(); state.states = [paymentState()];
result = await invoke({ action: 'cancel_pix', orderId }); assert.equal(result.status, 200); assert.equal(result.data.ok, true); noProvider();
// Outra chave no cancelamento seguinte do mesmo Pix.
reset(); state.states = [openPix(), paymentState()]; state.payments['2222222222'] = { status: 200, body: pixPayment({ id: 2222222222, status: 'cancelled' }) };
await invoke({ action: 'cancel_pix', orderId });
assert.match(state.fetches[0].headers['X-Idempotency-Key'], uuidV4);
assert.notEqual(state.fetches[0].headers['X-Idempotency-Key'], firstCancelKey);
// Pix em criação sem id (resposta perdida ou gravação que falhou): procura, aplica e cancela o que aparecer.
const creatingPix = age => paymentState({ attempt: attempt({ method: 'pix', created_at: ago(age) }) });
reset(); state.states = [creatingPix(10_000), openPix(), paymentState()];
state.search = { status: 200, body: { results: [pixPayment({ id: 2222222222 })] } };
state.payments['2222222222'] = { status: 200, body: pixPayment({ id: 2222222222, status: 'cancelled' }) };
result = await invoke({ action: 'cancel_pix', orderId });
assert.equal(result.status, 200, JSON.stringify(result.data)); assert.equal(result.data.ok, true);
assert.deepEqual(state.fetches.map(route), [searchRoute, 'PUT /v1/payments/2222222222', 'GET /v1/payments/2222222222']);
assert.equal(calls('apply_mp_payment')[0].args.p_source, 'reconcile'); assert.equal(calls('fail_payment_attempt').length, 0);
// Ainda sem nada no Mercado Pago (menos de 2 minutos): pix_cancel_failed, sem PUT e sem marcar erro.
reset(); state.states = [creatingPix(30_000)];
result = await invoke({ action: 'cancel_pix', orderId });
assert.equal(result.status, 409); assert.equal(result.data.error, 'pix_cancel_failed');
assert.deepEqual(state.fetches.map(route), [searchRoute]); assert.equal(calls('fail_payment_attempt').length, 0);
// Mais de 2 minutos e nada no Mercado Pago: a tentativa vira erro e não há o que cancelar.
reset(); state.states = [creatingPix(3 * 60_000), paymentState({ attempt: attempt({ method: 'pix', status: 'error', created_at: ago(3 * 60_000) }) })];
result = await invoke({ action: 'cancel_pix', orderId });
assert.equal(result.status, 200); assert.equal(result.data.ok, true);
assert.deepEqual(state.fetches.map(route), [searchRoute]); assert.equal(calls('fail_payment_attempt').length, 1);

// ---- Logs: nunca token do cartão, CPF, e-mail, nome, telefone, endereço, QR, Access Token ou corpo do Mercado Pago ----
const logText = JSON.stringify(logs);
for (const forbidden of [cardToken, holderCpf, customerCpf, accountEmail, qrCode, qrBase64, 'TEST-token', 'secret', ...personal]) {
  assert.ok(!logText.includes(forbidden), `log sem ${forbidden}`);
}

// ---- Estrutura ----
const source = readFileSync('supabase/functions/process-payment/index.ts', 'utf8');
assert.doesNotMatch(source, /ticket_url/, 'O link do Mercado Pago para fora do site não é usado');
assert.doesNotMatch(source, /body\.(amount|transaction_amount|email|external_reference|description|notification_url)/, 'Campos do navegador que o servidor ignora');
assert.doesNotMatch(source, /graphene-cancel-/, 'Sem chave fixa no cancelamento do Pix');
assert.doesNotMatch(source, /^const (uuidPattern|encoder|json|allowedOrigin)\b/m, 'Nomes do _shared não são redeclarados (bundle do painel)');
assert.match(readFileSync('supabase/config.toml', 'utf8'), /\[functions\.process-payment\]\r?\n(?:#.*\r?\n)*verify_jwt = false/);

console.log('process-payment conferido: CORS, sessão, validação (bandeiras de crédito, CPF/CNPJ, parcelas), chave de modo, valor e e-mail do servidor, chave de repetição, Pix com 35 min e QR do Mercado Pago, repetição, Pix aberto cancelado antes de cobrar (chave nova a cada cancelamento; outro pedido pago = other_order_paid), conciliação de cada pedido com tentativa antiga, limites, erros do Mercado Pago, gravação que falha ("confirming", com nova gravação e conserto pela consulta), status, cancel_pix (também do Pix em criação) e logs sem dados pessoais. Nenhuma cobrança real.');
