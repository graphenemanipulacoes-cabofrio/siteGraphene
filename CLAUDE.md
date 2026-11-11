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
- **Loja pública:** `/`, `/produtos`, `/produto/:id`, `/laboratorio`, `/avaliacoes`, `/parceiros`, `/sobre`, `/compras`, `/trocas`, `/privacidade`, `/ativos`, `/receita` e `/prescritores`. As três últimas dependem de uma chave (ver "Anúncios no Google").
- **Compra:** `/carrinho`, `/entrar`, `/minha-conta`, `/checkout`, `/pedido/retorno`, `/redefinir-senha`. Carrinho em `src/context/StoreContext.jsx`.
  Carrinhos autenticados ficam em `customer_carts`/RPC `customer_cart_sync`; `src/utils/cartPersistence.js` mantém cache separado por conta e operações pendentes idempotentes. Não voltar a usar um único localStorage para todos os clientes. Checkout usa sempre `create_checkout_order_v2`, incluindo frete, e `src/lib/checkoutApi.js` cuida da sessão/erros sem repetir pagamentos.
  Comprar exige conta (decisão do dono em 10/11/2026, pela segurança do cliente e pelo pós-venda; o site não envia e-mail). Sem conta, `/checkout` leva direto a `/entrar`, que abre em "Criar conta" (`intent: 'checkout'`) e volta para a entrega; o carrinho de visitante passa para a conta. Dentro do Instagram e de apps parecidos (`isEmbeddedBrowser`), o e-mail vem antes do Google. O botão do Google fica abaixo do formulário, porque quem só tem conta Google precisa dele. Verificação: `node scripts/verify-account-at-checkout.mjs`.
- **Admin** (`/admin`, login em `/login`): solicitações, pedidos, clientes, produtos, financeiro, parceiros, acessos do balcão, administradores.
- **Parceiros:** `/parceiros/cadastro`, `/parceiros/entrar`, `/parceiros/painel`.
- **Balcão** (`/balcaographene`): consulta da equipe da loja. Detalhes em `BALCAO_GRAPHENE.md`.

Dados fixos da empresa (CNPJ, endereço, horários, responsável técnica) ficam em `src/data/business.js`. WhatsApp e limites de upload em `src/config.js`.

## Login único por e-mail
- Todos entram com a conta do site no Supabase Auth (e-mail e senha ou Google): clientes, parceiros, equipe e admin. Não existe mais usuário/senha próprios do admin ou do balcão.
- O papel vem do e-mail: `admins.email` (admin, todas as áreas) e `counter_accounts.email` (balcão/farmacêutico). Parceiro = `partner_profiles.id` igual ao id da conta. Migração `20261030173953_login_por_email.sql`.
- `admin-login` e a ação `login` do `balcao-api` recebem a sessão (Authorization) e devolvem os tokens internos de sempre (`x-admin-token` 8 h; token da equipe sem vencimento). `ensureAdminSession` (`src/lib/accountAuth.js`) renova o token do painel sozinho.
- Admin cadastra admins e equipe pelo e-mail; e-mail sem conta exige senha inicial (cria a conta já confirmada). Conta com senha que ainda não é da equipe também exige senha nova. Cada um troca a senha em `/minha-conta`.
- Admin abre o painel de qualquer parceiro (`/parceiros/painel?parceiro=id`, só leitura, exceto os produtos em destaque do link dela). Sair do admin, balcão ou farmacêutico sai também da conta do site.
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
- **Campos de senha:** sempre `PasswordField` (olhinho para mostrar ou ocultar). O cadastro em `/entrar` pede a senha uma vez, para encurtar a compra (decisão de 10/11/2026), com um lembrete para conferir pelo olhinho.
- **Limites:** `takeRateLimit` (`_shared/counter-security.ts`, RPC `take_rate_limit`, só service_role) guarda o endereço em hash. `customer-coupons` aceita 120 consultas em 5 minutos por endereço.
- **Registro de ações:** `logAdminAction` grava em `admin_audit_log` (sem acesso pelo navegador); aparece em Gerenciar Admins › Registro de ações.
- **CSP** em `vercel.json`: `script-src 'self'`, sem script inline. Serviço externo novo (script, imagem, API) precisa entrar na CSP, senão o navegador bloqueia. Para testar: `npm run build` e `node scripts/serve-dist.mjs` (porta 5180), que serve `dist/` com os cabeçalhos da produção.
- Verificação: `node --experimental-vm-modules scripts/verify-security.mjs`. Plano de segurança do comércio: `ECOMMERCE_SECURITY.md`.

## Anúncios no Google
- Regra para o Brasil: farmácia on-line registrada na Anvisa, certificada pelo Google e sem promover medicamentos controlados em anúncios, páginas de destino e palavras-chave. O Google também analisa o site, não só o anúncio. Referências em `PENDENCIAS_GOOGLE_E_SITE.md`.
- **Decisão do dono em 10/11/2026:** a divulgação é por influenciadoras e pelo Meta, e não pelo Google. O site deixou de estar preparado para o Google: as páginas de receita e todos os produtos voltaram. O que segue nesta seção descreve o mecanismo e as regras para o caso de a farmácia retomar o Google; não tirar páginas nem produtos do ar por conta própria.
- `PRESCRIPTION_PAGES_ENABLED` (`src/data/publicChannels.js`), hoje `true`: com `false`, tira `/receita`, `/ativos` e `/prescritores` do ar, do menu e do mapa do site (redirecionam para `/`). O comentário do arquivo explica como desligar. `verify-ads-ready.mjs` só confere os termos barrados com a chave desligada; a identificação da empresa é conferida sempre.
- **Produto fora do site:** `produtos.is_active = false`. O público não lê (RLS), o checkout recusa (`invalid_or_unpriced_product`) e o carrinho pede para remover. Admin e farmacêutico veem todos, com filtro e botão "Tirar do site"/"Colocar no site" (ação `product_active` da `balcao-api`, no registro de ações). A migração `catalogo_para_anuncios` tirou 10 produtos e a `produtos_de_volta_ao_site` os recolocou. Os textos sem promessa de resultado continuam; os anteriores ficam em `produtos_textos_anteriores`, sem acesso pelo navegador.
- A vitrine vem só do banco. Não recriar lista reserva de produtos no código: ela aparecia antes do banco responder.
- **Vitrine:** a tela inicial mostra os 8 primeiros produtos da ordem definida no admin, com "Ver todos". `/produtos` mostra todos em grade (`ProductGrid variant="page"`), com busca e a categoria no endereço (`?categoria=treino`), para links de categoria. Os links "Produtos" e "Continuar comprando" levam a `/produtos`. Verificação: `node scripts/verify-storefront.mjs`.
- **Conteúdo no HTML:** cada página pública já traz texto, CNPJ, AFE, CRF e o aviso legal sem depender de JavaScript; o React substitui essa versão ao montar. É o mesmo conteúdo para todos. `api/produto.js` lê o catálogo com a chave pública e preenche nome, preço e dados estruturados, com cache de 5 minutos. Produto fora do site responde 404 e `noindex`; se o banco falhar, entrega a página comum. A página inicial não lista produtos no HTML, porque ficaria desatualizada até a próxima publicação.
- **Google Shopping:** `/feed.xml` é o feed do Merchant Center, só com produtos ativos e com preço. Falta o dono criar a conta e cadastrar o feed.
- **Dados para preencher:** `business.sanitaryLicense` e `business.specialAuthorization` (`src/data/business.js`) só aparecem quando preenchidos. Composição e advertências ficam no cadastro do produto (`produtos.composition` e `produtos.warnings`), com dados da responsável técnica; sem dado, a seção não aparece. Nunca inventar.
- **Trocas:** `/trocas` usa o texto de `RETURN_POLICY` (`src/data/storeTexts.js`). As regras específicas da loja ainda dependem do dono.
- **Referência:** em 04/11/2026 o site antigo da UOL tinha anúncios exibidos até 03/11 pela mesma conta verificada, e 5 concorrentes anunciavam com loja, chamada para receita e categorias de emagrecimento. A hipótese principal é a certificação de farmácia on-line, a confirmar na conta. Isso não torna permitidas as promessas deles.
- Nada de conteúdo diferente para quem revisa, nem reativar produto depois da aprovação para contornar a revisão: há risco de suspensão sem aviso. Contestação e pedido de certificação precisam descrever a farmácia como ela é.
- Verificação: `npm run build`, `node scripts/verify-ads-ready.mjs`, `node scripts/verify-product-pages.mjs` e `scripts/verify-product-active-db.sql` (fixtures sintéticas com rollback). `node scripts/serve-dist.mjs` também roda as funções de `api/` com o `.env`. O script confere os textos fixos; produto novo no admin precisa de revisão própria.

## Resultado das parcerias
- Admin → **Resultado das parcerias** (`AdminPartnerResults`): quanto cada parceira vendeu e recebeu, o custo do vale e o lucro ou prejuízo, no mês e desde o início do teste. Tem simulador, alertas, regras da parceria, postagens e custos.
- A conta fica em `_shared/partner-results.ts`, sem acesso ao banco. Ações `partner_results`, `save_cost_settings`, `save_product_cost`, `save_partner_terms` e `save_partner_delivery` da `admin-orders`. Migração `resultado_das_parcerias`.
- Vêm de registros reais: pedidos pagos, comissões, vales (`partner_product_credits`) e taxa do Mercado Pago (`orders.provider_fee`). Custo de produto, embalagem e imposto são informados no admin; enquanto `partner_cost_settings.confirmed_at` estiver vazio, a tela avisa que são hipótese.
- Custos ficam em `partner_cost_settings` e `product_costs`, sem acesso pelo navegador. Nunca colocar custo em `produtos`, que é lida pelo público, nem na resposta da `partner-portal`. `PartnerGoalCard` só recebe vendas, situação, postagens e prazo (`partnerGoal`). Mínimo e meta são métricas internas: aparecem só no admin, nunca para a parceira.
- Comissão: a base é subtotal menos desconto, sem frete. Compra da própria parceira não gera comissão para ela nem conta como venda dela, mas segue valendo para quem recebe sobre todas as vendas (`attribution_scope = all_paid_orders`).
- Situação: 30 primeiros dias sem corte; dia 60 abaixo de 1× o mínimo acumulado = "Em atenção"; dia 90 sugere renovar (3×), meio vale por mais 30 dias (1,5×) ou só comissão. Depois do teste, usa a média dos 3 últimos meses fechados. Tudo é sugestão: a mudança de situação é sempre manual, e nada corta vale ou comissão sozinho.
- Regras, percentuais e cupons de cada parceira dependem do dono. Não cadastrar sem aprovação. Proposta em discussão: https://claude.ai/artifact/JjXDmQiPeNnZCkTmd5NBWV
- Verificação: `node scripts/verify-partner-results.mjs` e `scripts/verify-partner-results-db.sql` (fixtures sintéticas com rollback).

## Clientes e pós-venda
- Admin → **Clientes** (`AdminCustomers`): frequência de compra, ticket, produtos, cidade, cupom de origem, carrinho, orçamentos, anotações, retorno marcado e lista "Contatar agora". Só admin; o balcão e o farmacêutico não veem.
- A conta fica em `_shared/customer-insights.ts`, sem acesso ao banco. Ações `customers_report`, `save_customer_followup`, `add_customer_note`, `delete_customer_note` e `log_customer_export` da `admin-orders`. Tabelas `customer_followups` e `customer_notes`, sem acesso pelo navegador. A chave é o id da conta ou `tel:` e o número de quem só pediu orçamento.
- Compra é pedido pago e não cancelado; o valor não inclui frete. Quem está em `admins` ou `counter_accounts` fica fora dos totais. Orçamento entra na conta com o mesmo telefone.
- **Fica fora do relatório, de propósito:** CPF, rua e número, dados de pagamento, receitas e observações de orçamento. O histórico de uma farmácia pode revelar dados de saúde (LGPD). A mensagem pronta do WhatsApp nunca cita produto e a planilha não traz produtos nem anotações.
- Quem está como "Não quer contato" não entra na lista de contato nem na planilha, e fica sem botões de WhatsApp e e-mail. Registrar um contato encerra o retorno marcado para hoje ou antes e pausa os lembretes por 7 dias.
- Ainda não existe consentimento para ofertas: o site não pergunta se a pessoa aceita receber promoções. Enquanto não houver, "Aceita contato" só vale se a pessoa tiver dito isso à equipe. Não enviar oferta em massa com base nesta lista.
- Verificação: `node scripts/verify-customer-insights.mjs` e `scripts/verify-customer-insights-db.sql` (fixtures sintéticas com rollback).

## Cupons de parceiros
- `CouponPanel` fica sempre aberto no carrinho e na entrega, antes dos produtos/formulário. Busca a partir de 3 caracteres por prefixo do código ou primeiro nome do recebedor, com seleção por mouse/toque/teclado e digitação em maiúsculas. Não criar cupons de exemplo.
- `CouponContext` mantém a escolha entre carrinho e checkout; só o código escolhido é salvo em localStorage separado por conta. Ao editar, o desconto anterior sai do resumo; o código é validado novamente quando o subtotal muda. Não aceitar um rascunho como cupom aplicado.
- A Edge Function `customer-coupons` valida `auth.getUser()` em cada POST. Consulta `lookup_checkout_coupons` (SECURITY INVOKER, execução só service_role), retornando apenas código, primeiro nome e condições de desconto. Nunca liberar acesso direto às tabelas de parceiros/cupons/comissões. A busca não reserva usos e não cria pedidos.
- A estimativa é separada do cálculo definitivo em `create_checkout_order_v2`, que registra `discount_code` e `attributed_recipient_id`. Uma falha de estimativa não deve bloquear a repetição idempotente de um pedido pendente que já reservou o cupom; a revisão faz a validação definitiva. Não alterar a confirmação de pagamento nem gerar comissão antes de pagamento aprovado.
- Financeiro → **Vendas e cupons**: parceiro ao lado do código, busca, datas em Brasília, status, somente cupons e CSV com proteção contra fórmulas. Mostra explicitamente o recorte dos até 300 pedidos mais recentes; não apresentar o recorte como histórico integral.
- Testes: `node --experimental-vm-modules scripts/verify-coupons.mjs`, `node scripts/verify-coupons-ui.mjs` e `scripts/verify-coupons-db.sql` (fixtures sintéticas com rollback, nenhum pagamento).

## Link da parceira
- `/cupom/CODIGO` (`CouponLandingPage`) abre a loja com o cupom aplicado: troca o banner pela confirmação "Indicação de …" e mostra primeiro os produtos que a parceira destacou. `/produto/ID?cupom=CODIGO` leva direto a um produto. Visitante sem conta valida um código exato; a busca por nome continua exigindo login.
- Com cupom aplicado, `CouponBar` aparece no topo da página inicial e os cartões da vitrine mostram o preço sem cupom riscado e o preço com desconto (`couponRate`). É estimativa: o valor final continua sendo o do `create_checkout_order_v2`.
- Seleção de até 12 produtos por parceira em `partner_showcase`, sem acesso direto pelo navegador. Leitura pública só pela RPC `partner_showcase_products(código)`, que devolve os números dos produtos ativos. Gravação pela RPC `save_partner_showcase`: a própria parceira aprovada ou um administrador (fica no registro de ações). É a única coisa que o admin altera ao ver o painel de uma parceira.
- No painel (`PartnerLinks`): copiar o link geral, copiar o link de um produto e marcar os destaques. Textos e links em `src/utils/couponDisplay.js`.
- O nome exibido é o primeiro nome cadastrado no recebedor do cupom. Não escrever que a parceira usa ou recomenda um produto: a página só diz que a indicação é dela.
- Verificação: `node scripts/verify-partner-links.mjs` e `scripts/verify-partner-showcase-db.sql` (fixtures sintéticas com rollback).

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
- **Imagens leves:** as fotos locais (`public/assets/products/*.png`, banner e foto do laboratório) têm versão WebP gerada por `python scripts/optimize-images.py`, que entra no commit. Na tela use `productPhoto` (`src/utils/productImages.js`); `resolveProductImage` continua devolvendo a PNG, usada em `og:image` e no feed. Ao trocar ou incluir uma foto local, rode o script de novo. Foto enviada pelo admin vai para o Storage e não passa por ele.
- **Topo da página inicial** (`HomeHero`, `homeHero.css`, `src/data/vitrineScenes.js`): "vitrine viva" com cenas do dia a dia, sem produto. O selo "Farmácia de manipulação · Entrega em todo o Brasil" e a linha do cupom de parceira ficam fixos; cada cena troca junto o título, o texto e os botões (entrega: "Sua farmácia, sem sair de casa."; rotina: "Sua rotina de saúde, do seu jeito." com WhatsApp; receita: "Tem receita? Envie pelo site."; celular: "Peça pelo celular, de onde estiver." com Pix ou cartão), a foto com uma etiqueta curta, o ambiente de cor (pêssego, rosé, lilás, sol) e os elementos que flutuam (gomas, cápsulas, gotas, pó). Os textos só usam fatos do site (frete pelo CEP, pedido em Minha conta, Pix ou cartão no Mercado Pago, receita em foto ou PDF com orçamento). O h1 é escondido na tela ("Graphène: farmácia de manipulação com entrega em todo o Brasil"); os títulos das cenas são h2. A cena da receita só aparece com `PRESCRIPTION_PAGES_ENABLED` e, sem ela, "Enviar receita" vira WhatsApp. Troca a cada 6,5 s, pelas bolinhas, pelas setas do teclado ou arrastando para o lado com o dedo ou o mouse (arraste não abre link; rolagem vertical continua). Pausa; para fora da tela e com a aba escondida; com "reduzir animações" o movimento continua mais lento (pedido do dono). As fotos foram geradas pela IA com cara de foto de celular, pessoas cuidadas e casas comuns (o dono recusou visual de estúdio, pessoas pouco cuidadas e um layout diferente desse); são ilustrações, sem nome nem depoimento, e o texto alternativo começa com "Ilustração". Não pôr produto nem link direto de produto no topo, não usar vermelho e não citar Cabo Frio. Fotos em `public/assets/hero/pessoas/` (`fotos_hero.py`) e elementos em `public/assets/hero/vitrine/` (`vitrine_hero.py`), na pasta `banners-site`.
- **Banners da página inicial** (`HomeBanners`, abaixo da vitrine): fotos reais da loja (março de 2024), sem pessoas em destaque. O da receita leva o print real de `/receita` num celular e só aparece com `PRESCRIPTION_PAGES_ENABLED`; o da entrega usa a fachada. O texto fica no site, não na imagem. As WebP de `public/assets/banners/` saem de `Documentos\Graphène\Redes sociais\sistema\banners-site\compor_banners.py`, fora do repositório. O dono pediu imagens reais em vez de cenas geradas, que pareciam artificiais.
- **Aviso de privacidade:** é uma linha no rodapé, não um aviso flutuante (cobria o botão Comprar no celular). Vale enquanto o site usar só armazenamento necessário. Pixel ou análise de visitas com cookies exige voltar a pedir a escolha do visitante.

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
