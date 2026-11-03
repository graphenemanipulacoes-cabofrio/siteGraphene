import { createClient } from 'npm:@supabase/supabase-js@2';
import { allowedOrigin, json } from '../_shared/http.ts';
import { authAccount, isAdminEmail, issueAdminSession } from '../_shared/counter-security.ts';

// Login da administração pela conta do site (e-mail e senha ou Google, no Supabase Auth).
// O navegador manda a sessão da conta; se o e-mail estiver em admins, recebe o token do painel.
// Tentativas de senha errada são limitadas pelo próprio Supabase Auth.
Deno.serve(async (req: Request) => {
  const origin = allowedOrigin(req.headers.get('origin'));
  if (req.method === 'OPTIONS') return json({}, origin ? 204 : 403, origin || undefined);
  if (!origin || req.method !== 'POST') return json({ error: 'request_not_allowed' }, 403, origin || undefined);

  try {
    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const account = await authAccount(admin, req);
    if (!account) return json({ error: 'unauthorized' }, 401, origin);
    if (!await isAdminEmail(admin, account.email)) return json({ error: 'not_admin' }, 403, origin);

    const session = await issueAdminSession(admin, account.email);
    if (!session) return json({ error: 'session_error' }, 500, origin);
    return json({ token: session.token, user: account.email, expiresAt: session.expiresAt }, 200, origin);
  } catch {
    return json({ error: 'internal_error' }, 500, origin || undefined);
  }
});
