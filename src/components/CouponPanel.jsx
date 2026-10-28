import { useEffect, useId, useRef, useState } from 'react';
import { Check, LoaderCircle, TicketPercent, X } from 'lucide-react';
import { useCoupon } from '../context/CouponContext';
import { normalizeCoupon, searchCoupons } from '../lib/couponsApi';
import { money } from '../utils/commerce';
import '../styles/coupons.css';

const discountLabel = coupon => coupon.discountType === 'percentage' ? `${coupon.discountValue}% de desconto` : `${money(coupon.discountValue)} de desconto`;

export default function CouponPanel({ disabled = false }) {
    const { userId, code, draft, edit, coupon, checking, error, apply, remove } = useCoupon();
    const [focused, setFocused] = useState(false);
    const [active, setActive] = useState(-1);
    const [search, setSearch] = useState(null);
    const id = useId();
    const root = useRef(null);
    const query = draft.trim();
    // Busca por nome do parceiro só para quem está logado; visitante digita o código.
    const showSearch = Boolean(userId) && focused && query.length >= 3 && query !== code && !disabled;
    const results = search?.query === query ? search : null;
    const suggestions = results?.items || [];
    const open = Boolean(showSearch && suggestions.length);

    useEffect(() => {
        if (!showSearch || !userId) return undefined;
        const controller = new AbortController();
        const timer = setTimeout(() => {
            searchCoupons(query, userId, controller.signal).then(items => {
                if (!controller.signal.aborted) setSearch({ query, items });
            }).catch(failure => {
                if (!controller.signal.aborted) setSearch({ query, items: [], error: failure.message });
            });
        }, 280);
        return () => { clearTimeout(timer); controller.abort(); };
    }, [query, showSearch, userId]);

    const select = value => { apply(value); setFocused(false); setActive(-1); };
    const applyDraft = () => { if (!disabled && !checking && query.length >= 3) select(query); };
    const keyDown = event => {
        if (['ArrowDown', 'ArrowUp'].includes(event.key) && suggestions.length && showSearch) {
            event.preventDefault();
            setActive(current => event.key === 'ArrowDown' ? (current + 1) % suggestions.length : (current <= 0 ? suggestions.length : current) - 1);
        } else if (event.key === 'Enter') {
            event.preventDefault();
            if (open && active >= 0 && suggestions[active]) select(suggestions[active].code);
            else applyDraft();
        } else if (event.key === 'Escape') { setFocused(false); setActive(-1); }
    };

    return <section className={`coupon-panel${coupon ? ' is-applied' : ''}`} aria-labelledby={`${id}-title`} ref={root}
        onBlur={event => { if (!root.current?.contains(event.relatedTarget)) setFocused(false); }}>
        <div className="coupon-panel-heading"><span className="coupon-panel-icon"><TicketPercent size={21} aria-hidden="true" /></span><div><h2 id={`${id}-title`}>Tem cupom de desconto?</h2><p>Encontre o cupom pelo nome do parceiro e use na compra.</p></div></div>
            <label className="coupon-label" htmlFor={`${id}-input`}>{userId ? 'Nome do parceiro ou código do cupom' : 'Código do cupom'}</label>
            <div className="coupon-entry"><div className="coupon-autocomplete">
                <input id={`${id}-input`} role="combobox" aria-autocomplete="list" aria-expanded={open} aria-controls={open ? `${id}-list` : undefined}
                    aria-activedescendant={open && active >= 0 && suggestions[active] ? `${id}-option-${active}` : undefined}
                    aria-describedby={`${id}-help`} autoComplete="off" autoCorrect="off" autoCapitalize="characters" spellCheck={false}
                    placeholder={userId ? "DIGITE O NOME OU CUPOM" : "DIGITE O CUPOM"} maxLength={40} value={draft} disabled={disabled}
                    onChange={event => { edit(normalizeCoupon(event.target.value)); setFocused(true); setActive(-1); }}
                    onFocus={() => setFocused(true)} onKeyDown={keyDown} />
                {open && <ul id={`${id}-list`} className="coupon-suggestions" role="listbox" aria-label="Cupons de parceiros">
                    {suggestions.map((item, index) => <li id={`${id}-option-${index}`} key={item.code} role="option" aria-selected={active === index}
                        className={active === index ? 'is-active' : ''} onMouseDown={event => event.preventDefault()} onClick={() => select(item.code)}>
                        <span><strong>{item.partnerName}</strong><small>{item.code}</small></span><span className="coupon-suggestion-offer">{discountLabel(item)}{item.minimumOrderAmount > 0 && <small>Em produtos a partir de {money(item.minimumOrderAmount)}</small>}</span>
                    </li>)}
                </ul>}
            </div><button type="button" className="coupon-apply" onClick={applyDraft} aria-label={checking ? 'Validando cupom' : 'Aplicar cupom'} aria-busy={checking} disabled={disabled || query.length < 3 || checking}>{checking ? <LoaderCircle size={17} className="spin" aria-hidden="true" /> : 'Aplicar'}</button></div>
            <p className="coupon-help" id={`${id}-help`}>{userId ? 'Digite pelo menos 3 caracteres para ver sugestões.' : 'Digite o código do cupom e clique em Aplicar.'}</p>
            <div aria-live="polite" aria-atomic="true">
                {showSearch && <p className="coupon-feedback">{!results ? 'Buscando cupons…' : results.error || (!suggestions.length ? 'Nenhum parceiro encontrado. Se tiver o código completo, digite e clique em Aplicar.' : `${suggestions.length} ${suggestions.length === 1 ? 'cupom encontrado' : 'cupons encontrados'}. Selecione uma sugestão para aplicar.`)}</p>}
                {checking && <p className="coupon-feedback" role="status">Validando {code}…</p>}
                {error && <p className="coupon-feedback is-error" role="alert">{error}</p>}
                {coupon && <div className="coupon-confirmation"><Check size={18} aria-hidden="true" /><div><strong>{coupon.code} aplicado</strong><span>{coupon.partnerName} · {coupon.discountAmount > 0 ? `${money(coupon.discountAmount)} de desconto nos produtos.` : `${discountLabel(coupon)}${coupon.productRates?.length ? ' (alguns produtos têm desconto especial)' : ''}.`}</span></div></div>}
            </div>
            {(code || draft) && <button type="button" className="coupon-remove" disabled={disabled} onClick={() => { remove(); setFocused(false); }}><X size={14} aria-hidden="true" /> {code ? `Remover cupom ${code}` : 'Limpar busca'}</button>}
    </section>;
}
