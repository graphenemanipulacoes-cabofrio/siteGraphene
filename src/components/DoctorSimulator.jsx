import React from 'react';
import { Link } from 'react-router-dom';
import { Stethoscope, ArrowRight, FileText, CheckCircle2 } from 'lucide-react';
import { getWhatsAppUrl } from '../config';

const DoctorSimulator = () => {
    return (
        <section id="prescritores" className="section clean-prescribers-section">
            <div className="container">
                <div className="clean-card prescribers-clean-card">
                    <div className="prescribers-left">
                        <div className="clean-pill">
                            <Stethoscope size={14} />
                            <span>Prescritores & Parceiros</span>
                        </div>
                        <h2>Canal Exclusivo para <span className="highlight-blue">Médicos & Nutricionistas</span></h2>
                        <p>
                            Atuamos como uma extensão do seu consultório em Cabo Frio e Região dos Lagos. Garantia de pureza farmacêutica e dosagem exata para a evolução clínica dos seus pacientes.
                        </p>

                        <div className="prescribers-perks-list">
                            <div className="perk-bullet">
                                <CheckCircle2 size={16} color="var(--brand-green)" />
                                <span>Canal de WhatsApp direto com o farmacêutico responsável</span>
                            </div>
                            <div className="perk-bullet">
                                <CheckCircle2 size={16} color="var(--brand-green)" />
                                <span>Compêndio técnico com mais de 800 matérias-primas nobres</span>
                            </div>
                            <div className="perk-bullet">
                                <CheckCircle2 size={16} color="var(--brand-green)" />
                                <span>Prioridade máxima no lote de manipulação e entrega</span>
                            </div>
                        </div>

                        <div className="prescribers-actions">
                            <Link to="/parceiros/cadastro" className="btn-primary">
                                <span>Cadastrar como Prescritor Parceiro</span>
                                <ArrowRight size={16} />
                            </Link>

                            <a
                                href={getWhatsAppUrl('Olá, sou profissional de saúde e gostaria de falar com a equipe técnica da Graphène.')}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="btn-secondary"
                            >
                                <span>Falar com Gerente Médico</span>
                            </a>
                        </div>
                    </div>
                </div>
            </div>

            <style>{`
                .clean-prescribers-section {
                    position: relative;
                }

                .prescribers-clean-card {
                    padding: 48px;
                }

                .prescribers-left {
                    max-width: 760px;
                }

                .prescribers-left h2 {
                    font-size: clamp(1.85rem, 3vw, 2.4rem);
                    font-weight: 800;
                    margin-bottom: 14px;
                }

                .prescribers-left p {
                    font-size: 1.02rem;
                    margin-bottom: 24px;
                }

                .prescribers-perks-list {
                    display: flex;
                    flex-direction: column;
                    gap: 12px;
                    margin-bottom: 32px;
                }

                .perk-bullet {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    font-size: 0.92rem;
                    color: var(--text-white);
                }

                .prescribers-actions {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 12px;
                }

                @media (max-width: 768px) {
                    .prescribers-clean-card {
                        padding: 28px 20px;
                    }
                }
            `}</style>
        </section>
    );
};

export default DoctorSimulator;
