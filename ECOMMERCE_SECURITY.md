# Segurança do e-commerce

## Proteções implementadas

- Clientes usam Supabase Auth; senhas não passam pelo banco público da aplicação.
- Pedidos e itens possuem RLS e só podem ser lidos pelo dono autenticado.
- O navegador não grava pedidos e não determina valores cobrados.
- O catálogo continua público para leitura, mas preços e produtos não podem mais ser alterados com a chave pública.
- `create-checkout` aceita apenas JWT válido, valida quantidades e recalcula os valores usando `produtos.price`.
- A criação do pedido é transacional e usa chave de idempotência para evitar duplicidade.
- Tokens do Mercado Pago ficam somente nos secrets das Edge Functions.
- O webhook valida a assinatura HMAC, consulta o pagamento no Mercado Pago e compara o valor antes de marcar como pago.
- A aplicação recebe cabeçalhos contra MIME sniffing, clickjacking e permissões desnecessárias.

## Antes de produção

1. Habilite confirmação de e-mail e proteção contra senhas vazadas no Supabase Auth.
2. Configure CAPTCHA no cadastro/login e limites de envio de e-mail no painel do Supabase.
3. Aplique `supabase/migrations/202609020001_secure_ecommerce.sql`.
4. Cadastre `SITE_URL`, `MERCADO_PAGO_ACCESS_TOKEN` e `MERCADO_PAGO_WEBHOOK_SECRET` como secrets das Edge Functions.
5. Publique `create-checkout` com verificação JWT e `payment-webhook` sem JWT (a assinatura do Mercado Pago é obrigatória).
6. Cadastre preços maiores que zero em todos os produtos vendáveis.
7. Teste com credenciais de teste do Mercado Pago antes de trocar para produção.

Depois de aplicar a migration, alterações de catálogo devem ser feitas no Dashboard do Supabase até o painel administrativo também ser migrado para Supabase Auth com função de administrador. O login administrativo antigo não deve receber uma chave privilegiada no navegador.

Nunca coloque service-role key, access token ou webhook secret em `.env` do Vite ou em qualquer variável `VITE_*`.
