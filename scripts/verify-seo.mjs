import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { getBusinessStructuredData } from '../src/seo/businessSchema.js';
import { pageMetadata, privatePaths, SITE_URL } from '../src/seo/config.js';

// Run after npm run build: node scripts/verify-seo.mjs
for (const pathname of ['/', '/sobre']) {
    const schema = getBusinessStructuredData(pathname);
    const pharmacy = schema['@graph'].find(item => item['@type'] === 'Pharmacy');
    assert.equal(pharmacy.legalName, 'MEDEIROS CORDEIRO FARMACIA LTDA');
    assert.equal(pharmacy.taxID, '50.380.346/0001-30');
    assert.equal(pharmacy.openingHoursSpecification[0].closes, '18:30');
    assert.equal(pharmacy.openingHoursSpecification[1].closes, '13:00');
    assert.equal(pharmacy.aggregateRating, undefined);
    assert.equal(pharmacy.hasCertification, undefined);
    const filename = pathname === '/' ? 'index' : pathname.slice(1);
    const html = readFileSync(`dist/${filename}.html`, 'utf8');
    const scripts = [...html.matchAll(/<script id="graphene-pharmacy-schema" type="application\/ld\+json">(.*?)<\/script>/gs)];
    assert.equal(scripts.length, 1, `${pathname}: one structured data block`);
    assert.deepEqual(JSON.parse(scripts[0][1]), schema);
    assert.ok(html.includes(`href="${SITE_URL}${pathname}"`));
}

for (const pathname of privatePaths) assert.equal(getBusinessStructuredData(pathname), null);
for (const filename of ['private', 'product']) {
    assert.ok(!readFileSync(`dist/${filename}.html`, 'utf8').includes('graphene-pharmacy-schema'));
}
assert.ok(readFileSync('dist/private.html', 'utf8').includes('noindex, nofollow'));

const { rewrites } = JSON.parse(readFileSync('vercel.json', 'utf8'));
const sitemap = readFileSync('public/sitemap.xml', 'utf8');
assert.equal(readFileSync('dist/sitemap.xml', 'utf8'), sitemap, 'deployed sitemap matches source');
for (const pathname of Object.keys(pageMetadata)) {
    assert.ok(sitemap.includes(`<loc>${SITE_URL}${pathname}</loc>`), `${pathname}: included in sitemap`);
    if (pathname === '/') continue;
    const rewrite = rewrites.find(item => item.source === pathname);
    assert.ok(rewrite, `${pathname}: deployment route exists`);
    assert.ok(existsSync(`dist${rewrite.destination}`), `${pathname}: deployment file exists`);
}
console.log('SEO checks passed: identity, confirmed hours, JSON-LD, canonical URLs, sitemap, deployment routes and private-page isolation.');
