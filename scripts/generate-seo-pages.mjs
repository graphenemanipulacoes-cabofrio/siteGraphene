import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pageMetadata, privatePaths, productMetadata, SITE_URL } from '../src/seo/config.js';
import { getBusinessStructuredData } from '../src/seo/businessSchema.js';
import { pageBody, renderPage } from '../src/seo/staticHtml.js';

const dist = resolve('dist');
const shell = readFileSync(resolve(dist, 'index.html'), 'utf8');

function publicPage(pathname) {
  const structuredData = getBusinessStructuredData(pathname);
  return renderPage(shell, {
    ...pageMetadata[pathname],
    canonical: `${SITE_URL}${pathname}`,
    structuredData: structuredData ? [{ id: 'graphene-pharmacy-schema', data: structuredData }] : [],
    body: pageBody(pathname),
  });
}

writeFileSync(resolve(dist, 'index.html'), publicPage('/'));

for (const path of Object.keys(pageMetadata)) {
  if (path === '/') continue;
  writeFileSync(resolve(dist, `${path.slice(1)}.html`), publicPage(path));
}

writeFileSync(resolve(dist, 'private.html'), renderPage(shell, {
  title: 'Área de acesso | Graphène',
  description: 'Acesse sua área na Graphène.',
  robots: 'noindex, nofollow',
}));

// Base da função api/produto.js, que preenche os dados de cada produto.
writeFileSync(resolve(dist, 'product.html'), renderPage(shell, { ...productMetadata, body: pageBody('/produto') }));

console.log(`Generated ${Object.keys(pageMetadata).length - 1} public SEO pages, ${privatePaths.length} private routes and a product shell.`);
