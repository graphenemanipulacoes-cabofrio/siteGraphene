import React from 'react';
import { config } from '../config';

const openWhatsApp = (product) => {
    const message = config.WHATSAPP_MESSAGES.product(product.name, product.price);
    const url = `https://wa.me/${config.WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
};

const ProductContent = ({ product }) => {
    const formattedPrice = product.price && Number(product.price) > 0
        ? `R$ ${parseFloat(product.price).toFixed(2).replace('.', ',')}`
        : null;

    return (
        <div className="lux-item-root">
            <div className="lux-item-image-box">
                {product.image_url ? (
                    <img
                        src={product.image_url}
                        alt={product.name}
                        className="lux-item-img"
                        onError={(e) => {
                            e.target.style.display = 'none';
                            const fallback = e.target.parentElement.querySelector('.lux-fallback');
                            if (fallback) fallback.style.display = 'flex';
                        }}
                    />
                ) : null}
                <div className="lux-fallback" style={{ display: product.image_url ? 'none' : 'flex' }}>
                    <span>Fórmula Magistral</span>
                </div>
            </div>

            <div className="lux-item-details">
                <h3 className="lux-item-title">{product.name}</h3>
                <p className="lux-item-desc">{product.description}</p>
            </div>

            <div className="lux-item-footer">
                {formattedPrice ? (
                    <div className="lux-item-price">{formattedPrice}</div>
                ) : (
                    <div className="lux-item-price" style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Sob Consulta</div>
                )}
                
                <button
                    onClick={() => openWhatsApp(product)}
                    className="btn-lux-order"
                >
                    Solicitar via WhatsApp
                </button>
            </div>

            <style>{`
                .lux-item-root {
                    display: flex;
                    flex-direction: column;
                    height: 100%;
                    gap: 16px;
                }

                .lux-item-image-box {
                    height: 200px;
                    background: var(--bg-surface-subtle);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 16px;
                    overflow: hidden;
                }

                .lux-item-img {
                    width: 100%;
                    height: 100%;
                    object-fit: contain;
                    transition: transform 0.4s ease;
                }

                .lux-product-card:hover .lux-item-img {
                    transform: scale(1.04);
                }

                .lux-fallback {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 0.82rem;
                    color: var(--text-subtle);
                    letter-spacing: 0.05em;
                    text-transform: uppercase;
                }

                .lux-item-details {
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                    gap: 6px;
                }

                .lux-item-title {
                    font-family: var(--font-serif);
                    font-size: 1.18rem;
                    font-weight: 600;
                    color: var(--text-main);
                }

                .lux-item-desc {
                    font-size: 0.88rem;
                    color: var(--text-muted);
                    line-height: 1.5;
                    display: -webkit-box;
                    -webkit-line-clamp: 3;
                    -webkit-box-orient: vertical;
                    overflow: hidden;
                    margin: 0;
                }

                .lux-item-footer {
                    display: flex;
                    flex-direction: column;
                    gap: 12px;
                    margin-top: auto;
                    padding-top: 16px;
                    border-top: 1px solid var(--border-hairline);
                }

                .lux-item-price {
                    font-family: var(--font-sans);
                    font-size: 1.05rem;
                    font-weight: 600;
                    color: var(--text-main);
                }

                .btn-lux-order {
                    width: 100%;
                    padding: 12px;
                    background: transparent;
                    border: 1px solid var(--border-hairline);
                    color: var(--text-main);
                    font-size: 0.78rem;
                    font-weight: 600;
                    letter-spacing: 0.06em;
                    text-transform: uppercase;
                    cursor: pointer;
                    transition: var(--transition);
                }

                .btn-lux-order:hover {
                    background: var(--accent-dark);
                    border-color: var(--accent-dark);
                    color: #ffffff;
                }
            `}</style>
        </div>
    );
};

export default ProductContent;
