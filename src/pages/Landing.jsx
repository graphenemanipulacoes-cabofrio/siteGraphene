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

        if (value.length > 2) {
            value = `(${value.slice(0, 2)}) ${value.slice(2)}`;
        }
        if (value.length > 9) {
            value = `${value.slice(0, 10)}-${value.slice(10)}`;
        }

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

            // Upload all files
            for (const fileObj of files) {
                const fileExt = fileObj.name.split('.').pop();
                const safeFileName = `${Date.now()}_${Math.random().toString(36).substr(2, 5)}.${fileExt}`;

                const { error: uploadError } = await supabase.storage
                    .from('receitas')
                    .upload(safeFileName, fileObj.file);

                if (uploadError) throw uploadError;

                const publicUrl = supabase.storage.from('receitas').getPublicUrl(safeFileName).data.publicUrl;
                uploadedUrls.push(publicUrl);
            }

            const fullName = `${firstName} ${lastName}`;
            const arquivoUrlString = JSON.stringify(uploadedUrls); // Store as JSON array string

            const { error: insertError } = await supabase
                .from('solicitacoes')
                .insert([{ nome_cliente: fullName, whatsapp: phone, arquivo_url: arquivoUrlString }]);

            if (insertError) throw insertError;

            setFeedback({ type: 'success', message: 'Solicitação enviada com sucesso! Entraremos em contato em breve.' });
            setFiles([]);
            setPhone('');
            e.target.reset();
        } catch (error) {
            console.error('Error:', error);
            setFeedback({ type: 'error', message: 'Erro ao enviar: ' + error.message });
        } finally {
            setLoading(false);
        }
    };

    // ... existing content ...
    const painPoints = [
        { icon: <Battery size={32} color="#00E5FF" />, title: 'Falta de Energia', text: 'Cansaço constante que atrapalha sua rotina.' },
        { icon: <Shield size={32} color="#00E5FF" />, title: 'Baixa Imunidade', text: 'Você adoece com facilidade e demora a recuperar.' },
        { icon: <Brain size={32} color="#00E5FF" />, title: 'Falta de Foco', text: 'Dificuldade para concentrar e baixa produtividade.' },
        { icon: <Moon size={32} color="#00E5FF" />, title: 'Sono Desregulado', text: 'Noites mal dormidas que não recuperam.' },
    ];

    return (
        <div style={{ paddingBottom: '0' }}>
            <Header />
            <HeroSection />

            {/* Pain Points Section */}
            <section style={{ padding: '6rem 0', background: 'radial-gradient(circle at center, #0a0a20 0%, #050510 100%)' }}>
                <div className="container">
                    <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
                        <h2 className="text-gradient" style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>
                            Soluções prontas não funcionam para você?
                        </h2>
                        <p style={{ color: 'var(--text-gray)', fontSize: '1.2rem' }}>Seu corpo é único. Sua suplementação também deveria ser.</p>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '2rem' }}>
                        {painPoints.map((item, index) => (
                            <Card key={index} className="hover-scale">
                                <div style={{ marginBottom: '1.5rem', background: 'rgba(0,229,255,0.1)', width: '60px', height: '60px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    {item.icon}
                                </div>
                                <h3 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>{item.title}</h3>
                                <p style={{ color: 'var(--text-gray)' }}>{item.text}</p>
                            </Card>
                        ))}
                    </div>
                </div>
            </section>

            {/* Solution / Authority Section */}
            <section id="solutions" className="section-padding">
                <div className="container">
                    <div className="glass-card solutions-grid" style={{ padding: '4rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4rem', alignItems: 'center' }}>
                        <div className="solutions-content">
                            <h2 style={{ fontSize: '2.5rem', lineHeight: '1.2', marginBottom: '2rem' }}>
                                Aqui, sua saúde é tratada com <span className="text-gradient">exclusividade</span>.
                            </h2>
                            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                {['Manipulação 100% personalizada', 'Avaliação com farmacêuticos', 'Matéria-prima de alta qualidade', 'Sem fórmulas "mágicas" genéricas'].map(item => (
                                    <li key={item} style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '1.1rem' }}>
                                        <CheckCircle color="var(--primary-blue)" /> {item}
                                    </li>
                                ))}
                            </ul>
                            <div style={{ marginTop: '3rem' }}>
                                <Button variant="primary">Quero minha fórmula</Button>
                            </div>
                        </div>

                        {/* Visual placeholder for "Chemist/Lab" */}
                        <div className="solutions-image" style={{
                            height: '100%',
                            minHeight: '400px',
                            background: 'linear-gradient(45deg, rgba(0,229,255,0.1), transparent)',
                            borderRadius: '20px',
                            border: '1px solid rgba(255,255,255,0.1)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}>
                            <span style={{ opacity: 0.5 }}>Foto Profissional / Laboratório</span>
                        </div>
                    </div>
                </div>
            </section>

            {/* Products Carousel */}
            <ProductCarousel />

            {/* Trust / Process Section */}
            <section id="how-it-works" className="section-padding" style={{ textAlign: 'center' }}>
                <div className="container">
                    <h2 className="text-gradient" style={{ fontSize: '2.5rem', marginBottom: '4rem' }}>Como funciona</h2>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
                        {[
                            { title: '1. Entenda sua necessidade', text: 'Conversa inicial para mapear seus objetivos.' },
                            { title: '2. Fórmula sob medida', text: 'Desenvolvimento exclusivo para o seu metabolismo.' },
                            { title: '3. Produção e Entrega', text: 'Manipulação rápida e envio para sua casa.' }
                        ].map((step, idx) => (
                            <div key={idx} style={{ position: 'relative' }}>
                                <div style={{ fontSize: '4rem', fontWeight: 'bold', color: 'rgba(255,255,255,0.05)', position: 'absolute', top: '-1rem', left: '0', right: '0' }}>{idx + 1}</div>
                                <h3 style={{ fontSize: '1.5rem', marginBottom: '1rem', position: 'relative' }}>{step.title}</h3>
                                <p style={{ color: 'var(--text-gray)' }}>{step.text}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Final CTA / Form Section */}
            <section className="section-padding" style={{ background: 'linear-gradient(0deg, black 0%, #050510 100%)' }}>
                <div className="container">
                    <div className="glass-blue form-container" style={{ padding: '4rem', borderRadius: '30px', textAlign: 'center' }}>
                        <h2 style={{ fontSize: '3rem', marginBottom: '2rem' }}>Envie sua receita médica</h2>
                        <p style={{ fontSize: '1.2rem', marginBottom: '3rem', maxWidth: '700px', margin: '0 auto 3rem auto' }}>
                            Anexe sua receita (até 15 arquivos) e receba seu orçamento personalizado.
                        </p>

                        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '600px', margin: '0 auto', textAlign: 'left' }}>

                            <div className="form-group-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <input
                                    name="firstName"
                                    type="text"
                                    placeholder="Nome"
                                    required
                                    style={{ padding: '15px', borderRadius: '10px', border: 'none', background: 'rgba(255,255,255,0.1)', color: 'white', fontSize: '1rem', width: '100%' }}
                                />
                                <input
                                    name="lastName"
                                    type="text"
                                    placeholder="Sobrenome"
                                    required
                                    style={{ padding: '15px', borderRadius: '10px', border: 'none', background: 'rgba(255,255,255,0.1)', color: 'white', fontSize: '1rem', width: '100%' }}
                                />
                            </div>

                            <input
                                name="phone"
                                type="tel"
                                placeholder="(DDD) 99999-9999"
                                value={phone}
                                onChange={handlePhoneChange}
                                required
                                style={{ padding: '15px', borderRadius: '10px', border: 'none', background: 'rgba(255,255,255,0.1)', color: 'white', fontSize: '1rem' }}
                            />

                            {/* Files Grid */}
                            <div style={{ minHeight: '100px' }}>
                                <p style={{ marginBottom: '10px', opacity: 0.8, fontSize: '0.9rem' }}>Arquivos ({files.length}/15)</p>

                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '1rem' }}>
                                    {/* Existing Files */}
                                    {files.map(f => (
                                        <div key={f.id} style={{ position: 'relative', height: '100px', borderRadius: '10px', overflow: 'hidden', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
                                            {f.type.startsWith('image/') ? (
                                                <img src={f.url} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                            ) : (
                                                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
                                                    <FileText size={24} color="#00E5FF" />
                                                    <span style={{ fontSize: '0.6rem', marginTop: '5px', textAlign: 'center', padding: '0 2px' }}>{f.name.slice(0, 10)}...</span>
                                                </div>
                                            )}

                                            <button
                                                type="button"
                                                onClick={() => removeFile(f.id)}
                                                style={{ position: 'absolute', top: '5px', right: '5px', background: 'rgba(0,0,0,0.7)', border: 'none', borderRadius: '50%', color: '#FF4D4D', padding: '2px', cursor: 'pointer', display: 'flex' }}
                                            >
                                                <X size={14} />
                                            </button>
                                        </div>
                                    ))}

                                    {/* Add Button */}
                                    {files.length < 15 && (
                                        <label style={{
                                            height: '100px', borderRadius: '10px', border: '2px dashed rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.02)',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#00E5FF', transition: 'all 0.2s'
                                        }} className="hover:bg-white/5">
                                            <Plus size={24} />
                                            <input type="file" accept="image/*,.pdf" style={{ display: 'none' }} multiple onChange={handleFileChange} />
                                        </label>
                                    )}
                                </div>
                            </div>

                            {/* Feedback Messages */}
                            {feedback.message && (
                                <div style={{
                                    padding: '1rem',
                                    borderRadius: '10px',
                                    background: feedback.type === 'success' ? 'rgba(37, 211, 102, 0.2)' : 'rgba(255, 77, 77, 0.2)',
                                    color: feedback.type === 'success' ? '#25D366' : '#FF4D4D',
                                    border: `1px solid ${feedback.type === 'success' ? '#25D366' : '#FF4D4D'}`,
                                    textAlign: 'center'
                                }}>
                                    {feedback.message}
                                </div>
                            )}

                            <div style={{ display: 'flex', justifyContent: 'center', marginTop: '1rem' }}>
                                <Button type="submit" variant="primary" style={{ padding: '18px 48px', fontSize: '1.2rem', opacity: loading ? 0.7 : 1, cursor: loading ? 'not-allowed' : 'pointer', width: 'auto' }} disabled={loading}>
                                    {loading ? 'Enviando...' : 'Enviar'}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            </section>

            <Footer />
            <style>{`
                .section-padding { padding: 6rem 0; }
                
                @media (max-width: 768px) {
                    .section-padding { padding: 3rem 0 !important; }
                    
                    .solutions-grid { 
                        grid-template-columns: 1fr !important; 
                        gap: 2rem !important; 
                        padding: 2rem !important; 
                        text-align: center;
                    }
                    .solutions-content ul { alignItems: center; } /* Center list items if text centered */
                    .solutions-image { min-height: 250px !important; order: -1; } /* Image on top */

                    .form-container { padding: 2rem !important; }
                    .form-container h2 { fontSize: 2rem !important; }
                    .form-group-row { grid-template-columns: 1fr !important; }
                    
                    h2 { fontSize: 2rem !important; }
                }
            `}</style>
        </div>
    );
};

export default Landing;
