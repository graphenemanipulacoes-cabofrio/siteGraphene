-- Variações dos produtos: quantidade (apresentação) e sabor.
-- produtos.options = {
--   "sizes":   [{ "id": "60-capsulas", "label": "60 cápsulas", "price": 59.90 }],  -- escolha obrigatória quando houver
--   "flavors": ["laranja", "morango"],   -- sabores ativos neste produto (ids da tabela sabores)
--   "natural": true,                     -- oferece "Natural (sem sabor)"
--   "flavor_price": 10                   -- acréscimo quando o cliente escolhe um sabor
-- }
-- Quantidades sem preço ficam fora da loja até o farmacêutico preencher.
alter table public.produtos add column if not exists options jsonb not null default '{}'::jsonb;
alter table public.order_items add column if not exists variant jsonb;

-- Catálogo único de sabores: vale para todos os produtos; cada produto ativa os seus.
create table if not exists public.sabores (
  id text primary key check (id ~ '^[a-z0-9-]{2,40}$'),
  name text not null check (length(btrim(name)) between 1 and 40),
  display_order integer not null default 0,
  created_at timestamptz not null default now()
);
alter table public.sabores enable row level security;
revoke all on public.sabores from anon, authenticated;
grant select on public.sabores to anon, authenticated;
drop policy if exists "sabores_leitura_publica" on public.sabores;
create policy "sabores_leitura_publica" on public.sabores for select to anon, authenticated using (true);

-- Pedido com variações: o preço de cada item vem do cadastro (nunca do navegador).
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
  v_coupon public.discount_coupons%rowtype;
  v_coupon_code text := nullif(upper(trim(coalesce(p_coupon_code, ''))), '');
begin
  if p_customer_id is null or p_customer_email is null or length(p_customer_email) > 320 then raise exception 'invalid_customer'; end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) < 1 or jsonb_array_length(p_items) > 50 then raise exception 'invalid_cart'; end if;
  if jsonb_typeof(p_shipping_address) <> 'object' then raise exception 'invalid_shipping_address'; end if;

  -- Mesma chave de compra: devolve o pedido já criado (clique duplo, nova tentativa).
  select id into v_order_id from public.orders where checkout_key = p_checkout_key;
  if v_order_id is not null then
    select o.subtotal, o.total, o.discount_amount,
      coalesce(jsonb_agg(jsonb_build_object('product_id', oi.product_id, 'title', oi.product_name, 'unit_price', oi.unit_price, 'quantity', oi.quantity) order by oi.id), '[]'::jsonb)
    into v_subtotal, v_total, v_discount, v_items
    from public.orders o left join public.order_items oi on oi.order_id = o.id
    where o.id = v_order_id group by o.id;
    return jsonb_build_object('order_id', v_order_id, 'subtotal', v_subtotal, 'discount', v_discount, 'total', v_total, 'items', v_items);
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
  v_total := v_subtotal - v_discount;

  insert into public.orders (checkout_key, customer_id, customer_email, shipping_address, subtotal, total, discount_code, discount_amount, attributed_recipient_id)
  values (p_checkout_key, p_customer_id, lower(p_customer_email), p_shipping_address, v_subtotal, v_total, v_coupon_code, v_discount, case when v_coupon_code is null then null else v_coupon.recipient_id end)
  returning id into v_order_id;

  insert into public.order_items (order_id, product_id, product_name, unit_price, quantity, variant)
  select v_order_id, (i ->> 'product_id')::bigint, i ->> 'title', (i ->> 'unit_price')::numeric, (i ->> 'quantity')::integer, nullif(i -> 'variant', '{}'::jsonb)
  from jsonb_array_elements(v_items) i;
  if v_coupon_code is not null then update public.discount_coupons set redeemed_count = redeemed_count + 1, updated_at = now() where id = v_coupon.id; end if;
  return jsonb_build_object('order_id', v_order_id, 'subtotal', v_subtotal, 'discount', v_discount, 'total', v_total, 'items', v_items);
end;
$$;

revoke all on function public.create_checkout_order_v2(uuid, text, uuid, jsonb, jsonb, text) from public, anon, authenticated;
grant execute on function public.create_checkout_order_v2(uuid, text, uuid, jsonb, jsonb, text) to service_role;
