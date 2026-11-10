import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient.ts';
import { ShoppingBag, ArrowRight } from 'lucide-react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { productPhoto, restoreOriginalImage } from '../utils/productImages';
import { NATURAL_FLAVOR, flavorName, productOptions, requiresChoice, useFlavors, variantPrice } from '../utils/productOptions';
import { GOALS, goalLabel, goalOf } from '../utils/productGoals';
import { money } from '../utils/commerce';
import { useCoupon } from '../context/CouponContext';
import { couponRate, discountedPrice, percentLabel } from '../lib/couponsApi';
import { PRESCRIPTION_PAGES_ENABLED } from '../data/publicChannels';
import ProductRail from './ProductRail';
import '../styles/vitrine.css';

// Bolinha de cor de cada sabor no cartão (sabores novos usam cinza).
const flavorColors = {
    natural: '#f1f5f9', laranja: '#fb923c', limao: '#a3e635', morango: '#f43f5e', uva: '#8b5cf6',
    'frutas-vermelhas': '#be123c', maracuja: '#facc15', abacaxi: '#fde047', tangerina: '#f97316',
    melancia: '#fb7185', cereja: '#dc2626', pessego: '#fdba74', baunilha: '#fef3c7', chocolate: '#92400e',
    coco: '#e7e5e4', menta: '#5eead4', 'tutti-frutti': '#f472b6',
};

// A tela inicial mostra os primeiros produtos, na ordem definida no admin; /produtos mostra todos.
const HOME_LIMIT = 8;
const goalIds = new Set(GOALS.map(goal => goal.id));
const productsPath = goal => (goal && goal !== 'todos' ? `/produtos?categoria=${goal}` : '/produtos');

const plural = (count, one, many) => `${count} ${count === 1 ? one : many}`;

// variant "home": seleção na tela inicial, com "Ver todos". variant "page": todos os produtos em /produtos,
// com a categoria no endereço (?categoria=treino) para poder ser compartilhada.
// featured: { ids, title, eyebrow } com os produtos que a parceira destaca no link dela (só na tela inicial).
const ProductGrid = ({ searchTerm = '', featured = null, variant = 'home' }) => {
    const page = variant === 'page';
    // Com cupom aplicado, o cartão já mostra o preço com desconto (o fechamento confirma o valor).
    const coupon = useCoupon()?.coupon;
    const [homeGoal, setHomeGoal] = useState('todos');
    const [searchParams, setSearchParams] = useSearchParams();
    const urlGoal = searchParams.get('categoria');
    const goal = page ? (goalIds.has(urlGoal) ? urlGoal : 'todos') : homeGoal;
    // A vitrine vem só do banco: nenhum produto fica escrito no código, para não
    // aparecer na tela um item que saiu do site.
    const [productsList, setProductsList] = useState([]);
    const [catalogStatus, setCatalogStatus] = useState('loading');
    const navigate = useNavigate();

    useEffect(() => {
        const fetchProducts = async () => {
            try {
                const { data, error } = await supabase
                    .from('produtos')
                    .select('*')
                    .order('display_order', { ascending: true, nullsFirst: false })
                    .order('created_at', { ascending: true });

                if (error) throw error;
                setProductsList((data || []).map((item, idx) => ({
                    id: String(item.id || idx),
                    name: item.name,
                    description: item.description || '',
                    price: item.price && parseFloat(item.price) > 0 ? parseFloat(item.price).toFixed(2).replace('.', ',') : null,
                    rawPrice: Number(item.price) || 0,
                    options: item.options || {},
                    image_url: productPhoto(item)
                })));
                setCatalogStatus('ready');
            } catch (err) {
                console.error('Erro ao buscar produtos:', err);
                setCatalogStatus('error');
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
    const shownProducts = page || searching ? visible : visible.slice(0, HOME_LIMIT);
    const useRail = !page && allProducts;
    const ProductLayout = useRail ? ProductRail : 'div';
    // Na tela inicial, "Ver todos" leva à página completa, já na categoria escolhida.
    const showAll = !page && !searching && visible.length > 0 && (allProducts || visible.length > shownProducts.length);

    const pickGoal = id => {
        if (!page) { setHomeGoal(id); return; }
        const next = new URLSearchParams(searchParams);
        if (id === 'todos') next.delete('categoria'); else next.set('categoria', id);
        setSearchParams(next, { replace: true });
    };
    const goalName = goal === 'todos' ? '' : goalLabel(goal);
    const featuredProducts = page || searching ? [] : (featured?.ids || []).map(id => withGoal.find(item => item.id === String(id))).filter(Boolean);

    const card = item => {
        const selected = choiceOf(item);
        const withChoice = requiresChoice(item);
        const lowestPrice = selected.options.hasSizes
            ? (selected.options.availableSizes.length ? Math.min(...selected.options.availableSizes.map(size => size.price)) : 0)
            : Number(item.rawPrice) || 0;
        const hasPrice = lowestPrice > 0;
        const fromLabel = hasPrice && withChoice && (selected.options.availableSizes.length > 1 || selected.options.flavorPrice > 0);
        const basePrice = selected.price || lowestPrice;
        const rate = hasPrice ? couponRate(coupon, item.id) : 0;
        return <article key={item.id} className="vt-card">
            <Link to={`/produto/${item.id}`} state={{ product: item }} className="vt-card-photo" tabIndex={-1} aria-hidden="true">
                <img src={item.image_url} alt="" loading="lazy" onError={restoreOriginalImage} />
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
                        {rate > 0 && <s className="vt-price-old"><span className="vt-sr-only">Sem o cupom: </span>{money(basePrice)}</s>}
                        <strong>{hasPrice ? money(rate > 0 ? discountedPrice(basePrice, rate) : basePrice) : 'Consulte o valor'}</strong>
                        {rate > 0 && <span className="vt-price-tag">−{percentLabel(rate)} com o cupom</span>}
                    </p>
                    <button type="button" className="vt-buy" onClick={() => openProduct(item)} aria-label={`${hasPrice ? 'Comprar' : 'Ver produto'} ${item.name}`}>{hasPrice && <ShoppingBag size={16} aria-hidden="true" />}<span>{hasPrice ? 'Comprar' : 'Ver produto'}</span></button>
                </div>
            </div>
        </article>;
    };

    return (
        <section id="produtos" className={`store-section products-section vt${page ? ' vt-page' : ''}`} aria-labelledby="store-products-title">
            <div className="container">
                {featuredProducts.length > 0 && <div className="vt-featured" data-part="featured">
                    <header className="vt-header">
                        <div>
                            <span className="vt-eyebrow">{featured.eyebrow}</span>
                            <h2>{featured.title}</h2>
                        </div>
                    </header>
                    <h3 className="vt-sr-only">Produtos em destaque</h3>
                    <div className="vt-grid">{featuredProducts.map(card)}</div>
                </div>}

                <header className="vt-header">
                    <div>
                        <span className="vt-eyebrow">{page ? 'Loja Graphène' : 'A seleção Graphène'}</span>
                        {page ? <h1 id="store-products-title">Todos os produtos</h1> : <h2 id="store-products-title">Cuidado em cada escolha.</h2>}
                    </div>
                    {page
                        ? <p>{catalogStatus === 'ready' ? `${plural(withGoal.length, 'produto', 'produtos')}, com atendimento farmacêutico e entrega para todo o Brasil.` : 'Suplementos, vitaminas e cuidados com a pele.'}</p>
                        : <div className="vt-header-side">
                            <p>Conheça nossa linha e encontre as apresentações para a sua rotina.</p>
                            <Link to="/produtos" className="vt-header-link">Ver todos os produtos <ArrowRight size={15} aria-hidden="true" /></Link>
                        </div>}
                </header>

                <div className="vt-goals" role="group" aria-label="Filtrar por objetivo">
                    {[{ id: 'todos', label: 'Todos os produtos' }, ...GOALS].map(item =>
                        <button key={item.id} type="button" className={`vt-goal${goal === item.id ? ' is-on' : ''}`} aria-pressed={goal === item.id} onClick={() => pickGoal(item.id)}>{item.label}</button>
                    )}
                </div>

                {searching && <p className="vt-search-note" role="status">{visible.length ? `${plural(visible.length, 'resultado', 'resultados')} para “${searchTerm.trim()}”${goalName ? ` em ${goalName}` : ''}.` : `Nenhum produto encontrado para “${searchTerm.trim()}”${goalName ? ` em ${goalName}` : ''}.`}</p>}

                {(visible.length > 0 || !searching) && <div className="vt-part" data-part="catalog">
                    <h3 className="vt-sr-only">{goalName ? `${goalName}: produtos` : 'Produtos da loja'}</h3>
                    {visible.length === 0 ? <p className="vt-empty" role="status">{catalogStatus === 'loading' ? 'Carregando produtos…' : catalogStatus === 'error' ? 'Não foi possível carregar os produtos. Atualize a página ou fale com a equipe pelo WhatsApp.' : goalName ? `Nenhum produto encontrado em ${goalName.toLowerCase()}.` : 'Nenhum produto encontrado.'}</p> :
                        <ProductLayout className="vt-grid" {...(useRail ? { id: 'vt-products-rail', label: 'Todos os produtos', resetKey: term } : {})}>
                            {shownProducts.map(card)}
                        </ProductLayout>}
                    {showAll && <Link to={productsPath(goal)} className="vt-more">
                        {`Ver todos os ${visible.length} produtos${goalName ? ` de ${goalName.toLowerCase()}` : ''}`}<ArrowRight size={17} aria-hidden="true" />
                    </Link>}
                </div>}

                {PRESCRIPTION_PAGES_ENABLED && page && <div className="vt-prescription">
                    <p>Um cuidado mais individualizado?</p>
                    <Link to="/receita">Solicite um orçamento para a sua fórmula <ArrowRight size={16} aria-hidden="true" /></Link>
                </div>}
            </div>
        </section>
    );
};

export default ProductGrid;
