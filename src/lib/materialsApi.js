import { supabase } from './supabaseClient';
import { counterRequest } from './counterApi';
import { getSession } from '../utils/security';
import { validateProductImage } from './productsApi';

export async function listPublicMaterials() {
    const { data, error } = await supabase.from('materias_primas').select('*').order('display_order').order('name').limit(1000);
    if (error) throw new Error('Não foi possível carregar as matérias-primas. Tente novamente.');
    return data || [];
}

export function materialsApi(sessionToken, onUnauthorized) {
    const call = async body => {
        try { return await counterRequest({ ...body, sessionToken }); }
        catch (error) {
            if (error.code === 'unauthorized' || error.code === 'forbidden') onUnauthorized?.(error.message);
            throw error;
        }
    };
    return {
        list: async () => (await call({ action: 'materials_list' })).materials || [],
        save: async material => (await call({ action: 'material_save', id: material.id, material })).material,
        remove: async id => call({ action: 'material_delete', id }),
        uploadImage: async file => {
            const extension = validateProductImage(file);
            if (!file.size || !['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) throw new Error('Use uma imagem JPG, PNG ou WEBP válida, de até 5 MB.');
            const upload = await call({ action: 'material_image_upload', extension });
            const { error } = await supabase.storage.from('receitas').uploadToSignedUrl(upload.path, upload.token, file, { contentType: upload.contentType });
            if (error) throw new Error('Não foi possível enviar a imagem. Tente novamente.');
            return supabase.storage.from('receitas').getPublicUrl(upload.path).data.publicUrl;
        },
    };
}

export const adminMaterialsApi = Object.fromEntries(['list', 'save', 'remove', 'uploadImage']
    .map(method => [method, (...args) => materialsApi(getSession()?.token || '')[method](...args)]));
