import { Link } from 'react-router-dom';
import Button from './Button';
import { Menu, X } from 'lucide-react';
import { useState } from 'react';

const Header = () => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    return (
        <header style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 1000, height: 'var(--header-height)', pointerEvents: 'none' }}>
            <div className="container header-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '100%', background: 'rgba(255,255,255,0.8)', backdropFilter: 'blur(10px)', borderRadius: '0 0 40px 40px', padding: '0 2rem', pointerEvents: 'auto', border: '1px solid rgba(0,0,0,0.05)', borderTop: 'none' }}>
                <Link to="/" style={{ display: 'flex', alignItems: 'center', zIndex: 1001 }}>
                    <img src="/assets/logo.png" alt="Graphène" style={{
                        height: '40px',
                        width: '40px',
                        objectFit: 'cover',
                        borderRadius: '50%',
                    }} />
                </Link>

                {/* Desktop Nav */}
                <nav style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }} className="desktop-only">
                    {['Soluções', 'Fórmulas', 'Como funciona'].map((item) => (
                        <a
                            key={item}
                            href={`#${item.toLowerCase().replace(' ', '-')}`}
                            style={{ color: 'var(--text-main)', fontWeight: '600', fontSize: '0.95rem', padding: '8px 16px', borderRadius: '30px', transition: 'background 0.3s' }}
                            className="nav-link"
                        >
                            {item}
                        </a>
                    ))}

                    <Button variant="primary" style={{ borderRadius: '30px', padding: '10px 24px' }} onClick={() => window.open('https://wa.me/5522999361256?text=Ol%C3%A1%2C%20vi%20pelo%20site%20e%20gostaria%20de%20falar%20com%20um%20especialista.', '_blank')}>CONTATO</Button>
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
                        color: 'var(--text-main)',
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
                background: 'rgba(255, 255, 255, 0.98)',
                backdropFilter: 'blur(20px)',
                display: isMenuOpen ? 'flex' : 'none',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '3rem',
                zIndex: 1000,
                opacity: isMenuOpen ? 1 : 0,
                transition: 'all 0.4s ease-in-out',
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
                    background: 'radial-gradient(circle at center, var(--primary-blue-glow) 0%, transparent 70%)',
                    pointerEvents: 'none',
                    zIndex: -1
                }} />
            </div>

            <style>{`
                .nav-link:hover { background: rgba(14, 165, 233, 0.08); color: var(--primary-blue) !important; }
                
                .mobile-only { display: none !important; }
                .desktop-only { display: flex !important; }

                @media (max-width: 768px) {
                    .desktop-only { display: none !important; }
                    .mobile-only { display: flex !important; }
                    .header-container { 
                        border-radius: 0 0 25px 25px !important;
                        padding: 0 1rem !important;
                        background: rgba(255, 255, 255, 0.9) !important;
                        backdrop-filter: blur(20px) !important;
                    }
                }
            `}</style>
        </header>
    );
};

export default Header;
