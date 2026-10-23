import { Link } from 'react-router-dom';
import { Minus, Plus, ShoppingBag, Trash2, ArrowRight, ArrowLeft, LockKeyhole, MessageCircle } from 'lucide-react';
import StoreLayout from '../components/StoreLayout';
import PurchaseSteps from '../components/PurchaseSteps';
import { FreeShippingProgress, ShippingEstimator } from '../components/ShippingEstimator';
import { useStore } from '../context/StoreContext';
import { money } from '../utils/commerce';
import { variantText } from '../utils/productOptions';
import { WHATSAPP_URL, deliveryText, useShippingConfig, useShippingQuote } from '../utils/shipping';
import '../styles/purchase.css';

export default function CartPage() {
    const { cart, subtotal, itemCount, updateQuantity, removeItem, zip } = useStore();
    const config = useShippingConfig();
    const { quote } = useShippingQuote(zip, subtotal);
    const delivery = deliveryText(quote);
    const invalidPrice = cart.some(item => !(Number(item.price) > 0));
    const shipping = quote?.ok ? Number(quote.amount) || 0 : null;
    const total = subtotal + (shipping || 0);
    return <StoreLayout><section className="purchase-page"><div className="purchase-container">
        <Link to="/#produtos" className="purchase-back"><ArrowLeft size={16} /> Continuar comprando</Link>
        <PurchaseSteps current={1} />
        <div className="purchase-heading"><div><h1>Meu carrinho</h1><p>{cart.length ? 'Confira os produtos e calcule o frete. Você revisa tudo antes de pagar.' : ''}</p></div>{cart.length > 0 && <span>{itemCount} {itemCount === 1 ? 'unidade' : 'unidades'}</span>}</div>
        {!cart.length ? <div className="purchase-empty"><ShoppingBag size={36} /><h2>Seu carrinho está vazio</h2><p>Escolha seus produtos e adicione tudo o que precisar por aqui.</p><Link to="/#produtos" className="purchase-primary">Ver produtos <ArrowRight size={18} /></Link></div> :
            <div className="purchase-layout"><div className="purchase-cart-main">
                <div className="purchase-card purchase-items">
                    {cart.map(item => <article className="purchase-item" key={item.key}>
                        <Link to={`/produto/${item.id}`} className="purchase-thumbnail"><img src={item.image_url || '/assets/logo.png'} alt="" /></Link>
                        <div className="purchase-item-body"><Link to={`/produto/${item.id}`}><h2>{item.name}</h2></Link>{variantText(item) && <p className="purchase-variant">{variantText(item)}</p>}<p>{Number(item.price) > 0 ? `${money(item.price)} cada` : 'Preço não informado'}</p>
                            <div className="purchase-item-controls"><div className="purchase-quantity"><button disabled={item.quantity <= 1} onClick={() => updateQuantity(item.key, item.quantity - 1)} aria-label={`Diminuir unidades de ${item.name}`}><Minus size={16} /></button><output aria-label={`Unidades de ${item.name}`}>{item.quantity}</output><button disabled={item.quantity >= 20} onClick={() => updateQuantity(item.key, item.quantity + 1)} aria-label={`Aumentar unidades de ${item.name}`}><Plus size={16} /></button></div><button className="purchase-remove" onClick={() => removeItem(item.key)} aria-label={`Remover ${item.name}`}><Trash2 size={16} /><span>Remover</span></button></div>
                            {item.quantity >= 20 && <small>Limite de 20 unidades por produto.</small>}
                        </div><strong className="purchase-item-total">{Number(item.price) > 0 ? money(item.price * item.quantity) : '—'}</strong>
                    </article>)}
                </div>
                <p className="purchase-help"><MessageCircle size={16} aria-hidden="true" /> Ficou com dúvida sobre algum produto? <a href={WHATSAPP_URL} target="_blank" rel="noreferrer">Fale com um farmacêutico</a>.</p>
            </div>
            <aside className="purchase-card purchase-summary"><h2>Resumo</h2>
                {!quote?.local && <FreeShippingProgress subtotal={subtotal} freeMin={config?.free_min} />}
                <div className="purchase-amount"><span>Produtos ({itemCount})</span><strong>{money(subtotal)}</strong></div>
                <div className="purchase-amount"><span>Frete{delivery && !quote.local ? ` · ${quote.uf}` : ''}</span><strong>{!quote?.ok ? 'Informe o CEP' : quote.local ? 'A combinar' : shipping === 0 ? 'Grátis' : money(shipping)}</strong></div>
                <ShippingEstimator subtotal={subtotal} compact />
                <div className="purchase-amount purchase-total"><span>{quote?.ok ? 'Total' : 'Total sem frete'}</span><strong>{money(total)}</strong></div>
                {invalidPrice ? <p className="purchase-error" role="alert">Remova os produtos sem preço para continuar.</p> : <Link to="/checkout" className="purchase-primary">Continuar para entrega <ArrowRight size={18} /></Link>}
                <p className="purchase-hint"><LockKeyhole size={14} /> Pagamento seguro pelo Mercado Pago. Cupom de desconto na próxima etapa.</p>
                <Link to="/#produtos" className="purchase-continue">Escolher mais produtos</Link>
            </aside></div>}
    </div></section></StoreLayout>;
}
