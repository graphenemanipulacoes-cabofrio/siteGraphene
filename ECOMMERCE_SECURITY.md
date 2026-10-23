# Segurança do e-commerce

## Proteções implementadas

- Clientes usam Supabase Auth; senhas não passam pelo banco público da aplicação.
- Pedidos e itens possuem RLS e só podem ser lidos pelo dono autenticado.
- O navegador não grava pedidos e não determina valores cobrados.
- O catálogo continua público para leitura, mas preços e produtos não podem mais ser alterados com a chave pública.
- `create-checkout` valida o JWT do cliente com `auth.getUser()` dentro da função, valida quantidades e usa `create_checkout_order_v2` para recalcular preços, variações, cupom e frete no banco.
- O carrinho autenticado é salvo por conta em `customer_carts`; a leitura usa RLS e as alterações passam por `customer_cart_sync`, que usa `auth.uid()` e recibos de operações idempotentes. O cache por conta no navegador preserva alterações sem conexão; não determina preços cobrados.
- A criação do pedido é transacional e usa chave de idempotência para evitar duplicidade.
- Tokens do Mercado Pago ficam somente nos secrets das Edge Functions.
- O checkout aceita somente as origens oficiais com e sem `www`, a origem configurada em `SITE_URL` e localhost para desenvolvimento. Não há liberação genérica de origens.
- Novas tentativas reaproveitam o pedido e a URL de pagamento já salva; pedidos concluídos não recebem outra preferência. Falhas recebem uma referência de diagnóstico, sem expor CPF, endereço ou credenciais nos logs da aplicação.
- O webhook valida a assinatura HMAC, consulta o pagamento no Mercado Pago e compara o valor antes de marcar como pago.
- A aplicação recebe cabeçalhos contra MIME sniffing, clickjacking e permissões desnecessárias.

## Antes de produção

1. Habilite confirmação de e-mail e [proteção contra senhas vazadas](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection) no Supabase Auth (pendência já existente, não alterada nesta correção).
2. Configure CAPTCHA no cadastro/login e limites de envio de e-mail no painel do Supabase.
3. Aplique `supabase/migrations/202609020001_secure_ecommerce.sql`.
4. Cadastre `SITE_URL`, `MERCADO_PAGO_ACCESS_TOKEN` e `MERCADO_PAGO_WEBHOOK_SECRET` como secrets das Edge Functions.
5. Publique `create-checkout` conforme `supabase/config.toml`: a autenticação é validada no handler, sem depender da verificação JWT legada do gateway. `payment-webhook` não usa JWT; a assinatura do Mercado Pago é obrigatória.
6. Cadastre preços maiores que zero em todos os produtos vendáveis.
7. Teste com credenciais de teste do Mercado Pago antes de trocar para produção.

Depois de aplicar a migration, alterações de catálogo devem ser feitas no Dashboard do Supabase até o painel administrativo também ser migrado para Supabase Auth com função de administrador. O login administrativo antigo não deve receber uma chave privilegiada no navegador.

Nunca coloque service-role key, access token ou webhook secret em `.env` do Vite ou em qualquer variável `VITE_*`.

## Verificações do carrinho e checkout

- `node scripts/verify-customer-cart.mjs`: duas contas/aparelhos, logout, recuperação offline e baixa de itens pagos.
- `node --experimental-vm-modules scripts/verify-checkout-api.mjs`: sessão, tratamento de erros e validação da URL de pagamento.
- `node --experimental-vm-modules scripts/verify-checkout-server.mjs`: CORS, autenticação, cálculo de total/frete, falhas do provedor e persistência. Usa mocks, sem cobranças.
- `scripts/verify-commerce-db.sql`: verificações transacionais no banco, com dados sintéticos e `ROLLBACK`; não chama o Mercado Pago.
