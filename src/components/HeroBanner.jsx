import { ArrowUpRight, FileUp, ShoppingBag, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';

const HeroBanner = () => (
    <section className="premium-hero" aria-labelledby="store-hero-title">
        <div className="premium-hero-grid" aria-hidden="true" />
        <div className="premium-hero-banner">
            <img src="/assets/graphene_banner_top.png" alt="Linha de produtos Graphène Manipulações" className="premium-hero-image" fetchPriority="high" />
        </div>
        <div className="premium-hero-overlay" aria-hidden="true" />
        <div className="container premium-hero-inner">
            <div className="premium-hero-copy">
                <div className="premium-eyebrow"><span /> Manipulações · Cabo Frio</div>
                <h1 id="store-hero-title">Graphène.<br /><span>Atenção a cada detalhe.</span></h1>
                <p>Conheça os produtos da nossa loja e conte com a equipe farmacêutica para prescrições e orçamentos de fórmulas individualizadas.</p>
                <div className="hero-cta-row">
                    <a href="#produtos" className="btn-commerce hero-btn"><ShoppingBag size={18} /> Ver produtos <ArrowUpRight size={18} /></a>
                    <Link to="/receita" className="btn-cta-outline hero-btn"><FileUp size={18} /> Solicitar orçamento</Link>
                </div>
                <div className="premium-hero-note"><ShieldCheck size={17} /><span>Atendimento farmacêutico em Cabo Frio, RJ.</span></div>
            </div>
        </div>
    </section>
);

export default HeroBanner;
