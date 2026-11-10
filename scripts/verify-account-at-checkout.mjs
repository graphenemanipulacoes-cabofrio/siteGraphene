// Criação de conta no caminho da compra. Só desenha a tela: não cria conta nem chama o banco.
// Uso: node scripts/verify-account-at-checkout.mjs
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createServer } from 'vite';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';

const browsers = {
    safari: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1',
    chrome: 'Mozilla/5.0 (Linux; Android 14; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36',
    instagramIos: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 365.0.0.20.103 (iPhone15,3; iOS 18_5; pt_BR)',
    instagramAndroid: 'Mozilla/5.0 (Linux; Android 14; SM-S918B Build/UP1A; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/131.0.0.0 Mobile Safari/537.36 Instagram 365.0.0.20.103 Android',
    facebook: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 [FBAN/FBIOS;FBAV/490.0;FBLC/pt_BR]',
    tiktok: 'Mozilla/5.0 (Linux; Android 14; wv) AppleWebKit/537.36 Chrome/131.0.0.0 Mobile Safari/537.36 musical_ly_2023 BytedanceWebview/d8a21c6',
};
const useBrowser = userAgent => Object.defineProperty(globalThis, 'navigator', { value: { userAgent }, configurable: true });

const server = await createServer({
    configLoader: 'native', server: { middlewareMode: true },
    cacheDir: 'node_modules/.vite-account-test', optimizeDeps: { noDiscovery: true, include: [] },
    plugins: [{ name: 'isolated-account-test', enforce: 'pre', transform(code, id) {
        if (!id.replaceAll('\\', '/').split('?')[0].endsWith('/src/pages/CustomerAccessPage.jsx')) return;
        return {
            code: code.replace("import StoreLayout from '../components/StoreLayout';", 'const StoreLayout = ({ children }) => children;')
                .replace('useStore()', '({ addItem() {}, authReady: true, customer: null })'), map: null,
        };
    } }],
});
try {
    const { isEmbeddedBrowser } = await server.ssrLoadModule('/src/utils/embeddedBrowser.js');
    for (const name of ['safari', 'chrome']) assert.equal(isEmbeddedBrowser(browsers[name]), false, `${name} é navegador normal`);
    for (const name of ['instagramIos', 'instagramAndroid', 'facebook', 'tiktok']) assert.equal(isEmbeddedBrowser(browsers[name]), true, `${name} é navegador embutido`);
    assert.equal(isEmbeddedBrowser(''), false);

    const { default: CustomerAccessPage } = await server.ssrLoadModule('/src/pages/CustomerAccessPage.jsx');
    const render = (state, browser = 'safari') => {
        useBrowser(browsers[browser]);
        return renderToStaticMarkup(createElement(MemoryRouter, { initialEntries: [{ pathname: '/entrar', state }] }, createElement(CustomerAccessPage)));
    };
    const fromCheckout = { intent: 'checkout', returnTo: '/checkout' };
    const count = (html, pattern) => (html.match(pattern) || []).length;
    const position = (html, text) => { assert.ok(html.includes(text), `falta "${text}"`); return html.indexOf(text); };

    // Vindo do carrinho: já abre em "Criar conta", com a senha uma vez só.
    const buying = render(fromCheckout);
    assert.ok(buying.includes('Crie sua conta') && buying.includes('Falta só isso para ir à entrega. Seus produtos continuam no carrinho.'));
    assert.ok(buying.includes('Já tem conta?'), 'quem já tem conta acha o caminho logo no topo');
    assert.ok(buying.includes('Nome completo') && buying.includes('Toque no olho para conferir o que digitou.'));
    assert.equal(count(buying, /autoComplete="new-password"/g), 1, 'a senha é pedida uma vez só');
    assert.ok(!buying.includes('Confirme a senha') && !buying.includes('Ainda não tenho conta'));
    assert.ok(position(buying, 'Continuar com Google') < position(buying, '<form'), 'fora de apps, o Google continua primeiro');

    // Acesso comum, pelo cabeçalho: segue abrindo em "Entrar".
    const plain = render(undefined);
    assert.ok(plain.includes('Entre na sua conta') && plain.includes('Ainda não tenho conta') && plain.includes('Esqueci minha senha'));
    assert.ok(!plain.includes('Nome completo') && !plain.includes('Já tem conta?'));

    // Dentro do Instagram e de apps parecidos: e-mail primeiro, Google abaixo e com aviso.
    for (const name of ['instagramIos', 'instagramAndroid', 'facebook', 'tiktok']) {
        const embedded = render(fromCheckout, name);
        assert.ok(position(embedded, '</form>') < position(embedded, 'Continuar com Google'), `${name}: e-mail antes do Google`);
        assert.ok(embedded.includes('Se o Google não abrir aqui'), `${name}: aviso sobre o Google`);
    }
    assert.ok(!buying.includes('Se o Google não abrir aqui'));

    // O checkout leva direto à conta, guardando o destino, e o cadastro segue passando pelo servidor.
    const checkout = readFileSync('src/pages/CheckoutPage.jsx', 'utf8');
    assert.ok(checkout.includes(`<Navigate to="/entrar" replace state={{ returnTo: '/checkout', intent: 'checkout' }} />`));
    assert.ok(!checkout.includes('Entre para concluir sua compra'));
    assert.match(readFileSync('src/pages/CustomerAccessPage.jsx', 'utf8'), /functions\.invoke\('customer-signup'/);

    console.log('Account at checkout checks passed: opens on sign-up from the cart, password asked once, normal login unchanged, e-mail before Google inside apps and direct redirect from checkout. Nothing sent to the database.');
} finally {
    await server.close();
}
