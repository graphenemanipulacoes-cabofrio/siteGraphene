import { supabase } from './supabaseClient';
import { counterRequest } from './counterApi';
import { getSession } from '../utils/security';

// A tela de produtos (AdminProducts) é a mesma para o admin e para o
// farmacêutico. Só muda o caminho até o servidor: o admin usa a sessão de
// administrador; o farmacêutico usa a conta da equipe (balcao-api), que o
// servidor só aceita se for do tipo "farmacêutico".

async function uploadToStorage(file, upload) {
    const { error } = await supabase.storage.from('receitas').uploadToSignedUrl(upload.path, upload.token, file, { contentType: upload.contentType });
    if (error) throw new Error('Não foi possível enviar a imagem do produto');
    return supabase.storage.from('receitas').getPublicUrl(upload.path).data.publicUrl;
}

export function validateProductImage(file) {
    const extension = file.name.split('.').pop()?.toLowerCase() || '';
    if (!['jpg', 'jpeg', 'png', 'webp'].includes(extension)) throw new Error('Use uma imagem JPG, PNG ou WEBP');
    if (file.size > 5 * 1024 * 1024) throw new Error('A imagem deve ter até 5 MB');
    return extension;
}

async function adminRpc(params) {
    const { data, error } = await supabase.rpc('admin_manage_products', { p_token: getSession()?.token || '', ...params });
    if (error || data?.error) throw new Error(data?.error || error?.message || 'Não foi possível concluir a operação');
    return data;
}

export const adminProductsApi = {
    list: async () => (await adminRpc({ p_action: 'list' })).products || [],
    save: async product => (await adminRpc({ p_action: 'save', p_product: product })).product,
    remove: async id => { await adminRpc({ p_action: 'delete', p_product: { id } }); },
    reorder: async ids => { await adminRpc({ p_action: 'reorder', p_product_ids: ids }); },
    uploadImage: async file => {
        const extension = validateProductImage(file);
        const { data, error } = await supabase.functions.invoke('admin-orders', {
            body: { action: 'product_image_upload', extension },
            headers: { 'x-admin-token': getSession()?.token || '' },
        });
        if (error || data?.error || !data?.token) throw new Error('Não foi possível preparar o envio da imagem');
        return uploadToStorage(file, data);
    },
};

export function pharmacistProductsApi(sessionToken, onUnauthorized) {
    const call = async body => {
        try { return await counterRequest({ ...body, sessionToken }); }
        catch (failure) {
            if (failure.code === 'unauthorized' || failure.code === 'forbidden') onUnauthorized?.(failure.message);
            throw failure;
        }
    };
    return {
        list: async () => (await call({ action: 'products_list' })).products || [],
        save: async product => (await call({ action: 'product_save', id: product.id, name: product.name, description: product.description, price: product.price, imageUrl: product.image_url })).product,
        remove: async id => { await call({ action: 'product_delete', id }); },
        reorder: async ids => { await call({ action: 'products_reorder', ids }); },
        uploadImage: async file => {
            const extension = validateProductImage(file);
            return uploadToStorage(file, await call({ action: 'product_image_upload', extension }));
        },
    };
}
