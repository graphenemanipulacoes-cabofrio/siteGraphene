import { Link } from 'react-router-dom';
import { Minus, Plus, ShoppingBag, Trash2, ArrowRight, ArrowLeft, LockKeyhole } from 'lucide-react';
import StoreLayout from '../components/StoreLayout';
import PurchaseSteps from '../components/PurchaseSteps';
import { useStore } from '../context/StoreContext';
import { money } from '../utils/commerce';
import '../styles/purchase.css';

export default function CartPage() {
    const { cart, subtotal, itemCount, updateQuantity, removeItem } = useStore();
    const invalidPrice = cart.some(item => !(Number(item.price) > 0));
    return <StoreLayout><section className="purchase-page"><div className="purchase-container">
        <Link to="/#produtos" className="purchase-back"><ArrowLeft size={16} /> Continuar comprando</Link>
        <PurchaseSteps current={1} />
        <div className="purchase-heading"><div><span className="purchase-eyebrow">Sua seleção</span><h1>Meu carrinho</h1></div><span>{itemCount} {itemCount === 1 ? 'item' : 'itens'}</span></div>
        {!cart.length ? <div className="purchase-empty"><ShoppingBag size={36} /><h2>Seu carrinho está vazio</h2><p>Escolha seus produtos e adicione tudo o que precisar por aqui.</p><Link to="/#produtos" className="purchase-primary">Explorar produtos <ArrowRight size={18} /></Link></div> :
            <div className="purchase-layout"><div className="purchase-card purchase-items">
                <div className="purchase-list-heading"><span>Produto</span><span>Total</span></div>
                {cart.map(item => <article className="purchase-item" key={item.id}>
                    <Link to={`/produto/${item.id}`} className="purchase-thumbnail"><img src={item.image_url || '/assets/logo.png'} alt={item.name} /></Link>
                    <div className="purchase-item-body"><Link to={`/produto/${item.id}`}><h2>{item.name}</h2></Link><p>{Number(item.price) > 0 ? `${money(item.price)} por unidade` : 'Preço não informado'}</p>
                        <div className="purchase-item-controls"><div className="purchase-quantity"><button disabled={item.quantity <= 1} onClick={() => updateQuantity(item.id, item.quantity - 1)} aria-label={`Diminuir quantidade de ${item.name}`}><Minus size={16} /></button><output aria-label={`Quantidade de ${item.name}`}>{item.quantity}</output><button disabled={item.quantity >= 20} onClick={() => updateQuantity(item.id, item.quantity + 1)} aria-label={`Aumentar quantidade de ${item.name}`}><Plus size={16} /></button></div><button className="purchase-remove" onClick={() => removeItem(item.id)} aria-label={`Remover ${item.name}`}><Trash2 size={16} /><span>Remover</span></button></div>
                        {item.quantity >= 20 && <small>Limite de 20 unidades por produto.</small>}
                    </div><strong className="purchase-item-total">{Number(item.price) > 0 ? money(item.price * item.quantity) : '—'}</strong>
                </article>)}
            </div><aside className="purchase-card purchase-summary"><h2>Resumo do pedido</h2><div className="purchase-amount"><span>Produtos ({itemCount})</span><strong>{money(subtotal)}</strong></div><p className="purchase-hint">Tem um cupom? Informe na próxima etapa.</p><div className="purchase-amount purchase-total"><span>Subtotal</span><strong>{money(subtotal)}</strong></div>
                {invalidPrice ? <p className="purchase-error" role="alert">Remova os produtos sem preço para continuar.</p> : <Link to="/checkout" className="purchase-primary">Continuar para entrega <ArrowRight size={18} /></Link>}
                <p className="purchase-hint"><LockKeyhole size={14} /> Pagamento pelo Mercado Pago</p><Link to="/#produtos" className="purchase-continue">Escolher mais produtos</Link>
            </aside></div>}
    </div></section></StoreLayout>;
}
