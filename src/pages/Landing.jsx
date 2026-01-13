import { useState } from 'react';
import Header from '../components/Header';
import { supabase } from '../lib/supabaseClient';
import HeroSection from '../components/HeroSection';
import ProductCarousel from '../components/ProductCarousel';
import Footer from '../components/Footer';
import Card from '../components/Card';
import Button from '../components/Button';
import { Battery, Shield, Brain, Moon, FileText, CheckCircle, Plus, X } from 'lucide-react';

const Landing = () => {
    const [loading, setLoading] = useState(false);
    const [feedback, setFeedback] = useState({ type: '', message: '' });
    const [files, setFiles] = useState([]);
    const [phone, setPhone] = useState('');

    const handlePhoneChange = (e) => {
        let value = e.target.value.replace(/\D/g, '');
        if (value.length > 11) value = value.slice(0, 11);
        if (value.length > 2) value = `(${value.slice(0, 2)}) ${value.slice(2)}`;
        if (value.length > 9) value = `${value.slice(0, 10)}-${value.slice(10)}`;
        setPhone(value);
    };

    const handleFileChange = (e) => {
        const newFiles = Array.from(e.target.files);
        if (files.length + newFiles.length > 15) {
            setFeedback({ type: 'error', message: 'Você pode enviar no máximo 15 arquivos.' });
            return;
        }
        const newFileObjects = newFiles.map(file => ({
            file,
            id: Math.random().toString(36).substr(2, 9),
            url: file.type.startsWith('image/') ? URL.createObjectURL(file) : null,
            name: file.name,
            type: file.type
        }));
        setFiles(prev => [...prev, ...newFileObjects]);
        setFeedback({ type: '', message: '' });
    };

    const removeFile = (id) => {
        setFiles(prev => prev.filter(f => f.id !== id));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setFeedback({ type: '', message: '' });

        const formData = new FormData(e.target);
        const firstName = formData.get('firstName');
        const lastName = formData.get('lastName');

        if (files.length === 0 || !firstName || !lastName || !phone) {
            setFeedback({ type: 'error', message: 'Por favor, preencha todos os campos e anexe pelo menos um arquivo.' });
            setLoading(false);
            return;
        }

        if (phone.length < 14) {
            setFeedback({ type: 'error', message: 'Por favor, digite um telefone válido com DDD.' });
            setLoading(false);
            return;
        }

        try {
            const uploadedUrls = [];
            for (const fileObj of files) {
                const fileExt = fileObj.name.split('.').pop();
                const safeFileName = `${Date.now()}_${Math.random().toString(36).substr(2, 5)}.${fileExt}`;
                const { error: uploadError } = await supabase.storage.from('receitas').upload(safeFileName, fileObj.file);
                if (uploadError) throw uploadError;
                const publicUrl = supabase.storage.from('receitas').getPublicUrl(safeFileName).data.publicUrl;
                uploadedUrls.push(publicUrl);
            }
            const fullName = `${firstName} ${lastName}`;
            const { error: insertError } = await supabase.from('solicitacoes').insert([{ nome_cliente: fullName, whatsapp: phone, arquivo_url: JSON.stringify(uploadedUrls) }]);
            if (insertError) throw insertError;
            setFeedback({ type: 'success', message: 'Enviado com sucesso! Entraremos em contato.' });
            setFiles([]); setPhone(''); e.target.reset();
        } catch (error) {
            setFeedback({ type: 'error', message: 'Erro: ' + error.message });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: 'var(--bg-main)' }}>
            <Header />
            <div style={{ flexGrow: 1 }}>
                <HeroSection />

                {/* Section: Solutions / Bento Grid */}
                <section id="solutions" className="landing-section" style={{ padding: '100px 0', position: 'relative' }}>
                    <div className="pattern-sunburst" style={{ position: 'absolute', top: '10%', left: '-5%', width: '400px', height: '400px', opacity: 0.04, zIndex: 0 }} />
                    <div className="container" style={{ position: 'relative', zIndex: 1 }}>
                        <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
                            <div style={{ color: 'var(--primary-blue)', fontWeight: '800', fontSize: '0.8rem', letterSpacing: '2px', marginBottom: '1rem' }}>POR QUE A GRAPHÈNE?</div>
                            <h2 style={{ fontSize: 'clamp(2rem, 4vw, 3rem)', fontWeight: '800', letterSpacing: '-1.5px' }}>Tecnologia de <span style={{ color: 'var(--primary-blue)' }}>Ponta</span> para Você</h2>
                        </div>

                        <div className="bento-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gridAutoRows: 'minmax(280px, auto)', gap: '1.5rem' }}>
                            <div className="glass-card bento-item-large" style={{ gridColumn: 'span 2', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                                <div style={{ width: '60px', height: '60px', background: 'var(--primary-blue)', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', marginBottom: '2rem' }}>
                                    <Shield size={32} />
                                </div>
                                <h3 style={{ fontSize: '2rem', fontWeight: '800', marginBottom: '1rem' }}>Fórmulas de Alta Pureza</h3>
                                <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem', maxWidth: '400px' }}>Matérias-primas premiadas do mercado global, com laudos rigorosos.</p>
                            </div>

                            <div className="glass-card">
                                <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>🔬</div>
                                <h3 style={{ fontSize: '1.5rem', fontWeight: '800', marginBottom: '1rem' }}>Precisão Premium</h3>
                                <p style={{ opacity: 0.7 }}>Desenvolvimento baseado em biotecnologia avançada.</p>
                            </div>

                            <div className="glass-card">
                                <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>⚡</div>
                                <h3 style={{ fontSize: '1.5rem', fontWeight: '800', marginBottom: '1rem' }}>Rápida Entrega</h3>
                                <p style={{ color: 'var(--text-muted)' }}>Produção ágil para você não interromper seu tratamento.</p>
                            </div>

                            <div className="glass-card bento-item-large" style={{ gridColumn: 'span 2', display: 'flex', gap: '2rem', alignItems: 'center' }}>
                                <div style={{ flex: 1 }}>
                                    <h3 style={{ fontSize: '1.8rem', fontWeight: '800', marginBottom: '1rem' }}>Atendimento VIP</h3>
                                    <p style={{ color: 'var(--text-muted)' }}>Fale diretamente com nossos farmacêuticos e tire suas dúvidas em tempo real.</p>
                                    <Button variant="accent" style={{ marginTop: '1.5rem', borderRadius: '12px' }}>FALAR AGORA</Button>
                                </div>
                                <div style={{ width: '150px', height: '150px', background: 'var(--primary-blue-glow)', borderRadius: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '3rem' }}>🩺</div>
                            </div>
                        </div>
                    </div>
                </section>

                <section id="products" className="landing-section" style={{ padding: '100px 0', background: '#fff' }}>
                    <div className="container">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '4rem' }}>
                            <div>
                                <div style={{ color: 'var(--primary-blue)', fontWeight: '800', fontSize: '0.9rem', letterSpacing: '2px', marginBottom: '1rem' }}>PORTFÓLIO</div>
                                <h2 style={{ fontSize: '3rem', fontWeight: '800', letterSpacing: '-1.5px' }}>Fórmulas <span style={{ color: 'var(--primary-blue)' }}>Exclusivas</span></h2>
                            </div>
                            <Button variant="outline" className="desktop-only" style={{ borderRadius: '15px' }}>VER TODAS</Button>
                        </div>
                        <ProductCarousel />
                        <div style={{ display: 'flex', justifyContent: 'center', marginTop: '3rem' }} className="mobile-only">
                            <Button variant="outline" style={{ borderRadius: '15px' }}>VER TODAS</Button>
                        </div>
                    </div>
                </section>

                <section id="how-it-works" className="landing-section" style={{ padding: '100px 0', position: 'relative', background: '#f8fafc' }}>
                    <div className="container">
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '2rem' }}>
                            {[
                                { id: '01', title: 'Envio da Receita', text: 'Mande sua prescrição via site ou WhatsApp.' },
                                { id: '02', title: 'Análise Lab', text: 'Nossos farmacêuticos validam cada detalhe técnico.' },
                                { id: '03', title: 'Manipulação', text: 'Ambiente controlado de alta tecnologia.' },
                                { id: '04', title: 'Entrega ágil', text: 'Sua medicação chega segura em sua casa.' }
                            ].map((step, idx) => (
                                <div key={idx} style={{ padding: '3rem 2rem', borderTop: '2px solid #eee' }}>
                                    <div style={{ color: 'var(--primary-blue)', fontWeight: '900', marginBottom: '1.5rem' }}>{step.id}</div>
                                    <h3 style={{ fontSize: '1.4rem', fontWeight: '800', marginBottom: '1rem' }}>{step.title}</h3>
                                    <p style={{ color: 'var(--text-muted)', lineHeight: '1.6' }}>{step.text}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Formula Request Form */}
                <section className="landing-section" style={{ padding: '100px 0', background: 'var(--text-main)', color: '#fff' }}>
                    <div className="container">
                        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
                            <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
                                <h2 style={{ fontSize: '3rem', fontWeight: '800', marginBottom: '1.5rem' }}>Pronto para seu Melhor?</h2>
                                <p style={{ opacity: 0.7, fontSize: '1.1rem' }}>Anexe sua receita e receba seu orçamento personalizado em minutos.</p>
                            </div>

                            <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '2rem' }}>
                                <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                                    <input name="firstName" placeholder="NOME" required style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', padding: '1.2rem', borderRadius: '12px', color: '#fff' }} />
                                    <input name="lastName" placeholder="SOBRENOME" required style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', padding: '1.2rem', borderRadius: '12px', color: '#fff' }} />
                                </div>
                                <input placeholder="(DDD) 99999-9999" value={phone} onChange={handlePhoneChange} required style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', padding: '1.2rem', borderRadius: '12px', color: '#fff' }} />

                                <div style={{ border: '2px dashed rgba(255,255,255,0.2)', padding: '3rem', borderRadius: '12px', textAlign: 'center', cursor: 'pointer', position: 'relative' }}>
                                    <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>📄</div>
                                    <div style={{ fontWeight: '700' }}>ANEXAR RECEITA ({files.length}/15)</div>
                                    <input type="file" onChange={handleFileChange} multiple style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }} />
                                </div>

                                {files.length > 0 && (
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', gap: '1rem' }}>
                                        {files.map(f => (
                                            <div key={f.id} style={{ position: 'relative', height: '80px', borderRadius: '8px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)' }}>
                                                {f.url ? <img src={f.url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ height: '100%', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>📄</div>}
                                                <button type="button" onClick={() => removeFile(f.id)} style={{ position: 'absolute', top: '2px', right: '2px', background: '#000', color: '#fff', border: 'none', borderRadius: '50%', cursor: 'pointer' }}>×</button>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {feedback.message && (
                                    <div style={{ padding: '1rem', borderRadius: '8px', textAlign: 'center', background: feedback.type === 'success' ? '#10b981' : '#ef4444' }}>{feedback.message}</div>
                                )}

                                <Button variant="accent" type="submit" disabled={loading} style={{ borderRadius: '12px', padding: '1.2rem' }}>
                                    {loading ? 'ENVIANDO...' : 'REQUISITAR ORÇAMENTO'}
                                </Button>
                            </form>
                        </div>
                    </div>
                </section>
            </div>
            <Footer />
            <style>{`
                @media (max-width: 768px) {
                    .landing-section { padding: 60px 0 !important; }
                    .bento-grid { 
                        grid-template-columns: 1fr !important; 
                        gap: 2rem !important; 
                    }
                    .bento-item-large { 
                        grid-column: span 1 !important; 
                        flex-direction: column !important;
                        text-align: center;
                        align-items: center;
                    }
                    .form-row {
                        grid-template-columns: 1fr !important;
                    }
                    .mobile-only { display: flex !important; }
                    .desktop-only { display: none !important; }
                }

                .mobile-only { display: none; }
            `}</style>
        </div>
    );
};

export default Landing;
