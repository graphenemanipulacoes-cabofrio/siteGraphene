# Balcão Graphène

Página: `/balcaographene`. Acesso operacional para consulta de pedidos e solicitações.

## Para começar

1. Ativar as migrações e a função indicadas abaixo no Supabase da Graphène.
2. Entrar no admin e abrir **Acessos da equipe**.
3. Escolher o perfil **Balcão** e cadastrar o nome e o **e-mail** da pessoa. Se o e-mail ainda não tiver conta no site, definir uma senha inicial (10 a 128 caracteres).
4. Abrir `/balcaographene` no computador autorizado da loja e entrar com esse e-mail (senha ou Google).

Login único: a equipe entra com a conta do site (Supabase Auth). Não existe senha padrão no código e o balcão não guarda senhas; o servidor só confere se o e-mail da conta conectada está cadastrado na equipe. Cada pessoa troca a própria senha em **Minha conta**.

O perfil **Farmacêutico** também acessa o balcão e tem uma área própria em `/farmaceutico` para cadastrar e revisar produtos e matérias-primas, incluindo adicionar, substituir ou remover imagens. As duas contas são gerenciadas no mesmo formulário do admin; nenhuma delas permite entrar na administração. A página `/colaboradores` reúne os acessos da equipe.

## Uso

- Pedidos: cliente, contato, documento para nota, endereço, itens da compra, quantidade, preço registrado, desconto, frete e total.
- Andamento: confirmação de pagamento, preparação, envio, rastreio, nota fiscal, datas e observações internas.
- Solicitações: nome, WhatsApp, informações enviadas e abertura dos anexos por links de 5 minutos. O orçamento é identificado como solicitação sem pagamento confirmado; o formulário antigo não coleta endereço de entrega.
- Busca e filtros por período, andamento e pagamento; paginação de 50 registros, sem truncar o histórico em 250 pedidos.
- Atualização automática a cada 30 segundos enquanto a tela está aberta e ao voltar à aba, atualização manual, cópia do endereço e impressão da ficha (não é nota fiscal).

As descrições consultadas no catálogo são atuais; nomes, quantidades e preços na tabela do pedido são os registrados na compra. Dados ausentes são identificados como não informados, nunca inventados.

## Login salvo e controle

- O navegador guarda um token opaco, não a senha. A sessão não tem vencimento automático, conforme solicitado.
- Logout revoga a sessão no servidor, remove o token local e sai da conta do site neste navegador. Se o servidor estiver indisponível, a tela informa e pede nova tentativa para garantir a revogação.
- O admin pode alterar o e-mail, desativar a conta e encerrar todos os navegadores conectados. Alterar o acesso revoga todas as sessões anteriores; o navegador revogado também sai da conta do site.
- Administradores entram no balcão e na área do farmacêutico com o próprio e-mail. Nesse caso, continua valendo o vencimento da sessão administrativa (renovada sozinha enquanto a conta do site estiver conectada); a permanência sem vencimento automático é das contas próprias da equipe.
- Contas antigas criadas só com usuário continuam nos navegadores já conectados, mas não entram de novo até o admin informar o e-mail.
- Usar somente equipamentos da equipe, com bloqueio de tela e perfil de navegador exclusivo. Limpar os dados do navegador ou usar janela anônima pode apagar o login salvo.
- O perfil Balcão não pode editar produtos, modificar pagamentos, apagar solicitações ou acessar comissões/credenciais. A edição de produtos exige perfil Farmacêutico ou Administrador.
- Receitas antigas foram migradas para `receitas-privadas/legacy/`; as funções convertem as referências antigas para abrir links assinados. O bucket público `receitas` fica reservado às imagens de produtos.

## Ativação técnica

- Migrações da equipe: `supabase/migrations/202610080001_counter_portal.sql`, `supabase/migrations/202610220001_equipe_farmaceutico.sql` e `supabase/migrations/20261030173953_login_por_email.sql`. Conferir as migrações já aplicadas antes de qualquer execução.
- Função: `balcao-api`, com `verify_jwt = false` porque a própria função valida a conta do site (login), o token de balcão ou o token admin em cada chamada. Nunca desabilitar a validação dentro da função.
- Deploy CLI: `supabase functions deploy balcao-api --project-ref ngphbcrdphluuphctvpr`.
- Deploy pelo editor: executar `node scripts/bundle-counter-function.mjs` e usar o arquivo gerado `supabase/deploy/balcao-api.ts`; ele contém os módulos compartilhados, sem segredos.
- Usa os segredos existentes `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` e `SITE_URL`. Nenhuma chave de servidor deve entrar no front-end.
- Publicar o front-end somente com a migração e a função ativas. A rota já está no rewrite da Vercel e marcada `noindex, nofollow`.

## Verificação

- `node --experimental-vm-modules scripts/verify-counter.mjs` (dados e banco simulados, sem clientes reais).
- `npm run build -- --configLoader native` e `node scripts/verify-seo.mjs`.
- Confirmar login, reload, filtros, anexos, logout e revogação com uma conta própria definida pelo admin. Não usar dados reais de saúde em testes.
