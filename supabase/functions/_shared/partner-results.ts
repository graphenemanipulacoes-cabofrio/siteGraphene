// Conta do resultado das parcerias. Só recebe dados e devolve números, para poder ser testada sem banco.
type Row = Record<string, unknown>;
const toNumber = (value: unknown) => { const number = Number(value); return Number.isFinite(number) ? number : 0; };
const cents = (value: number) => Math.round(value * 100) / 100;

export type CostSettings = { default_cost_percent: unknown; packaging_percent: unknown; tax_percent: unknown; payment_percent: unknown };

export const emptyTotals = () => ({ orders: 0, sales: 0, commission: 0, otherCommission: 0, productCost: 0, packaging: 0, tax: 0, fee: 0, contribution: 0, ownPurchases: 0 });
export type Totals = ReturnType<typeof emptyTotals>;

// Resultado de um pedido pago: o que sobra para a Graphène depois de produto, impostos, taxa real e comissões.
export function orderResult(order: Row, recipientId: string | null, costs: Map<number, number>, settings: CostSettings) {
  const subtotal = toNumber(order.subtotal);
  const sales = Math.max(subtotal - toNumber(order.discount_amount), 0);
  const items = Array.isArray(order.order_items) ? order.order_items as Row[] : [];
  const defaultCost = toNumber(settings.default_cost_percent);
  const productCost = items.reduce((sum, item) => {
    const percent = costs.get(Number(item.product_id)) ?? defaultCost;
    return sum + toNumber(item.unit_price) * toNumber(item.quantity) * percent / 100;
  }, 0);
  const packaging = subtotal * toNumber(settings.packaging_percent) / 100;
  const tax = sales * toNumber(settings.tax_percent) / 100;
  // A taxa do Mercado Pago é a real; sem ela, usa o percentual informado nos custos.
  const fee = order.provider_fee === null || order.provider_fee === undefined
    ? toNumber(order.total) * toNumber(settings.payment_percent) / 100
    : toNumber(order.provider_fee);
  const commissions = (Array.isArray(order.commissions) ? order.commissions as Row[] : []).filter(item => item.status !== 'cancelled');
  const commission = commissions.filter(item => item.recipient_id === recipientId).reduce((sum, item) => sum + toNumber(item.amount), 0);
  const otherCommission = commissions.filter(item => item.recipient_id !== recipientId).reduce((sum, item) => sum + toNumber(item.amount), 0);
  return { sales, commission, otherCommission, productCost, packaging, tax, fee, contribution: sales - productCost - packaging - tax - fee - commission - otherCommission };
}

export function addOrder(totals: Totals, result: ReturnType<typeof orderResult>) {
  totals.orders += 1;
  totals.sales += result.sales;
  totals.commission += result.commission;
  totals.otherCommission += result.otherCommission;
  totals.productCost += result.productCost;
  totals.packaging += result.packaging;
  totals.tax += result.tax;
  totals.fee += result.fee;
  totals.contribution += result.contribution;
  return totals;
}

// Fração de cada real vendido que sobra para a Graphène, usada para calcular o ponto de equilíbrio.
export function contributionRate(settings: CostSettings, commissionPercent: number, otherPercent: number, couponDiscountPercent: number) {
  const discount = Math.min(Math.max(couponDiscountPercent, 0), 99) / 100;
  const costOnPaid = (toNumber(settings.default_cost_percent) + toNumber(settings.packaging_percent)) / 100 / (1 - discount);
  return 1 - costOnPaid - (toNumber(settings.tax_percent) + toNumber(settings.payment_percent) + commissionPercent + otherPercent) / 100;
}

// Custo de um vale para a Graphène: o produto que sai, não o valor de venda.
export const valeCost = (value: number, settings: CostSettings) => value * (toNumber(settings.default_cost_percent) + toNumber(settings.packaging_percent)) / 100;

// Venda mínima para pagar o vale, arredondada para cima de R$ 10 em R$ 10.
export function breakEven(vale: number, settings: CostSettings, rate: number) {
  if (vale <= 0) return 0;
  if (rate <= 0) return null;
  return Math.ceil(valeCost(vale, settings) / rate / 10) * 10;
}

export const monthKey = (date: Date | string) => {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit' }).format(new Date(date));
  return parts.slice(0, 7);
};
export const previousMonths = (month: string, count: number) => {
  const [year, number] = month.split('-').map(Number);
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(Date.UTC(year, number - 2 - index, 1));
    return date.toISOString().slice(0, 7);
  });
};
export const monthBounds = (month: string) => {
  const [year, number] = month.split('-').map(Number);
  const next = new Date(Date.UTC(year, number, 1)).toISOString().slice(0, 7);
  return { from: `${month}-01T00:00:00-03:00`, to: `${next}-01T00:00:00-03:00` };
};

type Terms = { test_start: string; test_days: number; monthly_minimum: unknown; monthly_goal: unknown; monthly_vale: unknown; reels_per_month: unknown; stories_per_month: unknown; phase: string };

// Situação da parceria. A decisão final é sempre de uma pessoa: aqui só existe sugestão.
export function partnerStatus(terms: Terms | null, input: { today: string; salesSinceStart: number; monthlySales: Record<string, number>; currentMonth: string }) {
  if (!terms) return { code: 'no_terms', suggestion: null, day: null, daysLeft: null, testEnd: null, targetTotal: null };
  const minimum = toNumber(terms.monthly_minimum);
  const start = Date.parse(`${terms.test_start}T00:00:00Z`);
  const today = Date.parse(`${input.today}T00:00:00Z`);
  const day = Math.max(Math.floor((today - start) / 86_400_000) + 1, 0);
  const testDays = toNumber(terms.test_days) || 90;
  const testEnd = new Date(start + (testDays - 1) * 86_400_000).toISOString().slice(0, 10);
  const daysLeft = Math.max(testDays - day + 1, 0);
  const targetTotal = cents(minimum * testDays / 30);
  const base = { day, daysLeft, testEnd, targetTotal };
  if (terms.phase === 'ended') return { ...base, code: 'ended', suggestion: null };
  if (terms.phase === 'commission_only') return { ...base, code: 'commission_only', suggestion: null };
  if (terms.phase === 'test') {
    if (day < 1) return { ...base, code: 'scheduled', suggestion: null };
    if (day >= testDays) {
      if (input.salesSinceStart >= targetTotal) return { ...base, code: 'review', suggestion: 'renew' };
      if (input.salesSinceStart >= targetTotal / 2) return { ...base, code: 'review', suggestion: 'half_vale' };
      return { ...base, code: 'review', suggestion: 'commission_only' };
    }
    if (day >= Math.round(testDays * 2 / 3) && input.salesSinceStart < minimum) return { ...base, code: 'attention', suggestion: 'talk' };
    if (day <= 30) return { ...base, code: 'learning', suggestion: null };
    return { ...base, code: 'on_track', suggestion: null };
  }
  // Depois do teste: média dos 3 últimos meses fechados. Olhar o mês anterior separa a atenção da revisão.
  const months = previousMonths(input.currentMonth, 4);
  const average = (list: string[]) => list.reduce((sum, month) => sum + (input.monthlySales[month] || 0), 0) / list.length;
  const now = average(months.slice(0, 3));
  const before = average(months.slice(1, 4));
  if (minimum > 0 && now < minimum && before < minimum) return { ...base, code: 'review', suggestion: 'commission_only' };
  if (minimum > 0 && now < minimum) return { ...base, code: 'attention', suggestion: 'talk' };
  return { ...base, code: 'on_track', suggestion: null };
}

export const roundTotals = (totals: Totals) => Object.fromEntries(Object.entries(totals).map(([key, value]) => [key, cents(value)])) as Totals;

export const todayInBrazil = (now = new Date()) => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
const dayKey = (value: unknown) => todayInBrazil(new Date(String(value)));
const lower = (value: unknown) => String(value ?? '').trim().toLowerCase();

// Compra feita pela própria parceira não conta como venda dela.
export const isOwnPurchase = (order: Row, profile: Row | null | undefined) => Boolean(profile && (
  (profile.id && order.customer_id === profile.id) || (profile.email && lower(order.customer_email) === lower(profile.email))
));

// Vendas válidas de uma parceira: as do mês, as desde o início do teste e o histórico mês a mês.
export function partnerSales(orders: Row[], profile: Row | null | undefined, month: string, testStart: string | null) {
  const summary = { monthSales: 0, sinceStart: 0, monthlySales: {} as Record<string, number> };
  for (const order of orders) {
    if (order.payment_status !== 'paid' || isOwnPurchase(order, profile)) continue;
    const paidAt = order.paid_at || order.created_at;
    const sales = Math.max(toNumber(order.subtotal) - toNumber(order.discount_amount), 0);
    const key = monthKey(String(paidAt));
    summary.monthlySales[key] = (summary.monthlySales[key] || 0) + sales;
    if (key === month) summary.monthSales += sales;
    if (testStart && dayKey(paidAt) >= testStart) summary.sinceStart += sales;
  }
  return summary;
}

type ReportInput = {
  month: string; today: string; settings: Row; recipients: Row[]; terms: Row[]; profiles: Row[]; coupons: Row[];
  productCosts: Row[]; products: Row[]; orders: Row[]; credits: Row[]; deliveries: Row[];
};

// Monta o relatório do admin: quanto cada parceira vendeu, recebeu e deixou de resultado.
export function buildPartnerReport(input: ReportInput) {
  const settings = input.settings as unknown as CostSettings & Row;
  const costs = new Map(input.productCosts.map(row => [Number(row.product_id), toNumber(row.cost_percent)]));
  const allPaid = input.recipients.filter(item => item.attribution_scope === 'all_paid_orders');
  const otherPercent = allPaid.filter(item => item.is_active && item.commission_type === 'percentage').reduce((sum, item) => sum + toNumber(item.commission_value), 0);
  const previous = previousMonths(input.month, 1)[0];

  const partners = input.recipients.filter(item => item.attribution_scope === 'coupon').map(recipient => {
    const id = String(recipient.id);
    const terms = (input.terms.find(item => item.recipient_id === id) || null) as unknown as Terms | null;
    const profile = input.profiles.find(item => item.commission_recipient_id === id) || null;
    const coupon = input.coupons.find(item => item.recipient_id === id && item.is_active) || input.coupons.find(item => item.recipient_id === id) || null;
    const testStart = terms?.test_start || null;
    const month = emptyTotals();
    const sinceStart = emptyTotals();
    const allTime = emptyTotals();
    for (const order of input.orders.filter(item => item.attributed_recipient_id === id)) {
      const paidAt = String(order.paid_at || order.created_at);
      const inMonth = monthKey(paidAt) === input.month;
      if (isOwnPurchase(order, profile)) { if (inMonth) month.ownPurchases += 1; continue; }
      const result = orderResult(order, id, costs, settings);
      addOrder(allTime, result);
      if (inMonth) addOrder(month, result);
      if (testStart && dayKey(paidAt) >= testStart) addOrder(sinceStart, result);
    }
    const sales = partnerSales(input.orders.filter(item => item.attributed_recipient_id === id), profile, input.month, testStart);
    const credits = profile ? input.credits.filter(item => item.partner_id === profile.id) : [];
    const sumCredits = (type: string, match: (row: Row) => boolean) => credits.filter(item => item.type === type && match(item)).reduce((sum, item) => sum + toNumber(item.amount), 0);
    const isMonth = (row: Row) => monthKey(String(row.spent_at || row.created_at)) === input.month;
    const isSince = (row: Row) => Boolean(testStart) && dayKey(row.spent_at || row.created_at) >= String(testStart);
    const vale = {
      monthGranted: cents(sumCredits('grant', isMonth)),
      monthUsed: cents(sumCredits('usage', isMonth)),
      sinceGranted: cents(sumCredits('grant', isSince)),
      totalGranted: cents(sumCredits('grant', () => true)),
      totalUsed: cents(sumCredits('usage', () => true)),
    };
    const monthValeCost = valeCost(vale.monthGranted, settings);
    const sinceValeCost = valeCost(testStart ? vale.sinceGranted : vale.totalGranted, settings);
    const commissionPercent = recipient.commission_type === 'percentage' ? toNumber(recipient.commission_value) : 0;
    const discountPercent = coupon?.discount_type === 'percentage' ? toNumber(coupon.discount_value) : 0;
    const rate = contributionRate(settings, commissionPercent, otherPercent, discountPercent);
    const expectedVale = terms ? toNumber(terms.monthly_vale) : vale.monthGranted;
    const delivery = (monthValue: string) => input.deliveries.find(item => item.recipient_id === id && String(item.month).slice(0, 7) === monthValue) || null;
    const monthDelivery = delivery(input.month);
    const previousDelivery = delivery(previous);
    const inProgram = terms && !['ended', 'commission_only'].includes(terms.phase);
    const previousInProgram = Boolean(inProgram && terms && terms.test_start.slice(0, 7) <= previous);
    const previousDelivered = !previousInProgram || (toNumber(previousDelivery?.reels) >= toNumber(terms?.reels_per_month) && toNumber(previousDelivery?.stories) >= toNumber(terms?.stories_per_month));
    const status = partnerStatus(terms, { today: input.today, salesSinceStart: sales.sinceStart, monthlySales: sales.monthlySales, currentMonth: monthKey(`${input.today}T12:00:00-03:00`) });
    return {
      recipientId: id,
      partnerId: profile?.id || null,
      name: recipient.name,
      isActive: recipient.is_active,
      commissionType: recipient.commission_type,
      commissionValue: toNumber(recipient.commission_value),
      holdDays: recipient.hold_days,
      coupon: coupon ? { code: coupon.code, discountType: coupon.discount_type, discountValue: toNumber(coupon.discount_value), isActive: coupon.is_active } : null,
      terms,
      status,
      month: { ...roundTotals(month), valeCost: cents(monthValeCost), result: cents(month.contribution - monthValeCost) },
      sinceStart: { ...roundTotals(testStart ? sinceStart : allTime), valeCost: cents(sinceValeCost), result: cents((testStart ? sinceStart : allTime).contribution - sinceValeCost) },
      vale,
      rate: Math.round(rate * 10000) / 10000,
      unitValeCost: cents(valeCost(expectedVale, settings)),
      breakEven: breakEven(expectedVale, settings, rate),
      delivery: { reels: toNumber(monthDelivery?.reels), stories: toNumber(monthDelivery?.stories), note: monthDelivery?.note || '' },
      previousDelivered,
    };
  });

  const monthOrders = input.orders.filter(order => monthKey(String(order.paid_at || order.created_at)) === input.month);
  const site = emptyTotals();
  for (const order of monthOrders) addOrder(site, orderResult(order, null, costs, settings));
  const allPaidRows = allPaid.map(recipient => {
    const amount = monthOrders.reduce((sum, order) => sum + (Array.isArray(order.commissions) ? order.commissions as Row[] : [])
      .filter(item => item.recipient_id === recipient.id && item.status !== 'cancelled').reduce((inner, item) => inner + toNumber(item.amount), 0), 0);
    return { recipientId: recipient.id, name: recipient.name, role: recipient.role, commissionValue: toNumber(recipient.commission_value), isActive: recipient.is_active, monthAmount: cents(amount) };
  });
  const noCoupon = monthOrders.filter(order => !order.attributed_recipient_id);
  const total = (field: 'sales' | 'commission' | 'valeCost' | 'result') => cents(partners.reduce((sum, item) => sum + item.month[field], 0));
  return {
    month: input.month,
    today: input.today,
    settings: { defaultCostPercent: toNumber(settings.default_cost_percent), packagingPercent: toNumber(settings.packaging_percent), taxPercent: toNumber(settings.tax_percent), paymentPercent: toNumber(settings.payment_percent), confirmedAt: settings.confirmed_at || null },
    summary: {
      sales: total('sales'), commission: total('commission'), valeCost: total('valeCost'), result: total('result'),
      siteOrders: site.orders, siteSales: cents(site.sales), siteFees: cents(site.fee),
      noCouponOrders: noCoupon.length, noCouponSales: cents(noCoupon.reduce((sum, order) => sum + Math.max(toNumber(order.subtotal) - toNumber(order.discount_amount), 0), 0)),
    },
    allPaid: allPaidRows,
    partners,
    products: input.products.map(product => ({ id: product.id, name: product.name, price: toNumber(product.price), isActive: product.is_active !== false, costPercent: costs.has(Number(product.id)) ? costs.get(Number(product.id)) : null })),
  };
}

// Dados para o painel da própria parceira. Mínimo, meta, custo, margem e lucro são internos e nunca saem daqui.
export function partnerGoal(terms: Terms | null, status: ReturnType<typeof partnerStatus>, monthSales: number, delivery: { reels?: unknown; stories?: unknown } | null) {
  if (!terms || terms.phase === 'ended') return null;
  return {
    status: status.code,
    phase: terms.phase,
    monthSales: cents(monthSales),
    daysLeft: status.daysLeft,
    testEnd: status.testEnd,
    reels: { done: toNumber(delivery?.reels), required: toNumber(terms.reels_per_month) },
    stories: { done: toNumber(delivery?.stories), required: toNumber(terms.stories_per_month) },
  };
}
