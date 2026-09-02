import { useState, useEffect } from 'react';
import { getWhatsAppUrl } from '../config';
import { Menu, X, MessageCircle, FileUp, Search, ShieldCheck, MapPin, Truck, Phone, Award, ChevronRight, ShoppingBag, UserRound } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useStore } from '../context/StoreContext';

const Header = ({ onSearchChange, searchTerm, showSearch = false }) => {
    const [scrolled, setScrolled] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);
    const location = useLocation();
    const { itemCount, customer } = useStore();

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 20);
        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // Close mobile menu on route change
    useEffect(() => {
        setMenuOpen(false);
    }, [location.pathname]);

    // Prevent body scroll when mobile menu is open
    useEffect(() => {
        if (menuOpen) {
            document.body.style.overflow = 'hidden';
            document.body.classList.add('mobile-menu-open');
        } else {
            document.body.style.overflow = 'unset';
            document.body.classList.remove('mobile-menu-open');
        }
        return () => {
            document.body.style.overflow = 'unset';
            document.body.classList.remove('mobile-menu-open');
        };
    }, [menuOpen]);

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
                        <span><Truck size={13} /> Despacho expresso para todo o Brasil</span>
                        <span className="divider-dot">•</span>
                        <span><MapPin size={13} /> Laboratório Próprio — Cabo Frio, RJ</span>
                    </div>
                    <div className="top-bar-right">
                        <a href={getWhatsAppUrl()} target="_blank" rel="noopener noreferrer" className="top-wa-link">
                            <Phone size={12} />
                            <span>(22) 99936-1256</span>
                        </a>
                        <span className="divider-dot">•</span>
                        <span className="anvisa-tag"><ShieldCheck size={13} /> ANVISA & CRF-RJ</span>
                    </div>
                </div>
            </div>

            {/* Main Header */}
            <div className={`store-main-header ${scrolled ? 'store-header--scrolled' : ''}`}>
                <div className="container header-content-grid">
                    <Link to="/" className="store-brand" onClick={() => setMenuOpen(false)}>
                        <img src="/assets/logo.png" alt="Graphène" className="store-logo-img" />
                    </Link>

                    {showSearch && (
                        <div className="store-search-bar">
                            <Search size={16} className="search-icon" />
                            <input
                                type="text"
                                placeholder="Buscar Creatina, Melatonina, Coenzima Q10..."
                                value={searchTerm || ''}
                                onChange={(e) => onSearchChange && onSearchChange(e.target.value)}
                            />
                        </div>
                    )}

                    <div className="store-header-actions">
                        <Link to={customer ? '/minha-conta' : '/entrar'} className="btn-header-icon" aria-label="Minha conta" title="Minha conta">
                            <UserRound size={18} />
                            <span className="header-icon-label">{customer ? 'Minha conta' : 'Entrar'}</span>
                        </Link>
                        <Link to="/carrinho" className="btn-header-icon cart-header-link" aria-label={`Sacola com ${itemCount} itens`} title="Sacola">
                            <ShoppingBag size={18} />
                            {itemCount > 0 && <span className="cart-count">{itemCount > 9 ? '9+' : itemCount}</span>}
                            <span className="header-icon-label">Sacola</span>
                        </Link>
                        <Link to="/receita" className="btn-header-receita">
                            <FileUp size={15} />
                            <span>Enviar Receita</span>
                        </Link>
                        <a href={getWhatsAppUrl('Olá, gostaria de fazer um pedido na Graphène.')} target="_blank" rel="noopener noreferrer" className="btn-header-wa">
                            <MessageCircle size={15} />
                            <span>WhatsApp</span>
                        </a>
                        <button
                            className="store-menu-toggle"
                            onClick={() => setMenuOpen(!menuOpen)}
                            aria-label="Abrir Menu de Navegação"
                        >
                            {menuOpen ? <X size={26} /> : <Menu size={26} />}
                        </button>
                    </div>
                </div>

                {/* Subnav Desktop */}
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

            {/* Mobile Search Bar if on Home */}
            {showSearch && (
                <div className="store-mobile-search-strip">
                    <div className="container">
                        <div className="mobile-search-input-wrap">
                            <Search size={15} className="mobile-search-icon" />
                            <input
                                type="text"
                                placeholder="Buscar produtos ou fórmulas..."
                                value={searchTerm || ''}
                                onChange={(e) => onSearchChange && onSearchChange(e.target.value)}
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* Modern Mobile Drawer */}
            {menuOpen && (
                <div className="store-mobile-drawer-overlay" onClick={() => setMenuOpen(false)}>
                    <div className="store-mobile-drawer" onClick={(e) => e.stopPropagation()}>
                        <div className="mobile-drawer-top">
                            <img src="/assets/logo.png" alt="Graphène" className="mobile-drawer-logo" />
                            <button className="mobile-drawer-close" onClick={() => setMenuOpen(false)} aria-label="Fechar Menu">
                                <X size={24} />
                            </button>
                        </div>

                        <div className="mobile-drawer-links">
                            <Link to={customer ? '/minha-conta' : '/entrar'} className="mobile-drawer-link" onClick={() => setMenuOpen(false)}><div className="drawer-link-content"><UserRound size={15}/><span>{customer ? 'Minha conta' : 'Entrar / Criar conta'}</span></div><ChevronRight size={16} opacity={0.4} /></Link>
                            <Link to="/carrinho" className="mobile-drawer-link" onClick={() => setMenuOpen(false)}><div className="drawer-link-content"><ShoppingBag size={15}/><span>Sacola {itemCount ? `(${itemCount})` : ''}</span></div><ChevronRight size={16} opacity={0.4} /></Link>
                            {navItems.map((item, idx) => (
                                <Link
                                    key={idx}
                                    to={item.to}
                                    className={`mobile-drawer-link ${isActive(item.to) ? 'mobile-drawer-link--active' : ''}`}
                                    onClick={() => setMenuOpen(false)}
                                >
                                    <div className="drawer-link-content">
                                        {item.highlight && <Award size={15} color="var(--brand-blue)" />}
                                        <span>{item.label}</span>
                                    </div>
                                    <ChevronRight size={16} opacity={0.4} />
                                </Link>
                            ))}
                        </div>

                        <div className="mobile-drawer-footer">
                            <Link to="/receita" className="btn-cta-blue" style={{ width: '100%' }} onClick={() => setMenuOpen(false)}>
                                <FileUp size={17} /> Enviar Minha Receita
                            </Link>
                            <a href={getWhatsAppUrl()} target="_blank" rel="noopener noreferrer" className="btn-buy-wa" style={{ width: '100%' }}>
                                <MessageCircle size={17} /> Atendimento WhatsApp
                            </a>
                            <div className="mobile-drawer-contact-info">
                                <small>Rua Itajuru, 300, Lojas 5 e 6 • Cabo Frio, RJ</small>
                                <small>(22) 99936-1256 • Seg a Sex 08h-18h30</small>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                .store-header-wrapper { position: sticky; top: 0; z-index: 100; width: 100%; }
                
                .store-top-bar {
                    background: #040508;
                    border-bottom: 1px solid var(--border-subtle);
                    padding: 6px 0;
                    font-size: 0.76rem;
                    color: var(--text-dim);
                }
                .top-bar-flex { display: flex; align-items: center; justify-content: space-between; }
                .top-bar-left, .top-bar-right { display: flex; align-items: center; gap: 10px; }
                .top-bar-left span, .top-bar-right span { display: inline-flex; align-items: center; gap: 4px; }
                .divider-dot { color: var(--text-muted); opacity: 0.5; }
                .top-wa-link { display: inline-flex; align-items: center; gap: 4px; color: var(--brand-green); font-weight: 700; }
                .anvisa-tag { color: var(--brand-blue); font-weight: 600; }

                .store-main-header {
                    background: rgba(7, 9, 14, 0.96);
                    backdrop-filter: blur(12px);
                    -webkit-backdrop-filter: blur(12px);
                    border-bottom: 1px solid var(--border-subtle);
                    transition: var(--transition);
                }
                .store-header--scrolled { box-shadow: 0 4px 20px rgba(0,0,0,0.6); }

                .header-content-grid { display: flex; align-items: center; gap: 20px; height: 64px; }
                .store-brand { display: flex; align-items: center; flex-shrink: 0; }
                .store-logo-img { height: 34px; width: auto; object-fit: contain; }

                .store-search-bar { position: relative; flex: 1; max-width: 440px; }
                .search-icon { position: absolute; left: 14px; top: 50%; transform: translateY(-50%); color: var(--text-muted); }
                .store-search-bar input {
                    width: 100%;
                    padding: 9px 16px 9px 40px;
                    border-radius: var(--radius-full);
                    border: 1px solid var(--border-card);
                    background: rgba(255,255,255,0.04);
                    color: #fff;
                    font-size: 0.86rem;
                    outline: none;
                    transition: var(--transition);
                }
                .store-search-bar input:focus { border-color: var(--brand-blue); background: rgba(255,255,255,0.08); }

                .store-header-actions { display: flex; align-items: center; gap: 10px; margin-left: auto; }
                .btn-header-icon { position: relative; display: inline-flex; align-items: center; gap: 6px; color: var(--text-dim); font-size: .78rem; font-weight: 700; padding: 8px 7px; border-radius: var(--radius-sm); transition: var(--transition); }
                .btn-header-icon:hover { color: var(--brand-blue); background: rgba(0,180,216,.08); }
                .cart-count { position: absolute; top: 1px; right: 0; min-width: 16px; height: 16px; padding: 0 4px; border-radius: 999px; display: grid; place-items: center; background: var(--brand-green); color: var(--action-ink); font-size: .62rem; font-weight:900; border: 2px solid #070a10; }
                .btn-header-receita {
                    display: inline-flex;
                    align-items: center;
                    gap: 6px;
                    padding: 8px 14px;
                    border-radius: var(--radius-sm);
                    background: rgba(34,199,232,0.10);
                    border: 1px solid var(--border-blue);
                    color: var(--brand-blue);
                    font-size: 0.8rem;
                    font-weight: 700;
                    transition: var(--transition);
                }
                .btn-header-receita:hover { background: var(--brand-blue); color: #07090e; }
                .btn-header-wa {
                    display: inline-flex;
                    align-items: center;
                    gap: 6px;
                    padding: 8px 14px;
                    border-radius: var(--radius-sm);
                    background: rgba(36,211,154,.08);
                    border: 1px solid var(--border-green);
                    color: var(--brand-green) !important;
                    font-size: 0.8rem;
                    font-weight: 700;
                    transition: var(--transition);
                }
                .btn-header-wa:hover { background: rgba(36,211,154,.16); border-color:var(--brand-green); }
                
                .store-menu-toggle {
                    display: none;
                    background: none;
                    border: none;
                    color: #fff;
                    cursor: pointer;
                    padding: 6px;
                    border-radius: var(--radius-xs);
                }

                .store-subnav { border-top: 1px solid rgba(255,255,255,0.04); padding: 8px 0; }
                .subnav-flex { display: flex; align-items: center; gap: 24px; }
                .subnav-link {
                    font-size: 0.84rem;
                    font-weight: 600;
                    color: var(--text-dim);
                    padding: 4px 0;
                    border-bottom: 2px solid transparent;
                    transition: var(--transition);
                    display: inline-flex;
                    align-items: center;
                }
                .subnav-link:hover { color: var(--brand-blue); }
                .subnav-link--active { color: var(--brand-blue); border-bottom-color: var(--brand-blue); }
                .subnav-link--highlight { color: #38bdf8; font-weight: 700; }

                /* Mobile Search Strip */
                .store-mobile-search-strip {
                    display: none;
                    background: #090c13;
                    border-bottom: 1px solid var(--border-subtle);
                    padding: 8px 0;
                }
                .mobile-search-input-wrap {
                    position: relative;
                    width: 100%;
                }
                .mobile-search-icon {
                    position: absolute;
                    left: 12px;
                    top: 50%;
                    transform: translateY(-50%);
                    color: var(--text-muted);
                }
                .mobile-search-input-wrap input {
                    width: 100%;
                    padding: 10px 14px 10px 36px;
                    border-radius: var(--radius-full);
                    border: 1px solid var(--border-card);
                    background: rgba(255,255,255,0.04);
                    color: #fff;
                    outline: none;
                }

                /* Mobile Drawer Overlay */
                .store-mobile-drawer-overlay {
                    position: fixed;
                    inset: 0;
                    background: rgba(0, 0, 0, 0.75);
                    backdrop-filter: blur(6px);
                    -webkit-backdrop-filter: blur(6px);
                    z-index: 1000;
                    display: flex;
                    justify-content: flex-end;
                    animation: fadeIn 0.2s ease-out;
                }

                .store-mobile-drawer {
                    width: 85%;
                    max-width: 320px;
                    height: 100%;
                    background: #0c1018;
                    border-left: 1px solid var(--border-card);
                    display: flex;
                    flex-direction: column;
                    padding: 20px;
                    gap: 18px;
                    overflow-y: auto;
                    animation: slideInRight 0.25s ease-out;
                }

                .mobile-drawer-top {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding-bottom: 14px;
                    border-bottom: 1px solid var(--border-subtle);
                }
                .mobile-drawer-logo { height: 28px; width: auto; }
                .mobile-drawer-close { background: none; border: none; color: #fff; cursor: pointer; padding: 4px; }

                .mobile-drawer-links {
                    display: flex;
                    flex-direction: column;
                    gap: 4px;
                    flex: 1;
                }

                .mobile-drawer-link {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 12px 10px;
                    border-radius: var(--radius-sm);
                    font-size: 0.95rem;
                    font-weight: 600;
                    color: var(--text-dim);
                    transition: var(--transition);
                }
                .drawer-link-content { display: flex; align-items: center; gap: 8px; }
                .mobile-drawer-link:hover, .mobile-drawer-link--active {
                    background: rgba(0, 180, 216, 0.08);
                    color: var(--brand-blue);
                }

                .mobile-drawer-footer {
                    display: flex;
                    flex-direction: column;
                    gap: 10px;
                    padding-top: 16px;
                    border-top: 1px solid var(--border-subtle);
                }

                .mobile-drawer-contact-info {
                    display: flex;
                    flex-direction: column;
                    gap: 4px;
                    text-align: center;
                    margin-top: 6px;
                    color: var(--text-muted);
                    font-size: 0.72rem;
                }

                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }

                @keyframes slideInRight {
                    from { transform: translateX(100%); }
                    to { transform: translateX(0); }
                }

                @media (max-width: 960px) {
                    .store-subnav { display: none; }
                    .store-search-bar { display: none; }
                    .store-menu-toggle { display: flex; align-items: center; justify-content: center; }
                    .top-bar-left { display: none; }
                    .store-mobile-search-strip { display: block; }
                }

                @media (max-width: 820px) {
                    .btn-header-receita, .btn-header-wa { display: none; }
                    .header-icon-label { display: none; }
                    .btn-header-icon { padding: 8px 5px; }
                }

                @media (max-width: 600px) {
                    .header-content-grid { height: 56px; }
                    .top-bar-right { width: 100%; justify-content: space-between; }
                }
            `}</style>
        </header>
    );
};

export default Header;
