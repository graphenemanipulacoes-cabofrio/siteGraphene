// Objetivos usados para organizar a vitrine e o "Veja também".
// A classificação é feita pelo nome do produto. Os nomes evitam prometer resultado.
export const GOALS = [
    { id: 'treino', label: 'Treino e força' },
    { id: 'sono', label: 'Bem-estar' },
    { id: 'pele', label: 'Pele e beleza' },
    { id: 'saude', label: 'Vitaminas e suplementos' },
];

const normalize = text => String(text || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

export function goalOf(product) {
    const name = normalize(product?.name);
    const has = (...words) => words.some(word => name.includes(word));
    if (has('creatina', 'whey', 'glutamina', 'cafeina', 'arnica')) return 'treino';
    if (has('melatonina', 'ashwagandha', 'sono', 'passiflora', 'teanina', 'triptofano', 'treonato')) return 'sono';
    if (!has('tipo ii') && has('colageno', 'biotina', 'niacinamida', 'minoxidil', 'azelaico', 'dexpantenol', 'ureia')) return 'pele';
    return 'saude';
}

export const goalLabel = id => GOALS.find(goal => goal.id === id)?.label || '';
