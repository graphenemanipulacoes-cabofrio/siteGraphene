import { Link } from 'react-router-dom';
import Button from './Button';
import { Menu } from 'lucide-react';
import { useState } from 'react';

const Header = () => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    return (
        <header className="glass" style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 1000, height: 'var(--header-height)' }}>
            <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '100%' }}>
                <Link to="/" style={{ fontSize: '1.5rem', fontWeight: 'bold', letterSpacing: '1px' }}>
                    GRAPHÈNE
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
                <div className="glass" style={{ position: 'absolute', top: 'var(--header-height)', left: 0, right: 0, padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <a href="#solutions" onClick={() => setIsMenuOpen(false)}>Soluções</a>
                    <a href="#products" onClick={() => setIsMenuOpen(false)}>Fórmulas</a>
                    <Link to="/login" onClick={() => setIsMenuOpen(false)}>Login</Link>
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
