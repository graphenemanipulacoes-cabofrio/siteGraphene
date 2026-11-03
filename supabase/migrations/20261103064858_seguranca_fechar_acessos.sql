-- Aplicar só depois de publicar a função receita-intake e o site novo:
-- o site antigo ainda grava direto nas permissões removidas aqui.

-- Receitas e solicitações passam só pela função receita-intake, que aplica os limites.
drop policy if exists "Public can upload private prescription files" on storage.objects;
drop policy if exists "Public can submit service requests" on public.solicitacoes;
revoke insert on public.solicitacoes from anon, authenticated;

-- Permissões que sobraram do padrão do Supabase. O RLS já barrava o acesso pela API,
-- mas TRUNCATE não passa pelo RLS: quem não precisa da permissão não deve tê-la.
revoke all on public.customer_profiles, public.orders, public.order_items from anon;
revoke insert, delete, truncate, references, trigger on public.customer_profiles from authenticated;
revoke truncate, references, trigger on public.orders, public.order_items from authenticated;
revoke truncate, references, trigger on public.produtos from anon, authenticated;

-- O e-mail de quem salvou o frete não deve ficar público.
revoke select on public.loja_config from anon, authenticated;
grant select (id, frete, updated_at) on public.loja_config to anon, authenticated;

-- Senhas antigas do balcão: o login por usuário não existe mais.
update public.counter_accounts set password_hash = null where password_hash is not null;

-- Função de escrita aberta ao público, sem nenhum uso no site ou nas funções.
drop function if exists public.admin_manage_products(text, text, jsonb, bigint[]);
