import React from 'react';

const Card = ({ children, className = '' }) => {
    return (
        <div className={`lux-product-card ${className}`}>
            {children}
            <style>{`
                .lux-product-card {
                    background: var(--bg-surface);
                    border: 1px solid var(--border-hairline);
                    padding: 24px;
                    display: flex;
                    flex-direction: column;
                    height: 100%;
                    transition: var(--transition);
                }

                .lux-product-card:hover {
                    border-color: var(--text-main);
                }
            `}</style>
        </div>
    );
};

export default Card;
