import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { money } from '../utils/commerce';
import { resolveProductImage } from '../utils/productImages';
import { productOptions } from '../utils/productOptions';
import { goalOf } from '../utils/productGoals';

// "Veja também": até 4 produtos, priorizando o mesmo objetivo e o que já está à venda.
export default function RelatedProducts({ product }) {
    const [all, setAll] = useState([]);
    useEffect(() => {
        let active = true;
        supabase.from('produtos').select('id, name, price, image_url, options, display_order')
            .order('display_order', { ascending: true, nullsFirst: false })
            .then(({ data }) => { if (active && Array.isArray(data)) setAll(data); });
        return () => { active = false; };
    }, []);

    if (!product || !all.length) return null;
    const goal = goalOf(product);
    const priced = item => Number(item.price) > 0;
    const others = all.filter(item => String(item.id) !== String(product.id));
    const sameGoal = others.filter(item => goalOf(item) === goal);
    // Mesmo objetivo à venda, depois outros à venda, depois do mesmo objetivo que chegam em breve.
    const picks = [...sameGoal.filter(priced), ...others.filter(item => priced(item) && goalOf(item) !== goal), ...sameGoal.filter(item => !priced(item))].slice(0, 4);
    if (!picks.length) return null;

    return <section className="purchase-related" aria-labelledby="related-title">
        <h2 id="related-title">Veja também</h2>
        <ul>
            {picks.map(item => {
                const options = productOptions(item);
                const from = options.availableSizes.length > 1 || options.flavorPrice > 0;
                return <li key={item.id}>
                    <Link to={`/produto/${item.id}`}>
                        <span className="purchase-related-photo"><img src={resolveProductImage(item)} alt="" loading="lazy" /></span>
                        <strong>{item.name}</strong>
                        <small>{priced(item) ? <>{from ? 'A partir de ' : ''}<b>{money(item.price)}</b></> : 'Em breve'}</small>
                    </Link>
                </li>;
            })}
        </ul>
    </section>;
}
