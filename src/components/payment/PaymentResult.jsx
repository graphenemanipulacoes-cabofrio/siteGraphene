import { useEffect, useRef } from 'react';
import { CheckCircle2, Clock3, LoaderCircle, RotateCcw, TriangleAlert, XCircle } from 'lucide-react';

const ICONS = { approved: CheckCircle2, review: Clock3, confirming: LoaderCircle, progress: Clock3, rejected: XCircle, retryable: TriangleAlert, blocked: TriangleAlert, error: TriangleAlert };
const CALM = new Set(['approved', 'review', 'confirming', 'progress']);

// Resultado do pagamento (cartão em análise, recusa, falha de conexão, pedido que não pode ser pago).
// O foco vai para o título, como nos avisos do checkout.
export default function PaymentResult({ result, requestId = null, busy = false, retryLabel = 'Tentar de novo', onRetry, onPix, children }) {
    const titleRef = useRef(null);
    useEffect(() => { titleRef.current?.focus(); }, [result?.title]);
    if (!result) return null;
    const Icon = ICONS[result.kind] || TriangleAlert;
    const calm = CALM.has(result.kind);
    return <section className={`pay-result is-${result.kind}`} role={calm ? 'status' : 'alert'}>
        <Icon size={28} aria-hidden="true" className={result.kind === 'confirming' ? 'spin' : undefined} />
        <h3 ref={titleRef} tabIndex={-1}>{result.title}</h3>
        <p>{result.text}</p>
        {requestId && <small>Referência para o suporte: {requestId}</small>}
        {(onRetry || onPix || children) && <div className="pay-result-actions">
            {onRetry && <button type="button" className="purchase-primary" onClick={onRetry} disabled={busy}>{busy ? <LoaderCircle className="spin" size={17} /> : <RotateCcw size={17} aria-hidden="true" />} {retryLabel}</button>}
            {onPix && <button type="button" className="purchase-secondary" onClick={onPix} disabled={busy}>Pagar com Pix</button>}
            {children}
        </div>}
    </section>;
}
