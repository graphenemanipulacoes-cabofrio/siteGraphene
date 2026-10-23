import { supabase } from './supabaseClient';

export const counterErrors = {
    unauthorized: 'Seu acesso foi encerrado. Entre novamente ou consulte o administrador.',
    invalid_credentials: 'Usuário ou senha incorretos, ou acesso desativado.',
    too_many_attempts: 'Muitas tentativas de acesso. Aguarde até 15 minutos e tente novamente.',
    invalid_account: 'Confira o nome, usuário e senha. A senha deve ter entre 12 e 128 caracteres.',
    username_exists: 'Esse usuário já está cadastrado. Escolha outro nome de acesso.',
    invalid_date: 'Confira as datas do filtro.',
    not_found: 'Esse registro não está mais disponível. Atualize a lista.',
    login_unavailable: 'O acesso ao balcão ainda não está disponível no servidor. Consulte o administrador.',
    wrong_area: 'Esta conta não é de farmacêutico. Peça ao administrador para liberar o acesso.',
    forbidden: 'Sua conta não tem permissão para esta área.',
    invalid_product: 'Confira o nome, a imagem, as quantidades (nomes diferentes entre si) e os preços do produto.',
    invalid_flavor: 'Digite um nome de sabor com pelo menos 2 letras.',
    flavor_exists: 'Esse sabor já está na lista.',
    unable_to_save_flavor: 'Não foi possível salvar o sabor. Tente de novo.',
    invalid_image_type: 'Use uma imagem JPG, PNG ou WEBP.',
    unable_to_prepare_upload: 'Não foi possível preparar o envio da imagem. Tente de novo.',
    unable_to_save_product: 'Não foi possível salvar o produto. Tente de novo.',
    unable_to_load_data: 'Não foi possível carregar os dados. Tente atualizar a página.',
    unable_to_save_account: 'Não foi possível salvar o acesso. Tente de novo.',
};

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
