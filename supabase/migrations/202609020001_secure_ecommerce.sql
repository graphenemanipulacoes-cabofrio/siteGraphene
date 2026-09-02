-- Secure ecommerce foundation for Graphene.
create table if not exists public.customer_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  checkout_key uuid not null unique,
  customer_id uuid not null references auth.users(id) on delete restrict,
  customer_email text not null,
  shipping_address jsonb not null,
  subtotal numeric(12,2) not null check (subtotal > 0),
  shipping_amount numeric(12,2) not null default 0 check (shipping_amount >= 0),
  total numeric(12,2) not null check (total > 0),
  status text not null default 'awaiting_payment' check (status in ('awaiting_payment','paid','processing','shipped','delivered','cancelled')),
  payment_status text not null default 'pending' check (payment_status in ('pending','paid','failed','refunded')),
  payment_reference text unique,
  payment_url text,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.order_items (
  id bigint generated always as identity primary key,
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id bigint references public.produtos(id) on delete restrict,
  product_name text not null,
  unit_price numeric(12,2) not null check (unit_price > 0),
  quantity integer not null check (quantity between 1 and 20),
  created_at timestamptz not null default now()
);

create index if not exists orders_customer_created_idx on public.orders(customer_id, created_at desc);
create index if not exists order_items_order_idx on public.order_items(order_id);
alter table public.produtos enable row level security;
alter table public.customer_profiles enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;

-- Prices used by checkout must not be editable with the public browser key.
drop policy if exists "Enable all for produtos" on public.produtos;
drop policy if exists "Public can read products" on public.produtos;
create policy "Public can read products" on public.produtos for select to anon, authenticated using (true);
revoke insert, update, delete on public.produtos from anon, authenticated;

drop policy if exists "Customers can read their own profile" on public.customer_profiles;
drop policy if exists "Customers can update their own profile" on public.customer_profiles;
drop policy if exists "Customers can create their own profile" on public.customer_profiles;
drop policy if exists "Customers can read their own orders" on public.orders;
drop policy if exists "Customers can read their own order items" on public.order_items;

create policy "Customers can read their own profile" on public.customer_profiles for select to authenticated using ((select auth.uid()) = id);
create policy "Customers can update their own profile" on public.customer_profiles for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);
create policy "Customers can read their own orders" on public.orders for select to authenticated using ((select auth.uid()) = customer_id);
create policy "Customers can read their own order items" on public.order_items for select to authenticated using (
  exists (select 1 from public.orders o where o.id = order_id and o.customer_id = (select auth.uid()))
);

create or replace function public.handle_new_customer() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.customer_profiles (id, full_name) values (new.id, nullif(new.raw_user_meta_data ->> 'full_name', '')) on conflict (id) do nothing;
  return new;
end;
$$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_customer();

create or replace function public.create_checkout_order(
  p_customer_id uuid, p_customer_email text, p_checkout_key uuid, p_items jsonb, p_shipping_address jsonb
) returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_order_id uuid;
  v_subtotal numeric(12,2);
  v_requested_count integer;
  v_valid_count integer;
  v_result_items jsonb;
begin
  if p_customer_id is null or p_customer_email is null or length(p_customer_email) > 320 then raise exception 'invalid_customer'; end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) < 1 or jsonb_array_length(p_items) > 50 then raise exception 'invalid_cart'; end if;
  if jsonb_typeof(p_shipping_address) <> 'object' then raise exception 'invalid_shipping_address'; end if;

  select count(*) into v_requested_count from jsonb_to_recordset(p_items) as requested(product_id bigint, quantity integer);
  select count(*), sum(p.price * requested.quantity), jsonb_agg(jsonb_build_object(
    'product_id', p.id, 'title', p.name, 'unit_price', p.price, 'quantity', requested.quantity
  ) order by p.id)
  into v_valid_count, v_subtotal, v_result_items
  from jsonb_to_recordset(p_items) as requested(product_id bigint, quantity integer)
  join public.produtos p on p.id = requested.product_id
  where requested.quantity between 1 and 20 and p.price is not null and p.price > 0;

  if v_valid_count <> v_requested_count or v_subtotal is null or v_subtotal <= 0 then raise exception 'invalid_or_unpriced_product'; end if;

  insert into public.orders (checkout_key, customer_id, customer_email, shipping_address, subtotal, total)
  values (p_checkout_key, p_customer_id, lower(p_customer_email), p_shipping_address, v_subtotal, v_subtotal)
  on conflict (checkout_key) do update set updated_at = now()
  returning id into v_order_id;

  insert into public.order_items (order_id, product_id, product_name, unit_price, quantity)
  select v_order_id, p.id, p.name, p.price, requested.quantity
  from jsonb_to_recordset(p_items) as requested(product_id bigint, quantity integer)
  join public.produtos p on p.id = requested.product_id
  where not exists (select 1 from public.order_items oi where oi.order_id = v_order_id and oi.product_id = p.id);

  return jsonb_build_object('order_id', v_order_id, 'subtotal', v_subtotal, 'total', v_subtotal, 'items', v_result_items);
end;
$$;

revoke all on function public.create_checkout_order(uuid,text,uuid,jsonb,jsonb) from public, anon, authenticated;
grant execute on function public.create_checkout_order(uuid,text,uuid,jsonb,jsonb) to service_role;
revoke insert, update, delete on public.orders from anon, authenticated;
revoke insert, update, delete on public.order_items from anon, authenticated;
