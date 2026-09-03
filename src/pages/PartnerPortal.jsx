import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { 
  BadgeCheck, 
  Calendar, 
  CircleDollarSign, 
  Clock3, 
  Copy, 
  Eye,
  Gift, 
  HelpCircle, 
  Info, 
  LogOut, 
  MessageCircle, 
  Receipt, 
  ReceiptText, 
  RefreshCw, 
  ShieldCheck, 
  Sparkles, 
  TicketPercent, 
  WalletCards 
} from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { Toaster, toast } from 'sonner';
import { isAdminPreview } from '../utils/adminPreview';

const DIRECTOR_WHATSAPP_PHONE = '5522998994412';
const DIRECTOR_WHATSAPP_DISPLAY = '(22) 99899-4412';

const money = value => Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const date = value => value ? new Date(value).toLocaleDateString('pt-BR', { dateStyle: 'medium' }) : '—';

const PartnerPortal = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const adminPreview = isAdminPreview(location.search);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    if (adminPreview) {
      setData({
        profile: { full_name: 'Visualização administrativa', status: 'approved', referral_code: 'PREVIEW10', created_at: new Date().toISOString() },
        coupon: { code: 'PREVIEW10', discount_type: 'percentage', discount_value: 10, redeemed_count: 0 },
        metrics: { paidSalesCount: 0, paidSalesAmount: 0, pendingCommission: 0, availableCommission: 0, paidCommission: 0 },
        productCredits: { granted: 0, used: 0, balance: 0, movements: [] },
        orders: [],
        commissions: [],
      });
      setLoading(false);
      return;
    }
    const { data: refreshed, error: refreshError } = await supabase.auth.refreshSession();
    const accessToken = refreshed.session?.access_token;
    if (refreshError || !accessToken) {
      await supabase.auth.signOut();
      navigate('/parceiros/entrar');
      return;
    }
    const { data: response, error } = await supabase.functions.invoke('partner-portal', {
      body: { action: 'dashboard' },
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    if (response?.state === 'not_partner') {
      await supabase.auth.signOut();
      navigate('/parceiros/entrar?reason=not_partner');
      return;
    }
    if (error || response?.error) {
      if (response?.error === 'unauthorized') {
        await supabase.auth.signOut();
        navigate('/parceiros/entrar');
        return;
      }
      setLoadError('Não foi possível carregar os dados da sua conta agora. Tente novamente em instantes.');
    } else {
      setData(response);
    }
    setLoading(false);
  }, [adminPreview, navigate]);

  useEffect(() => {
    const timer = window.setTimeout(load, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const metrics = useMemo(() => data?.metrics || {
    paidSalesCount: 0,
    paidSalesAmount: 0,
    pendingCommission: 0,
    availableCommission: 0,
    paidCommission: 0
  }, [data]);

  const productCredits = useMemo(() => data?.productCredits || {
    granted: 0,
    used: 0,
    balance: 0,
    movements: []
  }, [data]);

  const copyCoupon = async () => {
    if (!data?.coupon?.code) return;
    await navigator.clipboard.writeText(data.coupon.code);
    toast.success('Cupom copiado com sucesso!');
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate('/parceiros/entrar');
  };

  const getDirectWaUrl = (messageText) => {
    const msg = encodeURIComponent(messageText);
    return `https://wa.me/${DIRECTOR_WHATSAPP_PHONE}?text=${msg}`;
  };

  if (loading) {
    return (
      <div className="partner-portal-loading">
        <div className="partner-loading-inner">
          <Sparkles className="spin" size={24} color="#38bdf8" />
          <span>Carregando seu painel de parceiro...</span>
        </div>
      </div>
    );
  }

  const profile = data?.profile;

  if (loadError || !profile) {
    return (
      <div className="partner-portal-shell">
        <Toaster richColors />
        <header className="partner-portal-header">
          <strong>GRAPHÈNE <small>PARCEIROS</small></strong>
          {adminPreview ? <button onClick={() => navigate('/admin')}><LogOut size={16}/> Voltar ao painel</button> : <button onClick={signOut}><LogOut size={16}/> Sair</button>}
        </header>
        <main className="partner-status-card">
          <Clock3/>
          <span>CONEXÃO DO PAINEL</span>
          <h1>Não foi possível atualizar sua conta agora.</h1>
          <p>{loadError || 'Sua conta de parceiro ainda não foi localizada.'}</p>
          <button className="partner-retry" onClick={load}>Tentar novamente</button>
        </main>
        <style>{styles}</style>
      </div>
    );
  }

  // Not yet approved
  if (profile.status !== 'approved') {
    const isPending = profile.status === 'pending';
    const isRejected = profile.status === 'rejected';
    const isSuspended = profile.status === 'suspended';

    const waText = isPending
      ? `Olá! Sou ${profile.full_name}, fiz meu cadastro de parceiro(a) na Graphène e gostaria de falar diretamente com a diretoria sobre a aprovação.`
      : `Olá! Sou ${profile.full_name}, parceiro(a) cadastrado na Graphène e gostaria de falar com a diretoria sobre meu acesso ao painel.`;

    return (
      <div className="partner-portal-shell">
        <Toaster richColors />
        <header className="partner-portal-header">
          <strong>GRAPHÈNE <small>PARCEIROS</small></strong>
          <div className="header-right-group">
            <a 
              href={getDirectWaUrl(waText)} 
              target="_blank" 
              rel="noreferrer" 
              className="partner-direct-wa-btn"
            >
              <MessageCircle size={15}/> Falar com Diretor {DIRECTOR_WHATSAPP_DISPLAY}
            </a>
            {adminPreview ? <button onClick={() => navigate('/admin')}><LogOut size={16}/> Voltar ao painel</button> : <button onClick={signOut}><LogOut size={16}/> Sair</button>}
          </div>
        </header>

        <main className="partner-status-card">
          <Clock3/>
          <span>SOLICITAÇÃO {isRejected ? 'NÃO APROVADA' : isSuspended ? 'SUSPENSA' : 'EM ANÁLISE'}</span>
          <h1>{isRejected ? 'Sua solicitação precisa de revisão.' : isSuspended ? 'Seu acesso está temporariamente suspenso.' : 'Seu cadastro está em análise pela diretoria.'}</h1>
          <p>
            {isRejected 
              ? (profile.rejection_reason || 'Entre em contato com nossa diretoria para mais detalhes.')
              : isSuspended 
              ? 'Fale diretamente com nossa diretoria para regularizar seu acesso ao programa.' 
              : 'Nossa seleção de parceiros e influenciadores é criteriosa e personalizada. Para agilizar a validação do seu perfil ou tirar dúvidas sobre sua comissão e cupom, fale diretamente comigo pelo WhatsApp.'}
          </p>

          <div className="pending-wa-cta">
            <a 
              href={getDirectWaUrl(waText)} 
              target="_blank" 
              rel="noreferrer" 
              className="btn-wa-priority"
            >
              <MessageCircle size={18}/>
              <span>Falar diretamente no WhatsApp: {DIRECTOR_WHATSAPP_DISPLAY}</span>
            </a>
          </div>

          <small>Solicitação enviada em {date(profile.created_at)}</small>
        </main>
        <style>{styles}</style>
      </div>
    );
  }

  // Approved Partner Portal
  const directWaMessage = `Olá! Sou ${profile.full_name}, parceiro(a) oficial da Graphène. Gostaria de falar sobre produtos na loja física / parceria.`;

  return (
    <div className="partner-portal-shell">
      <Toaster richColors />
      {adminPreview && <div className="admin-partner-preview-bar"><Eye size={15}/><span>Visualização administrativa: dados e ações reais do parceiro estão protegidos.</span><button onClick={() => navigate('/admin')}>Voltar ao painel</button></div>}

      {/* Top Portal Header */}
      <header className="partner-portal-header">
        <strong>GRAPHÈNE <small>PARCEIROS</small></strong>
        <div className="header-right-group">
          <span className="partner-welcome-badge">
            <BadgeCheck size={14} color="#38bdf8"/>
            {profile.full_name.split(' ')[0]}
          </span>

          <a 
            href={getDirectWaUrl(directWaMessage)} 
            target="_blank" 
            rel="noreferrer" 
            className="partner-direct-wa-btn" 
            title="Canal direto com a diretoria da Graphène"
          >
            <MessageCircle size={15}/> 
            <span>WhatsApp Diretoria {DIRECTOR_WHATSAPP_DISPLAY}</span>
          </a>

          {adminPreview ? <button onClick={() => navigate('/admin')} className="btn-portal-signout" title="Voltar ao painel administrativo"><LogOut size={16}/> Voltar ao painel</button> : <button onClick={signOut} className="btn-portal-signout" title="Sair da conta"><LogOut size={16}/> Sair</button>}
        </div>
      </header>

      <main className="partner-dashboard">
        {/* Intro */}
        <section className="partner-dashboard-intro">
          <div>
            <span><BadgeCheck size={15}/> PARCERIA OFICIAL ATIVA</span>
            <h1>Painel do Parceiro</h1>
            <p>Acompanhe suas vendas pelo cupom, comissões em dinheiro e saldo de produtos na loja física.</p>
          </div>
          <button className="partner-refresh" onClick={load}>
            <RefreshCw size={15}/> Atualizar dados
          </button>
        </section>

        {/* Direct WhatsApp Director Banner */}
        <section className="partner-director-card">
          <div className="director-card-content">
            <div className="director-icon-box">
              <MessageCircle size={22} color="#10b981"/>
            </div>
            <div>
              <strong>Canal Direto com a Diretoria Graphène</strong>
              <p>
                Como nosso parceiro é selecionado a dedo, você tem contato direto para pedidos na loja física, envio de notas fiscais, novas fórmulas e estratégias.
              </p>
            </div>
          </div>
          <a 
            href={getDirectWaUrl(directWaMessage)} 
            target="_blank" 
            rel="noreferrer" 
            className="btn-director-wa"
          >
            <MessageCircle size={16}/>
            <span>Falar no WhatsApp: {DIRECTOR_WHATSAPP_DISPLAY}</span>
          </a>
        </section>

        {/* SEÇÃO 1: Crédito em Produtos & Manipulados (Loja Física) - TOTALMENTE SEPARADO */}
        <section className="partner-panel partner-product-credits-panel">
          <div className="credits-panel-header">
            <div className="credits-head-left">
              <div className="credits-badge">
                <Gift size={15} color="#fbbf24"/>
                <span>USO EXCLUSIVO EM PRODUTOS & MANIPULADOS</span>
              </div>
              <h2>Cota & Créditos na Farmácia (Loja Física)</h2>
              <p>
                Valor estipulado internamente pela Graphène para seu consumo e resgate próprio na nossa farmácia. 
                <strong> Não se mistura com os seus ganhos em dinheiro das vendas pelo cupom.</strong>
              </p>
            </div>

            <div className="credits-main-balance-badge">
              <small>SEU SALDO ATUAL DISPONÍVEL</small>
              <strong>{money(productCredits.balance)}</strong>
              <span>Disponível para retirar produtos</span>
            </div>
          </div>

          <div className="credits-stats-row">
            <div className="credits-stat-item">
              <Sparkles size={16} color="#38bdf8"/>
              <div>
                <small>Total Concedido pela Empresa</small>
                <strong>{money(productCredits.granted)}</strong>
              </div>
            </div>
            <div className="credits-stat-item">
              <Receipt size={16} color="#fb7185"/>
              <div>
                <small>Total já Utilizado / Retirado</small>
                <strong style={{ color: '#fb7185' }}>{money(productCredits.used)}</strong>
              </div>
            </div>
            <div className="credits-stat-item">
              <ShieldCheck size={16} color="var(--brand-green)"/>
              <div>
                <small>Regra de Utilização</small>
                <span className="rule-pill">Retirada na Loja Física</span>
              </div>
            </div>
          </div>

          {/* Statement / Extrato de Compras na Loja Física */}
          <div className="credits-statement-wrap">
            <div className="statement-head">
              <h3>Extrato de Resgates & Descontos em Produtos</h3>
              <small>Os pedidos são lançados com as informações da nota fiscal e produtos retirados</small>
            </div>

            {productCredits.movements?.length ? (
              <div className="statement-list">
                {productCredits.movements.map(item => (
                  <div key={item.id} className={`statement-item ${item.type}`}>
                    <div className="statement-left">
                      <span className="statement-date">
                        <Calendar size={12}/> {new Date(item.spent_at || item.created_at).toLocaleDateString('pt-BR')}
                      </span>
                      <strong className="statement-desc">{item.description}</strong>
                      {item.invoice_ref && (
                        <span className="statement-ref">Nota / Ref: {item.invoice_ref}</span>
                      )}
                    </div>
                    <div className="statement-right">
                      <strong className={`statement-amount ${item.type}`}>
                        {item.type === 'usage' ? `- ${money(item.amount)}` : `+ ${money(item.amount)}`}
                      </strong>
                      <small className="statement-tag">
                        {item.type === 'usage' ? 'Retirado na Loja Física' : 'Crédito Adicionado'}
                      </small>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="credits-statement-empty">
                <p>Nenhum resgate registrado ainda. Quando você solicitar produtos na loja física ou pelo WhatsApp, os lançamentos e notas aparecerão detalhados aqui.</p>
              </div>
            )}
          </div>
        </section>

        {/* SEÇÃO 2: Cupom de Desconto */}
        <section className="partner-coupon">
          <div>
            <TicketPercent/>
            <div>
              <span>SEU CUPOM DE VENDAS OFICIAL</span>
              <strong>{data.coupon?.code || profile.referral_code}</strong>
              <small>
                {data.coupon?.discount_type === 'percentage' 
                  ? `${data.coupon.discount_value}% de desconto real para seus seguidores no checkout` 
                  : 'Cupom exclusivo ativo'}
              </small>
            </div>
          </div>
          <button onClick={copyCoupon} title="Copiar cupom para a área de transferência">
            <Copy size={16}/> Copiar Cupom
          </button>
        </section>

        {/* SEÇÃO 3: Métricas de Comissões em Dinheiro (Repasses via Pix) */}
        <div className="section-title-wrap">
          <CircleDollarSign size={18} color="var(--brand-green)"/>
          <div>
            <h3>Ganhos em Dinheiro por Vendas (Repasses via Pix)</h3>
            <p>Comissões geradas sobre os pedidos pagos com o seu cupom no site.</p>
          </div>
        </div>

        <section className="partner-metrics">
          <article>
            <ReceiptText/>
            <span>Vendas confirmadas<strong>{metrics.paidSalesCount}</strong></span>
          </article>
          <article>
            <CircleDollarSign/>
            <span>Volume faturado<strong>{money(metrics.paidSalesAmount)}</strong></span>
          </article>
          <article>
            <Clock3/>
            <span>Em prazo de segurança<strong>{money(metrics.pendingCommission)}</strong></span>
          </article>
          <article className="metric-available">
            <WalletCards/>
            <span>Disponível para repasse Pix<strong>{money(metrics.availableCommission)}</strong></span>
          </article>
        </section>

        {/* SEÇÃO 4: Histórico de Vendas */}
        <section className="partner-panel">
          <div className="partner-panel-heading">
            <div>
              <h2>Vendas realizadas pelo seu cupom</h2>
              <p>Apenas pedidos com pagamento aprovado geram comissões.</p>
            </div>
            <strong>{data.coupon?.redeemed_count || 0} utilizações</strong>
          </div>

          {data.orders?.length ? (
            <div className="partner-table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Pedido</th>
                    <th>Data</th>
                    <th>Valor do Pedido</th>
                    <th>Status Pagamento</th>
                  </tr>
                </thead>
                <tbody>
                  {data.orders.slice(0, 15).map(order => (
                    <tr key={order.id}>
                      <td>#{order.id.slice(-8).toUpperCase()}</td>
                      <td>{date(order.created_at)}</td>
                      <td>{money(order.total)}</td>
                      <td>
                        <span className={`partner-order-status ${order.payment_status}`}>
                          {order.payment_status === 'paid' ? 'Confirmado' : 'Pendente'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="partner-empty">
              As compras realizadas com seu cupom aparecerão aqui assim que forem pagas.
            </div>
          )}
        </section>

        {/* SEÇÃO 5: Histórico de Comissões */}
        <section className="partner-panel">
          <div className="partner-panel-heading">
            <div>
              <h2>Extrato de comissões em dinheiro</h2>
              <p>Histórico de liberação e repasse direto na sua chave Pix.</p>
            </div>
            <strong>Total Pago: {money(metrics.paidCommission)}</strong>
          </div>

          {data.commissions?.length ? (
            <div className="partner-table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Pedido</th>
                    <th>Sua Comissão</th>
                    <th>Disponibilidade</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data.commissions.slice(0, 15).map(item => (
                    <tr key={item.id}>
                      <td>#{item.order_id.slice(-8).toUpperCase()}</td>
                      <td><strong>{money(item.amount)}</strong></td>
                      <td>{date(item.available_at)}</td>
                      <td>
                        <span className={`partner-order-status ${item.status}`}>
                          {item.status === 'pending' ? 'Em análise' : item.status === 'available' ? 'Liberada' : item.status === 'paid' ? 'Paga via Pix' : 'Cancelada'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="partner-empty">Nenhuma comissão gerada ainda.</div>
          )}
        </section>
      </main>

      <style>{styles}</style>
    </div>
  );
};

const styles = `
.partner-portal-shell,.partner-portal-loading{min-height:100vh;background:radial-gradient(circle at 90% 0,rgba(39,203,230,.1),transparent 32rem),radial-gradient(circle at 10% 80%,rgba(16,185,129,.05),transparent 28rem),#071018;color:#eaf2f8}
.partner-portal-loading{display:flex;align-items:center;justify-content:center}
.admin-partner-preview-bar{display:flex;align-items:center;justify-content:center;gap:8px;padding:9px 16px;background:#102a3b;border-bottom:1px solid rgba(103,220,243,.35);color:#c8f5fb;font-size:.72rem;font-weight:700}.admin-partner-preview-bar svg{color:#67dcf3}.admin-partner-preview-bar button{margin-left:8px;padding:5px 9px;border:1px solid rgba(103,220,243,.35);border-radius:6px;background:transparent;color:#e8fbff;font-size:.7rem;font-weight:800;cursor:pointer}.admin-partner-preview-bar button:hover{background:rgba(103,220,243,.1)}
.partner-loading-inner{display:flex;align-items:center;gap:12px;font-weight:700;color:#9fb2c3}

/* Header */
.partner-portal-header{height:72px;padding:0 max(24px,calc((100vw - 1180px)/2));display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid rgba(203,213,225,.1);background:rgba(6,15,24,.82);backdrop-filter:blur(10px)}
.partner-portal-header strong{color:#fff;letter-spacing:.06em}
.partner-portal-header small{margin-left:5px;color:#62ddf2;font-size:.58rem;letter-spacing:.11em}
.header-right-group{display:flex;align-items:center;gap:14px}
.partner-welcome-badge{display:inline-flex;align-items:center;gap:6px;font-size:.8rem;color:#d1d5db;font-weight:700}
.partner-direct-wa-btn{display:inline-flex;align-items:center;gap:6px;padding:7px 12px;border-radius:7px;background:rgba(16,185,129,.14);border:1px solid rgba(16,185,129,.35);color:#34d399;font-size:.74rem;font-weight:800;text-decoration:none;transition:all .2s ease}
.partner-direct-wa-btn:hover{background:#10b981;color:#071018}
.btn-portal-signout,.partner-refresh,.partner-coupon button,.partner-retry{display:flex;align-items:center;gap:6px;border:1px solid rgba(203,213,225,.14);border-radius:8px;background:transparent;color:#d5e1ea;padding:8px 11px;font-size:.72rem;font-weight:800;cursor:pointer}
.btn-portal-signout:hover{border-color:#f43f5e;color:#fb7185}

/* Dashboard Body */
.partner-dashboard{width:min(1180px,calc(100% - 40px));margin:0 auto;padding:40px 0 72px;display:grid;gap:18px}
.partner-dashboard-intro{display:flex;justify-content:space-between;align-items:end;gap:15px}
.partner-dashboard-intro span,.partner-status-card>span{display:flex;align-items:center;gap:6px;color:#61dcf1;font-size:.67rem;font-weight:900;letter-spacing:.1em}
.partner-dashboard h1{margin:8px 0 4px;color:#fff;font-size:2rem}
.partner-dashboard-intro p{color:#91a5b7;font-size:.84rem}

/* Director VIP Card */
.partner-director-card{display:flex;align-items:center;justify-content:space-between;gap:20px;padding:18px 22px;border-radius:14px;background:linear-gradient(135deg,rgba(16,185,129,.08),rgba(11,25,39,.9));border:1px solid rgba(16,185,129,.28)}
.director-card-content{display:flex;align-items:center;gap:14px}
.director-icon-box{width:44px;height:44px;border-radius:10px;background:rgba(16,185,129,.12);display:flex;align-items:center;justify-content:center;flex-shrink:0}
.director-card-content strong{display:block;font-size:.92rem;color:#fff;margin-bottom:2px}
.director-card-content p{font-size:.8rem;color:#94a3b8;margin:0;line-height:1.45}
.btn-director-wa{display:inline-flex;align-items:center;gap:8px;padding:11px 18px;border-radius:8px;background:#10b981;color:#071018;font-weight:900;font-size:.82rem;text-decoration:none;white-space:nowrap;transition:all .2s ease;box-shadow:0 4px 15px rgba(16,185,129,.25)}
.btn-director-wa:hover{background:#059669;transform:translateY(-1px)}

/* Product Credits Panel (Separate and prominent) */
.partner-product-credits-panel{padding:26px;border:1px solid rgba(251,191,36,.28);border-radius:16px;background:linear-gradient(145deg,rgba(16,33,48,.92),rgba(8,18,29,.95));display:grid;gap:20px;box-shadow:0 15px 40px rgba(0,0,0,.4)}
.credits-panel-header{display:flex;justify-content:space-between;align-items:flex-start;gap:24px;border-bottom:1px solid rgba(255,255,255,.07);padding-bottom:18px}
.credits-head-left{max-width:650px}
.credits-badge{display:inline-flex;align-items:center;gap:6px;font-size:.66rem;font-weight:900;color:#fbbf24;letter-spacing:.08em;margin-bottom:6px;background:rgba(251,191,36,.1);padding:4px 9px;border-radius:6px;border:1px solid rgba(251,191,36,.25)}
.credits-head-left h2{font-size:1.35rem;color:#fff;margin-bottom:6px}
.credits-head-left p{font-size:.84rem;color:#94a3b8;line-height:1.5;margin:0}
.credits-head-left strong{color:#e2e8f0}

.credits-main-balance-badge{padding:16px 20px;border-radius:12px;background:linear-gradient(135deg,rgba(16,185,129,.16),rgba(0,180,216,.1));border:1px solid rgba(16,185,129,.35);text-align:right;flex-shrink:0}
.credits-main-balance-badge small{display:block;font-size:.65rem;font-weight:800;letter-spacing:.08em;color:#94a3b8}
.credits-main-balance-badge strong{display:block;font-size:2rem;font-family:var(--font-heading);color:#34d399;line-height:1.1;margin:4px 0 2px}
.credits-main-balance-badge span{display:block;font-size:.68rem;color:#67e8f9}

.credits-stats-row{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}
.credits-stat-item{display:flex;align-items:center;gap:12px;padding:14px 16px;border-radius:10px;background:rgba(255,255,255,.025);border:1px solid rgba(255,255,255,.06)}
.credits-stat-item small{display:block;font-size:.68rem;color:#8fa4b6}
.credits-stat-item strong{display:block;font-size:1.15rem;font-family:var(--font-heading);color:#fff;margin-top:2px}
.rule-pill{display:inline-block;margin-top:3px;font-size:.68rem;font-weight:700;color:#6ee7b7;background:rgba(16,185,129,.12);padding:2px 8px;border-radius:99px}

.credits-statement-wrap{display:grid;gap:12px;padding-top:14px;border-top:1px solid rgba(255,255,255,.07)}
.statement-head{display:flex;justify-content:space-between;align-items:baseline;flex-wrap:wrap;gap:8px}
.statement-head h3{font-size:.92rem;color:#fff}
.statement-head small{font-size:.72rem;color:#8fa4b6}

.statement-list{display:grid;gap:8px;max-height:260px;overflow-y:auto;padding-right:4px}
.statement-item{display:flex;justify-content:space-between;align-items:center;gap:14px;padding:12px 16px;border-radius:9px;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.06)}
.statement-item.usage{border-left:3px solid #fb7185}
.statement-item.grant{border-left:3px solid #34d399}
.statement-left{display:flex;flex-direction:column;gap:2px}
.statement-date{display:inline-flex;align-items:center;gap:4px;font-size:.66rem;color:#94a3b8}
.statement-desc{font-size:.84rem;color:#f1f5f9}
.statement-ref{font-size:.72rem;color:#38bdf8}
.statement-right{text-align:right}
.statement-amount{display:block;font-size:.95rem;font-family:var(--font-heading)}
.statement-amount.usage{color:#fb7185}
.statement-amount.grant{color:#34d399}
.statement-tag{font-size:.65rem;color:#94a3b8}
.credits-statement-empty{padding:24px 0;text-align:center;color:#8fa4b6;font-size:.82rem}

/* Coupon Box */
.partner-coupon{display:flex;justify-content:space-between;align-items:center;padding:18px 22px;border:1px solid rgba(100,221,242,.24);border-radius:14px;background:linear-gradient(110deg,rgba(22,63,80,.72),rgba(11,25,39,.86))}
.partner-coupon>div{display:flex;align-items:center;gap:14px}
.partner-coupon svg{color:#69e2f5}
.partner-coupon span,.partner-coupon small{display:block;color:#9cb1c2;font-size:.69rem}
.partner-coupon strong{display:block;margin:3px 0;color:#fff;font-size:1.3rem;letter-spacing:.08em}
.partner-coupon button{border-color:rgba(103,221,243,.3);color:#78e6f6}
.partner-coupon button:hover{background:rgba(0,180,216,.15);color:#fff}

/* Cash Section title */
.section-title-wrap{display:flex;align-items:center;gap:10px;margin-top:6px}
.section-title-wrap h3{font-size:1.05rem;color:#fff}
.section-title-wrap p{font-size:.76rem;color:#8fa4b6;margin:0}

/* Metrics */
.partner-metrics{display:grid;grid-template-columns:repeat(4,1fr);gap:12px}
.partner-metrics article{display:flex;gap:10px;padding:16px;border:1px solid rgba(203,213,225,.11);border-radius:13px;background:rgba(11,25,39,.8)}
.partner-metrics article.metric-available{border-color:rgba(16,185,129,.35);background:rgba(16,185,129,.05)}
.partner-metrics article.metric-available strong{color:#34d399}
.partner-metrics svg{width:19px;color:#68def2}
.partner-metrics span{display:grid;gap:3px;color:#98aabd;font-size:.68rem}
.partner-metrics strong{color:#fff;font-size:1.05rem}

/* General Panels */
.partner-panel{padding:20px;border:1px solid rgba(203,213,225,.11);border-radius:14px;background:rgba(11,25,39,.8)}
.partner-panel-heading{display:flex;justify-content:space-between;gap:15px;padding-bottom:14px;border-bottom:1px solid rgba(203,213,225,.08)}
.partner-panel h2{font-size:1rem;color:#fff}
.partner-panel p{margin-top:3px;color:#8fa4b6;font-size:.72rem}
.partner-panel-heading>strong{font-size:.76rem;color:#b9c9d6}

.partner-table-wrap{overflow:auto}
.partner-panel table{width:100%;min-width:620px;border-collapse:collapse;font-size:.77rem}
.partner-panel th{padding:12px 8px;text-align:left;color:#8fa4b6;font-size:.65rem}
.partner-panel td{padding:12px 8px;border-top:1px solid rgba(203,213,225,.07);color:#d8e4ed}
.partner-order-status{display:inline-flex;padding:4px 7px;border-radius:99px;font-size:.63rem;font-weight:800;color:#f8d47b;background:rgba(251,191,36,.12)}
.partner-order-status.paid,.partner-order-status.available{color:#71e4b5;background:rgba(36,211,154,.12)}
.partner-order-status.cancelled{color:#f8a5b6;background:rgba(251,113,133,.12)}
.partner-empty{min-height:110px;display:flex;align-items:center;justify-content:center;color:#8fa4b6;font-size:.8rem}

/* Pending / Rejected Card */
.partner-status-card{width:min(580px,calc(100% - 40px));margin:10vh auto;padding:38px;border:1px solid rgba(203,213,225,.14);border-radius:18px;background:#0c1c2c;text-align:center}
.partner-status-card>svg{width:32px;height:32px;margin-bottom:17px;color:#66dff3}
.partner-status-card h1{margin:10px 0;color:#fff;font-size:1.65rem}
.partner-status-card p{color:#9db0c0;line-height:1.6;font-size:.88rem}
.pending-wa-cta{margin:24px 0 10px}
.btn-wa-priority{display:inline-flex;align-items:center;justify-content:center;gap:8px;width:100%;min-height:46px;padding:12px 20px;border-radius:8px;background:#10b981;color:#071018;font-weight:900;font-size:.86rem;text-decoration:none;transition:all .2s ease}
.btn-wa-priority:hover{background:#059669}
.partner-status-card small{display:block;margin-top:16px;color:#7790a5;font-size:.74rem}
.partner-retry{margin-top:22px;border-color:rgba(103,221,243,.3);color:#78e6f6}

@media(max-width:760px){
  .partner-dashboard{width:min(100% - 24px,1180px);padding:24px 0 52px}
  .partner-dashboard-intro{align-items:start;flex-direction:column}
  .header-right-group .partner-welcome-badge{display:none}
  .partner-director-card{flex-direction:column;text-align:center}
  .director-card-content{flex-direction:column}
  .btn-director-wa{width:100%;justify-content:center}
  .credits-panel-header{flex-direction:column}
  .credits-main-balance-badge{width:100%;text-align:center}
  .credits-stats-row{grid-template-columns:1fr}
  .partner-metrics{grid-template-columns:repeat(2,1fr)}
  .partner-coupon{align-items:flex-start;gap:14px;flex-direction:column}
  .partner-coupon button{width:100%;justify-content:center}
  .partner-panel-heading{align-items:start;flex-direction:column}
}
`;

export default PartnerPortal;
