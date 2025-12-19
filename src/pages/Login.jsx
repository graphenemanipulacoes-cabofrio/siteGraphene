import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';

const Login = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const { data, error } = await supabase
                .from('admins')
                .select('*')
                .ilike('username', username)
                .eq('password', password)
                .single();

            if (error || !data) {
                alert('Credenciais inválidas!');
            } else {
                localStorage.setItem('admin_session', JSON.stringify(data));
                navigate('/admin');
            }
        } catch (error) {
            console.error('Login error:', error);
            alert('Erro ao fazer login.');
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
