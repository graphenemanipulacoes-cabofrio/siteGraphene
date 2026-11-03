import { supabase } from './supabaseClient';
import { createSession, getSession } from '../utils/security';

// Login único do site (Supabase Auth): clientes, parceiros, equipe e administração.

// Admin conectado na conta do site: renova o token do painel sem pedir a senha de novo.
// Devolve { session }, { mfaRequired: true } (falta o código em duas etapas) ou {}.
export async function requestAdminSession() {
    const current = getSession();
    if (current) return { session: current };
    try {
        const { data } = await supabase.auth.getSession();
        if (!data.session) return {};
        const { data: result, error } = await supabase.functions.invoke('admin-login', { body: {} });
        let payload = result;
        if (error && !payload && error.context?.json) {
            try { payload = await error.context.json(); } catch { /* Resposta sem JSON. */ }
        }
        if (payload?.error === 'mfa_required') return { mfaRequired: true };
        if (error || !payload?.token) return {};
        return { session: createSession(payload) };
    } catch {
        return {};
    }
}

export async function ensureAdminSession() {
    return (await requestAdminSession()).session || null;
}

// Verificação em duas etapas (aplicativo autenticador).
export async function verifiedTotpFactor() {
    const { data, error } = await supabase.auth.mfa.listFactors();
    if (error) throw new Error('Não foi possível consultar a verificação em duas etapas. Tente novamente.');
    return (data?.totp || []).find(factor => factor.status === 'verified') || null;
}

export async function startTotpEnrollment() {
    const { data: factors } = await supabase.auth.mfa.listFactors();
    // Tentativa anterior que não foi até o fim.
    for (const stale of (factors?.all || []).filter(factor => factor.status !== 'verified')) {
        await supabase.auth.mfa.unenroll({ factorId: stale.id });
    }
    const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp', friendlyName: 'Graphène' });
    if (error || !data?.totp) throw new Error('Não foi possível gerar o código de ativação. Tente novamente.');
    return { factorId: data.id, qrCode: data.totp.qr_code, secret: data.totp.secret };
}

export async function confirmTotpCode(factorId, code) {
    const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId, code: code.trim() });
    if (error) throw new Error('Código incorreto ou vencido. Confira no aplicativo e tente de novo.');
}

export async function signOutAccount() {
    await supabase.auth.signOut({ scope: 'local' }).catch(() => {});
}

// O Google sempre volta por /entrar (endereço já liberado no Supabase); de lá a
// página segue para returnTo, como no login do cliente.
export async function startGoogleLogin(returnTo) {
    sessionStorage.setItem('graphene_oauth_intent', JSON.stringify({ returnTo }));
    const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: `${window.location.origin}/entrar?oauth=google` },
    });
    if (error) {
        sessionStorage.removeItem('graphene_oauth_intent');
        throw error;
    }
}

export async function signInWithEmail(email, password) {
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) throw new Error('E-mail ou senha inválidos.');
}

export async function sendPasswordReset(email) {
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: `${window.location.origin}/redefinir-senha` });
    if (error) throw new Error('Não foi possível enviar a recuperação agora.');
}

export async function currentAccountEmail() {
    const { data } = await supabase.auth.getSession();
    return data.session?.user?.email || '';
}

// Só para mostrar atalhos na tela; as funções do servidor conferem o papel em cada ação.
export async function currentStaffRole() {
    try {
        const { data, error } = await supabase.rpc('current_staff_role');
        return error ? null : data || null;
    } catch {
        return null;
    }
}
