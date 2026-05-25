import { useState, useEffect, useRef } from 'react';
import { getWhatsAppUrl } from '../config';

const Header = () => {
    const [scrolled, setScrolled] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);
    const navRef = useRef(null);

    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 20);
        window.addEventListener('scroll', onScroll, { passive: true });
        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    useEffect(() => {
        const onClick = (e) => {
            if (navRef.current && !navRef.current.contains(e.target)) setMenuOpen(false);
        };
        document.addEventListener('mousedown', onClick);
        return () => document.removeEventListener('mousedown', onClick);
    }, []);

    const navItems = [
        { label: 'Início', href: '#hero' },
        { label: 'Produtos', href: '#products' },
        { label: 'Como funciona', href: '#how-it-works' },
        { label: 'Enviar receita', href: '#form' },
    ];

    return (
        <header className={`header ${scrolled ? 'header--scrolled' : ''}`}>
            <div className="header-inner">
                <a href="#" className="header-logo" style={{ display: 'flex', alignItems: 'center' }}>
                    <img src="/assets/logo.png" alt="Graphène" style={{ height: '40px', width: 'auto', objectFit: 'contain' }} />
                </a>

                <nav className="header-nav" ref={navRef}>
                    {navItems.map(item => (
                        <a key={item.href} href={item.href} className="nav-link">{item.label}</a>
                    ))}
                </nav>

                <div className="header-actions">
                    <a href={getWhatsAppUrl()} target="_blank" rel="noopener noreferrer" className="header-cta">
                        WhatsApp
                    </a>
                    <button className="header-toggle" onClick={() => setMenuOpen(!menuOpen)} aria-label="Menu">
                        <span />
                        <span />
                        <span />
                    </button>
                </div>
            </div>

            {menuOpen && (
                <div className="header-mobile">
                    {navItems.map(item => (
                        <a key={item.href} href={item.href} onClick={() => setMenuOpen(false)}>{item.label}</a>
                    ))}
                </div>
            )}

            <style>{`
                .header {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    z-index: 100;
                    transition: all 0.25s ease;
                    background: rgba(255, 255, 255, 0.9);
                    backdrop-filter: blur(12px);
                    border-bottom: 1px solid var(--border-light);
                }

                .header--scrolled {
                    background: #ffffff;
                    box-shadow: var(--shadow-sm);
                }

                .header-inner {
                    max-width: var(--container-width);
                    margin: 0 auto;
                    padding: 0 24px;
                    height: var(--header-height);
                    display: flex;
                    align-items: center;
                    gap: 40px;
                }

                .header-nav {
                    display: flex;
                    align-items: center;
                    gap: 32px;
                    flex: 1;
                }

                .nav-link {
                    font-size: 0.9rem;
                    font-weight: 500;
                    color: var(--text-secondary);
                    transition: color 0.15s ease;
                    position: relative;
                }

                .nav-link:hover {
                    color: var(--primary);
                }

                .nav-link::after {
                    content: '';
                    position: absolute;
                    bottom: -4px;
                    left: 0;
                    width: 0;
                    height: 2px;
                    background: var(--primary);
                    transition: width 0.25s ease;
                }

                .nav-link:hover::after {
                    width: 100%;
                }

                .header-actions {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                }

                .header-cta {
                    padding: 10px 22px;
                    font-size: 0.88rem;
                    font-weight: 600;
                    border-radius: var(--radius-sm);
                    background: var(--primary);
                    color: #fff;
                    transition: background 0.15s ease;
                }

                .header-cta:hover {
                    background: var(--primary-dark);
                }

                .header-toggle {
                    display: none;
                    flex-direction: column;
                    gap: 5px;
                    background: none;
                    border: none;
                    cursor: pointer;
                    padding: 4px;
                }

                .header-toggle span {
                    width: 22px;
                    height: 2px;
                    background: var(--text-primary);
                    border-radius: 2px;
                    transition: all 0.3s ease;
                }

                .header-mobile {
                    display: none;
                }

                @media (max-width: 768px) {
                    .header-nav { display: none; }
                    .header-cta { display: none; }
                    .header-toggle { display: flex; }

                    .header-mobile {
                        position: absolute;
                        top: 100%;
                        left: 0;
                        right: 0;
                        background: #ffffff;
                        border-bottom: 1px solid var(--border-light);
                        padding: 16px 24px;
                        display: flex;
                        flex-direction: column;
                        gap: 4px;
                        box-shadow: var(--shadow-lg);
                    }

                    .header-mobile a {
                        padding: 12px 0;
                        font-size: 1rem;
                        font-weight: 500;
                        color: var(--text-secondary);
                        border-bottom: 1px solid var(--border-light);
                    }

                    .header-mobile a:last-child {
                        border-bottom: none;
                    }
                }
            `}</style>
        </header>
    );
};

export default Header;
