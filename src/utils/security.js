// Security utilities for authentication

// Simple hash function for client-side password hashing
// NOTE: This is a basic improvement. For production, use Supabase Auth or server-side hashing
export const hashPassword = async (password) => {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

// Verify password against stored hash
export const verifyPassword = async (password, storedHash) => {
  const inputHash = await hashPassword(password);
  return inputHash === storedHash;
};

// Session management utilities
export const createSession = (userData) => {
  const session = {
    user: userData.username,
    created_at: Date.now(),
    expires_at: Date.now() + (24 * 60 * 60 * 1000) // 24 hours
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
    if (Date.now() > session.expires_at) {
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

// Rate limiting for login attempts
const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes

export const checkRateLimit = () => {
  const attempts = localStorage.getItem('login_attempts');
  const lockoutEnd = localStorage.getItem('lockout_end');
  
  if (lockoutEnd && Date.now() < parseInt(lockoutEnd)) {
    const remaining = Math.ceil((parseInt(lockoutEnd) - Date.now()) / 60000);
    return {
      allowed: false,
      message: `Muitas tentativas. Tente novamente em ${remaining} minutos.`
    };
  }
  
  if (attempts && parseInt(attempts) >= MAX_ATTEMPTS) {
    const lockoutEnd = Date.now() + LOCKOUT_DURATION;
    localStorage.setItem('lockout_end', lockoutEnd.toString());
    return {
      allowed: false,
      message: 'Muitas tentativas. Aguarde 15 minutos.'
    };
  }
  
  return { allowed: true };
};

export const recordFailedAttempt = () => {
  const attempts = parseInt(localStorage.getItem('login_attempts') || '0') + 1;
  localStorage.setItem('login_attempts', attempts.toString());
  
  if (attempts >= MAX_ATTEMPTS) {
    localStorage.setItem('lockout_end', (Date.now() + LOCKOUT_DURATION).toString());
  }
};

export const clearFailedAttempts = () => {
  localStorage.removeItem('login_attempts');
  localStorage.removeItem('lockout_end');
};
