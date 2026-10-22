const LEGACY_IMAGE_PATTERNS = [
    '/assets/termogenico.png',
    '/assets/morosil_new.png',
    '/assets/morosil.png',
    '/assets/melatonina_caps.png',
    '/assets/maca_peruana.png',
    '/assets/ashwagandha.png',
    '/assets/creatina.jpg',
    'product_launch_176595',
    'product_1765960256563.png',
    'products/product_1790289847859.jpeg',
];

const PRODUCT_ID_MAP = {
    '1': '/assets/products/melatonina.png',
    '2': '/assets/products/ashwagandha.png',
    '3': '/assets/products/morosil.png',
    '4': '/assets/products/termogenico.png',
    '5': '/assets/products/maca_peruana.png',
    '6': '/assets/products/magnesio_dimalato.png',
    '7': '/assets/products/vitamina_d3.png',
    '8': '/assets/products/curcuma.png',
    '9': '/assets/products/colageno_verisol.png',
    '10': '/assets/products/biotina.png',
    '11': '/assets/products/resveratrol.png',
    '12': '/assets/products/coenzima_q10.png',
    '13': '/assets/products/omega_3.png',
    '14': '/assets/products/zinco_quelado.png',
    '15': '/assets/products/creatina.png',
};

export const isLegacyProductImage = (url = '') => {
    if (!url) return true;
    return LEGACY_IMAGE_PATTERNS.some(pattern => url.includes(pattern));
};

export const resolveProductImage = (product) => {
    if (!product) return '/assets/products/morosil.png';
    const rawUrl = product.image_url || '';

    if (rawUrl && !isLegacyProductImage(rawUrl)) {
        return rawUrl;
    }

    const idKey = String(product.id || '');
    if (PRODUCT_ID_MAP[idKey]) {
        return PRODUCT_ID_MAP[idKey];
    }

    const name = String(product.name || '').toLowerCase();
    if (name.includes('coenzima') || name.includes('q10')) return '/assets/products/coenzima_q10.png';
    if (name.includes('termog')) return '/assets/products/termogenico.png';
    if (name.includes('creatina')) return '/assets/products/creatina.png';
    if (name.includes('verisol') || name.includes('colágeno') || name.includes('colageno')) return '/assets/products/colageno_verisol.png';
    if (name.includes('morosil') || name.includes('laranja moro')) return '/assets/products/morosil.png';
    if (name.includes('melatonina')) return '/assets/products/melatonina.png';
    if (name.includes('maca')) return '/assets/products/maca_peruana.png';
    if (name.includes('vitamina d')) return '/assets/products/vitamina_d3.png';
    if (name.includes('magnésio') || name.includes('magnesio')) return '/assets/products/magnesio_dimalato.png';
    if (name.includes('cúrcuma') || name.includes('curcuma')) return '/assets/products/curcuma.png';
    if (name.includes('biotina')) return '/assets/products/biotina.png';
    if (name.includes('resveratrol')) return '/assets/products/resveratrol.png';
    if (name.includes('zinco')) return '/assets/products/zinco_quelado.png';
    if (name.includes('ômega') || name.includes('omega')) return '/assets/products/omega_3.png';
    if (name.includes('ashwagandha')) return '/assets/products/ashwagandha.png';

    return rawUrl || '/assets/products/coenzima_q10.png';
};
