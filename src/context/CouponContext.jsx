/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { normalizeCoupon, validateCoupon } from '../lib/couponsApi';

const CouponContext = createContext(null);
const GUEST = 'guest';
// Dois registros por conta (decisão do dono em 13/11/2026):
// - cupom da visita (sessionStorage): vem do link da parceira ou de quem digitou; vale enquanto a aba
//   estiver aberta, inclusive no login e na volta do pagamento;
// - cupom salvo (localStorage): o último cupom que funcionou. Nas próximas visitas ele NÃO entra sozinho
//   e não mostra indicação na loja; só aparece como sugestão no campo do cupom, para a pessoa escolher usar.
const visitKey = owner => `graphene_coupon_visit:${owner}`;
const savedKey = owner => `graphene_coupon:${owner}`;
const validCode = code => /^[A-Z0-9_-]{3,40}$/.test(code) ? code : '';
function read(storage, key) {
    try { return validCode(window[storage].getItem(key) || ''); } catch { return ''; }
}
function write(storage, key, code) {
    try {
        if (code) window[storage].setItem(key, code);
        else window[storage].removeItem(key);
    } catch { /* Esta visita continua com a escolha em memória. */ }
}
// Link da parceira com ?cupom=CODIGO: o cupom já entra aplicado nesta visita.
function linkCode() {
    try { return validCode(normalizeCoupon(new URLSearchParams(window.location.search).get('cupom') || '').trim()); } catch { return ''; }
}
// O que foi escolhido antes de entrar na conta (cupom da visita e cupom salvo) passa para a conta no login.
function initialState(userId) {
    const owner = userId || GUEST;
    let visit = read('sessionStorage', visitKey(owner));
    let saved = read('localStorage', savedKey(owner));
    if (userId) {
        const guestVisit = read('sessionStorage', visitKey(GUEST));
        if (!visit && guestVisit) { visit = guestVisit; write('sessionStorage', visitKey(owner), visit); }
        if (guestVisit) write('sessionStorage', visitKey(GUEST), '');
        const guestSaved = read('localStorage', savedKey(GUEST));
        if (!saved && guestSaved) { saved = guestSaved; write('localStorage', savedKey(owner), saved); }
        if (guestSaved) write('localStorage', savedKey(GUEST), '');
    }
    const fromLink = linkCode();
    if (fromLink) { visit = fromLink; write('sessionStorage', visitKey(owner), visit); }
    return { visit, saved };
}
const INVALID = /^Este cupom não é válido/;

// Keyed by account in StoreProvider: drafts and async responses never cross users.
// items: [{ productId, amount }] do carrinho; o cupom é validado mesmo com o carrinho vazio.
export function CouponProvider({ userId, items, children }) {
    const owner = userId || GUEST;
    const [initial] = useState(() => initialState(userId));
    const [code, setCode] = useState(initial.visit);
    const [saved, setSaved] = useState(initial.saved);
    const [draft, setDraft] = useState(initial.visit);
    const [validation, setValidation] = useState(null);
    const [retry, setRetry] = useState(0);
    const itemsKey = JSON.stringify(items || []);
    const key = `${code}:${itemsKey}:${retry}`;
    const ready = !code || validation?.key === key;
    const coupon = code && ready ? validation?.coupon : null;
    const error = code && ready ? validation?.error || '' : '';

    useEffect(() => {
        if (!code) return undefined;
        const controller = new AbortController();
        const timer = setTimeout(() => {
            validateCoupon(code, JSON.parse(itemsKey), userId, controller.signal).then(result => {
                if (controller.signal.aborted) return;
                setValidation({ key, coupon: result });
                // Cupom que funcionou fica salvo para sugerir nas próximas compras.
                write('localStorage', savedKey(owner), code);
                setSaved(code);
            }).catch(failure => {
                if (controller.signal.aborted) return;
                setValidation({ key, error: failure.message });
                // Cupom que deixou de valer não continua sendo sugerido (erro de conexão não apaga nada).
                if (INVALID.test(failure.message || '') && read('localStorage', savedKey(owner)) === code) {
                    write('localStorage', savedKey(owner), '');
                    setSaved('');
                }
            });
        }, 150);
        return () => { clearTimeout(timer); controller.abort(); };
    }, [code, itemsKey, userId, key, owner]);

    const apply = useCallback(value => {
        const next = normalizeCoupon(value).trim();
        if (!next) return;
        setValidation(null);
        setRetry(current => current + 1);
        setCode(next);
        setDraft(next);
        write('sessionStorage', visitKey(owner), validCode(next));
    }, [owner]);
    // Tira o cupom desta compra; o cupom salvo continua como sugestão.
    const remove = useCallback(() => {
        setCode(''); setDraft(''); setValidation(null);
        write('sessionStorage', visitKey(owner), '');
    }, [owner]);
    // Esquece o cupom salvo (a sugestão some).
    const forget = useCallback(() => {
        write('localStorage', savedKey(owner), '');
        setSaved('');
    }, [owner]);
    const edit = useCallback(value => {
        const next = normalizeCoupon(value);
        setDraft(next);
        if (next.trim() !== code) {
            setCode(''); setValidation(null);
            write('sessionStorage', visitKey(owner), '');
        }
    }, [code, owner]);
    // Sugestão: o cupom salvo, quando nenhum cupom está aplicado nesta compra.
    const suggestion = !code && saved ? saved : '';
    const value = useMemo(() => ({ userId, code, draft, edit, coupon, error, checking: Boolean(code && !ready), apply, remove, saved: suggestion, forget }),
        [userId, code, draft, edit, coupon, error, ready, apply, remove, suggestion, forget]);
    return <CouponContext.Provider value={value}>{children}</CouponContext.Provider>;
}

export const useCoupon = () => useContext(CouponContext);
