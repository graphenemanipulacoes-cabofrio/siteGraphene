// Render-only regression checks. Synthetic catalog; no requests or purchases.
import assert from 'node:assert/strict';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { createServer } from 'vite';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { PRESCRIPTION_PAGES_ENABLED } from '../src/data/publicChannels.js';

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
            code: code.replace('const [productsList, setProductsList] = useState([])', `const [productsList, setProductsList] = useState(${JSON.stringify(products)})`)
                .replace("useState('todos')", `useState('${initialGoal}')`), map: null,
        };
    } }],
});
try {
    let { default: ProductGrid } = await server.ssrLoadModule('/src/components/ProductGrid.jsx');
    const render = (searchTerm, props = {}, url = '/') => renderToStaticMarkup(createElement(MemoryRouter, { initialEntries: [url] }, createElement(ProductGrid, { searchTerm, ...props })));
    const articles = html => (html.match(/<article/g) || []).length;
    const reload = async goal => {
        initialGoal = goal;
        server.moduleGraph.invalidateAll();
        ({ default: ProductGrid } = await server.ssrLoadModule('/src/components/ProductGrid.jsx'));
    };

    // Tela inicial: os 8 primeiros produtos na faixa e o caminho para a página com todos.
    const all = render('');
    assert.equal((all.match(/aria-pressed=/g) || []).length, 5);
    assert.ok(!all.includes('Emagrecimento'));
    assert.equal((all.match(/aria-pressed="true"/g) || []).length, 1);
    assert.equal(articles(all), 8);
    assert.ok(all.includes('Ver todos os 17 produtos') && all.includes('href="/produtos"'));
    assert.ok(all.includes('Ver todos os produtos'), 'atalho para a página no topo da vitrine');
    assert.ok(all.includes('id="vt-products-rail"'));
    assert.ok(!all.includes('id="vt-soon-rail"'));
    assert.ok(!/em breve/i.test(all));
    assert.ok(all.includes('aria-label="Comprar Melatonina de teste"'));
    assert.ok(all.includes('href="/produto/100"'));
    assert.ok(!all.includes('href="/receita"'), 'na tela inicial, o banner de receita substitui o link do fim da vitrine');
    assert.ok(!all.includes('O que você procura?'));
    assert.ok(!all.includes('vt-goal-icon'));
    assert.ok(!/R\$\s*(?:null|undefined|NaN|0,00)/.test(all));

    // Busca na tela inicial mostra todos os resultados, sem cortar em 8.
    const search = render('Melatonina');
    assert.equal(articles(search), 1);
    assert.ok(search.includes('1 resultado'));
    const unpricedSearch = render('consulta');
    assert.equal(articles(unpricedSearch), 7);
    assert.ok(unpricedSearch.includes('aria-label="Ver produto Produto de consulta 6"'));
    assert.equal(articles(render('Creatina')), 9);
    const empty = render('não existe');
    assert.equal(articles(empty), 0);
    assert.ok(empty.includes('Nenhum produto encontrado'));

    // Página /produtos: todos em grade, com título próprio e a categoria no endereço.
    const page = render('', { variant: 'page' }, '/produtos');
    assert.equal(articles(page), 17);
    assert.ok(page.includes('<h1') && page.includes('Todos os produtos'));
    assert.ok(!page.includes('id="vt-products-rail"') && !page.includes('Ver todos os 17'));
    assert.ok(page.includes('aria-label="Ver produto Produto de consulta 1"'));
    assert.ok(page.includes('aria-label="Comprar Produto de consulta 0"'));
    assert.ok(page.includes('href="/produto/201"'));
    assert.ok(page.includes('Consulte o valor'));
    assert.ok(!/R\$\s*(?:null|undefined|NaN|0,00)/.test(page));
    assert.equal(page.includes('href="/receita"'), PRESCRIPTION_PAGES_ENABLED, 'a chamada para orçamento segue a chave das páginas de receita');
    const pageTraining = render('', { variant: 'page' }, '/produtos?categoria=treino');
    assert.equal(articles(pageTraining), 9, 'categoria do endereço mostra todos os produtos dela');
    assert.ok(pageTraining.includes('aria-pressed="true">Treino e força'));
    assert.equal(articles(render('', { variant: 'page' }, '/produtos?categoria=inexistente')), 17, 'categoria desconhecida mostra todos');
    assert.equal(articles(render('consulta', { variant: 'page' }, '/produtos')), 7);

    // Categorias na tela inicial: até 8, com "Ver todos" só quando há mais.
    await reload('sono');
    const category = render('');
    assert.equal(articles(category), 1);
    assert.ok(category.includes('Melatonina de teste') && !category.includes('Creatina de teste'));
    assert.ok(!category.includes('vt-products-rail') && !category.includes('Ver todos os 1 '));
    await reload('treino');
    const training = render('');
    assert.equal(articles(training), 8);
    assert.ok(training.includes('Ver todos os 9 produtos de treino e força') && training.includes('href="/produtos?categoria=treino"'));
    assert.ok(!training.includes('vt-products-rail'));
    await reload('saude');
    const consultation = render('');
    assert.equal(articles(consultation), 7);
    assert.ok(!consultation.includes('vt-products-rail'));
    // Banners da tela inicial: fotos reais leves, texto no site e a receita só com a chave ligada.
    const { default: HomeBanners } = await server.ssrLoadModule('/src/components/HomeBanners.jsx');
    const { HOME_BANNERS } = await server.ssrLoadModule('/src/data/homeBanners.js');
    const banners = renderToStaticMarkup(createElement(MemoryRouter, null, createElement(HomeBanners)));
    assert.equal(banners.includes('href="/receita"'), PRESCRIPTION_PAGES_ENABLED);
    assert.ok(banners.includes('href="/produtos"') && banners.includes('Da nossa loja em Cabo Frio para todo o Brasil.'));
    for (const banner of HOME_BANNERS) {
        assert.ok(banner.alt.includes('Graphène'), `${banner.id}: texto alternativo descreve a foto`);
        for (const width of [768, 1280]) {
            const file = `public/assets/banners/${banner.image}-${width}.webp`;
            assert.ok(existsSync(file), `${file}: falta a imagem`);
            assert.ok(statSync(file).size < 120 * 1024, `${file}: maior que 120 KB`);
        }
    }
    // Topo da página inicial ("vitrine viva" com cenas do dia a dia): texto fixo com um só h1, alcance nacional,
    // sem produto nem link direto de produto, um ambiente por cena, fotos apresentadas como ilustração e peças leves.
    const { default: HomeHero } = await server.ssrLoadModule('/src/components/HomeHero.jsx');
    const { VITRINE_SCENES } = await server.ssrLoadModule('/src/data/vitrineScenes.js');
    const scenes = VITRINE_SCENES.filter(scene => !scene.prescription || PRESCRIPTION_PAGES_ENABLED);
    const hero = renderToStaticMarkup(createElement(MemoryRouter, null, createElement(HomeHero)));
    assert.equal((hero.match(/<h1/g) || []).length, 1, 'o topo tem um só h1');
    assert.ok(hero.includes('sem sair de casa.') && hero.includes('Entrega em todo o Brasil'), 'título e selo do topo');
    assert.ok(!hero.includes('Cabo Frio'), 'o topo não pode passar a ideia de loja só local');
    assert.ok(!hero.includes('href="/produto/') && !hero.includes('/assets/hero/vitrine/produto-'), 'o topo não mostra nem leva direto a um produto');
    assert.ok(hero.includes('href="/produtos"'), 'o topo leva à loja toda');
    assert.equal((hero.match(/class="hh-bg /g) || []).length, scenes.length, 'um ambiente por cena');
    assert.equal((hero.match(/class="hh-dot"/g) || []).length, scenes.length);
    assert.ok(hero.includes('aria-label="Pausar a troca de imagens"'));
    assert.equal(scenes.some(scene => scene.id === 'receita'), PRESCRIPTION_PAGES_ENABLED, 'a cena da receita segue a chave das páginas de receita');
    for (const scene of scenes) {
        assert.ok(scene.alt.startsWith('Ilustração'), `${scene.id}: foto gerada se apresenta como ilustração`);
        for (const width of [520, 900]) {
            const file = `public/assets/hero/pessoas/${scene.photo}-${width}.webp`;
            assert.ok(existsSync(file) && statSync(file).size < 80 * 1024, `${file}: falta ou maior que 80 KB`);
        }
        for (const piece of [scene.burst, ...scene.particles.map(item => item.src)].filter(Boolean)) {
            const file = `public/assets/hero/vitrine/${piece}.webp`;
            assert.ok(existsSync(file) && statSync(file).size < 110 * 1024, `${file}: falta ou maior que 110 KB`);
        }
    }
    assert.ok(!existsSync('src/components/HeroBanner.jsx'), 'o carrossel antigo saiu do site');
    console.log('Storefront render checks passed: home shows the first 8 products with "Ver todos", /produtos shows all 17 in a grid with the category in the address, unpriced products, priced variants, safe missing-price display, search, purchase buttons and product links. No real catalog data changed.');
} finally {
    await server.close();
}
