import { Link } from 'react-router-dom';
import Button from './Button';
import { Menu, X } from 'lucide-react';
import { useState } from 'react';

const Header = () => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    return (
        <header className="glass" style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 1000, height: 'var(--header-height)', pointerEvents: 'none' }}>
            <div className="container header-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '100%' }}>
                <Link to="/" style={{ display: 'flex', alignItems: 'center', zIndex: 1001, pointerEvents: 'auto' }}>
                    <img src="/assets/logo.png" alt="Graphène" style={{
                        height: '45px',
                        width: '45px',
                        objectFit: 'cover',
                        borderRadius: '50%',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        boxShadow: '0 0 15px rgba(0, 229, 255, 0.2)'
                    }} />
                </Link>

                {/* Desktop Nav */}
                <nav style={{ display: 'flex', gap: '2rem', alignItems: 'center', pointerEvents: 'auto' }} className="desktop-only">
                    <a href="#solutions" style={{ opacity: 0.8 }} className="hover:text-primary-blue transition-colors">Soluções</a>
                    <a href="#products" style={{ opacity: 0.8 }} className="hover:text-primary-blue transition-colors">Fórmulas</a>
                    <a href="#how-it-works" style={{ opacity: 0.8 }} className="hover:text-primary-blue transition-colors">Como funciona</a>

                    <Button variant="primary" onClick={() => window.open('https://wa.me/5522999361256?text=Ol%C3%A1%2C%20vi%20pelo%20site%20e%20gostaria%20de%20falar%20com%20um%20especialista.', '_blank')}>Falar com Especialista</Button>
                </nav>

                {/* Mobile Menu Toggle */}
                <button
                    className="mobile-only glass"
                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                    style={{
                        padding: '10px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: '12px',
                        color: 'white',
                        zIndex: 1001,
                        pointerEvents: 'auto'
                    }}
                >
                    {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
                </button>
            </div>

            {/* Mobile Nav Overlay */}
            <div className={`mobile-menu ${isMenuOpen ? 'open' : ''}`} style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'rgba(5, 5, 16, 0.98)',
                backdropFilter: 'blur(20px)',
                background: 'rgba(5, 5, 16, 0.98)',
                backdropFilter: 'blur(20px)',
                display: isMenuOpen ? 'flex' : 'none',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '3rem',
                zIndex: 1000,
                opacity: isMenuOpen ? 1 : 0,
                transition: 'all 0.4s ease-in-out',
                /* Removed visibility/pointerEvents relying on display:none now */
                pointerEvents: isMenuOpen ? 'all' : 'none',
            }}>
                <nav style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2.5rem' }}>
                    <a href="#solutions" onClick={() => setIsMenuOpen(false)} style={{ fontSize: '2rem', fontWeight: '500', letterSpacing: '-0.5px' }}>Soluções</a>
                    <a href="#products" onClick={() => setIsMenuOpen(false)} style={{ fontSize: '2rem', fontWeight: '500', letterSpacing: '-0.5px' }}>Fórmulas</a>
                    <a href="#how-it-works" onClick={() => setIsMenuOpen(false)} style={{ fontSize: '2rem', fontWeight: '500', letterSpacing: '-0.5px' }}>Como funciona</a>


                    <div style={{ marginTop: '1rem' }} onClick={() => setIsMenuOpen(false)}>
                        <Button
                            variant="primary"
                            style={{ minWidth: '240px', padding: '1rem 2rem', fontSize: '1.1rem' }}
                            onClick={() => window.open('https://wa.me/5522999361256?text=Ol%C3%A1%2C%20vi%20pelo%20site%20e%20gostaria%20de%20falar%20com%20um%20especialista.', '_blank')}
                        >
                            Falar com Especialista
                        </Button>
                    </div>
                </nav>

                {/* Decorative background element */}
                <div style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: '100%',
                    height: '100%',
                    background: 'radial-gradient(circle at center, rgba(0, 229, 255, 0.1) 0%, transparent 70%)',
                    pointerEvents: 'none',
                    zIndex: -1
                }} />
            </div>

            <style>{`
                @media (max-width: 768px) {
                    .desktop-only { display: none !important; }
                    /* Force absolute positioning for guaranteed corners */
                    .header-container { 
                        padding: 0 16px !important; 
                        justify-content: center !important; /* Fallback */
                        position: relative;
                    }
                    /* Target the Logo Link (first child) */
                    .header-container > a:first-child {
                        position: absolute !important;
                        left: 16px !important;
                        top: 5px !important;
                        transform: none !important;
                    }
                    /* Target the Menu Button */
                    .header-container > button {
                        position: absolute !important;
                        right: 16px !important;
                        top: 5px !important;
                        transform: none !important;
                    }
                }
                @media (min-width: 769px) {
                    .mobile-only { display: none !important; }
                }
            `}</style>
        </header>
    );
};

export default Header;
