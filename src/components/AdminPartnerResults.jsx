import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CircleDollarSign, ExternalLink, Gift, LoaderCircle, Receipt, RefreshCw, Save, Scale, Settings2, TrendingDown, TrendingUp } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { supabase } from '../lib/supabaseClient';
import { getSession } from '../utils/security';
import { PARTNER_STATUS_LABELS, SUGGESTION_LABELS, suggestedMinimum } from '../utils/partnerResults';
import '../styles/partnerResults.css';

const money = value => Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const currentMonth = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit' }).format(new Date()).slice(0, 7);
const today = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
const dayLabel = value => value ? new Date(`${value}T12:00:00Z`).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : '—';
const phaseLabels = { test: 'Em teste', active: 'Parceria ativa', half_vale: 'Vale pela metade', commission_only: 'Só comissão', ended: 'Encerrada' };

function Result({ value }) {
    if (!value) return <span className="pr-result">Sem resultado ainda</span>;
    const profit = value > 0;
    return <span className={`pr-result ${profit ? 'is-profit' : 'is-loss'}`}>
        {profit ? <TrendingUp size={15} aria-hidden="true" /> : <TrendingDown size={15} aria-hidden="true" />}
        {profit ? 'Lucro' : 'Prejuízo'} {money(Math.abs(value))}
    </span>;
}

function Breakdown({ title, totals }) {
    const rows = [
        ['Vendas, sem frete', totals.sales, false],
        ['Custo dos produtos', totals.productCost, true],
        ['Embalagem', totals.packaging, true],
        ['Impostos', totals.tax, true],
        ['Taxa do Mercado Pago', totals.fee, true],
        ['Comissão dela', totals.commission, true],
        ['Sobre todas as vendas', totals.otherCommission, true],
        ['Custo do vale', totals.valeCost, true],
    ];
    return <div className="pr-breakdown">
        <h4>{title}</h4>
        <dl>
            {rows.map(([label, value, negative]) => <div key={label}><dt>{label}</dt><dd>{negative ? `− ${money(value)}` : money(value)}</dd></div>)}
            <div className="pr-breakdown-total"><dt>Resultado para a Graphène</dt><dd><Result value={totals.result} /></dd></div>
        </dl>
    </div>;
}

function Simulator({ partner }) {
    const [value, setValue] = useState('1000');
    const sale = Math.max(Number(value) || 0, 0);
    const commission = partner.commissionType === 'percentage' ? sale * partner.commissionValue / 100 : 0;
    const result = sale * partner.rate - partner.unitValeCost;
    return <div className="pr-simulator">
        <h4>Simular um mês</h4>
        <label htmlFor={`sim-${partner.recipientId}`}>Se ela vender (R$)</label>
        <input id={`sim-${partner.recipientId}`} type="number" min="0" step="50" value={value} onChange={event => setValue(event.target.value)} />
        <dl>
            <div><dt>Ela recebe em comissão</dt><dd>{money(commission)}</dd></div>
            <div><dt>Custo do vale do mês</dt><dd>{money(partner.unitValeCost)}</dd></div>
            <div className="pr-breakdown-total"><dt>Graphène</dt><dd><Result value={result} /></dd></div>
        </dl>
        <p>Usa os custos da área Custos, o cupom e a comissão dela.</p>
    </div>;
}

function TermsForm({ partner, settings, busy, onSave }) {
    const terms = partner.terms;
    const [form, setForm] = useState({
        testStart: terms?.test_start || today(),
        testDays: String(terms?.test_days ?? 90),
        monthlyVale: String(terms?.monthly_vale ?? 500),
        monthlyMinimum: String(terms?.monthly_minimum ?? ''),
        monthlyGoal: String(terms?.monthly_goal ?? ''),
        reelsPerMonth: String(terms?.reels_per_month ?? 1),
        storiesPerMonth: String(terms?.stories_per_month ?? 3),
        phase: terms?.phase || 'test',
        notes: terms?.notes || '',
    });
    const set = name => event => setForm(current => ({ ...current, [name]: event.target.value }));
    const suggestion = suggestedMinimum(Number(form.monthlyVale) || 0, settings, partner.rate);
    const useSuggestion = () => setForm(current => ({ ...current, monthlyMinimum: String(suggestion), monthlyGoal: String(suggestion * 2) }));
    const id = name => `terms-${partner.recipientId}-${name}`;
    return <form className="pr-form" onSubmit={event => { event.preventDefault(); onSave(partner.recipientId, form); }}>
        <h4>Regras da parceria</h4>
        <div className="pr-form-grid">
            <div><label htmlFor={id('start')}>Início do teste</label><input id={id('start')} type="date" required value={form.testStart} onChange={set('testStart')} /></div>
            <div><label htmlFor={id('days')}>Dias de teste</label><input id={id('days')} type="number" min="30" max="365" required value={form.testDays} onChange={set('testDays')} /></div>
            <div><label htmlFor={id('vale')}>Vale por mês (R$)</label><input id={id('vale')} type="number" min="0" step="any" required value={form.monthlyVale} onChange={set('monthlyVale')} /></div>
            <div><label htmlFor={id('min')}>Mínimo por mês (R$)</label><input id={id('min')} type="number" min="0" step="any" required value={form.monthlyMinimum} onChange={set('monthlyMinimum')} /></div>
            <div><label htmlFor={id('goal')}>Meta por mês (R$)</label><input id={id('goal')} type="number" min="0" step="any" required value={form.monthlyGoal} onChange={set('monthlyGoal')} /></div>
            <div><label htmlFor={id('phase')}>Situação</label><select id={id('phase')} value={form.phase} onChange={set('phase')}>{Object.entries(phaseLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div>
            <div><label htmlFor={id('reels')}>Reels por mês</label><input id={id('reels')} type="number" min="0" max="100" required value={form.reelsPerMonth} onChange={set('reelsPerMonth')} /></div>
            <div><label htmlFor={id('stories')}>Stories por mês</label><input id={id('stories')} type="number" min="0" max="100" required value={form.storiesPerMonth} onChange={set('storiesPerMonth')} /></div>
        </div>
        <label htmlFor={id('notes')}>Observações internas</label>
        <textarea id={id('notes')} rows="2" maxLength="1000" value={form.notes} onChange={set('notes')} />
        <div className="pr-form-actions">
            {suggestion !== null && <button type="button" className="pr-button-subtle" onClick={useSuggestion}>Usar mínimo sugerido: {money(suggestion)}</button>}
            <button type="submit" disabled={busy === `terms-${partner.recipientId}`}><Save size={15} aria-hidden="true" /> Salvar regras</button>
        </div>
    </form>;
}

function DeliveryForm({ partner, month, busy, onSave }) {
    const [form, setForm] = useState({ reels: String(partner.delivery.reels), stories: String(partner.delivery.stories), note: partner.delivery.note });
    const set = name => event => setForm(current => ({ ...current, [name]: event.target.value }));
    const id = name => `delivery-${partner.recipientId}-${name}`;
    const required = partner.terms;
    return <form className="pr-form" onSubmit={event => { event.preventDefault(); onSave(partner.recipientId, month, form); }}>
        <h4>Postagens de {month.split('-').reverse().join('/')}</h4>
        <div className="pr-form-grid">
            <div><label htmlFor={id('reels')}>Reels feitos{required ? ` (combinado: ${required.reels_per_month})` : ''}</label><input id={id('reels')} type="number" min="0" max="1000" required value={form.reels} onChange={set('reels')} /></div>
            <div><label htmlFor={id('stories')}>Stories feitos{required ? ` (combinado: ${required.stories_per_month})` : ''}</label><input id={id('stories')} type="number" min="0" max="1000" required value={form.stories} onChange={set('stories')} /></div>
        </div>
        <label htmlFor={id('note')}>Observação</label>
        <input id={id('note')} maxLength="300" value={form.note} onChange={set('note')} />
        <div className="pr-form-actions"><button type="submit" disabled={busy === `delivery-${partner.recipientId}`}><Save size={15} aria-hidden="true" /> Salvar postagens</button></div>
    </form>;
}

function PartnerRow({ partner, month, settings, busy, onSaveTerms, onSaveDelivery }) {
    const [open, setOpen] = useState(false);
    const minimum = Number(partner.terms?.monthly_minimum || 0);
    const progress = minimum > 0 ? Math.min((partner.month.sales / minimum) * 100, 100) : 0;
    const status = partner.status;
    return <article className="pr-row">
        <div className="pr-row-main">
            <div className="pr-person">
                <strong>{partner.name}</strong>
                <small>{partner.coupon ? `Cupom ${partner.coupon.code}` : 'Sem cupom'} · {partner.commissionType === 'percentage' ? `${partner.commissionValue}% de comissão` : `${money(partner.commissionValue)} por venda`}</small>
                <span className={`pr-status is-${status.code}`}>{PARTNER_STATUS_LABELS[status.code] || status.code}</span>
            </div>
            <div className="pr-cell"><small>Vendeu no mês</small><strong>{money(partner.month.sales)}</strong><small>{partner.month.orders} {partner.month.orders === 1 ? 'pedido' : 'pedidos'}</small></div>
            <div className="pr-cell"><small>Recebe no mês</small><strong>{money(partner.month.commission)}</strong><small>mais {money(partner.vale.monthGranted)} em vale</small></div>
            <div className="pr-cell"><small>Resultado no mês</small><Result value={partner.month.result} /><small>{money(partner.month.valeCost)} de custo do vale</small></div>
            <div className="pr-cell pr-goal">
                <small>Mínimo do mês</small>
                {minimum > 0 ? <>
                    <div className="pr-bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow={Math.round(progress)} aria-label={`${partner.name}: ${money(partner.month.sales)} de ${money(minimum)}`}><span style={{ width: `${progress}%` }} /></div>
                    <small>{money(partner.month.sales)} de {money(minimum)}</small>
                </> : <small>Sem mínimo definido</small>}
            </div>
            <button type="button" className="pr-button-subtle" aria-expanded={open} onClick={() => setOpen(current => !current)}>{open ? 'Fechar' : 'Detalhes'}</button>
        </div>
        {status.suggestion && <p className="pr-suggestion"><AlertTriangle size={15} aria-hidden="true" /> {SUGGESTION_LABELS[status.suggestion]}. A decisão é sua.</p>}
        {!partner.previousDelivered && <p className="pr-suggestion"><AlertTriangle size={15} aria-hidden="true" /> Postagens do mês passado incompletas. Não libere o próximo vale antes de conferir.</p>}
        {partner.month.ownPurchases > 0 && <p className="pr-note">{partner.month.ownPurchases} compra(s) dela mesma com o próprio cupom ficaram fora da conta.</p>}
        {open && <div className="pr-details">
            <div className="pr-details-grid">
                <Breakdown title="No mês escolhido" totals={partner.month} />
                <Breakdown title={partner.terms ? `Desde ${dayLabel(partner.terms.test_start)}` : 'Desde o início'} totals={partner.sinceStart} />
                <Simulator partner={partner} />
            </div>
            <p className="pr-note">
                {partner.breakEven === null ? 'Com esses custos, cada venda não deixa margem para pagar o vale.' : partner.breakEven > 0 ? `Para pagar o vale, ela precisa vender cerca de ${money(partner.breakEven)} por mês.` : 'Sem vale definido para esta parceria.'}
                {' '}Vale: {money(partner.vale.totalGranted)} concedido e {money(partner.vale.totalUsed)} retirado até hoje.
                {partner.terms && status.testEnd && ` Teste até ${dayLabel(status.testEnd)}.`}
            </p>
            <div className="pr-details-grid pr-forms">
                <TermsForm partner={partner} settings={settings} busy={busy} onSave={onSaveTerms} />
                <DeliveryForm key={`${partner.recipientId}-${month}`} partner={partner} month={month} busy={busy} onSave={onSaveDelivery} />
            </div>
            {partner.partnerId && <Link className="pr-link" to={`/parceiros/painel?parceiro=${encodeURIComponent(partner.partnerId)}`}>Ver o painel dela <ExternalLink size={13} aria-hidden="true" /></Link>}
        </div>}
    </article>;
}

function CostsPanel({ report, busy, onSaveSettings, onSaveProduct }) {
    const { settings, products } = report;
    const [form, setForm] = useState({ defaultCostPercent: String(settings.defaultCostPercent), packagingPercent: String(settings.packagingPercent), taxPercent: String(settings.taxPercent), paymentPercent: String(settings.paymentPercent) });
    const [search, setSearch] = useState('');
    const [drafts, setDrafts] = useState({});
    const set = name => event => setForm(current => ({ ...current, [name]: event.target.value }));
    const shown = useMemo(() => products.filter(product => product.name.toLowerCase().includes(search.trim().toLowerCase())), [products, search]);
    const filled = products.filter(product => product.costPercent !== null).length;
    const draftOf = product => drafts[product.id] ?? (product.costPercent !== null && product.price > 0 ? (product.price * product.costPercent / 100).toFixed(2) : '');
    return <section className="pr-card">
        <div className="pr-card-title"><div><h3>Custos</h3><p>Privado: só administradores veem. O custo de cada produto substitui o padrão.</p></div><Settings2 aria-hidden="true" /></div>
        <form className="pr-form" onSubmit={event => { event.preventDefault(); onSaveSettings(form); }}>
            <div className="pr-form-grid">
                <div><label htmlFor="cost-default">Custo padrão do produto (% do preço)</label><input id="cost-default" type="number" min="0" max="200" step="0.01" required value={form.defaultCostPercent} onChange={set('defaultCostPercent')} /></div>
                <div><label htmlFor="cost-packaging">Embalagem (% do preço)</label><input id="cost-packaging" type="number" min="0" max="100" step="0.01" required value={form.packagingPercent} onChange={set('packagingPercent')} /></div>
                <div><label htmlFor="cost-tax">Impostos (% do valor pago)</label><input id="cost-tax" type="number" min="0" max="100" step="0.01" required value={form.taxPercent} onChange={set('taxPercent')} /></div>
                <div><label htmlFor="cost-payment">Taxa, se o pagamento não informar (%)</label><input id="cost-payment" type="number" min="0" max="100" step="0.01" required value={form.paymentPercent} onChange={set('paymentPercent')} /></div>
            </div>
            <div className="pr-form-actions"><button type="submit" disabled={busy === 'settings'}><Save size={15} aria-hidden="true" /> Confirmar custos</button></div>
        </form>
        <div className="pr-products-head">
            <div><h4>Custo por produto</h4><p>{filled} de {products.length} produtos com custo próprio. Os demais usam o padrão.</p></div>
            <label htmlFor="cost-search" className="pr-visually-hidden">Buscar produto</label>
            <input id="cost-search" type="search" placeholder="Buscar produto" value={search} onChange={event => setSearch(event.target.value)} />
        </div>
        <div className="pr-products">
            {shown.map(product => {
                const draft = draftOf(product);
                const percent = product.price > 0 && draft !== '' ? (Number(draft) / product.price) * 100 : null;
                return <form key={product.id} onSubmit={event => { event.preventDefault(); onSaveProduct(product, draft === '' ? null : percent); }}>
                    <div><strong>{product.name}</strong><small>{product.price > 0 ? `Preço ${money(product.price)}` : 'Sem preço cadastrado'}{product.isActive ? '' : ' · fora do site'}</small></div>
                    <label htmlFor={`cost-${product.id}`} className="pr-visually-hidden">Custo em reais de {product.name}</label>
                    <input id={`cost-${product.id}`} type="number" min="0" step="0.01" placeholder="Custo em R$" disabled={!(product.price > 0)} value={draft} onChange={event => setDrafts(current => ({ ...current, [product.id]: event.target.value }))} />
                    <small className="pr-percent">{percent !== null ? `${percent.toFixed(1).replace('.', ',')}%` : 'Padrão'}</small>
                    <button type="submit" className="pr-button-subtle" disabled={!(product.price > 0) || busy === `product-${product.id}`}>Salvar</button>
                </form>;
            })}
        </div>
    </section>;
}

export default function AdminPartnerResults({ onUnauthorized, api }) {
    const [month, setMonth] = useState(currentMonth);
    const [report, setReport] = useState(null);
    const [loading, setLoading] = useState(true);
    const [failed, setFailed] = useState(false);
    const [busy, setBusy] = useState('');
    const [showCosts, setShowCosts] = useState(false);

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
        const result = await invoke({ action: 'partner_results', month });
        if (result.error) { setFailed(true); toast.error('Não foi possível carregar o resultado das parcerias.'); }
        else { setReport(result.data); setFailed(false); }
        setLoading(false);
    }, [invoke, month]);

    useEffect(() => {
        const timer = window.setTimeout(load, 0);
        return () => window.clearTimeout(timer);
    }, [load]);

    const save = async (key, body, success) => {
        setBusy(key);
        const result = await invoke(body);
        setBusy('');
        if (result.error) { toast.error('Não foi possível salvar. Confira os números e tente de novo.'); return; }
        toast.success(success);
        load();
    };
    const saveTerms = (recipientId, form) => save(`terms-${recipientId}`, { action: 'save_partner_terms', recipientId, ...form }, 'Regras da parceria salvas.');
    const saveDelivery = (recipientId, deliveryMonth, form) => save(`delivery-${recipientId}`, { action: 'save_partner_delivery', recipientId, month: deliveryMonth, ...form }, 'Postagens salvas.');
    const saveSettings = form => save('settings', { action: 'save_cost_settings', ...form }, 'Custos confirmados.');
    const saveProduct = (product, costPercent) => save(`product-${product.id}`, { action: 'save_product_cost', productId: product.id, costPercent }, costPercent === null ? 'Produto voltou ao custo padrão.' : 'Custo do produto salvo.');

    if (loading && !report) return <div className="pr-loading"><LoaderCircle className="spin" aria-hidden="true" /> Calculando o resultado das parcerias...</div>;
    if (failed && !report) return <div className="pr-loading"><p>Não foi possível carregar agora.</p><button type="button" className="pr-button-subtle" onClick={load}>Tentar de novo</button></div>;
    if (!report) return null;

    const { summary, settings, partners, allPaid } = report;
    const alerts = partners.filter(partner => partner.isActive && (['attention', 'review', 'no_terms'].includes(partner.status.code) || !partner.previousDelivered));

    return <section className="partner-results">
        <div className="pr-toolbar">
            <div><label htmlFor="pr-month">Mês</label><input id="pr-month" type="month" value={month} max={currentMonth()} onChange={event => event.target.value && setMonth(event.target.value)} /></div>
            <button type="button" className="pr-button-subtle" onClick={() => setShowCosts(current => !current)} aria-expanded={showCosts}><Settings2 size={15} aria-hidden="true" /> Custos</button>
            <button type="button" className="pr-button-subtle" onClick={load} disabled={loading}><RefreshCw size={15} aria-hidden="true" /> Atualizar</button>
        </div>

        <p className={settings.confirmedAt ? 'pr-source' : 'pr-source is-warning'}>
            {settings.confirmedAt ? 'Custos confirmados.' : 'Custos ainda em hipótese. Abra Custos e coloque os números reais.'}
            {' '}Vendas, comissões, vales e taxas do Mercado Pago vêm dos registros reais. Só contam pedidos pagos, sem frete.
        </p>

        <div className="pr-metrics">
            <article><CircleDollarSign aria-hidden="true" /><div><span>Vendas com cupom no mês</span><strong>{money(summary.sales)}</strong></div></article>
            <article><Receipt aria-hidden="true" /><div><span>Comissões das parceiras</span><strong>{money(summary.commission)}</strong></div></article>
            <article><Gift aria-hidden="true" /><div><span>Custo dos vales</span><strong>{money(summary.valeCost)}</strong></div></article>
            <article><Scale aria-hidden="true" /><div><span>Resultado das parcerias</span><Result value={summary.result} /></div></article>
        </div>

        {alerts.length > 0 && <section className="pr-alerts" aria-label="Parcerias que precisam de atenção">
            <h3><AlertTriangle size={17} aria-hidden="true" /> Precisam de atenção agora</h3>
            <ul>{alerts.map(partner => <li key={partner.recipientId}><strong>{partner.name}</strong>: {partner.status.code === 'no_terms' ? 'defina as regras da parceria' : !partner.previousDelivered && !['attention', 'review'].includes(partner.status.code) ? 'postagens do mês passado incompletas' : SUGGESTION_LABELS[partner.status.suggestion] || PARTNER_STATUS_LABELS[partner.status.code]}</li>)}</ul>
        </section>}

        {showCosts && <CostsPanel report={report} busy={busy} onSaveSettings={saveSettings} onSaveProduct={saveProduct} />}

        <section className="pr-card">
            <div className="pr-card-title"><div><h3>Parceiras</h3><p>{partners.length} com cupom. A situação considera a data de hoje; os valores, o mês escolhido.</p></div></div>
            {partners.length ? <div className="pr-list">{partners.map(partner => <PartnerRow key={partner.recipientId} partner={partner} month={report.month} settings={settings} busy={busy} onSaveTerms={saveTerms} onSaveDelivery={saveDelivery} />)}</div> : <p className="pr-empty">Nenhuma parceira com cupom cadastrada ainda.</p>}
        </section>

        <section className="pr-card">
            <div className="pr-card-title"><div><h3>Vendas do site no mês</h3><p>Todas as vendas pagas, com e sem cupom.</p></div></div>
            <dl className="pr-site">
                <div><dt>Pedidos pagos</dt><dd>{summary.siteOrders}</dd></div>
                <div><dt>Vendas, sem frete</dt><dd>{money(summary.siteSales)}</dd></div>
                <div><dt>Vendas sem cupom</dt><dd>{money(summary.noCouponSales)}</dd></div>
                <div><dt>Taxas do Mercado Pago</dt><dd>{money(summary.siteFees)}</dd></div>
                {allPaid.map(item => <div key={item.recipientId}><dt>{item.name} ({item.commissionValue}% sobre todas as vendas)</dt><dd>{money(item.monthAmount)}</dd></div>)}
            </dl>
            {!allPaid.length && <p className="pr-note">Ninguém está cadastrado para receber sobre todas as vendas. Para incluir, use Financeiro › Comissões e repasses.</p>}
        </section>
    </section>;
}
