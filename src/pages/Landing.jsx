import Header from '../components/Header';
import HeroSection from '../components/HeroSection';
import ProductCarousel from '../components/ProductCarousel';
import Footer from '../components/Footer';
import Card from '../components/Card';
import Button from '../components/Button';
import { Battery, Shield, Brain, Moon, Frown, CheckCircle } from 'lucide-react';

const Landing = () => {
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
            <section id="solutions" style={{ padding: '6rem 0' }}>
                <div className="container">
                    <div className="glass-card" style={{ padding: '4rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4rem', alignItems: 'center' }}>
                        <div>
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
                        <div style={{
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
            <section id="how-it-works" style={{ padding: '6rem 0', textAlign: 'center' }}>
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

            {/* Final CTA */}
            <section style={{ padding: '6rem 0', background: 'linear-gradient(0deg, black 0%, #050510 100%)' }}>
                <div className="container">
                    <div className="glass-blue" style={{ padding: '4rem', borderRadius: '30px', textAlign: 'center' }}>
                        <h2 style={{ fontSize: '3rem', marginBottom: '2rem' }}>Você não precisa adiar seu cuidado.</h2>
                        <p style={{ fontSize: '1.2rem', marginBottom: '3rem', maxWidth: '700px', margin: '0 auto 3rem auto' }}>
                            Fale agora com um profissional da Graphène e descubra o que faz sentido para você.
                        </p>
                        <Button variant="primary" style={{ padding: '18px 36px', fontSize: '1.2rem' }}>
                            Falar no WhatsApp
                        </Button>
                    </div>
                </div>
            </section>

            <Footer />
        </div>
    );
};

export default Landing;
