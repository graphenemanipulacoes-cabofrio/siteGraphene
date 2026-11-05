# Graphène Manipulações — site

Farmácia de manipulação em Cabo Frio (RJ). Site no ar em https://www.graphenemanipulacoes.com.br.
Este arquivo é a fonte de contexto do projeto. Não há notas externas (Obsidian etc.) a consultar.

## Stack
- React 19 + Vite 7, arquivos `.jsx`, rotas com `react-router-dom` (todas em `src/App.jsx`, carregadas sob demanda).
- Supabase: Auth (clientes), Postgres, Storage e Edge Functions (`supabase/functions`).
- Pagamento: Mercado Pago (checkout e webhook nas Edge Functions).
- CSS puro com variáveis; sem Tailwind. Ícones `lucide-react`, avisos `sonner`, arrastar e soltar `@dnd-kit` (ordem dos produtos no admin).
- Deploy na Vercel (`vercel.json`: cabeçalhos de segurança e rotas). O `postbuild` gera páginas estáticas de SEO com conteúdo no próprio HTML (`scripts/generate-seo-pages.mjs`, `src/seo/staticHtml.js`). As funções da pasta `api/` servem `/produto/:id`, `/feed.xml` e `/sitemap-produtos.xml`.

## Áreas do site
- **Loja pública:** `/`, `/produto/:id`, `/laboratorio`, `/avaliacoes`, `/parceiros`, `/sobre`, `/compras`, `/trocas`, `/privacidade`. `/ativos`, `/receita` e `/prescritores` estão fora do ar por causa dos anúncios (ver "Anúncios no Google").
- **Compra:** `/carrinho`, `/entrar`, `/minha-conta`, `/checkout`, `/pedido/retorno`, `/redefinir-senha`. Carrinho em `src/context/StoreContext.jsx`.
  Carrinhos autenticados ficam em `customer_carts`/RPC `customer_cart_sync`; `src/utils/cartPersistence.js` mantém cache separado por conta e operações pendentes idempotentes. Não voltar a usar um único localStorage para todos os clientes. Checkout usa sempre `create_checkout_order_v2`, incluindo frete, e `src/lib/checkoutApi.js` cuida da sessão/erros sem repetir pagamentos.
- **Admin** (`/admin`, login em `/login`): solicitações, pedidos, produtos, financeiro, parceiros, acessos do balcão, administradores.
- **Parceiros:** `/parceiros/cadastro`, `/parceiros/entrar`, `/parceiros/painel`.
- **Balcão** (`/balcaographene`): consulta da equipe da loja. Detalhes em `BALCAO_GRAPHENE.md`.

Dados fixos da empresa (CNPJ, endereço, horários, responsável técnica) ficam em `src/data/business.js`. WhatsApp e limites de upload em `src/config.js`.

## Login único por e-mail
- Todos entram com a conta do site no Supabase Auth (e-mail e senha ou Google): clientes, parceiros, equipe e admin. Não existe mais usuário/senha próprios do admin ou do balcão.
- O papel vem do e-mail: `admins.email` (admin, todas as áreas) e `counter_accounts.email` (balcão/farmacêutico). Parceiro = `partner_profiles.id` igual ao id da conta. Migração `20261030173953_login_por_email.sql`.
- `admin-login` e a ação `login` do `balcao-api` recebem a sessão (Authorization) e devolvem os tokens internos de sempre (`x-admin-token` 8 h; token da equipe sem vencimento). `ensureAdminSession` (`src/lib/accountAuth.js`) renova o token do painel sozinho.
- Admin cadastra admins e equipe pelo e-mail; e-mail sem conta exige senha inicial (cria a conta já confirmada). Conta com senha que ainda não é da equipe também exige senha nova. Cada um troca a senha em `/minha-conta`.
- Admin abre o painel de qualquer parceiro (`/parceiros/painel?parceiro=id`, só leitura). Sair do admin, balcão ou farmacêutico sai também da conta do site.
- Google sempre volta por `/entrar?oauth=google` e segue para o destino salvo em `graphene_oauth_intent`.
- O papel da conta fica em `StoreContext` (`staffRole`, via RPC `current_staff_role`). Admin/equipe veem no cabeçalho o botão dourado "Painel admin"/"Área da equipe" (`.gh-staff-btn`) que leva a `/colaboradores`; no login normal sem destino pedido, também vão direto para lá. `/colaboradores` mostra só as áreas do papel, já conectadas.
- Quem tem parceria vê no cabeçalho o mesmo botão dourado, "Painel do parceiro", que leva a `/parceiros/painel` (`partnerStatus` em `StoreContext`, via RPC `current_partner_status`; `refreshAccountRoles` atualiza depois do cadastro). No painel, "Voltar ao site" mantém a conta conectada; só "Sair" encerra a sessão.
- O login só vale no endereço em que aconteceu. Enquanto a Site URL do painel for o endereço da Vercel, o Google volta para lá; por isso `vercel.json` redireciona `site-graphene.vercel.app` para o domínio oficial, levando a sessão, e `OAuthReturn` segue para o destino guardado.

## Segurança
- **Admin sem segunda etapa** (decisão do dono em 03/11/2026): o código do celular com QR foi retirado; a administração depende só do login da conta e do e-mail em `admins`.
- **Envio de receita:** `/receita` passa pela função pública `receita-intake` (`prepare` gera links assinados em `receitas-privadas/intake/`; `submit` grava em `solicitacoes`). Limites no servidor: 6 por hora por endereço e 60 por dia no total; sem o banco de limites, recusa o envio. Não reabrir política pública de envio nem insert em `solicitacoes`.
- **Parceria:** `partner-register` não cria contas. Exige conta com e-mail confirmado e usa o e-mail e o id da conta, nunca os do formulário.
- **Cadastro sem confirmação de e-mail** (decisão do dono em 03/11/2026). `/entrar` cria a conta pela função `customer-signup`, já confirmada, com até 10 cadastros por hora por endereço; depois entra com `signInWithPassword`. Não voltar a usar `auth.signUp` no site. "Confirm email" continua ligado no painel de propósito: assim o cadastro direto pela API pública não gera conta utilizável e não contorna o limite, e a troca de e-mail da conta segue exigindo confirmação. Como o e-mail da conta não prova a posse, valem estas travas (migração `contas_sem_confirmacao`):
  - Gatilho `protect_staff_email`: nenhuma conta nova ou troca de e-mail pode usar um e-mail de `admins` ou `counter_accounts`. Por isso as funções criam a conta antes de gravar o e-mail nessas tabelas. Se a conta de alguém da equipe for apagada, remova e cadastre a pessoa de novo.
  - `ensureAuthAccount`: conta com senha que ainda não é da equipe só recebe papel com senha nova; as sessões antigas são apagadas (`reset_account_access`). Conta só com Google não precisa de senha.
  - Gatilho `secure_account_on_external_login`: ao ligar o Google a uma conta com senha, a senha e as sessões antigas deixam de valer. A pessoa continua entrando com Google e pode criar outra senha em `/minha-conta`.
  - Verificação: `scripts/verify-account-guards-db.sql` (dados sintéticos com rollback).
- **Campos de senha:** sempre `PasswordField` (olhinho para mostrar ou ocultar). O cadastro em `/entrar` pede a senha duas vezes.
- **Limites:** `takeRateLimit` (`_shared/counter-security.ts`, RPC `take_rate_limit`, só service_role) guarda o endereço em hash. `customer-coupons` aceita 120 consultas em 5 minutos por endereço.
- **Registro de ações:** `logAdminAction` grava em `admin_audit_log` (sem acesso pelo navegador); aparece em Gerenciar Admins › Registro de ações.
- **CSP** em `vercel.json`: `script-src 'self'`, sem script inline. Serviço externo novo (script, imagem, API) precisa entrar na CSP, senão o navegador bloqueia. Para testar: `npm run build` e `node scripts/serve-dist.mjs` (porta 5180), que serve `dist/` com os cabeçalhos da produção.
- Verificação: `node --experimental-vm-modules scripts/verify-security.mjs`. Plano de segurança do comércio: `ECOMMERCE_SECURITY.md`.

## Anúncios no Google
- Regra para o Brasil: farmácia on-line registrada na Anvisa, certificada pelo Google e sem promover medicamentos controlados em anúncios, páginas de destino e palavras-chave. O Google também analisa o site, não só o anúncio. Referências em `PENDENCIAS_GOOGLE_E_SITE.md`.
- `PRESCRIPTION_PAGES_ENABLED` (`src/data/publicChannels.js`), hoje `false`: tira `/receita`, `/ativos` e `/prescritores` do ar, do menu e do mapa do site (redirecionam para `/`). O código e os dados continuam; `receita-intake` segue publicada, sem link. O comentário do arquivo explica como voltar.
- **Produto fora do site:** `produtos.is_active = false`. O público não lê (RLS), o checkout recusa (`invalid_or_unpriced_product`) e o carrinho pede para remover. Admin e farmacêutico veem todos, com filtro e botão "Tirar do site"/"Colocar no site" (ação `product_active` da `balcao-api`, no registro de ações). Sugestão inicial na migração `catalogo_para_anuncios`, sujeita à responsável técnica. Os textos anteriores ficam em `produtos_textos_anteriores`, sem acesso pelo navegador.
- A vitrine vem só do banco. Não recriar lista reserva de produtos no código: ela aparecia antes do banco responder.
- **Conteúdo no HTML:** cada página pública já traz texto, CNPJ, AFE, CRF e o aviso legal sem depender de JavaScript; o React substitui essa versão ao montar. É o mesmo conteúdo para todos. `api/produto.js` lê o catálogo com a chave pública e preenche nome, preço e dados estruturados, com cache de 5 minutos. Produto fora do site responde 404 e `noindex`; se o banco falhar, entrega a página comum. A página inicial não lista produtos no HTML, porque ficaria desatualizada até a próxima publicação.
- **Google Shopping:** `/feed.xml` é o feed do Merchant Center, só com produtos ativos e com preço. Falta o dono criar a conta e cadastrar o feed.
- **Dados para preencher:** `business.sanitaryLicense` e `business.specialAuthorization` (`src/data/business.js`) só aparecem quando preenchidos. Composição e advertências ficam no cadastro do produto (`produtos.composition` e `produtos.warnings`), com dados da responsável técnica; sem dado, a seção não aparece. Nunca inventar.
- **Trocas:** `/trocas` usa o texto de `RETURN_POLICY` (`src/data/storeTexts.js`). As regras específicas da loja ainda dependem do dono.
- **Referência:** em 04/11/2026 o site antigo da UOL tinha anúncios exibidos até 03/11 pela mesma conta verificada, e 5 concorrentes anunciavam com loja, chamada para receita e categorias de emagrecimento. A hipótese principal é a certificação de farmácia on-line, a confirmar na conta. Isso não torna permitidas as promessas deles.
- Nada de conteúdo diferente para quem revisa, nem reativar produto depois da aprovação para contornar a revisão: há risco de suspensão sem aviso. Contestação e pedido de certificação precisam descrever a farmácia como ela é.
- Verificação: `npm run build`, `node scripts/verify-ads-ready.mjs`, `node scripts/verify-product-pages.mjs` e `scripts/verify-product-active-db.sql` (fixtures sintéticas com rollback). `node scripts/serve-dist.mjs` também roda as funções de `api/` com o `.env`. O script confere os textos fixos; produto novo no admin precisa de revisão própria.

## Cupons de parceiros
- `CouponPanel` fica sempre aberto no carrinho e na entrega, antes dos produtos/formulário. Busca a partir de 3 caracteres por prefixo do código ou primeiro nome do recebedor, com seleção por mouse/toque/teclado e digitação em maiúsculas. Não criar cupons de exemplo.
- `CouponContext` mantém a escolha entre carrinho e checkout; só o código escolhido é salvo em localStorage separado por conta. Ao editar, o desconto anterior sai do resumo; o código é validado novamente quando o subtotal muda. Não aceitar um rascunho como cupom aplicado.
- A Edge Function `customer-coupons` valida `auth.getUser()` em cada POST. Consulta `lookup_checkout_coupons` (SECURITY INVOKER, execução só service_role), retornando apenas código, primeiro nome e condições de desconto. Nunca liberar acesso direto às tabelas de parceiros/cupons/comissões. A busca não reserva usos e não cria pedidos.
- A estimativa é separada do cálculo definitivo em `create_checkout_order_v2`, que registra `discount_code` e `attributed_recipient_id`. Uma falha de estimativa não deve bloquear a repetição idempotente de um pedido pendente que já reservou o cupom; a revisão faz a validação definitiva. Não alterar a confirmação de pagamento nem gerar comissão antes de pagamento aprovado.
- Financeiro → **Vendas e cupons**: parceiro ao lado do código, busca, datas em Brasília, status, somente cupons e CSV com proteção contra fórmulas. Mostra explicitamente o recorte dos até 300 pedidos mais recentes; não apresentar o recorte como histórico integral.
- Testes: `node --experimental-vm-modules scripts/verify-coupons.mjs`, `node scripts/verify-coupons-ui.mjs` e `scripts/verify-coupons-db.sql` (fixtures sintéticas com rollback, nenhum pagamento).

## Matérias-primas
- O catálogo de `/ativos` (página fora do ar por enquanto; o cadastro segue ativo) fica em `materias_primas`, não em uma lista fixa no código. Os 12 cadastros originais foram preservados pela migração `20261023163541_raw_materials_catalog.sql`.
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
- `node scripts/bundle-counter-function.mjs`: gera em `supabase/deploy/` arquivos únicos de `balcao-api`, `admin-login`, `admin-orders`, `partner-portal`, `partner-register`, `receita-intake` e `customer-signup` (com `_shared`) para publicar pelo editor do Supabase.

## Armazenamento (Supabase)
- `receitas` (público): só fotos de produto. Sem listagem e sem envio anônimo; o admin envia fotos por link assinado (ação `product_image_upload` da função `admin-orders`). Aceita JPG/PNG/WEBP até 5 MB.
- `receitas-privadas`: receitas de clientes. `intake/` = formulário atual (envio por link assinado da `receita-intake`); `legacy/` = receitas do formulário antigo, movidas do bucket público em 20/10/2026. Admin e balcão abrem com links de 5 minutos; as referências antigas no banco (URLs públicas) são convertidas para `legacy/` pelas funções.
- Na tela, os anexos aparecem sempre por `PrescriptionFiles`: miniaturas na lista e na ficha, com visualizador (zoom, girar, baixar). Os links só são pedidos quando a linha aparece na tela e são renovados depois de 4 minutos. PDF é desenhado pelo `pdfjs-dist` (`src/lib/pdfPreview.js`), sem iframe, porque a CSP não libera frames do Storage. Receitas não saem na ficha impressa. Verificação: `node scripts/verify-prescription-files.mjs`.

## Rotinas automáticas (plano grátis do Supabase)
- O projeto fica no plano grátis por decisão do dono até haver fluxo. `.github/workflows/supabase-consulta-diaria.yml` evita a pausa por inatividade (sem senha) e `supabase-backup-diario.yml` gera um backup criptografado de `public` e `auth`, guardado por 30 dias. Configuração e restauração: `BACKUP.md`.
- O repositório é público: nunca colocar dados ou backups sem criptografia nos logs ou artefatos do Actions. O Storage (receitas e fotos) não entra no backup.

## Pendências técnicas conhecidas
- E-mails de conta: o envio padrão do Supabase só entrega para a equipe do projeto (2 por hora), então cliente real não recupera a senha até configurar SMTP próprio (Authentication › Emails). Modelo em português: `supabase/templates/redefinir-senha.html` (assunto no `<title>`); colar em Authentication › Emails. `confirmar-conta.html` só seria usado se o cadastro voltasse a confirmar o e-mail. DNS do domínio fica na UOL; plano sugerido: Resend.
- Painel do Supabase (Authentication › URL Configuration): Site URL ainda é `https://site-graphene.vercel.app` e Redirect URLs só tem `http://127.0.0.1:5173/**`. Trocar para `https://www.graphenemanipulacoes.com.br`, liberando www, domínio sem www e o endereço estável da Vercel com `/**`.
- Contas antigas do balcão (só usuário) e admins antigos (`thalesbxempresa`, `thales`, `rodrigo`) não entram mais até receberem e-mail no admin.
- Proteção contra senhas vazadas no login de clientes exige o plano Pro do Supabase.
- A função `migrar-receitas-antigas` está desativada (responde 410) e pode ser excluída no painel do Supabase.
- O conector do Supabase está disponível. Em 23/10/2026, a migração de carrinho foi aplicada em duas partes (`customer_cart_storage`, `customer_cart_sync`) após erro de confirmação no arquivo completo; `checkout_retry` também foi aplicada. `create-checkout` v13 aceita os domínios oficiais e a publicação estável `https://site-graphene.vercel.app`, com retorno para a mesma origem HTTPS (preserva sessão). Nunca liberar `*.vercel.app` genericamente. Não repetir migrações antigas sem conferir o schema atual.
- Itens de negócio (alvará, Google Ads, frete, trocas): `PENDENCIAS_GOOGLE_E_SITE.md`.
