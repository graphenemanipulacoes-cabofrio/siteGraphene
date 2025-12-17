import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import Button from './Button';
import { Plus, Pencil, Trash2, X, Upload, Image as ImageIcon } from 'lucide-react';
import { toast } from 'sonner';

const AdminProducts = () => {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState(null);

    // Form State
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [price, setPrice] = useState('');
    const [imageFile, setImageFile] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);
    const [uploading, setUploading] = useState(false);

    useEffect(() => {
        fetchProducts();
    }, []);

    const fetchProducts = async () => {
        try {
            const { data, error } = await supabase
                .from('produtos')
                .select('*')
                .order('created_at', { ascending: true });

            if (error) throw error;
            setProducts(data || []);
        } catch (error) {
            console.error('Error fetching products:', error);
            // toast.error('Erro ao carregar produtos.'); 
        } finally {
            setLoading(false);
        }
    };

    const handleOpenModal = (product = null) => {
        setEditingProduct(product);
        if (product) {
            setName(product.name);
            setDescription(product.description || '');
            setPrice(product.price || '');
            setImagePreview(product.image_url);
        } else {
            setName('');
            setDescription('');
            setPrice('');
            setImagePreview(null);
        }
        setImageFile(null);
        setIsModalOpen(true);
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setImageFile(file);
            setImagePreview(URL.createObjectURL(file));
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setUploading(true);

        try {
            let imageUrl = editingProduct?.image_url;

            if (imageFile) {
                const fileExt = imageFile.name.split('.').pop();
                const fileName = `product_${Date.now()}.${fileExt}`;
                const { error: uploadError } = await supabase.storage
                    .from('receitas')
                    .upload(fileName, imageFile);

                if (uploadError) throw uploadError;

                const { data } = supabase.storage
                    .from('receitas')
                    .getPublicUrl(fileName);

                imageUrl = data.publicUrl;
            }

            // Logic: If price is empty/null, save as 0. 
            // Frontend hides anything <= 0.
            const finalPrice = !price ? 0 : parseFloat(price);

            const productData = {
                name,
                description,
                price: finalPrice,
                image_url: imageUrl
            };

            let savedProduct;

            if (editingProduct) {
                // Update
                const { data, error } = await supabase
                    .from('produtos')
                    .update(productData)
                    .eq('id', editingProduct.id)
                    .select() // IMPORTANT: Return the updated row
                    .single();

                if (error) throw error;
                savedProduct = data;

                // Update local state immediately
                setProducts(prev => prev.map(p => p.id === savedProduct.id ? savedProduct : p));
                toast.success('Produto atualizado!');
            } else {
                // Insert
                const { data, error } = await supabase
                    .from('produtos')
                    .insert([productData])
                    .select() // IMPORTANT: Return the new row
                    .single();

                if (error) throw error;
                savedProduct = data;

                // Add to local state
                setProducts(prev => [...prev, savedProduct]);
                toast.success('Produto criado!');
            }

            setIsModalOpen(false);

        } catch (error) {
            console.error('Error saving product:', error);
            toast.error(`Erro ao salvar: ${error.message}`);
        } finally {
            setUploading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('Tem certeza que deseja excluir este produto?')) return;

        try {
            const { error } = await supabase
                .from('produtos')
                .delete()
                .eq('id', id);

            if (error) throw error;
            setProducts(prev => prev.filter(p => p.id !== id));
            toast.success('Produto excluído.');
        } catch (error) {
            console.error('Error deleting:', error);
            toast.error('Erro ao excluir produto.');
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <Button variant="primary" onClick={() => handleOpenModal()}>
                    <Plus size={20} /> Novo Produto
                </Button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '1.5rem' }}>
                {products.length === 0 && !loading && (
                    <p style={{ opacity: 0.5, gridColumn: '1/-1', textAlign: 'center', padding: '2rem' }}>
                        Nenhum produto cadastrado.
                    </p>
                )}

                {products.map(product => (
                    <div key={product.id} className="glass" style={{ padding: '1.5rem', borderRadius: '15px', position: 'relative', display: 'flex', flexDirection: 'column', gap: '1rem' }}>

                        {/* Image */}
                        <div style={{ height: '180px', background: 'rgba(255,255,255,0.02)', borderRadius: '10px', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            {product.image_url ? (
                                <img src={product.image_url} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                            ) : (
                                <ImageIcon size={40} opacity={0.3} />
                            )}
                        </div>

                        {/* Info */}
                        <div style={{ flex: 1 }}>
                            <h3 style={{ fontSize: '1.2rem', fontWeight: 'bold', marginBottom: '0.5rem' }} className="text-gradient">{product.name}</h3>
                            <p style={{ fontSize: '0.9rem', opacity: 0.7, marginBottom: '0.5rem', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                {product.description}
                            </p>
                            {Number(product.price) > 0 ? (
                                <p className="text-gradient" style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>
                                    R$ {parseFloat(product.price).toFixed(2).replace('.', ',')}
                                </p>
                            ) : (
                                <p style={{ fontSize: '0.9rem', color: '#888', fontStyle: 'italic' }}>
                                    Sem Preço
                                </p>
                            )}
                        </div>

                        {/* Actions */}
                        <div style={{ display: 'flex', gap: '0.5rem', marginTop: 'auto' }}>
                            <Button variant="outline" style={{ flex: 1, justifyContent: 'center' }} onClick={() => handleOpenModal(product)}>
                                <Pencil size={16} /> Editar
                            </Button>
                            <button
                                onClick={() => handleDelete(product.id)}
                                style={{ background: 'rgba(255, 77, 77, 0.1)', border: '1px solid rgba(255, 77, 77, 0.3)', color: '#FF4D4D', borderRadius: '50px', width: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                            >
                                <Trash2 size={18} />
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.8)', zIndex: 9999,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem'
                }}>
                    <div className="glass" style={{ width: '100%', maxWidth: '500px', padding: '2rem', borderRadius: '20px', position: 'relative', maxHeight: '90vh', overflowY: 'auto' }}>
                        <button
                            onClick={() => setIsModalOpen(false)}
                            style={{ position: 'absolute', top: '20px', right: '20px', background: 'transparent', color: 'white' }}
                        >
                            <X size={24} />
                        </button>

                        <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '2rem' }}>
                            {editingProduct ? 'Editar Produto' : 'Novo Produto'}
                        </h2>

                        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

                            {/* Image Upload */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                <label style={{ fontSize: '0.9rem', opacity: 0.8 }}>Imagem do Produto</label>
                                <label style={{
                                    height: '150px', border: '2px dashed rgba(255,255,255,0.2)', borderRadius: '10px',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                                    background: 'rgba(255,255,255,0.02)', overflow: 'hidden', position: 'relative'
                                }}>
                                    {imagePreview ? (
                                        <img src={imagePreview} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                                    ) : (
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', opacity: 0.5 }}>
                                            <Upload size={24} />
                                            <span>Clique para enviar</span>
                                        </div>
                                    )}
                                    <input type="file" accept="image/*" onChange={handleFileChange} style={{ display: 'none' }} />
                                </label>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                <label style={{ fontSize: '0.9rem', opacity: 0.8 }}>Nome do Produto</label>
                                <input
                                    type="text"
                                    required
                                    value={name}
                                    onChange={e => setName(e.target.value)}
                                    style={{ padding: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: 'white', outline: 'none' }}
                                />
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                <label style={{ fontSize: '0.9rem', opacity: 0.8 }}>Descrição</label>
                                <textarea
                                    rows="3"
                                    value={description}
                                    onChange={e => setDescription(e.target.value)}
                                    style={{ padding: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: 'white', outline: 'none', resize: 'vertical' }}
                                />
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                <label style={{ fontSize: '0.9rem', opacity: 0.8 }}>Preço (R$) - Opcional</label>
                                <div style={{ display: 'flex', gap: '10px' }}>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={price}
                                        onChange={e => setPrice(e.target.value)}
                                        placeholder="0.00"
                                        style={{ flex: 1, padding: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: 'white', outline: 'none' }}
                                    />
                                    <Button type="button" variant="outline" onClick={() => setPrice(0)} title="Remover preço">
                                        <Trash2 size={18} />
                                    </Button>
                                </div>
                                <span style={{ fontSize: '0.8rem', opacity: 0.5 }}>Deixe em branco ou clique na lixeira para ocultar o preço.</span>
                            </div>

                            <Button type="submit" variant="primary" style={{ marginTop: '1rem', justifyContent: 'center' }} disabled={uploading}>
                                {uploading ? 'Salvando...' : 'Salvar Produto'}
                            </Button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminProducts;
