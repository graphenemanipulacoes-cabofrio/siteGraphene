import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { hashPassword, createSession, checkRateLimit, recordFailedAttempt, clearFailedAttempts } from '../utils/security';
import { toast } from 'sonner';

const Login = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            // Check rate limiting
            const rateLimit = checkRateLimit();
            if (!rateLimit.allowed) {
                toast.error(rateLimit.message);
                return;
            }

            // Hash the password before checking
            const hashedPassword = await hashPassword(password);

            const { data, error } = await supabase
                .from('admins')
                .select('*')
                .ilike('username', username)
                .eq('password', hashedPassword)
                .single();

            if (error || !data) {
                // Record failed attempt
                recordFailedAttempt();
                toast.error('Credenciais inválidas!');
            } else {
                // Clear failed attempts on successful login
                clearFailedAttempts();
                
                // Create secure session
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
        <div className="container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: 'var(--bg-dark)' }}>
            <div style={{ padding: '3.5rem 3rem', width: '100%', maxWidth: '420px', background: 'var(--bg-dark-secondary)', border: '1px solid var(--border-dark)', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-xl)' }}>
                <h2 style={{ textAlign: 'center', marginBottom: '2.5rem', color: 'var(--text-white)', fontWeight: '800', fontSize: '1.75rem', letterSpacing: '-0.5px' }}>
                    <span className="notranslate" translate="no">Graphène</span> <span style={{ color: 'var(--primary)', fontWeight: '400' }}>Admin</span>
                </h2>
                <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    <input
                        type="text"
                        placeholder="Usuário"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        style={{ padding: '12px 14px', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.02)', color: 'white', outline: 'none', transition: 'border-color var(--transition-base)' }}
                        onFocus={(e) => e.target.style.borderColor = 'var(--primary)'}
                        onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.08)'}
                    />
                    <input
                        type="password"
                        placeholder="Senha"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        style={{ padding: '12px 14px', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.02)', color: 'white', outline: 'none', transition: 'border-color var(--transition-base)' }}
                        onFocus={(e) => e.target.style.borderColor = 'var(--primary)'}
                        onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.08)'}
                    />
                    <button 
                        type="submit" 
                        disabled={loading} 
                        style={{ padding: '14px', borderRadius: 'var(--radius-sm)', background: 'var(--gradient-primary)', border: 'none', color: '#fff', fontWeight: 'bold', cursor: 'pointer', transition: 'opacity var(--transition-base), transform var(--transition-base)', opacity: loading ? 0.7 : 1 }}
                    >
                        {loading ? 'Entrando...' : 'Entrar'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default Login;
