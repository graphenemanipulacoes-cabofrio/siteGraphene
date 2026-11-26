import { supabase } from './supabaseClient';

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const publicKeyPattern = /^(APP_USR|TEST)-[A-Za-z0-9-]{10,}$/;
const keyConflict = 'Não foi possível recuperar esta tentativa de compra. Seu carrinho foi mantido. Recarregue a página e confira o pedido antes de continuar.';
const providerUnavailable = 'O Mercado Pago está temporariamente indisponível. Seu carrinho foi mantido. Tente novamente em instantes.';
const messages = {
    authentication_required: 'Sua sessão expirou. Entre novamente para continuar. Seu carrinho foi mantido.',
    invalid_document: 'Confira o CPF informado.',
    invalid_cart: 'Revise as quantidades no carrinho. O limite é de 20 unidades por produto.',
    invalid_shipping: 'Confira os dados de entrega.',
    invalid_shipping_address: 'Confira os dados de entrega.',
    invalid_or_unpriced_product: 'Um dos produtos não está disponível ou não tem preço para compra. Revise o carrinho.',
    invalid_shipping_zip: 'Confira o CEP: não conseguimos calcular a entrega para ele.',
    invalid_variant: 'Um produto precisa da escolha de quantidade ou sabor. Remova-o e adicione de novo pela página do produto.',
    unable_to_create_order: 'Não foi possível validar o pedido. Revise os produtos e tente novamente.',
    invalid_order_total: 'Não foi possível confirmar o valor do pedido. Seu carrinho foi mantido. Revise os produtos e tente novamente.',
    checkout_already_completed: 'Este pedido já foi concluído. Confira o status em Meus pedidos antes de realizar outro pagamento.',
    checkout_key_conflict: keyConflict,
    checkout_restart_required: 'Não foi possível retomar o pedido anterior. Seu carrinho foi mantido. Revise e tente de novo.',
    invalid_coupon: 'Este cupom não é válido. Confira se o código está correto ou se ele ainda está valendo. Você pode continuar sem ele.',
    coupon_minimum_not_reached: 'O valor mínimo para usar este cupom não foi atingido.',
    payment_provider_not_configured: 'O pagamento está temporariamente indisponível. Seu carrinho foi mantido. Tente novamente mais tarde.',
    payment_provider_credentials_invalid: 'O pagamento está temporariamente indisponível. Seu carrinho foi mantido. Tente novamente mais tarde.',
    payment_provider_request_rejected: 'Não foi possível gerar o pagamento. Confira seus dados. Seu carrinho foi mantido.',
    payment_provider_unavailable: providerUnavailable,
    network_error: 'Não foi possível conectar ao pagamento. Seu carrinho foi mantido. Verifique sua conexão e tente novamente.',
    invalid_payment_response: 'Não foi possível abrir o ambiente de pagamento. Seu carrinho foi mantido. Tente novamente.',
    internal_error: 'Não foi possível preparar o pagamento. Seu carrinho foi mantido. Tente novamente.',
    // Pagamento no próprio site (process-payment).
    already_paid: 'Este pedido já está pago. Confira em Minha conta.',
    payment_in_progress: 'Seu pagamento está sendo processado. Aguarde alguns segundos.',
    payment_in_review: 'Há um pagamento deste pedido em análise. Aguarde a resposta antes de pagar de novo.',
    pix_cancel_failed: 'Não conseguimos cancelar o Pix gerado. Pague pelo Pix ou aguarde ele vencer para usar o cartão.',
    other_order_paid: 'O Pix de outro pedido seu acabou de ser pago. Confira em Minha conta antes de pagar este pedido.',
    too_many_requests: 'Muitas tentativas seguidas. Aguarde alguns minutos e tente de novo.',
    rate_limit_unavailable: providerUnavailable,
    order_not_payable: 'Este pedido não pode mais ser pago. Confira em Minha conta.',
    order_expired: 'Este pedido expirou. Volte ao carrinho para gerar um novo.',
    order_not_found: keyConflict,
    attempt_conflict: keyConflict,
    invalid_payment_request: 'Confira os dados do pagamento e tente de novo.',
    card_brand_not_accepted: 'Este cartão não é aceito. Use Visa, Mastercard, Elo, American Express ou Hipercard, ou pague com Pix.',
};

export class CheckoutError extends Error {
    constructor(code, status = null, requestId = null, retryable = false) {
        super(Object.hasOwn(messages, code) ? messages[code] : messages.internal_error);
        this.name = 'CheckoutError';
        this.code = Object.hasOwn(messages, code) ? code : 'internal_error';
        this.status = status;
        // Only expose a generated diagnostic reference, never a raw server message.
        this.requestId = typeof requestId === 'string' && uuidPattern.test(requestId) ? requestId : null;
        // Only a network failure or an explicit server hint allows resending the same attempt.
        this.retryable = retryable === true;
    }
}

const connectionFailure = error => ['FunctionsFetchError', 'FunctionsRelayError', 'AuthRetryableFetchError', 'TypeError'].includes(error?.name);

async function currentSession(expectedUserId) {
    try {
        const { data, error } = await supabase.auth.getSession();
        if (error) throw new CheckoutError(connectionFailure(error) ? 'network_error' : 'authentication_required');
        let session = data?.session;
        if (!session?.access_token) throw new CheckoutError('authentication_required', 401);
        if (expectedUserId && session.user?.id !== expectedUserId) throw new CheckoutError('authentication_required', 401);
        if (session.expires_at && session.expires_at * 1000 - Date.now() < 60_000) {
            const refreshed = await supabase.auth.refreshSession();
            if (refreshed.error) throw new CheckoutError(connectionFailure(refreshed.error) ? 'network_error' : 'authentication_required');
            session = refreshed.data?.session;
            if (!session?.access_token) throw new CheckoutError('authentication_required', 401);
            if (expectedUserId && session.user?.id !== expectedUserId) throw new CheckoutError('authentication_required', 401);
        }
        return session;
    } catch (error) {
        if (error instanceof CheckoutError) throw error;
        throw new CheckoutError(connectionFailure(error) ? 'network_error' : 'authentication_required');
    }
}

async function invocationFailure(data, error) {
    let payload = data && typeof data === 'object' ? data : null;
    const response = error?.context;
    if (typeof response?.clone === 'function') {
        try {
            const parsed = await response.clone().json();
            if (parsed && typeof parsed === 'object') payload = parsed;
        } catch { /* Proxies and network failures do not always return JSON. */ }
    }
    const status = Number(response?.status) || Number(payload?.code) || null;
    const retryable = payload?.retryable === true || connectionFailure(error);
    if (status === 401 || payload?.error === 'authentication_required') {
        return new CheckoutError('authentication_required', 401, payload?.requestId);
    }
    if (typeof payload?.error === 'string' && Object.hasOwn(messages, payload.error)) {
        return new CheckoutError(payload.error, status, payload.requestId, retryable);
    }
    if (connectionFailure(error)) return new CheckoutError('network_error', status, payload?.requestId, true);
    if (status && status >= 500) return new CheckoutError('payment_provider_unavailable', status, payload?.requestId, retryable);
    return new CheckoutError('internal_error', status, payload?.requestId);
}

// A single invocation with the customer's own session. Never retried here.
async function invokeOnce(name, body, expectedUserId) {
    const session = await currentSession(expectedUserId);
    let result;
    try {
        result = await supabase.functions.invoke(name, {
            body,
            headers: { Authorization: `Bearer ${session.access_token}` },
        });
    } catch (error) {
        throw await invocationFailure(null, error);
    }
    const { data, error } = result || {};
    if (error || data?.error) throw await invocationFailure(data, error);
    if (!data || typeof data !== 'object') throw new CheckoutError('invalid_payment_response');
    return data;
}

const validInstallments = value => Number.isInteger(value) && value >= 1 && value <= 12;
const validAmount = value => typeof value === 'number' && Number.isFinite(value) && value > 0;

function brickCheckout(data) {
    const amount = Number(data?.amount);
    if (!publicKeyPattern.test(String(data?.publicKey || '')) || !validInstallments(data?.maxInstallments) || !validAmount(amount)) {
        throw new CheckoutError('invalid_payment_response');
    }
    return { publicKey: data.publicKey, maxInstallments: data.maxInstallments, amount };
}

// One request per attempt. The caller owns checkoutKey and must retain it on retry.
// This helper does not clear the cart, sign out, generate keys or retry a payment.
export async function prepareCheckout(body, { expectedUserId } = {}) {
    if (!uuidPattern.test(body?.checkoutKey || '')) throw new CheckoutError('invalid_cart', 400);
    const session = await currentSession(expectedUserId);
    let result;
    try {
        result = await supabase.functions.invoke('create-checkout', {
            body,
            headers: { Authorization: `Bearer ${session.access_token}` },
        });
    } catch (error) {
        throw await invocationFailure(null, error);
    }
    const { data, error } = result || {};
    if (error || data?.error) throw await invocationFailure(data, error);
    // Pagamento no próprio site: o navegador recebe só a Public Key, o valor (para exibir) e as parcelas.
    if (data?.paymentMode === 'brick') {
        if (!uuidPattern.test(data.orderId || '')) throw new CheckoutError('invalid_payment_response');
        return { orderId: data.orderId, paymentMode: 'brick', ...brickCheckout(data), requestId: uuidPattern.test(data.requestId || '') ? data.requestId : null };
    }
    if (data?.paymentMode !== undefined && data.paymentMode !== 'redirect') throw new CheckoutError('invalid_payment_response');
    if (!data?.paymentUrl) throw await invocationFailure(data, error);
    let paymentUrl;
    try { paymentUrl = new URL(data.paymentUrl); } catch { throw new CheckoutError('invalid_payment_response'); }
    const providerHost = paymentUrl.hostname === 'mercadopago.com.br' || paymentUrl.hostname.endsWith('.mercadopago.com.br');
    if (!uuidPattern.test(data.orderId || '') || paymentUrl.protocol !== 'https:' || !providerHost || paymentUrl.username || paymentUrl.password || paymentUrl.port) {
        throw new CheckoutError('invalid_payment_response');
    }
    return { ...data, paymentMode: 'redirect', paymentUrl: paymentUrl.href };
}

const PAYMENT_STATUSES = new Set(['approved', 'pending', 'in_process', 'authorized', 'rejected', 'cancelled', 'refunded', 'charged_back', 'in_mediation']);
const ORDER_PAYMENT_STATUSES = new Set(['paid', 'pending', 'failed', 'refunded', 'confirming']);
const ORDER_STATUSES = new Set(['awaiting_payment', 'paid', 'processing', 'shipped', 'delivered', 'cancelled']);
const detailPattern = /^[a-z0-9_]{1,60}$/;
const methodIdPattern = /^[a-z_]{2,30}$/;
const base64Pattern = /^[A-Za-z0-9+/]+={0,2}$/;
// eslint-disable-next-line no-control-regex
const controlCharacters = /[\u0000-\u001f\u007f]/;

function normalizePix(pix) {
    const qrCode = String(pix?.qrCode || '');
    const qrCodeBase64 = String(pix?.qrCodeBase64 || '').replace(/\s/g, '');
    if (qrCode.length < 20 || qrCode.length > 4096 || controlCharacters.test(qrCode)) throw new CheckoutError('invalid_payment_response');
    if (!base64Pattern.test(qrCodeBase64) || qrCodeBase64.length > 500_000) throw new CheckoutError('invalid_payment_response');
    const expires = Date.parse(pix?.expiresAt || '');
    // O prazo exibido é sempre o do Mercado Pago (date_of_expiration).
    return { qrCode, qrCodeBase64, expiresAt: Number.isFinite(expires) ? new Date(expires).toISOString() : null };
}

function normalizePayment(payment) {
    if (payment == null) return null;
    // 'other' = pagamento que chegou só pelo aviso do Mercado Pago (Checkout Pro).
    if (typeof payment !== 'object' || !PAYMENT_STATUSES.has(payment.status) || !['card', 'pix', 'other'].includes(payment.method)) {
        throw new CheckoutError('invalid_payment_response');
    }
    const installments = Number(payment.installments);
    return {
        attemptId: uuidPattern.test(payment.attemptId || '') ? payment.attemptId : null,
        method: payment.method,
        status: payment.status,
        statusDetail: detailPattern.test(payment.statusDetail || '') ? payment.statusDetail : '',
        paymentMethodId: methodIdPattern.test(payment.paymentMethodId || '') ? payment.paymentMethodId : '',
        installments: validInstallments(installments) ? installments : null,
        pix: payment.method === 'pix' && payment.status === 'pending' && payment.pix ? normalizePix(payment.pix) : null,
    };
}

function normalizeOrder(order) {
    if (!order || !ORDER_PAYMENT_STATUSES.has(order.paymentStatus) || (order.status != null && !ORDER_STATUSES.has(order.status))) {
        throw new CheckoutError('invalid_payment_response');
    }
    const total = Number(order.total);
    return { paymentStatus: order.paymentStatus, status: order.status || null, total: validAmount(total) ? total : null };
}

const requestReference = data => uuidPattern.test(data?.requestId || '') ? data.requestId : null;
// Por que o pedido não aceita pagamento novo agora (order_payment_state). null = pode, ou o servidor não informou.
const PAYMENT_BLOCK_REASONS = new Set(['already_paid', 'order_not_payable', 'order_expired', 'payment_in_review', 'payment_in_progress']);
const blockReason = value => PAYMENT_BLOCK_REASONS.has(value) ? value : null;

// Cria (ou repete, com a mesma attemptKey) uma tentativa de pagamento do pedido.
// Uma chamada só: a repetição é decisão da tela, e só depois de um erro "retryable".
export async function payOrder(body, { expectedUserId } = {}) {
    const validCard = body?.method !== 'card' || (body.card && typeof body.card === 'object');
    if (!uuidPattern.test(body?.orderId || '') || !uuidPattern.test(body?.attemptKey || '') || !['card', 'pix'].includes(body?.method) || !validCard) {
        throw new CheckoutError('invalid_payment_request', 400);
    }
    const request = { action: 'pay', orderId: body.orderId, attemptKey: body.attemptKey, method: body.method, ...(body.method === 'card' ? { card: body.card } : {}) };
    const data = await invokeOnce('process-payment', request, expectedUserId);
    const payment = normalizePayment(data.payment);
    if (!payment || data.orderId !== body.orderId) throw new CheckoutError('invalid_payment_response');
    return { orderId: data.orderId, payment, order: normalizeOrder(data.order), requestId: requestReference(data) };
}

// Situação do pedido no servidor: retoma um Pix aberto ou um cartão em análise e diz se dá para pagar aqui.
export async function orderPaymentStatus(orderId, { refresh = false, expectedUserId } = {}) {
    if (!uuidPattern.test(orderId || '')) throw new CheckoutError('invalid_payment_request', 400);
    const data = await invokeOnce('process-payment', { action: 'status', orderId, refresh: refresh === true }, expectedUserId);
    if (data.orderId !== orderId) throw new CheckoutError('invalid_payment_response');
    return {
        orderId,
        order: normalizeOrder(data.order),
        payment: normalizePayment(data.payment),
        checkout: data.checkout == null ? null : brickCheckout(data.checkout),
        reason: blockReason(data.reason),
        requestId: requestReference(data),
    };
}

// Cancela o Pix aberto do pedido (antes de alterar a entrega ou trocar de forma de pagamento).
export async function cancelPix(orderId, { expectedUserId } = {}) {
    if (!uuidPattern.test(orderId || '')) throw new CheckoutError('invalid_payment_request', 400);
    const data = await invokeOnce('process-payment', { action: 'cancel_pix', orderId }, expectedUserId);
    if (data.ok !== true) throw new CheckoutError('invalid_payment_response');
    return { ok: true, order: data.order ? normalizeOrder(data.order) : null };
}
