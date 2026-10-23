import { Truck, Scale, ShieldCheck, HeartPulse } from 'lucide-react';

const perks = [
    { icon: Truck, title: 'Entrega em todo o Brasil', description: 'Consulte frete e prazo pelo CEP' },
    { icon: Scale, title: 'Preparação cuidadosa', description: 'Pesagem e controle das etapas' },
    { icon: ShieldCheck, title: 'Seleção de insumos', description: 'Procedência para você consultar' },
    { icon: HeartPulse, title: 'Atendimento farmacêutico', description: 'Nossa equipe perto de você' },
];

export default function BenefitsBar() {
    return <section className="benefits-bar-section" aria-label="Informações da Graphène">
        <div className="container">
            <ul className="benefits-grid">
                {perks.map(perk => {
                    const Icon = perk.icon;
                    return <li key={perk.title} className="benefit-item">
                        <Icon size={22} strokeWidth={1.5} aria-hidden="true" />
                        <div className="benefit-text"><strong>{perk.title}</strong><span>{perk.description}</span></div>
                    </li>;
                })}
            </ul>
        </div>
        <style>{`
            .page-root .benefits-bar-section { padding: 0; }
            .page-root .benefits-grid {
                display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 24px;
                margin: 0; padding: 0 0 26px; list-style: none; background: none;
                border: 0; border-bottom: 1px solid rgba(157, 202, 224, .14); border-radius: 0; box-shadow: none;
            }
            .page-root .benefit-item { display: flex; align-items: center; gap: 12px; min-width: 0; }
            .page-root .benefit-item > svg { flex: none; color: #a4c4ce; }
            .page-root .benefit-text { display: grid; gap: 4px; }
            .page-root .benefit-text strong { font-size: .77rem; font-weight: 500; color: #e4edf0; line-height: 1.45; }
            .page-root .benefit-text span { font-size: .7rem; color: #9aafba; line-height: 1.5; }
            @media (max-width: 960px) {
                .page-root .benefits-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 20px 28px; }
            }
            @media (max-width: 600px) {
                .page-root .benefits-grid { gap: 18px 15px; padding-bottom: 22px; }
                .page-root .benefit-item { align-items: flex-start; gap: 8px; }
                .page-root .benefit-item > svg { width: 18px; height: 18px; margin-top: 2px; }
                .page-root .benefit-text strong { font-size: .7rem; }
                .page-root .benefit-text span { font-size: .65rem; }
            }
        `}</style>
    </section>;
}
