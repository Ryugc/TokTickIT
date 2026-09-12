import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

export interface User {
  id: number;
  name: string;
  email: string;
  role: 'REQUESTER' | 'IT_STAFF' | 'ADMIN';
  department: string;
  isActive: boolean;
  mustChangePassword: boolean;
}

export interface AuthContextType {
  user: User | null;
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<{ success: boolean; error?: string }>;
  checkAuth: () => Promise<void>;
}

const STORAGE_KEY = 'toktickit_selected_requester';
const LOGOUT_FLAG_KEY = 'toktickit_logged_out';

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    if (typeof window !== 'undefined' && sessionStorage.getItem(LOGOUT_FLAG_KEY) === 'true') {
      return null;
    }
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.id) {
          return {
            id: parsed.id,
            name: parsed.name,
            email: parsed.email || 'jennifer.anderson@toktickit.com',
            role: 'REQUESTER',
            department: parsed.department || 'Human Resources',
            isActive: parsed.isActive ?? true,
            mustChangePassword: false,
          };
        }
      }
    } catch (err) {
      // ignore
    }
    return null;
  });

  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const checkAuth = useCallback(async () => {
    if (typeof window !== 'undefined' && sessionStorage.getItem(LOGOUT_FLAG_KEY) === 'true') {
      setUser(null);
      return;
    }

    try {
      const res = await fetch('/api/auth/me');
      if (res.ok) {
        const data = await res.json();
        if (data && data.user) {
          setUser(data.user);
          return;
        }
      }
    } catch (err) {
      // ignore
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const login = async (email: string, password: string): Promise<boolean> => {
    setLoading(true);
    setError(null);
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem(LOGOUT_FLAG_KEY);
    }
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || 'Invalid email or password credentials.');
        setUser(null);
        setLoading(false);
        return false;
      }
      setUser(data.user);
      setLoading(false);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
      setUser(null);
      setLoading(false);
      return false;
    }
  };

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (err) {
      console.error('Logout failed', err);
    } finally {
      if (typeof window !== 'undefined') {
        localStorage.removeItem(STORAGE_KEY);
        sessionStorage.setItem(LOGOUT_FLAG_KEY, 'true');
      }
      setUser(null);
    }
  };

  const changePassword = async (currentPassword: string, newPassword: string) => {
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.message || 'Failed to change password' };
      }
      setUser((prev) => (prev ? { ...prev, mustChangePassword: false } : null));
      return { success: true };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Error changing password' };
    }
  };

  return (
    <AuthContext.Provider value={{ user, setUser, loading, error, login, logout, changePassword, checkAuth }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
