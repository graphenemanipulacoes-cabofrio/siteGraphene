import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ArrowRight, Chrome, LockKeyhole, UsersRound } from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { Toaster, toast } from 'sonner';
import { useStore } from '../context/StoreContext';
import { signInWithEmail, startGoogleLogin } from '../lib/accountAuth';

const PartnerAccess = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { customer } = useStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const submit = async event => {
    event.preventDefault(); setLoading(true);
    try { await signInWithEmail(email, password); navigate('/parceiros/painel'); }
    catch (error) { toast.error(error.message); }
    finally { setLoading(false); }
  };
  const google = async () => {
    setLoading(true);
    try { await startGoogleLogin('/parceiros/painel'); }
    catch { setLoading(false); toast.error('Não foi possível iniciar o acesso com Google. Tente novamente.'); }
  };
  const needsPartnerAccount = new URLSearchParams(location.search).get('reason') === 'not_partner';
  // Login único: quem já está conectado (parceiro ou administrador) abre o painel direto.
  return <div className="partner-access-page"><Header /><Toaster position="top-right" richColors />
    <main className="partner-access-main"><section><span><UsersRound size={16}/> ÁREA DO PARCEIRO</span><h1>Seu desempenho, em um só lugar.</h1><p>Entre para consultar as vendas confirmadas pelo seu cupom, comissões e repasses.</p></section><section className="partner-access-card"><LockKeyhole size={22}/><h2>Acessar painel</h2>{customer && !needsPartnerAccount && <p className="partner-access-notice">Você está conectado como {customer.email}. <Link to="/parceiros/painel">Abrir o painel</Link>.</p>}{needsPartnerAccount && <p className="partner-access-notice">A conta {customer?.email || 'conectada'} não possui uma solicitação de parceria. Entre com o e-mail usado no cadastro ou <Link to="/parceiros/cadastro">solicite sua parceria</Link>.</p>}<button type="button" className="partner-google-btn" onClick={google} disabled={loading}><Chrome size={18}/> Continuar com Google</button><form onSubmit={submit}><label>E-mail<input type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} required /></label><label>Senha<input type="password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} required /></label><button disabled={loading}>{loading ? 'Entrando...' : <>Entrar no painel <ArrowRight size={17}/></>}</button></form><p>Ainda não se cadastrou? <Link to="/parceiros/cadastro">Solicitar parceria</Link></p></section></main><Footer /><style>{styles}</style></div>;
};

const styles = `.partner-access-page{min-height:100vh;background:#071018;color:#eaf2f8}.partner-access-main{width:min(960px,calc(100% - 40px));min-height:calc(100vh - 180px);margin:auto;display:grid;grid-template-columns:1fr 400px;gap:80px;align-items:center}.partner-access-main>section:first-child>span{display:inline-flex;gap:7px;align-items:center;color:#64ddf2;font-size:.7rem;font-weight:900;letter-spacing:.1em}.partner-access-main h1{margin:15px 0;color:#fff;font-size:clamp(2.25rem,5vw,4rem);line-height:1.02}.partner-access-main>section:first-child>p{max-width:460px;color:#9eafc0;line-height:1.7}.partner-access-card{padding:29px;border:1px solid rgba(183,223,235,.16);border-radius:17px;background:linear-gradient(145deg,#10263a,#091624)}.partner-access-card>svg{color:#67dff3}.partner-access-card h2{margin:12px 0 22px;color:#fff;font-size:1.35rem}.partner-access-notice{margin:-8px 0 18px!important;padding:10px 12px;border:1px solid rgba(103,223,243,.26);border-radius:8px;background:rgba(42,174,202,.1);color:#c6eaf0!important;text-align:left!important;line-height:1.45}.partner-access-card form{display:grid;gap:14px}.partner-access-card .partner-google-btn{width:100%;margin-bottom:16px;background:#fff;color:#16202e}.partner-access-card .partner-google-btn:hover{background:#f1f5f9}.partner-access-card button:disabled{opacity:.7;cursor:wait}.partner-access-card label{display:grid;gap:6px;color:#b5c7d4;font-size:.73rem;font-weight:800}.partner-access-card input{min-height:44px;padding:10px;border:1px solid rgba(203,213,225,.16);border-radius:8px;background:#071321;color:#fff;outline:none}.partner-access-card input:focus{border-color:#3ad4ea}.partner-access-card button{display:flex;align-items:center;justify-content:center;gap:6px;min-height:46px;border:0;border-radius:9px;background:#27c9e6;color:#031218;font-weight:900;cursor:pointer}.partner-access-card p{margin-top:20px;text-align:center;color:#8ca1b3;font-size:.78rem}.partner-access-card a{color:#69e2f4;font-weight:800}@media(max-width:760px){.partner-access-main{grid-template-columns:1fr;gap:32px;padding:86px 0 60px}.partner-access-card{max-width:450px;width:100%}}`;
export default PartnerAccess;
