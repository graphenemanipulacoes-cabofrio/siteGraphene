import { useEffect, useState } from 'react';

const HeroAnimation = () => {
    return (
        <div className="bottle-container">
            {/* Dynamic Background - Keeping the energy */}
            <div className="aura-wrapper">
                <div className="aura-core"></div>
                <div className="aura-rays"></div>
                <div className="aura-spin"></div>
            </div>

            {/* Particle System */}
            <div className="particles-system">
                {[...Array(10)].map((_, i) => (
                    <span key={i} className={`element p${i + 1}`}></span>
                ))}
            </div>

            {/* Refined Bottle Design - Proportional & Elegant */}
            <div className="glass-bottle-refined floating">
                <div className="bottle-cap-refined"></div>
                <div className="bottle-neck-refined"></div>
                <div className="bottle-body-refined">
                    {/* Subtle Liquid Glow */}
                    <div className="liquid-glow-subtle"></div>

                    {/* Balanced Label */}
                    <div className="bottle-label-refined">
                        <div className="shimmer-subtle"></div>
                        <div className="label-content">
                            <span className="brand-name notranslate" translate="no">GRAPHÈNE</span>
                        </div>
                    </div>

                    {/* Natural Reflections */}
                    <div className="glass-highlight-refined"></div>
                </div>
            </div>

            <style>{`
                .bottle-container {
                    position: relative;
                    width: 320px;
                    height: 400px;
                    display: flex;
                    pointer-events: none;
                    justify-content: center;
                    align-items: center;
                    perspective: 1000px;
                }

                /* --- DYNAMIC BACKGROUND --- */
                .aura-wrapper {
                    position: absolute;
                    width: 100%;
                    height: 100%;
                    z-index: 1;
                }
                .aura-core {
                    position: absolute;
                    top: 50%; left: 50%;
                    width: 280px; height: 280px;
                    background: radial-gradient(circle, var(--primary-blue) 0%, transparent 70%);
                    opacity: 0.15;
                    filter: blur(50px);
                    transform: translate(-50%, -50%);
                    animation: aura-pulse 5s ease-in-out infinite alternate;
                }
                .aura-spin {
                    position: absolute;
                    top: 50%; left: 50%;
                    width: 350px; height: 350px;
                    background: conic-gradient(from 0deg, transparent, rgba(14, 165, 233, 0.1), transparent, rgba(2, 132, 199, 0.1), transparent);
                    filter: blur(40px);
                    transform: translate(-50%, -50%);
                    animation: spin 20s linear infinite;
                }
                .aura-rays {
                    position: absolute;
                    top: 50%; left: 50%;
                    width: 450px; height: 450px;
                    background: repeating-conic-gradient(from 0deg, transparent 0deg, rgba(2, 132, 199, 0.03) 15deg, transparent 30deg);
                    mask-image: radial-gradient(circle, black 20%, transparent 70%);
                    transform: translate(-50%, -50%);
                    animation: spin 40s linear infinite reverse;
                }

                /* --- REFINED BOTTLE --- */
                .glass-bottle-refined {
                    position: relative;
                    width: 140px; /* Restored elegant width */
                    height: 220px;
                    z-index: 10;
                    filter: drop-shadow(0 15px 35px rgba(0,0,0,0.3));
                }

                .floating {
                    animation: float-refined 6s ease-in-out infinite;
                }

                .bottle-cap-refined {
                    width: 90px;
                    height: 34px;
                    background: linear-gradient(180deg, #1e293b 0%, #0f172a 100%);
                    border-radius: 5px;
                    margin: 0 auto;
                    position: relative;
                    top: 10px;
                    border-bottom: 1px solid rgba(255,255,255,0.05);
                    box-shadow: 0 4px 10px rgba(0,0,0,0.2);
                    z-index: 5;
                }

                .bottle-neck-refined {
                    width: 70px;
                    height: 24px;
                    background: #1e293b;
                    margin: 0 auto;
                    position: relative;
                    top: 8px;
                    z-index: 4;
                }

                .bottle-body-refined {
                    width: 100%;
                    height: 185px;
                    background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
                    border-radius: 20px;
                    position: relative;
                    overflow: hidden;
                    border: 1px solid rgba(255,255,255,0.05);
                }

                .liquid-glow-subtle {
                    position: absolute;
                    bottom: -20px;
                    left: 10%; right: 10%;
                    height: 100px;
                    background: var(--primary-blue);
                    filter: blur(40px);
                    opacity: 0.12;
                    animation: pulse-liquid 4s ease-in-out infinite alternate;
                }

                .bottle-label-refined {
                    position: absolute;
                    top: 42px;
                    left: 0; right: 0;
                    height: 80px; /* Balanced height */
                    background: linear-gradient(90deg, #0284c7 0%, #0ea5e9 50%, #0284c7 100%);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.15);
                    overflow: hidden;
                }

                .shimmer-subtle {
                    position: absolute;
                    top: 0; left: -100%;
                    width: 40%; height: 100%;
                    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent);
                    transform: skewX(-20deg);
                    animation: shimmer-light 5s infinite;
                }

                .brand-name {
                    font-family: 'Montserrat', sans-serif;
                    font-weight: 800;
                    font-size: 1.35rem; /* Proportional font size */
                    color: white;
                    letter-spacing: 1.5px;
                    text-shadow: 0 1px 3px rgba(0,0,0,0.1);
                    font-style: italic;
                    z-index: 2;
                }

                .glass-highlight-refined {
                    position: absolute;
                    top: 10px; left: 10px;
                    width: 12px; height: 160px;
                    background: linear-gradient(180deg, rgba(255,255,255,0.08), transparent);
                    border-radius: 10px;
                }

                /* --- PARTICLES --- */
                .element {
                    position: absolute;
                    background: var(--primary-blue);
                    border-radius: 50%;
                    opacity: 0;
                }
                ${[...Array(10)].map((_, i) => `
                    .p${i + 1} {
                        width: ${Math.random() * 4 + 2}px;
                        height: ${Math.random() * 4 + 2}px;
                        left: ${Math.random() * 100}%;
                        top: ${Math.random() * 100}%;
                        animation: float-particle-${i} ${Math.random() * 8 + 8}s linear infinite;
                        animation-delay: ${Math.random() * 5}s;
                        opacity: ${Math.random() * 0.3 + 0.1};
                    }
                    @keyframes float-particle-${i} {
                        0% { transform: translate(0, 0); opacity: 0; }
                        20% { opacity: 0.4; }
                        80% { opacity: 0.4; }
                        100% { transform: translate(${Math.random() * 60 - 30}px, -120px); opacity: 0; }
                    }
                `).join('')}

                /* --- ANIMATIONS --- */
                @keyframes float-refined {
                    0%, 100% { transform: translateY(0) rotate(-0.5deg); }
                    50% { transform: translateY(-18px) rotate(0.5deg); }
                }
                @keyframes aura-pulse {
                    0% { transform: translate(-50%, -50%) scale(0.9); opacity: 0.1; }
                    100% { transform: translate(-50%, -50%) scale(1.1); opacity: 0.2; }
                }
                @keyframes spin {
                    from { transform: translate(-50%, -50%) rotate(0deg); }
                    to { transform: translate(-50%, -50%) rotate(360deg); }
                }
                @keyframes shimmer-light {
                    0% { left: -100%; }
                    25% { left: 150%; }
                    100% { left: 150%; }
                }
                @keyframes pulse-liquid {
                    0% { opacity: 0.08; transform: scaleY(0.9); }
                    100% { opacity: 0.2; transform: scaleY(1.1); }
                }

                @media (max-width: 768px) {
                    .bottle-container { transform: scale(0.85); height: 320px; }
                }
            `}</style>
        </div>
    );
};

export default HeroAnimation;
