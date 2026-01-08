// app/modules/watch/watch.context.tsx
import { watchManager } from './watch.manager';
import { createContext, useContext, useEffect, type ReactNode } from 'react';

interface WatchContextValue {
  manager: typeof watchManager;
}

const WatchContext = createContext<WatchContextValue | null>(null);

interface WatchProviderProps {
  children: ReactNode;
}

/**
 * WatchProvider manages the lifecycle of watch connections.
 * Disconnects all connections on unmount.
 */
export function WatchProvider({ children }: WatchProviderProps) {
  useEffect(() => {
    return () => {
      watchManager.disconnectAll();
    };
  }, []);

  return (
    <WatchContext.Provider value={{ manager: watchManager }}>{children}</WatchContext.Provider>
  );
}

/**
 * Hook to access the watch context.
 */
export function useWatchContext(): WatchContextValue {
  const context = useContext(WatchContext);
  if (!context) {
    throw new Error('useWatchContext must be used within WatchProvider');
  }
  return context;
}
