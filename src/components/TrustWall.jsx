import React from 'react';
import { Star } from 'lucide-react';

const reviews = [
    {
        name: 'Dra. Camila Nogueira',
        crm: 'CRM-RJ • Nutrologia',
        tag: 'Médica Prescritora',
        text: 'Prescrevo fórmulas na Graphène para os meus pacientes em Cabo Frio e região. A resposta clínica com os compostos manipulados e a pontualidade na entrega são de altíssimo nível.',
    },
    {
        name: 'Marcelo Rezende',
        crm: 'Triatleta',
        tag: 'Nutrição Esportiva',
        text: 'O composto termogênico e a creatina pura manipulada pela Graphène mudaram minha recuperação nos treinos. Atendimento pelo WhatsApp muito rápido e prestativo.',
    },
    {
        name: 'Dr. Thiago Vasconcelos',
        crm: 'CRM-RJ • Dermatologia',
        tag: 'Dermatologista Parceiro',
        text: 'A estabilidade dos veículos dermatológicos e o rigor no controle de qualidade da Graphène são excepcionais. É a nossa farmácia de confiança em Cabo Frio.',
    },
    {
        name: 'Juliana B. Prado',
        crm: 'Paciente',
        tag: 'Fórmula Personalizada',
        text: 'Enviei a receita médica pelo site e em menos de 15 minutos recebi o orçamento no WhatsApp. A fórmula foi entregue pontualmente e com ótimo acabamento.',
    }
];

const TrustWall = () => {
    return (
        <section id="avaliacoes" className="section clean-trust-section">
            <div className="container">
                <div className="clean-section-header">
                    <div className="clean-pill">
                        <span>Avaliações & Confiança</span>
                    </div>
                    <h2>Aprovado por <span className="highlight-blue">Médicos e Pacientes</span></h2>
                    <p>
                        Relatos reais de profissionais de saúde e clientes que confiam no padrão magistral da Graphène.
                    </p>
                </div>

                <div className="clean-reviews-grid">
                    {reviews.map((rev, idx) => (
                        <div key={idx} className="clean-card review-clean-card">
                            <div className="review-stars-row">
                                {[...Array(5)].map((_, i) => (
                                    <Star key={i} size={14} fill="#f59e0b" color="#f59e0b" />
                                ))}
                                <span className="review-tag">{rev.tag}</span>
                            </div>

                            <p className="review-body">"{rev.text}"</p>

                            <div className="review-author">
                                <strong>{rev.name}</strong>
                                <span>{rev.crm}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <style>{`
                .clean-trust-section {
                    position: relative;
                }

                .clean-reviews-grid {
                    display: grid;
                    grid-template-columns: repeat(4, 1fr);
                    gap: 20px;
                }

                .review-clean-card {
                    display: flex;
                    flex-direction: column;
                    justify-content: space-between;
                    padding: 24px;
                }

                .review-stars-row {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    margin-bottom: 14px;
                }

                .review-tag {
                    font-size: 0.72rem;
                    font-weight: 600;
                    color: var(--brand-blue);
                    text-transform: uppercase;
                }

                .review-body {
                    font-size: 0.88rem;
                    color: var(--text-dim);
                    line-height: 1.55;
                    margin-bottom: 18px;
                    flex: 1;
                }

                .review-author {
                    display: flex;
                    flex-direction: column;
                    padding-top: 12px;
                    border-top: 1px solid var(--border-subtle);
                }

                .review-author strong {
                    font-size: 0.88rem;
                    color: var(--text-white);
                }

                .review-author span {
                    font-size: 0.76rem;
                    color: var(--text-muted);
                }

                @media (max-width: 960px) {
                    .clean-reviews-grid {
                        grid-template-columns: repeat(2, 1fr);
                    }
                }

                @media (max-width: 600px) {
                    .clean-reviews-grid {
                        grid-template-columns: 1fr;
                    }
                }
            `}</style>
        </section>
    );
};

export default TrustWall;
