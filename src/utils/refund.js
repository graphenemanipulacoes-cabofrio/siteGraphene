// Estorno pelo painel (ação refund_order da admin-orders): só pagamento confirmado no Mercado Pago,
// com o número do pagamento que pagou o pedido (paid_payment_id) ou, em pedidos antigos,
// o número gravado pelo aviso do Mercado Pago (payment_details.payment_id).
export const refundPaymentId = order => String(order?.paid_payment_id || order?.payment_details?.payment_id || '');

export const canRefund = order => order?.payment_status === 'paid'
    && order?.payment_provider === 'mercado_pago'
    && /^\d{1,20}$/.test(refundPaymentId(order));

export const refundMessages = {
    already_refunded: 'Este pagamento já foi estornado.',
    payment_not_confirmed: 'O pedido não tem pagamento confirmado.',
    payment_not_refundable: 'Este pagamento não pode ser estornado pelo painel. Faça pelo Mercado Pago.',
    provider_not_configured: 'A conexão com o Mercado Pago não está configurada. Faça o estorno pelo Mercado Pago.',
    payment_not_found: 'O Mercado Pago não encontrou este pagamento. Confira no site do Mercado Pago.',
    refund_too_old: 'O prazo do Mercado Pago para estornar este pagamento acabou. Combine a devolução com o cliente por outro meio.',
    refund_insufficient_balance: 'Não há saldo no Mercado Pago para o estorno. Coloque saldo na conta e tente de novo.',
    refund_failed: 'O Mercado Pago recusou o estorno. Confira o pagamento no site do Mercado Pago.',
    refunded_not_saved: 'O estorno foi feito no Mercado Pago, mas o pedido ainda não atualizou. Atualize a lista em alguns minutos.',
    payment_mismatch: 'O pagamento no Mercado Pago não corresponde a este pedido. Confira no site do Mercado Pago.',
    payment_not_extra: 'Este pagamento não é um pagamento extra do pedido.',
};

export const refundErrorMessage = code => refundMessages[code] || 'Não foi possível estornar agora. Confira o pagamento no Mercado Pago antes de tentar de novo.';
