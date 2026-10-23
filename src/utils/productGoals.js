// Objetivos usados para organizar a vitrine e o "Veja também".
// A classificação é feita pelo nome do produto.
export const GOALS = [
    { id: 'treino', label: 'Treino e força' },
    { id: 'sono', label: 'Sono e calma' },
    { id: 'pele', label: 'Pele e beleza' },
    { id: 'emagrecimento', label: 'Emagrecimento' },
    { id: 'saude', label: 'Saúde e longevidade' },
];

const normalize = text => String(text || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

export function goalOf(product) {
    const name = normalize(product?.name);
    const has = (...words) => words.some(word => name.includes(word));
    if (has('termogenico', 'morosil', 'laranja moro', 'mitburn', 'berberina', 'cromo')) return 'emagrecimento';
    if (has('creatina', 'whey', 'glutamina', 'cafeina', 'arnica')) return 'treino';
    if (has('melatonina', 'ashwagandha', 'sono', 'passiflora', 'teanina', 'triptofano', 'treonato')) return 'sono';
    if (!has('tipo ii') && has('colageno', 'biotina', 'niacinamida', 'minoxidil', 'azelaico', 'dexpantenol', 'ureia')) return 'pele';
    return 'saude';
}

export const goalLabel = id => GOALS.find(goal => goal.id === id)?.label || '';
