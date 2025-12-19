
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
        <div ref={setNodeRef} style={style} {...attributes} {...listeners} className="glass product-card-sortable">
            <div style={{ padding: '1.5rem', borderRadius: '15px', position: 'relative', display: 'flex', flexDirection: 'column', gap: '1rem', height: '100%' }}>

                {/* Image */}
                <div style={{ height: '180px', background: 'rgba(255,255,255,0.02)', borderRadius: '10px', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                    {product.image_url ? (
                        <img src={product.image_url} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                    ) : (
                        <ImageIcon size={40} opacity={0.3} />
                    )}
                </div>

                {/* Info */}
                <div style={{ flex: 1 }}>
                    <h3 style={{ fontSize: '1.2rem', fontWeight: 'bold', marginBottom: '0.5rem', userSelect: 'none' }} className="text-gradient">{product.name}</h3>
                    <p style={{ fontSize: '0.9rem', opacity: 0.7, marginBottom: '0.5rem', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', userSelect: 'none' }}>
                        {product.description}
                    </p>
                    {Number(product.price) > 0 ? (
                        <p className="text-gradient" style={{ fontWeight: 'bold', fontSize: '1.1rem', userSelect: 'none' }}>
                            R$ {parseFloat(product.price).toFixed(2).replace('.', ',')}
                        </p>
                    ) : (
                        <p style={{ fontSize: '0.9rem', color: '#888', fontStyle: 'italic', userSelect: 'none' }}>
                            Sem Preço
                        </p>
                    )}
                </div>

                {/* Actions - Stop propagation for buttons so they are clickable, not draggable */}
                <div style={{ display: 'flex', gap: '0.75rem', marginTop: 'auto' }} onPointerDown={(e) => e.stopPropagation()}>
                    <Button variant="outline" style={{ flex: 1, justifyContent: 'center', padding: '10px' }} onClick={() => handleOpenModal(product)}>
                        <Pencil size={18} /> Editar
                    </Button>
                    <button
                        onClick={() => handleDelete(product.id)}
                        style={{
                            background: 'rgba(255, 77, 77, 0.05)',
                            border: '1px solid rgba(255, 77, 77, 0.2)',
                            color: '#FF4D4D',
                            borderRadius: '50px',
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
