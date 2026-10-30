import { supabase } from './supabaseClient';
import { createSession } from '../utils/security';
import { adminStaffSession } from '../utils/counter';

export const counterErrors = {
    unauthorized: 'Seu acesso foi encerrado. Entre novamente ou consulte o administrador.',
    not_staff: 'Este e-mail não tem acesso da equipe. Peça ao administrador para cadastrá-lo ou entre com outro e-mail.',
    too_many_attempts: 'Muitas tentativas de acesso. Aguarde até 15 minutos e tente novamente.',
    invalid_account: 'Confira o nome e o e-mail. A senha inicial, se preenchida, precisa ter de 10 a 128 caracteres.',
    email_exists: 'Esse e-mail já tem um acesso da equipe. Edite o cadastro existente.',
    password_required: 'Esse e-mail ainda não tem conta no site. Defina uma senha inicial para criar a conta.',
    invalid_password: 'O Supabase recusou essa senha. Use uma senha mais forte (10 caracteres ou mais).',
    unable_to_check_account: 'Não foi possível conferir a conta desse e-mail agora. Tente de novo.',
    invalid_date: 'Confira as datas do filtro.',
    not_found: 'Esse registro não está mais disponível. Atualize a lista.',
    login_unavailable: 'O acesso ao balcão ainda não está disponível no servidor. Consulte o administrador.',
    wrong_area: 'Esta conta não é de farmacêutico. Peça ao administrador para liberar o acesso.',
    forbidden: 'Sua conta não tem permissão para esta área.',
    invalid_product: 'Confira o nome, a imagem, as quantidades (nomes diferentes entre si) e os preços do produto.',
    invalid_shipping: 'Confira os valores: preço entre R$ 0 e R$ 1.000 e prazo mínimo menor ou igual ao máximo.',
    unable_to_save_settings: 'Não foi possível salvar as regras de frete. Tente de novo.',
    invalid_flavor: 'Digite um nome de sabor com pelo menos 2 letras.',
    invalid_material: 'Confira o nome, categoria, imagem e os marcadores (até 8, com no máximo 60 caracteres cada).',
    unable_to_save_material: 'Não foi possível salvar a matéria-prima. Tente novamente.',
    flavor_exists: 'Esse sabor já está na lista.',
    unable_to_save_flavor: 'Não foi possível salvar o sabor. Tente de novo.',
    invalid_image_type: 'Use uma imagem JPG, PNG ou WEBP.',
    unable_to_prepare_upload: 'Não foi possível preparar o envio da imagem. Tente de novo.',
    unable_to_save_product: 'Não foi possível salvar o produto. Tente de novo.',
    unable_to_load_data: 'Não foi possível carregar os dados. Tente atualizar a página.',
    unable_to_save_account: 'Não foi possível salvar o acesso. Tente de novo.',
};

// Entra no balcão ou na área do farmacêutico com a conta do site já conectada.
// Administrador recebe o token do painel (vale em todas as áreas, 8 horas);
// a equipe recebe o token próprio, salvo no navegador até o logout manual.
export async function enterStaffArea(area, storageKey) {
    const created = await counterRequest({ action: 'login', area, deviceLabel: `${navigator.platform || 'Computador'} · ${area === 'farmaceutico' ? 'farmacêutico' : 'balcão'}` });
    if (created.user?.role === 'admin') {
        createSession({ token: created.token, user: created.user.email, expiresAt: created.expiresAt });
        return adminStaffSession();
    }
    try { localStorage.setItem(storageKey, JSON.stringify(created)); }
    catch {
        counterRequest({ action: 'logout', sessionToken: created.token }).catch(() => {});
        const error = new Error('O navegador não permite salvar a sessão. Habilite o armazenamento e tente de novo.');
        error.code = 'storage_blocked';
        throw error;
    }
    return created;
}

export async function counterRequest(body, adminToken) {
    const result = await supabase.functions.invoke('balcao-api', {
        body,
        ...(adminToken ? { headers: { 'x-admin-token': adminToken } } : {}),
    });
    let data = result.data;
    if (result.error && !data && result.error.context?.json) {
        try { data = await result.error.context.json(); } catch { /* Non-JSON connection failures. */ }
    }
    if (result.error || data?.error) {
        const error = new Error(counterErrors[data?.error] || 'Não foi possível conectar ao balcão. Tente atualizar; se persistir, consulte o administrador.');
        error.code = data?.error || 'connection_error';
        throw error;
    }
    return data;
}
