import Button from './Button';
import HeroAnimation from './HeroAnimation';

const HeroSection = () => {
    return (
        <section className="hero-section" style={{
            minHeight: '100vh',
            padding: '120px 0 80px',
            position: 'relative',
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            background: 'var(--bg-main)'
        }}>
            {/* Background Decorations */}
            <div className="pattern-sunburst" style={{
                position: 'absolute',
                top: '-10%',
                right: '-10%',
                width: '600px',
                height: '600px',
                opacity: 0.1,
                zIndex: 0
            }} />

            <div className="container" style={{ position: 'relative', zIndex: 1, display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '4rem', alignItems: 'center' }}>

                {/* Content Left */}
                <div style={{ paddingRight: '2rem' }}>
                    <div style={{ display: 'inline-flex', padding: '8px 16px', borderRadius: '30px', background: 'rgba(14, 165, 233, 0.08)', color: 'var(--primary-blue)', fontWeight: '700', fontSize: '0.85rem', marginBottom: '1.5rem', letterSpacing: '1px', border: '1px solid rgba(14, 165, 233, 0.1)' }}>
                        EXCLUSIVIDADE & CIÊNCIA
                    </div>

                    <h1 style={{ fontSize: 'clamp(3rem, 5vw, 4.5rem)', fontWeight: '800', lineHeight: '1.1', marginBottom: '1.5rem', letterSpacing: '-2px' }}>
                        Caminho Perfeito <br />
                        Para Sua <span style={{ color: 'var(--primary-blue)', fontStyle: 'italic' }}>Saúde</span>
                    </h1>

                    <p style={{ fontSize: '1.2rem', color: 'var(--text-muted)', marginBottom: '2.5rem', maxWidth: '540px', lineHeight: '1.6' }}>
                        Desbloqueie todo o seu potencial com fórmulas personalizadas de alta performance, criadas sob medida para seus objetivos.
                    </p>

                    <div className="hero-cta-container" style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                        <Button
                            variant="primary"
                            style={{ padding: '16px 40px', fontSize: '1.1rem', borderRadius: '40px' }}
                            onClick={() => window.open('https://wa.me/5522999361256?text=Ol%C3%A1%2C%20vi%20pelo%20site%20e%20gostaria%20de%20falar%20com%20um%20especialista.', '_blank')}
                        >
                            ENVIAR RECEITA
                        </Button>
                        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                            <div style={{ display: 'flex', marginLeft: '8px' }}>
                                {[1, 2, 3].map(i => (
                                    <div key={i} style={{ width: '30px', height: '30px', borderRadius: '50%', border: '2px solid #fff', background: '#ccc', marginLeft: '-10px', overflow: 'hidden' }}>
                                        <img src={`https://i.pravatar.cc/100?u=${i}`} alt="User" />
                                    </div>
                                ))}
                            </div>
                            <span style={{ fontSize: '0.9rem', fontWeight: '700' }}>Milhares de Clientes Satisfeitos</span>
                        </div>
                    </div>

                    <div className="hero-stats-grid" style={{ marginTop: '4rem', display: 'flex', gap: '4rem' }}>
                        <div>
                            <div style={{ fontSize: '2.5rem', fontWeight: '800', letterSpacing: '-1px' }}>Milhares</div>
                            <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: '600' }}>de fórmulas entregues</div>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <div style={{ fontSize: '2.5rem', fontWeight: '800', letterSpacing: '-1px' }}>4,9</div>
                                <div style={{ display: 'flex', gap: '2px' }}>
                                    {[1, 2, 3, 4, 5].map(i => (
                                        <svg key={i} width="18" height="18" viewBox="0 0 24 24" fill="#FBBF24" stroke="#FBBF24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                                        </svg>
                                    ))}
                                </div>
                            </div>
                            <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: '600' }}>Melhor avaliação do setor no Google</div>
                        </div>
                    </div>
                </div>

                {/* Content Right - Image/Animation Container */}
                <div style={{ position: 'relative' }}>
                    <div className="hero-animation-wrapper" style={{ width: '100%', height: '550px', background: 'rgba(15, 23, 42, 0.02)', borderRadius: '0 0 200px 200px', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', border: '1px solid rgba(0,0,0,0.03)' }}>
                        <HeroAnimation />
                    </div>

                    {/* Floating Stats Card */}
                    <div className="floating-card-precision glass" style={{ position: 'absolute', top: '15%', right: '-10%', padding: '1.5rem', borderRadius: '24px', display: 'flex', alignItems: 'center', gap: '1rem', border: '1px solid rgba(255,255,255,0.8)', minWidth: '250px' }}>
                        <div style={{ width: '45px', height: '45px', minWidth: '45px', background: 'var(--primary-blue)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 2v20M2 12h20" /></svg>
                        </div>
                        <div>
                            <div style={{ fontWeight: '800', fontSize: '1.1rem', whiteSpace: 'nowrap' }}>Alta Precisão</div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>Controle de qualidade rigoroso</div>
                        </div>
                    </div>

                    <div className="floating-card-tech glass" style={{ position: 'absolute', bottom: '15%', left: '-15%', padding: '1.5rem', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.8)', minWidth: '200px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                            <span style={{ fontSize: '1.2rem' }}>🔬</span>
                            <span style={{ fontWeight: '800', whiteSpace: 'nowrap' }}>Tecnologia de ponta</span>
                        </div>
                        <div style={{ width: '150px', height: '6px', background: '#eee', borderRadius: '10px', overflow: 'hidden' }}>
                            <div style={{ width: '85%', height: '100%', background: 'var(--primary-blue)' }} />
                        </div>
                    </div>
                </div>

            </div>

            <style>{`
                @media (max-width: 1024px) {
                    .container { 
                        grid-template-columns: 1fr !important; 
                        gap: 3rem !important; 
                        text-align: center; 
                    }
                    .container > div { padding-right: 0 !important; }
                    .hero-section { padding-top: 100px !important; }
                    
                    .hero-cta-container { 
                        flex-direction: column !important; 
                        align-items: center !important; 
                        gap: 2rem !important; 
                    }
                    
                    .hero-stats-grid { 
                        flex-direction: column !important; 
                        gap: 1.5rem !important; 
                        align-items: center !important; 
                        margin-top: 3rem !important;
                    }
                    
                    .hero-animation-wrapper { 
                        height: 380px !important; 
                        margin-top: 2rem;
                    }

                    div[style*="justify-content: center"] { margin: 0 auto; }
                    
                    /* Hide absolute decorations on mobile for better focus */
                    .pattern-sunburst, div[style*="position: absolute"] { 
                        display: none !important; 
                    }
                }
            `}</style>
        </section>
    );
};

export default HeroSection;
