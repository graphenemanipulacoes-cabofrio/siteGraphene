import { supabase } from './supabaseClient';
import { money } from '../utils/commerce';

export const normalizeCoupon = value => String(value || '').toUpperCase().slice(0, 40);
const sessionMessage = 'Entre na sua conta novamente para usar seu cupom.';

async function requestCoupon(body, userId, signal) {
    try {
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        let session = sessionData?.session;
        if (sessionError || !userId || session?.user?.id !== userId || !session.access_token) throw new Error(sessionMessage);
        if (session.expires_at && session.expires_at * 1000 - Date.now() < 60_000) {
            const refreshed = await supabase.auth.refreshSession();
            session = refreshed.data?.session;
            if (refreshed.error || session?.user?.id !== userId || !session?.access_token) throw new Error(sessionMessage);
        }
        const { data, error } = await supabase.functions.invoke('customer-coupons', {
            body, signal, timeout: 12000, headers: { Authorization: `Bearer ${session.access_token}` },
        });
        let payload = data;
        if (error?.context?.clone) {
            try { payload = await error.context.clone().json(); } catch { /* Only friendly messages below. */ }
        }
        if (error || payload?.error) {
            if (payload?.error === 'authentication_required') throw new Error(sessionMessage);
            if (payload?.error === 'invalid_coupon') throw new Error('Cupom não disponível. Confira o código ou escolha uma das sugestões.');
            if (payload?.error === 'coupon_minimum_not_reached') throw new Error(`Este cupom vale para produtos a partir de ${money(payload.minimumOrderAmount)}. Adicione mais produtos ou remova o cupom para continuar.`);
            throw new Error('Não foi possível consultar o cupom. Tente novamente.');
        }
        return payload;
    } catch (error) {
        if (signal?.aborted) throw error;
        throw new Error(error?.message === sessionMessage || /^(Cupom não|Este cupom|Não foi possível consultar)/.test(error?.message || '')
            ? error.message : 'Não foi possível consultar o cupom. Verifique sua conexão e tente novamente.');
    }
}

export async function searchCoupons(query, userId, signal) {
    const normalized = normalizeCoupon(query).trim();
    if (normalized.length < 3) return [];
    const data = await requestCoupon({ action: 'search', query: normalized }, userId, signal);
    return Array.isArray(data?.coupons) ? data.coupons : [];
}

export async function validateCoupon(code, subtotal, userId, signal) {
    const data = await requestCoupon({ action: 'validate', query: normalizeCoupon(code).trim(), subtotal }, userId, signal);
    if (!data?.coupon?.code || !Number.isFinite(data.coupon.discountAmount)) throw new Error('Não foi possível consultar o cupom. Tente novamente.');
    return data.coupon;
}
