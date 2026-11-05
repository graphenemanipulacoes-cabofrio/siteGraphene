// Páginas de produto, feed e mapa de produtos com catálogo fictício. Rode depois de npm run build.
// Nenhum pedido sai para o banco real: fetch é simulado.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

process.env.VITE_SUPABASE_URL = 'https://projeto-teste.supabase.co';
process.env.VITE_SUPABASE_ANON_KEY = 'chave-publica-de-teste';

const shell = readFileSync('dist/product.html', 'utf8');
assert.ok(shell.includes('50.380.346/0001-30'), 'a base da página já traz o CNPJ');

const catalog = {
    15: { id: 15, name: 'Creatina de teste', description: 'Descrição fictícia.', price: 59.9, image_url: '/assets/products/creatina.png', options: { sizes: [{ id: '200-g', label: '200 g', price: 59.9 }, { id: '400-g', label: '400 g', price: 99.9 }] }, composition: 'Composição fictícia', warnings: 'Advertência fictícia' },
    16: { id: 16, name: 'Goma R$ & <teste>', description: '<img src=x onerror=alert(1)> R$ 10', price: 30, image_url: 'https://projeto-teste.supabase.co/storage/v1/object/public/receitas/products/a.png', options: {} },
    17: { id: 17, name: 'Nome </script><script>alert(1)</script>', description: '', price: 12, image_url: null, options: {} },
    18: { id: 18, name: 'Sem preço', description: 'Item fictício.', price: 0, image_url: null, options: {} },
};
const requests = [];
let catalogDown = false;
globalThis.fetch = async (input, init) => {
    const url = String(input);
    requests.push({ url, apikey: init?.headers?.apikey });
    if (url.endsWith('/product.html')) return new Response(shell);
    if (catalogDown) return new Response('{}', { status: 500 });
    const id = url.match(/id=eq\.(\d+)/)?.[1];
    if (id) return Response.json(catalog[id] ? [catalog[id]] : []);
    return Response.json(Object.values(catalog));
};

const { default: productPage } = await import('../api/produto.js');
const { default: feed } = await import('../api/feed.js');
const { default: sitemap } = await import('../api/sitemap-produtos.js');
const open = id => productPage.fetch(new Request(`https://www.graphenemanipulacoes.com.br/api/produto?id=${encodeURIComponent(id)}`));

// Produto à venda: dados no HTML, sem depender de JavaScript.
const page = await open(15);
const html = await page.text();
assert.equal(page.status, 200);
assert.match(page.headers.get('cache-control'), /s-maxage=300/);
for (const expected of ['<title>Creatina de teste | Graphène Manipulações em Cabo Frio</title>', 'Descrição fictícia.', 'A partir de', '59,90', '400 g', 'Composição fictícia', 'Advertência fictícia', '50.380.346/0001-30', '5064856', 'rel="canonical" href="https://www.graphenemanipulacoes.com.br/produto/15"', 'id="graphene-product-schema"', '"@type":"AggregateOffer"', '"lowPrice":"59.90"', '"highPrice":"99.90"', 'content="index, follow']) {
    assert.ok(html.includes(expected), `produto sem: ${expected}`);
}
assert.ok(html.includes('type="module"'), 'o site continua carregando por cima desse conteúdo');
assert.equal((html.match(/<title>/g) || []).length, 1);
assert.equal((html.match(/rel="canonical"/g) || []).length, 1);
assert.equal((html.match(/name="twitter:title"/g) || []).length, 1);
assert.equal(requests.find(item => item.url.includes('/rest/v1/')).apikey, 'chave-publica-de-teste');

// Texto do cadastro nunca vira código na página.
const unsafe = await (await open(16)).text();
assert.ok(!unsafe.includes('<img src=x'));
assert.ok(unsafe.includes('&lt;img src=x'));
assert.ok(unsafe.includes('Goma R$ &amp; &lt;teste&gt;'));
const scriptName = await (await open(17)).text();
assert.ok(!scriptName.includes('<script>alert(1)'));
assert.ok(!/"name":"Nome <\/script>/.test(scriptName));
assert.ok(scriptName.includes('Nome \\u003c/script>'));
assert.ok((await (await open(18)).text()).includes('Consulte o valor'));

// Produto fora do site ou inexistente: 404 de verdade, sem o nome do produto.
const missing = await open(999);
const missingHtml = await missing.text();
assert.equal(missing.status, 404);
assert.ok(missingHtml.includes('noindex'));
assert.ok(missingHtml.includes('não está disponível'));
assert.ok(!missingHtml.includes('rel="canonical"'));
assert.ok(!missingHtml.includes('graphene-product-schema'));
const before = requests.length;
assert.equal((await open("1' or 1=1")).status, 404);
assert.equal(requests.length, before, 'endereço inválido não consulta o banco');

// Banco fora do ar: a página comum continua abrindo e nada fica guardado em cache.
catalogDown = true;
const fallback = await open(15);
assert.equal(fallback.status, 200);
assert.equal(fallback.headers.get('cache-control'), 'no-store');
assert.ok((await fallback.text()).includes('50.380.346/0001-30'));
assert.equal((await feed.fetch()).status, 503);
assert.equal((await sitemap.fetch()).status, 503);
catalogDown = false;

// Feed do Google: só produto com preço, menor preço, texto escapado e endereços completos.
const feedResponse = await feed.fetch();
const feedXml = await feedResponse.text();
assert.equal(feedResponse.status, 200);
assert.match(feedResponse.headers.get('content-type'), /application\/xml/);
assert.equal((feedXml.match(/<item>/g) || []).length, 3);
assert.ok(!feedXml.includes('Sem preço'));
assert.ok(feedXml.includes('<g:price>59.90 BRL</g:price>'));
assert.ok(feedXml.includes('<g:image_link>https://www.graphenemanipulacoes.com.br/assets/products/creatina.png</g:image_link>'));
assert.ok(feedXml.includes('<link>https://www.graphenemanipulacoes.com.br/produto/15</link>'));
assert.ok(feedXml.includes('Goma R$ &amp; &lt;teste&gt;'));
assert.ok(!feedXml.includes('<img'));

const map = await (await sitemap.fetch()).text();
assert.equal((map.match(/<loc>/g) || []).length, 4);
assert.ok(map.includes('<loc>https://www.graphenemanipulacoes.com.br/produto/18</loc>'));

console.log('Product page checks passed: data in the HTML, escaped text, real 404 for unavailable products, safe fallback when the catalog fails, Merchant feed and product sitemap. Synthetic catalog only.');
