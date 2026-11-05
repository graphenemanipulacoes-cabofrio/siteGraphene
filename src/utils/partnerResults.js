// Textos e contas de tela do resultado das parcerias. A conta real fica no servidor.
export const PARTNER_STATUS_LABELS = {
    no_terms: 'Sem regras definidas',
    scheduled: 'Começa em breve',
    learning: 'Período de aprendizado',
    on_track: 'No caminho',
    attention: 'Em atenção',
    review: 'Revisão da parceria',
    commission_only: 'Só comissão',
    ended: 'Encerrada',
};

export const SUGGESTION_LABELS = {
    renew: 'Sugestão: renovar a parceria',
    half_vale: 'Sugestão: mais 30 dias com o vale pela metade',
    commission_only: 'Sugestão: encerrar o vale e manter só a comissão',
    talk: 'Sugestão: conversar e ajustar o conteúdo',
};

// Venda mínima para o vale se pagar, arredondada para cima de R$ 10 em R$ 10.
export function suggestedMinimum(vale, settings, rate) {
    if (!(vale > 0)) return 0;
    if (!(rate > 0)) return null;
    const cost = vale * (settings.defaultCostPercent + settings.packagingPercent) / 100;
    return Math.ceil(cost / rate / 10) * 10;
}
