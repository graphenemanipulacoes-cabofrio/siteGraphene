-- Regras de pagamento do checkout no site: begin_payment_attempt, apply_mp_payment, fail_payment_attempt e order_payment_state.
-- Rodar depois da migração 20261126120000_checkout_no_site.sql.
-- Só dados sintéticos (e-mails @example.invalid, ids de pagamento 9xxxxxx); o rollback desfaz tudo. Qualquer falha interrompe com erro.
-- Não cadastra produtos: usa um produto que já existe. O rollback não desfaz sequências, então os ids internos de
-- order_items e payment_events avançam a cada execução (nenhum aparece para o cliente).
-- A trava entre duas sessões (webhook e process-payment ao mesmo tempo) não é exercitada aqui: o teste usa uma sessão só
-- e confere apenas que o begin segura a trava do cliente até o fim da transação.
begin;

create function pg_temp.ok(p_cond boolean, p_msg text) returns void language plpgsql as $$
begin
  if p_cond is not true then raise exception 'falhou: %', p_msg; end if;
end $$;

-- Espera que o comando termine com a exceção p_code (a mensagem é o próprio código).
create function pg_temp.expect_code(p_sql text, p_code text) returns void language plpgsql as $$
begin
  begin
    execute p_sql;
  exception when others then
    if sqlerrm = p_code then return; end if;
    raise exception 'esperava %, recebeu %', p_code, sqlerrm;
  end;
  raise exception 'esperava %, mas não houve erro: %', p_code, p_sql;
end $$;

create function pg_temp.begin_expect(p_order uuid, p_customer uuid, p_key uuid, p_method text, p_code text) returns void language sql as $$
  select pg_temp.expect_code(format('select public.begin_payment_attempt(%L::uuid, %L::uuid, %L::uuid, %L)', p_order, p_customer, p_key, p_method), p_code);
$$;

create function pg_temp.new_order(p_customer uuid, p_total numeric, p_product bigint, p_status text default 'awaiting_payment',
  p_payment_status text default 'pending', p_created timestamptz default now(), p_document text default '00000000000') returns uuid language plpgsql as $$
declare v uuid;
begin
  insert into public.orders (checkout_key, customer_id, customer_email, shipping_address, subtotal, shipping_amount, total, status, payment_status, customer_document, created_at)
  values (gen_random_uuid(), p_customer, p_customer::text || '@example.invalid', '{"zip":"28907000"}'::jsonb, p_total, 0, p_total, p_status, p_payment_status, p_document, p_created)
  returning id into v;
  insert into public.order_items (order_id, product_id, product_name, unit_price, quantity) values (v, p_product, 'Fixture produto', p_total, 1);
  return v;
end $$;

-- Pagamento normalizado (mesmas chaves de normalizePayment), com cartão por padrão.
create function pg_temp.mp(p_order uuid, p_id text, p_status text, p_amount numeric, p_source text default 'webhook', p_extra jsonb default '{}') returns jsonb language sql as $$
  select public.apply_mp_payment(jsonb_build_object(
    'id', p_id, 'external_reference', p_order::text, 'status', p_status, 'status_detail', null,
    'amount', p_amount, 'refunded_amount', 0, 'method_type', 'credit_card', 'method_id', 'visa',
    'installments', 1, 'fee', 0, 'net', p_amount, 'date_approved', null, 'attempt_key', null, 'pix', null) || p_extra, p_source);
$$;

create function pg_temp.pix(p_key uuid, p_expires timestamptz) returns jsonb language sql as $$
  select jsonb_build_object('method_type', 'bank_transfer', 'method_id', 'pix', 'attempt_key', p_key,
    'pix', jsonb_build_object('qr_code', '00020126FIXTURESINTETICO', 'qr_code_base64', 'iVBORw0KGgoFIXTURE', 'expires_at', p_expires));
$$;

do $$
declare
  c1 uuid := gen_random_uuid();
  c2 uuid := gen_random_uuid();
  c3 uuid := gen_random_uuid();
  c4 uuid := gen_random_uuid();
  c5 uuid := gen_random_uuid();
  c6 uuid := gen_random_uuid();
  c7 uuid := gen_random_uuid();
  v_product bigint;
  v_off bigint;
  v_recipient uuid;
  o1 uuid; o2 uuid; o3 uuid; o4 uuid; o5 uuid; o6 uuid; o7 uuid; o8 uuid; o9 uuid; o10 uuid;
  o11 uuid; o13 uuid; o14 uuid; o15 uuid; o16 uuid; o17 uuid; o18 uuid; o19 uuid; o20 uuid; o22 uuid;
  o23 uuid; o24 uuid; o25 uuid; o26 uuid; o27 uuid; o28 uuid; o29 uuid; o30 uuid; o31 uuid; o32 uuid; o33 uuid; o34 uuid;
  k1 uuid := gen_random_uuid(); k2 uuid := gen_random_uuid(); k3 uuid := gen_random_uuid(); k4 uuid := gen_random_uuid();
  k5 uuid := gen_random_uuid(); k6 uuid := gen_random_uuid(); kp1 uuid := gen_random_uuid(); kp2 uuid := gen_random_uuid();
  kp3 uuid := gen_random_uuid(); kc1 uuid := gen_random_uuid(); kc2 uuid := gen_random_uuid(); kp4 uuid := gen_random_uuid();
  kp5 uuid := gen_random_uuid(); kc5 uuid := gen_random_uuid(); kp6 uuid := gen_random_uuid(); kc6 uuid := gen_random_uuid();
  kc7 uuid := gen_random_uuid();
  r jsonb;
  v_paid_at timestamptz;
  v_attempt uuid;
  v_attempt2 uuid;
  v_lock bigint;
  v_count integer;
  v_text text;
  v_denied boolean := false;
begin
  insert into auth.users (id, email, raw_user_meta_data) values
    (c1, c1::text || '@example.invalid', '{"full_name":"Fixture cliente 1"}'),
    (c2, c2::text || '@example.invalid', '{"full_name":"Fixture cliente 2"}'),
    (c3, c3::text || '@example.invalid', '{"full_name":"Fixture cliente 3"}'),
    (c4, c4::text || '@example.invalid', '{"full_name":"Fixture cliente 4"}'),
    (c5, c5::text || '@example.invalid', '{"full_name":"Fixture cliente 5"}'),
    (c6, c6::text || '@example.invalid', '{"full_name":"Fixture cliente 6"}'),
    (c7, c7::text || '@example.invalid', '{"full_name":"Fixture cliente 7"}');
  -- Produtos que já existem: cadastrar produto avançaria produtos.id mesmo com rollback, e os códigos G + número
  -- dos rótulos pulariam números. Para o caso "fora do site", usa um produto já fora do site ou tira um do site só
  -- dentro desta transação.
  select id into v_product from public.produtos where is_active order by id limit 1;
  select id into v_off from public.produtos where not is_active order by id limit 1;
  if v_off is null then
    select id into v_off from public.produtos where is_active and id <> v_product order by id limit 1;
    update public.produtos set is_active = false where id = v_off;
  end if;
  perform pg_temp.ok(v_product is not null and v_off is not null, 'o teste precisa de um produto no site e de outro fora dele');
  insert into public.commission_recipients (name, role, commission_type, commission_value, attribution_scope, hold_days, is_active)
    values ('Fixture todas as vendas', 'marketing', 'percentage', 10, 'all_paid_orders', 30, true) returning id into v_recipient;

  -- Permissões: só service_role executa; o navegador não lê nem grava tentativas.
  perform pg_temp.ok(not has_function_privilege('anon', 'public.begin_payment_attempt(uuid,uuid,uuid,text)', 'execute')
    and not has_function_privilege('authenticated', 'public.begin_payment_attempt(uuid,uuid,uuid,text)', 'execute')
    and not has_function_privilege('anon', 'public.apply_mp_payment(jsonb,text)', 'execute')
    and not has_function_privilege('authenticated', 'public.apply_mp_payment(jsonb,text)', 'execute')
    and not has_function_privilege('anon', 'public.fail_payment_attempt(uuid,text)', 'execute')
    and not has_function_privilege('authenticated', 'public.fail_payment_attempt(uuid,text)', 'execute')
    and not has_function_privilege('anon', 'public.order_payment_state(uuid,uuid)', 'execute')
    and not has_function_privilege('authenticated', 'public.order_payment_state(uuid,uuid)', 'execute'),
    'RPCs de pagamento não podem ser chamadas pelo navegador');
  perform pg_temp.ok(has_function_privilege('service_role', 'public.begin_payment_attempt(uuid,uuid,uuid,text)', 'execute')
    and has_function_privilege('service_role', 'public.apply_mp_payment(jsonb,text)', 'execute')
    and has_function_privilege('service_role', 'public.fail_payment_attempt(uuid,text)', 'execute')
    and has_function_privilege('service_role', 'public.order_payment_state(uuid,uuid)', 'execute'),
    'service_role precisa executar as RPCs de pagamento');
  -- payment_order_payload e payment_order_block_reason recebem a linha de orders: com EXECUTE, o PostgREST as mostraria
  -- como colunas calculadas de orders.
  perform pg_temp.ok(not exists (
      select 1 from unnest(array['anon', 'authenticated']) as r(role_name),
        unnest(array['public.payment_status_level(text)', 'public.payment_attempt_json(public.payment_attempts)',
                     'public.payment_order_block_reason(public.orders)', 'public.payment_order_payload(public.orders)']) as f(fn)
      where has_function_privilege(r.role_name::name, f.fn, 'execute')),
    'funções internas não podem ser chamadas pelo navegador');
  perform pg_temp.ok((select bool_and(p.prosecdef and p.proconfig @> array['search_path=public'])
    from pg_proc p where p.pronamespace = 'public'::regnamespace
      and p.proname in ('begin_payment_attempt', 'apply_mp_payment', 'fail_payment_attempt', 'order_payment_state')),
    'RPCs precisam ser security definer com search_path public');
  perform pg_temp.ok((select relrowsecurity from pg_class where oid = 'public.payment_attempts'::regclass), 'payment_attempts sem RLS');
  perform pg_temp.ok(not has_table_privilege('anon', 'public.payment_attempts', 'select')
    and not has_table_privilege('authenticated', 'public.payment_attempts', 'select')
    and not has_table_privilege('authenticated', 'public.payment_attempts', 'insert')
    and not has_table_privilege('authenticated', 'public.payment_attempts', 'update')
    and not has_table_privilege('authenticated', 'public.payment_attempts', 'delete')
    and not has_table_privilege('authenticated', 'public.payment_events', 'select'),
    'tentativas e eventos não podem ser lidos pelo navegador');
  begin
    set local role authenticated;
    perform count(*) from public.payment_attempts;
  exception when insufficient_privilege then
    v_denied := true;
  end;
  reset role;
  perform pg_temp.ok(v_denied, 'authenticated conseguiu ler payment_attempts');

  -- Entrada inválida.
  perform pg_temp.expect_code(format('select public.apply_mp_payment(%L::jsonb, %L)', '{"id":"abc","status":"approved"}', 'webhook'), 'invalid_payment');
  perform pg_temp.expect_code(format('select public.apply_mp_payment(%L::jsonb, %L)', '{"id":"9000999","status":"approved"}', 'navegador'), 'invalid_source');
  r := pg_temp.mp(gen_random_uuid(), '9000998', 'approved', 10);
  perform pg_temp.ok(r ->> 'decision' = 'unknown_order', 'pedido desconhecido deveria ser unknown_order');
  r := public.apply_mp_payment('{"id":"9000997","status":"approved","external_reference":"pedido-de-fora"}'::jsonb, 'webhook');
  perform pg_temp.ok(r ->> 'decision' = 'unknown_order', 'referência que não é UUID deveria ser unknown_order');

  -- Dono, chave e método.
  o1 := pg_temp.new_order(c1, 100, v_product);
  o2 := pg_temp.new_order(c1, 90, v_product);
  perform pg_temp.begin_expect(o1, c2, k1, 'card', 'order_not_found');
  perform pg_temp.begin_expect(gen_random_uuid(), c1, k1, 'card', 'order_not_found');
  perform pg_temp.begin_expect(o1, c1, k1, 'boleto', 'invalid_payment_request');
  r := public.begin_payment_attempt(o1, c1, k1, 'card');
  perform pg_temp.ok(r ->> 'result' = 'created' and (r ->> 'amount')::numeric = 100 and r -> 'attempt' ->> 'status' = 'creating'
    and jsonb_array_length(r -> 'items') = 1 and r ->> 'customer_document' = '00000000000'
    and (r -> 'items' -> 0 ->> 'product_id')::bigint = v_product, 'begin deveria criar a tentativa com os dados do banco');
  v_attempt := (r ->> 'attempt_id')::uuid;
  -- Trava do cliente (pg_advisory_xact_lock de 64 bits: metade alta em classid, metade baixa em objid).
  v_lock := hashtextextended('payment_customer:' || c1::text, 0);
  perform pg_temp.ok(exists (select 1 from pg_locks l where l.locktype = 'advisory' and l.pid = pg_backend_pid() and l.granted
      and l.classid = ((v_lock >> 32) & 4294967295)::oid and l.objid = (v_lock & 4294967295)::oid and l.objsubid = 1),
    'begin deveria segurar a trava do cliente até o fim da transação');
  r := public.begin_payment_attempt(o1, c1, k1, 'card');
  perform pg_temp.ok(r ->> 'result' = 'replay' and (r ->> 'attempt_id')::uuid = v_attempt and (r ->> 'amount')::numeric = 100,
    'mesma chave deveria devolver replay com os dados para reenviar');
  perform pg_temp.begin_expect(o1, c1, k1, 'pix', 'attempt_conflict');
  perform pg_temp.begin_expect(o2, c1, k1, 'card', 'attempt_conflict');
  perform pg_temp.begin_expect(o1, c1, k2, 'card', 'payment_in_progress');
  -- Duas abas: outro pedido do mesmo cliente com tentativa em criação.
  perform pg_temp.begin_expect(o2, c1, k3, 'pix', 'payment_in_progress');
  r := public.order_payment_state(o1, c1);
  perform pg_temp.ok(r ->> 'reason' = 'payment_in_progress' and not (r ->> 'payable')::boolean, 'estado deveria mostrar pagamento em andamento');

  -- Cartão recusado: pedido 'failed', status continua awaiting_payment.
  r := pg_temp.mp(o1, '9000001', 'rejected', 100, 'process-payment', jsonb_build_object('attempt_key', k1, 'status_detail', 'cc_rejected_other_reason'));
  perform pg_temp.ok(r ->> 'decision' = 'failed' and r ->> 'payment_status' = 'failed' and r ->> 'status' = 'awaiting_payment'
    and (r ->> 'attempt_id')::uuid = v_attempt and r ->> 'attempt_status' = 'rejected', 'recusa deveria marcar failed sem cancelar o pedido');
  perform pg_temp.ok((select provider_payment_id = '9000001' and status_detail = 'cc_rejected_other_reason' from public.payment_attempts where id = v_attempt),
    'a tentativa deveria guardar o id do pagamento achado pela chave');
  -- O mesmo pagamento chegando com o outro pedido na referência: attempt_conflict, sem mexer em nada.
  perform pg_temp.expect_code(format('select pg_temp.mp(%L::uuid, %L, %L, %s)', o2, '9000001', 'rejected', 90), 'attempt_conflict');
  perform pg_temp.ok((select payment_status = 'pending' and status = 'awaiting_payment' from public.orders where id = o2)
    and (select order_id = o1 from public.payment_attempts where provider_payment_id = '9000001'),
    'attempt_conflict não pode mexer no outro pedido nem na tentativa');
  r := public.begin_payment_attempt(o1, c1, k1, 'card');
  perform pg_temp.ok(r ->> 'result' = 'replay' and r -> 'attempt' ->> 'status' = 'rejected', 'replay de tentativa final deveria devolver o status gravado');
  r := public.fail_payment_attempt(v_attempt, 'rate_limited');
  perform pg_temp.ok(not (r ->> 'ok')::boolean and r -> 'attempt' ->> 'status' = 'rejected', 'fail_payment_attempt não pode mexer em tentativa com resposta');

  -- Nova tentativa no mesmo pedido, em análise, depois aprovada.
  r := public.begin_payment_attempt(o1, c1, k2, 'card');
  perform pg_temp.ok(r ->> 'result' = 'created', 'nova chave depois da recusa deveria criar tentativa');
  r := pg_temp.mp(o1, '9000002', 'in_process', 100, 'process-payment', jsonb_build_object('attempt_key', k2, 'status_detail', 'pending_contingency', 'installments', 3));
  perform pg_temp.ok(r ->> 'decision' = 'pending' and r ->> 'payment_status' = 'pending', 'em análise deveria voltar o pedido para pending');
  perform pg_temp.begin_expect(o1, c1, k4, 'card', 'payment_in_review');
  perform pg_temp.begin_expect(o1, c1, k4, 'pix', 'payment_in_review');
  r := public.order_payment_state(o1, c1);
  perform pg_temp.ok(r ->> 'reason' = 'payment_in_review' and r -> 'attempt' ->> 'provider_payment_id' = '9000002'
    and (r ->> 'refresh_due')::boolean = false, 'estado deveria mostrar o cartão em análise, já consultado agora');

  r := pg_temp.mp(o1, '9000002', 'approved', 100, 'webhook', jsonb_build_object('status_detail', 'accredited', 'installments', 3, 'date_approved', '2026-11-26T10:00:00.000-03:00'));
  perform pg_temp.ok(r ->> 'decision' = 'paid' and r ->> 'payment_status' = 'paid' and r ->> 'status' = 'paid' and r ->> 'paid_payment_id' = '9000002',
    'aprovado deveria pagar o pedido');
  select paid_at into v_paid_at from public.orders where id = o1;
  perform pg_temp.ok(v_paid_at = '2026-11-26T10:00:00.000-03:00'::timestamptz, 'paid_at deveria vir de date_approved');
  perform pg_temp.ok((select payment_reference = '9000002' and payment_details ->> 'payment_id' = '9000002' and payment_method = 'credit_card'
    and (payment_details ->> 'installments')::int = 3 from public.orders where id = o1), 'dados do pagamento deveriam ficar no pedido');
  select count(*) into v_count from public.commissions where order_id = o1 and recipient_id = v_recipient and status = 'pending';
  perform pg_temp.ok(v_count = 1, 'comissão deveria ser criada no pagamento');
  perform pg_temp.begin_expect(o1, c1, k5, 'pix', 'already_paid');
  r := public.order_payment_state(o1, c1);
  perform pg_temp.ok(r ->> 'reason' = 'already_paid' and r -> 'attempt' ->> 'provider_payment_id' = '9000002', 'estado do pedido pago');

  -- Aprovado repetido: paid_at igual, só a taxa muda.
  r := pg_temp.mp(o1, '9000002', 'approved', 100, 'webhook', jsonb_build_object('fee', 4.99, 'net', 95.01, 'date_approved', '2026-11-26T11:00:00.000-03:00'));
  perform pg_temp.ok(r ->> 'decision' = 'repeat', 'aprovado repetido deveria ser repeat');
  perform pg_temp.ok((select paid_at = v_paid_at and provider_fee = 4.99 and net_amount = 95.01 and status = 'paid' from public.orders where id = o1),
    'repeat não pode mudar paid_at nem status, só a taxa');
  -- Segundo aprovado com outro id: pedido intacto e alerta.
  r := pg_temp.mp(o1, '9000003', 'approved', 100);
  perform pg_temp.ok(r ->> 'decision' = 'duplicate_approved' and r ->> 'paid_payment_id' = '9000002', 'segundo aprovado deveria ser duplicate_approved');
  -- Recusa atrasada e aviso fora de ordem não rebaixam o pedido pago.
  r := pg_temp.mp(o1, '9000004', 'rejected', 100);
  perform pg_temp.ok(r ->> 'decision' = 'ignored_settled' and r ->> 'payment_status' = 'paid', 'recusa depois do pago não pode mudar o pedido');
  r := pg_temp.mp(o1, '9000002', 'pending', 100);
  perform pg_temp.ok(r ->> 'decision' = 'stale' and r ->> 'attempt_status' = 'approved', 'pending depois de approved deveria ser stale');
  perform pg_temp.ok((select payment_status = 'paid' and status = 'paid' and paid_payment_id = '9000002' and paid_at = v_paid_at from public.orders where id = o1),
    'pedido pago deveria continuar intacto');
  select count(*) into v_count from public.commissions where order_id = o1 and recipient_id = v_recipient and status = 'pending';
  perform pg_temp.ok(v_count = 1, 'comissão criada uma vez e não cancelada por recusa atrasada');
  -- Estorno de outro pagamento (o duplicado) pelo admin: pedido intacto.
  r := pg_temp.mp(o1, '9000003', 'refunded', 100, 'refund');
  perform pg_temp.ok(r ->> 'decision' = 'reversal_other' and r ->> 'payment_status' = 'paid', 'estorno do pagamento extra não pode mexer no pedido');
  -- Eventos com origem, decisão e tentativa.
  perform pg_temp.ok((select count(*) = 0 from public.payment_events where order_id = o1 and (decision is null or source is null or attempt_id is null)),
    'todo evento deveria ter source, decision e attempt_id');
  perform pg_temp.ok(exists (select 1 from public.payment_events where order_id = o1 and source = 'process-payment' and decision = 'failed' and provider_payment_id = '9000001'),
    'evento da recusa deveria ser gravado');

  -- Valor diferente não paga.
  o3 := pg_temp.new_order(c1, 80, v_product);
  r := public.begin_payment_attempt(o3, c1, k6, 'card');
  r := pg_temp.mp(o3, '9000010', 'approved', 79, 'process-payment', jsonb_build_object('attempt_key', k6));
  perform pg_temp.ok(r ->> 'decision' = 'amount_mismatch' and r ->> 'payment_status' = 'pending' and r ->> 'paid_payment_id' is null,
    'valor diferente não pode pagar o pedido');
  r := pg_temp.mp(o3, '9000011', 'approved', null);
  perform pg_temp.ok(r ->> 'decision' = 'amount_mismatch', 'valor ausente não pode pagar o pedido');
  r := pg_temp.mp(o3, '9000012', 'algum_status_novo', 80);
  perform pg_temp.ok(r ->> 'decision' = 'ignored_unknown_status' and r ->> 'payment_status' = 'pending', 'status desconhecido não muda nada');

  -- Pix: cria, reaproveita, e o cartão ou outro pedido pedem o cancelamento do Pix aberto.
  o4 := pg_temp.new_order(c2, 60, v_product);
  o5 := pg_temp.new_order(c2, 60, v_product);
  r := public.begin_payment_attempt(o4, c2, kp1, 'pix');
  perform pg_temp.ok(r ->> 'result' = 'created' and r -> 'attempt' ->> 'method' = 'pix' and r -> 'attempt' ->> 'expires_at' is null,
    'Pix deveria ser criado sem prazo próprio (o prazo vem do Mercado Pago)');
  r := pg_temp.mp(o4, '9100001', 'pending', 60, 'process-payment', pg_temp.pix(kp1, now() + interval '35 minutes') || '{"status_detail":"pending_waiting_transfer"}');
  perform pg_temp.ok(r ->> 'decision' = 'pending', 'Pix gerado deveria ficar pending');
  perform pg_temp.ok((select pix_qr_code is not null and pix_qr_code_base64 is not null and expires_at = now() + interval '35 minutes'
    from public.payment_attempts where provider_payment_id = '9100001'), 'Pix pendente deveria guardar QR e o prazo do Mercado Pago');
  r := public.begin_payment_attempt(o4, c2, kp2, 'pix');
  perform pg_temp.ok(r ->> 'result' = 'reuse_pix' and r -> 'attempt' -> 'pix' ->> 'qr_code' = '00020126FIXTURESINTETICO'
    and r -> 'attempt' ->> 'provider_payment_id' = '9100001', 'Pix no mesmo pedido deveria reaproveitar o QR');
  r := public.begin_payment_attempt(o4, c2, kc1, 'card');
  perform pg_temp.ok(r ->> 'result' = 'pix_pending' and r -> 'provider_payment_ids' = '["9100001"]'::jsonb
    and (r -> 'attempts' -> 0 ->> 'order_id')::uuid = o4, 'cartão com Pix aberto deveria pedir o cancelamento do Pix');
  r := public.begin_payment_attempt(o5, c2, kp3, 'pix');
  perform pg_temp.ok(r ->> 'result' = 'pix_pending' and r -> 'provider_payment_ids' = '["9100001"]'::jsonb,
    'Pix em outro pedido do mesmo cliente deveria ser cancelado antes');
  r := public.begin_payment_attempt(o5, c2, kc2, 'card');
  perform pg_temp.ok(r ->> 'result' = 'pix_pending' and (r -> 'attempts' -> 0 ->> 'order_id')::uuid = o4,
    'cartão em outro pedido também deveria pedir o cancelamento do Pix aberto');
  r := public.order_payment_state(o4, c2);
  perform pg_temp.ok((r ->> 'payable')::boolean and r -> 'attempt' -> 'pix' is not null and r -> 'attempt' -> 'pix' <> 'null'::jsonb,
    'estado deveria devolver o Pix aberto para retomar');
  -- O Pix cancelado (sem outra tentativa ativa): failed, pedido continua aguardando, QR apagado.
  r := pg_temp.mp(o4, '9100001', 'cancelled', 60, 'process-payment', '{"method_type":"bank_transfer","method_id":"pix","status_detail":"by_collector"}');
  perform pg_temp.ok(r ->> 'decision' = 'failed' and r ->> 'status' = 'awaiting_payment', 'Pix cancelado deveria deixar o pedido failed/awaiting_payment');
  perform pg_temp.ok((select pix_qr_code is null and pix_qr_code_base64 is null and status = 'cancelled' from public.payment_attempts where provider_payment_id = '9100001'),
    'o QR deveria ser apagado quando o Pix sai de pending');
  r := public.begin_payment_attempt(o5, c2, kc2, 'card');
  perform pg_temp.ok(r ->> 'result' = 'created', 'sem Pix aberto o cartão deveria ser criado');
  r := pg_temp.mp(o5, '9100002', 'approved', 60, 'process-payment', jsonb_build_object('attempt_key', kc2));
  perform pg_temp.ok(r ->> 'decision' = 'paid', 'cartão deveria pagar o outro pedido');

  -- Pix vencido depois do cartão pago: pedido intacto.
  o6 := pg_temp.new_order(c2, 70, v_product);
  r := public.begin_payment_attempt(o6, c2, kp4, 'pix');
  r := pg_temp.mp(o6, '9100003', 'pending', 70, 'process-payment', pg_temp.pix(kp4, now() + interval '35 minutes'));
  r := pg_temp.mp(o6, '9100004', 'approved', 70);
  perform pg_temp.ok(r ->> 'decision' = 'paid' and r ->> 'paid_payment_id' = '9100004', 'pagamento só pelo aviso deveria pagar o pedido');
  r := pg_temp.mp(o6, '9100003', 'cancelled', 70, 'webhook', '{"method_type":"bank_transfer","method_id":"pix","status_detail":"expired"}');
  perform pg_temp.ok(r ->> 'decision' = 'ignored_settled' and r ->> 'payment_status' = 'paid' and r ->> 'status' = 'paid',
    'Pix vencido depois do cartão pago não pode mudar o pedido');

  -- Recusa com outra tentativa ativa: failed_other_active.
  o7 := pg_temp.new_order(c1, 40, v_product);
  r := public.begin_payment_attempt(o7, c1, kp5, 'pix');
  r := pg_temp.mp(o7, '9200001', 'pending', 40, 'process-payment', pg_temp.pix(kp5, now() + interval '35 minutes'));
  r := pg_temp.mp(o7, '9200002', 'rejected', 40);
  perform pg_temp.ok(r ->> 'decision' = 'failed_other_active' and r ->> 'payment_status' = 'pending', 'recusa com Pix ativo não pode marcar failed');
  -- Libera o cliente 1 para os testes seguintes.
  r := pg_temp.mp(o7, '9200001', 'cancelled', 40, 'webhook', '{"method_type":"bank_transfer","method_id":"pix"}');
  perform pg_temp.ok(r ->> 'decision' = 'failed', 'Pix cancelado sem outra tentativa deveria marcar failed');

  -- Andamento preservado: repetido e estorno em pedido em preparo ou enviado.
  o8 := pg_temp.new_order(c1, 30, v_product);
  r := public.begin_payment_attempt(o8, c1, kc5, 'card');
  r := pg_temp.mp(o8, '9300001', 'approved', 30, 'process-payment', jsonb_build_object('attempt_key', kc5));
  perform pg_temp.ok(r ->> 'decision' = 'paid', 'pedido 8 deveria ser pago');
  select paid_at into v_paid_at from public.orders where id = o8;
  update public.orders set status = 'processing' where id = o8;
  r := pg_temp.mp(o8, '9300001', 'approved', 30);
  perform pg_temp.ok(r ->> 'decision' = 'repeat' and r ->> 'status' = 'processing', 'repeat não pode mudar o andamento');
  r := pg_temp.mp(o8, '9300001', 'refunded', 30, 'refund');
  perform pg_temp.ok(r ->> 'decision' = 'refunded_after_fulfillment' and r ->> 'payment_status' = 'refunded' and r ->> 'status' = 'processing',
    'estorno de pedido em preparo deveria manter o andamento');
  perform pg_temp.ok((select paid_at = v_paid_at and payment_details ->> 'reversal' = 'refunded' from public.orders where id = o8), 'estorno mantém paid_at');
  select count(*) into v_count from public.commissions where order_id = o8 and recipient_id = v_recipient and status <> 'cancelled';
  perform pg_temp.ok(v_count = 0, 'estorno deveria cancelar a comissão');
  perform pg_temp.ok(exists (select 1 from public.payment_events where order_id = o8 and source = 'refund' and decision = 'refunded_after_fulfillment'),
    'estorno pelo admin deveria gravar evento com source refund');
  r := pg_temp.mp(o8, '9300001', 'refunded', 30);
  perform pg_temp.ok(r ->> 'decision' = 'repeat', 'aviso do estorno depois do admin deveria ser repeat');
  r := pg_temp.mp(o8, '9300001', 'approved', 30);
  perform pg_temp.ok(r ->> 'decision' = 'stale' and r ->> 'payment_status' = 'refunded', 'approved depois de refunded deveria ser stale');

  o9 := pg_temp.new_order(c1, 31, v_product);
  r := pg_temp.mp(o9, '9300002', 'approved', 31);
  update public.orders set status = 'shipped', shipped_at = now() where id = o9;
  r := pg_temp.mp(o9, '9300002', 'charged_back', 31);
  perform pg_temp.ok(r ->> 'decision' = 'refunded_after_fulfillment' and r ->> 'status' = 'shipped' and r ->> 'payment_status' = 'refunded',
    'contestação de pedido enviado deveria manter o andamento');

  -- Estorno pelo admin passa pela RPC: pedido pago vira refunded/cancelled.
  o10 := pg_temp.new_order(c1, 32, v_product);
  r := pg_temp.mp(o10, '9300003', 'approved', 32);
  r := pg_temp.mp(o10, '9300003', 'refunded', 32, 'refund');
  perform pg_temp.ok(r ->> 'decision' = 'refunded' and r ->> 'status' = 'cancelled' and r ->> 'payment_status' = 'refunded', 'estorno pelo admin');
  select count(*) into v_count from public.commissions where order_id = o10 and recipient_id = v_recipient and status = 'cancelled';
  perform pg_temp.ok(v_count = 1, 'estorno pelo admin deveria cancelar a comissão');
  r := pg_temp.mp(o10, '9300004', 'approved', 32);
  perform pg_temp.ok(r ->> 'decision' = 'duplicate_approved' and r ->> 'payment_status' = 'refunded', 'aprovado em pedido estornado deveria ser alerta');

  -- Pedido que não pode ser pago.
  o11 := pg_temp.new_order(c1, 50, v_product, 'cancelled', 'failed');
  perform pg_temp.begin_expect(o11, c1, gen_random_uuid(), 'card', 'order_not_payable');
  perform pg_temp.begin_expect(o10, c1, gen_random_uuid(), 'pix', 'order_not_payable');
  r := public.order_payment_state(o11, c1);
  perform pg_temp.ok(r ->> 'reason' = 'order_not_payable' and not (r ->> 'payable')::boolean, 'estado de pedido cancelado');
  o13 := pg_temp.new_order(c1, 50, v_off);
  perform pg_temp.begin_expect(o13, c1, gen_random_uuid(), 'card', 'order_expired');
  perform pg_temp.ok(public.order_payment_state(o13, c1) ->> 'reason' = 'order_expired', 'estado de pedido com produto fora do site');
  o14 := pg_temp.new_order(c1, 50, v_product, p_created => now() - interval '8 days');
  perform pg_temp.begin_expect(o14, c1, gen_random_uuid(), 'pix', 'order_expired');
  o15 := pg_temp.new_order(c1, 50, v_product, p_document => null);
  perform pg_temp.begin_expect(o15, c1, gen_random_uuid(), 'pix', 'invalid_document');
  -- Pagamento que chega depois de o admin cancelar um pedido não pago: fica pago e volta para 'paid'.
  o20 := pg_temp.new_order(c1, 33, v_product, 'cancelled', 'pending');
  r := pg_temp.mp(o20, '9300005', 'approved', 33);
  perform pg_temp.ok(r ->> 'decision' = 'paid' and r ->> 'status' = 'paid', 'pagamento em pedido cancelado deveria aparecer como pago');

  -- Tentativa presa em criação: needs_reconcile; depois de marcar error, cria outra.
  o16 := pg_temp.new_order(c2, 20, v_product);
  insert into public.payment_attempts (attempt_key, order_id, customer_id, method, status, amount, created_at)
    values (gen_random_uuid(), o16, c2, 'card', 'creating', 20, now() - interval '5 minutes') returning id into v_attempt;
  r := public.begin_payment_attempt(o16, c2, gen_random_uuid(), 'card');
  perform pg_temp.ok(r ->> 'result' = 'needs_reconcile' and r -> 'attempt_ids' = jsonb_build_array(v_attempt)
    and r -> 'orders' = jsonb_build_array(jsonb_build_object('order_id', o16, 'attempt_ids', jsonb_build_array(v_attempt))),
    'tentativa antiga em criação pede conferência');
  r := public.fail_payment_attempt(v_attempt, 'reconcile_not_found');
  perform pg_temp.ok((r ->> 'ok')::boolean and r -> 'attempt' ->> 'status' = 'error' and r -> 'attempt' ->> 'status_detail' = 'reconcile_not_found',
    'fail_payment_attempt deveria marcar error');
  r := public.begin_payment_attempt(o16, c2, gen_random_uuid(), 'card');
  perform pg_temp.ok(r ->> 'result' = 'created', 'depois da conferência deveria criar a tentativa');
  perform pg_temp.expect_code(format('select public.fail_payment_attempt(%L::uuid, null)', gen_random_uuid()), 'attempt_not_found');

  -- Mesmo cliente, dois pedidos pagos com o mesmo valor em 60 minutos: alerta.
  o17 := pg_temp.new_order(c3, 45, v_product);
  o18 := pg_temp.new_order(c3, 45, v_product);
  r := pg_temp.mp(o17, '9400001', 'approved', 45);
  perform pg_temp.ok(r ->> 'decision' = 'paid' and r -> 'alerts' = '[]'::jsonb, 'primeiro pedido sem alerta');
  r := pg_temp.mp(o18, '9400002', 'approved', 45);
  perform pg_temp.ok(r ->> 'decision' = 'paid' and r -> 'alerts' = '["duplicate_order"]'::jsonb and (r ->> 'related_order_id')::uuid = o17,
    'segundo pedido igual em 60 minutos deveria gerar alerta');
  perform pg_temp.ok(exists (select 1 from public.payment_events where order_id = o18 and decision = 'duplicate_order' and provider_payment_id = '9400002'
      and status = 'alert' and related_order_id = o17 and provider_fee = 0 and net_amount is null),
    'alerta duplicate_order deveria ficar em payment_events com status alert e o outro pedido');
  perform pg_temp.ok((select count(*) = 1 from public.payment_events where order_id = o18 and status = 'approved'),
    'o alerta não pode aparecer como um segundo approved');
  -- Estorno parcial e disputa mantêm o pedido pago, com alerta.
  r := pg_temp.mp(o17, '9400001', 'approved', 45, 'webhook', '{"refunded_amount": 10}');
  perform pg_temp.ok(r ->> 'decision' = 'repeat' and r -> 'alerts' = '["partial_refund"]'::jsonb and r ->> 'payment_status' = 'paid',
    'estorno parcial deveria manter pago com alerta');
  perform pg_temp.ok(exists (select 1 from public.payment_events where order_id = o17 and decision = 'partial_refund' and status = 'alert' and related_order_id is null),
    'alerta partial_refund deveria ficar com status alert');
  r := pg_temp.mp(o17, '9400001', 'in_mediation', 45);
  perform pg_temp.ok(r ->> 'decision' = 'mediation' and r ->> 'payment_status' = 'paid', 'disputa deveria manter pago');

  -- Pedido antigo pago só com payment_details: o aviso repetido preenche paid_payment_id.
  o19 := pg_temp.new_order(c3, 46, v_product, 'paid', 'paid');
  update public.orders set paid_at = now() - interval '1 day', payment_details = '{"provider":"mercado_pago","payment_id":"9500001"}' where id = o19;
  r := pg_temp.mp(o19, '9500001', 'approved', 46);
  perform pg_temp.ok(r ->> 'decision' = 'repeat' and r ->> 'paid_payment_id' = '9500001', 'pedido antigo deveria ganhar paid_payment_id');
  perform pg_temp.ok((select paid_at = now() - interval '1 day' from public.orders where id = o19), 'pedido antigo mantém paid_at');

  -- Pix quase vencido no mesmo pedido não é reaproveitado; Pix vencido não bloqueia o cartão.
  o22 := pg_temp.new_order(c3, 47, v_product);
  insert into public.payment_attempts (attempt_key, order_id, customer_id, method, provider_payment_id, status, amount, pix_qr_code, pix_qr_code_base64, expires_at)
    values (gen_random_uuid(), o22, c3, 'pix', '9600001', 'pending', 47, '00020126FIXTURESINTETICO', 'iVBORw0KGgoFIXTURE', now() + interval '30 seconds')
    returning id into v_attempt;
  r := public.begin_payment_attempt(o22, c3, gen_random_uuid(), 'pix');
  perform pg_temp.ok(r ->> 'result' = 'pix_pending' and r -> 'provider_payment_ids' = '["9600001"]'::jsonb, 'Pix quase vencido deveria ser cancelado antes do novo');
  update public.payment_attempts set expires_at = now() - interval '1 minute' where id = v_attempt;
  r := public.begin_payment_attempt(o22, c3, gen_random_uuid(), 'card');
  perform pg_temp.ok(r ->> 'result' = 'created', 'Pix vencido não deveria bloquear o cartão');
  perform pg_temp.ok(public.order_payment_state(o22, c3) -> 'attempt' ->> 'status' = 'creating', 'estado mostra a tentativa em criação');

  -- Valores diferentes também: dois pedidos do mesmo cliente pagos em 60 minutos geram alerta; com mais de 60, não.
  o23 := pg_temp.new_order(c4, 60, v_product);
  o24 := pg_temp.new_order(c4, 75, v_product);
  o25 := pg_temp.new_order(c4, 80, v_product);
  r := pg_temp.mp(o25, '9410003', 'approved', 80, 'webhook', jsonb_build_object('date_approved', (now() - interval '3 hours')::text));
  perform pg_temp.ok(r ->> 'decision' = 'paid' and r -> 'alerts' = '[]'::jsonb, 'primeiro pedido do cliente 4 sem alerta');
  r := pg_temp.mp(o23, '9410001', 'approved', 60);
  perform pg_temp.ok(r ->> 'decision' = 'paid' and r -> 'alerts' = '[]'::jsonb, 'outro pedido pago há 3 horas não gera alerta');
  r := pg_temp.mp(o24, '9410002', 'approved', 75);
  perform pg_temp.ok(r ->> 'decision' = 'paid' and r -> 'alerts' = '["duplicate_order"]'::jsonb and (r ->> 'related_order_id')::uuid = o23,
    'valores diferentes em 60 minutos também deveriam gerar alerta');
  perform pg_temp.ok(exists (select 1 from public.payment_events where order_id = o24 and decision = 'duplicate_order' and related_order_id = o23),
    'o alerta deveria guardar o outro pedido');

  -- Pix de outro pedido achado pago no cancelamento, e o cliente paga o pedido novo no cartão.
  o26 := pg_temp.new_order(c5, 60, v_product);
  o27 := pg_temp.new_order(c5, 75, v_product);
  r := public.begin_payment_attempt(o26, c5, kp6, 'pix');
  r := pg_temp.mp(o26, '9420001', 'pending', 60, 'process-payment', pg_temp.pix(kp6, now() + interval '35 minutes'));
  r := public.begin_payment_attempt(o27, c5, kc6, 'card');
  perform pg_temp.ok(r ->> 'result' = 'pix_pending' and (r -> 'attempts' -> 0 ->> 'order_id')::uuid = o26,
    'cartão no pedido novo deveria pedir o cancelamento do Pix do outro pedido');
  r := pg_temp.mp(o26, '9420001', 'approved', 60, 'process-payment', '{"method_type":"bank_transfer","method_id":"pix","status_detail":"accredited"}');
  perform pg_temp.ok(r ->> 'decision' = 'paid' and r ->> 'attempt_status' = 'approved' and r -> 'alerts' = '[]'::jsonb,
    'o Pix achado pago no cancelamento paga o outro pedido');
  perform pg_temp.ok((select pix_qr_code is null and pix_qr_code_base64 is null from public.payment_attempts where provider_payment_id = '9420001'),
    'o QR deveria ser apagado quando o Pix é pago');
  -- O banco não bloqueia o pedido novo (parar é decisão da process-payment); se ele for pago, o Financeiro recebe o alerta.
  r := public.begin_payment_attempt(o27, c5, kc6, 'card');
  perform pg_temp.ok(r ->> 'result' = 'created', 'sem Pix aberto o cartão do pedido novo pode ser criado');
  r := pg_temp.mp(o27, '9420002', 'approved', 75, 'process-payment', jsonb_build_object('attempt_key', kc6));
  perform pg_temp.ok(r ->> 'decision' = 'paid' and r -> 'alerts' = '["duplicate_order"]'::jsonb and (r ->> 'related_order_id')::uuid = o26,
    'pedido novo pago depois do Pix do outro pedido deveria gerar alerta com o pedido do Pix');

  -- Tentativa 'creating' antiga em outro pedido (o POST pode ter criado um Pix sem o banco saber): conferir antes de cobrar.
  o28 := pg_temp.new_order(c6, 50, v_product);
  o29 := pg_temp.new_order(c6, 55, v_product);
  o30 := pg_temp.new_order(c6, 56, v_product);
  insert into public.payment_attempts (attempt_key, order_id, customer_id, method, status, amount, created_at)
    values (gen_random_uuid(), o30, c6, 'pix', 'creating', 56, now() - interval '2 hours');
  insert into public.payment_attempts (attempt_key, order_id, customer_id, method, status, amount, created_at)
    values (gen_random_uuid(), o28, c6, 'pix', 'creating', 50, now() - interval '3 minutes') returning id into v_attempt;
  r := public.begin_payment_attempt(o29, c6, gen_random_uuid(), 'card');
  perform pg_temp.ok(r ->> 'result' = 'needs_reconcile' and (r ->> 'order_id')::uuid = o29 and r -> 'attempt_ids' = '[]'::jsonb
    and r -> 'orders' = jsonb_build_array(jsonb_build_object('order_id', o28, 'attempt_ids', jsonb_build_array(v_attempt))),
    'tentativa antiga em outro pedido deveria pedir a conferência daquele pedido (a de 2 horas fica fora)');
  insert into public.payment_attempts (attempt_key, order_id, customer_id, method, status, amount, created_at)
    values (gen_random_uuid(), o29, c6, 'card', 'creating', 55, now() - interval '5 minutes') returning id into v_attempt2;
  r := public.begin_payment_attempt(o29, c6, gen_random_uuid(), 'pix');
  perform pg_temp.ok(r ->> 'result' = 'needs_reconcile' and r -> 'attempt_ids' = jsonb_build_array(v_attempt2)
    and jsonb_array_length(r -> 'orders') = 2 and (r -> 'orders' -> 0 ->> 'order_id')::uuid = o29
    and (r -> 'orders' -> 1 ->> 'order_id')::uuid = o28, 'attempt_ids só com as deste pedido; orders com este pedido primeiro');
  r := public.fail_payment_attempt(v_attempt, 'reconcile_not_found');
  r := public.fail_payment_attempt(v_attempt2, 'reconcile_not_found');
  r := public.begin_payment_attempt(o29, c6, gen_random_uuid(), 'card');
  perform pg_temp.ok(r ->> 'result' = 'created', 'depois de conferir os dois pedidos deveria cobrar');

  -- Boleto do Checkout Pro pendente (method 'other'): em análise, sem cartão nem Pix no mesmo pedido.
  o31 := pg_temp.new_order(c7, 40, v_product);
  r := pg_temp.mp(o31, '9700001', 'pending', 40, 'webhook', '{"method_type":"ticket","method_id":"bolbradesco","status_detail":"pending_waiting_payment"}');
  perform pg_temp.ok(r ->> 'decision' = 'pending' and r ->> 'attempt_status' = 'pending', 'boleto gerado deveria ficar pending');
  perform pg_temp.ok((select method = 'other' from public.payment_attempts where provider_payment_id = '9700001'), 'boleto deveria ser method other');
  perform pg_temp.begin_expect(o31, c7, gen_random_uuid(), 'card', 'payment_in_review');
  perform pg_temp.begin_expect(o31, c7, gen_random_uuid(), 'pix', 'payment_in_review');
  r := public.order_payment_state(o31, c7);
  perform pg_temp.ok(not (r ->> 'payable')::boolean and r ->> 'reason' = 'payment_in_review' and r -> 'attempt' ->> 'method' = 'other'
    and (r ->> 'refresh_due')::boolean = false, 'boleto pendente deixa o pedido em análise, já consultado agora');
  update public.payment_attempts set last_checked_at = now() - interval '1 minute' where provider_payment_id = '9700001';
  perform pg_temp.ok((public.order_payment_state(o31, c7) ->> 'refresh_due')::boolean, 'consulta com mais de 25 segundos deveria pedir refresh');
  update public.payment_attempts set last_checked_at = null where provider_payment_id = '9700001';
  perform pg_temp.ok((public.order_payment_state(o31, c7) ->> 'refresh_due')::boolean, 'tentativa nunca consultada deveria pedir refresh');
  r := pg_temp.mp(o31, '9700001', 'cancelled', 40, 'webhook', '{"method_type":"ticket","method_id":"bolbradesco","status_detail":"expired"}');
  perform pg_temp.ok(r ->> 'decision' = 'failed' and r ->> 'status' = 'awaiting_payment', 'boleto vencido deveria marcar failed');
  r := public.order_payment_state(o31, c7);
  perform pg_temp.ok((r ->> 'payable')::boolean and r ->> 'reason' is null, 'depois do boleto vencido o pedido pode ser pago de novo');

  -- Cartão 'authorized' e cartão 'pending': em análise.
  o32 := pg_temp.new_order(c7, 41, v_product);
  r := public.begin_payment_attempt(o32, c7, kc7, 'card');
  perform pg_temp.ok(r ->> 'result' = 'created', 'cartão do pedido 32 deveria ser criado');
  r := pg_temp.mp(o32, '9700002', 'authorized', 41, 'process-payment', jsonb_build_object('attempt_key', kc7));
  perform pg_temp.ok(r ->> 'decision' = 'pending' and r ->> 'attempt_status' = 'authorized' and r ->> 'payment_status' = 'pending',
    'authorized deveria deixar o pedido pendente');
  perform pg_temp.begin_expect(o32, c7, gen_random_uuid(), 'card', 'payment_in_review');
  perform pg_temp.ok(public.order_payment_state(o32, c7) ->> 'reason' = 'payment_in_review', 'estado com cartão authorized');
  r := pg_temp.mp(o32, '9700002', 'approved', 41);
  perform pg_temp.ok(r ->> 'decision' = 'paid' and r ->> 'attempt_status' = 'approved', 'authorized depois aprovado deveria pagar');
  o33 := pg_temp.new_order(c7, 42, v_product);
  r := pg_temp.mp(o33, '9700003', 'pending', 42);
  perform pg_temp.ok(r ->> 'decision' = 'pending' and (select method = 'card' from public.payment_attempts where provider_payment_id = '9700003'),
    'cartão pending deveria deixar o pedido pendente');
  perform pg_temp.begin_expect(o33, c7, gen_random_uuid(), 'pix', 'payment_in_review');
  perform pg_temp.ok(public.order_payment_state(o33, c7) ->> 'reason' = 'payment_in_review', 'estado com cartão pending');

  -- Recusado e depois aprovado por outro pagamento: failed direto para paid.
  o34 := pg_temp.new_order(c7, 43, v_product);
  r := pg_temp.mp(o34, '9700004', 'rejected', 43, 'webhook', '{"status_detail":"cc_rejected_insufficient_amount"}');
  perform pg_temp.ok(r ->> 'decision' = 'failed' and r ->> 'payment_status' = 'failed', 'recusa deveria marcar failed');
  perform pg_temp.ok((public.order_payment_state(o34, c7) ->> 'payable')::boolean, 'pedido failed pode ser pago de novo');
  r := pg_temp.mp(o34, '9700005', 'approved', 43);
  perform pg_temp.ok(r ->> 'decision' = 'paid' and r ->> 'payment_status' = 'paid' and r ->> 'status' = 'paid' and r ->> 'paid_payment_id' = '9700005',
    'failed deveria passar direto para paid');

  -- Um pagamento paga um único pedido: paid_payment_id é único.
  perform pg_temp.expect_code(format('update public.orders set paid_payment_id = %L where id = %L::uuid', '9400001', o19),
    'duplicate key value violates unique constraint "orders_paid_payment_id_key"');
end $$;
rollback;
