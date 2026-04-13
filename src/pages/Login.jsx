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
        <div className="container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
            <div className="glass-card" style={{ padding: '3rem', width: '100%', maxWidth: '400px' }}>
                <h2 className="text-gradient" style={{ textAlign: 'center', marginBottom: '2rem' }}><span className="notranslate" translate="no">Graphène</span> Admin</h2>
                <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <input
                        type="text"
                        placeholder="Usuário"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        style={{ padding: '10px', borderRadius: '8px', border: 'none', background: 'rgba(255,255,255,0.1)', color: 'white' }}
                    />
                    <input
                        type="password"
                        placeholder="Senha"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        style={{ padding: '10px', borderRadius: '8px', border: 'none', background: 'rgba(255,255,255,0.1)', color: 'white' }}
                    />
                    <button type="submit" disabled={loading} style={{ padding: '12px', borderRadius: '8px', background: 'var(--primary-blue)', color: 'black', fontWeight: 'bold', cursor: 'pointer', opacity: loading ? 0.7 : 1 }}>
                        {loading ? 'Entrando...' : 'Entrar'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default Login;
