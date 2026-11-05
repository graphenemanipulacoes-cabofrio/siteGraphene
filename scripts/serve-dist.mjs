// Serve dist/ com os cabeçalhos, as rotas e as funções do vercel.json, para testar antes de publicar.
// Uso: npm run build && node scripts/serve-dist.mjs [porta]
import { createReadStream, existsSync, readFileSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize } from 'node:path';
import { pathToFileURL } from 'node:url';

const root = join(process.cwd(), 'dist');
const port = Number(process.argv[2]) || 5180;
try { process.loadEnvFile('.env'); } catch { /* Sem .env, as funções entregam a página comum. */ }
const { headers, rewrites, redirects = [] } = JSON.parse(readFileSync('vercel.json', 'utf8'));
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.txt': 'text/plain', '.xml': 'text/xml' };
// upgrade-insecure-requests faria o navegador pedir os arquivos locais por https.
const localCsp = value => value.replace(/;\s*upgrade-insecure-requests/, '');

const resolvePath = pathname => {
  for (const { source, destination } of rewrites) {
    const names = [];
    const pattern = new RegExp(`^${source.replace(/:([a-z]+)/g, (_, name) => { names.push(name); return '([^/]+)'; })}$`);
    const match = pathname.match(pattern);
    if (match) return names.reduce((path, name, index) => path.replace(`:${name}`, match[index + 1]), destination);
  }
  return pathname === '/' ? '/index.html' : pathname;
};

// Roda a função como a Vercel faria.
async function runFunction(route, res) {
  const url = new URL(route, `http://localhost:${port}`);
  const file = join(process.cwd(), `${url.pathname}.js`);
  if (url.pathname.includes('..') || !existsSync(file)) { res.statusCode = 404; res.end('not found'); return; }
  const { default: handler } = await import(pathToFileURL(file).href);
  const response = await handler.fetch(new Request(url));
  response.headers.forEach((value, key) => res.setHeader(key, value));
  res.statusCode = response.status;
  res.end(Buffer.from(await response.arrayBuffer()));
}

createServer(async (req, res) => {
  const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  const redirect = redirects.find(item => !item.has && item.source === pathname);
  if (redirect) { res.writeHead(redirect.permanent ? 308 : 307, { Location: redirect.destination }); res.end(); return; }
  const route = resolvePath(pathname);
  for (const { key, value } of headers[0].headers) res.setHeader(key, key === 'Content-Security-Policy' ? localCsp(value) : value);
  if (route.startsWith('/api/')) {
    try { await runFunction(route, res); } catch (error) { console.error(error); res.statusCode = 500; res.end('function error'); }
    return;
  }
  const file = join(root, normalize(route).replace(/^(\.\.[/\\])+/, ''));
  if (!file.startsWith(root) || !existsSync(file) || !statSync(file).isFile()) { res.statusCode = 404; res.end('not found'); return; }
  res.setHeader('Content-Type', types[extname(file)] || 'application/octet-stream');
  createReadStream(file).pipe(res);
}).listen(port, () => console.log(`dist em http://localhost:${port}`));
