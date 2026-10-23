import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ArrowLeft, ArrowRight, CreditCard, LockKeyhole, LoaderCircle, MapPin, UserRound, Check, Truck } from 'lucide-react';
import StoreLayout from '../components/StoreLayout';
import PurchaseSteps from '../components/PurchaseSteps';
import { useStore } from '../context/StoreContext';
import { supabase } from '../lib/supabaseClient';
import { prepareCheckout } from '../lib/checkoutApi';
import { money, validCpf } from '../utils/commerce';
import { isAdminPreview } from '../utils/adminPreview';
import { variantText } from '../utils/productOptions';
import { FreeShippingProgress } from '../components/ShippingEstimator';
import { STORE_ADDRESS, cleanZip, deliveryText, formatZip, lookupAddress, useShippingConfig, useShippingQuote } from '../utils/shipping';
import '../styles/purchase.css';

const cartSignature = items => JSON.stringify(items.map(item => [item.key, item.quantity, item.price]).sort((a, b) => String(a[0]).localeCompare(String(b[0]))));

export default function CheckoutPage() {
    const { customer } = useStore();
    // A logout/account change must also discard the previous customer's form
    // and order review, not just replace the cart underneath those details.
    return <CustomerCheckout key={customer?.id || 'guest'} />;
}

function CustomerCheckout() {
    const { cart, subtotal, itemCount, customer, authReady, cartReady, syncCart, zip: savedZip, setZip } = useStore();
    const location = useLocation();
    const preview = isAdminPreview(location.search);
    const [form, setForm] = useState({ name: customer?.user_metadata?.full_name || '', cpf: '', phone: '', zip: formatZip(savedZip), address: '', number: '', complement: '', neighborhood: '', city: '', state: '' });
    const [couponCode, setCouponCode] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [errorReference, setErrorReference] = useState(null);
    const [review, setReview] = useState(null);
    const attempt = useRef(null);
    const busy = useRef(false);
    const errorRef = useRef(null);
    const headingRef = useRef(null);
    const field = event => setForm(current => ({ ...current, [event.target.name]: event.target.value }));
    const config = useShippingConfig();
    const { quote, error: quoteError, loading: quoteLoading } = useShippingQuote(form.zip, subtotal);
    const [addressLookup, setAddressLookup] = useState('');
    const numberRef = useRef(null);
    // CEP completo: guarda para as próximas compras e preenche o endereço (ViaCEP).
    const zipDigits = cleanZip(form.zip);
    useEffect(() => {
        if (zipDigits.length !== 8) return undefined;
        setZip(zipDigits);
        let active = true;
        setAddressLookup('loading');
        lookupAddress(zipDigits).then(found => {
            if (!active) return;
            setAddressLookup(found ? 'found' : 'manual');
            if (found) {
                setForm(current => ({ ...current, address: current.address || found.address, neighborhood: current.neighborhood || found.neighborhood, city: found.city || current.city, state: found.state || current.state }));
                if (found.address) requestAnimationFrame(() => numberRef.current?.focus());
            }
        });
        return () => { active = false; };
    }, [zipDigits, setZip]);
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
        if (quote && !quote.ok) { showError('Confira o CEP: não conseguimos calcular a entrega para ele.'); return; }
        if (!/^\d{10,11}$/.test(form.phone.replace(/\D/g, ''))) { showError('Informe seu telefone com DDD, com 10 ou 11 números.'); return; }
        busy.current = true;
        setLoading(true);
        setError('');
        setErrorReference(null);
        try {
            const synced = await syncCart();
            if (!synced.ok || synced.userId !== customer?.id) throw new Error('Não foi possível sincronizar seu carrinho. Verifique sua conexão e tente novamente. Os produtos foram mantidos.');
            if (cartSignature(synced.items) !== cartSignature(cart)) throw new Error('Seu carrinho foi atualizado em outro acesso. Confira os produtos no resumo e clique em revisar novamente.');
            const body = {
                items: synced.items.map(item => ({ productId: item.id, quantity: item.quantity, size: item.size || undefined, flavor: item.flavor || undefined })),
                shipping: { ...form, cpf: undefined, address: `${form.address.trim()}, ${form.neighborhood.trim()} — ${form.city.trim()}/${form.state}` },
                payerDocument: form.cpf.replace(/\D/g, ''), couponCode: couponCode.trim().toUpperCase(),
            };
            // Retain the attempt across reloads without storing CPF/address in browser storage.
            const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(body)));
            const fingerprint = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
            const attemptStorageKey = `graphene_checkout_attempt:${customer.id}`;
            if (!attempt.current) {
                try { attempt.current = JSON.parse(sessionStorage.getItem(attemptStorageKey) || 'null'); } catch { /* A fresh in-memory attempt is safe. */ }
            }
            if (attempt.current?.fingerprint !== fingerprint || !/^[0-9a-f-]{36}$/i.test(attempt.current?.key || '')) attempt.current = { fingerprint, key: crypto.randomUUID() };
            try { sessionStorage.setItem(attemptStorageKey, JSON.stringify(attempt.current)); } catch { /* Retained in memory until navigation. */ }
            const data = await prepareCheckout({ ...body, checkoutKey: attempt.current.key }, { expectedUserId: customer.id });
            // Read the actual order through the customer's RLS-protected access.
            const { data: order, error: orderError } = await supabase.from('orders')
                .select('id,subtotal,discount_amount,discount_code,shipping_amount,shipping_address,total,order_items(product_id,product_name,unit_price,quantity,variant)')
                .eq('id', data.orderId).single();
            if (orderError || !order) throw new Error('Não foi possível carregar o resumo final. Tente novamente para conferir o pedido.');
            setReview({ ...order, paymentUrl: data.paymentUrl });
            requestAnimationFrame(() => headingRef.current?.focus());
        } catch (failure) {
            setErrorReference(failure.requestId || null);
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
    const shippingEstimate = quote?.ok ? Number(quote.amount) || 0 : 0;
    const amount = review ? Number(review.total) : subtotal + shippingEstimate;
    const delivery = deliveryText(review?.shipping_address?.delivery || quote);
    const deliveryPrice = source => !source?.ok ? 'Informe o CEP' : source.local ? 'A combinar' : Number(source.amount) === 0 ? 'Grátis' : money(source.amount);
    const invalidPrice = cart.some(item => !(Number(item.price) > 0));

    return <StoreLayout><section className="purchase-page"><div className="purchase-container">
        <Link to="/carrinho" className="purchase-back"><ArrowLeft size={16} /> Voltar ao carrinho</Link>
        <PurchaseSteps current={review ? 3 : 2} />
        <div className="purchase-heading"><div><span className="purchase-eyebrow">Finalizar compra</span><h1 ref={headingRef} tabIndex={-1}>{review ? 'Confira seu pedido' : 'Entrega'}</h1><p>{review ? 'Confira produtos, entrega e valor total. O pagamento acontece na próxima tela.' : 'Comece pelo CEP: o endereço é preenchido sozinho.'}</p></div></div>
        {!authReady || !cartReady ? <div className="purchase-empty" role="status">Carregando sua conta e seu carrinho…</div> : !cart.length && !preview ? <div className="purchase-empty"><h2>Seu carrinho está vazio</h2><Link to="/#produtos" className="purchase-primary">Escolher produtos</Link></div> : !customer && !preview ? <div className="purchase-card purchase-signin"><UserRound size={28}/><h2>Entre para concluir sua compra</h2><p>Seus {itemCount} {itemCount === 1 ? 'item está' : 'itens estão'} no carrinho. Use sua conta para informar a entrega e acompanhar o pedido.</p><Link className="purchase-primary" to="/entrar" state={{ returnTo: '/checkout', intent: 'checkout' }}>Entrar ou criar conta <ArrowRight size={18}/></Link><Link to="/#produtos" className="purchase-continue">Continuar comprando</Link></div> :
        <div className="purchase-layout">
            <div>
                {review ? <div className="purchase-card purchase-form">
                    <div className="purchase-section-title"><MapPin size={20}/><h2>Entregar para</h2><button className="purchase-text-link" onClick={() => setReview(null)}>Alterar</button></div>
                    <address className="purchase-address"><strong>{form.name}</strong><span>{form.address}, {form.number}{form.complement ? ` · ${form.complement}` : ''}</span><span>{form.neighborhood} · {form.city}/{form.state}</span><span>CEP {formatZip(form.zip)} · {form.phone}</span></address>
                    {delivery && <div className="purchase-delivery"><Truck size={18} aria-hidden="true"/><div><strong>{delivery.title}</strong><span>{delivery.detail}</span>{review.shipping_address?.delivery?.local && <span>Se preferir retirar: {STORE_ADDRESS}.</span>}</div><b>{deliveryPrice(review.shipping_address?.delivery)}</b></div>}
                    <div className="purchase-section-title purchase-divider"><CreditCard size={20}/><h2>Pagamento</h2></div>
                    <p>Ao clicar em pagar, você vai para o ambiente seguro do Mercado Pago e escolhe <strong>Pix</strong> ou <strong>cartão de crédito</strong>. As condições de parcelamento aparecem lá, antes de confirmar.</p>
                    <ol className="purchase-next">
                        <li>Você paga no Mercado Pago e volta para o site.</li>
                        <li>Com o pagamento confirmado, preparamos seu pedido no laboratório.</li>
                        <li>Você acompanha tudo em <Link to="/minha-conta">Minha conta</Link>{review.shipping_address?.delivery?.local ? ' e combinamos a entrega pelo WhatsApp' : ''}.</li>
                    </ol>
                    <p className="purchase-note"><Check size={18}/> Pedido registrado. O pagamento ainda não foi feito.</p>
                </div> : <form id="purchase-delivery" className="purchase-card purchase-form" onSubmit={submit}>
                    <fieldset disabled={loading}><legend className="sr-only">Dados de entrega</legend>
                    <div className="purchase-section-title"><MapPin size={20}/><h2>Endereço de entrega</h2></div>
                    <div className="purchase-fields">
                        <label>CEP<input name="zip" inputMode="numeric" autoComplete="postal-code" placeholder="00000-000" maxLength={9} value={form.zip} onChange={event => setForm(current => ({ ...current, zip: formatZip(event.target.value) }))} required /></label>
                        <p className="purchase-zip-status" aria-live="polite">{addressLookup === 'loading' ? 'Buscando endereço…' : addressLookup === 'manual' ? 'Não achamos o endereço deste CEP. Preencha abaixo.' : <a href="https://buscacepinter.correios.com.br/app/endereco/index.php" target="_blank" rel="noreferrer">Não sei meu CEP</a>}</p>
                        <label className="purchase-full">Rua ou avenida<input name="address" autoComplete="address-line1" maxLength={85} value={form.address} onChange={field} required /></label>
                        <label>Número<input ref={numberRef} name="number" maxLength={20} placeholder="123 ou S/N" value={form.number} onChange={field} required /></label><label>Complemento <small>(opcional)</small><input name="complement" autoComplete="address-line2" placeholder="Apartamento, bloco…" maxLength={80} value={form.complement} onChange={field} /></label>
                        <label className="purchase-full">Bairro<input name="neighborhood" maxLength={40} value={form.neighborhood} onChange={field} required /></label>
                        <label>Cidade<input name="city" autoComplete="address-level2" maxLength={40} value={form.city} onChange={field} required /></label><label>Estado<select name="state" autoComplete="address-level1" value={form.state} onChange={field} required><option value="">Selecione</option>{'AC AL AP AM BA CE DF ES GO MA MT MS MG PA PB PR PE PI RJ RN RS RO RR SC SP SE TO'.split(' ').map(uf => <option key={uf}>{uf}</option>)}</select></label>
                    </div>
                    {(quoteLoading || quoteError || delivery) && <div className={`purchase-delivery${quoteError ? ' is-error' : ''}`} aria-live="polite"><Truck size={18} aria-hidden="true"/>{quoteLoading ? <div><span>Calculando entrega…</span></div> : quoteError ? <div><span>{quoteError}</span></div> : <><div><strong>{delivery.title}</strong><span>{delivery.detail}</span></div><b>{deliveryPrice(quote)}</b></>}</div>}
                    <div className="purchase-section-title purchase-divider"><UserRound size={20}/><h2>Quem vai receber</h2></div>
                    <p className="purchase-hint">{customer ? `Você está comprando com a conta ${customer.email}.` : 'Visualização administrativa. Entre como cliente para realizar uma compra.'}</p>
                    <div className="purchase-fields">
                        <label className="purchase-full">Nome completo<input name="name" autoComplete="name" maxLength={120} value={form.name} onChange={field} required /></label>
                        <label>CPF <small>(para a nota e o pagamento)</small><input name="cpf" inputMode="numeric" placeholder="000.000.000-00" maxLength={14} value={form.cpf} onChange={field} required /></label>
                        <label>Celular com DDD <small>(WhatsApp)</small><input name="phone" type="tel" autoComplete="tel" placeholder="(22) 99999-9999" maxLength={16} value={form.phone} onChange={field} required /></label>
                    </div></fieldset>
                    <details className="purchase-coupon"><summary>Tenho um cupom de desconto</summary><label>Código do cupom<input disabled={loading} value={couponCode} onChange={e => setCouponCode(e.target.value.toUpperCase())} maxLength={40} placeholder="Digite seu cupom" /></label><p className="purchase-hint">O desconto aparece na revisão, antes do pagamento.</p></details>
                    {error && <div className="purchase-error" role="alert" tabIndex={-1} ref={errorRef}>{error}{errorReference && <small>Referência para o suporte: {errorReference}</small>}{/sess[aã]o/i.test(error) && <Link to="/entrar" state={{ returnTo: '/checkout' }}>Entrar novamente</Link>}</div>}
                </form>}
            </div>
            <aside className="purchase-card purchase-summary"><div className="purchase-section-title"><h2>Resumo do pedido</h2>{!review && <Link to="/carrinho" className="purchase-text-link">Editar</Link>}</div>
                <div className="purchase-mini-items">{summaryItems.map((item, index) => <div className="purchase-mini-item" key={item.key || `${item.id}-${index}`}><span><strong>{item.name}</strong>{item.key && variantText(item) && <small>{variantText(item)}</small>}<small>{item.quantity} × {money(item.price)}</small></span><b>{money(item.quantity * item.price)}</b></div>)}</div>
                {!review && !quote?.local && <FreeShippingProgress subtotal={subtotal} freeMin={config?.free_min} />}
                <div className="purchase-amount"><span>Produtos</span><strong>{money(review?.subtotal ?? subtotal)}</strong></div>
                <div className="purchase-amount"><span>Entrega</span><strong>{deliveryPrice(review ? review.shipping_address?.delivery : quote)}</strong></div>
                {review && Number(review.discount_amount) > 0 && <div className="purchase-amount purchase-discount"><span>Cupom {review.discount_code}</span><strong>− {money(review.discount_amount)}</strong></div>}
                <div className="purchase-amount purchase-total"><span>Total</span><strong>{money(amount)}</strong></div>
                {invalidPrice ? <p className="purchase-error">Revise os produtos sem preço no carrinho.</p> : review ? <button className="purchase-primary" onClick={proceed}><LockKeyhole size={17}/> Pagar {money(amount)} no Mercado Pago</button> : <button form="purchase-delivery" type="submit" className="purchase-primary" disabled={loading || !customer || !cart.length}>{loading ? <LoaderCircle className="spin" size={18}/> : <ArrowRight size={18}/>} {loading ? 'Preparando revisão…' : 'Revisar pedido'}</button>}
                <p className="purchase-hint"><LockKeyhole size={14}/> {review ? 'Pagamento seguro pelo Mercado Pago.' : 'Você confere tudo na próxima etapa, antes de pagar.'}</p>
            </aside>
        </div>}
    </div></section></StoreLayout>;
}
