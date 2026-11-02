# Rotinas automáticas do Supabase

O projeto está no plano grátis do Supabase, que não tem backup automático e pausa após uma semana de pouca atividade. Duas rotinas gratuitas no GitHub Actions cobrem isso.

| Rotina | Arquivo | Horário (Brasília) | Precisa de senha? |
|---|---|---|---|
| Consulta diária | `.github/workflows/supabase-consulta-diaria.yml` | 06h17 | Não |
| Backup diário | `.github/workflows/supabase-backup-diario.yml` | 06h41 | Sim, dois segredos |

Se uma rotina falhar, o GitHub avisa por email. Elas não dispensam o plano pago quando houver fluxo: a documentação do Supabase não define quanta atividade basta para evitar a pausa.

## O que o backup guarda

- Guarda as tabelas do site (`public`) e as contas de login (`auth`), com permissões e donos.
- **Não guarda** os arquivos do Storage: receitas enviadas e fotos de produto.
- Cada arquivo fica disponível por 30 dias.

O repositório é público, então qualquer pessoa logada no GitHub consegue baixar o arquivo. Por isso ele sai criptografado e a proteção depende da força da senha de criptografia.

## Configuração (uma vez só)

Cadastre dois segredos em [Settings › Secrets and variables › Actions](https://github.com/graphenemanipulacoes-cabofrio/siteGraphene/settings/secrets/actions), usando a conta dona do repositório:

- **`SUPABASE_DB_PASSWORD`**: a senha do banco, em [Project Settings › Database](https://supabase.com/dashboard/project/ngphbcrdphluuphctvpr/settings/database). Se não souber, gere outra lá (Reset database password). O site e as funções usam chaves de API, não essa senha.
- **`BACKUP_PASSPHRASE`**: uma senha nova, com pelo menos 20 caracteres, que não seja usada em nenhum outro lugar. Guarde-a num gerenciador de senhas: **sem ela, nenhum backup abre**, e ela não pode ser recuperada.

Depois, abra a [rotina de backup](https://github.com/graphenemanipulacoes-cabofrio/siteGraphene/actions/workflows/supabase-backup-diario.yml) e clique em **Run workflow** para testar.

## Como restaurar

A restauração completa ainda não foi ensaiada. Em caso de emergência, faça primeiro num projeto novo do Supabase, nunca direto no projeto em uso, e peça ajuda técnica.

Precisa de `gpg` e das ferramentas do Postgres 17 (`pg_restore`).

1. Na [rotina de backup](https://github.com/graphenemanipulacoes-cabofrio/siteGraphene/actions/workflows/supabase-backup-diario.yml), abra a execução da data desejada e baixe o arquivo em **Artifacts**. Descompacte o zip.
2. Abra a criptografia (o `gpg` pede a `BACKUP_PASSPHRASE`):

   ```bash
   gpg --output banco.dump --decrypt banco-AAAA-MM-DD.dump.gpg
   ```

3. Confira o conteúdo:

   ```bash
   pg_restore --list banco.dump
   ```

4. Restaure as contas de login e depois as tabelas do site, usando a conexão **Session pooler** do projeto novo (botão **Connect** no painel). As mensagens sobre objetos que já existem no projeto novo são esperadas; leia as demais.

   ```bash
   pg_restore --no-owner --data-only --schema=auth --dbname="URL_DO_PROJETO_NOVO" banco.dump
   pg_restore --no-owner --schema=public --dbname="URL_DO_PROJETO_NOVO" banco.dump
   ```

5. Recrie os buckets `receitas` e `receitas-privadas`, publique as Edge Functions e cadastre os segredos delas (ver `ECOMMERCE_SECURITY.md`). Por último, atualize as variáveis `VITE_SUPABASE_*` na Vercel.
