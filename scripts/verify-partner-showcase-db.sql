-- Seleção de produtos da parceira no link /cupom/CODIGO: quem grava, o que o público lê.
-- Só dados sintéticos; o rollback desfaz tudo. Qualquer falha interrompe com erro.
begin;
do $$
declare
  v_partner uuid := gen_random_uuid();
  v_pending uuid := gen_random_uuid();
  v_stranger uuid := gen_random_uuid();
  v_admin uuid := gen_random_uuid();
  v_recipient uuid;
  v_coupon uuid;
  v_code text := 'FIXTURE' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10));
  v_a bigint;
  v_b bigint;
  v_off bigint;
  v_many bigint[];
  v_ids bigint[];
  v_refused boolean;
  v_count integer;
begin
  insert into auth.users (id, email, raw_user_meta_data) values
    (v_partner, v_partner::text || '@example.invalid', '{"full_name":"Fixture parceira"}'),
    (v_pending, v_pending::text || '@example.invalid', '{"full_name":"Fixture em análise"}'),
    (v_stranger, v_stranger::text || '@example.invalid', '{"full_name":"Fixture cliente"}'),
    (v_admin, v_admin::text || '@example.invalid', '{"full_name":"Fixture admin"}');
  insert into public.admins (username, email) values ('fixture-' || v_admin::text, v_admin::text || '@example.invalid');
  insert into public.commission_recipients (name, role, commission_type, commission_value, attribution_scope, hold_days, is_active)
    values ('Fixture parceira', 'influencer', 'percentage', 10, 'coupon', 30, true) returning id into v_recipient;
  insert into public.discount_coupons (recipient_id, code, discount_type, discount_value, is_active)
    values (v_recipient, v_code, 'percentage', 5, true) returning id into v_coupon;
  insert into public.partner_profiles (id, full_name, email, phone, document, pix_key, channel, status, commission_recipient_id, coupon_id)
    values (v_partner, 'Fixture parceira', v_partner::text || '@example.invalid', '22000000000', '00000000000', 'fixture', 'fixture', 'approved', v_recipient, v_coupon);
  insert into public.partner_profiles (id, full_name, email, phone, document, pix_key, channel, status)
    values (v_pending, 'Fixture em análise', v_pending::text || '@example.invalid', '22000000001', '00000000001', 'fixture', 'fixture', 'pending');
  insert into public.produtos (name, price) values ('Fixture A', 10) returning id into v_a;
  insert into public.produtos (name, price) values ('Fixture B', 10) returning id into v_b;
  insert into public.produtos (name, price, is_active) values ('Fixture fora do site', 10, false) returning id into v_off;
  with made as (insert into public.produtos (name, price) select 'Fixture extra ' || n, 10 from generate_series(1, 13) n returning id)
    select array_agg(id order by id) into v_many from made;

  -- Sem conta: não grava.
  perform set_config('request.jwt.claim.sub', '', true);
  perform set_config('request.jwt.claims', '{"role":"anon"}', true);
  begin
    perform public.save_partner_showcase(array[v_a]);
    v_refused := false;
  exception when others then v_refused := sqlerrm = 'authentication_required';
  end;
  if not v_refused then raise exception 'visitante não deveria gravar a seleção'; end if;

  -- Parceira aprovada: a ordem fica, repetição e produto fora do site saem.
  perform set_config('request.jwt.claim.sub', v_partner::text, true);
  perform set_config('request.jwt.claims', jsonb_build_object('sub', v_partner, 'email', v_partner::text || '@example.invalid', 'role', 'authenticated')::text, true);
  v_ids := public.save_partner_showcase(array[v_b, v_a, v_b, v_off]);
  if v_ids <> array[v_b, v_a] then raise exception 'seleção gravada errada: %', v_ids; end if;
  if public.partner_showcase_products('  ' || lower(v_code) || ' ') <> array[v_b, v_a] then raise exception 'o link deveria mostrar a seleção na ordem escolhida'; end if;

  -- No máximo 12 produtos.
  v_ids := public.save_partner_showcase(v_many);
  if cardinality(v_ids) <> 12 or v_ids <> v_many[1:12] then raise exception 'a seleção deveria parar em 12 produtos: %', v_ids; end if;
  v_ids := public.save_partner_showcase(array[v_b, v_a]);

  -- Conta que não é parceira aprovada não grava, nem na seleção de outra pessoa.
  perform set_config('request.jwt.claim.sub', v_pending::text, true);
  perform set_config('request.jwt.claims', jsonb_build_object('sub', v_pending, 'email', v_pending::text || '@example.invalid', 'role', 'authenticated')::text, true);
  begin
    perform public.save_partner_showcase(array[v_a]);
    v_refused := false;
  exception when others then v_refused := sqlerrm = 'partner_not_approved';
  end;
  if not v_refused then raise exception 'parceira em análise não deveria gravar'; end if;
  perform set_config('request.jwt.claim.sub', v_stranger::text, true);
  perform set_config('request.jwt.claims', jsonb_build_object('sub', v_stranger, 'email', v_stranger::text || '@example.invalid', 'role', 'authenticated')::text, true);
  begin
    perform public.save_partner_showcase(array[v_a], v_partner);
    v_refused := false;
  exception when others then v_refused := sqlerrm = 'forbidden';
  end;
  if not v_refused then raise exception 'outra conta não deveria alterar a seleção da parceira'; end if;
  if public.partner_showcase_products(v_code) <> array[v_b, v_a] then raise exception 'a seleção mudou depois de tentativas recusadas'; end if;

  -- Administrador altera e a ação fica no registro.
  perform set_config('request.jwt.claim.sub', v_admin::text, true);
  perform set_config('request.jwt.claims', jsonb_build_object('sub', v_admin, 'email', v_admin::text || '@example.invalid', 'role', 'authenticated')::text, true);
  v_ids := public.save_partner_showcase(array[v_a, v_b], v_partner);
  if v_ids <> array[v_a, v_b] then raise exception 'administrador deveria alterar a seleção'; end if;
  select count(*) into v_count from public.admin_audit_log where action = 'partner_showcase_save' and target = v_partner::text and actor = v_admin::text || '@example.invalid';
  if v_count <> 1 then raise exception 'alteração do administrador deveria ficar no registro de ações'; end if;

  -- Produto que sai do site some do link; cupom desativado esvazia a lista.
  update public.produtos set is_active = false where id = v_a;
  if public.partner_showcase_products(v_code) <> array[v_b] then raise exception 'produto fora do site não deveria aparecer no link'; end if;
  update public.discount_coupons set is_active = false where id = v_coupon;
  if cardinality(public.partner_showcase_products(v_code)) <> 0 then raise exception 'cupom desativado não deveria mostrar seleção'; end if;
  if cardinality(public.partner_showcase_products('NAOEXISTE' || v_code)) <> 0 or cardinality(public.partner_showcase_products(null)) <> 0 then raise exception 'cupom inexistente deveria devolver lista vazia'; end if;

  -- O navegador não lê nem grava a tabela; visitante só usa a leitura pública.
  if has_table_privilege('anon', 'public.partner_showcase', 'select') or has_table_privilege('authenticated', 'public.partner_showcase', 'select')
    or has_table_privilege('authenticated', 'public.partner_showcase', 'insert') or has_table_privilege('authenticated', 'public.partner_showcase', 'update') then
    raise exception 'a tabela da seleção não deve ser acessada direto pelo navegador';
  end if;
  if has_function_privilege('anon', 'public.save_partner_showcase(bigint[], uuid)', 'execute') then raise exception 'visitante não deve executar a gravação'; end if;
  if not has_function_privilege('anon', 'public.partner_showcase_products(text)', 'execute') then raise exception 'visitante deve conseguir ler a seleção pelo cupom'; end if;
end $$;
rollback;
