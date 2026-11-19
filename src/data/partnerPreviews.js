// Amostras da área de uma parceira, para mostrar a ela antes do cadastro real pela página de parceiros.
// Cada amostra tem um endereço próprio (ex.: /dracarolinefrota, rota em App.jsx) e fica fora do Google
// (privatePaths em src/seo/config.js e vercel.json). Nada daqui vai para o banco: cupom, desconto e
// comissão só existem depois do cadastro e da aprovação. A página não vende: o botão de compra fica bloqueado.
export const PARTNER_PREVIEWS = {
    dracarolinefrota: {
        name: 'Dra. Caroline Frota',
        firstName: 'Caroline',
        handle: 'dracarolfrota',
        intro: 'Se a parceria for aprovada, esta área mostra o cupom exclusivo dela e as indicações escolhidas por ela, com atendimento farmacêutico e entrega para todo o Brasil.',
        photo: '/assets/parceiras/dracarolinefrota/perfil.jpg',
        background: '/assets/parceiras/dracarolinefrota/fundo.webp',
        indicationsTitle: 'Fórmula capilar',
        products: [
            {
                id: 77,
                name: 'Hair Fiber Complex',
                category: 'Fórmula capilar',
                detail: 'Pote com 60 cápsulas.',
                image: '/assets/products/hair-fiber-complex.webp',
                imageAlt: 'Pote do Hair Fiber Complex, fórmula capilar da Graphène',
            },
        ],
    },
};
