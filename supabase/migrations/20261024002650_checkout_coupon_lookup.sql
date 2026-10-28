-- Private lookup for the authenticated customer-coupons Edge Function only.
-- No table grants, public SECURITY DEFINER function, new coupons or redemptions.
create or replace function public.lookup_checkout_coupons(p_query text, p_exact boolean default false)
returns table (code text, partner_name text, discount_type text, discount_value numeric, minimum_order_amount numeric)
language sql stable security invoker set search_path = ''
as $$
  select c.code,
    upper(split_part(btrim(r.name), ' ', 1)) as partner_name,
    c.discount_type, c.discount_value, c.minimum_order_amount
  from public.discount_coupons c
  join public.commission_recipients r on r.id = c.recipient_id and r.is_active
  where char_length(btrim(p_query)) between 3 and 40
    and c.is_active
    and (c.starts_at is null or c.starts_at <= now())
    and (c.ends_at is null or c.ends_at > now())
    and (c.max_redemptions is null or c.redeemed_count < c.max_redemptions)
    and case when p_exact then c.code = upper(btrim(p_query)) else
      starts_with(c.code, upper(btrim(p_query)))
      or starts_with(
        translate(upper(split_part(btrim(r.name), ' ', 1)), 'ÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇ', 'AAAAAEEEEIIIIOOOOOUUUUC'),
        translate(upper(btrim(p_query)), 'ÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇ', 'AAAAAEEEEIIIIOOOOOUUUUC')
      ) end
  order by (c.code = upper(btrim(p_query))) desc, c.code
  limit 6;
$$;
revoke all on function public.lookup_checkout_coupons(text, boolean) from public, anon, authenticated;
grant execute on function public.lookup_checkout_coupons(text, boolean) to service_role;
