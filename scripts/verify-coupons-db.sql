-- Run as the project SQL administrator. Only synthetic data; everything rolls back.
-- Does not call Mercado Pago, mark a payment paid, or touch a real customer's order.
begin;
do $$
declare
  v_user uuid := gen_random_uuid();
  v_recipient uuid;
  v_coupon uuid;
  v_product bigint := -9223372036854775101;
  v_key uuid := gen_random_uuid();
  v_code text := 'QAFIX' || upper(left(replace(gen_random_uuid()::text, '-', ''), 20));
  v_order jsonb;
  v_repeat jsonb;
  v_count int;
begin
  insert into auth.users (id, email, raw_user_meta_data) values (v_user, v_user::text || '@example.invalid', '{"full_name":"Fixture sintética"}');
  insert into public.commission_recipients (name, role, commission_type, commission_value, attribution_scope)
    values ('QAFIX Parceiro sintético', 'influencer', 'percentage', 12, 'coupon') returning id into v_recipient;
  insert into public.discount_coupons (recipient_id, code, discount_type, discount_value)
    values (v_recipient, v_code, 'percentage', 15) returning id into v_coupon;
  insert into public.produtos (id, name, description, price, options) overriding system value
    values (v_product, 'Fixture de checkout — não é produto real', 'Teste transacional com rollback', 100, '{}');

  select count(*) into v_count from public.lookup_checkout_coupons('qa', false);
  if v_count <> 0 then raise exception 'Search threshold failed'; end if;
  if not exists(select 1 from public.lookup_checkout_coupons(lower(left(v_code, 15)), false) where code=v_code and partner_name='QAFIX') then raise exception 'Prefix/uppercase search failed'; end if;
  if not exists(select 1 from public.lookup_checkout_coupons(lower(v_code), true) where code=v_code) then raise exception 'Exact normalization failed'; end if;
  if has_function_privilege('anon', 'public.lookup_checkout_coupons(text,boolean)', 'EXECUTE')
    or has_function_privilege('authenticated', 'public.lookup_checkout_coupons(text,boolean)', 'EXECUTE') then raise exception 'Private lookup exposed'; end if;
  if has_table_privilege('authenticated', 'public.discount_coupons', 'SELECT') then raise exception 'Private coupon table exposed'; end if;

  update public.discount_coupons set is_active=false where id=v_coupon;
  if exists(select 1 from public.lookup_checkout_coupons(v_code,true)) then raise exception 'Paused coupon suggested'; end if;
  update public.discount_coupons set is_active=true, ends_at=now()-interval '1 day' where id=v_coupon;
  if exists(select 1 from public.lookup_checkout_coupons(v_code,true)) then raise exception 'Expired coupon suggested'; end if;
  update public.discount_coupons set ends_at=null, starts_at=now()+interval '1 day' where id=v_coupon;
  if exists(select 1 from public.lookup_checkout_coupons(v_code,true)) then raise exception 'Future coupon suggested'; end if;
  update public.discount_coupons set starts_at=null, max_redemptions=1,redeemed_count=1 where id=v_coupon;
  if exists(select 1 from public.lookup_checkout_coupons(v_code,true)) then raise exception 'Exhausted coupon suggested'; end if;
  update public.discount_coupons set max_redemptions=null,redeemed_count=0 where id=v_coupon;
  update public.commission_recipients set is_active=false where id=v_recipient;
  if exists(select 1 from public.lookup_checkout_coupons(v_code,true)) then raise exception 'Paused recipient suggested'; end if;
  update public.commission_recipients set is_active=true where id=v_recipient;

  v_order := public.create_checkout_order_v2(v_user, v_user::text || '@example.invalid', v_key,
    jsonb_build_array(jsonb_build_object('product_id',v_product,'quantity',2)),
    '{"name":"Fixture sintética", "zip":"01001000", "address":"Endereço de teste", "number":"1"}', lower(v_code));
  if not exists(select 1 from public.orders where id=(v_order->>'order_id')::uuid and customer_id=v_user
    and attributed_recipient_id=v_recipient and discount_code=v_code and subtotal=200 and discount_amount=30 and payment_status='pending') then raise exception 'Attribution/discount failed'; end if;
  v_repeat := public.create_checkout_order_v2(v_user, v_user::text || '@example.invalid', v_key,
    jsonb_build_array(jsonb_build_object('product_id',v_product,'quantity',2)), '{"zip":"01001000"}', v_code);
  if v_repeat->>'order_id' <> v_order->>'order_id' then raise exception 'Idempotency failed'; end if;
  if (select redeemed_count from public.discount_coupons where id=v_coupon) <> 1 then raise exception 'Coupon double-counted'; end if;
  perform public.create_order_commissions((v_order->>'order_id')::uuid);
  if exists(select 1 from public.commissions where order_id=(v_order->>'order_id')::uuid) then raise exception 'Commission generated before payment'; end if;
  raise notice 'Coupon lookup, private access, eligibility, checkout attribution, discount and idempotency verified; no payment made. All fixtures rolled back.';
end;
$$;
rollback;
