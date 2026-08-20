import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient.ts';
import { config, getWhatsAppUrl } from '../config';
import { toast, Toaster } from 'sonner';
import Header from '../components/Header';
import Footer from '../components/Footer';
import FloatingWhatsApp from '../components/FloatingWhatsApp';
import { UploadCloud, X, MessageCircle, User, Phone, FileText, FileUp } from 'lucide-react';

const ReceitaPage = () => {
    const [loading, setLoading] = useState(false);
    const [files, setFiles] = useState([]);
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [phone, setPhone] = useState('');
    const [notes, setNotes] = useState('');
    const [isDragOver, setIsDragOver] = useState(false);

    useEffect(() => {
        return () => { files.forEach(f => { if (f.url) URL.revokeObjectURL(f.url); }); };
    }, [files]);

    const handlePhoneChange = (e) => {
        let v = e.target.value.replace(/\D/g, '');
        if (v.length > 11) v = v.slice(0, 11);
        if (v.length > 2) v = `(${v.slice(0, 2)}) ${v.slice(2)}`;
        if (v.length > 9) v = `${v.slice(0, 10)}-${v.slice(10)}`;
        setPhone(v);
    };

    const processFiles = (fileList) => {
        const newFiles = Array.from(fileList);
        if (files.length + newFiles.length > config.MAX_FILES) { toast.error(`Máximo ${config.MAX_FILES} arquivos.`); return; }
        const valid = newFiles.filter(file => {
            if (!config.ALLOWED_FILE_TYPES.includes(file.type)) { toast.error(`"${file.name}" não aceito. Use JPG, PNG ou PDF.`); return false; }
            if (file.size > config.MAX_FILE_SIZE) { toast.error(`"${file.name}" excede 5MB.`); return false; }
            return true;
        });
        if (!valid.length) return;
        const objs = valid.map(file => ({
            file, id: Math.random().toString(36).substr(2, 9),
            url: file.type.startsWith('image/') ? URL.createObjectURL(file) : null,
            name: file.name, size: (file.size / 1024).toFixed(0) + ' KB',
        }));
        setFiles(prev => [...prev, ...objs]);
        toast.success(`${valid.length} arquivo(s) adicionado(s)!`);
    };

    const handleDrop = (e) => { e.preventDefault(); setIsDragOver(false); if (e.dataTransfer.files?.length) processFiles(e.dataTransfer.files); };
    const removeFile = (id) => { setFiles(prev => { const f = prev.find(i => i.id === id); if (f?.url) URL.revokeObjectURL(f.url); return prev.filter(i => i.id !== id); }); };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        if (!firstName.trim() || !lastName.trim() || !phone || phone.length < 14) { toast.error('Preencha nome e WhatsApp válido.'); setLoading(false); return; }
        if (!files.length && !notes.trim()) { toast.error('Anexe a receita ou descreva a fórmula.'); setLoading(false); return; }
        try {
            const urls = [];
            for (const f of files) {
                const ext = f.name.split('.').pop();
                const safeName = `${Date.now()}_${Math.random().toString(36).substr(2, 6)}.${ext}`;
                const { error } = await supabase.storage.from('receitas').upload(safeName, f.file);
                if (error) throw error;
                const { data } = supabase.storage.from('receitas').getPublicUrl(safeName);
                urls.push(data.publicUrl);
            }
            const { error } = await supabase.from('solicitacoes').insert([{
                nome_cliente: `${firstName.trim()} ${lastName.trim()}`, whatsapp: phone,
                arquivo_url: JSON.stringify(urls), observacoes: notes.trim() || null
            }]);
            if (error) throw error;
            toast.success('Receita enviada! Responderemos no seu WhatsApp.');
            setFiles([]); setFirstName(''); setLastName(''); setPhone(''); setNotes('');
        } catch (err) { console.error(err); toast.error('Erro no envio. Envie pelo WhatsApp.'); }
        finally { setLoading(false); }
    };

    return (
        <div className="page-root">
            <Toaster position="top-right" richColors />
            <Header />
            <main>
                <section className="page-hero">
                    <div className="container">
                        <div className="store-badge"><span>Atendimento Farmacêutico</span></div>
                        <h1>Envie sua <span className="highlight-blue">Receita Médica</span></h1>
                        <p>Anexe a foto ou PDF da prescrição. Nossa equipe farmacêutica em Cabo Frio validará as dosagens e enviará o orçamento oficial no seu WhatsApp.</p>
                    </div>
                </section>

                <section className="store-section" style={{ paddingTop: 0 }}>
                    <div className="container-narrow">
                        <div className="store-card form-card">
                            <form onSubmit={handleSubmit} className="form-body">
                                <div className="form-row-2">
                                    <div className="fg"><label><User size={14} /> Nome *</label><input type="text" placeholder="Carlos" value={firstName} onChange={(e) => setFirstName(e.target.value)} required /></div>
                                    <div className="fg"><label><User size={14} /> Sobrenome *</label><input type="text" placeholder="Silveira" value={lastName} onChange={(e) => setLastName(e.target.value)} required /></div>
                                </div>
                                <div className="fg"><label><Phone size={14} /> WhatsApp com DDD *</label><input type="tel" placeholder="(22) 99999-9999" value={phone} onChange={handlePhoneChange} required /></div>

                                <div className="fg">
                                    <label><FileText size={14} /> Receita (PDF, JPG ou PNG)</label>
                                    <div className={`dropzone ${isDragOver ? 'dropzone--active' : ''}`}
                                        onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                                        onDragLeave={(e) => { e.preventDefault(); setIsDragOver(false); }}
                                        onDrop={handleDrop}>
                                        <input type="file" id="recipeFile" onChange={(e) => e.target.files?.length && processFiles(e.target.files)} multiple accept=".jpg,.jpeg,.png,.pdf" className="file-input" />
                                        <label htmlFor="recipeFile" className="drop-label">
                                            <UploadCloud size={28} color="var(--brand-blue)" />
                                            <strong>Clique ou arraste sua receita</strong>
                                            <span>PDF, JPG ou PNG • Máximo 5MB</span>
                                        </label>
                                    </div>
                                </div>

                                {files.length > 0 && (
                                    <div className="chips">{files.map(f => (
                                        <div key={f.id} className="chip"><div className="chip-t"><span>{f.name}</span><small>{f.size}</small></div>
                                            <button type="button" onClick={() => removeFile(f.id)} className="chip-x"><X size={14} /></button>
                                        </div>
                                    ))}</div>
                                )}

                                <div className="fg"><label>Observações (Opcional)</label><textarea rows="3" placeholder="Preferências de dosagem, sabor, veículo..." value={notes} onChange={(e) => setNotes(e.target.value)} /></div>

                                <button type="submit" className="btn-cta-blue form-submit" disabled={loading}>
                                    {loading ? 'Enviando...' : <><FileUp size={18} /> Enviar Receita para Orçamento</>}
                                </button>

                                <div className="wa-fallback">
                                    <span>Prefere enviar direto?</span>
                                    <a href={getWhatsAppUrl('Olá, gostaria de enviar minha receita pelo WhatsApp.')} target="_blank" rel="noopener noreferrer" className="wa-fallback-link">
                                        <MessageCircle size={16} /> WhatsApp: (22) 99936-1256
                                    </a>
                                </div>
                            </form>
                        </div>
                    </div>
                </section>
            </main>
            <Footer />
            <FloatingWhatsApp />

            <style>{`
                .page-hero { padding: 60px 0 40px; text-align: center; }
                .page-hero h1 { font-size: clamp(2rem, 3.5vw, 2.8rem); font-weight: 800; margin: 10px 0; }
                .page-hero p { font-size: 1.05rem; color: var(--text-dim); max-width: 640px; margin: 0 auto; }

                .form-card { padding: 36px; }
                .form-body { display: flex; flex-direction: column; gap: 18px; }
                .form-row-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; }
                .fg { display: flex; flex-direction: column; gap: 6px; }
                .fg label { display: flex; align-items: center; gap: 6px; font-size: 0.82rem; font-weight: 600; color: var(--text-dim); }
                .fg input, .fg textarea { width: 100%; padding: 12px 16px; border-radius: var(--radius-sm); border: 1px solid var(--border-card); background: rgba(8,9,13,0.8); color: #fff; font-size: 0.95rem; outline: none; transition: var(--transition); font-family: var(--font-sans); }
                .fg input:focus, .fg textarea:focus { border-color: var(--brand-blue); }

                .dropzone { position: relative; border: 1.5px dashed var(--border-card); border-radius: var(--radius-sm); background: rgba(255,255,255,0.02); transition: var(--transition); }
                .dropzone:hover, .dropzone--active { border-color: var(--brand-blue); background: rgba(0,180,216,0.04); }
                .file-input { position: absolute; inset: 0; opacity: 0; cursor: pointer; z-index: 2; }
                .drop-label { display: flex; flex-direction: column; align-items: center; gap: 6px; padding: 28px 16px; cursor: pointer; }
                .drop-label strong { font-size: 0.9rem; }
                .drop-label span { font-size: 0.76rem; color: var(--text-muted); }

                .chips { display: flex; flex-direction: column; gap: 6px; }
                .chip { display: flex; align-items: center; justify-content: space-between; background: rgba(255,255,255,0.04); border: 1px solid var(--border-subtle); padding: 8px 12px; border-radius: var(--radius-sm); }
                .chip-t { display: flex; flex-direction: column; font-size: 0.82rem; }
                .chip-t small { color: var(--text-muted); }
                .chip-x { background: none; border: none; color: var(--text-muted); cursor: pointer; }
                .chip-x:hover { color: #ef4444; }

                .form-submit { width: 100%; padding: 15px; font-size: 0.95rem; }

                .wa-fallback { display: flex; flex-direction: column; align-items: center; gap: 4px; padding-top: 14px; border-top: 1px solid var(--border-subtle); text-align: center; }
                .wa-fallback span { font-size: 0.8rem; color: var(--text-muted); }
                .wa-fallback-link { display: inline-flex; align-items: center; gap: 6px; color: var(--brand-green); font-weight: 700; font-size: 0.88rem; }

                @media (max-width: 640px) { .form-row-2 { grid-template-columns: 1fr; } .form-card { padding: 22px 16px; } }
            `}</style>
        </div>
    );
};

export default ReceitaPage;
