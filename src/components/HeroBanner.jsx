import { useEffect, useRef, useState } from 'react';
import { ArrowUpRight, ChevronLeft, ChevronRight, FileUp, MessageCircle, Pause, Play, ShoppingBag, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getWhatsAppUrl } from '../config';
import { PRESCRIPTION_PAGES_ENABLED } from '../data/publicChannels';
import { HERO_INTERVAL_MS, HERO_SLIDES } from '../data/heroSlides';
import '../styles/heroCarousel.css';

const reducedMotion = () => typeof window !== 'undefined' && Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
const TOTAL = HERO_SLIDES.length + 1;

// Grafismo atrás dos frascos, no mesmo sistema de coordenadas da foto do palco (1240x1000).
const RAYS = Array.from({ length: 28 }, (_, i) => {
    const angle = (i / 28) * Math.PI * 2;
    const point = radius => [620 + Math.cos(angle) * radius, 590 + Math.sin(angle) * radius].map(n => n.toFixed(1));
    const [x1, y1] = point(392);
    const [x2, y2] = point(i % 2 ? 448 : 486);
    return { x1, y1, x2, y2 };
});
const HeroMotif = ({ type }) => <svg className="hero-motif" viewBox="0 0 1240 1000" preserveAspectRatio="xMidYMax meet" aria-hidden="true" focusable="false">
    <defs>
        <clipPath id={`hero-clip-${type}`}><circle cx="620" cy="590" r="360" /></clipPath>
        {type === 'stripes' && <pattern id="hero-stripes" width="44" height="44" patternUnits="userSpaceOnUse" patternTransform="rotate(-35)">
            <rect width="22" height="44" className="hero-motif-line-fill" />
        </pattern>}
    </defs>
    {type === 'sun' && RAYS.map((ray, i) => <line key={i} {...ray} className="hero-motif-line" strokeWidth="7" strokeLinecap="round" />)}
    {type === 'rings' && [404, 452, 500].map(r => <circle key={r} cx="620" cy="590" r={r} fill="none" className="hero-motif-line" strokeWidth="2.5" />)}
    <circle cx="620" cy="590" r="360" className="hero-motif-fill" />
    {type === 'stripes' && <rect x="0" y="0" width="1240" height="1000" fill="url(#hero-stripes)" clipPath={`url(#hero-clip-${type})`} />}
</svg>;

// Banner do topo em carrossel: o primeiro slide é o da marca; os outros vêm de src/data/heroSlides.js.
// Troca sozinho a cada HERO_INTERVAL_MS, para ao passar o mouse ou focar, tem botão de pausa
// e não troca sozinho para quem pediu menos movimento no sistema.
const HeroBanner = () => {
    const [index, setIndex] = useState(0);
    const [playing, setPlaying] = useState(() => !reducedMotion());
    const [hold, setHold] = useState(false);
    const [visible, setVisible] = useState(true);
    const touch = useRef(null);

    const go = next => setIndex((next + TOTAL) % TOTAL);
    useEffect(() => {
        if (!playing || hold || !visible || TOTAL < 2) return undefined;
        const timer = window.setTimeout(() => setIndex(current => (current + 1) % TOTAL), HERO_INTERVAL_MS);
        return () => window.clearTimeout(timer);
    }, [index, playing, hold, visible]);
    useEffect(() => {
        const update = () => setVisible(document.visibilityState !== 'hidden');
        document.addEventListener('visibilitychange', update);
        return () => document.removeEventListener('visibilitychange', update);
    }, []);

    const touchStart = event => { const point = event.touches[0]; touch.current = { x: point.clientX, y: point.clientY }; };
    const touchEnd = event => {
        const start = touch.current;
        touch.current = null;
        if (!start) return;
        const point = event.changedTouches[0];
        const dx = point.clientX - start.x;
        if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(point.clientY - start.y)) go(index + (dx < 0 ? 1 : -1));
    };
    const slideProps = position => ({
        className: `hero-slide${position === index ? ' is-active' : ''}`,
        role: 'group', 'aria-roledescription': 'slide', 'aria-label': `${position + 1} de ${TOTAL}`,
        'aria-hidden': position !== index, inert: position !== index,
    });

    return <section className="premium-hero hero-carousel" aria-roledescription="carrossel" aria-label="Destaques da Graphène"
        onMouseEnter={() => setHold(true)} onMouseLeave={() => setHold(false)}
        onFocus={() => setHold(true)} onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setHold(false); }}
        onTouchStart={touchStart} onTouchEnd={touchEnd}>
        <div className="premium-hero-grid" aria-hidden="true" />
        <div className="hero-viewport">
            <div className="hero-track" style={{ transform: `translateX(-${index * 100}%)` }} aria-live={playing && !hold ? 'off' : 'polite'}>
                <div {...slideProps(0)}>
                    <div className="premium-hero-banner">
                        <img src="/assets/graphene_banner_top.webp" srcSet="/assets/graphene_banner_top-900.webp 900w, /assets/graphene_banner_top.webp 2048w" sizes="100vw" width="2048" height="768" alt="Linha de produtos Graphène Manipulações" className="premium-hero-image" fetchPriority="high" />
                    </div>
                    <div className="premium-hero-overlay" aria-hidden="true" />
                    <div className="container premium-hero-inner">
                        <div className="premium-hero-copy">
                            <div className="premium-eyebrow"><span /> Manipulações · Cabo Frio</div>
                            <h1 id="store-hero-title">Graphène.<br /><span>Atenção a cada detalhe.</span></h1>
                            <p>Suplementos, vitaminas e cuidados com a pele, com atendimento farmacêutico em Cabo Frio e entrega para todo o Brasil.</p>
                            <div className="hero-cta-row">
                                <Link to="/produtos" className="btn-commerce hero-btn"><ShoppingBag size={18} /> Ver produtos <ArrowUpRight size={18} /></Link>
                                {PRESCRIPTION_PAGES_ENABLED
                                    ? <Link to="/receita" className="btn-cta-outline hero-btn"><FileUp size={18} /> Solicitar orçamento</Link>
                                    : <a href={getWhatsAppUrl()} target="_blank" rel="noopener noreferrer" className="btn-cta-outline hero-btn"><MessageCircle size={18} /> Falar no WhatsApp</a>}
                            </div>
                            <div className="premium-hero-note"><ShieldCheck size={17} /><span>Atendimento farmacêutico em Cabo Frio, RJ.</span></div>
                        </div>
                    </div>
                </div>
                {HERO_SLIDES.map((slide, position) => <div key={slide.id} {...slideProps(position + 1)} data-theme={slide.id}>
                    <div className="container hero-color-inner">
                        <div className="hero-color-copy">
                            <div className="hero-color-eyebrow"><span>{String(position + 1).padStart(2, '0')}</span> {slide.eyebrow}</div>
                            <h2 className="hero-title">{slide.title}<br /><span>{slide.accent}</span></h2>
                            <p>{slide.text}</p>
                            <div className="hero-cta-row">
                                <Link to={slide.to} className="hero-btn hero-btn-solid"><ShoppingBag size={18} /> {slide.action} <ArrowUpRight size={18} /></Link>
                                <Link to="/produtos" className="hero-btn hero-btn-line">Ver todos os produtos</Link>
                            </div>
                            <div className="hero-color-note"><ShieldCheck size={17} /><span>Atendimento farmacêutico em Cabo Frio, RJ.</span></div>
                        </div>
                        <div className="hero-stage">
                            <HeroMotif type={slide.motif} />
                            <img src={`/assets/hero/${slide.image}-1240.webp`} srcSet={`/assets/hero/${slide.image}-620.webp 620w, /assets/hero/${slide.image}-1240.webp 1240w`}
                                sizes="(max-width: 960px) 100vw, 620px" width="1240" height="1000" alt={slide.alt} fetchPriority="low" decoding="async" />
                        </div>
                    </div>
                </div>)}
            </div>
        </div>
        <div className="hero-controls">
            <div className="container">
                <div className="hero-controls-box">
                    <button type="button" className="hero-arrow" onClick={() => go(index - 1)} aria-label="Destaque anterior"><ChevronLeft size={18} aria-hidden="true" /></button>
                    {Array.from({ length: TOTAL }, (_, position) => <button key={position} type="button" className="hero-dot" onClick={() => go(position)}
                        aria-label={`Mostrar ${position === 0 ? 'Graphène' : HERO_SLIDES[position - 1].eyebrow}`} aria-current={position === index} />)}
                    <button type="button" className="hero-arrow" onClick={() => go(index + 1)} aria-label="Próximo destaque"><ChevronRight size={18} aria-hidden="true" /></button>
                    <button type="button" className="hero-arrow" onClick={() => setPlaying(current => !current)} aria-label={playing ? 'Pausar a troca automática' : 'Retomar a troca automática'}>
                        {playing ? <Pause size={15} aria-hidden="true" /> : <Play size={15} aria-hidden="true" />}
                    </button>
                </div>
            </div>
        </div>
    </section>;
};

export default HeroBanner;
