import { CalendarClock, Target, Video } from 'lucide-react';
import { PARTNER_STATUS_LABELS } from '../utils/partnerResults';
import '../styles/partnerResults.css';

const money = value => Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const messages = {
    scheduled: 'Seu período de teste começa em breve.',
    learning: 'O primeiro mês é para ajustar o conteúdo. Acompanhe suas vendas por aqui.',
    on_track: 'Você está no caminho. Continue com as postagens combinadas.',
    attention: 'Suas vendas estão abaixo do combinado. Fale com a diretoria para ajustarmos o conteúdo juntos.',
    review: 'A Graphène vai conversar com você sobre os próximos meses da parceria.',
    commission_only: 'Sua parceria segue com comissão sobre as vendas do seu cupom.',
};

// Painel da parceira: mostra vendas e postagens. Custos e lucro da Graphène não chegam aqui.
export default function PartnerGoalCard({ goal }) {
    if (!goal) return null;
    const commissionOnly = goal.phase === 'commission_only';
    const progress = goal.minimum > 0 ? Math.min((goal.monthSales / goal.minimum) * 100, 100) : 0;
    return <section className="pr-goal-card" aria-labelledby="partner-goal-title">
        <div className="pr-goal-head">
            <div><h2 id="partner-goal-title"><Target size={18} aria-hidden="true" /> Sua parceria este mês</h2><p>{messages[goal.status]}</p></div>
            <span className={`pr-status is-${goal.status}`}>{PARTNER_STATUS_LABELS[goal.status]}</span>
        </div>
        {!commissionOnly && goal.minimum > 0 && <div className="pr-goal-progress">
            <div className="pr-goal-values"><strong>{money(goal.monthSales)}</strong><span>de {money(goal.minimum)} no mês</span></div>
            <div className="pr-bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow={Math.round(progress)} aria-label={`Vendas do mês: ${money(goal.monthSales)} de ${money(goal.minimum)}`}><span style={{ width: `${progress}%` }} /></div>
            <small>{goal.missing > 0 ? `Faltam ${money(goal.missing)} para o mínimo do mês.` : 'Mínimo do mês alcançado.'}{goal.goal > goal.minimum ? ` Meta do mês: ${money(goal.goal)}.` : ''} Contam só pedidos pagos, sem frete.</small>
        </div>}
        {!commissionOnly && <ul className="pr-goal-facts">
            <li><Video size={16} aria-hidden="true" /> {goal.reels.done} de {goal.reels.required} Reels</li>
            <li><Video size={16} aria-hidden="true" /> {goal.stories.done} de {goal.stories.required} Stories</li>
            {goal.phase === 'test' && goal.daysLeft !== null && <li><CalendarClock size={16} aria-hidden="true" /> {goal.daysLeft} {goal.daysLeft === 1 ? 'dia restante' : 'dias restantes'} de teste</li>}
        </ul>}
    </section>;
}
