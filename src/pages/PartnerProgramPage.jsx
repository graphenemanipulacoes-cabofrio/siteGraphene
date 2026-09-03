import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { 
    Award, 
    BadgeCheck, 
    CheckCircle2, 
    ChevronRight, 
    Gift, 
    HelpCircle, 
    LayoutDashboard, 
    LineChart, 
    LockKeyhole, 
    Percent, 
    PiggyBank, 
    ReceiptText, 
    ShieldCheck, 
    Sparkles, 
    TicketPercent, 
    TrendingUp, 
    UsersRound, 
    WalletCards, 
    Zap 
} from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import FloatingWhatsApp from '../components/FloatingWhatsApp';
import { getWhatsAppUrl } from '../config';

const money = value => Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const PartnerProgramPage = () => {
    const creditValues = [300, 600, 900, 1200];
    const [creditIndex, setCreditIndex] = useState(0);

    useEffect(() => {
        const timer = window.setInterval(() => {
            setCreditIndex(current => (current + 1) % creditValues.length);
        }, 2400);
        return () => window.clearInterval(timer);
    }, [creditValues.length]);

    // FAQ Accordion
    const [openFaq, setOpenFaq] = useState(null);
    const toggleFaq = (idx) => setOpenFaq(openFaq === idx ? null : idx);

    const faqs = [
        {
            q: 'Como faço login para acompanhar minhas vendas e comissões?',
            a: 'O acesso é super simples e direto! Basta clicar no botão "Acessar Painel" no topo desta página ou navegar até /parceiros/entrar com o e-mail e senha cadastrados. Seu painel particular exibe vendas confirmadas, comissões liberadas e histórico de repasses em tempo real.'
        },
        {
            q: 'Como funcionam os créditos para pedidos e fórmulas grátis?',
            a: 'Além da comissão em dinheiro depositada via Pix, parceiros que mantêm volume ativo acumulam créditos especiais para resgatar manipulados, suplementos e produtos da nossa linha oficial sem pagar nada. Você formula seus próprios pedidos para consumo próprio ou para produzir conteúdo com a marca.'
        },
        {
            q: 'Qual a comissão e o desconto do meu cupom para os seguidores?',
            a: 'Ao ser aprovado, você recebe um cupom personalizado (normalmente 10% de desconto para quem comprar através da sua indicação). A comissão padrão é de 10% sobre o valor faturado de cada pedido pago, creditada automaticamente no seu painel.'
        },
        {
            q: 'Como e quando recebo meus pagamentos via Pix?',
            a: 'Os pagamentos são transparentes e auditáveis. Cada comissão cumpre um prazo de segurança contra cancelamentos e, assim que liberada, o repasse pode ser solicitado diretamente para a sua Chave Pix cadastrada.'
        },
        {
            q: 'Quem pode se inscrever no programa de parceiros?',
            a: 'Médicos, nutricionistas, educadores físicos, influenciadores de saúde, bem-estar, longevidade e atletas que valorizam rigor farmacêutico e matérias-primas de alta pureza. Cada solicitação passa por uma análise ágil da nossa equipe.'
        }
    ];

    return (
        <div className="partner-program-page">
            <Header />

            <main>
                {/* Hero Section */}
                <section className="partner-hero-section">
                    <div className="container partner-hero-grid">
                        <div className="partner-hero-copy">
                            <div className="store-badge hero-badge">
                                <Sparkles size={14} />
                                <span>Programa de Parcerias & Influência</span>
                            </div>

                            <h1>
                                Transforme sua influência em <span className="highlight-blue">ganhos reais</span> e fórmulas exclusivas.
                            </h1>

                            <p className="partner-hero-sub">
                                Receba <strong>comissão em dinheiro</strong> em todas as compras com o seu cupom, ofereça <strong>desconto exclusivo</strong> para sua comunidade e ganhe <strong>créditos para pedidos grátis</strong> de fórmulas manipuladas sob medida.
                            </p>

                            <div className="partner-cta-cluster">
                                <Link to="/parceiros/cadastro" className="btn-cta-blue partner-main-cta">
                                    <span>Solicitar Minha Parceria</span>
                                    <ChevronRight size={18} />
                                </Link>

                                <Link to="/parceiros/entrar" className="btn-partner-login-hero" title="Acesse sua área de parceiro com e-mail e senha">
                                    <LockKeyhole size={15} />
                                    <span>Já sou Parceiro (Entrar)</span>
                                </Link>
                            </div>

                            <div className="partner-trust-pills">
                                <div><CheckCircle2 size={15} color="var(--brand-green)" /> <span>Painel individual em tempo real</span></div>
                                <div><CheckCircle2 size={15} color="var(--brand-green)" /> <span>Repasse rápido via Pix</span></div>
                                <div><CheckCircle2 size={15} color="var(--brand-green)" /> <span>Créditos para uso pessoal</span></div>
                            </div>
                        </div>

                        {/* Hero Card Preview / Dashboard Glance */}
                        <div className="partner-hero-card-wrap">
                            <div className="partner-dashboard-preview-card">
                                <div className="preview-card-header">
                                    <div className="preview-user-info">
                                        <div className="preview-avatar">GP</div>
                                        <div>
                                            <strong>Painel do Parceiro</strong>
                                            <small className="text-cyan">Cupom Ativo • Desempenho ao Vivo</small>
                                        </div>
                                    </div>
                                    <div className="preview-status-pill">
                                        <span className="live-dot"></span> Tempo Real
                                    </div>
                                </div>

                                <div className="preview-coupon-box">
                                    <div>
                                        <small>SEU CUPOM EXCLUSIVO</small>
                                        <strong>SEUNOME10</strong>
                                        <span>10% OFF para sua audiência</span>
                                    </div>
                                    <div className="preview-coupon-badge">Ativo</div>
                                </div>

                                <div className="preview-metric-grid">
                                    <div className="preview-metric-item">
                                        <ReceiptText size={16} className="text-cyan" />
                                        <span>Vendas confirmadas</span>
                                        <strong>48 pedidos</strong>
                                    </div>
                                    <div className="preview-metric-item">
                                        <WalletCards size={16} color="var(--brand-green)" />
                                        <span>Comissões liberadas</span>
                                        <strong style={{ color: 'var(--brand-green)' }}>R$ 1.152,00</strong>
                                    </div>
                                    <div className="preview-metric-item">
                                        <Gift size={16} color="#fbbf24" />
                                        <span>Crédito p/ fórmulas</span>
                                        <strong style={{ color: '#fbbf24' }}>{money(creditValues[creditIndex])}</strong>
                                    </div>
                                    <div className="preview-metric-item">
                                        <TrendingUp size={16} className="text-cyan" />
                                        <span>Repasse Pix</span>
                                        <strong>Auditado</strong>
                                    </div>
                                </div>

                                <div className="preview-footer-note">
                                    <span>Atualizado automaticamente a cada venda aprovada.</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* The 4 Core Benefits */}
                <section className="store-section partner-benefits-section">
                    <div className="container">
                        <div className="store-section-header">
                            <div className="store-badge">
                                <Award size={14} />
                                <span>Vantagens Exclusivas</span>
                            </div>
                            <h2>Por que ser um <span className="highlight-blue">Parceiro Graphène</span>?</h2>
                            <p>Uma parceria estruturada para valorizar seu trabalho de indicação com ferramentas profissionais e retorno de verdade.</p>
                        </div>

                        <div className="benefits-cards-grid">
                            {/* Benefício 1: Comissão */}
                            <div className="store-card benefit-card">
                                <div className="benefit-card-icon" style={{ background: 'rgba(16, 185, 129, 0.1)', borderColor: 'rgba(16, 185, 129, 0.3)' }}>
                                    <PiggyBank size={26} color="var(--brand-green)" />
                                </div>
                                <h3>Comissão em Dinheiro a Cada Venda</h3>
                                <p>
                                    Receba comissões percentuais diretamente sobre cada produto vendido através do seu cupom. Sem pegadinhas: cada pedido pago soma no seu saldo particular.
                                </p>
                                <div className="benefit-pill">
                                    <Zap size={13} color="var(--brand-green)" /> Repasses periódicos via Pix
                                </div>
                            </div>

                            {/* Benefício 2: Pedidos Grátis */}
                            <div className="store-card benefit-card">
                                <div className="benefit-card-icon" style={{ background: 'rgba(251, 191, 36, 0.1)', borderColor: 'rgba(251, 191, 36, 0.3)' }}>
                                    <Gift size={26} color="#fbbf24" />
                                </div>
                                <h3>Créditos para Pedidos & Fórmulas Grátis</h3>
                                <p>
                                    Parceiros ativos acumulam bônus e créditos na loja para manipular suplementos, nutracêuticos e cosméticos sob medida para você sem pagar nada.
                                </p>
                                <div className="benefit-pill">
                                    <Sparkles size={13} color="#fbbf24" /> Consumo próprio e conteúdo
                                </div>
                            </div>

                            {/* Benefício 3: Desconto para Audiência */}
                            <div className="store-card benefit-card">
                                <div className="benefit-card-icon" style={{ background: 'rgba(0, 180, 216, 0.1)', borderColor: 'rgba(0, 180, 216, 0.3)' }}>
                                    <TicketPercent size={26} color="var(--brand-blue)" />
                                </div>
                                <h3>Desconto Especial para Seus Seguidores</h3>
                                <p>
                                    Um cupom exclusivo com seu nome para você divulgar em posts, stories, bio ou prescrições. Seus seguidores ganham desconto real e você fideliza seu público.
                                </p>
                                <div className="benefit-pill">
                                    <Percent size={13} color="var(--brand-blue)" /> Cupom personalizado ativo
                                </div>
                            </div>

                            {/* Benefício 4: Painel em Tempo Real */}
                            <div className="store-card benefit-card">
                                <div className="benefit-card-icon" style={{ background: 'rgba(56, 189, 248, 0.1)', borderColor: 'rgba(56, 189, 248, 0.3)' }}>
                                    <LineChart size={26} color="#38bdf8" />
                                </div>
                                <h3>Painel Próprio com Métricas em Tempo Real</h3>
                                <p>
                                    Nada de esperar relatórios no fim do mês. Você tem login e senha para acompanhar vendas aprovadas, valores convertidos e comissões liberadas ao vivo.
                                </p>
                                <div className="benefit-pill">
                                    <ShieldCheck size={13} color="#38bdf8" /> Total transparência 24h
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* How it Works - 4 Steps */}
                <section className="store-section how-it-works-section">
                    <div className="container">
                        <div className="store-section-header">
                            <div className="store-badge">
                                <Zap size={14} />
                                <span>Simples e Transparente</span>
                            </div>
                            <h2>Como funciona a <span className="highlight-blue">Parceria</span></h2>
                            <p>Do envio do cadastro ao seu primeiro repasse em apenas 4 etapas descomplicadas.</p>
                        </div>

                        <div className="steps-grid">
                            <div className="store-card step-card">
                                <div className="step-num">01</div>
                                <h4>Solicite seu Cadastro</h4>
                                <p>Preencha seus dados de contato, redes sociais/canais e a sua Chave Pix para recebimento dos repasses.</p>
                            </div>

                            <div className="store-card step-card">
                                <div className="step-num">02</div>
                                <h4>Aprovação e Ativação</h4>
                                <p>Nossa equipe valida sua solicitação, define seu cupom exclusivo e libera o acesso seguro ao seu painel.</p>
                            </div>

                            <div className="store-card step-card">
                                <div className="step-num">03</div>
                                <h4>Compartilhe seu Código</h4>
                                <p>Divulgue seu cupom com desconto para sua audiência, clientes ou pacientes no Instagram, WhatsApp ou consultório.</p>
                            </div>

                            <div className="store-card step-card">
                                <div className="step-num">04</div>
                                <h4>Lucro & Créditos</h4>
                                <p>Acompanhe cada compra ao vivo no seu painel e receba suas comissões via Pix + bônus de fórmulas grátis.</p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Who is it for? */}
                <section className="store-section audience-section">
                    <div className="container">
                        <div className="store-card audience-card">
                            <div className="audience-header">
                                <div className="store-badge">
                                    <UsersRound size={14} />
                                    <span>Perfil dos Criadores</span>
                                </div>
                                <h2>Para quem é o <span className="highlight-blue">Graphène Partners</span>?</h2>
                                <p>Nosso programa é pensado para quem constrói confiança autêntica com seu público:</p>
                            </div>

                            <div className="audience-tags-grid">
                                <div className="audience-tag-item">
                                    <CheckCircle2 size={18} color="var(--brand-blue)" />
                                    <div>
                                        <strong>Médicos & Nutricionistas</strong>
                                        <span>Que prescrevem fórmulas de pureza comprovada com cromatografia.</span>
                                    </div>
                                </div>

                                <div className="audience-tag-item">
                                    <CheckCircle2 size={18} color="var(--brand-blue)" />
                                    <div>
                                        <strong>Creators de Saúde & Fitness</strong>
                                        <span>Influenciadores que valorizam resultados reais e produtos premium.</span>
                                    </div>
                                </div>

                                <div className="audience-tag-item">
                                    <CheckCircle2 size={18} color="var(--brand-blue)" />
                                    <div>
                                        <strong>Personal Trainers & Treinadores</strong>
                                        <span>Profissionais que orientam performance, hipertrofia e emagrecimento.</span>
                                    </div>
                                </div>

                                <div className="audience-tag-item">
                                    <CheckCircle2 size={18} color="var(--brand-blue)" />
                                    <div>
                                        <strong>Especialistas em Longevidade</strong>
                                        <span>Estética integrativa, dermatologia e modulação hormonal com ativos patenteados.</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* FAQ */}
                <section className="store-section faq-section">
                    <div className="container" style={{ maxWidth: '840px' }}>
                        <div className="store-section-header">
                            <div className="store-badge">
                                <HelpCircle size={14} />
                                <span>Tire Suas Dúvidas</span>
                            </div>
                            <h2>Perguntas Frequentes</h2>
                            <p>Tudo o que você precisa saber sobre o cadastro, painel e comissões.</p>
                        </div>

                        <div className="faq-list">
                            {faqs.map((faq, idx) => (
                                <div 
                                    key={idx} 
                                    className={`store-card faq-item ${openFaq === idx ? 'faq-item--open' : ''}`}
                                    onClick={() => toggleFaq(idx)}
                                >
                                    <div className="faq-question">
                                        <strong>{faq.q}</strong>
                                        <ChevronRight size={18} className="faq-chevron" />
                                    </div>
                                    {openFaq === idx && (
                                        <div className="faq-answer">
                                            <p>{faq.a}</p>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Final Big Conversion Section */}
                <section className="store-section final-cta-section">
                    <div className="container">
                        <div className="store-card final-cta-card">
                            <div className="final-cta-content">
                                <div className="store-badge">
                                    <Sparkles size={14} />
                                    <span>Inscrições Abertas</span>
                                </div>
                                <h2>Pronto para fazer parte da <span className="highlight-blue">Graphène</span>?</h2>
                                <p>
                                    Junte-se a médicos, nutricionistas e influenciadores que recomendam padrão ouro em manipulação farmacêutica e transformam credibilidade em receita recorrente.
                                </p>

                                <div className="final-cta-buttons">
                                    <Link to="/parceiros/cadastro" className="btn-cta-blue final-btn">
                                        <span>Cadastrar como Parceiro</span>
                                        <ChevronRight size={18} />
                                    </Link>
                                    
                                    <Link to="/parceiros/entrar" className="btn-cta-outline final-btn-login">
                                        <LockKeyhole size={17} />
                                        <span>Acessar Meu Painel</span>
                                    </Link>

                                    <a 
                                        href={getWhatsAppUrl('Olá, gostaria de saber mais sobre o programa de parceiros da Graphène.')}
                                        target="_blank" 
                                        rel="noopener noreferrer" 
                                        className="btn-wa-support"
                                    >
                                        Falar com consultor no WhatsApp
                                    </a>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>
            </main>

            <Footer />
            <FloatingWhatsApp />

            <style>{`
                .partner-program-page {
                    min-height: 100vh;
                    background: #07090e;
                    color: var(--text-main);
                }

                .text-cyan { color: var(--brand-blue); }

                /* Hero Section */
                .partner-hero-section {
                    padding: 64px 0 48px;
                    background: radial-gradient(circle at 85% 20%, rgba(0, 180, 216, 0.12), transparent 32rem),
                                radial-gradient(circle at 15% 90%, rgba(16, 185, 129, 0.08), transparent 28rem);
                }
                .partner-hero-grid {
                    display: grid;
                    grid-template-columns: 1.15fr 0.85fr;
                    gap: 48px;
                    align-items: center;
                }
                .partner-hero-copy h1 {
                    font-size: clamp(2.2rem, 4.2vw, 3.4rem);
                    font-weight: 800;
                    line-height: 1.12;
                    letter-spacing: -0.03em;
                    margin: 16px 0;
                }
                .partner-hero-sub {
                    font-size: 1.06rem;
                    color: var(--text-dim);
                    line-height: 1.65;
                    margin-bottom: 28px;
                }
                .partner-hero-sub strong {
                    color: #fff;
                }

                .partner-cta-cluster {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 14px;
                    align-items: center;
                    margin-bottom: 28px;
                }
                .partner-main-cta {
                    padding: 15px 28px;
                    font-size: 0.95rem;
                }
                .btn-partner-login-hero {
                    display: inline-flex;
                    align-items: center;
                    gap: 8px;
                    padding: 14px 24px;
                    border-radius: var(--radius-sm);
                    background: rgba(255, 255, 255, 0.04);
                    border: 1px solid rgba(0, 180, 216, 0.35);
                    color: #7dd3fc;
                    font-size: 0.9rem;
                    font-weight: 800;
                    transition: var(--transition);
                }
                .btn-partner-login-hero:hover {
                    background: rgba(0, 180, 216, 0.12);
                    border-color: var(--brand-blue);
                    color: #fff;
                    transform: translateY(-2px);
                }

                .partner-trust-pills {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 16px;
                    font-size: 0.82rem;
                    color: var(--text-dim);
                }
                .partner-trust-pills div {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                }

                /* Hero Preview Card */
                .partner-hero-card-wrap {
                    position: relative;
                }
                .partner-dashboard-preview-card {
                    background: linear-gradient(145deg, rgba(17, 34, 52, 0.95), rgba(9, 20, 32, 0.95));
                    border: 1px solid rgba(0, 180, 216, 0.28);
                    border-radius: 20px;
                    padding: 24px;
                    box-shadow: 0 20px 50px rgba(0, 0, 0, 0.6), 0 0 30px rgba(0, 180, 216, 0.12);
                    display: flex;
                    flex-direction: column;
                    gap: 16px;
                }
                .preview-card-header {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding-bottom: 14px;
                    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
                }
                .preview-user-info {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                }
                .preview-avatar {
                    width: 38px;
                    height: 38px;
                    border-radius: 10px;
                    background: linear-gradient(135deg, var(--brand-blue), var(--brand-green));
                    color: #07090e;
                    font-weight: 900;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 0.85rem;
                }
                .preview-user-info strong {
                    display: block;
                    font-size: 0.9rem;
                    color: #fff;
                }
                .preview-user-info small {
                    display: block;
                    font-size: 0.72rem;
                }
                .preview-status-pill {
                    display: inline-flex;
                    align-items: center;
                    gap: 6px;
                    font-size: 0.68rem;
                    font-weight: 800;
                    color: #38bdf8;
                    background: rgba(56, 189, 248, 0.1);
                    border: 1px solid rgba(56, 189, 248, 0.25);
                    padding: 3px 8px;
                    border-radius: 99px;
                    letter-spacing: 0.04em;
                }
                .live-dot {
                    width: 6px;
                    height: 6px;
                    border-radius: 50%;
                    background: #38bdf8;
                    box-shadow: 0 0 6px #38bdf8;
                }

                .preview-coupon-box {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    background: rgba(0, 180, 216, 0.08);
                    border: 1px dashed rgba(0, 180, 216, 0.35);
                    border-radius: 12px;
                    padding: 14px 16px;
                }
                .preview-coupon-box small {
                    display: block;
                    font-size: 0.66rem;
                    letter-spacing: 0.08em;
                    color: var(--text-dim);
                }
                .preview-coupon-box strong {
                    display: block;
                    font-size: 1.25rem;
                    letter-spacing: 0.05em;
                    color: #fff;
                    font-family: var(--font-heading);
                }
                .preview-coupon-box span {
                    display: block;
                    font-size: 0.72rem;
                    color: #38bdf8;
                }
                .preview-coupon-badge {
                    background: rgba(16, 185, 129, 0.15);
                    border: 1px solid var(--border-green);
                    color: var(--brand-green);
                    font-size: 0.7rem;
                    font-weight: 800;
                    padding: 3px 8px;
                    border-radius: 99px;
                    text-transform: uppercase;
                }

                .preview-metric-grid {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 10px;
                }
                .preview-metric-item {
                    background: rgba(255, 255, 255, 0.03);
                    border: 1px solid rgba(255, 255, 255, 0.06);
                    border-radius: 10px;
                    padding: 12px;
                    display: flex;
                    flex-direction: column;
                    gap: 3px;
                }
                .preview-metric-item span {
                    font-size: 0.72rem;
                    color: var(--text-dim);
                }
                .preview-metric-item strong {
                    font-size: 1.05rem;
                    color: #fff;
                    font-family: var(--font-heading);
                }

                .preview-footer-note {
                    font-size: 0.7rem;
                    color: var(--text-muted);
                    text-align: center;
                    border-top: 1px solid rgba(255, 255, 255, 0.06);
                    padding-top: 10px;
                }

                /* Benefits Grid */
                .benefits-cards-grid {
                    display: grid;
                    grid-template-columns: repeat(4, 1fr);
                    gap: 20px;
                }
                .benefit-card {
                    padding: 26px 22px;
                    display: flex;
                    flex-direction: column;
                    gap: 12px;
                }
                .benefit-card-icon {
                    width: 50px;
                    height: 50px;
                    border-radius: var(--radius-sm);
                    border: 1px solid;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                .benefit-card h3 {
                    font-size: 1.08rem;
                    font-weight: 800;
                    line-height: 1.25;
                }
                .benefit-card p {
                    font-size: 0.86rem;
                    line-height: 1.55;
                    margin: 0;
                    flex: 1;
                }
                .benefit-pill {
                    display: inline-flex;
                    align-items: center;
                    gap: 6px;
                    font-size: 0.72rem;
                    font-weight: 700;
                    color: #cbd5e1;
                    padding: 5px 10px;
                    border-radius: 99px;
                    background: rgba(255, 255, 255, 0.04);
                    border: 1px solid rgba(255, 255, 255, 0.08);
                    width: fit-content;
                    margin-top: 6px;
                }

                /* Steps */
                .steps-grid {
                    display: grid;
                    grid-template-columns: repeat(4, 1fr);
                    gap: 20px;
                }
                .step-card {
                    padding: 28px 22px;
                    position: relative;
                }
                .step-num {
                    font-size: 1.8rem;
                    font-weight: 900;
                    font-family: var(--font-heading);
                    color: rgba(0, 180, 216, 0.4);
                    margin-bottom: 10px;
                }
                .step-card h4 {
                    font-size: 1.05rem;
                    font-weight: 800;
                    margin-bottom: 8px;
                }
                .step-card p {
                    font-size: 0.84rem;
                    color: var(--text-dim);
                    line-height: 1.5;
                    margin: 0;
                }

                /* Audience */
                .audience-card {
                    padding: 40px;
                    background: linear-gradient(135deg, rgba(14, 24, 38, 0.95), rgba(8, 15, 24, 0.95));
                }
                .audience-header {
                    text-align: center;
                    max-width: 600px;
                    margin: 0 auto 30px;
                }
                .audience-tags-grid {
                    display: grid;
                    grid-template-columns: repeat(2, 1fr);
                    gap: 18px;
                }
                .audience-tag-item {
                    display: flex;
                    align-items: flex-start;
                    gap: 14px;
                    padding: 16px 20px;
                    border-radius: var(--radius-sm);
                    background: rgba(255, 255, 255, 0.02);
                    border: 1px solid var(--border-subtle);
                }
                .audience-tag-item strong {
                    display: block;
                    font-size: 0.95rem;
                    color: #fff;
                    margin-bottom: 2px;
                }
                .audience-tag-item span {
                    display: block;
                    font-size: 0.82rem;
                    color: var(--text-dim);
                    line-height: 1.45;
                }

                /* FAQ */
                .faq-list {
                    display: flex;
                    flex-direction: column;
                    gap: 10px;
                }
                .faq-item {
                    padding: 18px 22px;
                    cursor: pointer;
                    transition: var(--transition);
                }
                .faq-question {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 14px;
                }
                .faq-question strong {
                    font-size: 0.92rem;
                    color: #fff;
                }
                .faq-chevron {
                    color: var(--brand-blue);
                    transition: transform 0.2s ease;
                }
                .faq-item--open .faq-chevron {
                    transform: rotate(90deg);
                }
                .faq-answer {
                    margin-top: 12px;
                    padding-top: 12px;
                    border-top: 1px solid var(--border-subtle);
                }
                .faq-answer p {
                    font-size: 0.86rem;
                    line-height: 1.6;
                    color: var(--text-dim);
                    margin: 0;
                }

                /* Final CTA */
                .final-cta-section {
                    padding-bottom: 72px;
                }
                .final-cta-card {
                    padding: 56px 36px;
                    text-align: center;
                    background: radial-gradient(circle at 50% 0%, rgba(0, 180, 216, 0.16), transparent 70%),
                                linear-gradient(180deg, #102135, #081320);
                    border: 1px solid rgba(0, 180, 216, 0.35);
                }
                .final-cta-content {
                    max-width: 680px;
                    margin: 0 auto;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 16px;
                }
                .final-cta-content h2 {
                    font-size: clamp(2rem, 3.8vw, 2.75rem);
                    font-weight: 800;
                    line-height: 1.15;
                }
                .final-cta-content p {
                    font-size: 1rem;
                    line-height: 1.6;
                }
                .final-cta-buttons {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 14px;
                    justify-content: center;
                    align-items: center;
                    margin-top: 12px;
                }
                .final-btn {
                    padding: 15px 30px;
                    font-size: 0.95rem;
                }
                .final-btn-login {
                    padding: 15px 26px;
                    font-size: 0.95rem;
                }
                .btn-wa-support {
                    width: 100%;
                    font-size: 0.8rem;
                    color: var(--text-muted);
                    margin-top: 8px;
                    text-decoration: underline;
                }
                .btn-wa-support:hover {
                    color: var(--brand-green);
                }

                @media (max-width: 1024px) {
                    .benefits-cards-grid { grid-template-columns: repeat(2, 1fr); }
                    .steps-grid { grid-template-columns: repeat(2, 1fr); }
                    .partner-hero-grid { grid-template-columns: 1fr; gap: 36px; }
                }

                @media (max-width: 760px) {
                    .benefits-cards-grid { grid-template-columns: 1fr; }
                    .steps-grid { grid-template-columns: 1fr; }
                    .audience-tags-grid { grid-template-columns: 1fr; }
                    .partner-login-callout-card { flex-direction: column; text-align: center; }
                    .login-callout-left { flex-direction: column; }
                    .partner-cta-cluster { flex-direction: column; width: 100%; }
                    .partner-cta-cluster a { width: 100%; justify-content: center; }
                    .final-cta-buttons { flex-direction: column; width: 100%; }
                    .final-cta-buttons a { width: 100%; justify-content: center; }
                }
            `}</style>
        </div>
    );
};

export default PartnerProgramPage;
