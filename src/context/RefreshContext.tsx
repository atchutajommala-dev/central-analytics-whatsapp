"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";

interface RefreshContextType {
  isRefreshing: boolean;
  autoRefreshInterval: number; // in seconds (0 = disabled)
  setAutoRefreshInterval: (interval: number) => void;
  triggerSilentRefresh: () => Promise<void>;
  registerRefreshHandler: (handler: () => Promise<void>) => () => void;
}

const RefreshContext = createContext<RefreshContextType>({
  isRefreshing: false,
  autoRefreshInterval: 30,
  setAutoRefreshInterval: () => {},
  triggerSilentRefresh: async () => {},
  registerRefreshHandler: () => () => {},
});

export const RefreshProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [autoRefreshInterval, setAutoRefreshInterval] = useState(30); // Default 30s
  const [handlers, setHandlers] = useState<Array<() => Promise<void>>>([]);

  const registerRefreshHandler = useCallback((handler: () => Promise<void>) => {
    setHandlers((prev) => [...prev, handler]);
    return () => {
      setHandlers((prev) => prev.filter((h) => h !== handler));
    };
  }, []);

  const triggerSilentRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await Promise.all(handlers.map((h) => h().catch(() => {})));
    } finally {
      setTimeout(() => setIsRefreshing(false), 500);
    }
  }, [handlers]);

  useEffect(() => {
    if (autoRefreshInterval <= 0) return;

    const timer = setInterval(() => {
      triggerSilentRefresh();
    }, autoRefreshInterval * 1000);

    return () => clearInterval(timer);
  }, [autoRefreshInterval, triggerSilentRefresh]);

  return (
    <RefreshContext.Provider
      value={{
        isRefreshing,
        autoRefreshInterval,
        setAutoRefreshInterval,
        triggerSilentRefresh,
        registerRefreshHandler,
      }}
    >
      {children}
    </RefreshContext.Provider>
  );
};

export const useRefresh = () => useContext(RefreshContext);
