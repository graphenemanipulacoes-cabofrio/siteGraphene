// Confere o texto que o visitante vê nas páginas públicas. Rode depois de npm run build
// (node scripts/verify-ads-ready.mjs). Sem pedidos ao banco e sem compras.
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { createServer } from 'vite';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { PRESCRIPTION_PAGES_ENABLED } from '../src/data/publicChannels.js';
import { LEGAL_NOTICE } from '../src/data/storeTexts.js';
import { pageMetadata } from '../src/seo/config.js';

// Termos que a política do Google ou a Anvisa costumam barrar em página de destino.
const forbidden = /prescri[cç]|prescritor|receita|medicamento|tarja|emagrec|queima cal|medidas abdominais|ins[oô]nia|libido|anti-inflamat|colesterol|rugas|cicatriza|para tratar|tratamento (?:de|para) (?!dados)|\bcura\b/i;
const textOf = markup => markup.replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<style[\s\S]*?<\/style>/g, ' ').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
// Com as páginas de receita no ar (decisão de 10/11/2026: divulgação por influenciadoras e
// Meta, sem Google), os termos não são conferidos. A identificação da empresa é sempre.
const adsMode = !PRESCRIPTION_PAGES_ENABLED;
// O aviso legal do rodapé cita receita de propósito: é o aviso exigido, não uma promoção.
const clean = (label, text) => {
    if (!adsMode) return;
    const rest = text.replaceAll(LEGAL_NOTICE, ' ');
    assert.ok(!forbidden.test(rest), `${label}: termo barrado em "${rest.match(forbidden)?.[0]}"`);
};

// Páginas geradas: título e descrição de cada uma.
for (const file of readdirSync('dist').filter(name => name.endsWith('.html'))) {
    const html = readFileSync(`dist/${file}`, 'utf8');
    clean(file, [html.match(/<title>([^<]*)/)?.[1], html.match(/name="description" content="([^"]*)/)?.[1]].join(' '));
    if (file === 'private.html') continue;
    // O conteúdo já vem no HTML, sem depender de JavaScript, e identifica a empresa.
    const body = textOf(html.slice(html.indexOf('<body')));
    clean(`${file} (conteúdo)`, body);
    assert.ok(body.split(' ').length >= 80, `${file}: pouco texto no HTML (${body.split(' ').length} palavras)`);
    for (const identity of ['50.380.346/0001-30', 'MEDEIROS CORDEIRO FARMACIA LTDA', 'CRF-RJ', '5064856', LEGAL_NOTICE]) assert.ok(body.includes(identity), `${file}: sem ${identity}`);
}
for (const [path, metadata] of Object.entries(pageMetadata)) clean(`metadados de ${path}`, `${metadata.title} ${metadata.description}`);

// A lista reserva de produtos saiu do código e não volta.
assert.ok(!readFileSync('src/components/ProductGrid.jsx', 'utf8').includes('defaultProducts'));

const server = await createServer({
    configLoader: 'native', server: { middlewareMode: true },
    cacheDir: 'node_modules/.vite-ads-test', optimizeDeps: { noDiscovery: true, include: [] },
});
try {
    const load = async (path, name = 'default') => (await server.ssrLoadModule(path))[name];
    const render = async (label, path, name) => {
        const Component = await load(path, name);
        const text = textOf(renderToStaticMarkup(createElement(MemoryRouter, null, createElement(Component))));
        clean(label, text);
        return text;
    };
    assert.ok((await render('banner', '/src/components/HomeHero.jsx')).includes(adsMode ? 'Falar no WhatsApp' : 'Enviar receita'));
    await render('barra de benefícios', '/src/components/BenefitsBar.jsx');
    const footer = await render('rodapé', '/src/components/Footer.jsx');
    assert.equal(footer.includes('Solicitar Orçamento'), !adsMode, 'o rodapé segue a chave das páginas de receita');
    // A empresa continua identificada: CNPJ, registro no CRF-RJ e AFE ficam à vista (o responsável técnico entra quando houver CRF).
    for (const identity of ['50.380.346/0001-30', 'CRF-RJ', 'AFE', 'farmácia de manipulação']) assert.ok(footer.includes(identity), `rodapé sem ${identity}`);
    const goals = await server.ssrLoadModule('/src/utils/productGoals.js');
    clean('categorias da vitrine', goals.GOALS.map(goal => goal.label).join(' '));

    // Páginas com texto próprio: conferidas no código, porque usam o cabeçalho da conta.
    for (const file of ['src/pages/LaboratorioPage.jsx', 'src/pages/PartnerProgramPage.jsx', 'src/pages/InstitutionalPages.jsx', 'src/components/BenefitsBar.jsx']) {
        const source = readFileSync(file, 'utf8').replace(/<style>[\s\S]*?<\/style>/g, '').replace(/^\s*(import|\/\/).*$/gm, '');
        clean(file, source.replace(/institutionalStyles[\s\S]*$/, ''));
    }
    console.log(adsMode
        ? 'Ads checks passed: fixed public text, page metadata and categories have no blocked terms; prescription pages off; company identity still visible.'
        : 'Public page checks passed: prescription pages on, so the site is NOT prepared for Google Ads and blocked terms were not checked; company identity visible in every page.');
} finally {
    await server.close();
}
