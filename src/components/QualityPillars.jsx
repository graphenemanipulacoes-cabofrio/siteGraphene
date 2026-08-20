import React from 'react';
import { Scale, FileCheck, Stethoscope, PackageCheck, Truck, ShieldAlert, Sparkles } from 'lucide-react';

const pillars = [
    {
        icon: Scale,
        title: 'Pesagem Computadorizada & Dupla Checagem',
        description: 'Balanças analíticas calibradas com leitura de código de barras. Cada miligrama é conferido digitalmente para garantir a dosagem exata prescrita.',
        tag: 'Precisão Zero Desvio'
    },
    {
        icon: FileCheck,
        title: 'Matérias-Primas com Laudo de Pureza',
        description: 'Trabalhamos exclusivamente com distribuidores qualificados. Todos os lotes contam com certificado de análise físico-química e teor ativo comprovado.',
        tag: '100% Certificado'
    },
    {
        icon: Stethoscope,
        title: 'Assistência Farmacêutica Dedicada',
        description: 'Nossa equipe técnica analisa minuciosamente a compatibilidade dos princípios ativos e permanece à disposição para esclarecer suas dúvidas.',
        tag: 'Cuidado Humano'
    },
    {
        icon: PackageCheck,
        title: 'Embalagens Fotoprotetoras & Selo UV',
        description: 'Frascos âmbar e cápsulas especiais que protegem as substâncias sensíveis contra a oxidação luminosa e garantem a biodisponibilidade até a última dose.',
        tag: 'Estabilidade Total'
    },
    {
        icon: Truck,
        title: 'Entrega Expressa ou Retirada Local',
        description: 'Retire diretamente no Centro de Cabo Frio ou receba em casa com embalagem segura, selada e envio com código de rastreamento para todo o Brasil.',
        tag: 'Logística Ágil'
    },
    {
        icon: ShieldAlert,
        title: 'Rigor ANVISA & Controle de Lote',
        description: 'Laboratórios modernos com fluxo de ar controlado, cabines de exaustão e registros rigorosos conforme as Boas Práticas de Manipulação.',
        tag: 'Padrão Sanitário'
    }
];

const QualityPillars = () => {
    return (
        <section id="qualidade" className="section section--dark quality-section">
            <div className="container">
                <div className="section-header-modern">
                    <span className="badge-pill badge-pill--dark" style={{ marginBottom: '16px' }}>
                        <Sparkles size={13} />
                        O Padrão Graphène
                    </span>
                    <h2>Rigor Laboratorial & Excelência Farmacêutica</h2>
                    <p>
                        Conheça os pilares que garantem que sua fórmula manipulada tenha eficácia terapêutica real, segurança biológica e máxima pureza.
                    </p>
                </div>

                <div className="pillars-grid">
                    {pillars.map((pillar, index) => {
                        const Icon = pillar.icon;
                        return (
                            <div key={index} className="pillar-card">
                                <div className="pillar-card-top">
                                    <div className="pillar-icon-box">
                                        <Icon size={24} />
                                    </div>
                                    <span className="pillar-tag">{pillar.tag}</span>
                                </div>
                                <h3>{pillar.title}</h3>
                                <p>{pillar.description}</p>
                            </div>
                        );
                    })}
                </div>
            </div>

            <style>{`
                .quality-section {
                    background: var(--bg-dark);
                    color: #ffffff;
                }

                .pillars-grid {
                    display: grid;
                    grid-template-columns: repeat(3, 1fr);
                    gap: 24px;
                }

                .pillar-card {
                    background: rgba(15, 23, 42, 0.7);
                    border: 1px solid rgba(255, 255, 255, 0.08);
                    border-radius: var(--radius-lg);
                    padding: 32px 28px;
                    transition: var(--transition-base);
                    display: flex;
                    flex-direction: column;
                    backdrop-filter: blur(12px);
                }

                .pillar-card:hover {
                    border-color: rgba(14, 165, 233, 0.35);
                    transform: translateY(-4px);
                    box-shadow: 0 16px 36px -10px rgba(2, 132, 199, 0.2);
                    background: rgba(30, 41, 59, 0.8);
                }

                .pillar-card-top {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    margin-bottom: 24px;
                }

                .pillar-icon-box {
                    width: 52px;
                    height: 52px;
                    border-radius: var(--radius-md);
                    background: rgba(2, 132, 199, 0.15);
                    color: var(--primary-light);
                    border: 1px solid rgba(14, 165, 233, 0.3);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }

                .pillar-tag {
                    font-size: 0.72rem;
                    font-weight: 700;
                    letter-spacing: 0.05em;
                    text-transform: uppercase;
                    color: var(--primary-light);
                    background: rgba(14, 165, 233, 0.1);
                    padding: 4px 10px;
                    border-radius: var(--radius-full);
                    border: 1px solid rgba(14, 165, 233, 0.2);
                }

                .pillar-card h3 {
                    font-size: 1.2rem;
                    font-weight: 700;
                    margin-bottom: 12px;
                    color: #ffffff;
                    line-height: 1.35;
                }

                .pillar-card p {
                    font-size: 0.92rem;
                    color: var(--text-white-muted);
                    line-height: 1.6;
                    margin: 0;
                }

                @media (max-width: 1024px) {
                    .pillars-grid {
                        grid-template-columns: repeat(2, 1fr);
                    }
                }

                @media (max-width: 640px) {
                    .pillars-grid {
                        grid-template-columns: 1fr;
                    }
                }
            `}</style>
        </section>
    );
};

export default QualityPillars;
