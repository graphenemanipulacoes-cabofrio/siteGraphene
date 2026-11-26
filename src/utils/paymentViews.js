// Regras do pagamento no próprio site que decidem qual tela mostrar, sem React e sem rede.
// O OrderPayment, a página de retorno, o checkout e Minha conta usam estas funções, e o
// scripts/verify-payment-ui.mjs testa cada caso com amostras.
import { RETRYABLE_RESULT, cardResult } from './paymentMessages.js';

const REVIEW_STATUSES = new Set(['in_process', 'authorized']);
export const BLOCKED_CODES = new Set(['order_expired', 'order_not_payable', 'order_not_found']);

// Em análise: in_process, authorized ou qualquer meio que não seja Pix ainda 'pending' (cartão, ou boleto do
// Checkout Pro, que chega como 'other'). É a mesma regra do banco (begin_payment_attempt e order_payment_state).
export const inReview = payment => Boolean(payment) && (REVIEW_STATUSES.has(payment.status) || (payment.method !== 'pix' && payment.status === 'pending'));
export const pixStillValid = (pix, now = Date.now()) => Boolean(pix) && (!pix.expiresAt || Date.parse(pix.expiresAt) > now);
const pendingPix = payment => payment?.method === 'pix' && payment.status === 'pending' && Boolean(payment.pix);
export const openPixOf = (payment, now = Date.now()) => pendingPix(payment) && pixStillValid(payment.pix, now) ? { pix: payment.pix, attemptId: payment.attemptId } : null;

export const PROGRESS_RESULT = { kind: 'progress', title: 'Pagamento em processamento', text: 'Seu pagamento está sendo processado. Aguarde alguns segundos e toque em Atualizar.' };
export const RESTART_RESULT = { kind: 'blocked', title: 'Revise o pedido para pagar', text: 'O pagamento por aqui não está disponível agora. Revise o pedido de novo para ver como pagar. Seu carrinho foi mantido.' };
export const PIX_FAILED_RESULT = { kind: 'error', title: 'Não foi possível gerar o Pix', text: 'Tente de novo em instantes.' };
export const BRAND_NOT_ACCEPTED_TITLE = 'Este cartão não é aceito';
const LAST_FAILED_NOTICE = 'O último pagamento deste pedido não foi concluído. Você pode pagar de novo aqui.';

export const OTHER_ORDER_PAID_TITLE = 'Seu outro pedido foi pago';
export const RETRY_LABELS = Object.freeze({ status: 'Atualizar', choose: 'Escolher outra forma de pagamento', pix: 'Tentar de novo', card: 'Tentar de novo', same: 'Tentar de novo', restart: 'Revisar o pedido de novo', payAgain: 'Pagar este pedido mesmo assim' });

// Resposta da ação status → tela. 'unavailable' = o pedido pode ser pago, mas não por aqui
// (o modo voltou para o Checkout Pro); quem chama decide entre a tela antiga e refazer a revisão.
export function statusToView(status, { mode = 'checkout', now = Date.now() } = {}) {
    const { order, payment = null, reason = null } = status || {};
    if (order?.paymentStatus === 'paid' || reason === 'already_paid') return { name: 'paid' };
    const openPix = openPixOf(payment, now);
    if (openPix) return { name: 'pix', openPix };
    if (inReview(payment)) return { name: 'result', result: cardResult(payment) };
    if (reason === 'payment_in_review') return { name: 'result', result: cardResult({ status: 'in_process' }) };
    if (payment?.status === 'approved' || order?.paymentStatus === 'confirming') return { name: 'confirming' };
    if (order?.paymentStatus === 'refunded' || (order?.status && order.status !== 'awaiting_payment') || reason === 'order_not_payable') return { name: 'blocked', code: 'order_not_payable' };
    if (reason === 'order_expired') return { name: 'blocked', code: 'order_expired' };
    // Tentativa ainda em criação (menos de 2 minutos): o pedido continua pagável.
    if (reason === 'payment_in_progress') return { name: 'result', result: PROGRESS_RESULT, retry: 'status' };
    if (status?.checkout) {
        const lastFailed = mode === 'return' && payment && ['rejected', 'cancelled'].includes(payment.status);
        return { name: 'choose', notice: lastFailed ? LAST_FAILED_NOTICE : '' };
    }
    return { name: 'unavailable' };
}

// Falha ao consultar a situação. No checkout a configuração já veio da create-checkout,
// então dá para escolher a forma de pagamento; o servidor protege o pagamento de qualquer forma.
export function statusErrorToView(error, { mode = 'checkout', hasCheckout = false } = {}) {
    if (error?.code === 'already_paid') return { name: 'paid' };
    if (BLOCKED_CODES.has(error?.code)) return { name: 'blocked', code: error.code };
    if (mode === 'checkout' && hasCheckout) return { name: 'choose', notice: '' };
    return { name: 'error', error };
}

// Resposta do pay → tela. Nunca devolve retry 'same': a mesma chave só volta depois de um erro "retryable".
export function resultToView({ payment, order } = {}, { amount = 0 } = {}) {
    if (order?.paymentStatus === 'paid') return { name: 'paid' };
    if (payment?.method === 'pix') {
        if (payment.status === 'pending' && payment.pix) return { name: 'pix', openPix: { pix: payment.pix, attemptId: payment.attemptId } };
        if (payment.status === 'approved') return { name: 'confirming' };
        return { name: 'result', result: PIX_FAILED_RESULT, retry: 'pix' };
    }
    const outcome = cardResult({ ...payment, amount });
    // Aprovado, mas ainda sem registro no pedido ("confirming"): nunca pedir para tentar de novo.
    if (outcome.kind === 'approved') return { name: 'confirming' };
    return { name: 'result', result: outcome, retry: outcome.canRetry ? 'card' : null };
}

const brandNotAccepted = error => ({ name: 'result', result: { kind: 'rejected', title: BRAND_NOT_ACCEPTED_TITLE, text: error.message }, retry: 'card' });

// Erro do pay → tela. sameAttempt = a próxima tentativa repete a mesma chave (só depois de "retryable").
export function errorToView(error, { method = null } = {}) {
    if (error?.retryable) return { name: 'result', result: RETRYABLE_RESULT, retry: 'same', requestId: error.requestId || null, sameAttempt: true };
    const code = error?.code;
    if (code === 'already_paid') return { name: 'paid' };
    if (code === 'payment_in_review') return { name: 'result', result: cardResult({ status: 'in_process' }) };
    if (code === 'payment_in_progress') return { name: 'result', result: { kind: 'progress', title: PROGRESS_RESULT.title, text: error.message }, retry: 'status' };
    if (code === 'pix_cancel_failed') return { name: 'result', result: { kind: 'blocked', title: 'O Pix gerado continua valendo', text: error.message }, retry: 'status' };
    // O Pix de outro pedido do cliente foi pago enquanto o servidor cancelava os Pix abertos: nada foi cobrado
    // neste pedido. O cliente confere em Minha conta e, se quiser, escolhe pagar este também (chave nova).
    if (code === 'other_order_paid') return { name: 'result', result: { kind: 'blocked', title: OTHER_ORDER_PAID_TITLE, text: error.message }, retry: 'payAgain', account: true };
    if (BLOCKED_CODES.has(code)) return { name: 'blocked', code };
    if (code === 'too_many_requests') return { name: 'result', result: { kind: 'blocked', title: 'Aguarde um pouco', text: error.message }, retry: 'choose' };
    // A chave de emergência voltou para o Checkout Pro: refazer a revisão (ou, no retorno, a tela antiga).
    if (code === 'payment_provider_not_configured') return { name: 'unavailable' };
    if (code === 'card_brand_not_accepted') return brandNotAccepted(error);
    const pix = method === 'pix';
    return {
        name: 'result', result: { kind: 'error', title: pix ? 'Não foi possível gerar o Pix' : 'Não foi possível concluir o pagamento', text: error?.message || '' },
        retry: pix ? 'pix' : 'card', requestId: error?.requestId || null, auth: code === 'authentication_required',
    };
}

// Dado do Brick recusado no navegador, antes de qualquer chamada (brickToPayBody).
export function cardInputErrorToView(error) {
    if (error?.code === 'card_brand_not_accepted') return brandNotAccepted(error);
    return { name: 'result', result: { kind: 'error', title: 'Confira os dados do cartão', text: error?.message || 'Confira os dados do pagamento e tente de novo.' }, retry: 'card' };
}

// O que o botão da tela de resultado faz.
export function retryAction(view, hasLastRequest) {
    const kind = view?.retry;
    if (kind === 'same') return hasLastRequest ? 'resend' : 'choose';
    return ['pix', 'card', 'status', 'restart'].includes(kind) ? kind : 'choose';
}

// Página de retorno: dá para pagar aqui ou há um pagamento a retomar (Pix aberto, cartão em análise ou em processamento).
export const payHereFrom = status => Boolean(status?.checkout) || pendingPix(status?.payment) || inReview(status?.payment)
    || status?.payment?.status === 'approved' || ['payment_in_progress', 'payment_in_review'].includes(status?.reason);

// Minha conta: texto do botão do pedido (ou null, sem botão).
export function payLinkLabel(status) {
    if (!status || status.order?.paymentStatus === 'paid') return null;
    if (pendingPix(status.payment)) return 'Ver o Pix';
    if (inReview(status.payment) || status.reason === 'payment_in_review') return 'Ver pagamento em análise';
    if (status.reason === 'payment_in_progress') return 'Ver o pagamento';
    return status.checkout ? 'Pagar agora' : null;
}

// Checkout: aviso de pagamento de outro pedido ainda em andamento (ou null).
export function pendingPaymentFrom(status) {
    if (!status || status.order?.paymentStatus === 'paid') return null;
    if (pendingPix(status.payment) && pixStillValid(status.payment.pix)) return { kind: 'pix', text: 'Você tem um Pix aguardando pagamento.' };
    if (inReview(status.payment) || status.reason === 'payment_in_review') return { kind: 'review', text: 'Você tem um pagamento em análise.' };
    if (status.reason === 'payment_in_progress') return { kind: 'progress', text: 'Você tem um pagamento em processamento.' };
    return null;
}
