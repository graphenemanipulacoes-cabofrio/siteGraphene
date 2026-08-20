import React from 'react';
import { Truck, Scale, ShieldCheck, HeartPulse } from 'lucide-react';

const BenefitsBar = () => {
    const perks = [
        {
            icon: Truck,
            title: 'Despacho Nacional',
            desc: 'Entrega rápida e segura para todo o Brasil',
            color: 'var(--brand-blue)'
        },
        {
            icon: Scale,
            title: 'Pesagem Computadorizada',
            desc: 'Balanças analíticas com precisão digital',
            color: 'var(--brand-green)'
        },
        {
            icon: ShieldCheck,
            title: 'Insumos com Laudo',
            desc: '100% testados por cromatografia analítica',
            color: 'var(--brand-blue)'
        },
        {
            icon: HeartPulse,
            title: 'Atenção Farmacêutica',
            desc: 'Suporte técnico direto em Cabo Frio - RJ',
            color: 'var(--brand-green)'
        }
    ];

    return (
        <section className="benefits-bar-section">
            <div className="container">
                <div className="benefits-grid">
                    {perks.map((p, idx) => {
                        const Icon = p.icon;
                        return (
                            <div key={idx} className="benefit-item">
                                <div className="benefit-icon-wrap" style={{ color: p.color, borderColor: p.color }}>
                                    <Icon size={22} />
                                </div>
                                <div className="benefit-text">
                                    <strong>{p.title}</strong>
                                    <span>{p.desc}</span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            <style>{`
                .benefits-bar-section {
                    padding: 10px 0 40px;
                }

                .benefits-grid {
                    display: grid;
                    grid-template-columns: repeat(4, 1fr);
                    gap: 20px;
                    background: var(--bg-card);
                    border: 1px solid var(--border-card);
                    border-radius: var(--radius-md);
                    padding: 24px 28px;
                }

                .benefit-item {
                    display: flex;
                    align-items: center;
                    gap: 14px;
                }

                .benefit-icon-wrap {
                    width: 44px;
                    height: 44px;
                    border-radius: var(--radius-xs);
                    background: rgba(255, 255, 255, 0.03);
                    border: 1px solid;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    flex-shrink: 0;
                }

                .benefit-text {
                    display: flex;
                    flex-direction: column;
                    gap: 2px;
                }

                .benefit-text strong {
                    font-size: 0.92rem;
                    font-weight: 700;
                    color: var(--text-main);
                }

                .benefit-text span {
                    font-size: 0.78rem;
                    color: var(--text-dim);
                }

                @media (max-width: 1024px) {
                    .benefits-grid {
                        grid-template-columns: repeat(2, 1fr);
                        gap: 24px;
                    }
                }

                @media (max-width: 600px) {
                    .benefits-grid {
                        grid-template-columns: 1fr;
                        padding: 20px;
                    }
                }
            `}</style>
        </section>
    );
};

export default BenefitsBar;
