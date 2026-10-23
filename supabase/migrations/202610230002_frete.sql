-- Frete: regras editadas no painel admin (Frete e entrega) e calculadas no banco.
-- Envio para todo o Brasil por região; Região dos Lagos = entrega local (motoboy ou
-- retirada na loja, combinado pela equipe); frete grátis a partir de um valor.
create table if not exists public.loja_config (
  id smallint primary key default 1 check (id = 1),
  frete jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by text
);
alter table public.loja_config enable row level security;
revoke all on public.loja_config from anon, authenticated;
grant select on public.loja_config to anon, authenticated;
drop policy if exists "loja_config_leitura_publica" on public.loja_config;
create policy "loja_config_leitura_publica" on public.loja_config for select to anon, authenticated using (true);

-- Valores iniciais de referência: devem ser conferidos no painel antes de vender.
insert into public.loja_config (id, frete) values (1, $j${
  "free_min": null,
  "origin": { "zip": "28905060", "address": "Rua Itajuru, 300 (Lojas 5 e 6) — Centro, Cabo Frio/RJ" },
  "local": { "label": "Entrega local na Região dos Lagos", "ranges": [["28890000", "28979999"]] },
  "zones": [
    { "id": "rj", "label": "Estado do Rio de Janeiro", "ufs": ["RJ"], "price": 19.90, "days_min": 2, "days_max": 5 },
    { "id": "sudeste", "label": "Sudeste", "ufs": ["SP", "MG", "ES"], "price": 24.90, "days_min": 3, "days_max": 7 },
    { "id": "sul", "label": "Sul", "ufs": ["PR", "SC", "RS"], "price": 29.90, "days_min": 5, "days_max": 9 },
    { "id": "centro-oeste", "label": "Centro-Oeste", "ufs": ["DF", "GO", "MT", "MS"], "price": 32.90, "days_min": 5, "days_max": 10 },
    { "id": "nordeste", "label": "Nordeste", "ufs": ["BA", "SE", "AL", "PE", "PB", "RN", "CE", "PI", "MA"], "price": 34.90, "days_min": 6, "days_max": 12 },
    { "id": "norte", "label": "Norte", "ufs": ["PA", "AP", "AM", "RR", "AC", "RO", "TO"], "price": 39.90, "days_min": 8, "days_max": 15 }
  ]
}$j$::jsonb) on conflict (id) do nothing;

-- Estado pelo CEP (faixas oficiais dos Correios).
create or replace function public.uf_from_zip(p_zip text) returns text
language sql immutable set search_path = public as $$
  select case
    when n between 1000000 and 19999999 then 'SP' when n between 20000000 and 28999999 then 'RJ'
    when n between 29000000 and 29999999 then 'ES' when n between 30000000 and 39999999 then 'MG'
    when n between 40000000 and 48999999 then 'BA' when n between 49000000 and 49999999 then 'SE'
    when n between 50000000 and 56999999 then 'PE' when n between 57000000 and 57999999 then 'AL'
    when n between 58000000 and 58999999 then 'PB' when n between 59000000 and 59999999 then 'RN'
    when n between 60000000 and 63999999 then 'CE' when n between 64000000 and 64999999 then 'PI'
    when n between 65000000 and 65999999 then 'MA' when n between 66000000 and 68899999 then 'PA'
    when n between 68900000 and 68999999 then 'AP' when n between 69300000 and 69399999 then 'RR'
    when n between 69000000 and 69899999 then 'AM' when n between 69900000 and 69999999 then 'AC'
    when n between 70000000 and 72799999 or n between 73000000 and 73699999 then 'DF'
    when n between 72800000 and 72999999 or n between 73700000 and 76799999 then 'GO'
    when n between 76800000 and 76999999 then 'RO' when n between 77000000 and 77999999 then 'TO'
    when n between 78000000 and 78899999 then 'MT' when n between 79000000 and 79999999 then 'MS'
    when n between 80000000 and 87999999 then 'PR' when n between 88000000 and 89999999 then 'SC'
    when n between 90000000 and 99999999 then 'RS'
  end
  from (select case when regexp_replace(coalesce(p_zip, ''), '\D', '', 'g') ~ '^\d{8}$'
    then regexp_replace(p_zip, '\D', '', 'g')::integer end as n) z;
$$;

-- Cotação de frete: usada pela loja (carrinho e checkout) e pelo pedido.
create or replace function public.shipping_quote(p_zip text, p_subtotal numeric default 0)
returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  v_config jsonb;
  v_zip text := regexp_replace(coalesce(p_zip, ''), '\D', '', 'g');
  v_uf text;
  v_zone jsonb;
  v_range jsonb;
  v_free_min numeric;
  v_free boolean;
begin
  if v_zip !~ '^\d{8}$' then return jsonb_build_object('ok', false, 'error', 'invalid_zip'); end if;
  select frete into v_config from public.loja_config where id = 1;
  v_config := coalesce(v_config, '{}'::jsonb);
  v_free_min := nullif(v_config ->> 'free_min', '')::numeric;
  v_uf := public.uf_from_zip(v_zip);
  if v_uf is null then return jsonb_build_object('ok', false, 'error', 'invalid_zip'); end if;

  for v_range in select value from jsonb_array_elements(coalesce(v_config #> '{local,ranges}', '[]'::jsonb)) loop
    if v_zip between (v_range ->> 0) and (v_range ->> 1) then
      return jsonb_build_object('ok', true, 'uf', v_uf, 'zone', 'local', 'local', true, 'amount', 0, 'free', false,
        'label', coalesce(v_config #>> '{local,label}', 'Entrega local'), 'free_min', v_free_min,
        'pickup_address', v_config #>> '{origin,address}');
    end if;
  end loop;

  select z into v_zone from jsonb_array_elements(coalesce(v_config -> 'zones', '[]'::jsonb)) z
  where (z -> 'ufs') ? v_uf limit 1;
  if v_zone is null or coalesce((v_zone ->> 'price')::numeric, -1) < 0 then
    return jsonb_build_object('ok', false, 'error', 'unavailable', 'uf', v_uf);
  end if;
  v_free := v_free_min is not null and v_free_min > 0 and coalesce(p_subtotal, 0) >= v_free_min;
  return jsonb_build_object('ok', true, 'uf', v_uf, 'zone', v_zone ->> 'id', 'local', false,
    'label', 'Entrega para ' || (v_zone ->> 'label'),
    'amount', case when v_free then 0 else round((v_zone ->> 'price')::numeric, 2) end,
    'price', round((v_zone ->> 'price')::numeric, 2), 'free', v_free, 'free_min', v_free_min,
    'missing', case when v_free_min is not null and v_free_min > 0 and not v_free then round(v_free_min - coalesce(p_subtotal, 0), 2) end,
    'days_min', (v_zone ->> 'days_min')::integer, 'days_max', (v_zone ->> 'days_max')::integer);
end;
$$;
revoke all on function public.shipping_quote(text, numeric) from public;
grant execute on function public.shipping_quote(text, numeric) to anon, authenticated, service_role;
revoke all on function public.uf_from_zip(text) from public;
grant execute on function public.uf_from_zip(text) to anon, authenticated, service_role;

-- Pedido com variações + frete (substitui a versão da migração 202610230001).
create or replace function public.create_checkout_order_v2(
  p_customer_id uuid, p_customer_email text, p_checkout_key uuid, p_items jsonb,
  p_shipping_address jsonb, p_coupon_code text default null
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order_id uuid;
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
begin
  if p_customer_id is null or p_customer_email is null or length(p_customer_email) > 320 then raise exception 'invalid_customer'; end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) < 1 or jsonb_array_length(p_items) > 50 then raise exception 'invalid_cart'; end if;
  if jsonb_typeof(p_shipping_address) <> 'object' then raise exception 'invalid_shipping_address'; end if;

  -- Mesma chave de compra: devolve o pedido já criado (clique duplo, nova tentativa).
  select id into v_order_id from public.orders where checkout_key = p_checkout_key;
  if v_order_id is not null then
    select o.subtotal, o.total, o.discount_amount, o.shipping_amount,
      coalesce(jsonb_agg(jsonb_build_object('product_id', oi.product_id, 'title', oi.product_name, 'unit_price', oi.unit_price, 'quantity', oi.quantity) order by oi.id), '[]'::jsonb)
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
    v_discount := case when v_coupon.discount_type = 'percentage'
      then round(v_subtotal * v_coupon.discount_value / 100, 2)
      else v_coupon.discount_value end;
    v_discount := least(v_discount, v_subtotal);
  end if;
  -- Frete calculado aqui (regras do painel admin); grátis a partir do valor definido.
  v_quote := public.shipping_quote(p_shipping_address ->> 'zip', v_subtotal);
  if not coalesce((v_quote ->> 'ok')::boolean, false) then raise exception 'invalid_shipping_zip'; end if;
  v_shipping := coalesce((v_quote ->> 'amount')::numeric, 0);
  v_total := v_subtotal - v_discount + v_shipping;

  insert into public.orders (checkout_key, customer_id, customer_email, shipping_address, subtotal, shipping_amount, total, discount_code, discount_amount, attributed_recipient_id)
  values (p_checkout_key, p_customer_id, lower(p_customer_email), p_shipping_address || jsonb_build_object('delivery', v_quote), v_subtotal, v_shipping, v_total, v_coupon_code, v_discount, case when v_coupon_code is null then null else v_coupon.recipient_id end)
  returning id into v_order_id;

  insert into public.order_items (order_id, product_id, product_name, unit_price, quantity, variant)
  select v_order_id, (i ->> 'product_id')::bigint, i ->> 'title', (i ->> 'unit_price')::numeric, (i ->> 'quantity')::integer, nullif(i -> 'variant', '{}'::jsonb)
  from jsonb_array_elements(v_items) i;
  if v_coupon_code is not null then update public.discount_coupons set redeemed_count = redeemed_count + 1, updated_at = now() where id = v_coupon.id; end if;
  return jsonb_build_object('order_id', v_order_id, 'subtotal', v_subtotal, 'discount', v_discount, 'shipping', v_shipping, 'total', v_total, 'items', v_items);
end;
$$;

revoke all on function public.create_checkout_order_v2(uuid, text, uuid, jsonb, jsonb, text) from public, anon, authenticated;
grant execute on function public.create_checkout_order_v2(uuid, text, uuid, jsonb, jsonb, text) to service_role;
