import { createClient } from 'npm:@supabase/supabase-js@2';
import { allowedOrigin, json } from '../_shared/http.ts';
import { ensureAuthAccount, hashToken, logAdminAction, normalizeEmail, requestIdPattern, uuidPattern, validAccountPassword, validEmail } from '../_shared/counter-security.ts';
import { buildPartnerReport, monthKey, todayInBrazil } from '../_shared/partner-results.ts';
import { buildCustomerReport, customerKeyPattern } from '../_shared/customer-insights.ts';
import { mpFetch, mpInProcessRefundsHeader, mpPaymentIdPattern, normalizePayment } from '../_shared/mercado-pago.ts';

const sha256 = hashToken;
const clean = (value: unknown, max: number) => typeof value === 'string' ? value.trim().slice(0, max) : '';
// intake/: current form. legacy/: first-form files moved from the public bucket in Oct/2026.
const privateRecipePathPattern = /^(?:intake\/[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}|legacy\/\d{13}_[a-z0-9]{5,6})\.(?:jpg|jpeg|png|pdf)$/i;
const productImageTypes: Record<string, string> = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp' };
const legacyRecipeFilenamePattern = /^\d{13}_[a-z0-9]{5,6}\.(?:jpg|jpeg|png|pdf)$/i;
// Files from the first form were moved out of the public bucket in Oct/2026.
const legacyPrivatePath = (filename: string) => `legacy/${filename}`;
const prescriptionBucket = 'receitas-privadas';
const allowedStatuses = new Set(['awaiting_payment', 'paid', 'processing', 'shipped', 'delivered', 'cancelled']);
const recipientRoles = new Set(['influencer', 'marketing', 'development', 'other']);
const commissionTypes = new Set(['percentage', 'fixed']);
const attributionScopes = new Set(['coupon', 'all_paid_orders']);
// Ações que entram no registro da administração quando dão certo.
const auditedActions = new Set(['add_admin', 'delete_admin', 'approve_partner', 'reject_partner', 'create_recipient', 'update_recipient', 'create_coupon', 'toggle_coupon', 'settle_recipient_commissions', 'add_partner_product_credit', 'record_partner_product_usage', 'delete_partner_credit_entry', 'update_request_status', 'delete_request', 'update', 'save_cost_settings', 'save_product_cost', 'save_partner_terms', 'save_partner_delivery', 'save_customer_followup', 'add_customer_note', 'delete_customer_note', 'log_customer_export']);
const partnerPhases = new Set(['test', 'active', 'half_vale', 'commission_only', 'ended']);
const percentIn = (value: unknown, max: number) => { const number = Number(value); return value !== '' && value !== null && value !== undefined && Number.isFinite(number) && number >= 0 && number <= max ? number : null; };
const wholeIn = (value: unknown, max: number) => { const number = Number(value); return Number.isInteger(number) && number >= 0 && number <= max ? number : null; };
const validDay = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`));
// Pagamentos que pedem atenção no Financeiro (payment_events.decision gravado pela apply_mp_payment).
const paymentAlertDecisions = ['duplicate_approved', 'amount_mismatch', 'refunded_after_fulfillment', 'mediation', 'partial_refund', 'reversal_other', 'duplicate_order'];
// Recusa definitiva do estorno: a próxima tentativa usa outra chave de repetição.
const definitiveRefundFailure = (status: number) => status >= 400 && status < 500 && ![401, 403, 408, 409, 423, 429].includes(status);

// Lê a tabela inteira em páginas, para o relatório nunca sair cortado sem aviso.
// deno-lint-ignore no-explicit-any
async function readAll(query: (from: number, to: number) => PromiseLike<{ data: any[] | null; error: unknown }>) {
  const rows = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await query(from, from + 999);
    if (error) throw error;
    rows.push(...(data || []));
    if (!data || data.length < 1000) return rows;
  }
}

// Todas as contas do site, em páginas. Só o e-mail, o nome e as datas seguem para o relatório.
// deno-lint-ignore no-explicit-any
async function readAllAccounts(db: any) {
  const users = [];
  for (let page = 1; ; page += 1) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    users.push(...(data?.users || []));
    if (!data?.users || data.users.length < 1000) return users;
  }
}

Deno.serve(async (req: Request) => {
  const origin = allowedOrigin(req.headers.get('origin'));
  if (req.method === 'OPTIONS') return json({}, origin ? 204 : 403, origin || undefined);
  if (!origin || req.method !== 'POST') return json({ error: 'request_not_allowed' }, 403, origin || undefined);

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const token = req.headers.get('x-admin-token') || '';
  if (token.length < 32 || token.length > 100) return json({ error: 'unauthorized' }, 401, origin);
  const tokenHash = await sha256(token);
  const now = new Date().toISOString();
  const { data: session } = await admin.from('admin_sessions').select('admin_username,expires_at').eq('token_hash', tokenHash).gt('expires_at', now).maybeSingle();
  if (!session) return json({ error: 'unauthorized' }, 401, origin);
  await admin.from('admin_sessions').update({ last_used_at: now }).eq('token_hash', tokenHash);

  try {
    const body = await req.json();
    const handle = async () => {
    if (body.action === 'logout') {
      await admin.from('admin_sessions').delete().eq('token_hash', tokenHash);
      return json({ ok: true }, 200, origin);
    }

    // Product photos: the admin receives a single-use signed upload URL. The
    // public bucket no longer accepts anonymous uploads.
    if (body.action === 'product_image_upload') {
      const extension = clean(body.extension, 5).toLowerCase();
      if (!productImageTypes[extension]) return json({ error: 'invalid_image_type' }, 400, origin);
      const path = `products/product_${Date.now()}_${crypto.randomUUID().slice(0, 8)}.${extension}`;
      const { data, error } = await admin.storage.from('receitas').createSignedUploadUrl(path);
      if (error || !data?.token) return json({ error: 'unable_to_prepare_upload' }, 500, origin);
      return json({ path: data.path, token: data.token, contentType: productImageTypes[extension] }, 200, origin);
    }

    if (body.action === 'list_requests') {
      const { data, error } = await admin.from('solicitacoes')
        .select('id,created_at,nome_cliente,whatsapp,arquivo_url,status,observacoes')
        .order('created_at', { ascending: false }).limit(300);
      if (error) return json({ error: 'unable_to_load_requests' }, 500, origin);
      return json({ requests: data || [] }, 200, origin);
    }

    if (body.action === 'get_request_files') {
      const requestId = clean(String(body.requestId ?? ''), 18);
      if (!requestIdPattern.test(requestId)) return json({ error: 'invalid_request_id' }, 400, origin);
      const { data: request, error } = await admin.from('solicitacoes').select('arquivo_url').eq('id', requestId).maybeSingle();
      if (error || !request) return json({ error: 'request_not_found' }, 404, origin);

      let references: string[] = [];
      try {
        const parsed = JSON.parse(request.arquivo_url || '[]');
        references = Array.isArray(parsed) ? parsed.filter((value: unknown) => typeof value === 'string').slice(0, 15) : [];
      } catch {
        if (typeof request.arquivo_url === 'string' && request.arquivo_url) references = [request.arquivo_url];
      }

      const supabaseUrl = new URL(Deno.env.get('SUPABASE_URL')!);
      const files: Array<{ url: string; name: string; private: boolean }> = [];
      for (const reference of references) {
        if (privateRecipePathPattern.test(reference)) {
          const { data: signed, error: signedError } = await admin.storage.from(prescriptionBucket).createSignedUrl(reference, 300);
          if (!signedError && signed?.signedUrl) files.push({ url: signed.signedUrl, name: reference.split('/').pop() || 'documento', private: true });
          continue;
        }

        // Old references still hold the former public URL. Accept only
        // same-project URLs in the legacy filename format and sign the moved
        // private copy. Never turn a user-supplied external link into an admin link.
        try {
          const legacyUrl = new URL(reference);
          const prefix = '/storage/v1/object/public/receitas/';
          const encodedPath = legacyUrl.pathname.startsWith(prefix) ? legacyUrl.pathname.slice(prefix.length) : '';
          const legacyPath = decodeURIComponent(encodedPath);
          if (legacyUrl.origin === supabaseUrl.origin && legacyRecipeFilenamePattern.test(legacyPath)) {
            const { data: signed, error: signedError } = await admin.storage.from(prescriptionBucket).createSignedUrl(legacyPrivatePath(legacyPath), 300);
            if (!signedError && signed?.signedUrl) files.push({ url: signed.signedUrl, name: legacyPath, private: true });
          }
        } catch {
          // Invalid legacy references are intentionally omitted.
        }
      }
      return json({ files }, 200, origin);
    }

    if (body.action === 'update_request_status') {
      const requestId = clean(String(body.requestId ?? ''), 18);
      const status = clean(body.status, 20);
      if (!requestIdPattern.test(requestId) || !['active', 'trash'].includes(status)) return json({ error: 'invalid_request_update' }, 400, origin);
      const { data, error } = await admin.from('solicitacoes').update({ status }).eq('id', requestId).select('id,status').maybeSingle();
      if (error || !data) return json({ error: 'unable_to_update_request' }, 500, origin);
      return json({ request: data }, 200, origin);
    }

    if (body.action === 'delete_request') {
      const requestId = clean(String(body.requestId ?? ''), 18);
      if (!requestIdPattern.test(requestId)) return json({ error: 'invalid_request_id' }, 400, origin);
      const { data: request, error: requestError } = await admin.from('solicitacoes').select('arquivo_url').eq('id', requestId).maybeSingle();
      if (requestError || !request) return json({ error: 'request_not_found' }, 404, origin);

      let references: string[] = [];
      try {
        const parsed = JSON.parse(request.arquivo_url || '[]');
        references = Array.isArray(parsed) ? parsed.filter((value: unknown) => typeof value === 'string').slice(0, 15) : [];
      } catch {
        if (typeof request.arquivo_url === 'string' && request.arquivo_url) references = [request.arquivo_url];
      }

      const privatePaths = references.filter(path => privateRecipePathPattern.test(path));
      const supabaseUrl = new URL(Deno.env.get('SUPABASE_URL')!);
      const legacyPaths: string[] = [];
      for (const reference of references) {
        try {
          const legacyUrl = new URL(reference);
          const prefix = '/storage/v1/object/public/receitas/';
          const encodedPath = legacyUrl.pathname.startsWith(prefix) ? legacyUrl.pathname.slice(prefix.length) : '';
          const legacyPath = decodeURIComponent(encodedPath);
          if (legacyUrl.origin === supabaseUrl.origin && legacyRecipeFilenamePattern.test(legacyPath)) legacyPaths.push(legacyPrivatePath(legacyPath));
        } catch {
          // Ignore malformed values rather than removing arbitrary storage objects.
        }
      }

      const filesToRemove = [...privatePaths, ...legacyPaths];
      if (filesToRemove.length) {
        const { error } = await admin.storage.from(prescriptionBucket).remove(filesToRemove);
        if (error) return json({ error: 'unable_to_remove_request_files' }, 500, origin);
      }
      const { error } = await admin.from('solicitacoes').delete().eq('id', requestId);
      if (error) return json({ error: 'unable_to_delete_request' }, 500, origin);
      return json({ ok: true }, 200, origin);
    }

    if (body.action === 'list') {
      const { data, error } = await admin.from('orders').select(`
        id,customer_email,customer_document,shipping_address,subtotal,shipping_amount,total,status,
        payment_status,payment_reference,paid_payment_id,payment_provider,payment_method,payment_details,paid_at,carrier,tracking_code,
        invoice_number,invoice_url,admin_notes,shipped_at,delivered_at,created_at,updated_at,
        order_items(id,product_id,product_name,unit_price,quantity),
        payment_attempts(id,method,status,status_detail,provider_payment_id,amount,installments,created_at)
      `).order('created_at', { ascending: false }).limit(250);
      if (error) return json({ error: 'unable_to_load_orders' }, 500, origin);
      return json({ orders: data || [] }, 200, origin);
    }

    if (body.action === 'finance_dashboard') {
      await admin.rpc('release_available_commissions');
      const alertsSince = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
      const [ordersResult, recipientsResult, couponsResult, commissionsResult, eventsResult, alertsResult] = await Promise.all([
        admin.from('orders').select('id,customer_email,subtotal,discount_code,discount_amount,total,provider_fee,net_amount,payment_provider,payment_status,payment_method,payment_reference,paid_at,status,created_at,commission_recipients(name,role)').order('created_at', { ascending: false }).limit(300),
        admin.from('commission_recipients').select('*').order('created_at', { ascending: false }),
        admin.from('discount_coupons').select('*,commission_recipients(name)').order('created_at', { ascending: false }),
        admin.from('commissions').select('*,commission_recipients(name,role),orders(id,customer_email,discount_code,total,paid_at)').order('created_at', { ascending: false }).limit(500),
        // Atividade recente: só os avisos do Mercado Pago. As linhas de alerta (status 'alert', gravadas pela
        // apply_mp_payment) não são um segundo pagamento e aparecem só em "Pagamentos que pedem atenção".
        admin.from('payment_events').select('*').neq('status', 'alert').order('created_at', { ascending: false }).limit(120),
        admin.from('payment_events').select('id,order_id,provider_payment_id,decision,status,gross_amount,attempt_id,related_order_id,created_at')
          .in('decision', paymentAlertDecisions).gte('created_at', alertsSince).order('created_at', { ascending: false }).limit(500),
      ]);
      if (ordersResult.error || recipientsResult.error || couponsResult.error || commissionsResult.error || eventsResult.error || alertsResult.error) return json({ error: 'unable_to_load_finance' }, 500, origin);
      // Os avisos se repetem: um alerta por (decisão, pagamento), o mais recente, com a situação atual da tentativa.
      const seenAlerts = new Set<string>();
      const alertRows = (alertsResult.data || []).filter((row: Record<string, unknown>) => {
        const key = `${row.decision}:${row.provider_payment_id || row.order_id}`;
        if (seenAlerts.has(key)) return false;
        seenAlerts.add(key);
        return true;
      });
      const attemptIds = [...new Set(alertRows.map((row: Record<string, unknown>) => row.attempt_id).filter((id: unknown) => typeof id === 'string' && uuidPattern.test(id)))];
      const attemptsResult = attemptIds.length ? await admin.from('payment_attempts').select('id,status').in('id', attemptIds) : { data: [], error: null };
      if (attemptsResult.error) return json({ error: 'unable_to_load_finance' }, 500, origin);
      const attemptStatus = new Map<unknown, unknown>((attemptsResult.data || []).map((row: Record<string, unknown>) => [row.id, row.status] as [unknown, unknown]));
      const paymentAlerts = alertRows.map((row: Record<string, unknown>) => ({
        id: row.id, decision: row.decision, order_id: row.order_id, provider_payment_id: row.provider_payment_id, status: row.status,
        gross_amount: row.gross_amount, created_at: row.created_at, attempt_status: attemptStatus.get(row.attempt_id) || null,
        related_order_id: typeof row.related_order_id === 'string' && uuidPattern.test(row.related_order_id) ? row.related_order_id : null,
      }));
      return json({ mercadoPagoConfigured: Boolean(Deno.env.get('MERCADO_PAGO_ACCESS_TOKEN')), orders: ordersResult.data || [], recipients: recipientsResult.data || [], coupons: couponsResult.data || [], commissions: commissionsResult.data || [], paymentEvents: eventsResult.data || [], paymentAlerts }, 200, origin);
    }

    // Resultado das parcerias: vendas, comissões, taxas e vales reais, com os custos privados informados no admin.
    if (body.action === 'partner_results') {
      const requested = clean(body.month, 7);
      const month = /^\d{4}-(0[1-9]|1[0-2])$/.test(requested) ? requested : monthKey(new Date());
      await admin.rpc('release_available_commissions');
      const [settings, recipients, terms, profiles, coupons, productCosts, products, deliveries] = await Promise.all([
        admin.from('partner_cost_settings').select('*').eq('id', 1).maybeSingle(),
        admin.from('commission_recipients').select('id,name,role,commission_type,commission_value,attribution_scope,hold_days,is_active').order('created_at', { ascending: true }),
        admin.from('partner_terms').select('*'),
        admin.from('partner_profiles').select('id,email,commission_recipient_id,status'),
        admin.from('discount_coupons').select('recipient_id,code,discount_type,discount_value,is_active').order('created_at', { ascending: true }),
        admin.from('product_costs').select('product_id,cost_percent'),
        admin.from('produtos').select('id,name,price,is_active').order('name', { ascending: true }),
        admin.from('partner_deliveries').select('recipient_id,month,reels,stories,note'),
      ]);
      if (settings.error || !settings.data || recipients.error || terms.error || profiles.error || coupons.error || productCosts.error || products.error || deliveries.error) return json({ error: 'unable_to_load_results' }, 500, origin);
      const orders = await readAll((from, to) => admin.from('orders')
        .select('id,customer_id,customer_email,subtotal,discount_amount,total,provider_fee,payment_status,paid_at,created_at,attributed_recipient_id,order_items(product_id,unit_price,quantity),commissions(recipient_id,amount,status)')
        .eq('payment_status', 'paid').order('paid_at', { ascending: true }).order('id', { ascending: true }).range(from, to));
      const credits = await readAll((from, to) => admin.from('partner_product_credits').select('partner_id,type,amount,spent_at,created_at').order('created_at', { ascending: true }).order('id', { ascending: true }).range(from, to));
      return json(buildPartnerReport({
        month, today: todayInBrazil(), settings: settings.data, recipients: recipients.data || [], terms: terms.data || [], profiles: profiles.data || [],
        coupons: coupons.data || [], productCosts: productCosts.data || [], products: products.data || [], orders, credits, deliveries: deliveries.data || [],
      }), 200, origin);
    }

    if (body.action === 'save_cost_settings') {
      const values = { default_cost_percent: percentIn(body.defaultCostPercent, 200), packaging_percent: percentIn(body.packagingPercent, 100), tax_percent: percentIn(body.taxPercent, 100), payment_percent: percentIn(body.paymentPercent, 100) };
      if (Object.values(values).some(value => value === null)) return json({ error: 'invalid_costs' }, 400, origin);
      const { error } = await admin.from('partner_cost_settings').update({ ...values, confirmed_at: now, updated_by: session.admin_username, updated_at: now }).eq('id', 1);
      if (error) return json({ error: 'unable_to_save_costs' }, 500, origin);
      return json({ ok: true }, 200, origin);
    }

    if (body.action === 'save_product_cost') {
      const productId = Number(body.productId);
      if (!Number.isSafeInteger(productId) || productId < 1) return json({ error: 'invalid_product' }, 400, origin);
      if (body.costPercent === null || body.costPercent === '') {
        const { error } = await admin.from('product_costs').delete().eq('product_id', productId);
        return error ? json({ error: 'unable_to_save_costs' }, 500, origin) : json({ ok: true }, 200, origin);
      }
      const costPercent = percentIn(body.costPercent, 200);
      if (costPercent === null) return json({ error: 'invalid_costs' }, 400, origin);
      const { error } = await admin.from('product_costs').upsert({ product_id: productId, cost_percent: costPercent, updated_by: session.admin_username, updated_at: now });
      return error ? json({ error: 'unable_to_save_costs' }, 500, origin) : json({ ok: true }, 200, origin);
    }

    if (body.action === 'save_partner_terms') {
      const recipientId = clean(body.recipientId, 36);
      const testStart = clean(body.testStart, 10);
      const testDays = wholeIn(body.testDays, 365);
      const monthlyMinimum = percentIn(body.monthlyMinimum, 10_000_000);
      const monthlyGoal = percentIn(body.monthlyGoal, 10_000_000);
      const monthlyVale = percentIn(body.monthlyVale, 10_000_000);
      const reels = wholeIn(body.reelsPerMonth, 100);
      const stories = wholeIn(body.storiesPerMonth, 100);
      const phase = clean(body.phase, 20);
      if (!uuidPattern.test(recipientId) || !validDay(testStart) || testDays === null || testDays < 30 || monthlyMinimum === null || monthlyGoal === null || monthlyVale === null || reels === null || stories === null || !partnerPhases.has(phase)) return json({ error: 'invalid_terms' }, 400, origin);
      const { error } = await admin.from('partner_terms').upsert({ recipient_id: recipientId, test_start: testStart, test_days: testDays, monthly_minimum: monthlyMinimum, monthly_goal: monthlyGoal, monthly_vale: monthlyVale, reels_per_month: reels, stories_per_month: stories, phase, notes: clean(body.notes, 1000) || null, updated_by: session.admin_username, updated_at: now });
      return error ? json({ error: 'unable_to_save_terms' }, 500, origin) : json({ ok: true }, 200, origin);
    }

    if (body.action === 'save_partner_delivery') {
      const recipientId = clean(body.recipientId, 36);
      const month = clean(body.month, 7);
      const reels = wholeIn(body.reels, 1000);
      const stories = wholeIn(body.stories, 1000);
      if (!uuidPattern.test(recipientId) || !/^\d{4}-(0[1-9]|1[0-2])$/.test(month) || reels === null || stories === null) return json({ error: 'invalid_delivery' }, 400, origin);
      const { error } = await admin.from('partner_deliveries').upsert({ recipient_id: recipientId, month: `${month}-01`, reels, stories, note: clean(body.note, 300) || null, updated_by: session.admin_username, updated_at: now });
      return error ? json({ error: 'unable_to_save_delivery' }, 500, origin) : json({ ok: true }, 200, origin);
    }

    // Clientes e pós-venda. CPF, rua, dados de pagamento, receitas e observações de orçamento ficam de fora.
    if (body.action === 'customers_report') {
      const [users, orders, profiles, carts, quotes, followups, notes] = await Promise.all([
        readAllAccounts(admin),
        readAll((from, to) => admin.from('orders')
          .select('id,customer_id,shipping_address->>name,shipping_address->>phone,shipping_address->>city,shipping_address->>state,shipping_address->>neighborhood,subtotal,discount_amount,shipping_amount,status,payment_status,payment_method,paid_at,shipped_at,delivered_at,created_at,discount_code,attributed_recipient_id,order_items(product_name,quantity)')
          .order('created_at', { ascending: true }).order('id', { ascending: true }).range(from, to)),
        readAll((from, to) => admin.from('customer_profiles').select('id,full_name,phone').order('id', { ascending: true }).range(from, to)),
        readAll((from, to) => admin.from('customer_carts').select('customer_id,items,updated_at').order('customer_id', { ascending: true }).range(from, to)),
        readAll((from, to) => admin.from('solicitacoes').select('id,created_at,nome_cliente,whatsapp').neq('status', 'trash').order('id', { ascending: true }).range(from, to)),
        readAll((from, to) => admin.from('customer_followups').select('customer_key,contact_preference,next_contact_on').order('customer_key', { ascending: true }).range(from, to)),
        readAll((from, to) => admin.from('customer_notes').select('id,customer_key,kind,note,created_by,created_at').order('created_at', { ascending: true }).order('id', { ascending: true }).range(from, to)),
      ]);
      const [admins, counterAccounts, partners, recipients] = await Promise.all([
        admin.from('admins').select('email').not('email', 'is', null),
        admin.from('counter_accounts').select('email').not('email', 'is', null),
        admin.from('partner_profiles').select('id'),
        admin.from('commission_recipients').select('id,name'),
      ]);
      if (admins.error || counterAccounts.error || partners.error || recipients.error) return json({ error: 'unable_to_load_customers' }, 500, origin);
      return json(buildCustomerReport({
        today: todayInBrazil(),
        users,
        // A consulta traz só estas partes do endereço; a rua e o número nem saem do banco.
        orders: orders.map(({ name, phone, city, state, neighborhood, ...order }) => ({ ...order, shipping_address: { name, phone, city, state, neighborhood } })),
        profiles, carts, quotes, followups, notes,
        staffEmails: [...(admins.data || []), ...(counterAccounts.data || [])].map(row => String(row.email)),
        partnerIds: (partners.data || []).map(row => String(row.id)),
        recipients: recipients.data || [],
      }), 200, origin);
    }

    if (body.action === 'save_customer_followup') {
      const customerKey = clean(body.customerKey, 60);
      const preference = clean(body.contactPreference, 10);
      const nextContactOn = clean(body.nextContactOn, 10);
      if (!customerKeyPattern.test(customerKey) || !['unknown', 'allowed', 'refused'].includes(preference) || (nextContactOn && !validDay(nextContactOn))) return json({ error: 'invalid_followup' }, 400, origin);
      // Quem recusou contato não fica com retorno marcado.
      const { error } = await admin.from('customer_followups').upsert({ customer_key: customerKey, contact_preference: preference, next_contact_on: preference === 'refused' ? null : nextContactOn || null, updated_by: session.admin_username, updated_at: now });
      return error ? json({ error: 'unable_to_save_followup' }, 500, origin) : json({ ok: true }, 200, origin);
    }

    if (body.action === 'add_customer_note') {
      const customerKey = clean(body.customerKey, 60);
      const note = clean(body.note, 1000);
      const kind = clean(body.kind, 10);
      if (!customerKeyPattern.test(customerKey) || note.length < 2 || !['note', 'contact'].includes(kind)) return json({ error: 'invalid_note' }, 400, origin);
      const { error } = await admin.from('customer_notes').insert({ customer_key: customerKey, kind, note, created_by: session.admin_username });
      if (error) return json({ error: 'unable_to_save_note' }, 500, origin);
      // Registrar o contato encerra o retorno que estava marcado para hoje ou antes.
      if (kind === 'contact') await admin.from('customer_followups').update({ next_contact_on: null, updated_by: session.admin_username, updated_at: now }).eq('customer_key', customerKey).lte('next_contact_on', todayInBrazil());
      return json({ ok: true }, 200, origin);
    }

    if (body.action === 'delete_customer_note') {
      const noteId = clean(body.noteId, 36);
      if (!uuidPattern.test(noteId)) return json({ error: 'invalid_note' }, 400, origin);
      const { error } = await admin.from('customer_notes').delete().eq('id', noteId);
      return error ? json({ error: 'unable_to_delete_note' }, 500, origin) : json({ ok: true }, 200, origin);
    }

    // A planilha é gerada no navegador; aqui fica só o registro de quem exportou e quantas pessoas.
    if (body.action === 'log_customer_export') {
      const count = wholeIn(body.count, 1_000_000);
      return count === null ? json({ error: 'invalid_export' }, 400, origin) : json({ ok: true }, 200, origin);
    }

    if (body.action === 'list_partner_applications') {
      const [partnersResult, creditsResult] = await Promise.all([
        admin.from('partner_profiles').select('id,full_name,email,phone,document,pix_key,channel,requested_coupon_code,status,referral_code,commission_recipient_id,coupon_id,approved_at,approved_by,rejection_reason,created_at,updated_at').order('created_at', { ascending: false }),
        admin.from('partner_product_credits').select('partner_id,type,amount'),
      ]);
      if (partnersResult.error) return json({ error: 'unable_to_load_partners' }, 500, origin);
      const creditsRows = creditsResult.data || [];
      const partnersWithCredits = (partnersResult.data || []).map(p => {
        const pCredits = creditsRows.filter(c => c.partner_id === p.id);
        const granted = pCredits.filter(c => c.type === 'grant').reduce((acc, c) => acc + Number(c.amount || 0), 0);
        const used = pCredits.filter(c => c.type === 'usage').reduce((acc, c) => acc + Number(c.amount || 0), 0);
        return {
          ...p,
          product_credit_granted: granted,
          product_credit_used: used,
          product_credit_balance: Math.max(0, granted - used),
        };
      });
      return json({ partners: partnersWithCredits }, 200, origin);
    }

    if (body.action === 'list_partner_credits') {
      const partnerId = clean(body.partnerId, 36);
      if (!uuidPattern.test(partnerId)) return json({ error: 'invalid_partner' }, 400, origin);
      const { data, error } = await admin.from('partner_product_credits')
        .select('id,partner_id,type,amount,description,invoice_ref,spent_at,created_by,created_at')
        .eq('partner_id', partnerId)
        .order('spent_at', { ascending: false });
      const movements = data || [];
      const sum = (rows: any[], field: string) => rows.reduce((total, item) => total + Number(item[field] || 0), 0);
      const granted = sum(movements.filter(item => item.type === 'grant'), 'amount');
      const used = sum(movements.filter(item => item.type === 'usage'), 'amount');
      return json({ movements, granted, used, balance: Math.max(0, granted - used) }, 200, origin);
    }

    if (body.action === 'add_partner_product_credit') {
      const partnerId = clean(body.partnerId, 36);
      const amount = Number(body.amount);
      const description = clean(body.description, 300) || 'Crédito de produtos concedido';
      const invoiceRef = clean(body.invoiceRef, 120) || null;
      if (!uuidPattern.test(partnerId) || !Number.isFinite(amount) || amount <= 0) {
        return json({ error: 'invalid_credit_amount' }, 400, origin);
      }
      const { data, error } = await admin.from('partner_product_credits').insert({
        partner_id: partnerId,
        type: 'grant',
        amount,
        description,
        invoice_ref: invoiceRef,
        spent_at: now,
        created_by: session.admin_username,
      }).select().single();
      if (error) {
        console.error('unable_to_add_partner_credit', error.message);
        return json({ error: 'unable_to_add_credit' }, 500, origin);
      }
      return json({ credit: data }, 201, origin);
    }

    if (body.action === 'record_partner_product_usage') {
      const partnerId = clean(body.partnerId, 36);
      const amount = Number(body.amount);
      const description = clean(body.description, 300);
      const invoiceRef = clean(body.invoiceRef, 120) || null;
      const spentAt = clean(body.spentAt, 40) ? new Date(body.spentAt).toISOString() : now;
      if (!uuidPattern.test(partnerId) || !Number.isFinite(amount) || amount <= 0 || !description) {
        return json({ error: 'invalid_product_usage' }, 400, origin);
      }
      const { data, error } = await admin.from('partner_product_credits').insert({
        partner_id: partnerId,
        type: 'usage',
        amount,
        description,
        invoice_ref: invoiceRef,
        spent_at: spentAt,
        created_by: session.admin_username,
      }).select().single();
      if (error) {
        console.error('unable_to_record_partner_usage', error.message);
        return json({ error: 'unable_to_record_usage' }, 500, origin);
      }
      return json({ usage: data }, 201, origin);
    }

    if (body.action === 'delete_partner_credit_entry') {
      const entryId = clean(body.entryId, 36);
      if (!uuidPattern.test(entryId)) return json({ error: 'invalid_entry_id' }, 400, origin);
      const { error } = await admin.from('partner_product_credits').delete().eq('id', entryId);
      if (error) return json({ error: 'unable_to_delete_entry' }, 500, origin);
      return json({ ok: true }, 200, origin);
    }

    if (body.action === 'approve_partner') {
      const partnerId = clean(body.partnerId, 36);
      const referralCode = clean(body.referralCode, 40).toUpperCase();
      const commissionValue = Number(body.commissionValue);
      const discountValue = Number(body.discountValue);
      const holdDays = Number(body.holdDays);
      if (!uuidPattern.test(partnerId) || !/^[A-Z0-9_-]{3,40}$/.test(referralCode) || !Number.isFinite(commissionValue) || commissionValue < 0 || commissionValue > 100 || !Number.isFinite(discountValue) || discountValue <= 0 || discountValue > 100 || !Number.isInteger(holdDays) || holdDays < 0 || holdDays > 180) return json({ error: 'invalid_partner_approval' }, 400, origin);
      const { data: profile } = await admin.from('partner_profiles').select('id,full_name,email,status,commission_recipient_id,coupon_id').eq('id', partnerId).maybeSingle();
      if (!profile || !['pending', 'rejected'].includes(profile.status)) return json({ error: 'partner_not_pending' }, 409, origin);
      const { data: recipient, error: recipientError } = await admin.from('commission_recipients').insert({ name: profile.full_name, role: 'influencer', email: profile.email, commission_type: 'percentage', commission_value: commissionValue, attribution_scope: 'coupon', hold_days: holdDays, is_active: true }).select().single();
      if (recipientError || !recipient) return json({ error: 'unable_to_create_recipient' }, 500, origin);
      const { data: coupon, error: couponError } = await admin.from('discount_coupons').insert({ recipient_id: recipient.id, code: referralCode, discount_type: 'percentage', discount_value: discountValue, minimum_order_amount: 0, is_active: true }).select().single();
      if (couponError || !coupon) {
        await admin.from('commission_recipients').delete().eq('id', recipient.id);
        return json({ error: couponError?.code === '23505' ? 'coupon_exists' : 'unable_to_create_coupon' }, 409, origin);
      }
      const { data: partner, error: approvalError } = await admin.from('partner_profiles').update({ status: 'approved', commission_recipient_id: recipient.id, coupon_id: coupon.id, referral_code: referralCode, approved_at: now, approved_by: session.admin_username, rejection_reason: null, updated_at: now }).eq('id', partnerId).select().single();
      if (approvalError) {
        await admin.from('discount_coupons').delete().eq('id', coupon.id);
        await admin.from('commission_recipients').delete().eq('id', recipient.id);
        return json({ error: 'unable_to_approve_partner' }, 500, origin);
      }
      return json({ partner }, 200, origin);
    }

    if (body.action === 'reject_partner') {
      const partnerId = clean(body.partnerId, 36);
      const reason = clean(body.reason, 500);
      if (!uuidPattern.test(partnerId)) return json({ error: 'invalid_partner' }, 400, origin);
      const { data, error } = await admin.from('partner_profiles').update({ status: 'rejected', rejection_reason: reason || 'Solicitação não aprovada neste momento.', approved_at: null, approved_by: session.admin_username, updated_at: now }).eq('id', partnerId).in('status', ['pending', 'rejected']).select().single();
      if (error || !data) return json({ error: 'unable_to_reject_partner' }, 500, origin);
      return json({ partner: data }, 200, origin);
    }

    if (body.action === 'create_recipient') {
      const name = clean(body.name, 120);
      const role = clean(body.role, 30);
      const commissionType = clean(body.commissionType, 20);
      const scope = clean(body.attributionScope, 30);
      const commissionValue = Number(body.commissionValue);
      const holdDays = Number(body.holdDays);
      if (!name || !recipientRoles.has(role) || !commissionTypes.has(commissionType) || !attributionScopes.has(scope) || !Number.isFinite(commissionValue) || commissionValue < 0 || (commissionType === 'percentage' && commissionValue > 100) || !Number.isInteger(holdDays) || holdDays < 0 || holdDays > 180) return json({ error: 'invalid_recipient' }, 400, origin);
      const { data, error } = await admin.from('commission_recipients').insert({ name, role, email: clean(body.email, 320) || null, commission_type: commissionType, commission_value: commissionValue, attribution_scope: scope, hold_days: holdDays, is_active: true }).select().single();
      if (error) return json({ error: 'unable_to_create_recipient' }, 500, origin);
      return json({ recipient: data }, 200, origin);
    }

    if (body.action === 'update_recipient') {
      const id = clean(body.id, 36);
      const commissionValue = Number(body.commissionValue);
      const holdDays = Number(body.holdDays);
      const commissionType = clean(body.commissionType, 20);
      const scope = clean(body.attributionScope, 30);
      if (!uuidPattern.test(id) || !commissionTypes.has(commissionType) || !attributionScopes.has(scope) || !Number.isFinite(commissionValue) || commissionValue < 0 || (commissionType === 'percentage' && commissionValue > 100) || !Number.isInteger(holdDays) || holdDays < 0 || holdDays > 180) return json({ error: 'invalid_recipient' }, 400, origin);
      const { data, error } = await admin.from('commission_recipients').update({ commission_type: commissionType, commission_value: commissionValue, attribution_scope: scope, hold_days: holdDays, is_active: Boolean(body.isActive), updated_at: now }).eq('id', id).select().single();
      if (error) return json({ error: 'unable_to_update_recipient' }, 500, origin);
      return json({ recipient: data }, 200, origin);
    }

    if (body.action === 'create_coupon') {
      const recipientId = clean(body.recipientId, 36);
      const code = clean(body.code, 40).toUpperCase();
      const discountType = clean(body.discountType, 20);
      const discountValue = Number(body.discountValue);
      const minimumOrderAmount = Number(body.minimumOrderAmount || 0);
      const maxRedemptions = body.maxRedemptions === '' || body.maxRedemptions == null ? null : Number(body.maxRedemptions);
      if (!uuidPattern.test(recipientId) || !/^[A-Z0-9_-]{3,40}$/.test(code) || !commissionTypes.has(discountType) || !Number.isFinite(discountValue) || discountValue <= 0 || (discountType === 'percentage' && discountValue > 100) || !Number.isFinite(minimumOrderAmount) || minimumOrderAmount < 0 || (maxRedemptions !== null && (!Number.isInteger(maxRedemptions) || maxRedemptions < 1))) return json({ error: 'invalid_coupon' }, 400, origin);
      const { data, error } = await admin.from('discount_coupons').insert({ recipient_id: recipientId, code, discount_type: discountType, discount_value: discountValue, minimum_order_amount: minimumOrderAmount, max_redemptions: maxRedemptions, is_active: true }).select('*,commission_recipients(name)').single();
      if (error) return json({ error: error.code === '23505' ? 'coupon_exists' : 'unable_to_create_coupon' }, 409, origin);
      return json({ coupon: data }, 200, origin);
    }

    if (body.action === 'toggle_coupon') {
      const id = clean(body.id, 36);
      if (!uuidPattern.test(id)) return json({ error: 'invalid_coupon' }, 400, origin);
      const { data, error } = await admin.from('discount_coupons').update({ is_active: Boolean(body.isActive), updated_at: now }).eq('id', id).select('*,commission_recipients(name)').single();
      if (error) return json({ error: 'unable_to_update_coupon' }, 500, origin);
      return json({ coupon: data }, 200, origin);
    }

    if (body.action === 'settle_recipient_commissions') {
      const recipientId = clean(body.recipientId, 36);
      const reference = clean(body.reference, 160);
      if (!uuidPattern.test(recipientId) || !reference) return json({ error: 'invalid_payout' }, 400, origin);
      const { data: available, error: availableError } = await admin.from('commissions').select('id,amount').eq('recipient_id', recipientId).eq('status', 'available');
      if (availableError || !available?.length) return json({ error: 'no_available_commissions' }, 409, origin);
      const total = available.reduce((sum, commission) => sum + Number(commission.amount || 0), 0);
      const { error } = await admin.from('commissions').update({ status: 'paid', paid_at: now, payout_reference: reference, updated_at: now }).in('id', available.map(commission => commission.id));
      if (error) return json({ error: 'unable_to_register_payout' }, 500, origin);
      return json({ ok: true, total }, 200, origin);
    }

    if (body.action === 'list_admins') {
      const { data, error } = await admin.from('admins').select('id,email,username,created_at').order('created_at', { ascending: false });
      if (error) return json({ error: 'unable_to_load_admins' }, 500, origin);
      return json({ admins: data || [], me: session.admin_username }, 200, origin);
    }

    if (body.action === 'list_audit') {
      const { data, error } = await admin.from('admin_audit_log').select('id,created_at,actor,action,target,details').order('created_at', { ascending: false }).limit(100);
      if (error) return json({ error: 'unable_to_load_audit' }, 500, origin);
      return json({ entries: data || [] }, 200, origin);
    }

    // Qualquer admin cadastra outro pelo e-mail. Quem ainda não tem conta no site recebe
    // a senha inicial informada aqui; quem já tem continua com a própria senha (ou Google).
    if (body.action === 'add_admin') {
      const email = normalizeEmail(body.email);
      const password = typeof body.password === 'string' ? body.password : '';
      if (!validEmail(email) || (password && !validAccountPassword(password))) return json({ error: 'invalid_admin' }, 400, origin);
      const { data: existing } = await admin.from('admins').select('id').eq('email', email).maybeSingle();
      if (existing) return json({ error: 'admin_exists' }, 409, origin);
      const ensured = await ensureAuthAccount(admin, email, password);
      if (ensured.error) return json({ error: ensured.error }, 400, origin);
      const { error } = await admin.from('admins').insert({ username: email, email, password: null });
      if (error) return json({ error: error.code === '23505' ? 'admin_exists' : 'unable_to_add_admin' }, 409, origin);
      return json({ ok: true, created: ensured.created }, 200, origin);
    }

    if (body.action === 'delete_admin') {
      const adminId = clean(String(body.adminId ?? ''), 80);
      if (!adminId) return json({ error: 'invalid_admin' }, 400, origin);
      const { data: target } = await admin.from('admins').select('email,username').eq('id', adminId).maybeSingle();
      const { count } = await admin.from('admins').select('id', { count: 'exact', head: true }).not('email', 'is', null);
      if (!target) return json({ error: 'admin_not_found' }, 404, origin);
      // Não remove o próprio acesso nem o último admin que consegue entrar (com e-mail).
      if (target.email === session.admin_username || (target.email && Number(count || 0) <= 1)) return json({ error: 'protected_admin' }, 409, origin);
      const { error } = await admin.from('admins').delete().eq('id', adminId);
      if (error) return json({ error: 'unable_to_delete_admin' }, 500, origin);
      // Os navegadores conectados como esse admin perdem o acesso na hora.
      await admin.from('admin_sessions').delete().eq('admin_username', target.email || target.username);
      return json({ ok: true }, 200, origin);
    }

    // Estorno, estorno de pagamento extra e conferência no Mercado Pago. Toda gravação no pedido passa pela
    // RPC apply_mp_payment (mesma trava e mesmas regras do aviso): pedido em preparo, enviado ou entregue
    // fica estornado sem perder o andamento.
    const mercadoPagoToken = Deno.env.get('MERCADO_PAGO_ACCESS_TOKEN') || '';
    const getPayment = (paymentId: string) => mpFetch(`/v1/payments/${paymentId}`, { token: mercadoPagoToken, timeoutMs: 15000 });
    // Chave de repetição do estorno: a mesma em cliques repetidos, timeout e 5xx (o Mercado Pago nunca devolve
    // duas vezes). Depois de uma recusa definitiva (4xx, sem nada devolvido e sem estorno em andamento no
    // pagamento), registrada como refund_failed, a próxima tentativa usa outra chave, para não repetir a recusa
    // guardada (por exemplo, depois de pôr saldo na conta).
    const refundKey = async (paymentId: string) => {
      const { count, error } = await admin.from('admin_audit_log').select('id', { count: 'exact', head: true }).eq('action', 'refund_failed').eq('target', paymentId);
      if (error) return null;
      const generation = Number(count || 0);
      return generation > 0 ? `graphene-refund-${paymentId}-${generation}` : `graphene-refund-${paymentId}`;
    };
    // Estornos já registrados no pagamento. Com o cabeçalho, o estorno de Pix em contingência aparece como
    // in_process. 'in_process' = algum em andamento; 'some' = já houve devolução (ou situação desconhecida);
    // 'none' = nenhum, ou só recusados/cancelados; null = sem resposta do Mercado Pago.
    const refundsOnPayment = async (paymentId: string) => {
      const list = await mpFetch(`/v1/payments/${paymentId}/refunds`, { token: mercadoPagoToken, extraHeaders: mpInProcessRefundsHeader, timeoutMs: 15000 });
      if (!list.ok || !Array.isArray(list.data)) return null;
      const statuses = list.data.slice(0, 50).map((item: Record<string, unknown>) => String(item?.status || ''));
      if (statuses.some((status: string) => ['in_process', 'pending', 'authorized'].includes(status))) return 'in_process';
      if (statuses.some((status: string) => !['rejected', 'cancelled'].includes(status))) return 'some';
      return 'none';
    };
    // deno-lint-ignore no-explicit-any
    const refundPayment = async (paymentId: string, orderId: string): Promise<{ ok?: boolean; pending?: boolean; refund?: any; error?: string; status?: number }> => {
      const key = await refundKey(paymentId);
      if (!key) return { error: 'internal_error', status: 500 };
      // X-Render-In-Process-Refunds: o estorno de Pix em contingência volta 201 in_process (caminho do 202), não 400.
      const response = await mpFetch(`/v1/payments/${paymentId}/refunds`, {
        token: mercadoPagoToken, method: 'POST', body: '{}', idempotencyKey: key, extraHeaders: mpInProcessRefundsHeader, timeoutMs: 20000,
      });
      if (response.ok) {
        // Estorno aceito, mas ainda em processamento: o aviso do Mercado Pago atualiza o pedido quando terminar.
        if (response.data.status && response.data.status !== 'approved') return { pending: true, refund: response.data };
        return { ok: true, refund: response.data };
      }
      if (response.network) {
        console.error('refund_failed', 0, 'payment_provider_unavailable');
        return { error: 'payment_provider_unavailable', status: 502 };
      }
      // Já estornado em outro lugar (por exemplo, no site do Mercado Pago): confere o pagamento antes de gravar.
      const check = await getPayment(paymentId);
      if (check.ok && check.data.status === 'refunded') return { ok: true, refund: {} };
      const refund = response.data || {};
      const detail = `${refund.message || ''} ${JSON.stringify(refund.cause || '')}`.toLowerCase();
      const error = response.status === 404 ? 'payment_not_found'
        : /too.old|old_to_be_refunded/.test(detail) ? 'refund_too_old'
          : /insufficient|balance|saldo/.test(detail) ? 'refund_insufficient_balance'
            : 'refund_failed';
      if (!definitiveRefundFailure(response.status)) {
        console.error('refund_failed', response.status, error);
        return { error, status: 502 };
      }
      // Recusa (4xx). Antes de trocar a chave, confere se não há estorno em andamento ou já feito: um estorno
      // de Pix em contingência pode voltar 400 com o pagamento ainda 'approved', e uma chave nova mandaria
      // outro estorno. A chave só muda com o pagamento sem nada devolvido e sem estorno registrado.
      const existing = check.ok ? await refundsOnPayment(paymentId) : null;
      if (existing === 'in_process') {
        console.error('refund_in_process', response.status);
        return { pending: true, refund: { status: 'in_process' } };
      }
      console.error('refund_failed', response.status, error);
      const refundedSoFar = Number(check.data?.transaction_amount_refunded ?? 0);
      if (existing === 'none' && refundedSoFar === 0) {
        await logAdminAction(admin, session.admin_username, 'refund_failed', paymentId, { orderId, status: response.status, error });
      }
      return { error, status: 502 };
    };
    // Depois do estorno: lê o pagamento de novo e grava pela RPC.
    const recordRefund = async (paymentId: string) => {
      const after = await getPayment(paymentId);
      if (!after.ok) return null;
      const { data, error } = await admin.rpc('apply_mp_payment', { p_payment: normalizePayment(after.data, paymentId), p_source: 'refund' });
      return error || !data ? null : data;
    };

    if (body.action === 'refund_order') {
      const orderId = clean(body.orderId, 36);
      const reason = clean(body.reason, 300);
      if (!uuidPattern.test(orderId)) return json({ error: 'invalid_update' }, 400, origin);
      const { data: order } = await admin.from('orders').select('id,total,status,payment_status,payment_provider,payment_details,paid_payment_id').eq('id', orderId).maybeSingle();
      if (!order) return json({ error: 'order_not_found' }, 404, origin);
      if (order.payment_status === 'refunded') return json({ error: 'already_refunded' }, 409, origin);
      if (order.payment_status !== 'paid') return json({ error: 'payment_not_confirmed' }, 409, origin);
      // O pagamento que pagou o pedido; em pedidos antigos, o número gravado pelo aviso.
      const paymentId = String(order.paid_payment_id || order.payment_details?.payment_id || '');
      if (order.payment_provider !== 'mercado_pago' || !mpPaymentIdPattern.test(paymentId)) return json({ error: 'payment_not_refundable' }, 409, origin);
      if (!mercadoPagoToken) return json({ error: 'provider_not_configured' }, 503, origin);

      // Antes de estornar: o pagamento precisa ser deste pedido e do mesmo valor.
      const current = await getPayment(paymentId);
      if (current.status === 404) return json({ error: 'payment_not_found' }, 502, origin);
      if (!current.ok) return json({ error: 'payment_provider_unavailable' }, 502, origin);
      if (String(current.data.external_reference || '') !== order.id || !(Math.abs(Number(current.data.transaction_amount) - Number(order.total)) < 0.01)) {
        return json({ error: 'payment_mismatch' }, 409, origin);
      }
      if (!['approved', 'refunded'].includes(String(current.data.status))) return json({ error: 'payment_not_refundable' }, 409, origin);

      // deno-lint-ignore no-explicit-any
      let refund: any = {};
      if (current.data.status === 'approved') {
        const result = await refundPayment(paymentId, order.id);
        if (result.error) return json({ error: result.error }, result.status || 502, origin);
        refund = result.refund || {};
        if (result.pending) {
          await logAdminAction(admin, session.admin_username, 'refund_order', order.id, { amount: Number(refund.amount) || Number(order.total), status: String(refund.status), reason: reason || undefined });
          return json({ pending: true }, 202, origin);
        }
      }
      const amount = Number.isFinite(Number(refund.amount)) && Number(refund.amount) > 0 ? Number(refund.amount) : Number(order.total);
      const applied = await recordRefund(paymentId);
      await logAdminAction(admin, session.admin_username, 'refund_order', order.id, { amount, reason: reason || undefined, refundId: refund.id ? String(refund.id) : undefined });
      // O dinheiro já voltou; se o pedido não gravou agora, o aviso do Mercado Pago grava depois.
      if (!applied) return json({ error: 'refunded_not_saved' }, 500, origin);
      // Ainda aprovado no Mercado Pago: o estorno está em processamento e o aviso grava depois.
      if (applied.payment_status !== 'refunded') return json({ pending: true }, 202, origin);
      const { data: updated } = await admin.from('orders').select('id,status,payment_status,updated_at').eq('id', order.id).maybeSingle();
      return json({ order: updated || { id: order.id, status: applied.status, payment_status: applied.payment_status }, amount }, 200, origin);
    }

    // Pagamento aprovado em dobro no mesmo pedido: estorna só esse pagamento, sem mexer no pedido.
    if (body.action === 'refund_extra_payment') {
      const orderId = clean(body.orderId, 36);
      const paymentId = clean(String(body.paymentId ?? ''), 20);
      if (!uuidPattern.test(orderId) || !mpPaymentIdPattern.test(paymentId)) return json({ error: 'invalid_update' }, 400, origin);
      const { data: order } = await admin.from('orders').select('id,total,paid_payment_id,payment_details').eq('id', orderId).maybeSingle();
      if (!order) return json({ error: 'order_not_found' }, 404, origin);
      const { data: attempt, error: attemptError } = await admin.from('payment_attempts').select('id,status,order_id')
        .eq('order_id', order.id).eq('provider_payment_id', paymentId).maybeSingle();
      if (attemptError) return json({ error: 'internal_error' }, 500, origin);
      const mainPaymentId = String(order.paid_payment_id || order.payment_details?.payment_id || '');
      if (!attempt || attempt.status !== 'approved' || paymentId === mainPaymentId) return json({ error: 'payment_not_extra' }, 409, origin);
      if (!mercadoPagoToken) return json({ error: 'provider_not_configured' }, 503, origin);
      const current = await getPayment(paymentId);
      if (current.status === 404) return json({ error: 'payment_not_found' }, 502, origin);
      if (!current.ok) return json({ error: 'payment_provider_unavailable' }, 502, origin);
      if (String(current.data.external_reference || '') !== order.id) return json({ error: 'payment_mismatch' }, 409, origin);
      if (current.data.status === 'refunded') {
        await recordRefund(paymentId);
        return json({ error: 'already_refunded' }, 409, origin);
      }
      if (current.data.status !== 'approved') return json({ error: 'payment_not_extra' }, 409, origin);
      const result = await refundPayment(paymentId, order.id);
      if (result.error) return json({ error: result.error }, result.status || 502, origin);
      const refund = result.refund || {};
      const amount = Number.isFinite(Number(refund.amount)) && Number(refund.amount) > 0 ? Number(refund.amount) : Number(current.data.transaction_amount) || 0;
      if (result.pending) {
        await logAdminAction(admin, session.admin_username, 'refund_extra_payment', order.id, { paymentId, amount, status: String(refund.status) });
        return json({ pending: true }, 202, origin);
      }
      const applied = await recordRefund(paymentId);
      await logAdminAction(admin, session.admin_username, 'refund_extra_payment', order.id, { paymentId, amount, refundId: refund.id ? String(refund.id) : undefined });
      if (!applied) return json({ error: 'refunded_not_saved' }, 500, origin);
      return json({ ok: true, amount }, 200, origin);
    }

    // Reserva para um aviso perdido: busca no Mercado Pago os pagamentos do pedido e aplica cada um.
    if (body.action === 'reconcile_order') {
      const orderId = clean(body.orderId, 36);
      if (!uuidPattern.test(orderId)) return json({ error: 'invalid_update' }, 400, origin);
      const { data: order } = await admin.from('orders').select('id').eq('id', orderId).maybeSingle();
      if (!order) return json({ error: 'order_not_found' }, 404, origin);
      if (!mercadoPagoToken) return json({ error: 'provider_not_configured' }, 503, origin);
      const search = await mpFetch(`/v1/payments/search?external_reference=${order.id}&sort=date_created&criteria=desc`, { token: mercadoPagoToken, timeoutMs: 15000 });
      if (!search.ok || !Array.isArray(search.data.results)) return json({ error: 'payment_provider_unavailable' }, 502, origin);
      const applied: Array<{ paymentId: string; decision: string }> = [];
      for (const result of search.data.results.slice(0, 30)) {
        if (String(result?.external_reference || '') !== order.id) continue;
        const payment = normalizePayment(result);
        if (!mpPaymentIdPattern.test(payment.id)) continue;
        const { data, error } = await admin.rpc('apply_mp_payment', { p_payment: payment, p_source: 'reconcile' });
        if (error) {
          if (['invalid_payment', 'attempt_conflict'].includes(String(error.message))) { applied.push({ paymentId: payment.id, decision: 'ignored' }); continue; }
          return json({ error: 'internal_error' }, 500, origin);
        }
        applied.push({ paymentId: payment.id, decision: String(data?.decision || '') });
      }
      // Tentativas 'creating' antigas que o Mercado Pago não tem: viram erro e liberam o pedido.
      const { data: stale } = await admin.from('payment_attempts').select('id').eq('order_id', order.id).eq('status', 'creating')
        .is('provider_payment_id', null).lt('created_at', new Date(Date.now() - 2 * 60 * 1000).toISOString());
      for (const row of stale || []) await admin.rpc('fail_payment_attempt', { p_attempt_id: row.id, p_status_detail: 'reconcile_not_found' });
      const { data: updated } = await admin.from('orders')
        .select('id,status,payment_status,paid_payment_id,paid_at,payment_method,payment_provider,payment_details,provider_fee,net_amount,updated_at')
        .eq('id', order.id).maybeSingle();
      await logAdminAction(admin, session.admin_username, 'reconcile_order', order.id, { applied: applied.length });
      return json({ order: updated, applied }, 200, origin);
    }

    if (body.action === 'update') {
      const orderId = clean(body.orderId, 36);
      const status = clean(body.status, 30);
      if (!uuidPattern.test(orderId) || !allowedStatuses.has(status)) return json({ error: 'invalid_update' }, 400, origin);
      const { data: current } = await admin.from('orders').select('payment_status,status').eq('id', orderId).maybeSingle();
      if (!current) return json({ error: 'order_not_found' }, 404, origin);
      if (['processing', 'shipped', 'delivered'].includes(status) && current.payment_status !== 'paid') {
        return json({ error: 'payment_not_confirmed' }, 409, origin);
      }

      const carrier = clean(body.carrier, 80);
      const trackingCode = clean(body.trackingCode, 100);
      if (status === 'shipped' && (!carrier || !trackingCode)) return json({ error: 'shipping_data_required' }, 400, origin);
      const update: Record<string, unknown> = {
        status, carrier: carrier || null, tracking_code: trackingCode || null,
        invoice_number: clean(body.invoiceNumber, 80) || null,
        invoice_url: clean(body.invoiceUrl, 500) || null,
        admin_notes: clean(body.adminNotes, 2000) || null,
        updated_at: now,
      };
      if (status === 'shipped' && current.status !== 'shipped') update.shipped_at = now;
      if (status === 'delivered' && current.status !== 'delivered') update.delivered_at = now;
      const { data, error } = await admin.from('orders').update(update).eq('id', orderId).select().single();
      if (error) return json({ error: 'unable_to_update_order' }, 500, origin);
      return json({ order: data }, 200, origin);
    }

    return json({ error: 'invalid_action' }, 400, origin);
    };
    const response = await handle();
    if (response.ok && auditedActions.has(body.action)) {
      const target = body.email || body.adminId || body.partnerId || body.recipientId || body.orderId || body.requestId || body.entryId || body.code || body.id || body.productId || body.customerKey || body.noteId || (body.action === 'log_customer_export' ? `${body.count} pessoas` : undefined);
      await logAdminAction(admin, session.admin_username, body.action, target, { status: body.status, passwordSet: body.action === 'add_admin' ? Boolean(body.password) : undefined });
    }
    return response;
  } catch {
    return json({ error: 'internal_error' }, 500, origin);
  }
});
