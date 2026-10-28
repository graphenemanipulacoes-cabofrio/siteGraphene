import { useCallback, useEffect, useMemo, useState } from 'react';
import { LoaderCircle, Save, Search } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '../lib/supabaseClient';
import { getSession } from '../utils/security';

const money = value => Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const percentText = value => `${Number(value).toLocaleString('pt-BR', { maximumFractionDigits: 2 })}%`;

// Desconto do cupom de um parceiro: % geral e % especial em produtos escolhidos.
// O checkout aplica o % do produto quando existir; senão, o geral.
export default function CouponDiscountEditor({ coupon, onCouponChange, onUnauthorized }) {
    const [products, setProducts] = useState([]);
    const [rates, setRates] = useState({});
    const [general, setGeneral] = useState(String(coupon.discount_value ?? ''));
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState('');
    const percentage = coupon.discount_type === 'percentage';

    const invoke = useCallback(async body => {
        const token = getSession()?.token;
        if (!token) { onUnauthorized?.(); return { error: 'unauthorized' }; }
        try {
            const result = await supabase.functions.invoke('admin-coupons', { body, headers: { 'x-admin-token': token } });
            let payload = result.data;
            if (result.error?.context?.clone) { try { payload = await result.error.context.clone().json(); } catch { /* Generic error below. */ } }
            if (payload?.error === 'unauthorized') onUnauthorized?.();
            return { data: payload, error: payload?.error || result.error };
        } catch (error) { return { error }; }
    }, [onUnauthorized]);

    useEffect(() => {
        let active = true;
        Promise.all([
            supabase.from('produtos').select('id,name,price').gt('price', 0).order('name'),
            invoke({ action: 'list' }),
        ]).then(([productsResult, discountsResult]) => {
            if (!active) return;
            if (productsResult.error || discountsResult.error) toast.error('Não foi possível carregar os descontos por produto.');
            setProducts(productsResult.data || []);
            const own = (discountsResult.data?.productDiscounts || []).filter(item => item.coupon_id === coupon.id);
            setRates(Object.fromEntries(own.map(item => [item.product_id, String(Number(item.discount_percent))])));
            setLoading(false);
        }).catch(() => { if (active) { toast.error('Não foi possível carregar os descontos por produto.'); setLoading(false); } });
        return () => { active = false; };
    }, [coupon.id, invoke]);

    const saveGeneral = async event => {
        event.preventDefault();
        const value = Number(String(general).replace(',', '.'));
        if (!Number.isFinite(value) || value <= 0 || (percentage && value > 100)) { toast.error(percentage ? 'Informe um percentual entre 0,01 e 100.' : 'Informe um valor maior que zero.'); return; }
        setBusy('general');
        const result = await invoke({ action: 'update_coupon_discount', id: coupon.id, discountValue: value });
        setBusy('');
        if (result.error) { toast.error('Não foi possível salvar o desconto geral.'); return; }
        onCouponChange?.(result.data.coupon);
        toast.success('Desconto geral atualizado.');
    };

    const saveProducts = async () => {
        const items = [];
        for (const [productId, raw] of Object.entries(rates)) {
            if (String(raw).trim() === '') continue;
            const percent = Number(String(raw).replace(',', '.'));
            if (!Number.isFinite(percent) || percent <= 0 || percent > 100) {
                toast.error(`Confira o desconto de ${products.find(item => String(item.id) === productId)?.name || 'um produto'}: use de 0,01 a 100%.`);
                return;
            }
            items.push({ productId: Number(productId), percent });
        }
        setBusy('products');
        const result = await invoke({ action: 'save_product_discounts', couponId: coupon.id, items });
        setBusy('');
        if (result.error) { toast.error('Não foi possível salvar os descontos por produto.'); return; }
        const saved = result.data.productDiscounts || [];
        setRates(Object.fromEntries(saved.map(item => [item.product_id, String(Number(item.discount_percent))])));
        toast.success(saved.length ? `${saved.length} ${saved.length === 1 ? 'produto com desconto especial' : 'produtos com desconto especial'}.` : 'Todos os produtos seguem o desconto geral.');
    };

    const term = search.trim().toLowerCase();
    const visible = useMemo(() => products.filter(item => !term || item.name.toLowerCase().includes(term)), [products, term]);
    const specialCount = Object.values(rates).filter(value => String(value).trim() !== '').length;
    const generalRate = percentage ? Number(coupon.discount_value) : 0;

    return <div className="coupon-editor">
        <form className="coupon-editor-general" onSubmit={saveGeneral}>
            <label>Desconto geral do cupom {percentage ? '(%)' : '(R$ no total)'}
                <input type="number" min="0.01" max={percentage ? 100 : undefined} step="0.01" value={general} onChange={event => setGeneral(event.target.value)} required />
            </label>
            <button disabled={busy === 'general'}>{busy === 'general' ? <LoaderCircle className="spin" size={16} /> : <Save size={16} />} Salvar</button>
        </form>
        <div className="coupon-editor-head">
            <div><strong>Desconto especial por produto</strong><small>Deixe em branco para usar o desconto geral. {specialCount ? `${specialCount} com desconto especial.` : ''}</small></div>
            <label className="coupon-editor-search"><Search size={15} aria-hidden="true" /><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Buscar produto" aria-label="Buscar produto" /></label>
        </div>
        {loading ? <p className="coupon-editor-empty"><LoaderCircle className="spin" size={16} /> Carregando produtos…</p> : <div className="coupon-editor-list">
            {visible.map(product => {
                const value = rates[product.id] ?? '';
                const rate = String(value).trim() !== '' ? Number(String(value).replace(',', '.')) : generalRate;
                const final = Number.isFinite(rate) && rate > 0 ? Math.round(Number(product.price) * (100 - rate)) / 100 : Number(product.price);
                return <div key={product.id} className={String(value).trim() !== '' ? 'is-special' : ''}>
                    <span><strong>{product.name}</strong><small>{money(product.price)}{rate > 0 && Number.isFinite(rate) ? ` → ${money(final)} com ${percentText(rate)}` : ''}</small></span>
                    <label><input type="number" min="0.01" max="100" step="0.01" inputMode="decimal" value={value} placeholder={percentage ? percentText(generalRate) : 'geral'}
                        onChange={event => setRates(current => ({ ...current, [product.id]: event.target.value }))} aria-label={`Desconto especial de ${product.name} (%)`} />%</label>
                </div>;
            })}
            {!visible.length && <p className="coupon-editor-empty">Nenhum produto encontrado.</p>}
        </div>}
        <button type="button" className="coupon-editor-save" onClick={saveProducts} disabled={loading || busy === 'products'}>
            {busy === 'products' ? <LoaderCircle className="spin" size={16} /> : <Save size={16} />} Salvar descontos por produto
        </button>
    </div>;
}
