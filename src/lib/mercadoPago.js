// SDK do Mercado Pago (Payment Brick) carregado só quando o cliente escolhe cartão.
// Nunca importar '@mercadopago/sdk-react' no topo de um módulo: o Pix não usa o SDK,
// e as páginas são desenhadas em SSR nas verificações (verify-coupons-ui, verify-payment-ui).
export const publicKeyPattern = /^(APP_USR|TEST)-[A-Za-z0-9-]{10,}$/;

// Sem fingerprint (o script inline seria bloqueado pela CSP) e sem métricas de uso.
export const MERCADO_PAGO_OPTIONS = Object.freeze({ locale: 'pt-BR', advancedFraudPrevention: false, trackingDisabled: true });

export const SDK_URL = 'https://sdk.mercadopago.com/js/v2';
const SCRIPT_TIMEOUT = 20_000;
let loadingScript = null;

// Carrega o script do SDK pelo próprio site, com uma tag nova a cada tentativa e falha imediata no
// evento 'error'. O @mercadopago/sdk-js guarda para sempre a promessa que falhou; chamando-o só
// depois que window.MercadoPago existe, ele resolve na hora e o "Tentar de novo" volta a funcionar.
export function loadSdkScript({ doc = globalThis.document, win = globalThis.window, timeout = SCRIPT_TIMEOUT } = {}) {
    if (win?.MercadoPago) return Promise.resolve(win.MercadoPago);
    if (loadingScript) return loadingScript;
    const attempt = new Promise((resolve, reject) => {
        const parent = doc?.head || doc?.body;
        if (!parent || !win) { reject(new Error('sdk_unavailable')); return; }
        const script = doc.createElement('script');
        let timer = null;
        const finish = error => {
            clearTimeout(timer);
            script.removeEventListener('load', onLoad);
            script.removeEventListener('error', onError);
            if (!error) { resolve(win.MercadoPago); return; }
            script.remove?.();
            reject(error);
        };
        const onLoad = () => finish(win.MercadoPago ? null : new Error('sdk_unavailable'));
        const onError = () => finish(new Error('sdk_load_failed'));
        script.addEventListener('load', onLoad);
        script.addEventListener('error', onError);
        script.async = true;
        script.src = SDK_URL;
        timer = setTimeout(() => finish(new Error('sdk_timeout')), timeout);
        parent.appendChild(script);
    });
    loadingScript = attempt;
    attempt.then(() => { loadingScript = null; }, () => { loadingScript = null; });
    return attempt;
}

let currentKey = null;

export async function loadMercadoPago(publicKey) {
    if (!publicKeyPattern.test(String(publicKey || ''))) throw new Error('invalid_public_key');
    await loadSdkScript();
    const sdk = await import('@mercadopago/sdk-react');
    if (currentKey !== publicKey) {
        sdk.initMercadoPago(publicKey, { ...MERCADO_PAGO_OPTIONS });
        currentKey = publicKey;
    }
    return sdk;
}
