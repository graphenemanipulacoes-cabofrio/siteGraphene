// Serve dist/ com os cabeçalhos e as rotas do vercel.json, para testar a CSP antes de publicar.
// Uso: npm run build && node scripts/serve-dist.mjs [porta]
import { createReadStream, existsSync, readFileSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize } from 'node:path';

const root = join(process.cwd(), 'dist');
const port = Number(process.argv[2]) || 5180;
const { headers, rewrites } = JSON.parse(readFileSync('vercel.json', 'utf8'));
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.txt': 'text/plain', '.xml': 'text/xml' };
// upgrade-insecure-requests faria o navegador pedir os arquivos locais por https.
const localCsp = value => value.replace(/;\s*upgrade-insecure-requests/, '');

const resolvePath = pathname => {
  for (const { source, destination } of rewrites) {
    const pattern = new RegExp(`^${source.replace(/:[a-z]+/g, '[^/]+')}$`);
    if (pattern.test(pathname)) return destination;
  }
  return pathname === '/' ? '/index.html' : pathname;
};

createServer((req, res) => {
  const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  const file = join(root, normalize(resolvePath(pathname)).replace(/^(\.\.[/\\])+/, ''));
  for (const { key, value } of headers[0].headers) res.setHeader(key, key === 'Content-Security-Policy' ? localCsp(value) : value);
  if (!file.startsWith(root) || !existsSync(file) || !statSync(file).isFile()) { res.statusCode = 404; res.end('not found'); return; }
  res.setHeader('Content-Type', types[extname(file)] || 'application/octet-stream');
  createReadStream(file).pipe(res);
}).listen(port, () => console.log(`dist em http://localhost:${port}`));
