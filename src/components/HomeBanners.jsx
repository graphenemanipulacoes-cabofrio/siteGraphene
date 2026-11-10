import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { HOME_BANNERS } from '../data/homeBanners';
import '../styles/homeBanners.css';

// Banners da página inicial: foto real em cima, texto e botão embaixo (textos em src/data/homeBanners.js).

export default function HomeBanners() {
    if (!HOME_BANNERS.length) return null;
    return <section className="home-banners" aria-labelledby="home-banners-title">
        <div className="container">
            <h2 id="home-banners-title" className="home-banners-title">Atendimento e entrega</h2>
            <div className={`home-banners-grid${HOME_BANNERS.length === 1 ? ' is-single' : ''}`}>
                {HOME_BANNERS.map(banner => <Link key={banner.id} to={banner.to} className="home-banner">
                    <img src={`/assets/banners/${banner.image}-1280.webp`}
                        srcSet={`/assets/banners/${banner.image}-768.webp 768w, /assets/banners/${banner.image}-1280.webp 1280w`}
                        sizes="(max-width: 760px) 100vw, 50vw" width="1280" height="720" alt={banner.alt} loading="lazy" decoding="async" />
                    <span className="home-banner-copy">
                        <span className="home-banner-eyebrow">{banner.eyebrow}</span>
                        <strong className="home-banner-title">{banner.title}</strong>
                        <span className="home-banner-text">{banner.text}</span>
                        <span className="home-banner-action">{banner.action} <ArrowRight size={16} aria-hidden="true" /></span>
                    </span>
                </Link>)}
            </div>
        </div>
    </section>;
}
