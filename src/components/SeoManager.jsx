import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { SITE_URL, DEFAULT_IMAGE, pageMetadata, privatePaths, productMetadata } from '../seo/config';
import { getBusinessStructuredData } from '../seo/businessSchema';

function setMeta(selector, attributes) {
    let element = document.head.querySelector(selector);
    if (!element) {
        element = document.createElement('meta');
        document.head.appendChild(element);
    }
    Object.entries(attributes).forEach(([key, value]) => element.setAttribute(key, value));
}

function setLink(rel, href) {
    let element = document.head.querySelector(`link[rel="${rel}"]`);
    if (!element) {
        element = document.createElement('link');
        element.setAttribute('rel', rel);
        document.head.appendChild(element);
    }
    element.setAttribute('href', href);
}

function upsertJsonLd(id, data) {
    let script = document.head.querySelector(`script#${id}`);
    if (!data) {
        script?.remove();
        return;
    }
    if (!script) {
        script = document.createElement('script');
        script.id = id;
        script.type = 'application/ld+json';
        document.head.appendChild(script);
    }
    script.textContent = JSON.stringify(data);
}

function isPrivate(pathname) {
    return privatePaths.some(path => pathname === path || pathname.startsWith(`${path}/`));
}

export default function SeoManager() {
    const { pathname } = useLocation();

    useEffect(() => {
        const normalizedPath = pathname === '/' ? '/' : pathname.replace(/\/$/, '');
        const privatePage = isPrivate(normalizedPath);
        const isProduct = /^\/produto\/[^/]+$/.test(normalizedPath);
        const isUnknownPage = !pageMetadata[normalizedPath] && !isProduct;
        const metadata = pageMetadata[normalizedPath] || (isProduct ? productMetadata : {
            title: 'Graphène Manipulações em Cabo Frio | Atendimento farmacêutico',
            description: 'Conheça a unidade Graphène em Cabo Frio e fale com a equipe farmacêutica.'
        });
        const canonical = `${SITE_URL}${normalizedPath === '/' ? '/' : normalizedPath}`;

        document.title = metadata.title;
        setMeta('meta[name="description"]', { name: 'description', content: metadata.description });
        setMeta('meta[name="robots"]', {
            name: 'robots',
            content: privatePage ? 'noindex, nofollow' : isUnknownPage ? 'noindex, follow' : 'index, follow, max-image-preview:large'
        });
        if (privatePage || isUnknownPage) {
            document.head.querySelector('link[rel="canonical"]')?.remove();
        } else {
            setLink('canonical', canonical);
        }
        setMeta('meta[property="og:type"]', { property: 'og:type', content: 'website' });
        setMeta('meta[property="og:site_name"]', { property: 'og:site_name', content: 'Graphène Manipulações' });
        setMeta('meta[property="og:locale"]', { property: 'og:locale', content: 'pt_BR' });
        setMeta('meta[property="og:title"]', { property: 'og:title', content: metadata.title });
        setMeta('meta[property="og:description"]', { property: 'og:description', content: metadata.description });
        if (privatePage || isUnknownPage) {
            document.head.querySelector('meta[property="og:url"]')?.remove();
        } else {
            setMeta('meta[property="og:url"]', { property: 'og:url', content: canonical });
        }
        setMeta('meta[property="og:image"]', { property: 'og:image', content: DEFAULT_IMAGE });
        setMeta('meta[name="twitter:card"]', { name: 'twitter:card', content: 'summary_large_image' });
        setMeta('meta[name="twitter:title"]', { name: 'twitter:title', content: metadata.title });
        setMeta('meta[name="twitter:description"]', { name: 'twitter:description', content: metadata.description });
        setMeta('meta[name="twitter:image"]', { name: 'twitter:image', content: DEFAULT_IMAGE });
        upsertJsonLd('graphene-pharmacy-schema', getBusinessStructuredData(normalizedPath));
    }, [pathname]);

    return null;
}

// This hook is colocated to share SEO tag helpers; it is consumed by ProductPage.
// eslint-disable-next-line react-refresh/only-export-components
export function useProductSeo(product) {
    useEffect(() => {
        if (!product) return;
        const name = String(product.name || 'Produto Graphène').trim();
        const title = `${name} | Graphène Manipulações em Cabo Frio`;
        const description = `Consulte apresentação, informações e preço de ${name} na Graphène, em Cabo Frio.`;
        document.title = title;
        setMeta('meta[name="description"]', { name: 'description', content: description });
        setMeta('meta[property="og:title"]', { property: 'og:title', content: title });
        setMeta('meta[property="og:description"]', { property: 'og:description', content: description });
        setMeta('meta[name="twitter:title"]', { name: 'twitter:title', content: title });
        setMeta('meta[name="twitter:description"]', { name: 'twitter:description', content: description });
        if (product.image_url) {
            setMeta('meta[property="og:image"]', { property: 'og:image', content: product.image_url });
            setMeta('meta[name="twitter:image"]', { name: 'twitter:image', content: product.image_url });
        }
    }, [product]);
}
