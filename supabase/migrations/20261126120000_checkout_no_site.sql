-- Checkout no próprio site: Pix próprio e cartão pelo Payment Brick, com uma única regra de pagamento.
--
-- 1) orders.paid_payment_id: o pagamento do Mercado Pago que pagou o pedido (o estorno usa este).
-- 2) payment_attempts: cada tentativa de pagamento (cartão, Pix ou aviso do Checkout Pro), sem acesso pelo navegador.
-- 3) payment_events ganha source, decision, attempt_id e related_order_id (alertas ficam com status 'alert').
-- 4) RPCs só para service_role:
--    begin_payment_attempt  trava o pedido e decide se pode cobrar;
--    apply_mp_payment       aplica um pagamento já normalizado (webhook, process-payment, reconcile, refund);
--    fail_payment_attempt   marca como 'error' uma tentativa que não chegou ao Mercado Pago;
--    order_payment_state    leitura do pedido e da tentativa que importa (ação status).
-- Os códigos de erro saem como a própria mensagem da exceção (raise exception 'codigo'), para a Edge Function mapear.
--
-- Pedidos herdados do aviso antigo com status 'cancelled' e pagamento 'failed' ficam como estão, de propósito:
-- não dá para separar o cancelamento feito pelo aviso antigo do feito pelo admin. Esses pedidos recebem
-- order_not_payable e a create-checkout pede um pedido novo ao navegador.

-- 1) Pagamento que pagou o pedido.
alter table public.orders add column if not exists paid_payment_id text
  constraint orders_paid_payment_id_key unique
  constraint orders_paid_payment_id_check check (paid_payment_id ~ '^\d{1,20}$');

-- Pedidos pagos pelo aviso antigo guardavam o id só em payment_details (em 26/11/2026 nenhum pedido pago).
update public.orders o set paid_payment_id = o.payment_details ->> 'payment_id'
where o.paid_payment_id is null
  and o.payment_status in ('paid', 'refunded')
  and o.payment_provider = 'mercado_pago'
  and o.payment_details ->> 'payment_id' ~ '^\d{1,20}$'
  and not exists (select 1 from public.orders x where x.paid_payment_id = o.payment_details ->> 'payment_id');

-- 2) Tentativas de pagamento.
create table if not exists public.payment_attempts (
  id uuid primary key default gen_random_uuid(),
  -- X-Idempotency-Key do POST /v1/payments; vazio quando o pagamento chegou só pelo aviso (Checkout Pro).
  attempt_key uuid unique,
  order_id uuid not null references public.orders(id) on delete cascade,
  customer_id uuid not null references auth.users(id) on delete restrict,
  method text not null check (method in ('card', 'pix', 'other')),
  provider_payment_id text unique check (provider_payment_id ~ '^\d{1,20}$'),
  status text not null default 'creating' check (status in (
    'creating', 'pending', 'in_process', 'authorized', 'approved', 'rejected', 'cancelled',
    'in_mediation', 'refunded', 'charged_back', 'error')),
  status_detail text check (status_detail is null or status_detail ~ '^[a-z0-9_]{1,60}$'),
  amount numeric(12,2) not null check (amount > 0),
  installments integer check (installments is null or installments between 1 and 36),
  -- Dados do Pix só enquanto o pagamento estiver pendente; apagados quando sai de 'pending'.
  pix_qr_code text,
  pix_qr_code_base64 text,
  expires_at timestamptz,
  last_checked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint payment_attempts_pix_only_pending check (
    (pix_qr_code is null and pix_qr_code_base64 is null) or (method = 'pix' and status = 'pending'))
);
create index if not exists payment_attempts_order_idx on public.payment_attempts(order_id, created_at desc);
create index if not exists payment_attempts_customer_idx on public.payment_attempts(customer_id, created_at desc);
create index if not exists payment_attempts_open_idx on public.payment_attempts(customer_id)
  where status in ('creating', 'pending', 'in_process', 'authorized');
alter table public.payment_attempts enable row level security;
revoke all on public.payment_attempts from public, anon, authenticated;
grant select, insert, update, delete on public.payment_attempts to service_role;

-- 3) Eventos com origem, decisão e tentativa.
alter table public.payment_events add column if not exists source text;
alter table public.payment_events add column if not exists decision text;
alter table public.payment_events add column if not exists attempt_id uuid references public.payment_attempts(id) on delete set null;
-- Alerta duplicate_order: o outro pedido do mesmo cliente.
alter table public.payment_events add column if not exists related_order_id uuid references public.orders(id) on delete set null;
alter table public.payment_events drop constraint if exists payment_events_source_check;
alter table public.payment_events add constraint payment_events_source_check
  check (source is null or source in ('webhook', 'process-payment', 'reconcile', 'refund'));
create index if not exists payment_events_payment_idx on public.payment_events(provider_payment_id);
create index if not exists payment_events_decision_idx on public.payment_events(decision, created_at desc) where decision is not null;

-- 4) Funções internas (sem execução pelo navegador).

-- Precedência dos status: um aviso de nível menor que o atual é 'stale' e não muda nada.
create or replace function public.payment_status_level(p_status text)
returns integer language sql immutable set search_path = public as $$
  select case
    when p_status in ('creating', 'error') then 0
    when p_status in ('pending', 'in_process', 'authorized') then 1
    when p_status in ('approved', 'rejected', 'cancelled', 'in_mediation') then 2
    when p_status in ('refunded', 'charged_back') then 3
    else null end;
$$;

-- Tentativa em JSON. O Pix só sai enquanto estiver pendente e dentro do prazo.
create or replace function public.payment_attempt_json(a public.payment_attempts)
returns jsonb language sql stable set search_path = public as $$
  select case when a.id is null then null else jsonb_build_object(
    'attempt_id', a.id,
    'attempt_key', a.attempt_key,
    'order_id', a.order_id,
    'method', a.method,
    'provider_payment_id', a.provider_payment_id,
    'status', a.status,
    'status_detail', a.status_detail,
    'amount', a.amount,
    'installments', a.installments,
    'expires_at', a.expires_at,
    'last_checked_at', a.last_checked_at,
    'created_at', a.created_at,
    'pix', case
      when a.method = 'pix' and a.status = 'pending' and a.pix_qr_code is not null and a.pix_qr_code_base64 is not null
        and coalesce(a.expires_at, a.created_at + interval '24 hours') > now()
      then jsonb_build_object('qr_code', a.pix_qr_code, 'qr_code_base64', a.pix_qr_code_base64, 'expires_at', a.expires_at)
      else null end
  ) end;
$$;

-- Por que o pedido não pode receber pagamento novo (null = pode).
create or replace function public.payment_order_block_reason(p_order public.orders)
returns text language sql stable set search_path = public as $$
  select case
    when p_order.payment_status = 'paid' then 'already_paid'
    when p_order.payment_status = 'refunded' or p_order.status <> 'awaiting_payment' then 'order_not_payable'
    when p_order.created_at < now() - interval '7 days' then 'order_expired'
    when not exists (select 1 from public.order_items i where i.order_id = p_order.id) then 'order_expired'
    when exists (
      select 1 from public.order_items i
      left join public.produtos p on p.id = i.product_id
      where i.order_id = p_order.id and (p.id is null or not p.is_active)
    ) then 'order_expired'
    else null end;
$$;

-- Dados do pedido que a process-payment usa para montar o POST /v1/payments (sempre do banco).
create or replace function public.payment_order_payload(p_order public.orders)
returns jsonb language sql stable set search_path = public as $$
  select jsonb_build_object(
    'order_id', p_order.id,
    'amount', p_order.total,
    'subtotal', p_order.subtotal,
    'discount_amount', p_order.discount_amount,
    'shipping_amount', p_order.shipping_amount,
    'customer_email', p_order.customer_email,
    'customer_document', p_order.customer_document,
    'shipping_address', p_order.shipping_address,
    'items', coalesce((
      select jsonb_agg(jsonb_build_object(
        'product_id', i.product_id, 'product_name', i.product_name, 'unit_price', i.unit_price,
        'quantity', i.quantity, 'variant', i.variant) order by i.id)
      from public.order_items i where i.order_id = p_order.id), '[]'::jsonb)
  );
$$;

-- 5) begin_payment_attempt: trava o pedido, aplica as regras e cria a tentativa 'creating'.
create or replace function public.begin_payment_attempt(p_order_id uuid, p_customer_id uuid, p_attempt_key uuid, p_method text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  o public.orders%rowtype;
  v_replay public.payment_attempts%rowtype;
  v_reuse public.payment_attempts%rowtype;
  v_new public.payment_attempts%rowtype;
  v_reason text;
  v_stale jsonb;
  v_pending jsonb;
begin
  if p_order_id is null or p_customer_id is null or p_attempt_key is null
    or p_method is null or p_method not in ('card', 'pix') then
    raise exception 'invalid_payment_request';
  end if;

  -- Uma decisão por vez para cada cliente (duas abas, dois pedidos), e depois a trava do pedido.
  perform pg_advisory_xact_lock(hashtextextended('payment_customer:' || p_customer_id::text, 0));
  select * into o from public.orders where id = p_order_id for update;
  if not found or o.customer_id <> p_customer_id then raise exception 'order_not_found'; end if;

  -- Mesma chave: devolve a tentativa gravada. Só reenviar ao Mercado Pago (mesma chave) se ainda estiver 'creating'.
  select * into v_replay from public.payment_attempts where attempt_key = p_attempt_key for update;
  if v_replay.id is not null then
    if v_replay.order_id <> o.id or v_replay.method <> p_method then raise exception 'attempt_conflict'; end if;
    if v_replay.status = 'creating' then
      v_reason := public.payment_order_block_reason(o);
      if v_reason is not null then raise exception '%', v_reason; end if;
    end if;
    return jsonb_build_object('result', 'replay', 'attempt_id', v_replay.id, 'attempt', public.payment_attempt_json(v_replay))
      || public.payment_order_payload(o);
  end if;

  -- Situação do pedido: pago, estornado, cancelado, antigo ou com produto fora do site.
  v_reason := public.payment_order_block_reason(o);
  if v_reason is not null then raise exception '%', v_reason; end if;
  if p_method = 'pix' and coalesce(o.customer_document, '') !~ '^\d{11}$' then raise exception 'invalid_document'; end if;

  -- Tentativas deste pedido.
  if exists (select 1 from public.payment_attempts x
             where x.order_id = o.id and x.status = 'creating' and x.created_at > now() - interval '2 minutes') then
    raise exception 'payment_in_progress';
  end if;
  -- Em análise: cartão em processamento, ou qualquer meio que não seja Pix ainda pendente (cartão, ou boleto do Checkout Pro).
  if exists (select 1 from public.payment_attempts x
             where x.order_id = o.id and (x.status in ('in_process', 'authorized') or (x.method <> 'pix' and x.status = 'pending'))) then
    raise exception 'payment_in_review';
  end if;

  -- Tentativas 'creating' antigas: o Mercado Pago pode ter criado o pagamento sem a resposta chegar ao banco
  -- (um Pix assim pode estar com o QR na tela do cliente). Valem as deste pedido, de qualquer idade, e as de outros
  -- pedidos do cliente criadas há menos de 60 minutos. A process-payment confere no Mercado Pago cada pedido de
  -- 'orders' (busca por external_reference) antes de cobrar; 'attempt_ids' traz só as deste pedido.
  select jsonb_agg(jsonb_build_object('order_id', s.order_id, 'attempt_ids', s.attempt_ids) order by s.is_current desc, s.first_at)
    into v_stale
  from (
    select x.order_id, x.order_id = o.id as is_current, min(x.created_at) as first_at,
      jsonb_agg(x.id order by x.created_at) as attempt_ids
    from public.payment_attempts x
    where x.status = 'creating' and x.created_at <= now() - interval '2 minutes'
      and (x.order_id = o.id or (x.customer_id = p_customer_id and x.created_at > now() - interval '60 minutes'))
    group by x.order_id
  ) s;
  if v_stale is not null then
    return jsonb_build_object('result', 'needs_reconcile', 'order_id', o.id,
      'attempt_ids', coalesce((select e -> 'attempt_ids' from jsonb_array_elements(v_stale) e where e ->> 'order_id' = o.id::text), '[]'::jsonb),
      'orders', v_stale);
  end if;

  -- Duas abas: outro pedido do mesmo cliente com tentativa em criação.
  if exists (select 1 from public.payment_attempts x
             where x.customer_id = p_customer_id and x.order_id <> o.id and x.status = 'creating'
               and x.created_at > now() - interval '2 minutes') then
    raise exception 'payment_in_progress';
  end if;

  -- Pix em aberto do mesmo cliente, em qualquer pedido. Pix novo no mesmo pedido reaproveita o QR se faltar mais de 1 minuto.
  if p_method = 'pix' then
    select * into v_reuse from public.payment_attempts x
    where x.order_id = o.id and x.method = 'pix' and x.status = 'pending'
      and x.pix_qr_code is not null and x.pix_qr_code_base64 is not null
      and x.expires_at > now() + interval '1 minute'
    order by x.created_at desc limit 1;
  end if;
  select jsonb_agg(jsonb_build_object(
      'attempt_id', x.id, 'order_id', x.order_id, 'provider_payment_id', x.provider_payment_id, 'expires_at', x.expires_at)
      order by x.created_at)
    into v_pending
  from public.payment_attempts x
  where x.customer_id = p_customer_id and x.method = 'pix' and x.status = 'pending'
    and x.provider_payment_id is not null
    and coalesce(x.expires_at, x.created_at + interval '24 hours') > now()
    and (v_reuse.id is null or x.id <> v_reuse.id);
  if v_pending is not null then
    return jsonb_build_object(
      'result', 'pix_pending',
      'provider_payment_ids', (select jsonb_agg(e ->> 'provider_payment_id') from jsonb_array_elements(v_pending) e),
      'attempts', v_pending);
  end if;
  if v_reuse.id is not null then
    return jsonb_build_object('result', 'reuse_pix', 'attempt_id', v_reuse.id, 'attempt', public.payment_attempt_json(v_reuse));
  end if;

  begin
    insert into public.payment_attempts (attempt_key, order_id, customer_id, method, status, amount)
    values (p_attempt_key, o.id, p_customer_id, p_method, 'creating', o.total)
    returning * into v_new;
  exception when unique_violation then
    raise exception 'attempt_conflict';
  end;
  return jsonb_build_object('result', 'created', 'attempt_id', v_new.id, 'attempt', public.payment_attempt_json(v_new))
    || public.payment_order_payload(o);
end;
$$;

-- 6) apply_mp_payment: aplica um pagamento do Mercado Pago já normalizado, com o pedido travado.
create or replace function public.apply_mp_payment(p_payment jsonb, p_source text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  o public.orders%rowtype;
  a public.payment_attempts%rowtype;
  v_uuid constant text := '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$';
  v_id text;
  v_ref text;
  v_status text;
  v_detail text;
  v_method_type text;
  v_method_id text;
  v_method text;
  v_amount numeric(12,2);
  v_refunded numeric(12,2);
  v_fee numeric(12,2);
  v_net numeric(12,2);
  v_installments integer;
  v_approved_at timestamptz;
  v_key uuid;
  v_pix jsonb;
  v_qr text;
  v_qr64 text;
  v_pix_expires timestamptz;
  v_level integer;
  v_decision text;
  v_alerts text[] := '{}';
  v_alert text;
  v_related uuid;
  v_commissions boolean := false;
begin
  if p_source is null or p_source not in ('webhook', 'process-payment', 'reconcile', 'refund') then
    raise exception 'invalid_source';
  end if;
  if p_payment is null or jsonb_typeof(p_payment) <> 'object' then raise exception 'invalid_payment'; end if;
  v_id := p_payment ->> 'id';
  if v_id is null or v_id !~ '^\d{1,20}$' then raise exception 'invalid_payment'; end if;

  v_status := lower(coalesce(p_payment ->> 'status', ''));
  if v_status !~ '^[a-z_]{1,40}$' then v_status := 'unknown'; end if;
  v_detail := p_payment ->> 'status_detail';
  if v_detail is not null and v_detail !~ '^[a-z0-9_]{1,60}$' then v_detail := null; end if;
  v_method_type := p_payment ->> 'method_type';
  if v_method_type is not null and v_method_type !~ '^[a-z_]{1,40}$' then v_method_type := null; end if;
  v_method_id := p_payment ->> 'method_id';
  if v_method_id is not null and v_method_id !~ '^[a-z_]{1,40}$' then v_method_id := null; end if;
  begin
    v_amount := nullif(p_payment ->> 'amount', '')::numeric;
    v_refunded := coalesce(nullif(p_payment ->> 'refunded_amount', '')::numeric, 0);
    v_fee := nullif(p_payment ->> 'fee', '')::numeric;
    v_net := nullif(p_payment ->> 'net', '')::numeric;
    v_installments := nullif(p_payment ->> 'installments', '')::integer;
  exception when others then
    raise exception 'invalid_payment';
  end;
  if v_fee < 0 then v_fee := 0; end if;
  if v_installments not between 1 and 36 then v_installments := null; end if;
  begin
    v_approved_at := nullif(p_payment ->> 'date_approved', '')::timestamptz;
  exception when others then
    v_approved_at := null;
  end;
  if (p_payment ->> 'attempt_key') ~ v_uuid then v_key := (p_payment ->> 'attempt_key')::uuid; end if;
  v_method := case
    when v_method_id = 'pix' then 'pix'
    when v_method_type in ('credit_card', 'debit_card', 'prepaid_card') then 'card'
    else 'other' end;
  v_pix := p_payment -> 'pix';
  if jsonb_typeof(v_pix) = 'object' then
    v_qr := v_pix ->> 'qr_code';
    if v_qr is not null and (length(v_qr) > 4096 or v_qr ~ '[[:cntrl:]]') then v_qr := null; end if;
    v_qr64 := v_pix ->> 'qr_code_base64';
    if v_qr64 is not null and (length(v_qr64) > 300000 or v_qr64 !~ '^[A-Za-z0-9+/=]+$') then v_qr64 := null; end if;
    begin
      v_pix_expires := nullif(v_pix ->> 'expires_at', '')::timestamptz;
    exception when others then
      v_pix_expires := null;
    end;
  end if;

  v_ref := p_payment ->> 'external_reference';
  if v_ref is null or v_ref !~ v_uuid then
    return jsonb_build_object('decision', 'unknown_order', 'alerts', '[]'::jsonb, 'order_id', null,
      'payment_status', null, 'status', null, 'paid_payment_id', null, 'attempt_id', null, 'attempt_status', null, 'related_order_id', null);
  end if;
  select * into o from public.orders where id = v_ref::uuid for update;
  if o.id is null then
    return jsonb_build_object('decision', 'unknown_order', 'alerts', '[]'::jsonb, 'order_id', null,
      'payment_status', null, 'status', null, 'paid_payment_id', null, 'attempt_id', null, 'attempt_status', null, 'related_order_id', null);
  end if;

  -- Tentativa: pelo id do pagamento, depois pela chave da tentativa no mesmo pedido, senão uma nova.
  select * into a from public.payment_attempts where provider_payment_id = v_id for update;
  if a.id is not null and a.order_id <> o.id then raise exception 'attempt_conflict'; end if;
  if a.id is null and v_key is not null then
    select * into a from public.payment_attempts
    where attempt_key = v_key and order_id = o.id and provider_payment_id is null for update;
    if a.id is not null then
      update public.payment_attempts set provider_payment_id = v_id, updated_at = now() where id = a.id returning * into a;
    end if;
  end if;

  v_level := public.payment_status_level(v_status);
  if v_level is null or v_level = 0 then
    v_decision := 'ignored_unknown_status';
  else
    if a.id is null then
      insert into public.payment_attempts (order_id, customer_id, method, provider_payment_id, status, amount)
      values (o.id, o.customer_id, v_method, v_id, 'creating', case when v_amount > 0 then v_amount else o.total end)
      returning * into a;
    end if;

    if v_level < public.payment_status_level(a.status) then
      -- Aviso fora de ordem: não volta o estado.
      v_decision := 'stale';
      update public.payment_attempts set last_checked_at = now() where id = a.id returning * into a;
    else
      update public.payment_attempts set
        status = v_status,
        status_detail = v_detail,
        installments = coalesce(v_installments, installments),
        pix_qr_code = case when v_status = 'pending' and method = 'pix' then coalesce(v_qr, pix_qr_code) else null end,
        pix_qr_code_base64 = case when v_status = 'pending' and method = 'pix' then coalesce(v_qr64, pix_qr_code_base64) else null end,
        expires_at = case when method = 'pix' and v_pix_expires is not null then v_pix_expires else expires_at end,
        last_checked_at = now(),
        updated_at = now()
      where id = a.id returning * into a;

      if v_status = 'approved' then
        if v_amount is null or abs(v_amount - o.total) >= 0.01 then
          v_decision := 'amount_mismatch';
        elsif o.paid_payment_id is null and o.payment_status in ('pending', 'failed')
          and not exists (select 1 from public.orders x where x.paid_payment_id = v_id and x.id <> o.id) then
          v_decision := 'paid';
          update public.orders set
            payment_status = 'paid',
            paid_payment_id = v_id,
            paid_at = coalesce(o.paid_at, v_approved_at, now()),
            status = case when o.status in ('awaiting_payment', 'cancelled') then 'paid' else o.status end,
            payment_method = coalesce(v_method_type, v_method_id, o.payment_method),
            payment_provider = 'mercado_pago',
            provider_fee = coalesce(v_fee, 0),
            net_amount = v_net,
            payment_details = jsonb_build_object(
              'provider', 'mercado_pago', 'payment_id', v_id, 'installments', coalesce(v_installments, 1),
              'status_detail', coalesce(v_detail, ''), 'method_id', v_method_id),
            payment_reference = coalesce(o.payment_reference,
              case when not exists (select 1 from public.orders x where x.payment_reference = v_id) then v_id end),
            updated_at = now()
          where id = o.id returning * into o;
          v_commissions := true;
          -- Mesmo cliente, outro pedido pago em até 60 minutos, com qualquer valor: alerta de possível compra em dobro
          -- (por exemplo, o Pix de um pedido pago no app do banco e o cartão de um pedido novo). O de mesmo valor vem primeiro.
          select x.id into v_related from public.orders x
          where x.customer_id = o.customer_id and x.id <> o.id and x.payment_status = 'paid'
            and x.paid_at between o.paid_at - interval '60 minutes' and o.paid_at + interval '60 minutes'
          order by abs(x.total - o.total) < 0.01 desc, abs(extract(epoch from x.paid_at - o.paid_at)), x.id
          limit 1;
          if v_related is not null then v_alerts := v_alerts || 'duplicate_order'::text; end if;
        elsif o.paid_payment_id = v_id then
          v_decision := 'repeat';
          if o.payment_status = 'paid' then
            -- A taxa pode chegar depois; paid_at e status não mudam.
            update public.orders set provider_fee = coalesce(v_fee, provider_fee), net_amount = coalesce(v_net, net_amount), updated_at = now()
            where id = o.id returning * into o;
          end if;
        elsif o.payment_status = 'paid' and o.paid_payment_id is null and o.payment_details ->> 'payment_id' = v_id
          and not exists (select 1 from public.orders x where x.paid_payment_id = v_id and x.id <> o.id) then
          v_decision := 'repeat';
          update public.orders set paid_payment_id = v_id, provider_fee = coalesce(v_fee, provider_fee),
            net_amount = coalesce(v_net, net_amount), updated_at = now()
          where id = o.id returning * into o;
        else
          -- Outro pagamento já pagou o pedido, ou o pedido foi estornado: fica para o Financeiro estornar.
          v_decision := 'duplicate_approved';
        end if;
        if v_refunded > 0 then v_alerts := v_alerts || 'partial_refund'::text; end if;

      elsif v_status in ('refunded', 'charged_back') then
        if o.payment_status = 'paid'
          and (o.paid_payment_id = v_id or (o.paid_payment_id is null and o.payment_details ->> 'payment_id' = v_id)) then
          -- Pedido em preparo, enviado ou entregue mantém o andamento.
          v_decision := case when o.status in ('awaiting_payment', 'paid', 'cancelled') then 'refunded' else 'refunded_after_fulfillment' end;
          update public.orders set
            payment_status = 'refunded',
            paid_payment_id = coalesce(o.paid_payment_id, v_id),
            status = case when o.status in ('awaiting_payment', 'paid') then 'cancelled' else o.status end,
            payment_details = coalesce(o.payment_details, '{}'::jsonb) || jsonb_build_object('reversal', v_status),
            updated_at = now()
          where id = o.id returning * into o;
          v_commissions := true;
        elsif o.paid_payment_id = v_id and o.payment_status = 'refunded' then
          v_decision := 'repeat';
        else
          v_decision := 'reversal_other';
        end if;

      elsif v_status = 'in_mediation' then
        v_decision := 'mediation';

      elsif v_level = 1 then
        if o.payment_status in ('paid', 'refunded') then
          v_decision := 'ignored_settled';
        else
          v_decision := 'pending';
          if o.payment_status <> 'pending' then
            update public.orders set payment_status = 'pending', updated_at = now() where id = o.id returning * into o;
          end if;
        end if;

      elsif v_status in ('rejected', 'cancelled') then
        if o.payment_status in ('paid', 'refunded') then
          v_decision := 'ignored_settled';
        elsif exists (
          select 1 from public.payment_attempts x
          where x.order_id = o.id and x.id <> a.id and (
            (x.status in ('pending', 'in_process', 'authorized')
              and (x.method <> 'pix' or coalesce(x.expires_at, x.created_at + interval '24 hours') > now()))
            or (x.status = 'creating' and x.created_at > now() - interval '2 minutes'))
        ) then
          v_decision := 'failed_other_active';
        else
          -- Tentativa recusada ou Pix vencido nunca cancela o pedido: o status continua o mesmo.
          v_decision := 'failed';
          if o.payment_status <> 'failed' then
            update public.orders set payment_status = 'failed', updated_at = now() where id = o.id returning * into o;
          end if;
        end if;

      else
        v_decision := 'ignored_unknown_status';
      end if;
    end if;
  end if;

  if v_commissions then perform public.create_order_commissions(o.id); end if;

  insert into public.payment_events (order_id, provider, provider_payment_id, status, status_detail, payment_method,
    gross_amount, provider_fee, net_amount, source, decision, attempt_id)
  values (o.id, 'mercado_pago', v_id, v_status, v_detail, coalesce(v_method_type, v_method_id),
    v_amount, coalesce(v_fee, 0), v_net, p_source, v_decision, a.id);
  -- Cada alerta é uma linha própria com status 'alert' (não é um segundo pagamento: sem taxa nem líquido)
  -- e, no duplicate_order, o outro pedido em related_order_id.
  foreach v_alert in array v_alerts loop
    insert into public.payment_events (order_id, provider, provider_payment_id, status, status_detail, payment_method,
      gross_amount, provider_fee, net_amount, source, decision, attempt_id, related_order_id)
    values (o.id, 'mercado_pago', v_id, 'alert', v_detail, coalesce(v_method_type, v_method_id),
      v_amount, 0, null, p_source, v_alert, a.id, case when v_alert = 'duplicate_order' then v_related end);
  end loop;

  return jsonb_build_object(
    'decision', v_decision,
    'alerts', to_jsonb(v_alerts),
    'order_id', o.id,
    'payment_status', o.payment_status,
    'status', o.status,
    'paid_payment_id', o.paid_payment_id,
    'attempt_id', a.id,
    'attempt_status', a.status,
    'related_order_id', v_related);
end;
$$;

-- 7) fail_payment_attempt: tentativa que não chegou ao Mercado Pago (limite, 400, busca sem resultado).
create or replace function public.fail_payment_attempt(p_attempt_id uuid, p_status_detail text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  a public.payment_attempts%rowtype;
  v_order uuid;
  v_detail text := case when p_status_detail ~ '^[a-z0-9_]{1,60}$' then p_status_detail end;
begin
  select order_id into v_order from public.payment_attempts where id = p_attempt_id;
  if v_order is null then raise exception 'attempt_not_found'; end if;
  perform 1 from public.orders where id = v_order for update;
  select * into a from public.payment_attempts where id = p_attempt_id for update;
  if a.status = 'creating' and a.provider_payment_id is null then
    update public.payment_attempts set status = 'error', status_detail = v_detail, last_checked_at = now(), updated_at = now()
    where id = a.id returning * into a;
    return jsonb_build_object('ok', true, 'attempt', public.payment_attempt_json(a));
  end if;
  return jsonb_build_object('ok', false, 'attempt', public.payment_attempt_json(a));
end;
$$;

-- 8) order_payment_state: leitura para a ação status (sem travar e sem gravar).
create or replace function public.order_payment_state(p_order_id uuid, p_customer_id uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  o public.orders%rowtype;
  a public.payment_attempts%rowtype;
  v_reason text;
begin
  select * into o from public.orders where id = p_order_id;
  if o.id is null or o.customer_id <> p_customer_id then raise exception 'order_not_found'; end if;
  v_reason := public.payment_order_block_reason(o);
  if v_reason is null then
    if exists (select 1 from public.payment_attempts x
               where x.order_id = o.id and (x.status in ('in_process', 'authorized') or (x.method <> 'pix' and x.status = 'pending'))) then
      v_reason := 'payment_in_review';
    elsif exists (select 1 from public.payment_attempts x
                  where x.order_id = o.id and x.status = 'creating' and x.created_at > now() - interval '2 minutes') then
      v_reason := 'payment_in_progress';
    end if;
  end if;

  -- A tentativa que importa: a ativa mais recente, senão a que pagou, senão a última.
  select * into a from public.payment_attempts x
  where x.order_id = o.id and (
    x.status in ('in_process', 'authorized')
    or (x.method <> 'pix' and x.status = 'pending')
    or (x.method = 'pix' and x.status = 'pending' and coalesce(x.expires_at, x.created_at + interval '24 hours') > now())
    or (x.status = 'creating' and x.created_at > now() - interval '2 minutes'))
  order by x.created_at desc limit 1;
  if a.id is null and o.paid_payment_id is not null then
    select * into a from public.payment_attempts where provider_payment_id = o.paid_payment_id;
  end if;
  if a.id is null then
    select * into a from public.payment_attempts where order_id = o.id order by created_at desc limit 1;
  end if;

  return jsonb_build_object(
    'order', jsonb_build_object('id', o.id, 'status', o.status, 'payment_status', o.payment_status, 'total', o.total,
      'created_at', o.created_at, 'paid_payment_id', o.paid_payment_id),
    'payable', v_reason is null,
    'reason', v_reason,
    'attempt', public.payment_attempt_json(a),
    'refresh_due', coalesce(a.id is not null and a.provider_payment_id is not null
      and a.status in ('pending', 'in_process', 'authorized')
      and (a.last_checked_at is null or a.last_checked_at < now() - interval '25 seconds'), false));
end;
$$;

-- 9) Permissões: nada pelo navegador; as RPCs públicas da função só para service_role.
revoke all on function public.payment_status_level(text) from public, anon, authenticated;
revoke all on function public.payment_attempt_json(public.payment_attempts) from public, anon, authenticated;
revoke all on function public.payment_order_block_reason(public.orders) from public, anon, authenticated;
revoke all on function public.payment_order_payload(public.orders) from public, anon, authenticated;
revoke all on function public.begin_payment_attempt(uuid, uuid, uuid, text) from public, anon, authenticated;
revoke all on function public.apply_mp_payment(jsonb, text) from public, anon, authenticated;
revoke all on function public.fail_payment_attempt(uuid, text) from public, anon, authenticated;
revoke all on function public.order_payment_state(uuid, uuid) from public, anon, authenticated;
grant execute on function public.begin_payment_attempt(uuid, uuid, uuid, text) to service_role;
grant execute on function public.apply_mp_payment(jsonb, text) to service_role;
grant execute on function public.fail_payment_attempt(uuid, text) to service_role;
grant execute on function public.order_payment_state(uuid, uuid) to service_role;
