import { getWhatsAppUrl } from '../config';

const Footer = () => {
    return (
        <footer className="footer">
            <div className="container">
                <div className="footer-grid">
                    <div className="footer-col footer-brand">
                        <img src="/assets/logo.png" alt="Graphène" style={{ height: '36px', width: 'auto', objectFit: 'contain', marginBottom: '14px' }} />
                        <p>Farmácia de manipulação em Cabo Frio. Medicamentos e suplementos personalizados com matéria-prima de qualidade.</p>
                    </div>

                    <div className="footer-col">
                        <h4>Navegação</h4>
                        <a href="#hero">Início</a>
                        <a href="#products">Produtos</a>
                        <a href="#how-it-works">Como funciona</a>
                        <a href="#form">Enviar receita</a>
                    </div>

                    <div className="footer-col">
                        <h4>Contato</h4>
                        <a href={getWhatsAppUrl()} target="_blank" rel="noopener noreferrer">WhatsApp</a>
                        <a href="https://instagram.com" target="_blank" rel="noopener noreferrer">Instagram</a>
                    </div>

                    <div className="footer-col">
                        <h4>Endereço</h4>
                        <address>
                            Cabo Frio, RJ<br />
                            Segunda a sexta: 8h–18h<br />
                            Sábado: 8h–12h
                        </address>
                    </div>
                </div>

                <div className="footer-bottom">
                    <span>© {new Date().getFullYear()} Graphène. Todos os direitos reservados.</span>
                </div>
            </div>

            <style>{`
                .footer {
                    background: #f8fafc;
                    color: var(--text-secondary);
                    padding: 60px 0 0;
                    border-top: 1px solid var(--border-light);
                }

                .footer-grid {
                    display: grid;
                    grid-template-columns: 2fr 1fr 1fr 1.2fr;
                    gap: 48px;
                    padding-bottom: 48px;
                    border-bottom: 1px solid var(--border-light);
                }

                .footer-logo {
                    display: block;
                    font-size: 1.2rem;
                    font-weight: 800;
                    letter-spacing: -0.5px;
                    color: var(--text-primary);
                    margin-bottom: 14px;
                }

                .footer-brand p {
                    font-size: 0.88rem;
                    line-height: 1.6;
                    color: var(--text-secondary);
                    max-width: 280px;
                }

                .footer-col h4 {
                    font-size: 0.8rem;
                    font-weight: 700;
                    letter-spacing: 1px;
                    text-transform: uppercase;
                    color: var(--text-muted);
                    margin-bottom: 16px;
                }

                .footer-col a,
                .footer-col address {
                    display: block;
                    font-size: 0.9rem;
                    line-height: 1.6;
                    color: var(--text-secondary);
                    margin-bottom: 8px;
                    font-style: normal;
                    transition: color var(--transition-fast);
                }

                .footer-col a:hover {
                    color: var(--primary);
                }

                .footer-bottom {
                    padding: 24px 0;
                    font-size: 0.82rem;
                    color: var(--text-muted);
                    text-align: center;
                }

                @media (max-width: 768px) {
                    .footer-grid {
                        grid-template-columns: 1fr 1fr;
                        gap: 32px;
                    }

                    .footer-brand {
                        grid-column: span 2;
                    }

                    .footer {
                        padding: 40px 0 0;
                    }
                }

                @media (max-width: 480px) {
                    .footer-grid {
                        grid-template-columns: 1fr;
                    }

                    .footer-brand {
                        grid-column: span 1;
                    }
                }
            `}</style>
        </footer>
    );
};

export default Footer;
