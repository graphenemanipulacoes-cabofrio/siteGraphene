-- Seleção de produtos que cada parceira destaca no próprio link (/cupom/CODIGO).
-- A tabela não é lida nem gravada direto pelo navegador: tudo passa pelas funções abaixo.
create table if not exists public.partner_showcase (
  partner_id uuid primary key references public.partner_profiles(id) on delete cascade,
  product_ids bigint[] not null default '{}',
  updated_at timestamptz not null default now(),
  updated_by text,
  constraint partner_showcase_limit check (cardinality(product_ids) <= 12)
);
alter table public.partner_showcase enable row level security;
revoke all on public.partner_showcase from anon, authenticated;

-- Leitura pública pelo código do cupom. Devolve só os números dos produtos que estão no
-- site, na ordem escolhida. Cupom inexistente, inativo ou sem seleção: lista vazia.
create or replace function public.partner_showcase_products(p_code text)
returns bigint[]
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((
    select array(
      select x.id
      from unnest(s.product_ids) with ordinality as x(id, pos)
      where exists (select 1 from public.produtos p where p.id = x.id and p.is_active)
      order by x.pos
    )
    from public.discount_coupons c
    join public.partner_profiles pp on pp.coupon_id = c.id and pp.status = 'approved'
    join public.partner_showcase s on s.partner_id = pp.id
    where c.code = upper(btrim(p_code)) and c.is_active
    limit 1
  ), '{}'::bigint[]);
$$;
revoke all on function public.partner_showcase_products(text) from public;
grant execute on function public.partner_showcase_products(text) to anon, authenticated;

-- Gravação: a própria parceira aprovada ou um administrador (que fica no registro de ações).
-- Fica no máximo com 12 produtos, sem repetição e só com produtos que estão no site.
create or replace function public.save_partner_showcase(p_product_ids bigint[], p_partner_id uuid default null)
returns bigint[]
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_target uuid := coalesce(p_partner_id, auth.uid());
  v_admin boolean := false;
  v_ids bigint[];
begin
  if v_user is null then
    raise exception 'authentication_required' using errcode = '28000';
  end if;
  if v_target <> v_user then
    v_admin := coalesce(public.current_staff_role() = 'admin', false);
    if not v_admin then
      raise exception 'forbidden' using errcode = '42501';
    end if;
  end if;
  if not exists (select 1 from public.partner_profiles where id = v_target and status = 'approved') then
    raise exception 'partner_not_approved' using errcode = '42501';
  end if;

  select coalesce(array_agg(picked.id order by picked.pos), '{}'::bigint[]) into v_ids
  from (
    select x.id, min(x.pos) as pos
    from unnest(coalesce(p_product_ids, '{}'::bigint[])) with ordinality as x(id, pos)
    join public.produtos p on p.id = x.id and p.is_active
    group by x.id
    order by min(x.pos)
    limit 12
  ) picked;

  insert into public.partner_showcase (partner_id, product_ids, updated_at, updated_by)
  values (v_target, v_ids, now(), case when v_admin then 'admin' else 'partner' end)
  on conflict (partner_id) do update
    set product_ids = excluded.product_ids, updated_at = excluded.updated_at, updated_by = excluded.updated_by;

  if v_admin then
    insert into public.admin_audit_log (actor, action, target, details)
    values (lower(auth.jwt() ->> 'email'), 'partner_showcase_save', v_target::text, jsonb_build_object('product_ids', to_jsonb(v_ids)));
  end if;
  return v_ids;
end;
$$;
revoke all on function public.save_partner_showcase(bigint[], uuid) from public, anon;
grant execute on function public.save_partner_showcase(bigint[], uuid) to authenticated;
