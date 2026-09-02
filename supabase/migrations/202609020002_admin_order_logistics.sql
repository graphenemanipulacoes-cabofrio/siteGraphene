-- Secure administrative order logistics.
alter table public.orders add column if not exists customer_document text;
alter table public.orders add column if not exists payment_method text;
alter table public.orders add column if not exists payment_details jsonb not null default '{}'::jsonb;
alter table public.orders add column if not exists carrier text;
alter table public.orders add column if not exists tracking_code text;
alter table public.orders add column if not exists invoice_number text;
alter table public.orders add column if not exists invoice_url text;
alter table public.orders add column if not exists admin_notes text;
alter table public.orders add column if not exists shipped_at timestamptz;
alter table public.orders add column if not exists delivered_at timestamptz;

create index if not exists orders_status_created_idx on public.orders(status, created_at desc);
create index if not exists orders_payment_status_idx on public.orders(payment_status, created_at desc);

create table if not exists public.admin_sessions (
  token_hash text primary key,
  admin_username text not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  last_used_at timestamptz not null default now()
);

create index if not exists admin_sessions_expiry_idx on public.admin_sessions(expires_at);
alter table public.admin_sessions enable row level security;
revoke all on public.admin_sessions from public, anon, authenticated;

-- Administrator credentials are only reachable through service-role Edge Functions.
alter table public.admins enable row level security;
revoke all on public.admins from anon, authenticated;
