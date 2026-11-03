// Verifica as correções de segurança com banco e Supabase simulados: nada é gravado de verdade.
// Uso: node --experimental-vm-modules scripts/verify-security.mjs
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
import { SourceTextModule, SyntheticModule, createContext } from 'node:vm';
import { webcrypto } from 'node:crypto';

const site = 'https://www.graphenemanipulacoes.com.br';
const jwtWith = aal => `h.${btoa(JSON.stringify({ aal }))}.s`;
const state = {};
const reset = () => Object.assign(state, { rate: {}, rateError: false, rpc: [], inserts: [], signedError: false, existing: null, insertError: null, isAdmin: false, users: {}, createUserCalled: false, partners: [] });

class Query {
  constructor(table) { this.table = table; }
  select() { return this; }
  eq() { return this; }
  order() { return this; }
  limit() { return this; }
  maybeSingle() { this.single = true; return this; }
  insert(value) { this.value = value; state.inserts.push({ table: this.table, value }); return this; }
  then(resolve, reject) {
    let result = { data: this.table === 'partner_profiles' ? state.partners : [], error: null };
    if (this.value) result = { data: null, error: state.insertError };
    else if (this.single && this.table === 'partner_profiles') result = { data: state.existing, error: null };
    else if (this.single && this.table === 'admins') result = { data: state.isAdmin ? { id: 1 } : null, error: null };
    return Promise.resolve(result).then(resolve, reject);
  }
}
const client = {
  from: table => new Query(table),
  rpc: async (name, body) => {
    state.rpc.push({ name, body });
    if (state.rateError) return { data: null, error: { message: 'down' } };
    const scope = body.p_key.split(':')[0];
    return { data: state.rate[scope] !== false, error: null };
  },
  storage: { from: bucket => ({ createSignedUploadUrl: async path => state.signedError ? { data: null, error: {} } : { data: { path: `${bucket === 'receitas-privadas' ? '' : 'errado/'}${path}`, token: 'token-de-envio' }, error: null } }) },
  auth: {
    getUser: async jwt => state.users[jwt] ? { data: { user: state.users[jwt] }, error: null } : { data: { user: null }, error: { message: 'invalid' } },
    admin: { createUser: async () => { state.createUserCalled = true; return { data: { user: { id: 'x' } }, error: null }; } },
  },
};

async function loadHandler(name) {
  let handler;
  const context = createContext({ Number, Array, Set, Math, Date, String, btoa, atob, crypto: webcrypto, TextEncoder, Uint8Array, URL, Request, Response, console, Deno: { env: { get: key => key === 'SITE_URL' ? site : 'https://project.supabase.co' }, serve: fn => { handler = fn; } } });
  const read = path => new SourceTextModule(stripTypeScriptTypes(readFileSync(path, 'utf8')), { context });
  const security = read('supabase/functions/_shared/counter-security.ts');
  const http = read('supabase/functions/_shared/http.ts');
  const supabase = new SyntheticModule(['createClient'], function () { this.setExport('createClient', () => client); }, { context });
  const main = read(`supabase/functions/${name}/index.ts`);
  await main.link(specifier => specifier.includes('supabase-js') ? supabase : specifier.includes('counter-security') ? security : http);
  await main.evaluate();
  return async (body, headers = {}, origin = site) => {
    const response = await handler(new Request(`https://project.supabase.co/functions/v1/${name}`, { method: 'POST', headers: { origin, 'content-type': 'application/json', 'cf-connecting-ip': '203.0.113.9', ...headers }, body: typeof body === 'string' ? body : JSON.stringify(body) }));
    return { status: response.status, data: await response.json() };
  };
}

// Envio público de receitas: limites no servidor e validação dos caminhos.
const intake = await loadHandler('receita-intake');
reset();
assert.equal((await intake({ action: 'prepare', extensions: ['pdf'] }, {}, 'https://attacker.example')).status, 403);
assert.equal((await intake('nao-e-json')).status, 400);
for (const extensions of [[], ['exe'], ['html'], Array(16).fill('pdf')]) assert.equal((await intake({ action: 'prepare', extensions })).status, 400);
reset();
const prepared = await intake({ action: 'prepare', extensions: ['pdf', 'JPG'] });
assert.equal(prepared.status, 200);
assert.equal(prepared.data.uploads.length, 2);
assert.match(prepared.data.uploads[0].path, /^intake\/[0-9a-f-]{36}\.pdf$/);
assert.match(prepared.data.uploads[1].path, /\.jpg$/);
assert.equal(prepared.data.uploads[0].contentType, 'application/pdf');
assert.equal(state.rpc[1].body.p_amount, 2, 'o limite do dia conta cada arquivo');
assert.equal(state.rpc.some(call => call.body.p_key.includes('203.0.113.9')), false, 'o endereço não é gravado em texto puro');
reset(); state.rate['receita-envio-ip'] = false;
assert.equal((await intake({ action: 'prepare', extensions: ['pdf'] })).status, 429);
assert.equal(state.rpc.length, 1, 'quem passou do limite não gasta o limite geral');
reset(); state.rate['receita-arquivos-dia'] = false;
assert.equal((await intake({ action: 'prepare', extensions: ['pdf'] })).status, 429);
reset(); state.rateError = true;
assert.equal((await intake({ action: 'prepare', extensions: ['pdf'] })).status, 503, 'sem limite disponível, não libera envio');
reset(); state.signedError = true;
assert.equal((await intake({ action: 'prepare', extensions: ['pdf'] })).status, 503);

const validPath = 'intake/11111111-1111-4111-8111-111111111111.pdf';
const submission = { action: 'submit', name: 'Pessoa Teste', phone: '(22) 99999-0000', notes: '', paths: [validPath] };
reset();
for (const invalid of [{ name: 'Oi' }, { phone: '123' }, { paths: ['../admins.pdf'] }, { paths: ['legacy/1.pdf'] }, { paths: ['intake/x.exe'] }, { paths: [], notes: '' }, { paths: Array(16).fill(0).map((_, index) => `intake/11111111-1111-4111-8111-1111111111${String(index).padStart(2, '0')}.pdf`) }]) {
  assert.equal((await intake({ ...submission, ...invalid })).status, 400, JSON.stringify(invalid).slice(0, 60));
}
assert.equal(state.inserts.length, 0);
assert.equal((await intake(submission)).status, 201);
assert.equal(state.inserts[0].table, 'solicitacoes');
assert.equal(state.inserts[0].value.arquivo_url, JSON.stringify([validPath]));
assert.equal('status' in state.inserts[0].value, false, 'o visitante não define o status');
reset();
assert.equal((await intake({ ...submission, paths: [], notes: 'Sem arquivo, só a descrição.' })).status, 201);
reset(); state.rate['receita-pedido-ip'] = false;
assert.equal((await intake(submission)).status, 429);
assert.equal(state.inserts.length, 0);

// Parceria: só com conta confirmada; a função não cria contas.
const register = await loadHandler('partner-register');
const partner = { fullName: 'Pessoa Teste', phone: '22999990000', document: '12345678901', pixKey: 'chave', email: 'outra-pessoa@example.invalid', password: 'senha-qualquer-1' };
const confirmed = { id: '11111111-1111-4111-8111-111111111111', email: 'Conta@Example.invalid', email_confirmed_at: '2026-01-01' };
reset();
assert.equal((await register(partner)).status, 401);
state.users.nova = { ...confirmed, email_confirmed_at: null };
assert.equal((await register(partner, { authorization: 'Bearer nova' })).status, 401, 'e-mail sem confirmar não solicita parceria');
state.users.conta = confirmed;
const auth = { authorization: 'Bearer conta' };
assert.equal((await register({ ...partner, pixKey: '' }, auth)).status, 400);
assert.equal((await register({ ...partner, requestedCouponCode: 'a b' }, auth)).status, 400);
assert.equal((await register(partner, auth)).status, 201);
assert.equal(state.inserts[0].value.email, 'conta@example.invalid', 'o e-mail vem da conta, nunca do formulário');
assert.equal(state.inserts[0].value.id, confirmed.id);
assert.equal(state.inserts[0].value.status, 'pending');
assert.equal(state.createUserCalled, false, 'a função não cria contas');
state.existing = { id: confirmed.id };
assert.equal((await register(partner, auth)).status, 409);

// Painel de parceiros: a visão de administrador exige as duas etapas.
const portal = await loadHandler('partner-portal');
reset();
const admin = { id: '22222222-2222-4222-8222-222222222222', email: 'admin@example.invalid', email_confirmed_at: '2026-01-01' };
state.users[jwtWith('aal1')] = admin;
state.users[jwtWith('aal2')] = admin;
assert.equal((await portal({}, { authorization: `Bearer ${jwtWith('aal1')}` })).data.state, 'not_partner');
state.isAdmin = true;
assert.equal((await portal({}, { authorization: `Bearer ${jwtWith('aal1')}` })).data.state, 'mfa_required');
assert.equal((await portal({}, { authorization: `Bearer ${jwtWith('aal2')}` })).data.state, 'admin');

// Conferências nos arquivos.
const csp = JSON.parse(readFileSync('vercel.json', 'utf8')).headers[0].headers.find(header => header.key === 'Content-Security-Policy')?.value || '';
assert.match(csp, /script-src 'self';/, 'script-src sem unsafe-inline');
assert.match(csp, /frame-ancestors 'none'/);
assert.match(csp, /object-src 'none'/);
const receita = readFileSync('src/pages/ReceitaPage.jsx', 'utf8');
assert.doesNotMatch(receita, /from\('solicitacoes'\)|\.upload\(/, 'o site não grava mais direto');
const migrations = readdirSync('supabase/migrations');
const read = name => readFileSync(`supabase/migrations/${migrations.find(file => file.endsWith(name))}`, 'utf8');
assert.match(read('_seguranca_limites_e_registro.sql'), /revoke all on function public\.take_rate_limit\(text, integer, integer, integer\) from public, anon, authenticated/);
assert.match(read('_seguranca_limites_e_registro.sql'), /revoke all on public\.admin_audit_log from public, anon, authenticated/);
const lockdown = read('_seguranca_fechar_acessos.sql');
assert.match(lockdown, /drop policy if exists "Public can upload private prescription files" on storage\.objects/);
assert.match(lockdown, /revoke insert on public\.solicitacoes from anon, authenticated/);
assert.match(lockdown, /revoke truncate, references, trigger on public\.orders, public\.order_items from authenticated/);
assert.match(lockdown, /grant select \(id, frete, updated_at\) on public\.loja_config/);
assert.match(readFileSync('supabase/functions/admin-login/index.ts', 'utf8'), /account\.aal !== 'aal2'/);

console.log('Security checks passed: prescription intake limits and path validation, partner requests only from confirmed accounts, second factor for admin views, CSP and access lockdown. No real data touched.');
