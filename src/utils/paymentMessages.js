// Textos do resultado do pagamento no próprio site, adaptados da tabela oficial de status_detail
// do Mercado Pago. O status_detail cru nunca aparece na tela.
import { money } from './commerce.js';

const BRANDS = { visa: 'Visa', master: 'Mastercard', elo: 'Elo', amex: 'American Express', hipercard: 'Hipercard' };
export const brandName = paymentMethodId => BRANDS[paymentMethodId] || 'a operadora do cartão';
// "a Visa", "a Mastercard"... ou "a operadora do cartão".
const theBrand = paymentMethodId => BRANDS[paymentMethodId] ? `a ${BRANDS[paymentMethodId]}` : 'a operadora do cartão';
const capitalize = text => text.charAt(0).toUpperCase() + text.slice(1);

const GENERIC_REJECTION = 'Não conseguimos processar o pagamento. Tente outro cartão ou pague com Pix.';

const rejectionText = ({ statusDetail, paymentMethodId, installments, amount }) => {
    switch (statusDetail) {
        case 'cc_rejected_bad_filled_card_number': return 'Revise o número do cartão.';
        case 'cc_rejected_bad_filled_date': return 'Revise a data de vencimento.';
        case 'cc_rejected_bad_filled_security_code': return 'Revise o código de segurança do cartão.';
        case 'cc_rejected_bad_filled_other': return 'Revise os dados do cartão.';
        case 'cc_rejected_call_for_authorize': return `Autorize o pagamento de ${money(amount)} com ${theBrand(paymentMethodId)} e tente de novo.`;
        case 'cc_rejected_card_disabled': return `Ligue para ${theBrand(paymentMethodId)} para ativar seu cartão. O telefone fica no verso do cartão.`;
        case 'cc_rejected_insufficient_amount': return 'O cartão não tem limite suficiente. Use outro cartão ou pague com Pix.';
        case 'cc_rejected_invalid_installments': return `${capitalize(theBrand(paymentMethodId))} não aceita ${Number(installments) > 0 ? `${installments} parcelas` : 'essa quantidade de parcelas'}. Escolha outra quantidade.`;
        case 'cc_rejected_duplicated_payment': return 'Você já fez um pagamento com esse valor. Se precisar pagar de novo, use outro cartão ou o Pix.';
        case 'cc_rejected_max_attempts': return 'Você chegou ao limite de tentativas. Use outro cartão ou pague com Pix.';
        case 'cc_rejected_high_risk':
        case 'cc_rejected_blacklist': return 'Não foi possível aprovar este pagamento. Tente com Pix ou outro cartão.';
        case 'cc_rejected_3ds_mandatory': return 'Este cartão exige uma verificação extra que ainda não oferecemos. Pague com Pix ou outro cartão.';
        default: return GENERIC_REJECTION;
    }
};

// Resultado do cartão: aprovado, em análise ou recusado.
export function cardResult({ status, statusDetail = '', paymentMethodId = '', installments = null, amount = 0 } = {}) {
    if (status === 'approved') return { kind: 'approved', title: 'Pronto, seu pagamento foi aprovado!', text: 'Estamos abrindo a confirmação do pedido.', canRetry: false };
    if (status === 'in_process' || status === 'authorized' || status === 'pending') {
        return { kind: 'review', title: 'Estamos analisando seu pagamento', text: 'Você recebe a resposta em até 2 dias úteis e pode acompanhar em Minha conta. Não é preciso pagar de novo.', canRetry: false };
    }
    return { kind: 'rejected', title: 'Pagamento não aprovado', text: rejectionText({ statusDetail, paymentMethodId, installments, amount }), canRetry: true };
}

export const RETRYABLE_RESULT = { kind: 'retryable', title: 'Não conseguimos confirmar com o Mercado Pago.', text: 'Confira sua conexão e toque em Tentar de novo.', canRetry: true };
export const CONFIRMING_RESULT = { kind: 'confirming', title: 'Confirmando seu pagamento', text: 'Estamos registrando o pagamento no seu pedido. Esta tela muda sozinha. Não é preciso pagar de novo.', canRetry: false };

export const PIX_STEPS = ['Abra o app do seu banco.', 'Escolha Pix › Pix Copia e Cola.', 'Cole o código e confirme.'];

// Formato "29:41" para o prazo do Pix.
export const formatCountdown = milliseconds => {
    const total = Math.max(0, Math.floor(milliseconds / 1000));
    const hours = Math.floor(total / 3600);
    const minutes = Math.floor((total % 3600) / 60);
    const seconds = String(total % 60).padStart(2, '0');
    return hours ? `${hours}:${String(minutes).padStart(2, '0')}:${seconds}` : `${minutes}:${seconds}`;
};

// Tipo da imagem do QR enviada pelo Mercado Pago (PNG na prática; JPEG na documentação).
export const qrImageSource = base64 => `data:image/${String(base64 || '').startsWith('iVBOR') ? 'png' : 'jpeg'};base64,${base64}`;
