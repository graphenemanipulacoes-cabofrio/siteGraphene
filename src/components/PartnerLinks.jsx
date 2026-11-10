import { useEffect, useId, useState } from 'react';
import { Copy, Link2, LoaderCircle } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '../lib/supabaseClient';
import { fetchShowcase, saveShowcase } from '../lib/showcaseApi';
import { partnerLink, partnerProductLink } from '../utils/couponDisplay';
import '../styles/partnerLinks.css';

const LIMIT = 12;

async function copyText(text, done) {
    try {
        await navigator.clipboard.writeText(text);
        toast.success(done);
    } catch {
        toast.error('Não foi possível copiar. Selecione o link e copie manualmente.');
    }
}

// Painel da parceira: link geral com o cupom aplicado, link de cada produto e a escolha
// dos produtos que aparecem primeiro para quem chega pelo link dela.
export default function PartnerLinks({ code, partnerId, adminView = false }) {
    const id = useId();
    const [products, setProducts] = useState([]);
    const [status, setStatus] = useState('loading');
    const [selected, setSelected] = useState([]);
    const [saved, setSaved] = useState([]);
    const [productId, setProductId] = useState('');
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        let active = true;
        (async () => {
            try {
                const [{ data, error }, showcase] = await Promise.all([
                    supabase.from('produtos').select('id,name').order('display_order', { ascending: true, nullsFirst: false }).order('created_at', { ascending: true }),
                    fetchShowcase(code),
                ]);
                if (error) throw error;
                if (!active) return;
                setProducts((data || []).map(item => ({ id: String(item.id), name: item.name })));
                setSelected(showcase);
                setSaved(showcase);
                setStatus('ready');
            } catch {
                if (!active) return;
                setStatus('error');
                toast.error('Não foi possível carregar os produtos. Atualize a página.');
            }
        })();
        return () => { active = false; };
    }, [code]);

    const toggle = productKey => setSelected(current => current.includes(productKey)
        ? current.filter(item => item !== productKey)
        : current.length >= LIMIT ? current : [...current, productKey]);
    const changed = selected.join(',') !== saved.join(',');
    const save = async () => {
        setSaving(true);
        try {
            const stored = await saveShowcase(selected, partnerId);
            setSelected(stored);
            setSaved(stored);
            toast.success(stored.length ? 'Seleção salva. Ela já aparece no seu link.' : 'Seleção removida do seu link.');
        } catch (failure) {
            toast.error(failure.message);
        } finally {
            setSaving(false);
        }
    };

    return <section className="partner-links" aria-labelledby={`${id}-title`}>
        <div className="section-title-wrap">
            <Link2 size={18} color="#69e2f5" aria-hidden="true" />
            <div>
                <h3 id={`${id}-title`}>Links para divulgar</h3>
                <p>Quem entra por eles já chega com o cupom {code} aplicado.</p>
            </div>
        </div>

        <div className="partner-links-card">
            <label htmlFor={`${id}-general`}>Link geral, para a bio e os stories</label>
            <div className="partner-links-row">
                <input id={`${id}-general`} readOnly value={partnerLink(code)} onFocus={event => event.target.select()} />
                <button type="button" onClick={() => copyText(partnerLink(code), 'Link copiado.')}><Copy size={15} aria-hidden="true" /> Copiar link</button>
            </div>
            <small>Abre a loja com o desconto aplicado e mostra primeiro os produtos que você destacar abaixo.</small>
        </div>

        <div className="partner-links-card">
            <label htmlFor={`${id}-product`}>Link de um produto</label>
            <div className="partner-links-row">
                <select id={`${id}-product`} value={productId} onChange={event => setProductId(event.target.value)} disabled={status !== 'ready'}>
                    <option value="">{status === 'loading' ? 'Carregando produtos…' : 'Escolha o produto'}</option>
                    {products.map(product => <option key={product.id} value={product.id}>{product.name}</option>)}
                </select>
                <button type="button" disabled={!productId} onClick={() => copyText(partnerProductLink(code, productId), 'Link do produto copiado.')}><Copy size={15} aria-hidden="true" /> Copiar link</button>
            </div>
            <small>Use quando mostrar um produto: a pessoa abre direto a página dele, já com o desconto.</small>
        </div>

        <div className="partner-links-card">
            <div className="partner-links-head">
                <strong id={`${id}-picks`}>Produtos em destaque no seu link</strong>
                <span aria-live="polite">{selected.length} de {LIMIT}</span>
            </div>
            <p>Marque os produtos que você mostra. Eles aparecem primeiro no link geral, na ordem em que você marcar.</p>
            {status === 'error' ? <p role="alert">Não foi possível carregar os produtos. Atualize a página.</p> :
                <div className="partner-links-grid" role="group" aria-labelledby={`${id}-picks`}>
                    {products.map(product => {
                        const position = selected.indexOf(product.id) + 1;
                        return <label key={product.id} className={position ? 'is-on' : ''}>
                            <input type="checkbox" checked={position > 0} disabled={saving || (!position && selected.length >= LIMIT)} onChange={() => toggle(product.id)} />
                            <span>{product.name}</span>
                            {position > 0 && <b aria-label={`Posição ${position}`}>{position}</b>}
                        </label>;
                    })}
                </div>}
            <div className="partner-links-actions">
                <button type="button" className="is-primary" disabled={!changed || saving || status !== 'ready'} onClick={save} aria-busy={saving}>
                    {saving ? <LoaderCircle size={15} className="spin" aria-hidden="true" /> : null} Salvar seleção
                </button>
                {adminView && <small>Você está alterando como administrador. A alteração fica no registro de ações.</small>}
            </div>
        </div>
    </section>;
}
