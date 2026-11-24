// App do painel admin no celular: manifesto, ícones, service worker e cartão de instalação.
// Uso: node scripts/verify-admin-app.mjs
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createServer } from 'vite';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

const manifest = JSON.parse(readFileSync('public/admin.webmanifest', 'utf8'));
const pngSize = path => {
    const data = readFileSync(`public${path}`);
    assert.equal(data.toString('ascii', 1, 4), 'PNG', `${path} precisa ser PNG`);
    return `${data.readUInt32BE(16)}x${data.readUInt32BE(20)}`;
};

// Manifesto: campos que o Chrome e o Safari pedem para instalar em tela cheia.
assert.equal(manifest.name, 'Graphène Admin');
assert.ok(manifest.short_name);
assert.equal(manifest.start_url, '/admin');
assert.ok(manifest.start_url.startsWith(manifest.scope), 'start_url precisa estar dentro do scope');
assert.equal(manifest.display, 'standalone');
for (const icon of manifest.icons) assert.equal(pngSize(icon.src), icon.sizes, `tamanho de ${icon.src}`);
assert.ok(manifest.icons.some(icon => icon.sizes === '192x192' && icon.purpose === 'any'));
assert.ok(manifest.icons.some(icon => icon.sizes === '512x512' && icon.purpose === 'any'));
assert.ok(manifest.icons.some(icon => icon.purpose === 'maskable'));
assert.equal(pngSize('/assets/app/admin-180.png'), '180x180');

// CSP: manifesto e service worker vêm do próprio site (default-src e script-src 'self').
const csp = JSON.parse(readFileSync('vercel.json', 'utf8')).headers[0].headers.find(header => header.key === 'Content-Security-Policy').value;
assert.match(csp, /default-src 'self'/);
assert.match(csp, /script-src 'self'/);
assert.doesNotMatch(csp, /manifest-src|worker-src/, 'manifest-src ou worker-src próprios precisam liberar o app');

// Service worker: só navegações, sem cache, registrado com escopo /admin (não controla a loja).
const worker = readFileSync('public/admin-sw.js', 'utf8');
assert.match(worker, /request\.mode !== 'navigate'\) return;/);
assert.doesNotMatch(worker, /caches\./);
const lib = readFileSync('src/lib/adminApp.js', 'utf8');
assert.match(lib, /register\('\/admin-sw\.js', \{ scope: '\/admin' \}\)/);
assert.match(lib, /rel: 'manifest', href: '\/admin\.webmanifest'/);
const adminPage = readFileSync('src/pages/Admin.jsx', 'utf8');
assert.match(adminPage, /useEffect\(\(\) => attachAdminApp\(\), \[\]\)/);
assert.doesNotMatch(readFileSync('index.html', 'utf8'), /rel="manifest"/, 'a loja não deve ter manifesto');

const server = await createServer({
    configLoader: 'native', server: { middlewareMode: true },
    cacheDir: 'node_modules/.vite-admin-app-test', optimizeDeps: { noDiscovery: true, include: [] },
});
try {
    const { installContext } = await server.ssrLoadModule('/src/lib/adminApp.js');
    const UA = {
        iphoneSafari: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1',
        iphoneChrome: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/131.0.6778.73 Mobile/15E148 Safari/604.1',
        iphoneInstagram: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/22B83 Instagram 356.0.0.30.70',
        ipad: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Safari/605.1.15',
        androidChrome: 'Mozilla/5.0 (Linux; Android 14; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36',
        desktop: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    };
    const noMode = () => ({ matches: false });
    const ctx = (userAgent, extra = {}, matchMedia = noMode) => installContext({ userAgent, platform: '', maxTouchPoints: 0, ...extra }, matchMedia);

    assert.deepEqual(ctx(UA.iphoneSafari), { platform: 'ios', embedded: false, iosSafari: true, standalone: false });
    assert.deepEqual(ctx(UA.iphoneChrome), { platform: 'ios', embedded: false, iosSafari: false, standalone: false });
    assert.equal(ctx(UA.iphoneInstagram).embedded, true);
    assert.equal(ctx(UA.ipad, { platform: 'MacIntel', maxTouchPoints: 5 }).platform, 'ios');
    assert.equal(ctx(UA.ipad, { platform: 'MacIntel', maxTouchPoints: 0 }).platform, null, 'Mac comum não é celular');
    assert.deepEqual(ctx(UA.androidChrome), { platform: 'android', embedded: false, iosSafari: false, standalone: false });
    assert.equal(ctx(UA.desktop).platform, null);
    assert.equal(ctx(UA.androidChrome, {}, query => ({ matches: query === '(display-mode: standalone)' })).standalone, true);
    assert.equal(ctx(UA.iphoneSafari, { standalone: true }).standalone, true);

    // Cartão: botão no Android liberado pelo Chrome; passos nos outros casos.
    globalThis.window = { location: { host: 'www.graphenemanipulacoes.com.br' }, addEventListener() {} };
    const { default: AdminAppInstall } = await server.ssrLoadModule('/src/components/AdminAppInstall.jsx');
    const card = (context, canPrompt = false) => renderToStaticMarkup(createElement(AdminAppInstall, { install: { canPrompt, context }, onClose() {}, onInstalled() {} }))
        .replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');

    const androidReady = card(ctx(UA.androidChrome), true);
    assert.match(androidReady, /Instalar app/);
    assert.doesNotMatch(androidReady, /Toque no menu/);
    assert.match(card(ctx(UA.androidChrome)), /Toque no menu do Chrome.*Instalar app ou Adicionar à tela inicial/);
    const iphone = card(ctx(UA.iphoneSafari));
    assert.match(iphone, /Compartilhar na barra do Safari.*Adicionar à Tela de Início/);
    assert.doesNotMatch(iphone, /abra .* no Safari/);
    assert.match(card(ctx(UA.iphoneChrome)), /ao lado do endereço do site.*abra www\.graphenemanipulacoes\.com\.br\/admin no Safari/);
    assert.match(card(ctx(UA.iphoneInstagram)), /não instala apps\. Abra www\.graphenemanipulacoes\.com\.br\/admin no Safari/);
    assert.doesNotMatch(card(ctx(UA.iphoneSafari), true), /Instalar app/, 'iPhone não tem botão de instalar');
} finally {
    delete globalThis.window;
    await server.close();
}

console.log('App do painel admin: manifesto, ícones, service worker e cartão de instalação conferidos.');
