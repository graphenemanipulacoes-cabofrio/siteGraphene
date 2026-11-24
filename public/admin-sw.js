// Service worker do app do painel admin. Registrado só pelo /admin, com escopo /admin:
// não controla a loja nem as outras áreas. Não guarda nada em cache; o painel sempre vem da rede.
// O Chrome do Android só oferece o botão "Instalar" quando a página tem um service worker que responde às navegações.
const OFFLINE_PAGE = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Sem conexão | Graphène Admin</title><style>body{margin:0;min-height:100vh;display:grid;place-items:center;padding:24px;box-sizing:border-box;background:#071018;color:#dfe8ee;font:16px/1.6 system-ui,-apple-system,"Segoe UI",sans-serif;text-align:center}h1{font-size:1.3rem;color:#fff;margin:0 0 8px}p{margin:0 0 20px;color:#9fafc1}a{display:inline-block;padding:12px 20px;border-radius:10px;background:#22c7e8;color:#031319;font-weight:700;text-decoration:none}</style></head><body><main><h1>Sem conexão com a internet</h1><p>O painel precisa de internet para mostrar os dados. Confira a conexão e tente de novo.</p><a href="/admin">Tentar de novo</a></main></body></html>`;

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));

self.addEventListener('fetch', event => {
    if (event.request.mode !== 'navigate') return;
    event.respondWith(fetch(event.request).catch(() => new Response(OFFLINE_PAGE, {
        headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' },
    })));
});
