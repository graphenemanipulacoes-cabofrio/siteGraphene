import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, MessageCircle, FileUp, Search, Truck, MapPin, Clock, Phone, ShoppingBag, UserRound, LockKeyhole, ChevronRight } from 'lucide-react';
import { getWhatsAppUrl } from '../config';
import { useStore } from '../context/StoreContext';
import '../styles/header.css';

const LOGO = '/assets/brand/graphene-logo';
const PHONE = '(22) 99936-1256';
const HOURS = 'Seg a sex 8h–18h30 · Sáb 8h–13h';

const NAV = [
    { label: 'Produtos', to: '/#produtos', match: '/' },
    { label: 'Matérias-primas', to: '/ativos' },
    { label: 'O laboratório', to: '/laboratorio' },
    { label: 'Avaliações', to: '/avaliacoes' },
    { label: 'Profissionais de saúde', to: '/prescritores' },
    { label: 'Programa de parceiros', to: '/parceiros' },
];

function Logo({ className }) {
    return <picture>
        <source srcSet={`${LOGO}.webp`} type="image/webp" />
        <img src={`${LOGO}.png`} alt="Graphène Farmácia de Manipulação" className={className} width="278" height="112" />
    </picture>;
}

// Acompanha a rolagem: sombra depois do topo e menu de seções que some ao
// descer e volta ao subir, para o cabeçalho ocupar menos espaço na leitura.
function useScrollState() {
    const [state, setState] = useState({ scrolled: false, condensed: false });
    const last = useRef(0);
    useEffect(() => {
        let frame = 0;
        const update = () => {
            frame = 0;
            const y = Math.max(window.scrollY, 0);
            const delta = y - last.current;
            if (Math.abs(delta) < 6 && y > 0) return;
            last.current = y;
            setState(current => {
                const next = { scrolled: y > 8, condensed: y > 160 ? (delta > 0 ? true : false) : false };
                return next.scrolled === current.scrolled && next.condensed === current.condensed ? current : next;
            });
        };
        const onScroll = () => { if (!frame) frame = requestAnimationFrame(update); };
        update();
        window.addEventListener('scroll', onScroll, { passive: true });
        return () => { window.removeEventListener('scroll', onScroll); if (frame) cancelAnimationFrame(frame); };
    }, []);
    return state;
}

const Header = ({ onSearchChange, searchTerm, showSearch = false }) => {
    const { scrolled, condensed } = useScrollState();
    const [menuOpen, setMenuOpen] = useState(false);
    const location = useLocation();
    const { itemCount, customer } = useStore();
    const closeButton = useRef(null);

    // Fecha o menu ao trocar de página.
    const [lastPath, setLastPath] = useState(location.pathname + location.hash);
    if (lastPath !== location.pathname + location.hash) {
        setLastPath(location.pathname + location.hash);
        if (menuOpen) setMenuOpen(false);
    }

    useEffect(() => {
        if (!menuOpen) return undefined;
        document.body.style.overflow = 'hidden';
        document.body.classList.add('mobile-menu-open');
        closeButton.current?.focus();
        const onKey = event => { if (event.key === 'Escape') setMenuOpen(false); };
        window.addEventListener('keydown', onKey);
        return () => {
            document.body.style.overflow = '';
            document.body.classList.remove('mobile-menu-open');
            window.removeEventListener('keydown', onKey);
        };
    }, [menuOpen]);

    const isActive = item => location.pathname === (item.match || item.to);
    const accountPath = customer ? '/minha-conta' : '/entrar';
    const accountLabel = customer ? 'Minha conta' : 'Entrar';
    const cartLabel = `Carrinho${itemCount ? `, ${itemCount} ${itemCount === 1 ? 'item' : 'itens'}` : ''}`;
    const search = showSearch && <label className="gh-search">
        <Search size={17} aria-hidden="true" />
        <span className="gh-sr">Buscar produtos</span>
        <input type="search" placeholder="Buscar creatina, melatonina, coenzima Q10…" value={searchTerm || ''} onChange={event => onSearchChange?.(event.target.value)} />
    </label>;

    return <>
        <div className="gh-top">
            <div className="container gh-top-row">
                <p className="gh-top-info">
                    <span><Truck size={14} aria-hidden="true" /> Enviamos para todo o Brasil</span>
                    <span className="gh-top-optional"><MapPin size={14} aria-hidden="true" /> Laboratório próprio em Cabo Frio, RJ</span>
                </p>
                <p className="gh-top-info">
                    <span><Clock size={14} aria-hidden="true" /> {HOURS}</span>
                    <a href={getWhatsAppUrl()} target="_blank" rel="noopener noreferrer"><Phone size={14} aria-hidden="true" /> {PHONE}</a>
                    <Link to="/parceiros/entrar" className="gh-top-partner"><LockKeyhole size={13} aria-hidden="true" /> Painel do parceiro</Link>
                </p>
            </div>
        </div>

        <header className={`gh-bar${scrolled ? ' is-scrolled' : ''}${condensed ? ' is-condensed' : ''}`}>
            <div className="gh-main">
                <div className="container gh-main-row">
                    <Link to="/" className="gh-brand" aria-label="Graphène — página inicial"><Logo className="gh-logo" /></Link>
                    {search}
                    <nav className="gh-actions" aria-label="Sua conta">
                        <Link to={accountPath} className="gh-icon-link" aria-label={accountLabel}><UserRound size={20} aria-hidden="true" /><span>{accountLabel}</span></Link>
                        <Link to="/carrinho" className="gh-icon-link gh-cart" aria-label={cartLabel}>
                            <span className="gh-cart-icon"><ShoppingBag size={20} aria-hidden="true" />{itemCount > 0 && <b aria-hidden="true">{itemCount > 9 ? '9+' : itemCount}</b>}</span>
                            <span>Carrinho</span>
                        </Link>
                        <Link to="/receita" className="gh-cta"><FileUp size={16} aria-hidden="true" /> Solicitar orçamento</Link>
                        <button type="button" className="gh-menu-toggle" onClick={() => setMenuOpen(true)} aria-label="Abrir menu" aria-expanded={menuOpen} aria-controls="gh-drawer"><Menu size={24} /></button>
                    </nav>
                </div>
            </div>
            <nav className="gh-sections" aria-label="Seções do site" aria-hidden={condensed || undefined}>
                <div className="container gh-sections-row">
                    {NAV.map(item => <Link key={item.to} to={item.to} tabIndex={condensed ? -1 : undefined} className={`gh-section-link${isActive(item) ? ' is-active' : ''}`} aria-current={isActive(item) ? 'page' : undefined}>{item.label}</Link>)}
                </div>
            </nav>
        </header>
        <div className="gh-sections-space" aria-hidden="true" />

        {showSearch && <div className="gh-mobile-search"><div className="container">{search}</div></div>}

        {menuOpen && <div className="gh-drawer-backdrop" onClick={() => setMenuOpen(false)}>
            <div id="gh-drawer" className="gh-drawer" role="dialog" aria-modal="true" aria-label="Menu" onClick={event => event.stopPropagation()}>
                <div className="gh-drawer-head">
                    <Logo className="gh-drawer-logo" />
                    <button type="button" ref={closeButton} className="gh-drawer-close" onClick={() => setMenuOpen(false)} aria-label="Fechar menu"><X size={22} /></button>
                </div>
                <div className="gh-drawer-quick">
                    <Link to={accountPath}><UserRound size={18} aria-hidden="true" /> {customer ? 'Minha conta' : 'Entrar ou criar conta'}</Link>
                    <Link to="/carrinho"><ShoppingBag size={18} aria-hidden="true" /> Carrinho{itemCount ? ` (${itemCount})` : ''}</Link>
                </div>
                <nav className="gh-drawer-links" aria-label="Seções do site">
                    {NAV.map(item => <Link key={item.to} to={item.to} className={isActive(item) ? 'is-active' : ''} aria-current={isActive(item) ? 'page' : undefined}>{item.label}<ChevronRight size={17} aria-hidden="true" /></Link>)}
                    <Link to="/parceiros/entrar">Painel do parceiro<ChevronRight size={17} aria-hidden="true" /></Link>
                </nav>
                <div className="gh-drawer-foot">
                    <Link to="/receita" className="gh-cta"><FileUp size={17} aria-hidden="true" /> Solicitar orçamento</Link>
                    <a href={getWhatsAppUrl()} target="_blank" rel="noopener noreferrer" className="gh-drawer-wa"><MessageCircle size={17} aria-hidden="true" /> Falar no WhatsApp</a>
                    <address>
                        <span>Rua Itajuru, 300 (Lojas 5 e 6) · Centro, Cabo Frio, RJ</span>
                        <span>{PHONE} · {HOURS}</span>
                    </address>
                </div>
            </div>
        </div>}
    </>;
};

export default Header;
