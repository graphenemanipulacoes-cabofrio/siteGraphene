import React from 'react';
import { getWhatsAppUrl } from '../config';
import { MessageCircle, FileUp, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';

const HeroBanner = () => {
    return (
        <section className="hero-fullwidth">
            <div className="hero-fullwidth-inner">
                {/* Imagem full-width panorâmica */}
                <img
                    src="/assets/graphene_banner_top.png"
                    alt="Linha de Produtos Graphène Manipulações"
                    className="hero-bg-img"
                />

                {/* Overlay gradiente dinâmico */}
                <div className="hero-overlay" />

                {/* Conteúdo textual */}
                <div className="hero-content-positioned">
                    <div className="hero-text-block">
                        <div className="store-badge hero-store-badge">
                            <Sparkles size={14} />
                            <span>Linha Oficial Graphène</span>
                        </div>

                        <h1>
                            Fórmulas de <span className="highlight-blue">Alta Precisão</span> para sua Saúde e Performance.
                        </h1>

                        <p>
                            Whey Protein Isolado, Creatina Pura, Termogênicos e fórmulas manipuladas sob medida com laudos de cromatografia — direto do nosso laboratório em Cabo Frio.
                        </p>

                        <div className="hero-cta-row">
                            <a
                                href={getWhatsAppUrl('Olá, vi os produtos no site da Graphène e gostaria de fazer um pedido.')}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="btn-buy-wa hero-btn"
                            >
                                <MessageCircle size={18} />
                                <span>Comprar no WhatsApp</span>
                            </a>
                            <Link to="/receita" className="btn-cta-blue hero-btn">
                                <FileUp size={18} />
                                <span>Manipular Receita</span>
                            </Link>
                        </div>
                    </div>
                </div>
            </div>

            <style>{`
                .hero-fullwidth {
                    width: 100%;
                    position: relative;
                    overflow: hidden;
                    background: #040508;
                }

                .hero-fullwidth-inner {
                    position: relative;
                    width: 100%;
                    min-height: 520px;
                    max-height: 600px;
                    display: flex;
                    align-items: center;
                }

                .hero-bg-img {
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                    object-position: 80% center;
                    display: block;
                }

                .hero-overlay {
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 65%;
                    height: 100%;
                    background: linear-gradient(90deg,
                        rgba(7, 9, 14, 0.96) 0%,
                        rgba(7, 9, 14, 0.88) 40%,
                        rgba(7, 9, 14, 0.5) 70%,
                        rgba(7, 9, 14, 0) 100%
                    );
                    z-index: 1;
                }

                .hero-content-positioned {
                    position: relative;
                    z-index: 2;
                    width: 100%;
                    max-width: var(--container-max);
                    margin: 0 auto;
                    padding: 60px 20px;
                }

                .hero-text-block {
                    max-width: 540px;
                    display: flex;
                    flex-direction: column;
                    gap: 16px;
                }

                .hero-text-block h1 {
                    font-size: clamp(1.85rem, 3.8vw, 3rem);
                    font-weight: 800;
                    line-height: 1.15;
                    letter-spacing: -0.03em;
                }

                .hero-text-block p {
                    font-size: 1rem;
                    color: var(--text-dim);
                    line-height: 1.6;
                }

                .hero-cta-row {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 12px;
                    margin-top: 6px;
                }

                .hero-btn {
                    padding: 14px 26px;
                    font-size: 0.9rem;
                }

                @media (max-width: 960px) {
                    .hero-bg-img {
                        object-position: 75% top;
                    }
                    .hero-overlay {
                        width: 100%;
                        background: linear-gradient(180deg,
                            rgba(7,9,14,0.3) 0%,
                            rgba(7,9,14,0.75) 40%,
                            rgba(7,9,14,0.96) 80%,
                            rgba(7,9,14,0.98) 100%
                        );
                    }
                    .hero-fullwidth-inner {
                        min-height: 480px;
                        max-height: none;
                    }
                    .hero-content-positioned {
                        padding: 120px 16px 40px;
                        display: flex;
                        align-items: flex-end;
                    }
                    .hero-text-block {
                        max-width: 100%;
                    }
                }

                @media (max-width: 600px) {
                    .hero-content-positioned {
                        padding: 140px 16px 36px;
                    }
                    .hero-text-block h1 {
                        font-size: clamp(1.65rem, 6.5vw, 2.2rem);
                    }
                    .hero-text-block p {
                        font-size: 0.92rem;
                    }
                    .hero-cta-row {
                        flex-direction: column;
                        width: 100%;
                    }
                    .hero-btn {
                        width: 100%;
                        justify-content: center;
                    }
                }
            `}</style>
        </section>
    );
};

export default HeroBanner;
