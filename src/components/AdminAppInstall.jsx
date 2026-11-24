import { useState } from 'react';
import { Download, EllipsisVertical, Share, SquarePlus } from 'lucide-react';
import { toast } from 'sonner';
import { ADMIN_APP_NAME, promptInstall } from '../lib/adminApp';
import '../styles/adminApp.css';

// Cartão "Instale o app do painel", só no celular. No Android, quando o Chrome libera, o botão abre a
// instalação; no iPhone e nos outros casos, mostra os passos no próprio navegador.
export default function AdminAppInstall({ install, onClose, onInstalled }) {
    const { canPrompt, context } = install;
    const [busy, setBusy] = useState(false);
    const address = `${window.location.host}/admin`;
    const ios = context.platform === 'ios';
    const showButton = canPrompt && !ios && !context.embedded;

    const handleInstall = async () => {
        setBusy(true);
        try {
            const outcome = await promptInstall();
            if (outcome === 'accepted') {
                toast.success(`Pronto! O app ${ADMIN_APP_NAME} está na tela inicial.`);
                onInstalled();
            }
        } catch {
            toast.error('Não foi possível abrir a instalação. Use o menu do navegador.');
        } finally {
            setBusy(false);
        }
    };

    let guide = null;
    if (context.embedded) {
        guide = <p>Este navegador, dentro de outro aplicativo, não instala apps. Abra <strong>{address}</strong> no {ios ? 'Safari' : 'Chrome'}.</p>;
    } else if (ios) {
        guide = <>
            <ol className="aai-steps">
                <li>Toque em Compartilhar <Share size={16} aria-hidden="true" />{context.iosSafari ? ' na barra do Safari.' : ', ao lado do endereço do site.'}</li>
                <li>Role a lista e toque em <strong>Adicionar à Tela de Início</strong> <SquarePlus size={16} aria-hidden="true" />.</li>
                <li>Toque em <strong>Adicionar</strong>.</li>
            </ol>
            {!context.iosSafari && <p className="aai-note">Se a opção não aparecer, abra {address} no Safari.</p>}
            <p className="aai-note">Se o app pedir para entrar, use o seu e-mail e senha.</p>
        </>;
    } else if (!showButton) {
        guide = <ol className="aai-steps">
            <li>Toque no menu <EllipsisVertical size={16} aria-hidden="true" /> do Chrome, no canto de cima.</li>
            <li>Escolha <strong>Instalar app</strong> ou <strong>Adicionar à tela inicial</strong>.</li>
            <li>Confirme em <strong>Instalar</strong>.</li>
        </ol>;
    }

    return <section className="aai-card" aria-labelledby="aai-title">
        <img className="aai-icon" src="/assets/app/admin-192.png" alt="" width="48" height="48" />
        <div className="aai-body">
            <h2 id="aai-title">Instale o app do painel</h2>
            <p>Abra o painel pela tela inicial do celular, em tela cheia, como um aplicativo.</p>
            {guide}
            <div className="aai-actions">
                {showButton && <button type="button" className="aai-btn primary" onClick={handleInstall} disabled={busy}><Download size={17} aria-hidden="true" /> Instalar app</button>}
                <button type="button" className="aai-btn" onClick={onClose}>Agora não</button>
            </div>
        </div>
    </section>;
}
