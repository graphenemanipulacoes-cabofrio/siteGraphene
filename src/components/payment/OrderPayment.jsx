import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { CreditCard, LoaderCircle, QrCode } from 'lucide-react';
import { CheckoutError, orderPaymentStatus, payOrder } from '../../lib/checkoutApi';
import { ACCEPTED_CARDS_HINT, brickToPayBody } from '../../lib/brickPayment';
import { useOrderPaymentStatus } from '../../hooks/useOrderPaymentStatus';
import { isEmbeddedBrowser } from '../../utils/embeddedBrowser';
import { CONFIRMING_RESULT } from '../../utils/paymentMessages';
import { RESTART_RESULT, RETRY_LABELS, cardInputErrorToView, errorToView, pixStillValid, resultToView, retryAction, statusErrorToView, statusToView } from '../../utils/paymentViews';
import CardPayment from './CardPayment';
import PixPanel from './PixPanel';
import PaymentResult from './PaymentResult';
import '../../styles/payment.css';

const rememberOrder = orderId => {
    try { sessionStorage.setItem('graphene_payment_order', orderId); } catch { /* A página de retorno também recebe o pedido pelo endereço. */ }
};

// Pagamento do pedido no próprio site: Pix com tela própria (sem o SDK) e cartão de crédito pelo Payment Brick.
// Antes de mostrar qualquer forma de pagamento, consulta o servidor para retomar um Pix aberto ou um cartão em análise.
// Nunca leva o cliente para o site do Mercado Pago. As regras de cada tela ficam em utils/paymentViews.js.
// Telas abertas por um clique (view.focus) recebem o foco, para o leitor de tela e o teclado não se perderem.
export default function OrderPayment({ orderId, amount, checkout = null, initialStatus = null, customerId, payerEmail = '', payerDocument = '', mode = 'checkout', onPaid, onPixChange, onUnavailable, onRestart }) {
    const [view, setView] = useState({ name: 'loading' });
    const [config, setConfig] = useState(checkout || initialStatus?.checkout || null);
    const [openPix, setOpenPix] = useState(null);
    const [busy, setBusy] = useState(false);
    const [embedded] = useState(() => isEmbeddedBrowser());
    const lastRequest = useRef(null);
    const sending = useRef(false);
    const brickKey = useRef(0);
    const mounted = useRef(false);
    const focusRef = useRef(null);
    const callbacks = useRef({ onPaid, onPixChange, onUnavailable, onRestart });
    useEffect(() => { callbacks.current = { onPaid, onPixChange, onUnavailable, onRestart }; });
    useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
    useEffect(() => { if (view.focus) focusRef.current?.focus(); }, [view]);

    const paid = useCallback(() => {
        lastRequest.current = null;
        setOpenPix(null);
        setView({ name: 'paid' });
        callbacks.current.onPaid?.();
    }, []);
    // O pedido pode ser pago, mas não por aqui (o modo voltou para o Checkout Pro, por exemplo).
    const unavailable = useCallback(() => {
        if (mode === 'return' && callbacks.current.onUnavailable) { callbacks.current.onUnavailable(); return; }
        if (mode === 'checkout' && callbacks.current.onRestart) { setView({ name: 'result', result: RESTART_RESULT, retry: 'restart' }); return; }
        setView({ name: 'blocked', code: 'order_not_payable' });
    }, [mode]);
    const show = useCallback(next => {
        if (next.name === 'paid') { paid(); return; }
        if (next.name === 'unavailable') { unavailable(); return; }
        if (next.name === 'pix') { setOpenPix(next.openPix); setView({ name: 'pix', focus: Boolean(next.focus) }); return; }
        setView(next);
    }, [paid, unavailable]);

    const applyStatus = useCallback(status => {
        if (status.checkout) setConfig(status.checkout);
        show(statusToView(status, { mode }));
    }, [mode, show]);

    const hasCheckout = Boolean(checkout?.publicKey);
    const loadStatus = useCallback(async () => {
        try {
            const status = await orderPaymentStatus(orderId, { expectedUserId: customerId });
            if (mounted.current) applyStatus(status);
        } catch (error) {
            const failure = error instanceof CheckoutError ? error : new CheckoutError('internal_error');
            if (mounted.current) show(statusErrorToView(failure, { mode, hasCheckout }));
        }
    }, [orderId, customerId, applyStatus, show, mode, hasCheckout]);

    // A página de retorno já consultou o servidor e entrega o resultado (initialStatus); o checkout consulta aqui.
    const initial = useRef(initialStatus);
    useEffect(() => {
        const timer = setTimeout(() => {
            if (initial.current) { applyStatus(initial.current); initial.current = null; } else loadStatus();
        }, 0);
        return () => clearTimeout(timer);
    }, [applyStatus, loadStatus]);

    const reloadStatus = () => { setView({ name: 'loading' }); loadStatus(); };

    const handleResult = useCallback(result => {
        const next = resultToView(result, { amount });
        lastRequest.current = null;
        if (next.name === 'result' && result.payment?.method === 'pix') setOpenPix(null);
        show({ ...next, focus: true });
    }, [amount, show]);

    const handleError = useCallback((error, request) => {
        const next = errorToView(error, { method: request?.method });
        // A mesma chave só volta depois de "retryable"; qualquer outra resposta encerra a tentativa.
        if (!next.sameAttempt) lastRequest.current = null;
        show(next);
    }, [show]);

    const send = useCallback(async request => {
        if (sending.current) return;
        sending.current = true;
        setBusy(true);
        try {
            const result = await payOrder({ orderId, ...request }, { expectedUserId: customerId });
            if (mounted.current) handleResult(result);
        } catch (error) {
            if (mounted.current) handleError(error instanceof CheckoutError ? error : new CheckoutError('internal_error'), request);
        } finally {
            sending.current = false;
            if (mounted.current) setBusy(false);
        }
    }, [orderId, customerId, handleResult, handleError]);

    const poll = useOrderPaymentStatus(orderId, {
        active: Boolean(openPix) || view.name === 'confirming',
        expiresAt: openPix?.pix?.expiresAt || null,
        expectedUserId: customerId,
    });
    // A conferência no Mercado Pago mostrou este mesmo Pix cancelado ou vencido.
    const pixCancelled = Boolean(openPix?.attemptId) && poll.payment?.attemptId === openPix.attemptId && ['cancelled', 'rejected'].includes(poll.payment.status);

    // Cada clique em Pagar é uma tentativa nova, com chave nova. A mesma chave só volta depois de "retryable".
    const createPix = useCallback(() => {
        if (sending.current) return;
        const request = { method: 'pix', attemptKey: crypto.randomUUID() };
        lastRequest.current = request;
        rememberOrder(orderId);
        setOpenPix(null);
        setView({ name: 'pix-creating', focus: true });
        send(request);
    }, [orderId, send]);
    const startPix = useCallback(() => {
        if (openPix && !pixCancelled && pixStillValid(openPix.pix)) { setView({ name: 'pix', focus: true }); return; }
        createPix();
    }, [openPix, pixCancelled, createPix]);
    const openCard = useCallback(() => {
        brickKey.current += 1;
        setView({ name: 'card', key: brickKey.current, focus: true });
    }, []);
    const submitCard = useCallback(async ({ selectedPaymentMethod, formData } = {}) => {
        if (sending.current) return;
        let body;
        try {
            body = brickToPayBody(selectedPaymentMethod, formData, { maxInstallments: config?.maxInstallments });
        } catch (error) {
            show(cardInputErrorToView(error));
            return;
        }
        const request = { method: 'card', attemptKey: crypto.randomUUID(), card: body.card };
        lastRequest.current = request;
        rememberOrder(orderId);
        // O servidor cancela o Pix aberto antes de cobrar no cartão.
        setOpenPix(null);
        await send(request);
    }, [config, orderId, send, show]);

    const retry = () => {
        const action = retryAction(view, Boolean(lastRequest.current));
        if (action === 'resend') {
            if (lastRequest.current.method === 'pix') setView({ name: 'pix-creating', focus: true });
            send(lastRequest.current);
        } else if (action === 'pix') createPix();
        else if (action === 'card') openCard();
        else if (action === 'status') reloadStatus();
        else if (action === 'restart') callbacks.current.onRestart?.();
        else setView({ name: 'choose', notice: '' });
    };

    const isPaid = poll.paymentStatus === 'paid';
    const pixOpen = Boolean(openPix) && !pixCancelled && !isPaid;
    useEffect(() => { if (isPaid) callbacks.current.onPaid?.(); }, [isPaid]);
    useEffect(() => { callbacks.current.onPixChange?.(pixOpen); }, [pixOpen]);

    if (isPaid || view.name === 'paid') return <div className="pay-box"><PaymentResult result={{ kind: 'approved', title: 'Pagamento confirmado', text: 'Abrindo seu pedido…' }} /></div>;

    const embeddedHint = embedded && <p className="pay-hint">Neste app, o Pix costuma funcionar melhor. Se o formulário do cartão não abrir, use o Pix.</p>;
    const pixOption = <button key="pix" type="button" className="pay-method" onClick={startPix} disabled={busy}>
        <QrCode size={22} aria-hidden="true" /><span><strong>Pagar com Pix</strong><small>Você copia o código ou lê o QR no app do banco.</small></span>
    </button>;
    const cardOption = config && <button key="card" type="button" className="pay-method" onClick={openCard} disabled={busy}>
        <CreditCard size={22} aria-hidden="true" /><span><strong>Pagar com cartão de crédito</strong><small>Em até {config.maxInstallments}x. Os dados do cartão são digitados no ambiente seguro do Mercado Pago.</small></span>
    </button>;
    const signIn = <Link className="purchase-secondary" to="/entrar" state={{ returnTo: mode === 'return' ? `/pedido/retorno?pedido=${orderId}` : '/checkout' }}>Entrar novamente</Link>;

    let content;
    if (view.name === 'loading') content = <div className="pay-loading" role="status"><LoaderCircle className="spin" size={18} aria-hidden="true" /> Carregando o pagamento…</div>;
    else if (view.name === 'choose') content = <>
        {view.notice && <p className="pay-notice">{view.notice}</p>}
        <h3 className="pay-title">Escolha como pagar</h3>
        <div className="pay-methods">{embedded ? [pixOption, cardOption] : [cardOption, pixOption]}</div>
        {embeddedHint}
    </>;
    else if (view.name === 'pix-creating') content = <div className="pay-loading" role="status" tabIndex={-1} ref={focusRef}><LoaderCircle className="spin" size={18} aria-hidden="true" /> Gerando o Pix…</div>;
    else if (view.name === 'pix' && openPix) content = <PixPanel pix={openPix.pix} amount={amount} orderId={orderId} checking={poll.checking} warning={poll.warning} stopped={poll.stopped}
        cancelled={pixCancelled} renewing={busy} autoFocus={Boolean(view.focus)} onCheckNow={poll.checkNow} onRenew={createPix} onUseCard={config ? openCard : undefined} />;
    else if (view.name === 'card' && config) content = <>
        <h3 className="pay-title" tabIndex={-1} ref={focusRef}>Cartão de crédito</h3>
        <p className="pay-hint">{ACCEPTED_CARDS_HINT}</p>
        {embeddedHint}
        <CardPayment key={view.key} publicKey={config.publicKey} amount={amount} maxInstallments={config.maxInstallments} payerEmail={payerEmail} payerDocument={payerDocument}
            embedded={embedded} onSubmit={submitCard} onUsePix={startPix} />
        <div className="pay-switch">
            <button type="button" className="purchase-text-link" onClick={startPix} disabled={busy}>{pixOpen ? 'Voltar para o Pix' : 'Prefiro pagar com Pix'}</button>
        </div>
    </>;
    else if (view.name === 'confirming') content = <PaymentResult result={CONFIRMING_RESULT}>
        {poll.warning && <p className="pay-warning">{poll.warning}</p>}
        {poll.stopped && <p className="pay-notice">Ainda não recebemos a confirmação. Acompanhe em <Link to="/minha-conta">Minha conta</Link>. Não é preciso pagar de novo.</p>}
    </PaymentResult>;
    else if (view.name === 'result') content = <PaymentResult result={view.result} requestId={view.requestId} busy={busy}
        retryLabel={RETRY_LABELS[view.retry] || 'Tentar de novo'} onRetry={view.retry ? retry : undefined} onPix={view.result.kind === 'rejected' ? createPix : undefined}>
        {view.auth && signIn}
        {(view.result.kind === 'review' || view.account) && <Link className="purchase-secondary" to="/minha-conta">{view.account ? 'Ir para Minha conta' : 'Acompanhar em Minha conta'}</Link>}
    </PaymentResult>;
    else if (view.name === 'blocked') content = <PaymentResult result={{ kind: 'blocked', title: view.code === 'order_expired' ? 'Este pedido expirou' : 'Este pedido não pode ser pago aqui', text: new CheckoutError(view.code).message }}>
        <Link className="purchase-secondary" to={view.code === 'order_expired' ? '/carrinho' : '/minha-conta'}>{view.code === 'order_expired' ? 'Voltar ao carrinho' : 'Ir para Minha conta'}</Link>
    </PaymentResult>;
    else content = <PaymentResult result={{ kind: 'error', title: 'Não conseguimos carregar o pagamento', text: view.error?.message || new CheckoutError('internal_error').message }} onRetry={reloadStatus}>
        {view.error?.code === 'authentication_required' && signIn}
    </PaymentResult>;

    return <div className="pay-box">{content}</div>;
}
