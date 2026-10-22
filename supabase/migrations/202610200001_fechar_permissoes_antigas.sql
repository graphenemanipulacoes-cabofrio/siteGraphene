-- Graphène · 20/10/2026 · Fecha permissões antigas que ficaram abertas.

-- 1) Produtos: só leitura pública. Alterações apenas pelo painel admin
--    (função admin_manage_products, que exige o token do admin).
drop policy if exists "Enable insert for anon" on public.produtos;
drop policy if exists "Enable read for all" on public.produtos;

-- 2) Bucket público "receitas": fica só com fotos de produto, sem listagem e
--    sem envio anônimo. O admin envia fotos por link assinado (admin-orders).
--    As receitas do formulário antigo foram copiadas para
--    receitas-privadas/legacy/ e o admin e o balcão já abrem por lá.
drop policy if exists "Allow Public Select" on storage.objects;
drop policy if exists "Allow Public Uploads" on storage.objects;

-- 3) Função interna do cadastro de clientes: só o gatilho do Auth a usa.
revoke execute on function public.handle_new_customer() from public, anon, authenticated;

-- 4) Fotos de produto: só imagens de até 5 MB.
update storage.buckets
   set allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp'],
       file_size_limit = 5242880
 where id = 'receitas';
