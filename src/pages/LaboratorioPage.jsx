import React from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import FloatingWhatsApp from '../components/FloatingWhatsApp';
import { Scale, ShieldCheck, HeartPulse, Check, X, MapPin, Clock, Phone } from 'lucide-react';

const GOOGLE_MAPS_EMBED = 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3675.93!2d-42.0180!3d-22.8790!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2sGraph%C3%A8ne+Farm%C3%A1cia+de+Manipula%C3%A7%C3%A3o!5e0!3m2!1spt-BR!2sbr!4v1692000000000!5m2!1spt-BR!2sbr';

const LaboratorioPage = () => {
    return (
        <div className="page-root">
            <Header />
            <main>
                <section className="page-hero">
                    <div className="container">
                        <div className="store-badge"><span>Estrutura & Rigor Técnico</span></div>
                        <h1>O Laboratório <span className="highlight-blue">Graphène</span></h1>
                        <p>Conheça a infraestrutura técnica, os processos de controle de qualidade e o compromisso com a precisão magistral que nos diferencia.</p>
                    </div>
                </section>

                {/* Pilares Técnicos */}
                <section className="store-section" style={{ paddingTop: 0 }}>
                    <div className="container">
                        <div className="lab-layout">
                            <div className="lab-photo-frame">
                                <img src="/assets/graphene_pharmacist_lab.jpg" alt="Laboratório Graphène" className="lab-photo"
                                    onError={(e) => { e.target.src = '/assets/graphene_banner_top.png'; }} />
                            </div>

                            <div className="lab-pillars">
                                <div className="store-card pillar-card">
                                    <div className="pillar-icon" style={{ color: 'var(--brand-blue)', borderColor: 'var(--brand-blue)' }}>
                                        <Scale size={22} />
                                    </div>
                                    <div>
                                        <h3>Pesagem Computadorizada</h3>
                                        <p>Balanças analíticas integradas por código de barras que bloqueiam qualquer desvio na pesagem de miligramas.</p>
                                    </div>
                                </div>

                                <div className="store-card pillar-card">
                                    <div className="pillar-icon" style={{ color: 'var(--brand-green)', borderColor: 'var(--brand-green)' }}>
                                        <ShieldCheck size={22} />
                                    </div>
                                    <div>
                                        <h3>Matérias-Primas com Cromatografia</h3>
                                        <p>Insumos certificados lote a lote com laudo de pureza dos melhores fornecedores do Brasil e do mundo.</p>
                                    </div>
                                </div>

                                <div className="store-card pillar-card">
                                    <div className="pillar-icon" style={{ color: 'var(--brand-blue)', borderColor: 'var(--brand-blue)' }}>
                                        <HeartPulse size={22} />
                                    </div>
                                    <div>
                                        <h3>Acompanhamento Farmacêutico</h3>
                                        <p>Farmacêuticos dedicados para dúvidas de posologia, veículos ideais e sinergias com médicos e pacientes.</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Tabela Comparativa */}
                <section className="store-section" style={{ paddingTop: 0 }}>
                    <div className="container">
                        <div className="store-card comparison-card">
                            <h2 style={{ marginBottom: '24px' }}>Por que escolher a <span className="highlight-blue">Graphène</span></h2>
                            <div className="comp-table">
                                <div className="comp-row comp-header">
                                    <div>Critério</div>
                                    <div>Padrão Graphène</div>
                                    <div>Farmácias Tradicionais</div>
                                </div>
                                {[
                                    ['Controle de Pesagem', 'Computadorizada com Leitor Óptico', 'Pesagem manual suscetível a erros'],
                                    ['Laudos dos Insumos', 'Cromatografia Lote a Lote', 'Amostragem básica genérica'],
                                    ['Velocidade de Retorno', 'Em até 15 min no WhatsApp', 'Horas ou dias de espera'],
                                ].map(([crit, g, o], idx) => (
                                    <div key={idx} className="comp-row">
                                        <div className="comp-crit">{crit}</div>
                                        <div className="comp-yes"><Check size={16} color="var(--brand-green)" /> {g}</div>
                                        <div className="comp-no"><X size={16} color="#ef4444" /> {o}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </section>

                {/* Localização & Mapa */}
                <section className="store-section" style={{ paddingTop: 0 }}>
                    <div className="container">
                        <div className="store-section-header">
                            <div className="store-badge"><MapPin size={14} /><span>Nossa Loja Física</span></div>
                            <h2>Visite o <span className="highlight-blue">Laboratório</span></h2>
                            <p>Venha conhecer pessoalmente nosso laboratório de manipulação em Cabo Frio.</p>
                        </div>

                        <div className="location-grid">
                            <div className="store-card location-info-card">
                                <h3>Graphène Farmácia de Manipulação</h3>

                                <div className="location-detail">
                                    <MapPin size={18} color="var(--brand-blue)" />
                                    <div>
                                        <strong>Endereço</strong>
                                        <span>Rua Itajuru, 300, Lojas 5 e 6<br/>Centro — Cabo Frio, RJ<br/>CEP 28907-000</span>
                                    </div>
                                </div>

                                <div className="location-detail">
                                    <Clock size={18} color="var(--brand-blue)" />
                                    <div>
                                        <strong>Horário de Funcionamento</strong>
                                        <span>Segunda a Sexta: 08h00 às 18h30<br/>Sábados: 08h00 às 13h00</span>
                                    </div>
                                </div>

                                <div className="location-detail">
                                    <Phone size={18} color="var(--brand-green)" />
                                    <div>
                                        <strong>WhatsApp</strong>
                                        <span>(22) 99936-1256</span>
                                    </div>
                                </div>

                                <a
                                    href="https://www.google.com/maps/search/Graph%C3%A8ne+Manipula%C3%A7%C3%B5es+Cabo+Frio"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="btn-cta-blue location-btn"
                                >
                                    <MapPin size={16} />
                                    <span>Abrir no Google Maps</span>
                                </a>
                            </div>

                            <div className="store-card location-map-card">
                                <iframe
                                    src={GOOGLE_MAPS_EMBED}
                                    width="100%"
                                    height="100%"
                                    style={{ border: 0, borderRadius: 'var(--radius-sm)', minHeight: '380px' }}
                                    allowFullScreen=""
                                    loading="lazy"
                                    referrerPolicy="no-referrer-when-downgrade"
                                    title="Localização Graphène — Cabo Frio"
                                />
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

                .lab-layout { display: grid; grid-template-columns: 1.1fr 0.9fr; gap: 32px; align-items: start; }
                .lab-photo-frame { border-radius: var(--radius-md); overflow: hidden; border: 1px solid var(--border-card); }
                .lab-photo { width: 100%; height: 420px; object-fit: cover; display: block; }
                .lab-pillars { display: flex; flex-direction: column; gap: 16px; }
                .pillar-card { display: flex; align-items: flex-start; gap: 16px; padding: 22px; }
                .pillar-icon { width: 46px; height: 46px; border-radius: var(--radius-xs); background: rgba(255,255,255,0.03); border: 1px solid; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
                .pillar-card h3 { font-size: 1.05rem; font-weight: 700; margin-bottom: 4px; }
                .pillar-card p { font-size: 0.86rem; color: var(--text-dim); line-height: 1.5; margin: 0; }

                .comparison-card { padding: 36px; }
                .comp-table { display: flex; flex-direction: column; gap: 1px; background: var(--border-subtle); border: 1px solid var(--border-subtle); border-radius: var(--radius-sm); overflow: hidden; }
                .comp-row { display: grid; grid-template-columns: 1fr 1.2fr 1.2fr; gap: 16px; padding: 14px 20px; background: var(--bg-card); align-items: center; }
                .comp-header { background: rgba(255,255,255,0.03); font-size: 0.78rem; font-weight: 700; text-transform: uppercase; color: var(--text-muted); }
                .comp-crit { font-weight: 600; font-size: 0.9rem; }
                .comp-yes { display: flex; align-items: center; gap: 8px; font-size: 0.86rem; font-weight: 600; color: var(--brand-green); }
                .comp-no { display: flex; align-items: center; gap: 8px; font-size: 0.84rem; color: var(--text-muted); }

                /* Localização */
                .location-grid { display: grid; grid-template-columns: 0.9fr 1.1fr; gap: 28px; align-items: stretch; }
                .location-info-card { padding: 36px; display: flex; flex-direction: column; gap: 20px; }
                .location-info-card h3 { font-size: 1.3rem; font-weight: 800; }
                .location-detail { display: flex; align-items: flex-start; gap: 12px; }
                .location-detail strong { display: block; font-size: 0.85rem; font-weight: 700; margin-bottom: 2px; }
                .location-detail span { font-size: 0.88rem; color: var(--text-dim); line-height: 1.5; }
                .location-map-card { padding: 8px; overflow: hidden; }
                .location-btn { width: 100%; margin-top: auto; }

                @media (max-width: 960px) {
                    .lab-layout { grid-template-columns: 1fr; }
                    .comp-row { grid-template-columns: 1fr; gap: 6px; }
                    .comp-header { display: none; }
                    .location-grid { grid-template-columns: 1fr; }
                }
            `}</style>
        </div>
    );
};

export default LaboratorioPage;
