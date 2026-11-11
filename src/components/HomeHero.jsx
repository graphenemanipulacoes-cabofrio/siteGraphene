import { useEffect, useRef, useState } from 'react';
import { ArrowUpRight, Camera, FileUp, HeartPulse, MessageCircle, Pause, Play, ShoppingBag, Smartphone, TicketPercent, Truck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getWhatsAppUrl } from '../config';
import { PRESCRIPTION_PAGES_ENABLED } from '../data/publicChannels';
import { VITRINE_INTERVAL_MS, VITRINE_SCENES } from '../data/vitrineScenes';
import '../styles/homeHero.css';

const PECAS = '/assets/hero/vitrine/';
const FOTOS = '/assets/hero/pessoas/';
const ICONS = { truck: Truck, heart: HeartPulse, camera: Camera, phone: Smartphone };
// A cena da receita só aparece quando as páginas de receita estão no ar.
const SCENES = VITRINE_SCENES.filter(scene => !scene.prescription || PRESCRIPTION_PAGES_ENABLED);
const TOTAL = SCENES.length;
const DEPTH = { longe: 5, meio: 12, perto: 26 };
// Forma do líquido atrás da foto: três desenhos com os mesmos comandos, para o navegador transformar um no outro.
const BLOB = [
    'M700 160C890 160 1040 300 1040 490C1040 690 880 840 690 840C500 840 360 700 360 500C360 300 510 160 700 160Z',
    'M720 175C930 195 1065 335 1030 520C995 720 850 830 660 822C470 812 345 680 370 482C392 292 530 158 720 175Z',
    'M688 150C880 138 1012 282 1050 470C1082 662 902 852 700 850C508 848 336 722 350 520C362 318 500 162 688 150Z',
];

// Topo da página inicial: o texto fica fixo e a "vitrine viva" ao lado troca a cena do dia a dia
// (com a mensagem de como comprar e receber), o ambiente (cor) e os elementos que flutuam em volta.
// Cada ambiente tem uma entrada própria (pó explode, cápsulas caem, gotas pingam) e depois
// os elementos seguem flutuando. Para fora da tela, com a aba escondida ou no botão de pausa. Com
// "reduzir animações" o movimento continua, mais lento e menor, sem profundidade pelo mouse (pedido do dono).
const HomeHero = () => {
    const [index, setIndex] = useState(0);
    const [playing, setPlaying] = useState(true);
    const [onScreen, setOnScreen] = useState(true);
    const [tabVisible, setTabVisible] = useState(true);
    const [ready, setReady] = useState(false);
    const card = useRef(null);
    const blob = useRef(null);
    const running = playing && onScreen && tabVisible;
    const scene = SCENES[index];

    // Os outros ambientes só começam a carregar depois que o primeiro já apareceu.
    useEffect(() => {
        const timer = window.setTimeout(() => setReady(true), 1200);
        return () => window.clearTimeout(timer);
    }, []);
    useEffect(() => {
        if (!running || !ready) return undefined;
        const timer = window.setTimeout(() => setIndex(current => (current + 1) % TOTAL), VITRINE_INTERVAL_MS);
        return () => window.clearTimeout(timer);
    }, [index, running, ready]);
    useEffect(() => {
        const update = () => setTabVisible(document.visibilityState !== 'hidden');
        document.addEventListener('visibilitychange', update);
        return () => document.removeEventListener('visibilitychange', update);
    }, []);
    useEffect(() => {
        if (!card.current || typeof IntersectionObserver === 'undefined') return undefined;
        const observer = new IntersectionObserver(([entry]) => setOnScreen(entry.isIntersecting), { threshold: 0.15 });
        observer.observe(card.current);
        return () => observer.disconnect();
    }, []);

    // A forma do líquido (animação do próprio SVG) para junto com o resto.
    useEffect(() => {
        const svg = blob.current;
        if (!svg?.pauseAnimations) return;
        if (running) svg.unpauseAnimations(); else svg.pauseAnimations();
    }, [running]);

    // Profundidade ao mover o mouse: cada camada se desloca um pouco diferente.
    const pointerMove = event => {
        if (event.pointerType !== 'mouse' || !card.current) return;
        const box = card.current.getBoundingClientRect();
        card.current.style.setProperty('--mx', (((event.clientX - box.left) / box.width) * 2 - 1).toFixed(3));
        card.current.style.setProperty('--my', (((event.clientY - box.top) / box.height) * 2 - 1).toFixed(3));
    };
    const pointerLeave = () => {
        card.current?.style.setProperty('--mx', '0');
        card.current?.style.setProperty('--my', '0');
    };

    const particle = (item, order) => <span key={`${item.src}-${order}`} className={`hh-p hh-p-${item.prof}${item.cel ? '' : ' hh-p-extra'}`} aria-hidden="true"
        style={{ left: `${item.x}%`, top: `${item.y}%`, width: `${item.size}%`, '--depth': DEPTH[item.prof], '--i': order,
            '--dur': `${5 + ((order * 1.7) % 3.5)}s`, '--spin': `${14 + (order % 3) * 4}s`, '--rot': `${((order * 37) % 50) - 25}deg`, '--dr': `${8 + (order % 3) * 5}deg`, '--dy': `${14 + (order % 4) * 5}px` }}>
        <img src={`${PECAS}${item.src}.webp`} alt="" draggable="false" decoding="async" />
    </span>;

    return <section className="home-hero" aria-labelledby="store-hero-title">
        <div className="container">
            <div ref={card} className="home-hero-card" data-scene={scene.tema} data-running={running} onPointerMove={pointerMove} onPointerLeave={pointerLeave}
                style={{ '--hh-interval': `${VITRINE_INTERVAL_MS}ms` }}>
                {SCENES.map((item, position) => <div key={item.id} className={`hh-bg hh-bg-${item.tema}${position === index ? ' is-on' : ''}`} aria-hidden="true" />)}
                <div className="home-hero-copy">
                    <p className="home-hero-eyebrow"><Truck size={14} aria-hidden="true" /> <span>Farmácia de manipulação</span><span className="hh-sep" aria-hidden="true">·</span><span>Entrega em todo o Brasil</span></p>
                    <h1 id="store-hero-title">Sua farmácia de manipulação,<br /><span>sem sair de casa.</span></h1>
                    <p className="home-hero-text">Escolha pelo site ou envie sua receita. Manipulamos no nosso laboratório, com atendimento farmacêutico, e enviamos para todo o Brasil.</p>
                    <div className="home-hero-actions">
                        <Link to="/produtos" className="home-hero-btn home-hero-btn-main"><ShoppingBag size={18} aria-hidden="true" /> Ver produtos <ArrowUpRight size={18} aria-hidden="true" /></Link>
                        {PRESCRIPTION_PAGES_ENABLED
                            ? <Link to="/receita" className="home-hero-btn home-hero-btn-line"><FileUp size={18} aria-hidden="true" /> Enviar receita</Link>
                            : <a href={getWhatsAppUrl()} target="_blank" rel="noopener noreferrer" className="home-hero-btn home-hero-btn-line"><MessageCircle size={18} aria-hidden="true" /> Falar no WhatsApp</a>}
                    </div>
                    <p className="home-hero-coupon"><TicketPercent size={16} aria-hidden="true" /> Veio pela indicação de uma parceira? O cupom dela vale no carrinho.</p>
                </div>
                <div className="hh-visual">
                    <svg ref={blob} className="hh-blob" viewBox="0 0 1400 1000" preserveAspectRatio="xMidYMid meet" aria-hidden="true" focusable="false">
                        <defs>
                            <linearGradient id="hh-blob-fill" x1="0" y1="0" x2="1" y2="1">
                                <stop offset="0" stopColor="#fff" stopOpacity=".5" /><stop offset="1" stopColor="#fff" stopOpacity=".08" />
                            </linearGradient>
                        </defs>
                        <path d={BLOB[0]} fill="url(#hh-blob-fill)" stroke="#fff" strokeOpacity=".35" strokeWidth="2">
                            <animate attributeName="d" dur="14s" repeatCount="indefinite" values={`${BLOB[0]};${BLOB[1]};${BLOB[2]};${BLOB[0]}`}
                                keyTimes="0;.33;.66;1" calcMode="spline" keySplines=".45 0 .55 1;.45 0 .55 1;.45 0 .55 1" />
                        </path>
                    </svg>
                    {SCENES.map((item, position) => (ready || position === 0) && <div key={item.id} className={`hh-scene${position === index ? ' is-on' : ''}`} data-kind={item.tema} aria-hidden={position !== index}>
                        {item.burst && <span className="hh-burst" aria-hidden="true"><img src={`${PECAS}${item.burst}.webp`} alt="" draggable="false" decoding="async" /></span>}
                        {item.burst && <span className="hh-grains" aria-hidden="true">{Array.from({ length: 12 }, (_, n) => <i key={n} style={{ '--n': n }} />)}</span>}
                        {item.particles.map((p, order) => (p.prof !== 'perto' ? particle(p, order) : null))}
                        <div className="hh-photo-card" style={{ '--tilt': `${item.tilt}deg` }}>
                            <figure className="hh-photo-float">
                                <img src={`${FOTOS}${item.photo}-900.webp`} srcSet={`${FOTOS}${item.photo}-520.webp 520w, ${FOTOS}${item.photo}-900.webp 900w`}
                                    sizes="(max-width: 760px) 80vw, 460px" width="1536" height="1152" alt={position === index ? item.alt : ''} draggable="false"
                                    fetchPriority={position === 0 ? 'high' : 'low'} decoding="async" />
                                <figcaption>{(() => { const Icon = ICONS[item.icon]; return <Icon size={16} aria-hidden="true" />; })()}<span>{item.caption}</span></figcaption>
                            </figure>
                        </div>
                        {item.particles.map((p, order) => (p.prof === 'perto' ? particle(p, order) : null))}
                    </div>)}
                    <div className="hh-tag">
                        <div className="hh-dots">
                            {SCENES.map((item, position) => <button key={item.id} type="button" className="hh-dot" onClick={() => { setReady(true); setIndex(position); }}
                                aria-label={`Mostrar: ${item.caption}`} aria-current={position === index} />)}
                            <button type="button" className="hh-pause" onClick={() => setPlaying(current => !current)} aria-label={playing ? 'Pausar a troca de imagens' : 'Retomar a troca de imagens'}>
                                {playing ? <Pause size={14} aria-hidden="true" /> : <Play size={14} aria-hidden="true" />}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </section>;
};

export default HomeHero;
