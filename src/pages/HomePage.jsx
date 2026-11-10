import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import Header from '../components/Header';
import HeroBanner from '../components/HeroBanner';
import BenefitsBar from '../components/BenefitsBar';
import ProductGrid from '../components/ProductGrid';
import AuthenticityRibbon from '../components/AuthenticityRibbon';
import CouponBar, { CouponLandingIntro } from '../components/CouponBar';
import HomeBanners from '../components/HomeBanners';
import Footer from '../components/Footer';
import FloatingWhatsApp from '../components/FloatingWhatsApp';
import { Toaster } from 'sonner';
import { useCoupon } from '../context/CouponContext';
import { fetchShowcase } from '../lib/showcaseApi';
import { partnerFirstName } from '../utils/couponDisplay';
import { PRESCRIPTION_PAGES_ENABLED } from '../data/publicChannels';

// Produtos que a parceira do cupom aplicado escolheu destacar (pode não haver nenhum).
function useShowcase(code) {
    const [loaded, setLoaded] = useState({ code: '', ids: [] });
    useEffect(() => {
        if (!code) return undefined;
        let active = true;
        fetchShowcase(code).then(ids => { if (active) setLoaded({ code, ids }); });
        return () => { active = false; };
    }, [code]);
    return loaded.code === code ? loaded.ids : [];
}

// landingCode: código vindo do link da parceira (/cupom/CODIGO). A página troca o banner
// pela confirmação da indicação e mostra primeiro os produtos que ela destacou.
const HomePage = ({ landingCode = '' }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const { hash } = useLocation();
    const couponState = useCoupon() || {};
    const { coupon } = couponState;
    const showcase = useShowcase(coupon?.code || '');
    const landing = Boolean(landingCode);
    // Cupom do link recusado: a loja aparece completa, com o aviso no topo.
    const landingFailed = landing && couponState.code === landingCode && Boolean(couponState.error) && !couponState.checking;
    const name = partnerFirstName(coupon?.partnerName);
    const featured = coupon && showcase.length
        ? { ids: showcase, eyebrow: `Com o cupom ${coupon.code}`, title: name ? `Escolhas de ${name}` : 'Produtos em destaque' }
        : null;

    // Links como "/#produtos" vindos de outras páginas levam direto à seção.
    useEffect(() => {
        if (!hash) return undefined;
        const timer = setTimeout(() => document.getElementById(decodeURIComponent(hash.slice(1)))?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80);
        return () => clearTimeout(timer);
    }, [hash]);

    return (
        <div className="page-root">
            <Toaster position="top-right" richColors />
            <Header showSearch onSearchChange={setSearchTerm} searchTerm={searchTerm} />
            <main>
                {landing ? <CouponLandingIntro code={landingCode} /> : <CouponBar />}
                {(!landing || landingFailed) && <HeroBanner />}
                {!landing && <BenefitsBar />}
                <ProductGrid searchTerm={searchTerm} featured={featured} />
                <HomeBanners />
                {landing && <BenefitsBar />}
                {PRESCRIPTION_PAGES_ENABLED && <AuthenticityRibbon />}
            </main>
            <Footer />
            <FloatingWhatsApp />
        </div>
    );
};

export default HomePage;
