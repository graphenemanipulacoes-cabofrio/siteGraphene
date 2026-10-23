import { useCallback, useEffect, useRef, useState } from 'react';
import { Plus, Pencil, Trash2, X, Upload, LoaderCircle, Search, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import { adminMaterialsApi } from '../lib/materialsApi';
import { validateProductImage } from '../lib/productsApi';
import MaterialThumbnail from './MaterialThumbnail';
import '../styles/materials.css';

function MaterialEditor({ material, categories, api, onClose, onSaved }) {
    const [form, setForm] = useState({ name: '', lab: '', category: '', headline: '', description: '', ...material, tags: (material.tags || []).join(', ') });
    const [imageUrl, setImageUrl] = useState(material.image_url || null);
    const [file, setFile] = useState(null);
    const [preview, setPreview] = useState(null);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const dialog = useRef(null);
    const fileInput = useRef(null);
    const objectUrl = useRef(null);
    const busy = useRef(false);
    useEffect(() => {
        const element = dialog.current;
        element.showModal();
        return () => { element.close(); if (objectUrl.current) URL.revokeObjectURL(objectUrl.current); };
    }, []);
    const change = event => setForm(current => ({ ...current, [event.target.name]: event.target.value }));
    const chooseFile = event => {
        const selected = event.target.files?.[0];
        if (!selected) return;
        try {
            validateProductImage(selected);
            if (!selected.size || !['image/jpeg', 'image/png', 'image/webp'].includes(selected.type)) throw new Error('Selecione uma imagem JPG, PNG ou WEBP válida.');
            if (objectUrl.current) URL.revokeObjectURL(objectUrl.current);
            objectUrl.current = URL.createObjectURL(selected);
            setFile(selected); setPreview(objectUrl.current); setError('');
        } catch (failure) { setError(failure.message); }
        event.target.value = '';
    };
    const removeImage = () => {
        if (objectUrl.current) URL.revokeObjectURL(objectUrl.current);
        objectUrl.current = null;
        setFile(null); setPreview(null); setImageUrl(null);
    };
    const submit = async event => {
        event.preventDefault();
        if (busy.current) return;
        const tags = form.tags.split(/[,\n]/).map(value => value.trim()).filter(Boolean);
        if (tags.length > 8 || tags.some(tag => tag.length > 60)) { setError('Use até 8 marcadores, com no máximo 60 caracteres cada.'); return; }
        busy.current = true; setSaving(true); setError('');
        try {
            let uploaded = imageUrl;
            if (file) { uploaded = await api.uploadImage(file); setImageUrl(uploaded); setFile(null); }
            const saved = await api.save({ ...form, tags, image_url: uploaded });
            onSaved(saved);
        } catch (failure) { setError(failure.message || 'Não foi possível salvar. Tente novamente.'); }
        finally { busy.current = false; setSaving(false); }
    };
    return <dialog ref={dialog} className="materials-editor" aria-labelledby="material-editor-title" onCancel={event => { event.preventDefault(); if (!busy.current) onClose(); }}>
        <form onSubmit={submit}>
            <header><div><span>CATÁLOGO DE MATÉRIAS-PRIMAS</span><h2 id="material-editor-title">{material.id ? 'Editar matéria-prima' : 'Nova matéria-prima'}</h2></div><button type="button" className="rm-icon" aria-label="Fechar edição" disabled={saving} onClick={onClose}><X size={20}/></button></header>
            <fieldset disabled={saving}>
                <div className="materials-image-editor"><MaterialThumbnail src={preview || imageUrl} name={form.name} /><div><strong>Imagem da matéria-prima</strong><p>JPG, PNG ou WEBP · até 5 MB. Exibida em miniatura no site.</p><div className="rm-actions"><button type="button" className="rm-btn" onClick={() => fileInput.current?.click()}><Upload size={15}/> {preview || imageUrl ? 'Substituir imagem' : 'Adicionar imagem'}</button>{(preview || imageUrl) && <button type="button" className="rm-btn danger" onClick={removeImage}><Trash2 size={15}/> Remover imagem</button>}</div><input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={chooseFile}/></div></div>
                <div className="materials-fields">
                    <label>Nome<input name="name" autoFocus value={form.name} onChange={change} required maxLength={180}/></label>
                    <label>Fornecedor / laboratório<input name="lab" value={form.lab} onChange={change} maxLength={180}/></label>
                    <label>Categoria<input name="category" list="material-category-list" value={form.category} onChange={change} required maxLength={100} placeholder="Selecione ou digite uma categoria"/><datalist id="material-category-list">{categories.map(category => <option key={category} value={category}/>)}</datalist></label>
                    <label>Título de apresentação<input name="headline" value={form.headline} onChange={change} maxLength={300}/></label>
                    <label className="rm-full">Descrição<textarea name="description" value={form.description} onChange={change} maxLength={4000} rows={4}/></label>
                    <label className="rm-full">Marcadores <small>(opcional · até 8, separados por vírgula)</small><textarea name="tags" value={form.tags} onChange={change} rows={2} maxLength={488} placeholder="Origem vegetal, fornecedor, informações técnicas"/></label>
                </div>
                <p className="rm-note">Publique informações técnicas verificadas. Os campos são informativos e não alteram produtos ou preços da loja.</p>
            </fieldset>
            {error && <p className="rm-error" role="alert">{error}</p>}
            <footer><button type="button" className="rm-btn" disabled={saving} onClick={onClose}>Cancelar</button><button type="submit" className="rm-btn primary" disabled={saving}>{saving && <LoaderCircle size={16} className="spin"/>}{saving ? 'Salvando…' : 'Salvar matéria-prima'}</button></footer>
        </form>
    </dialog>;
}

export default function AdminMaterials({ api = adminMaterialsApi }) {
    const [materials, setMaterials] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [search, setSearch] = useState('');
    const [editor, setEditor] = useState(null);
    const [deleting, setDeleting] = useState(null);
    const load = useCallback(async () => {
        setLoading(true); setError('');
        try { setMaterials(await api.list()); }
        catch (failure) { setError(failure.message); }
        finally { setLoading(false); }
    }, [api]);
    useEffect(() => { let active = true; api.list().then(data => { if (active) setMaterials(data); }).catch(failure => { if (active) setError(failure.message); }).finally(() => { if (active) setLoading(false); }); return () => { active = false; }; }, [api]);
    const remove = async material => {
        if (deleting !== null || !window.confirm(`Excluir "${material.name}" do catálogo público? Essa ação não pode ser desfeita.`)) return;
        setDeleting(material.id);
        try { await api.remove(material.id); setMaterials(current => current.filter(item => item.id !== material.id)); toast.success('Matéria-prima excluída.'); }
        catch (failure) { toast.error(failure.message); }
        finally { setDeleting(null); }
    };
    const normalize = value => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    const filtered = materials.filter(item => normalize(`${item.name} ${item.lab} ${item.category}`).includes(normalize(search)));
    return <section className="materials-panel" aria-label="Gestão de matérias-primas">
        <div className="materials-toolbar"><div><h2>Matérias-primas</h2><p>Edite o catálogo exibido em <Link to="/ativos" target="_blank" rel="noreferrer">Matérias-primas e fornecedores <ExternalLink size={12}/></Link>.</p></div><button className="rm-btn primary" onClick={() => setEditor({})}><Plus size={17}/> Nova matéria-prima</button></div>
        <div className="materials-search"><label><Search size={17}/><input type="search" aria-label="Buscar matéria-prima" placeholder="Buscar por nome, fornecedor ou categoria" value={search} onChange={event => setSearch(event.target.value)}/></label><span>{filtered.length} de {materials.length} cadastros</span></div>
        {error && <div className="rm-error" role="alert">{error} <button className="rm-btn" onClick={load}>Tentar novamente</button></div>}
        {loading ? <p role="status">Carregando matérias-primas…</p> : !error && <div className="materials-list">{filtered.length ? filtered.map(material => <article key={material.id} className="materials-row"><MaterialThumbnail src={material.image_url} name={material.name}/><div className="materials-row-info"><h3>{material.name}</h3><p>{material.lab || 'Fornecedor não informado'}</p><span>{material.category}</span></div><div className="rm-actions"><button className="rm-btn" onClick={() => setEditor(material)}><Pencil size={15}/><span>Editar</span></button><button className="rm-icon danger" aria-label={`Excluir ${material.name}`} disabled={deleting !== null} onClick={() => remove(material)}>{deleting === material.id ? <LoaderCircle size={16} className="spin"/> : <Trash2 size={16}/>}</button></div></article>) : <p className="materials-empty">{search ? 'Nenhuma matéria-prima encontrada para esta busca.' : 'Nenhuma matéria-prima cadastrada. Use “Nova matéria-prima” para começar.'}</p>}</div>}
        {editor && <MaterialEditor key={editor.id || 'new'} material={editor} api={api} categories={[...new Set(materials.map(item => item.category))]} onClose={() => setEditor(null)} onSaved={saved => { setMaterials(current => current.some(item => item.id === saved.id) ? current.map(item => item.id === saved.id ? saved : item) : [...current, saved]); setEditor(null); toast.success('Matéria-prima salva. A alteração já está disponível no site.'); }}/>}
    </section>;
}
