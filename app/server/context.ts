import { createAPIFactory } from '@/resources/api/api-factory.server';
import type { APIFactory } from '@/resources/api/api-factory.server';
import { createControlPlaneFactory } from '@/resources/control-plane/control.factory';
import type { ControlPlaneFactory } from '@/resources/control-plane/control.factory';
import { sessionCookie } from '@/utils/cookies/session';
import { Context } from 'hono';
import { SecureHeadersVariables } from 'hono/secure-headers';
import type { AppLoadContext } from 'react-router';

/**
 * Declare our loaders and actions context type
 */
declare module 'react-router' {
  interface AppLoadContext {
    /**
     * The app version from the build assets
     */
    readonly appVersion: string;

    /**
     * The CSP nonce
     */
    readonly cspNonce: string;

    /**
     * API client for making authenticated requests
     */
    readonly apiClient: APIFactory;

    /**
     * Control plane client for making authenticated requests
     */
    readonly controlPlaneClient: ControlPlaneFactory;
  }
}

// Types for context generation
type ContextOptions = {
  mode: string;
  build: {
    assets: {
      version: string;
    };
  };
};

/**
 * Creates API context with authenticated clients
 * @param cookie The incoming request
 * @returns API context with authenticated clients
 */
async function createApiContext(request: Request) {
  const { data } = await sessionCookie.get(request);

  const apiClient = createAPIFactory(data?.accessToken || '');
  const controlPlaneClient = createControlPlaneFactory(data?.accessToken || '');

  return {
    apiClient,
    controlPlaneClient,
  };
}

// Create a function to generate the load context creator
export const createContextGenerator = <Env extends { Variables: SecureHeadersVariables }>(
  createGetLoadContextFn: (
    callback: (c: Context<Env>, options: ContextOptions) => Promise<AppLoadContext> | AppLoadContext
  ) => (c: Context<Env>, options: ContextOptions) => Promise<AppLoadContext> | AppLoadContext
) => {
  return createGetLoadContextFn(async (c: Context<Env>, { mode, build }) => {
    const isProductionMode = mode === 'production';

    // Get cookie from request headers
    // Create API context from the request
    const { apiClient, controlPlaneClient } = await createApiContext(c.req.raw);

    return {
      appVersion: isProductionMode ? build.assets.version : 'dev',
      cspNonce: c.get('secureHeadersNonce'),
      apiClient,
      controlPlaneClient,
    };
  });
};
