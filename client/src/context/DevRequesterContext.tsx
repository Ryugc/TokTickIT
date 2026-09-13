import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { AuthContext } from './AuthContext';

export interface RequesterUser {
  id: number;
  name: string;
  email: string;
  department: string;
  isActive: boolean;
}

export interface DevRequesterContextType {
  selectedRequester: RequesterUser | null;
  setSelectedRequester: (requester: RequesterUser | null) => void;
  isSelectorOpen: boolean;
  setIsSelectorOpen: (open: boolean) => void;
  requesters: RequesterUser[];
  loading: boolean;
  error: string | null;
  fetchRequesters: () => Promise<void>;
}

const STORAGE_KEY = 'toktickit_selected_requester';

const DevRequesterContext = createContext<DevRequesterContextType | undefined>(undefined);

export const DevRequesterProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const auth = useContext(AuthContext);
  const authRef = useRef(auth);
  authRef.current = auth;

  const [selectedRequesterState, setSelectedRequesterState] = useState<RequesterUser | null>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [isSelectorOpen, setIsSelectorOpen] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return !saved;
    } catch {
      return true;
    }
  });
  const [requesters, setRequesters] = useState<RequesterUser[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const selectedRequester = auth && auth.user
    ? {
        id: auth.user.id,
        name: auth.user.name,
        email: auth.user.email,
        department: auth.user.department,
        isActive: auth.user.isActive,
      }
    : selectedRequesterState;

  const setSelectedRequester = useCallback((requester: RequesterUser | null) => {
    setSelectedRequesterState(requester);
    if (requester) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(requester));
      } catch (err) {
        console.error('Failed to save requester to localStorage', err);
      }
      if (authRef.current && authRef.current.setUser) {
        authRef.current.setUser({
          id: requester.id,
          name: requester.name,
          email: requester.email,
          role: 'REQUESTER',
          department: requester.department,
          isActive: requester.isActive,
          mustChangePassword: false,
        });
      }
    } else {
      localStorage.removeItem(STORAGE_KEY);
      if (authRef.current && authRef.current.setUser) {
        authRef.current.setUser(null);
      }
    }
  }, []);

  const fetchRequesters = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/requesters');
      if (!res.ok) {
        throw new Error('Failed to fetch development requesters');
      }
      const data: RequesterUser[] = await res.json();
      setRequesters(data);

      setSelectedRequesterState((current) => {
        if (!current && !authRef.current?.user) {
          setIsSelectorOpen(true);
          return null;
        }
        return current;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRequesters();
  }, [fetchRequesters]);

  return (
    <DevRequesterContext.Provider
      value={{
        selectedRequester,
        setSelectedRequester,
        isSelectorOpen,
        setIsSelectorOpen,
        requesters,
        loading,
        error,
        fetchRequesters,
      }}
    >
      {children}
    </DevRequesterContext.Provider>
  );
};

export const useDevRequester = (): DevRequesterContextType => {
  const context = useContext(DevRequesterContext);
  if (!context) {
    throw new Error('useDevRequester must be used within a DevRequesterProvider');
  }
  return context;
};
