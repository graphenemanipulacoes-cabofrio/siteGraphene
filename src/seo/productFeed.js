// Feed de produtos do Google Merchant Center e mapa do site dos produtos.
// Recebem só o que o público pode ler: produto fora do site não chega aqui.
import { goalLabel, goalOf } from '../utils/productGoals.js';
import { SITE_URL } from './config.js';
import { productImageUrl, productPrices, productUrl } from './staticHtml.js';

const xml = value => String(value ?? '').replace(/\s+/g, ' ').trim().replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[character]);

export function renderProductFeed(products) {
    const items = products.filter(product => productPrices(product).length).map(product => `    <item>
      <g:id>${xml(product.id)}</g:id>
      <title>${xml(product.name)}</title>
      <description>${xml(product.description || product.name)}</description>
      <link>${xml(productUrl(product))}</link>
      <g:image_link>${xml(productImageUrl(product))}</g:image_link>
      <g:availability>in_stock</g:availability>
      <g:price>${Math.min(...productPrices(product)).toFixed(2)} BRL</g:price>
      <g:brand>Graphène</g:brand>
      <g:condition>new</g:condition>
      <g:identifier_exists>no</g:identifier_exists>
      <g:product_type>${xml(goalLabel(goalOf(product)))}</g:product_type>
    </item>`).join('\n');
    return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
  <channel>
    <title>Graphène Manipulações</title>
    <link>${SITE_URL}/</link>
    <description>Produtos da loja Graphène</description>
${items}
  </channel>
</rss>
`;
}

export function renderProductSitemap(products) {
    const urls = products.map(product => `  <url><loc>${xml(productUrl(product))}</loc></url>`).join('\n');
    return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;
}
