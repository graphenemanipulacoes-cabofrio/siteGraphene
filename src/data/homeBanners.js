import { PRESCRIPTION_PAGES_ENABLED } from './publicChannels.js';

// Banners da página inicial com fotos reais da loja em Cabo Frio (março de 2024). O da receita mostra
// o print real da página /receita num celular. O texto fica no site, e não na imagem: sai nítido no
// celular e pode mudar sem refazer a foto. As imagens ficam em public/assets/banners.
export const HOME_BANNERS = [
    PRESCRIPTION_PAGES_ENABLED && {
        id: 'receita', to: '/receita', image: 'receita-loja',
        alt: 'Salão da loja da Graphène em Cabo Frio e, em destaque, a tela de envio de receita do site no celular',
        eyebrow: 'Atendimento farmacêutico',
        title: 'Tem receita? Mande uma foto e receba o orçamento.',
        text: 'Envie a foto ou o PDF pelo site. A equipe farmacêutica analisa e entra em contato com você.',
        action: 'Enviar receita',
    },
    {
        id: 'entrega', to: '/produtos', image: 'fachada',
        alt: 'Fachada da loja da Graphène, farmácia de manipulação em Cabo Frio',
        eyebrow: 'Entrega',
        title: 'Da nossa loja em Cabo Frio para todo o Brasil.',
        text: 'Escolha seus produtos e veja o frete pelo CEP antes de pagar.',
        action: 'Ver produtos',
    },
].filter(Boolean);
