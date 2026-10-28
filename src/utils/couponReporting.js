const normalize = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
export function filterCouponOrders(orders, { search = '', status = '', from = '', to = '', attributedOnly = false } = {}) {
    const term = normalize(search).trim();
    return orders.filter(order => {
        const day = new Date(order.created_at).toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
        return (!attributedOnly || Boolean(order.discount_code)) && (!status || order.payment_status === status)
            && (!from || day >= from) && (!to || day <= to)
            && (!term || normalize([order.discount_code, order.commission_recipients?.name, order.id, order.customer_email].join(' ')).includes(term));
    });
}

export function summarizeCouponOrders(orders) {
    const paid = orders.filter(order => order.payment_status === 'paid');
    return {
        paidCount: paid.length,
        gross: paid.reduce((sum, order) => sum + Number(order.total || 0), 0),
        discounts: paid.reduce((sum, order) => sum + Number(order.discount_amount || 0), 0),
        pendingCount: orders.filter(order => order.payment_status === 'pending').length,
    };
}

const paymentLabel = { paid: 'Confirmado', pending: 'Pendente', failed: 'Falhou', refunded: 'Estornado' };
const cell = value => {
    const text = String(value ?? '');
    // Partner names, coupon codes and emails must never become spreadsheet formulas.
    return `"${(/^[\s]*[=+\-@]/.test(text) ? `'${text}` : text).replaceAll('"', '""')}"`;
};
const decimal = value => Number(value || 0).toFixed(2).replace('.', ',');
export function couponOrdersCsv(orders) {
    const rows = [['Pedido', 'Criado em (Brasília)', 'Cliente', 'Cupom', 'Parceiro', 'Pagamento', 'Pago em (Brasília)', 'Produtos (R$)', 'Desconto (R$)', 'Total (R$)', 'Taxa (R$)', 'Líquido (R$)']];
    const date = value => value ? new Date(value).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }) : '';
    for (const order of orders) rows.push([
        order.id, date(order.created_at), order.customer_email, order.discount_code || '', order.commission_recipients?.name || '',
        paymentLabel[order.payment_status] || order.payment_status, date(order.paid_at), decimal(order.subtotal), decimal(order.discount_amount), decimal(order.total),
        order.payment_status === 'paid' ? decimal(order.provider_fee) : '',
        order.payment_status === 'paid' ? decimal(order.net_amount ?? (Number(order.total) - Number(order.provider_fee || 0))) : '',
    ]);
    return '\uFEFF' + rows.map(row => row.map(cell).join(';')).join('\r\n');
}
