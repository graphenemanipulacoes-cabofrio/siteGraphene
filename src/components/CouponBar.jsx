import { TicketPercent } from 'lucide-react';
import { useCoupon } from '../context/CouponContext';
import { couponSummary, partnerFirstName } from '../utils/couponDisplay';
import '../styles/coupons.css';

// Faixa no topo da vitrine: mostra que o cupom do link ou da última visita já está valendo.
export default function CouponBar() {
    const coupon = useCoupon()?.coupon;
    if (!coupon) return null;
    const name = partnerFirstName(coupon.partnerName);
    return <aside className="coupon-bar" aria-label="Cupom aplicado">
        <div className="container coupon-bar-inner">
            <TicketPercent size={18} aria-hidden="true" />
            <p><strong>Cupom {coupon.code} aplicado.</strong> {couponSummary(coupon)}{name && ` Indicação de ${name}.`}</p>
        </div>
    </aside>;
}

// Abertura do link da parceira (/cupom/CODIGO): quem chega confirma de quem veio a indicação
// e que o desconto já está aplicado, antes de ver os produtos.
export function CouponLandingIntro({ code }) {
    const state = useCoupon() || {};
    // Só vale o que o servidor respondeu sobre o cupom deste link, não sobre um cupom anterior.
    const mine = state.code === code;
    const coupon = mine && state.coupon?.code === code ? state.coupon : null;
    if (mine && state.error && !state.checking) return <aside className="coupon-bar is-error" role="status">
        <div className="container coupon-bar-inner"><TicketPercent size={18} aria-hidden="true" /><p><strong>O cupom {code} não está disponível.</strong> Confira o código com quem indicou. Você pode comprar normalmente.</p></div>
    </aside>;
    const name = partnerFirstName(coupon?.partnerName);
    const percentage = coupon?.discountType === 'percentage';
    return <section className="coupon-landing" aria-labelledby="coupon-landing-title">
        <div className="container">
            <span className="coupon-landing-eyebrow">Graphène · Farmácia de manipulação em Cabo Frio</span>
            <h1 id="coupon-landing-title">{!coupon ? `Conferindo o cupom ${code}…` : <>{name ? `Indicação de ${name}.` : 'Você chegou com um cupom.'} <span>Seu desconto já está aplicado.</span></>}</h1>
            {coupon && <p className="coupon-landing-tag"><TicketPercent size={17} aria-hidden="true" /><span><strong>Cupom {coupon.code}:</strong> {couponSummary(coupon)}</span></p>}
            <p>Suplementos, vitaminas e cuidados com a pele, com atendimento farmacêutico e entrega para todo o Brasil.{coupon && (percentage ? ' Os preços abaixo já aparecem com o desconto.' : ' O desconto entra no total da compra.')}</p>
        </div>
    </section>;
}
