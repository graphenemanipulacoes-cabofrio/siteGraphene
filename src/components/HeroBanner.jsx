import React from 'react';
import { getWhatsAppUrl } from '../config';
import { MessageCircle, FileUp, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';

const HeroBanner = () => {
    return (
        <section className="hero-fullwidth">
            <div className="hero-fullwidth-inner">
                {/* Imagem do usuário como fundo full-width */}
                <img
                    src="/assets/graphene_banner_top.png"
                    alt="Linha de Produtos Graphène Manipulações"
                    className="hero-bg-img"
                />

                {/* Overlay gradiente da esquerda pro texto */}
                <div className="hero-overlay" />

                {/* Texto posicionado à esquerda */}
                <div className="hero-content-positioned">
                    <div className="hero-text-block">
                        <div className="store-badge">
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
                                <span>Manipular Minha Receita</span>
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
                    background: #000;
                }

                .hero-fullwidth-inner {
                    position: relative;
                    width: 100%;
                    min-height: 520px;
                    max-height: 620px;
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
                    object-position: right center;
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
                    padding: 60px 40px;
                }

                .hero-text-block {
                    max-width: 540px;
                    display: flex;
                    flex-direction: column;
                    gap: 16px;
                }

                .hero-text-block h1 {
                    font-size: clamp(2rem, 3.8vw, 3.2rem);
                    font-weight: 800;
                    line-height: 1.1;
                    letter-spacing: -0.03em;
                }

                .hero-text-block p {
                    font-size: 1.05rem;
                    color: var(--text-dim);
                    line-height: 1.6;
                }

                .hero-cta-row {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 12px;
                    margin-top: 8px;
                }

                .hero-btn {
                    padding: 15px 28px;
                    font-size: 0.92rem;
                }

                @media (max-width: 768px) {
                    .hero-fullwidth-inner {
                        min-height: 440px;
                    }
                    .hero-overlay {
                        width: 100%;
                        background: linear-gradient(180deg,
                            rgba(7,9,14,0.5) 0%,
                            rgba(7,9,14,0.85) 50%,
                            rgba(7,9,14,0.96) 100%
                        );
                    }
                    .hero-content-positioned {
                        padding: 40px 20px;
                        display: flex;
                        align-items: flex-end;
                        min-height: 440px;
                    }
                    .hero-text-block {
                        max-width: 100%;
                    }
                    .hero-btn { width: 100%; }
                }
            `}</style>
        </section>
    );
};

export default HeroBanner;
