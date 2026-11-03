import { useEffect, useState } from 'react';
import { KeyRound, LoaderCircle, ShieldCheck } from 'lucide-react';
import { confirmTotpCode, startTotpEnrollment, verifiedTotpFactor } from '../lib/accountAuth';

// Passo do código em duas etapas no login da administração. Na primeira vez,
// mostra o QR Code para ligar o aplicativo autenticador; depois, só pede o código.
export default function AdminMfaStep({ onVerified, onCancel }) {
    const [state, setState] = useState({ loading: true });
    const [code, setCode] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        let active = true;
        (async () => {
            try {
                const factor = await verifiedTotpFactor();
                const next = factor ? { factorId: factor.id } : await startTotpEnrollment();
                if (active) setState(next);
            } catch (failure) {
                if (active) { setState({}); setError(failure.message); }
            }
        })();
        return () => { active = false; };
    }, []);

    const submit = async event => {
        event.preventDefault();
        setBusy(true); setError('');
        try {
            await confirmTotpCode(state.factorId, code);
            await onVerified();
        } catch (failure) {
            setError(failure.message);
            setCode('');
        } finally {
            setBusy(false);
        }
    };

    if (state.loading) return <p className="login-mfa-text" role="status"><LoaderCircle size={16} className="login-mfa-spin" aria-hidden="true" /> Preparando a verificação…</p>;

    return <div className="login-mfa">
        <h3><ShieldCheck size={18} aria-hidden="true" /> Verificação em duas etapas</h3>
        {state.qrCode ? <>
            <p className="login-mfa-text">Para proteger a administração, ligue um aplicativo autenticador (Google Authenticator, por exemplo). Leia o QR Code com o aplicativo e digite o código de 6 dígitos que aparecer.</p>
            <img className="login-mfa-qr" src={state.qrCode} alt="QR Code para o aplicativo autenticador" width="180" height="180" />
            <details className="login-mfa-secret"><summary>Não consegue ler o QR Code?</summary><p>Digite esta chave no aplicativo:</p><code>{state.secret}</code></details>
        </> : <p className="login-mfa-text">Digite o código de 6 dígitos que aparece no seu aplicativo autenticador.</p>}
        {state.factorId && <form onSubmit={submit} className="login-form">
            <div className="login-input-group">
                <label htmlFor="login-mfa-code"><KeyRound size={14} aria-hidden="true" /> Código de 6 dígitos</label>
                <input id="login-mfa-code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} required value={code} onChange={event => setCode(event.target.value.replace(/\D/g, ''))} />
            </div>
            <button type="submit" disabled={busy || code.length !== 6} className="btn-primary-lux login-submit-btn">{busy ? 'Confirmando…' : 'Confirmar'}</button>
        </form>}
        {error && <p className="login-notice" role="alert">{error}</p>}
        <button type="button" className="login-reset-link" onClick={onCancel}>Entrar com outra conta</button>
    </div>;
}
