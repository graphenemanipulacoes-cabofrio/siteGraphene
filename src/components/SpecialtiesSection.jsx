import React, { useState } from 'react';
import { Dumbbell, Sparkles, HeartPulse, Activity, Flame, Flower2, ArrowRight, Check, MessageCircle } from 'lucide-react';
import { getWhatsAppUrl } from '../config';

const specialties = [
    {
        id: 'esporte',
        title: 'Nutrição & Performance Esportiva',
        shortDesc: 'Otimização muscular, recuperação acelerada e resistência sob prescrição.',
        fullDesc: 'Fórmulas hiper-personalizadas para atletas e praticantes de atividade física que buscam resultados de alta performance com pureza máxima e absorção otimizada.',
        icon: Dumbbell,
        badge: 'Alta Performance',
        popularActives: ['Creatina Creapure®', 'Beta-Alanina Pura', 'Compostos Pré-Treino', 'HMB', 'Glutamina Micronizada'],
        color: '#0284c7',
    },
    {
        id: 'longevidade',
        title: 'Longevidade & Saúde Integrativa',
        shortDesc: 'Prevenção do estresse oxidativo, suporte celular e vigor biológico.',
        fullDesc: 'Modulação de micronutrientes, antioxidantes mitocondriais e adaptógenos para proteger o organismo contra o envelhecimento precoce e promover vitalidade contínua.',
        icon: HeartPulse,
        badge: 'Anti-Aging & Vigor',
        popularActives: ['Coenzima Q10 Lipossomada', 'Resveratrol Trans', 'N-Acetilcisteína (NAC)', 'Vitaminas D3 + K2', 'PQQ'],
        color: '#0d9488',
    },
    {
        id: 'dermocosmeticos',
        title: 'Dermatologia & Estética Avançada',
        shortDesc: 'Séruns de alta permeabilidade, fotoproteção e nutricosméticos orais.',
        fullDesc: 'Cuidados dermatológicos específicos para tratamentos de manchas, renovação celular, estímulo de colágeno, combate à acne e hidratação profunda em veículos hipoalergênicos.',
        icon: Sparkles,
        badge: 'Dermo & Skincare',
        popularActives: ['Ácido Hialurônico Multipeso', 'Vitamina C Estabilizada', 'Retinol Suave', 'Niacinamida 10%', 'Bio-Silício'],
        color: '#8b5cf6',
    },
    {
        id: 'hormonal',
        title: 'Modulação & Equilíbrio Hormonal',
        shortDesc: 'Suporte à saúde da mulher e do homem com equilíbrio fisiológico.',
        fullDesc: 'Compostos e fitormônios individualizados para suporte ao ciclo circadiano, alívio de sintomas de transição hormonal, bem-estar da tireoide e vitalidade.',
        icon: Activity,
        badge: 'Equilíbrio Vital',
        popularActives: ['Fitormônios Naturais', 'DHEA Bioidêntico', 'Tribulus Terrestris 90%', 'Maca Peruana Black', 'Saw Palmetto'],
        color: '#f59e0b',
    },
    {
        id: 'emagrecimento',
        title: 'Gerenciamento de Peso & Saciedade',
        shortDesc: 'Aceleração metabólica, queima de gordura e controle da compulsão.',
        fullDesc: 'Fórmulas auxiliares que atuam no gasto calórico basal, melhora da sensibilidade à insulina, modulação da ansiedade e redução de retenção de líquidos.',
        icon: Flame,
        badge: 'Metabolismo & Queima',
        popularActives: ['Morosil® Autêntico', 'Ioimbina HCl', 'Picolinato de Cromo', 'Drenagem Linfática Oral (Cacti-Nea)', 'Faseolamina'],
        color: '#ef4444',
    },
    {
        id: 'fitoterapia',
        title: 'Fitoterapia, Sono & Relaxamento',
        shortDesc: 'Indução do sono REM profundo e alívio natural da ansiedade.',
        fullDesc: 'Extratos vegetais padronizados, nootrópicos para foco cognitivo e moduladores neurais que reduzem o cortisol e melhoram a qualidade do descanso noturno.',
        icon: Flower2,
        badge: 'Mente & Sono',
        popularActives: ['Melatonina Sublingual', 'Ashwagandha KSM-66', 'Passiflora Incarnata', 'L-Teanina Pura', '5-HTP'],
        color: '#10b981',
    }
];

const SpecialtiesSection = () => {
    const [selectedTab, setSelectedTab] = useState(specialties[0]);

    return (
        <section id="especialidades" className="section section--subtle specialties-section">
            <div className="container">
                <div className="section-header-modern">
                    <span className="section-tag">Áreas de Manipulação</span>
                    <h2>Especialidades Farmacêuticas</h2>
                    <p>
                        Manipulação precisa com dosagens exatas adaptadas ao organismo de cada paciente, conforme prescrição médica ou indicação nutricional.
                    </p>
                </div>

                {/* Specialties Grid / Tabs */}
                <div className="specialties-interactive-grid">
                    {/* Left Column: Specialty Cards List */}
                    <div className="specialties-list">
                        {specialties.map((item) => {
                            const IconComponent = item.icon;
                            const isSelected = selectedTab.id === item.id;
                            return (
                                <div
                                    key={item.id}
                                    className={`specialty-nav-card ${isSelected ? 'specialty-nav-card--active' : ''}`}
                                    onClick={() => setSelectedTab(item)}
                                >
                                    <div className="specialty-icon-frame" style={{ color: item.color }}>
                                        <IconComponent size={24} />
                                    </div>
                                    <div className="specialty-nav-info">
                                        <div className="specialty-nav-header">
                                            <h4>{item.title}</h4>
                                            <span className="specialty-nav-badge">{item.badge}</span>
                                        </div>
                                        <p>{item.shortDesc}</p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Right Column: Active Specialty Feature Showcase */}
                    <div className="specialty-showcase-panel">
                        <div className="showcase-content-box">
                            <div className="showcase-header">
                                <span className="badge-pill" style={{ color: selectedTab.color, borderColor: `${selectedTab.color}33`, background: `${selectedTab.color}11` }}>
                                    {selectedTab.badge}
                                </span>
                                <h3>{selectedTab.title}</h3>
                                <p className="showcase-desc">{selectedTab.fullDesc}</p>
                            </div>

                            <div className="showcase-actives-section">
                                <h5>Princípios Ativos e Insumos Mais Solicitados:</h5>
                                <div className="actives-tags-grid">
                                    {selectedTab.popularActives.map((active, index) => (
                                        <div key={index} className="active-tag-item">
                                            <Check size={14} style={{ color: selectedTab.color }} />
                                            <span>{active}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="showcase-footer">
                                <div className="showcase-tip">
                                    <strong>💡 Possui receita para esta área?</strong>
                                    <span>Nossos farmacêuticos cotam a fórmula exata prescrita pelo seu médico.</span>
                                </div>

                                <a
                                    href={getWhatsAppUrl(`Olá! Gostaria de cotar uma fórmula de *${selectedTab.title}*.`)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="btn-primary-lux showcase-action-btn"
                                >
                                    <MessageCircle size={18} />
                                    <span>Cotar {selectedTab.badge} no WhatsApp</span>
                                </a>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <style>{`
                .specialties-section {
                    position: relative;
                    background: #f8fafc;
                }

                .specialties-interactive-grid {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 32px;
                    align-items: stretch;
                }

                .specialties-list {
                    display: flex;
                    flex-direction: column;
                    gap: 12px;
                }

                .specialty-nav-card {
                    display: flex;
                    align-items: flex-start;
                    gap: 16px;
                    background: #ffffff;
                    border: 1px solid var(--border-light);
                    border-radius: var(--radius-md);
                    padding: 18px 20px;
                    cursor: pointer;
                    transition: var(--transition-base);
                    position: relative;
                }

                .specialty-nav-card:hover {
                    border-color: var(--primary-200);
                    transform: translateX(4px);
                    box-shadow: var(--shadow-sm);
                }

                .specialty-nav-card--active {
                    background: #ffffff;
                    border-color: var(--primary);
                    box-shadow: var(--shadow-md);
                }

                .specialty-nav-card--active::before {
                    content: '';
                    position: absolute;
                    left: 0;
                    top: 0;
                    bottom: 0;
                    width: 4px;
                    background: var(--gradient-brand);
                    border-radius: var(--radius-md) 0 0 var(--radius-md);
                }

                .specialty-icon-frame {
                    width: 46px;
                    height: 46px;
                    border-radius: var(--radius-sm);
                    background: var(--bg-subtle);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    flex-shrink: 0;
                    transition: var(--transition-base);
                }

                .specialty-nav-card--active .specialty-icon-frame {
                    background: var(--primary-50);
                }

                .specialty-nav-info {
                    flex: 1;
                }

                .specialty-nav-header {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 8px;
                    margin-bottom: 4px;
                }

                .specialty-nav-header h4 {
                    font-size: 1rem;
                    font-weight: 700;
                    color: var(--text-primary);
                }

                .specialty-nav-badge {
                    font-size: 0.72rem;
                    font-weight: 700;
                    padding: 2px 8px;
                    border-radius: var(--radius-full);
                    background: var(--bg-subtle);
                    color: var(--text-light);
                }

                .specialty-nav-card p {
                    font-size: 0.85rem;
                    color: var(--text-secondary);
                    line-height: 1.4;
                    margin: 0;
                }

                /* Showcase Panel */
                .specialty-showcase-panel {
                    position: sticky;
                    top: 100px;
                    height: fit-content;
                }

                .showcase-content-box {
                    background: #ffffff;
                    border: 1px solid var(--border-light);
                    border-radius: var(--radius-lg);
                    padding: 36px;
                    box-shadow: var(--shadow-lg);
                    display: flex;
                    flex-direction: column;
                    gap: 28px;
                }

                .showcase-header h3 {
                    font-size: 1.6rem;
                    font-weight: 800;
                    margin: 12px 0 8px;
                    color: var(--text-primary);
                }

                .showcase-desc {
                    font-size: 0.98rem;
                    color: var(--text-secondary);
                    line-height: 1.6;
                }

                .showcase-actives-section h5 {
                    font-size: 0.88rem;
                    font-weight: 700;
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                    color: var(--text-light);
                    margin-bottom: 14px;
                }

                .actives-tags-grid {
                    display: grid;
                    grid-template-columns: 1fr;
                    gap: 10px;
                }

                .active-tag-item {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    background: var(--bg-subtle);
                    padding: 10px 14px;
                    border-radius: var(--radius-sm);
                    font-size: 0.9rem;
                    font-weight: 600;
                    color: var(--text-primary);
                }

                .showcase-footer {
                    display: flex;
                    flex-direction: column;
                    gap: 16px;
                    padding-top: 20px;
                    border-top: 1px solid var(--border-light);
                }

                .showcase-tip strong {
                    display: block;
                    font-size: 0.88rem;
                    color: var(--text-primary);
                    margin-bottom: 2px;
                }

                .showcase-tip span {
                    font-size: 0.82rem;
                    color: var(--text-light);
                }

                .showcase-action-btn {
                    width: 100%;
                    padding: 14px;
                }

                @media (max-width: 960px) {
                    .specialties-interactive-grid {
                        grid-template-columns: 1fr;
                    }
                    .specialty-showcase-panel {
                        position: static;
                    }
                }
            `}</style>
        </section>
    );
};

export default SpecialtiesSection;
