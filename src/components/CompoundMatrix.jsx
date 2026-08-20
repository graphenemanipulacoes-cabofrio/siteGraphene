import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { config } from '../config';
import { MessageCircle } from 'lucide-react';

const categories = ['Todos', 'Metabolismo', 'Performance', 'Sono & Foco', 'Longevidade'];

const defaultProducts = [
    {
        id: '1',
        category: 'Metabolismo',
        name: 'Morosil® 500mg Autêntico',
        tag: 'Patente Galena • Itália',
        description: 'Extrato nobre da Laranja Moro da Sicília. Ação comprovada na redução de medidas abdominais e equilíbrio metabólico.',
        price: '159,90',
        image_url: '/assets/morosil_new.png',
    },
    {
        id: '2',
        category: 'Sono & Foco',
        name: 'Melatonina 5mg Sublingual',
        tag: 'Absorção Rápida',
        description: 'Indução biológica ao sono REM profundo. Regula o ciclo circadiano e melhora a recuperação noturna.',
        price: '49,90',
        image_url: '/assets/melatonina_caps.png',
    },
    {
        id: '3',
        category: 'Sono & Foco',
        name: 'Ashwagandha KSM-66® 300mg',
        tag: 'Extrato Padronizado',
        description: 'Padronização clínica com 5% de withanolídeos. Redução comprovada do cortisol, alívio do estresse e foco.',
        price: '65,00',
        image_url: '/assets/ashwagandha.png',
    },
    {
        id: '4',
        category: 'Metabolismo',
        name: 'Composto Termogênico Ultra',
        tag: 'Gasto Calórico',
        description: 'Associação balanceada de Cafeína Anidra, Citrus Aurantium e Chá Verde para energia e queima calórica.',
        price: '89,90',
        image_url: '/assets/termogenico.png',
    },
    {
        id: '5',
        category: 'Longevidade',
        name: 'Maca Peruana Negra 500mg',
        tag: 'Extrato 4:1',
        description: 'Superalimento andino para equilíbrio hormonal, aumento da resistência física, libido e disposição.',
        price: '39,90',
        image_url: '/assets/maca_peruana.png',
    },
    {
        id: '6',
        category: 'Performance',
        name: 'Creatina 100% Pura Micronizada',
        tag: 'Grau Farmacêutico',
        description: 'Grau máximo de pureza para força muscular, hidratação celular e recuperação acelerada pós-treino.',
        price: '119,90',
        image_url: '/assets/creatina.jpg',
    }
];

const CompoundMatrix = () => {
    const [activeTab, setActiveTab] = useState('Todos');
    const [productsList, setProductsList] = useState(defaultProducts);

    useEffect(() => {
        const fetchDbProducts = async () => {
            try {
                const { data, error } = await supabase
                    .from('produtos')
                    .select('*')
                    .order('display_order', { ascending: true, nullsFirst: false })
                    .order('created_at', { ascending: true });

                if (!error && data && data.length > 0) {
                    const formatted = data.map((item, idx) => ({
                        id: String(item.id || idx),
                        category: item.category || 'Performance',
                        name: item.name,
                        tag: item.tag || 'Fórmula Disponível',
                        description: item.description,
                        price: item.price ? parseFloat(item.price).toFixed(2).replace('.', ',') : null,
                        image_url: item.image_url || '/assets/morosil_new.png'
                    }));
                    setProductsList(formatted);
                }
            } catch {
                setProductsList(defaultProducts);
            }
        };
        fetchDbProducts();
    }, []);

    const filtered = activeTab === 'Todos'
        ? productsList
        : productsList.filter(c => (c.category && c.category.toLowerCase().includes(activeTab.toLowerCase())) || activeTab === 'Todos');

    const handleOrder = (product) => {
        const msg = config.WHATSAPP_MESSAGES.product(product.name, product.price ? product.price.replace(',', '.') : null);
        window.open(`https://wa.me/${config.WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`, '_blank');
    };

    return (
        <section id="produtos" className="section clean-catalog-section">
            <div className="container">
                <div className="clean-section-header">
                    <div className="clean-pill">
                        <span>Fórmulas em Estoque</span>
                    </div>
                    <h2>Fórmulas e Ativos em <span className="highlight-blue">Destaque</span></h2>
                    <p>
                        Manipuladas com matérias-primas nobres em nosso laboratório próprio em Cabo Frio. Peça direto no WhatsApp.
                    </p>
                </div>

                {/* Categories */}
                <div className="clean-filter-bar">
                    {categories.map((cat, i) => (
                        <button
                            key={i}
                            type="button"
                            className={`clean-filter-btn ${activeTab === cat ? 'clean-filter-btn--active' : ''}`}
                            onClick={() => setActiveTab(cat)}
                        >
                            {cat}
                        </button>
                    ))}
                </div>

                {/* Products Grid */}
                <div className="clean-products-grid">
                    {filtered.map((item) => (
                        <div key={item.id} className="clean-card product-card-clean">
                            <div className="product-tag-row">
                                <span className="product-badge">{item.tag}</span>
                            </div>

                            <div className="product-image-container">
                                <img
                                    src={item.image_url}
                                    alt={item.name}
                                    className="product-photo"
                                    onError={(e) => {
                                        e.target.style.display = 'none';
                                    }}
                                />
                            </div>

                            <div className="product-details">
                                <h3>{item.name}</h3>
                                <p>{item.description}</p>
                            </div>

                            <div className="product-card-bottom">
                                <div className="product-price">
                                    <span className="price-label">Valor</span>
                                    {item.price ? (
                                        <strong>R$ {item.price}</strong>
                                    ) : (
                                        <strong style={{ fontSize: '0.95rem' }}>Sob Consulta</strong>
                                    )}
                                </div>

                                <button
                                    onClick={() => handleOrder(item)}
                                    className="btn-whatsapp product-buy-btn"
                                >
                                    <MessageCircle size={16} />
                                    <span>Pedir</span>
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <style>{`
                .clean-catalog-section {
                    position: relative;
                }

                .clean-filter-bar {
                    display: flex;
                    flex-wrap: wrap;
                    justify-content: center;
                    gap: 8px;
                    margin-bottom: 44px;
                }

                .clean-filter-btn {
                    background: rgba(255, 255, 255, 0.04);
                    border: 1px solid var(--border-subtle);
                    color: var(--text-dim);
                    padding: 8px 18px;
                    border-radius: var(--radius-full);
                    font-size: 0.84rem;
                    font-weight: 600;
                    cursor: pointer;
                    transition: var(--transition);
                }

                .clean-filter-btn:hover {
                    border-color: var(--brand-blue);
                    color: var(--text-white);
                }

                .clean-filter-btn--active {
                    background: var(--brand-blue);
                    border-color: var(--brand-blue);
                    color: #08090d !important;
                    font-weight: 700;
                }

                .clean-products-grid {
                    display: grid;
                    grid-template-columns: repeat(3, 1fr);
                    gap: 24px;
                }

                .product-card-clean {
                    display: flex;
                    flex-direction: column;
                    padding: 24px;
                }

                .product-tag-row {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    margin-bottom: 14px;
                }

                .product-badge {
                    font-size: 0.72rem;
                    font-weight: 700;
                    text-transform: uppercase;
                    letter-spacing: 0.04em;
                    color: var(--brand-blue);
                    background: rgba(0, 180, 216, 0.08);
                    border: 1px solid rgba(0, 180, 216, 0.2);
                    padding: 3px 8px;
                    border-radius: var(--radius-xs);
                }

                .product-image-container {
                    height: 180px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 12px;
                    background: rgba(255, 255, 255, 0.02);
                    border-radius: var(--radius-sm);
                    margin-bottom: 18px;
                    border: 1px solid rgba(255, 255, 255, 0.04);
                }

                .product-photo {
                    width: 100%;
                    height: 100%;
                    object-fit: contain;
                }

                .product-details {
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                    gap: 6px;
                    margin-bottom: 18px;
                }

                .product-details h3 {
                    font-size: 1.15rem;
                    font-weight: 700;
                    color: var(--text-white);
                }

                .product-details p {
                    font-size: 0.86rem;
                    color: var(--text-dim);
                    line-height: 1.5;
                    margin: 0;
                }

                .product-card-bottom {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding-top: 14px;
                    border-top: 1px solid var(--border-subtle);
                }

                .product-price {
                    display: flex;
                    flex-direction: column;
                }

                .price-label {
                    font-size: 0.72rem;
                    color: var(--text-muted);
                    text-transform: uppercase;
                }

                .product-price strong {
                    font-size: 1.25rem;
                    font-family: var(--font-heading);
                    color: var(--text-white);
                }

                .product-buy-btn {
                    padding: 10px 18px;
                    font-size: 0.84rem;
                }

                @media (max-width: 960px) {
                    .clean-products-grid {
                        grid-template-columns: repeat(2, 1fr);
                    }
                }

                @media (max-width: 600px) {
                    .clean-products-grid {
                        grid-template-columns: 1fr;
                    }
                }
            `}</style>
        </section>
    );
};

export default CompoundMatrix;
