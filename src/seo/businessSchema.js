import { business } from '../data/business.js';
import { SITE_URL, DEFAULT_IMAGE } from './config.js';

export function getBusinessStructuredData(pathname) {
    if (pathname !== '/' && pathname !== '/sobre') return null;

    const pharmacyId = `${SITE_URL}/#pharmacy`;
    const pharmacy = {
        '@type': 'Pharmacy',
        '@id': pharmacyId,
        name: business.name,
        legalName: business.legalName,
        taxID: business.cnpj,
        url: `${SITE_URL}/`,
        image: DEFAULT_IMAGE,
        logo: `${SITE_URL}/assets/logo.png`,
        telephone: business.telephone,
        address: {
            '@type': 'PostalAddress',
            streetAddress: business.address.street,
            addressLocality: business.address.city,
            addressRegion: business.address.region,
            addressCountry: business.address.country,
        },
        openingHoursSpecification: business.hours.specifications.map(hours => ({
            '@type': 'OpeningHoursSpecification', ...hours,
        })),
        sameAs: [business.instagram],
    };

    const graph = [pharmacy];
    if (pathname === '/sobre') {
        graph.push({
            '@type': 'AboutPage',
            '@id': `${SITE_URL}/sobre#webpage`,
            url: `${SITE_URL}/sobre`,
            name: 'Sobre a Graphène',
            inLanguage: 'pt-BR',
            mainEntity: { '@id': pharmacyId },
            breadcrumb: { '@id': `${SITE_URL}/sobre#breadcrumb` },
        }, {
            '@type': 'BreadcrumbList',
            '@id': `${SITE_URL}/sobre#breadcrumb`,
            itemListElement: [
                { '@type': 'ListItem', position: 1, name: 'Início', item: `${SITE_URL}/` },
                { '@type': 'ListItem', position: 2, name: 'Sobre a Graphène', item: `${SITE_URL}/sobre` },
            ],
        });
    }
    // Regulatory document numbers are displayed with their dates on the site,
    // not represented as currently verified certifications or product approvals.
    return { '@context': 'https://schema.org', '@graph': graph };
}
