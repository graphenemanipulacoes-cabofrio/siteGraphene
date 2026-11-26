// Tradução do envio do Payment Brick (cartão de crédito) para o corpo do process-payment.
// Função pura: não chama a rede. O servidor valida tudo de novo e usa o valor do banco.
// A documentação do Mercado Pago diz 'credit_card' e os tipos do sdk-react dizem 'creditCard':
// aceitamos as duas formas e recusamos qualquer outro meio (Pix, boleto, débito, carteira).
import { validCpf } from '../utils/commerce.js';

// Bandeiras de crédito aceitas, iguais às do servidor (process-payment). O Brick mostra 'all';
// um cartão de outra bandeira para aqui, com uma mensagem clara e sem chamada ao servidor.
export const ACCEPTED_CARD_BRANDS = Object.freeze(['visa', 'master', 'elo', 'amex', 'hipercard']);
export const ACCEPTED_CARD_TEXT = 'Visa, Mastercard, Elo, American Express ou Hipercard';
export const ACCEPTED_CARDS_HINT = 'Aceitamos Visa, Mastercard, Elo, American Express e Hipercard.';
const INPUT_MESSAGES = {
    invalid_payment_request: 'Confira os dados do pagamento e tente de novo.',
    card_brand_not_accepted: `Este cartão não é aceito. Use ${ACCEPTED_CARD_TEXT}, ou pague com Pix.`,
};

export class PaymentInputError extends Error {
    constructor(code = 'invalid_payment_request') {
        const known = Object.hasOwn(INPUT_MESSAGES, code) ? code : 'invalid_payment_request';
        super(INPUT_MESSAGES[known]);
        this.name = 'PaymentInputError';
        this.code = known;
    }
}

const CREDIT_CARD_TYPES = new Set(['credit_card', 'creditCard']);
const tokenPattern = /^[A-Za-z0-9_-]{16,128}$/;
const methodPattern = /^[a-z_]{2,30}$/;
const issuerPattern = /^\d{1,10}$/;
// Meios que nunca podem chegar como cartão de crédito.
const NOT_CREDIT = /^(pix|account_money|consumer_credits|bolbradesco|boleto|pec|ticket|bank_transfer|atm|deb[a-z_]*)$/;

const identification = payer => {
    const type = String(payer?.identification?.type || '').toUpperCase();
    const number = String(payer?.identification?.number || '').replace(/\D/g, '');
    if (type === 'CPF' && validCpf(number)) return { type, number };
    if (type === 'CNPJ' && /^\d{14}$/.test(number) && !/^(\d)\1{13}$/.test(number)) return { type, number };
    return null;
};

export function brickToPayBody(selectedPaymentMethod, formData, { maxInstallments = 12 } = {}) {
    if (!CREDIT_CARD_TYPES.has(selectedPaymentMethod)) throw new PaymentInputError();
    if (!formData || typeof formData !== 'object') throw new PaymentInputError();
    const token = String(formData.token || '');
    const paymentMethodId = String(formData.payment_method_id || '');
    const issuer = formData.issuer_id == null || formData.issuer_id === '' ? '' : String(formData.issuer_id);
    const installments = Number(formData.installments);
    const limit = Number.isInteger(maxInstallments) && maxInstallments >= 1 && maxInstallments <= 12 ? maxInstallments : 12;
    const holder = identification(formData.payer);
    if (!tokenPattern.test(token) || !methodPattern.test(paymentMethodId) || NOT_CREDIT.test(paymentMethodId)) throw new PaymentInputError();
    if (issuer && !issuerPattern.test(issuer)) throw new PaymentInputError();
    if (!Number.isInteger(installments) || installments < 1 || installments > limit || !holder) throw new PaymentInputError();
    if (!ACCEPTED_CARD_BRANDS.includes(paymentMethodId)) throw new PaymentInputError('card_brand_not_accepted');
    // Valor, e-mail e descrição vindos do navegador ficam de fora de propósito.
    return { method: 'card', card: { token, paymentMethodId, ...(issuer ? { issuerId: issuer } : {}), installments, identification: holder } };
}
