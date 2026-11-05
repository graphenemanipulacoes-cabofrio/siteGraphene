// Conta da área de clientes com dados fictícios. Nenhum dado real é usado e nada vai ao banco.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
import { customerWhatsAppUrl, customersCsv, exportableCustomers, matchesCustomer, phoneLabel, sortCustomers } from '../src/utils/customerInsights.js';

const source = stripTypeScriptTypes(readFileSync('supabase/functions/_shared/customer-insights.ts', 'utf8'));
const { buildCustomerReport, contactReasons, customerKeyPattern, customerSegment, normalizePhone, purchaseStats } = await import(`data:text/javascript,${encodeURIComponent(source)}`);

const today = '2026-11-05';
const ids = { ana: '11111111-1111-4111-8111-111111111111', bia: '22222222-2222-4222-8222-222222222222', caio: '33333333-3333-4333-8333-333333333333', dani: '44444444-4444-4444-8444-444444444444', equipe: '55555555-5555-4555-8555-555555555555', parceira: '66666666-6666-4666-8666-666666666666' };
const near = (actual, expected, label) => assert.ok(Math.abs(actual - expected) < 0.01, `${label}: ${actual} em vez de ${expected}`);
const paid = (customer_id, day, subtotal, over = {}) => ({
    id: crypto.randomUUID(), customer_id, created_at: `${day}T13:00:00Z`, paid_at: `${day}T13:05:00Z`, subtotal, discount_amount: 0, shipping_amount: 20, status: 'paid', payment_status: 'paid', payment_method: 'bank_transfer',
    shipping_address: { name: 'Nome do pedido', phone: '(22) 90000-0001', city: 'Cabo Frio', state: 'RJ', neighborhood: 'Centro', address: 'Rua secreta', number: '999' }, order_items: [{ product_name: 'Produto A', quantity: 1 }],
    discount_code: null, attributed_recipient_id: null, customer_document: '00000000000', payment_details: { secreto: 'cartao' }, ...over,
});

// Telefone e chave.
assert.equal(normalizePhone('+55 (22) 99936-1256'), '22999361256');
assert.equal(normalizePhone('(22) 2643-0000'), '2226430000');
assert.equal(normalizePhone('123'), '');
assert.equal(customerKeyPattern.test(ids.ana), true);
assert.equal(customerKeyPattern.test('tel:22999361256'), true);
assert.equal(customerKeyPattern.test("tel:1'; drop table"), false);
assert.equal(phoneLabel('22999361256'), '(22) 99936-1256');
assert.equal(phoneLabel('2226430000'), '(22) 2643-0000');

// Frequência: só pedido pago e não cancelado, sem frete, dias distintos.
const stats = purchaseStats([
    paid(ids.ana, '2026-08-01', 100, { discount_amount: 10 }), paid(ids.ana, '2026-09-01', 200), paid(ids.ana, '2026-09-01', 50), paid(ids.ana, '2026-10-02', 100),
    paid(ids.ana, '2026-10-20', 999, { status: 'cancelled' }), paid(ids.ana, '2026-10-21', 999, { payment_status: 'refunded' }), paid(ids.ana, '2026-10-22', 999, { payment_status: 'pending', paid_at: null }),
], today);
assert.equal(stats.purchases, 4);
near(stats.sales, 440, 'total sem frete');
near(stats.avgTicket, 110, 'ticket médio');
assert.equal(stats.avgInterval, 31);
assert.equal(stats.firstPurchase, '2026-08-01');
assert.equal(stats.lastPurchase, '2026-10-02');
assert.equal(stats.daysSinceLast, 34);
assert.equal(stats.nextExpected, '2026-11-02');
assert.equal(purchaseStats([], today).avgInterval, null);
assert.equal(purchaseStats([paid(ids.ana, '2026-11-01', 10)], today).nextExpected, null);
// Pagamento às 23h em Brasília continua no mesmo dia.
assert.equal(purchaseStats([paid(ids.ana, '2026-11-01', 10, { paid_at: '2026-11-02T02:00:00Z' })], today).lastPurchase, '2026-11-01');

// Situação.
const segment = over => customerSegment({ purchases: 1, daysSinceLast: 10, avgInterval: null, hasAccount: true, pendingOrders: 0, cartItems: 0, ...over });
assert.equal(segment({}), 'new');
assert.equal(segment({ daysSinceLast: 61 }), 'at_risk');
assert.equal(segment({ daysSinceLast: 181 }), 'inactive');
assert.equal(segment({ purchases: 2, avgInterval: 30, daysSinceLast: 30 }), 'recurring');
assert.equal(segment({ purchases: 5, avgInterval: 30, daysSinceLast: 40 }), 'frequent');
assert.equal(segment({ purchases: 5, avgInterval: 30, daysSinceLast: 46 }), 'at_risk');
assert.equal(segment({ purchases: 3, avgInterval: 120, daysSinceLast: 200 }), 'at_risk');
assert.equal(segment({ purchases: 0, daysSinceLast: null }), 'no_purchase');
assert.equal(segment({ purchases: 0, daysSinceLast: null, cartItems: 2 }), 'interested');
assert.equal(segment({ purchases: 0, daysSinceLast: null, pendingOrders: 1 }), 'interested');
assert.equal(segment({ purchases: 0, daysSinceLast: null, hasAccount: false }), 'quote_only');

// Motivos de contato.
const reasons = over => contactReasons({ today, segment: 'new', preference: 'unknown', nextContactOn: null, lastContact: null, nextExpected: null, deliveredDay: null, pendingDay: null, lastPurchase: null, cartItems: 0, cartDay: null, quoteDay: null, ...over });
assert.deepEqual(reasons({}), []);
assert.deepEqual(reasons({ nextContactOn: '2026-11-05' }), ['scheduled']);
assert.deepEqual(reasons({ nextContactOn: '2026-11-06' }), []);
assert.deepEqual(reasons({ deliveredDay: '2026-11-01' }), ['after_delivery']);
assert.deepEqual(reasons({ deliveredDay: '2026-11-04' }), []);
assert.deepEqual(reasons({ deliveredDay: '2026-10-01' }), []);
assert.deepEqual(reasons({ segment: 'at_risk' }), ['at_risk']);
assert.deepEqual(reasons({ nextExpected: '2026-11-10' }), ['reorder']);
assert.deepEqual(reasons({ nextExpected: '2026-11-20' }), []);
assert.deepEqual(reasons({ pendingDay: '2026-11-03' }), ['pending_payment']);
assert.deepEqual(reasons({ pendingDay: '2026-11-03', lastPurchase: '2026-11-04' }), [], 'pagou depois de deixar um pendente');
assert.deepEqual(reasons({ cartItems: 2, cartDay: '2026-11-01' }), ['cart']);
assert.deepEqual(reasons({ quoteDay: '2026-11-01' }), ['quote']);
assert.deepEqual(reasons({ preference: 'refused', nextContactOn: today, segment: 'at_risk' }), [], 'quem recusou contato nunca entra');
assert.deepEqual(reasons({ lastContact: '2026-11-01', segment: 'at_risk' }), [], 'contato recente pausa os lembretes');
assert.deepEqual(reasons({ lastContact: '2026-11-01', nextContactOn: today, segment: 'at_risk' }), ['scheduled'], 'retorno marcado continua valendo');

// Relatório completo.
const report = buildCustomerReport({
    today,
    users: [
        { id: ids.ana, email: 'Ana@Example.invalid', created_at: '2026-07-01T12:00:00Z', last_sign_in_at: '2026-10-30T12:00:00Z', app_metadata: { providers: ['google'] }, user_metadata: { full_name: 'Ana Fictícia' } },
        { id: ids.bia, email: 'bia@example.invalid', created_at: '2026-10-01T12:00:00Z', app_metadata: { providers: ['email'] }, user_metadata: {} },
        { id: ids.caio, email: 'caio@example.invalid', created_at: '2026-10-20T12:00:00Z', app_metadata: { providers: ['email'] }, user_metadata: { name: 'Caio Fictício' } },
        { id: ids.dani, email: 'dani@example.invalid', created_at: '2026-10-25T12:00:00Z', user_metadata: { full_name: 'Dani Fictícia' } },
        { id: ids.equipe, email: 'equipe@example.invalid', created_at: '2026-01-01T12:00:00Z', user_metadata: { full_name: 'Equipe Fictícia' } },
        { id: ids.parceira, email: 'parceira@example.invalid', created_at: '2026-09-01T12:00:00Z', user_metadata: { full_name: 'Parceira Fictícia' } },
    ],
    profiles: [{ id: ids.bia, full_name: 'Bia Fictícia', phone: '22 90000-0002' }],
    orders: [
        paid(ids.ana, '2026-08-01', 100, { discount_code: 'FICTICIO', attributed_recipient_id: 'r1', discount_amount: 10 }), paid(ids.ana, '2026-09-01', 200), paid(ids.ana, '2026-10-01', 100, { delivered_at: '2026-10-05T12:00:00Z', order_items: [{ product_name: 'Produto A', quantity: 2 }, { product_name: 'Produto B', quantity: 1 }] }),
        paid(ids.bia, '2026-10-30', 300, { status: 'processing', shipping_address: { phone: '22 90000-0002', city: 'Búzios', state: 'RJ' } }),
        paid(ids.caio, '2026-11-03', 150, { status: 'awaiting_payment', payment_status: 'pending', paid_at: null, shipping_address: { name: 'Caio do Pedido', phone: '22900000003' } }),
        paid(ids.equipe, '2026-11-01', 5000, { shipping_address: {} }),
        paid(ids.parceira, '2026-11-01', 80, { shipping_address: { phone: '22900000006' } }),
    ],
    carts: [{ customer_id: ids.dani, updated_at: '2026-11-02T12:00:00Z', items: [{ name: 'Produto C', price: 50, quantity: 2, image_url: 'https://example.invalid/foto.png' }] }, { customer_id: ids.equipe, updated_at: '2026-11-02T12:00:00Z', items: [] }],
    quotes: [
        { id: 1, created_at: '2026-11-01T12:00:00Z', nome_cliente: 'Eva Fictícia', whatsapp: '(22) 90000-0009', arquivo_url: 'receitas/segredo.pdf', observacoes: 'dado de saude secreto' },
        { id: 2, created_at: '2026-10-01T12:00:00Z', nome_cliente: 'Eva', whatsapp: '5522900000009' },
        { id: 3, created_at: '2026-10-20T12:00:00Z', nome_cliente: 'Bia', whatsapp: '22900000002' },
        { id: 4, created_at: '2026-10-20T12:00:00Z', nome_cliente: 'Sem telefone', whatsapp: 'x' },
    ],
    followups: [{ customer_key: ids.bia, contact_preference: 'refused', next_contact_on: null }, { customer_key: 'tel:22900000009', contact_preference: 'allowed', next_contact_on: '2026-11-04' }],
    notes: [{ id: 'n1', customer_key: ids.ana, kind: 'note', note: 'Prefere de manhã', created_by: 'admin', created_at: '2026-10-10T12:00:00Z' }, { id: 'n2', customer_key: ids.ana, kind: 'contact', note: 'Falamos', created_by: 'admin', created_at: '2026-10-20T12:00:00Z' }],
    staffEmails: ['EQUIPE@example.invalid'],
    partnerIds: [ids.parceira],
    recipients: [{ id: 'r1', name: 'Parceira Fictícia' }],
});
const byKey = key => report.customers.find(customer => customer.key === key);
const ana = byKey(ids.ana);
assert.equal(ana.name, 'Ana Fictícia');
assert.equal(ana.email, 'ana@example.invalid');
assert.equal(ana.phone, '22900000001');
assert.equal(ana.city, 'Cabo Frio');
assert.equal(ana.purchases, 3);
near(ana.sales, 390, 'total da cliente');
assert.equal(ana.avgInterval, 31);
assert.equal(ana.segment, 'frequent');
assert.deepEqual(ana.reasons, ['reorder'], 'compra a cada 31 dias e a última foi há 35');
assert.deepEqual(ana.origin, { code: 'FICTICIO', recipient: 'Parceira Fictícia' });
assert.equal(ana.paymentMethod, 'bank_transfer');
assert.deepEqual(ana.products[0], { name: 'Produto A', quantity: 4, times: 3, lastDay: '2026-10-01' });
assert.equal(ana.products[1].name, 'Produto B');
assert.equal(ana.notes[0].kind, 'contact', 'anotação mais nova primeiro');
assert.equal(ana.lastContact, '2026-10-20');
const bia = byKey(ids.bia);
assert.equal(bia.name, 'Bia Fictícia');
assert.equal(bia.quotes.count, 1, 'orçamento entra na conta com o mesmo telefone');
assert.equal(bia.preference, 'refused');
assert.deepEqual(bia.reasons, []);
const caio = byKey(ids.caio);
assert.equal(caio.name, 'Caio Fictício');
assert.equal(caio.segment, 'interested');
assert.deepEqual(caio.reasons, ['pending_payment']);
const dani = byKey(ids.dani);
assert.deepEqual(dani.cart.names, ['Produto C']);
assert.equal(dani.cart.value, 100);
assert.equal(dani.segment, 'interested');
assert.deepEqual(dani.reasons, ['cart']);
const eva = byKey('tel:22900000009');
assert.equal(eva.name, 'Eva Fictícia');
assert.equal(eva.kind, 'quote');
assert.equal(eva.segment, 'quote_only');
assert.equal(eva.quotes.count, 2);
assert.deepEqual(eva.reasons, ['scheduled', 'quote']);
assert.equal(byKey(ids.equipe).role, 'staff');
assert.equal(byKey(ids.parceira).role, 'partner');
assert.equal(report.customers.some(customer => customer.name === 'Sem telefone'), false, 'orçamento sem telefone não dá para contatar');

// Totais sem a equipe.
assert.equal(report.summary.buyers, 3);
assert.equal(report.summary.repeatBuyers, 1);
assert.equal(report.summary.repeatRate, 33);
assert.equal(report.summary.purchases, 5);
near(report.summary.sales, 770, 'vendas sem a equipe');
near(report.summary.avgTicket, 154, 'ticket médio geral');
assert.equal(report.summary.openCarts, 1);
assert.equal(report.summary.openCartsValue, 100);
assert.equal(report.summary.people, 6);
assert.equal(report.topProducts[0].name, 'Produto A');
assert.equal(report.topProducts[0].customers, 3);
assert.equal(report.topProducts[0].repeatCustomers, 1);
assert.equal(report.cities[0].customers, 1);
assert.equal(report.segments.frequent, 1);
assert.equal(report.segments.quote_only, 1);

// O que nunca pode sair no relatório.
const payload = JSON.stringify(report);
for (const secret of ['00000000000', 'Rua secreta', '"number"', 'cartao', 'segredo.pdf', 'saude secreto', 'foto.png', 'payment_details', 'customer_document', 'arquivo_url', 'observacoes']) assert.equal(payload.includes(secret), false, `vazou: ${secret}`);

// Contato: a mensagem pronta não cita produto, e quem recusou não tem link.
const link = customerWhatsAppUrl(ana);
assert.equal(link.startsWith('https://wa.me/5522900000001?text='), true);
assert.equal(decodeURIComponent(link).includes('Produto'), false);
assert.equal(decodeURIComponent(link).includes('Olá, Ana!'), true);
assert.equal(customerWhatsAppUrl(bia), null);
assert.equal(customerWhatsAppUrl({ ...ana, phone: '' }), null);

// Busca e ordem.
assert.equal(matchesCustomer(ana, 'produto b'), true);
assert.equal(matchesCustomer(ana, 'ficticio'), true);
assert.equal(matchesCustomer(ana, '90000-0001'), true);
assert.equal(matchesCustomer(ana, 'outra coisa'), false);
assert.equal(sortCustomers(report.customers, 'value')[0].role, 'staff');
assert.equal(sortCustomers(report.customers, 'away').find(customer => customer.key === ids.ana) !== undefined, true);

// Planilha: sem quem recusou contato, sem produtos, sem anotações e sem fórmula.
assert.equal(exportableCustomers([ana, bia]).length, 1);
const csv = customersCsv([ana, bia, { ...caio, name: '=HYPERLINK("x")' }]);
assert.equal(csv.includes('Bia'), false);
assert.equal(csv.includes('Produto A'), false);
assert.equal(csv.includes('Prefere de manhã'), false);
assert.equal(csv.includes(`"'=HYPERLINK(""x"")"`), true);
assert.equal(csv.startsWith('﻿'), true);

console.log('Customer checks passed: real purchases only, no shipping, buying frequency, status, contact reasons, opt-out, staff outside the totals, no CPF, street, payment or prescription data, and a safe spreadsheet. Synthetic data only.');
