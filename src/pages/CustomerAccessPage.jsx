import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { KeyRound, LoaderCircle, ShieldCheck, UserPlus } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import StoreLayout from '../components/StoreLayout';
import { useStore } from '../context/StoreContext';

const CustomerAccessPage = () => {
    const [mode, setMode] = useState('login');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [fullName, setFullName] = useState('');
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();
    const { addItem } = useStore();
    const returnTo = location.state?.returnTo || '/minha-conta';
    const intent = location.state?.intent;
    const pendingProduct = location.state?.pendingProduct;

    const submit = async event => {
        event.preventDefault();
        setLoading(true); setError(''); setMessage('');
        const redirectTo = `${window.location.origin}/minha-conta`;
        const result = mode === 'login'
            ? await supabase.auth.signInWithPassword({ email, password })
            : await supabase.auth.signUp({ email, password, options: { emailRedirectTo: redirectTo, data: { full_name: fullName.trim() } } });
        setLoading(false);
        if (result.error) { setError(result.error.message); return; }
        if (mode === 'signup' && !result.data.session) {
            setMessage('Conta criada. Confira seu e-mail para confirmar o acesso.');
            return;
        }
        if (pendingProduct) addItem(pendingProduct);
        navigate(returnTo, { replace: true });
    };

    const resetPassword = async () => {
        setError(''); setMessage('');
        if (!email) { setError('Informe seu e-mail para recuperar a senha.'); return; }
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/redefinir-senha` });
        if (resetError) { setError('Não foi possível enviar a recuperação agora.'); return; }
        setMessage('Se o e-mail estiver cadastrado, você receberá o link de recuperação.');
    };

    return <StoreLayout><section className="customer-access-page"><div className="access-card store-card">
        <div className="access-icon">{mode === 'login' ? <KeyRound size={25} /> : <UserPlus size={25} />}</div>
        <span className="eyebrow">Área do cliente</span><h1>{mode === 'login' ? 'Entre na sua conta' : 'Crie sua conta'}</h1><p>{intent === 'cart' ? 'Para adicionar produtos ao carrinho, entre ou crie sua conta.' : intent === 'checkout' ? 'Para comprar agora, entre ou crie sua conta.' : mode === 'login' ? 'Acompanhe pedidos, dados de entrega e suas compras.' : 'Cadastre-se para agilizar seus próximos pedidos.'}</p>
        <form onSubmit={submit}>{mode === 'signup' && <label>Nome completo<input type="text" autoComplete="name" maxLength="120" placeholder="Seu nome completo" value={fullName} onChange={e => setFullName(e.target.value)} required /></label>}<label>E-mail<input type="email" autoComplete="email" placeholder="voce@exemplo.com" value={email} onChange={e => setEmail(e.target.value)} required /></label><label>Senha<input type="password" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} minLength="10" placeholder="Mínimo de 10 caracteres" value={password} onChange={e => setPassword(e.target.value)} required /></label>{error && <div className="access-alert error">{mode === 'login' ? 'E-mail ou senha inválidos.' : error}</div>}{message && <div className="access-alert success">{message}</div>}<button disabled={loading} className="access-submit">{loading ? <LoaderCircle className="spin" size={18} /> : mode === 'login' ? 'Entrar' : 'Criar conta'}</button></form>
        {mode === 'login' && <button className="password-reset-link" onClick={resetPassword}>Esqueci minha senha</button>}<button className="mode-switch" onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(''); setMessage(''); }}>{mode === 'login' ? 'Ainda não tenho conta' : 'Já tenho uma conta'}</button><Link className="back-store" to="/">Voltar à loja</Link><small><ShieldCheck size={14} /> Acesso seguro gerenciado pela Graphène.</small>
    </div><style>{accessStyles}</style></section></StoreLayout>;
};

const accessStyles = `
.customer-access-page{min-height:70vh;padding:64px 20px;display:grid;place-items:center;background:radial-gradient(circle at 50% 0,rgba(34,199,232,.13),transparent 37%)}.access-card{width:min(100%,440px);padding:34px;text-align:center}.access-icon{width:52px;height:52px;border-radius:16px;margin:0 auto 18px;display:grid;place-items:center;color:var(--brand-blue);background:rgba(34,199,232,.11);border:1px solid var(--border-blue)}.access-card h1{font-size:1.65rem;margin:5px 0 8px}.access-card>p{font-size:.9rem;margin-bottom:25px}.access-card form{text-align:left;display:grid;gap:15px}.access-card label{display:grid;gap:7px;color:var(--text-main);font-size:.84rem;font-weight:700}.access-card input{border:1px solid var(--border-card);background:rgba(255,255,255,.055);color:var(--text-main);border-radius:10px;padding:13px 14px;outline:none}.access-card input::placeholder{color:var(--text-subtle)}.access-card input:focus{border-color:var(--brand-blue);box-shadow:0 0 0 3px rgba(34,199,232,.13)}.access-submit{min-height:48px;margin-top:5px;border:1px solid var(--brand-blue);border-radius:10px;background:var(--brand-blue);color:var(--action-ink);font-weight:800;font-size:.95rem;cursor:pointer;display:flex;justify-content:center;align-items:center;box-shadow:var(--shadow-btn)}.access-submit:hover{background:var(--brand-blue-light);border-color:var(--brand-blue-light)}.access-submit:disabled{opacity:.7;cursor:wait}.access-alert{padding:10px 12px;border-radius:8px;font-size:.8rem;line-height:1.4}.access-alert.error{background:rgba(251,113,133,.11);color:#fecdd3;border:1px solid rgba(251,113,133,.38)}.access-alert.success{background:rgba(36,211,154,.10);color:#a7f3d0;border:1px solid var(--border-green)}.password-reset-link,.mode-switch,.back-store{border:0;background:none;color:var(--brand-blue);font-size:.84rem;font-weight:700;cursor:pointer}.password-reset-link{display:block;margin:13px auto 0;color:var(--text-dim)}.password-reset-link:hover,.mode-switch:hover,.back-store:hover{color:var(--brand-blue-light);text-decoration:underline;text-underline-offset:3px}.mode-switch{margin-top:14px}.back-store{display:block;margin-top:10px}.access-card small{display:flex;justify-content:center;gap:5px;align-items:center;margin-top:24px;color:var(--text-muted);font-size:.72rem}.spin{animation:spin .7s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}@media(max-width:480px){.customer-access-page{padding:36px 16px}.access-card{padding:27px 20px}}
`;

export default CustomerAccessPage;
