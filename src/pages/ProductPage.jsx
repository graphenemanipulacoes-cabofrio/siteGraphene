import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ShoppingBag, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '../lib/supabaseClient';
import StoreLayout from '../components/StoreLayout';
import { useStore } from '../context/StoreContext';
import { money } from '../utils/commerce';
import '../styles/purchase.css';

export default function ProductPage() {
    const { id } = useParams();
    const { addItem } = useStore();
    const navigate = useNavigate();
    const [result, setResult] = useState({ id: null, product: null, error: '' });
    useEffect(() => {
        let active = true;
        supabase.from('produtos').select('*').eq('id', id).maybeSingle().then(({ data, error }) => {
            if (active) setResult({ id, product: data, error: error ? 'Não foi possível carregar este produto.' : data ? '' : 'Produto não encontrado.' });
        });
        return () => { active = false; };
    }, [id]);
    const product = result.id === id ? result.product : null;
    const buy = checkout => {
        if (!addItem(product)) return;
        if (checkout) navigate('/checkout');
        else toast.success('Adicionado ao carrinho', { description: product.name, duration: 2500 });
    };
    const hasPrice = Number(product?.price) > 0;
    return <StoreLayout><section className="purchase-page"><div className="purchase-container">
        <Link to="/#produtos" className="purchase-back"><ArrowLeft size={16} /> Continuar comprando</Link>
        {!product ? <div className="purchase-empty" role="status"><h1>{result.id === id ? result.error : 'Carregando produto…'}</h1><Link to="/#produtos">Ver produtos</Link></div> :
            <div className="purchase-product">
                <div className="purchase-product-photo"><img src={product.image_url || '/assets/logo.png'} alt={product.name} /></div>
                <div><span className="purchase-eyebrow">Graphène • Farmácia de manipulação</span><h1>{product.name}</h1><p className="purchase-description">{product.description}</p>
                    <div className="purchase-product-price"><small>Preço por unidade</small><strong>{hasPrice ? money(product.price) : 'Preço não informado'}</strong></div>
                    <div className="purchase-product-actions"><button className="purchase-primary" disabled={!hasPrice} onClick={() => buy(true)}>Comprar agora <ArrowRight size={18} /></button><button className="purchase-secondary" disabled={!hasPrice} onClick={() => buy(false)}><ShoppingBag size={18} /> Adicionar ao carrinho</button></div>
                    <p className="purchase-hint">Adicione ao carrinho e continue escolhendo seus produtos.</p><Link to="/carrinho" className="purchase-text-link">Ver meu carrinho</Link>
                </div>
            </div>}
    </div></section></StoreLayout>;
}
