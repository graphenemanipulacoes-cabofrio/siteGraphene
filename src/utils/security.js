// Sessão do painel admin. O login é a conta do site (e-mail e senha ou Google);
// a função admin-login confere se o e-mail é de administrador e devolve este token
// (ensureAdminSession, em lib/accountAuth.js). Sem dependências: também roda nos testes em Node.
export const createSession = (userData) => {
  const session = {
    user: userData.user || userData.username,
    token: userData.token,
    created_at: Date.now(),
    expires_at: userData.expiresAt ? new Date(userData.expiresAt).getTime() : Date.now() + (8 * 60 * 60 * 1000)
  };
  localStorage.setItem('admin_session', JSON.stringify(session));
  return session;
};

export const getSession = () => {
  const sessionStr = localStorage.getItem('admin_session');
  if (!sessionStr) return null;

  try {
    const session = JSON.parse(sessionStr);
    // Check if session is expired
    if (!session.token || Date.now() > session.expires_at) {
      localStorage.removeItem('admin_session');
      return null;
    }
    return session;
  } catch {
    localStorage.removeItem('admin_session');
    return null;
  }
};

export const destroySession = () => {
  localStorage.removeItem('admin_session');
};

// Ao sair da conta do site, ou trocar de conta, o painel admin deste navegador também fecha.
export const syncAdminSessionWithAccount = (email) => {
  const current = getSession();
  if (current && (!email || String(current.user || '').toLowerCase() !== email.toLowerCase())) destroySession();
};

// Remove travas do antigo limitador de tentativas que ficava no navegador.
export const clearFailedAttempts = () => {
  localStorage.removeItem('login_attempts');
  localStorage.removeItem('lockout_end');
};
