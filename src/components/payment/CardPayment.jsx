import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { LoaderCircle, RotateCcw } from 'lucide-react';
import { loadMercadoPago } from '../../lib/mercadoPago';
import { validCpf } from '../../utils/commerce';

const READY_TIMEOUT = 25_000;
// As funções padrão do sdk-react registram no console o BIN e as etapas do formulário.
const silent = () => {};
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Cartão de crédito pelo Payment Brick do Mercado Pago. Número, validade e CVV ficam nos campos
// seguros do Mercado Pago; o site recebe só o token, a bandeira, as parcelas e o documento do titular.
// O SDK é carregado aqui, sob demanda (nunca no topo do módulo).
export default function CardPayment({ publicKey, amount, maxInstallments = 12, payerEmail = '', payerDocument = '', embedded = false, onSubmit, onUsePix }) {
    const [sdk, setSdk] = useState(null);
    const [failed, setFailed] = useState(false);
    const [ready, setReady] = useState(false);
    const [attempt, setAttempt] = useState(0);
    const submitRef = useRef(onSubmit);
    useEffect(() => { submitRef.current = onSubmit; }, [onSubmit]);

    useEffect(() => {
        let active = true;
        loadMercadoPago(publicKey).then(module => { if (active) setSdk(module); }).catch(() => { if (active) setFailed(true); });
        return () => { active = false; };
    }, [publicKey, attempt]);

    // O script do SDK que não carrega falha na hora (loadMercadoPago, com uma tag nova a cada tentativa).
    // Carregado, mas sem resposta do Brick (navegador de app, rede): mensagem amigável com o Pix depois do prazo.
    useEffect(() => {
        if (!sdk || ready || failed) return undefined;
        const timer = setTimeout(() => setFailed(true), READY_TIMEOUT);
        return () => clearTimeout(timer);
    }, [sdk, ready, failed, attempt]);

    // Objetos e funções estáveis: o <Payment> remonta quando eles mudam.
    const initialization = useMemo(() => {
        const cpf = String(payerDocument || '').replace(/\D/g, '');
        // O titular do cartão pode trocar o CPF sugerido.
        const payer = {
            ...(emailPattern.test(payerEmail || '') ? { email: payerEmail } : {}),
            ...(validCpf(cpf) ? { identification: { type: 'CPF', number: cpf } } : {}),
        };
        // O valor aqui é só para exibir; o servidor cobra o total gravado no pedido.
        return { amount: Number(amount), ...(Object.keys(payer).length ? { payer } : {}) };
    }, [amount, payerEmail, payerDocument]);
    const customization = useMemo(() => ({
        paymentMethods: { creditCard: 'all', maxInstallments },
        visual: { style: { theme: 'default' } },
    }), [maxInstallments]);
    const onReady = useCallback(() => setReady(true), []);
    const onError = useCallback(error => { if (error?.type === 'critical') setFailed(true); }, []);
    // Sempre resolve: o resultado aparece na tela própria do site, e não no Brick.
    const handleSubmit = useCallback(data => Promise.resolve().then(() => submitRef.current?.(data)).then(() => undefined, () => undefined), []);

    const retry = () => { setFailed(false); setReady(false); setSdk(null); setAttempt(current => current + 1); };
    const Payment = sdk?.Payment;

    if (failed) return <div className="pay-card-error" role="alert">
        <p><strong>Não conseguimos abrir o pagamento com cartão agora.</strong> {embedded ? 'Neste app, o Pix costuma funcionar melhor. Se preferir o cartão, abra o site no navegador do celular.' : 'Tente de novo ou pague com Pix.'}</p>
        <div className="pay-result-actions">
            <button type="button" className="purchase-secondary" onClick={retry}><RotateCcw size={17} aria-hidden="true" /> Tentar de novo</button>
            {onUsePix && <button type="button" className="purchase-primary" onClick={onUsePix}>Pagar com Pix</button>}
        </div>
    </div>;

    return <div className="pay-card">
        {!ready && <div className="pay-card-loading" role="status"><LoaderCircle className="spin" size={18} aria-hidden="true" /> Carregando o formulário do cartão…</div>}
        {Payment && <Payment key={attempt} initialization={initialization} customization={customization} locale="pt-BR"
            onSubmit={handleSubmit} onReady={onReady} onError={onError} onBinChange={silent}
            onRenderNextStep={silent} onRenderPreviousStep={silent} onClickEditShippingData={silent} onClickEditBillingData={silent} />}
    </div>;
}
