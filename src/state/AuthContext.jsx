import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

const AUTH_KEY = 'ar-overlay:auth';
const API_BASE = import.meta.env.DEV
  ? 'http://localhost:3001'
  : window.location.origin;

const AuthContext = createContext(null);

async function apiCall(path, { method = 'GET', body = null, token = null } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `Ошибка ${res.status}`);
  return data;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  // On mount: restore token from localStorage and validate
  useEffect(() => {
    const stored = localStorage.getItem(AUTH_KEY);
    if (!stored) {
      setLoading(false);
      return;
    }

    let parsed;
    try {
      parsed = JSON.parse(stored);
    } catch {
      localStorage.removeItem(AUTH_KEY);
      setLoading(false);
      return;
    }

    if (!parsed?.token) {
      setLoading(false);
      return;
    }

    apiCall('/api/me', { token: parsed.token })
      .then((data) => {
        setToken(parsed.token);
        setUser(data.user);
      })
      .catch(() => {
        localStorage.removeItem(AUTH_KEY);
      })
      .finally(() => setLoading(false));
  }, []);

  function saveAuth(newToken, newUser) {
    setToken(newToken);
    setUser(newUser);
    localStorage.setItem(AUTH_KEY, JSON.stringify({ token: newToken, user: newUser }));
  }

  function clearAuth() {
    setToken(null);
    setUser(null);
    localStorage.removeItem(AUTH_KEY);
  }

  const login = useCallback(async (email, password) => {
    const data = await apiCall('/api/login', {
      method: 'POST',
      body: { email, password },
    });
    saveAuth(data.token, data.user);
    return data;
  }, []);

  const register = useCallback(async (email, password) => {
    const data = await apiCall('/api/register', {
      method: 'POST',
      body: { email, password },
    });
    saveAuth(data.token, data.user);
    return data;
  }, []);

  const logout = useCallback(() => {
    clearAuth();
  }, []);

  const changePassword = useCallback(async (oldPassword, newPassword) => {
    if (!token) throw new Error('Не авторизован');
    const data = await apiCall('/api/change-password', {
      method: 'POST',
      body: { oldPassword, newPassword },
      token,
    });
    // Password change invalidates all sessions — clear auth
    clearAuth();
    return data;
  }, [token]);

  const value = useMemo(() => ({
    user,
    token,
    isAuthenticated: !!token && !!user,
    loading,
    login,
    register,
    logout,
    changePassword,
  }), [user, token, loading, login, register, logout, changePassword]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
