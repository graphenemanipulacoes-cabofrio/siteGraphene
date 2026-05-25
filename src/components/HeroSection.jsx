import React from 'react';
import Button from './Button';
import HeroAnimation from './HeroAnimation';
import { getWhatsAppUrl } from '../config';

const HeroSection = () => {
    return (
        <section className="hero">
            <div className="hero-container">
                <div className="hero-content">
                    <span className="hero-badge">Rigor Científico & Personalização</span>
                    <h1 className="hero-title">
                        Sua saúde com dosagem <span className="text-blue">exata e individual.</span>
                    </h1>
                    <p className="hero-description">
                        Manipulamos medicamentos, hormônios e suplementos personalizados com as melhores matérias-primas do mercado nacional e internacional. Confiabilidade e cuidado exato para atender à sua prescrição médica.
                    </p>
                    <div className="hero-actions">
                        <Button
                            variant="primary"
                            style={{ padding: '16px 36px', fontSize: '1.05rem', borderRadius: 'var(--radius-sm)' }}
                            onClick={() => window.open(getWhatsAppUrl(), '_blank')}
                        >
                            Enviar Minha Receita
                        </Button>
                    </div>

                    <div className="hero-stats">
                        <div className="stat-item">
                            <strong className="text-blue">100%</strong>
                            <span>Fórmulas personalizadas</span>
                        </div>
                        <div className="stat-item">
                            <strong className="text-blue" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                4.9
                                <span style={{ display: 'flex', gap: '2px' }}>
                                    {[1, 2, 3, 4, 5].map(i => (
                                        <svg key={i} width="16" height="16" viewBox="0 0 24 24" fill="#0ea5e9">
                                            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                                        </svg>
                                    ))}
                                </span>
                            </strong>
                            <span>Avaliação no Google</span>
                        </div>
                    </div>
                </div>
                <div className="hero-image">
                    <img src="/hero-bg.png" alt="Graphène Manipulações" />
                </div>
            </div>
        </section>
    );
};

export default HeroSection;
