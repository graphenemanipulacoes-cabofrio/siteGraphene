-- Dedicated, read-only counter access. No credentials or sessions are exposed
-- through the Data API. All access goes through the balcao-api Edge Function.
create table if not exists public.counter_accounts (
  id uuid primary key default gen_random_uuid(),
  username text not null unique check (username ~ '^[a-z0-9._-]{3,60}$'),
  display_name text not null check (length(display_name) between 2 and 100),
  password_hash text not null,
  is_active boolean not null default true,
  auth_version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by text not null
);

create table if not exists public.counter_sessions (
  token_hash text primary key,
  account_id uuid not null references public.counter_accounts(id) on delete cascade,
  auth_version integer not null,
  created_at timestamptz not null default now(),
  last_used_at timestamptz not null default now(),
  device_label text,
  revoked_at timestamptz
);
create index if not exists counter_sessions_account_idx on public.counter_sessions(account_id);

create table if not exists public.counter_login_limits (
  key text primary key,
  attempts integer not null default 0,
  window_start timestamptz not null default now()
);

alter table public.counter_accounts enable row level security;
alter table public.counter_sessions enable row level security;
alter table public.counter_login_limits enable row level security;
revoke all on public.counter_accounts, public.counter_sessions, public.counter_login_limits from public, anon, authenticated;
grant all on public.counter_accounts, public.counter_sessions, public.counter_login_limits to service_role;

-- Atomic, server-side rate limiting. Failed logins cannot be reset by clearing
-- browser storage; a sliding window is intentionally NOT extended on rejection.
create or replace function public.counter_take_login_attempt(p_keys text[])
returns boolean language plpgsql security definer set search_path = public
as $$
declare
  v_key text;
  v_row public.counter_login_limits%rowtype;
  v_allowed boolean := true;
begin
  if cardinality(p_keys) <> 2 then return false; end if;
  foreach v_key in array p_keys loop
    if length(v_key) not between 5 and 100 then return false; end if;
    insert into public.counter_login_limits(key, attempts, window_start)
    values(v_key, 1, now())
    on conflict(key) do update set
      attempts = case when counter_login_limits.window_start < now() - interval '15 minutes' then 1 else counter_login_limits.attempts + 1 end,
      window_start = case when counter_login_limits.window_start < now() - interval '15 minutes' then now() else counter_login_limits.window_start end
    returning * into v_row;
    if v_row.attempts > 12 then v_allowed := false; end if;
  end loop;
  delete from public.counter_login_limits where window_start < now() - interval '1 day';
  return v_allowed;
end;
$$;
revoke all on function public.counter_take_login_attempt(text[]) from public, anon, authenticated;
grant execute on function public.counter_take_login_attempt(text[]) to service_role;

-- Credential changes and session revocation are atomic, so an old password or
-- previously saved browser session cannot survive a credential reset.
create or replace function public.counter_manage_account(
  p_action text, p_id uuid, p_username text, p_display_name text,
  p_password_hash text, p_is_active boolean, p_admin_username text
) returns uuid language plpgsql security definer set search_path = public
as $$
declare v_id uuid;
begin
  if p_action = 'create' then
    insert into public.counter_accounts(username, display_name, password_hash, created_by)
    values(p_username, p_display_name, p_password_hash, p_admin_username)
    returning id into v_id;
  elsif p_action = 'save' then
    update public.counter_accounts set
      username = p_username, display_name = p_display_name,
      password_hash = coalesce(nullif(p_password_hash, ''), password_hash),
      is_active = p_is_active, auth_version = auth_version + 1, updated_at = now()
    where id = p_id returning id into v_id;
  elsif p_action = 'revoke' then
    update public.counter_accounts set auth_version = auth_version + 1, updated_at = now()
    where id = p_id returning id into v_id;
  else raise exception 'invalid_action';
  end if;
  if v_id is null then raise exception 'account_not_found'; end if;
  if p_action <> 'create' then
    update public.counter_sessions set revoked_at = now()
    where account_id = v_id and revoked_at is null;
  end if;
  return v_id;
end;
$$;
revoke all on function public.counter_manage_account(text,uuid,text,text,text,boolean,text) from public, anon, authenticated;
grant execute on function public.counter_manage_account(text,uuid,text,text,text,boolean,text) to service_role;
