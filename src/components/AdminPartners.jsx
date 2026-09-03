import { useCallback, useEffect, useState } from 'react';
import { 
  Calendar, 
  CheckCircle2, 
  Clock, 
  ExternalLink, 
  Gift, 
  LoaderCircle, 
  MinusCircle, 
  PlusCircle, 
  Receipt, 
  ShieldCheck, 
  TicketPercent, 
  Trash2, 
  UsersRound, 
  WalletCards, 
  XCircle 
} from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { getSession } from '../utils/security';
import { toast } from 'sonner';

const money = value => Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const label = { pending: 'Em análise', approved: 'Ativo', rejected: 'Não aprovado', suspended: 'Suspenso' };

// Formatação natural BRL: digita "1200" -> formata "1.200". Ao sair do campo ou enviar, completa para "1.200,00".
const formatBRL = (value) => {
  if (value === null || value === undefined) return '';
  let str = String(value).replace(/^R\$\s?/, '').trim();
  if (!str) return '';

  const hasComma = str.includes(',');
  const parts = str.split(',');

  let integerDigits = parts[0].replace(/\D/g, '');
  if (!integerDigits && !hasComma) return '';

  let formattedInteger = integerDigits ? Number(integerDigits).toLocaleString('pt-BR') : '0';

  if (hasComma) {
    let decimalDigits = (parts[1] || '').replace(/\D/g, '').slice(0, 2);
    return `${formattedInteger},${decimalDigits}`;
  }

  return formattedInteger;
};

const finishBRL = (value) => {
  if (!value) return '';
  const formatted = formatBRL(value);
  if (!formatted) return '';
  if (!formatted.includes(',')) return `${formatted},00`;
  const [intPart, decPart] = formatted.split(',');
  if (!decPart) return `${intPart},00`;
  if (decPart.length === 1) return `${intPart},${decPart}0`;
  return formatted;
};

const parseBRL = (value) => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  if (!value) return 0;
  const str = String(value).replace(/^R\$\s?/, '').trim();
  if (!str) return 0;
  const clean = str.replace(/\./g, '').replace(',', '.');
  const num = parseFloat(clean);
  return Number.isFinite(num) ? num : 0;
};

const AdminPartners = ({ onUnauthorized }) => {
  const [partners, setPartners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [selectedTab, setSelectedTab] = useState('credit'); // 'credit' | 'approval' | 'data'
  const [busy, setBusy] = useState('');

  // Partner Approval state
  const [approval, setApproval] = useState({ referralCode: '', commissionValue: '10', discountValue: '10', holdDays: '14' });

  // Partner Credits state
  const [creditsData, setCreditsData] = useState({ movements: [], balance: 0, granted: 0, used: 0 });
  const [loadingCredits, setLoadingCredits] = useState(false);
  const [creditGrantForm, setCreditGrantForm] = useState({ amount: '', description: 'Crédito mensal de produtos' });
  const [creditUsageForm, setCreditUsageForm] = useState({ 
    amount: '', 
    description: '', 
    invoiceRef: '', 
    spentAt: new Date().toISOString().slice(0, 10) 
  });

  const invoke = useCallback(async body => {
    const token = getSession()?.token;
    if (!token) {
      onUnauthorized();
      return { error: 'unauthorized' };
    }
    const result = await supabase.functions.invoke('admin-orders', { body, headers: { 'x-admin-token': token } });
    let errorDetail = result.data?.error || result.error;
    if (result.error && result.error.context) {
      try {
        const bodyErr = await result.error.context.json();
        if (bodyErr?.error) errorDetail = bodyErr.error;
      } catch (_) {}
    }
    if (errorDetail === 'unauthorized') onUnauthorized();
    return { data: result.data, error: errorDetail };
  }, [onUnauthorized]);

  const load = useCallback(async () => {
    setLoading(true);
    const result = await invoke({ action: 'list_partner_applications' });
    if (result.error) toast.error('Não foi possível carregar os parceiros.');
    else setPartners(result.data.partners || []);
    setLoading(false);
  }, [invoke]);

  useEffect(() => {
    const timer = window.setTimeout(load, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const loadCredits = useCallback(async (partnerId) => {
    if (!partnerId) return;
    setLoadingCredits(true);
    const result = await invoke({ action: 'list_partner_credits', partnerId });
    if (!result.error) {
      setCreditsData({
        movements: result.data.movements || [],
        balance: result.data.balance || 0,
        granted: result.data.granted || 0,
        used: result.data.used || 0,
      });
    }
    setLoadingCredits(false);
  }, [invoke]);

  const openPartnerDetails = (partner, initialTab = 'credit') => {
    setSelected(partner);
    setSelectedTab(initialTab);
    setApproval({
      referralCode: partner.requested_coupon_code || '',
      commissionValue: '10',
      discountValue: '10',
      holdDays: '14'
    });
    setCreditGrantForm({ amount: '', description: 'Crédito mensal de produtos' });
    setCreditUsageForm({ amount: '', description: '', invoiceRef: '', spentAt: new Date().toISOString().slice(0, 10) });
    loadCredits(partner.id);
  };

  const approve = async event => {
    event.preventDefault();
    if (!selected) return;
    setBusy('approve');
    const result = await invoke({
      action: 'approve_partner',
      partnerId: selected.id,
      ...approval,
      commissionValue: Number(approval.commissionValue),
      discountValue: Number(approval.discountValue),
      holdDays: Number(approval.holdDays)
    });
    setBusy('');
    if (result.error) return toast.error(result.data?.error === 'coupon_exists' ? 'Este cupom já está em uso.' : 'Revise os dados de aprovação.');
    toast.success('Parceiro aprovado e cupom ativado.');
    setSelected(null);
    load();
  };

  const reject = async partner => {
    const reason = window.prompt(`Motivo opcional para ${partner.full_name}:`);
    if (reason === null) return;
    setBusy(partner.id);
    const result = await invoke({ action: 'reject_partner', partnerId: partner.id, reason });
    setBusy('');
    if (result.error) return toast.error('Não foi possível atualizar a solicitação.');
    toast.success('Solicitação atualizada.');
    load();
  };

  const handleAddCredit = async event => {
    event.preventDefault();
    if (!selected) return;
    const amount = parseBRL(creditGrantForm.amount);
    if (!amount || amount <= 0) return toast.error('Informe um valor válido de crédito em R$.');
    setBusy('grant_credit');
    
    const result = await invoke({
      action: 'add_partner_product_credit',
      partnerId: selected.id,
      amount,
      description: creditGrantForm.description.trim() || 'Crédito mensal de produtos'
    });
    setBusy('');

    if (result.error) {
      console.error('[AdminPartners] Erro ao adicionar crédito:', result);
      const errDetail = String(result.data?.error || result.error?.message || result.error || '');
      if (errDetail === 'invalid_action' || errDetail.includes('400') || errDetail.includes('FunctionsHttpError')) {
        return toast.error('A Edge Function admin-orders ainda não foi atualizada no Supabase (ação de crédito não reconhecida na nuvem).');
      }
      if (errDetail.includes('relation') || errDetail.includes('partner_product_credits') || errDetail === 'unable_to_add_credit') {
        return toast.error('A tabela partner_product_credits precisa ser criada no SQL Editor do Supabase.');
      }
      return toast.error(`Erro ao adicionar crédito: ${errDetail}`);
    }

    toast.success(`Crédito de ${money(amount)} adicionado com sucesso!`);
    setCreditGrantForm({ amount: '', description: 'Crédito mensal de produtos' });
    loadCredits(selected.id);
    load();
  };

  const handleRecordUsage = async event => {
    event.preventDefault();
    if (!selected) return;
    const amount = parseBRL(creditUsageForm.amount);
    if (!amount || amount <= 0) return toast.error('Informe um valor válido de consumo em R$.');
    if (!creditUsageForm.description.trim()) return toast.error('Informe os produtos consumidos.');
    setBusy('record_usage');

    const result = await invoke({
      action: 'record_partner_product_usage',
      partnerId: selected.id,
      amount,
      description: creditUsageForm.description.trim(),
      invoiceRef: creditUsageForm.invoiceRef.trim() || null,
      spentAt: creditUsageForm.spentAt ? new Date(creditUsageForm.spentAt).toISOString() : new Date().toISOString()
    });
    setBusy('');

    if (result.error) {
      console.error('[AdminPartners] Erro ao registrar consumo:', result);
      const errDetail = String(result.data?.error || result.error?.message || result.error || '');
      if (errDetail === 'invalid_action' || errDetail.includes('400') || errDetail.includes('FunctionsHttpError')) {
        return toast.error('A Edge Function admin-orders precisa ser atualizada no Supabase.');
      }
      if (errDetail.includes('relation') || errDetail.includes('partner_product_credits') || errDetail === 'unable_to_record_usage') {
        return toast.error('A tabela partner_product_credits precisa ser criada no SQL Editor do Supabase.');
      }
      return toast.error(`Erro ao registrar consumo: ${errDetail}`);
    }

    toast.success(`Consumo de ${money(amount)} registrado e descontado do saldo!`);
    setCreditUsageForm({ amount: '', description: '', invoiceRef: '', spentAt: new Date().toISOString().slice(0, 10) });
    loadCredits(selected.id);
    load();
  };

  const handleDeleteCreditEntry = async entryId => {
    if (!window.confirm('Excluir este lançamento de crédito/consumo? O saldo será recalculado.')) return;
    setBusy(`delete-${entryId}`);
    const result = await invoke({ action: 'delete_partner_credit_entry', entryId });
    setBusy('');
    if (result.error) return toast.error('Erro ao excluir lançamento.');
    toast.success('Lançamento removido.');
    loadCredits(selected.id);
    load();
  };

  const pending = partners.filter(item => item.status === 'pending').length;

  if (loading) return <div className="partner-admin-loading"><LoaderCircle className="spin"/> Carregando parceiros...</div>;

  return (
    <section className="partner-admin">
      <div className="partner-admin-top">
        <div>
          <span>PROGRAMA DE PARCEIROS & INFLUENCERS</span>
          <h2>Solicitações, Cupons & Créditos</h2>
          <p>Aprove parceiros, ative cupons e controle cotas de crédito de produtos na loja física.</p>
        </div>
        <a href="/parceiros/cadastro" target="_blank" rel="noreferrer">
          <ExternalLink size={15}/> Abrir cadastro público
        </a>
      </div>

      <div className="partner-admin-stats">
        <article>
          <UsersRound/>
          <div>
            <small>Solicitações pendentes</small>
            <strong>{pending}</strong>
          </div>
        </article>
        <article>
          <CheckCircle2/>
          <div>
            <small>Parceiros ativos</small>
            <strong>{partners.filter(item => item.status === 'approved').length}</strong>
          </div>
        </article>
        <article>
          <TicketPercent/>
          <div>
            <small>Cupons ativos</small>
            <strong>{partners.filter(item => item.coupon_id).length}</strong>
          </div>
        </article>
      </div>

      {/* Main Partners Card */}
      <section className="partner-admin-card">
        <div className="partner-admin-card-title">
          <div>
            <h3>Cadastros & Influencers</h3>
            <p>{partners.length} parceiros registrados</p>
          </div>
          <button onClick={load}>Atualizar</button>
        </div>

        {partners.length ? (
          <div className="partner-admin-list">
            {partners.map(partner => (
              <article key={partner.id}>
                <div className="partner-admin-person">
                  <strong>{partner.full_name}</strong>
                  <small>{partner.email} · {partner.phone}</small>
                  <small>Solicitado em {new Date(partner.created_at).toLocaleDateString('pt-BR')}</small>
                </div>

                <div className="partner-admin-code">
                  {partner.referral_code ? (
                    <>
                      <small>CUPOM</small>
                      <strong>{partner.referral_code}</strong>
                    </>
                  ) : (
                    <small>{partner.requested_coupon_code ? `Solicitou: ${partner.requested_coupon_code}` : 'Sem cupom'}</small>
                  )}
                </div>

                <div className="partner-admin-credit-badge">
                  <small>SALDO PRODUTOS</small>
                  <strong className={partner.product_credit_balance > 0 ? 'text-emerald' : 'text-dim'}>
                    {money(partner.product_credit_balance)}
                  </strong>
                </div>

                <span className={`partner-admin-status ${partner.status}`}>
                  {label[partner.status] || partner.status}
                </span>

                <div className="partner-admin-actions">
                  {partner.status === 'pending' || partner.status === 'rejected' ? (
                    <>
                      <button onClick={() => openPartnerDetails(partner, 'approval')} title="Aprovar e ativar">
                        <CheckCircle2 size={15}/> Aprovar
                      </button>
                      <button className="subtle danger" onClick={() => reject(partner)} disabled={busy === partner.id} title="Recusar">
                        <XCircle size={15}/> Recusar
                      </button>
                    </>
                  ) : (
                    <button className="subtle btn-manage-credit" onClick={() => openPartnerDetails(partner, 'credit')} title="Gerenciar crédito e dados">
                      <Gift size={14} color="#38bdf8"/>
                      <span>Créditos & Dados</span>
                    </button>
                  )}
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="partner-admin-empty">Nenhuma solicitação de parceria recebida ainda.</div>
        )}
      </section>

      {/* Modal de Gestão Completa do Parceiro (Dados, Aprovação e Crédito de Produtos) */}
      {selected && (
        <div className="partner-admin-modal-backdrop" onClick={() => setSelected(null)}>
          <section className="partner-admin-modal" onClick={e => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setSelected(null)}>×</button>

            <div className="modal-partner-header">
              <span className="modal-tag">{selected.status === 'approved' ? 'PARCEIRO ATIVO' : 'SOLICITAÇÃO DE PARCERIA'}</span>
              <h2>{selected.full_name}</h2>
              <p>{selected.email} · {selected.phone}</p>
            </div>

            {/* Modal Tabs */}
            <div className="modal-tabs">
              {selected.status === 'approved' && (
                <button 
                  className={`modal-tab-btn ${selectedTab === 'credit' ? 'active' : ''}`}
                  onClick={() => setSelectedTab('credit')}
                >
                  <Gift size={15}/> Crédito em Produtos
                </button>
              )}
              {selected.status !== 'approved' && (
                <button 
                  className={`modal-tab-btn ${selectedTab === 'approval' ? 'active' : ''}`}
                  onClick={() => setSelectedTab('approval')}
                >
                  <ShieldCheck size={15}/> Aprovação de Cadastro
                </button>
              )}
              <button 
                className={`modal-tab-btn ${selectedTab === 'data' ? 'active' : ''}`}
                onClick={() => setSelectedTab('data')}
              >
                <UsersRound size={15}/> Dados do Cadastro
              </button>
            </div>

            {/* TAB: Crédito em Produtos (Loja Física) */}
            {selectedTab === 'credit' && selected.status === 'approved' && (
              <div className="modal-credit-panel">
                {/* Credit Summary Cards */}
                <div className="credit-summary-cards">
                  <div className="credit-stat-box main-stat">
                    <small>SALDO ATUAL DISPONÍVEL</small>
                    <strong>{money(creditsData.balance)}</strong>
                    <span>Para uso em produtos na loja</span>
                  </div>
                  <div className="credit-stat-box">
                    <small>TOTAL CONCEDIDO</small>
                    <strong style={{ color: '#38bdf8' }}>{money(creditsData.granted)}</strong>
                    <span>Cotas / Recargas</span>
                  </div>
                  <div className="credit-stat-box">
                    <small>TOTAL CONSUMIDO</small>
                    <strong style={{ color: '#fb7185' }}>{money(creditsData.used)}</strong>
                    <span>Resgates na loja física</span>
                  </div>
                </div>

                {/* Grid com Formulário de Concessão e Formulário de Consumo */}
                <div className="credit-actions-grid">
                  {/* Formulário 1: Conceder Crédito */}
                  <form onSubmit={handleAddCredit} className="credit-form-card grant-form">
                    <div className="form-head">
                      <PlusCircle size={16} color="var(--brand-green)"/>
                      <strong>Adicionar Cota de Crédito (R$)</strong>
                    </div>
                    <label>
                      Valor do crédito (R$) *
                      <div className="currency-input-wrapper">
                        <span className="currency-symbol">R$</span>
                        <input 
                          type="text" 
                          inputMode="decimal"
                          placeholder="0,00" 
                          value={creditGrantForm.amount} 
                          onChange={e => setCreditGrantForm({ ...creditGrantForm, amount: formatBRL(e.target.value) })}
                          onBlur={() => setCreditGrantForm({ ...creditGrantForm, amount: finishBRL(creditGrantForm.amount) })}
                          required 
                        />
                      </div>
                    </label>
                    <label>
                      Descrição / Referência interna
                      <input 
                        type="text" 
                        placeholder="Ex.: Crédito mensal de produtos - Setembro" 
                        value={creditGrantForm.description} 
                        onChange={e => setCreditGrantForm({ ...creditGrantForm, description: e.target.value })}
                      />
                    </label>
                    <button type="submit" className="btn-grant" disabled={busy === 'grant_credit'}>
                      {busy === 'grant_credit' ? <LoaderCircle className="spin"/> : <PlusCircle size={15}/>}
                      <span>Conceder Crédito</span>
                    </button>
                  </form>

                  {/* Formulário 2: Registrar Consumo na Loja Física */}
                  <form onSubmit={handleRecordUsage} className="credit-form-card usage-form">
                    <div className="form-head">
                      <MinusCircle size={16} color="#fb7185"/>
                      <strong>Registrar Gasto na Loja Física</strong>
                    </div>
                    <div className="form-row-2">
                      <label>
                        Valor gasto (R$) *
                        <div className="currency-input-wrapper">
                          <span className="currency-symbol">R$</span>
                          <input 
                            type="text" 
                            inputMode="decimal"
                            placeholder="0,00" 
                            value={creditUsageForm.amount} 
                            onChange={e => setCreditUsageForm({ ...creditUsageForm, amount: formatBRL(e.target.value) })}
                            onBlur={() => setCreditUsageForm({ ...creditUsageForm, amount: finishBRL(creditUsageForm.amount) })}
                            required 
                          />
                        </div>
                      </label>
                      <label>
                        Data do pedido / gasto
                        <input 
                          type="date" 
                          value={creditUsageForm.spentAt} 
                          onChange={e => setCreditUsageForm({ ...creditUsageForm, spentAt: e.target.value })}
                          required 
                        />
                      </label>
                    </div>
                    <label>
                      O que ela gastou / Produtos *
                      <input 
                        type="text" 
                        placeholder="Ex.: 2x Whey Isolado Baunilha + Creatina 200g" 
                        value={creditUsageForm.description} 
                        onChange={e => setCreditUsageForm({ ...creditUsageForm, description: e.target.value })}
                        required 
                      />
                    </label>
                    <label>
                      Nº da Nota Fiscal ou Pedido (opcional)
                      <input 
                        type="text" 
                        placeholder="Ex.: NFC-e 4812 / Pedido 104" 
                        value={creditUsageForm.invoiceRef} 
                        onChange={e => setCreditUsageForm({ ...creditUsageForm, invoiceRef: e.target.value })}
                      />
                    </label>
                    <button type="submit" className="btn-usage" disabled={busy === 'record_usage'}>
                      {busy === 'record_usage' ? <LoaderCircle className="spin"/> : <MinusCircle size={15}/>}
                      <span>Registrar e Descontar do Saldo</span>
                    </button>
                  </form>
                </div>

                {/* Histórico / Extrato de Movimentações */}
                <div className="credit-history-card">
                  <div className="history-head">
                    <Receipt size={16} color="var(--brand-blue)"/>
                    <strong>Extrato de Créditos e Resgates</strong>
                    <small>Atualizado em tempo real no painel do parceiro</small>
                  </div>

                  {loadingCredits ? (
                    <div className="credit-history-loading"><LoaderCircle className="spin"/> Carregando extrato...</div>
                  ) : creditsData.movements.length ? (
                    <div className="credit-movements-list">
                      {creditsData.movements.map(item => (
                        <div key={item.id} className={`movement-row ${item.type}`}>
                          <div className="movement-left">
                            <span className="movement-date">
                              <Calendar size={12}/> {new Date(item.spent_at || item.created_at).toLocaleDateString('pt-BR')}
                            </span>
                            <strong className="movement-desc">{item.description}</strong>
                            {item.invoice_ref && (
                              <small className="movement-invoice">Ref / Nota: {item.invoice_ref}</small>
                            )}
                          </div>
                          <div className="movement-right">
                            <strong className={`movement-amount ${item.type}`}>
                              {item.type === 'usage' ? `- ${money(item.amount)}` : `+ ${money(item.amount)}`}
                            </strong>
                            <span className="movement-type-label">
                              {item.type === 'usage' ? 'Gasto Loja Física' : 'Crédito Concedido'}
                            </span>
                            <button 
                              type="button" 
                              className="btn-del-movement" 
                              onClick={() => handleDeleteCreditEntry(item.id)}
                              disabled={busy === `delete-${item.id}`}
                              title="Excluir lançamento"
                            >
                              <Trash2 size={13}/>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="credit-empty">Nenhum crédito ou consumo de produtos lançado ainda.</div>
                  )}
                </div>
              </div>
            )}

            {/* TAB: Aprovação de Parceiro */}
            {selectedTab === 'approval' && selected.status !== 'approved' && (
              <form onSubmit={approve} className="partner-approval-form">
                <label>
                  Cupom oficial do parceiro *
                  <input 
                    value={approval.referralCode} 
                    onChange={e => setApproval({ ...approval, referralCode: e.target.value.toUpperCase() })} 
                    placeholder="Ex.: SEUNOME10" 
                    maxLength="40" 
                    required 
                  />
                </label>
                <div>
                  <label>
                    Comissão em dinheiro (%) *
                    <input 
                      type="number" 
                      min="0" 
                      max="100" 
                      step="0.01" 
                      value={approval.commissionValue} 
                      onChange={e => setApproval({ ...approval, commissionValue: e.target.value })} 
                      required 
                    />
                  </label>
                  <label>
                    Desconto para o cliente (%) *
                    <input 
                      type="number" 
                      min="0.01" 
                      max="100" 
                      step="0.01" 
                      value={approval.discountValue} 
                      onChange={e => setApproval({ ...approval, discountValue: e.target.value })} 
                      required 
                    />
                  </label>
                </div>
                <label>
                  Prazo de segurança contra estornos (dias) *
                  <input 
                    type="number" 
                    min="0" 
                    max="180" 
                    value={approval.holdDays} 
                    onChange={e => setApproval({ ...approval, holdDays: e.target.value })} 
                    required 
                  />
                </label>
                <button disabled={busy === 'approve'} className="btn-approve-submit">
                  {busy === 'approve' ? <LoaderCircle className="spin"/> : <ShieldCheck size={17}/>}
                  <span>Aprovar e Liberar Acesso ao Painel</span>
                </button>
              </form>
            )}

            {/* TAB: Dados do Cadastro */}
            {selectedTab === 'data' && (
              <div className="partner-admin-data">
                <div><small>CPF / CNPJ</small><strong>{selected.document || '—'}</strong></div>
                <div><small>Chave Pix p/ Repasses</small><strong>{selected.pix_key || '—'}</strong></div>
                <div><small>Canal / Redes Sociais</small><strong>{selected.channel || '—'}</strong></div>
                <div><small>Cupom Ativo</small><strong>{selected.referral_code || selected.requested_coupon_code || '—'}</strong></div>
                <div><small>Status Atual</small><strong>{label[selected.status] || selected.status}</strong></div>
                <div><small>Data da Solicitação</small><strong>{new Date(selected.created_at).toLocaleString('pt-BR')}</strong></div>
              </div>
            )}
          </section>
        </div>
      )}

      <style>{styles}</style>
    </section>
  );
};

const styles = `
.partner-admin{display:grid;gap:16px}
.partner-admin-loading{min-height:280px;display:flex;align-items:center;justify-content:center;gap:9px;color:#9cadbf}
.partner-admin-top{display:flex;justify-content:space-between;gap:18px;align-items:end}
.partner-admin-top span{font-size:.66rem;font-weight:900;letter-spacing:.11em;color:#67dff3}
.partner-admin-top h2{margin:6px 0 3px;font-size:1.2rem}
.partner-admin-top p{font-size:.76rem;color:#91a5b7}
.partner-admin-top>a,.partner-admin-card-title button{display:inline-flex;align-items:center;gap:6px;padding:8px 10px;border:1px solid rgba(203,213,225,.14);border-radius:8px;color:#d8e4ed;background:transparent;font-size:.72rem;font-weight:800}
.partner-admin-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}
.partner-admin-stats article{display:flex;gap:10px;padding:15px;border:1px solid rgba(203,213,225,.11);border-radius:13px;background:rgba(12,25,40,.76)}
.partner-admin-stats svg{color:#66dff3}
.partner-admin-stats small,.partner-admin-stats strong{display:block}
.partner-admin-stats small{font-size:.68rem;color:#91a5b7}
.partner-admin-stats strong{margin-top:3px;font-size:1.1rem}

.partner-admin-card{padding:18px;border:1px solid rgba(203,213,225,.11);border-radius:14px;background:rgba(12,25,40,.8)}
.partner-admin-card-title{display:flex;justify-content:space-between;align-items:center;padding-bottom:14px;border-bottom:1px solid rgba(203,213,225,.08)}
.partner-admin-card-title h3{font-size:1rem}
.partner-admin-card-title p{margin-top:3px;font-size:.71rem;color:#8fa4b6}
.partner-admin-list{display:grid}
.partner-admin-list article{display:grid;grid-template-columns:minmax(170px,1.2fr) 110px 130px 95px auto;align-items:center;gap:12px;padding:14px 4px;border-bottom:1px solid rgba(203,213,225,.07)}
.partner-admin-list article:last-child{border-bottom:0}
.partner-admin-person strong,.partner-admin-person small,.partner-admin-code small,.partner-admin-code strong,.partner-admin-credit-badge small,.partner-admin-credit-badge strong{display:block}
.partner-admin-person strong{font-size:.82rem}
.partner-admin-person small,.partner-admin-code small,.partner-admin-credit-badge small{margin-top:2px;font-size:.67rem;color:#8fa4b6}
.partner-admin-code strong{margin-top:2px;font-size:.78rem;color:#78e7f7;letter-spacing:.06em}
.partner-admin-credit-badge strong{margin-top:2px;font-size:.82rem}
.text-emerald{color:#34d399}
.text-dim{color:#94a3b8}

.partner-admin-status{justify-self:start;padding:4px 7px;border-radius:99px;font-size:.62rem;font-weight:800;color:#f7d075;background:rgba(251,191,36,.12)}
.partner-admin-status.approved{color:#6de2b2;background:rgba(36,211,154,.12)}
.partner-admin-status.rejected,.partner-admin-status.suspended{color:#f9a4b5;background:rgba(251,113,133,.12)}

.partner-admin-actions{display:flex;justify-content:end;gap:6px}
.partner-admin-actions button{display:flex;align-items:center;justify-content:center;gap:6px;min-height:34px;padding:7px 11px;border:0;border-radius:7px;background:#2acde8;color:#031219;font-size:.69rem;font-weight:900;cursor:pointer}
.partner-admin-actions .subtle{border:1px solid rgba(203,213,225,.14);background:transparent;color:#c9d8e4}
.partner-admin-actions .btn-manage-credit{border-color:rgba(56,189,248,.35);color:#7dd3fc;background:rgba(56,189,248,.08)}
.partner-admin-actions .btn-manage-credit:hover{background:rgba(56,189,248,.18);color:#fff}
.partner-admin-actions .danger{color:#f9a4b5}
.partner-admin-empty{min-height:160px;display:flex;align-items:center;justify-content:center;color:#8fa4b6;font-size:.8rem}

/* Modal Styling */
.partner-admin-modal-backdrop{position:fixed;inset:0;z-index:999;padding:20px;display:flex;align-items:center;justify-content:center;background:rgba(2,8,14,.82);backdrop-filter:blur(8px)}
.partner-admin-modal{position:relative;width:min(100%,720px);max-height:90vh;overflow-y:auto;padding:28px;border:1px solid rgba(203,213,225,.18);border-radius:18px;background:#0b1a2a;box-shadow:0 25px 70px rgba(0,0,0,.6)}
.modal-partner-header{padding-bottom:14px;border-bottom:1px solid rgba(255,255,255,.08)}
.modal-tag{font-size:.66rem;font-weight:900;letter-spacing:.11em;color:#67dff3}
.modal-partner-header h2{margin:6px 0 2px;font-size:1.4rem}
.modal-partner-header p{color:#93a7b9;font-size:.78rem}
.modal-close{position:absolute;top:14px;right:16px;border:0;background:transparent;color:#aabaca;font-size:1.5rem;cursor:pointer}

.modal-tabs{display:flex;gap:8px;margin:16px 0;border-bottom:1px solid rgba(255,255,255,.08);padding-bottom:8px}
.modal-tab-btn{display:inline-flex;align-items:center;gap:6px;padding:8px 14px;border-radius:8px;border:1px solid transparent;background:transparent;color:#94a3b8;font-size:.76rem;font-weight:800;cursor:pointer}
.modal-tab-btn.active{background:rgba(0,180,216,.14);border-color:rgba(0,180,216,.3);color:#38bdf8}

/* Credit Section in Modal */
.modal-credit-panel{display:grid;gap:18px}
.credit-summary-cards{display:grid;grid-template-columns:1.2fr 1fr 1fr;gap:10px}
.credit-stat-box{padding:14px;border-radius:10px;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.07)}
.credit-stat-box.main-stat{background:linear-gradient(135deg,rgba(16,185,129,.12),rgba(0,180,216,.08));border-color:rgba(16,185,129,.35)}
.credit-stat-box small{display:block;font-size:.64rem;color:#8fa4b6;font-weight:700;letter-spacing:.05em}
.credit-stat-box strong{display:block;margin:4px 0 2px;font-size:1.3rem;font-family:var(--font-heading);color:#fff}
.credit-stat-box.main-stat strong{color:#34d399;font-size:1.45rem}
.credit-stat-box span{display:block;font-size:.66rem;color:#94a3b8}

.credit-actions-grid{display:grid;grid-template-columns:1fr 1.2fr;gap:14px}
.credit-form-card{padding:16px;border-radius:12px;background:rgba(255,255,255,.025);border:1px solid rgba(255,255,255,.08);display:flex;flex-direction:column;gap:10px}
.form-head{display:flex;align-items:center;gap:7px;font-size:.8rem;color:#fff;padding-bottom:4px}
.credit-form-card label{display:grid;gap:4px;color:#a8bbca;font-size:.68rem;font-weight:700}
.credit-form-card input{width:100%;min-height:36px;padding:8px;border:1px solid rgba(203,213,225,.14);border-radius:7px;background:#081625;color:#fff;font-size:.78rem}
.form-row-2{display:grid;grid-template-columns:1fr 1fr;gap:8px}

.currency-input-wrapper{position:relative;display:flex;align-items:center;width:100%}
.currency-symbol{position:absolute;left:10px;font-size:.78rem;font-weight:800;color:#38bdf8;pointer-events:none}
.currency-input-wrapper input{width:100%;padding-left:34px !important}

.btn-grant{display:flex;align-items:center;justify-content:center;gap:6px;min-height:38px;margin-top:auto;border:0;border-radius:8px;background:#10b981;color:#fff;font-size:.74rem;font-weight:900;cursor:pointer}
.btn-grant:hover{background:#059669}
.btn-usage{display:flex;align-items:center;justify-content:center;gap:6px;min-height:38px;margin-top:auto;border:0;border-radius:8px;background:#f43f5e;color:#fff;font-size:.74rem;font-weight:900;cursor:pointer}
.btn-usage:hover{background:#e11d48}

.credit-history-card{padding:16px;border-radius:12px;background:rgba(255,255,255,.025);border:1px solid rgba(255,255,255,.08)}
.history-head{display:flex;align-items:center;gap:8px;padding-bottom:12px;border-bottom:1px solid rgba(255,255,255,.06);flex-wrap:wrap}
.history-head strong{font-size:.82rem;color:#fff}
.history-head small{font-size:.68rem;color:#94a3b8;margin-left:auto}

.credit-history-loading{min-height:90px;display:flex;align-items:center;justify-content:center;gap:8px;color:#94a3b8;font-size:.78rem}
.credit-empty{padding:24px 0;text-align:center;color:#64748b;font-size:.76rem}
.credit-movements-list{display:grid;gap:8px;margin-top:10px;max-height:220px;overflow-y:auto;padding-right:4px}
.movement-row{display:flex;justify-content:space-between;align-items:center;gap:12px;padding:10px 12px;border-radius:8px;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.05)}
.movement-row.usage{border-left:3px solid #fb7185}
.movement-row.grant{border-left:3px solid #34d399}
.movement-left{display:flex;flex-direction:column;gap:2px}
.movement-date{display:inline-flex;align-items:center;gap:4px;font-size:.64rem;color:#94a3b8}
.movement-desc{font-size:.78rem;color:#e2e8f0}
.movement-invoice{font-size:.67rem;color:#38bdf8}
.movement-right{display:flex;align-items:center;gap:10px;flex-shrink:0;text-align:right}
.movement-amount{font-size:.86rem;font-family:var(--font-heading)}
.movement-amount.usage{color:#fb7185}
.movement-amount.grant{color:#34d399}
.movement-type-label{font-size:.62rem;color:#94a3b8;display:block}
.btn-del-movement{background:transparent;border:0;color:#64748b;cursor:pointer;padding:4px}
.btn-del-movement:hover{color:#fb7185}

/* Approval Tab */
.partner-approval-form{display:grid;gap:12px}
.partner-approval-form label{display:grid;gap:5px;color:#a8bbca;font-size:.72rem;font-weight:800}
.partner-approval-form>div{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.partner-approval-form input{min-height:40px;padding:9px;border:1px solid rgba(203,213,225,.14);border-radius:8px;background:#081625;color:#fff}
.btn-approve-submit{display:flex;align-items:center;justify-content:center;gap:8px;min-height:44px;border:0;border-radius:8px;background:#28cce9;color:#031219;font-size:.8rem;font-weight:900;cursor:pointer}

/* Data Tab */
.partner-admin-data{display:grid;grid-template-columns:1fr 1fr;gap:12px;padding:14px;border-radius:10px;background:rgba(255,255,255,.03)}
.partner-admin-data small{display:block;font-size:.65rem;color:#8fa4b6}
.partner-admin-data strong{display:block;margin-top:2px;font-size:.8rem;overflow-wrap:anywhere;color:#fff}

@media(max-width:740px){
  .partner-admin-top{align-items:start;flex-direction:column}
  .partner-admin-stats{grid-template-columns:1fr}
  .partner-admin-list article{grid-template-columns:1fr;gap:8px}
  .partner-admin-actions{justify-content:start}
  .credit-summary-cards{grid-template-columns:1fr}
  .credit-actions-grid{grid-template-columns:1fr}
  .form-row-2{grid-template-columns:1fr}
  .partner-admin-data{grid-template-columns:1fr}
}
`;

export default AdminPartners;
