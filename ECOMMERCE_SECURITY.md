# Segurança do e-commerce

## Proteções implementadas

- Clientes usam Supabase Auth; senhas não passam pelo banco público da aplicação.
- Pedidos e itens possuem RLS e só podem ser lidos pelo dono autenticado.
- O navegador não grava pedidos e não determina valores cobrados.
- O catálogo continua público para leitura, mas preços e produtos não podem mais ser alterados com a chave pública.
- `create-checkout` valida o JWT do cliente com `auth.getUser()` dentro da função, valida quantidades e usa `create_checkout_order_v2` para recalcular preços, variações, cupom e frete no banco.
- O carrinho autenticado é salvo por conta em `customer_carts`; a leitura usa RLS e as alterações passam por `customer_cart_sync`, que usa `auth.uid()` e recibos de operações idempotentes. O cache por conta no navegador preserva alterações sem conexão; não determina preços cobrados.
- A criação do pedido é transacional e usa chave de idempotência para evitar duplicidade.
- Tokens do Mercado Pago ficam somente nos secrets das Edge Functions. A Public Key (`MERCADO_PAGO_PUBLIC_KEY`) também fica nos secrets e chega ao navegador só pela resposta da `create-checkout` e da ação `status`, nunca por `VITE_*`.
- O checkout aceita somente as origens oficiais com e sem `www`, a publicação estável desta mesma loja em `https://site-graphene.vercel.app`, a origem configurada em `SITE_URL` e localhost para desenvolvimento. Não aceita outros projetos/subdomínios Vercel. O pagamento retorna à mesma origem HTTPS que iniciou a compra para preservar a sessão.
- Novas tentativas reaproveitam o pedido e a URL de pagamento já salva; pedidos concluídos não recebem outra preferência. No pagamento no site, pedido cancelado, antigo (mais de 7 dias) ou com produto fora do site não recebe pagamento novo: a `create-checkout` responde `checkout_restart_required` e o navegador cria outro pedido. Falhas recebem uma referência de diagnóstico, sem expor CPF, endereço ou credenciais nos logs da aplicação.
- O webhook valida a assinatura HMAC, consulta o pagamento no Mercado Pago e grava só pela RPC `apply_mp_payment`, que trava o pedido, compara o valor e segue uma ordem de status: aviso fora de ordem não volta o estado, pedido pago nunca é rebaixado e recusa nunca cancela o pedido. Só o aviso novo (`data.id`) é aceito; o IPN antigo recebe 200 sem consulta.
- A aplicação recebe cabeçalhos contra MIME sniffing, clickjacking e permissões desnecessárias, além de CSP sem script inline. Os únicos scripts de terceiros são os do Mercado Pago (`sdk.mercadopago.com` e `http2.mlstatic.com`), carregados só quando o cliente abre o cartão.
- O envio público de receitas passa por `receita-intake`, com links assinados e limites por endereço e por dia. O bucket privado e `solicitacoes` não aceitam gravação direta do navegador.
- A solicitação de parceria usa a conta conectada e nunca cria contas. Sem confirmação de e-mail, o e-mail informado não prova a posse: a aprovação do admin é a checagem.
- A busca de cupons tem limite por endereço, e ações administrativas ficam em `admin_audit_log`, sem acesso pelo navegador.

## Pagamento no site (Pix e cartão)

- Chave de modo `MERCADO_PAGO_CHECKOUT_MODE`: vazio ou `redirect` = Checkout Pro (padrão); `brick_staff` = pagamento no site só para contas da equipe (`current_staff_role`); `brick` = todos. A ação `pay` da `process-payment` também respeita a chave: fora do modo, responde `payment_provider_not_configured` e não cobra.
- `process-payment` confere a sessão com `auth.getUser()` e a origem. O valor, o CPF do Pix, o endereço e os itens vêm do banco (`begin_payment_attempt`); o e-mail do pagador é o da conta. Valor, e-mail, referência, descrição ou URL de aviso enviados pelo navegador são ignorados.
- Cartão: só o token dos campos seguros do Mercado Pago chega ao servidor; número e CVV nunca passam pelo site. Só crédito, com as bandeiras visa, master, amex, elo e hipercard; Pix, boleto, lotérica, saldo e débito como cartão são recusados.
- Pix: criado pelo servidor sem o SDK, com prazo de 35 minutos; a tela mostra o prazo devolvido pelo Mercado Pago. O QR fica gravado só enquanto o Pix está pendente. Antes de qualquer cobrança nova, o servidor cancela todo Pix aberto do cliente; se o de outro pedido aparecer pago, não cobra (`other_order_paid`).
- Cada tentativa tem chave própria (`X-Idempotency-Key`), gerada a cada clique e reenviada só depois de erro de rede, prazo ou 5xx. Tentativa sem resposta é conferida no Mercado Pago (busca por `external_reference`) antes de outra cobrança.
- Limites: 10 tentativas por hora por conta, 30 por endereço, 8 por pedido e 240 consultas por hora por conta. Sem o banco de limites, recusa.
- `payment_attempts` e as RPCs `begin_payment_attempt`, `apply_mp_payment`, `fail_payment_attempt` e `order_payment_state` ficam sem acesso pelo navegador (execução só `service_role`).
- Logs só com ids, status, `status_detail`, método, parcelas, HTTP e códigos numéricos. Nunca token do cartão, CPF, e-mail, nome, telefone, endereço, QR do Pix ou corpo do Mercado Pago.
- `initMercadoPago` com `advancedFraudPrevention: false` e `trackingDisabled: true`: a CSP sem script inline bloquearia o Device ID. Fase 1 sem 3DS; medir as recusas antes de mudar.
- O Mercado Pago recebe, como processador do pagamento, o telefone e o endereço de entrega (`additional_info`), para a análise antifraude.

## Antes de produção

1. Por decisão do dono (03/11/2026), o cadastro do site não confirma o e-mail: a função `customer-signup` cria a conta já confirmada, com limite de tentativas no servidor. Mantenha "Confirm email" ligado no Supabase Auth, para o cadastro direto pela API pública não contornar esse limite. Isso depende das travas da migração `contas_sem_confirmacao`, descritas em `CLAUDE.md`. Configure [SMTP próprio](https://supabase.com/docs/guides/auth/auth-smtp), porque a recuperação de senha usa o envio padrão, que só entrega para a equipe do projeto. E-mails de admin e da equipe sem conta são cadastrados com senha inicial, criando a conta na hora. [Proteção contra senhas vazadas](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection) depende do plano Pro.
2. Configure CAPTCHA no cadastro/login e limites de envio de e-mail no painel do Supabase.
3. Aplique `supabase/migrations/202609020001_secure_ecommerce.sql`.
4. Cadastre `SITE_URL`, `MERCADO_PAGO_ACCESS_TOKEN` e `MERCADO_PAGO_WEBHOOK_SECRET` como secrets das Edge Functions. Para o pagamento no site, também `MERCADO_PAGO_PUBLIC_KEY` (da mesma aplicação do Access Token e da assinatura), `MERCADO_PAGO_CHECKOUT_MODE` e, se quiser, `MERCADO_PAGO_MAX_INSTALLMENTS` (1 a 12).
5. Publique `create-checkout`, `process-payment` e `payment-webhook` conforme `supabase/config.toml`: a autenticação é validada no handler, sem depender da verificação JWT legada do gateway. Pelo painel, desligue "Verify JWT" nas três. `payment-webhook` não usa JWT; a assinatura do Mercado Pago é obrigatória.
6. Cadastre preços maiores que zero em todos os produtos vendáveis.
7. Teste com credenciais de teste do Mercado Pago antes de trocar para produção, num projeto separado: credencial de teste no projeto de produção marcaria pedido real como pago.
8. Pagamento no site: aplique `20261126120000_checkout_no_site.sql` (com o "sim" do dono) antes de publicar as funções, publique as funções com o modo vazio, depois o site com a CSP nova, e só então `brick_staff`, o teste real de R$ 5 e `brick`. O passo a passo está em `CLAUDE.md`, "Publicação do pagamento no site".

O painel administrativo usa o Supabase Auth: `admin-login` confere a sessão da conta (`auth.getUser()`) e o e-mail em `admins` antes de emitir o token do painel. Nenhuma chave privilegiada vai para o navegador.

Nunca coloque service-role key, access token ou webhook secret em `.env` do Vite ou em qualquer variável `VITE_*`.

## Verificações do carrinho e checkout

- `node scripts/verify-customer-cart.mjs`: duas contas/aparelhos, logout, recuperação offline e baixa de itens pagos.
- `node --experimental-vm-modules scripts/verify-checkout-api.mjs`: sessão, tratamento de erros, validação da URL de pagamento e das respostas do pagamento no site (modo, Public Key, Pix, motivos).
- `node --experimental-vm-modules scripts/verify-checkout-server.mjs`: CORS, autenticação, cálculo de total/frete, falhas do provedor, persistência e os modos `redirect`, `brick_staff` e `brick`. Usa mocks, sem cobranças.
- `node --experimental-vm-modules scripts/verify-process-payment.mjs`: pagamento no site (validação, valor e e-mail do servidor, bandeiras, chave de repetição, Pix com 35 minutos, cancelamento de Pix aberto, conciliação, limites, erros do Mercado Pago, "confirming" e logs sem dados pessoais). Mocks, sem cobranças.
- `node --experimental-vm-modules scripts/verify-payment-webhook.mjs`: assinatura, IPN ignorado, consulta com prazo, normalização e gravação só pela RPC.
- `node --experimental-vm-modules scripts/verify-refund.mjs`: estorno, pagamento extra, conferência no Mercado Pago e alertas do Financeiro.
- `node scripts/verify-payment-ui.mjs`: telas do pagamento (Brick só crédito, Pix, resultados, consulta do pedido, SDK sob demanda, nada leva ao Mercado Pago no modo brick).
- `node --experimental-vm-modules scripts/verify-security.mjs`: CSP (scripts só do site e do Mercado Pago, sem `unsafe-inline`) e demais travas.
- `scripts/verify-commerce-db.sql`: verificações transacionais no banco, com dados sintéticos e `ROLLBACK`; não chama o Mercado Pago.
- `scripts/verify-payment-rules-db.sql`: regras de pagamento no banco (`begin_payment_attempt`, `apply_mp_payment`, permissões), com dados sintéticos e `ROLLBACK`. Enquanto a migração não estiver aplicada, rodar o texto da migração e o teste na mesma transação. O rollback não desfaz sequências.
