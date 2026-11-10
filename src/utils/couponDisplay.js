// Textos e links do cupom na vitrine e no painel da parceira. Sem acesso ao banco.
import { SITE_URL } from '../seo/config.js';
import { money } from './commerce.js';

const percent = value => `${Number(value).toLocaleString('pt-BR', { maximumFractionDigits: 2 })}%`;

// O servidor devolve o primeiro nome como foi cadastrado, muitas vezes em maiúsculas.
export function partnerFirstName(name) {
    const first = String(name || '').trim().split(/\s+/)[0] || '';
    return first ? first.charAt(0).toLocaleUpperCase('pt-BR') + first.slice(1).toLocaleLowerCase('pt-BR') : '';
}

// Resumo do desconto. O valor final é sempre confirmado no fechamento do pedido.
export function couponSummary(coupon) {
    if (!coupon) return '';
    const minimum = Number(coupon.minimumOrderAmount) > 0 ? ` em compras a partir de ${money(coupon.minimumOrderAmount)}` : '';
    if (coupon.discountType !== 'percentage') return `${money(coupon.discountValue)} de desconto no total da compra${minimum}.`;
    const special = (coupon.productRates || []).length > 0 ? ' Alguns produtos têm desconto próprio.' : '';
    return `${percent(coupon.discountValue)} de desconto nos produtos${minimum}.${special}`;
}

const cleanCode = code => String(code || '').trim().replace(/[^A-Za-z0-9_-]/g, '');

// Link geral da parceira: abre a loja com o cupom aplicado e a seleção dela.
export const partnerLink = code => `${SITE_URL}/cupom/${cleanCode(code).toLowerCase()}`;
// Link de um produto: abre a página do produto já com o desconto.
export const partnerProductLink = (code, productId) => `${SITE_URL}/produto/${encodeURIComponent(productId)}?cupom=${cleanCode(code).toUpperCase()}`;
