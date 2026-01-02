import { createControlPlaneClient } from '@/modules/control-plane/control-plane.factory';
import type { ServiceContext } from '@/resources/base/types';
import { createContext, useContext, useMemo, type ReactNode } from 'react';

const ServiceContextValue = createContext<ServiceContext | null>(null);

interface ServiceProviderProps {
  children: ReactNode;
}

/**
 * ServiceProvider creates a client-side ServiceContext for React Query hooks.
 *
 * On the client, it creates:
 * - A controlPlaneClient that proxies through /api/proxy/* (authenticated via session cookie)
 * - A userScopedClient that proxies through /api/user-proxy/* for user-specific APIs
 * - A unique requestId for each render
 *
 * Note: For SSR, loaders have access to AppLoadContext directly.
 * This provider is specifically for client-side mutations and queries.
 */
export function ServiceProvider({ children }: ServiceProviderProps) {
  const context = useMemo<ServiceContext>(() => {
    // Client-side only - use proxy endpoints
    const controlPlaneClient = createControlPlaneClient('', '/api/proxy');
    const userScopedClient = createControlPlaneClient('', '/api/user-proxy');

    return {
      controlPlaneClient,
      userScopedClient,
      requestId: crypto.randomUUID(),
    };
  }, []);

  return <ServiceContextValue.Provider value={context}>{children}</ServiceContextValue.Provider>;
}

export function useServiceContext(): ServiceContext {
  const context = useContext(ServiceContextValue);

  if (!context) {
    throw new Error('useServiceContext must be used within a ServiceProvider');
  }

  return context;
}
