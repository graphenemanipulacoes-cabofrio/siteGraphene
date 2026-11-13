// Cupom da visita x cupom salvo (decisão do dono em 13/11/2026). Só renderiza o CouponProvider com
// armazenamento sintético; não consulta cupom, não cria pedido e não usa dados de clientes.
import assert from 'node:assert/strict';
import { createServer } from 'vite';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

const memoryStorage = () => {
    const data = new Map();
    return { getItem: key => data.has(key) ? data.get(key) : null, setItem: (key, value) => data.set(key, String(value)), removeItem: key => data.delete(key), data };
};
const reset = (search = '') => {
    globalThis.window = { localStorage: memoryStorage(), sessionStorage: memoryStorage(), location: { search } };
    return globalThis.window;
};
reset();

const server = await createServer({
    configLoader: 'native', server: { middlewareMode: true }, cacheDir: 'node_modules/.vite-saved-coupon-test', optimizeDeps: { noDiscovery: true, include: [] },
    plugins: [{ name: 'no-coupon-requests', enforce: 'pre', transform(code, id) {
        if (id.replaceAll('\\', '/').split('?')[0].endsWith('/src/lib/couponsApi.js')) {
            return { code: "export const normalizeCoupon = value => String(value || '').toUpperCase().replace(/[^A-Z0-9_-]/g, ''); export const validateCoupon = () => new Promise(() => {});", map: null };
        }
    } }],
});
try {
    const { CouponProvider, useCoupon } = await server.ssrLoadModule('/src/context/CouponContext.jsx');
    const Probe = () => { const state = useCoupon(); return JSON.stringify({ code: state.code, saved: state.saved }); };
    const state = userId => JSON.parse(renderToStaticMarkup(createElement(CouponProvider, { userId, items: [] }, createElement(Probe))).replaceAll('&quot;', '"'));

    // Próxima visita: o cupom salvo não entra sozinho; vira sugestão.
    let win = reset();
    win.localStorage.setItem('graphene_coupon:conta-1', 'SALVO10');
    assert.deepEqual(state('conta-1'), { code: '', saved: 'SALVO10' });

    // Link da parceira (?cupom=): o cupom entra aplicado nesta visita.
    win = reset('?cupom=link5');
    assert.deepEqual(state(undefined), { code: 'LINK5', saved: '' });
    assert.equal(win.sessionStorage.getItem('graphene_coupon_visit:guest'), 'LINK5');

    // Chegou pelo link sem conta e criou a conta para pagar: o cupom da visita passa para a conta.
    win.location.search = '';
    assert.deepEqual(state('conta-2'), { code: 'LINK5', saved: '' });
    assert.equal(win.sessionStorage.getItem('graphene_coupon_visit:conta-2'), 'LINK5');
    assert.equal(win.sessionStorage.getItem('graphene_coupon_visit:guest'), null);

    // Mesma aba (recarregar, voltar do pagamento): o cupom da visita continua aplicado.
    assert.deepEqual(state('conta-2'), { code: 'LINK5', saved: '' });

    // Cupom salvo como visitante passa para a conta no login, ainda como sugestão.
    win = reset();
    win.localStorage.setItem('graphene_coupon:guest', 'GUEST7');
    assert.deepEqual(state('conta-3'), { code: '', saved: 'GUEST7' });
    assert.equal(win.localStorage.getItem('graphene_coupon:guest'), null);

    // Cupons de uma conta não aparecem para outra.
    win = reset();
    win.localStorage.setItem('graphene_coupon:conta-4', 'DELA20');
    assert.deepEqual(state('conta-5'), { code: '', saved: '' });

    console.log('Saved coupon checks passed: next visits only suggest the saved coupon, partner links apply it for the visit, the visit coupon survives login and reload, guest choices move to the account and nothing crosses accounts. Synthetic storage only.');
} finally {
    await server.close();
}
