import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

export type ActiveBrand = {
  id: string;
  name: string;
};

type ActiveBrandContextValue = {
  activeBrandId: string | null;
  activeBrandName: string | null;
  setActiveBrand: (brand: ActiveBrand) => void;
  clearActiveBrand: () => void;
};

const ActiveBrandContext = createContext<ActiveBrandContextValue | null>(null);

const STORAGE_KEY = 'socialone.activeBrand';

function loadFromStorage(): ActiveBrand | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    const obj = parsed as Partial<ActiveBrand>;
    if (typeof obj.id !== 'string' || typeof obj.name !== 'string') return null;
    if (!obj.id.trim() || !obj.name.trim()) return null;
    return { id: obj.id, name: obj.name };
  } catch {
    return null;
  }
}

function saveToStorage(next: ActiveBrand | null) {
  if (!next) {
    localStorage.removeItem(STORAGE_KEY);
    return;
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}

export function ActiveBrandProvider({ children }: { children: React.ReactNode }) {
  const [active, setActive] = useState<ActiveBrand | null>(() => loadFromStorage());

  useEffect(() => {
    saveToStorage(active);
  }, [active]);

  const value = useMemo<ActiveBrandContextValue>(() => {
    return {
      activeBrandId: active?.id ?? null,
      activeBrandName: active?.name ?? null,
      setActiveBrand: (brand) => setActive(brand),
      clearActiveBrand: () => setActive(null),
    };
  }, [active]);

  return <ActiveBrandContext.Provider value={value}>{children}</ActiveBrandContext.Provider>;
}

export function useActiveBrand(): ActiveBrandContextValue {
  const ctx = useContext(ActiveBrandContext);
  if (!ctx) throw new Error('useActiveBrand must be used within ActiveBrandProvider');
  return ctx;
}


