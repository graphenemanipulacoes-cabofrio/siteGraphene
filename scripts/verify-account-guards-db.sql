-- Confere no banco as travas do cadastro sem confirmação de e-mail.
-- Só usa dados sintéticos e termina em rollback: nada fica gravado.
begin;

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
values
  ('a0000000-0000-4000-8000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'com-senha@example.invalid', 'hash-sintetico', now(), now(), now()),
  ('a0000000-0000-4000-8000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'so-google@example.invalid', null, now(), now(), now());
insert into auth.sessions (id, user_id, created_at, updated_at) values
  ('b0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', now(), now()),
  ('b0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000002', now(), now());
insert into auth.mfa_factors (id, user_id, friendly_name, factor_type, status, created_at, updated_at) values
  ('c0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'sintetico', 'totp', 'verified', now(), now());
insert into public.admins (username, email, password) values ('reservado@example.invalid', 'reservado@example.invalid', null);

do $$
declare
  v_access record;
  v_blocked boolean;
begin
  -- Ninguém cria conta com e-mail reservado da equipe.
  v_blocked := false;
  begin
    insert into auth.users (id, instance_id, aud, role, email, created_at, updated_at)
    values ('a0000000-0000-4000-8000-000000000003', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'RESERVADO@example.invalid', now(), now());
  exception when others then v_blocked := sqlerrm = 'staff_email_reserved';
  end;
  assert v_blocked, 'criar conta com e-mail da equipe deveria falhar';

  -- Ninguém troca o e-mail da própria conta por um da equipe.
  v_blocked := false;
  begin
    update auth.users set email = 'reservado@example.invalid' where id = 'a0000000-0000-4000-8000-000000000002';
  exception when others then v_blocked := sqlerrm = 'staff_email_reserved';
  end;
  assert v_blocked, 'trocar para e-mail da equipe deveria falhar';

  -- Trocar por um e-mail livre e alterar outros campos continua funcionando.
  update auth.users set email = 'livre@example.invalid' where id = 'a0000000-0000-4000-8000-000000000002';
  update auth.users set email = 'so-google@example.invalid' where id = 'a0000000-0000-4000-8000-000000000002';
  update auth.users set last_sign_in_at = now() where id = 'a0000000-0000-4000-8000-000000000001';

  -- O que o admin consulta antes de dar um papel.
  select * into v_access from public.auth_account_access('COM-SENHA@example.invalid');
  assert v_access.has_password and not v_access.is_staff, 'conta com senha fora da equipe';
  select * into v_access from public.auth_account_access('so-google@example.invalid');
  assert not v_access.has_password, 'conta só com Google não tem senha';
  assert not exists (select 1 from public.auth_account_access('ninguem@example.invalid')), 'e-mail sem conta';

  -- Google em conta sem senha não mexe em nada.
  insert into auth.identities (provider_id, user_id, identity_data, provider, created_at, updated_at)
  values ('google-sintetico-2', 'a0000000-0000-4000-8000-000000000002', '{"sub":"google-sintetico-2","email":"so-google@example.invalid"}', 'google', now(), now());
  assert exists (select 1 from auth.sessions where id = 'b0000000-0000-4000-8000-000000000002'), 'sessão de conta sem senha continua';

  -- Identidade de e-mail não apaga a senha.
  insert into auth.identities (provider_id, user_id, identity_data, provider, created_at, updated_at)
  values ('a0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', '{"sub":"a0000000-0000-4000-8000-000000000001","email":"com-senha@example.invalid"}', 'email', now(), now());
  assert (select encrypted_password from auth.users where id = 'a0000000-0000-4000-8000-000000000001') = 'hash-sintetico', 'identidade de e-mail mantém a senha';

  -- Google em conta com senha derruba quem criou a conta antes.
  insert into auth.identities (provider_id, user_id, identity_data, provider, created_at, updated_at)
  values ('google-sintetico-1', 'a0000000-0000-4000-8000-000000000001', '{"sub":"google-sintetico-1","email":"com-senha@example.invalid"}', 'google', now(), now());
  assert (select encrypted_password from auth.users where id = 'a0000000-0000-4000-8000-000000000001') is null, 'senha antiga removida';
  assert not exists (select 1 from auth.sessions where user_id = 'a0000000-0000-4000-8000-000000000001'), 'sessões antigas removidas';
  assert not exists (select 1 from auth.mfa_factors where user_id = 'a0000000-0000-4000-8000-000000000001'), 'código do celular antigo removido';
  assert exists (select 1 from auth.identities where provider_id = 'google-sintetico-1'), 'login do Google continua ligado';

  -- Limpeza de acessos ao dar um papel a uma conta já existente.
  perform public.reset_account_access('a0000000-0000-4000-8000-000000000002');
  assert not exists (select 1 from auth.sessions where user_id = 'a0000000-0000-4000-8000-000000000002'), 'sessões limpas';

  -- Permissões: o navegador não chama nenhuma dessas funções.
  assert not has_function_privilege('anon', 'public.auth_account_access(text)', 'execute'), 'anon sem auth_account_access';
  assert not has_function_privilege('authenticated', 'public.auth_account_access(text)', 'execute'), 'authenticated sem auth_account_access';
  assert not has_function_privilege('anon', 'public.reset_account_access(uuid)', 'execute'), 'anon sem reset_account_access';
  assert not has_function_privilege('authenticated', 'public.reset_account_access(uuid)', 'execute'), 'authenticated sem reset_account_access';
  assert has_function_privilege('service_role', 'public.auth_account_access(text)', 'execute'), 'funções consultam a conta';
  assert has_function_privilege('service_role', 'public.reset_account_access(uuid)', 'execute'), 'funções limpam acessos';
end;
$$;

select 'account guard checks passed (rollback)' as resultado;
rollback;
