import Button from './Button';

const Footer = () => {
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

                    <div>
                        <Button variant="outline" style={{ borderRadius: '12px' }}>TRABALHE CONOSCO</Button>
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

// Add styles
const styles = `
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
const styleSheet = document.createElement("style");
styleSheet.innerText = styles;
document.head.appendChild(styleSheet);


export default Footer;
