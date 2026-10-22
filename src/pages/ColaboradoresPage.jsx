import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight, FlaskConical, Monitor, ShieldCheck, Users, Lock } from 'lucide-react';
import '../styles/staff.css';

// Área da equipe: um ponto de entrada para todas as páginas de usuários.
// Cada área tem o próprio login; esta página não guarda nem pede senha.
const doors = [
    {
        to: '/login', icon: ShieldCheck, title: 'Administração', tag: 'Controle total', primary: true,
        text: 'Pedidos, produtos, financeiro, parceiros e os acessos de toda a equipe: criar, trocar senha e excluir usuários.',
    },
    {
        to: '/farmaceutico', icon: FlaskConical, title: 'Farmacêutico', tag: 'Produtos',
        text: 'Cadastro e revisão dos produtos da loja: foto, nome, descrição e preço.',
    },
    {
        to: '/balcaographene', icon: Monitor, title: 'Balcão', tag: 'Pedidos',
        text: 'Pedidos para separar, endereços de entrega e orçamentos enviados pelos clientes.',
    },
    {
        to: '/parceiros/entrar', icon: Users, title: 'Parceiros e influenciadores', tag: 'Indicações',
        text: 'Cupons, indicações e comissões de quem divulga a Graphène.',
    },
];

export default function ColaboradoresPage() {
    return <main className="staff-root">
        <div className="staff-shell">
            <header className="staff-brand">
                <img src="/assets/logo.png" alt="Graphène Farmácia de Manipulação" />
                <Link className="staff-back" to="/"><ArrowLeft size={16} aria-hidden="true" /> Voltar ao site</Link>
            </header>
            <section className="staff-intro">
                <h1>Área da equipe</h1>
                <p>Escolha a sua área de trabalho. Cada uma tem login e senha próprios; administradores entram em todas.</p>
            </section>
            <nav className="staff-doors" aria-label="Áreas da equipe">
                {doors.map(door => {
                    const { to, title, tag, text, primary } = door;
                    return <Link key={to} to={to} className={`staff-door${primary ? ' primary' : ''}`}>
                        <span className="staff-door-icon"><door.icon size={24} aria-hidden="true" /></span>
                        <div className="staff-door-body">
                            <div className="staff-door-head"><h2>{title}</h2><span className="staff-door-tag">{tag}</span></div>
                            <p>{text}</p>
                            <span className="staff-door-cta">Entrar <ArrowRight size={16} aria-hidden="true" /></span>
                        </div>
                    </Link>;
                })}
            </nav>
            <p className="staff-note"><Lock size={15} aria-hidden="true" /><span>Acesso restrito à equipe Graphène. Os logins do balcão e do farmacêutico são criados pelo administrador em Administração › Acessos da equipe. Administradores entram em todas as áreas com o mesmo login e senha do painel. Quer divulgar a Graphène? <Link to="/parceiros/cadastro">Cadastre-se como parceiro</Link>.</span></p>
        </div>
    </main>;
}
