import { supabase } from './supabaseClient';

// Produtos que a parceira destaca no próprio link. A leitura é pública e devolve só
// os números dos produtos; quem grava é a própria parceira ou um administrador.
export async function fetchShowcase(code) {
    try {
        const { data, error } = await supabase.rpc('partner_showcase_products', { p_code: String(code || '') });
        if (error) throw error;
        return Array.isArray(data) ? data.map(String) : [];
    } catch (failure) {
        // A seleção é um complemento: sem ela, a loja aparece normalmente.
        console.error('partner_showcase_unavailable', failure?.message || failure);
        return [];
    }
}

export async function saveShowcase(productIds, partnerId) {
    try {
        const { data, error } = await supabase.rpc('save_partner_showcase', { p_product_ids: productIds.map(Number), p_partner_id: partnerId || null });
        if (error) throw error;
        return Array.isArray(data) ? data.map(String) : [];
    } catch (failure) {
        const message = String(failure?.message || '');
        if (/authentication_required/.test(message)) throw new Error('Sua sessão terminou. Entre novamente para salvar a seleção.');
        if (/forbidden|partner_not_approved/.test(message)) throw new Error('Só a parceira aprovada ou um administrador pode alterar esta seleção.');
        throw new Error('Não foi possível salvar a seleção. Tente novamente.');
    }
}
