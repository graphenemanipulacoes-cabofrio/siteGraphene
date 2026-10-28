import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ShoppingBag, ArrowRight, Minus, Plus, FlaskConical, ShieldCheck, MessageCircle, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '../lib/supabaseClient';
import StoreLayout from '../components/StoreLayout';
import { ShippingEstimator } from '../components/ShippingEstimator';
import RelatedProducts from '../components/RelatedProducts';
import ProductCoupon from '../components/ProductCoupon';
import { useCoupon } from '../context/CouponContext';
import { couponRate, discountedPrice, percentLabel } from '../lib/couponsApi';
import { useStore } from '../context/StoreContext';
import { money } from '../utils/commerce';
import { resolveProductImage } from '../utils/productImages';
import { NATURAL_FLAVOR, flavorName, productOptions, useFlavors, variantPrice } from '../utils/productOptions';
import { STORE_ADDRESS, WHATSAPP_URL, useShippingConfig } from '../utils/shipping';
import { useProductSeo } from '../components/SeoManager';
import '../styles/purchase.css';

// Escolha obrigatória de quantidade e sabor (quando o produto tiver).
function OptionGroup({ legend, name, items, value, onChange, missing }) {
    return <fieldset className={`purchase-options${missing ? ' is-missing' : ''}`}>
        <legend>{legend}</legend>
        <div className="purchase-option-list">
            {items.map(item => <label key={item.id} className={`purchase-option${value === item.id ? ' is-selected' : ''}`}>
                <input type="radio" name={name} value={item.id} checked={value === item.id} onChange={() => onChange(item.id)} />
                <span>{item.label}</span>
                {item.detail && <small>{item.detail}</small>}
            </label>)}
        </div>
        {missing && <p className="purchase-option-error" role="alert">{name === 'quantidade' ? 'Escolha a quantidade.' : 'Escolha o sabor.'}</p>}
    </fieldset>;
}

export default function ProductPage() {
    const { id } = useParams();
    const location = useLocation();
    const { addItem } = useStore();
    const navigate = useNavigate();
    const catalog = useFlavors();
    const config = useShippingConfig();
    const { coupon } = useCoupon();
    const [result, setResult] = useState({ id: null, product: null, error: '' });
    // A escolha feita no cartão da vitrine chega já marcada.
    const [choice, setChoice] = useState(() => ({ id, size: location.state?.size || null, flavor: location.state?.flavor || null }));
    const [units, setUnits] = useState(1);
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
    const size = (selected.size && options.availableSizes.some(item => item.id === selected.size) ? selected.size : null) || (options.availableSizes.length === 1 ? options.availableSizes[0].id : null);
    const flavorIds = [...(options.natural ? [NATURAL_FLAVOR] : []), ...options.flavors.filter(flavor => !catalog.length || catalog.some(item => item.id === flavor))];
    const flavor = (selected.flavor && flavorIds.includes(selected.flavor) ? selected.flavor : null) || (flavorIds.length === 1 ? flavorIds[0] : null);
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
    const sizeLabel = options.availableSizes.find(item => item.id === size)?.label;
    const medical = /orienta[cç][aã]o m[eé]dica|prescri/i.test(product?.description || '');

    const buy = checkout => {
        if (!purchasable) return;
        if (missingSize || missingFlavor) {
            setTried(true);
            document.querySelector('.purchase-options.is-missing, .purchase-options')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            return;
        }
        const added = addItem({ ...product, image_url: resolveProductImage(product) }, {
            size, sizeLabel, flavor, flavorLabel: flavor ? flavorName(catalog, flavor) : null, price,
        }, units);
        if (!added) return;
        if (checkout) { navigate('/carrinho'); return; }
        toast.success('Adicionado ao carrinho', {
            description: [`${units}× ${product.name}`, sizeLabel, flavor && flavorName(catalog, flavor)].filter(Boolean).join(' · '),
            action: { label: 'Ver carrinho', onClick: () => navigate('/carrinho') }, duration: 4000,
        });
    };

    const missingNow = tried && (missingSize || missingFlavor);
    // Cupom de desconto: preço deste produto já com o desconto (o checkout confirma o valor final).
    const rate = product ? couponRate(coupon, product.id) : 0;
    const off = value => rate > 0 ? discountedPrice(value, rate) : value;
    const priceLabel = !purchasable ? 'Consulte o valor' : price ? money(off(price)) : `A partir de ${money(off(lowest))}`;

    return <StoreLayout><section className="purchase-page product-page"><div className="purchase-container">
        <Link to="/#produtos" className="purchase-back"><ArrowLeft size={16} /> Continuar comprando</Link>
        {!product ? <div className="purchase-empty" role="status"><h1>{result.id === id ? result.error : 'Carregando produto…'}</h1><Link to="/#produtos">Ver produtos</Link></div> :
            <div className="purchase-product">
                <div className="purchase-product-photo"><img src={resolveProductImage(product)} alt={product.name} /></div>
                <div className="purchase-product-panel">
                    <span className="purchase-eyebrow">Manipulado pela Graphène · Cabo Frio, RJ</span>
                    <h1>{product.name}</h1>
                    {product.description && <p className="purchase-description">{product.description}</p>}
                    {medical && <p className="purchase-medical">Produto de uso orientado por profissional de saúde. Em caso de dúvida, fale com nosso farmacêutico antes de comprar.</p>}

                    {purchasable && sizeItems.length > 0 && <OptionGroup legend="1. Quantidade" name="quantidade" items={sizeItems} value={size} onChange={value => pick({ size: value })} missing={tried && missingSize} />}
                    {purchasable && flavorItems.length > 0 && <OptionGroup legend={`${sizeItems.length ? '2' : '1'}. Sabor`} name="sabor" items={flavorItems} value={flavor} onChange={value => pick({ flavor: value })} missing={tried && missingFlavor} />}

                    <div className="purchase-buybox">
                        <div className="purchase-buybox-price">
                            <small>{price ? 'Preço por unidade' : purchasable ? 'Escolha as opções para ver o preço' : 'Preço'}</small>
                            {rate > 0 && purchasable && <span className="purchase-price-old">{price ? money(price) : `A partir de ${money(lowest)}`}</span>}
                            <strong>{priceLabel}</strong>
                            {rate > 0 && purchasable && <span className="purchase-coupon-tag">−{percentLabel(rate)} com o cupom {coupon.code}</span>}
                            {[sizeLabel, flavor && flavorName(catalog, flavor)].filter(Boolean).length > 0 && <span>{[sizeLabel, flavor && flavorName(catalog, flavor)].filter(Boolean).join(' · ')}</span>}
                        </div>
                        {purchasable && <div className="purchase-units">
                            <span id="units-label">Unidades</span>
                            <div className="purchase-quantity" role="group" aria-labelledby="units-label">
                                <button type="button" disabled={units <= 1} onClick={() => setUnits(value => value - 1)} aria-label="Diminuir unidades"><Minus size={16} /></button>
                                <output aria-live="polite">{units}</output>
                                <button type="button" disabled={units >= 20} onClick={() => setUnits(value => value + 1)} aria-label="Aumentar unidades"><Plus size={16} /></button>
                            </div>
                        </div>}
                        {price && units > 1 && <p className="purchase-buybox-total">Total: <strong>{money(off(price) * units)}</strong></p>}
                        {missingNow && <p className="purchase-option-error" role="alert">Escolha {[missingSize && 'a quantidade', missingFlavor && 'o sabor'].filter(Boolean).join(' e ')} para continuar.</p>}
                        {product && purchasable && <ProductCoupon productId={product.id} />}
                        <div className="purchase-product-actions">
                            {purchasable ? <button className="purchase-primary" onClick={() => buy(true)}>Comprar <ArrowRight size={18} /></button> : <a className="purchase-primary" href={`${WHATSAPP_URL}?text=${encodeURIComponent(`Olá! Gostaria de consultar o valor de ${product.name}.`)}`} target="_blank" rel="noreferrer">Consultar valor <MessageCircle size={18} /></a>}
                            {purchasable && <button className="purchase-secondary" onClick={() => buy(false)}><ShoppingBag size={18} /> Adicionar ao carrinho e continuar comprando</button>}
                        </div>
                        {Number(config?.free_min) > 0 && purchasable && <p className="purchase-free-note">Frete grátis em compras a partir de {money(config.free_min)}.</p>}
                    </div>

                    {purchasable && <ShippingEstimator subtotal={(price || lowest || 0) * units} />}

                    <ul className="purchase-trust">
                        <li><FlaskConical size={18} aria-hidden="true" /><span><strong>Manipulado no nosso laboratório</strong> em Cabo Frio, com farmacêutico responsável.</span></li>
                        <li><ShieldCheck size={18} aria-hidden="true" /><span><strong>Pagamento seguro</strong> pelo Mercado Pago: Pix ou cartão de crédito.</span></li>
                        <li><MessageCircle size={18} aria-hidden="true" /><span><strong>Dúvidas?</strong> <a href={`${WHATSAPP_URL}?text=${encodeURIComponent(`Olá! Tenho uma dúvida sobre ${product.name}.`)}`} target="_blank" rel="noreferrer">Fale com um farmacêutico no WhatsApp</a>.</span></li>
                    </ul>

                    <div className="purchase-details">
                        <details><summary>Entrega e prazos <ChevronDown size={16} aria-hidden="true" /></summary>
                            <p>Enviamos para todo o Brasil. Informe seu CEP acima para ver o valor e o prazo de entrega antes de comprar.</p>
                            <p>Na Região dos Lagos, a entrega é feita por motoboy ou você pode retirar na loja: {STORE_ADDRESS}. Depois da compra, a equipe combina o melhor jeito com você pelo WhatsApp.</p>
                        </details>
                        <details><summary>Pagamento <ChevronDown size={16} aria-hidden="true" /></summary>
                            <p>O pagamento é feito no ambiente seguro do Mercado Pago, com Pix ou cartão de crédito. As condições de parcelamento aparecem lá, antes de você confirmar.</p>
                            <p>Você confere produtos, entrega e valor total antes de pagar.</p>
                        </details>
                    </div>
                </div>
            </div>}
        {product && <RelatedProducts product={product} />}
    </div>
        {product && purchasable && <div className="purchase-sticky" aria-hidden={false}>
            <div><small>{price ? `${units}× ${sizeLabel || ''}${flavor ? ` · ${flavorName(catalog, flavor)}` : ''}` : 'A partir de'}</small><strong>{price ? money(off(price) * units) : money(off(lowest))}</strong></div>
            <button className="purchase-primary" onClick={() => buy(true)}>Comprar <ArrowRight size={18} /></button>
        </div>}
    </section></StoreLayout>;
}
