import { useState, useEffect } from 'react';
import { getWhatsAppUrl } from '../config';
import { Menu, X, MessageCircle, FileUp, Search, ShieldCheck, MapPin, Truck, Phone, Award } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

const Header = ({ onSearchChange, searchTerm, showSearch = false }) => {
    const [scrolled, setScrolled] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);
    const location = useLocation();

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 20);
        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const navItems = [
        { label: 'Início', to: '/' },
        { label: 'Ativos Patenteados', to: '/ativos', highlight: true },
        { label: 'Manipular Receita', to: '/receita' },
        { label: 'O Laboratório', to: '/laboratorio' },
        { label: 'Prescritores VIP', to: '/prescritores' },
        { label: 'Avaliações', to: '/avaliacoes' },
    ];

    const isActive = (to) => location.pathname === to;

    return (
        <header className="store-header-wrapper">
            {/* Top Announcement Bar */}
            <div className="store-top-bar">
                <div className="container top-bar-flex">
                    <div className="top-bar-left">
                        <span><Truck size={14} /> Despacho expresso para todo o Brasil</span>
                        <span className="divider-dot">•</span>
                        <span><MapPin size={14} /> Laboratório Próprio — Cabo Frio, RJ</span>
                    </div>
                    <div className="top-bar-right">
                        <a href={getWhatsAppUrl()} target="_blank" rel="noopener noreferrer" className="top-wa-link">
                            <Phone size={13} />
                            <span>(22) 99936-1256</span>
                        </a>
                        <span className="divider-dot">•</span>
                        <span className="anvisa-tag"><ShieldCheck size={14} /> ANVISA & CRF-RJ</span>
                    </div>
                </div>
            </div>

            {/* Main Header */}
            <div className={`store-main-header ${scrolled ? 'store-header--scrolled' : ''}`}>
                <div className="container header-content-grid">
                    <Link to="/" className="store-brand">
                        <img src="/assets/logo.png" alt="Graphène" className="store-logo-img" />
                    </Link>

                    {showSearch && (
                        <div className="store-search-bar">
                            <Search size={17} className="search-icon" />
                            <input
                                type="text"
                                placeholder="Buscar Ormona, Morosil, Creatina, Terasen..."
                                value={searchTerm || ''}
                                onChange={(e) => onSearchChange && onSearchChange(e.target.value)}
                            />
                        </div>
                    )}

                    <div className="store-header-actions">
                        <Link to="/receita" className="btn-header-receita">
                            <FileUp size={16} />
                            <span>Enviar Receita</span>
                        </Link>
                        <a href={getWhatsAppUrl('Olá, gostaria de fazer um pedido na Graphène.')} target="_blank" rel="noopener noreferrer" className="btn-header-wa">
                            <MessageCircle size={16} />
                            <span>WhatsApp</span>
                        </a>
                        <button className="store-menu-toggle" onClick={() => setMenuOpen(!menuOpen)} aria-label="Menu">
                            {menuOpen ? <X size={24} /> : <Menu size={24} />}
                        </button>
                    </div>
                </div>

                {/* Subnav */}
                <div className="store-subnav">
                    <div className="container subnav-flex">
                        {navItems.map((item, idx) => (
                            <Link
                                key={idx}
                                to={item.to}
                                className={`subnav-link ${isActive(item.to) ? 'subnav-link--active' : ''} ${item.highlight ? 'subnav-link--highlight' : ''}`}
                            >
                                {item.highlight && <Award size={13} style={{ display: 'inline', marginRight: '4px' }} />}
                                {item.label}
                            </Link>
                        ))}
                    </div>
                </div>
            </div>

            {/* Mobile Drawer */}
            {menuOpen && (
                <div className="store-mobile-drawer">
                    <div className="mobile-drawer-links">
                        {navItems.map((item, idx) => (
                            <Link key={idx} to={item.to} className="mobile-drawer-link" onClick={() => setMenuOpen(false)}>
                                {item.label}
                            </Link>
                        ))}
                    </div>
                    <div className="mobile-drawer-btns">
                        <Link to="/receita" className="btn-cta-blue" style={{ width: '100%' }} onClick={() => setMenuOpen(false)}>
                            <FileUp size={16} /> Enviar Receita
                        </Link>
                        <a href={getWhatsAppUrl()} target="_blank" rel="noopener noreferrer" className="btn-buy-wa" style={{ width: '100%' }}>
                            <MessageCircle size={16} /> WhatsApp
                        </a>
                    </div>
                </div>
            )}

            <style>{`
                .store-header-wrapper { position: sticky; top: 0; z-index: 100; }
                .store-top-bar { background: #040508; border-bottom: 1px solid var(--border-subtle); padding: 7px 0; font-size: 0.78rem; color: var(--text-dim); }
                .top-bar-flex { display: flex; align-items: center; justify-content: space-between; }
                .top-bar-left, .top-bar-right { display: flex; align-items: center; gap: 12px; }
                .top-bar-left span, .top-bar-right span { display: inline-flex; align-items: center; gap: 5px; }
                .divider-dot { color: var(--text-muted); }
                .top-wa-link { display: inline-flex; align-items: center; gap: 5px; color: var(--brand-green); font-weight: 600; }
                .anvisa-tag { color: var(--brand-blue); font-weight: 600; }

                .store-main-header { background: rgba(7, 9, 14, 0.96); backdrop-filter: blur(12px); border-bottom: 1px solid var(--border-subtle); transition: var(--transition); }
                .store-header--scrolled { box-shadow: 0 4px 20px rgba(0,0,0,0.6); }

                .header-content-grid { display: flex; align-items: center; gap: 24px; height: 68px; }
                .store-brand { display: flex; align-items: center; flex-shrink: 0; }
                .store-logo-img { height: 36px; width: auto; object-fit: contain; }

                .store-search-bar { position: relative; flex: 1; max-width: 440px; }
                .search-icon { position: absolute; left: 14px; top: 50%; transform: translateY(-50%); color: var(--text-muted); }
                .store-search-bar input { width: 100%; padding: 10px 16px 10px 42px; border-radius: var(--radius-full); border: 1px solid var(--border-card); background: rgba(255,255,255,0.04); color: #fff; font-size: 0.88rem; outline: none; transition: var(--transition); }
                .store-search-bar input:focus { border-color: var(--brand-blue); background: rgba(255,255,255,0.08); }

                .store-header-actions { display: flex; align-items: center; gap: 10px; margin-left: auto; }
                .btn-header-receita { display: inline-flex; align-items: center; gap: 6px; padding: 9px 16px; border-radius: var(--radius-sm); background: rgba(0,180,216,0.12); border: 1px solid var(--border-blue); color: var(--brand-blue); font-size: 0.82rem; font-weight: 700; transition: var(--transition); }
                .btn-header-receita:hover { background: var(--brand-blue); color: #07090e; }
                .btn-header-wa { display: inline-flex; align-items: center; gap: 6px; padding: 9px 16px; border-radius: var(--radius-sm); background: var(--brand-green); color: #fff; font-size: 0.82rem; font-weight: 700; transition: var(--transition); }
                .btn-header-wa:hover { background: var(--brand-green-hover); }
                .store-menu-toggle { display: none; background: none; border: none; color: #fff; cursor: pointer; }

                .store-subnav { border-top: 1px solid rgba(255,255,255,0.04); padding: 8px 0; }
                .subnav-flex { display: flex; align-items: center; gap: 24px; }
                .subnav-link { font-size: 0.84rem; font-weight: 600; color: var(--text-dim); padding: 4px 0; border-bottom: 2px solid transparent; transition: var(--transition); display: inline-flex; align-items: center; }
                .subnav-link:hover { color: var(--brand-blue); }
                .subnav-link--active { color: var(--brand-blue); border-bottom-color: var(--brand-blue); }
                .subnav-link--highlight { color: #38bdf8; font-weight: 700; }

                .store-mobile-drawer { background: #0e1118; border-bottom: 1px solid var(--border-subtle); padding: 20px; display: flex; flex-direction: column; gap: 16px; }
                .mobile-drawer-links { display: flex; flex-direction: column; gap: 12px; }
                .mobile-drawer-link { font-size: 0.95rem; font-weight: 600; color: #fff; padding: 6px 0; border-bottom: 1px solid var(--border-subtle); }
                .mobile-drawer-btns { display: flex; flex-direction: column; gap: 8px; margin-top: 8px; }

                @media (max-width: 960px) {
                    .store-subnav { display: none; }
                    .store-search-bar { display: none; }
                    .store-menu-toggle { display: block; }
                    .top-bar-left { display: none; }
                }
                @media (max-width: 600px) {
                    .btn-header-receita { display: none; }
                }
            `}</style>
        </header>
    );
};

export default Header;
