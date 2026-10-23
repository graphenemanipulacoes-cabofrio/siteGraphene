import { useState } from 'react';
import { Truck, LoaderCircle, Gift } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { money } from '../utils/commerce';
import { cleanZip, deliveryText, formatZip, useShippingQuote } from '../utils/shipping';

// Calculadora de frete e prazo pelo CEP (produto e carrinho).
export function ShippingEstimator({ subtotal, compact = false }) {
    const { zip, setZip } = useStore();
    const [draft, setDraft] = useState(zip);
    const { quote, error, loading } = useShippingQuote(zip, subtotal);
    const text = deliveryText(quote);
    const submit = event => {
        event.preventDefault();
        setZip(draft);
    };
    return <div className={`ship-box${compact ? ' is-compact' : ''}`}>
        <form className="ship-form" onSubmit={submit}>
            <label htmlFor={compact ? 'ship-zip-cart' : 'ship-zip'}>Calcular frete e prazo</label>
            <div className="ship-row">
                <input id={compact ? 'ship-zip-cart' : 'ship-zip'} inputMode="numeric" autoComplete="postal-code" placeholder="Seu CEP" maxLength={9} value={formatZip(draft)} onChange={event => setDraft(cleanZip(event.target.value))} />
                <button type="submit" disabled={cleanZip(draft).length !== 8}>Calcular</button>
            </div>
            <a href="https://buscacepinter.correios.com.br/app/endereco/index.php" target="_blank" rel="noreferrer">Não sei meu CEP</a>
        </form>
        <div aria-live="polite">
            {loading && <p className="ship-status"><LoaderCircle size={15} className="spin" aria-hidden="true" /> Calculando…</p>}
            {error && <p className="ship-status is-error">{error}</p>}
            {text && <div className="ship-result">
                <Truck size={18} aria-hidden="true" />
                <div><strong>{text.title}</strong>{text.detail && <span>{text.detail}</span>}</div>
                <b>{text.price || money(quote.amount)}</b>
            </div>}
        </div>
    </div>;
}

// Aviso de frete grátis a partir de um valor (definido no painel admin).
export function FreeShippingProgress({ subtotal, freeMin }) {
    const minimum = Number(freeMin);
    if (!(minimum > 0)) return null;
    const reached = subtotal >= minimum;
    const percent = Math.min(100, Math.round((subtotal / minimum) * 100));
    return <div className={`free-ship${reached ? ' is-reached' : ''}`}>
        <p><Gift size={16} aria-hidden="true" /> {reached ? <>Seu pedido tem <strong>frete grátis</strong>.</> : <>Faltam <strong>{money(minimum - subtotal)}</strong> para ganhar frete grátis.</>}</p>
        <div className="free-ship-bar" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent} aria-label="Progresso até o frete grátis"><span style={{ width: `${percent}%` }} /></div>
        <small>Frete grátis em compras a partir de {money(minimum)}, exceto na entrega local da Região dos Lagos, que é combinada com a equipe.</small>
    </div>;
}
