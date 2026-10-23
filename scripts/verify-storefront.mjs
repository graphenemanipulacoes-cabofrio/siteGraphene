// Render-only regression checks. Synthetic catalog; no requests or purchases.
import assert from 'node:assert/strict';
import { createServer } from 'vite';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';

const products = Array.from({ length: 10 }, (_, index) => ({
    id: String(index + 100), name: index === 0 ? 'Melatonina de teste' : `Creatina de teste ${index}`,
    description: 'Descrição fictícia para verificar a apresentação.', price: '49,90', rawPrice: 49.9,
    image_url: '/assets/products/creatina.png', options: {},
}));
products.push(...Array.from({ length: 7 }, (_, index) => ({
    id: String(index + 200), name: `Produto de consulta ${index}`, description: 'Item fictício sem venda online.',
    price: null, rawPrice: 0, image_url: '/assets/products/creatina.png',
    options: index === 0 ? { sizes: [{ id: '60-capsulas', label: '60 cápsulas', price: 79.9 }] } : {},
})));
let initialGoal = 'todos';
const server = await createServer({
    configLoader: 'native', server: { middlewareMode: true },
    cacheDir: 'node_modules/.vite-storefront-test', optimizeDeps: { noDiscovery: true, include: [] },
    plugins: [{ name: 'isolated-storefront-test', enforce: 'pre', transform(code, id) {
        if (!id.replaceAll('\\', '/').split('?')[0].endsWith('/src/components/ProductGrid.jsx')) return;
        return {
            code: code.replace('useState(defaultProducts)', `useState(${JSON.stringify(products)})`)
                .replace("useState('todos')", `useState('${initialGoal}')`), map: null,
        };
    } }],
});
try {
    let { default: ProductGrid } = await server.ssrLoadModule('/src/components/ProductGrid.jsx');
    const render = searchTerm => renderToStaticMarkup(createElement(MemoryRouter, null, createElement(ProductGrid, { searchTerm })));
    const all = render('');
    assert.equal((all.match(/aria-pressed=/g) || []).length, 6);
    assert.equal((all.match(/aria-pressed="true"/g) || []).length, 1);
    assert.equal((all.match(/<article/g) || []).length, 17);
    assert.ok(!all.includes('Ver todos os 10 produtos'));
    assert.ok(all.includes('id="vt-products-rail"'));
    assert.ok(!all.includes('id="vt-soon-rail"'));
    assert.ok(!/em breve/i.test(all));
    assert.ok(all.includes('aria-label="Ver produto Produto de consulta 1"'));
    assert.ok(all.includes('aria-label="Comprar Produto de consulta 0"'));
    assert.ok(all.includes('href="/produto/201"'));
    assert.ok(all.includes('Consulte o valor'));
    assert.ok(!all.includes('R$ null'));
    assert.ok(all.includes('aria-label="Comprar Melatonina de teste"'));
    assert.ok(all.includes('href="/produto/100"'));
    assert.ok(all.includes('href="/receita"'));
    assert.ok(!all.includes('O que você procura?'));
    assert.ok(!all.includes('vt-goal-icon'));
    const search = render('Melatonina');
    assert.equal((search.match(/<article/g) || []).length, 1);
    assert.ok(search.includes('1 resultado'));
    const unpricedSearch = render('consulta');
    assert.equal((unpricedSearch.match(/<article/g) || []).length, 7);
    assert.ok(unpricedSearch.includes('aria-label="Ver produto Produto de consulta 6"'));
    const empty = render('não existe');
    assert.equal((empty.match(/<article/g) || []).length, 0);
    assert.ok(empty.includes('Nenhum produto encontrado'));
    initialGoal = 'sono';
    server.moduleGraph.invalidateAll();
    ({ default: ProductGrid } = await server.ssrLoadModule('/src/components/ProductGrid.jsx'));
    const category = render('');
    assert.equal((category.match(/<article/g) || []).length, 1);
    assert.ok(category.includes('Melatonina de teste'));
    assert.ok(!category.includes('Creatina de teste'));
    assert.ok(!category.includes('vt-products-rail'));
    initialGoal = 'treino';
    server.moduleGraph.invalidateAll();
    ({ default: ProductGrid } = await server.ssrLoadModule('/src/components/ProductGrid.jsx'));
    const training = render('');
    assert.equal((training.match(/<article/g) || []).length, 8);
    assert.ok(training.includes('Ver todos os 9 produtos'));
    assert.ok(!training.includes('vt-products-rail'));
    assert.equal((render('Creatina').match(/<article/g) || []).length, 9);
    initialGoal = 'saude';
    server.moduleGraph.invalidateAll();
    ({ default: ProductGrid } = await server.ssrLoadModule('/src/components/ProductGrid.jsx'));
    const consultation = render('');
    assert.equal((consultation.match(/<article/g) || []).length, 7);
    assert.ok(!consultation.includes('vt-products-rail'));
    assert.ok(!/R\$\s*(?:null|undefined|NaN|0,00)/.test(all));
    console.log('Storefront render checks passed: all 17 products in one horizontal catalog, no coming-soon labels, unpriced products in their categories, priced variants, safe missing-price display, unchanged category grids, search, purchase buttons and product links. No real catalog data changed.');
} finally {
    await server.close();
}
