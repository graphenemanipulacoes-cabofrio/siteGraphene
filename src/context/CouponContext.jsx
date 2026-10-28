/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { normalizeCoupon, validateCoupon } from '../lib/couponsApi';

const CouponContext = createContext(null);
const storageKey = userId => `graphene_coupon:${userId}`;
function savedCoupon(userId) {
    if (!userId) return '';
    try {
        const code = localStorage.getItem(storageKey(userId)) || '';
        return /^[A-Z0-9_-]{3,40}$/.test(code) ? code : '';
    } catch { return ''; }
}

// Keyed by account in StoreProvider: drafts and async responses never cross users.
export function CouponProvider({ userId, subtotal, children }) {
    const [code, setCode] = useState(() => savedCoupon(userId));
    const [draft, setDraft] = useState(() => savedCoupon(userId));
    const [validation, setValidation] = useState(null);
    const [retry, setRetry] = useState(0);
    const key = `${code}:${subtotal}:${retry}`;
    const ready = !code || validation?.key === key;
    const coupon = code && ready ? validation?.coupon : null;
    const error = code && ready ? validation?.error || '' : '';

    useEffect(() => {
        if (!userId || !code || subtotal <= 0) return undefined;
        const controller = new AbortController();
        validateCoupon(code, subtotal, userId, controller.signal).then(result => {
            if (!controller.signal.aborted) setValidation({ key, coupon: result });
        }).catch(failure => {
            if (!controller.signal.aborted) setValidation({ key, error: failure.message });
        });
        return () => controller.abort();
    }, [code, subtotal, userId, key]);

    const apply = useCallback(value => {
        const next = normalizeCoupon(value).trim();
        if (!userId || !next) return;
        setValidation(null);
        setRetry(value => value + 1);
        setCode(next);
        setDraft(next);
        try { localStorage.setItem(storageKey(userId), next); } catch { /* This visit still retains the selection. */ }
    }, [userId]);
    const remove = useCallback(() => {
        setCode(''); setDraft(''); setValidation(null);
        try { if (userId) localStorage.removeItem(storageKey(userId)); } catch { /* In-memory removal still works. */ }
    }, [userId]);
    const edit = useCallback(value => {
        const next = normalizeCoupon(value);
        setDraft(next);
        if (next.trim() !== code) {
            setCode(''); setValidation(null);
            try { if (userId) localStorage.removeItem(storageKey(userId)); } catch { /* In-memory selection is already removed. */ }
        }
    }, [code, userId]);
    const value = useMemo(() => ({ userId, code, draft, edit, coupon, error, checking: Boolean(code && !ready && subtotal > 0), apply, remove }), [userId, code, draft, edit, coupon, error, ready, subtotal, apply, remove]);
    return <CouponContext.Provider value={value}>{children}</CouponContext.Provider>;
}

export const useCoupon = () => useContext(CouponContext);
