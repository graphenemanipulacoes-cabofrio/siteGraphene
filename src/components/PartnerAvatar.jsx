import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Camera, LoaderCircle, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { checkAvatarFile, removeAvatar, uploadAvatar } from '../lib/partnerAvatarApi';
import { partnerFirstName } from '../utils/couponDisplay';
import '../styles/partnerAvatar.css';

const initial = name => (partnerFirstName(name) || name || '?').trim().charAt(0).toUpperCase() || '?';

// Foto redonda da parceira, com anel colorido (como a foto de perfil do Instagram).
// Sem foto, mostra a inicial do nome.
export function PartnerAvatar({ url, name = '', size = 112, ring = true, alt }) {
    const [broken, setBroken] = useState('');
    const showPhoto = url && broken !== url;
    return <span className={`partner-avatar${ring ? ' has-ring' : ''}`} style={{ '--pa-size': `${size}px` }}>
        {showPhoto
            ? <img src={url} alt={alt ?? `Foto de ${partnerFirstName(name) || name}`} width={size} height={size} decoding="async" onError={() => setBroken(url)} />
            : <span className="partner-avatar-initial" aria-hidden="true">{initial(name)}</span>}
    </span>;
}

// Prévia local no cadastro (a foto só é enviada depois que o cadastro é aceito).
function useLocalPreview(file) {
    const preview = useMemo(() => (file ? URL.createObjectURL(file) : ''), [file]);
    useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);
    return preview;
}

// Cadastro de parceria: escolher (ou tirar) a foto, opcional.
export function PartnerAvatarPicker({ file, onChange, name }) {
    const id = useId();
    const input = useRef(null);
    const preview = useLocalPreview(file);
    const choose = event => {
        const picked = event.target.files?.[0];
        event.target.value = '';
        if (!picked) return;
        const problem = checkAvatarFile(picked);
        if (problem) { toast.error(problem); return; }
        onChange(picked);
    };
    return <div className="partner-avatar-field">
        <PartnerAvatar url={preview} name={name || 'Você'} size={72} alt="Prévia da sua foto" />
        <div>
            <strong id={`${id}-label`}>Foto de perfil <em>opcional</em></strong>
            <small>Aparece na sua página de indicação, como a foto do Instagram. Dá para trocar depois no painel.</small>
            <div className="partner-avatar-actions">
                <button type="button" onClick={() => input.current?.click()} aria-describedby={`${id}-label`}><Camera size={15} aria-hidden="true" /> {file ? 'Trocar foto' : 'Escolher foto'}</button>
                {file && <button type="button" className="is-quiet" onClick={() => onChange(null)}><Trash2 size={14} aria-hidden="true" /> Tirar</button>}
            </div>
        </div>
        <input ref={input} type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" hidden onChange={choose} />
    </div>;
}

// Painel da parceira: a foto atual, com troca e remoção na hora. O administrador só vê.
// Quem usa passa key={initialUrl} para recomeçar quando o painel recarrega com outra foto.
export function PartnerAvatarEditor({ initialUrl = '', name, readOnly = false }) {
    const id = useId();
    const input = useRef(null);
    const [url, setUrl] = useState(initialUrl);
    const [busy, setBusy] = useState('');

    const choose = async event => {
        const picked = event.target.files?.[0];
        event.target.value = '';
        if (!picked) return;
        const problem = checkAvatarFile(picked);
        if (problem) { toast.error(problem); return; }
        setBusy('upload');
        try {
            setUrl(await uploadAvatar(picked));
            toast.success('Foto salva. Ela já aparece na sua página de indicação.');
        } catch (failure) {
            toast.error(failure.message);
        } finally {
            setBusy('');
        }
    };
    const remove = async () => {
        setBusy('remove');
        try {
            await removeAvatar();
            setUrl('');
            toast.success('Foto removida. A página mostra a inicial do seu nome.');
        } catch (failure) {
            toast.error(failure.message);
        } finally {
            setBusy('');
        }
    };

    return <div className="partner-avatar-editor" aria-labelledby={`${id}-title`}>
        <PartnerAvatar url={url} name={name} size={88} />
        <div>
            <strong id={`${id}-title`}>Foto da sua página de indicação</strong>
            <small>{readOnly ? 'Só a própria parceira troca a foto.' : 'Aparece no topo da página do seu link, como a foto do Instagram. Use uma foto sua, de rosto, bem iluminada.'}</small>
            {!readOnly && <div className="partner-avatar-actions">
                <button type="button" onClick={() => input.current?.click()} disabled={Boolean(busy)} aria-busy={busy === 'upload'}>
                    {busy === 'upload' ? <LoaderCircle size={15} className="spin" aria-hidden="true" /> : <Camera size={15} aria-hidden="true" />} {url ? 'Trocar foto' : 'Adicionar foto'}
                </button>
                {url && <button type="button" className="is-quiet" onClick={remove} disabled={Boolean(busy)} aria-busy={busy === 'remove'}><Trash2 size={14} aria-hidden="true" /> Remover</button>}
            </div>}
        </div>
        {!readOnly && <input ref={input} type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" hidden onChange={choose} />}
    </div>;
}
