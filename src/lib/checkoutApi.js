import { supabase } from './supabaseClient';

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const messages = {
    authentication_required: 'Sua sessão expirou. Entre novamente para continuar. Seu carrinho foi mantido.',
    invalid_document: 'Confira o CPF informado.',
    invalid_cart: 'Revise as quantidades no carrinho. O limite é de 20 unidades por produto.',
    invalid_shipping: 'Confira os dados de entrega.',
    invalid_shipping_address: 'Confira os dados de entrega.',
    invalid_or_unpriced_product: 'Um dos produtos não tem preço para compra. Revise o carrinho.',
    invalid_shipping_zip: 'Confira o CEP: não conseguimos calcular a entrega para ele.',
    invalid_variant: 'Um produto precisa da escolha de quantidade ou sabor. Remova-o e adicione de novo pela página do produto.',
    unable_to_create_order: 'Não foi possível validar o pedido. Revise os produtos e tente novamente.',
    invalid_order_total: 'Não foi possível confirmar o valor do pedido. Seu carrinho foi mantido. Revise os produtos e tente novamente.',
    checkout_already_completed: 'Este pedido já foi concluído. Confira o status em Meus pedidos antes de realizar outro pagamento.',
    checkout_key_conflict: 'Não foi possível recuperar esta tentativa de compra. Seu carrinho foi mantido. Recarregue a página e confira o pedido antes de continuar.',
    invalid_coupon: 'Este cupom não está disponível. Confira o código ou continue sem ele.',
    coupon_minimum_not_reached: 'O valor mínimo para usar este cupom não foi atingido.',
    payment_provider_not_configured: 'O pagamento está temporariamente indisponível. Seu carrinho foi mantido. Tente novamente mais tarde.',
    payment_provider_credentials_invalid: 'O pagamento está temporariamente indisponível. Seu carrinho foi mantido. Tente novamente mais tarde.',
    payment_provider_request_rejected: 'Não foi possível gerar o pagamento. Confira seus dados. Seu carrinho foi mantido.',
    payment_provider_unavailable: 'O Mercado Pago está temporariamente indisponível. Seu carrinho foi mantido. Tente novamente em instantes.',
    network_error: 'Não foi possível conectar ao pagamento. Seu carrinho foi mantido. Verifique sua conexão e tente novamente.',
    invalid_payment_response: 'Não foi possível abrir o ambiente de pagamento. Seu carrinho foi mantido. Tente novamente.',
    internal_error: 'Não foi possível preparar o pagamento. Seu carrinho foi mantido. Tente novamente.',
};

export class CheckoutError extends Error {
    constructor(code, status = null, requestId = null) {
        super(Object.hasOwn(messages, code) ? messages[code] : messages.internal_error);
        this.name = 'CheckoutError';
        this.code = Object.hasOwn(messages, code) ? code : 'internal_error';
        this.status = status;
        // Only expose a generated diagnostic reference, never a raw server message.
        this.requestId = typeof requestId === 'string' && uuidPattern.test(requestId) ? requestId : null;
    }
}

const connectionFailure = error => ['FunctionsFetchError', 'FunctionsRelayError', 'AuthRetryableFetchError', 'TypeError'].includes(error?.name);

async function currentSession() {
    try {
        const { data, error } = await supabase.auth.getSession();
        if (error) throw new CheckoutError(connectionFailure(error) ? 'network_error' : 'authentication_required');
        let session = data?.session;
        if (!session?.access_token) throw new CheckoutError('authentication_required', 401);
        if (session.expires_at && session.expires_at * 1000 - Date.now() < 60_000) {
            const refreshed = await supabase.auth.refreshSession();
            if (refreshed.error) throw new CheckoutError(connectionFailure(refreshed.error) ? 'network_error' : 'authentication_required');
            session = refreshed.data?.session;
            if (!session?.access_token) throw new CheckoutError('authentication_required', 401);
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
    if (status === 401 || payload?.error === 'authentication_required') {
        return new CheckoutError('authentication_required', 401, payload?.requestId);
    }
    if (typeof payload?.error === 'string' && Object.hasOwn(messages, payload.error)) {
        return new CheckoutError(payload.error, status, payload.requestId);
    }
    if (connectionFailure(error)) return new CheckoutError('network_error', status, payload?.requestId);
    if (status && status >= 500) return new CheckoutError('payment_provider_unavailable', status, payload?.requestId);
    return new CheckoutError('internal_error', status, payload?.requestId);
}

// One request per attempt. The caller owns checkoutKey and must retain it on retry.
// This helper does not clear the cart, sign out, generate keys or retry a payment.
export async function prepareCheckout(body) {
    if (!uuidPattern.test(body?.checkoutKey || '')) throw new CheckoutError('invalid_cart', 400);
    const session = await currentSession();
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
    if (error || data?.error || !data?.paymentUrl) throw await invocationFailure(data, error);
    let paymentUrl;
    try { paymentUrl = new URL(data.paymentUrl); } catch { throw new CheckoutError('invalid_payment_response'); }
    const providerHost = paymentUrl.hostname === 'mercadopago.com.br' || paymentUrl.hostname.endsWith('.mercadopago.com.br');
    if (!uuidPattern.test(data.orderId || '') || paymentUrl.protocol !== 'https:' || !providerHost || paymentUrl.username || paymentUrl.password || paymentUrl.port) {
        throw new CheckoutError('invalid_payment_response');
    }
    return { ...data, paymentUrl: paymentUrl.href };
}
