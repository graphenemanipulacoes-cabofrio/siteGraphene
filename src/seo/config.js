import { PRESCRIPTION_PAGES_ENABLED } from '../data/publicChannels.js';

export const SITE_URL = 'https://www.graphenemanipulacoes.com.br';
export const DEFAULT_IMAGE = `${SITE_URL}/assets/graphene_banner_top.png`;

const prescriptionPages = {
    '/ativos': {
        title: 'Ativos e matérias-primas | Graphène Cabo Frio',
        description: 'Conheça matérias-primas e ativos apresentados pela Graphène, farmácia de manipulação em Cabo Frio. Consulte a equipe sobre composição e orçamento.'
    },
    '/receita': {
        title: 'Solicite orçamento de fórmula | Graphène',
        description: 'Envie sua prescrição para análise e orçamento pela equipe da Graphène em Cabo Frio. A manipulação depende da avaliação e dos requisitos aplicáveis.'
    },
    '/prescritores': {
        title: 'Atendimento a prescritores | Graphène Cabo Frio',
        description: 'Canal de atendimento da Graphène para profissionais prescritores. Fale com a equipe farmacêutica.'
    },
};

export const pageMetadata = {
    '/': {
        title: 'Graphène Manipulações em Cabo Frio | Atendimento farmacêutico',
        description: 'Suplementos, vitaminas e cuidados com a pele da Graphène, em Cabo Frio, RJ, com atendimento farmacêutico e entrega para todo o Brasil.'
    },
    '/produtos': {
        title: 'Produtos | Graphène Manipulações em Cabo Frio',
        description: 'Todos os produtos da Graphène: suplementos, vitaminas e cuidados com a pele, com atendimento farmacêutico e entrega para todo o Brasil.'
    },
    ...(PRESCRIPTION_PAGES_ENABLED ? prescriptionPages : {}),
    '/laboratorio': {
        title: 'Unidade Graphène em Cabo Frio | Atendimento farmacêutico',
        description: 'Conheça nossa unidade em Cabo Frio, o atendimento farmacêutico e os cuidados na preparação dos produtos.'
    },
    '/avaliacoes': {
        title: 'Graphène no Google Maps | Avaliações e localização',
        description: 'Consulte a localização da Graphène em Cabo Frio e acesse as avaliações diretamente no Google Maps.'
    },
    '/parceiros': {
        title: 'Programa de Parceiros | Graphène',
        description: 'Conheça o programa de parceiros da Graphène e solicite informações sobre participação, cupons e acompanhamento.'
    },
    '/sobre': {
        title: 'Sobre a Graphène | Cabo Frio, RJ',
        description: 'Conheça a Graphène em Cabo Frio: endereço, horários, CNPJ e informações dos registros CRF-RJ e AFE da Anvisa.'
    },
    '/compras': {
        title: 'Compra, pagamento e entrega | Graphène',
        description: 'Veja o fluxo de compra da Graphène, as opções de pagamento no Mercado Pago e como conferir a entrega antes de pagar.'
    },
    '/trocas': {
        title: 'Trocas e devoluções | Graphène',
        description: 'Veja como pedir cancelamento, troca ou devolução de uma compra feita no site da Graphène.'
    },
    '/privacidade': {
        title: 'Privacidade e dados pessoais | Graphène',
        description: 'Entenda como a Graphène utiliza dados de conta, pedidos, atendimento e solicitações enviadas pelo site.'
    }
};

export const privatePaths = [
    '/admin', '/login', '/balcaographene', '/colaboradores', '/farmaceutico', '/entrar', '/minha-conta', '/carrinho', '/checkout',
    '/pedido/retorno', '/redefinir-senha', '/parceiros/entrar',
    '/parceiros/painel', '/parceiros/cadastro', '/qrcode'
];

export const productMetadata = {
    title: 'Produto | Graphène Manipulações em Cabo Frio',
    description: 'Consulte informações, apresentação e preço deste produto da Graphène em Cabo Frio.'
};
