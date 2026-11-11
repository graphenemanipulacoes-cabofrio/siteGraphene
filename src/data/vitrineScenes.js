// Ambientes da "vitrine viva" do topo da página inicial. O texto do topo fica fixo; ao lado, cada
// ambiente mostra uma cena do dia a dia com uma mensagem (como comprar e receber), a cor do ambiente
// e elementos que flutuam em volta. Sem produto e sem link de produto (decisão do dono: o topo informa;
// os produtos ficam na vitrine logo abaixo).
// As fotos foram geradas pela IA com cara de foto de celular (public/assets/hero/pessoas, script
// fotos_hero.py na pasta banners-site): são ilustrações, sem nome nem depoimento, e o texto alternativo
// começa com "Ilustração". Os elementos (gomas, gotas, cápsulas, pó) ficam em public/assets/hero/vitrine.
// tema: cor do ambiente e jeito de entrar dos elementos (treino = pêssego, beleza = rosé, pele = lilás, vitaminas = sol).
// Posições em % da área da imagem; tamanho em % da largura; prof: longe (desfocado, atrás), meio (nítido,
// atrás) ou perto (desfocado, na frente). Só os marcados com cel aparecem no celular.
export const VITRINE_INTERVAL_MS = 6500;

const p = (src, x, y, size, prof, cel = false) => ({ src, x, y, size, prof, cel });

export const VITRINE_SCENES = [
    {
        id: 'entrega', tema: 'treino', photo: 'entrega', icon: 'truck', tilt: -2,
        caption: 'Chega na sua casa, em todo o Brasil',
        alt: 'Ilustração: mulher recebendo uma encomenda na porta de casa',
        particles: [
            p('goma-2', 15, 24, 10, 'meio', true), p('goma-5', 91, 16, 10, 'meio', true), p('goma-3', 12, 76, 12, 'perto', true), p('goma-4', 92, 74, 11, 'perto', true),
            p('goma-1', 26, 4, 6, 'longe'), p('goma-6', 74, 3, 7, 'longe'), p('goma-7', 97, 46, 7, 'longe'), p('goma-8', 14, 48, 7, 'longe'),
        ],
    },
    {
        id: 'rotina', tema: 'beleza', photo: 'rotina', icon: 'heart', tilt: 2,
        caption: 'Sua rotina de saúde, do seu jeito',
        alt: 'Ilustração: mulher tomando uma cápsula com um copo de água na cozinha',
        particles: [
            p('capsula-2', 15, 26, 11, 'meio', true), p('capsula-5', 91, 18, 11, 'meio', true), p('capsula-7', 12, 74, 12, 'perto', true), p('capsula-4', 92, 72, 11, 'perto', true),
            p('capsula-3', 30, 4, 8, 'longe'), p('capsula-8', 70, 3, 8, 'longe'), p('capsula-1', 97, 44, 6, 'longe'), p('capsula-6', 14, 46, 6, 'longe'),
        ],
    },
    {
        id: 'receita', tema: 'pele', photo: 'receita', icon: 'camera', tilt: -2, prescription: true,
        caption: 'Tem receita? Envie pelo site',
        alt: 'Ilustração: mulher fotografando uma receita com o celular em casa',
        particles: [
            p('gota-1', 15, 28, 9, 'meio', true), p('gota-3', 90, 20, 10, 'meio', true), p('gota-2', 91, 72, 8, 'perto', true), p('gota-5', 14, 70, 8, 'perto', true),
            p('gota-4', 62, 3, 6, 'longe'), p('gota-7', 97, 44, 5, 'longe'), p('gota-1', 30, 4, 5, 'longe'),
        ],
    },
    {
        id: 'celular', tema: 'vitaminas', photo: 'celular', icon: 'phone', tilt: 2, burst: 'po',
        caption: 'Peça pelo celular, de onde estiver',
        alt: 'Ilustração: homem fazendo um pedido pelo celular no sofá de casa',
        particles: [
            p('capsula-5', 15, 24, 9, 'meio', true), p('goma-3', 91, 18, 10, 'meio', true), p('gota-3', 12, 74, 9, 'perto', true), p('capsula-7', 92, 72, 10, 'perto', true),
        ],
    },
];
