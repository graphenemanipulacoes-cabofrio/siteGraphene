import { lazy, Suspense, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle2, Clock3, LoaderCircle, XCircle } from 'lucide-react';
import { Toaster } from 'sonner';
import StoreLayout from '../components/StoreLayout';
import { useStore } from '../context/StoreContext';
import { supabase } from '../lib/supabaseClient';
import { orderPaymentStatus } from '../lib/checkoutApi';
import { money } from '../utils/commerce';
import { payHereFrom } from '../utils/paymentViews';
import '../styles/purchase.css';
import '../styles/payment.css';

// Pagamento no próprio site (Pix ou cartão), carregado só quando o pedido ainda pode ser pago.
const OrderPayment = lazy(() => import('../components/payment/OrderPayment'));
const orderIdPattern = /^[0-9a-f-]{36}$/i;

export default function PaymentReturnPage() {
    const { customer } = useStore();
    return <CustomerPaymentReturn key={customer?.id || 'guest'} />;
}

function CustomerPaymentReturn() {
    const [params] = useSearchParams();
    const { customer, settleCart } = useStore();
    const [order, setOrder] = useState(null);
    const [unavailable, setUnavailable] = useState(false);
    const [checked, setChecked] = useState(false);
    const [payStatus, setPayStatus] = useState(null);
    const [version, setVersion] = useState(0);
    // Volta do Checkout Pro (?status=...): mantém a consulta de 60 s antes de oferecer o pagamento aqui.
    const fromProvider = params.has('status') || params.has('collection_status');
    let orderId = params.get('pedido') || params.get('external_reference');
    try { orderId ||= sessionStorage.getItem('graphene_payment_order'); } catch { /* Storage is optional. */ }
    useEffect(() => {
        if (!customer || !orderId || !orderIdPattern.test(orderId)) return;
        let active = true;
        let timer;
        let attempts = 0;
        const limit = fromProvider || version > 0 ? 12 : 1;
        const check = async () => {
            let data = null;
            let error = null;
            try {
                ({ data, error } = await supabase.from('orders')
                    .select('id,checkout_key,total,status,payment_status,order_items(product_id,quantity,variant)').eq('id', orderId).maybeSingle());
            } catch (failure) {
                error = failure;
            }
            if (!active) return;
            setUnavailable(Boolean(error || !data));
            if (data) {
                setOrder(data);
                if (data.payment_status === 'paid') {
                    settleCart(data.id, data.order_items || []);
                    try {
                        const key = `graphene_checkout_attempt:${customer.id}`;
                        const attempt = JSON.parse(sessionStorage.getItem(key) || 'null');
                        if (attempt?.key === data.checkout_key) sessionStorage.removeItem(key);
                    } catch { /* Optional storage must not affect confirmation. */ }
                }
            }
            if ((!data || data.payment_status === 'pending') && ++attempts < limit) timer = setTimeout(check, 5000);
            else setChecked(true);
        };
        check();
        return () => { active = false; clearTimeout(timer); };
    }, [customer, orderId, settleCart, fromProvider, version]);

    const paid = order?.payment_status === 'paid';
    const refunded = order?.payment_status === 'refunded';
    const failed = order?.payment_status === 'failed';
    const awaiting = checked && Boolean(customer) && (order?.payment_status === 'pending' || failed) && order?.status === 'awaiting_payment';
    const awaitingOrder = awaiting ? order.id : null;
    // Pedido ainda sem pagamento: pergunta ao servidor se dá para pagar aqui (payHereFrom: pagamento no site, Pix aberto,
    // cartão em análise ou tentativa em processamento). No modo de redirecionamento (ou sem resposta), a tela continua a
    // mesma de antes, que já orienta a conferir em Minha conta. Exceção à regra do aviso (toast) em toda chamada:
    // consulta opcional, sem aviso para não mostrar erro a quem paga pelo Checkout Pro.
    useEffect(() => {
        if (!awaitingOrder || !customer) return undefined;
        let active = true;
        orderPaymentStatus(awaitingOrder, { expectedUserId: customer.id })
            .then(status => { if (active) setPayStatus(payHereFrom(status) ? { orderId: awaitingOrder, status } : null); })
            .catch(() => { if (active) setPayStatus(null); });
        return () => { active = false; };
    }, [awaitingOrder, customer]);
    const payable = awaiting && payStatus?.orderId === order.id;

    if (payable) return <StoreLayout><section className="purchase-page"><Toaster position="top-center" richColors /><div className="purchase-container">
        <div className="purchase-card purchase-return is-paying"><span className="purchase-eyebrow">Sua compra na Graphène</span>
            <h1>Pagamento do pedido</h1>
            <div className="purchase-amount purchase-total"><span>Pedido #{order.id.slice(-8).toUpperCase()}</span><strong>{money(order.total)}</strong></div>
            <Suspense fallback={<div className="pay-loading" role="status"><LoaderCircle size={18} /> Carregando o pagamento…</div>}>
                <OrderPayment orderId={order.id} amount={Number(order.total)} initialStatus={payStatus.status} customerId={customer.id} payerEmail={customer.email} mode="return"
                    onPaid={() => setVersion(current => current + 1)} onUnavailable={() => setPayStatus(null)} />
            </Suspense>
            <Link className="purchase-continue" to="/minha-conta">Ver meus pedidos</Link>
        </div>
    </div></section></StoreLayout>;

    const Icon = paid ? CheckCircle2 : failed || refunded ? XCircle : Clock3;
    return <StoreLayout><section className="purchase-page"><div className="purchase-container">
        <div className="purchase-card purchase-return" role="status"><Icon size={42}/><span className="purchase-eyebrow">Sua compra na Graphène</span>
            <h1>{paid ? 'Pagamento confirmado' : refunded ? 'Pagamento estornado' : failed ? 'Pagamento não concluído' : 'Acompanhe seu pagamento'}</h1>
            <p>{paid ? 'Seu pedido foi recebido. Acompanhe a preparação e a entrega na sua conta.' : refunded ? 'Consulte os detalhes deste pedido na sua conta.' : failed ? 'Confira o pedido na sua conta antes de tentar novamente. Os produtos continuam no carrinho.' : unavailable ? 'Não conseguimos consultar o pedido agora. Verifique o status na sua conta antes de fazer outro pagamento.' : 'A confirmação pode levar alguns instantes. Consulte seus pedidos antes de realizar um novo pagamento.'}</p>
            {order && <div className="purchase-amount purchase-total"><span>Pedido #{order.id.slice(-8).toUpperCase()}</span><strong>{money(order.total)}</strong></div>}
            <Link className="purchase-primary" to="/minha-conta">Acompanhar meus pedidos</Link>
            <Link className="purchase-continue" to={failed ? '/carrinho' : '/produtos'}>{failed ? 'Voltar ao carrinho' : 'Continuar comprando'}</Link>
        </div>
    </div></section></StoreLayout>;
}
