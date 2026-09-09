import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle2, Clock3, XCircle } from 'lucide-react';
import StoreLayout from '../components/StoreLayout';
import { useStore } from '../context/StoreContext';
import { supabase } from '../lib/supabaseClient';
import { money } from '../utils/commerce';
import '../styles/purchase.css';

export default function PaymentReturnPage() {
    const [params] = useSearchParams();
    const { customer, settleCart } = useStore();
    const [order, setOrder] = useState(null);
    const [unavailable, setUnavailable] = useState(false);
    let orderId = params.get('external_reference');
    try { orderId ||= sessionStorage.getItem('graphene_payment_order'); } catch { /* Storage is optional. */ }
    useEffect(() => {
        if (!customer || !orderId || !/^[0-9a-f-]{36}$/i.test(orderId)) return;
        let active = true;
        let timer;
        let attempts = 0;
        const check = async () => {
            const { data, error } = await supabase.from('orders')
                .select('id,total,payment_status,order_items(product_id,quantity)').eq('id', orderId).maybeSingle();
            if (!active) return;
            setUnavailable(Boolean(error || !data));
            if (data) {
                setOrder(data);
                if (data.payment_status === 'paid') settleCart(data.id, data.order_items || []);
            }
            if ((!data || data.payment_status === 'pending') && ++attempts < 12) timer = setTimeout(check, 5000);
        };
        check();
        return () => { active = false; clearTimeout(timer); };
    }, [customer, orderId, settleCart]);

    const paid = order?.payment_status === 'paid';
    const refunded = order?.payment_status === 'refunded';
    const failed = order?.payment_status === 'failed';
    const Icon = paid ? CheckCircle2 : failed || refunded ? XCircle : Clock3;
    return <StoreLayout><section className="purchase-page"><div className="purchase-container">
        <div className="purchase-card purchase-return" role="status"><Icon size={42}/><span className="purchase-eyebrow">Sua compra na Graphène</span>
            <h1>{paid ? 'Pagamento confirmado' : refunded ? 'Pagamento estornado' : failed ? 'Pagamento não concluído' : 'Acompanhe seu pagamento'}</h1>
            <p>{paid ? 'Seu pedido foi recebido. Acompanhe a preparação e a entrega na sua conta.' : refunded ? 'Consulte os detalhes deste pedido na sua conta.' : failed ? 'Confira o pedido na sua conta antes de tentar novamente. Os produtos continuam no carrinho.' : unavailable ? 'Não conseguimos consultar o pedido agora. Verifique o status na sua conta antes de fazer outro pagamento.' : 'A confirmação pode levar alguns instantes. Consulte seus pedidos antes de realizar um novo pagamento.'}</p>
            {order && <div className="purchase-amount purchase-total"><span>Pedido #{order.id.slice(-8).toUpperCase()}</span><strong>{money(order.total)}</strong></div>}
            <Link className="purchase-primary" to="/minha-conta">Acompanhar meus pedidos</Link>
            <Link className="purchase-continue" to={failed ? '/carrinho' : '/#produtos'}>{failed ? 'Voltar ao carrinho' : 'Continuar comprando'}</Link>
        </div>
    </div></section></StoreLayout>;
}
