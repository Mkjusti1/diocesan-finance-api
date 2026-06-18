import { createContext, useContext, useState, useCallback } from 'react';
import { client } from '@/lib/apollo';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = sessionStorage.getItem('user');
    return saved ? JSON.parse(saved) : null;
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

  // Restore token on page refresh (token itself not stored, user must re-login)
  const isAuthenticated = !!user && !!window.__authToken__;

  return (
    <AuthContext.Provider value={{ user, login, logout, isAuthenticated }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
