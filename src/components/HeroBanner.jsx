import React from 'react';
import { FileUp, ShoppingBag, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';

const HeroBanner = () => {
    return (
        <section className="hero-fullwidth">
            <div className="hero-fullwidth-inner">
                {/* Imagem do banner (full-width no desktop, imagem inteira empilhada no mobile) */}
                <div className="hero-banner-image-box">
                    <img
                        src="/assets/graphene_banner_top.png"
                        alt="Linha de Produtos Graphène Manipulações"
                        className="hero-bg-img"
                    />
                </div>

                {/* Overlay gradiente exclusivo para o desktop */}
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
                            Fórmulas manipuladas sob medida com laudos de pureza lote a lote e pesagem computadorizada — direto do nosso laboratório em Cabo Frio.
                        </p>

                        <div className="hero-cta-row">
                            <a href="#produtos" className="btn-commerce hero-btn">
                                <ShoppingBag size={18} />
                                <span>Comprar produtos</span>
                            </a>
                            <Link to="/receita" className="btn-cta-outline hero-btn">
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

                .hero-banner-image-box {
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                }

                .hero-bg-img {
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
                        rgba(7, 10, 16, 0.92) 40%,
                        rgba(7, 10, 16, 0.62) 70%,
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

                /* Mobile: Imagem 100% inteira no topo, texto ajustado abaixo */
                @media (max-width: 960px) {
                    .hero-fullwidth-inner {
                        display: flex;
                        flex-direction: column;
                        min-height: auto;
                        max-height: none;
                    }

                    .hero-banner-image-box {
                        position: relative;
                        width: 100%;
                        height: auto;
                        background: #040508;
                        border-bottom: 1px solid var(--border-subtle);
                    }

                    .hero-bg-img {
                        position: relative;
                        width: 100%;
                        height: auto;
                        object-fit: contain;
                        display: block;
                    }

                    .hero-overlay {
                        display: none;
                    }

                    .hero-content-positioned {
                        position: relative;
                        width: 100%;
                        padding: 24px 16px 28px;
                        background: #07090e;
                    }

                    .hero-text-block {
                        max-width: 100%;
                        gap: 12px;
                    }

                    .hero-text-block h1 {
                        font-size: clamp(1.45rem, 5.5vw, 1.95rem);
                        line-height: 1.22;
                    }

                    .hero-text-block p {
                        font-size: 0.9rem;
                        line-height: 1.55;
                    }

                    .hero-cta-row {
                        flex-direction: column;
                        width: 100%;
                        gap: 10px;
                        margin-top: 4px;
                    }

                    .hero-btn {
                        width: 100%;
                        justify-content: center;
                        padding: 12px 20px;
                        font-size: 0.88rem;
                    }
                }
            `}</style>
        </section>
    );
};

export default HeroBanner;
