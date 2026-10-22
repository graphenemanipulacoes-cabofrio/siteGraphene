import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Toaster } from 'sonner';
import { ArrowLeft, LoaderCircle, LockKeyhole, LogOut, Monitor, LayoutGrid, ShieldCheck } from 'lucide-react';
import AdminProducts from '../components/AdminProducts';
import { counterRequest } from '../lib/counterApi';
import { pharmacistProductsApi } from '../lib/productsApi';
import { PHARMACIST_SESSION_KEY, adminStaffSession, clearStaffSession, readStaffSession, staffRoleLabels } from '../utils/counter';
import { destroySession } from '../utils/security';
import '../styles/staff.css';

// Página do farmacêutico: cadastro e revisão dos produtos da loja.
// Login próprio (contas da equipe do tipo "farmacêutico", criadas pelo admin).
// Administradores também entram, com o login do painel. O farmacêutico não
// tem acesso à administração; o servidor confere o tipo da conta em cada ação.
const allowedRoles = ['farmaceutico', 'admin'];
export default function FarmaceuticoPage() {
    const [session, setSession] = useState(() => readStaffSession(PHARMACIST_SESSION_KEY) || adminStaffSession());
    const [checked, setChecked] = useState(false);
    const [credentials, setCredentials] = useState({ username: '', password: '' });
    const [busy, setBusy] = useState(false);
    const [message, setMessage] = useState('');

    const revoke = useCallback(text => {
        clearStaffSession(PHARMACIST_SESSION_KEY); setSession(null); setMessage(text || '');
    }, []);

    // Confere no servidor se a sessão salva ainda vale e se a conta é de farmacêutico.
    useEffect(() => {
        if (!session?.token || checked) return undefined;
        let active = true;
        counterRequest({ action: 'session', sessionToken: session.token })
            .then(data => {
                if (!active) return;
                if (!allowedRoles.includes(data.user?.role)) revoke('Esta conta não tem mais acesso de farmacêutico. Consulte o administrador.');
                else { setSession(current => current ? { ...current, user: data.user } : current); setChecked(true); }
            })
            .catch(failure => {
                if (!active) return;
                if (failure.code !== 'unauthorized') { setChecked(true); return; }
                if (session.borrowed) destroySession(); // A sessão do painel admin também acabou.
                revoke(failure.message);
            });
        return () => { active = false; };
    }, [session?.token, session?.borrowed, checked, revoke]);

    useEffect(() => {
        const storage = event => { if (event.key === PHARMACIST_SESSION_KEY && !event.newValue) revoke('O acesso foi encerrado em outra aba.'); };
        window.addEventListener('storage', storage);
        return () => window.removeEventListener('storage', storage);
    }, [revoke]);

    const api = useMemo(() => session?.token ? pharmacistProductsApi(session.token, revoke) : null, [session?.token, revoke]);

    const login = async event => {
        event.preventDefault(); setBusy(true); setMessage('');
        let created;
        try {
            created = await counterRequest({ action: 'login', area: 'farmaceutico', ...credentials, deviceLabel: `${navigator.platform || 'Computador'} · farmacêutico` });
            localStorage.setItem(PHARMACIST_SESSION_KEY, JSON.stringify(created));
            setCredentials({ username: '', password: '' }); setChecked(true); setSession(created);
        } catch (failure) {
            if (created?.token) {
                counterRequest({ action: 'logout', sessionToken: created.token }).catch(() => {});
                setMessage('O navegador não permite salvar a sessão. Habilite o armazenamento e tente de novo.');
            } else setMessage(failure.message);
        } finally { setBusy(false); }
    };

    const logout = async () => {
        setBusy(true);
        try { await counterRequest({ action: 'logout', sessionToken: session.token }); } catch { /* A sessão local é encerrada de qualquer forma. */ }
        if (session.borrowed) destroySession(); // Sair aqui também encerra o painel admin deste navegador.
        revoke('Você saiu da área do farmacêutico.'); setChecked(false); setBusy(false);
    };

    if (!session) return <main className="staff-root">
        <div className="staff-login">
            <form className="staff-login-card" onSubmit={login}>
                <img src="/assets/logo.png" alt="Graphène Farmácia de Manipulação" />
                <h1>Área do farmacêutico</h1>
                <p>Entre com o usuário e a senha criados pelo administrador. Administradores usam o mesmo login do painel.</p>
                {message && <div className="staff-error" role="alert">{message}</div>}
                <label className="staff-field">Usuário<input autoComplete="username" required value={credentials.username} onChange={e => setCredentials({ ...credentials, username: e.target.value })} /></label>
                <label className="staff-field">Senha<input type="password" autoComplete="current-password" required value={credentials.password} onChange={e => setCredentials({ ...credentials, password: e.target.value })} /></label>
                <button className="staff-btn primary" disabled={busy}>{busy ? <LoaderCircle size={18} className="staff-spin" aria-hidden="true" /> : <LockKeyhole size={18} aria-hidden="true" />} {busy ? 'Entrando…' : 'Entrar'}</button>
                <div className="staff-login-links"><Link to="/colaboradores"><ArrowLeft size={14} aria-hidden="true" /> Área da equipe</Link><span>Farmacêuticos e administradores</span></div>
            </form>
        </div>
    </main>;

    return <main className="staff-root">
        <Toaster position="top-right" richColors />
        <div className="staff-shell wide">
            <header className="staff-bar">
                <div className="staff-bar-left">
                    <img src="/assets/logo.png" alt="Graphène" />
                    <div className="staff-bar-title"><strong>Produtos da loja</strong><span>{session.user?.displayName || session.user?.username} · {(staffRoleLabels[session.user?.role] || 'Farmacêutico').toLowerCase()}</span></div>
                </div>
                <div className="staff-bar-actions">
                    {session.user?.role === 'admin' && <Link className="staff-btn" to="/admin"><ShieldCheck size={16} aria-hidden="true" /> Administração</Link>}
                    <Link className="staff-btn" to="/balcaographene"><Monitor size={16} aria-hidden="true" /> Balcão</Link>
                    <Link className="staff-btn" to="/colaboradores"><LayoutGrid size={16} aria-hidden="true" /> Área da equipe</Link>
                    <button type="button" className="staff-btn" onClick={logout} disabled={busy}><LogOut size={16} aria-hidden="true" /> Sair</button>
                </div>
            </header>
            <p className="staff-lead">Cadastre e revise os produtos: foto, nome, descrição e preço. As alterações aparecem no site assim que você salva. Arraste os cartões para mudar a ordem da vitrine e clique em "Salvar ordem".</p>
            {api && <AdminProducts api={api} />}
        </div>
    </main>;
}
