# Graphène Manipulações — site

Farmácia de manipulação em Cabo Frio (RJ). Site no ar em https://www.graphenemanipulacoes.com.br.
Este arquivo é a fonte de contexto do projeto. Não há notas externas (Obsidian etc.) a consultar.

## Stack
- React 19 + Vite 7, arquivos `.jsx`, rotas com `react-router-dom` (todas em `src/App.jsx`, carregadas sob demanda).
- Supabase: Auth (clientes), Postgres, Storage e Edge Functions (`supabase/functions`).
- Pagamento: Mercado Pago (checkout e webhook nas Edge Functions).
- CSS puro com variáveis; sem Tailwind. Ícones `lucide-react`, avisos `sonner`, arrastar e soltar `@dnd-kit` (ordem dos produtos no admin).
- Deploy na Vercel (`vercel.json`: cabeçalhos de segurança e rotas). O `postbuild` gera páginas estáticas de SEO (`scripts/generate-seo-pages.mjs`).

## Áreas do site
- **Loja pública:** `/`, `/produto/:id`, `/ativos`, `/laboratorio`, `/receita` (envio de receita), `/prescritores`, `/avaliacoes`, `/parceiros`, `/sobre`, `/compras`, `/privacidade`.
- **Compra:** `/carrinho`, `/entrar`, `/minha-conta`, `/checkout`, `/pedido/retorno`, `/redefinir-senha`. Carrinho em `src/context/StoreContext.jsx`.
  Carrinhos autenticados ficam em `customer_carts`/RPC `customer_cart_sync`; `src/utils/cartPersistence.js` mantém cache separado por conta e operações pendentes idempotentes. Não voltar a usar um único localStorage para todos os clientes. Checkout usa sempre `create_checkout_order_v2`, incluindo frete, e `src/lib/checkoutApi.js` cuida da sessão/erros sem repetir pagamentos.
- **Admin** (`/admin`, login em `/login`): solicitações, pedidos, produtos, financeiro, parceiros, acessos do balcão, administradores.
- **Parceiros:** `/parceiros/cadastro`, `/parceiros/entrar`, `/parceiros/painel`.
- **Balcão** (`/balcaographene`): consulta da equipe da loja. Detalhes em `BALCAO_GRAPHENE.md`.

Dados fixos da empresa (CNPJ, endereço, horários, responsável técnica) ficam em `src/data/business.js`. WhatsApp e limites de upload em `src/config.js`.

## Cupons de parceiros
- `CouponPanel` fica sempre aberto no carrinho e na entrega, antes dos produtos/formulário. Busca a partir de 3 caracteres por prefixo do código ou primeiro nome do recebedor, com seleção por mouse/toque/teclado e digitação em maiúsculas. Não criar cupons de exemplo.
- `CouponContext` mantém a escolha entre carrinho e checkout; só o código escolhido é salvo em localStorage separado por conta. Ao editar, o desconto anterior sai do resumo; o código é validado novamente quando o subtotal muda. Não aceitar um rascunho como cupom aplicado.
- A Edge Function `customer-coupons` valida `auth.getUser()` em cada POST. Consulta `lookup_checkout_coupons` (SECURITY INVOKER, execução só service_role), retornando apenas código, primeiro nome e condições de desconto. Nunca liberar acesso direto às tabelas de parceiros/cupons/comissões. A busca não reserva usos e não cria pedidos.
- A estimativa é separada do cálculo definitivo em `create_checkout_order_v2`, que registra `discount_code` e `attributed_recipient_id`. Uma falha de estimativa não deve bloquear a repetição idempotente de um pedido pendente que já reservou o cupom; a revisão faz a validação definitiva. Não alterar a confirmação de pagamento nem gerar comissão antes de pagamento aprovado.
- Financeiro → **Vendas e cupons**: parceiro ao lado do código, busca, datas em Brasília, status, somente cupons e CSV com proteção contra fórmulas. Mostra explicitamente o recorte dos até 300 pedidos mais recentes; não apresentar o recorte como histórico integral.
- Testes: `node --experimental-vm-modules scripts/verify-coupons.mjs`, `node scripts/verify-coupons-ui.mjs` e `scripts/verify-coupons-db.sql` (fixtures sintéticas com rollback, nenhum pagamento).

## Matérias-primas
- O catálogo de `/ativos` fica em `materias_primas`, não em uma lista fixa no código. Os 12 cadastros originais foram preservados pela migração `20261023163541_raw_materials_catalog.sql`.
- Admin: menu **Matérias-primas** (desktop e mobile). Farmacêutico: aba **Matérias-primas**. Ambos usam `AdminMaterials`, `materialsApi` e as ações `material_*`/`materials_list` da `balcao-api` v7; balcão/visitantes/clientes não podem alterar.
- Imagens: miniaturas de 56–60 px, envio assinado JPG/PNG/WEBP até 5 MB no bucket público `receitas`, prefixo `products/material_`. Remover imagem na edição remove a referência do cadastro; não apaga arquivos compartilhados do Storage.
- Verificação: `node scripts/verify-materials-ui.mjs`, `node --experimental-vm-modules scripts/verify-counter.mjs` e `scripts/verify-materials-db.sql` (apenas fixture sintética com rollback).

## Design (manter o atual)
- Visual escuro, azul-marinho com destaques em azul/ciano. Não introduzir verde esmeralda, neon ou efeitos novos sem pedido.
- Variáveis em `src/styles/global.css`; a loja pública sobrescreve a paleta em `src/styles/premium.css` (classes `.page-root` e `.partner-program-page`). Admin e balcão têm estilos próprios (`counter.css`, `purchase.css` e estilos dentro dos componentes).
- Não existe classe `glass-card`. O utilitário de vidro é `.glass` em `glassmorphism.css`, usado com moderação.
- `Button.jsx`: a prop `variant` só muda o efeito ao passar o mouse; o fundo vem do `style` passado. Não "corrigir" isso sem pedido, porque mudaria o visual do admin.

## Regras de código
- Toda chamada ao Supabase com `try...catch`, aviso amigável ao usuário (toast) e sem quebrar a tela.
- Todo `URL.createObjectURL` precisa de `URL.revokeObjectURL` ao remover o arquivo e no cleanup do `useEffect`.
- Operações sensíveis (pedidos, admin, parceiros, balcão) passam pelas Edge Functions. Nunca colocar service-role key, token do Mercado Pago ou segredo de webhook em variáveis `VITE_*` (ver `ECOMMERCE_SECURITY.md`).
- Mudanças no banco entram como nova migração em `supabase/migrations`. `supabase/estrutura-inicial.sql` é só referência histórica: não executar.
- Não inventar informações (laudos, avaliações, prazos, números). Dados ausentes aparecem como "não informado".
- Testes nunca com dados reais de saúde ou de clientes.

## Comandos
- `npm run dev`: ambiente local.
- `npm run build`: build + páginas de SEO. `npm run lint`: lint (deve terminar sem erros).
- `node scripts/verify-seo.mjs` e `node --experimental-vm-modules scripts/verify-counter.mjs`: verificações.
- `node scripts/bundle-counter-function.mjs`: gera `supabase/deploy/balcao-api.ts` para publicar a função do balcão pelo editor do Supabase.

## Armazenamento (Supabase)
- `receitas` (público): só fotos de produto. Sem listagem e sem envio anônimo; o admin envia fotos por link assinado (ação `product_image_upload` da função `admin-orders`). Aceita JPG/PNG/WEBP até 5 MB.
- `receitas-privadas`: receitas de clientes. `intake/` = formulário atual; `legacy/` = receitas do formulário antigo, movidas do bucket público em 20/10/2026. Admin e balcão abrem com links de 5 minutos; as referências antigas no banco (URLs públicas) são convertidas para `legacy/` pelas funções.

## Pendências técnicas conhecidas
- Publicar o site (Vercel) com o código atual: até lá, o envio de foto nova de produto pelo admin do site no ar não funciona (pelo site local funciona).
- Senhas do admin usam SHA-256 sem sal (o balcão já usa PBKDF2).
- Proteção contra senhas vazadas no login de clientes exige o plano Pro do Supabase.
- A função `migrar-receitas-antigas` está desativada (responde 410) e pode ser excluída no painel do Supabase.
- O conector do Supabase está disponível. Em 23/10/2026, a migração de carrinho foi aplicada em duas partes (`customer_cart_storage`, `customer_cart_sync`) após erro de confirmação no arquivo completo; `checkout_retry` também foi aplicada. `create-checkout` v13 aceita os domínios oficiais e a publicação estável `https://site-graphene.vercel.app`, com retorno para a mesma origem HTTPS (preserva sessão). Nunca liberar `*.vercel.app` genericamente. Não repetir migrações antigas sem conferir o schema atual.
- Itens de negócio (alvará, Google Ads, frete, trocas): `PENDENCIAS_GOOGLE_E_SITE.md`.
