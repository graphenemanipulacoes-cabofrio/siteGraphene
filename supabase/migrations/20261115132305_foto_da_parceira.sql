-- Foto de perfil da parceira (opcional), mostrada na página do link dela (/cupom/CODIGO).
-- A foto fica no bucket público "parceiros", na pasta da própria conta. O navegador não grava
-- direto: a função partner-portal gera o link assinado de envio e grava o caminho.
alter table public.partner_profiles add column if not exists avatar_path text;
alter table public.partner_profiles drop constraint if exists partner_profiles_avatar_path_format;
alter table public.partner_profiles add constraint partner_profiles_avatar_path_format
  check (avatar_path is null or avatar_path ~ '^[0-9a-f-]{36}/avatar-[0-9]{10,16}\.(webp|jpg)$');

-- Bucket público (a foto aparece para quem abre o link), sem políticas: não lista, e envio e
-- remoção só pelo servidor. Fotos pequenas, já reduzidas no navegador antes do envio.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('parceiros', 'parceiros', true, 1048576, array['image/webp', 'image/jpeg'])
on conflict (id) do update set public = true, file_size_limit = 1048576, allowed_mime_types = array['image/webp', 'image/jpeg'];

-- Leitura pública pelo código do cupom: só o caminho da foto da parceira aprovada com cupom ativo.
-- Sem foto, cupom inexistente ou inativo: nulo.
create or replace function public.partner_avatar(p_code text)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select pp.avatar_path
  from public.discount_coupons c
  join public.partner_profiles pp on pp.coupon_id = c.id and pp.status = 'approved'
  where c.code = upper(btrim(p_code)) and c.is_active
  limit 1;
$$;
revoke all on function public.partner_avatar(text) from public;
grant execute on function public.partner_avatar(text) to anon, authenticated;
