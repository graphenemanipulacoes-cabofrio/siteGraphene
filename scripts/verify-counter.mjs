import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
import { SourceTextModule, SyntheticModule, createContext } from 'node:vm';
import { webcrypto } from 'node:crypto';
import { safeLink, whatsappLink, addressText, readCounterSession, clearCounterSession } from '../src/utils/counter.js';

const storage = new Map();
globalThis.localStorage = { getItem: key => storage.get(key) || null, setItem: (key, value) => storage.set(key, value), removeItem: key => storage.delete(key) };
assert.equal(readCounterSession(), null);
storage.set('graphene_counter_session', JSON.stringify({ token: 'a'.repeat(64), user: { username: 'equipe' } }));
assert.equal(readCounterSession().token, 'a'.repeat(64)); // No artificial client expiry.
clearCounterSession(); assert.equal(readCounterSession(), null);
assert.equal(safeLink('javascript:alert(1)'), null);
assert.equal(safeLink('data:text/html,secret'), null);
assert.equal(safeLink('https://example.com/nota'), 'https://example.com/nota');
assert.equal(whatsappLink('(22) 99936-1256'), 'https://wa.me/5522999361256');
assert.equal(whatsappLink('123'), null);
assert.match(addressText({ name: 'Cliente teste', address: 'Rua teste', number: '10', zip: '28900-000' }), /Rua teste, 10/);

let handler;
const calls = [];
const rpcCalls = [];
const state = { session: null, adminSession: null, account: null, adminRecord: null, rateAllowed: true };
class Query {
  constructor(table) { this.table = table; this.filters = []; this.operation = 'read'; calls.push(this); }
  select(columns, options) { this.columns = columns; this.options = options; return this; }
  eq(key, value) { this.filters.push(['eq', key, value]); return this; }
  ilike(key, value) { this.filters.push(['ilike', key, value]); return this; }
  contains(key, value) { this.filters.push(['contains', key, value]); return this; }
  gt(key, value) { this.filters.push(['gt', key, value]); return this; }
  gte(key, value) { this.filters.push(['gte', key, value]); return this; }
  lte(key, value) { this.filters.push(['lte', key, value]); return this; }
  lt(key, value) { this.filters.push(['lt', key, value]); return this; }
  is(key, value) { this.filters.push(['is', key, value]); return this; }
  in(key, value) { this.filters.push(['in', key, value]); return this; }
  or(value) { this.filters.push(['or', value]); return this; }
  order() { return this; }
  range(from, to) { this.rangeValue = [from, to]; return this; }
  insert(value) { this.operation = 'insert'; this.value = value; return this; }
  update(value) { this.operation = 'update'; this.value = value; return this; }
  delete() { this.operation = 'delete'; return this; }
  maybeSingle() { this.isSingle = true; return this; }
  single() { this.isSingle = true; return this; }
  limit() { return this; }
  result() {
    if (this.table === 'counter_sessions' && this.isSingle) return { data: state.session, error: null };
    if (this.table === 'counter_accounts' && this.isSingle) return { data: state.account, error: null };
    if (this.table === 'admin_sessions' && this.isSingle) return { data: state.adminSession, error: null };
    if (this.table === 'admins' && this.isSingle) return { data: state.adminRecord, error: null };
    if (this.table === 'orders') return { data: [], error: null, count: 0 };
    if (this.table === 'solicitacoes' && this.isSingle) return { data: null, error: null };
    if (this.table === 'loja_config' && this.isSingle) return { data: { frete: { free_min: null, origin: { address: 'Loja' }, local: { ranges: [['28890000', '28979999']] }, zones: [{ id: 'rj', label: 'RJ', ufs: ['RJ'], price: 19.9, days_min: 2, days_max: 5 }, { id: 'sul', label: 'Sul', ufs: ['PR'], price: 29.9, days_min: 5, days_max: 9 }] } }, error: null };
    if (this.table === 'sabores' && this.isSingle) return { data: { id: this.value?.id || 'morango', name: this.value?.name || 'Morango', display_order: 3 }, error: null };
    if (this.table === 'sabores') return { data: [{ id: 'morango' }, { id: 'chocolate' }], error: null };
    if (this.table === 'produtos' && this.filters.some(item => item[0] === 'contains')) return { data: [{ id: 7, options: { sizes: [], flavors: ['chocolate', 'morango'], natural: true } }], error: null };
    if (this.table === 'produtos' && this.isSingle) return { data: { id: 7, display_order: 5, name: 'Produto teste' }, error: null };
    if (this.table === 'produtos' && this.operation === 'delete') return { data: [{ id: 7 }], error: null };
    return { data: [], error: null, count: 0 };
  }
  then(resolve, reject) { return Promise.resolve(this.result()).then(resolve, reject); }
}
const client = { storage: { from: () => ({ createSignedUploadUrl: async path => ({ data: { path, token: 'upload-token' }, error: null }) }) }, from: table => new Query(table), rpc: async (name, body) => { rpcCalls.push({ name, body }); return { data: name === 'counter_take_login_attempt' ? state.rateAllowed : '11111111-1111-4111-8111-111111111111', error: null }; } };
const context = createContext({ Number, Array, Set, Math, Date, String, btoa, crypto: webcrypto, TextEncoder, Uint8Array, URL, Request, Response, console, Deno: { env: { get: name => name === 'SITE_URL' ? 'https://www.graphenemanipulacoes.com.br' : 'https://project.supabase.co' }, serve: fn => { handler = fn; } } });
const securityModule = new SourceTextModule(stripTypeScriptTypes(readFileSync('supabase/functions/_shared/counter-security.ts', 'utf8')), { context });
const httpModule = new SourceTextModule(stripTypeScriptTypes(readFileSync('supabase/functions/_shared/http.ts', 'utf8')), { context });
const clientModule = new SyntheticModule(['createClient'], function() { this.setExport('createClient', () => client); }, { context });
const main = new SourceTextModule(stripTypeScriptTypes(readFileSync('supabase/functions/balcao-api/index.ts', 'utf8')), { context });
await main.link(specifier => specifier.includes('supabase-js') ? clientModule : specifier.includes('counter-security') ? securityModule : httpModule);
await main.evaluate();
const security = securityModule.namespace;
assert.equal(security.validPassword('short'), false);
assert.equal(security.validPassword(' phrase with spaces '), true);
assert.equal(security.normalizeUsername('  BaLcao.CaboFrio '), 'balcao.cabofrio');
assert.equal(security.validUsername('a*'), false);
const hashed = await security.hashPassword(' senha-teste-segura ');
assert.match(hashed, /^pbkdf2-sha256\$600000\$/);
assert.equal(await security.verifyPassword(' senha-teste-segura ', hashed), true);
assert.equal(await security.verifyPassword('senha-teste-segura', hashed), false);
assert.notEqual(hashed, await security.hashPassword(' senha-teste-segura '));
assert.equal(security.prescriptionLocation('https://attacker.example/arquivo.pdf', 'https://project.supabase.co'), null);
assert.equal(security.prescriptionLocation('https://project.supabase.co/storage/v1/object/public/receitas/../../produtos.png', 'https://project.supabase.co'), null);
assert.equal(security.prescriptionLocation('intake/11111111-1111-4111-8111-111111111111.pdf', 'https://project.supabase.co').bucket, 'receitas-privadas');
const send = async (body, extraHeaders = {}, origin = 'https://www.graphenemanipulacoes.com.br') => {
  const response = await handler(new Request('https://project.supabase.co/functions/v1/balcao-api', { method: 'POST', headers: { origin, 'content-type': 'application/json', ...extraHeaders }, body: JSON.stringify(body) }));
  return { status: response.status, data: await response.json() };
};
assert.equal((await send({ action: 'summary' }, {}, 'https://attacker.example')).status, 403);
assert.equal((await send(null)).status, 400);
assert.equal((await send({ action: 'list_orders' })).status, 401);
assert.equal((await send({ action: 'list_accounts', sessionToken: 'a'.repeat(64) })).status, 401);
assert.equal((await send({ action: 'save_account' }, { 'x-admin-token': 'a'.repeat(64) })).status, 401);
assert.equal((await send({ action: 'update_order', sessionToken: 'a'.repeat(64) })).status, 400);
state.rateAllowed = false;
assert.equal((await send({ action: 'login', username: 'balcao', password: 'senha-teste-segura' })).status, 429);
state.rateAllowed = true;
assert.equal((await send({ action: 'login', username: 'balcao', password: 'senha-teste-segura' })).status, 401);
state.account = { id: '11111111-1111-4111-8111-111111111111', username: 'balcao', display_name: 'Equipe teste', password_hash: hashed, is_active: true, auth_version: 1 };
const authenticated = await send({ action: 'login', username: ' BaLcao ', password: ' senha-teste-segura ' });
assert.equal(authenticated.status, 200);
assert.match(authenticated.data.token, /^[a-f0-9]{64}$/);
assert.equal(authenticated.data.user.username, 'balcao');
assert.equal(authenticated.data.password_hash, undefined);
const insertedSession = calls.filter(call => call.table === 'counter_sessions' && call.operation === 'insert').at(-1);
assert.equal(insertedSession.value.token_hash, await security.hashToken(authenticated.data.token));
assert.notEqual(insertedSession.value.token_hash, authenticated.data.token);
state.account = null;
state.adminSession = { admin_username: 'admin_teste' };
assert.equal((await send({ action: 'list_accounts' }, { 'x-admin-token': 'b'.repeat(64) })).status, 200);
assert.equal((await send({ action: 'save_account', displayName: 'Equipe teste', username: 'balcao', password: 'senha-teste-segura' }, { 'x-admin-token': 'b'.repeat(64) })).status, 200);
const createAccount = rpcCalls.filter(call => call.name === 'counter_manage_account').at(-1).body;
assert.equal(createAccount.p_action, 'create');
assert.match(createAccount.p_password_hash, /^pbkdf2-sha256\$600000\$/);
assert.equal(await security.verifyPassword('senha-teste-segura', createAccount.p_password_hash), true);
assert.equal((await send({ action: 'save_account', id: '11111111-1111-4111-8111-111111111111', displayName: 'Equipe teste', username: 'balcao', password: '', isActive: false }, { 'x-admin-token': 'b'.repeat(64) })).status, 200);
assert.equal(rpcCalls.at(-1).body.p_password_hash, null);
assert.equal(rpcCalls.at(-1).body.p_is_active, false);
assert.equal((await send({ action: 'revoke_account', id: '11111111-1111-4111-8111-111111111111' }, { 'x-admin-token': 'b'.repeat(64) })).status, 200);
assert.equal(rpcCalls.at(-1).body.p_action, 'revoke');
state.adminSession = null;
state.session = { auth_version: 1, account_id: 'test', counter_accounts: { is_active: true, auth_version: 1, username: 'balcao', display_name: 'Equipe teste' } };
assert.equal((await send({ action: 'session', sessionToken: 'a'.repeat(64) })).status, 200);
state.session.counter_accounts.is_active = false;
assert.equal((await send({ action: 'summary', sessionToken: 'a'.repeat(64) })).status, 401);
state.session.counter_accounts.is_active = true;
state.session.counter_accounts.auth_version = 2;
assert.equal((await send({ action: 'list_orders', sessionToken: 'a'.repeat(64) })).status, 401);
state.session.counter_accounts.auth_version = 1;
assert.equal((await send({ action: 'list_orders', sessionToken: 'a'.repeat(64), status: 'preparation', offset: 50 })).status, 200);
const ordersQuery = calls.filter(call => call.table === 'orders').at(-1);
assert.deepEqual(ordersQuery.rangeValue, [50, 99]);
assert.equal(ordersQuery.filters.find(item => item[0] === 'eq' && item[1] === 'payment_status')?.[2], 'paid');
assert.equal((await send({ action: 'list_orders', sessionToken: 'a'.repeat(64), from: 'nonsense' })).status, 400);
// Tipos de conta e cadastro de produtos (farmacêutico).
state.adminSession = { admin_username: 'admin_teste' };
assert.equal((await send({ action: 'save_account', displayName: 'Farmácia', username: 'farma', password: 'senha-teste-segura', role: 'farmaceutico' }, { 'x-admin-token': 'b'.repeat(64) })).status, 200);
assert.equal(rpcCalls.at(-1).body.p_role, 'farmaceutico');
assert.equal((await send({ action: 'save_account', displayName: 'Farmácia', username: 'farma', password: 'senha-teste-segura', role: 'admin' }, { 'x-admin-token': 'b'.repeat(64) })).status, 400);
assert.equal((await send({ action: 'delete_account', id: '11111111-1111-4111-8111-111111111111' }, { 'x-admin-token': 'b'.repeat(64) })).status, 200);
assert.equal(rpcCalls.at(-1).body.p_action, 'delete');
assert.equal((await send({ action: 'delete_account' }, { 'x-admin-token': 'b'.repeat(64) })).status, 400);
state.adminSession = null;
state.account = { id: '11111111-1111-4111-8111-111111111111', username: 'balcao', display_name: 'Equipe teste', role: 'balcao', password_hash: hashed, is_active: true, auth_version: 1 };
assert.equal((await send({ action: 'login', username: 'balcao', password: ' senha-teste-segura ', area: 'farmaceutico' })).status, 403);
assert.equal((await send({ action: 'login', username: 'balcao', password: ' senha-teste-segura ' })).status, 200);
state.account.role = 'farmaceutico';
const pharmacistLogin = await send({ action: 'login', username: 'balcao', password: ' senha-teste-segura ', area: 'farmaceutico' });
assert.equal(pharmacistLogin.status, 200);
assert.equal(pharmacistLogin.data.user.role, 'farmaceutico');
state.account = null;
state.session.counter_accounts.role = 'balcao';
assert.equal((await send({ action: 'products_list', sessionToken: 'a'.repeat(64) })).status, 403);
assert.equal((await send({ action: 'product_save', sessionToken: 'a'.repeat(64), name: 'X' })).status, 403);
state.session.counter_accounts.role = 'farmaceutico';
assert.equal((await send({ action: 'products_list', sessionToken: 'a'.repeat(64) })).status, 200);
assert.equal((await send({ action: 'product_save', sessionToken: 'a'.repeat(64), name: 'Teste', imageUrl: 'javascript:alert(1)' })).status, 400);
assert.equal((await send({ action: 'product_save', sessionToken: 'a'.repeat(64), name: 'Teste', price: -1 })).status, 400);
assert.equal((await send({ action: 'product_save', sessionToken: 'a'.repeat(64), name: '', price: 10 })).status, 400);
const created = await send({ action: 'product_save', sessionToken: 'a'.repeat(64), name: 'Teste', description: 'Descrição', price: '19.9', imageUrl: '/assets/products/teste.png' });
assert.equal(created.status, 200);
assert.equal(calls.filter(call => call.table === 'produtos' && call.operation === 'insert').at(-1).value.display_order, 6);
assert.equal((await send({ action: 'product_save', sessionToken: 'a'.repeat(64), id: 7, name: 'Teste', imageUrl: 'https://project.supabase.co/storage/v1/object/public/receitas/products/x.png' })).status, 200);
assert.equal((await send({ action: 'product_save', sessionToken: 'a'.repeat(64), id: 'abc', name: 'Teste' })).status, 400);
// Quantidades e sabores: preço por quantidade, sabores só do catálogo, preço da vitrine = menor preço.
const lastProductWrite = () => calls.filter(call => call.table === 'produtos' && ['insert', 'update'].includes(call.operation)).at(-1).value;
assert.equal((await send({ action: 'product_save', sessionToken: 'a'.repeat(64), id: 7, name: 'Creatina', options: { sizes: [{ label: '200 g', price: 59.9 }, { label: '200 G', price: 60 }] } })).status, 400);
assert.equal((await send({ action: 'product_save', sessionToken: 'a'.repeat(64), id: 7, name: 'Creatina', options: { sizes: [{ label: '200 g', price: -1 }] } })).status, 400);
assert.equal((await send({ action: 'product_save', sessionToken: 'a'.repeat(64), id: 7, name: 'Creatina', options: 'x' })).status, 400);
assert.equal((await send({ action: 'product_save', sessionToken: 'a'.repeat(64), id: 7, name: 'Creatina', price: 1, options: { sizes: [{ label: '150 g', price: '' }, { label: '200 g', price: '59.9' }, { label: '300 g', price: 89.9 }], flavors: ['morango', 'inventado', 'morango'], natural: true, flavor_price: '10' } })).status, 200);
const savedOptions = lastProductWrite();
assert.equal(savedOptions.price, 59.9);
assert.equal(JSON.stringify(savedOptions.options), JSON.stringify({ sizes: [{ id: '150-g', label: '150 g', price: null }, { id: '200-g', label: '200 g', price: 59.9 }, { id: '300-g', label: '300 g', price: 89.9 }], flavors: ['morango'], natural: true, flavor_price: 10 }));
assert.equal((await send({ action: 'product_save', sessionToken: 'a'.repeat(64), id: 7, name: 'Sem opções', price: 12 })).status, 200);
assert.equal(lastProductWrite().options, undefined);
assert.equal(lastProductWrite().price, 12);
assert.equal((await send({ action: 'flavor_save', sessionToken: 'a'.repeat(64), name: 'Natural' })).status, 400);
assert.equal((await send({ action: 'flavor_save', sessionToken: 'a'.repeat(64), name: ' ' })).status, 400);
const newFlavor = await send({ action: 'flavor_save', sessionToken: 'a'.repeat(64), name: 'Açaí com Guaraná' });
assert.equal(newFlavor.status, 200);
assert.equal(calls.filter(call => call.table === 'sabores' && call.operation === 'insert').at(-1).value.id, 'acai-com-guarana');
assert.equal((await send({ action: 'flavor_delete', sessionToken: 'a'.repeat(64), id: '../x' })).status, 400);
const flavorRemoval = await send({ action: 'flavor_delete', sessionToken: 'a'.repeat(64), id: 'chocolate' });
assert.equal(flavorRemoval.status, 200);
assert.equal(JSON.stringify(calls.filter(call => call.table === 'produtos' && call.operation === 'update').at(-1).value.options.flavors), JSON.stringify(['morango']));
assert.equal(calls.filter(call => call.table === 'sabores' && call.operation === 'delete').at(-1).filters[0][2], 'chocolate');
state.session.counter_accounts.role = 'balcao';
assert.equal((await send({ action: 'flavor_save', sessionToken: 'a'.repeat(64), name: 'Coco' })).status, 403);
state.session.counter_accounts.role = 'farmaceutico';
assert.equal((await send({ action: 'products_reorder', sessionToken: 'a'.repeat(64), ids: [3, 3] })).status, 400);
assert.equal((await send({ action: 'products_reorder', sessionToken: 'a'.repeat(64), ids: [3, 1, 2] })).status, 200);
assert.equal((await send({ action: 'product_delete', sessionToken: 'a'.repeat(64), id: 7 })).status, 200);
assert.equal((await send({ action: 'product_image_upload', sessionToken: 'a'.repeat(64), extension: 'exe' })).status, 400);
assert.equal((await send({ action: 'product_image_upload', sessionToken: 'a'.repeat(64), extension: 'png' })).status, 200);
state.session.counter_accounts.role = 'balcao';
// Administradores entram em todas as áreas da equipe com o login do painel.
const sha = value => security.hashToken(value);
state.account = null; state.adminSession = null;
state.adminRecord = { id: 1, username: 'Thales', password: await sha('curta1') };
const adminLogin = await send({ action: 'login', username: 'thales', password: ' curta1 ' });
assert.equal(adminLogin.status, 200);
assert.equal(adminLogin.data.user.role, 'admin');
assert.equal(adminLogin.data.user.username, 'Thales');
assert.match(adminLogin.data.token, /^[A-Za-z0-9_-]{43}$/);
const adminInsert = calls.filter(call => call.table === 'admin_sessions' && call.operation === 'insert').at(-1);
assert.equal(adminInsert.value.token_hash, await sha(adminLogin.data.token));
assert.equal(adminInsert.value.admin_username, 'Thales');
assert.equal((await send({ action: 'login', username: 'thales', password: 'curta1', area: 'farmaceutico' })).status, 200);
assert.equal((await send({ action: 'login', username: 'thales', password: 'errada' })).status, 401);
assert.equal((await send({ action: 'login', username: 'th*', password: 'curta1' })).status, 401);
assert.equal((await send({ action: 'login', username: 'th_les', password: 'curta1' })).status, 401);
assert.equal(calls.filter(call => call.table === 'admins').at(-1).filters.find(item => item[0] === 'ilike')[2], 'th\\_les');
// Senhas antigas (SHA-256 ou texto puro) viram PBKDF2 no primeiro login certo.
const upgradedHash = () => calls.filter(call => call.table === 'admins' && call.operation === 'update').at(-1)?.value.password;
assert.match(upgradedHash(), /^pbkdf2-sha256\$600000\$/);
assert.equal(await security.verifyPassword('curta1', upgradedHash()), true);
state.adminRecord = { id: 2, username: 'legado', password: 'senha-antiga' };
assert.equal((await send({ action: 'login', username: 'legado', password: 'senha-antiga' })).status, 200);
assert.equal(await security.verifyPassword('senha-antiga', upgradedHash()), true);
const updatesBefore = calls.filter(call => call.table === 'admins' && call.operation === 'update').length;
state.adminRecord = { id: 3, username: 'forte', password: await security.hashPassword('senha forte do admin') };
assert.equal((await send({ action: 'login', username: 'forte', password: 'senha forte do admin' })).status, 200);
assert.equal((await send({ action: 'login', username: 'forte', password: 'senha errada do admin' })).status, 401);
assert.equal(calls.filter(call => call.table === 'admins' && call.operation === 'update').length, updatesBefore);
const noRecord = await security.verifyAdminPassword('qualquer', null);
assert.equal(noRecord.valid, false); assert.equal(noRecord.upgrade, false);
state.adminRecord = null;
const adminToken = 'c'.repeat(43);
assert.equal((await send({ action: 'session', sessionToken: adminToken })).status, 401);
state.adminSession = { admin_username: 'Thales' };
const adminSessionCheck = await send({ action: 'session', sessionToken: adminToken });
assert.equal(adminSessionCheck.status, 200);
assert.equal(adminSessionCheck.data.user.role, 'admin');
assert.equal((await send({ action: 'products_list', sessionToken: adminToken })).status, 200);
assert.equal((await send({ action: 'list_orders', sessionToken: adminToken })).status, 200);
assert.equal((await send({ action: 'products_list', sessionToken: 'c'.repeat(42) })).status, 401);
assert.equal((await send({ action: 'logout', sessionToken: adminToken })).status, 200);
assert.equal(calls.filter(call => call.table === 'admin_sessions').at(-1).operation, 'delete');
state.adminSession = null;
// Login do painel admin (admin-login): limite de tentativas no servidor e senha forte.
let adminLoginHandler;
const adminContext = createContext({ Number, Array, Set, Math, Date, String, btoa, crypto: webcrypto, TextEncoder, Uint8Array, URL, Request, Response, console, Deno: { env: { get: name => name === 'SITE_URL' ? 'https://www.graphenemanipulacoes.com.br' : 'https://project.supabase.co' }, serve: fn => { adminLoginHandler = fn; } } });
const adminSecurity = new SourceTextModule(stripTypeScriptTypes(readFileSync('supabase/functions/_shared/counter-security.ts', 'utf8')), { context: adminContext });
const adminHttp = new SourceTextModule(stripTypeScriptTypes(readFileSync('supabase/functions/_shared/http.ts', 'utf8')), { context: adminContext });
const adminClient = new SyntheticModule(['createClient'], function() { this.setExport('createClient', () => client); }, { context: adminContext });
const adminLoginModule = new SourceTextModule(stripTypeScriptTypes(readFileSync('supabase/functions/admin-login/index.ts', 'utf8')), { context: adminContext });
await adminLoginModule.link(specifier => specifier.includes('supabase-js') ? adminClient : specifier.includes('counter-security') ? adminSecurity : adminHttp);
await adminLoginModule.evaluate();
const panelLogin = async (body, origin = 'https://www.graphenemanipulacoes.com.br') => {
  const response = await adminLoginHandler(new Request('https://project.supabase.co/functions/v1/admin-login', { method: 'POST', headers: { origin, 'content-type': 'application/json' }, body: JSON.stringify(body) }));
  return { status: response.status, data: await response.json() };
};
assert.equal((await panelLogin({ username: 'thales', password: 'curta1' }, 'https://attacker.example')).status, 403);
state.rateAllowed = false;
assert.equal((await panelLogin({ username: 'thales', password: 'curta1' })).status, 429);
assert.equal(rpcCalls.at(-1).name, 'counter_take_login_attempt');
assert.equal(rpcCalls.at(-1).body.p_keys[1], 'user:' + await sha('thales'));
state.rateAllowed = true;
state.adminRecord = null;
assert.equal((await panelLogin({ username: 'thales', password: 'curta1' })).status, 401);
state.adminRecord = { id: 1, username: 'Thales', password: await sha('curta1') };
assert.equal((await panelLogin({ username: 'thales', password: 'errada' })).status, 401);
assert.equal((await panelLogin({ username: 'th*', password: 'curta1' })).status, 401);
assert.equal((await panelLogin({ username: 'outro', password: 'curta1' })).status, 401);
const panelSession = await panelLogin({ username: ' THALES ', password: ' curta1 ' });
assert.equal(panelSession.status, 200);
assert.match(panelSession.data.token, /^[A-Za-z0-9_-]{43}$/);
assert.equal(panelSession.data.user, 'Thales');
assert.equal(await security.verifyPassword('curta1', upgradedHash()), true);
assert.equal(calls.filter(call => call.table === 'admin_sessions' && call.operation === 'insert').at(-1).value.token_hash, await sha(panelSession.data.token));
assert.equal(calls.filter(call => call.table === 'counter_login_limits' && call.operation === 'delete').at(-1).filters[0][2], 'user:' + await sha('thales'));
state.adminRecord = null;
const adminOrders = readFileSync('supabase/functions/admin-orders/index.ts', 'utf8');
assert.match(adminOrders, /const passwordHash = await hashAdminPassword\(password\);/);
assert.match(adminOrders, /iterations: 600_000/);
// Regras de frete: só administrador altera; valores validados.
const shippingWrite = () => calls.filter(call => call.table === 'loja_config' && call.operation === 'update').at(-1)?.value;
assert.equal((await send({ action: 'shipping_save', sessionToken: 'a'.repeat(64), frete: { free_min: 150 } })).status, 403);
state.adminSession = { admin_username: 'Thales' };
assert.equal((await send({ action: 'shipping_save', sessionToken: 'c'.repeat(43), frete: { free_min: -5, zones: [] } })).status, 400);
assert.equal((await send({ action: 'shipping_save', sessionToken: 'c'.repeat(43), frete: { free_min: 150, zones: [{ id: 'rj', price: 15, days_min: 5, days_max: 2 }] } })).status, 400);
assert.equal((await send({ action: 'shipping_save', sessionToken: 'c'.repeat(43), frete: { free_min: 150, zones: [{ id: 'rj', price: 2000, days_min: 1, days_max: 2 }] } })).status, 400);
const savedShipping = await send({ action: 'shipping_save', sessionToken: 'c'.repeat(43), frete: { free_min: '149.9', local: { ranges: [['0', '99999999']] }, zones: [{ id: 'rj', price: '15', days_min: 1, days_max: 3 }, { id: 'inventada', price: 1, days_min: 1, days_max: 1 }] } });
assert.equal(savedShipping.status, 200);
assert.equal(shippingWrite().frete.free_min, 149.9);
assert.equal(shippingWrite().updated_by, 'Thales');
assert.equal(JSON.stringify(shippingWrite().frete.local.ranges), JSON.stringify([['28890000', '28979999']]));
assert.equal(JSON.stringify(shippingWrite().frete.zones.map(zone => [zone.id, zone.price, zone.days_min, zone.days_max])), JSON.stringify([['rj', 15, 1, 3], ['sul', 29.9, 5, 9]]));
assert.equal((await send({ action: 'shipping_save', sessionToken: 'c'.repeat(43), frete: { free_min: '', zones: [] } })).status, 200);
assert.equal(shippingWrite().frete.free_min, null);
state.adminSession = null;
const frete = readFileSync('supabase/migrations/202610230002_frete.sql', 'utf8');
assert.match(frete, /grant select on public\.loja_config to anon, authenticated;/);
assert.match(frete, /raise exception 'invalid_shipping_zip'/);
assert.match(frete, /v_total := v_subtotal - v_discount \+ v_shipping;/);
assert.match(readFileSync('supabase/functions/create-checkout/index.ts', 'utf8'), /id: 'frete', title: 'Entrega'/);
const equipe = readFileSync('supabase/migrations/202610220001_equipe_farmaceutico.sql', 'utf8');
assert.match(equipe, /check \(role in \('balcao', 'farmaceutico'\)\)/);
assert.match(equipe, /revoke all on function public\.counter_manage_account\(text,uuid,text,text,text,boolean,text,text\) from public, anon, authenticated/);
assert.match(equipe, /\/assets\/products\//);
assert.equal((await send({ action: 'logout', sessionToken: 'a'.repeat(64) })).status, 200);
assert.equal(calls.filter(call => call.table === 'orders' || call.table === 'solicitacoes').every(call => call.operation === 'read'), true);
const migration = readFileSync('supabase/migrations/202610080001_counter_portal.sql', 'utf8');
assert.match(migration, /revoke all on public\.counter_accounts, public\.counter_sessions, public\.counter_login_limits from public, anon, authenticated/);
assert.match(migration, /auth_version = auth_version \+ 1/);
assert.equal(/expires_at/.test(migration), false);
console.log('Counter checks passed: shipping rules, product sizes/flavors, admin login rate limit and strong admin passwords, admin access to staff areas, staff roles (balcão/farmacêutico), pharmacist product actions, account deletion, password hashing, persistent-session storage, server authorization, account revocation, rate limiting, pagination, preparation filter, read-only access and safe document links. SQL checks are structural; production integration requires deployment.');
const checkout = readFileSync('supabase/functions/create-checkout/index.ts', 'utf8');
assert.match(checkout, /admin\.rpc\('create_checkout_order_v2'/);
assert.doesNotMatch(checkout, /admin\.rpc\([^\n]*'create_checkout_order'/, 'All checkouts must use authoritative variant + delivery pricing');
assert.match(checkout, /size: variantId\(item\?\.size\), flavor: variantId\(item\?\.flavor\)/);
const variations = readFileSync('supabase/migrations/202610230001_variacoes_produtos.sql', 'utf8');
assert.match(variations, /raise exception 'invalid_variant'/);
assert.match(variations, /grant execute on function public\.create_checkout_order_v2\(uuid, text, uuid, jsonb, jsonb, text\) to service_role/);
