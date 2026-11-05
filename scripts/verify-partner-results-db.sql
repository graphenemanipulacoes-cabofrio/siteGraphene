-- Comissão sem frete, compra própria e tabelas privadas do resultado das parcerias.
-- Só dados sintéticos; o rollback desfaz tudo. Qualquer falha interrompe com erro.
begin;
do $$
declare
  v_customer uuid := gen_random_uuid();
  v_partner uuid := gen_random_uuid();
  v_recipient uuid;
  v_marketing uuid;
  v_order uuid;
  v_own uuid;
  v_base numeric;
  v_amount numeric;
  v_count integer;
begin
  insert into auth.users (id, email, raw_user_meta_data) values
    (v_customer, v_customer::text || '@example.invalid', '{"full_name":"Fixture cliente"}'),
    (v_partner, v_partner::text || '@example.invalid', '{"full_name":"Fixture parceira"}');
  insert into public.commission_recipients (name, role, commission_type, commission_value, attribution_scope, hold_days, is_active)
    values ('Fixture parceira', 'influencer', 'percentage', 10, 'coupon', 30, true) returning id into v_recipient;
  insert into public.commission_recipients (name, role, commission_type, commission_value, attribution_scope, hold_days, is_active)
    values ('Fixture marketing', 'marketing', 'percentage', 5, 'all_paid_orders', 30, true) returning id into v_marketing;
  insert into public.partner_profiles (id, full_name, email, phone, document, pix_key, channel, status, commission_recipient_id)
    values (v_partner, 'Fixture parceira', v_partner::text || '@example.invalid', '22000000000', '00000000000', 'fixture', 'fixture', 'approved', v_recipient);

  -- R$ 120 em produtos, R$ 12 de desconto e R$ 20 de frete: a base é R$ 108.
  insert into public.orders (checkout_key, customer_id, customer_email, shipping_address, subtotal, shipping_amount, total, discount_amount, attributed_recipient_id, payment_status, status, paid_at)
    values (gen_random_uuid(), v_customer, v_customer::text || '@example.invalid', '{}'::jsonb, 120, 20, 128, 12, v_recipient, 'paid', 'paid', now()) returning id into v_order;
  perform public.create_order_commissions(v_order);
  select base_amount, amount into v_base, v_amount from public.commissions where order_id = v_order and recipient_id = v_recipient;
  if v_base <> 108 or v_amount <> 10.80 then raise exception 'comissão da parceira errada: base %, valor %', v_base, v_amount; end if;
  select amount into v_amount from public.commissions where order_id = v_order and recipient_id = v_marketing;
  if v_amount <> 5.40 then raise exception 'comissão sobre todas as vendas errada: %', v_amount; end if;

  -- Compra da própria parceira: sem comissão para ela, mas segue contando para quem recebe sobre todas as vendas.
  insert into public.orders (checkout_key, customer_id, customer_email, shipping_address, subtotal, shipping_amount, total, discount_amount, attributed_recipient_id, payment_status, status, paid_at)
    values (gen_random_uuid(), v_partner, v_partner::text || '@example.invalid', '{}'::jsonb, 100, 0, 90, 10, v_recipient, 'paid', 'paid', now()) returning id into v_own;
  perform public.create_order_commissions(v_own);
  select count(*) into v_count from public.commissions where order_id = v_own and recipient_id = v_recipient;
  if v_count <> 0 then raise exception 'compra própria não deveria gerar comissão'; end if;
  select count(*) into v_count from public.commissions where order_id = v_own and recipient_id = v_marketing;
  if v_count <> 1 then raise exception 'compra própria deveria seguir nas vendas totais'; end if;

  -- Estorno cancela as comissões ainda não pagas.
  update public.orders set payment_status = 'refunded' where id = v_order;
  perform public.create_order_commissions(v_order);
  select count(*) into v_count from public.commissions where order_id = v_order and status <> 'cancelled';
  if v_count <> 0 then raise exception 'estorno deveria cancelar as comissões'; end if;

  -- Custos e regras nunca chegam ao navegador.
  if has_table_privilege('anon', 'public.partner_cost_settings', 'select') or has_table_privilege('authenticated', 'public.partner_cost_settings', 'select')
    or has_table_privilege('anon', 'public.product_costs', 'select') or has_table_privilege('authenticated', 'public.product_costs', 'select')
    or has_table_privilege('anon', 'public.partner_terms', 'select') or has_table_privilege('authenticated', 'public.partner_terms', 'select')
    or has_table_privilege('anon', 'public.partner_deliveries', 'select') or has_table_privilege('authenticated', 'public.partner_deliveries', 'select') then
    raise exception 'tabelas de custos e regras não podem ser lidas pelo navegador';
  end if;
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'produtos' and column_name ilike '%cost%') then
    raise exception 'custo não pode ficar na tabela pública de produtos';
  end if;
  if has_function_privilege('anon', 'public.create_order_commissions(uuid)', 'execute') or has_function_privilege('authenticated', 'public.create_order_commissions(uuid)', 'execute') then
    raise exception 'criação de comissão não pode ser chamada pelo navegador';
  end if;
  if (select default_cost_percent from public.partner_cost_settings where id = 1) is null then raise exception 'custos padrão ausentes'; end if;
end $$;
rollback;
