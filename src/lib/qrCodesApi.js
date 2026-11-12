import { supabase } from './supabaseClient';

// Códigos impressos embaixo do QR code dos rótulos (página /qrcode).
// Produto da loja: G + número do produto (G14 = produto 14), sem cadastro extra.
// Fórmula fora da loja: tabela codigos_qr (ex.: HFC01), com produto_id opcional.

export const normalizarCodigo = valor => String(valor || '')
    .normalize('NFD')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');

export const codigoValido = codigo => /^[A-Z0-9]{2,12}$/.test(codigo);

export const codigoDoProduto = id => `G${id}`;

async function produtoAtivo(id) {
    // RLS: o público só lê produtos ativos; inativo volta vazio.
    const { data, error } = await supabase
        .from('produtos')
        .select('id, name, image_url')
        .eq('id', id)
        .maybeSingle();
    if (error) throw error;
    return data;
}

// Devolve { codigo, nome, produto } ou null quando o código não existe.
export async function buscarCodigo(codigo) {
    const daLoja = /^G(\d{1,7})$/.exec(codigo);
    if (daLoja) {
        const produto = await produtoAtivo(Number(daLoja[1]));
        return produto ? { codigo, nome: produto.name, produto } : null;
    }
    const { data, error } = await supabase
        .from('codigos_qr')
        .select('codigo, nome, produto_id')
        .eq('codigo', codigo)
        .maybeSingle();
    if (error) throw error;
    if (!data) return null;
    const produto = data.produto_id ? await produtoAtivo(data.produto_id) : null;
    return { codigo: data.codigo, nome: data.nome, produto };
}
