import React from 'react';

const GrapheneBackground = () => {
    // Geometria precisa do retículo hexagonal regular de carbono (Grafeno)
    // R = 24px (raio do anel de carbono)
    // dx = R * cos(30°) = 20.7846px
    // dy = R * sin(30°) = 12px
    // Largura do padrão = 2 * dx = 41.5692px
    // Altura do padrão = 3 * R = 72px
    return (
        <div className="graphene-bg-clean" aria-hidden="true">
            <svg className="graphene-svg" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
                <defs>
                    <pattern
                        id="graphene-exact-lattice"
                        width="41.5692"
                        height="72"
                        patternUnits="userSpaceOnUse"
                    >
                        {/* Ligações Covalentes de Carbono (sp2) formando anéis hexagonais contínuos */}
                        <path
                            d="M 20.7846 0 L 20.7846 12 
                               L 0 24 L 0 48 
                               L 20.7846 60 L 20.7846 72 
                               M 20.7846 12 L 41.5692 24 L 41.5692 48 L 20.7846 60"
                            fill="none"
                            stroke="rgba(255, 255, 255, 0.08)"
                            strokeWidth="1.2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        />
                    </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#graphene-exact-lattice)" />
            </svg>

            <style>{`
                .graphene-bg-clean {
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100vw;
                    height: 100vh;
                    pointer-events: none;
                    z-index: 0;
                    background-color: #08090d;
                }

                .graphene-svg {
                    position: absolute;
                    inset: 0;
                    width: 100%;
                    height: 100%;
                }
            `}</style>
        </div>
    );
};

export default GrapheneBackground;
