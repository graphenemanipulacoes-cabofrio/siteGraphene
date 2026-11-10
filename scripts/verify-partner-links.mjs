// Link da parceira, cupom na vitrine e imagens leves. Só dados fictícios; nada vai ao banco.
// Uso: node scripts/verify-partner-links.mjs
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { createServer } from 'vite';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';

const products = [100, 101, 102, 103].map(id => ({
    id: String(id), name: `Produto fictício ${id}`, description: 'Descrição fictícia.', price: '50,00', rawPrice: 50,
    image_url: '/assets/products/creatina.webp', options: {},
}));
const coupon = { code: 'FICTICIO5', partnerName: 'MARIA', discountType: 'percentage', discountValue: 5, minimumOrderAmount: 0, productRates: [{ productId: 103, percent: 12 }], discountAmount: 0 };
let couponState = { code: coupon.code, coupon, checking: false, error: '' };

const server = await createServer({
    configLoader: 'native', server: { middlewareMode: true },
    cacheDir: 'node_modules/.vite-partner-links-test', optimizeDeps: { noDiscovery: true, include: [] },
    plugins: [{ name: 'isolated-coupon-test', enforce: 'pre', transform(code, id) {
        const file = id.replaceAll('\\', '/').split('?')[0];
        if (!/\/src\/components\/(ProductGrid|CouponBar)\.jsx$/.test(file)) return;
        return {
            code: code.replaceAll('useCoupon()', `(${JSON.stringify(couponState)})`)
                .replace('const [productsList, setProductsList] = useState([])', `const [productsList, setProductsList] = useState(${JSON.stringify(products)})`), map: null,
        };
    } }],
});
try {
    const load = async path => server.ssrLoadModule(path);
    const reload = async path => { server.moduleGraph.invalidateAll(); return load(path); };
    const text = markup => markup.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
    const render = (Component, props) => renderToStaticMarkup(createElement(MemoryRouter, null, createElement(Component, props)));

    // Textos e links.
    const display = await load('/src/utils/couponDisplay.js');
    assert.equal(display.partnerFirstName('MARIA DA SILVA'), 'Maria');
    assert.equal(display.partnerFirstName(''), '');
    assert.equal(display.couponSummary(coupon), '5% de desconto nos produtos. Alguns produtos têm desconto próprio.');
    assert.equal(display.couponSummary({ ...coupon, productRates: [], minimumOrderAmount: 100 }).replace(/\s/g, ' '), '5% de desconto nos produtos em compras a partir de R$ 100,00.');
    assert.equal(display.couponSummary({ ...coupon, discountType: 'fixed', discountValue: 10 }).replace(/\s/g, ' '), 'R$ 10,00 de desconto no total da compra.');
    assert.equal(display.partnerLink('FICTICIO5'), 'https://www.graphenemanipulacoes.com.br/cupom/ficticio5');
    assert.equal(display.partnerProductLink('ficticio5', 15), 'https://www.graphenemanipulacoes.com.br/produto/15?cupom=FICTICIO5');
    assert.equal(display.partnerLink('A B/../<x>'), 'https://www.graphenemanipulacoes.com.br/cupom/abx');

    // Vitrine com cupom: preço antigo riscado, preço com desconto e o desconto próprio do produto.
    let { default: ProductGrid } = await load('/src/components/ProductGrid.jsx');
    const withCoupon = text(render(ProductGrid, { searchTerm: '', featured: { ids: ['102', '100', '999'], eyebrow: 'Com o cupom FICTICIO5', title: 'Escolhas de Maria' } })).replace(/ /g, ' ');
    assert.ok(withCoupon.includes('R$ 47,50'), 'preço com 5% de desconto');
    assert.ok(withCoupon.includes('R$ 44,00'), 'desconto próprio de 12% no produto 103');
    assert.ok(withCoupon.includes('Sem o cupom: R$ 50,00'));
    assert.ok(withCoupon.includes('−5% com o cupom') && withCoupon.includes('−12% com o cupom'));
    assert.ok(withCoupon.includes('Escolhas de Maria') && withCoupon.includes('Com o cupom FICTICIO5'));
    const featuredMarkup = render(ProductGrid, { searchTerm: '', featured: { ids: ['102', '100', '999'], eyebrow: 'x', title: 'y' } });
    const featuredBlock = featuredMarkup.slice(featuredMarkup.indexOf('data-part="featured"'), featuredMarkup.indexOf('id="store-products-title"'));
    assert.deepEqual([...featuredBlock.matchAll(/aria-label="Comprar Produto fictício (\d+)"/g)].map(match => match[1]), ['102', '100'], 'destaques na ordem escolhida, sem produto inexistente');
    assert.ok(!render(ProductGrid, { searchTerm: 'fictício', featured: { ids: ['102'], eyebrow: 'x', title: 'y' } }).includes('data-part="featured"'), 'a busca esconde os destaques');
    const { default: CouponBar, CouponLandingIntro } = await load('/src/components/CouponBar.jsx');
    assert.ok(text(render(CouponBar)).includes('Cupom FICTICIO5 aplicado. 5% de desconto nos produtos. Alguns produtos têm desconto próprio. Indicação de Maria.'));
    const intro = text(render(CouponLandingIntro, { code: 'FICTICIO5' }));
    assert.ok(intro.includes('Indicação de Maria.') && intro.includes('Seu desconto já está aplicado.') && intro.includes('Os preços abaixo já aparecem com o desconto.'));
    // A abertura não usa a resposta de um cupom anterior enquanto o do link é conferido.
    assert.ok(text(render(CouponLandingIntro, { code: 'OUTRO10' })).includes('Conferindo o cupom OUTRO10'));

    // Cupom recusado: aviso, sem prometer desconto.
    couponState = { code: 'FICTICIO5', coupon: null, checking: false, error: 'Cupom não encontrado.' };
    const refused = text(render((await reload('/src/components/CouponBar.jsx')).CouponLandingIntro, { code: 'FICTICIO5' }));
    assert.ok(refused.includes('O cupom FICTICIO5 não está disponível.') && !refused.includes('desconto já está aplicado'));

    // Sem cupom: nada muda na vitrine e não há faixa.
    couponState = null;
    ({ default: ProductGrid } = await reload('/src/components/ProductGrid.jsx'));
    const plain = render(ProductGrid, { searchTerm: '' });
    assert.ok(!plain.includes('vt-price-old') && !plain.includes('com o cupom') && !plain.includes('data-part="featured"'));
    assert.ok(text(plain).replace(/ /g, ' ').includes('R$ 50,00'));
    assert.equal(render((await load('/src/components/CouponBar.jsx')).default), '');

    // Imagens leves: toda foto local tem versão WebP pequena; a original segue para compartilhamento.
    const images = await load('/src/utils/productImages.js');
    assert.equal(images.productPhoto({ id: 15, image_url: '' }), '/assets/products/creatina.webp');
    assert.equal(images.resolveProductImage({ id: 15, image_url: '' }), '/assets/products/creatina.png');
    assert.equal(images.lightImage('https://exemplo.invalid/foto.png'), 'https://exemplo.invalid/foto.png');
    const photos = readdirSync('public/assets/products').filter(name => name.endsWith('.png'));
    assert.ok(photos.length >= 40);
    for (const name of photos) {
        const light = `public/assets/products/${name.replace(/\.png$/, '.webp')}`;
        assert.ok(existsSync(light), `${name}: falta a versão leve. Rode python scripts/optimize-images.py`);
        assert.ok(statSync(light).size < 150 * 1024, `${light}: maior que 150 KB`);
    }
    for (const file of ['graphene_banner_top.webp', 'graphene_banner_top-900.webp', 'graphene_pharmacist_lab.webp']) assert.ok(statSync(`public/assets/${file}`).size < 200 * 1024, `${file}: maior que 200 KB`);
    assert.ok(readFileSync('src/components/HeroBanner.jsx', 'utf8').includes('graphene_banner_top-900.webp 900w'));

    // Rota do link e aviso de privacidade sem cobrir a compra.
    const { rewrites } = JSON.parse(readFileSync('vercel.json', 'utf8'));
    assert.ok(rewrites.some(item => item.source === '/cupom/:code' && item.destination === '/index.html'));
    const app = readFileSync('src/App.jsx', 'utf8');
    assert.ok(app.includes('path="/cupom/:code"') && !app.includes('PrivacyNotice'));
    const footer = text(render((await load('/src/components/Footer.jsx')).default));
    assert.ok(footer.includes('Este site usa só o armazenamento necessário para manter seu carrinho e sua sessão.'));
    assert.ok(readFileSync('src/pages/PartnerPortal.jsx', 'utf8').includes('<PartnerLinks code={data.coupon.code} partnerId={profile.id} adminView={adminView} />'));

    console.log('Partner link checks passed: coupon texts and links, discounted prices and featured products in the storefront, landing intro, light images, /cupom route and privacy line in the footer. Synthetic data only.');
} finally {
    await server.close();
}
