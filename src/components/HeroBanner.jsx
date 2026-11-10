import { ArrowUpRight, FileUp, MessageCircle, ShoppingBag, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getWhatsAppUrl } from '../config';
import { PRESCRIPTION_PAGES_ENABLED } from '../data/publicChannels';

const HeroBanner = () => (
    <section className="premium-hero" aria-labelledby="store-hero-title">
        <div className="premium-hero-grid" aria-hidden="true" />
        <div className="premium-hero-banner">
            <img src="/assets/graphene_banner_top.webp" srcSet="/assets/graphene_banner_top-900.webp 900w, /assets/graphene_banner_top.webp 2048w" sizes="100vw" width="2048" height="768" alt="Linha de produtos Graphène Manipulações" className="premium-hero-image" fetchPriority="high" />
        </div>
        <div className="premium-hero-overlay" aria-hidden="true" />
        <div className="container premium-hero-inner">
            <div className="premium-hero-copy">
                <div className="premium-eyebrow"><span /> Manipulações · Cabo Frio</div>
                <h1 id="store-hero-title">Graphène.<br /><span>Atenção a cada detalhe.</span></h1>
                <p>Suplementos, vitaminas e cuidados com a pele, com atendimento farmacêutico em Cabo Frio e entrega para todo o Brasil.</p>
                <div className="hero-cta-row">
                    <a href="#produtos" className="btn-commerce hero-btn"><ShoppingBag size={18} /> Ver produtos <ArrowUpRight size={18} /></a>
                    {PRESCRIPTION_PAGES_ENABLED
                        ? <Link to="/receita" className="btn-cta-outline hero-btn"><FileUp size={18} /> Solicitar orçamento</Link>
                        : <a href={getWhatsAppUrl()} target="_blank" rel="noopener noreferrer" className="btn-cta-outline hero-btn"><MessageCircle size={18} /> Falar no WhatsApp</a>}
                </div>
                <div className="premium-hero-note"><ShieldCheck size={17} /><span>Atendimento farmacêutico em Cabo Frio, RJ.</span></div>
            </div>
        </div>
    </section>
);

export default HeroBanner;
