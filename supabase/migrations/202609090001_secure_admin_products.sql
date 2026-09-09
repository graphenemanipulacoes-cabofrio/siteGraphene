-- Product management must run through a verified administrator session.
-- The browser keeps using the public Supabase key, but it cannot write to
-- produtos directly because RLS remains enabled and write privileges revoked.
create or replace function public.admin_manage_products(
  p_action text,
  p_token text,
  p_product jsonb default null,
  p_product_ids bigint[] default null
) returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_authorized boolean := false;
  v_name text;
  v_description text;
  v_image_url text;
  v_price numeric(12,2);
  v_product_id bigint;
  v_product public.produtos%rowtype;
  v_products jsonb;
  v_id bigint;
  v_index integer := 0;
begin
  if p_action not in ('list', 'save', 'delete', 'reorder')
    or length(coalesce(p_token, '')) not between 32 and 100 then
    raise exception 'unauthorized' using errcode = '28000';
  end if;

  select exists(
    select 1
    from public.admin_sessions
    where token_hash = encode(digest(p_token, 'sha256'), 'hex')
      and expires_at > now()
  ) into v_authorized;

  if not v_authorized then
    raise exception 'unauthorized' using errcode = '28000';
  end if;

  update public.admin_sessions
  set last_used_at = now()
  where token_hash = encode(digest(p_token, 'sha256'), 'hex');

  if p_action = 'list' then
    select coalesce(jsonb_agg(to_jsonb(p) order by p.display_order asc, p.created_at asc), '[]'::jsonb)
      into v_products
    from public.produtos p;
    return jsonb_build_object('products', v_products);
  end if;

  if p_action = 'save' then
    v_name := left(btrim(coalesce(p_product ->> 'name', '')), 180);
    v_description := nullif(left(btrim(coalesce(p_product ->> 'description', '')), 4000), '');
    v_image_url := nullif(left(btrim(coalesce(p_product ->> 'image_url', '')), 1200), '');
    begin
      v_price := coalesce(nullif(p_product ->> 'price', '')::numeric, 0);
    exception when invalid_text_representation then
      raise exception 'invalid_product';
    end;

    if v_name = '' or v_price < 0 or v_price > 1000000
      or (v_image_url is not null and v_image_url !~ '^https://[^[:space:]]+$') then
      raise exception 'invalid_product';
    end if;

    if nullif(p_product ->> 'id', '') is null then
      insert into public.produtos (name, description, price, image_url)
      values (v_name, v_description, v_price, v_image_url)
      returning * into v_product;
    else
      begin
        v_product_id := (p_product ->> 'id')::bigint;
      exception when invalid_text_representation then
        raise exception 'invalid_product';
      end;
      if v_product_id < 1 then raise exception 'invalid_product'; end if;
      update public.produtos
      set name = v_name, description = v_description, price = v_price, image_url = v_image_url
      where id = v_product_id
      returning * into v_product;
      if not found then raise exception 'product_not_found'; end if;
    end if;

    return jsonb_build_object('product', to_jsonb(v_product));
  end if;

  if p_action = 'delete' then
    begin
      v_product_id := (p_product ->> 'id')::bigint;
    exception when invalid_text_representation then
      raise exception 'invalid_product';
    end;
    if v_product_id < 1 then raise exception 'invalid_product'; end if;
    delete from public.produtos where id = v_product_id;
    if not found then raise exception 'product_not_found'; end if;
    return jsonb_build_object('ok', true);
  end if;

  if cardinality(p_product_ids) is null or cardinality(p_product_ids) < 1 or cardinality(p_product_ids) > 200
    or exists (select 1 from unnest(p_product_ids) as id where id < 1)
    or (select count(distinct id) from unnest(p_product_ids) as id) <> cardinality(p_product_ids) then
    raise exception 'invalid_product_order';
  end if;

  foreach v_id in array p_product_ids loop
    update public.produtos set display_order = v_index where id = v_id;
    if not found then raise exception 'product_not_found'; end if;
    v_index := v_index + 1;
  end loop;
  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.admin_manage_products(text, text, jsonb, bigint[]) from public;
grant execute on function public.admin_manage_products(text, text, jsonb, bigint[]) to anon, authenticated;
