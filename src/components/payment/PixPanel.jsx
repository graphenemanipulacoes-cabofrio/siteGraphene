import { useEffect, useRef, useState } from 'react';
import { Copy, LoaderCircle, QrCode, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { money } from '../../utils/commerce';
import { PIX_STEPS, formatCountdown, qrImageSource } from '../../utils/paymentMessages';
import { copyText } from '../../utils/clipboard';

const coarsePointer = () => {
    try { return Boolean(globalThis.matchMedia?.('(pointer: coarse)').matches); } catch { return false; }
};

// Tela própria do Pix: QR, copia e cola, prazo do Mercado Pago e espera pela confirmação.
// No celular o copia e cola vem primeiro; no computador, o QR. Aberto por um clique (autoFocus), o título recebe o foco.
export default function PixPanel({ pix, amount, orderId, checking = false, warning = '', stopped = false, cancelled = false, renewing = false, autoFocus = false, onCheckNow, onRenew, onUseCard }) {
    const [now, setNow] = useState(() => Date.now());
    const [coarse] = useState(coarsePointer);
    const [showQr, setShowQr] = useState(false);
    const codeRef = useRef(null);
    const titleRef = useRef(null);
    useEffect(() => { if (autoFocus) titleRef.current?.focus(); }, [autoFocus]);
    const expiresAt = Date.parse(pix?.expiresAt || '');
    const hasDeadline = Number.isFinite(expiresAt);
    const remaining = hasDeadline ? expiresAt - now : null;
    const expired = cancelled || (hasDeadline && remaining <= 0);

    useEffect(() => {
        if (!hasDeadline || expired) return undefined;
        const timer = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(timer);
    }, [hasDeadline, expired]);

    const selectCode = () => {
        codeRef.current?.focus();
        codeRef.current?.select();
    };
    // Alguns navegadores de app (WebView) não liberam a área de transferência: tenta a cópia do campo
    // e, sem ela, deixa o código selecionado para a pessoa copiar.
    const copy = async () => {
        const outcome = await copyText(pix?.qrCode || '', { fallback: () => { selectCode(); return document.execCommand('copy'); } });
        if (outcome === 'copied') { toast.success('Código copiado. Cole no app do seu banco.'); return; }
        selectCode();
        toast.message('Toque e segure no código para copiar.');
    };

    const reference = `Pedido #${String(orderId || '').slice(-8).toUpperCase()}`;
    const qr = <figure className="pay-pix-qr">
        <img src={qrImageSource(pix?.qrCodeBase64)} alt="QR code do Pix deste pedido" width="220" height="220" />
        <figcaption>Aponte a câmera do app do banco para o QR code.</figcaption>
    </figure>;
    const code = <div className="pay-pix-code">
        <label htmlFor={`pix-code-${orderId}`}>Pix copia e cola</label>
        <textarea id={`pix-code-${orderId}`} ref={codeRef} readOnly rows={coarse ? 4 : 3} value={pix?.qrCode || ''} onFocus={event => event.target.select()} />
        <button type="button" className="purchase-primary" onClick={copy}><Copy size={17} aria-hidden="true" /> Copiar código Pix</button>
    </div>;

    return <section className="pay-pix" aria-labelledby={`pix-title-${orderId}`}>
        <div className="pay-pix-head">
            <h3 id={`pix-title-${orderId}`} ref={titleRef} tabIndex={-1}>Pague com Pix</h3>
            <p><strong>{money(amount)}</strong><span>{reference}</span></p>
        </div>
        {expired ? <div className="pay-pix-expired" role="alert">
            <p>{cancelled ? 'Este Pix não vale mais. Gere outro para pagar.' : 'Este Pix venceu. Gere outro para pagar.'}</p>
            <button type="button" className="purchase-primary" onClick={onRenew} disabled={renewing}>{renewing ? <LoaderCircle className="spin" size={17} /> : <RefreshCw size={17} aria-hidden="true" />} Gerar novo Pix</button>
            {onUseCard && <button type="button" className="purchase-text-link" onClick={onUseCard}>Prefiro pagar com cartão</button>}
        </div> : <>
            {hasDeadline && <p className="pay-pix-timer">Vence em <b aria-hidden="true">{formatCountdown(remaining)}</b><span className="sr-only" aria-live="polite">{`Vence em ${Math.max(1, Math.ceil(remaining / 60_000))} minutos`}</span></p>}
            {coarse ? <>
                {code}
                <ol className="pay-pix-steps">{PIX_STEPS.map(step => <li key={step}>{step}</li>)}</ol>
                {showQr ? qr : <button type="button" className="purchase-text-link pay-pix-toggle" onClick={() => setShowQr(true)}><QrCode size={16} aria-hidden="true" /> Mostrar QR code (para pagar de outro aparelho)</button>}
            </> : <>
                {qr}
                {code}
                <ol className="pay-pix-steps">{PIX_STEPS.map(step => <li key={step}>{step}</li>)}</ol>
            </>}
            <div className="pay-pix-wait" role="status"><LoaderCircle className="spin" size={18} aria-hidden="true" /><span>{stopped ? 'Ainda não recebemos a confirmação. Se você já pagou, toque em Já paguei ou acompanhe em Minha conta.' : 'Aguardando o pagamento… Assim que o banco confirmar, esta tela muda sozinha.'}</span></div>
            {warning && <p className="pay-warning">{warning}</p>}
            <div className="pay-pix-actions">
                <button type="button" className="purchase-secondary" onClick={onCheckNow} disabled={checking}>{checking ? <LoaderCircle className="spin" size={17} /> : null} Já paguei</button>
                {onUseCard && <button type="button" className="purchase-text-link" onClick={onUseCard}>Prefiro pagar com cartão</button>}
            </div>
        </>}
    </section>;
}
