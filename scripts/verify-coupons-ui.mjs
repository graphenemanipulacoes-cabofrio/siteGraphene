// Render-only UI regression checks. No customer session, requests or purchases.
import assert from 'node:assert/strict';
import { createServer } from 'vite';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';

let focused = false;
let search = null;
const coupon = { code: 'SYNTHETIC15', partnerName: 'PARCEIRO', discountType: 'percentage', discountValue: 15, discountAmount: 15, minimumOrderAmount: 0 };
let selection = { userId: 'synthetic', code: coupon.code, draft: coupon.code, coupon, checking: false, error: '' };
const store = { cart: [{ key: 'fixture', id: '1', name: 'Produto sintético', quantity: 1, price: 100 }], subtotal: 100, itemCount: 1, cartReady: true, authReady: true, zip: '', customer: { id: 'synthetic', email: 'synthetic@example.invalid' } };
const order = { id: 'fixture-order-12345678', customer_email: 'synthetic@example.invalid', discount_code: coupon.code, discount_amount: 15, subtotal: 100, total: 85, payment_status: 'paid', created_at: '2026-10-23T12:00:00Z', commission_recipients: { name: 'Parceiro sintético' } };
const finance = { orders: [order], recipients: [], coupons: [], commissions: [], paymentEvents: [], mercadoPagoConfigured: false };
const server = await createServer({
    configLoader: 'native', server: { middlewareMode: true }, cacheDir: 'node_modules/.vite-coupons-test', optimizeDeps: { noDiscovery: true, include: [] },
    plugins: [{ name: 'isolated-coupon-ui', enforce: 'pre', transform(code, id) {
        const path = id.replaceAll('\\', '/').split('?')[0];
        if (path.endsWith('/src/context/StoreContext.jsx')) return { code: `export const useStore=()=>(${JSON.stringify(store)});`, map: null };
        if (path.endsWith('/src/context/CouponContext.jsx')) return { code: `export const useCoupon=()=>({...${JSON.stringify(selection)}, apply(){}, remove(){}, edit(){}});`, map: null };
        if (path.endsWith('/src/components/StoreLayout.jsx')) return { code: 'export default function Layout({children}){return children}', map: null };
        if (path.endsWith('/src/components/CouponPanel.jsx')) return { code: code.replace('useState(false)', `useState(${focused})`).replace('useState(null)', `useState(${JSON.stringify(search)})`), map: null };
        if (path.endsWith('/src/components/AdminFinance.jsx')) return { code: code.replace('useState(true)', 'useState(false)').replace("useState('overview')", "useState('transactions')").replace('useState({ orders: [], recipients: [], coupons: [], commissions: [], paymentEvents: [], mercadoPagoConfigured: false })', `useState(${JSON.stringify(finance)})`), map: null };
    } }],
});
const render = async path => {
    const Component = (await server.ssrLoadModule(path)).default;
    return renderToStaticMarkup(createElement(MemoryRouter, null, createElement(Component)));
};
try {
    const cart = await render('/src/pages/CartPage.jsx');
    assert.ok(cart.indexOf('Tem cupom de um parceiro?') < cart.indexOf('Produto sintético'));
    assert.ok(cart.includes('SYNTHETIC15 aplicado')); assert.ok(cart.includes('85,00')); assert.ok(!cart.includes('<details class="purchase-coupon"'));
    const checkout = await render('/src/pages/CheckoutPage.jsx');
    assert.ok(checkout.indexOf('Tem cupom de um parceiro?') < checkout.indexOf('Endereço de entrega'));
    assert.ok(checkout.includes('aria-autocomplete="list"')); assert.ok(checkout.includes('autoCapitalize="characters"')); assert.ok(checkout.includes('Cupom SYNTHETIC15'));
    const admin = await render('/src/components/AdminFinance.jsx');
    for (const text of ['Vendas e cupons', 'Buscar cupom, parceiro, cliente ou pedido', 'Exportar seleção CSV', 'Apenas pedidos com cupom', 'SYNTHETIC15', 'Parceiro sintético', '300 mais recentes']) assert.ok(admin.includes(text), text);
    focused = true; selection = { ...selection, code: '', draft: 'SYN', coupon: null }; search = { query: 'SYN', items: [coupon] }; server.moduleGraph.invalidateAll();
    const suggestions = await render('/src/components/CouponPanel.jsx');
    assert.ok(suggestions.includes('role="listbox"')); assert.ok(suggestions.includes('role="option"')); assert.ok(suggestions.includes('aria-expanded="true"')); assert.ok(suggestions.includes('PARCEIRO')); assert.ok(suggestions.includes('15% de desconto'));
    selection.draft = 'SY'; server.moduleGraph.invalidateAll();
    const short = await render('/src/components/CouponPanel.jsx');
    assert.ok(!short.includes('role="listbox"')); assert.ok(short.includes('aria-expanded="false"'));
    selection = { ...selection, code: 'SYNTHETIC15', draft: 'SYNTHETIC15', error: 'Cupom não disponível.' }; focused = false; server.moduleGraph.invalidateAll();
    const invalid = await render('/src/components/CouponPanel.jsx'); assert.ok(invalid.includes('role="alert"')); assert.ok(!invalid.includes('SYNTHETIC15 aplicado'));
    console.log('Coupon UI render checks passed: prominent cart/checkout placement, uppercase hints, visible applied discount, accessible suggestions at 3 characters, no fake success, partner attribution and finance filters/export.');
} finally { await server.close(); }
