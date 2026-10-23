import { useEffect } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';

// Ao abrir outra página pelo site, começa do topo. Voltar/avançar no
// navegador e links com "#" (ex.: /#produtos) mantêm o comportamento próprio.
export default function ScrollToTop() {
    const { pathname, hash } = useLocation();
    const type = useNavigationType();
    useEffect(() => {
        if (type === 'POP' || hash) return;
        window.scrollTo(0, 0);
    }, [pathname, hash, type]);
    return null;
}
