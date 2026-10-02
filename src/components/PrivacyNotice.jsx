import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ShieldCheck, X } from 'lucide-react';

const NOTICE_KEY = 'graphene_privacy_notice_dismissed';

export default function PrivacyNotice() {
    const { pathname } = useLocation();
    const [visible, setVisible] = useState(() => {
        try { return localStorage.getItem(NOTICE_KEY) !== 'true'; }
        catch { return true; }
    });

    const dismiss = () => {
        try { localStorage.setItem(NOTICE_KEY, 'true'); } catch { /* A preference is optional when storage is unavailable. */ }
        finally { setVisible(false); }
    };

    if (!visible || pathname.startsWith('/admin') || pathname === '/login') return null;

    return (
        <aside className="privacy-notice" aria-label="Aviso sobre privacidade e armazenamento do navegador">
            <div className="privacy-notice-icon" aria-hidden="true"><ShieldCheck size={20} /></div>
            <div className="privacy-notice-copy">
                <strong>Sua privacidade importa</strong>
                <p>Usamos armazenamento necessário para manter seu carrinho e sua sessão. Consulte como os dados são tratados.</p>
                <Link to="/privacidade" onClick={dismiss}>Ler aviso de privacidade</Link>
            </div>
            <button className="privacy-notice-dismiss" type="button" onClick={dismiss} aria-label="Fechar aviso">
                <span>Entendi</span><X size={17} />
            </button>
            <style>{`
                .privacy-notice { position: fixed; z-index: 1200; left: 20px; bottom: 20px; width: min(460px, calc(100vw - 40px)); display: flex; align-items: flex-start; gap: 13px; padding: 17px 16px; color: var(--text-main); background: #101722; border: 1px solid rgba(94, 190, 207, .28); border-radius: 14px; box-shadow: 0 16px 48px rgba(0, 0, 0, .42); }
                .privacy-notice-icon { display: grid; place-items: center; flex: 0 0 36px; width: 36px; height: 36px; color: var(--brand-green); background: rgba(36, 211, 154, .1); border-radius: 10px; }
                .privacy-notice-copy { min-width: 0; flex: 1; }
                .privacy-notice-copy strong { display: block; margin: 1px 0 5px; font-size: .91rem; }
                .privacy-notice-copy p { margin: 0 0 6px; color: var(--text-dim); font-size: .8rem; line-height: 1.5; }
                .privacy-notice-copy a { color: var(--brand-blue); font-size: .79rem; font-weight: 650; text-decoration: underline; text-underline-offset: 3px; }
                .privacy-notice-dismiss { display: inline-flex; align-items: center; gap: 4px; margin: -4px -5px 0 0; padding: 7px 6px; border: 0; color: var(--text-dim); background: transparent; font: inherit; font-size: .74rem; cursor: pointer; }
                .privacy-notice-dismiss:hover { color: var(--text-main); }
                @media (max-width: 520px) { .privacy-notice { left: 12px; bottom: 12px; width: calc(100vw - 24px); padding: 14px 12px; gap: 9px; } .privacy-notice-dismiss span { display: none; } }
            `}</style>
        </aside>
    );
}
