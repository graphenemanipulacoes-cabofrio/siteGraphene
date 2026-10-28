-- Desconto específico por produto dentro do cupom de cada parceiro.
-- Ex.: cupom MARIA10 dá 10% em tudo, mas 20% na Creatina.
-- Sem acesso direto do site: só as Edge Functions (service_role) leem e gravam.
create table if not exists public.coupon_product_discounts (
  coupon_id uuid not null references public.discount_coupons(id) on delete cascade,
  product_id bigint not null references public.produtos(id) on delete cascade,
  discount_percent numeric(5,2) not null check (discount_percent > 0 and discount_percent <= 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (coupon_id, product_id)
);
create index if not exists coupon_product_discounts_product_idx on public.coupon_product_discounts (product_id);
alter table public.coupon_product_discounts enable row level security;
revoke all on public.coupon_product_discounts from public, anon, authenticated;
grant select, insert, update, delete on public.coupon_product_discounts to service_role;

-- Percentuais por produto de um cupom ativo (para a estimativa no site).
create or replace function public.checkout_coupon_product_rates(p_code text)
returns table (product_id bigint, discount_percent numeric)
language sql stable security invoker set search_path = ''
as $$
  select d.product_id, d.discount_percent
  from public.coupon_product_discounts d
  join public.discount_coupons c on c.id = d.coupon_id
  where c.code = upper(btrim(p_code)) and c.is_active;
$$;
revoke all on function public.checkout_coupon_product_rates(text) from public, anon, authenticated;
grant execute on function public.checkout_coupon_product_rates(text) to service_role;

-- Checkout: o desconto passa a ser calculado por item.
-- Produto com % próprio no cupom usa esse %; os demais seguem a regra geral
-- (porcentagem sobre o item, ou valor fixo sobre os itens sem % próprio).
create or replace function public.create_checkout_order_v2(p_customer_id uuid, p_customer_email text, p_checkout_key uuid, p_items jsonb, p_shipping_address jsonb, p_coupon_code text DEFAULT NULL::text)
 returns jsonb
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  v_order_id uuid;
  v_existing public.orders%rowtype;
  v_subtotal numeric(12,2) := 0;
  v_total numeric(12,2);
  v_discount numeric(12,2) := 0;
  v_items jsonb := '[]'::jsonb;
  v_item jsonb;
  v_product public.produtos%rowtype;
  v_quantity integer;
  v_product_id bigint;
  v_size_id text;
  v_flavor_id text;
  v_size jsonb;
  v_unit numeric(12,2);
  v_title text;
  v_size_label text;
  v_flavor_label text;
  v_has_flavors boolean;
  v_quote jsonb;
  v_shipping numeric(12,2) := 0;
  v_coupon public.discount_coupons%rowtype;
  v_coupon_code text := nullif(upper(trim(coalesce(p_coupon_code, ''))), '');
  v_rate_discount numeric := 0;
  v_general_base numeric := 0;
begin
  if p_customer_id is null or p_customer_email is null or length(p_customer_email) > 320 then raise exception 'invalid_customer'; end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) < 1 or jsonb_array_length(p_items) > 50 then raise exception 'invalid_cart'; end if;
  if jsonb_typeof(p_shipping_address) <> 'object' then raise exception 'invalid_shipping_address'; end if;

  if p_checkout_key is null then raise exception 'invalid_cart'; end if;
  perform pg_advisory_xact_lock(hashtextextended(p_checkout_key::text, 0));
  select * into v_existing from public.orders where checkout_key = p_checkout_key for update;
  v_order_id := v_existing.id;
  if v_order_id is not null then
    if v_existing.customer_id <> p_customer_id then raise exception 'checkout_key_conflict'; end if;
    if v_existing.payment_status not in ('pending', 'failed') then raise exception 'checkout_already_completed'; end if;
    select o.subtotal, o.total, o.discount_amount, o.shipping_amount,
      coalesce(jsonb_agg(jsonb_build_object('product_id', oi.product_id, 'title', oi.product_name, 'unit_price', oi.unit_price, 'quantity', oi.quantity, 'variant', oi.variant) order by oi.id) filter (where oi.id is not null), '[]'::jsonb)
    into v_subtotal, v_total, v_discount, v_shipping, v_items
    from public.orders o left join public.order_items oi on oi.order_id = o.id
    where o.id = v_order_id group by o.id;
    return jsonb_build_object('order_id', v_order_id, 'subtotal', v_subtotal, 'discount', v_discount, 'shipping', v_shipping, 'total', v_total, 'items', v_items);
  end if;

  for v_item in select value from jsonb_array_elements(p_items) loop
    if jsonb_typeof(v_item) <> 'object' then raise exception 'invalid_cart'; end if;
    begin
      v_product_id := (v_item ->> 'product_id')::bigint;
      v_quantity := (v_item ->> 'quantity')::integer;
    exception when others then raise exception 'invalid_cart';
    end;
    if v_quantity is null or v_quantity < 1 or v_quantity > 20 then raise exception 'invalid_cart'; end if;
    select * into v_product from public.produtos where id = v_product_id;
    if not found then raise exception 'invalid_or_unpriced_product'; end if;

    v_size_id := nullif(v_item ->> 'size', '');
    v_flavor_id := nullif(v_item ->> 'flavor', '');
    v_size_label := null; v_flavor_label := null;

    -- Quantidade: obrigatória quando o produto tem apresentações com preço.
    if jsonb_typeof(v_product.options -> 'sizes') = 'array' and jsonb_array_length(v_product.options -> 'sizes') > 0 then
      select s into v_size from jsonb_array_elements(v_product.options -> 'sizes') s
      where s ->> 'id' = v_size_id and coalesce((s ->> 'price')::numeric, 0) > 0 limit 1;
      if v_size is null then raise exception 'invalid_variant'; end if;
      v_unit := (v_size ->> 'price')::numeric;
      v_size_label := v_size ->> 'label';
    else
      if v_size_id is not null then raise exception 'invalid_variant'; end if;
      v_unit := v_product.price;
    end if;
    if v_unit is null or v_unit <= 0 then raise exception 'invalid_or_unpriced_product'; end if;

    -- Sabor: obrigatório quando o produto tem sabores ativos ou a opção natural.
    v_has_flavors := coalesce((v_product.options ->> 'natural')::boolean, false)
      or (jsonb_typeof(v_product.options -> 'flavors') = 'array' and jsonb_array_length(v_product.options -> 'flavors') > 0);
    if v_has_flavors then
      if v_flavor_id = 'natural' and coalesce((v_product.options ->> 'natural')::boolean, false) then
        v_flavor_label := 'Natural (sem sabor)';
      elsif v_flavor_id is not null and coalesce(v_product.options -> 'flavors', '[]'::jsonb) ? v_flavor_id then
        select name into v_flavor_label from public.sabores where id = v_flavor_id;
        if v_flavor_label is null then raise exception 'invalid_variant'; end if;
        v_unit := v_unit + greatest(coalesce((v_product.options ->> 'flavor_price')::numeric, 0), 0);
      else
        raise exception 'invalid_variant';
      end if;
    elsif v_flavor_id is not null then
      raise exception 'invalid_variant';
    end if;

    v_title := v_product.name || coalesce(' — ' || v_size_label, '') || coalesce(' · ' || v_flavor_label, '');
    v_subtotal := v_subtotal + v_unit * v_quantity;
    v_items := v_items || jsonb_build_object(
      'product_id', v_product.id, 'title', v_title, 'unit_price', v_unit, 'quantity', v_quantity,
      'variant', jsonb_strip_nulls(jsonb_build_object('size', v_size_id, 'size_label', v_size_label, 'flavor', v_flavor_id, 'flavor_label', v_flavor_label))
    );
    v_size := null;
  end loop;
  if v_subtotal <= 0 then raise exception 'invalid_or_unpriced_product'; end if;

  if v_coupon_code is not null then
    select c.* into v_coupon from public.discount_coupons c
    join public.commission_recipients r on r.id = c.recipient_id and r.is_active
    where c.code = v_coupon_code and c.is_active
      and (c.starts_at is null or c.starts_at <= now())
      and (c.ends_at is null or c.ends_at > now())
      and (c.max_redemptions is null or c.redeemed_count < c.max_redemptions)
    for update;
    if not found then raise exception 'invalid_coupon'; end if;
    if v_subtotal < v_coupon.minimum_order_amount then raise exception 'coupon_minimum_not_reached'; end if;
    select
      coalesce(sum(case
        when d.discount_percent is not null then (i ->> 'unit_price')::numeric * (i ->> 'quantity')::integer * d.discount_percent
        when v_coupon.discount_type = 'percentage' then (i ->> 'unit_price')::numeric * (i ->> 'quantity')::integer * v_coupon.discount_value
        else 0 end), 0),
      coalesce(sum((i ->> 'unit_price')::numeric * (i ->> 'quantity')::integer) filter (where d.discount_percent is null), 0)
    into v_rate_discount, v_general_base
    from jsonb_array_elements(v_items) i
    left join public.coupon_product_discounts d on d.coupon_id = v_coupon.id and d.product_id = (i ->> 'product_id')::bigint;
    v_discount := round(v_rate_discount / 100, 2);
    if v_coupon.discount_type <> 'percentage' then v_discount := v_discount + least(v_coupon.discount_value, v_general_base); end if;
    v_discount := least(v_discount, v_subtotal);
  end if;
  -- Frete calculado aqui (regras do painel admin); grátis a partir do valor definido.
  v_quote := public.shipping_quote(p_shipping_address ->> 'zip', v_subtotal);
  if not coalesce((v_quote ->> 'ok')::boolean, false) then raise exception 'invalid_shipping_zip'; end if;
  v_shipping := coalesce((v_quote ->> 'amount')::numeric, 0);
  v_total := v_subtotal - v_discount + v_shipping;
  if v_total <= 0 then raise exception 'invalid_order_total'; end if;

  insert into public.orders (checkout_key, customer_id, customer_email, shipping_address, subtotal, shipping_amount, total, discount_code, discount_amount, attributed_recipient_id)
  values (p_checkout_key, p_customer_id, lower(p_customer_email), p_shipping_address || jsonb_build_object('delivery', v_quote), v_subtotal, v_shipping, v_total, v_coupon_code, v_discount, case when v_coupon_code is null then null else v_coupon.recipient_id end)
  returning id into v_order_id;

  insert into public.order_items (order_id, product_id, product_name, unit_price, quantity, variant)
  select v_order_id, (i ->> 'product_id')::bigint, i ->> 'title', (i ->> 'unit_price')::numeric, (i ->> 'quantity')::integer, nullif(i -> 'variant', '{}'::jsonb)
  from jsonb_array_elements(v_items) i;
  if v_coupon_code is not null then update public.discount_coupons set redeemed_count = redeemed_count + 1, updated_at = now() where id = v_coupon.id; end if;
  return jsonb_build_object('order_id', v_order_id, 'subtotal', v_subtotal, 'discount', v_discount, 'shipping', v_shipping, 'total', v_total, 'items', v_items);
end;
$function$;
