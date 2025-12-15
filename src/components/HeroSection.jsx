import Button from './Button';

const HeroSection = () => {
    return (
        <section style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            paddingTop: 'var(--header-height)',
            position: 'relative',
            overflow: 'hidden'
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

            <div className="container" style={{ position: 'relative', zIndex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', alignItems: 'center' }}>
                <div>
                    <h1 className="hero-title" style={{ fontSize: '3.5rem', lineHeight: '1.2', marginBottom: '1.5rem', fontWeight: '800' }}>
                        Saúde personalizada, <br />
                        feita para o <span className="text-gradient">seu corpo</span>
                    </h1>
                    <p className="hero-text" style={{ fontSize: '1.2rem', color: 'var(--text-gray)', marginBottom: '2rem', maxWidth: '500px' }}>
                        Fórmulas manipuladas sob medida, com acompanhamento profissional e qualidade farmacêutica. Não aceite o genérico.
                    </p>
                    <div className="hero-buttons" style={{ display: 'flex', gap: '1rem' }}>
                        <Button variant="primary">Falar com especialista agora</Button>
                        <Button variant="outline">Conhecer fórmulas</Button>
                    </div>
                </div>

                {/* Hero Image / Card Placeholder */}
                <div className="glass-card hero-image" style={{ height: '400px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ opacity: 0.5 }}>Imagem Conceitual / 3D Element</span>
                </div>
            </div>
            <style>{`
        @media (max-width: 768px) {
          .container { grid-template-columns: 1fr !important; text-align: center; padding-top: 2rem; }
          .hero-title { fontSize: 2.5rem !important; line-height: 1.1 !important; }
          .hero-text { margin: 0 auto 2rem auto; font-size: 1rem !important; max-width: 100% !important; }
          .hero-buttons { justify-content: center; flex-direction: column; width: 100%; gap: 1rem !important; }
          .hero-buttons button { width: 100%; }
          .hero-image { height: 280px !important; margin-top: 3rem; }
        }
      `}</style>
        </section>
    );
};

export default HeroSection;
