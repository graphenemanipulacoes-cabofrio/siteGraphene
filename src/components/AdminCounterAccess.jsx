import { useCallback, useEffect, useState } from 'react';
import { ExternalLink, FlaskConical, KeyRound, LoaderCircle, Monitor, Plus, Save, ShieldCheck, Trash2, Users, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { counterRequest } from '../lib/counterApi';
import { getSession } from '../utils/security';
import { dateTime, staffRoleLabels } from '../utils/counter';
import '../styles/counter.css';

const emptyForm = { id: '', role: 'balcao', displayName: '', email: '', password: '', isActive: true };

export default function AdminCounterAccess({ onUnauthorized }) {
    const [accounts, setAccounts] = useState([]);
    const [form, setForm] = useState(emptyForm);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [busyAccount, setBusyAccount] = useState('');
    const invoke = useCallback(async body => {
        const token = getSession()?.token;
        if (!token) { onUnauthorized(); throw new Error('Entre novamente como administrador.'); }
        try { return await counterRequest(body, token); }
        catch (failure) { if (failure.code === 'unauthorized') onUnauthorized(); throw failure; }
    }, [onUnauthorized]);
    const load = useCallback(async () => {
        setLoading(true); setError('');
        try { const data = await invoke({ action: 'list_accounts' }); setAccounts(data.accounts || []); }
        catch (failure) { setError(failure.message); }
        finally { setLoading(false); }
    }, [invoke]);
    useEffect(() => { const timer = setTimeout(load, 0); return () => clearTimeout(timer); }, [load]);
    const save = async event => {
        event.preventDefault(); setSaving(true); setError('');
        try {
            await invoke({ action: 'save_account', ...form });
            toast.success(form.id ? 'Acesso atualizado. Os navegadores anteriores precisarão entrar novamente.' : `Acesso de ${staffRoleLabels[form.role].toLowerCase()} criado.`);
            setForm(emptyForm); await load();
        } catch (failure) { setError(failure.message); }
        finally { setSaving(false); }
    };
    const revoke = async account => {
        if (!window.confirm(`Encerrar todos os navegadores conectados como ${account.display_name}?`)) return;
        setBusyAccount(account.id);
        try { await invoke({ action: 'revoke_account', id: account.id }); toast.success('Sessões encerradas.'); await load(); }
        catch (failure) { setError(failure.message); }
        finally { setBusyAccount(''); }
    };
    const remove = async account => {
        if (!window.confirm(`Excluir o acesso de ${account.display_name} (${account.email || account.username})? Os navegadores conectados deixam de funcionar. A conta da pessoa no site continua existindo como cliente.`)) return;
        setBusyAccount(account.id);
        try {
            await invoke({ action: 'delete_account', id: account.id });
            toast.success('Acesso excluído.');
            if (form.id === account.id) setForm(emptyForm);
            await load();
        } catch (failure) { setError(failure.message); }
        finally { setBusyAccount(''); }
    };
    return <section className="counter-access">
        <div className="counter-access-intro"><div><h2><Users size={22}/> Acessos da equipe</h2><p><strong>Balcão:</strong> consulta de pedidos, clientes, entrega e orçamentos. <strong>Farmacêutico:</strong> cadastro e revisão dos produtos e matérias-primas, incluindo imagens, e também o balcão. Nenhuma dessas contas entra na administração.</p></div><div className="counter-account-buttons"><Link className="counter-button" to="/balcaographene" target="_blank" rel="noreferrer"><Monitor size={15}/> Abrir balcão <ExternalLink size={14}/></Link><Link className="counter-button" to="/farmaceutico" target="_blank" rel="noreferrer"><FlaskConical size={15}/> Abrir farmacêutico <ExternalLink size={14}/></Link></div></div>
        <div className="counter-access-note"><ShieldCheck size={18}/><p>A pessoa entra com o e-mail da conta dela no site (senha ou Google). Se ainda não tiver conta, defina uma senha inicial aqui; ela pode trocar depois em Minha conta. O acesso fica salvo no navegador até o logout manual. Alterar, desativar ou encerrar sessões revoga os navegadores conectados. Use apenas computadores da equipe.</p></div>
        {error && <div className="counter-error" role="alert">{error}<button type="button" onClick={load}>Tentar carregar novamente</button></div>}
        <form className="counter-access-form" onSubmit={save}>
            <h3>{form.id ? 'Editar acesso' : 'Criar acesso da equipe'}</h3>
            <label className="counter-access-role">Tipo de acesso<select value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}><option value="balcao">Balcão: pedidos e orçamentos</option><option value="farmaceutico">Farmacêutico: produtos, matérias-primas e balcão</option></select></label>
            <label>Nome da pessoa ou equipe<input required maxLength={100} minLength={2} value={form.displayName} onChange={e => setForm({ ...form, displayName: e.target.value })} placeholder="Ex.: Balcão Cabo Frio" /></label>
            <label>E-mail de acesso<input type="email" autoComplete="off" required maxLength={320} value={form.email} onChange={e => setForm({ ...form, email: e.target.value.trim().toLowerCase() })} placeholder="pessoa@exemplo.com" /><small>É o e-mail que a pessoa usa para entrar no site.</small></label>
            <label>Senha inicial (opcional)<input autoComplete="new-password" type="password" minLength={10} maxLength={128} value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} /><small>Obrigatória só se o e-mail ainda não tiver conta no site. Se a conta já existir e você preencher, a senha dela é trocada.</small></label>
            {form.id && <label className="counter-checkbox"><input type="checkbox" checked={form.isActive} onChange={e => setForm({ ...form, isActive: e.target.checked })}/> Acesso ativo</label>}
            <div className="counter-access-actions"><button className="counter-button primary" disabled={saving}>{saving ? <LoaderCircle size={16} className="counter-spin"/> : form.id ? <Save size={16}/> : <Plus size={16}/>} {saving ? 'Salvando…' : form.id ? 'Salvar alterações' : 'Criar acesso'}</button>{form.id && <button type="button" className="counter-button" onClick={() => setForm(emptyForm)} disabled={saving}><X size={16}/> Cancelar edição</button>}</div>
        </form>
        <div className="counter-accounts"><div className="counter-access-intro"><h3>Contas e navegadores conectados</h3><button type="button" className="counter-button" onClick={load} disabled={loading}>Atualizar</button></div>
            {loading ? <p role="status">Carregando acessos…</p> : !accounts.length && !error ? <p>Nenhum acesso criado. Cadastre o primeiro (balcão ou farmacêutico) no formulário acima.</p> : accounts.map(account => <article key={account.id}>
                <div><strong>{account.display_name}</strong><p>{account.email || <>@{account.username} · <em>sem e-mail: edite e informe o e-mail para voltar a entrar</em></>} · {staffRoleLabels[account.role] || 'Balcão'} · {account.is_active ? 'Ativo' : 'Desativado'}</p><small>{account.sessions.length} {account.sessions.length === 1 ? 'navegador conectado' : 'navegadores conectados'}</small></div>
                <div className="counter-account-buttons"><button className="counter-button" onClick={() => { setForm({ id: account.id, role: account.role || 'balcao', displayName: account.display_name, email: account.email || '', password: '', isActive: account.is_active }); }}><KeyRound size={15}/> Editar acesso</button><button className="counter-button danger" disabled={busyAccount === account.id || !account.sessions.length} onClick={() => revoke(account)}>Encerrar sessões</button><button className="counter-button danger" disabled={busyAccount === account.id} onClick={() => remove(account)}><Trash2 size={15}/> Excluir</button></div>
                {account.sessions.length > 0 && <ul>{account.sessions.map((session, index) => <li key={`${session.created_at}-${index}`}><Monitor size={14}/><span>{session.device_label || 'Navegador'} · Último acesso: {dateTime(session.last_used_at)}</span></li>)}</ul>}
            </article>)}
        </div>
    </section>;
}
