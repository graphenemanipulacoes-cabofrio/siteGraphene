import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ShoppingBag, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '../lib/supabaseClient';
import StoreLayout from '../components/StoreLayout';
import { useStore } from '../context/StoreContext';
import { money } from '../utils/commerce';
import { resolveProductImage } from '../utils/productImages';
import { NATURAL_FLAVOR, flavorName, productOptions, useFlavors, variantPrice } from '../utils/productOptions';
import { useProductSeo } from '../components/SeoManager';
import '../styles/purchase.css';

// Escolha obrigatória de quantidade e sabor (quando o produto tiver).
function OptionGroup({ legend, name, items, value, onChange, missing }) {
    return <fieldset className={`purchase-options${missing ? ' is-missing' : ''}`}>
        <legend>{legend} <span>obrigatório</span></legend>
        <div className="purchase-option-list">
            {items.map(item => <label key={item.id} className={`purchase-option${value === item.id ? ' is-selected' : ''}`}>
                <input type="radio" name={name} value={item.id} checked={value === item.id} onChange={() => onChange(item.id)} />
                <span>{item.label}</span>
                {item.detail && <small>{item.detail}</small>}
            </label>)}
        </div>
        {missing && <p className="purchase-option-error" role="alert">{legend === 'Quantidade' ? 'Escolha a quantidade.' : 'Escolha o sabor.'}</p>}
    </fieldset>;
}

export default function ProductPage() {
    const { id } = useParams();
    const { addItem } = useStore();
    const navigate = useNavigate();
    const catalog = useFlavors();
    const [result, setResult] = useState({ id: null, product: null, error: '' });
    const [choice, setChoice] = useState({ id: null, size: null, flavor: null });
    const [tried, setTried] = useState(false);
    useEffect(() => {
        let active = true;
        supabase.from('produtos').select('*').eq('id', id).maybeSingle().then(({ data, error }) => {
            if (active) setResult({ id, product: data, error: error ? 'Não foi possível carregar este produto.' : data ? '' : 'Produto não encontrado.' });
        });
        return () => { active = false; };
    }, [id]);
    const product = result.id === id ? result.product : null;
    useProductSeo(product);

    const options = productOptions(product);
    const selected = choice.id === id ? choice : { id, size: null, flavor: null };
    // Uma única opção já vem marcada.
    const size = selected.size || (options.availableSizes.length === 1 ? options.availableSizes[0].id : null);
    const flavorIds = [...(options.natural ? [NATURAL_FLAVOR] : []), ...options.flavors.filter(flavor => flavor === NATURAL_FLAVOR || catalog.some(item => item.id === flavor) || !catalog.length)];
    const flavor = selected.flavor || (flavorIds.length === 1 ? flavorIds[0] : null);
    const pick = changes => setChoice({ ...selected, ...changes, id });

    const sizeItems = options.availableSizes.map(item => ({ id: item.id, label: item.label, detail: money(item.price) }));
    const flavorItems = flavorIds.map(item => ({
        id: item, label: flavorName(catalog, item),
        detail: item !== NATURAL_FLAVOR && options.flavorPrice > 0 ? `+ ${money(options.flavorPrice)}` : null,
    }));
    const missingSize = options.hasSizes && !size;
    const missingFlavor = options.hasFlavors && !flavor;
    const price = variantPrice(product, size, flavor);
    const lowest = options.hasSizes ? Math.min(...options.availableSizes.map(item => item.price)) : Number(product?.price);
    const purchasable = options.hasSizes ? options.availableSizes.length > 0 : Number(product?.price) > 0;

    const buy = checkout => {
        if (missingSize || missingFlavor) { setTried(true); return; }
        const sizeLabel = options.availableSizes.find(item => item.id === size)?.label;
        const added = addItem({ ...product, image_url: resolveProductImage(product) }, {
            size, sizeLabel, flavor, flavorLabel: flavor ? flavorName(catalog, flavor) : null, price,
        });
        if (!added) return;
        if (checkout) navigate('/checkout');
        else toast.success('Adicionado ao carrinho', { description: [product.name, sizeLabel, flavor && flavorName(catalog, flavor)].filter(Boolean).join(' · '), duration: 2500 });
    };

    return <StoreLayout><section className="purchase-page"><div className="purchase-container">
        <Link to="/#produtos" className="purchase-back"><ArrowLeft size={16} /> Continuar comprando</Link>
        {!product ? <div className="purchase-empty" role="status"><h1>{result.id === id ? result.error : 'Carregando produto…'}</h1><Link to="/#produtos">Ver produtos</Link></div> :
            <div className="purchase-product">
                <div className="purchase-product-photo" style={{ background: '#ffffff' }}><img src={resolveProductImage(product)} alt={product.name} /></div>
                <div><span className="purchase-eyebrow">Graphène Manipulações • Cabo Frio, RJ</span><h1>{product.name}</h1><p className="purchase-description">{product.description}</p>
                    {purchasable && sizeItems.length > 0 && <OptionGroup legend="Quantidade" name="quantidade" items={sizeItems} value={size} onChange={value => pick({ size: value })} missing={tried && missingSize} />}
                    {purchasable && flavorItems.length > 0 && <OptionGroup legend="Sabor" name="sabor" items={flavorItems} value={flavor} onChange={value => pick({ flavor: value })} missing={tried && missingFlavor} />}
                    <div className="purchase-product-price">
                        {!purchasable ? <><small>Preço</small><strong>Preço não informado</strong></>
                            : price ? <><small>Preço por unidade</small><strong>{money(price)}</strong></>
                                : <><small>A partir de</small><strong>{money(lowest)}</strong></>}
                    </div>
                    <div className="purchase-product-actions"><button className="purchase-primary" disabled={!purchasable} onClick={() => buy(true)}>Comprar agora <ArrowRight size={18} /></button><button className="purchase-secondary" disabled={!purchasable} onClick={() => buy(false)}><ShoppingBag size={18} /> Adicionar ao carrinho</button></div>
                    <p className="purchase-hint">Adicione ao carrinho e continue escolhendo seus produtos.</p><Link to="/carrinho" className="purchase-text-link">Ver meu carrinho</Link>
                </div>
            </div>}
    </div></section></StoreLayout>;
}
