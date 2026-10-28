import { useId } from 'react';
import { Check, LoaderCircle, TicketPercent } from 'lucide-react';
import { useCoupon } from '../context/CouponContext';
import { couponRate, normalizeCoupon, percentLabel } from '../lib/couponsApi';
import { money } from '../utils/commerce';
import '../styles/coupons.css';

// Cupom de influencer no topo da página do produto: funciona sem login e
// mostra na hora o desconto deste produto. O mesmo cupom segue para o carrinho.
export default function ProductCoupon({ productId }) {
    const { code, draft, edit, coupon, checking, error, apply, remove } = useCoupon();
    const id = useId();
    const query = draft.trim();
    const rate = couponRate(coupon, productId);
    const special = coupon?.productRates?.some(item => String(item.productId) === String(productId));
    const submit = event => { event.preventDefault(); if (query.length >= 3 && !checking) apply(query); };

    return <section className={`product-coupon${coupon ? ' is-applied' : ''}`} aria-labelledby={`${id}-title`}>
        <div className="product-coupon-head">
            <span className="product-coupon-icon"><TicketPercent size={22} aria-hidden="true" /></span>
            <div>
                <h2 id={`${id}-title`}>{coupon ? `Cupom ${coupon.code} aplicado` : 'Tem cupom de influencer?'}</h2>
                <p>{coupon
                    ? rate > 0 ? <>Você ganhou <strong>{percentLabel(rate)} de desconto</strong> neste produto{special ? ' (desconto especial)' : ''}. Indicação de {coupon.partnerName}.</>
                        : <>Você ganhou <strong>{money(coupon.discountValue)} de desconto</strong> no total da compra. Indicação de {coupon.partnerName}.</>
                    : 'Digite o cupom aqui e veja na hora o preço com desconto.'}</p>
            </div>
        </div>
        {coupon ? <div className="product-coupon-applied">
            <Check size={18} aria-hidden="true" /><span>O desconto já vai junto para o carrinho.</span>
            <button type="button" onClick={remove}>Trocar cupom</button>
        </div> : <form className="product-coupon-form" onSubmit={submit}>
            <label className="product-coupon-hidden" htmlFor={`${id}-input`}>Código do cupom</label>
            <input id={`${id}-input`} value={draft} onChange={event => edit(normalizeCoupon(event.target.value))} placeholder="DIGITE SEU CUPOM"
                maxLength={40} autoComplete="off" autoCorrect="off" autoCapitalize="characters" spellCheck={false} aria-describedby={`${id}-status`} />
            <button type="submit" disabled={query.length < 3 || checking} aria-busy={checking}>
                {checking ? <LoaderCircle size={17} className="spin" aria-label="Validando cupom" /> : 'Aplicar'}
            </button>
        </form>}
        <div id={`${id}-status`} aria-live="polite">
            {checking && <p className="product-coupon-note">Validando {code}…</p>}
            {error && !checking && <p className="product-coupon-note is-error" role="alert">{error}</p>}
        </div>
    </section>;
}
