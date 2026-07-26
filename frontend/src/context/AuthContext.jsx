import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import api, { apiErrorMessage } from '../api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('lc_token');
    if (!token) { setReady(true); return; }
    api.get('/auth/me')
      .then(res => setUser(res.data.user))
      .catch(() => { localStorage.removeItem('lc_token'); })
      .finally(() => setReady(true));
  }, []);

  const login = useCallback(async (username, password) => {
    try {
      const res = await api.post('/auth/login', { username, password });
      localStorage.setItem('lc_token', res.data.token);
      setUser(res.data.user);
      return { ok: true };
    } catch (e) {
      return { ok: false, error: apiErrorMessage(e, 'Giriş başarısız.') };
    }
  }, []);

  const register = useCallback(async (username, password) => {
    try {
      const res = await api.post('/auth/register', { username, password });
      localStorage.setItem('lc_token', res.data.token);
      setUser(res.data.user);
      return { ok: true };
    } catch (e) {
      return { ok: false, error: apiErrorMessage(e, 'Kayıt başarısız.') };
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('lc_token');
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, ready, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
