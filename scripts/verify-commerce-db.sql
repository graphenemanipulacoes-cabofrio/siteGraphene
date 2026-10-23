-- Run only after reviewing production triggers. Never select or use real
-- customers in tests. All users, carts and orders below are synthetic and stay
-- inside this rolled-back transaction. No Auth API, e-mail or Mercado Pago call.
-- PostgreSQL identity sequences are non-transactional: order_items IDs may have
-- harmless gaps after this test; never reset a live sequence to hide those gaps.
begin;
set local statement_timeout = '20s';
set local lock_timeout = '2s';

do $verification$
declare
  v_a uuid := gen_random_uuid();
  v_b uuid := gen_random_uuid();
  v_email_a text := 'commerce-check-a-' || v_a::text || '@example.invalid';
  v_email_b text := 'commerce-check-b-' || v_b::text || '@example.invalid';
  v_operation uuid := gen_random_uuid();
  v_key uuid := gen_random_uuid();
  v_order uuid;
  v_result jsonb;
  v_retry jsonb;
  v_item jsonb;
  v_variant jsonb;
  v_items jsonb;
  v_address jsonb;
  v_quote jsonb;
  v_product record;
  v_size jsonb;
  v_size_id text;
  v_flavor_id text;
  v_unit numeric;
  v_expected numeric;
  v_zip text;
  v_count bigint;
  v_rejected boolean;
  v_has_flavors boolean;
  v_found boolean := false;
begin
  -- Stop rather than risk running an unknown webhook or side-effect trigger.
  -- The only permitted user trigger is the known local profile insert, whose
  -- definition must also be reviewed by the operator before executing the file.
  if exists (
    select 1 from pg_trigger t
    where not t.tgisinternal
      and t.tgrelid in ('auth.users'::regclass, 'public.customer_profiles'::regclass,
        'public.customer_carts'::regclass, 'public.customer_cart_operations'::regclass,
        'public.orders'::regclass, 'public.order_items'::regclass)
      and not (t.tgrelid = 'auth.users'::regclass and t.tgname = 'on_auth_user_created'
        and t.tgfoid = 'public.handle_new_customer()'::regprocedure)
  ) then raise exception 'verification_requires_review_of_unexpected_triggers'; end if;

  if has_function_privilege('anon', 'public.customer_cart_sync(jsonb)', 'EXECUTE')
    or not has_function_privilege('authenticated', 'public.customer_cart_sync(jsonb)', 'EXECUTE')
    or has_function_privilege('authenticated', 'public.create_checkout_order_v2(uuid,text,uuid,jsonb,jsonb,text)', 'EXECUTE')
  then raise exception 'verification_function_grants_failed'; end if;

  insert into auth.users (id, email, aud, role, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
    values (v_a, v_email_a, 'authenticated', 'authenticated', '{}'::jsonb, '{}'::jsonb, now(), now()),
      (v_b, v_email_b, 'authenticated', 'authenticated', '{}'::jsonb, '{}'::jsonb, now(), now());

  -- This is a display snapshot, not a catalogue/payment fixture.
  v_item := jsonb_build_object('id', '999999999', 'name', 'Synthetic cart fixture',
    'quantity', 2, 'price', 0.01, 'size', 'verification-small', 'flavor', 'natural');
  perform set_config('request.jwt.claim.sub', v_a::text, true);
  perform set_config('request.jwt.claims', jsonb_build_object('sub', v_a, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  v_result := public.customer_cart_sync(jsonb_build_array(jsonb_build_object('id', v_operation, 'type', 'add', 'item', v_item)));
  v_retry := public.customer_cart_sync(jsonb_build_array(jsonb_build_object('id', v_operation, 'type', 'add', 'item', v_item)));
  if jsonb_array_length(v_retry -> 'items') <> 1 or (v_retry #>> '{items,0,quantity}')::integer <> 2
    or v_result -> 'items' <> v_retry -> 'items'
  then raise exception 'verification_cart_retry_doubled_or_changed'; end if;

  v_variant := v_item || jsonb_build_object('size', 'verification-large', 'quantity', 4);
  v_result := public.customer_cart_sync(jsonb_build_array(
    jsonb_build_object('id', gen_random_uuid(), 'type', 'add', 'item', v_variant),
    jsonb_build_object('id', gen_random_uuid(), 'type', 'quantity', 'key', '999999999|verification-small|natural', 'quantity', 7)
  ));
  if jsonb_array_length(v_result -> 'items') <> 2 or not exists (
    select 1 from jsonb_array_elements(v_result -> 'items') i
      where i ->> 'key' = '999999999|verification-small|natural' and (i ->> 'quantity')::integer = 7
  ) then raise exception 'verification_cart_variants_or_quantity_failed'; end if;
  v_result := public.customer_cart_sync(jsonb_build_array(
    jsonb_build_object('id', gen_random_uuid(), 'type', 'merge', 'item', v_item),
    jsonb_build_object('id', gen_random_uuid(), 'type', 'remove', 'key', '999999999|verification-large|natural')
  ));
  if jsonb_array_length(v_result -> 'items') <> 1 or (v_result #>> '{items,0,quantity}')::integer <> 7
  then raise exception 'verification_cart_merge_or_remove_failed'; end if;

  -- Direct writes and receipt access stay unavailable, even to the owner.
  v_rejected := false;
  begin update public.customer_carts set items = '[]'::jsonb where customer_id = v_a;
  exception when insufficient_privilege then v_rejected := true; end;
  if not v_rejected then raise exception 'verification_direct_cart_write_not_denied'; end if;
  v_rejected := false;
  begin perform 1 from public.customer_cart_operations;
  exception when insufficient_privilege then v_rejected := true; end;
  if not v_rejected then raise exception 'verification_cart_receipts_exposed'; end if;

  perform set_config('request.jwt.claim.sub', v_b::text, true);
  perform set_config('request.jwt.claims', jsonb_build_object('sub', v_b, 'role', 'authenticated')::text, true);
  v_result := public.customer_cart_sync('[]'::jsonb);
  if jsonb_array_length(v_result -> 'items') <> 0 then raise exception 'verification_other_customer_cart_leaked'; end if;
  v_result := public.customer_cart_sync(jsonb_build_array(jsonb_build_object('id', gen_random_uuid(), 'type', 'add', 'item', v_item || '{"quantity":1}'::jsonb)));
  select count(*) into v_count from public.customer_carts where customer_id = v_a;
  if v_count <> 0 then raise exception 'verification_rls_customer_a_visible_to_b'; end if;
  select count(*) into v_count from public.customer_carts;
  if v_count <> 1 then raise exception 'verification_rls_not_restricted_to_one_customer'; end if;

  perform set_config('request.jwt.claim.sub', v_a::text, true);
  perform set_config('request.jwt.claims', jsonb_build_object('sub', v_a, 'role', 'authenticated')::text, true);
  v_result := public.customer_cart_sync('[]'::jsonb);
  if (v_result #>> '{items,0,quantity}')::integer <> 7 then raise exception 'verification_customer_b_changed_a_cart'; end if;
  select count(*) into v_count from public.customer_carts where customer_id = v_b;
  if v_count <> 0 then raise exception 'verification_rls_customer_b_visible_to_a'; end if;

  perform set_config('request.jwt.claim.sub', '', true);
  perform set_config('request.jwt.claims', '{"role":"authenticated"}', true);
  if auth.uid() is not null then raise exception 'verification_claim_reset_failed'; end if;
  v_rejected := false;
  begin perform public.customer_cart_sync('[]'::jsonb);
  exception when insufficient_privilege then v_rejected := true; end;
  if not v_rejected then raise exception 'verification_null_claim_not_rejected'; end if;
  execute 'set local role anon';
  v_rejected := false;
  begin perform public.customer_cart_sync('[]'::jsonb);
  exception when insufficient_privilege then v_rejected := true; end;
  if not v_rejected then raise exception 'verification_anon_rpc_not_rejected'; end if;
  execute 'reset role';

  -- Select only public product catalogue fields, never existing customer/order
  -- data. Choose a product with valid configured price and required options.
  for v_product in select id, price, options from public.produtos order by id loop
    v_size_id := null; v_flavor_id := null; v_size := null; v_unit := null;
    if jsonb_typeof(v_product.options -> 'sizes') = 'array' and jsonb_array_length(v_product.options -> 'sizes') > 0 then
      select s into v_size from jsonb_array_elements(v_product.options -> 'sizes') s
        where case when jsonb_typeof(s -> 'price') = 'number' then (s ->> 'price')::numeric > 0 else false end
          and nullif(s ->> 'id', '') is not null limit 1;
      if v_size is null then continue; end if;
      v_size_id := v_size ->> 'id'; v_unit := (v_size ->> 'price')::numeric;
    else v_unit := v_product.price;
    end if;
    if v_unit is null or v_unit <= 0 then continue; end if;
    v_has_flavors := coalesce((v_product.options ->> 'natural')::boolean, false)
      or (jsonb_typeof(v_product.options -> 'flavors') = 'array' and jsonb_array_length(v_product.options -> 'flavors') > 0);
    if v_has_flavors then
      if coalesce((v_product.options ->> 'natural')::boolean, false) then v_flavor_id := 'natural';
      else
        select f.id into v_flavor_id from public.sabores f where coalesce(v_product.options -> 'flavors', '[]'::jsonb) ? f.id order by f.id limit 1;
        if v_flavor_id is null then continue; end if;
        v_unit := v_unit + greatest(coalesce((v_product.options ->> 'flavor_price')::numeric, 0), 0);
      end if;
    end if;
    v_found := true; exit;
  end loop;
  if not v_found then raise exception 'verification_requires_one_purchasable_catalogue_product'; end if;
  v_expected := round(v_unit * 2, 2);
  for v_zip in select unnest(array['01310100','20040020','28905060','30140071','80010000','70040900']) loop
    v_quote := public.shipping_quote(v_zip, v_expected);
    exit when coalesce((v_quote ->> 'ok')::boolean, false);
  end loop;
  if not coalesce((v_quote ->> 'ok')::boolean, false) then raise exception 'verification_requires_one_available_shipping_zone'; end if;
  v_address := jsonb_build_object('name', 'Synthetic commerce verification', 'document', '00000000000',
    'phone', '21999999999', 'zip', v_zip, 'street', 'Synthetic address', 'number', '0',
    'district', 'Synthetic district', 'city', 'Synthetic city', 'state', v_quote ->> 'uf');
  v_items := jsonb_build_array(jsonb_strip_nulls(jsonb_build_object('product_id', v_product.id,
    'quantity', 2, 'size', v_size_id, 'flavor', v_flavor_id, 'price', 0.01, 'unit_price', 0.01)));
  v_result := public.create_checkout_order_v2(v_a, v_email_a, v_key, v_items, v_address, null);
  v_order := (v_result ->> 'order_id')::uuid;
  if v_order is null or (v_result ->> 'subtotal')::numeric <> v_expected
    or (v_result ->> 'shipping')::numeric <> (v_quote ->> 'amount')::numeric
    or (v_result ->> 'total')::numeric <> v_expected + (v_quote ->> 'amount')::numeric
  then raise exception 'verification_server_price_or_shipping_failed'; end if;
  select count(*) into v_count from public.order_items where order_id = v_order and quantity = 2 and unit_price = round(v_unit, 2);
  if v_count <> 1 then raise exception 'verification_order_items_price_or_quantity_failed'; end if;
  v_retry := public.create_checkout_order_v2(v_a, v_email_a, v_key, v_items, v_address, null);
  if v_retry ->> 'order_id' is distinct from v_result ->> 'order_id'
    or v_retry -> 'subtotal' is distinct from v_result -> 'subtotal'
    or v_retry -> 'shipping' is distinct from v_result -> 'shipping'
    or v_retry -> 'total' is distinct from v_result -> 'total'
    or coalesce(nullif(v_retry #> '{items,0,variant}', 'null'::jsonb), '{}'::jsonb)
      is distinct from coalesce(nullif(v_result #> '{items,0,variant}', 'null'::jsonb), '{}'::jsonb)
  then raise exception 'verification_checkout_retry_changed_order'; end if;
  select count(*) into v_count from public.order_items where order_id = v_order;
  if v_count <> 1 then raise exception 'verification_checkout_retry_duplicated_items'; end if;
  v_rejected := false;
  begin perform public.create_checkout_order_v2(v_b, v_email_b, v_key, v_items, v_address, null);
  exception when raise_exception then if sqlerrm = 'checkout_key_conflict' then v_rejected := true; else raise; end if; end;
  if not v_rejected then raise exception 'verification_checkout_cross_customer_retry_not_denied'; end if;

  -- A paid order settles only its own variant, once, and cannot be paid again.
  update public.orders set payment_status = 'paid', status = 'paid', paid_at = now() where id = v_order;
  v_rejected := false;
  begin perform public.create_checkout_order_v2(v_a, v_email_a, v_key, v_items, v_address, null);
  exception when raise_exception then if sqlerrm = 'checkout_already_completed' then v_rejected := true; else raise; end if; end;
  if not v_rejected then raise exception 'verification_paid_checkout_retry_not_denied'; end if;
  perform set_config('request.jwt.claim.sub', v_a::text, true);
  perform set_config('request.jwt.claims', jsonb_build_object('sub', v_a, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  v_item := jsonb_strip_nulls(jsonb_build_object('id', v_product.id::text, 'name', 'Synthetic cart settlement',
    'quantity', 5, 'price', v_unit, 'size', v_size_id, 'flavor', v_flavor_id));
  perform public.customer_cart_sync(jsonb_build_array(
    jsonb_build_object('id', gen_random_uuid(), 'type', 'clear'),
    jsonb_build_object('id', gen_random_uuid(), 'type', 'add', 'item', v_item)));
  v_result := public.customer_cart_sync(jsonb_build_array(jsonb_build_object('id', v_order, 'type', 'settle', 'order_id', v_order)));
  v_retry := public.customer_cart_sync(jsonb_build_array(jsonb_build_object('id', v_order, 'type', 'settle', 'order_id', v_order)));
  if (v_retry #>> '{items,0,quantity}')::integer <> 3 or v_result -> 'items' <> v_retry -> 'items'
  then raise exception 'verification_paid_cart_settlement_not_idempotent'; end if;
  perform set_config('request.jwt.claim.sub', v_b::text, true);
  perform set_config('request.jwt.claims', jsonb_build_object('sub', v_b, 'role', 'authenticated')::text, true);
  v_rejected := false;
  begin perform public.customer_cart_sync(jsonb_build_array(jsonb_build_object('id', v_order, 'type', 'settle', 'order_id', v_order)));
  exception when raise_exception then if sqlerrm = 'invalid_cart_order' then v_rejected := true; else raise; end if; end;
  if not v_rejected then raise exception 'verification_other_customer_settlement_not_denied'; end if;
  execute 'reset role';
  raise notice 'Commerce database checks passed; synthetic users, carts, orders and operation receipts will be rolled back.';
end;
$verification$;
rollback;
