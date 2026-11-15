import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import client, { getToken, setSessionExpiredHandler, setToken } from '../api/client.js';

const AuthContext = createContext(null);

export const homeFor = (role) => ({ USER: '/my', OFFICER: '/officer', ADMIN: '/admin' }[role] || '/login');

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  // True until we know whether the stored token is still good; nothing role-specific renders before that.
  const [loading, setLoading] = useState(Boolean(getToken()));
  const navigate = useNavigate();

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
  }, []);

  useEffect(() => {
    setSessionExpiredHandler(() => {
      setUser(null);
      navigate('/login', { replace: true, state: { expired: true } });
    });
  }, [navigate]);

  useEffect(() => {
    // Wakes the backend and the ML service if the free tier has put them to sleep.
    client.get('/health').catch(() => {});
    if (!getToken()) return;
    client
      .get('/users/me')
      .then((res) => setUser(res.data))
      .catch(() => logout())
      .finally(() => setLoading(false));
  }, [logout]);

  // Both return the user so the caller can redirect by role.
  const finishLogin = async (token) => {
    setToken(token);
    const me = (await client.get('/users/me')).data;
    setUser(me);
    return me;
  };

  const login = async (email, password) => {
    const res = await client.post('/auth/login', { email, password });
    return finishLogin(res.data.token);
  };

  const register = async (name, email, password) => {
    const res = await client.post('/auth/register', { name, email, password });
    return finishLogin(res.data.token);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>{children}</AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
