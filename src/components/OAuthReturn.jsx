import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useStore } from '../context/StoreContext';

const ENTRY_PATH = '/entrar';

// O Google pode voltar para a página inicial, e não para /entrar. Quem tinha um destino
// guardado é levado até /entrar, que já segue para o destino certo.
export default function OAuthReturn() {
    const { authReady, customer } = useStore();
    const { pathname } = useLocation();
    const navigate = useNavigate();
    useEffect(() => {
        if (!authReady || !customer || pathname === ENTRY_PATH) return;
        let pending = null;
        try { pending = sessionStorage.getItem('graphene_oauth_intent'); } catch { /* Sem destino guardado. */ }
        if (pending) navigate(`${ENTRY_PATH}?oauth=google`, { replace: true });
    }, [authReady, customer, navigate, pathname]);
    return null;
}
