// Passos do checkout que não dependem da tela, testados em scripts/verify-payment-ui.mjs.

export const LEAVE_PIX_QUESTION = 'O Pix gerado deixa de valer. Continuar?';
const CANCEL_PIX_FAILED = 'Não conseguimos cancelar o Pix agora. Tente de novo.';

// O pedido guardado não pode mais ser pago (checkout_restart_required): troca a chave e tenta de novo uma vez só.
export async function prepareWithRestart(prepare, { key, renewKey }) {
    try {
        return await prepare(key);
    } catch (failure) {
        if (failure?.code !== 'checkout_restart_required') throw failure;
        return prepare(renewKey());
    }
}

// Sair da revisão com um Pix aberto: pergunta, cancela o Pix e só então segue.
// outcome: 'leave' (pode sair), 'stay' (a pessoa desistiu), 'paid' (o Pix já foi pago) ou 'error'.
export async function leaveOpenPix({ pixOpen, confirm, cancel }) {
    if (!pixOpen) return { outcome: 'leave' };
    if (!confirm(LEAVE_PIX_QUESTION)) return { outcome: 'stay' };
    try {
        await cancel();
        return { outcome: 'leave' };
    } catch (failure) {
        if (failure?.code === 'already_paid') return { outcome: 'paid' };
        return { outcome: 'error', message: failure?.message || CANCEL_PIX_FAILED };
    }
}

// Pedido pago nesta aba sem a confirmação na tela: a tentativa do carrinho ainda está guardada
// (a página de retorno apaga a chave quando dá baixa no carrinho). Pedido pago antes, já confirmado, não conta.
export const paidWithoutConfirmation = (order, attemptKey) => order?.payment_status === 'paid'
    && typeof attemptKey === 'string' && attemptKey.length > 0 && order.checkout_key === attemptKey;
