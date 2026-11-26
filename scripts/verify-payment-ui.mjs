// Pagamento no próprio site: telas do Pix e do cartão, tradução do Brick e regras de carregamento do SDK.
// Só desenha as telas com dados sintéticos (Vite SSR). Nenhuma sessão, pedido, pagamento ou chamada de rede.
// Uso: node scripts/verify-payment-ui.mjs
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { createServer } from 'vite';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';

const orderId = '12345678-1234-4234-8234-123456789abc';
const paidPaymentId = '1234567890';
const adminOrder = {
    id: orderId, customer_email: 'synthetic@example.invalid', customer_document: '', shipping_address: { name: 'Cliente sintético' }, total: 5, status: 'awaiting_payment',
    payment_status: 'pending', payment_reference: 'pref-synthetic', paid_payment_id: null, payment_provider: 'mercado_pago', payment_details: {}, created_at: '2026-11-26T12:00:00Z', order_items: [],
    payment_attempts: [
        { id: 'a1', method: 'pix', status: 'cancelled', provider_payment_id: '111', created_at: '2026-11-26T12:01:00Z' },
        { id: 'a2', method: 'card', status: 'rejected', provider_payment_id: '222', created_at: '2026-11-26T12:05:00Z' },
    ],
};
const paidOrder = { ...adminOrder, id: '22345678-1234-4234-8234-123456789abc', status: 'paid', payment_status: 'paid', paid_payment_id: paidPaymentId, payment_attempts: [{ id: 'a3', method: 'card', status: 'approved', provider_payment_id: paidPaymentId, created_at: '2026-11-26T12:10:00Z' }] };
let expanded = orderId;
const finance = {
    orders: [], recipients: [], coupons: [], commissions: [], paymentEvents: [], mercadoPagoConfigured: true,
    paymentAlerts: [
        { id: 'e1', decision: 'duplicate_approved', order_id: orderId, provider_payment_id: '333', gross_amount: 5, attempt_status: 'approved', created_at: '2026-11-26T12:20:00Z' },
        { id: 'e2', decision: 'duplicate_approved', order_id: orderId, provider_payment_id: '444', gross_amount: 5, attempt_status: 'refunded', created_at: '2026-11-26T12:21:00Z' },
        { id: 'e3', decision: 'mediation', order_id: orderId, provider_payment_id: '555', gross_amount: 5, attempt_status: 'in_mediation', created_at: '2026-11-26T12:22:00Z' },
        // Linha de alerta da apply_mp_payment: status 'alert' e o outro pedido pago do cliente.
        { id: 'e4', decision: 'duplicate_order', status: 'alert', order_id: orderId, provider_payment_id: '666', gross_amount: 7, attempt_status: 'approved', related_order_id: '22345678-1234-4234-8234-1234deadbeef', created_at: '2026-11-26T12:23:00Z' },
    ],
};
finance.paymentEvents = [
    { id: 'v1', status: 'approved', payment_method: 'credit_card', gross_amount: 5, created_at: '2026-11-26T12:20:00Z' },
    { id: 'v2', status: 'alert', payment_method: 'linha-de-alerta-sintetica', gross_amount: 7, created_at: '2026-11-26T12:23:00Z' },
];

const server = await createServer({
    configLoader: 'native', server: { middlewareMode: true }, cacheDir: 'node_modules/.vite-payment-test', optimizeDeps: { noDiscovery: true, include: [] },
    plugins: [{ name: 'isolated-payment-ui', enforce: 'pre', transform(code, id) {
        const path = id.replaceAll('\\', '/').split('?')[0];
        if (path.endsWith('/src/lib/supabaseClient.ts')) return { code: 'export const supabase = {};', map: null };
        if (path.endsWith('/src/components/AdminOrders.jsx')) return { code: code.replace('const [orders, setOrders] = useState([]);', `const [orders, setOrders] = useState(${JSON.stringify([adminOrder, paidOrder])});`).replace('const [loading, setLoading] = useState(true);', 'const [loading, setLoading] = useState(false);').replace("const [expanded, setExpanded] = useState('');", `const [expanded, setExpanded] = useState(${JSON.stringify(expanded)});`), map: null };
        if (path.endsWith('/src/components/AdminFinance.jsx')) return { code: code.replace('useState(true)', 'useState(false)').replace('useState({ orders: [], recipients: [], coupons: [], commissions: [], paymentEvents: [], paymentAlerts: [], mercadoPagoConfigured: false })', `useState(${JSON.stringify(finance)})`), map: null };
    } }],
});
const html = (Component, props = {}) => renderToStaticMarkup(createElement(MemoryRouter, null, createElement(Component, props)));
const load = async path => (await server.ssrLoadModule(path));
// Objetos criados pelos módulos carregados: comparar pelo conteúdo.
const plainView = value => JSON.parse(JSON.stringify(value));

try {
    // ===== Tradução do envio do Brick (função pura, sem rede) =====
    const { brickToPayBody, PaymentInputError } = await load('/src/lib/brickPayment.js');
    const formData = { token: 'tok_synthetic_0123456789abcdef', issuer_id: '25', payment_method_id: 'visa', transaction_amount: 1, installments: 3, payer: { email: 'outro@example.invalid', identification: { type: 'CPF', number: '123.456.789-09' } } };
    const expected = { method: 'card', card: { token: formData.token, paymentMethodId: 'visa', issuerId: '25', installments: 3, identification: { type: 'CPF', number: '12345678909' } } };
    for (const selected of ['credit_card', 'creditCard']) assert.deepEqual(brickToPayBody(selected, formData), expected, `${selected} aceito`);
    const body = brickToPayBody('credit_card', formData);
    assert.ok(!JSON.stringify(body).includes('transaction_amount') && !JSON.stringify(body).includes('outro@example.invalid'), 'valor e e-mail do navegador ficam de fora');
    assert.deepEqual(brickToPayBody('credit_card', { ...formData, issuer_id: null }).card.issuerId, undefined);
    assert.equal(brickToPayBody('credit_card', { ...formData, issuer_id: 25 }).card.issuerId, '25');
    assert.equal(brickToPayBody('credit_card', { ...formData, payer: { identification: { type: 'CNPJ', number: '11.222.333/0001-81' } } }).card.identification.type, 'CNPJ');
    const rejects = (selected, data, options) => assert.throws(() => brickToPayBody(selected, data, options), error => error instanceof PaymentInputError && error.code === 'invalid_payment_request');
    for (const selected of ['bank_transfer', 'debit_card', 'debitCard', 'ticket', 'wallet_purchase', 'atm', 'prepaidCard', '', undefined, null]) rejects(selected, formData);
    rejects('bank_transfer', { payment_method_id: 'pix', transaction_amount: 1, payer: { email: 'x@example.invalid' } });
    for (const method of ['pix', 'account_money', 'bolbradesco', 'pec', 'debvisa', 'debmaster', 'debelo', 'VISA', 'visa<script>', '']) rejects('credit_card', { ...formData, payment_method_id: method });
    for (const token of ['', 'short', 'tok with spaces 0123456', 'x'.repeat(129)]) rejects('credit_card', { ...formData, token });
    for (const installments of [0, 13, 1.5, '3x', null]) rejects('credit_card', { ...formData, installments });
    rejects('credit_card', { ...formData, installments: 7 }, { maxInstallments: 6 });
    assert.equal(brickToPayBody('credit_card', { ...formData, installments: 6 }, { maxInstallments: 6 }).card.installments, 6);
    for (const payer of [null, {}, { identification: { type: 'CPF', number: '11111111111' } }, { identification: { type: 'CPF', number: '12345678900' } }, { identification: { type: 'RG', number: '123456789' } }]) rejects('credit_card', { ...formData, payer });
    rejects('credit_card', { ...formData, issuer_id: 'abc' });
    rejects('credit_card', null);
    // Bandeira de crédito fora da lista do servidor: código próprio, mensagem clara e nenhuma chamada.
    const { ACCEPTED_CARD_BRANDS } = await load('/src/lib/brickPayment.js');
    assert.deepEqual([...ACCEPTED_CARD_BRANDS].sort(), ['amex', 'elo', 'hipercard', 'master', 'visa']);
    const serverBrands = readFileSync('supabase/functions/process-payment/index.ts', 'utf8').match(/creditCardBrands = new Set\(\[([^\]]+)\]\)/);
    if (serverBrands) assert.deepEqual(serverBrands[1].match(/[a-z]+/g).sort(), [...ACCEPTED_CARD_BRANDS].sort(), 'as mesmas bandeiras no Brick e no servidor');
    for (const brand of ACCEPTED_CARD_BRANDS) assert.equal(brickToPayBody('credit_card', { ...formData, payment_method_id: brand }).card.paymentMethodId, brand);
    for (const brand of ['naranja', 'cabal', 'diners', 'carnet']) {
        assert.throws(() => brickToPayBody('credit_card', { ...formData, payment_method_id: brand }), error => error instanceof PaymentInputError && error.code === 'card_brand_not_accepted'
            && error.message === 'Este cartão não é aceito. Use Visa, Mastercard, Elo, American Express ou Hipercard, ou pague com Pix.', brand);
    }

    // ===== Textos do cartão (tabela de status_detail) =====
    const { cardResult, formatCountdown, qrImageSource, brandName } = await load('/src/utils/paymentMessages.js');
    const table = {
        cc_rejected_bad_filled_card_number: 'Revise o número do cartão.',
        cc_rejected_bad_filled_date: 'Revise a data de vencimento.',
        cc_rejected_bad_filled_security_code: 'Revise o código de segurança do cartão.',
        cc_rejected_bad_filled_other: 'Revise os dados do cartão.',
        cc_rejected_call_for_authorize: 'Autorize o pagamento de R$ 119,90 com a Visa e tente de novo.',
        cc_rejected_card_disabled: 'Ligue para a Visa para ativar seu cartão. O telefone fica no verso do cartão.',
        cc_rejected_insufficient_amount: 'O cartão não tem limite suficiente. Use outro cartão ou pague com Pix.',
        cc_rejected_invalid_installments: 'A Visa não aceita 3 parcelas. Escolha outra quantidade.',
        cc_rejected_duplicated_payment: 'Você já fez um pagamento com esse valor. Se precisar pagar de novo, use outro cartão ou o Pix.',
        cc_rejected_max_attempts: 'Você chegou ao limite de tentativas. Use outro cartão ou pague com Pix.',
        cc_rejected_high_risk: 'Não foi possível aprovar este pagamento. Tente com Pix ou outro cartão.',
        cc_rejected_blacklist: 'Não foi possível aprovar este pagamento. Tente com Pix ou outro cartão.',
        cc_rejected_3ds_mandatory: 'Este cartão exige uma verificação extra que ainda não oferecemos. Pague com Pix ou outro cartão.',
        cc_rejected_card_error: 'Não conseguimos processar o pagamento. Tente outro cartão ou pague com Pix.',
        cc_rejected_other_reason: 'Não conseguimos processar o pagamento. Tente outro cartão ou pague com Pix.',
        something_new_from_mercado_pago: 'Não conseguimos processar o pagamento. Tente outro cartão ou pague com Pix.',
    };
    const { default: PaymentResult } = await load('/src/components/payment/PaymentResult.jsx');
    for (const [statusDetail, text] of Object.entries(table)) {
        const result = cardResult({ status: 'rejected', statusDetail, paymentMethodId: 'visa', installments: 3, amount: 119.9 });
        assert.equal(result.kind, 'rejected'); assert.equal(result.text, text, statusDetail); assert.equal(result.canRetry, true);
        const markup = html(PaymentResult, { result, onRetry() {}, onPix() {} });
        assert.ok(!markup.includes(statusDetail), `${statusDetail} nunca aparece cru`);
        assert.ok(markup.includes('role="alert"') && markup.includes('Tentar de novo') && markup.includes('Pagar com Pix') && markup.includes('tabindex="-1"'));
    }
    assert.equal(cardResult({ status: 'rejected', statusDetail: 'cc_rejected_card_disabled', paymentMethodId: 'naranja' }).text, 'Ligue para a operadora do cartão para ativar seu cartão. O telefone fica no verso do cartão.');
    assert.equal(cardResult({ status: 'rejected', statusDetail: 'cc_rejected_invalid_installments', paymentMethodId: 'master', installments: 12 }).text, 'A Mastercard não aceita 12 parcelas. Escolha outra quantidade.');
    for (const status of ['in_process', 'authorized']) {
        const review = cardResult({ status, statusDetail: 'pending_review_manual' });
        assert.equal(review.kind, 'review'); assert.equal(review.canRetry, false);
        assert.match(review.text, /até 2 dias úteis.*Não é preciso pagar de novo/);
        const markup = html(PaymentResult, { result: review });
        assert.ok(markup.includes('role="status"') && !markup.includes('Tentar de novo'), 'em análise não oferece tentar de novo');
    }
    assert.equal(cardResult({ status: 'approved', statusDetail: 'accredited' }).title, 'Pronto, seu pagamento foi aprovado!');
    assert.equal(brandName('amex'), 'American Express'); assert.equal(brandName('elo'), 'Elo'); assert.equal(brandName('hipercard'), 'Hipercard'); assert.equal(brandName('xyz'), 'a operadora do cartão');
    assert.equal(formatCountdown(29 * 60_000 + 41_000), '29:41'); assert.equal(formatCountdown(-5), '0:00');
    assert.ok(qrImageSource('iVBORw0KGgo=').startsWith('data:image/png;base64,')); assert.ok(qrImageSource('/9j/4AAQ').startsWith('data:image/jpeg;base64,'));

    // ===== Tela do Pix =====
    const { default: PixPanel } = await load('/src/components/payment/PixPanel.jsx');
    const pix = { qrCode: '00020126580014br.gov.bcb.pix0136synthetic-code-not-payable5204000053039865802BR', qrCodeBase64: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', expiresAt: new Date(Date.now() + 29 * 60_000 + 30_000).toISOString() };
    const handlers = { onCheckNow() {}, onRenew() {}, onUseCard() {} };
    const desktop = html(PixPanel, { pix, amount: 119.9, orderId, ...handlers });
    assert.ok(desktop.includes('Pague com Pix') && desktop.includes('119,90') && desktop.includes(`Pedido #${orderId.slice(-8).toUpperCase()}`));
    assert.ok(desktop.includes(`src="data:image/png;base64,${pix.qrCodeBase64}"`) && desktop.includes('alt="QR code do Pix deste pedido"'));
    assert.ok(desktop.includes('Copiar código Pix'), 'botão de copiar');
    assert.match(desktop, new RegExp(`<textarea[^>]*readOnly=""[^>]*>${pix.qrCode}</textarea>`), 'copia e cola inteiro, só leitura');
    assert.match(desktop, /Vence em <b aria-hidden="true">29:[0-5]\d<\/b>/);
    assert.ok(desktop.includes('aria-live="polite"') && desktop.includes('Vence em 30 minutos'));
    assert.ok(desktop.includes('Aguardando o pagamento… Assim que o banco confirmar, esta tela muda sozinha.') && desktop.includes('Já paguei') && desktop.includes('Prefiro pagar com cartão'));
    for (const step of ['Abra o app do seu banco.', 'Escolha Pix › Pix Copia e Cola.', 'Cole o código e confirme.']) assert.ok(desktop.includes(step), step);
    assert.ok(desktop.indexOf('<img') < desktop.indexOf('<textarea'), 'no computador o QR vem primeiro');
    assert.ok(!desktop.includes('ticket_url') && !desktop.includes('mercadopago.com'), 'nenhum link para fora do site');
    globalThis.matchMedia = query => ({ matches: query === '(pointer: coarse)' });
    const phone = html(PixPanel, { pix, amount: 119.9, orderId, ...handlers });
    assert.ok(phone.includes('<textarea') && !phone.includes('<img') && phone.includes('Mostrar QR code'), 'no celular o copia e cola vem primeiro e o QR fica num botão');
    delete globalThis.matchMedia;
    const expired = html(PixPanel, { pix: { ...pix, expiresAt: new Date(Date.now() - 1000).toISOString() }, amount: 119.9, orderId, ...handlers });
    assert.ok(expired.includes('Este Pix venceu. Gere outro para pagar.') && expired.includes('Gerar novo Pix') && expired.includes('role="alert"'));
    assert.ok(!expired.includes('<img') && !expired.includes('Copiar código Pix'), 'Pix vencido não mostra o código');
    const cancelled = html(PixPanel, { pix, cancelled: true, amount: 119.9, orderId, ...handlers });
    assert.ok(cancelled.includes('Este Pix não vale mais. Gere outro para pagar.') && cancelled.includes('Gerar novo Pix'));
    const withoutCard = html(PixPanel, { pix, amount: 119.9, orderId, onCheckNow() {}, onRenew() {} });
    assert.ok(!withoutCard.includes('Prefiro pagar com cartão'), 'sem cartão disponível, sem a opção');
    assert.match(desktop, /<h3 id="pix-title-[^"]+" tabindex="-1">Pague com Pix<\/h3>/, 'o título do Pix pode receber o foco');
    assert.match(readFileSync('src/components/payment/PixPanel.jsx', 'utf8'), /if \(autoFocus\) titleRef\.current\?\.focus\(\)/, 'Pix aberto por um clique leva o foco ao título');

    // ===== Cópia do código Pix (navegador sem área de transferência) =====
    const { copyText } = await load('/src/utils/clipboard.js');
    let fallbackCalls = 0;
    const fallback = result => () => { fallbackCalls += 1; if (result instanceof Error) throw result; return result; };
    const written = [];
    assert.equal(await copyText('codigo-pix', { clipboard: { writeText: async text => { written.push(text); } }, fallback: fallback(true) }), 'copied');
    assert.deepEqual(written, ['codigo-pix']); assert.equal(fallbackCalls, 0, 'com a área de transferência, sem o outro caminho');
    const denied = { writeText: async () => { throw new Error('NotAllowedError'); } };
    assert.equal(await copyText('codigo-pix', { clipboard: denied, fallback: fallback(true) }), 'copied', 'WebView sem permissão: cópia pelo campo');
    assert.equal(await copyText('codigo-pix', { clipboard: denied, fallback: fallback(false) }), 'manual', 'sem cópia: a pessoa copia tocando e segurando');
    assert.equal(await copyText('codigo-pix', { clipboard: null, fallback: fallback(new Error('execCommand')) }), 'manual');
    assert.equal(await copyText('codigo-pix', { clipboard: { writeText: () => new Promise(() => {}) }, fallback: fallback(true), timeout: 10 }), 'copied', 'área de transferência que nunca responde');
    assert.equal(await copyText('codigo-pix', { clipboard: undefined }), 'manual');
    assert.match(readFileSync('src/components/payment/PixPanel.jsx', 'utf8'), /await copyText\(pix\?\.qrCode/, 'o botão de copiar usa a função testada');

    // ===== Orquestração e carregamento do SDK =====
    const { default: OrderPayment } = await load('/src/components/payment/OrderPayment.jsx');
    const first = html(OrderPayment, { orderId, amount: 119.9, customerId: 'synthetic', checkout: { publicKey: 'TEST-synthetic-key-000', maxInstallments: 12 } });
    assert.ok(first.includes('Carregando o pagamento…'), 'antes de mostrar o Brick, consulta o pagamento em andamento');
    assert.ok(!first.includes('paymentBrick_container'));
    const { MERCADO_PAGO_OPTIONS, publicKeyPattern, loadSdkScript, SDK_URL } = await load('/src/lib/mercadoPago.js');
    assert.deepEqual({ ...MERCADO_PAGO_OPTIONS }, { locale: 'pt-BR', advancedFraudPrevention: false, trackingDisabled: true });
    assert.ok(publicKeyPattern.test('APP_USR-1234567890ab') && !publicKeyPattern.test('pk_live_123'));

    // ===== Script do SDK: falha na hora e "Tentar de novo" com tag nova =====
    assert.equal(SDK_URL, 'https://sdk.mercadopago.com/js/v2');
    const scriptHost = () => {
        const appended = [];
        const doc = { head: { appendChild: element => appended.push(element) }, createElement: tag => {
            const listeners = {};
            const element = { tag, listeners, removed: false, addEventListener(type, fn) { listeners[type] = fn; }, removeEventListener(type, fn) { if (listeners[type] === fn) delete listeners[type]; }, remove() { element.removed = true; } };
            return element;
        } };
        return { doc, appended };
    };
    const host = scriptHost();
    const sdkWindow = {};
    const firstLoad = loadSdkScript({ doc: host.doc, win: sdkWindow });
    assert.equal(loadSdkScript({ doc: host.doc, win: sdkWindow }), firstLoad, 'carregando: a mesma promessa, sem tag repetida');
    assert.equal(host.appended.length, 1); assert.equal(host.appended[0].src, SDK_URL); assert.equal(host.appended[0].async, true);
    host.appended[0].listeners.error();
    await assert.rejects(firstLoad, error => error.message === 'sdk_load_failed', 'script que não carrega falha na hora, sem esperar o prazo');
    assert.ok(host.appended[0].removed, 'a tag que falhou sai da página');
    const secondLoad = loadSdkScript({ doc: host.doc, win: sdkWindow });
    assert.equal(host.appended.length, 2, 'nova tentativa, nova tag');
    const MercadoPago = function MercadoPago() {};
    sdkWindow.MercadoPago = MercadoPago;
    host.appended[1].listeners.load();
    assert.equal(await secondLoad, MercadoPago);
    assert.equal(await loadSdkScript({ doc: host.doc, win: sdkWindow }), MercadoPago); assert.equal(host.appended.length, 2, 'SDK já na página: resolve na hora');
    const slow = scriptHost();
    await assert.rejects(loadSdkScript({ doc: slow.doc, win: {}, timeout: 10 }), error => error.message === 'sdk_timeout');
    assert.ok(slow.appended[0].removed);
    const empty = scriptHost();
    const emptyLoad = loadSdkScript({ doc: empty.doc, win: {} });
    empty.appended[0].listeners.load();
    await assert.rejects(emptyLoad, error => error.message === 'sdk_unavailable');
    assert.match(readFileSync('src/lib/mercadoPago.js', 'utf8'), /await loadSdkScript\(\);\s*const sdk = await import\('@mercadopago\/sdk-react'\)/, 'o sdk-js só é chamado depois do script carregado');

    // ===== Telas do pagamento: status, resultado e erro → tela certa (funções puras) =====
    const views = await load('/src/utils/paymentViews.js');
    const { RETRYABLE_RESULT, CONFIRMING_RESULT } = await load('/src/utils/paymentMessages.js');
    const { CheckoutError } = await load('/src/lib/checkoutApi.js');
    const pendingOrder = { paymentStatus: 'pending', status: 'awaiting_payment', total: 119.9 };
    const config = { publicKey: 'TEST-synthetic-key-000', maxInstallments: 12, amount: 119.9 };
    const statusOf = extra => ({ orderId, order: pendingOrder, payment: null, checkout: null, reason: null, ...extra });
    const openPixPayment = { attemptId: orderId, method: 'pix', status: 'pending', pix };
    const s2v = (extra, options) => views.statusToView(statusOf(extra), options);
    // Tentativa ainda em criação: continua pagável, com "Atualizar" (nunca "não pode mais ser pago").
    assert.deepEqual(plainView(s2v({ reason: 'payment_in_progress' })), plainView({ name: 'result', result: views.PROGRESS_RESULT, retry: 'status' }));
    assert.equal(views.RETRY_LABELS.status, 'Atualizar');
    // Cartão 'pending' = em análise, como no banco.
    for (const payment of [{ method: 'card', status: 'pending' }, { method: 'card', status: 'in_process' }, { method: 'card', status: 'authorized' }]) {
        const view = s2v({ payment, reason: 'payment_in_review' });
        assert.equal(view.name, 'result'); assert.equal(view.result.kind, 'review', payment.status); assert.equal(view.retry, undefined, 'em análise não oferece tentar de novo');
    }
    assert.equal(s2v({ reason: 'payment_in_review' }).result.kind, 'review');
    assert.ok(views.inReview({ method: 'card', status: 'pending' }) && !views.inReview({ method: 'pix', status: 'pending' }) && !views.inReview(null));
    // Boleto do Checkout Pro ('other') pendente também está em análise, como no banco (x.method <> 'pix').
    assert.ok(views.inReview({ method: 'other', status: 'pending' }));
    assert.equal(s2v({ payment: { method: 'other', status: 'pending' }, reason: 'payment_in_review' }).result.kind, 'review');
    const pixView = s2v({ payment: openPixPayment });
    assert.equal(pixView.name, 'pix'); assert.equal(pixView.openPix.attemptId, orderId);
    const expiredPix = { ...openPixPayment, pix: { ...pix, expiresAt: new Date(Date.now() - 1000).toISOString() } };
    assert.equal(s2v({ payment: expiredPix, checkout: config }).name, 'choose', 'Pix vencido: escolher de novo');
    assert.equal(s2v({ payment: { method: 'card', status: 'approved' } }).name, 'confirming');
    assert.equal(s2v({ order: { ...pendingOrder, paymentStatus: 'paid' } }).name, 'paid');
    assert.equal(s2v({ reason: 'already_paid' }).name, 'paid');
    for (const extra of [{ order: { ...pendingOrder, status: 'cancelled' } }, { order: { ...pendingOrder, paymentStatus: 'refunded' } }, { reason: 'order_not_payable' }]) {
        assert.deepEqual(plainView(s2v(extra)), { name: 'blocked', code: 'order_not_payable' });
    }
    assert.deepEqual(plainView(s2v({ reason: 'order_expired' })), { name: 'blocked', code: 'order_expired' });
    assert.deepEqual(plainView(s2v({ checkout: config })), { name: 'choose', notice: '' });
    assert.match(s2v({ checkout: config, payment: { method: 'card', status: 'rejected' } }, { mode: 'return' }).notice, /último pagamento deste pedido não foi concluído/);
    assert.equal(s2v({ checkout: config, payment: { method: 'card', status: 'rejected' } }).notice, '', 'no checkout, sem o aviso do retorno');
    // Pagável, mas sem pagamento no site (a chave voltou para o Checkout Pro): quem chama decide.
    assert.equal(s2v({}).name, 'unavailable');
    assert.equal(views.RESTART_RESULT.title, 'Revise o pedido para pagar'); assert.equal(views.RETRY_LABELS.restart, 'Revisar o pedido de novo');
    // Falha na consulta.
    assert.equal(views.statusErrorToView(new CheckoutError('already_paid')).name, 'paid');
    assert.deepEqual(plainView(views.statusErrorToView(new CheckoutError('order_expired'))), { name: 'blocked', code: 'order_expired' });
    assert.equal(views.statusErrorToView(new CheckoutError('network_error'), { mode: 'checkout', hasCheckout: true }).name, 'choose');
    assert.equal(views.statusErrorToView(new CheckoutError('network_error'), { mode: 'return', hasCheckout: true }).name, 'error');
    // Resposta do pay: 'confirming' nunca oferece "Tentar de novo" e nada devolve a mesma chave.
    const r2v = (payment, order = pendingOrder) => views.resultToView({ payment, order }, { amount: 119.9 });
    assert.equal(r2v(openPixPayment).name, 'pix');
    assert.equal(r2v({ method: 'pix', status: 'approved' }).name, 'confirming');
    assert.deepEqual(plainView(r2v({ method: 'pix', status: 'rejected' })), plainView({ name: 'result', result: views.PIX_FAILED_RESULT, retry: 'pix' }));
    const confirming = r2v({ method: 'card', status: 'approved', statusDetail: 'accredited' }, { ...pendingOrder, paymentStatus: 'confirming' });
    assert.deepEqual(plainView(confirming), { name: 'confirming' }, 'aprovado sem registro ainda: confirmando, sem tentar de novo');
    assert.equal(r2v({ method: 'card', status: 'approved' }, { ...pendingOrder, paymentStatus: 'paid' }).name, 'paid');
    const refused = r2v({ method: 'card', status: 'rejected', statusDetail: 'cc_rejected_insufficient_amount', paymentMethodId: 'visa' });
    assert.equal(refused.result.kind, 'rejected'); assert.equal(refused.retry, 'card', 'recusa: novo formulário, chave nova');
    for (const status of ['in_process', 'pending']) assert.equal(r2v({ method: 'card', status }).retry, null, `${status}: sem tentar de novo`);
    const confirmingMarkup = html(PaymentResult, { result: CONFIRMING_RESULT });
    assert.ok(!confirmingMarkup.includes('Tentar de novo') && confirmingMarkup.includes('Não é preciso pagar de novo'), 'confirmando: sem tentar de novo');
    // Erros do pay.
    const retryable = views.errorToView(new CheckoutError('payment_provider_unavailable', 502, orderId, true), { method: 'card' });
    assert.deepEqual(plainView(retryable), plainView({ name: 'result', result: RETRYABLE_RESULT, retry: 'same', requestId: orderId, sameAttempt: true }), 'falha de conexão: a mesma chave');
    for (const code of ['payment_provider_unavailable', 'invalid_payment_request', 'payment_provider_request_rejected', 'internal_error', 'payment_in_progress', 'too_many_requests', 'pix_cancel_failed']) {
        const view = views.errorToView(new CheckoutError(code, 409), { method: 'card' });
        assert.ok(!view.sameAttempt && view.retry !== 'same', `${code}: chave nova na próxima tentativa`);
    }
    assert.deepEqual(plainView(views.errorToView(new CheckoutError('payment_in_progress', 409))), { name: 'result', result: { kind: 'progress', title: 'Pagamento em processamento', text: new CheckoutError('payment_in_progress').message }, retry: 'status' });
    assert.equal(views.errorToView(new CheckoutError('payment_in_review', 409)).result.kind, 'review');
    assert.equal(views.errorToView(new CheckoutError('already_paid', 409)).name, 'paid');
    assert.deepEqual(plainView(views.errorToView(new CheckoutError('order_expired', 409))), { name: 'blocked', code: 'order_expired' });
    assert.equal(views.errorToView(new CheckoutError('payment_provider_not_configured', 503), { method: 'pix' }).name, 'unavailable', 'chave de emergência: refazer a revisão, nunca repetir o 503');
    // O Pix de outro pedido foi pago durante o cancelamento: nada cobrado aqui; Minha conta e, se quiser, pagar este (chave nova).
    const otherPaid = views.errorToView(new CheckoutError('other_order_paid', 409), { method: 'card' });
    assert.equal(otherPaid.name, 'result'); assert.equal(otherPaid.result.title, views.OTHER_ORDER_PAID_TITLE); assert.equal(otherPaid.result.kind, 'blocked');
    assert.equal(otherPaid.account, true); assert.equal(otherPaid.retry, 'payAgain'); assert.ok(!otherPaid.sameAttempt);
    assert.equal(views.retryAction(otherPaid, true), 'choose'); assert.equal(views.RETRY_LABELS.payAgain, 'Pagar este pedido mesmo assim');
    assert.match(new CheckoutError('other_order_paid').message, /Minha conta/);
    const brand = views.errorToView(new CheckoutError('card_brand_not_accepted', 400), { method: 'card' });
    assert.equal(brand.result.title, 'Este cartão não é aceito'); assert.equal(brand.result.kind, 'rejected'); assert.equal(brand.retry, 'card');
    const pixFailure = views.errorToView(new CheckoutError('payment_provider_request_rejected', 400), { method: 'pix' });
    assert.equal(pixFailure.retry, 'pix'); assert.equal(pixFailure.result.title, 'Não foi possível gerar o Pix');
    assert.equal(views.errorToView(new CheckoutError('authentication_required', 401), { method: 'card' }).auth, true);
    const brandInput = views.cardInputErrorToView(new PaymentInputError('card_brand_not_accepted'));
    assert.equal(brandInput.result.title, 'Este cartão não é aceito'); assert.match(brandInput.result.text, /Visa, Mastercard, Elo, American Express ou Hipercard/);
    assert.equal(views.cardInputErrorToView(new PaymentInputError()).result.title, 'Confira os dados do cartão');
    // Botão do resultado.
    assert.equal(views.retryAction({ retry: 'same' }, true), 'resend'); assert.equal(views.retryAction({ retry: 'same' }, false), 'choose');
    for (const kind of ['pix', 'card', 'status', 'restart']) assert.equal(views.retryAction({ retry: kind }, true), kind);
    assert.equal(views.retryAction({ retry: null }, true), 'choose'); assert.equal(views.retryAction({ retry: 'choose' }, true), 'choose');
    // Retorno, Minha conta e aviso do checkout seguem a mesma regra.
    assert.equal(views.payHereFrom(statusOf({ reason: 'payment_in_progress' })), true, 'em processamento: a página de retorno mostra o pagamento');
    assert.equal(views.payHereFrom(statusOf({ payment: { method: 'card', status: 'pending' }, reason: 'payment_in_review' })), true);
    assert.equal(views.payHereFrom(statusOf({ checkout: config })), true);
    assert.equal(views.payHereFrom(statusOf({})), false); assert.equal(views.payHereFrom(null), false);
    assert.equal(views.payLinkLabel(statusOf({ checkout: config })), 'Pagar agora');
    assert.equal(views.payLinkLabel(statusOf({ payment: openPixPayment })), 'Ver o Pix');
    assert.equal(views.payLinkLabel(statusOf({ payment: { method: 'card', status: 'pending' }, reason: 'payment_in_review' })), 'Ver pagamento em análise');
    assert.equal(views.payLinkLabel(statusOf({ reason: 'payment_in_progress' })), 'Ver o pagamento');
    assert.equal(views.payLinkLabel(statusOf({ order: { ...pendingOrder, paymentStatus: 'paid' }, checkout: config })), null);
    assert.equal(views.payLinkLabel(statusOf({})), null);
    assert.equal(views.pendingPaymentFrom(statusOf({ payment: openPixPayment })).kind, 'pix');
    assert.equal(views.pendingPaymentFrom(statusOf({ payment: expiredPix })), null, 'Pix vencido não gera aviso');
    assert.equal(views.pendingPaymentFrom(statusOf({ payment: { method: 'card', status: 'pending' } })).kind, 'review');
    assert.equal(views.pendingPaymentFrom(statusOf({ reason: 'payment_in_progress' })).kind, 'progress');
    assert.equal(views.pendingPaymentFrom(statusOf({ checkout: config, payment: { method: 'card', status: 'rejected' } })), null);
    assert.equal(views.pendingPaymentFrom(statusOf({ order: { ...pendingOrder, paymentStatus: 'paid' }, payment: openPixPayment })), null);

    const files = dir => readdirSync(dir).flatMap(name => statSync(join(dir, name)).isDirectory() ? files(join(dir, name)) : [join(dir, name).replaceAll('\\', '/')]);
    for (const file of files('src').filter(name => /\.(jsx?|tsx?)$/.test(name))) {
        const source = readFileSync(file, 'utf8');
        assert.doesNotMatch(source, /^\s*import\s[^;]*from\s+['"]@mercadopago\//m, `${file}: o SDK do Mercado Pago só pode ser importado sob demanda`);
        if (file !== 'src/lib/mercadoPago.js') assert.ok(!source.includes("import('@mercadopago/sdk-react')"), `${file}: carregar o SDK só por src/lib/mercadoPago.js`);
    }
    const loader = readFileSync('src/lib/mercadoPago.js', 'utf8');
    assert.match(loader, /await import\('@mercadopago\/sdk-react'\)/);
    const cardSource = readFileSync('src/components/payment/CardPayment.jsx', 'utf8');
    assert.match(cardSource, /paymentMethods: \{ creditCard: 'all', maxInstallments \}/, 'o Brick só oferece cartão de crédito');
    assert.doesNotMatch(cardSource, /bankTransfer|debitCard|ticket|mercadoPago:|prepaidCard|atm/, 'sem Pix, débito, boleto ou carteira no Brick');
    assert.match(cardSource, /onBinChange=\{silent\}/, 'o BIN do cartão não vai para o console');
    assert.doesNotMatch(cardSource, /console\./);
    const orchestration = readFileSync('src/components/payment/OrderPayment.jsx', 'utf8');
    assert.doesNotMatch(orchestration, /mercadoPago'|loadMercadoPago/, 'o Pix não carrega o SDK');
    for (const file of files('src/components/payment')) {
        const source = readFileSync(file, 'utf8');
        assert.doesNotMatch(source, /window\.location|ticket_url|init_point|paymentUrl/, `${file}: o modo no site nunca leva para o Mercado Pago`);
        assert.doesNotMatch(source, /console\.(log|info|warn|error)/, `${file}: nada de pagamento no console`);
    }
    assert.match(orchestration, /method: 'pix', attemptKey: crypto\.randomUUID\(\)/, 'cada Pix novo tem chave nova');
    assert.match(orchestration, /method: 'card', attemptKey: crypto\.randomUUID\(\)/, 'cada cartão novo tem chave nova');
    assert.match(orchestration, /embedded \? \[pixOption, cardOption\] : \[cardOption, pixOption\]/, 'nos apps, o Pix vem primeiro');
    for (const call of ['statusToView(status', 'statusErrorToView(failure', 'resultToView(result', 'errorToView(error', 'cardInputErrorToView(error', 'retryAction(view']) assert.ok(orchestration.includes(call), `OrderPayment usa ${call.split('(')[0]}`);
    assert.match(orchestration, /if \(!next\.sameAttempt\) lastRequest\.current = null/, 'a mesma chave só depois de "retryable"');
    assert.match(orchestration, /setView\(\{ name: 'pix-creating', focus: true \}\)/, 'Gerando o Pix… recebe o foco');
    assert.match(orchestration, /<h3 className="pay-title" tabIndex=\{-1\} ref=\{focusRef\}>Cartão de crédito<\/h3>/, 'o título do cartão recebe o foco');

    // ===== Passos do checkout: reinício da tentativa, saída com Pix aberto, Pix pago sem confirmação =====
    const flow = await load('/src/utils/checkoutFlow.js');
    const restartError = Object.assign(new Error('restart'), { code: 'checkout_restart_required' });
    const keysUsed = [];
    let renewed = 0;
    const renewKey = () => { renewed += 1; return `fresh-${renewed}`; };
    assert.equal(await flow.prepareWithRestart(async key => { keysUsed.push(key); return 'ok'; }, { key: 'stored', renewKey }), 'ok');
    assert.deepEqual(keysUsed, ['stored']); assert.equal(renewed, 0);
    keysUsed.length = 0;
    assert.equal(await flow.prepareWithRestart(async key => { keysUsed.push(key); if (key === 'stored') throw restartError; return 'ok'; }, { key: 'stored', renewKey }), 'ok');
    assert.deepEqual(keysUsed, ['stored', 'fresh-1'], 'pedido que não pode ser pago: chave nova, uma vez');
    keysUsed.length = 0; renewed = 0;
    await assert.rejects(flow.prepareWithRestart(async key => { keysUsed.push(key); throw restartError; }, { key: 'stored', renewKey }), error => error === restartError);
    assert.deepEqual(keysUsed, ['stored', 'fresh-1'], 'nunca mais de uma troca de chave');
    keysUsed.length = 0; renewed = 0;
    const otherError = Object.assign(new Error('x'), { code: 'invalid_coupon' });
    await assert.rejects(flow.prepareWithRestart(async key => { keysUsed.push(key); throw otherError; }, { key: 'stored', renewKey }), error => error === otherError);
    assert.equal(renewed, 0, 'outros erros mantêm a chave');
    assert.equal(flow.LEAVE_PIX_QUESTION, 'O Pix gerado deixa de valer. Continuar?');
    const questions = [];
    let cancels = 0;
    const leave = (pixOpen, answer, cancel = async () => { cancels += 1; }) => flow.leaveOpenPix({ pixOpen, confirm: question => { questions.push(question); return answer; }, cancel });
    assert.equal((await leave(false, false)).outcome, 'leave'); assert.equal(questions.length, 0); assert.equal(cancels, 0, 'sem Pix aberto, sai direto');
    assert.equal((await leave(true, false)).outcome, 'stay'); assert.equal(cancels, 0, 'desistiu: o Pix continua valendo');
    assert.equal((await leave(true, true)).outcome, 'leave'); assert.equal(cancels, 1); assert.deepEqual(questions, [flow.LEAVE_PIX_QUESTION, flow.LEAVE_PIX_QUESTION]);
    assert.equal((await leave(true, true, async () => { throw new CheckoutError('already_paid', 409); })).outcome, 'paid', 'Pix pago enquanto saía: vai para a confirmação');
    const failedLeave = await leave(true, true, async () => { throw new CheckoutError('pix_cancel_failed', 409); });
    assert.equal(failedLeave.outcome, 'error'); assert.equal(failedLeave.message, new CheckoutError('pix_cancel_failed').message);
    const paidOrderRow = { id: orderId, checkout_key: 'attempt-key', payment_status: 'paid' };
    assert.equal(flow.paidWithoutConfirmation(paidOrderRow, 'attempt-key'), true, 'Pix pago e /checkout recarregado: vai para a confirmação');
    assert.equal(flow.paidWithoutConfirmation(paidOrderRow, 'other-key'), false, 'pedido pago antes, já confirmado: segue no checkout');
    assert.equal(flow.paidWithoutConfirmation(paidOrderRow, null), false);
    assert.equal(flow.paidWithoutConfirmation({ ...paidOrderRow, payment_status: 'pending' }, 'attempt-key'), false);

    const checkoutPage = readFileSync('src/pages/CheckoutPage.jsx', 'utf8');
    assert.match(checkoutPage, /lazy\(\(\) => import\('\.\.\/components\/payment\/OrderPayment'\)\)/);
    assert.match(checkoutPage, /prepareWithRestart\(/, 'checkout_restart_required passa pela função testada');
    assert.match(checkoutPage, /leaveOpenPix\(\{ pixOpen/, 'sair com Pix aberto passa pela função testada');
    assert.match(checkoutPage, /paidWithoutConfirmation\(order, attemptKey\)\) \{ confirm\(\); return; \}/, 'Pix pago e página recarregada: confirmação');
    assert.match(checkoutPage, /onRestart=\{restartReview\}/, 'checkout sem pagamento no site: refazer a revisão');
    assert.match(checkoutPage, /pendingPaymentFrom\(status\)/);
    const returnPage = readFileSync('src/pages/PaymentReturnPage.jsx', 'utf8');
    assert.match(returnPage, /params\.get\('pedido'\)/); assert.match(returnPage, /payHereFrom\(status\)/);
    assert.match(readFileSync('src/pages/AccountPage.jsx', 'utf8'), /payLinkLabel\(result\.value\)/);
    const adminPage = readFileSync('src/pages/Admin.jsx', 'utf8');
    for (const action of ['refund_failed', 'refund_extra_payment', 'reconcile_order']) assert.match(adminPage, new RegExp(`${action}: '`), `registro de ações: ${action} com nome legível`);

    // ===== Consulta do Pix: 4 s, 10 s, conferência a cada 30 s, pausa com a aba escondida e prazo =====
    const { createPaymentPoller, POLL_TIMING } = await load('/src/utils/paymentPoller.js');
    const flush = () => new Promise(resolve => setImmediate(resolve));
    const fakeClock = start => {
        let now = start;
        let sequence = 0;
        const timers = new Map();
        return {
            now: () => now,
            setTimeout: (fn, delay) => { sequence += 1; timers.set(sequence, { at: now + delay, fn }); return sequence; },
            clearTimeout: id => { timers.delete(id); },
            pending: () => [...timers.values()].map(timer => timer.at - now),
            async advance(ms) {
                const target = now + ms;
                for (;;) {
                    const next = [...timers.entries()].sort((a, b) => a[1].at - b[1].at)[0];
                    if (!next || next[1].at > target) break;
                    timers.delete(next[0]);
                    now = next[1].at;
                    await next[1].fn();
                    await flush();
                }
                now = target;
            },
        };
    };
    const fakeDocument = () => {
        const listeners = new Set();
        return {
            hidden: false, listeners,
            addEventListener(type, fn) { if (type === 'visibilitychange') listeners.add(fn); },
            removeEventListener(type, fn) { listeners.delete(fn); },
            async setHidden(value) { this.hidden = value; for (const fn of [...listeners]) fn(); await flush(); await flush(); },
        };
    };
    const startAt = Date.parse('2026-11-26T15:00:00Z');
    const clock = fakeClock(startAt);
    const doc = fakeDocument();
    const pollCalls = [];
    let stops = 0;
    const poller = createPaymentPoller({ expiresAt: new Date(startAt + 35 * 60_000).toISOString(), clock, doc,
        readOrder: async () => { pollCalls.push(['read', clock.now() - startAt]); }, refresh: async () => { pollCalls.push(['refresh', clock.now() - startAt]); }, onStop: () => { stops += 1; } });
    assert.deepEqual(clock.pending(), [POLL_TIMING.fast]);
    assert.equal(POLL_TIMING.fast, 4_000); assert.equal(POLL_TIMING.slow, 10_000); assert.equal(POLL_TIMING.refreshEvery, 30_000);
    await clock.advance(30_000);
    assert.deepEqual(pollCalls, [4, 8, 12, 16, 20, 24, 28].map(at => ['read', at * 1000]), 'a cada 4 s, lendo o pedido');
    await clock.advance(4_000);
    assert.deepEqual(pollCalls.at(-1), ['refresh', 32_000], 'a cada 30 s, confere no Mercado Pago');
    await clock.advance(120_000 - 34_000);
    assert.deepEqual(clock.pending(), [POLL_TIMING.slow], 'depois de 2 min, a cada 10 s');
    pollCalls.length = 0;
    await doc.setHidden(true);
    assert.deepEqual(clock.pending(), [], 'aba escondida: nada agendado');
    await clock.advance(5 * 60_000);
    assert.deepEqual(pollCalls, [], 'aba escondida: nenhuma consulta');
    await doc.setHidden(false);
    assert.equal(pollCalls.length, 1, 'a aba voltou (volta do app do banco): consulta na hora');
    assert.equal(pollCalls[0][0], 'refresh', 'mais de 30 s sem conferir: confere no Mercado Pago');
    assert.deepEqual(clock.pending(), [POLL_TIMING.slow]);
    await poller.refreshNow();
    pollCalls.length = 0;
    await clock.advance(POLL_TIMING.slow);
    assert.equal(pollCalls[0][0], 'read', '"Já paguei" adia a próxima conferência');
    await clock.advance(40 * 60_000);
    assert.equal(stops, 1, 'para 2 min depois do prazo do Pix'); assert.deepEqual(clock.pending(), []);
    assert.ok(pollCalls.every(([, at]) => at <= 37 * 60_000 + POLL_TIMING.slow), 'nenhuma consulta agendada depois do prazo');
    pollCalls.length = 0;
    await doc.setHidden(true); await doc.setHidden(false);
    assert.equal(pollCalls.length, 1, 'depois do prazo, a volta para a aba ainda confere uma vez'); assert.deepEqual(clock.pending(), []);
    poller.stop();
    assert.equal(doc.listeners.size, 0, 'stop remove o aviso de troca de aba');
    pollCalls.length = 0;
    await doc.setHidden(false); await clock.advance(60_000);
    assert.deepEqual(pollCalls, [], 'parado: nenhuma consulta');
    const noDeadlineClock = fakeClock(startAt);
    let noDeadlineStops = 0;
    const noDeadline = createPaymentPoller({ clock: noDeadlineClock, doc: fakeDocument(), readOrder: async () => {}, refresh: async () => {}, onStop: () => { noDeadlineStops += 1; } });
    await noDeadlineClock.advance(POLL_TIMING.withoutExpiry - 1000);
    assert.equal(noDeadlineStops, 0);
    await noDeadlineClock.advance(20_000);
    assert.equal(noDeadlineStops, 1, 'sem prazo (confirmando): para em 37 min'); noDeadline.stop();
    const hiddenDoc = fakeDocument(); hiddenDoc.hidden = true;
    const hiddenClock = fakeClock(startAt);
    createPaymentPoller({ clock: hiddenClock, doc: hiddenDoc, readOrder: async () => {}, refresh: async () => {}, onStop() {} }).stop();
    assert.deepEqual(hiddenClock.pending(), [], 'aberto com a aba escondida: espera a aba voltar');
    const hookSource = readFileSync('src/hooks/useOrderPaymentStatus.js', 'utf8');
    assert.match(hookSource, /createPaymentPoller\(/, 'o hook usa o ritmo testado aqui');
    assert.match(hookSource, /poller\.current\.refreshNow\(\)/, '"Já paguei" passa pelo mesmo relógio');

    // ===== Admin: tentativas, conferência e alertas =====
    const { default: AdminOrders } = await load('/src/components/AdminOrders.jsx');
    const unpaidAdmin = html(AdminOrders, { onUnauthorized() {} });
    for (const text of ['Tentativas de pagamento', 'Conferir no Mercado Pago', 'Nº 222', 'Recusado', 'Cancelado', 'Pix', 'Cartão', 'pref-synthetic']) assert.ok(unpaidAdmin.includes(text), text);
    assert.ok(!unpaidAdmin.includes('Estornar pagamento'));
    expanded = paidOrder.id; server.moduleGraph.invalidateAll();
    const { default: AdminOrdersPaid } = await load('/src/components/AdminOrders.jsx');
    const paidAdmin = html(AdminOrdersPaid, { onUnauthorized() {} });
    assert.ok(paidAdmin.includes(`<dd>${paidPaymentId}</dd>`), 'Referência mostra o pagamento que pagou o pedido');
    assert.ok(paidAdmin.includes('Estornar pagamento') && paidAdmin.includes('pagou o pedido') && !paidAdmin.includes('Conferir no Mercado Pago'));
    const { default: AdminFinance } = await load('/src/components/AdminFinance.jsx');
    const financeHtml = html(AdminFinance, { onUnauthorized() {} });
    for (const text of ['Pagamentos que pedem atenção', 'Pagamento em dobro no mesmo pedido', 'Reclamação aberta no Mercado Pago', 'nº 333', 'nº 444', 'nº 555']) assert.ok(financeHtml.includes(text), text);
    assert.equal((financeHtml.match(/Estornar este pagamento/g) || []).length, 1, 'só o pagamento extra ainda aprovado pode ser estornado');
    assert.ok(financeHtml.includes('Possível compra em dobro: outro pedido do mesmo cliente pago em até 60 minutos') && financeHtml.includes('outro pedido #DEADBEEF'), 'alerta mostra o outro pedido');
    assert.ok(!financeHtml.includes('com o mesmo valor'), 'o alerta vale para qualquer valor');
    assert.ok(!financeHtml.includes('linha-de-alerta-sintetica'), 'a atividade recente não mostra a linha de alerta como pagamento');
    const { canRefund, refundMessages } = await load('/src/utils/refund.js');
    assert.equal(canRefund({ payment_status: 'paid', payment_provider: 'mercado_pago', paid_payment_id: '987', payment_details: {} }), true);
    assert.equal(canRefund({ payment_status: 'paid', payment_provider: 'mercado_pago', paid_payment_id: '12; DROP', payment_details: {} }), false);
    assert.ok(refundMessages.payment_mismatch && refundMessages.payment_not_extra);

    console.log('Payment UI checks passed: Brick translation (credit card only, accepted brands, no browser amount or e-mail), status_detail messages without raw codes, Pix panel (QR, copy with fallback, deadline, expired, cancelled, focus), status/result/error to screen (in progress, card pending, confirming, same key only after retryable, restart), checkout restart/leave/paid reload, polling with fake clock and hidden tab, SDK script retry, no redirect on site, admin attempts, alerts and audit labels. Synthetic data only.');
} finally {
    await server.close();
}
