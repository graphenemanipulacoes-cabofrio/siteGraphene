// App do painel admin no celular (PWA): manifesto, service worker e pedido de instalação.
// O manifesto só entra na página enquanto o /admin está aberto: a loja continua sem app.
import { useState, useSyncExternalStore } from 'react';
import { isEmbeddedBrowser } from '../utils/embeddedBrowser';

export const ADMIN_APP_NAME = 'Graphène Admin';
const HIDE_KEY = 'graphene_admin_app_hide_until';
const HIDE_DAYS = 7;

const HEAD_TAGS = [
    ['link', { rel: 'manifest', href: '/admin.webmanifest' }],
    ['link', { rel: 'apple-touch-icon', sizes: '180x180', href: '/assets/app/admin-180.png' }],
    ['meta', { name: 'mobile-web-app-capable', content: 'yes' }],
    ['meta', { name: 'apple-mobile-web-app-capable', content: 'yes' }],
    ['meta', { name: 'apple-mobile-web-app-title', content: ADMIN_APP_NAME }],
    ['meta', { name: 'apple-mobile-web-app-status-bar-style', content: 'black' }],
];

// Liga o app enquanto o painel está aberto. Devolve a função que tira as marcas ao sair do painel.
export function attachAdminApp() {
    const added = HEAD_TAGS.map(([tag, attributes]) => {
        const element = document.createElement(tag);
        for (const [name, value] of Object.entries(attributes)) element.setAttribute(name, value);
        element.setAttribute('data-admin-app', '');
        document.head.appendChild(element);
        return element;
    });
    if ('serviceWorker' in navigator && window.isSecureContext) {
        navigator.serviceWorker.register('/admin-sw.js', { scope: '/admin' }).catch(() => { /* Sem service worker o app ainda instala pelo menu do navegador. */ });
    }
    return () => added.forEach(element => element.remove());
}

// O Chrome avisa quando o app pode ser instalado. O aviso fica guardado para o botão "Instalar app".
let deferredPrompt = null;
let state = { canPrompt: false, installed: false };
const listeners = new Set();
const setState = next => { state = { ...state, ...next }; listeners.forEach(listener => listener()); };

if (typeof window !== 'undefined') {
    window.addEventListener('beforeinstallprompt', event => {
        event.preventDefault();
        deferredPrompt = event;
        setState({ canPrompt: true });
    });
    window.addEventListener('appinstalled', () => {
        deferredPrompt = null;
        setState({ canPrompt: false, installed: true });
    });
}

const subscribe = listener => { listeners.add(listener); return () => listeners.delete(listener); };
const getState = () => state;

// Abre a janela de instalação do Chrome. Devolve 'accepted', 'dismissed' ou 'unavailable'.
export async function promptInstall() {
    const event = deferredPrompt;
    if (!event) return 'unavailable';
    deferredPrompt = null;
    setState({ canPrompt: false });
    await event.prompt();
    const { outcome } = await event.userChoice;
    if (outcome === 'accepted') setState({ installed: true });
    return outcome;
}

// Celular e navegador em uso. Os parâmetros existem para o script de verificação.
export function installContext(nav = globalThis.navigator, matchMedia = globalThis.matchMedia) {
    const userAgent = String(nav?.userAgent || '');
    const ios = /iPhone|iPad|iPod/i.test(userAgent) || (nav?.platform === 'MacIntel' && nav?.maxTouchPoints > 1);
    const android = !ios && /Android/i.test(userAgent);
    const standalone = nav?.standalone === true
        || ['standalone', 'fullscreen', 'minimal-ui'].some(mode => Boolean(matchMedia?.(`(display-mode: ${mode})`)?.matches));
    return {
        platform: ios ? 'ios' : android ? 'android' : null,
        embedded: isEmbeddedBrowser(userAgent),
        iosSafari: ios && !/CriOS|FxiOS|EdgiOS|OPiOS|GSA\//i.test(userAgent),
        standalone,
    };
}

// O cartão aparece no celular, fora do app já instalado.
export function useAdminInstall() {
    const current = useSyncExternalStore(subscribe, getState, getState);
    const [context] = useState(() => installContext());
    return { ...current, context, offer: Boolean(context.platform) && !context.standalone && !current.installed };
}

// "Agora não" esconde o cartão por 7 dias; o botão do cabeçalho continua abrindo.
export function installCardHidden(now = Date.now()) {
    try { return Number(localStorage.getItem(HIDE_KEY)) > now; } catch { return false; }
}

export function hideInstallCard(now = Date.now()) {
    try { localStorage.setItem(HIDE_KEY, String(now + HIDE_DAYS * 24 * 60 * 60 * 1000)); } catch { /* Sem armazenamento, o cartão volta na próxima visita. */ }
}
