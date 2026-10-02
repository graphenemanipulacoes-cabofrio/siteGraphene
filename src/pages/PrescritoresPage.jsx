import React from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import FloatingWhatsApp from '../components/FloatingWhatsApp';
import { getWhatsAppUrl } from '../config';
import { Stethoscope, ArrowRight, CheckCircle2, MapPin } from 'lucide-react';

const PrescritoresPage = () => {
    return (
        <div className="page-root">
            <Header />
            <main>
                <section className="page-hero">
                    <div className="container">
                        <div className="store-badge"><Stethoscope size={14} /><span>Atendimento técnico</span></div>
                        <h1>Canal para <span className="highlight-blue">profissionais de saúde</span></h1>
                        <p>Profissionais habilitados podem falar com a equipe farmacêutica sobre o atendimento a prescrições e solicitar informações técnicas disponíveis.</p>
                    </div>
                </section>

                <section className="store-section" style={{ paddingTop: 0 }}>
                    <div className="container">
                        <div className="presc-layout">
                            <div className="store-card presc-main-card">
                                <h2>Como podemos <span className="highlight-blue">ajudar</span></h2>
                                <div className="presc-perks">
                                    {[
                                        'Canal de contato com a equipe farmacêutica',
                                        'Consulta de informações técnicas disponíveis sobre matérias-primas',
                                        'Orientação sobre o processo de análise de prescrições',
                                        'Informações sobre apresentação e disponibilidade, conforme o caso',
                                        'Esclarecimento de dúvidas relacionadas ao atendimento',
                                    ].map((text, i) => (
                                        <div key={i} className="perk-item">
                                            <CheckCircle2 size={18} color="var(--brand-green)" />
                                            <span>{text}</span>
                                        </div>
                                    ))}
                                </div>

                                <div className="presc-actions">
                                    <a href={getWhatsAppUrl('Olá, sou profissional de saúde e gostaria de falar com a equipe farmacêutica.')} target="_blank" rel="noopener noreferrer" className="btn-cta-blue">
                                        <span>Falar com a equipe</span>
                                        <ArrowRight size={16} />
                                    </a>
                                    <Link to="/laboratorio" className="btn-cta-outline">
                                        <MapPin size={16} />
                                        <span>Conhecer a unidade</span>
                                    </Link>
                                </div>
                            </div>

                            <div className="store-card presc-side-card">
                                <h3>Atendimento profissional</h3>
                                <div className="spec-list">
                                    {['Informações técnicas', 'Matérias-primas', 'Apresentações', 'Documentação', 'Atendimento farmacêutico'].map((s, i) => (
                                        <span key={i} className="spec-tag">{s}</span>
                                    ))}
                                </div>

                                <div className="presc-quote">
                                    <p>Este canal é destinado a dúvidas técnicas e de atendimento. Não está vinculado ao programa comercial de indicação ou comissão.</p>
                                    <strong>Equipe Graphène</strong>
                                </div>
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

                .presc-layout { display: grid; grid-template-columns: 1.3fr 0.7fr; gap: 28px; align-items: start; }
                .presc-main-card { padding: 40px; }
                .presc-main-card h2 { font-size: 1.6rem; margin-bottom: 24px; }
                .presc-perks { display: flex; flex-direction: column; gap: 14px; margin-bottom: 32px; }
                .perk-item { display: flex; align-items: center; gap: 12px; font-size: 0.95rem; }
                .presc-actions { display: flex; flex-wrap: wrap; gap: 12px; }

                .presc-side-card { padding: 32px; }
                .presc-side-card h3 { font-size: 1.1rem; margin-bottom: 16px; }
                .spec-list { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 28px; }
                .spec-tag { font-size: 0.78rem; font-weight: 600; padding: 5px 12px; border-radius: var(--radius-full); background: rgba(0,180,216,0.08); border: 1px solid rgba(0,180,216,0.2); color: var(--brand-blue); }

                .presc-quote { border-top: 1px solid var(--border-subtle); padding-top: 20px; }
                .presc-quote p { font-size: 0.9rem; font-style: italic; color: var(--text-dim); margin-bottom: 8px; line-height: 1.6; }
                .presc-quote strong { font-size: 0.82rem; color: var(--text-main); }

                @media (max-width: 960px) { .presc-layout { grid-template-columns: 1fr; } }
            `}</style>
        </div>
    );
};

export default PrescritoresPage;
