const Card = ({ children, className = '', title, icon }) => {
    return (
        <div className={`card-premium ${className}`} style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {title && (
                <div className="card-header" style={{ padding: '2rem 2rem 0', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem' }}>
                    {icon && <div className="card-icon" style={{ fontSize: '1.5rem' }}>{icon}</div>}
                    <h3 style={{ fontSize: '1.4rem', fontWeight: '800', letterSpacing: '-0.5px', color: 'var(--text-dark)', textAlign: 'center', lineHeight: '1.2' }}>
                        {title}
                    </h3>
                </div>
            )}
            <div className="card-content" style={{ flex: 1, padding: '1.5rem 2rem 2rem' }}>{children}</div>
            
            <style>{`
                .card-premium {
                    background: var(--bg-card);
                    border: 1px solid var(--neutral-200);
                    border-radius: var(--radius-md);
                    padding: 0;
                    box-shadow: var(--shadow-md);
                    transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
                    position: relative;
                    overflow: hidden;
                }

                .card-premium::before {
                    content: '';
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    height: 3px;
                    background: var(--gradient-primary);
                    opacity: 0;
                    transition: opacity 0.4s ease;
                }

                .card-premium:hover {
                    box-shadow: var(--shadow-xl);
                    transform: translateY(-6px) scale(1.01);
                    border-color: var(--primary-200);
                }

                .card-premium:hover::before {
                    opacity: 1;
                }

                @media (max-width: 768px) {
                    .card-premium {
                        padding: 0;
                    }
                    
                    .card-header, .card-content {
                        padding-left: 1.5rem;
                        padding-right: 1.5rem;
                    }
                }
            `}</style>
        </div>
    );
};

export default Card;
