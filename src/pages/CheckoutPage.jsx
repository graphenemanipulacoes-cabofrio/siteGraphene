import { useState } from 'react';
import { Link } from 'react-router-dom';
import { CreditCard, LoaderCircle, LockKeyhole, MapPin, ShoppingBag, UserRound } from 'lucide-react';
import StoreLayout from '../components/StoreLayout';
import { useStore } from '../context/StoreContext';
import { commerceStyles } from './CartPage';
import { supabase } from '../lib/supabaseClient';

const money = value => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const CheckoutPage = () => {
    const { cart, subtotal, customer, authReady, clearCart } = useStore();
    const [form, setForm] = useState({ name: '', cpf: '', phone: '', zip: '', address: '', number: '', complement: '' });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [checkoutKey] = useState(() => crypto.randomUUID());
    const setField = event => setForm(current => ({ ...current, [event.target.name]: event.target.value }));

    const submit = async event => {
        event.preventDefault();
        setLoading(true);
        setError('');
        const { data, error: invokeError } = await supabase.functions.invoke('create-checkout', { body: {
            checkoutKey,
            items: cart.map(item => ({ productId: item.id, quantity: item.quantity })),
            shipping: { name: form.name, phone: form.phone, zip: form.zip, address: form.address, number: form.number, complement: form.complement },
            payerDocument: form.cpf,
        }});

        if (invokeError || !data?.paymentUrl) {
            const messages = {
                payment_provider_not_configured: 'O pagamento ainda não foi ativado pela loja.',
                invalid_document: 'Digite um CPF válido com 11 números.',
                invalid_or_unpriced_product: 'Um dos produtos precisa ter o preço atualizado antes da compra.',
                unable_to_create_order: 'Não foi possível validar os produtos deste pedido.',
            };
            setError(messages[data?.error] || 'Não foi possível iniciar o pagamento. Tente novamente.');
            setLoading(false);
            return;
        }

        clearCart();
        window.location.assign(data.paymentUrl);
    };

    if (!authReady) return <StoreLayout><section className="checkout-gate">Validando sua conta...</section><style>{checkoutStyles}</style></StoreLayout>;
    if (!customer) return <StoreLayout><section className="checkout-gate"><UserRound size={40}/><h1>Entre para finalizar sua compra</h1><p>O login protege seus dados, seus pedidos e o acesso ao pagamento.</p><Link to="/entrar" state={{ returnTo: '/checkout', intent: 'checkout' }} className="btn-cta-blue">Entrar ou criar conta</Link></section><style>{checkoutStyles}</style></StoreLayout>;
    if (!cart.length) return <StoreLayout><section className="commerce-page"><div className="container"><div className="empty-state store-card"><ShoppingBag size={38}/><h1>Seu carrinho está vazio</h1><Link className="btn-cta-blue" to="/#produtos">Escolher produtos</Link></div></div></section><style>{commerceStyles}</style></StoreLayout>;

    return <StoreLayout><section className="checkout-page"><div className="container checkout-container">
        <div className="checkout-title"><span className="eyebrow">Checkout seguro</span><h1>Finalizar pedido</h1><p>Compra protegida para {customer.email}</p></div>
        <div className="checkout-layout"><form className="checkout-form store-card" onSubmit={submit}>
            <section><h2><MapPin size={19}/> Dados de entrega</h2><div className="form-grid">
                <label className="form-span-2">Nome completo<input name="name" autoComplete="name" maxLength="120" value={form.name} onChange={setField} required /></label>
                <label>CPF<input name="cpf" inputMode="numeric" autoComplete="off" maxLength="14" value={form.cpf} onChange={setField} required /></label>
                <label>WhatsApp<input name="phone" inputMode="tel" autoComplete="tel" maxLength="24" value={form.phone} onChange={setField} required /></label>
                <label>CEP<input name="zip" inputMode="numeric" autoComplete="postal-code" maxLength="12" value={form.zip} onChange={setField} required /></label>
                <label className="form-span-2">Endereço<input name="address" autoComplete="street-address" maxLength="180" value={form.address} onChange={setField} required /></label>
                <label>Número<input name="number" maxLength="20" value={form.number} onChange={setField} required /></label>
                <label>Complemento<input name="complement" maxLength="80" value={form.complement} onChange={setField} /></label>
            </div></section>
            <section className="payment-placeholder"><h2><CreditCard size={19}/> Pagamento protegido</h2><div><strong>PIX e cartão pelo Mercado Pago</strong><p>Os dados do cartão são preenchidos no ambiente seguro do Mercado Pago. A Graphène não recebe nem armazena o número do cartão.</p></div></section>
            {error && <div className="checkout-error" role="alert">{error}</div>}
            <button className="place-order" type="submit" disabled={loading}>{loading ? <LoaderCircle className="spin" size={18}/> : <LockKeyhole size={17}/>} {loading ? 'Criando pagamento seguro...' : `Ir para o pagamento de ${money(subtotal)}`}</button>
            <small>O valor é recalculado com os preços oficiais do banco antes de gerar a cobrança.</small>
        </form><aside className="checkout-summary store-card"><h2>Seu pedido</h2>{cart.map(item => <div className="checkout-line" key={item.id}><img src={item.image_url} alt=""/><span>{item.quantity}× {item.name}</span><strong>{item.price ? money(item.price * item.quantity) : '—'}</strong></div>)}<div className="checkout-total"><span>Subtotal</span><strong>{money(subtotal)}</strong></div></aside></div>
    </div></section><style>{checkoutStyles}</style></StoreLayout>;
};

const checkoutStyles = `
.checkout-gate{min-height:65vh;padding:60px 20px;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;gap:12px}.checkout-gate svg{color:var(--brand-blue)}.checkout-gate p{max-width:470px}.checkout-page{padding:48px 0 76px;min-height:70vh;background:radial-gradient(circle at 80% 0,rgba(0,180,216,.08),transparent 32%)}.checkout-container{max-width:1060px}.checkout-title{margin-bottom:26px}.checkout-title h1{font-size:clamp(2rem,4vw,2.8rem);margin:4px 0 7px}.checkout-title p{font-size:.9rem}.checkout-layout{display:grid;grid-template-columns:minmax(0,1fr) 330px;gap:22px;align-items:start}.checkout-form{padding:28px}.checkout-form section+section{margin-top:28px;padding-top:25px;border-top:1px solid var(--border-subtle)}.checkout-form h2,.checkout-summary h2{display:flex;gap:8px;align-items:center;font-size:1.08rem;margin-bottom:18px}.form-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px}.form-grid label{display:grid;gap:6px;font-size:.78rem;font-weight:700;color:var(--text-dim)}.form-grid input{padding:12px;border-radius:9px;border:1px solid var(--border-card);background:rgba(255,255,255,.04);color:#fff;outline:none}.form-grid input:focus{border-color:var(--brand-blue)}.form-span-2{grid-column:span 2}.payment-placeholder>div{border:1px solid var(--border-blue);padding:16px;border-radius:10px;background:rgba(0,180,216,.05)}.payment-placeholder strong{font-size:.88rem;color:#fff}.payment-placeholder p{font-size:.78rem;line-height:1.5;margin-top:4px}.checkout-error{margin-top:20px;padding:12px;border-radius:9px;background:rgba(248,113,113,.1);border:1px solid rgba(248,113,113,.25);color:#fca5a5;font-size:.82rem}.place-order{width:100%;margin-top:25px;display:flex;justify-content:center;align-items:center;gap:8px;border:0;border-radius:10px;padding:15px;background:var(--brand-green);color:#fff;font-weight:800;cursor:pointer}.place-order:disabled{opacity:.65;cursor:wait}.checkout-form>small{display:block;text-align:center;color:var(--text-muted);font-size:.7rem;margin-top:13px}.checkout-summary{padding:22px}.checkout-line{display:grid;grid-template-columns:42px 1fr auto;gap:9px;align-items:center;padding:11px 0;border-bottom:1px solid var(--border-subtle);font-size:.77rem;color:var(--text-dim)}.checkout-line img{width:42px;height:42px;object-fit:contain;background:#fff;border-radius:6px}.checkout-line strong{font-size:.77rem;color:#fff}.checkout-total{display:flex;justify-content:space-between;padding-top:18px}.checkout-total strong{font-size:1.2rem}@media(max-width:760px){.checkout-page{padding:34px 0 56px}.checkout-layout{grid-template-columns:1fr}.checkout-summary{grid-row:1}.checkout-form{padding:19px 15px}.form-grid{gap:10px}}
`;

export default CheckoutPage;
