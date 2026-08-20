import React from 'react';
import { Link } from 'react-router-dom';
import { Stethoscope, FileSpreadsheet, Headset, ArrowRight, Sparkles, CheckCircle2 } from 'lucide-react';
import { getWhatsAppUrl } from '../config';

const DoctorBanner = () => {
    return (
        <section id="prescritores" className="section doctor-section">
            <div className="container">
                <div className="doctor-card">
                    <div className="doctor-content">
                        <span className="badge-pill badge-pill--emerald" style={{ marginBottom: '16px' }}>
                            <Stethoscope size={14} />
                            Canal Exclusivo para Profissionais de Saúde
                        </span>

                        <h2>Parceria Científica para Médicos, Nutricionistas & Prescritores</h2>

                        <p className="doctor-lead">
                            Desenvolvemos fórmulas sob medida com total fidelidade às suas prescrições. Tenha à sua disposição suporte farmacêutico contínuo, compêndio de ativos inovadores do mercado mundial e canal prioritário.
                        </p>

                        <div className="doctor-benefits-grid">
                            <div className="doctor-benefit-item">
                                <CheckCircle2 size={18} className="doctor-check-icon" />
                                <div>
                                    <strong>Suporte Farmacêutico VIP</strong>
                                    <span>Tire dúvidas de estabilidade e associações em tempo real.</span>
                                </div>
                            </div>

                            <div className="doctor-benefit-item">
                                <CheckCircle2 size={18} className="doctor-check-icon" />
                                <div>
                                    <strong>Lâminas Técnicas & Compêndios</strong>
                                    <span>Acesso a estudos clínicos e novidades em ativos nutracêuticos.</span>
                                </div>
                            </div>

                            <div className="doctor-benefit-item">
                                <CheckCircle2 size={18} className="doctor-check-icon" />
                                <div>
                                    <strong>Rastreabilidade de Prescrição</strong>
                                    <span>Garantia de que seu paciente receberá exatamente a dosagem indicada.</span>
                                </div>
                            </div>
                        </div>

                        <div className="doctor-actions">
                            <Link to="/parceiros/cadastro" className="btn-primary-lux">
                                <span>Cadastrar como Parceiro</span>
                                <ArrowRight size={16} />
                            </Link>

                            <a
                                href={getWhatsAppUrl('Olá, sou profissional de saúde e gostaria de conhecer as soluções e suporte da Graphène para prescritores.')}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="btn-secondary-lux"
                            >
                                <Headset size={16} />
                                <span>Canal Médico WhatsApp</span>
                            </a>
                        </div>
                    </div>

                    <div className="doctor-visual-side">
                        <div className="doctor-badge-box">
                            <div className="badge-icon-circle">
                                <FileSpreadsheet size={28} color="#0284c7" />
                            </div>
                            <h3>Compêndio Farmacêutico Graphène</h3>
                            <p>Mais de 800 matérias-primas de alta pureza cadastradas para prescrição magistral.</p>
                            <div className="doctor-mini-stats">
                                <div>
                                    <strong>100%</strong>
                                    <span>Laudos de Origem</span>
                                </div>
                                <div>
                                    <strong>Cabo Frio</strong>
                                    <span>& Envio Nacional</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <style>{`
                .doctor-section {
                    background: #ffffff;
                    padding: 80px 0;
                }

                .doctor-card {
                    background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
                    border: 1px solid var(--border-light);
                    border-radius: var(--radius-xl);
                    padding: 56px 48px;
                    display: grid;
                    grid-template-columns: 1.25fr 0.75fr;
                    gap: 48px;
                    align-items: center;
                    box-shadow: var(--shadow-lg);
                    position: relative;
                    overflow: hidden;
                }

                .doctor-card::after {
                    content: '';
                    position: absolute;
                    top: 0;
                    right: 0;
                    width: 300px;
                    height: 300px;
                    background: radial-gradient(circle, rgba(2, 132, 199, 0.08) 0%, transparent 70%);
                    pointer-events: none;
                }

                .doctor-content h2 {
                    font-size: clamp(1.8rem, 3.2vw, 2.3rem);
                    font-weight: 800;
                    letter-spacing: -0.03em;
                    color: var(--text-primary);
                    margin-bottom: 16px;
                }

                .doctor-lead {
                    font-size: 1.02rem;
                    color: var(--text-secondary);
                    line-height: 1.65;
                    margin-bottom: 28px;
                }

                .doctor-benefits-grid {
                    display: grid;
                    grid-template-columns: 1fr;
                    gap: 16px;
                    margin-bottom: 36px;
                }

                .doctor-benefit-item {
                    display: flex;
                    align-items: flex-start;
                    gap: 12px;
                }

                .doctor-check-icon {
                    color: var(--emerald-600);
                    flex-shrink: 0;
                    margin-top: 3px;
                }

                .doctor-benefit-item strong {
                    display: block;
                    font-size: 0.95rem;
                    color: var(--text-primary);
                    margin-bottom: 2px;
                }

                .doctor-benefit-item span {
                    font-size: 0.85rem;
                    color: var(--text-secondary);
                }

                .doctor-actions {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 14px;
                }

                /* Visual Box */
                .doctor-visual-side {
                    display: flex;
                    justify-content: center;
                }

                .doctor-badge-box {
                    background: #ffffff;
                    border: 1px solid var(--border-light);
                    border-radius: var(--radius-lg);
                    padding: 36px 30px;
                    box-shadow: var(--shadow-md);
                    text-align: center;
                    width: 100%;
                    max-width: 360px;
                }

                .badge-icon-circle {
                    width: 60px;
                    height: 60px;
                    border-radius: var(--radius-full);
                    background: var(--primary-50);
                    border: 1px solid rgba(2, 132, 199, 0.2);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    margin: 0 auto 18px;
                }

                .doctor-badge-box h3 {
                    font-size: 1.15rem;
                    font-weight: 700;
                    margin-bottom: 8px;
                    color: var(--text-primary);
                }

                .doctor-badge-box p {
                    font-size: 0.86rem;
                    color: var(--text-secondary);
                    line-height: 1.5;
                    margin-bottom: 24px;
                }

                .doctor-mini-stats {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 12px;
                    padding-top: 18px;
                    border-top: 1px solid var(--border-light);
                }

                .doctor-mini-stats strong {
                    display: block;
                    font-size: 1.25rem;
                    color: var(--primary);
                    font-family: var(--font-heading);
                }

                .doctor-mini-stats span {
                    font-size: 0.76rem;
                    color: var(--text-light);
                }

                @media (max-width: 960px) {
                    .doctor-card {
                        grid-template-columns: 1fr;
                        padding: 36px 28px;
                    }
                }
            `}</style>
        </section>
    );
};

export default DoctorBanner;
