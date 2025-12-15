import { Phone, MapPin, Instagram, Mail } from 'lucide-react';

const Footer = () => {
    return (
        <footer style={{ background: 'black', padding: '4rem 0', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
            <div className="container footer-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '3rem' }}>

                {/* Brand */}
                <div>
                    <h2 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '1rem' }}>GRAPHÈNE</h2>
                    <p style={{ color: 'var(--text-gray)' }}>
                        Farmácia de manipulação personalizada. Sua saúde tratada de forma única.
                    </p>
                </div>

                {/* Contact */}
                <div>
                    <h3 style={{ fontSize: '1.2rem', marginBottom: '1.5rem', color: 'white' }}>Fale Conosco</h3>
                    <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '1rem', color: 'var(--text-gray)' }}>
                        <li style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <Phone size={20} color="var(--primary-blue)" />
                            (22) 99936-1256
                        </li>
                        <li style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <MapPin size={20} color="var(--primary-blue)" />
                            R. Itajurú, 300 – Cabo Frio, RJ
                        </li>
                        <li style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <Mail size={20} color="var(--primary-blue)" />
                            contato@graphene.com
                        </li>
                    </ul>
                </div>

                {/* Links */}
                <div>
                    <h3 style={{ fontSize: '1.2rem', marginBottom: '1.5rem', color: 'white' }}>Navegação</h3>
                    <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.5rem', color: 'var(--text-gray)' }}>
                        <li><a href="#" className="hover-text-blue">Início</a></li>
                        <li><a href="#products" className="hover-text-blue">Produtos</a></li>
                        <li><a href="#about" className="hover-text-blue">Sobre</a></li>
                        <li><a href="/login" className="hover-text-blue">Área do Cliente</a></li>
                    </ul>
                </div>

            </div>
            <div className="container" style={{ marginTop: '3rem', paddingTop: '2rem', borderTop: '1px solid rgba(255,255,255,0.05)', textAlign: 'center', color: '#555' }}>
                &copy; 2024 Graphène. Todos os direitos reservados.
            </div>
        </footer>
    );
};

// Add styles
const styles = `
    @media (max-width: 768px) {
        .footer-grid {
            text-align: center;
            gap: 2rem !important;
        }
        .footer-grid > div {
            display: flex;
            flex-direction: column;
            align-items: center;
        }
        .footer-grid ul {
            align-items: center;
        }
    }
`;
const styleSheet = document.createElement("style");
styleSheet.innerText = styles;
document.head.appendChild(styleSheet);


export default Footer;
