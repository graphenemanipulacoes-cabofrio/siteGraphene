-- Partner applications, approval workflow and isolated partner portal data.
create table if not exists public.partner_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null check (char_length(full_name) between 2 and 120),
  email text not null unique check (email = lower(email)),
  phone text not null check (char_length(phone) between 8 and 30),
  document text,
  pix_key text,
  channel text,
  requested_coupon_code text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'suspended')),
  commission_recipient_id uuid unique references public.commission_recipients(id) on delete set null,
  coupon_id uuid unique references public.discount_coupons(id) on delete set null,
  referral_code text unique,
  approved_at timestamptz,
  approved_by text,
  rejection_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists partner_profiles_status_created_idx on public.partner_profiles(status, created_at desc);
create index if not exists partner_profiles_recipient_idx on public.partner_profiles(commission_recipient_id);

alter table public.partner_profiles enable row level security;
revoke all on public.partner_profiles from anon, authenticated;
