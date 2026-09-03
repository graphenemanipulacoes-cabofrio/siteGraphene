-- Financial management, coupons and commission ledger.
create table if not exists public.commission_recipients (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 120),
  role text not null default 'influencer' check (role in ('influencer', 'marketing', 'development', 'other')),
  email text,
  commission_type text not null default 'percentage' check (commission_type in ('percentage', 'fixed')),
  commission_value numeric(12,2) not null check (commission_value >= 0),
  attribution_scope text not null default 'coupon' check (attribution_scope in ('coupon', 'all_paid_orders')),
  hold_days integer not null default 14 check (hold_days between 0 and 180),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.discount_coupons (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.commission_recipients(id) on delete restrict,
  code text not null unique check (code = upper(code) and code ~ '^[A-Z0-9_-]{3,40}$'),
  discount_type text not null default 'percentage' check (discount_type in ('percentage', 'fixed')),
  discount_value numeric(12,2) not null check (discount_value > 0),
  minimum_order_amount numeric(12,2) not null default 0 check (minimum_order_amount >= 0),
  max_redemptions integer check (max_redemptions is null or max_redemptions > 0),
  redeemed_count integer not null default 0 check (redeemed_count >= 0),
  starts_at timestamptz,
  ends_at timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at is null or starts_at is null or ends_at > starts_at)
);

alter table public.orders add column if not exists discount_code text;
alter table public.orders add column if not exists discount_amount numeric(12,2) not null default 0 check (discount_amount >= 0);
alter table public.orders add column if not exists attributed_recipient_id uuid references public.commission_recipients(id) on delete set null;
alter table public.orders add column if not exists payment_provider text not null default 'mercado_pago';
alter table public.orders add column if not exists provider_fee numeric(12,2) not null default 0 check (provider_fee >= 0);
alter table public.orders add column if not exists net_amount numeric(12,2);

create table if not exists public.payment_events (
  id bigint generated always as identity primary key,
  order_id uuid not null references public.orders(id) on delete cascade,
  provider text not null default 'mercado_pago',
  provider_payment_id text,
  status text not null,
  status_detail text,
  payment_method text,
  gross_amount numeric(12,2),
  provider_fee numeric(12,2) not null default 0,
  net_amount numeric(12,2),
  created_at timestamptz not null default now()
);

create table if not exists public.commissions (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  recipient_id uuid not null references public.commission_recipients(id) on delete restrict,
  base_amount numeric(12,2) not null check (base_amount >= 0),
  commission_type text not null check (commission_type in ('percentage', 'fixed')),
  commission_value numeric(12,2) not null check (commission_value >= 0),
  amount numeric(12,2) not null check (amount >= 0),
  status text not null default 'pending' check (status in ('pending', 'available', 'paid', 'cancelled')),
  available_at timestamptz not null,
  paid_at timestamptz,
  payout_reference text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(order_id, recipient_id)
);

create index if not exists orders_finance_created_idx on public.orders(payment_status, created_at desc);
create index if not exists orders_attributed_recipient_idx on public.orders(attributed_recipient_id, created_at desc);
create index if not exists payment_events_order_idx on public.payment_events(order_id, created_at desc);
create index if not exists commissions_recipient_status_idx on public.commissions(recipient_id, status, available_at);
create index if not exists discount_coupons_recipient_idx on public.discount_coupons(recipient_id);

alter table public.commission_recipients enable row level security;
alter table public.discount_coupons enable row level security;
alter table public.payment_events enable row level security;
alter table public.commissions enable row level security;
revoke all on public.commission_recipients, public.discount_coupons, public.payment_events, public.commissions from anon, authenticated;

create or replace function public.create_checkout_order(
  p_customer_id uuid,
  p_customer_email text,
  p_checkout_key uuid,
  p_items jsonb,
  p_shipping_address jsonb,
  p_coupon_code text default null
) returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_order_id uuid;
  v_subtotal numeric(12,2);
  v_total numeric(12,2);
  v_discount numeric(12,2) := 0;
  v_requested_count integer;
  v_valid_count integer;
  v_result_items jsonb;
  v_coupon public.discount_coupons%rowtype;
  v_coupon_code text := nullif(upper(trim(coalesce(p_coupon_code, ''))), '');
begin
  if p_customer_id is null or p_customer_email is null or length(p_customer_email) > 320 then raise exception 'invalid_customer'; end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) < 1 or jsonb_array_length(p_items) > 50 then raise exception 'invalid_cart'; end if;
  if jsonb_typeof(p_shipping_address) <> 'object' then raise exception 'invalid_shipping_address'; end if;

  select id into v_order_id from public.orders where checkout_key = p_checkout_key;
  if v_order_id is not null then
    select o.subtotal, o.total, o.discount_amount,
      coalesce(jsonb_agg(jsonb_build_object('product_id', oi.product_id, 'title', oi.product_name, 'unit_price', oi.unit_price, 'quantity', oi.quantity) order by oi.id), '[]'::jsonb)
    into v_subtotal, v_total, v_discount, v_result_items
    from public.orders o left join public.order_items oi on oi.order_id = o.id
    where o.id = v_order_id group by o.id;
    return jsonb_build_object('order_id', v_order_id, 'subtotal', v_subtotal, 'discount', v_discount, 'total', v_total, 'items', v_result_items);
  end if;

  select count(*) into v_requested_count from jsonb_to_recordset(p_items) as requested(product_id bigint, quantity integer);
  select count(*), sum(p.price * requested.quantity), jsonb_agg(jsonb_build_object(
    'product_id', p.id, 'title', p.name, 'unit_price', p.price, 'quantity', requested.quantity
  ) order by p.id)
  into v_valid_count, v_subtotal, v_result_items
  from jsonb_to_recordset(p_items) as requested(product_id bigint, quantity integer)
  join public.produtos p on p.id = requested.product_id
  where requested.quantity between 1 and 20 and p.price is not null and p.price > 0;
  if v_valid_count <> v_requested_count or v_subtotal is null or v_subtotal <= 0 then raise exception 'invalid_or_unpriced_product'; end if;

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

  insert into public.order_items (order_id, product_id, product_name, unit_price, quantity)
  select v_order_id, p.id, p.name, p.price, requested.quantity
  from jsonb_to_recordset(p_items) as requested(product_id bigint, quantity integer)
  join public.produtos p on p.id = requested.product_id;
  if v_coupon_code is not null then update public.discount_coupons set redeemed_count = redeemed_count + 1, updated_at = now() where id = v_coupon.id; end if;
  return jsonb_build_object('order_id', v_order_id, 'subtotal', v_subtotal, 'discount', v_discount, 'total', v_total, 'items', v_result_items);
end;
$$;

create or replace function public.create_order_commissions(p_order_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  o public.orders%rowtype;
begin
  select * into o from public.orders where id = p_order_id for update;
  if not found then return; end if;
  if o.payment_status <> 'paid' then
    update public.commissions set status = 'cancelled', updated_at = now() where order_id = p_order_id and status <> 'paid';
    return;
  end if;
  insert into public.commissions (order_id, recipient_id, base_amount, commission_type, commission_value, amount, status, available_at)
  select o.id, r.id, o.total, r.commission_type, r.commission_value,
    case when r.commission_type = 'percentage' then round(o.total * r.commission_value / 100, 2) else least(r.commission_value, o.total) end,
    'pending', coalesce(o.paid_at, now()) + make_interval(days => r.hold_days)
  from public.commission_recipients r
  where r.is_active and (r.attribution_scope = 'all_paid_orders' or (r.attribution_scope = 'coupon' and r.id = o.attributed_recipient_id))
  on conflict (order_id, recipient_id) do nothing;
end;
$$;

create or replace function public.release_available_commissions()
returns void language sql security definer set search_path = public as $$
  update public.commissions set status = 'available', updated_at = now()
  where status = 'pending' and available_at <= now();
$$;

revoke all on function public.create_checkout_order(uuid,text,uuid,jsonb,jsonb,text) from public, anon, authenticated;
grant execute on function public.create_checkout_order(uuid,text,uuid,jsonb,jsonb,text) to service_role;
revoke all on function public.create_order_commissions(uuid) from public, anon, authenticated;
grant execute on function public.create_order_commissions(uuid) to service_role;
revoke all on function public.release_available_commissions() from public, anon, authenticated;
grant execute on function public.release_available_commissions() to service_role;
