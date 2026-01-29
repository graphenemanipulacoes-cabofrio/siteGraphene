import { useEffect, useState } from 'react';

const HeroAnimation = () => {
    return (
        <div className="bottle-container">
            {/* Multi-layered Cinematic Background */}
            <div className="aura-wrapper">
                <div className="aura-core"></div>
                <div className="aura-rays"></div>
                <div className="aura-spin"></div>
            </div>

            {/* Floating Particles - Bokeh & Energy */}
            <div className="particles-system">
                {[...Array(12)].map((_, i) => (
                    <span key={i} className={`element p${i + 1}`}></span>
                ))}
            </div>

            {/* The Solid Bottle with Advanced Shaders */}
            <div className="glass-bottle-3d floating">
                <div className="bottle-cap-pro"></div>
                <div className="bottle-neck-pro"></div>
                <div className="bottle-body-pro">
                    {/* Liquid Pulse Effect */}
                    <div className="liquid-glow"></div>

                    {/* Label with Shimmer */}
                    <div className="bottle-label-pro">
                        <div className="shimmer-effect"></div>
                        <div className="label-content">
                            <span className="brand-name notranslate" translate="no">GRAPHÈNE</span>
                        </div>
                    </div>

                    {/* Dynamic Reflections */}
                    <div className="light-streak"></div>
                    <div className="surface-highlight"></div>
                </div>
            </div>

            <style>{`
                .bottle-container {
                    position: relative;
                    width: 350px;
                    height: 450px;
                    display: flex;
                    pointer-events: none;
                    justify-content: center;
                    align-items: center;
                    perspective: 1500px;
                }

                /* --- AURA & RAYS --- */
                .aura-wrapper {
                    position: absolute;
                    width: 100%;
                    height: 100%;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    z-index: 1;
                }

                .aura-core {
                    position: absolute;
                    width: 300px;
                    height: 300px;
                    background: radial-gradient(circle, var(--primary-blue) 0%, transparent 70%);
                    opacity: 0.2;
                    filter: blur(40px);
                    animation: aura-pulse 4s ease-in-out infinite alternate;
                }

                .aura-spin {
                    position: absolute;
                    width: 400px;
                    height: 400px;
                    background: conic-gradient(from 0deg, transparent, var(--primary-blue), transparent, #0ea5e9, transparent);
                    opacity: 0.1;
                    filter: blur(60px);
                    animation: spin 15s linear infinite;
                }

                .aura-rays {
                    position: absolute;
                    width: 500px;
                    height: 500px;
                    background: repeating-conic-gradient(from 0deg, transparent 0deg, rgba(2, 132, 199, 0.05) 10deg, transparent 20deg);
                    mask-image: radial-gradient(circle, black 30%, transparent 80%);
                    animation: spin 60s linear infinite;
                }

                /* --- BOTTLE EVOLUTION --- */
                .glass-bottle-3d {
                    position: relative;
                    width: 170px;
                    height: 240px;
                    transform-style: preserve-3d;
                    z-index: 10;
                    filter: drop-shadow(0 20px 40px rgba(0,0,0,0.4));
                }

                .floating {
                    animation: float-pro 6s ease-in-out infinite;
                }

                .bottle-cap-pro {
                    width: 100px;
                    height: 38px;
                    background: linear-gradient(135deg, #1e293b 0%, #020617 100%);
                    border-radius: 6px;
                    margin: 0 auto;
                    position: relative;
                    top: 10px;
                    z-index: 5;
                    border-bottom: 3px solid rgba(255,255,255,0.05);
                    box-shadow: inset 0 2px 5px rgba(255,255,255,0.1);
                }

                .bottle-neck-pro {
                    width: 76px;
                    height: 28px;
                    background: #1e293b;
                    margin: 0 auto;
                    position: relative;
                    top: 8px;
                    z-index: 4;
                    box-shadow: inset 0 0 10px rgba(0,0,0,0.5);
                }

                .bottle-body-pro {
                    width: 100%;
                    height: 190px;
                    background: linear-gradient(165deg, #1e293b 0%, #020617 100%);
                    border-radius: 24px;
                    position: relative;
                    overflow: hidden;
                    border: 1px solid rgba(255,255,255,0.08);
                    box-shadow: inset 0 0 30px rgba(0,0,0,0.6);
                }

                /* INNER GLOW / LIQUID */
                .liquid-glow {
                    position: absolute;
                    bottom: -20px;
                    left: 20%;
                    right: 20%;
                    height: 120px;
                    background: var(--primary-blue);
                    filter: blur(45px);
                    opacity: 0.15;
                    animation: liquid-pulse 5s ease-in-out infinite alternate;
                }

                /* LABEL UPGRADE */
                .bottle-label-pro {
                    position: absolute;
                    top: 45px;
                    left: 0;
                    right: 0;
                    height: 95px;
                    background: linear-gradient(90deg, #0369a1 0%, #0ea5e9 50%, #0369a1 100%);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    box-shadow: 0 4px 15px rgba(0,0,0,0.3);
                    overflow: hidden;
                }

                .shimmer-effect {
                    position: absolute;
                    top: 0;
                    left: -100%;
                    width: 50%;
                    height: 100%;
                    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
                    transform: skewX(-20deg);
                    animation: shimmer 4s infinite;
                }

                .brand-name {
                    font-family: 'Poppins', sans-serif;
                    font-weight: 900;
                    font-size: 1.35rem;
                    color: white;
                    letter-spacing: 1px;
                    text-shadow: 0 2px 4px rgba(0,0,0,0.2);
                    font-style: italic;
                    z-index: 2;
                    white-space: nowrap;
                }

                /* GLASS LIGHT EFFECTS */
                .light-streak {
                    position: absolute;
                    top: 0;
                    left: 15px;
                    width: 8px;
                    height: 100%;
                    background: linear-gradient(180deg, rgba(255,255,255,0.1), transparent);
                    border-radius: 10px;
                    opacity: 0.6;
                }

                .surface-highlight {
                    position: absolute;
                    top: 20px;
                    right: 15px;
                    width: 30px;
                    height: 40px;
                    background: radial-gradient(circle, rgba(255,255,255,0.05), transparent);
                    filter: blur(5px);
                }

                /* --- PARTICLES SYSTEM --- */
                .particles-system {
                    position: absolute;
                    width: 100%;
                    height: 100%;
                    z-index: 2;
                }

                .element {
                    position: absolute;
                    background: var(--primary-blue);
                    border-radius: 50%;
                    opacity: 0;
                    filter: blur(1px);
                }

                /* Individual Particle Animation Setup */
                ${[...Array(12)].map((_, i) => `
                    .p${i + 1} {
                        width: ${Math.random() * 6 + 2}px;
                        height: ${Math.random() * 6 + 2}px;
                        left: ${Math.random() * 100}%;
                        top: ${Math.random() * 100}%;
                        animation: particle-float-${i} ${Math.random() * 10 + 10}s linear infinite;
                        animation-delay: ${Math.random() * 5}s;
                        opacity: ${Math.random() * 0.4 + 0.1};
                        background: ${i % 3 === 0 ? '#0ea5e9' : i % 3 === 1 ? '#0284c7' : 'white'};
                    }
                    @keyframes particle-float-${i} {
                        0% { transform: translate(0, 0) scale(1); opacity: 0; }
                        20% { opacity: 0.5; }
                        80% { opacity: 0.5; }
                        100% { transform: translate(${Math.random() * 100 - 50}px, ${Math.random() * -150 - 50}px) scale(0); opacity: 0; }
                    }
                `).join('')}

                /* --- KEYFRAMES --- */
                @keyframes float-refined {
                    0%, 100% { transform: translateY(0) rotate(-1deg); }
                    50% { transform: translateY(-20px) rotate(1deg); }
                }

                @keyframes aura-pulse {
                    0% { transform: scale(0.95); opacity: 0.1; }
                    100% { transform: scale(1.1); opacity: 0.2; }
                }

                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }

                @keyframes liquid-pulse {
                    0% { transform: scaleY(0.9); opacity: 0.08; }
                    100% { transform: scaleY(1.1); opacity: 0.18; }
                }

                @keyframes shimmer {
                    0% { left: -100%; }
                    30% { left: 150%; }
                    100% { left: 150%; }
                }

                @media (max-width: 768px) {
                    .bottle-container { transform: scale(0.8); height: 350px; }
                }
            `}</style>
        </div>
    );

};

export default HeroAnimation;
