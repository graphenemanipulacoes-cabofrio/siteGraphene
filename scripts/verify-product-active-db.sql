-- Produto fora do site: o público não lê, o checkout recusa e pode voltar depois.
-- Só dados sintéticos; o rollback desfaz tudo. Qualquer falha interrompe com erro.
begin;
do $$
declare
  v_user uuid := gen_random_uuid();
  v_on bigint;
  v_off bigint;
  v_visible integer;
  v_order jsonb;
  v_refused boolean := false;
begin
  insert into auth.users (id, email, raw_user_meta_data) values (v_user, v_user::text || '@example.invalid', '{"full_name":"Fixture sintética"}');
  insert into public.produtos (name, price) values ('Fixture no site', 10) returning id into v_on;
  insert into public.produtos (name, price, is_active) values ('Fixture fora do site', 10, false) returning id into v_off;

  set local role anon;
  select count(*) into v_visible from public.produtos where id in (v_on, v_off);
  reset role;
  if v_visible <> 1 then raise exception 'visitante deveria ver só o produto ativo, viu %', v_visible; end if;

  set local role authenticated;
  select count(*) into v_visible from public.produtos where id = v_off;
  reset role;
  if v_visible <> 0 then raise exception 'cliente conectado não deveria ver o produto fora do site'; end if;

  v_order := public.create_checkout_order_v2(v_user, v_user::text || '@example.invalid', gen_random_uuid(), jsonb_build_array(jsonb_build_object('product_id', v_on, 'quantity', 1)), '{"zip":"28907000"}'::jsonb);
  if (v_order ->> 'subtotal')::numeric <> 10 then raise exception 'produto ativo deveria entrar no pedido'; end if;

  begin
    perform public.create_checkout_order_v2(v_user, v_user::text || '@example.invalid', gen_random_uuid(), jsonb_build_array(jsonb_build_object('product_id', v_off, 'quantity', 1)), '{"zip":"28907000"}'::jsonb);
  exception when others then
    if sqlerrm <> 'invalid_or_unpriced_product' then raise; end if;
    v_refused := true;
  end;
  if not v_refused then raise exception 'checkout deveria recusar produto fora do site'; end if;

  update public.produtos set is_active = true where id = v_off;
  set local role anon;
  select count(*) into v_visible from public.produtos where id in (v_on, v_off);
  reset role;
  if v_visible <> 2 then raise exception 'produto reativado deveria voltar ao site'; end if;

  if has_table_privilege('anon', 'public.produtos_textos_anteriores', 'select')
    or has_table_privilege('authenticated', 'public.produtos_textos_anteriores', 'select') then
    raise exception 'textos antigos não devem ser lidos pelo navegador';
  end if;
end $$;
rollback;
