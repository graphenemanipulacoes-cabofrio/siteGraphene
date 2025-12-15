import { Link } from 'react-router-dom';
import Button from './Button';
import { Menu } from 'lucide-react';
import { useState } from 'react';

const Header = () => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    return (
        <header className="glass" style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 1000, height: 'var(--header-height)' }}>
            <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '100%' }}>
                <Link to="/" style={{ display: 'flex', alignItems: 'center' }}>
                    <img src="/assets/logo.png" alt="Graphène" style={{ height: '50px', objectFit: 'contain' }} />
                </Link>

                {/* Desktop Nav */}
                <nav style={{ display: 'flex', gap: '2rem', alignItems: 'center' }} className="desktop-only">
                    <a href="#solutions" style={{ opacity: 0.8 }}>Soluções</a>
                    <a href="#products" style={{ opacity: 0.8 }}>Fórmulas</a>
                    <a href="#how-it-works" style={{ opacity: 0.8 }}>Como funciona</a>
                    <Link to="/login">Login</Link>
                    <Button variant="primary">Falar com Especialista</Button>
                </nav>

                {/* Mobile Menu Toggle */}
                <button
                    className="mobile-only"
                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                    style={{ background: 'transparent', color: 'white' }}
                >
                    <Menu />
                </button>
            </div>

            {/* Basic Mobile Nav Implementation */}
            {isMenuOpen && (
                <div className="glass mobile-menu" style={{
                    position: 'fixed',
                    top: 'var(--header-height)',
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'rgba(5, 5, 16, 0.95)',
                    backdropFilter: 'blur(20px)',
                    padding: '2rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '2rem',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 999
                }}>
                    <a href="#solutions" onClick={() => setIsMenuOpen(false)} style={{ fontSize: '1.5rem' }}>Soluções</a>
                    <a href="#products" onClick={() => setIsMenuOpen(false)} style={{ fontSize: '1.5rem' }}>Fórmulas</a>
                    <a href="#how-it-works" onClick={() => setIsMenuOpen(false)} style={{ fontSize: '1.5rem' }}>Como funciona</a>
                    <Link to="/login" onClick={() => setIsMenuOpen(false)} style={{ fontSize: '1.5rem' }}>Login</Link>
                    <span onClick={() => setIsMenuOpen(false)}>
                        <Button variant="primary" style={{ width: '100%', minWidth: '200px' }}>Falar com Especialista</Button>
                    </span>
                </div>
            )}

            <style>{`
        @media (max-width: 768px) {
          .desktop-only { display: none !important; }
        }
        @media (min-width: 769px) {
          .mobile-only { display: none !important; }
        }
      `}</style>
        </header>
    );
};

export default Header;
