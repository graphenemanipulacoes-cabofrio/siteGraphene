import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient.ts';
import { config } from '../config';
import { MessageCircle, ShoppingBag } from 'lucide-react';

const categories = ['Todos', 'Metabolismo & Queima', 'Longevidade & Saúde', 'Performance & Força', 'Sono & Bem-Estar'];

const getProductCategory = (name = '') => {
    const n = name.toLowerCase();
    if (n.includes('termogênico') || n.includes('morosil') || n.includes('mitburn')) return 'Metabolismo & Queima';
    if (n.includes('creatina') || n.includes('whey') || n.includes('zinco')) return 'Performance & Força';
    if (n.includes('melatonina') || n.includes('ashwagandha') || n.includes('sono') || n.includes('foco')) return 'Sono & Bem-Estar';
    return 'Longevidade & Saúde';
};

const defaultProducts = [
    {
        id: '12',
        name: 'Coenzima Q10 100mg',
        category: 'Longevidade & Saúde',
        description: 'Coenzima Q10 100mg. Fundamental para a produção de energia celular e suporte à saúde cardíaca. Ação antioxidante. Contém 60 cápsulas.',
        price: null,
        image_url: 'https://ngphbcrdphluuphctvpr.supabase.co/storage/v1/object/public/receitas/product_launch_1765958041451_rnbuq.jpg'
    },
    {
        id: '4',
        name: 'Composto Termogênico',
        category: 'Metabolismo & Queima',
        description: 'Acelerador metabólico avançado. Mais energia e queima calórica eficiente.',
        price: null,
        image_url: '/assets/termogenico.png'
    },
    {
        id: '15',
        name: 'Creatina Monohidratada 200g',
        category: 'Performance & Força',
        description: 'Creatina Monohidratada 200g. Auxilia no aumento de força e massa muscular. Fórmula pura e sem sabor. Contém 200g (pó).',
        price: null,
        image_url: 'https://ngphbcrdphluuphctvpr.supabase.co/storage/v1/object/public/receitas/product_1765960256563.png'
    },
    {
        id: '9',
        name: 'Colágeno Verisol® 2.5g',
        category: 'Longevidade & Saúde',
        description: 'Colágeno Verisol® 2.5g. Auxilia na manutenção da saúde da pele, contribuindo para a elasticidade e redução de rugas. Contém 30 sachês.',
        price: null,
        image_url: 'https://ngphbcrdphluuphctvpr.supabase.co/storage/v1/object/public/receitas/product_launch_1765957547354_m0p54c.jpg'
    },
    {
        id: '3',
        name: 'Morosil® 500mg',
        category: 'Metabolismo & Queima',
        description: 'Autêntico extrato da laranja moro. Potente na redução de medidas abdominais.',
        price: null,
        image_url: '/assets/morosil_new.png'
    },
    {
        id: '1',
        name: 'Melatonina 5mg',
        category: 'Sono & Bem-Estar',
        description: 'Sono reparador, rápido e combate à insônia. Regula o ritmo biológico natural.',
        price: null,
        image_url: '/assets/melatonina_caps.png'
    },
    {
        id: '5',
        name: 'Maca Peruana',
        category: 'Longevidade & Saúde',
        description: 'Superalimento para vigor físico, libido e equilíbrio hormonal.',
        price: null,
        image_url: '/assets/maca_peruana.png'
    },
    {
        id: '7',
        name: 'Vitamina D3 5000 UI',
        category: 'Longevidade & Saúde',
        description: 'Vitamina D3 5000 UI. Auxilia na formação de ossos e dentes, na absorção de cálcio e fósforo e no funcionamento do sistema imune. Contém 60 cápsulas.',
        price: null,
        image_url: 'https://ngphbcrdphluuphctvpr.supabase.co/storage/v1/object/public/receitas/product_launch_1765957546699_h3wdl.jpg'
    },
    {
        id: '6',
        name: 'Magnésio Dimalato 500mg',
        category: 'Longevidade & Saúde',
        description: 'Magnésio Dimalato 500mg. Auxilia no funcionamento muscular e neuromuscular, metabolismo energético e formação de ossos e dentes. Contém 90 cápsulas.',
        price: null,
        image_url: 'https://ngphbcrdphluuphctvpr.supabase.co/storage/v1/object/public/receitas/product_launch_1765957545725_3lezkg.jpg'
    },
    {
        id: '8',
        name: 'Cúrcuma (Curcumina 95%) 500mg',
        category: 'Longevidade & Saúde',
        description: 'Cúrcuma 500mg (Curcumina 95%). Potente ação antioxidante e anti-inflamatória. Auxilia na proteção das células contra radicais livres. Contém 60 cápsulas.',
        price: null,
        image_url: 'https://ngphbcrdphluuphctvpr.supabase.co/storage/v1/object/public/receitas/product_launch_1765957547049_lcx7rn.jpg'
    },
    {
        id: '10',
        name: 'Biotina 10000mcg',
        category: 'Longevidade & Saúde',
        description: 'Biotina 10000mcg. Vitamina essencial para a manutenção da saúde da pele, cabelos e unhas. Contém 60 cápsulas.',
        price: null,
        image_url: 'https://ngphbcrdphluuphctvpr.supabase.co/storage/v1/object/public/receitas/product_launch_1765958040097_ciols.png'
    },
    {
        id: '11',
        name: 'Resveratrol 250mg',
        category: 'Longevidade & Saúde',
        description: 'Resveratrol 250mg (Trans-Resveratrol). Potente antioxidante que auxilia na saúde cardiovascular e combate o envelhecimento celular. Contém 60 cápsulas.',
        price: null,
        image_url: 'https://ngphbcrdphluuphctvpr.supabase.co/storage/v1/object/public/receitas/product_launch_1765958041072_ujzzek.png'
    },
    {
        id: '14',
        name: 'Zinco Quelado 30mg',
        category: 'Performance & Força',
        description: 'Zinco Quelado 30mg. Mineral essencial para o fortalecimento do sistema imune e processos de cicatrização. Alta biodisponibilidade. Contém 60 cápsulas.',
        price: null,
        image_url: 'https://ngphbcrdphluuphctvpr.supabase.co/storage/v1/object/public/receitas/product_launch_1765958044634_h6sufc.jpg'
    },
    {
        id: '13',
        name: 'Ômega 3 (EPA/DHA) 1000mg',
        category: 'Longevidade & Saúde',
        description: 'Ômega 3 1000mg. Óleo de peixe rico em EPA e DHA. Auxilia na saúde do coração, cérebro e controle dos níveis de colesterol. Contém 90 cápsulas.',
        price: null,
        image_url: 'https://ngphbcrdphluuphctvpr.supabase.co/storage/v1/object/public/receitas/product_launch_1765958041781_trjicn.jpg'
    },
    {
        id: '2',
        name: 'Ashwagandha 300mg',
        category: 'Sono & Bem-Estar',
        description: 'Adaptógeno natural. Reduz estresse, ansiedade e melhora o foco e disposição.',
        price: null,
        image_url: '/assets/ashwagandha.png'
    }
];

const ProductGrid = ({ searchTerm = '' }) => {
    const [activeTab, setActiveTab] = useState('Todos');
    const [productsList, setProductsList] = useState(defaultProducts);

    useEffect(() => {
        const fetchProducts = async () => {
            try {
                const { data, error } = await supabase
                    .from('produtos')
                    .select('*')
                    .order('display_order', { ascending: true, nullsFirst: false })
                    .order('created_at', { ascending: true });

                if (!error && data && data.length > 0) {
                    const formatted = data.map((item, idx) => ({
                        id: String(item.id || idx),
                        category: item.category || getProductCategory(item.name),
                        name: item.name,
                        description: item.description,
                        price: item.price && parseFloat(item.price) > 0 ? parseFloat(item.price).toFixed(2).replace('.', ',') : null,
                        image_url: item.image_url || '/assets/morosil_new.png'
                    }));
                    setProductsList(formatted);
                }
            } catch (err) {
                console.error('Erro ao buscar produtos:', err);
                setProductsList(defaultProducts);
            }
        };
        fetchProducts();
    }, []);

    let filtered = activeTab === 'Todos'
        ? productsList
        : productsList.filter(c => c.category && c.category.toLowerCase().includes(activeTab.toLowerCase()));

    if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        filtered = filtered.filter(p =>
            p.name.toLowerCase().includes(term) ||
            p.description.toLowerCase().includes(term)
        );
    }

    const handleOrder = (product) => {
        const msg = config.WHATSAPP_MESSAGES.product(product.name, product.price ? product.price.replace(',', '.') : null);
        window.open(`https://wa.me/${config.WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`, '_blank');
    };

    return (
        <section id="produtos" className="store-section products-section">
            <div className="container">
                <div className="store-section-header">
                    <div className="store-badge">
                        <ShoppingBag size={14} />
                        <span>Fórmulas e Produtos em Linha</span>
                    </div>
                    <h2>Nossos Produtos em <span className="highlight-blue">Destaque</span></h2>
                    <p>Fórmulas consagradas em estoque. Manipulamos qualquer composição personalizada sob prescrição médica.</p>
                </div>

                {/* Filter Pills com scroll horizontal suave no mobile */}
                <div className="filter-bar-wrapper">
                    <div className="filter-bar">
                        {categories.map((cat) => (
                            <button
                                key={cat}
                                className={`filter-pill ${activeTab === cat ? 'filter-pill--active' : ''}`}
                                onClick={() => setActiveTab(cat)}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Grid */}
                <div className="products-grid">
                    {filtered.map((item) => (
                        <div key={item.id} className="store-card product-card">
                            <div className="product-img-box">
                                <div className="product-img-inner">
                                    <img
                                        src={item.image_url}
                                        alt={item.name}
                                        className="product-img"
                                        onError={(e) => { e.target.style.display = 'none'; }}
                                    />
                                </div>
                            </div>

                            <div className="product-info">
                                <h3>{item.name}</h3>
                                <p>{item.description}</p>
                            </div>

                            <div className="product-footer">
                                <div className="product-price">
                                    {item.price ? (
                                        <>
                                            <span className="price-small">a partir de</span>
                                            <strong>R$ {item.price}</strong>
                                        </>
                                    ) : (
                                        <strong className="price-consulta">Sob Consulta</strong>
                                    )}
                                </div>
                                <button onClick={() => handleOrder(item)} className="btn-buy-wa btn-buy-sm">
                                    <MessageCircle size={15} />
                                    <span>Pedir no WhatsApp</span>
                                </button>
                            </div>
                        </div>
                    ))}
                </div>

                {filtered.length === 0 && (
                    <p style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
                        Nenhum produto encontrado para "{searchTerm || activeTab}".
                    </p>
                )}
            </div>

            <style>{`
                .filter-bar-wrapper {
                    width: 100%;
                    overflow-x: auto;
                    -webkit-overflow-scrolling: touch;
                    scrollbar-width: none;
                    margin-bottom: 36px;
                }
                .filter-bar-wrapper::-webkit-scrollbar { display: none; }

                .filter-bar {
                    display: flex;
                    flex-wrap: wrap;
                    justify-content: center;
                    gap: 8px;
                    min-width: min-content;
                }

                .filter-pill {
                    background: rgba(255,255,255,0.04);
                    border: 1px solid var(--border-subtle);
                    color: var(--text-dim);
                    padding: 8px 18px;
                    border-radius: var(--radius-full);
                    font-size: 0.84rem;
                    font-weight: 600;
                    cursor: pointer;
                    transition: var(--transition);
                    white-space: nowrap;
                }
                .filter-pill:hover { border-color: var(--brand-blue); color: #fff; }
                .filter-pill--active {
                    background: var(--brand-blue);
                    border-color: var(--brand-blue);
                    color: #07090e !important;
                    font-weight: 700;
                }

                .products-grid {
                    display: grid;
                    grid-template-columns: repeat(3, 1fr);
                    gap: 22px;
                }

                .product-card {
                    display: flex;
                    flex-direction: column;
                    overflow: hidden;
                    position: relative;
                }
                
                .product-img-box {
                    position: relative;
                    height: 220px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 16px;
                    background: rgba(255,255,255,0.02);
                    border-bottom: 1px solid var(--border-subtle);
                }

                .product-img-inner {
                    width: 100%;
                    height: 100%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }

                .product-img {
                    max-width: 100%;
                    max-height: 100%;
                    width: auto;
                    height: auto;
                    object-fit: contain;
                    display: block;
                }

                .product-info {
                    flex: 1;
                    padding: 18px 20px 12px;
                    display: flex;
                    flex-direction: column;
                    gap: 6px;
                }
                .product-info h3 { font-size: 1.05rem; font-weight: 700; }
                .product-info p { font-size: 0.84rem; color: var(--text-dim); line-height: 1.5; margin: 0; }

                .product-footer {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 14px 20px;
                    border-top: 1px solid var(--border-subtle);
                    gap: 10px;
                }
                .product-price { display: flex; flex-direction: column; }
                .price-small { font-size: 0.7rem; color: var(--text-muted); text-transform: uppercase; }
                .product-price strong { font-size: 1.15rem; font-family: var(--font-heading); }
                .price-consulta { font-size: 0.92rem; color: var(--brand-blue); font-weight: 700; white-space: nowrap; }

                .btn-buy-sm {
                    padding: 10px 16px;
                    font-size: 0.82rem;
                    white-space: nowrap;
                }

                @media (max-width: 960px) {
                    .products-grid { grid-template-columns: repeat(2, 1fr); gap: 16px; }
                }

                @media (max-width: 640px) {
                    .filter-bar {
                        flex-wrap: nowrap;
                        justify-content: flex-start;
                        padding: 0 4px;
                    }
                    .products-grid {
                        grid-template-columns: 1fr;
                        gap: 16px;
                    }
                    .product-img-box {
                        height: 200px;
                        padding: 12px;
                    }
                    .product-info {
                        padding: 14px 16px 10px;
                    }
                    .product-footer {
                        padding: 12px 16px;
                    }
                    .btn-buy-sm {
                        flex: 1;
                        padding: 12px;
                    }
                }
            `}</style>
        </section>
    );
};

export default ProductGrid;
