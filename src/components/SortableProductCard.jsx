
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import Button from './Button';
import { Pencil, Trash2, Image as ImageIcon } from 'lucide-react';

const SortableProductCard = ({ product, handleOpenModal, handleDelete }) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
    } = useSortable({ id: product.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        touchAction: 'none', // Important for mobile drag
    };

    return (
        <div ref={setNodeRef} style={style} {...attributes} {...listeners} className="product-card-sortable">
            <div style={{ padding: '1.5rem', background: 'var(--bg-dark-secondary)', border: '1px solid var(--border-dark)', borderRadius: 'var(--radius-md)', position: 'relative', display: 'flex', flexDirection: 'column', gap: '1rem', height: '100%' }}>

                {/* Image */}
                <div style={{ height: '180px', background: 'rgba(255,255,255,0.02)', borderRadius: 'var(--radius-sm)', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                    {product.image_url ? (
                        <img src={product.image_url} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                    ) : (
                        <ImageIcon size={40} opacity={0.3} />
                    )}
                </div>

                {/* Info */}
                <div style={{ flex: 1 }}>
                    <h3 style={{ fontSize: '1.15rem', fontWeight: 'bold', marginBottom: '0.5rem', userSelect: 'none', color: 'var(--text-white)' }}>{product.name}</h3>
                    <p style={{ fontSize: '0.9rem', color: 'var(--text-light)', marginBottom: '0.5rem', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', userSelect: 'none' }}>
                        {product.description}
                    </p>
                    {Number(product.price) > 0 ? (
                        <p style={{ fontWeight: 'bold', fontSize: '1.1rem', userSelect: 'none', color: 'var(--primary)' }}>
                            R$ {parseFloat(product.price).toFixed(2).replace('.', ',')}
                        </p>
                    ) : (
                        <p style={{ fontSize: '0.9rem', color: 'var(--text-light)', fontStyle: 'italic', userSelect: 'none' }}>
                            Sem Preço
                        </p>
                    )}
                </div>

                {/* Actions - Stop propagation for buttons so they are clickable, not draggable */}
                <div style={{ display: 'flex', gap: '0.75rem', marginTop: 'auto' }} onPointerDown={(e) => e.stopPropagation()}>
                    <Button variant="outline" style={{ flex: 1, justifyContent: 'center', padding: '10px', borderRadius: 'var(--radius-sm)' }} onClick={() => handleOpenModal(product)}>
                        <Pencil size={18} /> Editar
                    </Button>
                    <button
                        onClick={() => handleDelete(product.id)}
                        style={{
                            background: 'rgba(239, 68, 68, 0.08)',
                            border: '1px solid rgba(239, 68, 68, 0.25)',
                            color: '#ef4444',
                            borderRadius: 'var(--radius-sm)',
                            width: '44px',
                            height: '44px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease'
                        }}
                    >
                        <Trash2 size={20} />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SortableProductCard;
