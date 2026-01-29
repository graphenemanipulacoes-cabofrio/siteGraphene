import Button from './Button';


const openWhatsApp = (product) => {
    const phone = '5522999361256';
    let message = `Olá! Gostaria de saber mais sobre o produto: *${product.name}*`;

    if (Number(product.price) > 0) {
        const formattedPrice = parseFloat(product.price).toFixed(2).replace('.', ',');
        message += ` (R$ ${formattedPrice})`;
    }

    const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
};

const ProductContent = ({ product }) => (
    <div style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%'
    }}>
        {/* Imagem do Produto */}
        <div style={{
            height: '200px',
            background: '#f1f5f9',
            borderRadius: '12px',
            marginBottom: '1rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
            position: 'relative',
            border: '1px solid rgba(15, 23, 42, 0.05)'
        }}>
            {product.image_url ? (
                <img
                    src={product.image_url}
                    alt={product.name}
                    draggable="false"
                    style={{ width: '100%', height: '100%', objectFit: 'contain', padding: '1rem', userSelect: 'none' }}
                    onError={(e) => {
                        e.target.style.display = 'none';
                        e.target.nextSibling.style.display = 'block';
                    }}
                />
            ) : null}

            <div className="img-fallback" style={{
                display: product.image_url ? 'none' : 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '100%',
                height: '100%',
                opacity: 0.3,
                fontSize: '3rem'
            }}>
                💊
            </div>
        </div>

        {/* Descrição - altura fixa para alinhar todos os cards */}
        <div style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            marginBottom: '1rem'
        }}>
            <p style={{
                color: 'var(--text-gray)',
                fontSize: '0.9rem',
                height: '5.5em',
                overflow: 'hidden',
                display: '-webkit-box',
                WebkitLineClamp: 4,
                WebkitBoxOrient: 'vertical',
                textAlign: 'center',
                margin: 0,
                lineHeight: '1.4'
            }}>
                {product.description}
            </p>
            {Number(product.price) > 0 && (
                <p className="text-gradient" style={{
                    fontWeight: 'bold',
                    fontSize: '1.2rem',
                    marginTop: '0.75rem',
                    textAlign: 'center'
                }}>
                    R$ {parseFloat(product.price).toFixed(2).replace('.', ',')}
                </p>
            )}
        </div>

        {/* Botão sempre na parte inferior */}
        <div style={{ marginTop: 'auto' }}>
            <Button
                variant="outline"
                style={{ width: '100%', justifyContent: 'center' }}
                onClick={() => openWhatsApp(product)}
            >
                Quero este!
            </Button>
        </div>
    </div>
);

export default ProductContent;
