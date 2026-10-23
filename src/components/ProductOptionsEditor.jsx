import { useState } from 'react';
import { Plus, Trash2, X, Check, Settings2 } from 'lucide-react';
import '../styles/product-options-editor.css';

// Editor de quantidades e sabores de um produto.
// value = { sizes: [{ label, price }], flavors: [ids], natural, flavorPrice }
// Os sabores vêm de um catálogo único: incluir ou excluir vale para todos os produtos;
// aqui o farmacêutico só liga ou desliga cada sabor neste produto.
const presets = {
    'Cápsulas': ['30 cápsulas', '60 cápsulas', '90 cápsulas', '120 cápsulas'],
    'Pó': ['150 g', '300 g', '500 g'],
    'Sachês': ['30 sachês', '60 sachês'],
    'Gomas': ['30 gomas', '60 gomas'],
    'Líquido': ['30 ml', '60 ml', '100 ml'],
    'Creme/gel': ['30 g', '60 g', '100 g'],
};

export default function ProductOptionsEditor({ value, onChange, catalog, onAddFlavor, onRemoveFlavor }) {
    const [newFlavor, setNewFlavor] = useState('');
    const [managing, setManaging] = useState(false);
    const [busy, setBusy] = useState(false);
    const set = changes => onChange({ ...value, ...changes });

    const updateSize = (index, changes) => set({ sizes: value.sizes.map((size, position) => position === index ? { ...size, ...changes } : size) });
    const removeSize = index => set({ sizes: value.sizes.filter((_, position) => position !== index) });
    const addSize = label => set({ sizes: [...value.sizes, { label: label || '', price: '' }] });
    const applyPreset = labels => {
        const existing = new Set(value.sizes.map(size => size.label.trim().toLowerCase()));
        set({ sizes: [...value.sizes, ...labels.filter(label => !existing.has(label)).map(label => ({ label, price: '' }))] });
    };
    const toggleFlavor = id => set({ flavors: value.flavors.includes(id) ? value.flavors.filter(flavor => flavor !== id) : [...value.flavors, id] });

    // Fica dentro do formulário do produto: Enter inclui o sabor sem salvar o produto.
    const addFlavor = async () => {
        if (!newFlavor.trim() || busy) return;
        setBusy(true);
        const flavor = await onAddFlavor(newFlavor.trim());
        setBusy(false);
        if (flavor) { setNewFlavor(''); set({ flavors: [...value.flavors, flavor.id] }); }
    };
    const removeFlavor = async flavor => {
        if (!confirm(`Excluir o sabor "${flavor.name}" de TODOS os produtos?`)) return;
        setBusy(true);
        const removed = await onRemoveFlavor(flavor.id);
        setBusy(false);
        if (removed) set({ flavors: value.flavors.filter(id => id !== flavor.id) });
    };

    const activeCount = value.flavors.filter(id => catalog.some(flavor => flavor.id === id)).length + (value.natural ? 1 : 0);

    return <div className="poe">
        <section className="poe-section" aria-labelledby="poe-sizes">
            <div className="poe-head">
                <h3 id="poe-sizes">Quantidades</h3>
                <p>O cliente é obrigado a escolher uma. Quantidade sem preço não aparece na loja.</p>
            </div>
            {value.sizes.length > 0 && <div className="poe-sizes">
                {value.sizes.map((size, index) => <div className="poe-size" key={index}>
                    <input aria-label={`Quantidade ${index + 1}`} placeholder="Ex.: 60 cápsulas" value={size.label} maxLength={40} onChange={event => updateSize(index, { label: event.target.value })} />
                    <label className="poe-money"><span>R$</span><input aria-label={`Preço de ${size.label || 'quantidade ' + (index + 1)}`} type="number" min="0" step="0.01" inputMode="decimal" placeholder="Sem preço" value={size.price ?? ''} onChange={event => updateSize(index, { price: event.target.value })} /></label>
                    <button type="button" className="poe-icon" onClick={() => removeSize(index)} aria-label={`Remover ${size.label || 'quantidade'}`}><Trash2 size={16} /></button>
                </div>)}
            </div>}
            <div className="poe-actions">
                <button type="button" className="poe-chip-button" onClick={() => addSize('')}><Plus size={15} /> Adicionar quantidade</button>
                {Object.entries(presets).map(([name, labels]) => <button type="button" key={name} className="poe-preset" onClick={() => applyPreset(labels)}>{name}</button>)}
            </div>
            {value.sizes.length === 0 && <p className="poe-note">Sem quantidades: o produto usa o preço único abaixo.</p>}
        </section>

        <section className="poe-section" aria-labelledby="poe-flavors">
            <div className="poe-head">
                <h3 id="poe-flavors">Sabores <span>{activeCount ? `${activeCount} ativo${activeCount > 1 ? 's' : ''}` : 'nenhum ativo'}</span></h3>
                <p>Toque para ativar ou desativar neste produto. Com algum sabor ativo, o cliente é obrigado a escolher.</p>
            </div>
            <div className="poe-flavors">
                <button type="button" aria-pressed={value.natural} className={`poe-flavor${value.natural ? ' is-on' : ''}`} onClick={() => set({ natural: !value.natural })}>
                    {value.natural ? <Check size={14} /> : <Plus size={14} />} Natural (sem sabor)
                </button>
                {catalog.map(flavor => {
                    const on = value.flavors.includes(flavor.id);
                    return <button type="button" key={flavor.id} aria-pressed={on} className={`poe-flavor${on ? ' is-on' : ''}`} onClick={() => toggleFlavor(flavor.id)}>
                        {on ? <Check size={14} /> : <Plus size={14} />} {flavor.name}
                    </button>;
                })}
            </div>
            <label className="poe-extra">
                <span>Acréscimo no preço quando o cliente escolhe um sabor</span>
                <span className="poe-money"><span>R$</span><input type="number" min="0" step="0.01" inputMode="decimal" placeholder="0,00" value={value.flavorPrice ?? ''} onChange={event => set({ flavorPrice: event.target.value })} /></span>
            </label>
            <button type="button" className="poe-manage-toggle" aria-expanded={managing} onClick={() => setManaging(open => !open)}><Settings2 size={15} /> {managing ? 'Fechar lista de sabores' : 'Incluir ou excluir sabores da lista'}</button>
            {managing && <div className="poe-manage">
                <p className="poe-note">A lista vale para todos os produtos. Um sabor novo fica disponível em todos, mas só aparece na loja onde estiver ativo.</p>
                <div className="poe-new">
                    <input aria-label="Nome do novo sabor" placeholder="Ex.: Chocolate" value={newFlavor} maxLength={40} onChange={event => setNewFlavor(event.target.value)} onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); addFlavor(); } }} />
                    <button type="button" className="poe-chip-button" disabled={busy || !newFlavor.trim()} onClick={addFlavor}><Plus size={15} /> Incluir sabor</button>
                </div>
                <ul className="poe-catalog">
                    {catalog.map(flavor => <li key={flavor.id}><span>{flavor.name}</span><button type="button" className="poe-icon" disabled={busy} onClick={() => removeFlavor(flavor)} aria-label={`Excluir ${flavor.name} de todos os produtos`}><X size={15} /></button></li>)}
                </ul>
            </div>}
        </section>
    </div>;
}
