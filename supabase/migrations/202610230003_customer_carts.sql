-- Account-scoped carts. Browser prices/descriptions are display snapshots only;
-- create-checkout still calculates payable amounts from the server catalogue.
create table if not exists public.customer_carts (
  customer_id uuid primary key references auth.users(id) on delete cascade,
  items jsonb not null default '[]'::jsonb
    check (jsonb_typeof(items) = 'array' and jsonb_array_length(items) <= 50 and octet_length(items::text) <= 400000),
  updated_at timestamptz not null default now()
);

-- Receipts make retries safe even if a phone lost its connection after the
-- server saved the change but before the response reached the phone.
create table if not exists public.customer_cart_operations (
  customer_id uuid not null references auth.users(id) on delete cascade,
  operation_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (customer_id, operation_id)
);

alter table public.customer_carts enable row level security;
alter table public.customer_cart_operations enable row level security;
revoke all on public.customer_carts from public, anon, authenticated;
revoke all on public.customer_cart_operations from public, anon, authenticated;
grant select on public.customer_carts to authenticated;
grant all on public.customer_carts, public.customer_cart_operations to service_role;
drop policy if exists "Customers can read their own cart" on public.customer_carts;
create policy "Customers can read their own cart" on public.customer_carts
  for select to authenticated using ((select auth.uid()) = customer_id);

create or replace function public.customer_cart_sync(p_operations jsonb default '[]'::jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_customer_id uuid := auth.uid();
  v_items jsonb;
  v_updated_at timestamptz;
  v_operation jsonb;
  v_operation_id uuid;
  v_type text;
  v_key text;
  v_item jsonb;
  v_clean_item jsonb;
  v_existing jsonb;
  v_index integer;
  v_product_id text;
  v_size text;
  v_flavor text;
  v_quantity integer;
  v_price numeric;
  v_order_id uuid;
  v_purchased record;
begin
  if v_customer_id is null then raise exception 'authentication_required' using errcode = '42501'; end if;
  if p_operations is null or jsonb_typeof(p_operations) <> 'array'
    or jsonb_array_length(p_operations) > 100 or octet_length(p_operations::text) > 800000
  then raise exception 'invalid_cart_operations'; end if;

  insert into public.customer_carts (customer_id) values (v_customer_id) on conflict (customer_id) do nothing;
  -- A phone and a computer apply operations in sequence, rather than replacing
  -- each other's entire cart with an older local snapshot.
  select items, updated_at into v_items, v_updated_at from public.customer_carts
    where customer_id = v_customer_id for update;

  for v_operation in select value from jsonb_array_elements(p_operations) loop
    if jsonb_typeof(v_operation) <> 'object' or coalesce(v_operation ->> 'id', '')
      !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
    then raise exception 'invalid_cart_operation'; end if;
    v_operation_id := (v_operation ->> 'id')::uuid;
    if exists (select 1 from public.customer_cart_operations where customer_id = v_customer_id and operation_id = v_operation_id) then continue; end if;
    v_type := v_operation ->> 'type';
    if v_type not in ('add', 'merge', 'quantity', 'remove', 'clear', 'settle') or v_type is null then raise exception 'invalid_cart_operation'; end if;

    if v_type = 'clear' then
      v_items := '[]'::jsonb;
    elsif v_type = 'settle' then
      begin v_order_id := (v_operation ->> 'order_id')::uuid; exception when others then raise exception 'invalid_cart_order'; end;
      if v_order_id is null or v_operation_id <> v_order_id or not exists (
        select 1 from public.orders where id = v_order_id and customer_id = v_customer_id and payment_status = 'paid'
      ) then raise exception 'invalid_cart_order'; end if;
      -- Never trust purchased quantities sent by the browser. A paid order can
      -- settle the cart only once, including when opened on another device.
      for v_purchased in select product_id, quantity, variant from public.order_items where order_id = v_order_id loop
        v_key := v_purchased.product_id::text || '|' || coalesce(v_purchased.variant ->> 'size', '') || '|' || coalesce(v_purchased.variant ->> 'flavor', '');
        select item, (ordinality - 1)::integer into v_existing, v_index
          from jsonb_array_elements(v_items) with ordinality as line(item, ordinality) where item ->> 'key' = v_key limit 1;
        if v_index is not null then
          v_quantity := (v_existing ->> 'quantity')::integer - v_purchased.quantity;
          v_items := case when v_quantity <= 0 then v_items - v_index
            else jsonb_set(v_items, array[v_index::text, 'quantity'], to_jsonb(v_quantity)) end;
        end if;
      end loop;
    else
      if v_type in ('add', 'merge') then
        v_item := v_operation -> 'item';
        v_product_id := v_item ->> 'id';
        v_size := nullif(v_item ->> 'size', '');
        v_flavor := nullif(v_item ->> 'flavor', '');
        if jsonb_typeof(v_item) <> 'object' or coalesce(v_product_id, '') !~ '^[0-9]{1,19}$'
          or coalesce(length(v_size), 0) > 120 or coalesce(length(v_flavor), 0) > 120
          or position('|' in coalesce(v_size, '')) > 0 or position('|' in coalesce(v_flavor, '')) > 0
        then raise exception 'invalid_cart_item'; end if;
        v_key := v_product_id || '|' || coalesce(v_size, '') || '|' || coalesce(v_flavor, '');
        begin
          v_quantity := (v_item ->> 'quantity')::integer;
          v_price := (v_item ->> 'price')::numeric;
        exception when others then raise exception 'invalid_cart_item'; end;
        if v_quantity is null or v_quantity not between 1 and 20 then raise exception 'invalid_cart_quantity'; end if;
        v_clean_item := jsonb_build_object(
          'id', v_product_id, 'key', v_key, 'size', v_size, 'flavor', v_flavor,
          'quantity', v_quantity,
          'name', left(coalesce(v_item ->> 'name', ''), 300),
          'description', left(coalesce(v_item ->> 'description', ''), 4000),
          'image_url', left(coalesce(v_item ->> 'image_url', ''), 2048),
          'sizeLabel', left(v_item ->> 'sizeLabel', 160),
          'flavorLabel', left(v_item ->> 'flavorLabel', 160),
          'price', case when v_price > 0 and v_price <= 999999.99 then v_price else null end
        );
      else
        v_key := v_operation ->> 'key';
        if v_key is null or length(v_key) > 262 then raise exception 'invalid_cart_key'; end if;
        if v_type = 'quantity' then
          begin v_quantity := (v_operation ->> 'quantity')::integer; exception when others then raise exception 'invalid_cart_quantity'; end;
          if v_quantity is null or v_quantity not between 0 and 20 then raise exception 'invalid_cart_quantity'; end if;
        end if;
      end if;

      select item, (ordinality - 1)::integer into v_existing, v_index
        from jsonb_array_elements(v_items) with ordinality as line(item, ordinality) where item ->> 'key' = v_key limit 1;
      if v_type in ('add', 'merge') then
        if v_index is null then
          if jsonb_array_length(v_items) >= 50 then raise exception 'cart_limit_exceeded'; end if;
          v_items := v_items || jsonb_build_array(v_clean_item);
        else
          v_quantity := case when v_type = 'merge' then greatest((v_existing ->> 'quantity')::integer, v_quantity)
            else least((v_existing ->> 'quantity')::integer + v_quantity, 20) end;
          v_items := jsonb_set(v_items, array[v_index::text], jsonb_set(v_clean_item, '{quantity}', to_jsonb(v_quantity)));
        end if;
      elsif v_index is not null then
        v_items := case when v_type = 'remove' or v_quantity = 0 then v_items - v_index
          else jsonb_set(v_items, array[v_index::text, 'quantity'], to_jsonb(v_quantity)) end;
      end if;
    end if;

    insert into public.customer_cart_operations (customer_id, operation_id) values (v_customer_id, v_operation_id);
    v_updated_at := now();
  end loop;

  if jsonb_array_length(p_operations) > 0 then
    update public.customer_carts set items = v_items, updated_at = v_updated_at where customer_id = v_customer_id;
  end if;
  return jsonb_build_object('items', v_items, 'updated_at', v_updated_at);
end;
$$;

revoke all on function public.customer_cart_sync(jsonb) from public, anon;
grant execute on function public.customer_cart_sync(jsonb) to authenticated;
