// /feed.xml: produtos para o Google Merchant Center, sempre com os dados atuais.
import { renderProductFeed } from '../src/seo/productFeed.js';
import { readProducts } from './_catalog.js';

export default {
    async fetch() {
        try {
            const products = await readProducts('select=*&order=display_order.asc.nullslast');
            return new Response(renderProductFeed(products), { headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'public, max-age=0, s-maxage=900, stale-while-revalidate=3600' } });
        } catch (error) {
            console.error('product_feed_failed', error.message);
            return new Response('Catálogo indisponível no momento.', { status: 503, headers: { 'Retry-After': '3600', 'Cache-Control': 'no-store' } });
        }
    },
};
