// Copia um texto pela área de transferência do navegador e, se ela falhar (alguns navegadores
// de app não liberam), pela cópia do campo selecionado (fallback). Devolve 'copied' ou 'manual'
// ('manual' = a pessoa copia tocando e segurando no código).
export async function copyText(text, { clipboard = globalThis.navigator?.clipboard, fallback, timeout = 2_000 } = {}) {
    if (typeof clipboard?.writeText === 'function') {
        let timer;
        try {
            // Alguns WebViews nunca respondem: depois do prazo, tenta o outro caminho.
            await Promise.race([
                clipboard.writeText(String(text ?? '')),
                new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('clipboard_timeout')), timeout); }),
            ]);
            return 'copied';
        } catch { /* Sem permissão ou sem resposta. */ } finally {
            clearTimeout(timer);
        }
    }
    try {
        if (fallback?.() === true) return 'copied';
    } catch { /* Sem cópia automática. */ }
    return 'manual';
}
