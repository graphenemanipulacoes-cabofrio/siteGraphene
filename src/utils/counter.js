import { getSession } from './security.js';

export const COUNTER_SESSION_KEY = 'graphene_counter_session';
export const orderStatusLabels = { awaiting_payment: 'Aguardando pagamento', paid: 'Pago · a preparar', processing: 'Em preparação', shipped: 'Enviado', delivered: 'Entregue', cancelled: 'Cancelado' };
export const paymentStatusLabels = { pending: 'Pendente', paid: 'Confirmado', failed: 'Não aprovado', refunded: 'Estornado' };
export const money = value => Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
export const dateTime = value => value ? new Date(value).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', dateStyle: 'short', timeStyle: 'short' }) : 'Não informado';
export const PHARMACIST_SESSION_KEY = 'graphene_farmaceutico_session';
export const staffRoleLabels = { balcao: 'Balcão', farmaceutico: 'Farmacêutico', admin: 'Administrador' };
// Token da equipe (64) ou do painel admin (43): administradores entram em todas as áreas.
const staffTokenPattern = /^(?:[a-f0-9]{64}|[A-Za-z0-9_-]{43})$/;
export function readStaffSession(key) {
    try {
        const session = JSON.parse(localStorage.getItem(key) || 'null');
        return staffTokenPattern.test(session?.token || '') ? session : null;
    } catch { return null; }
}
// Quem já entrou no painel admin neste navegador entra direto no balcão e no farmacêutico.
// O servidor confere a sessão em cada ação; isto só evita digitar a senha de novo.
export function adminStaffSession() {
    try {
        const admin = getSession();
        return admin && /^[A-Za-z0-9_-]{43}$/.test(admin.token) ? { token: admin.token, borrowed: true, user: { username: admin.user, displayName: admin.user, role: 'admin' } } : null;
    } catch { return null; }
}
export function clearStaffSession(key) { try { localStorage.removeItem(key); } catch { /* Armazenamento bloqueado. */ } }
export function readCounterSession() { return readStaffSession(COUNTER_SESSION_KEY); }
export function clearCounterSession() { localStorage.removeItem(COUNTER_SESSION_KEY); }
export function safeLink(value) {
    try { const url = new URL(value); return ['http:', 'https:'].includes(url.protocol) ? url.href : null; }
    catch { return null; }
}
export function whatsappLink(value) {
    let digits = String(value || '').replace(/\D/g, '');
    if (digits.length === 10 || digits.length === 11) digits = '55' + digits;
    return /^55\d{10,11}$/.test(digits) ? `https://wa.me/${digits}` : null;
}
export function addressText(address = {}) {
    return [address.name, [address.address, address.number, address.complement].filter(Boolean).join(', '), [address.neighborhood, address.city, address.state].filter(Boolean).join(' · '), address.zip ? `CEP ${address.zip}` : null].filter(Boolean).join('\n');
}
