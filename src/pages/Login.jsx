import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const navigate = useNavigate();

    const handleLogin = (e) => {
        e.preventDefault();
        if (email === 'admin@graphene.com' && password === 'admin') {
            navigate('/admin');
        } else {
            alert('Credenciais inválidas! (Use admin@graphene.com / admin)');
        }
    };

    return (
        <div className="container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
            <div className="glass-card" style={{ padding: '3rem', width: '100%', maxWidth: '400px' }}>
                <h2 className="text-gradient" style={{ textAlign: 'center', marginBottom: '2rem' }}>Graphène Admin</h2>
                <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <input
                        type="email"
                        placeholder="E-mail"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        style={{ padding: '10px', borderRadius: '8px', border: 'none', background: 'rgba(255,255,255,0.1)', color: 'white' }}
                    />
                    <input
                        type="password"
                        placeholder="Senha"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        style={{ padding: '10px', borderRadius: '8px', border: 'none', background: 'rgba(255,255,255,0.1)', color: 'white' }}
                    />
                    <button type="submit" style={{ padding: '12px', borderRadius: '8px', background: 'var(--primary-blue)', color: 'black', fontWeight: 'bold' }}>
                        Entrar
                    </button>
                </form>
            </div>
        </div>
    );
};

export default Login;
