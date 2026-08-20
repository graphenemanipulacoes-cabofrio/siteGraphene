import React, { useState } from 'react';
import { getWhatsAppUrl } from '../config';
import { Cpu, Zap, CheckCircle2, Sparkles, Send, ShieldCheck, Flame, Dumbbell, Activity, HeartPulse, Brain, Sun, Moon } from 'lucide-react';

const objectives = [
    { id: 'esporte', title: 'Hipertrofia & Força', icon: Dumbbell, actives: 'Creatina Creapure®, Beta-Alanina, HMB, Complexo B Ativado', tag: 'Performance' },
    { id: 'queima', title: 'Queima Acelerada & Saciedade', icon: Flame, actives: 'Morosil® Autêntico, Ioimbina HCl, Picolinato Cromo, Cacti-Nea', tag: 'Metabolismo' },
    { id: 'hormonal', title: 'Modulação & Equilíbrio', icon: Activity, actives: 'DHEA Bioidêntico, Fitormônios, Maca Negra, Tribulus 90%', tag: 'Hormônios' },
    { id: 'longevidade', title: 'Longevidade & Mitocôndria', icon: HeartPulse, actives: 'CoQ10 Lipossomada, Resveratrol Trans, NAC, PQQ, D3 + K2', tag: 'Anti-Aging' },
    { id: 'nootropico', title: 'Nootrópico & Foco Cerebral', icon: Brain, actives: 'Ashwagandha KSM-66, L-Teanina, Alfa-GPC, Rhodiola Rosea', tag: 'Cognição' },
    { id: 'sono', title: 'Sono REM & Relaxamento', icon: Moon, actives: 'Melatonina Sublingual, 5-HTP, Magnésio Inositol, Passiflora', tag: 'Descanso' },
];

const vehicles = [
    { id: 'caps', title: 'Cápsulas Lipossomadas', desc: 'Máxima biodisponibilidade e proteção gástrica' },
    { id: 'sache', title: 'Sachês Efervescentes', desc: 'Sabor refrescante e absorção ultra-rápida' },
    { id: 'sublingual', title: 'Gotas Sublinguais', desc: 'Ação imediata sem passagem hepática' },
    { id: 'topico', title: 'Sérum / Creme Estéril', desc: 'Alta permeabilidade dermatológica' },
];

const durations = [
    { days: '30 Dias', badge: 'Inicial' },
    { days: '60 Dias', badge: 'Recomendado' },
    { days: '90 Dias', badge: 'Melhor Custo' },
];

const FormulaSimulator = () => {
    const [selectedObj, setSelectedObj] = useState(objectives[0]);
    const [selectedVehicle, setSelectedVehicle] = useState(vehicles[0]);
    const [selectedDuration, setSelectedDuration] = useState(durations[1]);

    const handleSendSimulatedQuote = () => {
        const msg = `Olá, utilizei o *Simulador de Fórmulas Graphène* no site e gostaria de cotar:\n\n🎯 *Objetivo:* ${selectedObj.title}\n🧪 *Veículo:* ${selectedVehicle.title}\n📅 *Duração:* ${selectedDuration.days}\n💊 *Ativos Sugeridos:* ${selectedObj.actives}`;
        window.open(getWhatsAppUrl(msg), '_blank');
    };

    return (
        <section id="simulador" className="section cyber-simulator-section">
            <div className="container">
                <div className="section-headline">
                    <div className="cyber-badge pulse-glow">
                        <Cpu size={14} />
                        <span>ESTÚDIO DE MANIPULAÇÃO DIGITAL</span>
                    </div>
                    <h2>Simulador de <span className="text-gradient-cyan">Fórmulas Inteligentes</span></h2>
                    <p>
                        Configure a combinação ideal de acordo com seus objetivos. Nossa equipe de farmacêuticos recebe sua configuração e calcula o orçamento em poucos minutos.
                    </p>
                </div>

                <div className="simulator-grid-panel">
                    {/* Controls Column */}
                    <div className="simulator-controls">
                        {/* Step 1 */}
                        <div className="simulator-step-box">
                            <div className="step-label">
                                <span className="step-num">01</span>
                                <h4>Selecione o Objetivo Terapêutico</h4>
                            </div>
                            <div className="objectives-grid">
                                {objectives.map((obj) => {
                                    const Icon = obj.icon;
                                    const isSelected = selectedObj.id === obj.id;
                                    return (
                                        <button
                                            key={obj.id}
                                            type="button"
                                            className={`cyber-option-btn ${isSelected ? 'cyber-option-btn--active' : ''}`}
                                            onClick={() => setSelectedObj(obj)}
                                        >
                                            <Icon size={20} className="option-icon" />
                                            <span className="option-title">{obj.title}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Step 2 */}
                        <div className="simulator-step-box">
                            <div className="step-label">
                                <span className="step-num">02</span>
                                <h4>Forma Farmacêutica (Apresentação)</h4>
                            </div>
                            <div className="vehicles-grid">
                                {vehicles.map((v) => {
                                    const isSelected = selectedVehicle.id === v.id;
                                    return (
                                        <button
                                            key={v.id}
                                            type="button"
                                            className={`cyber-option-btn ${isSelected ? 'cyber-option-btn--active' : ''}`}
                                            onClick={() => setSelectedVehicle(v)}
                                        >
                                            <span className="option-title">{v.title}</span>
                                            <small className="option-desc">{v.desc}</small>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Step 3 */}
                        <div className="simulator-step-box">
                            <div className="step-label">
                                <span className="step-num">03</span>
                                <h4>Duração do Tratamento</h4>
                            </div>
                            <div className="durations-row">
                                {durations.map((d, i) => {
                                    const isSelected = selectedDuration.days === d.days;
                                    return (
                                        <button
                                            key={i}
                                            type="button"
                                            className={`duration-pill ${isSelected ? 'duration-pill--active' : ''}`}
                                            onClick={() => setSelectedDuration(d)}
                                        >
                                            <strong>{d.days}</strong>
                                            <span>{d.badge}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    {/* Real-time Preview Console Column */}
                    <div className="simulator-console-view">
                        <div className="console-hud-card">
                            <div className="console-hud-header">
                                <div className="hud-dots">
                                    <span />
                                    <span />
                                    <span />
                                </div>
                                <span className="hud-title">GRAPHÈNE • FICHA TÉCNICA LIVE</span>
                            </div>

                            <div className="console-hud-body">
                                <div className="hud-spec-row">
                                    <span className="hud-spec-label">OBJETIVO:</span>
                                    <strong className="hud-spec-value text-gradient-cyan">{selectedObj.title}</strong>
                                </div>

                                <div className="hud-spec-row">
                                    <span className="hud-spec-label">VEÍCULO:</span>
                                    <strong className="hud-spec-value">{selectedVehicle.title}</strong>
                                </div>

                                <div className="hud-spec-row">
                                    <span className="hud-spec-label">DURAÇÃO ESTIMADA:</span>
                                    <strong className="hud-spec-value text-gradient-emerald">{selectedDuration.days}</strong>
                                </div>

                                <div className="hud-actives-box">
                                    <span className="hud-spec-label">ATIVOS RECOMENDADOS & SINÉRGICOS:</span>
                                    <p>{selectedObj.actives}</p>
                                </div>

                                <div className="hud-guarantee-strip">
                                    <ShieldCheck size={16} color="var(--emerald)" />
                                    <span>Laboratório Próprio em Cabo Frio com Pesagem Computadorizada</span>
                                </div>

                                <button
                                    onClick={handleSendSimulatedQuote}
                                    className="btn-cyber-primary simulator-submit-btn"
                                >
                                    <Zap size={18} />
                                    <span>Gerar Orçamento Oficial no WhatsApp</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <style>{`
                .cyber-simulator-section {
                    background: rgba(8, 11, 17, 0.9);
                    border-top: 1px solid var(--border-subtle);
                    border-bottom: 1px solid var(--border-subtle);
                }

                .simulator-grid-panel {
                    display: grid;
                    grid-template-columns: 1.25fr 0.75fr;
                    gap: 40px;
                    align-items: start;
                }

                .simulator-controls {
                    display: flex;
                    flex-direction: column;
                    gap: 32px;
                }

                .simulator-step-box {
                    display: flex;
                    flex-direction: column;
                    gap: 16px;
                }

                .step-label {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                }

                .step-num {
                    font-size: 1.1rem;
                    font-weight: 900;
                    color: var(--cyan);
                    background: rgba(0, 240, 255, 0.1);
                    border: 1px solid var(--border-cyan);
                    width: 34px;
                    height: 34px;
                    border-radius: var(--radius-xs);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }

                .step-label h4 {
                    font-size: 1.15rem;
                    font-weight: 700;
                    color: var(--text-white);
                }

                .objectives-grid {
                    display: grid;
                    grid-template-columns: repeat(2, 1fr);
                    gap: 12px;
                }

                .vehicles-grid {
                    display: grid;
                    grid-template-columns: repeat(2, 1fr);
                    gap: 12px;
                }

                .cyber-option-btn {
                    background: var(--bg-card);
                    border: 1px solid var(--border-subtle);
                    border-radius: var(--radius-sm);
                    padding: 16px;
                    display: flex;
                    flex-direction: column;
                    align-items: flex-start;
                    gap: 6px;
                    text-align: left;
                    cursor: pointer;
                    transition: var(--transition-fast);
                    position: relative;
                }

                .cyber-option-btn:hover {
                    border-color: var(--cyan);
                    background: var(--bg-card-elevated);
                }

                .cyber-option-btn--active {
                    border-color: var(--cyan);
                    background: rgba(0, 240, 255, 0.08);
                    box-shadow: 0 0 20px rgba(0, 240, 255, 0.2);
                }

                .option-icon {
                    color: var(--cyan);
                    margin-bottom: 2px;
                }

                .option-title {
                    font-size: 0.95rem;
                    font-weight: 700;
                    color: var(--text-white);
                }

                .option-desc {
                    font-size: 0.78rem;
                    color: var(--text-dim);
                }

                .durations-row {
                    display: grid;
                    grid-template-columns: repeat(3, 1fr);
                    gap: 12px;
                }

                .duration-pill {
                    background: var(--bg-card);
                    border: 1px solid var(--border-subtle);
                    border-radius: var(--radius-sm);
                    padding: 14px;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 4px;
                    cursor: pointer;
                    transition: var(--transition-fast);
                }

                .duration-pill:hover {
                    border-color: var(--emerald);
                }

                .duration-pill--active {
                    border-color: var(--emerald);
                    background: rgba(16, 185, 129, 0.1);
                    box-shadow: 0 0 20px rgba(16, 185, 129, 0.2);
                }

                .duration-pill strong {
                    font-size: 1rem;
                    color: var(--text-white);
                }

                .duration-pill span {
                    font-size: 0.74rem;
                    font-weight: 700;
                    color: var(--emerald);
                    text-transform: uppercase;
                }

                /* Console HUD */
                .simulator-console-view {
                    position: sticky;
                    top: 100px;
                }

                .console-hud-card {
                    background: var(--bg-card);
                    border: 1px solid var(--border-cyan);
                    border-radius: var(--radius-md);
                    overflow: hidden;
                    box-shadow: var(--shadow-neon-cyan);
                }

                .console-hud-header {
                    background: rgba(0, 240, 255, 0.1);
                    padding: 14px 20px;
                    border-bottom: 1px solid var(--border-cyan);
                    display: flex;
                    align-items: center;
                    gap: 14px;
                }

                .hud-dots {
                    display: flex;
                    gap: 6px;
                }

                .hud-dots span {
                    width: 8px;
                    height: 8px;
                    border-radius: 50%;
                    background: var(--cyan);
                    opacity: 0.7;
                }

                .hud-title {
                    font-size: 0.74rem;
                    font-weight: 900;
                    letter-spacing: 0.1em;
                    color: var(--cyan);
                }

                .console-hud-body {
                    padding: 28px 24px;
                    display: flex;
                    flex-direction: column;
                    gap: 20px;
                }

                .hud-spec-row {
                    display: flex;
                    flex-direction: column;
                    gap: 4px;
                    padding-bottom: 12px;
                    border-bottom: 1px solid var(--border-subtle);
                }

                .hud-spec-label {
                    font-size: 0.72rem;
                    font-weight: 800;
                    letter-spacing: 0.08em;
                    color: var(--text-muted);
                }

                .hud-spec-value {
                    font-size: 1.15rem;
                    color: var(--text-white);
                }

                .hud-actives-box {
                    background: rgba(255, 255, 255, 0.03);
                    border: 1px solid var(--border-subtle);
                    border-radius: var(--radius-sm);
                    padding: 14px;
                    display: flex;
                    flex-direction: column;
                    gap: 6px;
                }

                .hud-actives-box p {
                    font-size: 0.88rem;
                    color: var(--cyan);
                    font-weight: 600;
                    line-height: 1.5;
                }

                .hud-guarantee-strip {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    font-size: 0.78rem;
                    color: var(--text-dim);
                }

                .simulator-submit-btn {
                    width: 100%;
                    padding: 16px;
                    font-size: 0.92rem;
                }

                @media (max-width: 1024px) {
                    .simulator-grid-panel {
                        grid-template-columns: 1fr;
                    }
                    .simulator-console-view {
                        position: static;
                    }
                }

                @media (max-width: 640px) {
                    .objectives-grid,
                    .vehicles-grid,
                    .durations-row {
                        grid-template-columns: 1fr;
                    }
                }
            `}</style>
        </section>
    );
};

export default FormulaSimulator;
