import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowDown, BadgeCheck, Check, CreditCard, FlaskConical, TicketPercent, Truck } from 'lucide-react';
import { useCoupon } from '../context/CouponContext';
import { couponSummary, partnerFirstName } from '../utils/couponDisplay';
import { money } from '../utils/commerce';
import { fetchPartnerAvatar } from '../lib/partnerAvatarApi';
import { PartnerAvatar } from './PartnerAvatar';
import '../styles/coupons.css';

// Faixa no topo da vitrine: mostra que o cupom desta visita (link da parceira ou digitado) está valendo.
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

// Página do link da parceira (/cupom/CODIGO): quem chega vê a foto e o nome dela (como num perfil),
// o desconto já aplicado e o caminho para as indicações dela. Só diz que a indicação é dela;
// nunca que ela usa ou recomenda um produto.
export function CouponLandingIntro({ code, hasPicks = false }) {
    const state = useCoupon() || {};
    // Só vale o que o servidor respondeu sobre o cupom deste link, não sobre um cupom anterior.
    const mine = state.code === code;
    const coupon = mine && state.coupon?.code === code ? state.coupon : null;
    const [avatar, setAvatar] = useState({ code: '', url: '' });
    useEffect(() => {
        if (!coupon) return undefined;
        let active = true;
        fetchPartnerAvatar(code).then(url => { if (active) setAvatar({ code, url }); });
        return () => { active = false; };
    }, [code, coupon]);
    if (mine && state.error && !state.checking) return <aside className="coupon-bar is-error" role="status">
        <div className="container coupon-bar-inner"><TicketPercent size={18} aria-hidden="true" /><p><strong>O cupom {code} não está disponível.</strong> Confira o código com quem indicou. Você pode comprar normalmente.</p></div>
    </aside>;
    const name = partnerFirstName(coupon?.partnerName);
    const percentage = coupon?.discountType === 'percentage';
    const big = !coupon ? '' : percentage ? `${coupon.discountValue}%` : money(coupon.discountValue);
    const go = target => event => {
        const element = document.getElementById(target);
        if (!element) return;
        event.preventDefault();
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };
    return <section className="coupon-landing" aria-labelledby="coupon-landing-title">
        <div className="container">
            <div className="cl-card">
                <div className="cl-profile">
                    <PartnerAvatar url={avatar.code === code ? avatar.url : ''} name={name || code} size={128} alt={name ? `Foto de ${name}` : ''} />
                    <span className="cl-eyebrow"><BadgeCheck size={14} aria-hidden="true" /> Indicação</span>
                    <h1 id="coupon-landing-title">{!coupon ? `Conferindo o cupom ${code}…` : name ? <>Seleção de <span>{name}</span></> : 'Você chegou com um cupom'}</h1>
                    {coupon && <p>{name ? `Os produtos que ${name} indica, ` : 'Produtos Graphène, '}com o desconto do cupom já aplicado e entrega para todo o Brasil.</p>}
                </div>
                {coupon && <div className="cl-ticket" role="group" aria-label={`Cupom ${coupon.code}`}>
                    <div className="cl-ticket-value"><strong>{big}</strong><span>{percentage ? 'de desconto' : 'de desconto na compra'}</span></div>
                    <div className="cl-ticket-info">
                        <span className="cl-ticket-code"><TicketPercent size={15} aria-hidden="true" /> {coupon.code}</span>
                        <strong><Check size={15} aria-hidden="true" /> Seu desconto já está aplicado.</strong>
                        <small>{couponSummary(coupon)}{percentage ? ' Os preços abaixo já aparecem com o desconto.' : ' O desconto entra no total da compra.'}</small>
                    </div>
                </div>}
                {coupon && <div className="cl-actions">
                    {hasPicks
                        ? <a className="cl-btn-main" href="#indicacoes" onClick={go('indicacoes')}>Ver as indicações <ArrowDown size={17} aria-hidden="true" /></a>
                        : <a className="cl-btn-main" href="#produtos" onClick={go('produtos')}>Ver os produtos <ArrowDown size={17} aria-hidden="true" /></a>}
                    <Link className="cl-btn-line" to="/produtos">Ver toda a loja</Link>
                </div>}
                <ul className="cl-trust" aria-label="Sobre a Graphène">
                    <li><FlaskConical size={15} aria-hidden="true" /> Farmácia de manipulação</li>
                    <li><Truck size={15} aria-hidden="true" /> Entrega em todo o Brasil</li>
                    <li><CreditCard size={15} aria-hidden="true" /> Pix ou cartão</li>
                </ul>
            </div>
        </div>
    </section>;
}
