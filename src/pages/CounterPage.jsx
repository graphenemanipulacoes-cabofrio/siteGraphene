import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlertCircle, ArrowLeft, CalendarDays, CheckCircle2, ChevronLeft, ChevronRight, Clock, Copy, ExternalLink, FileText, Inbox, LoaderCircle, LockKeyhole, LogOut, MapPin, MessageCircle, Moon, PackageCheck, Printer, Receipt, RefreshCw, Search, ShieldCheck, StickyNote, Sun, Truck, UserRound, X, XCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { counterRequest } from '../lib/counterApi';
import { COUNTER_SESSION_KEY, addressText, adminStaffSession, clearCounterSession, dateTime, money, paymentStatusLabels, readCounterSession, safeLink, staffRoleLabels, whatsappLink } from '../utils/counter';
import { destroySession } from '../utils/security';
import '../styles/counter-page.css';

const THEME_KEY = 'graphene_counter_theme';
const emptyFilters = { search: '', status: '', payment: '', from: '', to: '' };

function readTheme() {
    try {
        const saved = localStorage.getItem(THEME_KEY);
        if (saved === 'light' || saved === 'dark') return saved;
    } catch { /* Preferência indisponível: segue o sistema. */ }
    try { return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'; } catch { return 'light'; }
}

// One plain instruction per order, derived from payment and shipping status.
function orderStage(order) {
    const { status, payment_status: payment } = order;
    if (status === 'cancelled') return { tone: 'danger', icon: XCircle, label: 'Cancelado', hint: 'Não separar e não enviar.' };
    if (payment === 'refunded') return { tone: 'danger', icon: XCircle, label: 'Pagamento estornado', hint: 'Não enviar. Confirme com a administração.' };
    if (status === 'delivered') return { tone: 'done', icon: CheckCircle2, label: 'Entregue', hint: 'Pedido concluído.' };
    if (status === 'shipped') return { tone: 'info', icon: Truck, label: 'Enviado', hint: 'Já saiu da loja. Não enviar de novo.' };
    if (payment === 'paid' && ['paid', 'processing'].includes(status)) return { tone: 'go', icon: PackageCheck, label: 'Separar e enviar', hint: 'Pagamento confirmado. Confira os produtos e o endereço antes de enviar.' };
    if (payment === 'failed') return { tone: 'danger', icon: AlertCircle, label: 'Pagamento recusado', hint: 'Não separar. O cliente precisa pagar de novo.' };
    return { tone: 'wait', icon: Clock, label: 'Aguardando pagamento', hint: 'Não separar nem enviar até o pagamento ser confirmado.' };
}

const requestStage = { tone: 'wait', icon: Inbox, label: 'Orçamento para responder', hint: 'Ainda não é uma venda. Valor, pagamento e entrega precisam ser combinados com o cliente.' };
const shortId = id => String(id).slice(-8).toUpperCase();
const itemCount = order => (order.order_items || []).reduce((sum, item) => sum + Number(item.quantity || 0), 0);

function StagePill({ stage }) {
    const Icon = stage.icon;
    return <span className={`counter-pill tone-${stage.tone}`}><Icon size={14} aria-hidden="true"/>{stage.label}</span>;
}

function StageBanner({ stage, children }) {
    const Icon = stage.icon;
    return <div className={`counter-stage tone-${stage.tone}`} role="status">
        <Icon size={28} aria-hidden="true"/>
        <div><strong>{stage.label}</strong><p>{children || stage.hint}</p></div>
    </div>;
}

function Block({ title, icon, children, className = '', action }) {
    const Icon = icon;
    return <section className={`counter-block ${className}`}>
        <header><h3><Icon size={18} aria-hidden="true"/>{title}</h3>{action}</header>
        {children}
    </section>;
}

function Row({ label, children }) {
    return <div className="counter-row-field"><dt>{label}</dt><dd>{children || <span className="counter-missing">Não informado</span>}</dd></div>;
}

function WhatsAppButton({ phone }) {
    const link = whatsappLink(phone);
    if (!link) return phone ? <span>{phone}</span> : <span className="counter-missing">Não informado</span>;
    return <a className="counter-whatsapp" href={link} target="_blank" rel="noreferrer"><MessageCircle size={16} aria-hidden="true"/>{phone}<span className="counter-sr">(abrir no WhatsApp)</span></a>;
}

function ThemeToggle({ theme, onToggle }) {
    const dark = theme === 'dark';
    return <button type="button" className="counter-theme-toggle" onClick={onToggle} aria-pressed={dark} title={dark ? 'Mudar para o modo claro' : 'Mudar para o modo escuro'}>
        {dark ? <Sun size={17} aria-hidden="true"/> : <Moon size={17} aria-hidden="true"/>}
        <span>{dark ? 'Modo claro' : 'Modo escuro'}</span>
    </button>;
}

function OrderDetail({ order, products, onCopy }) {
    const address = order.shipping_address || {};
    const invoiceLink = safeLink(order.invoice_url);
    const stage = orderStage(order);
    const items = order.order_items || [];
    const units = itemCount(order);
    const paidHint = stage.tone === 'go' && order.paid_at ? `Pagamento confirmado em ${dateTime(order.paid_at)}. Confira os produtos e o endereço antes de enviar.` : null;
    const street = [address.address, address.number ? `nº ${address.number}` : ''].filter(Boolean).join(', ');
    const city = [address.city, address.state].filter(Boolean).join(' / ');

    return <>
        <StageBanner stage={stage}>{paidHint}</StageBanner>

        {order.admin_notes && <section className="counter-note">
            <h3><StickyNote size={18} aria-hidden="true"/>Recado da administração</h3>
            <p className="counter-preline">{order.admin_notes}</p>
        </section>}

        <Block title={stage.tone === 'go' ? 'O que separar' : 'Produtos do pedido'} icon={PackageCheck} className="counter-pick" action={<span className="counter-count">{units} {units === 1 ? 'unidade' : 'unidades'}</span>}>
            {items.length ? <ul className="counter-pick-list">
                {items.map(item => <li key={item.id}>
                    <span className="counter-qty" aria-label={`${item.quantity} unidades`}>{item.quantity}×</span>
                    <div><strong>{item.product_name}</strong><small>Código {item.product_id || 'não informado'}</small></div>
                </li>)}
            </ul> : <p className="counter-missing">Nenhum produto registrado. Confirme com a administração antes de separar.</p>}
        </Block>

        <div className="counter-pair">
            <Block title="Entregar para" icon={MapPin} action={<button type="button" className="counter-button small" onClick={() => onCopy(addressText(address))}><Copy size={15} aria-hidden="true"/>Copiar endereço</button>}>
                <address className="counter-address">
                    <strong>{address.name || 'Destinatário não informado'}</strong>
                    <span>{street || 'Endereço não informado'}</span>
                    {address.complement && <span>{address.complement}</span>}
                    {address.neighborhood && <span>{address.neighborhood}</span>}
                    {city && <span>{city}</span>}
                    <span>CEP {address.zip || 'não informado'}</span>
                </address>
            </Block>
            <Block title="Cliente" icon={UserRound}>
                <dl className="counter-fields">
                    <Row label="Nome">{address.name}</Row>
                    <Row label="WhatsApp"><WhatsAppButton phone={address.phone}/></Row>
                    <Row label="E-mail">{order.customer_email}</Row>
                    <Row label="CPF para a nota">{order.customer_document}</Row>
                </dl>
            </Block>
        </div>

        <div className="counter-pair">
            <Block title="Envio e nota fiscal" icon={Truck}>
                <dl className="counter-fields">
                    <Row label="Transportadora">{order.carrier}</Row>
                    <Row label="Rastreio">{order.tracking_code}</Row>
                    <Row label="Nota fiscal">{order.invoice_number}</Row>
                    <Row label="Arquivo da nota">{invoiceLink ? <a href={invoiceLink} target="_blank" rel="noreferrer">Abrir nota fiscal <ExternalLink size={13} aria-hidden="true"/></a> : <span className="counter-missing">Ainda não disponível</span>}</Row>
                    <Row label="Enviado em">{order.shipped_at ? dateTime(order.shipped_at) : <span className="counter-missing">Ainda não enviado</span>}</Row>
                    <Row label="Entregue em">{order.delivered_at ? dateTime(order.delivered_at) : <span className="counter-missing">Ainda não entregue</span>}</Row>
                </dl>
            </Block>
            <Block title="Valores e pagamento" icon={Receipt}>
                <dl className="counter-fields counter-money">
                    <Row label="Produtos">{money(order.subtotal)}</Row>
                    <Row label={order.discount_code ? `Desconto (${order.discount_code})` : 'Desconto'}>{Number(order.discount_amount) ? `− ${money(order.discount_amount)}` : money(0)}</Row>
                    <Row label="Frete">{money(order.shipping_amount)}</Row>
                    <div className="counter-row-field counter-grand"><dt>{order.payment_status === 'paid' ? 'Total pago' : 'Total do pedido'}</dt><dd>{money(order.total)}</dd></div>
                    <Row label="Pagamento">{paymentStatusLabels[order.payment_status] || order.payment_status}</Row>
                    <Row label="Forma">{order.payment_method}</Row>
                    <Row label="Confirmado em">{order.paid_at ? dateTime(order.paid_at) : <span className="counter-missing">Ainda não confirmado</span>}</Row>
                    <Row label="Código Mercado Pago">{order.payment_reference}</Row>
                </dl>
            </Block>
        </div>

        {products.length > 0 && <details className="counter-catalog">
            <summary>Descrição atual dos produtos no catálogo</summary>
            <p className="counter-muted">Para consulta. Os nomes e quantidades do pedido são os registrados na compra.</p>
            {products.map(product => <div className="counter-catalog-item" key={product.id}>
                <strong>{product.name} <small>Código {product.id}</small></strong>
                <p className="counter-preline">{product.description || 'Descrição não informada.'}</p>
                {safeLink(product.image_url) && <a href={safeLink(product.image_url)} target="_blank" rel="noreferrer">Ver foto do produto <ExternalLink size={13} aria-hidden="true"/></a>}
            </div>)}
        </details>}

        <p className="counter-detail-meta">Pedido completo: <span>{order.id}</span><br/>Comprado em {dateTime(order.created_at)}. Última alteração em {dateTime(order.updated_at)}. Andamento, rastreio e nota são alterados no painel admin.</p>
    </>;
}

function RequestDetail({ request, files, onRefresh }) {
    return <>
        <StageBanner stage={requestStage}/>
        <div className="counter-pair">
            <Block title="Cliente" icon={UserRound}>
                <dl className="counter-fields">
                    <Row label="Nome">{request.nome_cliente}</Row>
                    <Row label="WhatsApp"><WhatsAppButton phone={request.whatsapp}/></Row>
                    <Row label="Recebida em">{dateTime(request.created_at)}</Row>
                    <Row label="Número">{`Solicitação ${request.id}`}</Row>
                </dl>
                <p className="counter-muted">O endereço de entrega não é pedido neste formulário. Confirme com o cliente.</p>
            </Block>
            <Block title="O que o cliente escreveu" icon={FileText}>
                <p className="counter-preline">{request.observacoes || <span className="counter-missing">O cliente não escreveu nada. Veja os anexos.</span>}</p>
            </Block>
        </div>
        <Block title="Receitas e anexos" icon={ShieldCheck} action={<button type="button" className="counter-button small" onClick={onRefresh}><RefreshCw size={15} aria-hidden="true"/>Gerar links de novo</button>}>
            {files.length ? <div className="counter-files">
                {files.map((file, index) => <a className="counter-file" key={`${file.name}-${index}`} href={safeLink(file.url) || '#'} target="_blank" rel="noreferrer">
                    <FileText size={22} aria-hidden="true"/>
                    <span><strong>Abrir anexo {index + 1}</strong><small>{file.name?.toLowerCase().endsWith('.pdf') ? 'PDF' : 'Imagem'}</small></span>
                    <ExternalLink size={15} aria-hidden="true"/>
                </a>)}
            </div> : <p className="counter-missing">Nenhum anexo nesta solicitação.</p>}
            <p className="counter-muted">Por segurança, cada link abre por 5 minutos. Se expirar, clique em “Gerar links de novo”. Não encaminhe receitas para fora da equipe.</p>
        </Block>
    </>;
}

export default function CounterPage() {
    // Administradores entram com o login do painel (ou direto, se já entraram nele).
    const [session, setSession] = useState(() => readCounterSession() || adminStaffSession());
    const [theme, setTheme] = useState(readTheme);
    const [credentials, setCredentials] = useState({ username: '', password: '' });
    const [loginBusy, setLoginBusy] = useState(false);
    const [logoutBusy, setLogoutBusy] = useState(false);
    const [loginError, setLoginError] = useState('');
    const [tab, setTab] = useState('orders');
    const [filters, setFilters] = useState(emptyFilters);
    const [query, setQuery] = useState(emptyFilters);
    const [showDates, setShowDates] = useState(false);
    const [offset, setOffset] = useState(0);
    const [rows, setRows] = useState([]);
    const [total, setTotal] = useState(0);
    const [metrics, setMetrics] = useState({ preparation: 0, shipped: 0, requests: 0 });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [updatedAt, setUpdatedAt] = useState(null);
    const [selected, setSelected] = useState(null);
    const [detail, setDetail] = useState(null);
    const [detailLoading, setDetailLoading] = useState(false);
    const [detailError, setDetailError] = useState('');
    const [notice, setNotice] = useState('');
    const loadSequence = useRef(0);
    const detailSequence = useRef(0);
    const selectedRef = useRef(null);

    const toggleTheme = () => setTheme(current => {
        const next = current === 'dark' ? 'light' : 'dark';
        try { localStorage.setItem(THEME_KEY, next); } catch { /* A escolha vale só nesta visita. */ }
        return next;
    });

    const revokeLocalAccess = useCallback(message => {
        selectedRef.current = null;
        clearCounterSession(); setSession(null); setRows([]); setDetail(null); setSelected(null); setLoginError(message);
        loadSequence.current++; detailSequence.current++;
    }, []);
    const invoke = useCallback(async body => {
        try { return await counterRequest({ ...body, sessionToken: session?.token }); }
        catch (failure) {
            if (failure.code === 'unauthorized') { if (session?.borrowed) destroySession(); revokeLocalAccess(failure.message); }
            throw failure;
        }
    }, [session?.token, session?.borrowed, revokeLocalAccess]);
    const load = useCallback(async (foreground = true) => {
        if (!session?.token) return;
        const sequence = ++loadSequence.current;
        if (foreground) setLoading(true);
        try {
            const [result, summary] = await Promise.all([invoke({ action: tab === 'orders' ? 'list_orders' : 'list_requests', ...query, offset }), invoke({ action: 'summary' })]);
            if (sequence !== loadSequence.current) return;
            setRows(result.rows); setTotal(result.total); setMetrics(summary); setError(''); setUpdatedAt(new Date().toISOString());
            const current = selectedRef.current;
            if (current) {
                const detailVersion = ++detailSequence.current;
                try {
                    const refreshed = await invoke({ action: current.type === 'orders' ? 'order_detail' : 'request_detail', id: current.id });
                    if (detailVersion === detailSequence.current && sequence === loadSequence.current) { setDetail(refreshed); setDetailError(''); setDetailLoading(false); }
                } catch (failure) {
                    if (detailVersion === detailSequence.current && sequence === loadSequence.current) { setDetailError(failure.message); setDetailLoading(false); }
                }
            }
        } catch (failure) { if (sequence === loadSequence.current) setError(failure.message); }
        finally { if (sequence === loadSequence.current) setLoading(false); }
    }, [session?.token, invoke, tab, query, offset]);
    useEffect(() => {
        const sequenceRef = loadSequence;
        const initial = window.setTimeout(() => load(), 0);
        const timer = window.setInterval(() => { if (document.visibilityState === 'visible') load(false); }, 30_000);
        const focus = () => load(false);
        const storage = event => { if (event.key === COUNTER_SESSION_KEY && !event.newValue) revokeLocalAccess('O acesso foi encerrado em outra aba.'); };
        window.addEventListener('focus', focus); window.addEventListener('storage', storage);
        return () => { window.clearTimeout(initial); window.clearInterval(timer); window.removeEventListener('focus', focus); window.removeEventListener('storage', storage); sequenceRef.current++; };
    }, [load, revokeLocalAccess]);
    useEffect(() => { if (!notice) return; const timer = setTimeout(() => setNotice(''), 4000); return () => clearTimeout(timer); }, [notice]);

    const login = async event => {
        event.preventDefault(); setLoginBusy(true); setLoginError('');
        let newSession;
        try {
            newSession = await counterRequest({ action: 'login', ...credentials, deviceLabel: `${navigator.platform || 'Computador'} · balcão` });
            localStorage.setItem(COUNTER_SESSION_KEY, JSON.stringify(newSession));
            setSession(newSession); setCredentials({ username: '', password: '' });
        } catch (failure) {
            if (newSession?.token) { counterRequest({ action: 'logout', sessionToken: newSession.token }).catch(() => {}); setLoginError('O navegador não permite salvar a sessão. Habilite o armazenamento para usar o balcão.'); }
            else setLoginError(failure.message);
        } finally { setLoginBusy(false); }
    };
    const logout = async () => {
        setLogoutBusy(true);
        try { await invoke({ action: 'logout' }); if (session?.borrowed) destroySession(); revokeLocalAccess('Você saiu do balcão. O acesso deste navegador foi encerrado.'); }
        catch (failure) { if (failure.code !== 'unauthorized') setError('Não foi possível confirmar a saída no servidor. Tente de novo para encerrar o acesso.'); }
        finally { setLogoutBusy(false); }
    };
    const open = async (row, type = tab) => {
        const sequence = ++detailSequence.current;
        selectedRef.current = { id: row.id, type };
        setSelected({ id: row.id, type }); setDetail(null); setDetailLoading(true); setDetailError('');
        try { if (window.matchMedia('(max-width: 900px)').matches) window.scrollTo({ top: 0 }); } catch { /* Sem rolagem automática. */ }
        try { const result = await invoke({ action: type === 'orders' ? 'order_detail' : 'request_detail', id: row.id }); if (sequence === detailSequence.current) setDetail(result); }
        catch (failure) { if (sequence === detailSequence.current) setDetailError(failure.message); }
        finally { if (sequence === detailSequence.current) setDetailLoading(false); }
    };
    const closeDetail = () => { selectedRef.current = null; setSelected(null); setDetail(null); detailSequence.current++; };
    const switchTab = value => {
        if (value === tab) { closeDetail(); load(); return; }
        loadSequence.current++; setLoading(true); setRows([]); setTotal(0); setError(''); setTab(value); setOffset(0); closeDetail();
        setFilters(emptyFilters); setQuery(emptyFilters); setShowDates(false);
    };
    const applyQueue = queue => {
        const next = { ...filters, status: queue.status, payment: queue.payment || '' };
        setFilters(next); setQuery(next); setOffset(0); closeDetail();
    };
    const submitSearch = event => {
        event.preventDefault();
        if (filters.from && filters.to && filters.from > filters.to) { setError('A data inicial não pode ser depois da data final.'); return; }
        setOffset(0); setQuery({ ...filters });
    };
    const clearFilters = () => { setFilters(emptyFilters); setQuery(emptyFilters); setOffset(0); setShowDates(false); };
    const copy = async value => { try { await navigator.clipboard.writeText(value); setNotice('Endereço copiado.'); } catch { setNotice('Não foi possível copiar. Selecione o endereço e copie manualmente.'); } };

    const queues = useMemo(() => [
        { key: 'preparation', label: 'Para separar', status: 'preparation', payment: 'paid', count: metrics.preparation, tone: 'go' },
        { key: 'awaiting', label: 'Aguardando pagamento', status: 'awaiting_payment', tone: 'wait' },
        { key: 'shipped', label: 'Enviados', status: 'shipped', count: metrics.shipped, tone: 'info' },
        { key: 'delivered', label: 'Entregues', status: 'delivered', tone: 'done' },
        { key: 'cancelled', label: 'Cancelados', status: 'cancelled', tone: 'danger' },
        { key: 'all', label: 'Todos', status: '', tone: 'neutral' },
    ], [metrics.preparation, metrics.shipped]);
    const activeQueue = queues.find(queue => queue.status === query.status)?.key || 'all';
    const filtersActive = Boolean(query.search || query.from || query.to);
    const selectedTitle = selected ? selected.type === 'orders' ? `Pedido ${shortId(selected.id)}` : `Solicitação ${selected.id}` : '';
    const lastUpdate = updatedAt ? new Date(updatedAt).toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' }) : null;

    if (!session) return <main className="counter-root counter-login" data-theme={theme}>
        <div className="counter-login-top"><ThemeToggle theme={theme} onToggle={toggleTheme}/></div>
        <div className="counter-login-brand">
            <img src="/assets/logo.png" alt="Graphène"/>
            <h1>Balcão da loja</h1>
            <p>Pedidos para separar, endereços de entrega e orçamentos dos clientes, num só lugar.</p>
            <div><ShieldCheck size={20} aria-hidden="true"/> Acesso só para a equipe autorizada</div>
        </div>
        <form className="counter-login-form" onSubmit={login}>
            <h2>Entrar no balcão</h2>
            <p>Use o usuário e a senha criados no painel admin. Administradores entram com o login do painel.</p>
            <label htmlFor="counter-username">Usuário<input id="counter-username" autoComplete="username" autoCapitalize="none" spellCheck={false} required value={credentials.username} onChange={e => setCredentials({ ...credentials, username: e.target.value })}/></label>
            <label htmlFor="counter-password">Senha<input id="counter-password" type="password" autoComplete="current-password" required value={credentials.password} onChange={e => setCredentials({ ...credentials, password: e.target.value })}/></label>
            {loginError && <div className="counter-error" role="alert">{loginError}</div>}
            <button className="counter-button primary large" disabled={loginBusy}>{loginBusy ? <LoaderCircle className="counter-spin" size={18} aria-hidden="true"/> : <LockKeyhole size={18} aria-hidden="true"/>}{loginBusy ? 'Entrando…' : 'Entrar no balcão'}</button>
            <p className="counter-muted">O acesso fica salvo neste navegador até você clicar em “Sair”. Use só computadores da loja.</p>
            <Link to="/" className="counter-back"><ArrowLeft size={14} aria-hidden="true"/> Voltar ao site</Link>
        </form>
    </main>;

    return <div className="counter-root counter-workspace" data-theme={theme}>
        <aside className="counter-sidebar">
            <Link className="counter-brand" to="/balcaographene"><img src="/assets/logo.png" alt="Graphène"/><span>Balcão da loja</span></Link>
            <nav aria-label="Áreas do balcão">
                <button className={tab === 'orders' ? 'active' : ''} aria-current={tab === 'orders' ? 'page' : undefined} onClick={() => switchTab('orders')}><PackageCheck size={20} aria-hidden="true"/>Pedidos{metrics.preparation > 0 && <span title="Pedidos para separar">{metrics.preparation}</span>}</button>
                <button className={tab === 'requests' ? 'active' : ''} aria-current={tab === 'requests' ? 'page' : undefined} onClick={() => switchTab('requests')}><Inbox size={20} aria-hidden="true"/>Orçamentos{metrics.requests > 0 && <span title="Orçamentos para responder">{metrics.requests}</span>}</button>
            </nav>
            <div className="counter-sidebar-bottom">
                <span className="counter-user"><UserRound size={17} aria-hidden="true"/><span><strong>{session.user?.displayName}</strong><small>{session.user?.role === 'admin' ? staffRoleLabels.admin : session.user?.username}</small></span></span>
                {session.user?.role === 'admin' && <Link to="/admin"><ShieldCheck size={17} aria-hidden="true"/>Administração</Link>}
                <button onClick={logout} disabled={logoutBusy}><LogOut size={17} aria-hidden="true"/>{logoutBusy ? 'Saindo…' : 'Sair do balcão'}</button>
            </div>
        </aside>

        <main className={`counter-main ${selected ? 'detail-open' : ''}`}>
            <header className="counter-header">
                <div>
                    <h1>{tab === 'orders' ? 'Pedidos' : 'Orçamentos'}</h1>
                    <p>{tab === 'orders' ? 'Compras feitas no site. Separe e envie só os que estão em “Para separar”.' : 'Pedidos de orçamento enviados pelo site, com as receitas dos clientes.'}</p>
                </div>
                <div className="counter-header-actions">
                    <span className="counter-updated">{lastUpdate ? `Atualizado às ${lastUpdate}` : 'Carregando…'}</span>
                    <button className="counter-button" onClick={() => load()} disabled={loading}><RefreshCw size={16} className={loading ? 'counter-spin' : ''} aria-hidden="true"/>Atualizar</button>
                    <ThemeToggle theme={theme} onToggle={toggleTheme}/>
                    <button className="counter-button counter-mobile-only" onClick={logout} disabled={logoutBusy}><LogOut size={16} aria-hidden="true"/>Sair</button>
                </div>
            </header>

            <nav className="counter-mobile-tabs" aria-label="Áreas do balcão">
                <button aria-current={tab === 'orders' ? 'page' : undefined} onClick={() => switchTab('orders')}>Pedidos{metrics.preparation > 0 && <span>{metrics.preparation}</span>}</button>
                <button aria-current={tab === 'requests' ? 'page' : undefined} onClick={() => switchTab('requests')}>Orçamentos{metrics.requests > 0 && <span>{metrics.requests}</span>}</button>
            </nav>

            {tab === 'orders' && <div className="counter-queues" role="group" aria-label="Mostrar pedidos">
                {queues.map(queue => <button key={queue.key} type="button" className={`tone-${queue.tone}`} aria-pressed={activeQueue === queue.key} onClick={() => applyQueue(queue)}>
                    {queue.label}{queue.count != null && <span>{queue.count}</span>}
                </button>)}
            </div>}

            <form className="counter-search" onSubmit={submitSearch} role="search">
                <label className="counter-search-field">
                    <Search size={18} aria-hidden="true"/>
                    <span className="counter-sr">{tab === 'orders' ? 'Buscar pedido' : 'Buscar orçamento'}</span>
                    <input value={filters.search} onChange={e => setFilters({ ...filters, search: e.target.value })} maxLength={100} placeholder={tab === 'orders' ? 'Buscar por nome, e-mail, telefone ou endereço' : 'Buscar por nome, WhatsApp ou número'}/>
                </label>
                <button className="counter-button primary">Buscar</button>
                <button type="button" className="counter-button" aria-expanded={showDates} onClick={() => setShowDates(value => !value)}><CalendarDays size={16} aria-hidden="true"/>Datas</button>
                {(filtersActive || query.status) && <button type="button" className="counter-button quiet" onClick={clearFilters}><X size={16} aria-hidden="true"/>Limpar</button>}
                {showDates && <div className="counter-dates">
                    <label>De<input type="date" value={filters.from} onChange={e => setFilters({ ...filters, from: e.target.value })}/></label>
                    <label>Até<input type="date" value={filters.to} onChange={e => setFilters({ ...filters, to: e.target.value })}/></label>
                </div>}
            </form>

            {error && <div className="counter-error" role="alert">{error} {rows.length > 0 && 'A lista mostra a última atualização que deu certo.'}</div>}

            <div className={`counter-split ${selected ? 'has-detail' : ''}`}>
                <section className="counter-list" aria-label={tab === 'orders' ? 'Lista de pedidos' : 'Lista de orçamentos'}>
                    <header className="counter-list-heading"><h2>{total} {tab === 'orders' ? (total === 1 ? 'pedido' : 'pedidos') : (total === 1 ? 'orçamento' : 'orçamentos')}</h2><small>Mais recentes no topo</small></header>
                    {loading ? <div className="counter-empty" role="status"><LoaderCircle className="counter-spin" aria-hidden="true"/>Carregando…</div>
                        : !rows.length ? <div className="counter-empty"><Search aria-hidden="true"/><h3>{error ? 'Não foi possível carregar a lista' : 'Nada por aqui'}</h3><p>{error ? 'Clique em Atualizar para tentar de novo.' : tab === 'orders' && query.status ? 'Nenhum pedido nesta fila agora. Veja “Todos” para conferir os outros.' : 'Quando chegar um novo registro, ele aparece aqui sozinho.'}</p></div>
                        : rows.map(row => {
                            const stage = tab === 'orders' ? orderStage(row) : requestStage;
                            const isSelected = selected?.id === row.id && selected?.type === tab;
                            return <button className={`counter-item tone-${stage.tone} ${isSelected ? 'selected' : ''}`} key={row.id} onClick={() => open(row)} aria-current={isSelected ? 'true' : undefined}>
                                <span className="counter-item-top"><strong>{tab === 'orders' ? row.shipping_address?.name || row.customer_email : row.nome_cliente}</strong><time>{dateTime(row.created_at)}</time></span>
                                <StagePill stage={stage}/>
                                <span className="counter-item-meta">{tab === 'orders'
                                    ? <><span>Pedido {shortId(row.id)}</span><span>{itemCount(row)} {itemCount(row) === 1 ? 'unidade' : 'unidades'}</span><span>{money(row.total)}</span></>
                                    : <><span>Solicitação {row.id}</span>{row.whatsapp && <span>{row.whatsapp}</span>}</>}
                                </span>
                            </button>;
                        })}
                    <footer className="counter-pagination"><span>{total ? `${offset + 1} a ${Math.min(offset + 50, total)} de ${total}` : 'Nenhum registro'}</span><div><button aria-label="Página anterior" disabled={loading || offset === 0} onClick={() => setOffset(Math.max(0, offset - 50))}><ChevronLeft size={18}/></button><button aria-label="Próxima página" disabled={loading || offset + 50 >= total} onClick={() => setOffset(offset + 50)}><ChevronRight size={18}/></button></div></footer>
                </section>

                <section className="counter-detail" aria-label="Ficha">
                    {selected ? <>
                        <header className="counter-detail-heading">
                            <button type="button" className="counter-button quiet counter-mobile-only" onClick={closeDetail}><ArrowLeft size={16} aria-hidden="true"/>Voltar à lista</button>
                            <h2>{selectedTitle}</h2>
                            <div>
                                <button className="counter-button" disabled={!detail || detailLoading || Boolean(detailError)} onClick={() => window.print()}><Printer size={16} aria-hidden="true"/>Imprimir ficha</button>
                                <button className="counter-button icon counter-desktop-only" aria-label="Fechar ficha" onClick={closeDetail}><X size={18}/></button>
                            </div>
                        </header>
                        <div className="counter-detail-body">
                            {detailLoading ? <div className="counter-empty" role="status"><LoaderCircle className="counter-spin" aria-hidden="true"/>Abrindo ficha…</div>
                                : detailError ? <div className="counter-error" role="alert">{detailError}<button type="button" onClick={() => open(selected, selected.type)}>Tentar de novo</button></div>
                                : detail?.order ? <OrderDetail order={detail.order} products={detail.products || []} onCopy={copy}/>
                                : detail?.request ? <RequestDetail request={detail.request} files={detail.files || []} onRefresh={() => open(selected, selected.type)}/>
                                : null}
                            <div className="counter-print-footer">Graphène · ficha interna impressa em {dateTime(new Date().toISOString())}. Não é nota fiscal nem comprovante de pagamento.</div>
                        </div>
                    </> : <div className="counter-empty counter-detail-placeholder"><PackageCheck size={40} aria-hidden="true"/><h2>Escolha um {tab === 'orders' ? 'pedido' : 'orçamento'} na lista</h2><p>A ficha mostra o que fazer, os produtos, o endereço e o contato do cliente.</p></div>}
                </section>
            </div>

            <p className="counter-footer"><LockKeyhole size={14} aria-hidden="true"/>Somente consulta. A lista se atualiza sozinha a cada 30 segundos. Horário de Brasília.</p>
            {notice && <div className="counter-notice" role="status">{notice}</div>}
        </main>
    </div>;
}
