import { useEffect, useState } from 'react';
import { Truck, Gift, MapPin, Save, LoaderCircle } from 'lucide-react';
import { toast } from 'sonner';
import Card from './Card';
import { counterRequest } from '../lib/counterApi';
import { loadShippingConfig } from '../utils/shipping';
import { getSession } from '../utils/security';
import { money } from '../utils/commerce';
import '../styles/admin-shipping.css';

// Painel admin > Frete e entrega: frete grátis a partir de um valor e
// preço/prazo por região. O cálculo da loja e do pedido usa estes valores.
export default function AdminShipping({ onUnauthorized }) {
    const [config, setConfig] = useState(null);
    const [freeMin, setFreeMin] = useState('');
    const [zones, setZones] = useState([]);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        loadShippingConfig(true).then(frete => {
            setConfig(frete);
            setFreeMin(frete.free_min ? String(frete.free_min) : '');
            setZones((frete.zones || []).map(zone => ({ ...zone, price: String(zone.price ?? ''), days_min: String(zone.days_min ?? ''), days_max: String(zone.days_max ?? '') })));
        }).catch(() => toast.error('Não foi possível carregar as regras de frete.'));
    }, []);

    const updateZone = (id, changes) => setZones(current => current.map(zone => zone.id === id ? { ...zone, ...changes } : zone));

    const save = async event => {
        event.preventDefault();
        setSaving(true);
        try {
            const data = await counterRequest({
                action: 'shipping_save', sessionToken: getSession()?.token || '',
                frete: { free_min: freeMin === '' ? null : Number(freeMin), zones: zones.map(zone => ({ id: zone.id, price: zone.price === '' ? null : Number(zone.price), days_min: Number(zone.days_min), days_max: Number(zone.days_max) })) },
            });
            setConfig(data.frete);
            loadShippingConfig(true).catch(() => {});
            toast.success('Regras de frete salvas. Já valem na loja.');
        } catch (failure) {
            if (failure.code === 'unauthorized') onUnauthorized?.();
            toast.error(failure.message);
        } finally { setSaving(false); }
    };

    if (!config) return <div className="ship-admin-loading"><LoaderCircle className="spin" size={20} /> Carregando regras de frete…</div>;

    return <form className="ship-admin" onSubmit={save}>
        <Card>
            <div className="ship-admin-head"><Gift size={20} /><div><strong>Frete grátis</strong><span>Pedidos com produtos a partir deste valor não pagam frete. Deixe em branco para não oferecer.</span></div></div>
            <label className="ship-admin-field ship-admin-free">
                <span>Frete grátis a partir de</span>
                <span className="ship-admin-money"><i>R$</i><input type="number" min="0" step="0.01" inputMode="decimal" placeholder="Sem frete grátis" value={freeMin} onChange={event => setFreeMin(event.target.value)} /></span>
            </label>
            <p className="ship-admin-note">{Number(freeMin) > 0 ? `O cliente verá no carrinho e no fechamento: "Frete grátis em compras a partir de ${money(freeMin)}".` : 'Sem valor definido, a loja não mostra aviso de frete grátis.'}</p>
        </Card>

        <Card>
            <div className="ship-admin-head"><Truck size={20} /><div><strong>Preço e prazo por região</strong><span>Calculado pelo CEP do cliente. Prazo em dias úteis.</span></div></div>
            <div className="ship-admin-table" role="table" aria-label="Frete por região">
                <div className="ship-admin-row is-head" role="row"><span role="columnheader">Região</span><span role="columnheader">Preço</span><span role="columnheader">Prazo mínimo</span><span role="columnheader">Prazo máximo</span></div>
                {zones.map(zone => <div className="ship-admin-row" role="row" key={zone.id}>
                    <span role="cell" className="ship-admin-zone"><strong>{zone.label}</strong><small>{(zone.ufs || []).join(', ')}</small></span>
                    <span role="cell" className="ship-admin-money"><i>R$</i><input aria-label={`Preço do frete: ${zone.label}`} type="number" min="0" max="1000" step="0.01" required value={zone.price} onChange={event => updateZone(zone.id, { price: event.target.value })} /></span>
                    <span role="cell"><input aria-label={`Prazo mínimo: ${zone.label}`} type="number" min="0" max="90" step="1" required value={zone.days_min} onChange={event => updateZone(zone.id, { days_min: event.target.value })} /></span>
                    <span role="cell"><input aria-label={`Prazo máximo: ${zone.label}`} type="number" min="0" max="90" step="1" required value={zone.days_max} onChange={event => updateZone(zone.id, { days_max: event.target.value })} /></span>
                </div>)}
            </div>
        </Card>

        <Card>
            <div className="ship-admin-head"><MapPin size={20} /><div><strong>Entrega local</strong><span>Região dos Lagos (CEPs 28890-000 a 28979-999)</span></div></div>
            <p className="ship-admin-note">Nesses CEPs a loja não cobra frete no site e mostra: entrega por motoboy ou retirada na loja, combinada pela equipe pelo WhatsApp depois da compra. Retirada: {config.origin?.address}.</p>
        </Card>

        <div className="ship-admin-actions"><button type="submit" className="ship-admin-save" disabled={saving}>{saving ? <LoaderCircle className="spin" size={18} /> : <Save size={18} />} {saving ? 'Salvando…' : 'Salvar regras de frete'}</button></div>
    </form>;
}
