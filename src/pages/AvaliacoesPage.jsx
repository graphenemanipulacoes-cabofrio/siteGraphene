import React from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import FloatingWhatsApp from '../components/FloatingWhatsApp';
import { Star, ExternalLink, MapPin } from 'lucide-react';

const GOOGLE_MAPS_PLACE_URL = 'https://www.google.com/maps/search/Graph%C3%A8ne+Manipula%C3%A7%C3%B5es+Cabo+Frio';

const AvaliacoesPage = () => {
    return (
        <div className="page-root">
            <Header />
            <main>
                <section className="page-hero">
                    <div className="container">
                        <div className="store-badge"><span>Avaliações Verificadas</span></div>
                        <h1>Nota <span className="highlight-blue">4.9</span> no Google</h1>
                        <p>A melhor avaliação do setor em Cabo Frio. Confira os depoimentos reais direto do Google.</p>
                    </div>
                </section>

                <section className="store-section" style={{ paddingTop: 0 }}>
                    <div className="container">
                        {/* Google Rating Card */}
                        <div className="store-card google-summary-card">
                            <div className="google-summary-inner">
                                <div className="google-summary-left">
                                    <div className="google-logo-row">
                                        <svg viewBox="0 0 24 24" width="32" height="32">
                                            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z" fill="#4285F4"/>
                                            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                                            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                                            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                                        </svg>
                                        <div>
                                            <span className="google-title">Google Reviews</span>
                                            <span className="google-subtitle">Graphène Farmácia de Manipulação</span>
                                        </div>
                                    </div>

                                    <div className="google-score-display">
                                        <span className="score-big">4.9</span>
                                        <div className="score-stars-wrap">
                                            <div className="score-stars">
                                                {[...Array(5)].map((_, i) => <Star key={i} size={20} fill="#f59e0b" color="#f59e0b" />)}
                                            </div>
                                            <span className="score-count">Avaliações verificadas do Google</span>
                                        </div>
                                    </div>
                                </div>

                                <a href={GOOGLE_MAPS_PLACE_URL} target="_blank" rel="noopener noreferrer" className="btn-cta-blue google-btn">
                                    <MapPin size={18} />
                                    <span>Ver Todas no Google Maps</span>
                                    <ExternalLink size={16} />
                                </a>
                            </div>
                        </div>

                        {/* Nota explicativa */}
                        <div className="store-card aviso-card">
                            <p>As avaliações da Graphène estão disponíveis diretamente no <strong>Google Maps</strong>. Clique no botão acima para ler todos os depoimentos reais e verificados dos nossos clientes e prescritores parceiros.</p>
                        </div>

                        {/* Trust Highlights */}
                        <div className="trust-highlights-grid">
                            <div className="store-card trust-highlight">
                                <Star size={28} fill="#f59e0b" color="#f59e0b" />
                                <h3>Melhor Avaliação</h3>
                                <p>Farmácia de manipulação com a maior nota do Google em Cabo Frio e Região dos Lagos.</p>
                            </div>
                            <div className="store-card trust-highlight">
                                <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="var(--brand-green)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
                                </svg>
                                <h3>100% Verificadas</h3>
                                <p>Todas as avaliações são de clientes reais verificados pela plataforma Google.</p>
                            </div>
                            <div className="store-card trust-highlight">
                                <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="var(--brand-blue)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                                </svg>
                                <h3>Confiança Médica</h3>
                                <p>Médicos e nutricionistas de Cabo Frio prescrevem e recomendam a Graphène.</p>
                            </div>
                        </div>
                    </div>
                </section>
            </main>
            <Footer />
            <FloatingWhatsApp />

            <style>{`
                .page-hero { padding: 60px 0 40px; text-align: center; }
                .page-hero h1 { font-size: clamp(2rem, 3.5vw, 2.8rem); font-weight: 800; margin: 10px 0; }
                .page-hero p { font-size: 1.05rem; color: var(--text-dim); max-width: 640px; margin: 0 auto; }

                .google-summary-card { padding: 36px; margin-bottom: 28px; }
                .google-summary-inner { display: flex; align-items: center; justify-content: space-between; gap: 28px; flex-wrap: wrap; }
                .google-summary-left { display: flex; flex-direction: column; gap: 18px; }
                .google-logo-row { display: flex; align-items: center; gap: 14px; }
                .google-title { display: block; font-size: 1.1rem; font-weight: 800; }
                .google-subtitle { display: block; font-size: 0.82rem; color: var(--text-dim); }
                .google-score-display { display: flex; align-items: center; gap: 14px; }
                .score-big { font-size: 4rem; font-weight: 900; font-family: var(--font-heading); line-height: 1; }
                .score-stars-wrap { display: flex; flex-direction: column; gap: 4px; }
                .score-stars { display: flex; gap: 3px; }
                .score-count { font-size: 0.82rem; color: var(--text-muted); }
                .google-btn { padding: 14px 28px; white-space: nowrap; }

                .aviso-card { padding: 24px 32px; margin-bottom: 28px; text-align: center; }
                .aviso-card p { font-size: 0.95rem; margin: 0; }

                .trust-highlights-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 22px; }
                .trust-highlight { padding: 28px; text-align: center; display: flex; flex-direction: column; align-items: center; gap: 12px; }
                .trust-highlight h3 { font-size: 1.05rem; }
                .trust-highlight p { font-size: 0.86rem; color: var(--text-dim); margin: 0; }

                @media (max-width: 768px) {
                    .google-summary-inner { flex-direction: column; text-align: center; align-items: center; }
                    .google-summary-left { align-items: center; }
                    .google-logo-row { flex-direction: column; }
                    .google-score-display { flex-direction: column; align-items: center; }
                    .score-big { font-size: 3rem; }
                    .google-btn { width: 100%; }
                    .trust-highlights-grid { grid-template-columns: 1fr; }
                }
            `}</style>
        </div>
    );
};

export default AvaliacoesPage;
