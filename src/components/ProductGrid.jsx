import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient.ts';
import { ShoppingBag, Zap } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { resolveProductImage } from '../utils/productImages';
import { NATURAL_FLAVOR, flavorName, productOptions, requiresChoice, useFlavors, variantPrice } from '../utils/productOptions';
import { money } from '../utils/commerce';

const categories = ['Todos', 'Performance & Força', 'Longevidade & Saúde', 'Sono & Bem-Estar', 'Metabolismo & Queima', 'Beleza & Pele'];

const getProductCategory = (name = '') => {
    const n = name.toLowerCase();
    const has = (...words) => words.some(w => n.includes(w));
    if (has('termogênico', 'morosil', 'laranja moro', 'mitburn', 'berberina', 'cromo')) return 'Metabolismo & Queima';
    if (has('creatina', 'whey', 'zinco', 'glutamina', 'cafeína', 'cafeina')) return 'Performance & Força';
    if (has('melatonina', 'ashwagandha', 'sono', 'foco', 'passiflora', 'teanina', 'triptofano')) return 'Sono & Bem-Estar';
    if (!has('tipo ii') && has('colágeno', 'colageno', 'biotina', 'niacinamida', 'minoxidil', 'azelaico', 'dexpantenol', 'ureia')) return 'Beleza & Pele';
    return 'Longevidade & Saúde';
};

const defaultProducts = [
    {
        id: '12',
        name: 'Coenzima Q10 100mg',
        category: 'Longevidade & Saúde',
        description: 'Coenzima Q10 100mg. Fundamental para a produção de energia celular e suporte à saúde cardíaca. Ação antioxidante. Contém 60 cápsulas.',
        price: null,
        image_url: '/assets/products/coenzima_q10.png'
    },
    {
        id: '4',
        name: 'Composto Termogênico',
        category: 'Metabolismo & Queima',
        description: 'Acelerador metabólico avançado. Mais energia e queima calórica eficiente.',
        price: null,
        image_url: '/assets/products/termogenico.png'
    },
    {
        id: '15',
        name: 'Creatina Monohidratada 200g',
        category: 'Performance & Força',
        description: 'Creatina Monohidratada 200g. Auxilia no aumento de força e massa muscular. Fórmula pura e sem sabor. Contém 200g (pó).',
        price: null,
        image_url: '/assets/products/creatina.png'
    },
    {
        id: '9',
        name: 'Colágeno Verisol® 2.5g',
        category: 'Longevidade & Saúde',
        description: 'Colágeno Verisol® 2.5g. Auxilia na manutenção da saúde da pele, contribuindo para a elasticidade e redução de rugas. Contém 30 sachês.',
        price: null,
        image_url: '/assets/products/colageno_verisol.png'
    },
    {
        id: '3',
        name: 'Morosil® 500mg',
        category: 'Metabolismo & Queima',
        description: 'Autêntico extrato da laranja moro. Potente na redução de medidas abdominais.',
        price: null,
        image_url: '/assets/products/morosil.png'
    },
    {
        id: '1',
        name: 'Melatonina 5mg',
        category: 'Sono & Bem-Estar',
        description: 'Sono reparador, rápido e combate à insônia. Regula o ritmo biológico natural.',
        price: null,
        image_url: '/assets/products/melatonina.png'
    },
    {
        id: '5',
        name: 'Maca Peruana',
        category: 'Longevidade & Saúde',
        description: 'Superalimento para vigor físico, libido e equilíbrio hormonal.',
        price: null,
        image_url: '/assets/products/maca_peruana.png'
    },
    {
        id: '7',
        name: 'Vitamina D3 5000 UI',
        category: 'Longevidade & Saúde',
        description: 'Vitamina D3 5000 UI. Auxilia na formação de ossos e dentes, na absorção de cálcio e fósforo e no funcionamento do sistema imune. Contém 60 cápsulas.',
        price: null,
        image_url: '/assets/products/vitamina_d3.png'
    },
    {
        id: '6',
        name: 'Magnésio Dimalato 500mg',
        category: 'Longevidade & Saúde',
        description: 'Magnésio Dimalato 500mg. Auxilia no funcionamento muscular e neuromuscular, metabolismo energético e formação de ossos e dentes. Contém 90 cápsulas.',
        price: null,
        image_url: '/assets/products/magnesio_dimalato.png'
    },
    {
        id: '8',
        name: 'Cúrcuma (Curcumina 95%) 500mg',
        category: 'Longevidade & Saúde',
        description: 'Cúrcuma 500mg (Curcumina 95%). Potente ação antioxidante e anti-inflamatória. Auxilia na proteção das células contra radicais livres. Contém 60 cápsulas.',
        price: null,
        image_url: '/assets/products/curcuma.png'
    },
    {
        id: '10',
        name: 'Biotina 10000mcg',
        category: 'Longevidade & Saúde',
        description: 'Biotina 10000mcg. Vitamina essencial para a manutenção da saúde da pele, cabelos e unhas. Contém 60 cápsulas.',
        price: null,
        image_url: '/assets/products/biotina.png'
    },
    {
        id: '11',
        name: 'Resveratrol 250mg',
        category: 'Longevidade & Saúde',
        description: 'Resveratrol 250mg (Trans-Resveratrol). Potente antioxidante que auxilia na saúde cardiovascular e combate o envelhecimento celular. Contém 60 cápsulas.',
        price: null,
        image_url: '/assets/products/resveratrol.png'
    },
    {
        id: '14',
        name: 'Zinco Quelado 30mg',
        category: 'Performance & Força',
        description: 'Zinco Quelado 30mg. Mineral essencial para o fortalecimento do sistema imune e processos de cicatrização. Alta biodisponibilidade. Contém 60 cápsulas.',
        price: null,
        image_url: '/assets/products/zinco_quelado.png'
    },
    {
        id: '13',
        name: 'Ômega 3 (EPA/DHA) 1000mg',
        category: 'Longevidade & Saúde',
        description: 'Ômega 3 1000mg. Óleo de peixe rico em EPA e DHA. Auxilia na saúde do coração, cérebro e controle dos níveis de colesterol. Contém 90 cápsulas.',
        price: null,
        image_url: '/assets/products/omega_3.png'
    },
    {
        id: '2',
        name: 'Ashwagandha 300mg',
        category: 'Sono & Bem-Estar',
        description: 'Adaptógeno natural. Reduz estresse, ansiedade e melhora o foco e disposição.',
        price: null,
        image_url: '/assets/products/ashwagandha.png'
    }
];

// Bolinha de cor de cada sabor no cartão (sabores novos usam cinza).
const flavorColors = {
    natural: '#f1f5f9', laranja: '#fb923c', limao: '#a3e635', morango: '#f43f5e', uva: '#8b5cf6',
    'frutas-vermelhas': '#be123c', maracuja: '#facc15', abacaxi: '#fde047', tangerina: '#f97316',
    melancia: '#fb7185', cereja: '#dc2626', pessego: '#fdba74', baunilha: '#fef3c7', chocolate: '#92400e',
    coco: '#e7e5e4', menta: '#5eead4', 'tutti-frutti': '#f472b6',
};

const ProductGrid = ({ searchTerm = '' }) => {
    const [activeTab, setActiveTab] = useState('Todos');
    const [productsList, setProductsList] = useState(defaultProducts);
    const navigate = useNavigate();

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
                        rawPrice: Number(item.price) || 0,
                        options: item.options || {},
                        image_url: resolveProductImage(item)
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

    // Quantidade e sabor escolhidos direto no cartão (obrigatórios quando o produto tem).
    const flavors = useFlavors();
    const [choices, setChoices] = useState({});
    const choiceOf = item => {
        const options = productOptions(item);
        const chosen = choices[item.id] || {};
        const flavorIds = [...(options.natural ? [NATURAL_FLAVOR] : []), ...options.flavors.filter(id => !flavors.length || flavors.some(flavor => flavor.id === id))];
        const size = chosen.size || (options.availableSizes.length === 1 ? options.availableSizes[0].id : '');
        const flavor = chosen.flavor || (flavorIds.length === 1 ? flavorIds[0] : '');
        const complete = (!options.hasSizes || size) && (!options.hasFlavors || flavor);
        return { options, flavorIds, size, flavor, complete, price: complete ? variantPrice({ ...item, price: item.rawPrice }, size, flavor) : null };
    };
    const choose = (id, changes) => {
        setChoices(current => ({ ...current, [id]: { ...current[id], ...changes } }));
    };

    // "Comprar" abre a página do produto, já com a escolha feita no cartão.
    const openProduct = item => {
        const selected = choiceOf(item);
        navigate(`/produto/${item.id}`, { state: { product: item, size: selected.size || null, flavor: selected.flavor || null } });
    };

    return (
        <section id="produtos" className="store-section products-section">
            <div className="container">
                <div className="store-section-header">
                    <div className="store-badge">
                        <ShoppingBag size={14} />
                        <span>Produtos da Loja</span>
                    </div>
                    <h2>Nossos Produtos em <span className="highlight-blue">Destaque</span></h2>
                    <p>Confira as informações e os preços de cada item. Para fórmulas individualizadas, envie sua prescrição para análise e orçamento da equipe farmacêutica.</p>
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
                                <Link to={`/produto/${item.id}`} state={{ product: item }} className="product-name-link"><h3>{item.name}</h3></Link>
                                <p>{item.description}</p>
                            </div>

                            {(() => {
                                const selected = choiceOf(item);
                                const withChoice = requiresChoice(item);
                                const sizeLabel = selected.options.availableSizes.length > 1 || selected.options.flavorPrice > 0;
                                return <div className="product-footer">
                                    {withChoice && item.price && <div className="product-chips">
                                        {selected.options.hasSizes && <div className="product-chip-row" role="radiogroup" aria-label={`Quantidade de ${item.name}`}>
                                            {selected.options.availableSizes.map(size => <button type="button" key={size.id} role="radio" aria-checked={selected.size === size.id} className={`product-chip${selected.size === size.id ? ' is-on' : ''}`} onClick={() => choose(item.id, { size: size.id })}>{size.label}</button>)}
                                        </div>}
                                        {selected.options.hasFlavors && <div className="product-chip-row" role="radiogroup" aria-label={`Sabor de ${item.name}`}>
                                            {selected.flavorIds.map(id => <button type="button" key={id} role="radio" aria-checked={selected.flavor === id} className={`product-chip product-chip--flavor${selected.flavor === id ? ' is-on' : ''}`} onClick={() => choose(item.id, { flavor: id })}>
                                                <i style={{ background: flavorColors[id] || '#94a3b8' }} aria-hidden="true" />{id === NATURAL_FLAVOR ? 'Natural' : flavorName(flavors, id)}
                                            </button>)}
                                        </div>}
                                    </div>}
                                    <div className="product-price-row">
                                        <div className="product-price">
                                            {!item.price ? <span className="price-small">Preço não informado</span>
                                                : selected.price ? <><span className="price-small">Preço por unidade</span><strong>{money(selected.price)}</strong></>
                                                    : <><span className="price-small">{withChoice && sizeLabel ? 'A partir de' : 'Preço por unidade'}</span><strong>R$ {item.price}</strong></>}
                                        </div>
                                    </div>
                                    {item.price ? <div className="product-card-actions product-card-actions--single">
                                        <button onClick={() => openProduct(item)} className="btn-buy-now"><ShoppingBag size={16} /><span>Comprar</span></button>
                                    </div> : <div className="product-card-actions product-card-actions--single">
                                        <button disabled className="btn-buy-now"><Zap size={16} /><span>Em breve</span></button>
                                    </div>}
                                </div>;
                            })()}
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
                    height: 255px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 8px 12px;
                    background: #ffffff;
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
                .product-name-link:hover h3 { color: var(--brand-blue); }
                .product-info p { font-size: 0.84rem; color: var(--text-dim); line-height: 1.5; margin: 0; }

                .product-footer {
                    display: flex;
                    flex-direction: column;
                    padding: 16px 20px 18px;
                    border-top: 1px solid var(--border-subtle);
                    gap: 14px;
                }
                .product-price-row { display:flex; align-items:flex-end; min-height:27px; }
                .product-price { display: flex; flex-direction: column; }
                .price-small { font-size: 0.7rem; color: var(--text-muted); text-transform: uppercase; }
                .product-price strong { font-size: 1.15rem; font-family: var(--font-heading); }

                .product-card-actions { display:grid; grid-template-columns:1fr 1fr; gap:9px; }
                .product-card-actions--single { grid-template-columns:1fr; }
                .product-chips { display:grid; gap:7px; }
                .product-chip-row { display:flex; flex-wrap:wrap; gap:5px; }
                .product-chip { display:inline-flex; align-items:center; gap:5px; min-height:28px; padding:3px 10px; border-radius:999px; border:1px solid var(--border-subtle); background:transparent; color:var(--text-dim); font:inherit; font-size:.72rem; font-weight:600; line-height:1; cursor:pointer; transition:border-color .15s, background .15s, color .15s; }
                .product-chip:hover { border-color:var(--border-blue); color:var(--text-main); }
                .product-chip.is-on { border-color:var(--brand-blue); background:rgba(34,199,232,.14); color:#fff; }
                .product-chip:focus-visible { outline:2px solid var(--brand-blue); outline-offset:1px; }
                .product-chip i { width:8px; height:8px; border-radius:50%; flex:none; box-shadow:0 0 0 1px rgba(255,255,255,.18); }
                .product-option-error { margin:0; font-size:.74rem; font-weight:600; color:#fb923c; }
                .product-card-actions button:disabled { opacity:.55; cursor:not-allowed; transform:none; box-shadow:none; }
                .btn-add-cart, .btn-buy-now { min-height:44px; display:flex; align-items:center; justify-content:center; gap:7px; border-radius:9px; font-size:.78rem; font-weight:800; transition:var(--transition); cursor:pointer; }
                .btn-add-cart { background:rgba(34,199,232,.07); color:var(--brand-blue); border:1px solid var(--border-blue); }
                .btn-add-cart:hover { color:var(--brand-blue-light); border-color:var(--brand-blue); background:rgba(34,199,232,.14); transform:translateY(-1px); }
                .btn-buy-now { background:var(--brand-green); color:var(--action-ink); border:1px solid var(--brand-green); box-shadow:var(--shadow-btn-green); }
                .btn-buy-now:hover { background:var(--brand-green-hover); border-color:var(--brand-green-hover); transform:translateY(-1px); }

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
                    .product-footer { padding:14px 16px 16px; }
                }
            `}</style>
        </section>
    );
};

export default ProductGrid;
