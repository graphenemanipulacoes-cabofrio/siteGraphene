import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { supabase } from '../lib/supabaseClient';
import { orderPaymentStatus } from '../lib/checkoutApi';
import { createPaymentPoller } from '../utils/paymentPoller';

const WARNING = 'Não conseguimos atualizar a situação do pagamento agora. Vamos tentar de novo em instantes.';

// Acompanha o pedido enquanto o cliente paga o Pix (ou enquanto o pagamento é registrado).
// O ritmo fica em utils/paymentPoller.js (testado com relógio falso): lê o pedido pela RLS a cada 4 s nos
// 2 primeiros minutos e depois a cada 10 s, até 2 min depois do prazo; pausa com a aba escondida, consulta
// na hora quando a aba volta e, a cada 30 s, pede ao servidor para conferir no Mercado Pago.
// O resultado da conferência e o "parou de consultar" valem só para o Pix (prazo) que está sendo acompanhado.
export function useOrderPaymentStatus(orderId, { active = true, expiresAt = null, expectedUserId } = {}) {
    const session = active && orderId ? `${orderId}|${expiresAt || ''}` : '';
    const [state, setState] = useState({ paymentStatus: null, status: null, payment: null, paymentSession: '', stoppedSession: '', warning: '', checking: false });
    const failures = useRef(0);
    const poller = useRef(null);

    const failed = useCallback(() => {
        failures.current += 1;
        // Um aviso só por sequência de falhas, para não encher a tela de mensagens.
        if (failures.current === 1) toast.error(WARNING);
        setState(current => ({ ...current, warning: WARNING }));
    }, []);

    const readOrder = useCallback(async () => {
        try {
            const { data, error } = await supabase.from('orders').select('payment_status,status').eq('id', orderId).maybeSingle();
            if (error || !data) { failed(); return; }
            failures.current = 0;
            setState(current => ({ ...current, paymentStatus: data.payment_status, status: data.status, warning: '' }));
        } catch {
            failed();
        }
    }, [orderId, failed]);

    const refreshFromProvider = useCallback(async key => {
        try {
            const result = await orderPaymentStatus(orderId, { refresh: true, expectedUserId });
            failures.current = 0;
            setState(current => ({ ...current, paymentStatus: result.order.paymentStatus, status: result.order.status, payment: result.payment, paymentSession: key, warning: '' }));
        } catch {
            failed();
        }
    }, [orderId, expectedUserId, failed]);

    useEffect(() => {
        if (!session) return undefined;
        const current = createPaymentPoller({
            expiresAt,
            readOrder,
            refresh: () => refreshFromProvider(session),
            onStop: () => setState(previous => previous.stoppedSession === session ? previous : { ...previous, stoppedSession: session }),
        });
        poller.current = current;
        return () => {
            current.stop();
            if (poller.current === current) poller.current = null;
        };
    }, [session, expiresAt, readOrder, refreshFromProvider]);

    // "Já paguei": confere no Mercado Pago na hora.
    const checkNow = useCallback(async () => {
        setState(current => ({ ...current, checking: true }));
        if (poller.current) await poller.current.refreshNow();
        else await refreshFromProvider(session);
        setState(current => ({ ...current, checking: false }));
    }, [refreshFromProvider, session]);

    return {
        paymentStatus: state.paymentStatus,
        status: state.status,
        payment: session && state.paymentSession === session ? state.payment : null,
        stopped: Boolean(session) && state.stoppedSession === session,
        warning: session ? state.warning : '',
        checking: state.checking,
        checkNow,
    };
}
