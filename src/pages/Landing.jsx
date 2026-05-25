import { useState, useEffect } from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { supabase } from '../lib/supabaseClient';
import HeroSection from '../components/HeroSection';
import ProductCarousel from '../components/ProductCarousel';
import { config } from '../config';
import { toast } from 'sonner';
import { ShieldCheck, Clock, Pill, Send } from 'lucide-react';

const SectionHeader = ({ label, title, description }) => (
    <div className="section-header">
        <span className="section-label">{label}</span>
        <h2>{title}</h2>
        <p>{description}</p>
    </div>
);

const FeatureCard = ({ icon, title, text }) => (
    <div className="feature-card">
        <div className="feature-icon">{icon}</div>
        <h3>{title}</h3>
        <p>{text}</p>
    </div>
);

const Landing = () => {
    const [loading, setLoading] = useState(false);
    const [feedback, setFeedback] = useState({ type: '', message: '' });
    const [files, setFiles] = useState([]);
    const [phone, setPhone] = useState('');

    useEffect(() => {
        return () => {
            files.forEach(file => {
                if (file.url) URL.revokeObjectURL(file.url);
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

    const handleFileChange = (e) => {
        const newFiles = Array.from(e.target.files);
        if (files.length + newFiles.length > config.MAX_FILES) {
            setFeedback({ type: 'error', message: `Limite de ${config.MAX_FILES} arquivos.` });
            return;
        }

        const validFiles = newFiles.filter(file => {
            if (!config.ALLOWED_FILE_TYPES.includes(file.type)) {
                toast.error('Apenas JPG, PNG e PDF.');
                return false;
            }
            if (file.size > config.MAX_FILE_SIZE) {
                toast.error('Arquivo excede 5MB.');
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
        }));
        setFiles(prev => [...prev, ...newFileObjects]);
        setFeedback({ type: '', message: '' });
    };

    const removeFile = (id) => {
        setFiles(prev => {
            const fileToRemove = prev.find(f => f.id === id);
            if (fileToRemove?.url) URL.revokeObjectURL(fileToRemove.url);
            return prev.filter(f => f.id !== id);
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setFeedback({ type: '', message: '' });

        const formData = new FormData(e.target);
        const firstName = formData.get('firstName');
        const lastName = formData.get('lastName');

        if (!files.length || !firstName || !lastName || !phone) {
            setFeedback({ type: 'error', message: 'Preencha todos os campos e anexe sua receita.' });
            setLoading(false);
            return;
        }

        if (phone.length < 14) {
            setFeedback({ type: 'error', message: 'Telefone inválido.' });
            setLoading(false);
            return;
        }

        try {
            const uploadedUrls = [];
            for (const fileObj of files) {
                const fileExt = fileObj.name.split('.').pop();
                const safeName = `${Date.now()}_${Math.random().toString(36).substr(2, 5)}.${fileExt}`;
                const { error } = await supabase.storage.from('receitas').upload(safeName, fileObj.file);
                if (error) throw error;
                const { data } = supabase.storage.from('receitas').getPublicUrl(safeName);
                uploadedUrls.push(data.publicUrl);
            }

            const { error } = await supabase.from('solicitacoes').insert([{
                nome_cliente: `${firstName} ${lastName}`,
                whatsapp: phone,
                arquivo_url: JSON.stringify(uploadedUrls),
            }]);
            if (error) throw error;

            setFeedback({ type: 'success', message: 'Enviado com sucesso! Entraremos em contato.' });
            setFiles([]);
            setPhone('');
            e.target.reset();
        } catch (err) {
            setFeedback({ type: 'error', message: 'Erro ao enviar: ' + err.message });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="page-wrapper">
            <Header />
            <main>
                <HeroSection />

                {/* Pilares Científicos */}
                <section id="solutions" className="section section-dark">
                    <div className="container">
                        <div className="section-header">
                            <span className="section-label">Especialidades</span>
                            <h2>Áreas de Atuação e Manipulação</h2>
                        </div>
                        <div className="bento-grid">

                            <div className="bento-card bento-small">
                                <h3 className="bento-title">Nutrição Esportiva</h3>
                                <p className="bento-text">Suplementos alimentares de alta performance, aminoácidos e fitoterápicos personalizados para otimização metabólica e muscular sob prescrição clínica.</p>
                            </div>

                            <div className="bento-card bento-small">
                                <h3 className="bento-title">Saúde e Longevidade</h3>
                                <p className="bento-text">Modulação de minerais, vitaminas essenciais e adaptógenos para o equilíbrio fisiológico, fortalecimento imunológico e longevidade saudável.</p>
                            </div>

                            <div className="bento-card bento-small">
                                <h3 className="bento-title">Dermocosméticos</h3>
                                <p className="bento-text">Fórmulas dermatológicas de uso tópico e nutricosméticos orais com ativos de alta permeabilidade para cuidados avançados de pele, cabelos e unhas.</p>
                            </div>

                            <div className="bento-card bento-medium">
                                <h3 className="bento-title">Suporte e Equilíbrio Hormonal</h3>
                                <p className="bento-text">Compostos específicos para regulação de distúrbios hormonais, equilíbrio do sono e alívio de sintomas decorrentes de transições metabólicas.</p>
                            </div>

                            <div className="bento-card bento-medium">
                                <h3 className="bento-title">Gerenciamento de Peso</h3>
                                <p className="bento-text">Fórmulas auxiliares no controle da saciedade, aceleração metabólica e melhora da sensibilidade à insulina, prescritas individualmente.</p>
                            </div>

                            <div className="bento-card bento-large" style={{ border: '1px solid rgba(14, 165, 233, 0.2)', background: 'linear-gradient(135deg, var(--bg-dark-secondary) 0%, rgba(14, 165, 233, 0.05) 100%)' }}>
                                <div style={{ padding: '8px' }}>
                                    <span className="section-label" style={{ marginBottom: '8px' }}>Garantia de Rigor</span>
                                    <h3 className="bento-title" style={{ fontSize: '1.75rem', marginBottom: '16px' }}>Excelência Farmacêutica e Matérias-Primas Certificadas</h3>
                                    <p className="bento-text" style={{ maxWidth: '640px', marginBottom: '24px' }}>
                                        Seguimos as diretrizes mais rígidas da ANVISA. Nossos insumos passam por controle de qualidade em laboratório próprio para garantir a exata dosagem e pureza de cada princípio ativo prescrito.
                                    </p>
                                    <button className="btn-submit" style={{ maxWidth: '280px', borderRadius: 'var(--radius-sm)' }} onClick={() => document.getElementById('form').scrollIntoView({ behavior: 'smooth' })}>
                                        Enviar Minha Receita
                                    </button>
                                </div>
                            </div>

                        </div>
                    </div>
                </section>

                <section id="products" className="section section--alt">
                    <div className="container">
                        <SectionHeader
                            label="Fórmulas Disponíveis"
                            title="Nosso Portfólio sob Prescrição"
                            description="Conheça alguns dos medicamentos e suplementos individualizados mais solicitados por especialistas."
                        />
                        <ProductCarousel />
                    </div>
                </section>

                <section id="how-it-works" className="section">
                    <div className="container">
                        <SectionHeader
                            label="Procedimento"
                            title="Como Solicitar sua Fórmula"
                            description="Um processo seguro e ágil para a cotação e manipulação do seu medicamento."
                        />
                        <div className="steps-grid">
                            {[
                                { step: '1', title: 'Envio da Receita', text: 'Envie uma foto legível ou o arquivo PDF da sua receita diretamente pelo site ou canal do WhatsApp.' },
                                { step: '2', title: 'Análise Farmacêutica', text: 'Nossa equipe técnica valida as dosagens, interações medicamentosas e calcula o orçamento em poucos minutos.' },
                                { step: '3', title: 'Manipulação e Controle', text: 'Após a sua aprovação, o medicamento é preparado em nossos laboratórios seguindo rigorosas normas de higiene.' },
                                { step: '4', title: 'Entrega ou Retirada', text: 'Retire diretamente em nossa unidade em Cabo Frio ou receba com toda comodidade no endereço de sua preferência.' },
                            ].map((item, i) => (
                                <div key={i} className="step-card">
                                    <span className="step-number">{item.step}</span>
                                    <h3>{item.title}</h3>
                                    <p>{item.text}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                <section id="form" className="section section-dark">
                    <div className="container">
                        <div className="form-wrapper">
                            <div className="section-header" style={{ marginBottom: '32px' }}>
                                <span className="section-label">Canal Direto</span>
                                <h2>Solicite seu Orçamento</h2>
                                <p style={{ color: 'var(--text-light)', fontSize: '0.95rem' }}>Anexe sua prescrição médica e nossa equipe técnica retornará com a cotação oficial diretamente no seu WhatsApp.</p>
                            </div>
                            <form onSubmit={handleSubmit} className="form-fields">
                                <div className="form-row">
                                    <input name="firstName" placeholder="Nome" required />
                                    <input name="lastName" placeholder="Sobrenome" required />
                                </div>
                                <input placeholder="WhatsApp (DDD) 99999-9999" value={phone} onChange={handlePhoneChange} required />

                                <div className="upload-area">
                                    <div style={{ marginBottom: '0.5rem', display: 'flex', justifyContent: 'center' }}>
                                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="1.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
                                    </div>
                                    <strong>SELECIONAR ARQUIVO DA RECEITA</strong>
                                    <span style={{ fontSize: '0.8rem' }}>Formatos aceitos: PDF, JPG ou PNG (Máximo de {config.MAX_FILES} arquivos)</span>
                                    <input type="file" onChange={handleFileChange} multiple accept=".jpg,.jpeg,.png,.pdf" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }} />
                                </div>

                                {files.length > 0 && (
                                    <div className="file-list" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(68px, 1fr))', gap: '8px', marginTop: '12px' }}>
                                        {files.map(f => (
                                            <div key={f.id} className="file-item" style={{ position: 'relative', height: '68px', border: '1px solid rgba(14, 165, 233, 0.2)', background: 'rgba(255,255,255,0.05)', borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                {f.url ? <img src={f.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: '0.7rem', color: 'var(--text-light)' }}>PDF</span>}
                                                <button type="button" onClick={() => removeFile(f.id)} style={{ position: 'absolute', top: '2px', right: '2px', background: 'rgba(239, 68, 68, 0.9)', color: 'white', border: 'none', borderRadius: '50%', width: '18px', height: '18px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>&times;</button>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {feedback.message && (
                                    <div className={`form-feedback form-feedback--${feedback.type}`} style={{ padding: '16px', background: feedback.type === 'error' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(14, 165, 233, 0.1)', color: feedback.type === 'error' ? '#fca5a5' : 'var(--primary-light)', border: `1px solid ${feedback.type === 'error' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(14, 165, 233, 0.2)'}`, borderRadius: 'var(--radius-sm)', textAlign: 'center', margin: '16px 0', fontSize: '0.9rem' }}>
                                        {feedback.message}
                                    </div>
                                )}

                                <button type="submit" className="btn-submit" disabled={loading} style={{ width: '100%', padding: '16px', marginTop: '12px', borderRadius: 'var(--radius-sm)' }}>
                                    {loading ? 'Enviando...' : 'Enviar receita'}
                                </button>
                            </form>
                        </div>
                    </div>
                </section>
            </main>
            <Footer />

            <style>{`
                .page-wrapper { display: flex; flex-direction: column; min-height: 100vh; }
                main { flex: 1; }

                .section { padding: var(--section-lg) 0; }
                .section--alt { background: var(--bg-section); }
                .section--dark { background: var(--bg-dark); color: #fff; }

                .section-header { text-align: center; margin-bottom: 48px; }
                .section-header .label { display: inline-block; font-size: 0.75rem; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; color: var(--primary); margin-bottom: 12px; }
                .section--dark .section-header .label { color: var(--primary-400); }
                .section-header h2 { font-size: clamp(1.75rem, 3vw, 2.25rem); font-weight: 800; letter-spacing: -0.3px; line-height: 1.2; margin-bottom: 10px; }
                .section--dark .section-header h2 { color: #fff; }
                .section-header p { font-size: 1rem; color: var(--text-secondary); max-width: 500px; margin: 0 auto; line-height: 1.6; }
                .section--dark .section-header p { color: var(--text-light); }

                .features-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; }
                .feature-card { background: var(--bg-card); border: 1px solid var(--border-light); border-radius: var(--radius-xl); padding: 32px 28px; transition: box-shadow var(--transition-base); }
                .feature-card:hover { box-shadow: var(--shadow-lg); }
                .feature-icon { width: 48px; height: 48px; border-radius: var(--radius-md); background: var(--primary-50); color: var(--primary); display: flex; align-items: center; justify-content: center; margin-bottom: 20px; }
                .feature-card h3 { font-size: 1.1rem; font-weight: 700; margin-bottom: 8px; }
                .feature-card p { font-size: 0.93rem; color: var(--text-secondary); line-height: 1.6; }

                .steps-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 28px; }
                .step-card { text-align: center; }
                .step-number { display: inline-flex; width: 44px; height: 44px; align-items: center; justify-content: center; border-radius: 50%; background: var(--primary); color: #fff; font-size: 1rem; font-weight: 700; margin-bottom: 14px; }
                .step-card h3 { font-size: 1rem; font-weight: 700; margin-bottom: 6px; }
                .step-card p { font-size: 0.88rem; color: var(--text-secondary); line-height: 1.5; }

                .form-wrapper { max-width: 580px; margin: 0 auto; }
                .form-header { text-align: center; margin-bottom: 28px; }
                .form-label { display: inline-flex; align-items: center; gap: 6px; font-size: 0.75rem; font-weight: 700; letter-spacing: 2px; color: var(--primary-400); text-transform: uppercase; margin-bottom: 12px; }
                .form-header h2 { font-size: clamp(1.4rem, 3vw, 1.8rem); font-weight: 800; margin-bottom: 8px; }
                .form-header p { font-size: 0.93rem; color: var(--text-light); line-height: 1.5; }

                .form-fields { display: grid; gap: 14px; }
                .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
                .form-fields input { width: 100%; padding: 13px 15px; border: 1.5px solid rgba(255,255,255,0.1); border-radius: var(--radius-md); background: rgba(255,255,255,0.06); color: #fff; font-size: 0.93rem; font-family: var(--font-sans); outline: none; transition: border-color var(--transition-base); }
                .form-fields input:focus { border-color: var(--primary); }
                .form-fields input::placeholder { color: rgba(255,255,255,0.4); }

                .upload-area { position: relative; border: 1.5px dashed rgba(255,255,255,0.15); border-radius: var(--radius-lg); padding: 28px; text-align: center; cursor: pointer; transition: all var(--transition-base); }
                .upload-area:hover { border-color: var(--primary); }
                .upload-area .upload-icon { font-size: 1.8rem; display: block; margin-bottom: 6px; }
                .upload-area strong { display: block; font-size: 0.9rem; margin-bottom: 2px; }
                .upload-area span { font-size: 0.8rem; color: var(--text-light); }
                .upload-area input[type="file"] { position: absolute; inset: 0; opacity: 0; cursor: pointer; }

                .file-list { display: grid; grid-template-columns: repeat(auto-fill, minmax(68px, 1fr)); gap: 8px; }
                .file-item { position: relative; height: 68px; border-radius: var(--radius-sm); overflow: hidden; border: 1px solid rgba(255,255,255,0.1); background: rgba(255,255,255,0.05); display: flex; align-items: center; justify-content: center; }
                .file-item img { width: 100%; height: 100%; object-fit: cover; }
                .file-item button { position: absolute; top: 3px; right: 3px; width: 18px; height: 18px; border-radius: 50%; background: rgba(239,68,68,0.9); color: #fff; border: none; font-size: 0.7rem; font-weight: 700; cursor: pointer; display: flex; align-items: center; justify-content: center; line-height: 1; }

                .form-feedback { padding: 12px 16px; border-radius: var(--radius-md); font-size: 0.88rem; font-weight: 600; text-align: center; }
                .form-feedback--success { background: rgba(16,185,129,0.15); border: 1px solid var(--primary); color: var(--primary-400); }
                .form-feedback--error { background: rgba(239,68,68,0.1); border: 1px solid rgba(239,68,68,0.3); color: #fca5a5; }

                .btn-submit { width: 100%; padding: 15px; border-radius: var(--radius-full); background: var(--primary); color: #fff; font-size: 0.95rem; font-weight: 700; font-family: var(--font-sans); border: none; cursor: pointer; transition: all var(--transition-base); }
                .btn-submit:hover { background: var(--primary-dark); transform: translateY(-1px); }
                .btn-submit:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }

                @media (max-width: 900px) {
                    .features-grid { grid-template-columns: 1fr; }
                    .steps-grid { grid-template-columns: repeat(2, 1fr); gap: 24px; }
                    .form-row { grid-template-columns: 1fr; }
                }
                @media (max-width: 480px) {
                    .steps-grid { grid-template-columns: 1fr; gap: 20px; }
                }
            `}</style>
        </div>
    );
};

export default Landing;
