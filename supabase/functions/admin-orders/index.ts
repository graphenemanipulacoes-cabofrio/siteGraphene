import { createClient } from 'npm:@supabase/supabase-js@2';
import { allowedOrigin, json } from '../_shared/http.ts';
import { ensureAuthAccount, hashToken, logAdminAction, normalizeEmail, requestIdPattern, uuidPattern, validAccountPassword, validEmail } from '../_shared/counter-security.ts';
import { buildPartnerReport, monthKey, todayInBrazil } from '../_shared/partner-results.ts';
import { buildCustomerReport, customerKeyPattern } from '../_shared/customer-insights.ts';

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
        payment_status,payment_reference,payment_method,payment_details,paid_at,carrier,tracking_code,
        invoice_number,invoice_url,admin_notes,shipped_at,delivered_at,created_at,updated_at,
        order_items(id,product_id,product_name,unit_price,quantity)
      `).order('created_at', { ascending: false }).limit(250);
      if (error) return json({ error: 'unable_to_load_orders' }, 500, origin);
      return json({ orders: data || [] }, 200, origin);
    }

    if (body.action === 'finance_dashboard') {
      await admin.rpc('release_available_commissions');
      const [ordersResult, recipientsResult, couponsResult, commissionsResult, eventsResult] = await Promise.all([
        admin.from('orders').select('id,customer_email,subtotal,discount_code,discount_amount,total,provider_fee,net_amount,payment_provider,payment_status,payment_method,payment_reference,paid_at,status,created_at,commission_recipients(name,role)').order('created_at', { ascending: false }).limit(300),
        admin.from('commission_recipients').select('*').order('created_at', { ascending: false }),
        admin.from('discount_coupons').select('*,commission_recipients(name)').order('created_at', { ascending: false }),
        admin.from('commissions').select('*,commission_recipients(name,role),orders(id,customer_email,discount_code,total,paid_at)').order('created_at', { ascending: false }).limit(500),
        admin.from('payment_events').select('*').order('created_at', { ascending: false }).limit(120),
      ]);
      if (ordersResult.error || recipientsResult.error || couponsResult.error || commissionsResult.error || eventsResult.error) return json({ error: 'unable_to_load_finance' }, 500, origin);
      return json({ mercadoPagoConfigured: Boolean(Deno.env.get('MERCADO_PAGO_ACCESS_TOKEN')), orders: ordersResult.data || [], recipients: recipientsResult.data || [], coupons: couponsResult.data || [], commissions: commissionsResult.data || [], paymentEvents: eventsResult.data || [] }, 200, origin);
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
