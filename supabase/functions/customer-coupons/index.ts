import { createClient } from 'npm:@supabase/supabase-js@2.87.1';
import { allowedOrigin, json } from '../_shared/http.ts';

type Line = { productId: number; amount: number };

// Leitura dos itens do carrinho para a estimativa: id do produto e total da linha.
function readLines(value: unknown): Line[] | null {
  if (value == null) return [];
  if (!Array.isArray(value) || value.length > 50) return null;
  const lines: Line[] = [];
  for (const item of value) {
    const productId = Number((item as Record<string, unknown>)?.productId);
    const amount = Number((item as Record<string, unknown>)?.amount);
    if (!Number.isSafeInteger(productId) || productId <= 0 || !Number.isFinite(amount) || amount < 0 || amount > 1_000_000) return null;
    lines.push({ productId, amount });
  }
  return lines;
}

Deno.serve(async (req: Request) => {
  const origin = allowedOrigin(req.headers.get('origin'));
  if (req.method === 'OPTIONS') return json({}, origin ? 204 : 403, origin || undefined);
  if (!origin || req.method !== 'POST') return json({ error: 'request_not_allowed' }, 403, origin || undefined);
  try {
    const raw = await req.text();
    if (raw.length > 6000) return json({ error: 'invalid_request' }, 400, origin);
    let body;
    try { body = JSON.parse(raw); } catch { return json({ error: 'invalid_request' }, 400, origin); }
    if (!body || !['search', 'validate'].includes(body.action)) return json({ error: 'invalid_request' }, 400, origin);

    // Busca por nome do parceiro: só para clientes logados.
    // Validação do código exato: também para visitantes (página do produto),
    // sem listar catálogo nem revelar dados do parceiro além do primeiro nome.
    if (body.action === 'search') {
      const authorization = req.headers.get('Authorization') || '';
      if (!authorization.startsWith('Bearer ')) return json({ error: 'authentication_required' }, 401, origin);
      const auth = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
        global: { headers: { Authorization: authorization } }, auth: { persistSession: false, autoRefreshToken: false },
      });
      const { data: { user }, error: authError } = await auth.auth.getUser();
      if (authError || !user?.id) return json({ error: 'authentication_required' }, 401, origin);
    }

    const query = typeof body.query === 'string' ? body.query.trim().toUpperCase() : '';
    // No wildcards, arbitrary PostgREST filters or unbounded catalogue listing.
    if (query.length < 3 || query.length > 40 || !/^[\p{L}0-9 _-]+$/u.test(query)) {
      return body.action === 'search' ? json({ coupons: [] }, 200, origin) : json({ error: 'invalid_coupon' }, 422, origin);
    }
    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data, error } = await admin.rpc('lookup_checkout_coupons', { p_query: query, p_exact: body.action === 'validate' });
    if (error) throw new Error('lookup_failed');
    // Explicit projection: never return recipient IDs, contacts or commissions.
    const coupons = (data || []).slice(0, 6).map((row: Record<string, unknown>) => ({
      code: String(row.code), partnerName: String(row.partner_name),
      discountType: String(row.discount_type), discountValue: Number(row.discount_value), minimumOrderAmount: Number(row.minimum_order_amount),
    }));
    if (body.action === 'search') return json({ coupons }, 200, origin);
    const coupon = coupons[0];
    if (!coupon) return json({ error: 'invalid_coupon' }, 422, origin);

    const { data: rateRows, error: ratesError } = await admin.rpc('checkout_coupon_product_rates', { p_code: coupon.code });
    if (ratesError) throw new Error('rates_failed');
    const productRates: { productId: number; percent: number }[] = (rateRows || []).map((row: Record<string, unknown>) => ({ productId: Number(row.product_id), percent: Number(row.discount_percent) }));

    // Itens do carrinho (novo) ou só o subtotal (versão anterior do site).
    let lines = readLines(body.items);
    if (lines === null) return json({ error: 'invalid_items' }, 400, origin);
    if (!lines.length && body.subtotal != null) {
      if (typeof body.subtotal !== 'number' || !Number.isFinite(body.subtotal) || body.subtotal < 0 || body.subtotal > 10_000_000) return json({ error: 'invalid_subtotal' }, 400, origin);
      if (body.subtotal > 0) lines = [{ productId: 0, amount: body.subtotal }];
    }
    const result = { ...coupon, productRates, discountAmount: 0 };
    const cents = lines.reduce((sum, line) => sum + Math.round(line.amount * 100), 0);
    // Carrinho vazio (página do produto): só as regras do cupom, sem valor.
    if (cents <= 0) return json({ coupon: result }, 200, origin);
    if (cents < Math.round(coupon.minimumOrderAmount * 100)) {
      return json({ error: 'coupon_minimum_not_reached', minimumOrderAmount: coupon.minimumOrderAmount }, 422, origin);
    }
    // Mesma regra do checkout: % do produto no cupom; senão a regra geral.
    const rates = new Map<number, number>(productRates.map(item => [item.productId, item.percent]));
    let rated = 0; // centavos × (percentual × 100)
    let generalBase = 0;
    for (const line of lines) {
      const lineCents = Math.round(line.amount * 100);
      const specific = rates.get(line.productId);
      if (specific != null) rated += lineCents * Math.round(specific * 100);
      else {
        generalBase += lineCents;
        if (coupon.discountType === 'percentage') rated += lineCents * Math.round(coupon.discountValue * 100);
      }
    }
    let discountCents = Math.floor((rated + 5000) / 10000);
    if (coupon.discountType !== 'percentage') discountCents += Math.min(Math.round(coupon.discountValue * 100), generalBase);
    discountCents = Math.min(discountCents, cents);
    // Read-only estimate. The checkout RPC remains authoritative and
    // creates the order/attribution once; this endpoint never reserves a use.
    return json({ coupon: { ...result, discountAmount: discountCents / 100 } }, 200, origin);
  } catch {
    return json({ error: 'coupons_unavailable' }, 503, origin);
  }
});
