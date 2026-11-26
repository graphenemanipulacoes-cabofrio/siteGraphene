// Ritmo da consulta enquanto o cliente paga o Pix (ou enquanto o pagamento é registrado).
// Sem React e sem rede: quem chama passa readOrder (leitura do pedido pela RLS) e refresh
// (conferência no Mercado Pago pela process-payment). O relógio e o document podem ser trocados nos testes.
export const POLL_TIMING = Object.freeze({
    fast: 4_000, // nos 2 primeiros minutos
    slow: 10_000, // depois disso
    fastWindow: 120_000,
    refreshEvery: 30_000, // conferência no Mercado Pago (reserva para um aviso perdido)
    afterExpiry: 120_000, // continua até 2 min depois do prazo do Pix
    withoutExpiry: 37 * 60_000,
});

const systemClock = {
    now: () => Date.now(),
    setTimeout: (callback, delay) => globalThis.setTimeout(callback, delay),
    clearTimeout: id => globalThis.clearTimeout(id),
};

// Pausa com a aba escondida e consulta na hora quando ela volta (volta do app do banco).
// Depois do prazo, para de agendar e chama onStop; a volta para a aba ainda faz uma consulta.
export function createPaymentPoller({ expiresAt = null, readOrder, refresh, onStop, clock = systemClock, doc = globalThis.document, timing = POLL_TIMING }) {
    let alive = true;
    let timer = null;
    const startedAt = clock.now();
    let lastRefresh = startedAt;
    const expires = Date.parse(expiresAt || '');
    const deadline = Number.isFinite(expires) ? expires + timing.afterExpiry : startedAt + timing.withoutExpiry;
    const hidden = () => Boolean(doc?.hidden);
    const cancel = () => {
        if (timer !== null) clock.clearTimeout(timer);
        timer = null;
    };
    const refreshNow = async () => {
        lastRefresh = clock.now();
        await refresh();
    };
    const schedule = () => {
        cancel();
        if (!alive) return;
        if (clock.now() > deadline) { onStop?.(); return; }
        if (hidden()) return; // volta pelo visibilitychange
        timer = clock.setTimeout(tick, clock.now() - startedAt < timing.fastWindow ? timing.fast : timing.slow);
    };
    async function tick() {
        timer = null;
        if (!alive || hidden()) return;
        try {
            if (clock.now() - lastRefresh >= timing.refreshEvery) await refreshNow();
            else await readOrder();
        } catch { /* readOrder e refresh já tratam as próprias falhas. */ }
        schedule();
    }
    const onVisibility = () => {
        cancel();
        if (!hidden()) tick();
    };
    doc?.addEventListener?.('visibilitychange', onVisibility);
    schedule();
    return {
        // "Já paguei": confere no Mercado Pago na hora e adia a próxima conferência automática.
        refreshNow,
        stop() {
            alive = false;
            cancel();
            doc?.removeEventListener?.('visibilitychange', onVisibility);
        },
    };
}
