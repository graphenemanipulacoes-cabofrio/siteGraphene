import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useLocation } from 'react-router-dom';
import { FlaskConical, KeyRound, LogOut, Monitor, PackageCheck, ShieldCheck, ShoppingBag, UserRound, Users } from 'lucide-react';
import { Toaster, toast } from 'sonner';
import { supabase } from '../lib/supabaseClient';
import StoreLayout from '../components/StoreLayout';
import { useStore } from '../context/StoreContext';
import { isAdminPreview } from '../utils/adminPreview';
import { currentStaffRole } from '../lib/accountAuth';

const money = value => Number(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const statusLabel = status => ({ awaiting_payment: 'Aguardando pagamento', paid: 'Pagamento aprovado', processing: 'Em preparação', shipped: 'Enviado', delivered: 'Entregue', cancelled: 'Cancelado' })[status] || status;
const passwordErrors = {
    same_password: 'A nova senha precisa ser diferente da atual.',
    weak_password: 'Essa senha é fraca demais. Use pelo menos 10 caracteres, misturando letras, números e símbolos.',
    reauthentication_needed: 'Por segurança, saia e entre de novo na conta antes de trocar a senha.',
};

// Troca da senha da própria conta (clientes, parceiros, equipe e administradores).
// Quem entra só com Google também pode criar uma senha aqui para entrar por e-mail.
const PasswordChange = () => {
    const [password, setPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const [saving, setSaving] = useState(false);
    const submit = async event => {
        event.preventDefault();
        if (password.length < 10) return toast.error('Use uma senha com pelo menos 10 caracteres.');
        if (password !== confirm) return toast.error('As duas senhas não são iguais.');
        setSaving(true);
        try {
            const { error } = await supabase.auth.updateUser({ password });
            if (error) { toast.error(passwordErrors[error.code] || 'Não foi possível trocar a senha agora. Tente novamente.'); return; }
            setPassword(''); setConfirm('');
            toast.success('Senha alterada. Use a nova senha no próximo acesso.');
        } catch {
            toast.error('Não foi possível trocar a senha agora. Tente novamente.');
        } finally {
            setSaving(false);
        }
    };
    return <form className="account-password store-card" onSubmit={submit}>
        <h2><KeyRound size={18}/> Alterar senha</h2>
        <label>Nova senha<input type="password" autoComplete="new-password" minLength={10} maxLength={128} required value={password} onChange={e => setPassword(e.target.value)} /></label>
        <label>Repita a nova senha<input type="password" autoComplete="new-password" minLength={10} maxLength={128} required value={confirm} onChange={e => setConfirm(e.target.value)} /></label>
        <button disabled={saving}>{saving ? 'Salvando…' : 'Salvar nova senha'}</button>
    </form>;
};

const AccountPage = () => {
    const { customer, authReady } = useStore();
    const [orderState, setOrderState] = useState({ customerId: null, orders: [] });
    const [staffRole, setStaffRole] = useState(null);
    const navigate = useNavigate();
    const location = useLocation();
    const adminPreview = isAdminPreview(location.search);

    useEffect(() => {
        if (!customer) return;
        let active = true;
        supabase.from('orders').select('id,total,status,payment_status,created_at').order('created_at', { ascending: false }).then(({ data }) => {
            if (active) setOrderState({ customerId: customer.id, orders: data || [] });
        });
        currentStaffRole().then(role => { if (active) setStaffRole(role); });
        return () => { active = false; };
    }, [customer]);

    const logout = async () => { await supabase.auth.signOut({ scope: 'local' }); navigate('/'); };
    if (!authReady) return <StoreLayout><div className="account-loading">Carregando sua conta...</div></StoreLayout>;
    if (!customer && adminPreview) return <StoreLayout><section className="account-page"><div className="container account-container"><div className="account-hero"><div><span className="eyebrow">Visualização administrativa</span><h1>Área do cliente</h1><p>Pré-visualização da experiência do cliente, sem dados pessoais ou ações de compra.</p></div><Link className="account-admin-back" to="/admin"><ShieldCheck size={16}/> Voltar ao painel</Link></div><div className="account-grid"><aside className="account-profile store-card"><div className="account-avatar"><UserRound size={24}/></div><h2>Dados do cliente</h2><p>Nenhuma conta selecionada</p><small>Entre como cliente para consultar dados reais.</small></aside><div className="account-orders"><h2><PackageCheck size={21}/> Meus pedidos</h2><div className="orders-empty store-card"><ShoppingBag size={30}/><h3>Visualização sem pedidos</h3><p>Os pedidos reais aparecem somente para o cliente autenticado.</p><Link to="/entrar" state={{ returnTo: '/minha-conta' }}>Abrir login do cliente</Link></div></div></div></div><style>{accountStyles}</style></section></StoreLayout>;
    if (!customer) return <StoreLayout><section className="account-gate"><UserRound size={38}/><h1>Entre para acessar sua conta</h1><p>Veja seus pedidos e mantenha seus dados de compra organizados em um único lugar.</p><Link to="/entrar" state={{ returnTo: '/minha-conta' }} className="btn-cta-blue">Entrar ou criar conta</Link></section><style>{accountStyles}</style></StoreLayout>;
    const ordersLoading = orderState.customerId !== customer.id;
    const orders = ordersLoading ? [] : orderState.orders;

    return <StoreLayout><section className="account-page"><Toaster position="top-right" richColors /><div className="container account-container">
        <div className="account-hero"><div><span className="eyebrow">Minha conta</span><h1>Olá, {customer.email.split('@')[0]}</h1><p>Gerencie seus pedidos e informações de compra.</p></div><button onClick={logout}><LogOut size={16}/> Sair</button></div>
        <div className="account-grid"><aside className="account-profile store-card"><div className="account-avatar">{customer.email.slice(0,1).toUpperCase()}</div><h2>Seus dados</h2><p>{customer.email}</p><small>Conta criada em {new Date(customer.created_at).toLocaleDateString('pt-BR')}</small>{staffRole && <nav className="account-staff-links" aria-label="Áreas da equipe"><strong>{staffRole === 'admin' ? 'Administrador' : staffRole === 'farmaceutico' ? 'Farmacêutico' : 'Balcão'}</strong>{staffRole === 'admin' && <Link to="/admin"><ShieldCheck size={15}/> Administração</Link>}{(staffRole === 'admin' || staffRole === 'farmaceutico') && <Link to="/farmaceutico"><FlaskConical size={15}/> Farmacêutico</Link>}<Link to="/balcaographene"><Monitor size={15}/> Balcão</Link>{staffRole === 'admin' && <Link to="/parceiros/painel"><Users size={15}/> Parceiros</Link>}</nav>}</aside>
            <div className="account-orders"><h2><PackageCheck size={21}/> Meus pedidos</h2>{ordersLoading ? <div className="orders-empty store-card"><p>Carregando pedidos...</p></div> : orders.length === 0 ? <div className="orders-empty store-card"><ShoppingBag size={30}/><h3>Ainda não há pedidos</h3><p>Quando você finalizar uma compra, ela aparecerá aqui.</p><Link to="/#produtos">Ir para a loja</Link></div> : <div className="orders-list">{orders.map(order => <article className="order-card store-card" key={order.id}><div><span>Pedido #{order.id.slice(-6).toUpperCase()}</span><small>{new Date(order.created_at).toLocaleDateString('pt-BR')}</small></div><strong>{money(order.total)}</strong><p>{statusLabel(order.status)}</p></article>)}</div>}<PasswordChange /></div>
        </div>
    </div><style>{accountStyles}</style></section></StoreLayout>;
};

const accountStyles = `
.account-loading,.account-gate{min-height:65vh;display:grid;place-items:center;text-align:center;padding:50px 20px}.account-gate{align-content:center;gap:13px}.account-gate svg{color:var(--brand-blue)}.account-gate h1{font-size:1.7rem}.account-gate p{max-width:450px}.account-page{min-height:68vh;padding:48px 0 76px}.account-container{max-width:1000px}.account-hero{display:flex;align-items:flex-end;justify-content:space-between;gap:20px;margin-bottom:28px}.account-hero h1{font-size:2rem;margin:4px 0}.account-hero button,.account-admin-back{display:flex;gap:7px;align-items:center;background:transparent;color:var(--text-dim);border:1px solid var(--border-card);padding:9px 13px;border-radius:9px;cursor:pointer}.account-admin-back{color:var(--brand-blue);font-size:.8rem;font-weight:800}.account-grid{display:grid;grid-template-columns:260px 1fr;gap:22px}.account-profile{padding:27px}.account-avatar{width:54px;height:54px;border-radius:50%;display:grid;place-items:center;background:var(--brand-blue);color:#06202b;font-size:1.35rem;font-weight:800;margin-bottom:18px}.account-profile h2{font-size:1rem}.account-profile p{word-break:break-all;font-size:.86rem;margin:5px 0}.account-profile small{color:var(--text-muted);font-size:.73rem}.account-orders>h2{display:flex;align-items:center;gap:8px;font-size:1.18rem;margin:4px 0 14px}.orders-empty{padding:40px;text-align:center}.orders-empty svg{color:var(--brand-blue)}.orders-empty h3{margin:10px}.orders-empty p{font-size:.86rem;margin-bottom:14px}.orders-empty a{color:var(--brand-blue);font-weight:700}.orders-list{display:grid;gap:12px}.order-card{padding:18px;display:grid;grid-template-columns:1fr auto;gap:6px}.order-card div{display:grid;gap:2px}.order-card span{font-weight:800}.order-card small,.order-card p{color:var(--text-muted);font-size:.76rem}.order-card strong{color:#fff}.order-card p{grid-column:1/-1;margin:0}.account-staff-links{display:grid;gap:7px;margin-top:18px;padding-top:16px;border-top:1px solid var(--border-subtle)}.account-staff-links strong{font-size:.72rem;letter-spacing:.06em;text-transform:uppercase;color:var(--text-muted)}.account-staff-links a{display:flex;align-items:center;gap:7px;color:var(--brand-blue);font-size:.84rem;font-weight:700}.account-staff-links a:hover{color:var(--brand-blue-light)}.account-password{margin-top:22px;padding:22px;display:grid;gap:13px}.account-password h2{display:flex;align-items:center;gap:8px;font-size:1.05rem;margin:0}.account-password label{display:grid;gap:6px;font-size:.82rem;font-weight:700;color:var(--text-main)}.account-password input{border:1px solid var(--border-card);background:rgba(255,255,255,.055);color:var(--text-main);border-radius:10px;padding:11px 13px;outline:none}.account-password input:focus{border-color:var(--brand-blue);box-shadow:0 0 0 3px rgba(34,199,232,.13)}.account-password button{justify-self:start;min-height:42px;padding:0 18px;border:1px solid var(--brand-blue);border-radius:10px;background:var(--brand-blue);color:var(--action-ink);font-weight:800;cursor:pointer}.account-password button:disabled{opacity:.7;cursor:wait}@media(max-width:680px){.account-page{padding:32px 0 56px}.account-hero{align-items:flex-start;flex-direction:column}.account-grid{grid-template-columns:1fr}.account-profile{display:grid;grid-template-columns:auto 1fr;column-gap:14px;align-items:center}.account-avatar{grid-row:span 3;margin:0}.account-admin-back{align-self:stretch;justify-content:center}}
`;

export default AccountPage;
