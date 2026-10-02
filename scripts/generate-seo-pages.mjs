import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pageMetadata, privatePaths, productMetadata, SITE_URL } from '../src/seo/config.js';
import { getBusinessStructuredData } from '../src/seo/businessSchema.js';

const dist = resolve('dist');
const shell = readFileSync(resolve(dist, 'index.html'), 'utf8');

function escapeHtml(value) {
  return String(value).replace(/[&"<>]/g, character => ({
    '&': '&amp;', '"': '&quot;', '<': '&lt;', '>': '&gt;'
  })[character]);
}

function replaceRequired(html, pattern, replacement) {
  if (!pattern.test(html)) throw new Error(`SEO tag not found in built HTML: ${pattern}`);
  return html.replace(pattern, replacement);
}

function renderShell({ title, description, canonical, pathname, robots = 'index, follow, max-image-preview:large' }) {
  let html = shell;
  html = replaceRequired(html, /<title>[^<]*<\/title>/i, `<title>${escapeHtml(title)}</title>`);
  html = replaceRequired(html, /<meta name="description"[^>]*>/i,
    `<meta name="description" content="${escapeHtml(description)}" />`);
  html = replaceRequired(html, /<meta name="robots"[^>]*>/i,
    `<meta name="robots" content="${escapeHtml(robots)}" />`);
  html = replaceRequired(html, /<link rel="canonical"[^>]*>/i,
    canonical ? `<link rel="canonical" href="${escapeHtml(canonical)}" />` : '');
  html = replaceRequired(html, /<meta property="og:title"[^>]*>/i,
    `<meta property="og:title" content="${escapeHtml(title)}" />`);
  html = replaceRequired(html, /<meta property="og:description"[^>]*>/i,
    `<meta property="og:description" content="${escapeHtml(description)}" />`);
  html = replaceRequired(html, /<meta property="og:url"[^>]*>/i,
    canonical ? `<meta property="og:url" content="${escapeHtml(canonical)}" />` : '');
  const structuredData = getBusinessStructuredData(pathname);
  const jsonLd = structuredData ? `  <script id="graphene-pharmacy-schema" type="application/ld+json">${JSON.stringify(structuredData).replace(/</g, '\\u003c')}</script>\n` : '';
  return html.replace('</head>',
    `  <meta name="twitter:title" content="${escapeHtml(title)}" />\n` +
    `  <meta name="twitter:description" content="${escapeHtml(description)}" />\n` +
    jsonLd + '</head>');
}

writeFileSync(resolve(dist, 'index.html'), renderShell({
  ...pageMetadata['/'], pathname: '/', canonical: `${SITE_URL}/`
}));

for (const [path, metadata] of Object.entries(pageMetadata)) {
  if (path === '/') continue;
  writeFileSync(resolve(dist, `${path.slice(1)}.html`), renderShell({
    ...metadata,
    pathname: path,
    canonical: `${SITE_URL}${path}`
  }));
}

writeFileSync(resolve(dist, 'private.html'), renderShell({
  title: 'Área de acesso | Graphène',
  description: 'Acesse sua área na Graphène.',
  robots: 'noindex, nofollow'
}));

writeFileSync(resolve(dist, 'product.html'), renderShell(productMetadata));

console.log(`Generated ${Object.keys(pageMetadata).length - 1} public SEO pages, ${privatePaths.length} private routes and a product shell.`);
