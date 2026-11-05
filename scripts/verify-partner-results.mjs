// Conta do resultado das parcerias com dados fictícios. Nenhum pedido vai ao banco.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';

const source = stripTypeScriptTypes(readFileSync('supabase/functions/_shared/partner-results.ts', 'utf8'));
const results = await import(`data:text/javascript,${encodeURIComponent(source)}`);
const { breakEven, buildPartnerReport, contributionRate, monthBounds, monthKey, orderResult, partnerGoal, partnerSales, partnerStatus, previousMonths, todayInBrazil, valeCost } = results;

const settings = { default_cost_percent: 35, packaging_percent: 3, tax_percent: 8, payment_percent: 3.5, confirmed_at: null };
const near = (actual, expected, label) => assert.ok(Math.abs(actual - expected) < 0.01, `${label}: ${actual} em vez de ${expected}`);
const r1 = '11111111-1111-4111-8111-111111111111';
const thales = '22222222-2222-4222-8222-222222222222';
const profileId = '33333333-3333-4333-8333-333333333333';
const paidOrder = (over = {}) => ({
    id: crypto.randomUUID(), customer_id: 'cliente', customer_email: 'cliente@example.invalid', subtotal: 120, discount_amount: 12, total: 128, provider_fee: 4,
    payment_status: 'paid', paid_at: '2026-11-10T15:00:00Z', created_at: '2026-11-10T14:00:00Z', attributed_recipient_id: r1,
    order_items: [{ product_id: 1, unit_price: 120, quantity: 1 }],
    commissions: [{ recipient_id: r1, amount: 10.8, status: 'pending' }, { recipient_id: thales, amount: 5.4, status: 'pending' }],
    ...over,
});

// Um pedido: o frete fica de fora e a taxa é a real.
const one = orderResult(paidOrder(), r1, new Map(), settings);
near(one.sales, 108, 'vendas sem frete');
near(one.productCost, 42, 'custo do produto');
near(one.packaging, 3.6, 'embalagem');
near(one.tax, 8.64, 'imposto');
near(one.fee, 4, 'taxa real');
near(one.commission, 10.8, 'comissão');
near(one.otherCommission, 5.4, 'comissão sobre todas as vendas');
near(one.contribution, 33.56, 'resultado do pedido');
near(orderResult(paidOrder(), r1, new Map([[1, 50]]), settings).productCost, 60, 'custo próprio do produto');
near(orderResult(paidOrder({ provider_fee: null }), r1, new Map(), settings).fee, 4.48, 'taxa estimada sem o valor real');
near(orderResult(paidOrder({ commissions: [{ recipient_id: r1, amount: 10.8, status: 'cancelled' }] }), r1, new Map(), settings).commission, 0, 'comissão cancelada não conta');

// Mesma conta da proposta: R$ 31,28 a cada R$ 100 pagos e vale de R$ 500 custando R$ 190.
const rate = contributionRate(settings, 10, 5, 10);
near(rate, 0.3128, 'margem por real vendido');
near(valeCost(500, settings), 190, 'custo do vale');
assert.equal(breakEven(500, settings, rate), 610);
assert.equal(breakEven(1000, settings, contributionRate(settings, 12, 5, 10)), 1300);
assert.equal(breakEven(0, settings, rate), 0);
assert.equal(breakEven(500, settings, -0.1), null);

// Datas no horário de Brasília.
assert.equal(monthKey('2026-12-01T02:00:00Z'), '2026-11');
assert.equal(monthKey('2026-12-01T03:30:00Z'), '2026-12');
assert.equal(todayInBrazil(new Date('2026-12-01T02:00:00Z')), '2026-11-30');
assert.deepEqual(previousMonths('2026-01', 2), ['2025-12', '2025-11']);
assert.deepEqual(monthBounds('2026-12'), { from: '2026-12-01T00:00:00-03:00', to: '2027-01-01T00:00:00-03:00' });

// Regras: primeiro mês sem corte, atenção no dia 60 e decisão no dia 90.
const terms = { test_start: '2026-08-01', test_days: 90, monthly_minimum: 600, monthly_goal: 1200, monthly_vale: 500, reels_per_month: 1, stories_per_month: 3, phase: 'test' };
const status = (today, salesSinceStart, over = {}, monthlySales = {}) => partnerStatus({ ...terms, ...over }, { today, salesSinceStart, monthlySales, currentMonth: today.slice(0, 7) });
assert.equal(status('2026-07-20', 0).code, 'scheduled');
assert.equal(status('2026-08-20', 0).code, 'learning');
assert.equal(status('2026-09-10', 0).code, 'on_track');
assert.equal(status('2026-09-29', 590).code, 'attention');
assert.equal(status('2026-09-29', 590).suggestion, 'talk');
assert.equal(status('2026-09-29', 600).code, 'on_track');
assert.equal(status('2026-10-29', 1800).suggestion, 'renew');
assert.equal(status('2026-10-29', 900).suggestion, 'half_vale');
assert.equal(status('2026-10-29', 899).suggestion, 'commission_only');
assert.equal(status('2026-10-29', 899).code, 'review');
assert.equal(status('2026-10-29', 899).daysLeft, 1);
assert.equal(status('2026-10-29', 899).testEnd, '2026-10-29');
assert.equal(status('2026-10-29', 0, { phase: 'commission_only' }).code, 'commission_only');
assert.equal(status('2026-10-29', 0, { phase: 'ended' }).code, 'ended');
assert.equal(partnerStatus(null, { today: '2026-10-29', salesSinceStart: 0, monthlySales: {}, currentMonth: '2026-10' }).code, 'no_terms');
const steady = { '2026-10': 700, '2026-09': 700, '2026-08': 700, '2026-07': 700 };
assert.equal(status('2026-11-05', 0, { phase: 'active' }, steady).code, 'on_track');
assert.equal(status('2026-11-05', 0, { phase: 'active' }, { '2026-10': 100, '2026-09': 700, '2026-08': 700, '2026-07': 2000 }).code, 'attention');
assert.equal(status('2026-11-05', 0, { phase: 'active' }, { '2026-10': 100, '2026-09': 100, '2026-08': 100, '2026-07': 100 }).code, 'review');

// Compra da própria parceira e pedido fora do período não contam como venda dela.
const profile = { id: profileId, email: 'Parceira@Example.invalid', commission_recipient_id: r1 };
const own = paidOrder({ customer_id: profileId, customer_email: 'parceira@example.invalid' });
const ownByEmail = paidOrder({ customer_email: 'PARCEIRA@example.invalid' });
const october = paidOrder({ paid_at: '2026-10-05T15:00:00Z' });
const beforeTest = paidOrder({ paid_at: '2026-07-05T15:00:00Z' });
const sales = partnerSales([paidOrder(), own, ownByEmail, october, beforeTest], profile, '2026-11', '2026-08-01');
near(sales.monthSales, 108, 'vendas do mês');
near(sales.sinceStart, 216, 'vendas desde o início');
near(sales.monthlySales['2026-07'], 108, 'histórico por mês');

// Relatório: vendas, comissão, vale, entregas e resultado de cada parceira.
const report = buildPartnerReport({
    month: '2026-11', today: '2026-11-15', settings,
    recipients: [
        { id: r1, name: 'Parceira fictícia', attribution_scope: 'coupon', commission_type: 'percentage', commission_value: 10, hold_days: 30, is_active: true, role: 'influencer' },
        { id: thales, name: 'Marketing fictício', attribution_scope: 'all_paid_orders', commission_type: 'percentage', commission_value: 5, hold_days: 30, is_active: true, role: 'marketing' },
    ],
    terms: [{ ...terms, recipient_id: r1, test_start: '2026-09-01' }],
    profiles: [profile],
    coupons: [{ recipient_id: r1, code: 'FICTICIO10', discount_type: 'percentage', discount_value: 10, is_active: true }],
    productCosts: [{ product_id: 2, cost_percent: 20 }],
    products: [{ id: 1, name: 'Produto A', price: 120, is_active: true }, { id: 2, name: 'Produto B', price: 50, is_active: false }],
    orders: [paidOrder(), own, october, paidOrder({ attributed_recipient_id: null, discount_amount: 0, total: 120, subtotal: 120, provider_fee: 3, commissions: [{ recipient_id: thales, amount: 6, status: 'pending' }] })],
    credits: [
        { partner_id: profileId, type: 'grant', amount: 500, spent_at: '2026-11-02T12:00:00Z' },
        { partner_id: profileId, type: 'usage', amount: 200, spent_at: '2026-11-03T12:00:00Z' },
        { partner_id: profileId, type: 'grant', amount: 500, spent_at: '2026-10-02T12:00:00Z' },
    ],
    deliveries: [{ recipient_id: r1, month: '2026-11-01', reels: 1, stories: 2, note: 'Fictício' }, { recipient_id: r1, month: '2026-10-01', reels: 1, stories: 1, note: '' }],
});
const [partner] = report.partners;
assert.equal(report.partners.length, 1, 'quem recebe sobre todas as vendas não aparece como parceira');
assert.equal(partner.month.orders, 1);
near(partner.month.sales, 108, 'vendas da parceira');
near(partner.month.commission, 10.8, 'comissão da parceira');
near(partner.month.otherCommission, 5.4, 'comissão de marketing');
near(partner.month.valeCost, 190, 'custo do vale do mês');
near(partner.month.result, -156.44, 'prejuízo do mês');
assert.equal(partner.month.ownPurchases, 1);
assert.equal(partner.sinceStart.orders, 2);
near(partner.sinceStart.valeCost, 380, 'custo dos vales desde o início');
near(partner.sinceStart.result, 33.56 * 2 - 380, 'resultado desde o início');
assert.equal(partner.vale.monthGranted, 500);
assert.equal(partner.vale.monthUsed, 200);
assert.equal(partner.vale.totalGranted, 1000);
assert.equal(partner.breakEven, 610);
assert.equal(partner.delivery.stories, 2);
assert.equal(partner.previousDelivered, false, 'postagens de outubro incompletas');
assert.equal(report.summary.siteOrders, 3);
near(report.summary.noCouponSales, 120, 'vendas sem cupom');
near(report.allPaid[0].monthAmount, 16.8, 'marketing sobre todas as vendas, inclusive compra própria da parceira');
assert.equal(report.products.find(item => item.id === 2).costPercent, 20);
assert.equal(report.products.find(item => item.id === 1).costPercent, null);

// O painel da parceira nunca recebe custo, margem ou lucro.
const goal = partnerGoal(terms, partner.status, 108, { reels: 1, stories: 2 });
assert.deepEqual(Object.keys(goal).sort(), ['daysLeft', 'goal', 'minimum', 'missing', 'monthSales', 'phase', 'reels', 'status', 'stories', 'testEnd']);
near(goal.missing, 492, 'quanto falta para o mínimo');
assert.equal(partnerGoal(null, partner.status, 0, null), null);
assert.equal(partnerGoal({ ...terms, phase: 'ended' }, partner.status, 0, null), null);

console.log('Partner result checks passed: real order costs, Mercado Pago fee, commissions, vouchers, own purchases, test rules, Brasília dates and a partner view with no cost data. Synthetic data only.');
