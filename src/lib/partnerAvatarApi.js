import { supabase } from './supabaseClient';

// Foto de perfil da parceira, mostrada na página do link dela (/cupom/CODIGO). Opcional.
// A foto é cortada em quadrado e reduzida no navegador antes do envio; o envio usa o link assinado
// que a função partner-portal gera, e a mesma função grava a foto no cadastro.
const BUCKET = 'parceiros';
const SIZE = 480;
const MAX_ORIGINAL = 15 * 1024 * 1024;
const MESSAGES = {
    unauthorized: 'Sua sessão terminou. Entre novamente para salvar a foto.',
    not_partner: 'A foto fica disponível depois do cadastro de parceria.',
    invalid_image_type: 'Use uma foto JPG, PNG ou WEBP.',
    too_many_requests: 'Muitas trocas de foto em pouco tempo. Tente de novo mais tarde.',
};

export const avatarUrl = path => (path ? supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl : '');

export function checkAvatarFile(file) {
    if (!file) return 'Escolha uma foto.';
    if (!/^image\/(jpeg|png|webp|heic|heif)$/i.test(file.type || '')) return 'Use uma foto JPG, PNG ou WEBP.';
    if (file.size > MAX_ORIGINAL) return 'A foto é grande demais. Escolha uma de até 15 MB.';
    return '';
}

// Corta no centro em quadrado de 480 px. WebP quando o navegador gera; senão, JPEG.
export async function prepareAvatar(file) {
    const problem = checkAvatarFile(file);
    if (problem) throw new Error(problem);
    const url = URL.createObjectURL(file);
    try {
        const image = await new Promise((resolve, reject) => {
            const element = new Image();
            element.onload = () => resolve(element);
            element.onerror = reject;
            element.src = url;
        });
        const side = Math.min(image.naturalWidth, image.naturalHeight);
        if (!side) throw new Error('empty_image');
        const canvas = document.createElement('canvas');
        canvas.width = SIZE;
        canvas.height = SIZE;
        const context = canvas.getContext('2d');
        context.imageSmoothingQuality = 'high';
        context.drawImage(image, (image.naturalWidth - side) / 2, (image.naturalHeight - side) / 2, side, side, 0, 0, SIZE, SIZE);
        const toBlob = type => new Promise(resolve => canvas.toBlob(resolve, type, 0.86));
        let blob = await toBlob('image/webp');
        let extension = 'webp';
        if (!blob || blob.type !== 'image/webp') {
            blob = await toBlob('image/jpeg');
            extension = 'jpg';
        }
        if (!blob) throw new Error('encode_failed');
        return { blob, extension };
    } catch {
        throw new Error('Não foi possível ler esta foto. Use uma foto JPG ou PNG.');
    } finally {
        URL.revokeObjectURL(url);
    }
}

async function call(body) {
    let payload;
    try {
        const { data, error } = await supabase.functions.invoke('partner-portal', { body });
        payload = data;
        if (error && !payload && error.context?.json) {
            try { payload = await error.context.json(); } catch { /* resposta sem JSON */ }
        }
        if (error || payload?.error) throw new Error(MESSAGES[payload?.error] || 'Não foi possível salvar a foto. Tente novamente.');
        return payload;
    } catch (failure) {
        if (Object.values(MESSAGES).includes(failure?.message) || /^Não foi possível salvar a foto/.test(failure?.message || '')) throw failure;
        throw new Error('Não foi possível salvar a foto. Verifique sua conexão e tente novamente.');
    }
}

// Envia e grava a foto; devolve o endereço público da nova foto.
export async function uploadAvatar(file) {
    const { blob, extension } = await prepareAvatar(file);
    const upload = await call({ action: 'avatar_upload', extension });
    const { error } = await supabase.storage.from(BUCKET).uploadToSignedUrl(upload.path, upload.token, blob, { contentType: upload.contentType });
    if (error) throw new Error('Não foi possível enviar a foto. Tente novamente.');
    const saved = await call({ action: 'avatar_save', path: upload.path });
    return avatarUrl(saved.avatarPath);
}

export async function removeAvatar() {
    await call({ action: 'avatar_remove' });
}

// Página do link: a foto da parceira aprovada com cupom ativo, ou vazio.
export async function fetchPartnerAvatar(code) {
    try {
        const { data, error } = await supabase.rpc('partner_avatar', { p_code: String(code || '') });
        if (error) throw error;
        return avatarUrl(typeof data === 'string' ? data : '');
    } catch (failure) {
        // A foto é um complemento: sem ela, a página mostra a inicial do nome.
        console.error('partner_avatar_unavailable', failure?.message || failure);
        return '';
    }
}
