import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CircleDollarSign, Download, LoaderCircle, Mail, MessageCircle, Package, PhoneCall, RefreshCw, Repeat, Save, ShoppingCart, Trash2, Users } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '../lib/supabaseClient';
import { getSession } from '../utils/security';
import { PREFERENCE_LABELS, REASON_LABELS, ROLE_LABELS, SEGMENT_HELP, SEGMENT_LABELS, customerWhatsAppUrl, customersCsv, dayLabel, exportableCustomers, matchesCustomer, orderLabel, paymentLabel, phoneLabel, sortCustomers } from '../utils/customerInsights';
import '../styles/partnerResults.css';
import '../styles/customers.css';

const money = value => Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const pageSize = 40;
const dateTime = value => value ? new Date(value).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' }) : '—';
const plural = (count, one, many) => `${count} ${count === 1 ? one : many}`;
const awayLabel = days => days === null ? '' : days === 0 ? 'hoje' : days === 1 ? 'há 1 dia' : `há ${days} dias`;

function ContactLinks({ customer }) {
    const whatsapp = customerWhatsAppUrl(customer);
    return <span className="cu-contact-actions">
        {whatsapp && <a className="cu-link" href={whatsapp} target="_blank" rel="noopener noreferrer"><MessageCircle size={14} aria-hidden="true" /> WhatsApp</a>}
        {customer.email && customer.preference !== 'refused' && <a className="cu-link" href={`mailto:${customer.email}`}><Mail size={14} aria-hidden="true" /> E-mail</a>}
    </span>;
}

function ContactForm({ customer, busy, onSaveFollowup }) {
    const [preference, setPreference] = useState(customer.preference);
    const [nextContactOn, setNextContactOn] = useState(customer.nextContactOn || '');
    const id = name => `customer-${customer.key}-${name}`;
    return <form className="pr-form" onSubmit={event => { event.preventDefault(); onSaveFollowup(customer.key, preference, nextContactOn); }}>
        <h4>Pós-venda</h4>
        <div className="pr-form-grid">
            <div><label htmlFor={id('preference')}>Contato</label><select id={id('preference')} value={preference} onChange={event => setPreference(event.target.value)}>{Object.entries(PREFERENCE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div>
            <div><label htmlFor={id('next')}>Retornar em</label><input id={id('next')} type="date" disabled={preference === 'refused'} value={preference === 'refused' ? '' : nextContactOn} onChange={event => setNextContactOn(event.target.value)} /></div>
        </div>
        <p className="pr-note">Último contato registrado: {dayLabel(customer.lastContact)}.</p>
        <div className="pr-form-actions"><button type="submit" disabled={busy === `followup-${customer.key}`}><Save size={15} aria-hidden="true" /> Salvar</button></div>
    </form>;
}

function FollowUp({ customer, busy, onSaveFollowup, onAddNote, onDeleteNote }) {
    const [note, setNote] = useState('');
    const id = name => `customer-${customer.key}-${name}`;
    const saveNote = async kind => {
        const saved = await onAddNote(customer.key, note, kind);
        if (saved) setNote('');
    };
    return <div className="pr-details-grid pr-forms">
        {/* Volta aos valores do servidor quando mudam, como ao registrar um contato. */}
        <ContactForm key={`${customer.preference}-${customer.nextContactOn || ''}`} customer={customer} busy={busy} onSaveFollowup={onSaveFollowup} />
        <div className="pr-form">
            <h4>Anotações</h4>
            <label htmlFor={id('note')}>Nova anotação. Não escreva dados de saúde aqui.</label>
            <textarea id={id('note')} rows="2" maxLength="1000" value={note} onChange={event => setNote(event.target.value)} />
            <div className="pr-form-actions">
                <button type="button" className="pr-button-subtle" disabled={note.trim().length < 2 || busy === `note-${customer.key}`} onClick={() => saveNote('note')}>Salvar anotação</button>
                <button type="button" className="pr-button-subtle" disabled={note.trim().length < 2 || busy === `note-${customer.key}`} onClick={() => saveNote('contact')}><PhoneCall size={14} aria-hidden="true" /> Registrar contato</button>
            </div>
            {customer.notes.length > 0 && <ul className="cu-notes">{customer.notes.map(item => <li key={item.id}>
                <p>{item.note}</p>
                <small>{item.kind === 'contact' ? 'Contato' : 'Anotação'} · {dateTime(item.createdAt)} · {item.createdBy || 'equipe'}</small>
                <button type="button" aria-label="Apagar anotação" disabled={busy === `delete-${item.id}`} onClick={() => onDeleteNote(item.id)}><Trash2 size={14} aria-hidden="true" /></button>
            </li>)}</ul>}
        </div>
    </div>;
}

function CustomerRow({ customer, open, onToggle, busy, onSaveFollowup, onAddNote, onDeleteNote }) {
    return <article className="pr-row" id={`cliente-${customer.key}`}>
        <div className="pr-row-main cu-row-main">
            <div className="pr-person">
                <strong>{customer.name}</strong>
                <small>{[phoneLabel(customer.phone), customer.city && (customer.state ? `${customer.city}/${customer.state}` : customer.city)].filter(Boolean).join(' · ') || customer.email || 'Sem contato informado'}</small>
                <span className="cu-chips">
                    <span className={`pr-status is-${customer.segment}`} title={SEGMENT_HELP[customer.segment]}>{SEGMENT_LABELS[customer.segment] || customer.segment}</span>
                    {ROLE_LABELS[customer.role] && <span className="pr-status">{ROLE_LABELS[customer.role]}</span>}
                    {customer.preference === 'refused' && <span className="pr-status is-refused">{PREFERENCE_LABELS.refused}</span>}
                </span>
            </div>
            <div className="pr-cell"><small>Compras</small><strong>{customer.purchases}</strong><small>{customer.purchases ? `Média de ${money(customer.avgTicket)}` : customer.quotes.count ? plural(customer.quotes.count, 'orçamento', 'orçamentos') : 'Nenhuma paga'}</small></div>
            <div className="pr-cell"><small>Total, sem frete</small><strong>{money(customer.sales)}</strong>{customer.cart && <small>{money(customer.cart.value)} no carrinho</small>}</div>
            <div className="pr-cell"><small>Última compra</small><strong>{dayLabel(customer.lastPurchase)}</strong><small>{awayLabel(customer.daysSinceLast)}</small></div>
            <div className="pr-cell"><small>Costuma comprar</small><strong>{customer.avgInterval ? `A cada ${customer.avgInterval} dias` : '—'}</strong><small>{customer.nextExpected ? `Próxima: ${dayLabel(customer.nextExpected)}` : customer.purchases === 1 ? 'Precisa de 2 compras' : ''}</small></div>
            <button type="button" className="pr-button-subtle" aria-expanded={open} onClick={() => onToggle(customer.key)}>{open ? 'Fechar' : 'Detalhes'}</button>
        </div>
        {customer.reasons.length > 0 && <p className="pr-suggestion"><AlertTriangle size={15} aria-hidden="true" /> {customer.reasons.map(reason => REASON_LABELS[reason] || reason).join(' · ')}</p>}
        {open && <div className="pr-details">
            <div className="pr-details-grid">
                <div className="pr-breakdown">
                    <h4>Contato</h4>
                    <dl>
                        <div><dt>Telefone</dt><dd>{phoneLabel(customer.phone) || 'não informado'}</dd></div>
                        <div><dt>E-mail</dt><dd style={{ whiteSpace: 'normal', overflowWrap: 'anywhere', textAlign: 'right' }}>{customer.email || 'não informado'}</dd></div>
                        <div><dt>Cidade</dt><dd>{customer.city ? `${customer.city}${customer.state ? `/${customer.state}` : ''}` : 'não informado'}</dd></div>
                        <div><dt>Bairro</dt><dd>{customer.neighborhood || 'não informado'}</dd></div>
                        <div><dt>Conta criada em</dt><dd>{customer.kind === 'account' ? dateTime(customer.createdAt) : 'sem conta'}</dd></div>
                        <div><dt>Último acesso</dt><dd>{dateTime(customer.lastLogin)}</dd></div>
                        <div><dt>Entra com</dt><dd>{customer.loginMethods.length ? customer.loginMethods.map(method => method === 'google' ? 'Google' : method === 'email' ? 'E-mail e senha' : method).join(', ') : '—'}</dd></div>
                    </dl>
                    <div style={{ marginTop: 10 }}><ContactLinks customer={customer} /></div>
                </div>
                <div className="pr-breakdown">
                    <h4>Compras</h4>
                    <dl>
                        <div><dt>Primeira compra</dt><dd>{dayLabel(customer.firstPurchase)}</dd></div>
                        <div><dt>Última compra</dt><dd>{dayLabel(customer.lastPurchase)}</dd></div>
                        <div><dt>Como paga</dt><dd>{paymentLabel(customer.paymentMethod)}</dd></div>
                        <div><dt>Primeiro cupom</dt><dd>{customer.origin ? `${customer.origin.code}${customer.origin.recipient ? ` (${customer.origin.recipient})` : ''}` : 'sem cupom'}</dd></div>
                        <div><dt>Pagamentos pendentes</dt><dd>{customer.pendingOrders}</dd></div>
                        <div><dt>Não aprovados ou estornados</dt><dd>{customer.failedOrders + customer.refundedOrders}</dd></div>
                        <div><dt>Orçamentos enviados</dt><dd>{customer.quotes.count}{customer.quotes.lastDay ? ` (último em ${dayLabel(customer.quotes.lastDay)})` : ''}</dd></div>
                    </dl>
                </div>
                <div className="pr-breakdown">
                    <h4>Produtos comprados</h4>
                    {customer.products.length ? <ul className="cu-rank">{customer.products.map(product => <li key={product.name}><span>{product.name}</span><b>{plural(product.times, 'compra', 'compras')}</b></li>)}</ul> : <p className="pr-note">Nenhum produto pago ainda.</p>}
                    {customer.cart && <><h4 style={{ marginTop: 12 }}>No carrinho, em {dayLabel(customer.cart.day)}</h4><ul className="cu-rank">{customer.cart.names.map(name => <li key={name}><span>{name}</span></li>)}</ul></>}
                </div>
            </div>
            {customer.orders.length > 0 && <div className="cu-section">
                <h4>Pedidos</h4>
                <ul className="cu-orders">{customer.orders.map(order => <li key={order.id}>
                    <span>{dayLabel(order.day)}</span>
                    <span>{orderLabel(order)}{order.coupon ? ` · cupom ${order.coupon}` : ''}{order.paymentMethod ? ` · ${paymentLabel(order.paymentMethod)}` : ''}</span>
                    <b>{money(order.value)}</b>
                    <small>{order.items.map(item => `${item.quantity}× ${item.name}`).join(', ') || 'Sem itens'}</small>
                </li>)}</ul>
            </div>}
            <FollowUp customer={customer} busy={busy} onSaveFollowup={onSaveFollowup} onAddNote={onAddNote} onDeleteNote={onDeleteNote} />
        </div>}
    </article>;
}

export default function AdminCustomers({ onUnauthorized, api }) {
    const [report, setReport] = useState(null);
    const [loading, setLoading] = useState(true);
    const [failed, setFailed] = useState(false);
    const [busy, setBusy] = useState('');
    const [search, setSearch] = useState('');
    const [segment, setSegment] = useState('all');
    const [order, setOrder] = useState('recent');
    const [openKey, setOpenKey] = useState(null);
    const [limit, setLimit] = useState(pageSize);

    const invoke = useCallback(async body => {
        if (api) return api(body);
        const token = getSession()?.token;
        if (!token) { onUnauthorized?.(); return { error: 'unauthorized' }; }
        try {
            const result = await supabase.functions.invoke('admin-orders', { body, headers: { 'x-admin-token': token } });
            let detail = result.data?.error;
            if (!detail && result.error?.context?.clone) { try { detail = (await result.error.context.clone().json())?.error; } catch { /* Resposta sem JSON: usa o erro geral. */ } }
            if (detail === 'unauthorized') onUnauthorized?.();
            return { data: result.data, error: detail || result.error };
        } catch (error) { return { error }; }
    }, [api, onUnauthorized]);

    const load = useCallback(async () => {
        setLoading(true);
        const result = await invoke({ action: 'customers_report' });
        if (result.error) { setFailed(true); toast.error('Não foi possível carregar os clientes.'); }
        else { setReport(result.data); setFailed(false); }
        setLoading(false);
    }, [invoke]);

    useEffect(() => {
        const timer = window.setTimeout(load, 0);
        return () => window.clearTimeout(timer);
    }, [load]);

    const save = async (key, body, success) => {
        setBusy(key);
        const result = await invoke(body);
        setBusy('');
        if (result.error) { toast.error('Não foi possível salvar. Tente de novo.'); return false; }
        toast.success(success);
        load();
        return true;
    };
    const saveFollowup = (customerKey, contactPreference, nextContactOn) => save(`followup-${customerKey}`, { action: 'save_customer_followup', customerKey, contactPreference, nextContactOn }, 'Pós-venda salvo.');
    const addNote = (customerKey, note, kind) => save(`note-${customerKey}`, { action: 'add_customer_note', customerKey, note, kind }, kind === 'contact' ? 'Contato registrado.' : 'Anotação salva.');
    const deleteNote = noteId => { if (window.confirm('Apagar esta anotação?')) save(`delete-${noteId}`, { action: 'delete_customer_note', noteId }, 'Anotação apagada.'); };

    const customers = useMemo(() => report?.customers || [], [report]);
    const shown = useMemo(() => sortCustomers(customers.filter(customer => {
        if (segment === 'staff') { if (customer.role !== 'staff') return false; }
        else if (customer.role === 'staff') return false;
        else if (segment === 'contact') { if (!customer.reasons.length) return false; }
        else if (segment === 'refused') { if (customer.preference !== 'refused') return false; }
        else if (segment !== 'all' && customer.segment !== segment) return false;
        return matchesCustomer(customer, search);
    }), order), [customers, segment, search, order]);
    const toContact = useMemo(() => customers.filter(customer => customer.role !== 'staff' && customer.reasons.length), [customers]);

    const openCustomer = key => {
        setOpenKey(key);
        setSegment('all');
        setSearch('');
        setLimit(customers.length);
        window.setTimeout(() => document.getElementById(`cliente-${key}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60);
    };
    const exportCsv = () => {
        const rows = exportableCustomers(shown);
        if (!rows.length) { toast.info('Nenhuma pessoa para exportar neste filtro.'); return; }
        let url;
        try {
            url = URL.createObjectURL(new Blob([customersCsv(rows)], { type: 'text/csv;charset=utf-8;' }));
            const anchor = document.createElement('a');
            anchor.href = url;
            anchor.download = `graphene-clientes-${new Date().toISOString().slice(0, 10)}.csv`;
            document.body.appendChild(anchor);
            anchor.click();
            anchor.remove();
            invoke({ action: 'log_customer_export', count: rows.length });
        } catch { toast.error('Não foi possível exportar a planilha. Tente de novo.'); }
        finally { if (url) window.setTimeout(() => URL.revokeObjectURL(url), 1000); }
    };

    if (loading && !report) return <div className="pr-loading"><LoaderCircle className="spin" aria-hidden="true" /> Carregando os clientes...</div>;
    if (failed && !report) return <div className="pr-loading"><p>Não foi possível carregar agora.</p><button type="button" className="pr-button-subtle" onClick={load}>Tentar de novo</button></div>;
    if (!report) return null;
    const { summary, segments, topProducts, cities } = report;

    return <section className="partner-results">
        <p className="pr-source">
            Dados reais de contas, pedidos pagos, carrinhos e orçamentos. Só administradores veem. Ficam de fora CPF, rua e número, dados de pagamento, receitas e observações de orçamento.
        </p>

        <div className="pr-metrics">
            <article><Users aria-hidden="true" /><div><span>Compraram pelo site</span><strong>{summary.buyers}</strong><span>de {plural(summary.people, 'pessoa', 'pessoas')} na lista</span></div></article>
            <article><Repeat aria-hidden="true" /><div><span>Compraram de novo</span><strong>{summary.repeatRate === null ? '—' : `${summary.repeatRate}%`}</strong><span>{plural(summary.repeatBuyers, 'pessoa', 'pessoas')}</span></div></article>
            <article><CircleDollarSign aria-hidden="true" /><div><span>Ticket médio, sem frete</span><strong>{money(summary.avgTicket)}</strong><span>{money(summary.avgPerBuyer)} por cliente</span></div></article>
            <article><ShoppingCart aria-hidden="true" /><div><span>Carrinhos sem compra</span><strong>{summary.openCarts}</strong><span>{money(summary.openCartsValue)} em produtos</span></div></article>
        </div>

        {toContact.length > 0 && <section className="pr-alerts" aria-label="Pessoas para contatar">
            <h3><PhoneCall size={17} aria-hidden="true" /> Contatar agora ({toContact.length})</h3>
            <ul className="cu-contact-list">{toContact.slice(0, 8).map(customer => <li key={customer.key}>
                <span><strong>{customer.name}</strong>: {customer.reasons.map(reason => REASON_LABELS[reason] || reason).join(' · ')}</span>
                <span className="cu-contact-actions"><ContactLinks customer={customer} /><button type="button" className="pr-button-subtle" onClick={() => openCustomer(customer.key)}>Ver</button></span>
            </li>)}</ul>
            {toContact.length > 8 && <p className="pr-note" style={{ marginTop: 8 }}>Mais {toContact.length - 8}: use o filtro "Contatar agora".</p>}
        </section>}

        {(topProducts.length > 0 || cities.length > 0) && <div className="cu-side">
            <section className="pr-card"><div className="pr-card-title"><div><h3>Produtos mais comprados</h3><p>Pessoas diferentes que compraram cada um.</p></div><Package aria-hidden="true" /></div>
                {topProducts.length ? <ul className="cu-rank">{topProducts.map(product => <li key={product.name}><span>{product.name}{product.repeatCustomers ? ` (${plural(product.repeatCustomers, 'comprou', 'compraram')} de novo)` : ''}</span><b>{plural(product.customers, 'pessoa', 'pessoas')}</b></li>)}</ul> : <p className="pr-empty">Nenhuma compra ainda.</p>}
            </section>
            <section className="pr-card"><div className="pr-card-title"><div><h3>Cidades</h3><p>Onde estão as pessoas que compraram.</p></div></div>
                {cities.length ? <ul className="cu-rank">{cities.map(city => <li key={city.name}><span>{city.name} · {money(city.sales)}</span><b>{plural(city.customers, 'pessoa', 'pessoas')}</b></li>)}</ul> : <p className="pr-empty">Cidade ainda não informada.</p>}
            </section>
        </div>}

        <section className="pr-card">
            <div className="pr-card-title"><div><h3>Clientes</h3><p>{plural(shown.length, 'pessoa encontrada', 'pessoas encontradas')}.</p></div></div>
            <div className="cu-filters">
                <div><label htmlFor="cu-search">Buscar</label><input id="cu-search" type="search" placeholder="Nome, telefone, e-mail, cidade, produto ou cupom" value={search} onChange={event => { setSearch(event.target.value); setLimit(pageSize); }} /></div>
                <div><label htmlFor="cu-segment">Mostrar</label><select id="cu-segment" value={segment} onChange={event => { setSegment(event.target.value); setLimit(pageSize); }}>
                    <option value="all">Todos</option>
                    <option value="contact">Contatar agora ({toContact.length})</option>
                    {Object.entries(SEGMENT_LABELS).map(([value, label]) => <option key={value} value={value}>{label} ({segments[value] || 0})</option>)}
                    <option value="refused">Não querem contato</option>
                    <option value="staff">Equipe (fora dos totais)</option>
                </select></div>
                <div><label htmlFor="cu-order">Ordenar por</label><select id="cu-order" value={order} onChange={event => setOrder(event.target.value)}>
                    <option value="recent">Compra mais recente</option>
                    <option value="purchases">Mais compras</option>
                    <option value="value">Maior valor</option>
                    <option value="away">Mais tempo sem comprar</option>
                    <option value="name">Nome</option>
                </select></div>
                <button type="button" className="pr-button-subtle" onClick={exportCsv} title="A planilha não traz produtos nem anotações, nem quem não quer contato"><Download size={15} aria-hidden="true" /> Planilha</button>
                <button type="button" className="pr-button-subtle" onClick={load} disabled={loading}><RefreshCw size={15} aria-hidden="true" /> Atualizar</button>
            </div>
            {shown.length ? <div className="pr-list">{shown.slice(0, limit).map(customer => <CustomerRow key={customer.key} customer={customer} open={openKey === customer.key} onToggle={key => setOpenKey(current => current === key ? null : key)} busy={busy} onSaveFollowup={saveFollowup} onAddNote={addNote} onDeleteNote={deleteNote} />)}</div> : <p className="pr-empty">Nenhuma pessoa neste filtro.</p>}
            {shown.length > limit && <button type="button" className="pr-button-subtle cu-more" onClick={() => setLimit(current => current + pageSize)}>Mostrar mais ({shown.length - limit})</button>}
        </section>
    </section>;
}
