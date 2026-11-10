// Slides extras do banner do topo. O primeiro slide (marca) fica no próprio HeroBanner.
// Cenário gerado por IA com as fotos reais dos frascos por cima (rótulos certos); por isso o
// texto alternativo diz "Ilustração". As imagens ficam em public/assets/hero.
// Texto sem promessa de resultado: o slide mostra produto e serviço, não efeito.
export const HERO_SLIDES = [
    {
        id: 'treino', image: 'hero-treino', to: '/produtos?categoria=treino', action: 'Ver treino e força',
        alt: 'Ilustração: creatina, whey e glutamina da Graphène sobre uma pedra, num estúdio de treino escuro',
        eyebrow: 'Treino e força', title: 'Creatina, whey', accent: 'e glutamina.',
        text: 'Para a sua rotina de treino, com atendimento farmacêutico e entrega para todo o Brasil.',
    },
    {
        id: 'pele', image: 'hero-pele', to: '/produtos?categoria=pele', action: 'Ver pele e beleza',
        alt: 'Ilustração: colágeno Verisol, goma de colágeno e biotina da Graphène sobre uma base de vidro, com reflexos de água',
        eyebrow: 'Pele e beleza', title: 'Colágeno e biotina', accent: 'na sua rotina.',
        text: 'Escolha com orientação da nossa equipe farmacêutica e receba em casa.',
    },
    {
        id: 'vitaminas', image: 'hero-vitaminas', to: '/produtos?categoria=saude', action: 'Ver vitaminas',
        alt: 'Ilustração: vitamina D3, ômega 3 e magnésio da Graphène sobre uma base de pedra, com luz do amanhecer',
        eyebrow: 'Vitaminas e suplementos', title: 'Vitamina D, ômega 3', accent: 'e magnésio.',
        text: 'Para o dia a dia, com frete calculado pelo CEP antes de pagar.',
    },
];

// Tempo de cada slide na troca automática.
export const HERO_INTERVAL_MS = 6500;
