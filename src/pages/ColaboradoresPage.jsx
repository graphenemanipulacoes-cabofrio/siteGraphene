import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight, FlaskConical, LoaderCircle, LogIn, Monitor, ShieldCheck, Users, Lock, UserRound } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { staffRoleLabels } from '../utils/counter';
import '../styles/staff.css';

// Área da equipe: ponto de entrada depois do login normal do site.
// O botão do cabeçalho traz admin e equipe para cá; cada porta abre já conectada,
// porque todas as áreas usam a mesma conta do site (e-mail). Esta página não pede senha.
const doors = [
    {
        to: '/admin', icon: ShieldCheck, title: 'Administração', tag: 'Controle total', primary: true, roles: ['admin'],
        text: 'Pedidos, produtos, financeiro, parceiros, administradores e os acessos de toda a equipe por e-mail.',
    },
    {
        to: '/farmaceutico', icon: FlaskConical, title: 'Farmacêutico', tag: 'Catálogos', roles: ['admin', 'farmaceutico'],
        text: 'Cadastro e revisão de produtos e matérias-primas, com gestão de imagens e informações técnicas.',
    },
    {
        to: '/balcaographene', icon: Monitor, title: 'Balcão', tag: 'Pedidos', roles: ['admin', 'farmaceutico', 'balcao'],
        text: 'Pedidos para separar, endereços de entrega e orçamentos enviados pelos clientes.',
    },
    {
        to: '/parceiros/painel', icon: Users, title: 'Parceiros e influenciadores', tag: 'Indicações', roles: ['admin'],
        text: 'Painel de cada parceiro: cupons, indicações e comissões de quem divulga a Graphène.',
    },
];

export default function ColaboradoresPage() {
    const { customer, authReady, staffRole, staffRoleReady } = useStore();
    const roleLoading = Boolean(customer) && !staffRoleReady;
    const available = staffRole ? doors.filter(door => door.roles.includes(staffRole)) : [];

    return <main className="staff-root">
        <div className="staff-shell">
            <header className="staff-brand">
                <img src="/assets/logo.png" alt="Graphène Farmácia de Manipulação" />
                <Link className="staff-back" to="/"><ArrowLeft size={16} aria-hidden="true" /> Voltar ao site</Link>
            </header>
            <section className="staff-intro">
                <h1>Área da equipe</h1>
                <p>Escolha a sua área de trabalho. Você já entra com o login do site; administradores acessam todas as áreas.</p>
            </section>

            {!authReady ? <p className="staff-session" role="status"><LoaderCircle size={16} className="staff-spin" aria-hidden="true" /> Conferindo seu login…</p>
                : !customer ? <div className="staff-session">
                    <span><Lock size={16} aria-hidden="true" /> Entre com a sua conta do site para ver as suas áreas.</span>
                    <Link className="staff-btn primary" to="/entrar" state={{ returnTo: '/colaboradores' }}><LogIn size={16} aria-hidden="true" /> Entrar</Link>
                </div>
                : <div className="staff-session">
                    <span><UserRound size={16} aria-hidden="true" /> Conectado como <strong>{customer.email}</strong>{staffRole && <> · {staffRoleLabels[staffRole]}</>}</span>
                    <Link className="staff-btn" to="/minha-conta">Minha conta</Link>
                </div>}

            {roleLoading && <p className="staff-session" role="status"><LoaderCircle size={16} className="staff-spin" aria-hidden="true" /> Carregando as suas áreas…</p>}

            {customer && !roleLoading && !staffRole &&<p className="staff-error staff-session-error" role="alert">A conta {customer.email} não tem acesso da equipe. Peça a um administrador para cadastrar o seu e-mail em Administração › Acessos da equipe.</p>}

            {available.length > 0 && <nav className="staff-doors" aria-label="Áreas da equipe">
                {available.map(door => {
                    const { to, title, tag, text, primary } = door;
                    return <Link key={to} to={to} className={`staff-door${primary ? ' primary' : ''}`}>
                        <span className="staff-door-icon"><door.icon size={24} aria-hidden="true" /></span>
                        <div className="staff-door-body">
                            <div className="staff-door-head"><h2>{title}</h2><span className="staff-door-tag">{tag}</span></div>
                            <p>{text}</p>
                            <span className="staff-door-cta">Abrir <ArrowRight size={16} aria-hidden="true" /></span>
                        </div>
                    </Link>;
                })}
            </nav>}

            <p className="staff-note"><Lock size={15} aria-hidden="true" /><span>Acesso restrito à equipe Graphène. Os e-mails do balcão e do farmacêutico são cadastrados pelo administrador em Administração › Acessos da equipe. A senha é trocada em <Link to="/minha-conta">Minha conta</Link>. Quer divulgar a Graphène? <Link to="/parceiros/cadastro">Cadastre-se como parceiro</Link>.</span></p>
        </div>
    </main>;
}
