/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { normalizeCoupon, validateCoupon } from '../lib/couponsApi';

const CouponContext = createContext(null);
const GUEST = 'guest';
const storageKey = owner => `graphene_coupon:${owner}`;
const validCode = code => /^[A-Z0-9_-]{3,40}$/.test(code) ? code : '';
function readSaved(owner) {
    try { return validCode(localStorage.getItem(storageKey(owner)) || ''); } catch { return ''; }
}
function writeSaved(owner, code) {
    try {
        if (code) localStorage.setItem(storageKey(owner), code);
        else localStorage.removeItem(storageKey(owner));
    } catch { /* This visit still retains the selection. */ }
}
// Cupom digitado antes de entrar na conta (ex.: na página do produto)
// passa para a conta no login, uma única vez.
// Link do influencer com ?cupom=CODIGO: o cupom já entra aplicado.
function linkCode() {
    try { return validCode(normalizeCoupon(new URLSearchParams(window.location.search).get('cupom') || '').trim()); } catch { return ''; }
}
function initialCode(userId) {
    const fromLink = linkCode();
    if (fromLink) { writeSaved(userId || GUEST, fromLink); return fromLink; }
    if (!userId) return readSaved(GUEST);
    const own = readSaved(userId);
    if (own) return own;
    const guest = readSaved(GUEST);
    if (guest) { writeSaved(userId, guest); writeSaved(GUEST, ''); }
    return guest;
}

// Keyed by account in StoreProvider: drafts and async responses never cross users.
// items: [{ productId, amount }] do carrinho; o cupom é validado mesmo com o carrinho vazio.
export function CouponProvider({ userId, items, children }) {
    const owner = userId || GUEST;
    const [code, setCode] = useState(() => initialCode(userId));
    const [draft, setDraft] = useState(() => initialCode(userId) || '');
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
                if (!controller.signal.aborted) setValidation({ key, coupon: result });
            }).catch(failure => {
                if (!controller.signal.aborted) setValidation({ key, error: failure.message });
            });
        }, 150);
        return () => { clearTimeout(timer); controller.abort(); };
    }, [code, itemsKey, userId, key]);

    const apply = useCallback(value => {
        const next = normalizeCoupon(value).trim();
        if (!next) return;
        setValidation(null);
        setRetry(current => current + 1);
        setCode(next);
        setDraft(next);
        writeSaved(owner, validCode(next));
    }, [owner]);
    const remove = useCallback(() => {
        setCode(''); setDraft(''); setValidation(null);
        writeSaved(owner, '');
    }, [owner]);
    const edit = useCallback(value => {
        const next = normalizeCoupon(value);
        setDraft(next);
        if (next.trim() !== code) {
            setCode(''); setValidation(null);
            writeSaved(owner, '');
        }
    }, [code, owner]);
    const value = useMemo(() => ({ userId, code, draft, edit, coupon, error, checking: Boolean(code && !ready), apply, remove }), [userId, code, draft, edit, coupon, error, ready, apply, remove]);
    return <CouponContext.Provider value={value}>{children}</CouponContext.Provider>;
}

export const useCoupon = () => useContext(CouponContext);
