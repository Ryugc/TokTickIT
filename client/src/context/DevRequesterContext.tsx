import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

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
  const [selectedRequester, setSelectedRequesterState] = useState<RequesterUser | null>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [isSelectorOpen, setIsSelectorOpen] = useState<boolean>(false);
  const [requesters, setRequesters] = useState<RequesterUser[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const setSelectedRequester = useCallback((requester: RequesterUser | null) => {
    setSelectedRequesterState(requester);
    if (requester) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(requester));
      } catch (err) {
        console.error('Failed to save requester to localStorage', err);
      }
    } else {
      localStorage.removeItem(STORAGE_KEY);
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

      // If no selected requester or if selected requester is no longer active/valid, auto open modal
      setSelectedRequesterState((current) => {
        if (!current) {
          setIsSelectorOpen(true);
          return null;
        }
        const exists = data.find((r) => r.id === current.id && r.isActive);
        if (!exists) {
          setIsSelectorOpen(true);
          return null;
        }
        return exists;
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
