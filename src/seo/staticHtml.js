// Conteúdo que vai no próprio HTML: aparece antes de o JavaScript carregar e para quem abre sem ele.
// É o mesmo para todos os visitantes e robôs. O React substitui esta versão quando monta a página.
import { business } from '../data/business.js';
import { LEGAL_NOTICE, PURCHASE_STEPS, RETURN_POLICY } from '../data/storeTexts.js';
import { GOALS } from '../utils/productGoals.js';
import { resolveProductImage } from '../utils/productImages.js';
import { DEFAULT_IMAGE, SITE_URL, pageMetadata, productMetadata } from './config.js';

const INDEX = 'index, follow, max-image-preview:large';
const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const WHATSAPP = `https://wa.me/${business.telephone.replace(/\D/g, '')}`;

const STYLE = `<style id="pre-style">.pre{box-sizing:border-box;min-height:100vh;padding:28px 20px 48px;background:#080b12;color:#dfe8ee;font:16px/1.65 "Plus Jakarta Sans",system-ui,-apple-system,"Segoe UI",sans-serif}.pre>*{max-width:880px;margin-left:auto;margin-right:auto}.pre a{color:#7fd8ea}.pre h1{margin-top:10px;margin-bottom:10px;font-size:1.9rem;line-height:1.2;color:#fff}.pre h2{margin-top:28px;margin-bottom:8px;font-size:1.05rem;color:#fff}.pre p{margin-top:0;margin-bottom:10px}.pre ul,.pre ol{margin-top:0;margin-bottom:10px;padding-left:22px}.pre nav a{display:inline-block;margin:0 16px 8px 0}.pre img{display:block;width:220px;max-width:100%;height:auto;background:#fff;border-radius:8px}.pre-note{font-size:.82rem;color:#aebdc8}</style>`;

export function escapeHtml(value) {
    return String(value ?? '').replace(/[&"<>]/g, character => ({ '&': '&amp;', '"': '&quot;', '<': '&lt;', '>': '&gt;' })[character]);
}

// Troca a marca existente; se não houver, acrescenta no fim do head. Marca vazia remove.
function setHeadTag(html, pattern, tag) {
    if (pattern.test(html)) return html.replace(pattern, () => tag);
    return tag ? html.replace('</head>', () => `  ${tag}\n</head>`) : html;
}

function setRootContent(html, body) {
    const content = `<div id="root"><!--pre-->${body}<!--/pre--></div>`;
    const filled = /<div id="root"><!--pre-->[\s\S]*<!--\/pre--><\/div>/;
    return filled.test(html) ? html.replace(filled, () => content) : html.replace('<div id="root"></div>', () => content);
}

const metaName = (name, content) => (content ? `<meta name="${name}" content="${escapeHtml(content)}" />` : '');
const metaProperty = (property, content) => (content ? `<meta property="${property}" content="${escapeHtml(content)}" />` : '');
const jsonLd = (id, data) => `<script id="${id}" type="application/ld+json">${JSON.stringify(data).replace(/</g, '\\u003c')}</script>`;

export function renderPage(shell, { title, description, canonical, robots = INDEX, image, structuredData = [], body }) {
    let html = shell;
    html = setHeadTag(html, /<title>[^<]*<\/title>/i, `<title>${escapeHtml(title)}</title>`);
    html = setHeadTag(html, /<meta name="description"[^>]*>/i, metaName('description', description));
    html = setHeadTag(html, /<meta name="robots"[^>]*>/i, metaName('robots', robots));
    html = setHeadTag(html, /<link rel="canonical"[^>]*>/i, canonical ? `<link rel="canonical" href="${escapeHtml(canonical)}" />` : '');
    html = setHeadTag(html, /<meta property="og:title"[^>]*>/i, metaProperty('og:title', title));
    html = setHeadTag(html, /<meta property="og:description"[^>]*>/i, metaProperty('og:description', description));
    html = setHeadTag(html, /<meta property="og:url"[^>]*>/i, metaProperty('og:url', canonical));
    html = setHeadTag(html, /<meta name="twitter:title"[^>]*>/i, metaName('twitter:title', title));
    html = setHeadTag(html, /<meta name="twitter:description"[^>]*>/i, metaName('twitter:description', description));
    if (image) {
        html = setHeadTag(html, /<meta property="og:image"[^>]*>/i, metaProperty('og:image', image));
        html = setHeadTag(html, /<meta name="twitter:image"[^>]*>/i, metaName('twitter:image', image));
    }
    for (const { id, data } of structuredData) html = setHeadTag(html, new RegExp(`<script id="${id}"[\\s\\S]*?</script>`), jsonLd(id, data));
    if (!body) return html;
    return setRootContent(setHeadTag(html, /<style id="pre-style">[\s\S]*?<\/style>/, STYLE), body);
}

const siteLinks = `<nav aria-label="Seções do site"><a href="/#produtos">Produtos</a><a href="/laboratorio">O laboratório</a><a href="/avaliacoes">Avaliações</a><a href="/parceiros">Programa de parceiros</a><a href="/sobre">Sobre a Graphène</a><a href="/compras">Compra, pagamento e entrega</a><a href="/trocas">Trocas e devoluções</a><a href="/privacidade">Privacidade</a><a href="${WHATSAPP}">WhatsApp</a></nav>`;

const paymentAndDelivery = '<section><h2>Pagamento e entrega</h2><p>O pagamento é feito no ambiente do Mercado Pago, com Pix ou cartão de crédito. Enviamos para todo o Brasil: informe o CEP para ver o valor e o prazo antes de comprar. Na Região dos Lagos, a entrega é feita por motoboy ou você pode retirar na loja.</p></section>';

function identitySection() {
    const { address, pharmacist, afe, hours } = business;
    const lines = [
        `<strong>${escapeHtml(business.name)}</strong>, razão social ${escapeHtml(business.legalName)}, CNPJ ${escapeHtml(business.cnpj)}.`,
        `Farmácia de manipulação na ${escapeHtml(address.street)}, ${escapeHtml(address.neighborhood)}, ${escapeHtml(address.city)}, ${escapeHtml(address.region)}. Atendimento de segunda a sexta, ${escapeHtml(hours.weekdays)}, e sábado, ${escapeHtml(hours.saturday)}.`,
        `Responsável técnica: ${escapeHtml(pharmacist.name)}, farmacêutica, CRF-RJ ${escapeHtml(pharmacist.registration)}. Registro do estabelecimento: CRF-RJ ${escapeHtml(business.establishmentRegistration)}.`,
        `Autorização de funcionamento (AFE) da Anvisa nº ${escapeHtml(afe.number)}.`,
    ];
    if (business.sanitaryLicense) lines.push(`Licença sanitária: ${escapeHtml(business.sanitaryLicense)}.`);
    if (business.specialAuthorization) lines.push(`Autorização especial (AE): ${escapeHtml(business.specialAuthorization)}.`);
    return `<section><h2>Identificação da empresa</h2>${lines.map(line => `<p>${line}</p>`).join('')}<p class="pre-note">${escapeHtml(LEGAL_NOTICE)}</p></section>`;
}

const pageFrame = content => `<main class="pre"><p><a href="/"><strong>Graphène Manipulações</strong></a> · Cabo Frio, RJ</p>${content}${siteLinks}${identitySection()}</main>`;
const purchaseSteps = `<section><h2>Como comprar</h2><ol>${PURCHASE_STEPS.map(step => `<li>${escapeHtml(step)}</li>`).join('')}</ol></section>`;

const pageSections = {
    '/': () => `<section><h2>Categorias</h2><ul>${GOALS.map(goal => `<li>${escapeHtml(goal.label)}</li>`).join('')}</ul><p><a href="/#produtos">Ver todos os produtos</a></p></section>${purchaseSteps}${paymentAndDelivery}`,
    '/compras': () => `${purchaseSteps}${paymentAndDelivery}`,
    '/trocas': () => `<section><h2>Como solicitar</h2>${RETURN_POLICY.map(paragraph => `<p>${escapeHtml(paragraph)}</p>`).join('')}</section>`,
};

export function pageBody(pathname) {
    const metadata = pageMetadata[pathname] || productMetadata;
    const heading = pathname === '/' ? 'Graphène. Atenção a cada detalhe.' : metadata.title.split(' | ')[0];
    return pageFrame(`<h1>${escapeHtml(heading)}</h1><p>${escapeHtml(metadata.description)}</p>${pageSections[pathname]?.() || ''}`);
}

// Preços à venda: das quantidades com preço ou, sem quantidades, o preço do produto.
export function productPrices(product) {
    const sizes = Array.isArray(product?.options?.sizes) ? product.options.sizes : [];
    const fromSizes = sizes.map(size => Number(size?.price)).filter(price => Number.isFinite(price) && price > 0);
    if (sizes.length) return fromSizes;
    const price = Number(product?.price);
    return Number.isFinite(price) && price > 0 ? [price] : [];
}

export function productImageUrl(product) {
    const image = resolveProductImage(product);
    if (/^https?:\/\//i.test(image)) return image;
    return image.startsWith('/') ? `${SITE_URL}${image}` : DEFAULT_IMAGE;
}

export const productUrl = product => `${SITE_URL}/produto/${encodeURIComponent(product.id)}`;

function productStructuredData(product) {
    const prices = productPrices(product);
    const offer = { url: productUrl(product), priceCurrency: 'BRL', availability: 'https://schema.org/InStock', seller: { '@type': 'Organization', name: business.name } };
    return {
        '@context': 'https://schema.org',
        '@type': 'Product',
        name: product.name,
        description: product.description || product.name,
        image: [productImageUrl(product)],
        url: productUrl(product),
        brand: { '@type': 'Brand', name: 'Graphène' },
        ...(prices.length === 1 ? { offers: { '@type': 'Offer', price: prices[0].toFixed(2), ...offer } } : {}),
        ...(prices.length > 1 ? { offers: { '@type': 'AggregateOffer', lowPrice: Math.min(...prices).toFixed(2), highPrice: Math.max(...prices).toFixed(2), offerCount: prices.length, ...offer } } : {}),
    };
}

function productBody(product) {
    const prices = productPrices(product);
    const sizes = (Array.isArray(product.options?.sizes) ? product.options.sizes : []).filter(size => size?.label && Number(size.price) > 0);
    const priceLine = !prices.length ? 'Consulte o valor' : `${prices.length > 1 ? 'A partir de ' : ''}${money.format(Math.min(...prices))}`;
    const details = (title, text) => (text ? `<section><h2>${title}</h2><p style="white-space:pre-line">${escapeHtml(text)}</p></section>` : '');
    return pageFrame([
        `<h1>${escapeHtml(product.name)}</h1>`,
        `<p><img src="${escapeHtml(resolveProductImage(product))}" alt="${escapeHtml(product.name)}" width="220" height="220" /></p>`,
        product.description ? `<p>${escapeHtml(product.description)}</p>` : '',
        `<p><strong>${priceLine}</strong></p>`,
        sizes.length > 1 ? `<ul>${sizes.map(size => `<li>${escapeHtml(size.label)}: ${money.format(Number(size.price))}</li>`).join('')}</ul>` : '',
        details('Composição', product.composition),
        details('Advertências', product.warnings),
        '<p>Preparado no nosso laboratório em Cabo Frio, com farmacêutico responsável.</p>',
        paymentAndDelivery,
    ].join(''));
}

export function renderProductPage(shell, product) {
    const name = String(product.name || 'Produto Graphène').trim();
    const description = String(product.description || '').replace(/\s+/g, ' ').trim().slice(0, 300) || `Consulte apresentação, informações e preço de ${name} na Graphène, em Cabo Frio.`;
    return renderPage(shell, {
        title: `${name} | Graphène Manipulações em Cabo Frio`,
        description,
        canonical: productUrl(product),
        image: productImageUrl(product),
        structuredData: [{ id: 'graphene-product-schema', data: productStructuredData(product) }],
        body: productBody(product),
    });
}

export function renderUnavailableProduct(shell) {
    return renderPage(shell, {
        title: 'Produto indisponível | Graphène',
        description: 'Este produto não está disponível no site da Graphène. Veja os demais produtos da loja.',
        robots: 'noindex, follow',
        body: pageFrame('<h1>Este produto não está disponível no site.</h1><p><a href="/#produtos">Ver os produtos da loja</a></p>'),
    });
}
