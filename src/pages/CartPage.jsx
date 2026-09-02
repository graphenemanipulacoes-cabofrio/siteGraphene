import { Link } from 'react-router-dom';
import { Minus, Plus, ShoppingBag, Trash2, ArrowRight, ShieldCheck } from 'lucide-react';
import StoreLayout from '../components/StoreLayout';
import { useStore } from '../context/StoreContext';

const money = value => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const CartPage = () => {
    const { cart, subtotal, updateQuantity, removeItem } = useStore();

    return (
        <StoreLayout>
            <section className="commerce-page">
                <div className="container commerce-container">
                    <div className="commerce-heading"><span className="eyebrow">Sua seleção</span><h1>Sacola de compras</h1></div>
                    {cart.length === 0 ? (
                        <div className="empty-state store-card"><ShoppingBag size={38} /><h2>Sua sacola está vazia</h2><p>Descubra fórmulas e suplementos selecionados para a sua rotina.</p><Link to="/#produtos" className="btn-cta-blue">Ver produtos <ArrowRight size={17} /></Link></div>
                    ) : (
                        <div className="cart-layout">
                            <div className="cart-items store-card">
                                {cart.map(item => <article className="cart-item" key={item.id}>
                                    <img src={item.image_url} alt={item.name} />
                                    <div className="cart-item-info"><h2>{item.name}</h2>{item.price && <strong>{money(item.price)}</strong>}<div className="quantity-control"><button onClick={() => updateQuantity(item.id, item.quantity - 1)} aria-label="Diminuir quantidade"><Minus size={15} /></button><span>{item.quantity}</span><button onClick={() => updateQuantity(item.id, item.quantity + 1)} aria-label="Aumentar quantidade"><Plus size={15} /></button></div></div>
                                    <button className="remove-item" onClick={() => removeItem(item.id)} aria-label={`Remover ${item.name}`}><Trash2 size={18} /></button>
                                </article>)}
                            </div>
                            <aside className="order-summary store-card"><h2>Resumo do pedido</h2><div><span>Produtos</span><strong>{money(subtotal)}</strong></div><div><span>Frete</span><small>Calculado no checkout</small></div><div className="summary-total"><span>Subtotal</span><strong>{money(subtotal)}</strong></div><Link to="/checkout" className="checkout-link">Ir para checkout <ArrowRight size={17} /></Link><p><ShieldCheck size={15} /> Seus dados são protegidos.</p></aside>
                        </div>
                    )}
                </div>
            </section>
            <style>{commerceStyles}</style>
        </StoreLayout>
    );
};

export const commerceStyles = `
.commerce-page{min-height:70vh;padding:54px 0 80px;background:radial-gradient(circle at 80% 0,rgba(0,180,216,.10),transparent 32%)}.commerce-container{max-width:1040px}.commerce-heading{margin-bottom:28px}.eyebrow{display:block;color:var(--brand-blue);text-transform:uppercase;font-size:.72rem;letter-spacing:.12em;font-weight:800;margin-bottom:6px}.commerce-heading h1{font-size:clamp(2rem,4vw,3rem)}.cart-layout{display:grid;grid-template-columns:minmax(0,1fr) 330px;gap:22px;align-items:start}.cart-items{overflow:hidden}.cart-item{display:flex;gap:18px;padding:18px;border-bottom:1px solid var(--border-subtle);align-items:center}.cart-item:last-child{border:0}.cart-item img{width:88px;height:88px;object-fit:contain;background:#fff;border-radius:10px}.cart-item-info{flex:1}.cart-item-info h2,.order-summary h2{font-size:1rem;margin-bottom:6px}.cart-item-info strong{color:#fff}.quantity-control{display:inline-flex;align-items:center;gap:15px;border:1px solid var(--border-card);border-radius:999px;padding:4px 7px;margin-top:13px}.quantity-control button,.remove-item{border:0;background:transparent;color:var(--text-dim);display:grid;place-items:center;cursor:pointer}.quantity-control button{width:23px;height:23px;border-radius:50%;background:rgba(255,255,255,.06)}.quantity-control span{min-width:12px;text-align:center;font-weight:700}.remove-item{padding:8px;color:#f87171}.order-summary{padding:23px}.order-summary>div{display:flex;justify-content:space-between;align-items:center;padding:13px 0;border-bottom:1px solid var(--border-subtle);font-size:.9rem;color:var(--text-dim)}.order-summary small{color:var(--text-muted)}.order-summary .summary-total{padding-top:18px;border:0;color:#fff;font-size:1rem}.summary-total strong{font-size:1.3rem}.checkout-link{width:100%;display:flex;justify-content:center;align-items:center;gap:8px;background:var(--brand-green);padding:14px;border-radius:var(--radius-sm);font-weight:800;color:#fff;margin-top:8px}.order-summary p{font-size:.74rem;display:flex;gap:6px;align-items:center;justify-content:center;margin-top:15px;color:var(--text-muted)}.empty-state{padding:64px 24px;display:flex;flex-direction:column;align-items:center;text-align:center;gap:12px}.empty-state svg{color:var(--brand-blue)}.empty-state h2{font-size:1.3rem}.empty-state .btn-cta-blue{margin-top:8px}@media(max-width:760px){.commerce-page{padding:34px 0 56px}.cart-layout{grid-template-columns:1fr}.order-summary{position:static}.cart-item{gap:12px;padding:14px}.cart-item img{width:70px;height:70px}.cart-item-info h2{font-size:.9rem}}
`;

export default CartPage;
