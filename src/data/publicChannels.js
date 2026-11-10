// Páginas públicas de fórmulas com receita: /receita, /ativos e /prescritores.
// No ar desde 10/11/2026, por decisão do dono: a divulgação passou a ser por influenciadoras
// e pelo Meta, e não pelo Google. Entre 04/11 e 10/11/2026 ficaram fora do ar, porque a
// política do Google para o Brasil não aceita promover medicamentos sujeitos a receita em
// anúncios e páginas de destino.
//
// Para tirar do ar de novo (voltar a tentar o Google): troque para false e, na mesma
// publicação, passe as três rotas de "rewrites" para "redirects" (destino "/") em vercel.json
// e tire os três endereços de public/sitemap.xml. `node scripts/verify-seo.mjs` acusa se
// faltar algum. A mudança vale para todos os visitantes, sem conteúdo diferente para quem
// revisa o site.
export const PRESCRIPTION_PAGES_ENABLED = true;
