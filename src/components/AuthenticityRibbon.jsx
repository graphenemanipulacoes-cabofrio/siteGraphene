import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, ArrowRight } from 'lucide-react';

const suppliers = [
    'Ages Bioactive Compounds',
    'Lemma Supply',
    'AQIA Biotec',
    'Biodiversité',
    'Florien',
];

const AuthenticityRibbon = () => {
    return (
        <section className="authenticity-ribbon-section">
            <div className="container">
                <div className="store-card ribbon-card">
                    <div className="ribbon-header">
                        <div className="ribbon-title-wrap">
                            <div className="ribbon-icon">
                                <ShieldCheck size={24} color="var(--brand-green)" />
                            </div>
                            <div>
                                <h3>Conheça as matérias-primas</h3>
                                <p>Veja marcas e fornecedores apresentados pela Graphène. Consulte nossa equipe sobre procedência e uso em fórmulas individualizadas.</p>
                            </div>
                        </div>

                        <Link to="/ativos" className="btn-header-receita ribbon-link-btn">
                            <span>Conhecer matérias-primas</span>
                            <ArrowRight size={15} />
                        </Link>
                    </div>

                    <div className="seals-scroll-row">
                        {suppliers.map((supplier) => (
                            <Link key={supplier} to="/ativos" className="seal-badge-item">
                                <strong>{supplier}</strong>
                                <small>Ver informações</small>
                            </Link>
                        ))}
                    </div>
                </div>
            </div>

            <style>{`
                .authenticity-ribbon-section {
                    padding: 10px 0 50px;
                }

                .ribbon-card {
                    padding: 30px 32px;
                    background: linear-gradient(135deg, rgba(17,22,34,0.95) 0%, rgba(12,16,24,0.95) 100%);
                    border: 1px solid var(--border-card);
                }

                .ribbon-header {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 20px;
                    margin-bottom: 22px;
                    flex-wrap: wrap;
                }

                .ribbon-title-wrap {
                    display: flex;
                    align-items: center;
                    gap: 14px;
                }

                .ribbon-icon {
                    width: 44px;
                    height: 44px;
                    border-radius: var(--radius-xs);
                    background: rgba(16,185,129,0.1);
                    border: 1px solid rgba(16,185,129,0.25);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    flex-shrink: 0;
                }

                .ribbon-title-wrap h3 {
                    font-size: 1.1rem;
                    font-weight: 800;
                    margin-bottom: 2px;
                }

                .ribbon-title-wrap p {
                    font-size: 0.84rem;
                    margin: 0;
                }

                .ribbon-link-btn {
                    padding: 10px 18px;
                    font-size: 0.82rem;
                }

                .seals-scroll-row {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(95px, 1fr));
                    gap: 12px;
                }

                .seal-badge-item {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    text-align: center;
                    padding: 12px 6px;
                    background: rgba(255,255,255,0.02);
                    border: 1px solid var(--border-subtle);
                    border-radius: var(--radius-sm);
                    transition: var(--transition);
                }

                .seal-badge-item:hover {
                    border-color: var(--brand-blue);
                    transform: translateY(-3px);
                    background: rgba(0,180,216,0.05);
                }

                .seal-badge-item strong {
                    font-size: 0.76rem;
                    color: #fff;
                    white-space: nowrap;
                }

                .seal-badge-item small {
                    font-size: 0.65rem;
                    color: var(--text-muted);
                    white-space: nowrap;
                }

                @media (max-width: 768px) {
                    .ribbon-card { padding: 20px 16px; }
                    .ribbon-header { flex-direction: column; align-items: flex-start; gap: 14px; }
                    .ribbon-link-btn { width: 100%; justify-content: center; }
                    .seals-scroll-row { grid-template-columns: repeat(3, 1fr); gap: 8px; }
                }

                @media (max-width: 480px) {
                    .seals-scroll-row { grid-template-columns: repeat(2, 1fr); }
                }
            `}</style>
        </section>
    );
};

export default AuthenticityRibbon;
