import { createContext, useContext, useState, useCallback } from 'react';
import { client } from '@/lib/apollo';
const AuthContext = createContext(null);
export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      // Restore token from sessionStorage on refresh
      const savedToken = sessionStorage.getItem('token');
      const savedUser = sessionStorage.getItem('user');
      if (savedToken && savedUser) {
        window.__authToken__ = savedToken;
        return JSON.parse(savedUser);
      }
      return null;
    } catch { return null; }
  });
  const login = useCallback((token, userData) => {
    window.__authToken__ = token;
    sessionStorage.setItem('token', token);
    sessionStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
  }, []);
  const logout = useCallback(() => {
    window.__authToken__ = null;
    sessionStorage.removeItem('token');
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
