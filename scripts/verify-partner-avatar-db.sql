-- Foto da parceira na página do link (/cupom/CODIGO): formato gravado, o que o público lê e o bucket.
-- Só dados sintéticos; o rollback desfaz tudo. Qualquer falha interrompe com erro.
begin;
do $$
declare
  v_partner uuid := gen_random_uuid();
  v_pending uuid := gen_random_uuid();
  v_recipient uuid;
  v_coupon uuid;
  v_pending_coupon uuid;
  v_code text := 'FIXTURE' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10));
  v_pending_code text := 'FIXTUREP' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 9));
  v_path text;
  v_refused boolean;
  v_bucket record;
begin
  insert into auth.users (id, email) values (v_partner, v_partner::text || '@example.invalid'), (v_pending, v_pending::text || '@example.invalid');
  insert into public.commission_recipients (name, role, commission_type, commission_value, attribution_scope, hold_days, is_active)
    values ('Fixture parceira', 'influencer', 'percentage', 10, 'coupon', 30, true) returning id into v_recipient;
  insert into public.discount_coupons (recipient_id, code, discount_type, discount_value, is_active)
    values (v_recipient, v_code, 'percentage', 5, true) returning id into v_coupon;
  insert into public.discount_coupons (recipient_id, code, discount_type, discount_value, is_active)
    values (v_recipient, v_pending_code, 'percentage', 5, true) returning id into v_pending_coupon;
  v_path := v_partner::text || '/avatar-1763000000000.webp';
  insert into public.partner_profiles (id, full_name, email, phone, document, pix_key, channel, status, commission_recipient_id, coupon_id, avatar_path)
    values (v_partner, 'Fixture parceira', v_partner::text || '@example.invalid', '22000000000', '00000000000', 'fixture', 'fixture', 'approved', v_recipient, v_coupon, v_path);
  insert into public.partner_profiles (id, full_name, email, phone, document, pix_key, channel, status, coupon_id, avatar_path)
    values (v_pending, 'Fixture em análise', v_pending::text || '@example.invalid', '22000000001', '00000000001', 'fixture', 'fixture', 'pending', v_pending_coupon, v_pending::text || '/avatar-1763000000001.jpg');

  -- O público lê a foto pela página do link: código sem diferença de maiúsculas e espaços.
  perform set_config('request.jwt.claims', '{"role":"anon"}', true);
  if public.partner_avatar('  ' || lower(v_code) || ' ') is distinct from v_path then raise exception 'o link deveria mostrar a foto da parceira aprovada'; end if;
  if public.partner_avatar(v_pending_code) is not null then raise exception 'parceira em análise não deveria aparecer'; end if;
  if public.partner_avatar('NAOEXISTE') is not null then raise exception 'cupom inexistente não deveria ter foto'; end if;
  update public.discount_coupons set is_active = false where id = v_coupon;
  if public.partner_avatar(v_code) is not null then raise exception 'cupom inativo não deveria mostrar a foto'; end if;
  update public.discount_coupons set is_active = true where id = v_coupon;

  -- Só caminhos no formato da pasta da conta, com nome fixo e WebP ou JPEG.
  foreach v_path in array array['../outra/avatar-1.webp', v_partner::text || '/avatar-1763000000000.png', v_partner::text || '/foto.webp', 'https://exemplo.invalid/a.webp'] loop
    begin
      update public.partner_profiles set avatar_path = v_path where id = v_partner;
      v_refused := false;
    exception when check_violation then v_refused := true;
    end;
    if not v_refused then raise exception 'caminho de foto inválido foi aceito: %', v_path; end if;
  end loop;
  update public.partner_profiles set avatar_path = null where id = v_partner;
  if public.partner_avatar(v_code) is not null then raise exception 'sem foto, o link deveria receber nulo'; end if;

  -- Bucket público, pequeno e só com imagens; sem políticas de envio pelo navegador.
  select public, file_size_limit, allowed_mime_types into v_bucket from storage.buckets where id = 'parceiros';
  if not found or not v_bucket.public or v_bucket.file_size_limit > 1048576 or v_bucket.allowed_mime_types <> array['image/webp', 'image/jpeg'] then
    raise exception 'bucket parceiros fora do combinado';
  end if;
  if exists (select 1 from pg_policy where polrelid = 'storage.objects'::regclass and (pg_get_expr(polqual, polrelid) ilike '%parceiros%' or pg_get_expr(polwithcheck, polrelid) ilike '%parceiros%')) then
    raise exception 'o bucket parceiros não deveria ter política de envio pelo navegador';
  end if;

  -- A tabela de parceiros continua fechada para o navegador.
  if has_table_privilege('anon', 'public.partner_profiles', 'select') or has_table_privilege('authenticated', 'public.partner_profiles', 'select') then
    raise exception 'partner_profiles não deveria ser lida pelo navegador';
  end if;
  raise notice 'Partner avatar DB checks passed: public read only for approved partners with an active coupon, strict path format, small public image bucket without browser upload policies, partner table still closed. Synthetic data, rolled back.';
end;
$$;
rollback;
