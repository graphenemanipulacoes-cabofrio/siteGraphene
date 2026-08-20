import React from 'react';
import { getWhatsAppUrl } from '../config';
import { MessageCircle, FileUp, ShieldCheck, Zap, Sparkles } from 'lucide-react';

const HeroSection = () => {
    const scrollToProducts = () => {
        const el = document.getElementById('produtos');
        if (el) el.scrollIntoView({ behavior: 'smooth' });
    };

    const scrollToReceita = () => {
        const el = document.getElementById('receita');
        if (el) el.scrollIntoView({ behavior: 'smooth' });
    };

    return (
        <section id="hero" className="store-hero-section">
            <div className="container">
                {/* Main Hero Showcase Box */}
                <div className="store-hero-banner-card">
                    <div className="hero-banner-grid">
                        {/* Left Side: Commercial Copy */}
                        <div className="hero-banner-copy">
                            <div className="store-badge">
                                <Sparkles size={14} />
                                <span>Linha Oficial Graphène • Nutrição & Magistral</span>
                            </div>

                            <h1 className="hero-banner-title">
                                Alta Performance, Saúde e Fórmulas em <span className="highlight-blue">Doses Exatas</span>.
                            </h1>

                            <p className="hero-banner-sub">
                                Whey Protein Isolado, Creatina Pura, Termogênicos e fórmulas manipuladas sob medida com laudos de cromatografia e pesagem computadorizada em Cabo Frio.
                            </p>

                            <div className="hero-banner-actions">
                                <a
                                    href={getWhatsAppUrl('Olá, vi os produtos no site da Graphène e gostaria de fazer um pedido.')}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="btn-buy-wa hero-action-btn"
                                >
                                    <MessageCircle size={18} />
                                    <span>Comprar no WhatsApp</span>
                                </a>

                                <button onClick={scrollToReceita} className="btn-cta-blue hero-action-btn">
                                    <FileUp size={18} />
                                    <span>Manipular Minha Receita</span>
                                </button>
                            </div>

                            <div className="hero-quick-perks">
                                <span><ShieldCheck size={15} color="var(--brand-green)" /> 100% Insumos com Laudo</span>
                                <span><Zap size={15} color="var(--brand-blue)" /> Despacho Rápido Nacional</span>
                            </div>
                        </div>

                        {/* Right Side: User's Official Panoramic Products Photo */}
                        <div className="hero-banner-image-wrap">
                            <img
                                src="/assets/graphene_banner_top.png"
                                alt="Linha de Produtos Graphène Manipulações"
                                className="hero-banner-photo"
                            />
                        </div>
                    </div>
                </div>
            </div>

            <style>{`
                .store-hero-section {
                    padding: 24px 0 40px;
                }

                .store-hero-banner-card {
                    background: linear-gradient(135deg, #090d15 0%, #0d131f 100%);
                    border: 1px solid var(--border-card);
                    border-radius: var(--radius-lg);
                    overflow: hidden;
                    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.6);
                }

                .hero-banner-grid {
                    display: grid;
                    grid-template-columns: 1fr 1.15fr;
                    gap: 32px;
                    align-items: center;
                }

                .hero-banner-copy {
                    padding: 48px 36px 48px 48px;
                    display: flex;
                    flex-direction: column;
                    gap: 16px;
                }

                .hero-banner-title {
                    font-size: clamp(2rem, 3.4vw, 3rem);
                    font-weight: 800;
                    line-height: 1.12;
                    letter-spacing: -0.025em;
                }

                .hero-banner-sub {
                    font-size: 1.05rem;
                    color: var(--text-dim);
                    line-height: 1.6;
                }

                .hero-banner-actions {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 12px;
                    margin-top: 8px;
                }

                .hero-action-btn {
                    padding: 14px 24px;
                    font-size: 0.9rem;
                }

                .hero-quick-perks {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 20px;
                    padding-top: 18px;
                    border-top: 1px solid var(--border-subtle);
                    font-size: 0.82rem;
                    color: var(--text-dim);
                }

                .hero-quick-perks span {
                    display: inline-flex;
                    align-items: center;
                    gap: 6px;
                }

                /* Image Wrap */
                .hero-banner-image-wrap {
                    position: relative;
                    height: 100%;
                    min-height: 380px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    overflow: hidden;
                    background: #000000;
                }

                .hero-banner-photo {
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                    display: block;
                    transition: transform 0.4s ease;
                }

                .store-hero-banner-card:hover .hero-banner-photo {
                    transform: scale(1.02);
                }

                @media (max-width: 1024px) {
                    .hero-banner-grid {
                        grid-template-columns: 1fr;
                    }
                    .hero-banner-copy {
                        padding: 36px 24px;
                    }
                    .hero-banner-image-wrap {
                        min-height: 280px;
                    }
                }

                @media (max-width: 640px) {
                    .hero-banner-title {
                        font-size: 1.85rem;
                    }
                    .hero-action-btn {
                        width: 100%;
                    }
                }
            `}</style>
        </section>
    );
};

export default HeroSection;
