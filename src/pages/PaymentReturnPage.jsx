import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle2, Clock3, XCircle } from 'lucide-react';
import StoreLayout from '../components/StoreLayout';

const states = {
    success: { icon: CheckCircle2, title: 'Pagamento recebido', text: 'A confirmação final aparecerá em seus pedidos assim que o banco processar a notificação.', className: 'success' },
    pending: { icon: Clock3, title: 'Pagamento em análise', text: 'Acompanhe a atualização na sua área de cliente.', className: 'pending' },
    failure: { icon: XCircle, title: 'Pagamento não concluído', text: 'Nenhum pedido será preparado sem confirmação. Você pode tentar novamente com segurança.', className: 'failure' },
};

const PaymentReturnPage = () => {
    const [params] = useSearchParams();
    const state = states[params.get('status')] || states.pending;
    const Icon = state.icon;
    return <StoreLayout><section className="payment-return"><div className={`payment-return-card store-card ${state.className}`}><Icon size={54}/><span className="eyebrow">Status do pagamento</span><h1>{state.title}</h1><p>{state.text}</p><div><Link to="/minha-conta" className="btn-cta-blue">Ver meus pedidos</Link><Link to="/" className="btn-cta-outline">Voltar à loja</Link></div></div><style>{styles}</style></section></StoreLayout>;
};

const styles = `.payment-return{min-height:68vh;padding:60px 20px;display:grid;place-items:center}.payment-return-card{width:min(100%,590px);padding:52px 32px;text-align:center}.payment-return-card>svg{margin-bottom:14px}.payment-return-card.success>svg{color:var(--brand-green)}.payment-return-card.pending>svg{color:#fbbf24}.payment-return-card.failure>svg{color:#f87171}.payment-return-card h1{font-size:2rem;margin:6px 0 10px}.payment-return-card p{max-width:470px;margin:0 auto 24px}.payment-return-card div{display:flex;justify-content:center;gap:10px}@media(max-width:520px){.payment-return-card{padding:40px 20px}.payment-return-card div{flex-direction:column}.payment-return-card a{width:100%;justify-content:center}}`;
export default PaymentReturnPage;
