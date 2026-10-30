import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { clearFailedAttempts } from '../utils/security';
import { currentAccountEmail, ensureAdminSession, sendPasswordReset, signInWithEmail, startGoogleLogin } from '../lib/accountAuth';
import { Toaster, toast } from 'sonner';
import { Chrome, Lock, Mail, ArrowLeft, ShieldCheck } from 'lucide-react';

// Administração: mesma conta do site (e-mail e senha ou Google). O e-mail precisa
// estar cadastrado como administrador; quem já está conectado entra direto.
const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(true);
    const [notice, setNotice] = useState('');
    const navigate = useNavigate();

    useEffect(() => {
        clearFailedAttempts();
        let active = true;
        (async () => {
            const signedEmail = await currentAccountEmail();
            const session = signedEmail ? await ensureAdminSession() : null;
            if (!active) return;
            if (session) { navigate('/admin', { replace: true }); return; }
            if (signedEmail) setNotice(`A conta ${signedEmail} não tem acesso de administrador. Entre com um e-mail de administrador.`);
            setLoading(false);
        })();
        return () => { active = false; };
    }, [navigate]);

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true); setNotice('');
        try {
            await signInWithEmail(email, password);
            const session = await ensureAdminSession();
            if (!session) {
                setNotice('Este e-mail entrou na conta do site, mas não tem acesso de administrador.');
                return;
            }
            toast.success('Login realizado com sucesso!');
            navigate('/admin');
        } catch (error) {
            toast.error(error.message || 'Não foi possível entrar agora. Tente novamente.');
        } finally {
            setLoading(false);
        }
    };

    const handleGoogle = async () => {
        setLoading(true);
        try { await startGoogleLogin('/login'); }
        catch { setLoading(false); toast.error('Não foi possível iniciar o acesso com Google. Tente novamente.'); }
    };

    const handleReset = async () => {
        if (!email) return toast.error('Digite seu e-mail para receber o link de nova senha.');
        try { await sendPasswordReset(email); toast.success('Se o e-mail estiver cadastrado, você receberá o link para criar uma nova senha.'); }
        catch (error) { toast.error(error.message); }
    };

    return (
        <div className="login-root">
            <Toaster position="top-right" richColors />
            
            <div className="login-card-box">
                <Link to="/" className="back-home-link">
                    <ArrowLeft size={16} />
                    <span>Voltar ao site</span>
                </Link>

                <div className="login-brand-header">
                    <img src="/assets/logo.png" alt="Graphène" className="login-brand-logo" />
                    <h2>Acesso Restrito</h2>
                    <p>Painel Administrativo da Graphène Farmácia</p>
                </div>

                <button type="button" className="login-google-btn" onClick={handleGoogle} disabled={loading}>
                    <Chrome size={18} /> Continuar com Google
                </button>
                <div className="login-divider"><span>ou use seu e-mail</span></div>

                <form onSubmit={handleLogin} className="login-form">
                    <div className="login-input-group">
                        <label><Mail size={14} /> E-mail</label>
                        <input
                            type="email"
                            autoComplete="email"
                            placeholder="voce@exemplo.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>

                    <div className="login-input-group">
                        <label><Lock size={14} /> Senha</label>
                        <input
                            type="password"
                            autoComplete="current-password"
                            placeholder="Sua senha"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>

                    {notice && <p className="login-notice" role="alert">{notice}</p>}

                    <button
                        type="submit"
                        disabled={loading}
                        className="btn-primary-lux login-submit-btn"
                    >
                        {loading ? 'Validando acesso...' : 'Acessar Painel'}
                    </button>
                </form>

                <button type="button" className="login-reset-link" onClick={handleReset}>Esqueci minha senha</button>

                <div className="login-security-footer">
                    <ShieldCheck size={14} color="#10b981" />
                    <span>Ambiente criptografado com proteção contra invasões</span>
                </div>
            </div>

            <style>{`
                .login-root {
                    min-height: 100vh;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: linear-gradient(135deg, #090e17 0%, #0f172a 100%);
                    padding: 24px;
                    position: relative;
                }

                .login-card-box {
                    width: 100%;
                    max-width: 440px;
                    background: #ffffff;
                    border: 1px solid #e2e8f0;
                    border-radius: 24px;
                    padding: 44px 36px;
                    box-shadow: 0 24px 64px rgba(0, 0, 0, 0.28);
                }

                .back-home-link {
                    display: inline-flex;
                    align-items: center;
                    gap: 6px;
                    font-size: 0.85rem;
                    font-weight: 600;
                    color: #64748b;
                    margin-bottom: 24px;
                    transition: color 0.2s ease;
                }

                .back-home-link:hover {
                    color: #0284c7;
                }

                .login-brand-header {
                    text-align: center;
                    margin-bottom: 32px;
                }

                .login-brand-logo {
                    height: 48px;
                    width: auto;
                    margin: 0 auto 16px;
                    object-fit: contain;
                }

                .login-brand-header h2 {
                    font-size: 1.45rem;
                    font-weight: 800;
                    color: #0f172a;
                    margin-bottom: 4px;
                }

                .login-brand-header p {
                    font-size: 0.86rem;
                    color: #475569;
                }

                .login-form {
                    display: flex;
                    flex-direction: column;
                    gap: 18px;
                }

                .login-input-group {
                    display: flex;
                    flex-direction: column;
                    gap: 6px;
                }

                .login-input-group label {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    font-size: 0.84rem;
                    font-weight: 600;
                    color: #1e293b;
                }

                .login-input-group input {
                    width: 100%;
                    padding: 13px 16px;
                    border-radius: 10px;
                    border: 1.5px solid #cbd5e1;
                    background: #f8fafc;
                    color: #0f172a;
                    font-size: 0.95rem;
                    outline: none;
                    transition: border-color 0.2s ease, box-shadow 0.2s ease;
                }

                .login-input-group input:focus {
                    border-color: #0284c7;
                    background: #ffffff;
                    box-shadow: 0 0 0 3px rgba(2, 132, 199, 0.15);
                }

                .login-submit-btn {
                    width: 100%;
                    padding: 14px;
                    margin-top: 8px;
                    border: 0;
                    border-radius: 10px;
                    background: #0284c7;
                    color: #ffffff;
                    font-size: 0.95rem;
                    font-weight: 700;
                    cursor: pointer;
                    transition: background 0.2s ease, transform 0.2s ease;
                }

                .login-submit-btn:hover:not(:disabled) {
                    background: #0369a1;
                    transform: translateY(-1px);
                }

                .login-submit-btn:disabled {
                    cursor: wait;
                    opacity: 0.7;
                }

                .login-google-btn {
                    width: 100%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 10px;
                    padding: 13px;
                    border-radius: 10px;
                    border: 1.5px solid #cbd5e1;
                    background: #ffffff;
                    color: #0f172a;
                    font-size: 0.92rem;
                    font-weight: 700;
                    cursor: pointer;
                    transition: border-color 0.2s ease, background 0.2s ease;
                }

                .login-google-btn:hover:not(:disabled) {
                    border-color: #0284c7;
                    background: #f8fafc;
                }

                .login-google-btn:disabled {
                    cursor: wait;
                    opacity: 0.7;
                }

                .login-divider {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    margin: 18px 0;
                    color: #64748b;
                    font-size: 0.76rem;
                    font-weight: 600;
                }

                .login-divider::before,
                .login-divider::after {
                    content: '';
                    flex: 1;
                    height: 1px;
                    background: #e2e8f0;
                }

                .login-notice {
                    margin: 0;
                    padding: 10px 12px;
                    border-radius: 8px;
                    background: #fff7ed;
                    border: 1px solid #fed7aa;
                    color: #9a3412;
                    font-size: 0.82rem;
                    line-height: 1.45;
                }

                .login-reset-link {
                    display: block;
                    margin: 16px auto 0;
                    border: 0;
                    background: none;
                    color: #0284c7;
                    font-size: 0.84rem;
                    font-weight: 600;
                    cursor: pointer;
                }

                .login-reset-link:hover {
                    text-decoration: underline;
                }

                .login-security-footer {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 6px;
                    margin-top: 24px;
                    font-size: 0.76rem;
                    color: #64748b;
                }
            `}</style>
        </div>
    );
};

export default Login;
