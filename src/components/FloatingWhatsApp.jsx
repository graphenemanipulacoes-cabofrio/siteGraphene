import React from 'react';
import { MessageCircle } from 'lucide-react';
import { getWhatsAppUrl } from '../config';

const FloatingWhatsApp = () => {
    return (
        <a
            href={getWhatsAppUrl('Olá, gostaria de tirar dúvidas e solicitar uma cotação na Graphène.')}
            target="_blank"
            rel="noopener noreferrer"
            className="clean-floating-wa"
            aria-label="Atendimento via WhatsApp"
        >
            <MessageCircle size={20} />
            <span className="wa-label">WhatsApp</span>

            <style>{`
                .clean-floating-wa {
                    position: fixed;
                    bottom: 24px;
                    right: 24px;
                    z-index: 999;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    background: var(--brand-green);
                    color: var(--action-ink);
                    padding: 12px 20px;
                    border-radius: var(--radius-full);
                    box-shadow: 0 8px 24px rgba(36, 211, 154, 0.28);
                    font-size: 0.88rem;
                    font-weight: 700;
                    border: none;
                    transition: var(--transition);
                }

                .clean-floating-wa:hover {
                    background: var(--brand-green-hover);
                    transform: translateY(-2px);
                    box-shadow: 0 12px 28px rgba(36, 211, 154, 0.38);
                    color: var(--action-ink);
                }

                .mobile-menu-open .clean-floating-wa {
                    opacity: 0;
                    pointer-events: none;
                }

                @media (max-width: 768px) {
                    .clean-floating-wa {
                        bottom: 18px;
                        right: 18px;
                        padding: 14px;
                        border-radius: 50%;
                    }
                    .wa-label {
                        display: none;
                    }
                }
            `}</style>
        </a>
    );
};

export default FloatingWhatsApp;
