// Ambientes da "vitrine viva" do topo da página inicial. O texto do topo fica fixo; muda o produto
// em destaque, a cor do ambiente e os elementos que flutuam em volta dele. A vitrine não tem link de
// produto (decisão do dono: convidar a ver a loja toda, não levar direto a um item).
// Peças em public/assets/hero/vitrine (script vitrine_hero.py, pasta banners-site). Os elementos
// (gomas, gotas, cápsulas, pó, creme) foram gerados pela IA isolados; os frascos são os da loja.
// Posições em % da área da imagem; tamanho em % da largura; prof: longe (desfocado, atrás do produto),
// meio (nítido, atrás) ou perto (desfocado, na frente). Só os marcados com cel aparecem no celular.
export const VITRINE_INTERVAL_MS = 6500;

const p = (src, x, y, size, prof, cel = false) => ({ src, x, y, size, prof, cel });

export const VITRINE_SCENES = [
    {
        id: 'treino', label: 'Treino e força', product: 'Creatina Monohidratada', productId: 15, image: 'produto-creatina', ratio: 709 / 760,
        alt: 'Pote de creatina monohidratada da Graphène com pó branco ao fundo',
        burst: 'po',
        particles: [],
    },
    {
        id: 'beleza', label: 'Pele e beleza', product: 'Goma de Colágeno com Vitamina C', productId: 22, image: 'produto-goma-colageno', ratio: 709 / 760,
        alt: 'Pote de goma de colágeno com vitamina C da Graphène cercado de gomas',
        particles: [
            p('goma-2', 15, 22, 11, 'meio', true), p('goma-5', 86, 18, 12, 'meio', true), p('goma-3', 10, 72, 15, 'perto', true), p('goma-4', 88, 70, 14, 'perto', true),
            p('goma-1', 30, 8, 7, 'longe'), p('goma-6', 72, 6, 8, 'longe'), p('goma-7', 95, 44, 8, 'longe'), p('goma-8', 4, 46, 8, 'longe'),
        ],
    },
    {
        id: 'pele', label: 'Cuidados com a pele', product: 'Sérum de Niacinamida 10%', productId: 36, image: 'produto-serum', ratio: 251 / 760,
        alt: 'Frasco de sérum de niacinamida da Graphène com gotas de sérum e creme',
        cream: 'creme',
        particles: [
            p('gota-1', 24, 20, 10, 'meio', true), p('gota-3', 76, 22, 12, 'meio', true), p('gota-2', 82, 62, 9, 'perto', true), p('gota-5', 14, 56, 8, 'longe', true),
            p('gota-4', 62, 8, 7, 'longe'), p('gota-7', 92, 40, 6, 'longe'), p('gota-1', 6, 30, 5, 'longe'),
        ],
    },
    {
        id: 'vitaminas', label: 'Vitaminas', product: 'Vitamina D3 5000 UI', productId: 7, image: 'produto-vitamina-d3', ratio: 398 / 760,
        alt: 'Frasco de vitamina D3 da Graphène cercado de cápsulas',
        particles: [
            p('capsula-2', 18, 20, 12, 'meio', true), p('capsula-5', 82, 18, 12, 'meio', true), p('capsula-7', 12, 70, 14, 'perto', true), p('capsula-4', 86, 68, 12, 'perto', true),
            p('capsula-3', 34, 6, 9, 'longe'), p('capsula-8', 68, 5, 9, 'longe'), p('capsula-1', 95, 42, 6, 'longe'), p('capsula-6', 4, 44, 6, 'longe'),
        ],
    },
];
