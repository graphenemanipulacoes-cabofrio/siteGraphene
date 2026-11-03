// Regras dos anexos de receita usadas nas telas da equipe.
export const isPdfFile = file => String(file?.name || '').toLowerCase().endsWith('.pdf');

// arquivo_url guarda uma lista em JSON; registros antigos guardam um único endereço.
export const hasAttachments = reference => {
    if (!reference) return false;
    try {
        const parsed = JSON.parse(reference);
        return Array.isArray(parsed) ? parsed.length > 0 : Boolean(parsed);
    } catch {
        return true;
    }
};

const slug = value => String(value || '').normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40);

export const attachmentFileName = (clientName, index, file) => {
    const extension = /\.([a-z0-9]{2,5})$/i.exec(file?.name || '')?.[1]?.toLowerCase() || 'arquivo';
    return `${['receita', slug(clientName)].filter(Boolean).join('-')}-${index + 1}.${extension}`;
};
