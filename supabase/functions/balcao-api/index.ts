import { createClient } from 'npm:@supabase/supabase-js@2';
import { allowedOrigin, json } from '../_shared/http.ts';
import { adminUsernamePattern, hashPassword, hashToken, newToken, normalizeUsername, validUsername, validPassword, verifyAdminPassword, verifyPassword, orderStatuses, paymentStatuses, uuidPattern, requestIdPattern, prescriptionReferences, prescriptionLocation } from '../_shared/counter-security.ts';

const text = (value: unknown, limit = 120) => typeof value === 'string' ? value.trim().slice(0, limit) : '';
const accountFields = 'id,username,display_name,role,is_active,created_at,updated_at';
const orderFields = 'id,customer_email,customer_document,shipping_address,subtotal,shipping_amount,total,discount_code,discount_amount,status,payment_status,payment_reference,payment_method,paid_at,carrier,tracking_code,invoice_number,invoice_url,admin_notes,shipped_at,delivered_at,created_at,updated_at,order_items(id,product_id,product_name,unit_price,quantity,variant)';
const requestFields = 'id,created_at,nome_cliente,whatsapp,status,observacoes';
const adminActions = new Set(['list_accounts', 'save_account', 'revoke_account', 'delete_account']);
const counterActions = new Set(['session', 'logout', 'summary', 'list_orders', 'order_detail', 'list_requests', 'request_detail']);
// Cadastro de produtos: só contas do tipo farmacêutico (e administradores).
const productActions = new Set(['products_list', 'product_save', 'product_delete', 'products_reorder', 'product_image_upload', 'flavor_save', 'flavor_delete']);
const roles = new Set(['balcao', 'farmaceutico']);
// Regras de frete (painel admin > Frete e entrega): só administradores alteram.
const settingsActions = new Set(['shipping_save']);
const shippingZones = ['rj', 'sudeste', 'sul', 'centro-oeste', 'nordeste', 'norte'];
function cleanShipping(raw: unknown, current: Record<string, unknown>) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const input = raw as Record<string, unknown>;
  const freeMin = moneyValue(input.free_min);
  if (Number.isNaN(freeMin) || (freeMin !== null && freeMin > 100_000)) return null;
  const zonesIn = Array.isArray(input.zones) ? input.zones as Record<string, unknown>[] : [];
  const zonesNow = Array.isArray(current.zones) ? current.zones as Record<string, unknown>[] : [];
  const zones = [];
  for (const zone of zonesNow) {
    if (!shippingZones.includes(String(zone.id))) continue;
    const update = zonesIn.find(item => item && item.id === zone.id) || zone;
    const price = moneyValue(update.price);
    const daysMin = Number(update.days_min);
    const daysMax = Number(update.days_max);
    if (price === null || Number.isNaN(price) || price > 1_000 || !Number.isInteger(daysMin) || !Number.isInteger(daysMax) || daysMin < 0 || daysMax < daysMin || daysMax > 90) return null;
    zones.push({ ...zone, price, days_min: daysMin, days_max: daysMax });
  }
  return { ...current, free_min: freeMin && freeMin > 0 ? freeMin : null, zones };
}
const productImageTypes: Record<string, string> = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp' };
const productImagePattern = /^(?:https:\/\/\S+|\/assets\/products\/[a-z0-9_-]+\.(?:png|jpe?g|webp))$/;
// Quantidades e sabores do produto (migração 202610230001). O preço de cada
// quantidade fica aqui; o pedido é calculado no banco a partir deste cadastro.
const slugify = (value: string) => value.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40);
const moneyValue = (value: unknown) => {
  if (value === '' || value === null || value === undefined) return null;
  const amount = Number(value);
  return Number.isFinite(amount) && amount >= 0 && amount <= 1_000_000 ? Math.round(amount * 100) / 100 : NaN;
};
type ProductOptions = { sizes: { id: string; label: string; price: number | null }[]; flavors: string[]; natural: boolean; flavor_price: number };
function cleanOptions(raw: unknown, flavorIds: Set<string>): ProductOptions | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const input = raw as Record<string, unknown>;
  const sizesIn = Array.isArray(input.sizes) ? input.sizes : [];
  if (sizesIn.length > 12) return null;
  const sizes: ProductOptions['sizes'] = [];
  for (const item of sizesIn) {
    if (!item || typeof item !== 'object') return null;
    const label = text((item as Record<string, unknown>).label, 40);
    const id = slugify(label);
    const price = moneyValue((item as Record<string, unknown>).price);
    if (!label || id.length < 1 || sizes.some(size => size.id === id) || Number.isNaN(price)) return null;
    sizes.push({ id, label, price: price && price > 0 ? price : null });
  }
  const flavorsIn = Array.isArray(input.flavors) ? input.flavors : [];
  if (flavorsIn.length > 60) return null;
  const flavors = [...new Set(flavorsIn.filter((flavor): flavor is string => typeof flavor === 'string' && flavorIds.has(flavor)))];
  const flavorPrice = moneyValue(input.flavor_price);
  if (Number.isNaN(flavorPrice)) return null;
  return { sizes, flavors, natural: input.natural === true, flavor_price: flavorPrice || 0 };
}
// Administradores entram em qualquer área da equipe com o login do painel admin.
// O token é o mesmo formato do painel (43 caracteres); o da equipe tem 64.
const adminTokenPattern = /^[A-Za-z0-9_-]{43}$/;
const newAdminToken = () => btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32)))).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
// Mesma regra da função admin-login (tabela admins).
// deno-lint-ignore no-explicit-any
async function verifyAdmin(db: any, rawUsername: unknown, rawPassword: unknown) {
  const username = typeof rawUsername === 'string' ? rawUsername.trim().slice(0, 80) : '';
  const password = typeof rawPassword === 'string' ? rawPassword.trim().slice(0, 200) : '';
  if (!username || !password || username.includes('*')) return null;
  const { data: record } = await db.from('admins').select('id,username,password').ilike('username', adminUsernamePattern(username)).maybeSingle();
  const match = record && String(record.username).toLowerCase() === username.toLowerCase() ? record : null;
  const { valid, upgrade } = await verifyAdminPassword(password, match?.password);
  if (!match || !valid) return null;
  // Senhas antigas passam para o formato forte assim que o admin entra.
  if (upgrade) await db.from('admins').update({ password: await hashPassword(password) }).eq('id', match.id);
  return String(match.username);
}

Deno.serve(async (req: Request) => {
  const origin = allowedOrigin(req.headers.get('origin'));
  if (req.method === 'OPTIONS') return json({}, origin ? 204 : 403, origin || undefined);
  if (!origin || req.method !== 'POST') return json({ error: 'request_not_allowed' }, 403, origin || undefined);
  if (Number(req.headers.get('content-length')) > 16_000) return json({ error: 'invalid_request' }, 400, origin);
  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false, autoRefreshToken: false } });
  try {
    const raw = await req.text();
    if (raw.length > 16_000) return json({ error: 'invalid_request' }, 400, origin);
    const body = JSON.parse(raw);
    if (!body || typeof body !== 'object' || Array.isArray(body)) return json({ error: 'invalid_request' }, 400, origin);
    const action = text(body.action, 40);

    if (adminActions.has(action)) {
      const token = req.headers.get('x-admin-token') || '';
      if (!/^[a-zA-Z0-9_-]{32,100}$/.test(token)) return json({ error: 'unauthorized' }, 401, origin);
      const { data: session, error: sessionError } = await admin.from('admin_sessions').select('admin_username').eq('token_hash', await hashToken(token)).gt('expires_at', new Date().toISOString()).maybeSingle();
      if (sessionError || !session) return json({ error: 'unauthorized' }, 401, origin);
      if (action === 'list_accounts') {
        const [accounts, sessions] = await Promise.all([
          admin.from('counter_accounts').select(accountFields).order('created_at', { ascending: false }),
          admin.from('counter_sessions').select('account_id,created_at,last_used_at,device_label').is('revoked_at', null).order('last_used_at', { ascending: false }),
        ]);
        if (accounts.error || sessions.error) return json({ error: 'unable_to_load_accounts' }, 500, origin);
        return json({ accounts: (accounts.data || []).map(account => ({ ...account, sessions: (sessions.data || []).filter(item => item.account_id === account.id) })) }, 200, origin);
      }
      const id = text(body.id, 36);
      if (id && !uuidPattern.test(id)) return json({ error: 'invalid_account' }, 400, origin);
      const username = normalizeUsername(body.username);
      const displayName = text(body.displayName, 100);
      const password = typeof body.password === 'string' ? body.password : '';
      const role = body.role === undefined ? 'balcao' : text(body.role, 20);
      if (action === 'save_account' && (!validUsername(username) || displayName.length < 2 || !roles.has(role) || ((!id || password) && !validPassword(password)) || (id && typeof body.isActive !== 'boolean'))) return json({ error: 'invalid_account' }, 400, origin);
      if ((action === 'revoke_account' || action === 'delete_account') && !id) return json({ error: 'invalid_account' }, 400, origin);
      const { data: savedId, error } = await admin.rpc('counter_manage_account', {
        p_action: action === 'revoke_account' ? 'revoke' : action === 'delete_account' ? 'delete' : id ? 'save' : 'create', p_id: id || null, p_role: role,
        p_username: username, p_display_name: displayName,
        p_password_hash: password ? await hashPassword(password) : null,
        p_is_active: body.isActive ?? true, p_admin_username: session.admin_username,
      });
      if (error) return json({ error: error.code === '23505' ? 'username_exists' : 'unable_to_save_account' }, 400, origin);
      return json({ id: savedId, ok: true }, 200, origin);
    }

    if (action === 'login') {
      const username = normalizeUsername(body.username);
      const password = typeof body.password === 'string' ? body.password : '';
      const ip = req.headers.get('cf-connecting-ip') || req.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown';
      const keys = ['ip:' + await hashToken(ip), 'user:' + await hashToken(username.slice(0, 100))];
      const { data: allowed, error: rateError } = await admin.rpc('counter_take_login_attempt', { p_keys: keys });
      if (rateError) return json({ error: 'login_unavailable' }, 503, origin);
      if (!allowed) return json({ error: 'too_many_attempts' }, 429, origin);
      const counterShaped = validUsername(username) && validPassword(password);
      const { data: account } = counterShaped
        ? await admin.from('counter_accounts').select('id,username,display_name,role,password_hash,auth_version,is_active').eq('username', username).maybeSingle()
        : { data: null };
      // Equal-cost verification prevents a missing account from being exposed by timing.
      const dummyHash = 'pbkdf2-sha256$600000$00000000000000000000000000000000$0000000000000000000000000000000000000000000000000000000000000000';
      const valid = await verifyPassword(password, account?.password_hash || dummyHash);
      if (account?.is_active && valid) {
        // A página do farmacêutico só aceita contas desse tipo; o balcão aceita as duas.
        if (text(body.area, 20) === 'farmaceutico' && account.role !== 'farmaceutico') return json({ error: 'wrong_area' }, 403, origin);
        const token = newToken();
        const { error } = await admin.from('counter_sessions').insert({ token_hash: await hashToken(token), account_id: account.id, auth_version: account.auth_version, device_label: text(body.deviceLabel, 120) || (text(body.area, 20) === 'farmaceutico' ? 'Navegador do farmacêutico' : 'Navegador do balcão') });
        if (error) return json({ error: 'login_unavailable' }, 503, origin);
        await admin.from('counter_login_limits').delete().eq('key', keys[1]);
        return json({ token, user: { username: account.username, displayName: account.display_name, role: account.role } }, 200, origin);
      }
      // Não é conta da equipe: confere se é um administrador. Sessão igual à do painel (8 horas).
      const adminUsername = await verifyAdmin(admin, body.username, body.password);
      if (!adminUsername) return json({ error: 'invalid_credentials' }, 401, origin);
      const adminToken = newAdminToken();
      const expiresAt = new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString();
      const { error } = await admin.from('admin_sessions').insert({ token_hash: await hashToken(adminToken), admin_username: adminUsername, expires_at: expiresAt });
      if (error) return json({ error: 'login_unavailable' }, 503, origin);
      await admin.from('counter_login_limits').delete().eq('key', keys[1]);
      return json({ token: adminToken, expiresAt, user: { username: adminUsername, displayName: adminUsername, role: 'admin' } }, 200, origin);
    }

    if (!counterActions.has(action) && !productActions.has(action) && !settingsActions.has(action)) return json({ error: 'invalid_action' }, 400, origin);
    const token = text(body.sessionToken, 100);
    const isAdmin = adminTokenPattern.test(token);
    if (!isAdmin && !/^[a-f0-9]{64}$/.test(token)) return json({ error: 'unauthorized' }, 401, origin);
    const tokenHash = await hashToken(token);
    let account: { username: string; display_name: string; role: string } | null = null;
    if (isAdmin) {
      // Sessão do painel admin: vale em todas as áreas da equipe.
      const { data, error } = await admin.from('admin_sessions').select('admin_username').eq('token_hash', tokenHash).gt('expires_at', new Date().toISOString()).maybeSingle();
      if (!error && data?.admin_username) account = { username: data.admin_username, display_name: data.admin_username, role: 'admin' };
    } else {
      const { data: session, error } = await admin.from('counter_sessions').select('account_id,auth_version,counter_accounts!inner(username,display_name,role,is_active,auth_version)').eq('token_hash', tokenHash).is('revoked_at', null).maybeSingle();
      const staff = session?.counter_accounts as unknown as { username: string; display_name: string; role: string; is_active: boolean; auth_version: number } | undefined;
      if (!error && session && staff?.is_active && session.auth_version === staff.auth_version) account = staff;
    }
    if (!account) return json({ error: 'unauthorized' }, 401, origin);
    if (action === 'logout') {
      // Sair do admin apaga a sessão, como no painel; a da equipe é revogada.
      const { error } = isAdmin
        ? await admin.from('admin_sessions').delete().eq('token_hash', tokenHash)
        : await admin.from('counter_sessions').update({ revoked_at: new Date().toISOString() }).eq('token_hash', tokenHash);
      return error ? json({ error: 'logout_unavailable' }, 503, origin) : json({ ok: true }, 200, origin);
    }
    await admin.from(isAdmin ? 'admin_sessions' : 'counter_sessions').update({ last_used_at: new Date().toISOString() }).eq('token_hash', tokenHash);
    if (action === 'session') return json({ user: { username: account.username, displayName: account.display_name, role: account.role } }, 200, origin);
    if (settingsActions.has(action)) {
      if (account.role !== 'admin') return json({ error: 'forbidden' }, 403, origin);
      const { data: config, error: configError } = await admin.from('loja_config').select('frete').eq('id', 1).maybeSingle();
      if (configError || !config) return json({ error: 'unable_to_load_data' }, 500, origin);
      const frete = cleanShipping(body.frete, config.frete || {});
      if (!frete) return json({ error: 'invalid_shipping' }, 400, origin);
      const { error } = await admin.from('loja_config').update({ frete, updated_at: new Date().toISOString(), updated_by: account.username }).eq('id', 1);
      if (error) return json({ error: 'unable_to_save_settings' }, 500, origin);
      return json({ frete }, 200, origin);
    }
    if (productActions.has(action)) {
      if (account.role !== 'farmaceutico' && account.role !== 'admin') return json({ error: 'forbidden' }, 403, origin);
      if (action === 'products_list') {
        const { data, error } = await admin.from('produtos').select('*').order('display_order', { ascending: true }).order('created_at', { ascending: true });
        return error ? json({ error: 'unable_to_load_data' }, 500, origin) : json({ products: data || [] }, 200, origin);
      }
      if (action === 'product_image_upload') {
        const extension = text(body.extension, 5).toLowerCase();
        if (!productImageTypes[extension]) return json({ error: 'invalid_image_type' }, 400, origin);
        const path = `products/product_${Date.now()}_${crypto.randomUUID().slice(0, 8)}.${extension}`;
        const { data, error } = await admin.storage.from('receitas').createSignedUploadUrl(path);
        if (error || !data?.token) return json({ error: 'unable_to_prepare_upload' }, 500, origin);
        return json({ path: data.path, token: data.token, contentType: productImageTypes[extension] }, 200, origin);
      }
      if (action === 'products_reorder') {
        const ids = Array.isArray(body.ids) ? body.ids : [];
        if (ids.length < 1 || ids.length > 200 || ids.some((id: unknown) => !Number.isSafeInteger(id) || (id as number) < 1) || new Set(ids).size !== ids.length) return json({ error: 'invalid_product' }, 400, origin);
        for (const [index, id] of ids.entries()) {
          const { error } = await admin.from('produtos').update({ display_order: index }).eq('id', id);
          if (error) return json({ error: 'unable_to_save_product' }, 500, origin);
        }
        return json({ ok: true }, 200, origin);
      }
      // Catálogo de sabores: vale para todos os produtos; cada produto ativa os seus.
      if (action === 'flavor_save') {
        const name = text(body.name, 40);
        const id = slugify(name);
        if (!name || id.length < 2 || id === 'natural') return json({ error: 'invalid_flavor' }, 400, origin);
        const { data: last } = await admin.from('sabores').select('display_order').order('display_order', { ascending: false }).limit(1).maybeSingle();
        const { data, error } = await admin.from('sabores').insert({ id, name, display_order: Number(last?.display_order ?? -1) + 1 }).select('id,name,display_order').single();
        if (error) return json({ error: error.code === '23505' ? 'flavor_exists' : 'unable_to_save_flavor' }, error.code === '23505' ? 409 : 500, origin);
        return json({ flavor: data }, 200, origin);
      }
      if (action === 'flavor_delete') {
        const id = text(body.id, 40);
        if (!/^[a-z0-9-]{2,40}$/.test(id)) return json({ error: 'invalid_flavor' }, 400, origin);
        // Tira o sabor de todos os produtos antes de apagar do catálogo.
        const { data: withFlavor, error: listError } = await admin.from('produtos').select('id,options').contains('options', { flavors: [id] });
        if (listError) return json({ error: 'unable_to_save_flavor' }, 500, origin);
        for (const product of withFlavor || []) {
          const options = { ...(product.options || {}), flavors: (product.options?.flavors || []).filter((flavor: string) => flavor !== id) };
          const { error } = await admin.from('produtos').update({ options }).eq('id', product.id);
          if (error) return json({ error: 'unable_to_save_flavor' }, 500, origin);
        }
        const { error } = await admin.from('sabores').delete().eq('id', id);
        if (error) return json({ error: 'unable_to_save_flavor' }, 500, origin);
        return json({ ok: true, products: (withFlavor || []).length }, 200, origin);
      }
      const productId = body.id === null || body.id === undefined || body.id === '' ? null : Number(body.id);
      if (productId !== null && (!Number.isSafeInteger(productId) || productId < 1)) return json({ error: 'invalid_product' }, 400, origin);
      if (action === 'product_delete') {
        if (productId === null) return json({ error: 'invalid_product' }, 400, origin);
        const { data, error } = await admin.from('produtos').delete().eq('id', productId).select('id');
        if (error) return json({ error: 'unable_to_save_product' }, 500, origin);
        return data?.length ? json({ ok: true }, 200, origin) : json({ error: 'not_found' }, 404, origin);
      }
      const name = text(body.name, 180);
      const description = text(body.description, 4000) || null;
      const imageUrl = text(body.imageUrl, 1200) || null;
      const price = body.price === '' || body.price === null || body.price === undefined ? 0 : Number(body.price);
      if (!name || !Number.isFinite(price) || price < 0 || price > 1_000_000 || (imageUrl && !productImagePattern.test(imageUrl))) return json({ error: 'invalid_product' }, 400, origin);
      const values: Record<string, unknown> = { name, description, image_url: imageUrl, price: Math.round(price * 100) / 100 };
      if (body.options !== undefined) {
        const { data: catalog, error: catalogError } = await admin.from('sabores').select('id');
        if (catalogError) return json({ error: 'unable_to_save_product' }, 500, origin);
        const options = cleanOptions(body.options, new Set((catalog || []).map(flavor => flavor.id)));
        if (!options) return json({ error: 'invalid_product' }, 400, origin);
        values.options = options;
        // Com quantidades, o preço da vitrine é o menor preço preenchido ("a partir de").
        if (options.sizes.length) {
          const prices = options.sizes.map(size => size.price).filter((value): value is number => Boolean(value));
          values.price = prices.length ? Math.min(...prices) : 0;
        }
      }
      if (productId === null) {
        // Produto novo entra no fim da vitrine.
        const { data: last } = await admin.from('produtos').select('display_order').order('display_order', { ascending: false, nullsFirst: false }).limit(1).maybeSingle();
        values.display_order = Number(last?.display_order ?? -1) + 1;
      }
      const { data, error } = productId === null
        ? await admin.from('produtos').insert(values).select('*').single()
        : await admin.from('produtos').update(values).eq('id', productId).select('*').maybeSingle();
      if (error) return json({ error: 'unable_to_save_product' }, 500, origin);
      return data ? json({ product: data }, 200, origin) : json({ error: 'not_found' }, 404, origin);
    }
    if (action === 'summary') {
      const [preparation, shipped, requests] = await Promise.all([
        admin.from('orders').select('id', { count: 'exact', head: true }).eq('payment_status', 'paid').in('status', ['paid', 'processing']),
        admin.from('orders').select('id', { count: 'exact', head: true }).eq('status', 'shipped'),
        admin.from('solicitacoes').select('id', { count: 'exact', head: true }).or('status.eq.active,status.is.null'),
      ]);
      if (preparation.error || shipped.error || requests.error) return json({ error: 'unable_to_load_data' }, 500, origin);
      return json({ preparation: preparation.count, shipped: shipped.count, requests: requests.count }, 200, origin);
    }
    const offset = Math.max(0, Math.min(1_000_000, Math.trunc(Number(body.offset) || 0)));
    if (action === 'list_orders' || action === 'list_requests') {
      const isOrder = action === 'list_orders';
      let query = admin.from(isOrder ? 'orders' : 'solicitacoes').select(isOrder ? orderFields : requestFields, { count: 'exact' }).order('created_at', { ascending: false }).order('id', { ascending: false });
      const search = text(body.search, 100).replace(/[^\p{L}\p{N}\s@._-]/gu, '').trim();
      const status = text(body.status, 30);
      const payment = text(body.payment, 20);
      if (isOrder && orderStatuses.includes(status)) query = query.eq('status', status);
      if (isOrder && status === 'preparation') query = query.eq('payment_status', 'paid').in('status', ['paid', 'processing']);
      if (isOrder && paymentStatuses.includes(payment)) query = query.eq('payment_status', payment);
      if (!isOrder) query = query.or('status.eq.active,status.is.null');
      if (search) {
        if (isOrder && uuidPattern.test(search)) query = query.eq('id', search);
        else if (!isOrder && requestIdPattern.test(search)) query = query.or(`id.eq.${search},whatsapp.ilike.%${search}%`);
        else query = query.or(isOrder ? `customer_email.ilike.%${search}%,customer_document.ilike.%${search}%,shipping_address->>name.ilike.%${search}%,shipping_address->>phone.ilike.%${search}%,shipping_address->>address.ilike.%${search}%` : `nome_cliente.ilike.%${search}%,whatsapp.ilike.%${search}%`);
      }
      for (const [key, operation] of [['from', 'gte'], ['to', 'lte']] as const) {
        if (body[key]) {
          const date = text(body[key], 10);
          if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(date))) return json({ error: 'invalid_date' }, 400, origin);
          query = operation === 'gte' ? query.gte('created_at', `${date}T00:00:00-03:00`) : query.lte('created_at', `${date}T23:59:59.999-03:00`);
        }
      }
      const { data, error, count } = await query.range(offset, offset + 49);
      if (error) return json({ error: 'unable_to_load_data' }, 500, origin);
      return json({ rows: data || [], total: count || 0, offset, pageSize: 50 }, 200, origin);
    }
    if (action === 'order_detail') {
      if (!uuidPattern.test(text(body.id, 36))) return json({ error: 'invalid_id' }, 400, origin);
      const { data: order, error } = await admin.from('orders').select(orderFields).eq('id', body.id).maybeSingle();
      if (error || !order) return json({ error: 'not_found' }, 404, origin);
      const ids = (order.order_items || []).map(item => item.product_id).filter(Boolean);
      const { data: products } = ids.length ? await admin.from('produtos').select('id,name,description,image_url').in('id', ids) : { data: [] };
      return json({ order, products: products || [] }, 200, origin);
    }
    if (action === 'request_detail') {
      if (!requestIdPattern.test(String(body.id))) return json({ error: 'invalid_id' }, 400, origin);
      const { data: request, error } = await admin.from('solicitacoes').select(requestFields + ',arquivo_url').eq('id', body.id).maybeSingle();
      if (error || !request || request.status === 'trash') return json({ error: 'not_found' }, 404, origin);
      const files = [];
      for (const reference of prescriptionReferences(request.arquivo_url)) {
        const location = prescriptionLocation(reference, Deno.env.get('SUPABASE_URL')!);
        if (!location) continue;
        const { data, error: fileError } = await admin.storage.from(location.bucket).createSignedUrl(location.path, 300);
        if (!fileError && data?.signedUrl) files.push({ name: location.path.split('/').pop(), url: data.signedUrl, legacy: location.path.startsWith('legacy/') });
      }
      const { arquivo_url: _privateReference, ...details } = request;
      return json({ request: details, files, linksExpireIn: 300 }, 200, origin);
    }
    return json({ error: 'invalid_action' }, 400, origin);
  } catch { return json({ error: 'internal_error' }, 500, origin); }
});
