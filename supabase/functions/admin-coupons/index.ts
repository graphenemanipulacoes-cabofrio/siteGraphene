import { createClient } from 'npm:@supabase/supabase-js@2.87.1';
import { allowedOrigin, json } from '../_shared/http.ts';

// Cupons dos parceiros no admin: desconto geral e % por produto.
// Mesmo login do painel (x-admin-token), conferido em admin_sessions.
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const encoder = new TextEncoder();
const sha256 = async (value: string) => [...new Uint8Array(await crypto.subtle.digest('SHA-256', encoder.encode(value)))]
  .map(byte => byte.toString(16).padStart(2, '0')).join('');

Deno.serve(async (req: Request) => {
  const origin = allowedOrigin(req.headers.get('origin'));
  if (req.method === 'OPTIONS') return json({}, origin ? 204 : 403, origin || undefined);
  if (!origin || req.method !== 'POST') return json({ error: 'request_not_allowed' }, 403, origin || undefined);

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const token = req.headers.get('x-admin-token') || '';
  if (token.length < 32 || token.length > 100) return json({ error: 'unauthorized' }, 401, origin);
  const now = new Date().toISOString();
  const { data: session } = await admin.from('admin_sessions').select('admin_username').eq('token_hash', await sha256(token)).gt('expires_at', now).maybeSingle();
  if (!session) return json({ error: 'unauthorized' }, 401, origin);

  try {
    const raw = await req.text();
    if (raw.length > 20000) return json({ error: 'invalid_request' }, 400, origin);
    const body = JSON.parse(raw);

    if (body.action === 'list') {
      const { data, error } = await admin.from('coupon_product_discounts').select('coupon_id,product_id,discount_percent');
      if (error) return json({ error: 'unable_to_load' }, 500, origin);
      return json({ productDiscounts: data || [] }, 200, origin);
    }

    // Desconto geral do cupom (% ou valor fixo, conforme o tipo do cupom).
    if (body.action === 'update_coupon_discount') {
      const id = typeof body.id === 'string' ? body.id : '';
      const discountValue = Number(body.discountValue);
      if (!uuidPattern.test(id) || !Number.isFinite(discountValue) || discountValue <= 0) return json({ error: 'invalid_coupon' }, 400, origin);
      const { data: current } = await admin.from('discount_coupons').select('discount_type').eq('id', id).maybeSingle();
      if (!current) return json({ error: 'coupon_not_found' }, 404, origin);
      if (current.discount_type === 'percentage' && discountValue > 100) return json({ error: 'invalid_coupon' }, 400, origin);
      const { data, error } = await admin.from('discount_coupons').update({ discount_value: Math.round(discountValue * 100) / 100, updated_at: now })
        .eq('id', id).select('*,commission_recipients(name)').single();
      if (error) return json({ error: 'unable_to_update_coupon' }, 500, origin);
      return json({ coupon: data }, 200, origin);
    }

    // Produtos com % próprio no cupom: a lista enviada substitui a anterior.
    if (body.action === 'save_product_discounts') {
      const couponId = typeof body.couponId === 'string' ? body.couponId : '';
      const items = Array.isArray(body.items) ? body.items : null;
      if (!uuidPattern.test(couponId) || !items || items.length > 200) return json({ error: 'invalid_product_discounts' }, 400, origin);
      const rows = new Map<number, number>();
      for (const item of items) {
        const productId = Number(item?.productId);
        const percent = Number(item?.percent);
        if (!Number.isSafeInteger(productId) || productId <= 0 || !Number.isFinite(percent) || percent <= 0 || percent > 100) return json({ error: 'invalid_product_discounts' }, 400, origin);
        rows.set(productId, Math.round(percent * 100) / 100);
      }
      const { data: coupon } = await admin.from('discount_coupons').select('id').eq('id', couponId).maybeSingle();
      if (!coupon) return json({ error: 'coupon_not_found' }, 404, origin);
      const keep = [...rows.keys()];
      const removal = admin.from('coupon_product_discounts').delete().eq('coupon_id', couponId);
      const { error: deleteError } = keep.length ? await removal.not('product_id', 'in', `(${keep.join(',')})`) : await removal;
      if (deleteError) return json({ error: 'unable_to_save_product_discounts' }, 500, origin);
      if (keep.length) {
        const { error: upsertError } = await admin.from('coupon_product_discounts').upsert(
          keep.map(productId => ({ coupon_id: couponId, product_id: productId, discount_percent: rows.get(productId), updated_at: now })),
          { onConflict: 'coupon_id,product_id' },
        );
        if (upsertError) return json({ error: upsertError.code === '23503' ? 'product_not_found' : 'unable_to_save_product_discounts' }, 500, origin);
      }
      const { data, error } = await admin.from('coupon_product_discounts').select('coupon_id,product_id,discount_percent').eq('coupon_id', couponId);
      if (error) return json({ error: 'unable_to_load' }, 500, origin);
      return json({ productDiscounts: data || [] }, 200, origin);
    }

    return json({ error: 'invalid_action' }, 400, origin);
  } catch {
    return json({ error: 'internal_error' }, 500, origin);
  }
});
