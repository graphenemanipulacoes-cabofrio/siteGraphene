import Button from './Button';

const ProductContent = ({ product }) => (
    <>
        <div style={{
            height: '250px',
            background: 'rgba(255, 255, 255, 0.03)',
            borderRadius: '12px',
            marginBottom: '1rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
            position: 'relative'
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
            {product.price > 0 && (
                <p className="text-gradient" style={{ fontWeight: 'bold', fontSize: '1.2rem', marginTop: '0.5rem', textAlign: 'center' }}>
                    R$ {parseFloat(product.price).toFixed(2).replace('.', ',')}
                </p>
            )}
        </div>
        <Button variant="outline" style={{ width: '100%', justifyContent: 'center' }}>Quero este!</Button>
    </>
);

export default ProductContent;
