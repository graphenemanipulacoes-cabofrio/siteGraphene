// Mercado Pago: funções usadas pela create-checkout, process-payment, payment-webhook e admin-orders.
// Sem acesso ao banco e sem segredos no código. Nunca registrar em log o corpo enviado ou recebido
// do Mercado Pago (token do cartão, CPF, e-mail, nome, telefone, endereço, QR do Pix).

export const mpApiBase = 'https://api.mercadopago.com';
export const mpPaymentIdPattern = /^\d{1,20}$/;
const mpDetailPattern = /^[a-z0-9_]{1,60}$/;
const mpMethodPattern = /^[a-z_]{1,40}$/;
const mpPublicKeyPattern = /^(APP_USR|TEST)-[A-Za-z0-9-]{10,}$/;
// Só estes caminhos da API podem ser chamados pelas funções.
const mpAllowedPath = /^\/(v1\/payments(\/\d{1,20}(\/refunds)?|\/search\?[A-Za-z0-9_=&.%-]*)?|checkout\/preferences)$/;

export const mpDigits = (value: unknown) => String(value ?? '').replace(/\D/g, '');
// Número do Mercado Pago (number ou texto numérico). Valor que não é número segue como texto,
// para a apply_mp_payment recusar com invalid_payment em vez de gravar um valor errado.
const mpNumber = (value: unknown) => {
  if (value === null || value === undefined || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : String(value);
};
// Código curto do Mercado Pago (status, status_detail, meio): só letras minúsculas, números e "_".
export const mpSafeCode = (value: unknown, pattern = mpDetailPattern) => {
  const text = typeof value === 'string' ? value.trim().toLowerCase() : '';
  return pattern.test(text) ? text : null;
};
const mpDate = (value: unknown) => typeof value === 'string' && value && !Number.isNaN(Date.parse(value)) ? value : null;

// Pagamento do Mercado Pago no formato que a RPC apply_mp_payment espera.
// Taxa e líquido seguem a regra antiga do aviso: soma de fee_details e net_received_amount.
// deno-lint-ignore no-explicit-any
export function normalizePayment(mp: any, fallbackId = '') {
  const id = String(mp?.id ?? fallbackId ?? '');
  const amount = mpNumber(mp?.transaction_amount);
  const fees = Array.isArray(mp?.fee_details)
    ? Math.round(mp.fee_details.reduce((sum: number, fee: Record<string, unknown>) => sum + (Number(fee?.amount) || 0), 0) * 100) / 100
    : 0;
  const netReceived = mpNumber(mp?.transaction_details?.net_received_amount);
  const net = netReceived ?? (typeof amount === 'number' ? Math.round((amount - fees) * 100) / 100 : null);
  const methodId = mpSafeCode(mp?.payment_method_id, mpMethodPattern);
  const metadata = mp?.metadata && typeof mp.metadata === 'object' ? mp.metadata : {};
  const transaction = mp?.point_of_interaction?.transaction_data;
  const pix = methodId === 'pix' && transaction && typeof transaction === 'object'
    ? {
      qr_code: typeof transaction.qr_code === 'string' ? transaction.qr_code : null,
      qr_code_base64: typeof transaction.qr_code_base64 === 'string' ? transaction.qr_code_base64.replace(/\s/g, '') : null,
      expires_at: mpDate(mp?.date_of_expiration),
    }
    : null;
  return {
    id,
    external_reference: mp?.external_reference == null ? null : String(mp.external_reference),
    status: mpSafeCode(mp?.status, mpMethodPattern),
    status_detail: mpSafeCode(mp?.status_detail),
    amount,
    refunded_amount: mpNumber(mp?.transaction_amount_refunded) ?? 0,
    method_type: mpSafeCode(mp?.payment_type_id, mpMethodPattern),
    method_id: methodId,
    installments: mpNumber(mp?.installments),
    fee: fees,
    net,
    date_approved: mpDate(mp?.date_approved),
    attempt_key: typeof metadata.attempt_key === 'string' ? metadata.attempt_key : null,
    pix,
  };
}

// Soma dos itens em centavos (o Checkout Pro cobra exatamente essa soma).
export const itemsTotalCents = (items: Array<{ unit_price: number; quantity: number }>) =>
  items.reduce((sum, item) => sum + Math.round(Number(item.unit_price) * 100) * Number(item.quantity), 0);

// Itens enviados ao Mercado Pago: com desconto, um item único com o total; sem desconto,
// os produtos e mais a entrega. Mesma regra da preferência do Checkout Pro.
export function providerItems({ orderId, total, discount, shipping, items, couponCode = '', currency = false }: {
  orderId: string; total: number; discount: number; shipping: number;
  items: Array<{ product_id: unknown; title: unknown; quantity: unknown; unit_price: unknown }>;
  couponCode?: string; currency?: boolean;
}) {
  const withCurrency = (item: { id: string; title: string; quantity: number; unit_price: number }) => currency ? { ...item, currency_id: 'BRL' } : item;
  if (Number(discount || 0) > 0) {
    return [withCurrency({ id: `order-${orderId}`, title: `Pedido Graphène${couponCode ? ` · cupom ${couponCode}` : ''}`, quantity: 1, unit_price: Number(total) })];
  }
  return [
    ...items.map(item => withCurrency({ id: String(item.product_id), title: String(item.title ?? '').slice(0, 250), quantity: Number(item.quantity), unit_price: Number(item.unit_price) })),
    // Frete calculado no pedido (painel admin > Frete e entrega).
    ...(Number(shipping || 0) > 0 ? [withCurrency({ id: 'frete', title: 'Entrega', quantity: 1, unit_price: Number(shipping) })] : []),
  ];
}

// Cabeçalhos extras aceitos pelo mpFetch (lista fixa). Com X-Render-In-Process-Refunds: true, o estorno
// de Pix em contingência volta 201 com status 'in_process' (sem ele, o Mercado Pago responde 400).
const mpExtraHeaderNames = new Set(['X-Render-In-Process-Refunds']);
export const mpInProcessRefundsHeader = { 'X-Render-In-Process-Refunds': 'true' };

// Chamada à API do Mercado Pago com prazo. Devolve o status HTTP e o JSON (ou null), nunca lança
// (só para caminho ou cabeçalho fora da lista, que é erro de código).
// network = true quando não houve resposta (rede ou prazo esgotado).
export async function mpFetch(path: string, { token, method = 'GET', body, idempotencyKey, deviceId, extraHeaders, timeoutMs = 15000 }: {
  token: string; method?: string; body?: unknown; idempotencyKey?: string; deviceId?: string; extraHeaders?: Record<string, string>; timeoutMs?: number;
}) {
  if (!mpAllowedPath.test(path)) throw new Error('mercado_pago_path_not_allowed');
  const headers: Record<string, string> = { Authorization: `Bearer ${token}` };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (idempotencyKey) headers['X-Idempotency-Key'] = idempotencyKey;
  if (deviceId) headers['X-meli-session-id'] = deviceId;
  for (const [name, value] of Object.entries(extraHeaders || {})) {
    if (!mpExtraHeaderNames.has(name) || !/^[A-Za-z0-9_.-]{1,40}$/.test(String(value))) throw new Error('mercado_pago_header_not_allowed');
    headers[name] = String(value);
  }
  let response: Response;
  try {
    response = await fetch(mpApiBase + path, {
      method, headers, body: body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body),
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch {
    return { ok: false, status: 0, data: null, network: true };
  }
  // deno-lint-ignore no-explicit-any
  const data: any = await response.json().catch(() => null);
  return { ok: response.ok && data !== null && typeof data === 'object', status: response.status, data, network: false };
}

// Só os números de cause[].code do erro do Mercado Pago, para o log. Nunca a mensagem.
// deno-lint-ignore no-explicit-any
export const mpCauseCodes = (data: any) => (Array.isArray(data?.cause) ? data.cause : [])
  .map((cause: Record<string, unknown>) => String(cause?.code ?? ''))
  .filter((code: string) => /^\d{1,6}$/.test(code))
  .slice(0, 10);

// Prazo do Pix no horário de Brasília (-03:00). O mínimo aceito é 30 minutos a partir da emissão;
// 35 dá folga para a latência. A tela mostra sempre o date_of_expiration devolvido pelo Mercado Pago.
export const pixExpiration = (minutes = 35) => new Date(Date.now() + minutes * 60_000 - 3 * 3_600_000).toISOString().replace('Z', '-03:00');

export const splitName = (name: unknown) => {
  const parts = String(name ?? '').trim().split(/\s+/).filter(Boolean);
  return { first: (parts[0] || '').slice(0, 60), last: parts.slice(1).join(' ').slice(0, 120) };
};

// Telefone brasileiro em DDD + número (sem o 55 do país). Inválido: null.
export const phoneParts = (phone: unknown) => {
  let digits = mpDigits(phone);
  if ((digits.length === 12 || digits.length === 13) && digits.startsWith('55')) digits = digits.slice(2);
  if (digits.length < 10 || digits.length > 11) return null;
  return { area_code: digits.slice(0, 2), number: digits.slice(2) };
};

// Remove campos vazios (o Mercado Pago recusa alguns campos vazios em vez de ignorá-los).
export function mpCompact<T>(value: T): T {
  if (Array.isArray(value)) return value.map(item => mpCompact(item)) as T;
  if (!value || typeof value !== 'object') return value;
  const entries = Object.entries(value as Record<string, unknown>)
    .map(([key, item]) => [key, mpCompact(item)] as const)
    .filter(([, item]) => item !== undefined && item !== null && item !== '' && !(typeof item === 'object' && !Array.isArray(item) && Object.keys(item as object).length === 0));
  return Object.fromEntries(entries) as T;
}

// Modo do checkout (segredo MERCADO_PAGO_CHECKOUT_MODE): vazio ou desconhecido = redirect (Checkout Pro).
export const checkoutModeSetting = () => {
  const value = (Deno.env.get('MERCADO_PAGO_CHECKOUT_MODE') || '').trim().toLowerCase();
  return value === 'brick' || value === 'brick_staff' ? value : 'redirect';
};
// brick_staff: pagamento no site só para contas da equipe (admin, farmacêutico, balcão).
// deno-lint-ignore no-explicit-any
export async function brickEnabledFor(authClient: any, mode = checkoutModeSetting()) {
  if (mode === 'brick') return true;
  if (mode !== 'brick_staff') return false;
  try {
    const { data, error } = await authClient.rpc('current_staff_role');
    return !error && ['admin', 'farmaceutico', 'balcao'].includes(String(data));
  } catch {
    return false;
  }
}
// Máximo de parcelas (segredo opcional MERCADO_PAGO_MAX_INSTALLMENTS, de 1 a 12; sem ele ou inválido, 12).
export const maxInstallmentsSetting = () => {
  const installments = Number((Deno.env.get('MERCADO_PAGO_MAX_INSTALLMENTS') || '').trim() || 12);
  return Number.isInteger(installments) && installments >= 1 && installments <= 12 ? installments : 12;
};
// Public Key (vai ao navegador) e parcelas. Sem Public Key válida: null.
export const brickSettings = () => {
  const publicKey = (Deno.env.get('MERCADO_PAGO_PUBLIC_KEY') || '').trim();
  return mpPublicKeyPattern.test(publicKey) ? { publicKey, maxInstallments: maxInstallmentsSetting() } : null;
};
