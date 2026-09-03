-- Product store credits and physical store consumption ledger for partners/influencers
create table if not exists public.partner_product_credits (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references public.partner_profiles(id) on delete cascade,
  type text not null check (type in ('grant', 'usage')),
  amount numeric(12,2) not null check (amount > 0),
  description text not null check (char_length(description) between 2 and 300),
  invoice_ref text check (char_length(invoice_ref) <= 120),
  spent_at timestamptz not null default now(),
  created_by text,
  created_at timestamptz not null default now()
);

create index if not exists partner_product_credits_partner_idx on public.partner_product_credits(partner_id, spent_at desc);

alter table public.partner_product_credits enable row level security;
revoke all on public.partner_product_credits from anon, authenticated;
