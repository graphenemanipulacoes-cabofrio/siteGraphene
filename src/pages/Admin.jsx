import { useState } from 'react';
import { Package, Plus, Trash, LogOut } from 'lucide-react';
import Button from '../components/Button';
import Card from '../components/Card';
import { Link } from 'react-router-dom';

const Admin = () => {
    const [products, setProducts] = useState([
        { id: 1, name: 'Imunidade Blindada', category: 'Imunidade', price: 'R$ 89,90' },
        { id: 2, name: 'NeuroFocus Pro', category: 'Foco', price: 'R$ 129,90' },
        { id: 3, name: 'Deep Sleep', category: 'Sono', price: 'R$ 79,90' },
    ]);

    const [newProduct, setNewProduct] = useState({ name: '', category: '', price: '' });

    const handleAddProduct = (e) => {
        e.preventDefault();
        if (!newProduct.name) return;
        setProducts([...products, { id: Date.now(), ...newProduct }]);
        setNewProduct({ name: '', category: '', price: '' });
    };

    const removeProduct = (id) => {
        setProducts(products.filter(p => p.id !== id));
    };

    return (
        <div style={{ display: 'grid', gridTemplateColumns: '250px 1fr', minHeight: '100vh', background: 'var(--bg-dark)' }}>
            {/* Sidebar */}
            <aside className="glass" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>GRAPHÈNE</h2>
                <nav style={{ display: 'flex', flexDirection: 'column', gap: '1rem', flex: 1 }}>
                    <Button variant="glass" style={{ justifyContent: 'flex-start' }}><Package size={18} /> Produtos</Button>
                </nav>
                <Link to="/">
                    <Button variant="outline" style={{ justifyContent: 'flex-start', width: '100%' }}><LogOut size={18} /> Sair</Button>
                </Link>
            </aside>

            {/* Main Content */}
            <main style={{ padding: '3rem' }}>
                <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3rem' }}>
                    <h1 className="text-gradient">Gerenciar Produtos</h1>
                    <span>Admin</span>
                </header>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                    {/* List */}
                    <Card title="Produtos Ativos">
                        <ul style={{ listStyle: 'none' }}>
                            {products.map(p => (
                                <li key={p.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '1rem', borderBottom: '1px solid rgba(255,255,255,0.05)', alignItems: 'center' }}>
                                    <div>
                                        <strong>{p.name}</strong> <span style={{ opacity: 0.7, fontSize: '0.9rem' }}>({p.category})</span>
                                    </div>
                                    <button onClick={() => removeProduct(p.id)} style={{ background: 'transparent', color: '#ff4d4d' }}>
                                        <Trash size={18} />
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </Card>

                    {/* Add Form */}
                    <Card title="Adicionar Novo">
                        <form onSubmit={handleAddProduct} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <input
                                placeholder="Nome do Produto"
                                value={newProduct.name}
                                onChange={e => setNewProduct({ ...newProduct, name: e.target.value })}
                                style={{ padding: '10px', background: 'rgba(255,255,255,0.05)', border: 'none', color: 'white', borderRadius: '5px' }}
                            />
                            <input
                                placeholder="Categoria"
                                value={newProduct.category}
                                onChange={e => setNewProduct({ ...newProduct, category: e.target.value })}
                                style={{ padding: '10px', background: 'rgba(255,255,255,0.05)', border: 'none', color: 'white', borderRadius: '5px' }}
                            />
                            <Button type="submit" variant="primary" style={{ justifyContent: 'center' }}>
                                <Plus size={18} /> Adicionar
                            </Button>
                        </form>
                    </Card>
                </div>
            </main>
        </div>
    );
};

export default Admin;
