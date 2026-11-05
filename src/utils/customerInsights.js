// Textos, contatos e planilha da área de clientes. A conta real fica no servidor.
export const SEGMENT_LABELS = {
    frequent: 'Frequente',
    recurring: 'Recorrente',
    new: 'Primeira compra',
    at_risk: 'Sumindo',
    inactive: 'Inativo',
    interested: 'Não concluiu a compra',
    no_purchase: 'Conta sem compra',
    quote_only: 'Só orçamento',
};

export const SEGMENT_HELP = {
    frequent: '3 compras ou mais, dentro do costume',
    recurring: '2 compras, dentro do costume',
    new: '1 compra nos últimos 60 dias',
    at_risk: 'Passou do tempo de costume, ou 60 dias depois da primeira compra',
    inactive: 'Mais de 180 dias sem comprar',
    interested: 'Pagamento pendente ou carrinho com itens',
    no_purchase: 'Criou a conta e ainda não comprou',
    quote_only: 'Pediu orçamento e não tem conta no site',
};

export const REASON_LABELS = {
    scheduled: 'Retorno marcado',
    after_delivery: 'Perguntar como foi a entrega',
    reorder: 'Perto de comprar de novo',
    at_risk: 'Passou do tempo de costume',
    pending_payment: 'Pagamento não concluído',
    cart: 'Carrinho parado',
    quote: 'Pediu orçamento',
};

export const PREFERENCE_LABELS = { unknown: 'Não informado', allowed: 'Aceita contato', refused: 'Não quer contato' };
export const ROLE_LABELS = { partner: 'Parceira', staff: 'Equipe' };
const PAYMENT_LABELS = { bank_transfer: 'Pix', pix: 'Pix', credit_card: 'Cartão de crédito', debit_card: 'Cartão de débito', ticket: 'Boleto', account_money: 'Saldo Mercado Pago' };
const PAYMENT_STATUS_LABELS = { paid: 'Pago', pending: 'Pendente', failed: 'Não aprovado', refunded: 'Estornado' };
const ORDER_STATUS_LABELS = { awaiting_payment: 'Aguardando pagamento', paid: 'Pago', processing: 'Em preparo', shipped: 'Enviado', delivered: 'Entregue', cancelled: 'Cancelado' };

export const paymentLabel = value => PAYMENT_LABELS[value] || value || 'não informado';
export const orderLabel = order => order.status === 'cancelled' ? ORDER_STATUS_LABELS.cancelled : order.paymentStatus === 'paid' ? ORDER_STATUS_LABELS[order.status] || 'Pago' : PAYMENT_STATUS_LABELS[order.paymentStatus] || order.paymentStatus;
export const dayLabel = value => value ? new Date(`${String(value).slice(0, 10)}T12:00:00Z`).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : '—';

export function phoneLabel(phone) {
    if (!phone) return '';
    return phone.length === 11 ? `(${phone.slice(0, 2)}) ${phone.slice(2, 7)}-${phone.slice(7)}` : `(${phone.slice(0, 2)}) ${phone.slice(2, 6)}-${phone.slice(6)}`;
}

// A mensagem pronta nunca cita produto: o histórico de uma farmácia pode revelar dados de saúde.
export function customerWhatsAppUrl(customer) {
    if (!customer.phone || customer.preference === 'refused') return null;
    const firstName = customer.name && customer.name !== 'Sem nome' ? customer.name.split(' ')[0] : '';
    const greeting = firstName ? `Olá, ${firstName}!` : 'Olá!';
    return `https://wa.me/55${customer.phone}?text=${encodeURIComponent(`${greeting} Aqui é da Graphène Manipulações.`)}`;
}

export function matchesCustomer(customer, search) {
    const term = search.trim().toLowerCase();
    if (!term) return true;
    const digits = term.replace(/\D/g, '');
    if (digits.length >= 4 && customer.phone?.includes(digits)) return true;
    const words = [customer.name, customer.email, customer.city, customer.neighborhood, customer.origin?.code, customer.origin?.recipient, ...customer.products.map(product => product.name)];
    return words.some(word => word?.toLowerCase().includes(term));
}

const comparers = {
    recent: (a, b) => String(b.lastPurchase || '').localeCompare(String(a.lastPurchase || '')) || String(b.createdAt || '').localeCompare(String(a.createdAt || '')),
    purchases: (a, b) => b.purchases - a.purchases || b.sales - a.sales,
    value: (a, b) => b.sales - a.sales,
    away: (a, b) => (b.daysSinceLast ?? -1) - (a.daysSinceLast ?? -1),
    name: (a, b) => a.name.localeCompare(b.name, 'pt-BR'),
};
export const sortCustomers = (customers, order) => [...customers].sort(comparers[order] || comparers.recent);

// Planilha sem produtos nem anotações, e sem quem recusou contato. Nomes e e-mails nunca viram fórmula.
const csvCell = value => {
    const text = String(value ?? '');
    return `"${(/^[\s]*[=+\-@]/.test(text) ? `'${text}` : text).replaceAll('"', '""')}"`;
};
const decimal = value => Number(value || 0).toFixed(2).replace('.', ',');
export const exportableCustomers = customers => customers.filter(customer => customer.preference !== 'refused');
export function customersCsv(customers) {
    const rows = [['Nome', 'Telefone', 'E-mail', 'Cidade', 'UF', 'Situação', 'Compras', 'Total sem frete (R$)', 'Ticket médio (R$)', 'Primeira compra', 'Última compra', 'Dias sem comprar', 'Compra a cada (dias)', 'Próxima compra prevista', 'Cupom de origem', 'Contato']];
    for (const customer of exportableCustomers(customers)) rows.push([
        customer.name, phoneLabel(customer.phone), customer.email || '', customer.city || '', customer.state || '', SEGMENT_LABELS[customer.segment] || customer.segment,
        customer.purchases, decimal(customer.sales), decimal(customer.avgTicket), customer.firstPurchase ? dayLabel(customer.firstPurchase) : '', customer.lastPurchase ? dayLabel(customer.lastPurchase) : '',
        customer.daysSinceLast ?? '', customer.avgInterval ?? '', customer.nextExpected ? dayLabel(customer.nextExpected) : '', customer.origin?.code || '', PREFERENCE_LABELS[customer.preference] || '',
    ]);
    return '﻿' + rows.map(row => row.map(csvCell).join(';')).join('\r\n');
}
