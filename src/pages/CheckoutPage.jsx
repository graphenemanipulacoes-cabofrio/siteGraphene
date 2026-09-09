import { useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ArrowLeft, ArrowRight, CreditCard, LockKeyhole, LoaderCircle, MapPin, UserRound, Check } from 'lucide-react';
import StoreLayout from '../components/StoreLayout';
import PurchaseSteps from '../components/PurchaseSteps';
import { useStore } from '../context/StoreContext';
import { supabase } from '../lib/supabaseClient';
import { money, validCpf } from '../utils/commerce';
import { isAdminPreview } from '../utils/adminPreview';
import '../styles/purchase.css';

const messages = {
    authentication_required: 'Sua sessão expirou. Entre novamente para continuar.',
    invalid_document: 'Confira o CPF informado.',
    invalid_cart: 'Revise as quantidades no carrinho. O limite é de 20 unidades por produto.',
    invalid_shipping: 'Confira os dados de entrega.',
    invalid_or_unpriced_product: 'Um dos produtos não tem preço para compra. Revise o carrinho.',
    unable_to_create_order: 'Não foi possível validar o pedido. Revise os produtos e tente novamente.',
    invalid_coupon: 'Este cupom não está disponível. Confira o código ou continue sem ele.',
    coupon_minimum_not_reached: 'O valor mínimo para usar este cupom não foi atingido.',
    payment_provider_not_configured: 'O pagamento está temporariamente indisponível. Tente novamente mais tarde.',
    payment_provider_credentials_invalid: 'O pagamento está temporariamente indisponível. Tente novamente mais tarde.',
    payment_provider_request_rejected: 'Não foi possível gerar o pagamento. Confira seus dados.',
    payment_provider_unavailable: 'O Mercado Pago está temporariamente indisponível. Tente novamente em instantes.',
};

export default function CheckoutPage() {
    const { cart, subtotal, itemCount, customer, authReady } = useStore();
    const location = useLocation();
    const preview = isAdminPreview(location.search);
    const [form, setForm] = useState({ name: customer?.user_metadata?.full_name || '', cpf: '', phone: '', zip: '', address: '', number: '', complement: '', neighborhood: '', city: '', state: '' });
    const [couponCode, setCouponCode] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [review, setReview] = useState(null);
    const attempt = useRef(null);
    const busy = useRef(false);
    const errorRef = useRef(null);
    const headingRef = useRef(null);
    const field = event => setForm(current => ({ ...current, [event.target.name]: event.target.value }));
    const showError = message => {
        setError(message);
        requestAnimationFrame(() => errorRef.current?.focus());
    };

    const submit = async event => {
        event.preventDefault();
        if (preview && !customer) return;
        if (busy.current) return;
        if (!validCpf(form.cpf)) { showError('Confira seu CPF: informe os 11 números de um CPF válido.'); return; }
        if (!/^\d{8}$/.test(form.zip.replace(/\D/g, ''))) { showError('Confira seu CEP: ele deve ter 8 números.'); return; }
        if (!/^\d{10,11}$/.test(form.phone.replace(/\D/g, ''))) { showError('Informe seu telefone com DDD, com 10 ou 11 números.'); return; }
        busy.current = true;
        setLoading(true);
        setError('');
        try {
            let { data: sessionData, error: sessionError } = await supabase.auth.getSession();
            let session = sessionData?.session;
            if (session?.expires_at && session.expires_at * 1000 - Date.now() < 60_000) {
                const refreshed = await supabase.auth.refreshSession();
                session = refreshed.data?.session;
            }
            if (sessionError || !session?.access_token) throw new Error(messages.authentication_required);
            const body = {
                items: cart.map(item => ({ productId: item.id, quantity: item.quantity })),
                shipping: { ...form, cpf: undefined, address: `${form.address.trim()}, ${form.neighborhood.trim()} — ${form.city.trim()}/${form.state}` },
                payerDocument: form.cpf.replace(/\D/g, ''), couponCode: couponCode.trim().toUpperCase(),
            };
            const fingerprint = JSON.stringify(body);
            if (attempt.current?.fingerprint !== fingerprint) attempt.current = { fingerprint, key: crypto.randomUUID() };
            const { data, error: invokeError } = await supabase.functions.invoke('create-checkout', {
                body: { ...body, checkoutKey: attempt.current.key },
                headers: { Authorization: `Bearer ${session.access_token}` },
            });
            if (invokeError || !data?.paymentUrl) {
                let reason = data?.error;
                try { reason ||= (await invokeError?.context?.clone().json())?.error; } catch { /* Network errors may not carry JSON. */ }
                throw new Error(messages[reason] || 'Não foi possível preparar o pagamento. Seu carrinho foi mantido. Tente novamente.');
            }
            // Read the actual order through the customer's RLS-protected access.
            const { data: order, error: orderError } = await supabase.from('orders')
                .select('id,subtotal,discount_amount,discount_code,shipping_amount,total,order_items(product_id,product_name,unit_price,quantity)')
                .eq('id', data.orderId).single();
            if (orderError || !order) throw new Error('Não foi possível carregar o resumo final. Tente novamente para conferir o pedido.');
            const paymentUrl = new URL(data.paymentUrl);
            if (paymentUrl.protocol !== 'https:' || !(paymentUrl.hostname === 'mercadopago.com.br' || paymentUrl.hostname.endsWith('.mercadopago.com.br'))) throw new Error('Não foi possível abrir o ambiente de pagamento.');
            setReview({ ...order, paymentUrl: paymentUrl.href });
            requestAnimationFrame(() => headingRef.current?.focus());
        } catch (failure) {
            showError(failure.message || 'Não foi possível conectar. Tente novamente.');
        } finally {
            busy.current = false;
            setLoading(false);
        }
    };

    const proceed = () => {
        // Keep the cart until the payment is confirmed; returning or cancelling must not lose it.
        try { sessionStorage.setItem('graphene_payment_order', review.id); } catch { /* The provider also returns the order reference. */ }
        window.location.assign(review.paymentUrl);
    };
    const summaryItems = review?.order_items?.map(item => ({ ...item, id: item.product_id, name: item.product_name, price: Number(item.unit_price) })) || cart;
    const amount = review ? Number(review.total) : subtotal;
    const invalidPrice = cart.some(item => !(Number(item.price) > 0));

    return <StoreLayout><section className="purchase-page"><div className="purchase-container">
        <Link to="/carrinho" className="purchase-back"><ArrowLeft size={16} /> Voltar ao carrinho</Link>
        <PurchaseSteps current={review ? 3 : 2} />
        <div className="purchase-heading"><div><span className="purchase-eyebrow">Finalizar compra</span><h1 ref={headingRef} tabIndex={-1}>{review ? 'Confira seu pedido' : 'Para onde vamos enviar?'}</h1><p>{review ? 'Revise os valores antes de seguir para o pagamento.' : 'Preencha os dados de quem vai receber a compra.'}</p></div></div>
        {!authReady ? <div className="purchase-empty" role="status">Carregando sua conta…</div> : !cart.length && !preview ? <div className="purchase-empty"><h2>Seu carrinho está vazio</h2><Link to="/#produtos" className="purchase-primary">Escolher produtos</Link></div> : !customer && !preview ? <div className="purchase-card purchase-signin"><UserRound size={28}/><h2>Entre para concluir sua compra</h2><p>Seus {itemCount} {itemCount === 1 ? 'item está' : 'itens estão'} no carrinho. Use sua conta para informar a entrega e acompanhar o pedido.</p><Link className="purchase-primary" to="/entrar" state={{ returnTo: '/checkout', intent: 'checkout' }}>Entrar ou criar conta <ArrowRight size={18}/></Link><Link to="/#produtos" className="purchase-continue">Continuar comprando</Link></div> :
        <div className="purchase-layout">
            <div>
                {review ? <div className="purchase-card purchase-form">
                    <div className="purchase-section-title"><MapPin size={20}/><h2>Endereço de entrega</h2><button className="purchase-text-link" onClick={() => setReview(null)}>Editar dados</button></div>
                    <address className="purchase-address"><strong>{form.name}</strong><span>{form.address}, {form.number}{form.complement ? ` • ${form.complement}` : ''}</span><span>{form.neighborhood} • {form.city}/{form.state}</span><span>CEP {form.zip} • {form.phone}</span></address>
                    <div className="purchase-section-title purchase-divider"><CreditCard size={20}/><h2>Como você quer pagar?</h2></div>
                    <p>Escolha Pix ou cartão na próxima tela, no Mercado Pago.</p><div className="purchase-methods"><span>Pix</span><span>Cartão de crédito</span></div><p className="purchase-hint">As opções e condições de parcelamento aparecem antes de confirmar o pagamento.</p>
                    <p className="purchase-note"><Check size={18}/> Pedido preparado. O pagamento ainda não foi realizado.</p>
                </div> : <form id="purchase-delivery" className="purchase-card purchase-form" onSubmit={submit}>
                    <div className="purchase-section-title"><UserRound size={20}/><h2>Dados do destinatário</h2></div><p className="purchase-hint">{customer ? `Conta: ${customer.email}` : 'Visualização administrativa. Entre como cliente para realizar uma compra.'}</p>
                    <fieldset disabled={loading}><legend className="sr-only">Dados de entrega</legend><div className="purchase-fields">
                        <label className="purchase-full">Nome completo<input name="name" autoComplete="name" maxLength={120} value={form.name} onChange={field} required /></label>
                        <label>CPF<input name="cpf" inputMode="numeric" placeholder="000.000.000-00" maxLength={14} value={form.cpf} onChange={field} required /></label>
                        <label>Telefone com DDD<input name="phone" type="tel" autoComplete="tel" placeholder="(22) 99999-9999" maxLength={16} value={form.phone} onChange={field} required /></label>
                    </div>
                    <div className="purchase-section-title purchase-divider"><MapPin size={20}/><h2>Endereço de entrega</h2></div>
                    <div className="purchase-fields">
                        <label>CEP<input name="zip" inputMode="numeric" autoComplete="postal-code" placeholder="00000-000" maxLength={9} value={form.zip} onChange={field} required /></label><span />
                        <label className="purchase-full">Rua ou avenida<input name="address" autoComplete="address-line1" maxLength={85} value={form.address} onChange={field} required /></label>
                        <label>Número<input name="number" maxLength={20} placeholder="123 ou S/N" value={form.number} onChange={field} required /></label><label>Complemento <small>(opcional)</small><input name="complement" autoComplete="address-line2" placeholder="Apartamento, bloco…" maxLength={80} value={form.complement} onChange={field} /></label>
                        <label className="purchase-full">Bairro<input name="neighborhood" maxLength={40} value={form.neighborhood} onChange={field} required /></label>
                        <label>Cidade<input name="city" autoComplete="address-level2" maxLength={40} value={form.city} onChange={field} required /></label><label>Estado<select name="state" autoComplete="address-level1" value={form.state} onChange={field} required><option value="">Selecione</option>{'AC AL AP AM BA CE DF ES GO MA MT MS MG PA PB PR PE PI RJ RN RS RO RR SC SP SE TO'.split(' ').map(uf => <option key={uf}>{uf}</option>)}</select></label>
                    </div></fieldset>
                    <details className="purchase-coupon"><summary>Tenho um cupom de desconto</summary><label>Código do cupom<input disabled={loading} value={couponCode} onChange={e => setCouponCode(e.target.value.toUpperCase())} maxLength={40} placeholder="Digite seu cupom" /></label><p className="purchase-hint">O desconto aparecerá na revisão, antes do pagamento.</p></details>
                    {error && <div className="purchase-error" role="alert" tabIndex={-1} ref={errorRef}>{error}<Link to="/entrar" state={{ returnTo: '/checkout' }}>Acessar minha conta</Link></div>}
                </form>}
            </div>
            <aside className="purchase-card purchase-summary"><div className="purchase-section-title"><h2>Resumo do pedido</h2><Link to="/carrinho" className="purchase-text-link">Editar</Link></div>
                <div className="purchase-mini-items">{summaryItems.map(item => <div className="purchase-mini-item" key={item.id}><span><strong>{item.name}</strong><small>{item.quantity} × {money(item.price)}</small></span><b>{money(item.quantity * item.price)}</b></div>)}</div>
                <div className="purchase-amount"><span>Produtos</span><strong>{money(review?.subtotal ?? subtotal)}</strong></div>
                {review && <><div className="purchase-amount"><span>Entrega</span><strong>{money(review.shipping_amount)}</strong></div>{Number(review.discount_amount) > 0 && <div className="purchase-amount purchase-discount"><span>Cupom {review.discount_code}</span><strong>− {money(review.discount_amount)}</strong></div>}</>}
                <div className="purchase-amount purchase-total"><span>{review ? 'Total do pedido' : 'Subtotal'}</span><strong>{money(amount)}</strong></div>
                {invalidPrice ? <p className="purchase-error">Revise os produtos sem preço no carrinho.</p> : review ? <button className="purchase-primary" onClick={proceed}><LockKeyhole size={17}/> Pagar {money(amount)}</button> : <button form="purchase-delivery" type="submit" className="purchase-primary" disabled={loading || !customer || !cart.length}>{loading ? <LoaderCircle className="spin" size={18}/> : <ArrowRight size={18}/>} {loading ? 'Preparando revisão…' : 'Revisar pedido'}</button>}
                <p className="purchase-hint">{review ? 'Você continuará no ambiente do Mercado Pago.' : 'Confira o valor final na próxima etapa, antes de pagar.'}</p>
            </aside>
        </div>}
    </div></section></StoreLayout>;
}
