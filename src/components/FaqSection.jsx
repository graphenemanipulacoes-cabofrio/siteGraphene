import React, { useState } from 'react';
import { ChevronDown, HelpCircle, MessageCircle } from 'lucide-react';
import { getWhatsAppUrl } from '../config';

const faqs = [
    {
        question: 'Preciso obrigatoriamente de receita médica para manipular?',
        answer: 'Depende da substância. Medicamentos sob controle especial e compostos hormonais exigem receita médica ou odontológica válida. Suplementos alimentares, fitoterápicos isentos de prescrição e certos dermocosméticos podem ser formulados e orientados diretamente por nossos farmacêuticos.'
    },
    {
        question: 'Como faço para enviar minha receita e receber o orçamento?',
        answer: 'Você pode utilizar o formulário seguro presente neste site (anexando foto ou PDF) ou enviar diretamente pelo nosso WhatsApp oficial (22) 99936-1256. Nossa equipe técnica calcula o orçamento em poucos minutos.'
    },
    {
        question: 'Qual é o prazo médio de manipulação da minha fórmula?',
        answer: 'A grande maioria das fórmulas fica pronta entre 24h a 48h úteis após a confirmação do pedido. Casos de urgência podem ser priorizados mediante contato direto com nossos farmacêuticos.'
    },
    {
        question: 'A Graphène entrega em outras cidades além de Cabo Frio?',
        answer: 'Sim! Além da retirada física em nossa loja no Centro de Cabo Frio e entregas por motoboy na Região dos Lagos, despachamos fórmulas para todo o Brasil via Sedex ou transportadora, em embalagens com proteção térmica e rastreamento integral.'
    },
    {
        question: 'Como tenho certeza da qualidade e pureza dos insumos?',
        answer: 'Todos os nossos fornecedores de matérias-primas passam por qualificação prévia rigorosa. Cada lote de insumo adquirido é acompanhado de Laudo de Análise Físico-Química e passa por pesagem computadorizada com dupla conferência eletrônica.'
    },
    {
        question: 'Quais são as formas de pagamento aceitas?',
        answer: 'Aceitamos PIX (com confirmação instantânea), cartões de crédito em até 3x sem juros (ou mais parcelas conforme valor), cartões de débito e pagamento na retirada.'
    }
];

const FaqSection = () => {
    const [openIndex, setOpenIndex] = useState(0);

    const toggleFaq = (index) => {
        setOpenIndex(openIndex === index ? null : index);
    };

    return (
        <section id="faq" className="section section--white faq-section">
            <div className="container-sm">
                <div className="section-header-modern">
                    <span className="section-tag">Dúvidas Frequentes</span>
                    <h2>Perguntas & Respostas</h2>
                    <p>
                        Esclareça rapidamente as principais dúvidas sobre o processo de manipulação, receitas, prazos e entregas.
                    </p>
                </div>

                <div className="faq-accordion-list">
                    {faqs.map((faq, index) => {
                        const isOpen = openIndex === index;
                        return (
                            <div key={index} className={`faq-item ${isOpen ? 'faq-item--open' : ''}`}>
                                <button
                                    className="faq-question-btn"
                                    onClick={() => toggleFaq(index)}
                                    aria-expanded={isOpen}
                                >
                                    <span className="faq-question-text">{faq.question}</span>
                                    <ChevronDown size={20} className="faq-icon" />
                                </button>
                                {isOpen && (
                                    <div className="faq-answer-box">
                                        <p>{faq.answer}</p>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

                <div className="faq-support-box">
                    <div className="faq-support-text">
                        <strong>Ainda tem alguma dúvida específica?</strong>
                        <p>Nossa equipe farmacêutica está pronta para te atender no WhatsApp.</p>
                    </div>
                    <a
                        href={getWhatsAppUrl('Olá, tenho uma dúvida sobre a manipulação da minha fórmula.')}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-primary-lux"
                    >
                        <MessageCircle size={17} />
                        <span>Falar com Farmacêutico</span>
                    </a>
                </div>
            </div>

            <style>{`
                .faq-section {
                    background: #ffffff;
                }

                .faq-accordion-list {
                    display: flex;
                    flex-direction: column;
                    gap: 12px;
                    margin-bottom: 40px;
                }

                .faq-item {
                    background: #ffffff;
                    border: 1px solid var(--border-light);
                    border-radius: var(--radius-md);
                    overflow: hidden;
                    transition: var(--transition-base);
                }

                .faq-item:hover {
                    border-color: var(--primary-200);
                }

                .faq-item--open {
                    border-color: var(--primary);
                    box-shadow: var(--shadow-sm);
                }

                .faq-question-btn {
                    width: 100%;
                    padding: 20px 24px;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 16px;
                    background: none;
                    border: none;
                    text-align: left;
                    cursor: pointer;
                    font-size: 1.02rem;
                    font-weight: 700;
                    color: var(--text-primary);
                    transition: color var(--transition-fast);
                }

                .faq-item--open .faq-question-btn {
                    color: var(--primary);
                }

                .faq-icon {
                    color: var(--text-light);
                    transition: transform var(--transition-base), color var(--transition-fast);
                    flex-shrink: 0;
                }

                .faq-item--open .faq-icon {
                    transform: rotate(180deg);
                    color: var(--primary);
                }

                .faq-answer-box {
                    padding: 0 24px 22px;
                    border-top: 1px solid var(--border-subtle);
                    animation: fadeIn 0.3s ease;
                }

                .faq-answer-box p {
                    font-size: 0.95rem;
                    color: var(--text-secondary);
                    line-height: 1.65;
                    margin-top: 14px;
                }

                .faq-support-box {
                    background: var(--bg-subtle);
                    border: 1px solid var(--border-light);
                    border-radius: var(--radius-lg);
                    padding: 28px 32px;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 24px;
                }

                .faq-support-text strong {
                    display: block;
                    font-size: 1.05rem;
                    color: var(--text-primary);
                    margin-bottom: 4px;
                }

                .faq-support-text p {
                    font-size: 0.88rem;
                    color: var(--text-secondary);
                    margin: 0;
                }

                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(-4px); }
                    to { opacity: 1; transform: translateY(0); }
                }

                @media (max-width: 768px) {
                    .faq-support-box {
                        flex-direction: column;
                        text-align: center;
                        padding: 24px;
                    }
                    .faq-question-btn {
                        padding: 16px 18px;
                        font-size: 0.95rem;
                    }
                    .faq-answer-box {
                        padding: 0 18px 18px;
                    }
                }
            `}</style>
        </section>
    );
};

export default FaqSection;
