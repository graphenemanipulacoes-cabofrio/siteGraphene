import { useState } from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import FloatingWhatsApp from '../components/FloatingWhatsApp';
import { supabase } from '../lib/supabaseClient';
import { Toaster, toast } from 'sonner';

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

            toast.success('Credenciamento submetido com sucesso. Nossa equipe entrará em contato.');
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
            toast.error('Erro ao processar. Por favor, tente novamente.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="lux-page-root">
            <Header />
            <Toaster position="top-right" richColors />

            <main className="section">
                <div className="container-narrow">
                    <div className="editorial-header">
                        <span className="editorial-tag">Canal Médico & Prescritores</span>
                        <h1>Credenciamento Profissional</h1>
                        <p>
                            Parceria técnica magistral para médicos, nutricionistas e especialistas da saúde.
                        </p>
                    </div>

                    <div className="lux-form-box">
                        <form onSubmit={handleSubmit} className="lux-form">
                            <div className="lux-form-row">
                                <div className="lux-input-group">
                                    <label>Nome Completo *</label>
                                    <input
                                        name="nome_completo"
                                        value={formData.nome_completo}
                                        onChange={handleChange}
                                        type="text"
                                        required
                                        placeholder="Seu nome completo"
                                    />
                                </div>
                                <div className="lux-input-group">
                                    <label>CPF ou CNPJ *</label>
                                    <input
                                        name="documento"
                                        value={formData.documento}
                                        onChange={handleChange}
                                        type="text"
                                        required
                                        placeholder="Apenas números"
                                    />
                                </div>
                            </div>

                            <div className="lux-form-row">
                                <div className="lux-input-group">
                                    <label>E-mail *</label>
                                    <input
                                        name="email"
                                        value={formData.email}
                                        onChange={handleChange}
                                        type="email"
                                        required
                                        placeholder="exemplo@dominio.com"
                                    />
                                </div>
                                <div className="lux-input-group">
                                    <label>WhatsApp com DDD *</label>
                                    <input
                                        name="whatsapp"
                                        value={formData.whatsapp}
                                        onChange={handleChange}
                                        type="tel"
                                        required
                                        placeholder="(22) 99999-9999"
                                    />
                                </div>
                            </div>

                            <div style={{ height: '1px', background: 'var(--border-hairline)', margin: '12px 0' }} />
                            
                            <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.25rem', color: 'var(--text-main)' }}>
                                Dados Bancários para Repasse
                            </h3>

                            <div className="lux-form-row">
                                <div className="lux-input-group">
                                    <label>Chave PIX *</label>
                                    <input
                                        name="chave_pix"
                                        value={formData.chave_pix}
                                        onChange={handleChange}
                                        type="text"
                                        required
                                        placeholder="E-mail, CPF, celular ou chave"
                                    />
                                </div>
                                <div className="lux-input-group">
                                    <label>Instituição Financeira (Banco) *</label>
                                    <input
                                        name="banco"
                                        value={formData.banco}
                                        onChange={handleChange}
                                        type="text"
                                        required
                                        placeholder="Ex: Nubank, Itaú..."
                                    />
                                </div>
                            </div>

                            <div className="lux-form-row">
                                <div className="lux-input-group">
                                    <label>Agência *</label>
                                    <input
                                        name="agencia"
                                        value={formData.agencia}
                                        onChange={handleChange}
                                        type="text"
                                        required
                                        placeholder="0001"
                                    />
                                </div>
                                <div className="lux-input-group">
                                    <label>Conta com Dígito *</label>
                                    <input
                                        name="conta"
                                        value={formData.conta}
                                        onChange={handleChange}
                                        type="text"
                                        required
                                        placeholder="12345-6"
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                className="btn-luxury-primary"
                                disabled={loading}
                                style={{ width: '100%', marginTop: '16px' }}
                            >
                                {loading ? 'Enviando...' : 'Finalizar Solicitação de Credenciamento'}
                            </button>
                        </form>
                    </div>
                </div>
            </main>

            <Footer />
            <FloatingWhatsApp />
        </div>
    );
};

export default PartnerRegistration;
