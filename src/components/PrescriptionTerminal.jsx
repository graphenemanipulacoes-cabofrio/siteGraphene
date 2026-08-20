import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { config, getWhatsAppUrl } from '../config';
import { toast } from 'sonner';
import { UploadCloud, X, MessageCircle, ShieldCheck, User, Phone, FileText, FileUp } from 'lucide-react';

const PrescriptionTerminal = () => {
    const [loading, setLoading] = useState(false);
    const [files, setFiles] = useState([]);
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [phone, setPhone] = useState('');
    const [notes, setNotes] = useState('');
    const [isDragOver, setIsDragOver] = useState(false);

    useEffect(() => {
        return () => {
            files.forEach(f => {
                if (f.url) URL.revokeObjectURL(f.url);
            });
        };
    }, [files]);

    const handlePhoneChange = (e) => {
        let value = e.target.value.replace(/\D/g, '');
        if (value.length > 11) value = value.slice(0, 11);
        if (value.length > 2) value = `(${value.slice(0, 2)}) ${value.slice(2)}`;
        if (value.length > 9) value = `${value.slice(0, 10)}-${value.slice(10)}`;
        setPhone(value);
    };

    const processFiles = (fileList) => {
        const newFiles = Array.from(fileList);
        if (files.length + newFiles.length > config.MAX_FILES) {
            toast.error(`Limite máximo de ${config.MAX_FILES} arquivos.`);
            return;
        }

        const validFiles = newFiles.filter(file => {
            if (!config.ALLOWED_FILE_TYPES.includes(file.type)) {
                toast.error(`Formato "${file.name}" não aceito. Use JPG, PNG ou PDF.`);
                return false;
            }
            if (file.size > config.MAX_FILE_SIZE) {
                toast.error(`"${file.name}" excede o tamanho máximo de 5MB.`);
                return false;
            }
            return true;
        });

        if (validFiles.length === 0) return;

        const newFileObjects = validFiles.map(file => ({
            file,
            id: Math.random().toString(36).substr(2, 9),
            url: file.type.startsWith('image/') ? URL.createObjectURL(file) : null,
            name: file.name,
            size: (file.size / 1024).toFixed(0) + ' KB',
            isPdf: file.type === 'application/pdf'
        }));

        setFiles(prev => [...prev, ...newFileObjects]);
        toast.success(`${validFiles.length} arquivo(s) adicionado(s)!`);
    };

    const handleFileInput = (e) => {
        if (e.target.files && e.target.files.length > 0) {
            processFiles(e.target.files);
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setIsDragOver(false);
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            processFiles(e.dataTransfer.files);
        }
    };

    const removeFile = (id) => {
        setFiles(prev => {
            const f = prev.find(item => item.id === id);
            if (f?.url) URL.revokeObjectURL(f.url);
            return prev.filter(item => item.id !== id);
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        if (!firstName.trim() || !lastName.trim() || !phone || phone.length < 14) {
            toast.error('Preencha seu nome e um número de WhatsApp válido.');
            setLoading(false);
            return;
        }

        if (files.length === 0 && !notes.trim()) {
            toast.error('Anexe a receita médica ou descreva a fórmula.');
            setLoading(false);
            return;
        }

        try {
            const uploadedUrls = [];
            for (const fileObj of files) {
                const fileExt = fileObj.name.split('.').pop();
                const safeName = `${Date.now()}_${Math.random().toString(36).substr(2, 6)}.${fileExt}`;
                const { error: uploadError } = await supabase.storage
                    .from('receitas')
                    .upload(safeName, fileObj.file);

                if (uploadError) throw uploadError;

                const { data: urlData } = supabase.storage
                    .from('receitas')
                    .getPublicUrl(safeName);

                uploadedUrls.push(urlData.publicUrl);
            }

            const { error: insertError } = await supabase.from('solicitacoes').insert([{
                nome_cliente: `${firstName.trim()} ${lastName.trim()}`,
                whatsapp: phone,
                arquivo_url: JSON.stringify(uploadedUrls),
                observacoes: notes.trim() || null
            }]);

            if (insertError) throw insertError;

            toast.success('Receita enviada com sucesso! Nossos farmacêuticos responderão no seu WhatsApp.');
            setFiles([]);
            setFirstName('');
            setLastName('');
            setPhone('');
            setNotes('');
        } catch (err) {
            console.error('Erro:', err);
            toast.error('Erro no envio. Por favor, envie pelo nosso WhatsApp.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <section id="terminal" className="section clean-prescription-section">
            <div className="container-narrow">
                <div className="clean-section-header">
                    <div className="clean-pill">
                        <span>Atendimento Farmacêutico</span>
                    </div>
                    <h2>Envie sua <span className="highlight-blue">Receita Médica</span></h2>
                    <p>
                        Anexe o arquivo ou foto da prescrição médica. Nossa equipe em Cabo Frio validará as dosagens e enviará o orçamento oficial no WhatsApp.
                    </p>
                </div>

                <div className="clean-card clean-form-card">
                    <form onSubmit={handleSubmit} className="clean-form-body">
                        <div className="form-row-2">
                            <div className="form-group">
                                <label><User size={14} /> Nome *</label>
                                <input
                                    type="text"
                                    placeholder="Ex: Carlos"
                                    value={firstName}
                                    onChange={(e) => setFirstName(e.target.value)}
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label><User size={14} /> Sobrenome *</label>
                                <input
                                    type="text"
                                    placeholder="Ex: Silveira"
                                    value={lastName}
                                    onChange={(e) => setLastName(e.target.value)}
                                    required
                                />
                            </div>
                        </div>

                        <div className="form-group">
                            <label><Phone size={14} /> WhatsApp com DDD *</label>
                            <input
                                type="tel"
                                placeholder="(22) 99999-9999"
                                value={phone}
                                onChange={handlePhoneChange}
                                required
                            />
                        </div>

                        {/* Dropzone */}
                        <div className="form-group">
                            <label><FileText size={14} /> Arquivo da Receita Médica (PDF, JPG ou PNG)</label>
                            <div
                                className={`clean-dropzone ${isDragOver ? 'clean-dropzone--active' : ''}`}
                                onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                                onDragLeave={(e) => { e.preventDefault(); setIsDragOver(false); }}
                                onDrop={handleDrop}
                            >
                                <input
                                    type="file"
                                    id="recipeFileClean"
                                    onChange={handleFileInput}
                                    multiple
                                    accept=".jpg,.jpeg,.png,.pdf"
                                    className="clean-file-input"
                                />
                                <label htmlFor="recipeFileClean" className="clean-drop-label">
                                    <UploadCloud size={28} color="var(--brand-blue)" />
                                    <strong>Clique ou arraste sua receita aqui</strong>
                                    <span>Formatos: PDF, JPG ou PNG (Máximo 5MB)</span>
                                </label>
                            </div>
                        </div>

                        {/* File Chips */}
                        {files.length > 0 && (
                            <div className="clean-chips-box">
                                {files.map(f => (
                                    <div key={f.id} className="clean-chip">
                                        <div className="chip-text">
                                            <span>{f.name}</span>
                                            <small>{f.size}</small>
                                        </div>
                                        <button type="button" onClick={() => removeFile(f.id)} className="chip-remove">
                                            <X size={14} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}

                        <div className="form-group">
                            <label>Observações (Opcional)</label>
                            <textarea
                                rows="3"
                                placeholder="Preferências de dosagem, sabor, cápsula vegetal..."
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                            />
                        </div>

                        <button
                            type="submit"
                            className="btn-primary form-submit-btn"
                            disabled={loading}
                        >
                            {loading ? (
                                <span>Enviando dados...</span>
                            ) : (
                                <>
                                    <FileUp size={18} />
                                    <span>Enviar Receita para Orçamento</span>
                                </>
                            )}
                        </button>

                        <div className="form-wa-direct">
                            <span>Prefere enviar direto pelo mensageiro?</span>
                            <a
                                href={getWhatsAppUrl('Olá, gostaria de enviar minha receita médica pelo WhatsApp para cotação.')}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="form-wa-link"
                            >
                                <MessageCircle size={16} />
                                <span>Enviar no WhatsApp: (22) 99936-1256</span>
                            </a>
                        </div>
                    </form>
                </div>
            </div>

            <style>{`
                .clean-prescription-section {
                    position: relative;
                }

                .clean-form-card {
                    padding: 36px;
                }

                .clean-form-body {
                    display: flex;
                    flex-direction: column;
                    gap: 18px;
                }

                .form-row-2 {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 18px;
                }

                .form-group {
                    display: flex;
                    flex-direction: column;
                    gap: 6px;
                }

                .form-group label {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    font-size: 0.82rem;
                    font-weight: 600;
                    color: var(--text-dim);
                }

                .form-group input,
                .form-group textarea {
                    width: 100%;
                    padding: 12px 16px;
                    border-radius: var(--radius-sm);
                    border: 1px solid var(--border-card);
                    background: rgba(8, 9, 13, 0.8);
                    color: #ffffff;
                    font-size: 0.95rem;
                    outline: none;
                    transition: var(--transition);
                }

                .form-group input:focus,
                .form-group textarea:focus {
                    border-color: var(--brand-blue);
                }

                .clean-dropzone {
                    position: relative;
                    border: 1.5px dashed var(--border-card);
                    border-radius: var(--radius-sm);
                    background: rgba(255, 255, 255, 0.02);
                    text-align: center;
                    transition: var(--transition);
                }

                .clean-dropzone:hover,
                .clean-dropzone--active {
                    border-color: var(--brand-blue);
                    background: rgba(0, 180, 216, 0.04);
                }

                .clean-file-input {
                    position: absolute;
                    inset: 0;
                    opacity: 0;
                    cursor: pointer;
                    z-index: 2;
                }

                .clean-drop-label {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 6px;
                    padding: 24px 16px;
                    cursor: pointer;
                }

                .clean-drop-label strong {
                    font-size: 0.9rem;
                    color: var(--text-white);
                }

                .clean-drop-label span {
                    font-size: 0.76rem;
                    color: var(--text-muted);
                }

                .clean-chips-box {
                    display: flex;
                    flex-direction: column;
                    gap: 6px;
                }

                .clean-chip {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    background: rgba(255, 255, 255, 0.04);
                    border: 1px solid var(--border-subtle);
                    padding: 8px 12px;
                    border-radius: var(--radius-sm);
                }

                .chip-text {
                    display: flex;
                    flex-direction: column;
                    font-size: 0.82rem;
                }

                .chip-text small {
                    color: var(--text-muted);
                }

                .chip-remove {
                    background: none;
                    border: none;
                    color: var(--text-muted);
                    cursor: pointer;
                }

                .chip-remove:hover {
                    color: #ef4444;
                }

                .form-submit-btn {
                    width: 100%;
                    padding: 15px;
                    font-size: 0.95rem;
                }

                .form-wa-direct {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 4px;
                    padding-top: 14px;
                    border-top: 1px solid var(--border-subtle);
                    text-align: center;
                }

                .form-wa-direct span {
                    font-size: 0.8rem;
                    color: var(--text-muted);
                }

                .form-wa-link {
                    display: inline-flex;
                    align-items: center;
                    gap: 6px;
                    color: var(--brand-green);
                    font-weight: 700;
                    font-size: 0.88rem;
                }

                .form-wa-link:hover {
                    text-decoration: underline;
                }

                @media (max-width: 640px) {
                    .form-row-2 { grid-template-columns: 1fr; }
                    .clean-form-card { padding: 22px 16px; }
                }
            `}</style>
        </section>
    );
};

export default PrescriptionTerminal;
