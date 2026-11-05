// Leitura pública do catálogo, com a mesma chave do navegador: a regra do banco só entrega produtos ativos.
// Arquivos em api/ que começam com "_" não viram endereço na Vercel.
export async function readProducts(query) {
    const url = process.env.VITE_SUPABASE_URL;
    const key = process.env.VITE_SUPABASE_ANON_KEY;
    if (!url || !key) throw new Error('catalog_not_configured');
    const response = await fetch(`${url}/rest/v1/produtos?${query}`, { headers: { apikey: key }, signal: AbortSignal.timeout(4000) });
    if (!response.ok) throw new Error(`catalog_status_${response.status}`);
    return response.json();
}
