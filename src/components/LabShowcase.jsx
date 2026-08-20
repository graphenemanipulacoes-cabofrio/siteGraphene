import React from 'react';
import { Scale, ShieldCheck, HeartPulse, Check, X } from 'lucide-react';

const LabShowcase = () => {
    return (
        <section id="laboratorio" className="section clean-lab-section">
            <div className="container">
                <div className="clean-section-header">
                    <div className="clean-pill">
                        <span>Estrutura & Rigor</span>
                    </div>
                    <h2>O Padrão <span className="highlight-blue">Graphène Magistral</span></h2>
                    <p>
                        A manipulação de precisão exige controle absoluto de dosagem, ambiente climatizado e assistência técnica qualificada.
                    </p>
                </div>

                {/* Lab Grid */}
                <div className="clean-lab-grid">
                    <div className="clean-lab-photo-frame">
                        <img
                            src="/assets/graphene_pharmacist_lab.jpg"
                            alt="Laboratório Graphène Cleanroom"
                            className="clean-lab-img"
                            onError={(e) => {
                                e.target.src = '/hero-bg.png';
                            }}
                        />
                    </div>

                    <div className="clean-lab-pillars">
                        <div className="clean-card pillar-card">
                            <div className="pillar-icon">
                                <Scale size={20} color="var(--brand-blue)" />
                            </div>
                            <div>
                                <h4>Pesagem Computadorizada</h4>
                                <p>Balanças analíticas integradas por código de barras que bloqueiam qualquer desvio na pesagem de miligramas.</p>
                            </div>
                        </div>

                        <div className="clean-card pillar-card">
                            <div className="pillar-icon">
                                <ShieldCheck size={20} color="var(--brand-green)" />
                            </div>
                            <div>
                                <h4>Matérias-Primas com Cromatografia</h4>
                                <p>Insumos certificados lote a lote com laudo de pureza físico-química dos principais fornecedores do Brasil e do mundo.</p>
                            </div>
                        </div>

                        <div className="clean-card pillar-card">
                            <div className="pillar-icon">
                                <HeartPulse size={20} color="var(--brand-blue)" />
                            </div>
                            <div>
                                <h4>Acompanhamento Farmacêutico</h4>
                                <p>Farmacêuticos dedicados para tirar dúvidas de posologia, veículos ideais e sinergias com médicos e pacientes.</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Comparison Table */}
                <div className="clean-card clean-comparison-card">
                    <h3 className="comparison-title">Por que escolher a Graphène</h3>

                    <div className="clean-table-wrapper">
                        <div className="table-row table-header">
                            <div>Critério</div>
                            <div>Padrão Graphène</div>
                            <div>Farmácias Tradicionais</div>
                        </div>

                        <div className="table-row">
                            <div className="table-crit">Controle de Pesagem</div>
                            <div className="table-graphene">
                                <Check size={16} color="var(--brand-green)" />
                                <span>Computadorizada com Leitor Óptico</span>
                            </div>
                            <div className="table-others">
                                <X size={16} color="#ef4444" />
                                <span>Pesagem manual suscetível a erros</span>
                            </div>
                        </div>

                        <div className="table-row">
                            <div className="table-crit">Laudos dos Insumos</div>
                            <div className="table-graphene">
                                <Check size={16} color="var(--brand-green)" />
                                <span>Cromatografia Lote a Lote</span>
                            </div>
                            <div className="table-others">
                                <X size={16} color="#ef4444" />
                                <span>Amostragem básica genérica</span>
                            </div>
                        </div>

                        <div className="table-row">
                            <div className="table-crit">Velocidade de Retorno</div>
                            <div className="table-graphene">
                                <Check size={16} color="var(--brand-green)" />
                                <span>Em até 15 minutos no WhatsApp</span>
                            </div>
                            <div className="table-others">
                                <X size={16} color="#ef4444" />
                                <span>Horas ou dias de espera</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <style>{`
                .clean-lab-section {
                    position: relative;
                }

                .clean-lab-grid {
                    display: grid;
                    grid-template-columns: 1.1fr 0.9fr;
                    gap: 36px;
                    align-items: center;
                    margin-bottom: 50px;
                }

                .clean-lab-photo-frame {
                    border-radius: var(--radius-md);
                    overflow: hidden;
                    border: 1px solid var(--border-card);
                    background: var(--bg-card);
                }

                .clean-lab-img {
                    width: 100%;
                    height: 420px;
                    object-fit: cover;
                    display: block;
                }

                .clean-lab-pillars {
                    display: flex;
                    flex-direction: column;
                    gap: 16px;
                }

                .pillar-card {
                    display: flex;
                    align-items: flex-start;
                    gap: 16px;
                    padding: 20px;
                }

                .pillar-icon {
                    width: 42px;
                    height: 42px;
                    border-radius: var(--radius-xs);
                    background: rgba(255, 255, 255, 0.04);
                    border: 1px solid var(--border-subtle);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    flex-shrink: 0;
                }

                .pillar-card h4 {
                    font-size: 1.05rem;
                    font-weight: 700;
                    color: var(--text-white);
                    margin-bottom: 4px;
                }

                .pillar-card p {
                    font-size: 0.86rem;
                    color: var(--text-dim);
                    line-height: 1.5;
                    margin: 0;
                }

                /* Comparison */
                .clean-comparison-card {
                    padding: 32px;
                }

                .comparison-title {
                    font-size: 1.3rem;
                    font-weight: 700;
                    margin-bottom: 20px;
                }

                .clean-table-wrapper {
                    display: flex;
                    flex-direction: column;
                    gap: 1px;
                    background: var(--border-subtle);
                    border: 1px solid var(--border-subtle);
                    border-radius: var(--radius-sm);
                    overflow: hidden;
                }

                .table-row {
                    display: grid;
                    grid-template-columns: 1fr 1.2fr 1.2fr;
                    gap: 16px;
                    padding: 14px 20px;
                    background: var(--bg-card);
                    align-items: center;
                }

                .table-header {
                    background: rgba(255, 255, 255, 0.03);
                    font-size: 0.78rem;
                    font-weight: 700;
                    text-transform: uppercase;
                    color: var(--text-muted);
                }

                .table-crit {
                    font-weight: 600;
                    font-size: 0.9rem;
                    color: var(--text-white);
                }

                .table-graphene {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    font-size: 0.88rem;
                    font-weight: 600;
                    color: var(--brand-green);
                }

                .table-others {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    font-size: 0.86rem;
                    color: var(--text-muted);
                }

                @media (max-width: 960px) {
                    .clean-lab-grid {
                        grid-template-columns: 1fr;
                    }
                    .table-row {
                        grid-template-columns: 1fr;
                        gap: 6px;
                    }
                    .table-header {
                        display: none;
                    }
                }
            `}</style>
        </section>
    );
};

export default LabShowcase;
