import React from 'react';
import { Truck, Scale, ShieldCheck, HeartPulse } from 'lucide-react';

const BenefitsBar = () => {
    const perks = [
        {
            icon: Truck,
            title: 'Despacho Nacional',
            desc: 'Entrega rápida para todo o Brasil',
            color: 'var(--brand-blue)'
        },
        {
            icon: Scale,
            title: 'Pesagem Computadorizada',
            desc: 'Balanças com leitor de código óptico',
            color: 'var(--brand-green)'
        },
        {
            icon: ShieldCheck,
            title: 'Insumos com Laudo',
            desc: 'Cromatografia analítica lote a lote',
            color: 'var(--brand-blue)'
        },
        {
            icon: HeartPulse,
            title: 'Atenção Farmacêutica',
            desc: 'Suporte direto em Cabo Frio - RJ',
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
                                    <Icon size={20} />
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
                    padding: 10px 0 36px;
                }

                .benefits-grid {
                    display: grid;
                    grid-template-columns: repeat(4, 1fr);
                    gap: 16px;
                    background: var(--bg-card);
                    border: 1px solid var(--border-card);
                    border-radius: var(--radius-md);
                    padding: 22px 24px;
                }

                .benefit-item {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                }

                .benefit-icon-wrap {
                    width: 42px;
                    height: 42px;
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
                    font-size: 0.88rem;
                    font-weight: 700;
                    color: var(--text-main);
                    line-height: 1.25;
                }

                .benefit-text span {
                    font-size: 0.75rem;
                    color: var(--text-dim);
                    line-height: 1.35;
                }

                @media (max-width: 1024px) {
                    .benefits-grid {
                        grid-template-columns: repeat(2, 1fr);
                        gap: 18px;
                    }
                }

                @media (max-width: 600px) {
                    .benefits-grid {
                        grid-template-columns: repeat(2, 1fr);
                        padding: 16px 14px;
                        gap: 14px 10px;
                    }
                    .benefit-item {
                        gap: 9px;
                    }
                    .benefit-icon-wrap {
                        width: 36px;
                        height: 36px;
                    }
                    .benefit-text strong {
                        font-size: 0.78rem;
                    }
                    .benefit-text span {
                        font-size: 0.68rem;
                    }
                }
            `}</style>
        </section>
    );
};

export default BenefitsBar;
