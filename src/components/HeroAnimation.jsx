import { useEffect, useState } from 'react';

const HeroAnimation = () => {
    return (
        <div className="bottle-container">
            <div className="glow-backdrop"></div>

            {/* The Solid Bottle */}
            <div className="glass-bottle floating">
                <div className="bottle-cap"></div>
                <div className="bottle-neck"></div>
                <div className="bottle-body">
                    {/* Label */}
                    <div className="bottle-label">
                        <div className="label-content">
                            <span className="brand-name notranslate" translate="no">GRAPHÈNE</span>
                        </div>
                    </div>
                    <div className="highlight"></div>
                </div>
                <div className="bottle-reflection"></div>
            </div>

            {/* Floating Particles/Molecules around */}
            <div className="particles">
                <span className="molecule m1"></span>
                <span className="molecule m2"></span>
                <span className="molecule m3"></span>
            </div>

            <style>{`
                .bottle-container {
                    position: relative;
                    width: 300px;
                    height: 400px;
                    display: flex;
                    pointer-events: none;
                    justify-content: center;
                    align-items: center;
                    perspective: 1000px;
                }

                .glow-backdrop {
                    position: absolute;
                    width: 250px;
                    height: 250px;
                    background: var(--primary-blue);
                    filter: blur(90px);
                    opacity: 0.1;
                    border-radius: 50%;
                    animation: pulse-back 4s ease-in-out infinite alternate;
                }

                .floating {
                    animation: float 6s ease-in-out infinite;
                }

                /* Bottle Structure */
                .glass-bottle {
                    position: relative;
                    width: 140px;
                    height: 220px;
                    transform-style: preserve-3d;
                    z-index: 10;
                }

                .bottle-cap {
                    width: 90px;
                    height: 35px;
                    background: #0f172a; /* Navy Blue/Slate Cap */
                    background: linear-gradient(180deg, #1e293b 0%, #0f172a 100%);
                    border-radius: 5px;
                    margin: 0 auto;
                    position: relative;
                    top: 10px;
                    z-index: 5;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.2);
                    border-bottom: 2px solid rgba(0,0,0,0.1);
                }

                .bottle-neck {
                    width: 70px;
                    height: 25px;
                    background: #334155; /* Slate Neck */
                    margin: 0 auto;
                    position: relative;
                    top: 8px;
                    z-index: 4;
                }

                .bottle-body {
                    width: 100%;
                    height: 180px;
                    background: #0f172a; /* Solid Navy Body */
                    background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
                    border-radius: 20px;
                    position: relative;
                    overflow: hidden;
                    box-shadow: 
                        0 20px 50px rgba(0,0,0,0.15),
                        inset 0 0 20px rgba(255,255,255,0.02); /* Subtle gloss */
                    border: 1px solid rgba(255,255,255,0.05);
                }

                /* BRAND LABEL */
                .bottle-label {
                    position: absolute;
                    top: 40px;
                    left: 0;
                    right: 0;
                    height: 90px;
                    background: var(--primary-blue);
                    background: linear-gradient(90deg, #0284c7 0%, #0ea5e9 50%, #0284c7 100%);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                }

                .brand-name {
                    font-family: 'Montserrat', sans-serif;
                    font-weight: 800;
                    font-size: 1.4rem;
                    color: white;
                    letter-spacing: 1px;
                    text-shadow: 0 1px 2px rgba(0,0,0,0.1);
                    font-style: italic;
                }

                .highlight {
                    position: absolute;
                    top: 10px;
                    left: 10px;
                    width: 15px;
                    height: 160px;
                    background: linear-gradient(180deg, rgba(255,255,255,0.08), transparent);
                    border-radius: 10px;
                    pointer-events: none;
                }

                /* Floating Molecules */
                .molecule {
                    position: absolute;
                    border: 1px solid var(--primary-blue);
                    border-radius: 50%;
                    opacity: 0.3;
                }
                .m1 { width: 40px; height: 40px; top: 10%; right: 10%; animation: float-delayed 8s infinite; }
                .m2 { width: 20px; height: 20px; bottom: 20%; left: 10%; animation: float 7s infinite reverse; background: rgba(2, 132, 199, 0.05); }
                .m3 { width: 30px; height: 30px; top: 40%; right: -10px; animation: float-delayed 5s infinite; border-color: var(--primary-green); }

                @keyframes float {
                    0%, 100% { transform: translateY(0) rotate(0deg); }
                    50% { transform: translateY(-20px) rotate(2deg); }
                }
                
                @keyframes float-delayed {
                    0%, 100% { transform: translateY(0) rotate(0deg); }
                    50% { transform: translateY(-15px) rotate(-5deg); }
                }

                @keyframes pulse-back {
                    0% { opacity: 0.05; transform: scale(1); }
                    100% { opacity: 0.15; transform: scale(1.1); }
                }
                
                @media (max-width: 768px) {
                    .bottle-container { transform: scale(0.85); height: 320px; }
                }
            `}</style>
        </div>
    );
};

export default HeroAnimation;
