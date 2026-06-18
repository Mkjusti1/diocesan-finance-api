import { createContext, useContext, useState, useCallback } from 'react';
import { client } from '@/lib/apollo';
const AuthContext = createContext(null);
export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem('user')); } catch { return null; }
  });
  const login = useCallback((token, userData) => {
    window.__authToken__ = token;
    sessionStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
  }, []);
  const logout = useCallback(() => {
    window.__authToken__ = null;
    sessionStorage.removeItem('user');
    setUser(null);
    client.clearStore();
  }, []);
  return (
    <AuthContext.Provider value={{ user, login, logout, isAuthenticated: !!user && !!window.__authToken__ }}>
      {children}
    </AuthContext.Provider>
  );
}
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
