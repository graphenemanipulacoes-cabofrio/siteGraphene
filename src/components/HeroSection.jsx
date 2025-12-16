import Button from './Button';
import HeroAnimation from './HeroAnimation';

const HeroSection = () => {
    return (
        <section style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            paddingTop: 'var(--header-height)',
            position: 'relative',
            overflow: 'visible' // Changed to visible to preserve 3D context for animation
        }}>
            {/* Background Graphic Elements */}
            <div style={{
                position: 'absolute',
                top: '20%',
                right: '-10%',
                width: '500px',
                height: '500px',
                background: 'var(--primary-blue)',
                filter: 'blur(150px)',
                opacity: 0.2,
                borderRadius: '50%',
                zIndex: 0
            }} />
            <div className="mobile-glow" style={{
                position: 'absolute',
                top: '10%',
                left: '-20%',
                width: '300px',
                height: '300px',
                background: 'var(--primary-green)',
                filter: 'blur(120px)',
                opacity: 0.15,
                borderRadius: '50%',
                zIndex: 0,
                display: 'none'
            }} />

            <div className="container" style={{ position: 'relative', zIndex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', alignItems: 'center' }}>
                <div className="hero-content">
                    <h1 className="hero-title" style={{ fontSize: '3.5rem', lineHeight: '1.2', marginBottom: '1.5rem', fontWeight: '800' }}>
                        Saúde personalizada, <br />
                        feita para o <span className="text-gradient">seu corpo</span>
                    </h1>
                    <p className="hero-text" style={{ fontSize: '1.2rem', color: 'var(--text-gray)', marginBottom: '2rem', maxWidth: '500px' }}>
                        Fórmulas manipuladas sob medida, com acompanhamento profissional e qualidade farmacêutica. Não aceite o genérico.
                    </p>
                    <div className="hero-buttons" style={{ display: 'flex', gap: '1rem' }}>
                        <Button variant="primary" className="pulse-button">Falar com especialista agora</Button>
                        <Button variant="outline">Conhecer fórmulas</Button>
                    </div>
                </div>

                {/* Hero Animation */}
                <div className="hero-image" style={{ height: '400px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <HeroAnimation />
                </div>
            </div>
            <style>{`
        @keyframes pulse-glow {
            0% { box-shadow: 0 0 0 0 rgba(0, 229, 255, 0.4); }
            70% { box-shadow: 0 0 0 15px rgba(0, 229, 255, 0); }
            100% { box-shadow: 0 0 0 0 rgba(0, 229, 255, 0); }
        }

        .pulse-button {
            animation: pulse-glow 2s infinite;
        }

        @media (max-width: 768px) {
          .container { 
              grid-template-columns: 1fr !important; 
              text-align: center; 
              padding-top: 2rem;
              display: flex !important;
              flex-direction: column;
              justify-content: center;
              min-height: 80vh;
           }
          .mobile-glow { display: block !important; }
          .hero-content { order: 1; }
          .hero-image { 
              order: 2; 
              height: 320px !important; 
              width: 100%; 
              margin: 1rem auto 0 auto; 
              background: transparent !important;
              border: none !important;
              box-shadow: none !important;
          }
          
          .hero-title { 
              font-size: 2.3rem !important; 
              line-height: 1.1 !important; 
              margin-bottom: 1rem !important;
          }
          
          .hero-text { 
              margin: 0 auto 2rem auto; 
              font-size: 1.1rem !important; 
              max-width: 90% !important; 
              line-height: 1.5;
          }
          
          .hero-buttons { 
              justify-content: center; 
              flex-direction: column; 
              width: 100%; 
              gap: 1rem !important; 
              padding: 0 1rem;
          }
          
          .hero-buttons button { 
              width: 100%; 
              padding: 16px !important;
              font-size: 1.1rem !important;
              display: flex !important;
              justify-content: center !important;
              align-items: center !important;
              text-align: center !important;
          }
        }
      `}</style>
        </section>
    );
};

export default HeroSection;
