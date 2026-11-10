import { useEffect, useRef } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import HomePage from './HomePage';
import { useCoupon } from '../context/CouponContext';
import { normalizeCoupon } from '../lib/couponsApi';

// Link da parceira: /cupom/CODIGO abre a loja com o cupom aplicado e a seleção dela.
export default function CouponLandingPage() {
    const { code: param } = useParams();
    const { code, apply } = useCoupon();
    const wanted = normalizeCoupon(param).trim();
    const valid = /^[A-Z0-9_-]{3,40}$/.test(wanted);
    const applied = useRef('');

    // Aplica uma vez por link: se a pessoa trocar o cupom depois, a escolha dela vale.
    useEffect(() => {
        if (!valid || applied.current === wanted) return;
        applied.current = wanted;
        if (code !== wanted) apply(wanted);
    }, [valid, wanted, code, apply]);

    if (!valid) return <Navigate to="/" replace />;
    return <HomePage landingCode={wanted} />;
}
