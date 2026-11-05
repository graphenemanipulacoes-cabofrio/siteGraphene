// /produto/:id com nome, preço e dados já no HTML. Se o banco falhar, entrega a página comum
// e o site carrega o produto no navegador, como antes. Produto fora do site responde 404 de verdade.
import { SITE_URL } from '../src/seo/config.js';
import { renderProductPage, renderUnavailableProduct } from '../src/seo/staticHtml.js';
import { readProducts } from './_catalog.js';

let cachedShell = null;

async function readShell(origin) {
    if (cachedShell) return cachedShell;
    const response = await fetch(`${origin}/product.html`, { signal: AbortSignal.timeout(4000) });
    if (!response.ok) throw new Error(`shell_status_${response.status}`);
    cachedShell = await response.text();
    return cachedShell;
}

const page = (body, status, cacheControl) => new Response(body, { status, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': cacheControl } });

export default {
    async fetch(request) {
        const url = new URL(request.url, SITE_URL);
        let shell;
        try {
            shell = await readShell(url.origin);
        } catch (error) {
            console.error('product_shell_failed', error.message);
            return Response.redirect(`${url.origin}/`, 302);
        }
        const id = url.searchParams.get('id') || '';
        const missing = () => page(renderUnavailableProduct(shell), 404, 'public, max-age=0, s-maxage=60');
        if (!/^\d{1,18}$/.test(id)) return missing();
        try {
            const [product] = await readProducts(`id=eq.${id}&select=*`);
            if (!product) return missing();
            return page(renderProductPage(shell, product), 200, 'public, max-age=0, s-maxage=300, stale-while-revalidate=3600');
        } catch (error) {
            console.error('product_page_failed', error.message);
            return page(shell, 200, 'no-store');
        }
    },
};
