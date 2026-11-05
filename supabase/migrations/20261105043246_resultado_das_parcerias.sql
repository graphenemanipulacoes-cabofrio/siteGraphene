-- Resultado das parcerias: regras de cada parceira, entregas do mês e custos privados.
-- Nenhuma destas tabelas é lida pelo navegador: tudo passa pelas funções do admin.
create table if not exists public.partner_cost_settings (
  id smallint primary key default 1 check (id = 1),
  default_cost_percent numeric(6,2) not null default 35 check (default_cost_percent between 0 and 200),
  packaging_percent numeric(6,2) not null default 3 check (packaging_percent between 0 and 100),
  tax_percent numeric(6,2) not null default 8 check (tax_percent between 0 and 100),
  payment_percent numeric(6,2) not null default 3.5 check (payment_percent between 0 and 100),
  confirmed_at timestamptz,
  updated_by text,
  updated_at timestamptz not null default now()
);
comment on table public.partner_cost_settings is 'Custos usados no resultado das parcerias. confirmed_at vazio significa que ainda são hipóteses.';
insert into public.partner_cost_settings (id) values (1) on conflict (id) do nothing;

create table if not exists public.product_costs (
  product_id bigint primary key references public.produtos(id) on delete cascade,
  cost_percent numeric(6,2) not null check (cost_percent between 0 and 200),
  updated_by text,
  updated_at timestamptz not null default now()
);
comment on table public.product_costs is 'Custo real de cada produto, em % do preço. Fica fora de produtos porque o público lê aquela tabela.';

create table if not exists public.partner_terms (
  recipient_id uuid primary key references public.commission_recipients(id) on delete cascade,
  test_start date not null,
  test_days integer not null default 90 check (test_days between 30 and 365),
  monthly_minimum numeric(12,2) not null default 0 check (monthly_minimum >= 0),
  monthly_goal numeric(12,2) not null default 0 check (monthly_goal >= 0),
  monthly_vale numeric(12,2) not null default 0 check (monthly_vale >= 0),
  reels_per_month integer not null default 1 check (reels_per_month between 0 and 100),
  stories_per_month integer not null default 3 check (stories_per_month between 0 and 100),
  phase text not null default 'test' check (phase in ('test', 'active', 'half_vale', 'commission_only', 'ended')),
  notes text,
  updated_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.partner_deliveries (
  recipient_id uuid not null references public.commission_recipients(id) on delete cascade,
  month date not null check (extract(day from month) = 1),
  reels integer not null default 0 check (reels between 0 and 1000),
  stories integer not null default 0 check (stories between 0 and 1000),
  note text,
  updated_by text,
  updated_at timestamptz not null default now(),
  primary key (recipient_id, month)
);

alter table public.partner_cost_settings enable row level security;
alter table public.product_costs enable row level security;
alter table public.partner_terms enable row level security;
alter table public.partner_deliveries enable row level security;
revoke all on public.partner_cost_settings, public.product_costs, public.partner_terms, public.partner_deliveries from anon, authenticated;

create index if not exists orders_paid_recipient_idx on public.orders(attributed_recipient_id, paid_at) where payment_status = 'paid';

-- A comissão incide sobre o valor pago em produtos, sem o frete.
-- Compra feita pela própria parceira com o cupom dela não gera comissão.
create or replace function public.create_order_commissions(p_order_id uuid)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  o public.orders%rowtype;
  v_base numeric(12,2);
begin
  select * into o from public.orders where id = p_order_id for update;
  if not found then return; end if;
  if o.payment_status <> 'paid' then
    update public.commissions set status = 'cancelled', updated_at = now() where order_id = p_order_id and status <> 'paid';
    return;
  end if;
  v_base := greatest(coalesce(o.subtotal, 0) - coalesce(o.discount_amount, 0), 0);
  insert into public.commissions (order_id, recipient_id, base_amount, commission_type, commission_value, amount, status, available_at)
  select o.id, r.id, v_base, r.commission_type, r.commission_value,
    case when r.commission_type = 'percentage' then round(v_base * r.commission_value / 100, 2) else least(r.commission_value, v_base) end,
    'pending', coalesce(o.paid_at, now()) + make_interval(days => r.hold_days)
  from public.commission_recipients r
  where r.is_active
    and (r.attribution_scope = 'all_paid_orders'
      or (r.attribution_scope = 'coupon' and r.id = o.attributed_recipient_id
        and not exists (select 1 from public.partner_profiles p where p.commission_recipient_id = r.id and p.id = o.customer_id)))
  on conflict (order_id, recipient_id) do nothing;
end;
$function$;
