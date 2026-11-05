// Páginas públicas de fórmulas com receita: /receita, /ativos e /prescritores.
// Ficam fora do ar para o domínio poder anunciar no Google: a política para o Brasil
// não aceita promover medicamentos sujeitos a receita em anúncios e páginas de destino.
// A mudança vale para todos os visitantes, sem conteúdo diferente para quem revisa o site.
//
// Para trazer de volta: troque para true e, na mesma publicação, recoloque em vercel.json
// as três rotas (no lugar dos redirecionamentos) e em public/sitemap.xml os três endereços.
// `node scripts/verify-seo.mjs` acusa se faltar algum. Antes, confira se a conta do Google
// Ads tem certificação e se a política ainda permite: voltar sem isso pode suspender a conta.
export const PRESCRIPTION_PAGES_ENABLED = false;
