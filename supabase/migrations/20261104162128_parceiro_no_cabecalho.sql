-- Mostra o botão do painel no cabeçalho para quem tem parceria. Devolve só a situação da
-- própria conta; o painel continua conferindo tudo no servidor.
create or replace function public.current_partner_status()
returns text language sql stable security definer set search_path = ''
as $$
  select status from public.partner_profiles where id = auth.uid();
$$;
revoke all on function public.current_partner_status() from public, anon;
grant execute on function public.current_partner_status() to authenticated;
