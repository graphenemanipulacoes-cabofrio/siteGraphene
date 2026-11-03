-- Base das correções de segurança. Só acrescenta: pode ser aplicada com o site antigo no ar.

-- Limite de uso no servidor, usado pelas Edge Functions públicas.
create table if not exists public.rate_limits (
  key text primary key,
  hits integer not null,
  window_start timestamptz not null default now()
);
alter table public.rate_limits enable row level security;
revoke all on public.rate_limits from public, anon, authenticated;

create or replace function public.take_rate_limit(p_key text, p_max integer, p_window_seconds integer, p_amount integer default 1)
returns boolean language plpgsql security definer set search_path = public
as $$
declare v_hits integer;
begin
  if length(p_key) not between 5 and 120 or p_max < 1 or p_window_seconds < 1 or p_amount < 1 then return false; end if;
  insert into public.rate_limits as r (key, hits, window_start)
  values (p_key, p_amount, now())
  on conflict (key) do update set
    hits = case when r.window_start < now() - make_interval(secs => p_window_seconds) then p_amount else r.hits + p_amount end,
    window_start = case when r.window_start < now() - make_interval(secs => p_window_seconds) then now() else r.window_start end
  returning hits into v_hits;
  delete from public.rate_limits where window_start < now() - interval '2 days';
  return v_hits <= p_max;
end;
$$;
revoke all on function public.take_rate_limit(text, integer, integer, integer) from public, anon, authenticated;
grant execute on function public.take_rate_limit(text, integer, integer, integer) to service_role;

-- Registro de ações sensíveis da administração. Leitura só pelo painel, via Edge Function.
create table if not exists public.admin_audit_log (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  actor text not null,
  action text not null,
  target text,
  details jsonb not null default '{}'::jsonb
);
create index if not exists admin_audit_log_created_at_idx on public.admin_audit_log (created_at desc);
alter table public.admin_audit_log enable row level security;
revoke all on public.admin_audit_log from public, anon, authenticated;
