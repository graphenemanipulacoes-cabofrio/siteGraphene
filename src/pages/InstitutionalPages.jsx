import { Link } from 'react-router-dom';
import { ArrowRight, Clock3, Instagram, MapPin, MessageCircle, ShieldCheck } from 'lucide-react';
import StoreLayout from '../components/StoreLayout';
import { config, getWhatsAppUrl } from '../config';
import { business } from '../data/business';

const institutionalLinks = [
    { to: '/sobre', label: 'Sobre a Graphène' },
    { to: '/compras', label: 'Compra, pagamento e entrega' },
    { to: '/privacidade', label: 'Privacidade e dados' },
];

function InstitutionalLayout({ eyebrow, title, intro, children }) {
    return (
        <section className="institutional-page">
            <div className="institutional-container">
                <nav className="institutional-breadcrumb" aria-label="Navegação estrutural">
                    <Link to="/">Início</Link><span aria-hidden="true">/</span><span>{title}</span>
                </nav>
                <header className="institutional-hero">
                    <span className="institutional-eyebrow"><ShieldCheck size={15} /> {eyebrow}</span>
                    <h1>{title}</h1>
                    <p>{intro}</p>
                </header>
                <div className="institutional-layout">
                    <nav className="institutional-nav" aria-label="Informações institucionais">
                        <h2>Informações</h2>
                        {institutionalLinks.map(item => (
                            <Link key={item.to} to={item.to} className={item.to === window.location.pathname ? 'is-active' : ''}>
                                {item.label}<ArrowRight size={15} />
                            </Link>
                        ))}
                        <a href={getWhatsAppUrl()} target="_blank" rel="noopener noreferrer">
                            Fale com a Graphène<ArrowRight size={15} />
                        </a>
                    </nav>
                    <article className="institutional-content">{children}</article>
                </div>
            </div>
            <style>{institutionalStyles}</style>
        </section>
    );
}

export function AboutPage() {
    return (
        <StoreLayout>
            <InstitutionalLayout
                eyebrow="Graphène em Cabo Frio"
                title="Sobre a Graphène"
                intro="Conheça nossa unidade em Cabo Frio, a empresa responsável, os registros apresentados e os canais oficiais de atendimento."
            >
                <section>
                    <h2>Atendimento próximo, com atenção a cada etapa</h2>
                    <p>A Graphène é uma farmácia de manipulação com unidade em Cabo Frio, no Rio de Janeiro. Pelo site, você pode conhecer os produtos apresentados pela loja e entrar em contato para tirar dúvidas ou solicitar um orçamento.</p>
                    <p>Solicitações de fórmulas são avaliadas pela equipe conforme as informações e a documentação necessárias para cada caso. A apresentação no site não substitui orientação profissional nem a avaliação da equipe responsável.</p>
                </section>
                <section>
                    <h2>Unidade e horário de atendimento</h2>
                    <div className="institutional-fact"><MapPin size={18} /><span><strong>Endereço</strong>Rua Itajuru, 300, Lojas 5 e 6 — Centro, Cabo Frio, RJ.</span></div>
                    <div className="institutional-fact"><Clock3 size={18} /><span><strong>Horário informado pela unidade</strong>Segunda a sexta: {business.hours.weekdays}; sábado: {business.hours.saturday}.</span></div>
                </section>
                <section>
                    <h2>Identificação da empresa</h2>
                    <dl className="institutional-details">
                        <div><dt>Nome comercial</dt><dd>{business.name}</dd></div>
                        <div><dt>CNPJ</dt><dd>{business.cnpj}</dd></div>
                        <div className="institutional-detail-wide"><dt>Razão social</dt><dd>{business.legalName}</dd></div>
                        <div className="institutional-detail-wide"><dt>Responsável técnica</dt><dd>{business.pharmacist.name}<span>Farmacêutica · CRF-RJ {business.pharmacist.registration}</span></dd></div>
                        <div><dt>Registro do estabelecimento</dt><dd>CRF-RJ {business.establishmentRegistration}</dd></div>
                    </dl>
                </section>
                <section>
                    <h2>Registros e documentação</h2>
                    <h3>Certidão de regularidade do CRF-RJ</h3>
                    <p>A certidão apresentada para o estabelecimento CRF-RJ {business.establishmentRegistration} foi emitida em {business.certificate.issued} e indica validade até {business.certificate.validUntil}. Nela constam a razão social, o CNPJ, o endereço da unidade e a responsável técnica identificados acima.</p>
                    <h3>Autorização de funcionamento — Anvisa</h3>
                    <p>A publicação de concessão da AFE nº {business.afe.number} consta no Diário Oficial da União de {business.afe.publication}, Seção 1, página 107, pela {business.afe.resolution}. Processo: {business.afe.process}.</p>
                    <p>Essas informações identificam os documentos apresentados pela empresa. A publicação da AFE se refere à autorização do estabelecimento, não à aprovação individual dos produtos. A situação atual dos registros pode ser consultada nos órgãos responsáveis.</p>
                    <div className="institutional-actions">
                        <a className="institutional-secondary" href="https://portal.crf-rj.org.br/" target="_blank" rel="noopener noreferrer">Portal oficial do CRF-RJ<ArrowRight size={15} /></a>
                        <a className="institutional-secondary" href="https://consultas.anvisa.gov.br/" target="_blank" rel="noopener noreferrer">Consultas da Anvisa<ArrowRight size={15} /></a>
                    </div>
                    <p className="institutional-document-note">Para solicitar informações atualizadas sobre a documentação da unidade, fale com a equipe pelos canais oficiais abaixo.</p>
                </section>
                <section>
                    <h2>Fale com a equipe</h2>
                    <p>Para confirmar atendimento, tirar dúvidas sobre produtos, orçamento ou entrega, use os canais oficiais. Condições e prazos podem variar conforme o pedido e devem ser confirmados antes da compra.</p>
                    <div className="institutional-actions">
                        <a className="institutional-button" href={getWhatsAppUrl()} target="_blank" rel="noopener noreferrer"><MessageCircle size={17} /> WhatsApp {config.WHATSAPP_NUMBER.replace(/^55(\d{2})(\d{5})(\d{4})$/, '($1) $2-$3')}</a>
                        <a className="institutional-secondary" href="https://www.instagram.com/graphene_manipulacoes" target="_blank" rel="noopener noreferrer"><Instagram size={17} /> Instagram</a>
                    </div>
                </section>
            </InstitutionalLayout>
        </StoreLayout>
    );
}

export function PurchaseInfoPage() {
    return (
        <StoreLayout>
            <InstitutionalLayout
                eyebrow="Informações para comprar"
                title="Compra, pagamento e entrega"
                intro="Veja como funciona o fluxo atual do site e confira os valores do pedido antes de seguir para o pagamento."
            >
                <section>
                    <h2>Como fazer um pedido</h2>
                    <ol className="institutional-steps">
                        <li>Escolha os produtos e adicione-os ao carrinho.</li>
                        <li>Entre ou crie uma conta para continuar.</li>
                        <li>Informe os dados do destinatário e o endereço de entrega.</li>
                        <li>Revise os produtos, descontos aplicáveis, entrega e total antes de prosseguir.</li>
                        <li>Finalize o pagamento no ambiente do Mercado Pago.</li>
                    </ol>
                </section>
                <section>
                    <h2>Pagamento</h2>
                    <p>O checkout encaminha o cliente ao Mercado Pago. As opções disponíveis — atualmente Pix e cartão — e eventuais condições de parcelamento são apresentadas pelo provedor antes da confirmação. Os dados do cartão são informados no ambiente de pagamento, não no formulário de endereço da Graphène.</p>
                </section>
                <section>
                    <h2>Entrega e valores</h2>
                    <p>O endereço é informado no checkout e o valor da entrega aparece na revisão do pedido antes do pagamento. O site não publica um prazo fixo de entrega; se você precisar confirmar prazo, área atendida ou modalidade de envio, fale com a equipe antes de concluir a compra.</p>
                </section>
                <section>
                    <h2>Cancelamento, troca e devolução</h2>
                    <p>Para solicitar cancelamento, troca ou devolução, fale com o atendimento e informe o número do pedido. Não envie documentos pessoais ou dados de saúde no primeiro contato.</p>
                    <p>Nos casos abrangidos pelo artigo 49 do Código de Defesa do Consumidor, compras realizadas fora do estabelecimento têm prazo de 7 dias para exercício do direito de arrependimento, contado da assinatura ou do recebimento do produto ou serviço. A equipe orientará sobre os procedimentos de devolução e reembolso conforme os direitos aplicáveis ao pedido.</p>
                </section>
                <section>
                    <h2>Precisa de ajuda com um pedido?</h2>
                    <p>Tenha em mãos o e-mail da conta e, se já existir, o número do pedido. A equipe poderá orientar sobre o status e os próximos passos. As orientações de atendimento não limitam os direitos previstos na legislação.</p>
                    <a className="institutional-button" href={getWhatsAppUrl('Olá! Preciso de ajuda com uma compra no site Graphène.')} target="_blank" rel="noopener noreferrer"><MessageCircle size={17} /> Falar com atendimento</a>
                </section>
            </InstitutionalLayout>
        </StoreLayout>
    );
}

export function PrivacyPage() {
    return (
        <StoreLayout>
            <InstitutionalLayout
                eyebrow="Aviso de privacidade"
                title="Privacidade e dados pessoais"
                intro="Explicamos quais informações o site utiliza para conta, orçamento, atendimento e compra, e como falar com a Graphène sobre seus dados."
            >
                <p className="institutional-updated">Atualizado em 2 de outubro de 2026.</p>
                <section>
                    <h2>Quem recebe e trata os dados</h2>
                    <p>A empresa responsável pelo tratamento das informações enviadas neste site é {business.legalName}, CNPJ {business.cnpj}, que atua com o nome comercial {business.name}. A unidade fica na {business.address.street}, {business.address.neighborhood}, {business.address.city} — {business.address.region}. Para dúvidas e solicitações relacionadas a dados pessoais, entre em contato pelo WhatsApp oficial, (22) 99936-1256.</p>
                </section>
                <section>
                    <h2>Quais informações podem ser usadas</h2>
                    <ul>
                        <li><strong>Conta:</strong> nome e e-mail usados para criar e acessar a conta.</li>
                        <li><strong>Compras:</strong> itens, cupom, nome do destinatário, CPF, telefone e endereço necessários para validar e entregar o pedido.</li>
                        <li><strong>Orçamento:</strong> nome, telefone, observações e arquivos que a pessoa decidir enviar para análise da solicitação.</li>
                        <li><strong>Parcerias:</strong> dados informados no formulário de candidatura e no acompanhamento da parceria.</li>
                        <li><strong>Atendimento:</strong> conteúdo das mensagens que a pessoa envia pelos canais escolhidos.</li>
                    </ul>
                </section>
                <section>
                    <h2>Para que são utilizados</h2>
                    <p>Os dados são usados para autenticar a conta, responder pedidos de orçamento, analisar solicitações encaminhadas à equipe, validar e processar pedidos, registrar pagamentos, organizar a entrega e prestar atendimento. O envio de informações deve se limitar ao necessário para a solicitação feita.</p>
                    <p>Arquivos de prescrição podem conter dados referentes à saúde, que recebem proteção especial pela legislação. Envie documentos apenas quando forem necessários para a análise solicitada. A Graphène não deve usar esses documentos para publicidade.</p>
                </section>
                <section>
                    <h2>Serviços envolvidos e armazenamento</h2>
                    <p>Usamos Supabase para autenticação, banco de dados e armazenamento; o pagamento é concluído no Mercado Pago. Se você escolher entrar com Google, a autenticação também envolve esse provedor. Ao abrir o WhatsApp, a conversa passa a seguir as condições e políticas do próprio serviço. Mapas incorporados e fontes de texto também podem carregar recursos do Google.</p>
                    <p>O carrinho é mantido no armazenamento local do navegador para que a seleção continue disponível durante a navegação. A sessão permite acessar a conta e acompanhar pedidos. Compartilhe apenas as informações necessárias para o atendimento.</p>
                </section>
                <section>
                    <h2>Cookies e armazenamento do navegador</h2>
                    <p>O site utiliza tecnologias necessárias ao carrinho, à sessão e às suas preferências de navegação. Atualmente, não utilizamos ferramentas de análise de audiência ou pixels de publicidade neste site. Se forem adicionadas tecnologias opcionais, este aviso e os controles de privacidade serão atualizados antes da ativação, com opções de escolha quando aplicáveis.</p>
                </section>
                <section>
                    <h2>Direitos e contato</h2>
                    <p>A pessoa pode solicitar informações sobre o tratamento, correção ou eliminação de dados, observadas as obrigações legais que possam exigir a conservação de determinados registros. Para encaminhar uma solicitação, use o canal oficial abaixo e informe o e-mail da conta ou o número do pedido, evitando enviar documentos sensíveis no primeiro contato.</p>
                    <a className="institutional-button" href={getWhatsAppUrl('Olá! Quero fazer uma solicitação sobre meus dados pessoais no site Graphène.')} target="_blank" rel="noopener noreferrer"><MessageCircle size={17} /> Solicitar atendimento sobre dados</a>
                </section>
            </InstitutionalLayout>
        </StoreLayout>
    );
}

const institutionalStyles = `
    .institutional-page { min-height: 60vh; padding: clamp(32px, 6vw, 76px) 0 88px; color: var(--text-main); }
    .institutional-container { width: min(1120px, calc(100% - 36px)); margin: 0 auto; }
    .institutional-breadcrumb { display: flex; gap: 10px; color: var(--text-muted); font-size: .82rem; margin-bottom: 28px; }
    .institutional-breadcrumb a { color: var(--text-dim); }
    .institutional-hero { max-width: 780px; margin-bottom: 36px; }
    .institutional-eyebrow { display: inline-flex; align-items: center; gap: 8px; color: var(--brand-blue); font-size: .74rem; font-weight: 750; letter-spacing: .09em; text-transform: uppercase; }
    .institutional-hero h1 { margin: 12px 0; font-size: clamp(2rem, 5vw, 3.5rem); line-height: 1.05; letter-spacing: -.04em; }
    .institutional-hero p { max-width: 670px; color: var(--text-dim); font-size: 1.03rem; line-height: 1.7; }
    .institutional-layout { display: grid; grid-template-columns: 260px minmax(0, 1fr); align-items: start; gap: 26px; }
    .institutional-nav, .institutional-content { background: var(--surface-card, rgba(15, 22, 34, .88)); border: 1px solid var(--border-subtle); border-radius: 16px; }
    .institutional-nav { position: sticky; top: 120px; padding: 20px; }
    .institutional-nav h2 { margin: 0 0 12px; font-size: .85rem; text-transform: uppercase; letter-spacing: .08em; }
    .institutional-nav a { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 11px 10px; border-radius: 8px; color: var(--text-dim); font-size: .87rem; }
    .institutional-nav a:hover, .institutional-nav a.is-active { color: var(--text-main); background: rgba(64, 204, 229, .09); }
    .institutional-nav a svg { color: var(--brand-blue); flex: 0 0 auto; }
    .institutional-content { padding: clamp(22px, 4vw, 38px); }
    .institutional-content section + section { border-top: 1px solid var(--border-subtle); margin-top: 28px; padding-top: 26px; }
    .institutional-content h2 { font-size: 1.12rem; margin: 0 0 12px; }
    .institutional-content h3 { font-size: .98rem; margin: 22px 0 8px; }
    .institutional-details { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 18px 24px; margin: 20px 0 0; }
    .institutional-details dt { color: #a9bbc9; font-size: .8rem; margin-bottom: 5px; }
    .institutional-details dd { margin: 0; color: var(--text-main); font-size: .93rem; line-height: 1.65; overflow-wrap: anywhere; }
    .institutional-details dd span { display: block; color: var(--text-dim); font-size: .85rem; }
    .institutional-detail-wide { grid-column: 1 / -1; }
    .institutional-document-note { margin-top: 18px; }
    .institutional-content p, .institutional-content li { color: var(--text-dim); font-size: .93rem; line-height: 1.75; }
    .institutional-content p + p { margin-top: 12px; }
    .institutional-content ul, .institutional-steps { padding-left: 22px; margin: 12px 0 0; }
    .institutional-content li + li { margin-top: 9px; }
    .institutional-content strong { color: var(--text-main); }
    .institutional-fact { display: flex; align-items: flex-start; gap: 12px; margin-top: 15px; color: var(--brand-blue); }
    .institutional-fact span { color: var(--text-dim); font-size: .92rem; line-height: 1.65; }
    .institutional-fact strong { display: block; color: var(--text-main); margin-bottom: 2px; }
    .institutional-actions { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 18px; }
    .institutional-button, .institutional-secondary { display: inline-flex; align-items: center; justify-content: center; gap: 9px; min-height: 44px; padding: 0 16px; border-radius: 9px; font-size: .88rem; font-weight: 700; }
    .institutional-button { background: var(--brand-green); color: #062119; }
    .institutional-button:hover { filter: brightness(1.08); }
    .institutional-secondary { border: 1px solid var(--border-subtle); color: var(--text-main); }
    .institutional-updated { font-size: .8rem !important; color: var(--text-muted) !important; margin: 0 0 8px; }
    @media (max-width: 760px) { .institutional-page { padding-top: 26px; } .institutional-layout { grid-template-columns: 1fr; } .institutional-nav { position: static; padding: 14px; } .institutional-nav h2 { margin: 0 0 6px; } .institutional-nav a { padding: 9px 8px; } .institutional-content { padding: 22px 18px; } }
    @media (max-width: 480px) { .institutional-details { grid-template-columns: 1fr; } .institutional-button, .institutional-secondary { max-width: 100%; height: auto; padding-top: 10px; padding-bottom: 10px; } }
`;
