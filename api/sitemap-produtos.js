// /sitemap-produtos.xml: endereços dos produtos que estão no site.
import { renderProductSitemap } from '../src/seo/productFeed.js';
import { readProducts } from './_catalog.js';

export default {
    async fetch() {
        try {
            const products = await readProducts('select=id&order=display_order.asc.nullslast');
            return new Response(renderProductSitemap(products), { headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400' } });
        } catch (error) {
            console.error('product_sitemap_failed', error.message);
            return new Response('Catálogo indisponível no momento.', { status: 503, headers: { 'Retry-After': '3600', 'Cache-Control': 'no-store' } });
        }
    },
};
