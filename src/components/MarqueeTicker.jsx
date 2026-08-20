import React from 'react';
import { ShieldCheck, Scale, Truck, Award, Sparkles, HeartPulse, Cpu } from 'lucide-react';

const MarqueeTicker = () => {
    const items = [
        { icon: Sparkles, text: 'GRAPHÈNE • FARMÁCIA DE MANIPULAÇÃO DE PRECISÃO' },
        { icon: ShieldCheck, text: 'MATÉRIAS-PRIMAS LAUDADAS POR CROMATOGRAFIA' },
        { icon: Cpu, text: 'PESAGEM COMPUTADORIZADA ZERO DESVIO' },
        { icon: HeartPulse, text: 'ASSISTÊNCIA FARMACÊUTICA EM CABO FRIO - RJ' },
        { icon: Truck, text: 'DESPACHO EXPRESSO PARA TODO O BRASIL' },
        { icon: Award, text: 'PADRÃO RIGOROSO ANVISA & CRF-RJ' },
    ];

    return (
        <div className="graphene-ticker-wrap">
            <div className="graphene-ticker-track">
                {[...items, ...items, ...items].map((item, idx) => {
                    const Icon = item.icon;
                    return (
                        <div key={idx} className="graphene-ticker-item">
                            <Icon size={14} className="ticker-icon-blue" />
                            <span>{item.text}</span>
                            <span className="ticker-bullet-green">•</span>
                        </div>
                    );
                })}
            </div>

            <style>{`
                .graphene-ticker-wrap {
                    background: rgba(6, 8, 13, 0.95);
                    border-bottom: 1px solid rgba(0, 180, 216, 0.2);
                    overflow: hidden;
                    padding: 10px 0;
                    position: relative;
                    z-index: 10;
                }

                .graphene-ticker-track {
                    display: flex;
                    align-items: center;
                    width: max-content;
                    animation: tickerScroll 30s linear infinite;
                }

                .graphene-ticker-wrap:hover .graphene-ticker-track {
                    animation-play-state: paused;
                }

                .graphene-ticker-item {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    padding: 0 22px;
                    white-space: nowrap;
                    font-size: 0.76rem;
                    font-weight: 800;
                    letter-spacing: 0.08em;
                    color: var(--text-white);
                }

                .ticker-icon-blue {
                    color: var(--graphene-blue);
                    flex-shrink: 0;
                }

                .ticker-bullet-green {
                    color: var(--graphene-green);
                    margin-left: 12px;
                }

                @keyframes tickerScroll {
                    from { transform: translateX(0); }
                    to { transform: translateX(-33.333%); }
                }
            `}</style>
        </div>
    );
};

export default MarqueeTicker;
