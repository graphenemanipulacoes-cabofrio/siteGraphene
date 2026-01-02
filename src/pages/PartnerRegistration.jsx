import { useState } from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import Button from '../components/Button';
import { supabase } from '../lib/supabaseClient';
import { Toaster, toast } from 'sonner';
import { User, FileText, Mail, MessageCircle, CreditCard, Landmark, Hash, Building2, ExternalLink, ShieldCheck, Zap, BarChart3 } from 'lucide-react';

const PartnerRegistration = () => {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        nome_completo: '',
        documento: '',
        email: '',
        whatsapp: '',
        chave_pix: '',
        banco: '',
        agencia: '',
        conta: ''
    });

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const { error } = await supabase
                .from('parceiros')
                .insert([
                    {
                        ...formData,
                        status: 'pendente'
                    }
                ]);

            if (error) throw error;

            toast.success('Solicitação enviada com sucesso! Nossa equipe analisará seus dados em breve.');
            setFormData({
                nome_completo: '',
                documento: '',
                email: '',
                whatsapp: '',
                chave_pix: '',
                banco: '',
                agencia: '',
                conta: ''
            });
        } catch (error) {
            console.error('Error submitting partner registration:', error);
            toast.error('Ocorreu um erro ao processar sua solicitação. Por favor, tente novamente.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: 'var(--bg-dark)' }}>
            <Header />
            <Toaster position="top-right" richColors />

            <main style={{ flexGrow: 1, padding: '8rem 1rem' }}>
                <div className="container" style={{ maxWidth: '1000px', margin: '0 auto' }}>

                    {/* Program Introduction */}
                    <header style={{ textAlign: 'center', marginBottom: '4rem' }}>
                        <span style={{
                            background: 'rgba(0, 229, 255, 0.1)',
                            color: 'var(--primary-blue)',
                            padding: '6px 16px',
                            borderRadius: '30px',
                            fontSize: '0.85rem',
                            fontWeight: '600',
                            textTransform: 'uppercase',
                            letterSpacing: '2px',
                            border: '1px solid rgba(0, 229, 255, 0.2)',
                            display: 'inline-block',
                            marginBottom: '1.5rem'
                        }}>
                            Programa de Afiliados Graphène
                        </span>
                        <h1 className="text-gradient" style={{ fontSize: 'clamp(2.5rem, 5vw, 4rem)', marginBottom: '1.5rem', fontWeight: '900', letterSpacing: '-0.02em' }}>
                            Expanda sua Influência
                        </h1>
                        <p style={{ color: 'var(--text-gray)', fontSize: '1.2rem', maxWidth: '700px', margin: '0 auto', lineHeight: '1.6' }}>
                            Junte-se à marca líder em suplementação personalizada. Torne-se um parceiro estratégico e tenha acesso a condições exclusivas e comissionamento diferenciado.
                        </p>
                    </header>

                    <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '3rem', alignItems: 'start' }}>

                        {/* Benefits/Info Section */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                            <div className="glass-card" style={{ padding: '2rem', borderRadius: '24px' }}>
                                <h3 style={{ fontSize: '1.5rem', marginBottom: '2rem', fontWeight: '700' }}>Por que ser um parceiro?</h3>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                    <div style={{ display: 'flex', gap: '1rem' }}>
                                        <div style={{ background: 'rgba(0, 229, 255, 0.1)', padding: '10px', borderRadius: '12px', height: 'fit-content' }}>
                                            <Zap size={24} color="var(--primary-blue)" />
                                        </div>
                                        <div>
                                            <h4 style={{ fontSize: '1.1rem', marginBottom: '0.3rem' }}>Produtos de Alta Performance</h4>
                                            <p style={{ color: 'var(--text-gray)', fontSize: '0.95rem' }}>Fórmulas exclusivas validadas por especialistas.</p>
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', gap: '1rem' }}>
                                        <div style={{ background: 'rgba(0, 229, 255, 0.1)', padding: '10px', borderRadius: '12px', height: 'fit-content' }}>
                                            <BarChart3 size={24} color="var(--primary-blue)" />
                                        </div>
                                        <div>
                                            <h4 style={{ fontSize: '1.1rem', marginBottom: '0.3rem' }}>Comissionamento Estruturado</h4>
                                            <p style={{ color: 'var(--text-gray)', fontSize: '0.95rem' }}>Receba por cada indicação de sucesso de forma transparente.</p>
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', gap: '1rem' }}>
                                        <div style={{ background: 'rgba(0, 229, 255, 0.1)', padding: '10px', borderRadius: '12px', height: 'fit-content' }}>
                                            <ShieldCheck size={24} color="var(--primary-blue)" />
                                        </div>
                                        <div>
                                            <h4 style={{ fontSize: '1.1rem', marginBottom: '0.3rem' }}>Suporte Especializado</h4>
                                            <p style={{ color: 'var(--text-gray)', fontSize: '0.95rem' }}>Acesso direto à nossa equipe para dúvidas e materiais.</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <p style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.4)', padding: '0 1rem' }}>
                                Ao enviar este formulário, você declara estar ciente de que o cadastro passará por um processo de curadoria técnica interna.
                            </p>
                        </div>

                        {/* Registration Form */}
                        <div className="glass-blue" style={{ padding: '2.5rem', borderRadius: '24px', position: 'relative' }}>
                            <div style={{ marginBottom: '1.5rem' }}>
                                <h3 style={{ fontSize: '1.3rem', fontWeight: '700' }}>Solicitar Credenciamento</h3>
                                <p style={{ fontSize: '0.85rem', opacity: 0.6 }}>Todos os campos marcados com <span style={{ color: '#FF4D4D' }}>*</span> são obrigatórios.</p>
                            </div>

                            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                <div className="input-group">
                                    <label style={labelStyle}><User size={14} /> Nome Completo <span style={requiredStar}>*</span></label>
                                    <input
                                        name="nome_completo"
                                        value={formData.nome_completo}
                                        onChange={handleChange}
                                        type="text"
                                        required
                                        placeholder="Ex: João Silva Sauro"
                                        style={inputStyle}
                                    />
                                </div>

                                <div className="input-group">
                                    <label style={labelStyle}><FileText size={14} /> Documento (CPF/CNPJ) <span style={requiredStar}>*</span></label>
                                    <input
                                        name="documento"
                                        value={formData.documento}
                                        onChange={handleChange}
                                        type="text"
                                        required
                                        placeholder="000.000.000-00"
                                        style={inputStyle}
                                    />
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                    <div className="input-group">
                                        <label style={labelStyle}><Mail size={14} /> E-mail <span style={requiredStar}>*</span></label>
                                        <input
                                            name="email"
                                            value={formData.email}
                                            onChange={handleChange}
                                            type="email"
                                            required
                                            placeholder="contato@exemplo.com"
                                            style={inputStyle}
                                        />
                                    </div>
                                    <div className="input-group">
                                        <label style={labelStyle}><MessageCircle size={14} /> WhatsApp <span style={requiredStar}>*</span></label>
                                        <input
                                            name="whatsapp"
                                            value={formData.whatsapp}
                                            onChange={handleChange}
                                            type="tel"
                                            required
                                            placeholder="(22) 99999-9999"
                                            style={inputStyle}
                                        />
                                    </div>
                                </div>

                                <div style={{ height: '1px', background: 'rgba(255,255,255,0.05)', margin: '1rem 0' }}></div>
                                <h4 style={{ fontSize: '0.9rem', marginBottom: '0.5rem', fontWeight: '600', color: 'var(--primary-blue)' }}>Dados Bancários</h4>

                                <div className="input-group">
                                    <label style={labelStyle}><CreditCard size={14} /> Chave PIX <span style={requiredStar}>*</span></label>
                                    <input
                                        name="chave_pix"
                                        value={formData.chave_pix}
                                        onChange={handleChange}
                                        type="text"
                                        required
                                        placeholder="E-mail, CPF ou Aleatória"
                                        style={inputStyle}
                                    />
                                </div>

                                <div className="input-group">
                                    <label style={labelStyle}><Landmark size={14} /> Instituição Bancária <span style={requiredStar}>*</span></label>
                                    <input
                                        name="banco"
                                        value={formData.banco}
                                        onChange={handleChange}
                                        type="text"
                                        required
                                        placeholder="Ex: Banco Inter, Itaú, etc."
                                        style={inputStyle}
                                    />
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                    <div className="input-group">
                                        <label style={labelStyle}><Building2 size={14} /> Agência <span style={requiredStar}>*</span></label>
                                        <input
                                            name="agencia"
                                            value={formData.agencia}
                                            onChange={handleChange}
                                            type="text"
                                            required
                                            placeholder="0001"
                                            style={inputStyle}
                                        />
                                    </div>
                                    <div className="input-group">
                                        <label style={labelStyle}><Hash size={14} /> Conta <span style={requiredStar}>*</span></label>
                                        <input
                                            name="conta"
                                            value={formData.conta}
                                            onChange={handleChange}
                                            type="text"
                                            required
                                            placeholder="123456-7"
                                            style={inputStyle}
                                        />
                                    </div>
                                </div>

                                <div style={{ marginTop: '1.5rem' }}>
                                    <Button
                                        type="submit"
                                        variant="primary"
                                        style={{ width: '100%', padding: '1.1rem', fontSize: '1rem', color: '#000', fontWeight: 'bold' }}
                                        disabled={loading}
                                    >
                                        {loading ? 'Processando...' : 'Finalizar Solicitação'}
                                    </Button>
                                </div>
                            </form>
                        </div>

                    </div>
                </div>
            </main>

            <Footer />

            <style>{`
                .input-group {
                    display: flex;
                    flex-direction: column;
                    gap: 0.4rem;
                }
                @media (max-width: 900px) {
                    main { padding-top: 5rem !important; }
                    header { margin-bottom: 2rem !important; }
                    header h1 { font-size: 2rem !important; }
                    header p { font-size: 1rem !important; }
                    
                    div[style*="grid-template-columns: 1.2fr 1fr"] {
                        grid-template-columns: 1fr !important;
                        gap: 2rem !important;
                    }
                }
            `}</style>
        </div>
    );
};

const labelStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '0.4rem',
    fontSize: '0.85rem',
    opacity: 0.7,
    color: '#fff',
    marginLeft: '2px'
};

const requiredStar = {
    color: '#FF4D4D',
    marginLeft: '2px'
};

const inputStyle = {
    padding: '10px 14px',
    borderRadius: '10px',
    border: '1px solid rgba(255,255,255,0.1)',
    background: 'rgba(255,255,255,0.03)',
    color: '#fff',
    fontSize: '0.95rem',
    outline: 'none',
    transition: 'all 0.2s',
    width: '100%'
};

export default PartnerRegistration;
