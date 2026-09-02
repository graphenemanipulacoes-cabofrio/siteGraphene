import { useCallback, useEffect, useMemo, useState } from 'react';
import { CheckCircle2, ChevronDown, ChevronUp, ClipboardList, CreditCard, ExternalLink, FileText, LoaderCircle, MapPin, PackageCheck, RefreshCw, Search, Truck, UserRound } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { getSession } from '../utils/security';
import { toast } from 'sonner';

const money = value => Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const dateTime = value => value ? new Date(value).toLocaleString('pt-BR') : '—';
const statusMap = {
    awaiting_payment: 'Aguardando pagamento', paid: 'Pago', processing: 'Em preparação',
    shipped: 'Enviado', delivered: 'Entregue', cancelled: 'Cancelado'
};
const paymentMap = { pending: 'Pendente', paid: 'Confirmado', failed: 'Falhou', refunded: 'Estornado' };
const statusOptions = Object.entries(statusMap);

const AdminOrders = ({ onUnauthorized }) => {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState('');
    const [expanded, setExpanded] = useState('');
    const [search, setSearch] = useState('');
    const [filter, setFilter] = useState('all');
    const [drafts, setDrafts] = useState({});

    const invoke = useCallback(async body => {
        const session = getSession();
        if (!session?.token) {
            onUnauthorized();
            return { error: true };
        }
        const result = await supabase.functions.invoke('admin-orders', {
            body,
            headers: { 'x-admin-token': session.token }
        });
        if (result.error || result.data?.error === 'unauthorized') {
            if (result.data?.error === 'unauthorized') onUnauthorized();
            return { error: result.data?.error || result.error };
        }
        return result;
    }, [onUnauthorized]);

    const loadOrders = useCallback(async () => {
        setLoading(true);
        const { data, error } = await invoke({ action: 'list' });
        if (error) toast.error('Não foi possível carregar os pedidos.');
        else setOrders(data.orders || []);
        setLoading(false);
    }, [invoke]);

    useEffect(() => {
        const timer = window.setTimeout(loadOrders, 0);
        return () => window.clearTimeout(timer);
    }, [loadOrders]);

    const openOrder = order => {
        setExpanded(current => current === order.id ? '' : order.id);
        setDrafts(current => current[order.id] ? current : ({ ...current, [order.id]: {
            status: order.status, carrier: order.carrier || '', trackingCode: order.tracking_code || '',
            invoiceNumber: order.invoice_number || '', invoiceUrl: order.invoice_url || '', adminNotes: order.admin_notes || ''
        }}));
    };

    const setDraft = (id, field, value) => setDrafts(current => ({ ...current, [id]: { ...current[id], [field]: value } }));

    const saveOrder = async order => {
        const draft = drafts[order.id];
        setSaving(order.id);
        const { data, error } = await invoke({ action: 'update', orderId: order.id, ...draft });
        setSaving('');
        if (error) {
            const messages = {
                payment_not_confirmed: 'O pedido ainda não tem pagamento confirmado.',
                shipping_data_required: 'Informe a transportadora e o código de rastreio antes de marcar como enviado.'
            };
            toast.error(messages[error] || 'Não foi possível atualizar o pedido.');
            return;
        }
        setOrders(current => current.map(item => item.id === order.id ? { ...item, ...data.order } : item));
        toast.success('Pedido e dados logísticos atualizados.');
    };

    const visibleOrders = useMemo(() => {
        const term = search.trim().toLowerCase();
        return orders.filter(order => {
            const address = order.shipping_address || {};
            const matchesFilter = filter === 'all' || order.status === filter;
            const haystack = `${order.id} ${order.customer_email} ${order.customer_document || ''} ${address.name || ''} ${address.phone || ''} ${address.address || ''}`.toLowerCase();
            return matchesFilter && (!term || haystack.includes(term));
        });
    }, [orders, search, filter]);

    const summary = useMemo(() => ({
        paid: orders.filter(order => order.payment_status === 'paid').length,
        preparation: orders.filter(order => order.status === 'paid' || order.status === 'processing').length,
        shipped: orders.filter(order => order.status === 'shipped').length,
        total: orders.length
    }), [orders]);

    return <section className="admin-orders">
        <div className="order-metrics">
            <article><ClipboardList/><div><strong>{summary.total}</strong><span>Pedidos</span></div></article>
            <article><CreditCard/><div><strong>{summary.paid}</strong><span>Pagos</span></div></article>
            <article><PackageCheck/><div><strong>{summary.preparation}</strong><span>Para preparar</span></div></article>
            <article><Truck/><div><strong>{summary.shipped}</strong><span>Em transporte</span></div></article>
        </div>

        <div className="order-toolbar">
            <label><Search size={17}/><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Buscar cliente, pedido, CPF ou telefone" /></label>
            <select value={filter} onChange={event => setFilter(event.target.value)}>
                <option value="all">Todos os status</option>
                {statusOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
            <button onClick={loadOrders} disabled={loading}><RefreshCw size={16} className={loading ? 'spin' : ''}/> Atualizar</button>
        </div>

        {loading ? <div className="orders-feedback"><LoaderCircle className="spin"/> Carregando pedidos...</div> : visibleOrders.length === 0 ?
            <div className="orders-feedback"><PackageCheck/> Nenhum pedido encontrado.</div> :
            <div className="admin-order-list">{visibleOrders.map(order => {
                const address = order.shipping_address || {};
                const draft = drafts[order.id] || {};
                const isOpen = expanded === order.id;
                return <article className={`admin-order-card ${isOpen ? 'expanded' : ''}`} key={order.id}>
                    <button className="order-card-summary" onClick={() => openOrder(order)}>
                        <span className={`order-status status-${order.status}`}>{statusMap[order.status] || order.status}</span>
                        <div><strong>#{order.id.slice(-8).toUpperCase()}</strong><small>{dateTime(order.created_at)}</small></div>
                        <div><strong>{address.name || order.customer_email}</strong><small>{order.customer_email}</small></div>
                        <div className="order-payment"><strong>{money(order.total)}</strong><small className={`payment-${order.payment_status}`}>{paymentMap[order.payment_status]}</small></div>
                        {isOpen ? <ChevronUp/> : <ChevronDown/>}
                    </button>

                    {isOpen && <div className="order-detail">
                        <div className="order-info-grid">
                            <section><h3><UserRound/> Cliente e nota fiscal</h3>
                                <dl><div><dt>Nome</dt><dd>{address.name || '—'}</dd></div><div><dt>CPF</dt><dd>{order.customer_document || 'Não informado'}</dd></div><div><dt>E-mail</dt><dd>{order.customer_email}</dd></div><div><dt>WhatsApp</dt><dd>{address.phone || '—'}</dd></div></dl>
                            </section>
                            <section><h3><MapPin/> Endereço de entrega</h3>
                                <p>{address.address || '—'}, {address.number || 's/n'}{address.complement ? ` — ${address.complement}` : ''}</p>
                                <p>CEP: {address.zip || '—'}</p>
                            </section>
                            <section><h3><CreditCard/> Pagamento</h3>
                                <dl><div><dt>Status</dt><dd>{paymentMap[order.payment_status]}</dd></div><div><dt>Pago em</dt><dd>{dateTime(order.paid_at)}</dd></div><div><dt>Meio</dt><dd>{order.payment_method || '—'}</dd></div><div><dt>Referência</dt><dd>{order.payment_reference || '—'}</dd></div></dl>
                            </section>
                        </div>

                        <section className="order-products"><h3><PackageCheck/> Produtos para separação</h3>
                            {(order.order_items || []).map(item => <div key={item.id}><span><b>{item.quantity}×</b> {item.product_name}</span><span>{money(item.unit_price)} un.</span><strong>{money(Number(item.unit_price) * item.quantity)}</strong></div>)}
                            <div className="order-products-total"><span>Total do pedido</span><strong>{money(order.total)}</strong></div>
                        </section>

                        <section className="logistics-form"><h3><Truck/> Logística e documentação</h3>
                            <div className="logistics-grid">
                                <label>Status do pedido<select value={draft.status || order.status} onChange={event => setDraft(order.id, 'status', event.target.value)}>{statusOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
                                <label>Transportadora<input value={draft.carrier || ''} onChange={event => setDraft(order.id, 'carrier', event.target.value)} placeholder="Correios, Jadlog..." /></label>
                                <label>Código de rastreio<input value={draft.trackingCode || ''} onChange={event => setDraft(order.id, 'trackingCode', event.target.value)} placeholder="Código do envio" /></label>
                                <label>Número da nota fiscal<input value={draft.invoiceNumber || ''} onChange={event => setDraft(order.id, 'invoiceNumber', event.target.value)} placeholder="NF-e 000123" /></label>
                                <label className="span-2">Link da nota fiscal<input type="url" value={draft.invoiceUrl || ''} onChange={event => setDraft(order.id, 'invoiceUrl', event.target.value)} placeholder="https://..." /></label>
                                <label className="span-2">Observações internas<textarea value={draft.adminNotes || ''} onChange={event => setDraft(order.id, 'adminNotes', event.target.value)} rows="3" placeholder="Separação, embalagem, contato com cliente..." /></label>
                            </div>
                            <div className="logistics-actions">
                                {draft.invoiceUrl && <a href={draft.invoiceUrl} target="_blank" rel="noreferrer"><ExternalLink size={16}/> Abrir nota</a>}
                                <button onClick={() => saveOrder(order)} disabled={saving === order.id}>{saving === order.id ? <LoaderCircle className="spin"/> : <CheckCircle2/>} Salvar andamento</button>
                            </div>
                        </section>
                    </div>}
                </article>;
            })}</div>}
        <style>{styles}</style>
    </section>;
};

const styles = `
.admin-orders{display:grid;gap:18px}.order-metrics{display:grid;grid-template-columns:repeat(4,1fr);gap:14px}.order-metrics article{position:relative;display:flex;align-items:center;gap:13px;min-height:94px;padding:18px;border:1px solid rgba(203,213,225,.12);border-radius:15px;background:linear-gradient(145deg,rgba(22,35,52,.92),rgba(13,24,38,.92));box-shadow:0 10px 24px rgba(0,0,0,.14);overflow:hidden}.order-metrics article:after{content:'';position:absolute;right:-22px;bottom:-38px;width:92px;height:92px;border-radius:50%;background:rgba(34,199,232,.08)}.order-metrics svg{position:relative;z-index:1;box-sizing:content-box;padding:10px;border-radius:11px;color:#67dcf3;background:rgba(34,199,232,.11)}.order-metrics article:nth-child(2) svg{color:#65e7b5;background:rgba(36,211,154,.11)}.order-metrics article:nth-child(3) svg{color:#fcd36c;background:rgba(251,191,36,.1)}.order-metrics article:nth-child(4) svg{color:#a9b5ff;background:rgba(129,140,248,.11)}.order-metrics strong{display:block;font-family:var(--font-heading);font-size:1.65rem;line-height:1.1;color:#fff}.order-metrics span{display:block;margin-top:5px;font-size:.72rem;font-weight:700;color:#95a6ba}.order-toolbar{display:grid;grid-template-columns:minmax(240px,1fr) 205px auto;gap:10px;padding:10px;border:1px solid rgba(203,213,225,.1);border-radius:14px;background:rgba(13,25,40,.78)}.order-toolbar label{display:flex;align-items:center;gap:9px;padding:0 13px}.order-toolbar label,.order-toolbar select{border:1px solid rgba(203,213,225,.12);background:#0a1524;color:#f8fafc;border-radius:9px}.order-toolbar label:focus-within{border-color:rgba(103,220,243,.68);box-shadow:0 0 0 3px rgba(34,199,232,.09)}.order-toolbar input{width:100%;padding:11px 0;background:transparent;border:0;color:#fff;outline:0}.order-toolbar select{padding:0 11px}.order-toolbar button,.logistics-actions button,.logistics-actions a{display:flex;align-items:center;justify-content:center;gap:7px;cursor:pointer}.order-toolbar button{padding:0 14px;border:0;border-radius:9px;background:#22c7e8;color:#031319;font-weight:800}.orders-feedback{min-height:250px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:11px;color:#9cadbf;border:1px dashed rgba(203,213,225,.17);border-radius:15px;background:rgba(13,25,40,.45);font-size:.86rem}.orders-feedback svg{width:29px;height:29px;color:#67dcf3}.admin-order-list{display:grid;gap:11px}.admin-order-card{border:1px solid rgba(203,213,225,.11);border-radius:14px;background:linear-gradient(145deg,rgba(18,31,47,.9),rgba(10,20,33,.9));box-shadow:0 8px 22px rgba(0,0,0,.12);overflow:hidden;transition:border-color .2s,transform .2s}.admin-order-card:hover{border-color:rgba(103,220,243,.3)}.admin-order-card.expanded{border-color:rgba(34,199,232,.4)}.order-card-summary{width:100%;display:grid;grid-template-columns:132px 148px minmax(200px,1fr) 128px 24px;align-items:center;gap:16px;padding:18px 19px;text-align:left;background:transparent;color:#fff;border:0;cursor:pointer}.order-card-summary>div{display:grid;gap:4px}.order-card-summary small{font-size:.7rem;color:#8d9db0}.order-payment{text-align:right}.order-status{justify-self:start;padding:6px 10px;border-radius:999px;font-size:.66rem;font-weight:800;letter-spacing:.02em;text-align:center;background:rgba(148,163,184,.15);color:#cbd5e1}.status-paid{background:rgba(34,197,94,.15);color:#6ee7a2}.status-processing{background:rgba(56,189,248,.15);color:#7dd3fc}.status-shipped{background:rgba(99,102,241,.18);color:#b5befe}.status-delivered{background:rgba(16,185,129,.18);color:#6ee7b7}.status-cancelled{background:rgba(248,113,113,.13);color:#fca5a5}.payment-paid{color:#65e7b5!important}.payment-failed{color:#fda4af!important}.order-detail{padding:0 18px 20px;border-top:1px solid rgba(203,213,225,.1)}.order-info-grid{display:grid;grid-template-columns:1.2fr 1fr 1fr;gap:12px;padding:18px 0}.order-info-grid section,.order-products,.logistics-form{padding:17px;border:1px solid rgba(203,213,225,.1);border-radius:12px;background:rgba(5,14,26,.38)}.order-detail h3{display:flex;align-items:center;gap:7px;font-size:.8rem;letter-spacing:.01em;margin-bottom:13px;color:#e6edf7}.order-detail h3 svg{width:17px;color:#67dcf3}.order-info-grid p{font-size:.8rem;color:#c4d0de;line-height:1.65}.order-info-grid dl{display:grid;gap:8px}.order-info-grid dl div{display:grid;grid-template-columns:74px 1fr;gap:7px}.order-info-grid dt{font-size:.68rem;color:#718298}.order-info-grid dd{font-size:.77rem;color:#e2e8f0;overflow-wrap:anywhere}.order-products{margin-bottom:12px}.order-products>div{display:grid;grid-template-columns:1fr 120px 120px;gap:12px;padding:10px 0;border-bottom:1px solid rgba(203,213,225,.07);font-size:.78rem}.order-products>div span:nth-child(2),.order-products>div strong{text-align:right}.order-products-total{font-size:.9rem!important;border:0!important;padding-top:14px!important}.logistics-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:12px}.logistics-grid label{display:grid;gap:6px;font-size:.68rem;font-weight:700;color:#91a3b8}.logistics-grid input,.logistics-grid select,.logistics-grid textarea{padding:10px;border:1px solid rgba(203,213,225,.13);border-radius:8px;background:#0a1524;color:#f8fafc;outline:0;resize:vertical}.logistics-grid input:focus,.logistics-grid select:focus,.logistics-grid textarea:focus{border-color:#38bdf8;box-shadow:0 0 0 3px rgba(34,199,232,.1)}.span-2{grid-column:span 2}.logistics-actions{display:flex;justify-content:flex-end;gap:10px;margin-top:14px}.logistics-actions button,.logistics-actions a{border-radius:8px;padding:11px 15px;font-weight:800;font-size:.75rem}.logistics-actions button{border:0;background:#22c7e8;color:#031319}.logistics-actions a{border:1px solid rgba(203,213,225,.16);color:#cbd5e1}.spin{animation:spin 1s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}
@media(max-width:1050px){.order-metrics{grid-template-columns:repeat(2,1fr)}.order-card-summary{grid-template-columns:125px 130px 1fr 100px 20px}.order-info-grid{grid-template-columns:1fr 1fr}.order-info-grid section:last-child{grid-column:span 2}}
@media(max-width:680px){.order-metrics{gap:10px}.order-metrics article{min-height:84px;padding:13px;gap:9px}.order-metrics article svg{width:18px;height:18px;padding:8px}.order-metrics strong{font-size:1.35rem}.order-toolbar{grid-template-columns:1fr;padding:8px}.order-toolbar select,.order-toolbar button{min-height:43px}.order-card-summary{grid-template-columns:1fr auto;gap:8px 12px;padding:15px}.order-card-summary .order-status{grid-column:1}.order-card-summary>div:nth-of-type(2){grid-column:1/-1}.order-payment{grid-column:2;grid-row:1;text-align:right}.order-card-summary>svg{grid-column:2;grid-row:2}.order-info-grid{grid-template-columns:1fr}.order-info-grid section:last-child{grid-column:auto}.order-products>div{grid-template-columns:1fr auto}.order-products>div span:nth-child(2){display:none}.logistics-grid{grid-template-columns:1fr}.span-2{grid-column:auto}.logistics-actions{flex-direction:column}.logistics-actions>*{width:100%}}
`;

export default AdminOrders;
