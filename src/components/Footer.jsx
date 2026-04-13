import Button from './Button';
import { useEffect } from 'react';

const Footer = () => {
    // Inject footer styles on mount
    useEffect(() => {
        const styleSheet = document.createElement('style');
        styleSheet.className = 'footer-styles';
        styleSheet.innerText = `
            @media (max-width: 768px) {
                .site-footer {
                    padding: 60px 0 40px !important;
                }
                .footer-grid {
                    grid-template-columns: 1fr !important;
                    gap: 3rem !important;
                    text-align: center;
                    margin-bottom: 60px !important;
                }
                .footer-grid > div {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                }
                .footer-copyright-row {
                    flex-direction: column !important;
                    gap: 1.5rem !important;
                    text-align: center !important;
                }
            }
        `;
        
        // Only add if not already present
        if (!document.querySelector('.footer-styles')) {
            document.head.appendChild(styleSheet);
        }
        
        // Cleanup on unmount
        return () => {
            const existing = document.querySelector('.footer-styles');
            if (existing) {
                existing.remove();
            }
        };
    }, []);

    return (
        <footer className="site-footer" style={{ background: 'var(--bg-main)', padding: '100px 0 40px', borderTop: '1px solid rgba(15, 23, 42, 0.05)' }}>
            <div className="container">
                <div className="footer-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '4rem', marginBottom: '100px' }}>

                    {/* Contact */}
                    <div>
                        <h3 style={{ fontSize: '0.9rem', letterSpacing: '2px', fontWeight: '800', marginBottom: '2rem', color: 'var(--primary-blue)' }}>CONTATO</h3>
                        <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '1rem', color: 'var(--text-muted)', fontWeight: '600' }}>
                            <li>(22) 99936-1256</li>
                            <li>contato@graphene.com</li>
                            <li>R. Itajurú, 300 – Cabo Frio, RJ</li>
                        </ul>
                    </div>

                    {/* Navigation */}
                    <div>
                        <h3 style={{ fontSize: '0.9rem', letterSpacing: '2px', fontWeight: '800', marginBottom: '2rem', color: 'var(--primary-blue)' }}>MENU</h3>
                        <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '1rem', color: 'var(--text-muted)', fontWeight: '600' }}>
                            <li><a href="#" style={{ color: 'inherit' }}>Início</a></li>
                            <li><a href="#products" style={{ color: 'inherit' }}>Produtos</a></li>
                            <li><a href="#solutions" style={{ color: 'inherit' }}>Soluções</a></li>
                            <li><a href="/login" style={{ color: 'inherit' }}>Login</a></li>
                        </ul>
                    </div>

                    {/* Social/Legal */}
                    <div>
                        <h3 style={{ fontSize: '0.9rem', letterSpacing: '2px', fontWeight: '800', marginBottom: '2rem', color: 'var(--primary-blue)' }}>SOCIAL</h3>
                        <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '1rem', color: 'var(--text-muted)', fontWeight: '600' }}>
                            <li><a href="#" style={{ color: 'inherit' }}>Instagram</a></li>
                            <li><a href="#" style={{ color: 'inherit' }}>Facebook</a></li>
                            <li><a href="#" style={{ color: 'inherit' }}>LinkedIn</a></li>
                        </ul>
                    </div>

                    {/* Location */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%', maxWidth: '280px' }}>
                        <h3 style={{ fontSize: '0.9rem', letterSpacing: '2px', fontWeight: '800', marginBottom: '0.5rem', color: 'var(--primary-blue)' }}>NOSSA LOJA</h3>
                        <div style={{ width: '100%', height: '140px', borderRadius: '12px', overflow: 'hidden', border: '1px solid rgba(15,23,42,0.1)' }}>
                            <iframe
                                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3674.8711311059535!2d-42.02755252467!3d-22.881232979272373!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x9705599d81e2bf%3A0x868e0efdec8ab0ab!2sGraph%C3%A8ne%20Farm%C3%A1cia%20de%20Manipula%C3%A7%C3%A3o!5e0!3m2!1spt-BR!2sbr!4v1709403328514!5m2!1spt-BR!2sbr"
                                width="100%"
                                height="100%"
                                style={{ border: 0 }}
                                allowFullScreen=""
                                loading="lazy"
                                referrerPolicy="no-referrer-when-downgrade"
                            ></iframe>
                        </div>
                        <a href="https://www.google.com/maps/dir//Graph%C3%A8ne+Farm%C3%A1cia+de+Manipula%C3%A7%C3%A3o,+R.+Itajur%C3%BA,+300+-+LOJAS+5+E+6+-+Centro,+Cabo+Frio+-+RJ,+28905-060/@-22.8812782,-42.0249886,139a,35y,5.45t/data=!3m1!1e3!4m9!4m8!1m0!1m5!1m1!1s0x9705599d81e2bf:0x868e0efdec8ab0ab!2m2!1d-42.0249374!2d-22.881238!3e9?entry=ttu&g_ep=EgoyMDI2MDIyNS4wIKXMDSoASAFQAw%3D%3D" target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none', width: '100%' }}>
                            <Button variant="outline" style={{ width: '100%', borderRadius: '12px', padding: '10px' }}>COMO CHEGAR</Button>
                        </a>
                    </div>
                </div>

                {/* Massive Typography Footer */}
                <div style={{ textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
                    <h2
                        className="notranslate"
                        translate="no"
                        style={{
                            fontSize: 'clamp(5rem, 18vw, 22rem)',
                            fontWeight: '900',
                            letterSpacing: '-1vw',
                            lineHeight: '0.8',
                            color: 'var(--text-main)',
                            opacity: 0.05,
                            marginBottom: '-2vw',
                            userSelect: 'none'
                        }}
                    >
                        GRAPHÈNE
                    </h2>
                    <div className="footer-copyright-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '2rem', paddingTop: '2rem', borderTop: '1px solid rgba(15, 23, 42, 0.05)', color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: '600' }}>
                        <div>&copy; 2024 GRAPHÈNE. TODOS OS DIREITOS RESERVADOS.</div>
                        <div style={{ display: 'flex', gap: '2rem' }}>
                            <span>PRIVACIDADE</span>
                            <span>TERMOS</span>
                        </div>
                    </div>
                </div>
            </div>
        </footer>
    );
};


export default Footer;
