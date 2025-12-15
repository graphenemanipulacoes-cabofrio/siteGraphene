import { useEffect, useState } from 'react';

const HeroAnimation = () => {
    return (
        <div className="bottle-container">
            <div className="glow-backdrop"></div>

            {/* The Floating Bottle */}
            <div className="glass-bottle floating">
                <div className="bottle-cap"></div>
                <div className="bottle-neck"></div>
                <div className="bottle-body">
                    <div className="liquid">
                        <div className="liquid-surface"></div>
                        <div className="bubbles">
                            <span></span><span></span><span></span>
                            <span></span><span></span>
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
                    justify-content: center;
                    align-items: center;
                    perspective: 1000px;
                }

                .glow-backdrop {
                    position: absolute;
                    width: 250px;
                    height: 250px;
                    background: var(--primary-blue);
                    filter: blur(80px);
                    opacity: 0.2;
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
                    width: 80px;
                    height: 30px;
                    background: linear-gradient(90deg, #333, #555, #333);
                    border-radius: 5px;
                    margin: 0 auto;
                    position: relative;
                    top: 10px;
                    z-index: 5;
                    box-shadow: 0 5px 10px rgba(0,0,0,0.3);
                }

                .bottle-neck {
                    width: 60px;
                    height: 30px;
                    background: rgba(255, 255, 255, 0.1);
                    margin: 0 auto;
                    backdrop-filter: blur(5px);
                    border-left: 1px solid rgba(255,255,255,0.3);
                    border-right: 1px solid rgba(255,255,255,0.3);
                    position: relative;
                    top: 5px;
                }

                .bottle-body {
                    width: 100%;
                    height: 180px;
                    background: rgba(255, 255, 255, 0.05);
                    border-radius: 20px;
                    border: 1px solid rgba(255, 255, 255, 0.2);
                    border-bottom: 2px solid rgba(255, 255, 255, 0.3);
                    backdrop-filter: blur(10px);
                    position: relative;
                    overflow: hidden;
                    box-shadow: 
                        0 15px 35px rgba(0,0,0,0.2),
                        inset 0 0 20px rgba(255,255,255,0.05);
                }

                /* Liquid */
                .liquid {
                    position: absolute;
                    bottom: 10px;
                    left: 5px;
                    right: 5px;
                    height: 120px;
                    background: linear-gradient(180deg, rgba(0, 229, 255, 0.6), rgba(163, 230, 53, 0.4));
                    border-radius: 0 0 15px 15px;
                    box-shadow: 0 0 20px var(--primary-blue-glow);
                    transform-origin: bottom;
                    animation: liquid-swish 6s ease-in-out infinite;
                }

                .liquid-surface {
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    height: 10px;
                    background: rgba(255, 255, 255, 0.3);
                    border-radius: 50%;
                    transform: scaleY(0.3);
                }

                .highlight {
                    position: absolute;
                    top: 10px;
                    left: 10px;
                    width: 15px;
                    height: 100px;
                    background: linear-gradient(180deg, rgba(255,255,255,0.4), transparent);
                    border-radius: 10px;
                }

                /* Bubbles */
                .bubbles span {
                    position: absolute;
                    bottom: -10px;
                    background: rgba(255, 255, 255, 0.5);
                    border-radius: 50%;
                    animation: rise 4s infinite linear;
                }
                .bubbles span:nth-child(1) { width: 8px; height: 8px; left: 20%; animation-duration: 3s; }
                .bubbles span:nth-child(2) { width: 5px; height: 5px; left: 50%; animation-duration: 5s; animation-delay: 1s; }
                .bubbles span:nth-child(3) { width: 10px; height: 10px; left: 70%; animation-duration: 4s; animation-delay: 2s; }
                .bubbles span:nth-child(4) { width: 6px; height: 6px; left: 30%; animation-duration: 6s; }
                .bubbles span:nth-child(5) { width: 4px; height: 4px; left: 80%; animation-duration: 3.5s; animation-delay: 0.5s; }

                /* Floating Molecules */
                .molecule {
                    position: absolute;
                    border: 1px solid var(--primary-blue);
                    border-radius: 50%;
                    opacity: 0.6;
                }
                .m1 { width: 40px; height: 40px; top: 10%; right: 10%; animation: float-delayed 8s infinite; }
                .m2 { width: 20px; height: 20px; bottom: 20%; left: 10%; animation: float 7s infinite reverse; background: rgba(0, 229, 255, 0.1); }
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
                    0% { opacity: 0.1; transform: scale(1); }
                    100% { opacity: 0.3; transform: scale(1.1); }
                }

                @keyframes liquid-swish {
                    0%, 100% { transform: rotate(0deg); }
                    25% { transform: rotate(1deg); }
                    75% { transform: rotate(-1deg); }
                }

                @keyframes rise {
                    0% { transform: translateY(0) scale(1); opacity: 0; }
                    50% { opacity: 1; }
                    100% { transform: translateY(-100px) scale(0); opacity: 0; }
                }
                
                @media (max-width: 768px) {
                    .bottle-container { transform: scale(0.8); height: 300px; }
                }
            `}</style>
        </div>
    );
};

export default HeroAnimation;
