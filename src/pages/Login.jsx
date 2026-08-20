import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { hashPassword, createSession, checkRateLimit, recordFailedAttempt, clearFailedAttempts } from '../utils/security';
import { Toaster, toast } from 'sonner';
import { Lock, User, ArrowLeft, ShieldCheck } from 'lucide-react';

const Login = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const rateLimit = checkRateLimit();
            if (!rateLimit.allowed) {
                toast.error(rateLimit.message);
                return;
            }

            const hashedPassword = await hashPassword(password);

            const { data, error } = await supabase
                .from('admins')
                .select('*')
                .ilike('username', username)
                .eq('password', hashedPassword)
                .single();

            if (error || !data) {
                recordFailedAttempt();
                toast.error('Credenciais inválidas!');
            } else {
                clearFailedAttempts();
                createSession(data);
                toast.success('Login realizado com sucesso!');
                navigate('/admin');
            }
        } catch (error) {
            console.error('Login error:', error);
            toast.error('Erro ao fazer login.');
        } finally {
            setLoading(false);
        }
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

                <form onSubmit={handleLogin} className="login-form">
                    <div className="login-input-group">
                        <label><User size={14} /> Usuário</label>
                        <input
                            type="text"
                            placeholder="Seu usuário"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            required
                        />
                    </div>

                    <div className="login-input-group">
                        <label><Lock size={14} /> Senha</label>
                        <input
                            type="password"
                            placeholder="Sua senha"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>

                    <button 
                        type="submit" 
                        disabled={loading} 
                        className="btn-primary-lux login-submit-btn"
                    >
                        {loading ? 'Validando credenciais...' : 'Acessar Painel'}
                    </button>
                </form>

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
                    background: rgba(255, 255, 255, 0.98);
                    border: 1px solid var(--border-light);
                    border-radius: var(--radius-xl);
                    padding: 44px 36px;
                    box-shadow: var(--shadow-xl);
                }

                .back-home-link {
                    display: inline-flex;
                    align-items: center;
                    gap: 6px;
                    font-size: 0.85rem;
                    font-weight: 600;
                    color: var(--text-light);
                    margin-bottom: 24px;
                    transition: color var(--transition-fast);
                }

                .back-home-link:hover {
                    color: var(--primary);
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
                    color: var(--text-primary);
                    margin-bottom: 4px;
                }

                .login-brand-header p {
                    font-size: 0.86rem;
                    color: var(--text-secondary);
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
                    color: var(--text-primary);
                }

                .login-input-group input {
                    width: 100%;
                    padding: 13px 16px;
                    border-radius: var(--radius-sm);
                    border: 1.5px solid var(--border-light);
                    background: #f8fafc;
                    color: var(--text-primary);
                    font-size: 0.95rem;
                    outline: none;
                    transition: border-color var(--transition-fast);
                }

                .login-input-group input:focus {
                    border-color: var(--primary);
                    background: #ffffff;
                }

                .login-submit-btn {
                    width: 100%;
                    padding: 14px;
                    margin-top: 8px;
                }

                .login-security-footer {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 6px;
                    margin-top: 24px;
                    font-size: 0.76rem;
                    color: var(--text-light);
                }
            `}</style>
        </div>
    );
};

export default Login;
