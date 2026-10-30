import { supabase } from './supabaseClient';
import { createSession, getSession } from '../utils/security';

// Login único do site (Supabase Auth): clientes, parceiros, equipe e administração.

// Admin conectado na conta do site: renova o token do painel sem pedir a senha de novo.
// Devolve null para quem não está conectado ou não é administrador.
export async function ensureAdminSession() {
    const current = getSession();
    if (current) return current;
    try {
        const { data } = await supabase.auth.getSession();
        if (!data.session) return null;
        const { data: result, error } = await supabase.functions.invoke('admin-login', { body: {} });
        if (error || !result?.token) return null;
        return createSession(result);
    } catch {
        return null;
    }
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
