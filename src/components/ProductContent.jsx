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
    <>
        <div style={{
            height: '250px',
            background: '#f1f5f9', /* slate-100 */
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
        <div style={{ marginBottom: '1.5rem' }}>
            <p style={{ color: 'var(--text-gray)', fontSize: '0.9rem', minHeight: '3em' }}>
                {product.description}
            </p>
            {Number(product.price) > 0 && (
                <p className="text-gradient" style={{ fontWeight: 'bold', fontSize: '1.2rem', marginTop: '0.5rem', textAlign: 'center' }}>
                    R$ {parseFloat(product.price).toFixed(2).replace('.', ',')}
                </p>
            )}
        </div>
        <Button
            variant="outline"
            style={{ width: '100%', justifyContent: 'center' }}
            onClick={() => openWhatsApp(product)}
        >
            Quero este!
        </Button>
    </>
);

export default ProductContent;
