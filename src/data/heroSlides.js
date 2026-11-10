// Slides extras do banner do topo. O primeiro slide (marca) fica no próprio HeroBanner.
// Cada slide é desenhado no próprio site: cor de fundo, grafismo em SVG e as fotos dos frascos
// (as mesmas da loja) em escala real, sem cenário gerado por IA. As imagens ficam em
// public/assets/hero e saem do script palco_hero.py (pasta banners-site, fora do repositório).
// Texto sem promessa de resultado: o slide mostra produto e serviço, não efeito.
export const HERO_SLIDES = [
    {
        id: 'treino', image: 'palco-treino', motif: 'stripes', to: '/produtos?categoria=treino', action: 'Ver treino e força',
        alt: 'Potes de creatina e L-glutamina e frasco de cafeína da Graphène',
        eyebrow: 'Treino e força', title: 'Creatina, glutamina', accent: 'e cafeína.',
        text: 'Para a sua rotina de treino, com atendimento farmacêutico e entrega para todo o Brasil.',
    },
    {
        id: 'pele', image: 'palco-pele', motif: 'rings', to: '/produtos?categoria=pele', action: 'Ver pele e beleza',
        alt: 'Frasco de biotina, pote de goma de colágeno e sachê de colágeno Verisol da Graphène',
        eyebrow: 'Pele e beleza', title: 'Colágeno e biotina', accent: 'na sua rotina.',
        text: 'Escolha com orientação da nossa equipe farmacêutica e receba em casa.',
    },
    {
        id: 'vitaminas', image: 'palco-vitaminas', motif: 'sun', to: '/produtos?categoria=saude', action: 'Ver vitaminas',
        alt: 'Frascos de ômega 3, vitamina D3 e magnésio da Graphène',
        eyebrow: 'Vitaminas e suplementos', title: 'Vitamina D, ômega 3', accent: 'e magnésio.',
        text: 'Para o dia a dia, com frete calculado pelo CEP antes de pagar.',
    },
];

// Tempo de cada slide na troca automática.
export const HERO_INTERVAL_MS = 6500;
