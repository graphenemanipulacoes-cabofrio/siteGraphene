import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { KeyRound } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import StoreLayout from '../components/StoreLayout';

const PasswordResetPage = () => {
    const [password, setPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const submit = async event => {
        event.preventDefault();
        if (password.length < 10 || password !== confirm) { setError('Use ao menos 10 caracteres e confirme a mesma senha.'); return; }
        setLoading(true);
        const { error: updateError } = await supabase.auth.updateUser({ password });
        setLoading(false);
        if (updateError) { setError('O link expirou ou não é válido. Solicite uma nova recuperação.'); return; }
        navigate('/minha-conta', { replace: true });
    };
    return <StoreLayout><section className="reset-page"><form className="reset-card store-card" onSubmit={submit}><KeyRound size={34}/><span className="eyebrow">Segurança da conta</span><h1>Crie uma nova senha</h1><p>Escolha uma senha exclusiva com pelo menos 10 caracteres.</p><label>Nova senha<input type="password" minLength="10" autoComplete="new-password" value={password} onChange={e => setPassword(e.target.value)} required /></label><label>Confirmar senha<input type="password" minLength="10" autoComplete="new-password" value={confirm} onChange={e => setConfirm(e.target.value)} required /></label>{error && <div role="alert">{error}</div>}<button disabled={loading}>{loading ? 'Atualizando...' : 'Atualizar senha'}</button><Link to="/entrar">Voltar ao login</Link></form><style>{styles}</style></section></StoreLayout>;
};
const styles = `.reset-page{min-height:68vh;display:grid;place-items:center;padding:50px 20px}.reset-card{width:min(100%,430px);padding:34px;text-align:center}.reset-card>svg{color:var(--brand-blue);margin-bottom:12px}.reset-card h1{font-size:1.55rem;margin:6px}.reset-card>p{font-size:.85rem;margin-bottom:22px}.reset-card label{display:grid;text-align:left;gap:6px;margin-top:13px;color:var(--text-dim);font-size:.8rem;font-weight:700}.reset-card input{padding:12px;border:1px solid var(--border-card);border-radius:9px;background:rgba(255,255,255,.04);color:#fff;outline:none}.reset-card input:focus{border-color:var(--brand-blue)}.reset-card div[role=alert]{margin-top:15px;color:#fca5a5;font-size:.8rem}.reset-card button{width:100%;margin-top:20px;padding:14px;border:0;border-radius:9px;background:var(--brand-blue);font-weight:800;cursor:pointer}.reset-card>a{display:block;margin-top:13px;color:var(--text-dim);font-size:.8rem}`;
export default PasswordResetPage;
