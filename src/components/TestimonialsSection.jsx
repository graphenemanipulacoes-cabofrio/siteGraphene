import React from 'react';
import { Star, Quote, CheckCircle } from 'lucide-react';

const testimonials = [
    {
        name: 'Dra. Camila Nogueira',
        role: 'Médica Integrativa & Nutrologia',
        city: 'Cabo Frio - RJ',
        rating: 5,
        text: 'Prescrevo fórmulas na Graphène há mais de um ano para meus pacientes. A precisão nas dosagens e a qualidade dos ativos lipossomados trazem respostas clínicas excelentes.',
        tag: 'Prescritora Parceira'
    },
    {
        name: 'Marcelo Rezende',
        role: 'Atleta de Triatlo',
        city: 'Região dos Lagos',
        rating: 5,
        text: 'O composto termogênico e a creatina pura manipulada pela Graphène mudaram meu rendimento nos treinos. Entrega pontual e atendimento pelo WhatsApp super ágil.',
        tag: 'Nutrição Esportiva'
    },
    {
        name: 'Juliana Vasconcelos',
        role: 'Advogada',
        city: 'Cabo Frio - RJ',
        rating: 5,
        text: 'Enviei a receita do meu dermatologista pelo site e em menos de 15 minutos já tinha o orçamento no WhatsApp. O sérum clareador ficou impecável e a embalagem é maravilhosa!',
        tag: 'Dermocosméticos'
    },
    {
        name: 'Rodrigo Albuquerque',
        role: 'Empresário',
        city: 'Rio de Janeiro - RJ',
        rating: 5,
        text: 'Faço modulação de sono e imunidade. Mesmo morando na capital, peço tudo pela Graphène de Cabo Frio. O envio por Sedex chega com embalagem térmica e laudo.',
        tag: 'Longevidade'
    }
];

const TestimonialsSection = () => {
    return (
        <section id="avaliacoes" className="section section--subtle testimonials-section">
            <div className="container">
                <div className="section-header-modern">
                    <span className="section-tag">Avaliações Reais</span>
                    <h2>A Opinião de Quem Confia na Graphène</h2>
                    <p>
                        A satisfação e a melhora na qualidade de vida de nossos clientes e médicos parceiros são a nossa maior garantia de qualidade.
                    </p>
                </div>

                <div className="testimonials-grid">
                    {testimonials.map((item, index) => (
                        <div key={index} className="testimonial-card">
                            <div className="testimonial-card-header">
                                <div className="stars-row">
                                    {[...Array(item.rating)].map((_, i) => (
                                        <Star key={i} size={15} fill="#F59E0B" color="#F59E0B" />
                                    ))}
                                </div>
                                <span className="testimonial-badge">{item.tag}</span>
                            </div>

                            <p className="testimonial-quote">"{item.text}"</p>

                            <div className="testimonial-author">
                                <div className="author-avatar">
                                    {item.name.charAt(0)}
                                </div>
                                <div className="author-details">
                                    <strong>{item.name}</strong>
                                    <span>{item.role} • {item.city}</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <style>{`
                .testimonials-section {
                    background: #f8fafc;
                }

                .testimonials-grid {
                    display: grid;
                    grid-template-columns: repeat(4, 1fr);
                    gap: 20px;
                }

                .testimonial-card {
                    background: #ffffff;
                    border: 1px solid var(--border-light);
                    border-radius: var(--radius-lg);
                    padding: 28px 24px;
                    display: flex;
                    flex-direction: column;
                    justify-content: space-between;
                    box-shadow: var(--shadow-sm);
                    transition: var(--transition-base);
                }

                .testimonial-card:hover {
                    transform: translateY(-4px);
                    box-shadow: var(--shadow-lg);
                    border-color: var(--primary-200);
                }

                .testimonial-card-header {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    margin-bottom: 16px;
                }

                .stars-row {
                    display: flex;
                    gap: 2px;
                }

                .testimonial-badge {
                    font-size: 0.72rem;
                    font-weight: 700;
                    padding: 3px 8px;
                    border-radius: var(--radius-full);
                    background: var(--primary-50);
                    color: var(--primary);
                    border: 1px solid rgba(2, 132, 199, 0.15);
                }

                .testimonial-quote {
                    font-size: 0.92rem;
                    color: var(--text-secondary);
                    line-height: 1.6;
                    margin-bottom: 24px;
                    font-style: italic;
                    flex: 1;
                }

                .testimonial-author {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    padding-top: 16px;
                    border-top: 1px solid var(--border-light);
                }

                .author-avatar {
                    width: 38px;
                    height: 38px;
                    border-radius: 50%;
                    background: var(--gradient-brand);
                    color: #ffffff;
                    font-weight: 700;
                    font-size: 0.95rem;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    flex-shrink: 0;
                }

                .author-details strong {
                    display: block;
                    font-size: 0.88rem;
                    color: var(--text-primary);
                }

                .author-details span {
                    font-size: 0.76rem;
                    color: var(--text-light);
                }

                @media (max-width: 1100px) {
                    .testimonials-grid {
                        grid-template-columns: repeat(2, 1fr);
                    }
                }

                @media (max-width: 640px) {
                    .testimonials-grid {
                        grid-template-columns: 1fr;
                    }
                }
            `}</style>
        </section>
    );
};

export default TestimonialsSection;
