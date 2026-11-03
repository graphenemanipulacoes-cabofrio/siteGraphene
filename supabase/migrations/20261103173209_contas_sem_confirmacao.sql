-- Travas para o cadastro sem confirmação de e-mail. Só acrescenta: pode ser aplicada com a
-- confirmação ainda ligada. Aplicar antes de desligar "Confirm email" no painel.

-- O papel de admin e equipe vem do e-mail da conta. Sem confirmação, ninguém pode
-- criar uma conta com um desses e-mails nem trocar o e-mail da própria conta por um deles.
-- As funções cadastram a conta antes de gravar o e-mail nas tabelas da equipe.
create or replace function public.protect_staff_email()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  if new.email is not null
    and (tg_op = 'INSERT' or lower(new.email) is distinct from lower(old.email))
    and (
      exists (select 1 from public.admins a where lower(a.email) = lower(new.email))
      or exists (select 1 from public.counter_accounts c where lower(c.email) = lower(new.email))
    )
  then
    raise exception 'staff_email_reserved';
  end if;
  return new;
end;
$$;
revoke all on function public.protect_staff_email() from public, anon, authenticated;
drop trigger if exists protect_staff_email on auth.users;
create trigger protect_staff_email
  before insert or update of email on auth.users
  for each row execute function public.protect_staff_email();

-- Login externo (Google) prova a posse do e-mail. Se a conta já tinha senha, ela pode ter
-- sido criada por outra pessoa: a senha e as sessões antigas deixam de valer.
create or replace function public.secure_account_on_external_login()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  if new.provider <> 'email'
    and exists (select 1 from auth.users u where u.id = new.user_id and coalesce(u.encrypted_password, '') <> '')
  then
    update auth.users set encrypted_password = null where id = new.user_id;
    delete from auth.sessions where user_id = new.user_id;
    delete from auth.mfa_factors where user_id = new.user_id;
  end if;
  return new;
end;
$$;
revoke all on function public.secure_account_on_external_login() from public, anon, authenticated;
drop trigger if exists secure_account_on_external_login on auth.identities;
create trigger secure_account_on_external_login
  after insert on auth.identities
  for each row execute function public.secure_account_on_external_login();

-- O que o admin precisa saber antes de dar um papel a um e-mail que já tem conta.
create or replace function public.auth_account_access(p_email text)
returns table (id uuid, has_password boolean, is_staff boolean)
language sql stable security definer set search_path = ''
as $$
  select
    u.id,
    coalesce(u.encrypted_password, '') <> '',
    exists (select 1 from public.admins a where lower(a.email) = lower(p_email))
      or exists (select 1 from public.counter_accounts c where lower(c.email) = lower(p_email))
  from auth.users u
  where lower(u.email) = lower(p_email)
  limit 1;
$$;
revoke all on function public.auth_account_access(text) from public, anon, authenticated;
grant execute on function public.auth_account_access(text) to service_role;

-- Tira o acesso de quem criou a conta antes de o e-mail entrar na equipe.
create or replace function public.reset_account_access(p_user_id uuid)
returns void language sql security definer set search_path = ''
as $$
  delete from auth.sessions where user_id = p_user_id;
  delete from auth.mfa_factors where user_id = p_user_id;
$$;
revoke all on function public.reset_account_access(uuid) from public, anon, authenticated;
grant execute on function public.reset_account_access(uuid) to service_role;

-- Limite de criação de contas por endereço. Ligar no painel em Authentication > Hooks
-- (Before User Created). O endereço fica guardado só em hash.
create or replace function public.hook_limit_signups(event jsonb)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare
  v_ip text := coalesce(event->'metadata'->>'ip_address', 'unknown');
begin
  if public.take_rate_limit('cadastro-ip:' || encode(sha256(convert_to(v_ip, 'UTF8')), 'hex'), 10, 3600) then
    return '{}'::jsonb;
  end if;
  return jsonb_build_object('error', jsonb_build_object('http_code', 429, 'message', 'Muitas tentativas seguidas. Aguarde e tente de novo.'));
end;
$$;
revoke all on function public.hook_limit_signups(jsonb) from public, anon, authenticated;
grant execute on function public.hook_limit_signups(jsonb) to supabase_auth_admin;
