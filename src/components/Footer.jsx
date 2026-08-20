import React from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Instagram, Clock, ShieldCheck } from 'lucide-react';

const Footer = () => {
    return (
        <footer className="store-footer">
            <div className="container store-footer-grid">
                <div className="footer-col">
                    <img src="/assets/logo.png" alt="Graphène" className="footer-logo" />
                    <p className="footer-bio">
                        Laboratório de manipulação magistral de precisão em Cabo Frio — RJ. Insumos com laudo de pureza e pesagem computadorizada.
                    </p>
                    <a href="https://www.instagram.com/graphene_manipulacoes" target="_blank" rel="noopener noreferrer" className="footer-social">
                        <Instagram size={16} /> @graphene_manipulacoes
                    </a>
                </div>

                <div className="footer-col">
                    <h4>Unidade Cabo Frio</h4>
                    <div className="footer-info"><MapPin size={15} color="var(--brand-blue)" /> <span>Rua Itajuru, 300, Lojas 5 e 6<br/>Centro — Cabo Frio, RJ</span></div>
                    <div className="footer-info"><Clock size={15} color="var(--brand-blue)" /> <span>Seg a Sex: 08h – 18h30<br/>Sáb: 08h – 13h</span></div>
                </div>

                <div className="footer-col">
                    <h4>Navegação</h4>
                    <ul className="footer-links">
                        <li><Link to="/">Início & Produtos</Link></li>
                        <li><Link to="/ativos">Ativos Patenteados & Selos</Link></li>
                        <li><Link to="/receita">Enviar Receita Médica</Link></li>
                        <li><Link to="/laboratorio">O Laboratório & Loja</Link></li>
                        <li><Link to="/prescritores">Prescritores VIP</Link></li>
                        <li><Link to="/avaliacoes">Avaliações</Link></li>
                    </ul>
                </div>

                <div className="footer-col">
                    <h4>Conformidade</h4>
                    <p className="footer-reg">Boas Práticas de Manipulação em conformidade com ANVISA (RDC 67/2007) e CRF-RJ.</p>
                    <div className="footer-badge"><ShieldCheck size={15} color="var(--brand-green)" /> Farmacêutico Responsável Presente</div>
                </div>
            </div>

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
                .footer-links { list-style: none; display: flex; flex-direction: column; gap: 8px; }
                .footer-links a { font-size: 0.86rem; color: var(--text-dim); }
                .footer-links a:hover { color: var(--brand-blue); }
                .footer-reg { font-size: 0.82rem; color: var(--text-dim); line-height: 1.5; margin-bottom: 12px; }
                .footer-badge { display: flex; align-items: center; gap: 6px; background: rgba(16,185,129,0.08); border: 1px solid rgba(16,185,129,0.2); padding: 6px 10px; border-radius: var(--radius-xs); font-size: 0.74rem; font-weight: 600; color: var(--brand-green); }
                .footer-copyright-row { display: flex; align-items: center; justify-content: space-between; padding: 20px 0; font-size: 0.78rem; color: var(--text-muted); }
                .admin-link { color: var(--text-muted); }
                .admin-link:hover { color: var(--brand-blue); }
                @media (max-width: 960px) { .store-footer-grid { grid-template-columns: 1fr 1fr; } }
                @media (max-width: 600px) { .store-footer-grid { grid-template-columns: 1fr; } .footer-copyright-row { flex-direction: column; gap: 8px; text-align: center; } }
            `}</style>
        </footer>
    );
};

export default Footer;
