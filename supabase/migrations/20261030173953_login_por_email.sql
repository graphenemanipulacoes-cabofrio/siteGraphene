-- Login único por e-mail (Supabase Auth) para clientes, parceiros, equipe e administração.
-- O papel vem do e-mail da conta:
--   admins.email            -> administração e todas as áreas (balcão, farmacêutico, parceiros, loja)
--   counter_accounts.email  -> equipe (balcão ou farmacêutico)
-- As senhas ficam só no Supabase Auth. Usuário/senha próprios do admin e da equipe deixam de ser usados.

alter table public.admins add column if not exists email text;
alter table public.admins alter column password drop not null;
alter table public.admins drop constraint if exists admins_email_check;
alter table public.admins add constraint admins_email_check
  check (email is null or (email = lower(btrim(email)) and email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'));
create unique index if not exists admins_email_key on public.admins (email) where email is not null;

-- Administrador geral pedido pelo dono. A senha é a da conta dele no site (Supabase Auth).
insert into public.admins (username, email, password)
select 'thalesbx@gmail.com', 'thalesbx@gmail.com', null
where not exists (select 1 from public.admins where email = 'thalesbx@gmail.com');

alter table public.counter_accounts add column if not exists email text;
alter table public.counter_accounts alter column username drop not null;
alter table public.counter_accounts alter column password_hash drop not null;
alter table public.counter_accounts drop constraint if exists counter_accounts_email_check;
alter table public.counter_accounts add constraint counter_accounts_email_check
  check (email is null or (email = lower(btrim(email)) and email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'));
create unique index if not exists counter_accounts_email_key on public.counter_accounts (email) where email is not null;

-- As funções do servidor precisam saber se o e-mail já tem conta para não criar outra.
create or replace function public.auth_user_id_by_email(p_email text)
returns uuid language sql stable security definer set search_path = public, auth
as $$
  select id from auth.users where lower(email) = lower(btrim(p_email)) limit 1;
$$;
revoke all on function public.auth_user_id_by_email(text) from public, anon, authenticated;
grant execute on function public.auth_user_id_by_email(text) to service_role;

-- Cadastro da equipe por e-mail. Alterar, desativar ou encerrar revoga os navegadores conectados.
create or replace function public.staff_manage_account(
  p_action text, p_id uuid, p_email text, p_display_name text,
  p_is_active boolean, p_admin_email text, p_role text
) returns uuid language plpgsql security definer set search_path = public
as $$
declare v_id uuid;
begin
  if p_action in ('create', 'save') and coalesce(p_role, '') not in ('balcao', 'farmaceutico') then
    raise exception 'invalid_role';
  end if;
  if p_action = 'create' then
    insert into public.counter_accounts(email, display_name, created_by, role)
    values(lower(btrim(p_email)), p_display_name, p_admin_email, p_role)
    returning id into v_id;
  elsif p_action = 'save' then
    update public.counter_accounts set
      email = lower(btrim(p_email)), display_name = p_display_name, role = p_role,
      is_active = p_is_active, auth_version = auth_version + 1, updated_at = now()
    where id = p_id returning id into v_id;
  elsif p_action = 'revoke' then
    update public.counter_accounts set auth_version = auth_version + 1, updated_at = now()
    where id = p_id returning id into v_id;
  elsif p_action = 'delete' then
    -- As sessões saem junto (on delete cascade).
    delete from public.counter_accounts where id = p_id returning id into v_id;
    if v_id is null then raise exception 'account_not_found'; end if;
    return v_id;
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
revoke all on function public.staff_manage_account(text,uuid,text,text,boolean,text,text) from public, anon, authenticated;
grant execute on function public.staff_manage_account(text,uuid,text,text,boolean,text,text) to service_role;

-- Só para a interface (mostrar atalhos): o papel da própria conta conectada.
-- As Edge Functions continuam conferindo o e-mail com auth.getUser() em cada chamada.
create or replace function public.current_staff_role()
returns text language sql stable security definer set search_path = public
as $$
  select case
    when exists (select 1 from public.admins where email = lower(auth.jwt() ->> 'email')) then 'admin'
    else (select role from public.counter_accounts where email = lower(auth.jwt() ->> 'email') and is_active limit 1)
  end;
$$;
revoke all on function public.current_staff_role() from public, anon;
grant execute on function public.current_staff_role() to authenticated;
