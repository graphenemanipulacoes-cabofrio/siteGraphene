import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Check, ShoppingBag, Zap } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import StoreLayout from '../components/StoreLayout';
import { useStore } from '../context/StoreContext';

const ProductPage = () => {
    const { id } = useParams();
    const location = useLocation();
    const { addItem, customer } = useStore();
    const navigate = useNavigate();
    const [product, setProduct] = useState(location.state?.product || null);
    const [added, setAdded] = useState(false);
    useEffect(() => { if (product) return; supabase.from('produtos').select('*').eq('id', id).maybeSingle().then(({ data }) => data && setProduct({ ...data, id: String(data.id), price: data.price ? Number(data.price) : null })); }, [id, product]);
    if (!product) return <StoreLayout><section className="product-loading">Carregando produto...</section></StoreLayout>;
    const price = Number(String(product.price ?? '').replace(',', '.'));
    const hasPrice = Number.isFinite(price) && price > 0;
    const continueTo = (destination, intent) => {
        if (!customer) { navigate('/entrar', { state: { returnTo: destination, intent, pendingProduct: product } }); return; }
        addItem(product); setAdded(true); navigate(destination);
    };
    return <StoreLayout><section className="product-page"><div className="container product-container"><Link to="/#produtos" className="product-back"><ArrowLeft size={16}/> Voltar aos produtos</Link><div className="product-detail"><div className="product-photo store-card"><img src={product.image_url} alt={product.name}/></div><div className="product-copy"><span className="eyebrow">Graphène seleciona</span><h1>{product.name}</h1><p>{product.description}</p><ul><li><Check size={16}/> Fórmula e procedência verificadas</li><li><Check size={16}/> Envio para todo o Brasil</li></ul>{hasPrice && <strong className="product-detail-price">R$ {price.toLocaleString('pt-BR',{minimumFractionDigits:2})}</strong>}<div className="product-purchase-actions"><button className="add-detail add-detail--outline" onClick={() => continueTo('/carrinho', 'cart')}><ShoppingBag size={18}/>{added ? 'Adicionado ao carrinho' : 'Adicionar ao carrinho'}</button><button className="add-detail" onClick={() => continueTo('/checkout', 'checkout')}><Zap size={17}/> Comprar agora</button></div><Link to="/carrinho" className="go-cart">Ver meu carrinho</Link></div></div></div></section><style>{productStyles}</style></StoreLayout>;
};
const productStyles = `.product-page{min-height:70vh;padding:45px 0 80px}.product-container{max-width:1000px}.product-back{display:inline-flex;align-items:center;gap:6px;color:var(--text-dim);font-weight:700;font-size:.84rem;margin-bottom:24px}.product-detail{display:grid;grid-template-columns:1fr 1fr;gap:52px;align-items:center}.product-photo{min-height:430px;padding:35px;display:grid;place-items:center;background:linear-gradient(145deg,#fff,#e8f2f5)}.product-photo img{width:100%;max-height:360px;object-fit:contain}.product-copy h1{font-size:clamp(2rem,4vw,3rem);margin:5px 0 14px}.product-copy>p{line-height:1.7}.product-copy ul{list-style:none;display:grid;gap:8px;margin:22px 0;color:var(--text-dim);font-size:.86rem}.product-copy li{display:flex;align-items:center;gap:8px}.product-copy li svg{color:var(--brand-green)}.product-detail-price{display:block;font-size:1.75rem;margin:20px 0;color:#fff}.product-purchase-actions{display:grid;grid-template-columns:1fr 1fr;gap:10px}.add-detail{width:100%;border:0;padding:15px;border-radius:10px;background:var(--brand-green);color:#fff;font-size:.92rem;font-weight:800;display:flex;align-items:center;justify-content:center;gap:8px;cursor:pointer;transition:var(--transition)}.add-detail:hover{filter:brightness(1.08);transform:translateY(-1px)}.add-detail--outline{background:rgba(0,180,216,.08);border:1px solid var(--border-blue);color:var(--brand-blue)}.go-cart{display:block;text-align:center;color:var(--brand-blue);font-size:.84rem;font-weight:700;margin-top:14px}.quote-detail{border:1px solid var(--border-blue);background:rgba(0,180,216,.06);padding:17px;border-radius:10px;margin-top:20px}.quote-detail p{font-size:.82rem;margin-top:4px}.product-loading{min-height:65vh;display:grid;place-items:center;color:var(--text-dim)}@media(max-width:720px){.product-page{padding:30px 0 55px}.product-detail{grid-template-columns:1fr;gap:28px}.product-photo{min-height:280px;padding:23px}.product-photo img{max-height:245px}}@media(max-width:420px){.product-purchase-actions{grid-template-columns:1fr}}
`;
export default ProductPage;
