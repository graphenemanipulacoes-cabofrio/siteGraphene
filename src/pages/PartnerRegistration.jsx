import { useState } from 'react';
import { Link } from 'react-router-dom';
import { BadgeCheck, ChevronRight, ShieldCheck, TicketPercent, WalletCards } from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import FloatingWhatsApp from '../components/FloatingWhatsApp';
import { supabase } from '../lib/supabaseClient';
import { Toaster, toast } from 'sonner';

const initialForm = { fullName: '', document: '', email: '', phone: '', pixKey: '', channel: '', requestedCouponCode: '', password: '', passwordConfirmation: '' };

const generateCouponSuggestion = (fullName, channel) => {
  const source = (fullName || '').trim() || (channel || '').trim();
  if (!source) return '';
  const normalized = source
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]/g, '')
    .toUpperCase();
  const firstWord = normalized.slice(0, 10);
  return firstWord ? `${firstWord}10` : '';
};

const PartnerRegistration = () => {
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(false);
  const suggestedCoupon = generateCouponSuggestion(form.fullName, form.channel);
  const update = event => setForm(current => ({ ...current, [event.target.name]: event.target.value }));
  const applySuggestedCoupon = () => {
    if (!suggestedCoupon) return;
    setForm(current => ({ ...current, requestedCouponCode: suggestedCoupon }));
  };
  const submit = async event => {
    event.preventDefault();
    if (form.password !== form.passwordConfirmation) return toast.error('As senhas não coincidem.');
    setLoading(true);
    const { data, error } = await supabase.functions.invoke('partner-register', { body: { fullName: form.fullName, document: form.document, email: form.email, phone: form.phone, pixKey: form.pixKey, channel: form.channel, requestedCouponCode: form.requestedCouponCode, password: form.password } });
    setLoading(false);
    if (error || data?.error) return toast.error(data?.error === 'email_already_registered' ? 'Este e-mail já possui uma solicitação ou conta de parceiro.' : data?.error === 'invalid_coupon_code' ? 'Use apenas letras, números, hífen ou sublinhado no código.' : 'Revise os dados e tente novamente.');
    setForm(initialForm);
    toast.success('Solicitação enviada. Você já pode entrar para acompanhar a análise.');
  };

  return <div className="lux-page-root partner-page">
    <Header /><Toaster position="top-right" richColors />
    <main className="partner-registration-main">
      <section className="partner-registration-copy">
        <span className="partner-eyebrow"><BadgeCheck size={15}/> PROGRAMA DE PARCEIROS</span>
        <h1>Venda com a Graphène. Acompanhe cada resultado.</h1>
        <p>Cadastre-se para receber um cupom exclusivo, acompanhar vendas confirmadas e visualizar comissões em uma área particular.</p>
        <div className="partner-benefits">
          <div><TicketPercent/><span><strong>Cupom exclusivo</strong><small>O código é ativado após aprovação.</small></span></div>
          <div><WalletCards/><span><strong>Painel individual</strong><small>Vendas, desempenho e comissões em tempo real.</small></span></div>
          <div><ShieldCheck/><span><strong>Repasse rastreável</strong><small>Valores liberados após o prazo de segurança.</small></span></div>
        </div>
      </section>
      <section className="partner-registration-card">
        <div className="partner-card-heading"><span>ETAPA 1 DE 1</span><h2>Solicitar parceria</h2><p>Após a análise, sua conta será liberada para o painel.</p></div>
        <form onSubmit={submit} className="partner-form">
          <label>Nome completo<input name="fullName" value={form.fullName} onChange={update} placeholder="Seu nome ou razão social" autoComplete="name" required /></label>
          <div className="partner-form-row"><label>CPF ou CNPJ<input name="document" value={form.document} onChange={update} inputMode="numeric" placeholder="Somente números" required /></label><label>WhatsApp<input name="phone" value={form.phone} onChange={update} inputMode="tel" placeholder="(22) 99999-9999" autoComplete="tel" required /></label></div>
          <label>E-mail de acesso<input name="email" value={form.email} onChange={update} type="email" placeholder="voce@exemplo.com" autoComplete="email" required /></label>
          <label>Chave Pix para futuros repasses<input name="pixKey" value={form.pixKey} onChange={update} placeholder="CPF, e-mail, celular ou chave aleatória" required /></label>
          <div className="partner-form-row">
            <label>Canal principal <span>opcional</span><input name="channel" value={form.channel} onChange={update} placeholder="Instagram, indicação..." /></label>
            <label className="partner-coupon-label">
              <div className="partner-coupon-label-head">
                <span>Cupom desejado <em>opcional</em></span>
                {suggestedCoupon && !form.requestedCouponCode && (
                  <button type="button" className="partner-suggested-chip" onClick={applySuggestedCoupon}>
                    Sugerir: {suggestedCoupon}
                  </button>
                )}
              </div>
              <input
                name="requestedCouponCode"
                value={form.requestedCouponCode}
                onChange={event => setForm(current => ({ ...current, requestedCouponCode: event.target.value.toUpperCase() }))}
                placeholder={suggestedCoupon || 'Ex.: SEUNOME10'}
                maxLength="40"
              />
            </label>
          </div>
          <div className="partner-form-row"><label>Crie uma senha<input name="password" value={form.password} onChange={update} type="password" minLength="10" placeholder="Mínimo de 10 caracteres" autoComplete="new-password" required /></label><label>Confirme a senha<input name="passwordConfirmation" value={form.passwordConfirmation} onChange={update} type="password" minLength="10" placeholder="Repita sua senha" autoComplete="new-password" required /></label></div>
          <button type="submit" disabled={loading}>{loading ? 'Enviando solicitação...' : <>Enviar para análise <ChevronRight size={18}/></>}</button>
        </form>
        <p className="partner-login-note">Já é parceiro? <Link to="/parceiros/entrar">Acessar meu painel</Link></p>
      </section>
    </main>
    <Footer /><FloatingWhatsApp /><style>{styles}</style>
  </div>;
};

const styles = `
.partner-page{background:#071018;color:#eaf2f8}.partner-registration-main{width:min(1120px,calc(100% - 40px));margin:0 auto;padding:116px 0 88px;display:grid;grid-template-columns:.9fr 1.1fr;gap:72px;align-items:center}.partner-eyebrow{display:inline-flex;gap:7px;align-items:center;color:#69e5f8;font-size:.71rem;font-weight:900;letter-spacing:.1em}.partner-registration-copy h1{max-width:550px;margin:16px 0;color:#fff;font-family:var(--font-heading);font-size:clamp(2.15rem,4vw,3.6rem);line-height:1.03}.partner-registration-copy>p{max-width:510px;color:#a9bac9;font-size:1rem;line-height:1.7}.partner-benefits{display:grid;gap:14px;margin-top:34px}.partner-benefits>div{display:flex;gap:12px;align-items:center}.partner-benefits svg{width:19px;color:#61dff4}.partner-benefits strong,.partner-benefits small{display:block}.partner-benefits strong{font-size:.86rem;color:#edf5fb}.partner-benefits small{margin-top:2px;font-size:.76rem;color:#91a7bb}.partner-registration-card{padding:30px;border:1px solid rgba(167,220,235,.17);border-radius:18px;background:linear-gradient(150deg,rgba(18,37,56,.96),rgba(8,21,34,.96));box-shadow:0 30px 80px rgba(0,0,0,.22)}.partner-card-heading span{font-size:.67rem;color:#68def3;font-weight:900;letter-spacing:.1em}.partner-card-heading h2{margin:8px 0 4px;color:#fff;font-size:1.5rem}.partner-card-heading p{font-size:.8rem;color:#91a7bb}.partner-form{display:grid;gap:13px;margin-top:24px}.partner-form label{display:grid;gap:6px;color:#b9c9d6;font-size:.72rem;font-weight:800}.partner-form label span{font-weight:500;color:#72869a}.partner-coupon-label-head{display:flex;align-items:center;justify-content:space-between;gap:6px}.partner-coupon-label-head span{display:inline-flex;gap:4px;align-items:center}.partner-coupon-label-head em{font-style:normal;font-weight:500;color:#72869a}.partner-suggested-chip{border:1px solid rgba(61,216,238,.35)!important;background:rgba(39,203,230,.12)!important;color:#67e4f7!important;font-size:.64rem!important;font-weight:800!important;padding:2px 7px!important;border-radius:6px!important;cursor:pointer;min-height:unset!important;margin:0!important;line-height:1.2}.partner-suggested-chip:hover{background:rgba(39,203,230,.22)!important}.partner-form input{width:100%;min-height:43px;padding:10px 11px;border:1px solid rgba(203,213,225,.15);border-radius:8px;background:#081625;color:#fff;outline:none}.partner-form input:focus{border-color:#3dd8ee;box-shadow:0 0 0 3px rgba(61,216,238,.12)}.partner-form-row{display:grid;grid-template-columns:1fr 1fr;gap:12px}.partner-form button{display:flex;align-items:center;justify-content:center;gap:6px;min-height:46px;margin-top:3px;border:0;border-radius:9px;background:#28cce9;color:#031219;font-size:.8rem;font-weight:900;cursor:pointer}.partner-form button:disabled{opacity:.6;cursor:wait}.partner-login-note{text-align:center;margin:18px 0 0;color:#9bafc0;font-size:.78rem}.partner-login-note a{color:#6ce7f8;font-weight:800}@media(max-width:820px){.partner-registration-main{padding-top:92px;grid-template-columns:1fr;gap:36px}.partner-registration-copy h1{max-width:620px}.partner-registration-card{max-width:650px;width:100%}}@media(max-width:520px){.partner-registration-main{width:min(100% - 28px,1120px);padding-bottom:54px}.partner-registration-card{padding:22px 17px}.partner-form-row{grid-template-columns:1fr}.partner-registration-copy h1{font-size:2.25rem}}
`;

export default PartnerRegistration;
