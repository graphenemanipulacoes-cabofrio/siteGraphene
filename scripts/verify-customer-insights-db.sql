-- Tabelas do pós-venda: privadas e com as regras do banco. Só dados sintéticos; o rollback desfaz tudo.
begin;
do $$
declare
  v_key text := gen_random_uuid()::text;
  v_note uuid;
begin
  if has_table_privilege('anon', 'public.customer_followups', 'select') or has_table_privilege('authenticated', 'public.customer_followups', 'select')
    or has_table_privilege('anon', 'public.customer_notes', 'select') or has_table_privilege('authenticated', 'public.customer_notes', 'select')
    or has_table_privilege('anon', 'public.customer_notes', 'insert') or has_table_privilege('authenticated', 'public.customer_notes', 'insert') then
    raise exception 'pós-venda não pode ser acessado pelo navegador';
  end if;
  if (select count(*) from pg_class where oid in ('public.customer_followups'::regclass, 'public.customer_notes'::regclass) and relrowsecurity) <> 2 then
    raise exception 'RLS desligado nas tabelas de pós-venda';
  end if;

  insert into public.customer_followups (customer_key, contact_preference, next_contact_on) values (v_key, 'allowed', current_date);
  insert into public.customer_followups (customer_key, contact_preference) values ('tel:22900000000', 'refused');
  insert into public.customer_notes (customer_key, kind, note) values (v_key, 'contact', 'Fixture de contato') returning id into v_note;
  if v_note is null then raise exception 'anotação não gravada'; end if;

  begin
    insert into public.customer_followups (customer_key) values ('qualquer coisa');
    raise exception 'chave inválida foi aceita';
  exception when check_violation then null;
  end;
  begin
    insert into public.customer_followups (customer_key, contact_preference) values (gen_random_uuid()::text, 'talvez');
    raise exception 'preferência inválida foi aceita';
  exception when check_violation then null;
  end;
  begin
    insert into public.customer_notes (customer_key, note) values (v_key, 'x');
    raise exception 'anotação curta foi aceita';
  exception when check_violation then null;
  end;
end $$;
rollback;
