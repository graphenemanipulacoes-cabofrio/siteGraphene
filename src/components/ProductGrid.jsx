import { useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabaseClient.ts';
import { ShoppingBag, ChevronDown, ArrowRight } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { resolveProductImage } from '../utils/productImages';
import { NATURAL_FLAVOR, flavorName, productOptions, requiresChoice, useFlavors, variantPrice } from '../utils/productOptions';
import { GOALS, goalLabel, goalOf } from '../utils/productGoals';
import { money } from '../utils/commerce';
import ProductRail from './ProductRail';
import '../styles/vitrine.css';

// Produtos de reserva caso o banco não responda.
const defaultProducts = [
    {
        id: '12',
        name: 'Coenzima Q10 100mg',
        description: 'Coenzima Q10 100mg. Fundamental para a produção de energia celular e suporte à saúde cardíaca. Ação antioxidante. Contém 60 cápsulas.',
        price: null,
        image_url: '/assets/products/coenzima_q10.png'
    },
    {
        id: '4',
        name: 'Composto Termogênico',
        description: 'Acelerador metabólico avançado. Mais energia e queima calórica eficiente.',
        price: null,
        image_url: '/assets/products/termogenico.png'
    },
    {
        id: '15',
        name: 'Creatina Monohidratada 200g',
        description: 'Creatina Monohidratada 200g. Auxilia no aumento de força e massa muscular. Fórmula pura e sem sabor. Contém 200g (pó).',
        price: null,
        image_url: '/assets/products/creatina.png'
    },
    {
        id: '9',
        name: 'Colágeno Verisol® 2.5g',
        description: 'Colágeno Verisol® 2.5g. Auxilia na manutenção da saúde da pele, contribuindo para a elasticidade e redução de rugas. Contém 30 sachês.',
        price: null,
        image_url: '/assets/products/colageno_verisol.png'
    },
    {
        id: '3',
        name: 'Morosil® 500mg',
        description: 'Autêntico extrato da laranja moro. Potente na redução de medidas abdominais.',
        price: null,
        image_url: '/assets/products/morosil.png'
    },
    {
        id: '1',
        name: 'Melatonina 5mg',
        description: 'Sono reparador, rápido e combate à insônia. Regula o ritmo biológico natural.',
        price: null,
        image_url: '/assets/products/melatonina.png'
    },
    {
        id: '5',
        name: 'Maca Peruana',
        description: 'Superalimento para vigor físico, libido e equilíbrio hormonal.',
        price: null,
        image_url: '/assets/products/maca_peruana.png'
    },
    {
        id: '7',
        name: 'Vitamina D3 5000 UI',
        description: 'Vitamina D3 5000 UI. Auxilia na formação de ossos e dentes, na absorção de cálcio e fósforo e no funcionamento do sistema imune. Contém 60 cápsulas.',
        price: null,
        image_url: '/assets/products/vitamina_d3.png'
    },
    {
        id: '6',
        name: 'Magnésio Dimalato 500mg',
        description: 'Magnésio Dimalato 500mg. Auxilia no funcionamento muscular e neuromuscular, metabolismo energético e formação de ossos e dentes. Contém 90 cápsulas.',
        price: null,
        image_url: '/assets/products/magnesio_dimalato.png'
    },
    {
        id: '8',
        name: 'Cúrcuma (Curcumina 95%) 500mg',
        description: 'Cúrcuma 500mg (Curcumina 95%). Potente ação antioxidante e anti-inflamatória. Auxilia na proteção das células contra radicais livres. Contém 60 cápsulas.',
        price: null,
        image_url: '/assets/products/curcuma.png'
    },
    {
        id: '10',
        name: 'Biotina 10000mcg',
        description: 'Biotina 10000mcg. Vitamina essencial para a manutenção da saúde da pele, cabelos e unhas. Contém 60 cápsulas.',
        price: null,
        image_url: '/assets/products/biotina.png'
    },
    {
        id: '11',
        name: 'Resveratrol 250mg',
        description: 'Resveratrol 250mg (Trans-Resveratrol). Potente antioxidante que auxilia na saúde cardiovascular e combate o envelhecimento celular. Contém 60 cápsulas.',
        price: null,
        image_url: '/assets/products/resveratrol.png'
    },
    {
        id: '14',
        name: 'Zinco Quelado 30mg',
        description: 'Zinco Quelado 30mg. Mineral essencial para o fortalecimento do sistema imune e processos de cicatrização. Alta biodisponibilidade. Contém 60 cápsulas.',
        price: null,
        image_url: '/assets/products/zinco_quelado.png'
    },
    {
        id: '13',
        name: 'Ômega 3 (EPA/DHA) 1000mg',
        description: 'Ômega 3 1000mg. Óleo de peixe rico em EPA e DHA. Auxilia na saúde do coração, cérebro e controle dos níveis de colesterol. Contém 90 cápsulas.',
        price: null,
        image_url: '/assets/products/omega_3.png'
    },
    {
        id: '2',
        name: 'Ashwagandha 300mg',
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

const INITIAL_LIMIT = 8;

const plural = (count, one, many) => `${count} ${count === 1 ? one : many}`;

const ProductGrid = ({ searchTerm = '' }) => {
    const [goal, setGoal] = useState('todos');
    const [expanded, setExpanded] = useState(false);
    const [productsList, setProductsList] = useState(defaultProducts);
    const navigate = useNavigate();
    const sectionRef = useRef(null);

    useEffect(() => {
        const fetchProducts = async () => {
            try {
                const { data, error } = await supabase
                    .from('produtos')
                    .select('*')
                    .order('display_order', { ascending: true, nullsFirst: false })
                    .order('created_at', { ascending: true });

                if (!error && data && data.length > 0) {
                    setProductsList(data.map((item, idx) => ({
                        id: String(item.id || idx),
                        name: item.name,
                        description: item.description || '',
                        price: item.price && parseFloat(item.price) > 0 ? parseFloat(item.price).toFixed(2).replace('.', ',') : null,
                        rawPrice: Number(item.price) || 0,
                        options: item.options || {},
                        image_url: resolveProductImage(item)
                    })));
                }
            } catch (err) {
                console.error('Erro ao buscar produtos:', err);
                setProductsList(defaultProducts);
            }
        };
        fetchProducts();
    }, []);

    // Quantidade e sabor marcados no cartão seguem para a página do produto.
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
    const choose = (id, changes) => setChoices(current => ({ ...current, [id]: { ...current[id], ...changes } }));
    const openProduct = item => {
        const selected = choiceOf(item);
        navigate(`/produto/${item.id}`, { state: { product: item, size: selected.size || null, flavor: selected.flavor || null } });
    };

    const withGoal = productsList.map(item => ({ ...item, goal: goalOf(item) }));
    const term = searchTerm.trim().toLowerCase();
    const searching = term.length > 0;
    const visible = withGoal.filter(item => (goal === 'todos' || item.goal === goal)
        && (!searching || item.name.toLowerCase().includes(term) || item.description.toLowerCase().includes(term)));
    const allProducts = goal === 'todos';
    const shownProducts = allProducts || searching || expanded ? visible : visible.slice(0, INITIAL_LIMIT);
    const ProductLayout = allProducts ? ProductRail : 'div';

    const pickGoal = id => {
        setGoal(id);
        setExpanded(false);
    };
    const toggle = () => {
        setExpanded(current => !current);
        if (expanded) sectionRef.current?.querySelector('[data-part="catalog"]')?.scrollIntoView({ block: 'start' });
    };
    const goalName = goal === 'todos' ? '' : goalLabel(goal);

    return (
        <section id="produtos" className="store-section products-section vt" ref={sectionRef} aria-labelledby="store-products-title">
            <div className="container">
                <header className="vt-header">
                    <div>
                        <span className="vt-eyebrow">A seleção Graphène</span>
                        <h2 id="store-products-title">Cuidado em cada escolha.</h2>
                    </div>
                    <p>Conheça nossa linha e encontre as apresentações para a sua rotina.</p>
                </header>

                <div className="vt-goals" role="group" aria-label="Filtrar por objetivo">
                    {[{ id: 'todos', label: 'Todos os produtos' }, ...GOALS].map(item =>
                        <button key={item.id} type="button" className={`vt-goal${goal === item.id ? ' is-on' : ''}`} aria-pressed={goal === item.id} onClick={() => pickGoal(item.id)}>{item.label}</button>
                    )}
                </div>

                {searching && <p className="vt-search-note" role="status">{visible.length ? `${plural(visible.length, 'resultado', 'resultados')} para “${searchTerm.trim()}”${goalName ? ` em ${goalName}` : ''}.` : `Nenhum produto encontrado para “${searchTerm.trim()}”${goalName ? ` em ${goalName}` : ''}.`}</p>}

                {(visible.length > 0 || !searching) && <div className="vt-part" data-part="catalog">
                    <h3 className="vt-sr-only">{goalName ? `${goalName}: produtos` : 'Produtos da loja'}</h3>
                    {visible.length === 0 ? <p className="vt-empty">{goalName ? `Nenhum produto encontrado em ${goalName.toLowerCase()}.` : 'Nenhum produto encontrado.'}</p> :
                        <ProductLayout className="vt-grid" {...(allProducts ? { id: 'vt-products-rail', label: 'Todos os produtos', resetKey: term } : {})}>
                            {shownProducts.map(item => {
                                const selected = choiceOf(item);
                                const withChoice = requiresChoice(item);
                                const lowestPrice = selected.options.hasSizes
                                    ? (selected.options.availableSizes.length ? Math.min(...selected.options.availableSizes.map(size => size.price)) : 0)
                                    : Number(item.rawPrice) || 0;
                                const hasPrice = lowestPrice > 0;
                                const fromLabel = hasPrice && withChoice && (selected.options.availableSizes.length > 1 || selected.options.flavorPrice > 0);
                                return <article key={item.id} className="vt-card">
                                    <Link to={`/produto/${item.id}`} state={{ product: item }} className="vt-card-photo" tabIndex={-1} aria-hidden="true">
                                        <img src={item.image_url} alt="" loading="lazy" onError={event => { event.currentTarget.style.visibility = 'hidden'; }} />
                                    </Link>
                                    <div className="vt-card-body">
                                        <Link to={`/produto/${item.id}`} state={{ product: item }} className="vt-card-name"><h4>{item.name}</h4></Link>
                                        {item.description && <p className="vt-card-desc">{item.description}</p>}
                                        {withChoice && hasPrice && <div className="vt-chips">
                                            {selected.options.hasSizes && <div className="vt-chip-row" role="radiogroup" aria-label={`Quantidade de ${item.name}`}>
                                                {selected.options.availableSizes.map(size => <button type="button" key={size.id} role="radio" aria-checked={selected.size === size.id} className={`vt-chip${selected.size === size.id ? ' is-on' : ''}`} onClick={() => choose(item.id, { size: size.id })}>{size.label}</button>)}
                                            </div>}
                                            {selected.options.hasFlavors && <div className="vt-chip-row" role="radiogroup" aria-label={`Sabor de ${item.name}`}>
                                                {selected.flavorIds.map(id => <button type="button" key={id} role="radio" aria-checked={selected.flavor === id} className={`vt-chip${selected.flavor === id ? ' is-on' : ''}`} onClick={() => choose(item.id, { flavor: id })}>
                                                    <i style={{ background: flavorColors[id] || '#94a3b8' }} aria-hidden="true" />{id === NATURAL_FLAVOR ? 'Natural' : flavorName(flavors, id)}
                                                </button>)}
                                            </div>}
                                        </div>}
                                        <div className="vt-card-buy">
                                            <p className={`vt-price${hasPrice ? '' : ' vt-price-unset'}`}>
                                                {!selected.price && fromLabel && <small>A partir de</small>}
                                                <strong>{hasPrice ? money(selected.price || lowestPrice) : 'Consulte o valor'}</strong>
                                            </p>
                                            <button type="button" className="vt-buy" onClick={() => openProduct(item)} aria-label={`${hasPrice ? 'Comprar' : 'Ver produto'} ${item.name}`}>{hasPrice && <ShoppingBag size={16} aria-hidden="true" />}<span>{hasPrice ? 'Comprar' : 'Ver produto'}</span></button>
                                        </div>
                                    </div>
                                </article>;
                            })}
                        </ProductLayout>}
                    {!allProducts && !searching && visible.length > INITIAL_LIMIT && <button type="button" className="vt-more" onClick={toggle} aria-expanded={expanded}>
                        {expanded ? 'Mostrar menos' : `Ver todos os ${visible.length} produtos`}<ChevronDown size={17} aria-hidden="true" />
                    </button>}
                </div>}

                <div className="vt-prescription">
                    <p>Um cuidado mais individualizado?</p>
                    <Link to="/receita">Solicite um orçamento para a sua fórmula <ArrowRight size={16} aria-hidden="true" /></Link>
                </div>
            </div>
        </section>
    );
};

export default ProductGrid;
