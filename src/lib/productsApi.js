import { supabase } from './supabaseClient';
import { counterRequest } from './counterApi';
import { getSession } from '../utils/security';

// A tela de produtos (AdminProducts) é a mesma para o admin e para o
// farmacêutico, e as duas falam com o mesmo servidor (balcao-api). O admin
// usa o token do painel; o farmacêutico, a conta da equipe. O servidor só
// aceita contas do tipo farmacêutico ou administrador.

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
        save: async product => (await call({ action: 'product_save', id: product.id, name: product.name, description: product.description, price: product.price, imageUrl: product.image_url, options: product.options })).product,
        remove: async id => { await call({ action: 'product_delete', id }); },
        reorder: async ids => { await call({ action: 'products_reorder', ids }); },
        uploadImage: async file => {
            const extension = validateProductImage(file);
            return uploadToStorage(file, await call({ action: 'product_image_upload', extension }));
        },
        // Catálogo de sabores: incluir ou excluir vale para todos os produtos.
        addFlavor: async name => (await call({ action: 'flavor_save', name })).flavor,
        removeFlavor: async id => call({ action: 'flavor_delete', id }),
    };
}

// Admin: mesmo caminho, com o token do painel lido na hora de cada ação.
export const adminProductsApi = Object.fromEntries(
    ['list', 'save', 'remove', 'reorder', 'uploadImage', 'addFlavor', 'removeFlavor']
        .map(method => [method, (...args) => pharmacistProductsApi(getSession()?.token || '')[method](...args)]),
);
