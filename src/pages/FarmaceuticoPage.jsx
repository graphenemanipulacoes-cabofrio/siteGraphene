import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Toaster } from 'sonner';
import { ArrowLeft, Chrome, LoaderCircle, LockKeyhole, LogOut, Monitor, LayoutGrid, ShieldCheck } from 'lucide-react';
import AdminProducts from '../components/AdminProducts';
import AdminMaterials from '../components/AdminMaterials';
import { materialsApi } from '../lib/materialsApi';
import { counterRequest, enterStaffArea } from '../lib/counterApi';
import { currentAccountEmail, signInWithEmail, startGoogleLogin } from '../lib/accountAuth';
import { supabase } from '../lib/supabaseClient';
import { pharmacistProductsApi } from '../lib/productsApi';
import { PHARMACIST_SESSION_KEY, adminStaffSession, clearStaffSession, readStaffSession, staffRoleLabels } from '../utils/counter';
import { destroySession } from '../utils/security';
import '../styles/staff.css';

// Página do farmacêutico: cadastro e revisão dos produtos da loja.
// Entra com a conta do site (e-mail cadastrado pelo admin como farmacêutico).
// Administradores também entram, com o e-mail deles. O farmacêutico não
// tem acesso à administração; o servidor confere o tipo da conta em cada ação.
const allowedRoles = ['farmaceutico', 'admin'];
export default function FarmaceuticoPage() {
    const [session, setSession] = useState(() => readStaffSession(PHARMACIST_SESSION_KEY) || adminStaffSession());
    const [checked, setChecked] = useState(false);
    const [credentials, setCredentials] = useState({ email: '', password: '' });
    const [busy, setBusy] = useState(false);
    const [message, setMessage] = useState('');
    const [view, setView] = useState('products');

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
                // Admin: o token do painel venceu e é renovado ao entrar de novo.
                // Equipe: acesso encerrado pelo admin; sai também da conta do site neste navegador.
                if (session.borrowed) { destroySession(); revoke(''); }
                else supabase.auth.signOut({ scope: 'local' }).catch(() => {}).finally(() => revoke(failure.message));
            });
        return () => { active = false; };
    }, [session?.token, session?.borrowed, checked, revoke]);

    // Conta do site já conectada (inclusive depois do Google): entra direto, se tiver acesso.
    useEffect(() => {
        if (session) return undefined;
        let active = true;
        (async () => {
            if (!await currentAccountEmail() || !active) return;
            setBusy(true);
            try { const created = await enterStaffArea('farmaceutico', PHARMACIST_SESSION_KEY); if (active) { setMessage(''); setChecked(true); setSession(created); } }
            catch (failure) { if (active) setMessage(failure.message); }
            finally { if (active) setBusy(false); }
        })();
        return () => { active = false; };
    }, [session]);

    useEffect(() => {
        const storage = event => { if (event.key === PHARMACIST_SESSION_KEY && !event.newValue) revoke('O acesso foi encerrado em outra aba.'); };
        window.addEventListener('storage', storage);
        return () => window.removeEventListener('storage', storage);
    }, [revoke]);

    const api = useMemo(() => session?.token ? pharmacistProductsApi(session.token, revoke) : null, [session?.token, revoke]);
    const materialApi = useMemo(() => session?.token ? materialsApi(session.token, revoke) : null, [session?.token, revoke]);

    const login = async event => {
        event.preventDefault(); setBusy(true); setMessage('');
        try {
            await signInWithEmail(credentials.email, credentials.password);
            const created = await enterStaffArea('farmaceutico', PHARMACIST_SESSION_KEY);
            setCredentials({ email: '', password: '' }); setChecked(true); setSession(created);
        } catch (failure) { setMessage(failure.message); }
        finally { setBusy(false); }
    };

    const loginWithGoogle = async () => {
        setBusy(true); setMessage('');
        try { await startGoogleLogin('/farmaceutico'); }
        catch { setBusy(false); setMessage('Não foi possível iniciar o acesso com Google. Tente novamente.'); }
    };

    // Login único: sair daqui também sai da conta do site (e do painel admin) neste navegador.
    const logout = async () => {
        setBusy(true);
        try { await counterRequest({ action: 'logout', sessionToken: session.token }); } catch { /* A sessão local é encerrada de qualquer forma. */ }
        if (session.borrowed) destroySession();
        await supabase.auth.signOut({ scope: 'local' }).catch(() => {});
        revoke('Você saiu da área do farmacêutico.'); setChecked(false); setBusy(false);
    };

    if (!session) return <main className="staff-root">
        <div className="staff-login">
            <form className="staff-login-card" onSubmit={login}>
                <img src="/assets/logo.png" alt="Graphène Farmácia de Manipulação" />
                <h1>Área do farmacêutico</h1>
                <p>Entre com o e-mail cadastrado pelo administrador (senha ou Google). Administradores usam o e-mail deles.</p>
                {message && <div className="staff-error" role="alert">{message}</div>}
                <button type="button" className="staff-btn" onClick={loginWithGoogle} disabled={busy}><Chrome size={18} aria-hidden="true" /> Continuar com Google</button>
                <label className="staff-field">E-mail<input type="email" autoComplete="email" required value={credentials.email} onChange={e => setCredentials({ ...credentials, email: e.target.value })} /></label>
                <label className="staff-field">Senha<input type="password" autoComplete="current-password" required value={credentials.password} onChange={e => setCredentials({ ...credentials, password: e.target.value })} /></label>
                <button className="staff-btn primary" disabled={busy}>{busy ? <LoaderCircle size={18} className="staff-spin" aria-hidden="true" /> : <LockKeyhole size={18} aria-hidden="true" />} {busy ? 'Entrando…' : 'Entrar'}</button>
                <div className="staff-login-links"><Link to="/colaboradores"><ArrowLeft size={14} aria-hidden="true" /> Área da equipe</Link><Link to="/entrar">Esqueci minha senha</Link></div>
            </form>
        </div>
    </main>;

    return <main className="staff-root">
        <Toaster position="top-right" richColors />
        <div className="staff-shell wide">
            <header className="staff-bar">
                <div className="staff-bar-left">
                    <img src="/assets/logo.png" alt="Graphène" />
                    <div className="staff-bar-title"><strong>Catálogo da Graphène</strong><span>{session.user?.displayName || session.user?.username} · {(staffRoleLabels[session.user?.role] || 'Farmacêutico').toLowerCase()}</span></div>
                </div>
                <div className="staff-bar-actions">
                    {session.user?.role === 'admin' && <Link className="staff-btn" to="/admin"><ShieldCheck size={16} aria-hidden="true" /> Administração</Link>}
                    <Link className="staff-btn" to="/balcaographene"><Monitor size={16} aria-hidden="true" /> Balcão</Link>
                    <Link className="staff-btn" to="/colaboradores"><LayoutGrid size={16} aria-hidden="true" /> Área da equipe</Link>
                    <button type="button" className="staff-btn" onClick={logout} disabled={busy}><LogOut size={16} aria-hidden="true" /> Sair</button>
                </div>
            </header>
            <nav className="staff-catalog-tabs" aria-label="Catálogos"><button className={`staff-btn ${view === 'products' ? 'primary' : ''}`} aria-pressed={view === 'products'} onClick={() => setView('products')}>Produtos</button><button className={`staff-btn ${view === 'materials' ? 'primary' : ''}`} aria-pressed={view === 'materials'} onClick={() => setView('materials')}>Matérias-primas</button></nav>
            <p className="staff-lead">{view === 'products' ? 'Cadastre e revise os produtos: foto, nome, descrição e preço. Arraste os cartões e clique em “Salvar ordem” para organizar a vitrine.' : 'Cadastre e revise matérias-primas, fornecedores, categorias, descrições e imagens. As alterações aparecem na página pública após salvar.'}</p>
            {view === 'products' ? api && <AdminProducts api={api} /> : materialApi && <AdminMaterials api={materialApi} />}
        </div>
    </main>;
}
