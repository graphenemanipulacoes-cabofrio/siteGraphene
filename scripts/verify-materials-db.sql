-- Synthetic catalogue entry only. No real customer or catalogue row is edited.
begin;
set local statement_timeout = '10s';
do $$
declare v_id bigint; v_count bigint; v_denied boolean;
begin
  execute 'set local role service_role';
  insert into public.materias_primas(name, category, tags, image_url)
    values ('Synthetic material verification', 'Verification', ARRAY['Synthetic'], 'https://example.invalid/synthetic.png') returning id into v_id;
  execute 'reset role';
  execute 'set local role anon';
  select count(*) into v_count from public.materias_primas where id=v_id;
  if v_count <> 1 then raise exception 'public_read_failed'; end if;
  v_denied := false;
  begin update public.materias_primas set name='Denied' where id=v_id;
  exception when insufficient_privilege then v_denied := true; end;
  if not v_denied then raise exception 'anonymous_write_not_denied'; end if;
  execute 'reset role';
  execute 'set local role authenticated';
  v_denied := false;
  begin delete from public.materias_primas where id=v_id;
  exception when insufficient_privilege then v_denied := true; end;
  if not v_denied then raise exception 'customer_delete_not_denied'; end if;
  execute 'reset role';
  execute 'set local role service_role';
  update public.materias_primas set name='Edited synthetic material', image_url=null where id=v_id;
  select count(*) into v_count from public.materias_primas where id=v_id and image_url is null;
  if v_count <> 1 then raise exception 'edit_or_remove_image_failed'; end if;
  delete from public.materias_primas where id=v_id;
  select count(*) into v_count from public.materias_primas where id=v_id;
  if v_count <> 0 then raise exception 'delete_failed'; end if;
  execute 'reset role';
end;
$$;
rollback;
