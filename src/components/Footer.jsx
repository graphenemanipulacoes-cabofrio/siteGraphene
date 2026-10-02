import React from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Instagram, Clock, ShieldCheck, MessageCircle } from 'lucide-react';
import { getWhatsAppUrl } from '../config';
import { business } from '../data/business';

const Footer = () => {
    return (
        <footer className="store-footer">
            <div className="container store-footer-grid">
                <div className="footer-col">
                    <img src="/assets/logo.png" alt="Graphène" className="footer-logo" />
                    <p className="footer-bio">
                        A Graphène é uma farmácia de manipulação em Cabo Frio — RJ. Conheça os produtos da loja, conte com atendimento farmacêutico e solicite orçamento para fórmulas individualizadas.
                    </p>
                    <a href="https://www.instagram.com/graphene_manipulacoes" target="_blank" rel="noopener noreferrer" className="footer-social">
                        <Instagram size={16} /> @graphene_manipulacoes
                    </a>
                </div>

                <div className="footer-col">
                    <h4>Unidade Cabo Frio</h4>
                    <div className="footer-info"><MapPin size={15} color="var(--brand-blue)" /> <span>Rua Itajuru, 300, Lojas 5 e 6<br/>Centro — Cabo Frio, RJ</span></div>
                    <div className="footer-info"><Clock size={15} color="var(--brand-blue)" /> <span>Seg a Sex: {business.hours.weekdays}<br/>Sáb: {business.hours.saturday}</span></div>
                    <a href={getWhatsAppUrl()} target="_blank" rel="noopener noreferrer" className="footer-contact"><MessageCircle size={15} /> WhatsApp: (22) 99936-1256</a>
                </div>

                <div className="footer-col">
                    <h4>Navegação</h4>
                    <ul className="footer-links">
                        <li><Link to="/">Início & Produtos</Link></li>
                        <li><Link to="/ativos">Matérias-primas</Link></li>
                        <li><Link to="/receita">Solicitar Orçamento</Link></li>
                        <li><Link to="/laboratorio">O Laboratório & Loja</Link></li>
                        <li><Link to="/prescritores">Profissionais de Saúde</Link></li>
                        <li><Link to="/parceiros">Programa de Parceiros</Link></li>
                        <li><Link to="/avaliacoes">Avaliações</Link></li>
                    </ul>
                </div>

                <div className="footer-col">
                    <h4>Institucional</h4>
                    <ul className="footer-links">
                        <li><Link to="/sobre">Sobre a Graphène</Link></li>
                        <li><Link to="/compras">Compra, pagamento e entrega</Link></li>
                        <li><Link to="/privacidade">Privacidade e dados pessoais</Link></li>
                    </ul>
                    <p className="footer-reg">O atendimento e a preparação de fórmulas seguem os requisitos sanitários aplicáveis a cada caso. Consulte a equipe para informações sobre a unidade.</p>
                    <div className="footer-badge"><ShieldCheck size={15} color="var(--brand-green)" /> Atendimento farmacêutico</div>
                </div>
            </div>

            <section className="container footer-identity" aria-labelledby="footer-identity-title">
                <div className="footer-identity-heading">
                    <h4 id="footer-identity-title">Identificação da unidade</h4>
                    <Link to="/sobre">Conheça a empresa e seus registros →</Link>
                </div>
                <dl className="footer-identity-grid">
                    <div><dt>Razão social e CNPJ</dt><dd>{business.legalName}<span>CNPJ {business.cnpj}</span></dd></div>
                    <div><dt>Responsável técnica</dt><dd>{business.pharmacist.name}<span>Farmacêutica · CRF-RJ {business.pharmacist.registration}</span></dd></div>
                    <div><dt>Registro do estabelecimento</dt><dd>CRF-RJ {business.establishmentRegistration}<span>Validade indicada na certidão: {business.certificate.validUntil}</span></dd></div>
                    <div><dt>Autorização de funcionamento — AFE</dt><dd>Anvisa nº {business.afe.number}<span>Concessão publicada no DOU em {business.afe.publication}</span></dd></div>
                </dl>
            </section>

            <div className="container footer-copyright-row">
                <span>© {new Date().getFullYear()} Graphène Farmácia de Manipulação. Todos os direitos reservados.</span>
                <Link to="/login" className="admin-link">Acesso Administrativo</Link>
            </div>

            <style>{`
                .store-footer { background: #040508; border-top: 1px solid var(--border-subtle); padding-top: 56px; position: relative; z-index: 10; }
                .store-footer-grid { display: grid; grid-template-columns: 1.4fr 1fr 0.8fr 1fr; gap: 40px; padding-bottom: 40px; border-bottom: 1px solid var(--border-subtle); }
                .footer-logo { height: 34px; width: auto; margin-bottom: 14px; }
                .footer-bio { font-size: 0.84rem; color: var(--text-dim); line-height: 1.6; margin-bottom: 14px; }
                .footer-social { display: inline-flex; align-items: center; gap: 6px; color: #fff; font-size: 0.82rem; font-weight: 600; }
                .footer-social:hover { color: var(--brand-blue); }
                .footer-col h4 { font-size: 0.8rem; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; margin-bottom: 16px; }
                .footer-info { display: flex; align-items: flex-start; gap: 8px; font-size: 0.84rem; color: var(--text-dim); line-height: 1.5; margin-bottom: 10px; }
                .footer-contact { display: inline-flex; align-items: center; gap: 8px; color: var(--text-dim); font-size: .82rem; margin-top: 2px; }
                .footer-contact:hover { color: var(--brand-green); }
                .footer-links { list-style: none; display: flex; flex-direction: column; gap: 8px; }
                .footer-links a { font-size: 0.86rem; color: var(--text-dim); }
                .footer-links a:hover { color: var(--brand-blue); }
                .footer-reg { font-size: 0.82rem; color: var(--text-dim); line-height: 1.5; margin-bottom: 12px; }
                .footer-badge { display: flex; align-items: center; gap: 6px; background: rgba(36,211,154,0.08); border: 1px solid var(--border-green); padding: 6px 10px; border-radius: var(--radius-xs); font-size: 0.74rem; font-weight: 700; color: var(--brand-green); }
                .footer-copyright-row { display: flex; align-items: center; justify-content: space-between; padding: 20px 0; font-size: 0.78rem; color: var(--text-muted); }
                .admin-link { color: var(--text-muted); }
                .admin-link:hover { color: var(--brand-blue); }
                .footer-identity { padding-top: 26px; padding-bottom: 26px; border-bottom: 1px solid var(--border-subtle); }
                .footer-identity-heading { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 18px; }
                .footer-identity-heading h4 { font-size: .85rem; margin: 0; }
                .footer-identity-heading a { color: #9fdde9; font-size: .8rem; text-decoration: underline; text-underline-offset: 4px; }
                .footer-identity-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 20px 36px; margin: 0; }
                .footer-identity-grid dt { color: #a9bbc9; font-size: .75rem; margin-bottom: 6px; }
                .footer-identity-grid dd { margin: 0; color: #edf4f8; font-size: .82rem; line-height: 1.65; overflow-wrap: anywhere; }
                .footer-identity-grid dd span { display: block; color: #bdcbd6; font-size: .78rem; }
                @media (max-width: 960px) { .store-footer-grid { grid-template-columns: 1fr 1fr; } }
                @media (max-width: 600px) { .store-footer-grid, .footer-identity-grid { grid-template-columns: 1fr; } .footer-copyright-row { flex-direction: column; gap: 8px; text-align: center; } }
            `}</style>
        </footer>
    );
};

export default Footer;
