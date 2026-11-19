import { ArrowDown, BadgeCheck, Check, CreditCard, FlaskConical, Lock, TicketPercent, Truck } from 'lucide-react';
import { Link, Navigate, useParams } from 'react-router-dom';
import StoreLayout from '../components/StoreLayout';
import { PartnerAvatar } from '../components/PartnerAvatar';
import { PARTNER_PREVIEWS } from '../data/partnerPreviews';
import '../styles/coupons.css';
import '../styles/partnerPreview.css';

const goTo = target => event => {
    const element = document.getElementById(target);
    if (!element) return;
    event.preventDefault();
    element.scrollIntoView({ behavior: 'smooth', block: 'start' });
};

// Amostra da área de uma parceira (ex.: /dracarolinefrota), para mostrar a ela antes do cadastro real.
// Fica fora do Google, não grava nada no banco e não vende: o botão de compra fica bloqueado.
export default function PartnerPreviewPage({ slug: fixedSlug }) {
    const params = useParams();
    const preview = PARTNER_PREVIEWS[fixedSlug || params.slug];
    if (!preview) return <Navigate to="/" replace />;

    return <StoreLayout>
        <div className="dp-banner" role="note">
            <strong>Amostra. Esta página não é válida.</strong> É uma amostra que depende da aprovação da {preview.name}.
            {' '}A página só passa a valer depois que ela fizer o cadastro real pela <Link to="/parceiros">página de parceiros</Link>.
            {' '}Até lá, nenhum cupom, desconto ou indicação está ativo.
        </div>

        <section className="coupon-landing dp-landing" aria-labelledby="partner-preview-title">
            <div className="container">
                <div className="cl-card dp-card" style={preview.background ? { '--dp-bg': `url("${preview.background}")` } : undefined}>
                    <div className="cl-profile">
                        <PartnerAvatar url={preview.photo || ''} name={preview.firstName} size={128} alt={`Foto da ${preview.name}`} />
                        <span className="cl-eyebrow"><BadgeCheck size={14} aria-hidden="true" /> Amostra · área de parceira</span>
                        <h1 id="partner-preview-title">Área de parceira <span>{preview.name}</span></h1>
                        <p>{preview.intro}</p>
                        <a className="dp-handle" href={`https://www.instagram.com/${preview.handle}/`} target="_blank" rel="noopener noreferrer">@{preview.handle}</a>
                    </div>

                    <div className="cl-ticket dp-ticket" role="group" aria-label="Cupom: ainda não existe">
                        <div className="cl-ticket-value"><strong>a definir</strong><span>de desconto</span></div>
                        <div className="cl-ticket-info">
                            <span className="cl-ticket-code"><TicketPercent size={15} aria-hidden="true" /> CUPOM A DEFINIR</span>
                            <strong><Check size={15} aria-hidden="true" /> Só depois da aprovação</strong>
                            <small>O código e o percentual são definidos no cadastro, se a parceria for aprovada.</small>
                        </div>
                    </div>

                    <div className="cl-actions">
                        <a className="cl-btn-main" href="#indicacoes" onClick={goTo('indicacoes')}>Ver as indicações <ArrowDown size={17} aria-hidden="true" /></a>
                        <Link className="cl-btn-line" to="/produtos">Ver toda a loja</Link>
                    </div>

                    <ul className="cl-trust" aria-label="Sobre a Graphène">
                        <li><FlaskConical size={15} aria-hidden="true" /> Farmácia de manipulação</li>
                        <li><Truck size={15} aria-hidden="true" /> Entrega em todo o Brasil</li>
                        <li><CreditCard size={15} aria-hidden="true" /> Pix ou cartão</li>
                    </ul>
                </div>
            </div>
        </section>

        <section id="indicacoes" className="dp-indications" aria-labelledby="dp-indications-title">
            <div className="container">
                <span className="dp-eyebrow">Amostra · exemplo de indicação</span>
                <h2 id="dp-indications-title">{preview.indicationsTitle}</h2>
                <div className="dp-grid">
                    {preview.products.map(product => <article className="dp-product" key={product.id}>
                        <div className="dp-product-photo"><img src={product.image} alt={product.imageAlt} loading="lazy" decoding="async" /></div>
                        <div className="dp-product-body">
                            <span className="dp-product-tag">{product.category}</span>
                            <h3>{product.name}</h3>
                            <p>{product.detail}</p>
                            <small>Preço e disponibilidade: a confirmar.</small>
                            <span className="dp-product-cta is-off" aria-disabled="true"><Lock size={15} aria-hidden="true" /> Disponível depois da aprovação</span>
                        </div>
                    </article>)}
                </div>
            </div>
        </section>
    </StoreLayout>;
}
