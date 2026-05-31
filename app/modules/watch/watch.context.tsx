// app/modules/watch/watch.context.tsx
import { watchManager } from './watch.manager';
import { createContext, useContext, type ReactNode } from 'react';

interface WatchContextValue {
  manager: typeof watchManager;
}

const WatchContext = createContext<WatchContextValue | null>(null);

interface WatchProviderProps {
  children: ReactNode;
}

/**
 * WatchProvider exposes the singleton WatchManager via context.
 *
 * Intentionally has NO cleanup useEffect. The previous implementation called
 * watchManager.disconnectAll() on unmount, which in React Strict Mode's
 * mount → unmount → remount dev cycle fired immediately during the unmount —
 * bypassing the per-channel CLEANUP_DELAY_MS buffer and unsubscribing every
 * just-subscribed channel on the server before the remount could re-establish
 * them. Symptom: "subscribe x3 → unsubscribe x3 → silence" on first page load,
 * watch streams permanently dead.
 *
 * The WatchManager is a window-scoped singleton (persists across HMR) and
 * channels are individually ref-counted with a 500ms cleanup buffer per
 * subscriber, so per-channel teardown is already handled correctly. App-wide
 * teardown happens when the tab/window closes, which the browser handles by
 * aborting the in-flight SSE fetch — no React-side cleanup is necessary.
 */
export function WatchProvider({ children }: WatchProviderProps) {
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
