import { useCallback, useEffect, useMemo, useState } from 'react';
import { BadgeCheck, BanknoteArrowDown, CircleDollarSign, CreditCard, Gift, Landmark, LoaderCircle, Plus, ReceiptText, RefreshCw, ShieldCheck, TicketPercent, WalletCards } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { getSession } from '../utils/security';
import { toast } from 'sonner';

const money = value => Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const date = value => value ? new Date(value).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : '—';
const paymentLabel = { paid: 'Confirmado', pending: 'Pendente', failed: 'Falhou', refunded: 'Estornado' };
const roleLabel = { influencer: 'Influenciador(a)', marketing: 'Marketing', development: 'Desenvolvimento', other: 'Outro' };

const AdminFinance = ({ onUnauthorized }) => {
    const [data, setData] = useState({ orders: [], recipients: [], coupons: [], commissions: [], paymentEvents: [], mercadoPagoConfigured: false });
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState('');
    const [tab, setTab] = useState('overview');
    const [recipientForm, setRecipientForm] = useState({ name: '', email: '', role: 'influencer', commissionType: 'percentage', commissionValue: '', attributionScope: 'coupon', holdDays: '14' });
    const [couponForm, setCouponForm] = useState({ recipientId: '', code: '', discountType: 'percentage', discountValue: '', minimumOrderAmount: '', maxRedemptions: '' });

    const invoke = useCallback(async body => {
        const token = getSession()?.token;
        if (!token) { onUnauthorized(); return { error: 'unauthorized' }; }
        const result = await supabase.functions.invoke('admin-orders', { body, headers: { 'x-admin-token': token } });
        if (result.data?.error === 'unauthorized') onUnauthorized();
        return { data: result.data, error: result.data?.error || result.error };
    }, [onUnauthorized]);

    const load = useCallback(async () => {
        setLoading(true);
        const result = await invoke({ action: 'finance_dashboard' });
        if (result.error) toast.error('Não foi possível carregar a central financeira.');
        else setData(result.data);
        setLoading(false);
    }, [invoke]);

    useEffect(() => {
        const timer = window.setTimeout(load, 0);
        return () => window.clearTimeout(timer);
    }, [load]);

    const metrics = useMemo(() => {
        const paid = data.orders.filter(order => order.payment_status === 'paid');
        const refunded = data.orders.filter(order => order.payment_status === 'refunded');
        const gross = paid.reduce((sum, order) => sum + Number(order.total || 0), 0);
        const fees = paid.reduce((sum, order) => sum + Number(order.provider_fee || 0), 0);
        const net = paid.reduce((sum, order) => sum + Number(order.net_amount ?? (Number(order.total || 0) - Number(order.provider_fee || 0))), 0);
        const pending = data.commissions.filter(item => item.status === 'pending').reduce((sum, item) => sum + Number(item.amount || 0), 0);
        const available = data.commissions.filter(item => item.status === 'available').reduce((sum, item) => sum + Number(item.amount || 0), 0);
        const paidOut = data.commissions.filter(item => item.status === 'paid').reduce((sum, item) => sum + Number(item.amount || 0), 0);
        return { gross, fees, net, pending, available, paidOut, paidCount: paid.length, refunded: refunded.reduce((sum, order) => sum + Number(order.total || 0), 0), pendingPayments: data.orders.filter(order => order.payment_status === 'pending').length };
    }, [data]);

    const createRecipient = async event => {
        event.preventDefault();
        setBusy('recipient');
        const result = await invoke({ action: 'create_recipient', ...recipientForm, commissionValue: Number(recipientForm.commissionValue), holdDays: Number(recipientForm.holdDays) });
        setBusy('');
        if (result.error) return toast.error('Revise os dados da pessoa que receberá comissão.');
        toast.success('Recebedor de comissão cadastrado.');
        setRecipientForm({ name: '', email: '', role: 'influencer', commissionType: 'percentage', commissionValue: '', attributionScope: 'coupon', holdDays: '14' });
        load();
    };

    const createCoupon = async event => {
        event.preventDefault();
        setBusy('coupon');
        const result = await invoke({ action: 'create_coupon', ...couponForm, discountValue: Number(couponForm.discountValue), minimumOrderAmount: Number(couponForm.minimumOrderAmount || 0) });
        setBusy('');
        if (result.error) return toast.error(result.error === 'coupon_exists' ? 'Esse código já existe.' : 'Revise os dados do cupom.');
        toast.success('Cupom criado e pronto para uso.');
        setCouponForm({ recipientId: '', code: '', discountType: 'percentage', discountValue: '', minimumOrderAmount: '', maxRedemptions: '' });
        load();
    };

    const toggleCoupon = async coupon => {
        setBusy(coupon.id);
        const result = await invoke({ action: 'toggle_coupon', id: coupon.id, isActive: !coupon.is_active });
        setBusy('');
        if (result.error) return toast.error('Não foi possível atualizar o cupom.');
        setData(current => ({ ...current, coupons: current.coupons.map(item => item.id === coupon.id ? result.data.coupon : item) }));
    };

    const settleRecipient = async recipient => {
        const available = data.commissions.filter(item => item.recipient_id === recipient.id && item.status === 'available');
        const total = available.reduce((sum, item) => sum + Number(item.amount || 0), 0);
        if (!available.length) return toast.message('Não há comissão liberada para este recebedor.');
        const reference = window.prompt(`Confirme a referência do Pix de ${money(total)} para ${recipient.name}.`);
        if (!reference) return;
        setBusy(`payout-${recipient.id}`);
        const result = await invoke({ action: 'settle_recipient_commissions', recipientId: recipient.id, reference });
        setBusy('');
        if (result.error) return toast.error('Não foi possível registrar o pagamento.');
        toast.success(`Repasse de ${money(result.data.total)} registrado.`);
        load();
    };

    const updateRecipient = async recipient => {
        setBusy(`recipient-${recipient.id}`);
        const result = await invoke({ action: 'update_recipient', id: recipient.id, commissionType: recipient.commission_type, commissionValue: Number(recipient.commission_value), attributionScope: recipient.attribution_scope, holdDays: Number(recipient.hold_days), isActive: !recipient.is_active });
        setBusy('');
        if (result.error) return toast.error('Não foi possível atualizar o recebedor.');
        setData(current => ({ ...current, recipients: current.recipients.map(item => item.id === recipient.id ? result.data.recipient : item) }));
    };

    if (loading) return <div className="finance-loading"><LoaderCircle className="spin"/> Carregando central financeira...</div>;

    return <section className="finance-center">
        <div className="finance-provider">
            <div><span className={`provider-dot ${data.mercadoPagoConfigured ? 'connected' : ''}`}/><div><strong>Mercado Pago</strong><small>{data.mercadoPagoConfigured ? 'Integração de checkout configurada' : 'Aguardando credenciais de produção'}</small></div></div>
            <div className="finance-provider-note"><ShieldCheck size={16}/> Dados financeiros registrados após a confirmação do pagamento.</div>
        </div>

        <div className="finance-metrics">
            <article><CircleDollarSign/><div><span>Vendas confirmadas</span><strong>{money(metrics.gross)}</strong><small>{metrics.paidCount} pagamentos aprovados</small></div></article>
            <article><WalletCards/><div><span>Receita líquida registrada</span><strong>{money(metrics.net)}</strong><small>Valor após taxa informada pelo provedor</small></div></article>
            <article><ReceiptText/><div><span>Taxas Mercado Pago</span><strong>{money(metrics.fees)}</strong><small>Registradas nos pagamentos confirmados</small></div></article>
            <article><BanknoteArrowDown/><div><span>Repasses disponíveis</span><strong>{money(metrics.available)}</strong><small>{money(metrics.pending)} ainda no prazo de segurança</small></div></article>
        </div>

        <nav className="finance-tabs">
            <button className={tab === 'overview' ? 'active' : ''} onClick={() => setTab('overview')}>Visão geral</button>
            <button className={tab === 'transactions' ? 'active' : ''} onClick={() => setTab('transactions')}>Transações</button>
            <button className={tab === 'commissions' ? 'active' : ''} onClick={() => setTab('commissions')}>Comissões e repasses</button>
            <button className={tab === 'coupons' ? 'active' : ''} onClick={() => setTab('coupons')}>Cupons</button>
            <button className="refresh" onClick={load}><RefreshCw size={15}/> Atualizar</button>
        </nav>

        {tab === 'overview' && <div className="finance-grid">
            <section className="finance-card finance-card-wide"><div className="finance-card-title"><div><h2>Resumo operacional</h2><p>Valores consolidados exclusivamente das vendas deste site.</p></div><BadgeCheck/></div><div className="finance-summary-grid"><div><span>Pagamentos pendentes</span><strong>{metrics.pendingPayments}</strong></div><div><span>Estornos registrados</span><strong>{money(metrics.refunded)}</strong></div><div><span>Comissões já pagas</span><strong>{money(metrics.paidOut)}</strong></div><div><span>Cupons ativos</span><strong>{data.coupons.filter(coupon => coupon.is_active).length}</strong></div></div></section>
            <section className="finance-card"><div className="finance-card-title"><div><h2>Controles automáticos</h2><p>Proteções aplicadas ao fluxo financeiro.</p></div><ShieldCheck/></div><ul className="finance-checklist"><li><BadgeCheck/> Pagamento só vira venda após confirmação do Mercado Pago.</li><li><BadgeCheck/> Comissão fica retida até o prazo definido.</li><li><BadgeCheck/> Estorno cancela comissões ainda não pagas.</li><li><BadgeCheck/> Preço e desconto são validados no servidor.</li></ul></section>
            <section className="finance-card"><div className="finance-card-title"><div><h2>Atividade recente</h2><p>Últimas atualizações recebidas.</p></div><ReceiptText/></div>{data.paymentEvents.length ? <div className="finance-events">{data.paymentEvents.slice(0, 5).map(event => <div key={event.id}><span className={`event-dot event-${event.status}`}/><div><strong>{event.payment_method || 'Pagamento Mercado Pago'}</strong><small>{date(event.created_at)} · {event.status}</small></div><b>{event.gross_amount ? money(event.gross_amount) : '—'}</b></div>)}</div> : <div className="finance-empty">Nenhum evento de pagamento recebido ainda.</div>}</section>
        </div>}

        {tab === 'transactions' && <section className="finance-card"><div className="finance-card-title"><div><h2>Histórico de vendas e pagamentos</h2><p>Pedidos criados no site, incluindo pendências, confirmações e estornos.</p></div><CreditCard/></div>{data.orders.length ? <div className="finance-table-wrap"><table className="finance-table"><thead><tr><th>Pedido</th><th>Cliente</th><th>Pagamento</th><th>Cupom</th><th>Bruto</th><th>Taxa</th><th>Líquido</th></tr></thead><tbody>{data.orders.map(order => <tr key={order.id}><td><strong>#{order.id.slice(-8).toUpperCase()}</strong><small>{date(order.created_at)}</small></td><td>{order.customer_email}</td><td><span className={`finance-status ${order.payment_status}`}>{paymentLabel[order.payment_status] || order.payment_status}</span><small>{order.payment_method || '—'}</small></td><td>{order.discount_code ? <><strong>{order.discount_code}</strong><small>- {money(order.discount_amount)}</small></> : '—'}</td><td>{money(order.total)}</td><td>{order.payment_status === 'paid' ? money(order.provider_fee) : '—'}</td><td><strong>{order.payment_status === 'paid' ? money(order.net_amount ?? (Number(order.total) - Number(order.provider_fee))) : '—'}</strong></td></tr>)}</tbody></table></div> : <div className="finance-empty">As transações aparecerão aqui assim que os pagamentos forem gerados.</div>}</section>}

        {tab === 'commissions' && <div className="finance-grid commissions-layout">
            <section className="finance-card"><div className="finance-card-title"><div><h2>Novo recebedor</h2><p>Influenciador, marketing, desenvolvimento ou outro.</p></div><Plus/></div><form className="finance-form" onSubmit={createRecipient}><label>Nome<input value={recipientForm.name} onChange={e => setRecipientForm({ ...recipientForm, name: e.target.value })} required /></label><label>E-mail opcional<input type="email" value={recipientForm.email} onChange={e => setRecipientForm({ ...recipientForm, email: e.target.value })} /></label><div className="finance-form-row"><label>Função<select value={recipientForm.role} onChange={e => setRecipientForm({ ...recipientForm, role: e.target.value })}><option value="influencer">Influenciador(a)</option><option value="marketing">Marketing</option><option value="development">Desenvolvimento</option><option value="other">Outro</option></select></label><label>Comissão<select value={recipientForm.commissionType} onChange={e => setRecipientForm({ ...recipientForm, commissionType: e.target.value })}><option value="percentage">Porcentagem</option><option value="fixed">Valor fixo</option></select></label></div><div className="finance-form-row"><label>{recipientForm.commissionType === 'percentage' ? 'Percentual' : 'Valor (R$)'}<input type="number" min="0" max={recipientForm.commissionType === 'percentage' ? '100' : undefined} step="0.01" value={recipientForm.commissionValue} onChange={e => setRecipientForm({ ...recipientForm, commissionValue: e.target.value })} required /></label><label>Prazo de segurança (dias)<input type="number" min="0" max="180" value={recipientForm.holdDays} onChange={e => setRecipientForm({ ...recipientForm, holdDays: e.target.value })} required /></label></div><label>Origem<select value={recipientForm.attributionScope} onChange={e => setRecipientForm({ ...recipientForm, attributionScope: e.target.value })}><option value="coupon">Apenas vendas com cupom próprio</option><option value="all_paid_orders">Todas as vendas aprovadas</option></select></label><button disabled={busy === 'recipient'}>{busy === 'recipient' ? <LoaderCircle className="spin"/> : <Plus/>} Adicionar recebedor</button></form></section>
            <section className="finance-card finance-card-wide"><div className="finance-card-title"><div><h2>Comissões e repasses</h2><p>Registre o Pix somente depois de realizar o pagamento real.</p></div><Gift/></div>{data.recipients.length ? <div className="recipient-list">{data.recipients.map(recipient => { const recipientCommissions = data.commissions.filter(item => item.recipient_id === recipient.id); const pending = recipientCommissions.filter(item => item.status === 'pending').reduce((sum, item) => sum + Number(item.amount), 0); const available = recipientCommissions.filter(item => item.status === 'available').reduce((sum, item) => sum + Number(item.amount), 0); return <article key={recipient.id}><div><strong>{recipient.name}</strong><small>{roleLabel[recipient.role]} · {recipient.commission_type === 'percentage' ? `${recipient.commission_value}%` : money(recipient.commission_value)} · {recipient.attribution_scope === 'coupon' ? 'por cupom' : 'todas as vendas'}</small></div><div className="recipient-values"><span><small>Em análise</small>{money(pending)}</span><span><small>Liberado</small>{money(available)}</span></div><div className="recipient-actions"><button className="subtle" onClick={() => updateRecipient(recipient)} disabled={busy === `recipient-${recipient.id}`}>{recipient.is_active ? 'Pausar' : 'Ativar'}</button><button onClick={() => settleRecipient(recipient)} disabled={!available || busy === `payout-${recipient.id}`}>{busy === `payout-${recipient.id}` ? <LoaderCircle className="spin"/> : <Landmark/>} Registrar Pix</button></div></article>; })}</div> : <div className="finance-empty">Cadastre os recebedores para começar a calcular as comissões.</div>}</section>
            <section className="finance-card finance-card-wide"><div className="finance-card-title"><div><h2>Histórico de comissões</h2><p>Rastreabilidade por pedido, pessoa e estado de pagamento.</p></div><ReceiptText/></div>{data.commissions.length ? <div className="finance-table-wrap"><table className="finance-table"><thead><tr><th>Recebedor</th><th>Pedido</th><th>Base</th><th>Comissão</th><th>Liberada em</th><th>Status</th></tr></thead><tbody>{data.commissions.map(commission => <tr key={commission.id}><td>{commission.commission_recipients?.name || '—'}</td><td>#{commission.orders?.id?.slice(-8).toUpperCase() || '—'}</td><td>{money(commission.base_amount)}</td><td><strong>{money(commission.amount)}</strong></td><td>{date(commission.available_at)}</td><td><span className={`finance-status ${commission.status}`}>{commission.status === 'available' ? 'Liberada' : commission.status === 'pending' ? 'Em análise' : commission.status === 'paid' ? 'Paga' : 'Cancelada'}</span></td></tr>)}</tbody></table></div> : <div className="finance-empty">Nenhuma comissão foi gerada ainda.</div>}</section>
        </div>}

        {tab === 'coupons' && <div className="finance-grid coupons-layout"><section className="finance-card"><div className="finance-card-title"><div><h2>Novo cupom</h2><p>Desconto do cliente associado a um recebedor.</p></div><TicketPercent/></div><form className="finance-form" onSubmit={createCoupon}><label>Recebedor<select value={couponForm.recipientId} onChange={e => setCouponForm({ ...couponForm, recipientId: e.target.value })} required><option value="">Selecione</option>{data.recipients.filter(item => item.is_active).map(item => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label><label>Código<input value={couponForm.code} onChange={e => setCouponForm({ ...couponForm, code: e.target.value.toUpperCase() })} placeholder="YASMIN15" maxLength="40" required /></label><div className="finance-form-row"><label>Desconto<select value={couponForm.discountType} onChange={e => setCouponForm({ ...couponForm, discountType: e.target.value })}><option value="percentage">Porcentagem</option><option value="fixed">Valor fixo</option></select></label><label>{couponForm.discountType === 'percentage' ? 'Percentual' : 'Valor (R$)'}<input type="number" min="0" step="0.01" value={couponForm.discountValue} onChange={e => setCouponForm({ ...couponForm, discountValue: e.target.value })} required /></label></div><div className="finance-form-row"><label>Pedido mínimo (R$)<input type="number" min="0" step="0.01" value={couponForm.minimumOrderAmount} onChange={e => setCouponForm({ ...couponForm, minimumOrderAmount: e.target.value })} /></label><label>Limite de usos<input type="number" min="1" value={couponForm.maxRedemptions} onChange={e => setCouponForm({ ...couponForm, maxRedemptions: e.target.value })} placeholder="Sem limite" /></label></div><button disabled={busy === 'coupon' || !data.recipients.some(item => item.is_active)}>{busy === 'coupon' ? <LoaderCircle className="spin"/> : <Plus/>} Criar cupom</button></form></section><section className="finance-card finance-card-wide"><div className="finance-card-title"><div><h2>Cupons de indicação</h2><p>Ative ou pause códigos sem apagar o histórico das vendas.</p></div><TicketPercent/></div>{data.coupons.length ? <div className="coupon-list">{data.coupons.map(coupon => <article key={coupon.id}><div><strong>{coupon.code}</strong><small>{coupon.commission_recipients?.name || '—'} · {coupon.discount_type === 'percentage' ? `${coupon.discount_value}% de desconto` : `${money(coupon.discount_value)} de desconto`}</small></div><span>{coupon.redeemed_count}{coupon.max_redemptions ? ` / ${coupon.max_redemptions}` : ''} usos</span><button className={coupon.is_active ? 'subtle' : ''} onClick={() => toggleCoupon(coupon)} disabled={busy === coupon.id}>{coupon.is_active ? 'Pausar' : 'Ativar'}</button></article>)}</div> : <div className="finance-empty">Crie o primeiro cupom para começar a atribuir vendas.</div>}</section></div>}
        <style>{styles}</style>
    </section>;
};

const styles = `
.finance-center{display:grid;gap:16px}.finance-loading{min-height:280px;display:flex;align-items:center;justify-content:center;gap:10px;color:#9cadbf}.finance-provider{display:flex;justify-content:space-between;align-items:center;gap:16px;padding:14px 17px;border:1px solid rgba(203,213,225,.12);border-radius:13px;background:rgba(12,25,40,.62)}.finance-provider>div:first-child{display:flex;align-items:center;gap:10px}.provider-dot{width:10px;height:10px;border-radius:50%;background:#fbbf24;box-shadow:0 0 0 4px rgba(251,191,36,.12)}.provider-dot.connected{background:#24d39a;box-shadow:0 0 0 4px rgba(36,211,154,.12)}.finance-provider strong{display:block;font-size:.87rem}.finance-provider small,.finance-provider-note{font-size:.73rem;color:#91a3b8}.finance-provider-note{display:flex;align-items:center;gap:6px}.finance-provider-note svg{color:#67dcf3}.finance-metrics{display:grid;grid-template-columns:repeat(4,1fr);gap:12px}.finance-metrics article{display:flex;gap:11px;align-items:flex-start;padding:17px;border:1px solid rgba(203,213,225,.11);border-radius:14px;background:linear-gradient(145deg,rgba(20,35,53,.9),rgba(11,22,36,.9))}.finance-metrics svg{box-sizing:content-box;padding:8px;border-radius:9px;background:rgba(34,199,232,.1);color:#67dcf3}.finance-metrics article:nth-child(2) svg{color:#65e7b5;background:rgba(36,211,154,.1)}.finance-metrics article:nth-child(3) svg{color:#fcd36c;background:rgba(251,191,36,.1)}.finance-metrics article:nth-child(4) svg{color:#c1b8ff;background:rgba(129,140,248,.12)}.finance-metrics span,.finance-metrics small{display:block;font-size:.68rem;color:#91a3b8}.finance-metrics strong{display:block;font-family:var(--font-heading);font-size:1.25rem;line-height:1.3;color:#fff}.finance-tabs{display:flex;gap:7px;align-items:center;overflow-x:auto;padding:4px 0}.finance-tabs button{flex:0 0 auto;padding:9px 12px;border:1px solid rgba(203,213,225,.11);border-radius:8px;background:rgba(12,25,40,.62);color:#9cadbf;font-size:.73rem;font-weight:800;cursor:pointer}.finance-tabs button.active{color:#80e8f9;background:rgba(34,199,232,.12);border-color:rgba(34,199,232,.28)}.finance-tabs .refresh{display:flex;align-items:center;gap:6px;margin-left:auto;color:#d9e4ef}.finance-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}.finance-card{min-width:0;padding:18px;border:1px solid rgba(203,213,225,.11);border-radius:14px;background:rgba(12,24,39,.8)}.finance-card-wide{grid-column:span 2}.finance-card-title{display:flex;justify-content:space-between;gap:10px;padding-bottom:14px;margin-bottom:14px;border-bottom:1px solid rgba(203,213,225,.08)}.finance-card-title h2{font-size:.97rem}.finance-card-title p{margin-top:3px;font-size:.72rem;color:#8fa0b6}.finance-card-title>svg{width:19px;color:#67dcf3}.finance-summary-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}.finance-summary-grid div{padding:12px;border-radius:10px;background:rgba(255,255,255,.035)}.finance-summary-grid span{display:block;font-size:.68rem;color:#8fa0b6}.finance-summary-grid strong{display:block;margin-top:4px;font-size:1.03rem}.finance-checklist{display:grid;gap:11px;list-style:none}.finance-checklist li{display:flex;gap:8px;color:#b7c5d4;font-size:.75rem;line-height:1.4}.finance-checklist svg{width:16px;flex:0 0 auto;color:#65e7b5}.finance-events{display:grid;gap:9px}.finance-events>div{display:grid;grid-template-columns:auto 1fr auto;gap:9px;align-items:center}.finance-events strong,.finance-events small{display:block;font-size:.72rem}.finance-events small{color:#8fa0b6}.finance-events b{font-size:.72rem}.event-dot{width:8px;height:8px;border-radius:50%;background:#fbbf24}.event-approved{background:#24d39a}.event-refunded,.event-rejected{background:#fb7185}.finance-empty{min-height:130px;display:flex;align-items:center;justify-content:center;text-align:center;color:#8fa0b6;font-size:.8rem}.finance-table-wrap{overflow:auto}.finance-table{width:100%;border-collapse:collapse;font-size:.76rem;min-width:740px}.finance-table th{padding:0 10px 10px;text-align:left;color:#8fa0b6;font-size:.65rem;letter-spacing:.04em}.finance-table td{padding:12px 10px;border-top:1px solid rgba(203,213,225,.07);color:#ced8e3;vertical-align:middle}.finance-table strong,.finance-table small{display:block}.finance-table small{margin-top:3px;color:#7f91a7;font-size:.67rem}.finance-status{display:inline-flex;padding:4px 7px;border-radius:99px;font-size:.62rem;font-weight:800;background:rgba(148,163,184,.12);color:#cbd5e1}.finance-status.paid,.finance-status.available{background:rgba(36,211,154,.13);color:#65e7b5}.finance-status.pending{background:rgba(251,191,36,.12);color:#fcd36c}.finance-status.failed,.finance-status.refunded,.finance-status.cancelled{background:rgba(251,113,133,.12);color:#fda4af}.finance-form{display:grid;gap:11px}.finance-form label{display:grid;gap:5px;color:#9cadbf;font-size:.68rem;font-weight:700}.finance-form input,.finance-form select{width:100%;min-height:40px;padding:9px;border:1px solid rgba(203,213,225,.14);border-radius:8px;background:#091525;color:#f8fafc}.finance-form-row{display:grid;grid-template-columns:1fr 1fr;gap:10px}.finance-form button,.recipient-actions button,.coupon-list button{display:flex;justify-content:center;align-items:center;gap:6px;min-height:40px;padding:9px 12px;border:0;border-radius:8px;background:#22c7e8;color:#031319;font-size:.74rem;font-weight:800;cursor:pointer}.recipient-list,.coupon-list{display:grid;gap:8px}.recipient-list article,.coupon-list article{display:grid;grid-template-columns:minmax(160px,1fr) auto auto;align-items:center;gap:13px;padding:12px;border:1px solid rgba(203,213,225,.08);border-radius:10px;background:rgba(255,255,255,.025)}.recipient-list strong,.coupon-list strong{display:block;font-size:.82rem}.recipient-list small,.coupon-list small{display:block;margin-top:3px;font-size:.68rem;color:#8fa0b6}.recipient-values{display:flex;gap:14px}.recipient-values span{display:grid;gap:2px;text-align:right;color:#e6edf6;font-size:.8rem}.recipient-values small{font-size:.62rem;color:#8fa0b6}.recipient-actions{display:flex;gap:7px}.recipient-actions button,.coupon-list button{min-height:34px;padding:7px 9px}.recipient-actions .subtle,.coupon-list .subtle{border:1px solid rgba(203,213,225,.14);background:transparent;color:#b7c5d4}
@media(max-width:1050px){.finance-metrics{grid-template-columns:repeat(2,1fr)}.finance-summary-grid{grid-template-columns:repeat(2,1fr)}}@media(max-width:680px){.finance-provider{align-items:flex-start;flex-direction:column}.finance-metrics,.finance-grid{grid-template-columns:1fr}.finance-card-wide{grid-column:auto}.finance-tabs .refresh{margin-left:0}.recipient-list article,.coupon-list article{grid-template-columns:1fr;align-items:start}.recipient-values{justify-content:flex-start}.recipient-values span{text-align:left}.recipient-actions{width:100%}.recipient-actions button{flex:1}.finance-form-row{grid-template-columns:1fr}.finance-summary-grid{grid-template-columns:1fr 1fr}}
`;

export default AdminFinance;
