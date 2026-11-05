// Visão dos clientes para o pós-venda. Só recebe dados e devolve números, para poder ser testada sem banco.
// Nunca inclui CPF, rua e número, dados de pagamento, receitas nem observações de orçamento.
type CustomerData = Record<string, unknown>;
const asNumber = (value: unknown) => { const number = Number(value); return Number.isFinite(number) ? number : 0; };
const moneyCents = (value: number) => Math.round(value * 100) / 100;
const textOf = (value: unknown) => typeof value === 'string' ? value.trim() : '';
const brazilDay = (value: unknown) => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(String(value)));
const dayCount = (day: string) => Math.floor(Date.parse(`${day}T00:00:00Z`) / 86_400_000);
const dayAfter = (day: string, days: number) => new Date((dayCount(day) + days) * 86_400_000).toISOString().slice(0, 10);

export const customerKeyPattern = /^(?:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}|tel:\d{10,11})$/i;

// Telefone só com DDD e número, sem o 55 do país. Fora desse formato não dá para chamar.
export function normalizePhone(value: unknown) {
  let digits = String(value ?? '').replace(/\D/g, '');
  if (digits.startsWith('55') && digits.length >= 12) digits = digits.slice(2);
  return digits.length === 10 || digits.length === 11 ? digits : '';
}

// Compra é pedido pago e não cancelado. O valor é o pago em produtos, sem frete, como nas comissões.
const isPurchase = (order: CustomerData) => order.payment_status === 'paid' && order.status !== 'cancelled';
const orderValue = (order: CustomerData) => Math.max(asNumber(order.subtotal) - asNumber(order.discount_amount), 0);
const purchaseDay = (order: CustomerData) => brazilDay(order.paid_at || order.created_at);

export function purchaseStats(orders: CustomerData[], today: string) {
  const purchases = orders.filter(isPurchase);
  const days = [...new Set(purchases.map(purchaseDay))].sort();
  const firstPurchase = days[0] || null;
  const lastPurchase = days[days.length - 1] || null;
  const sales = purchases.reduce((sum, order) => sum + orderValue(order), 0);
  const avgInterval = days.length >= 2 ? Math.round((dayCount(days[days.length - 1]) - dayCount(days[0])) / (days.length - 1)) : null;
  return {
    purchases: purchases.length,
    sales: moneyCents(sales),
    avgTicket: purchases.length ? moneyCents(sales / purchases.length) : 0,
    firstPurchase,
    lastPurchase,
    avgInterval,
    daysSinceLast: lastPurchase ? Math.max(dayCount(today) - dayCount(lastPurchase), 0) : null,
    nextExpected: lastPurchase && avgInterval ? dayAfter(lastPurchase, avgInterval) : null,
  };
}

// Situação pela compra: quem tem intervalo próprio é comparado com o próprio costume.
export function customerSegment(input: { purchases: number; daysSinceLast: number | null; avgInterval: number | null; hasAccount: boolean; pendingOrders: number; cartItems: number }) {
  if (!input.purchases) {
    if (!input.hasAccount) return 'quote_only';
    return input.pendingOrders || input.cartItems ? 'interested' : 'no_purchase';
  }
  const days = input.daysSinceLast ?? 0;
  const interval = input.avgInterval;
  if (days > Math.max(180, (interval || 0) * 2)) return 'inactive';
  if (days > (interval ? Math.max(interval * 1.5, interval + 15) : 60)) return 'at_risk';
  if (input.purchases >= 3) return 'frequent';
  return input.purchases === 2 ? 'recurring' : 'new';
}

// Motivos para a equipe chamar hoje. Quem recusou contato nunca entra na lista.
export function contactReasons(input: {
  today: string; segment: string; preference: string; nextContactOn: string | null; lastContact: string | null; nextExpected: string | null;
  deliveredDay: string | null; pendingDay: string | null; lastPurchase: string | null; cartItems: number; cartDay: string | null; quoteDay: string | null;
}) {
  if (input.preference === 'refused') return [];
  const reasons: string[] = [];
  const today = dayCount(input.today);
  const since = (day: string) => today - dayCount(day);
  if (input.nextContactOn && input.nextContactOn <= input.today) reasons.push('scheduled');
  // Quem recebeu contato nos últimos 7 dias só volta com retorno marcado.
  if (input.lastContact && since(input.lastContact) < 7) return reasons;
  if (input.deliveredDay && since(input.deliveredDay) >= 3 && since(input.deliveredDay) <= 14 && (!input.lastContact || input.lastContact < input.deliveredDay)) reasons.push('after_delivery');
  if (input.segment === 'at_risk') reasons.push('at_risk');
  else if (input.nextExpected && input.segment !== 'inactive' && dayCount(input.nextExpected) - today <= 7) reasons.push('reorder');
  if (input.pendingDay && since(input.pendingDay) >= 1 && since(input.pendingDay) <= 14 && (!input.lastPurchase || input.lastPurchase < input.pendingDay)) reasons.push('pending_payment');
  if (input.cartItems && input.cartDay && since(input.cartDay) >= 1 && since(input.cartDay) <= 30 && (!input.lastPurchase || input.lastPurchase < input.cartDay)) reasons.push('cart');
  if (input.quoteDay && !input.lastPurchase && since(input.quoteDay) <= 30) reasons.push('quote');
  return reasons;
}

type CustomerReportInput = {
  today: string; users: CustomerData[]; profiles: CustomerData[]; orders: CustomerData[]; carts: CustomerData[]; quotes: CustomerData[];
  followups: CustomerData[]; notes: CustomerData[]; staffEmails: string[]; partnerIds: string[]; recipients: CustomerData[];
};

// Monta a lista do admin. Pessoas da equipe saem dos totais, para os testes não distorcerem os números.
export function buildCustomerReport(input: CustomerReportInput) {
  const staff = new Set(input.staffEmails.map(email => email.trim().toLowerCase()));
  const partners = new Set(input.partnerIds);
  const recipientNames = new Map(input.recipients.map(row => [row.id, textOf(row.name)]));
  const profiles = new Map(input.profiles.map(row => [row.id, row]));
  const carts = new Map(input.carts.map(row => [row.customer_id, row]));
  const followups = new Map(input.followups.map(row => [row.customer_key, row]));
  const ordersBy = new Map<unknown, CustomerData[]>();
  for (const order of input.orders) ordersBy.set(order.customer_id, [...(ordersBy.get(order.customer_id) || []), order]);
  const newestFirst = (a: CustomerData, b: CustomerData) => String(b.created_at).localeCompare(String(a.created_at));
  const addressOf = (order: CustomerData) => (order.shipping_address && typeof order.shipping_address === 'object' ? order.shipping_address : {}) as CustomerData;

  // Orçamento entra na conta com o mesmo telefone. Sem conta, vira uma pessoa só com orçamento.
  const phoneOwner = new Map<string, unknown>();
  for (const user of input.users) {
    const own = [(profiles.get(user.id) as CustomerData | undefined)?.phone, ...(ordersBy.get(user.id) || []).map(order => addressOf(order).phone)];
    for (const phone of own.map(normalizePhone)) if (phone && !phoneOwner.has(phone)) phoneOwner.set(phone, user.id);
  }
  const quotesBy = new Map<string, CustomerData[]>();
  for (const quote of input.quotes) {
    const phone = normalizePhone(quote.whatsapp);
    if (!phone) continue;
    const key = String(phoneOwner.get(phone) || `tel:${phone}`);
    quotesBy.set(key, [...(quotesBy.get(key) || []), quote]);
  }
  const quoteSummary = (key: string) => {
    const rows = quotesBy.get(key) || [];
    const days = rows.map(row => brazilDay(row.created_at)).sort();
    return { count: rows.length, lastDay: days[days.length - 1] || null };
  };

  const describe = (base: { key: string; kind: string; role: string; name: string; email: string | null; phone: string; createdAt: unknown; lastLogin: unknown; loginMethods: string[] }, orders: CustomerData[], cart: CustomerData | null) => {
    const stats = purchaseStats(orders, input.today);
    const sorted = [...orders].sort(newestFirst);
    const keys = [base.key, base.phone ? `tel:${base.phone}` : ''].filter(Boolean);
    const followup = (followups.get(keys[0]) || followups.get(keys[1])) as CustomerData | undefined;
    const notes = input.notes.filter(note => keys.includes(String(note.customer_key)))
      .sort(newestFirst)
      .map(note => ({ id: note.id, kind: note.kind, note: note.note, createdBy: note.created_by, createdAt: note.created_at }));
    const contactNote = notes.find(note => note.kind === 'contact');
    const lastContact = contactNote ? brazilDay(contactNote.createdAt) : null;
    const place = (sorted.map(addressOf).find(address => textOf(address.city)) || {}) as CustomerData;
    const pending = orders.filter(order => order.payment_status === 'pending' && order.status !== 'cancelled');
    const cartRows = cart && Array.isArray(cart.items) ? cart.items as CustomerData[] : [];
    const cartItems = cartRows.reduce((sum, item) => sum + asNumber(item.quantity), 0);
    const cartDay = cart?.updated_at ? brazilDay(cart.updated_at) : null;
    const quotes = quoteSummary(base.key);
    const segment = customerSegment({ purchases: stats.purchases, daysSinceLast: stats.daysSinceLast, avgInterval: stats.avgInterval, hasAccount: base.kind === 'account', pendingOrders: pending.length, cartItems });
    const purchases = sorted.filter(isPurchase);
    const delivered = purchases.map(order => order.delivered_at || order.shipped_at).filter(Boolean).map(brazilDay).sort();
    const preference = textOf(followup?.contact_preference) || 'unknown';
    const nextContactOn = textOf(followup?.next_contact_on).slice(0, 10) || null;
    const products = new Map<string, { name: string; quantity: number; times: number; lastDay: string }>();
    for (const order of [...purchases].reverse()) {
      const seen = new Set<string>();
      for (const item of (Array.isArray(order.order_items) ? order.order_items as CustomerData[] : [])) {
        const name = textOf(item.product_name) || 'Produto sem nome';
        const row = products.get(name) || { name, quantity: 0, times: 0, lastDay: '' };
        row.quantity += asNumber(item.quantity);
        if (!seen.has(name)) row.times += 1;
        row.lastDay = purchaseDay(order);
        seen.add(name);
        products.set(name, row);
      }
    }
    const first = [...purchases].reverse()[0] || [...sorted].reverse()[0];
    const method = purchases.map(order => textOf(order.payment_method)).find(Boolean) || null;
    return {
      ...base,
      city: textOf(place.city) || null,
      state: textOf(place.state) || null,
      neighborhood: textOf(place.neighborhood) || null,
      ...stats,
      segment,
      paymentMethod: method,
      pendingOrders: pending.length,
      failedOrders: orders.filter(order => order.payment_status === 'failed').length,
      refundedOrders: orders.filter(order => order.payment_status === 'refunded').length,
      origin: first && textOf(first.discount_code) ? { code: textOf(first.discount_code), recipient: recipientNames.get(first.attributed_recipient_id) || null } : null,
      cart: cartItems ? { items: cartItems, value: moneyCents(cartRows.reduce((sum, item) => sum + asNumber(item.price) * asNumber(item.quantity), 0)), day: cartDay, names: cartRows.map(item => textOf(item.name)).filter(Boolean).slice(0, 12) } : null,
      quotes,
      products: [...products.values()].sort((a, b) => b.times - a.times || b.quantity - a.quantity),
      orders: sorted.map(order => ({
        id: order.id,
        day: brazilDay(order.paid_at || order.created_at),
        status: order.status,
        paymentStatus: order.payment_status,
        paymentMethod: order.payment_method || null,
        value: moneyCents(orderValue(order)),
        shipping: moneyCents(asNumber(order.shipping_amount)),
        coupon: textOf(order.discount_code) || null,
        items: (Array.isArray(order.order_items) ? order.order_items as CustomerData[] : []).map(item => ({ name: textOf(item.product_name), quantity: asNumber(item.quantity) })),
      })),
      notes,
      lastContact,
      preference,
      nextContactOn,
      reasons: contactReasons({
        today: input.today, segment, preference, nextContactOn, lastContact, nextExpected: stats.nextExpected,
        deliveredDay: delivered[delivered.length - 1] || null, pendingDay: pending.map(order => brazilDay(order.created_at)).sort().pop() || null,
        lastPurchase: stats.lastPurchase, cartItems, cartDay, quoteDay: quotes.lastDay,
      }),
    };
  };

  const accounts = input.users.map(user => {
    const id = String(user.id);
    const orders = ordersBy.get(user.id) || [];
    const sorted = [...orders].sort(newestFirst);
    const profile = (profiles.get(user.id) || {}) as CustomerData;
    const meta = (user.user_metadata || {}) as CustomerData;
    const app = (user.app_metadata || {}) as CustomerData;
    const email = textOf(user.email).toLowerCase();
    const orderName = sorted.map(order => textOf(addressOf(order).name)).find(Boolean);
    const phone = sorted.map(order => normalizePhone(addressOf(order).phone)).find(Boolean) || normalizePhone(profile.phone);
    return describe({
      key: id,
      kind: 'account',
      role: staff.has(email) ? 'staff' : partners.has(id) ? 'partner' : 'customer',
      name: textOf(profile.full_name) || textOf(meta.full_name) || textOf(meta.name) || orderName || 'Sem nome',
      email: email || null,
      phone,
      createdAt: user.created_at || null,
      lastLogin: user.last_sign_in_at || null,
      loginMethods: Array.isArray(app.providers) ? app.providers.map(String) : [],
    }, orders, (carts.get(user.id) || null) as CustomerData | null);
  });

  const quoteOnly = [...quotesBy.entries()].filter(([key]) => key.startsWith('tel:')).map(([key, rows]) => {
    const newest = [...rows].sort(newestFirst)[0];
    return describe({ key, kind: 'quote', role: 'customer', name: textOf(newest.nome_cliente) || 'Sem nome', email: null, phone: key.slice(4), createdAt: newest.created_at || null, lastLogin: null, loginMethods: [] }, [], null);
  });

  const customers = [...accounts, ...quoteOnly].sort((a, b) => String(b.lastPurchase || '').localeCompare(String(a.lastPurchase || '')) || String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
  const counted = customers.filter(customer => customer.role !== 'staff');
  const buyers = counted.filter(customer => customer.purchases > 0);
  const repeatBuyers = buyers.filter(customer => customer.purchases >= 2).length;
  const purchases = buyers.reduce((sum, customer) => sum + customer.purchases, 0);
  const sales = buyers.reduce((sum, customer) => sum + customer.sales, 0);
  const segments: Record<string, number> = {};
  for (const customer of counted) segments[customer.segment] = (segments[customer.segment] || 0) + 1;

  const productRanking = new Map<string, { name: string; customers: number; repeatCustomers: number; quantity: number }>();
  const cityRanking = new Map<string, { name: string; customers: number; sales: number }>();
  for (const customer of buyers) {
    for (const product of customer.products) {
      const row = productRanking.get(product.name) || { name: product.name, customers: 0, repeatCustomers: 0, quantity: 0 };
      row.customers += 1;
      row.quantity += product.quantity;
      if (product.times >= 2) row.repeatCustomers += 1;
      productRanking.set(product.name, row);
    }
    if (customer.city) {
      const name = customer.state ? `${customer.city}/${customer.state}` : customer.city;
      const row = cityRanking.get(name) || { name, customers: 0, sales: 0 };
      row.customers += 1;
      row.sales = moneyCents(row.sales + customer.sales);
      cityRanking.set(name, row);
    }
  }

  return {
    today: input.today,
    summary: {
      people: counted.length,
      buyers: buyers.length,
      repeatBuyers,
      repeatRate: buyers.length ? Math.round((repeatBuyers / buyers.length) * 100) : null,
      purchases,
      sales: moneyCents(sales),
      avgTicket: purchases ? moneyCents(sales / purchases) : 0,
      avgPerBuyer: buyers.length ? moneyCents(sales / buyers.length) : 0,
      contactNow: counted.filter(customer => customer.reasons.length).length,
      openCarts: counted.filter(customer => customer.cart && customer.purchases === 0).length,
      openCartsValue: moneyCents(counted.filter(customer => customer.cart && customer.purchases === 0).reduce((sum, customer) => sum + (customer.cart?.value || 0), 0)),
    },
    segments,
    topProducts: [...productRanking.values()].sort((a, b) => b.customers - a.customers || b.quantity - a.quantity).slice(0, 8),
    cities: [...cityRanking.values()].sort((a, b) => b.customers - a.customers || b.sales - a.sales).slice(0, 6),
    customers,
  };
}
