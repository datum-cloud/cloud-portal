// app/server/middleware/context.ts
import { createControlPlaneClient } from '../../modules/control-plane/control-plane.factory';
import type { IAccessTokenSession } from '../../utils/auth/auth.types';
import type { Variables } from '../types';
import { env } from '@/utils/env/env.server';
import { createMiddleware } from 'hono/factory';

/**
 * Shared context builder for both Hono middleware and React Router getLoadContext.
 * Creates controlPlaneClient and userScopedClient.
 */
export async function buildContext(session: IAccessTokenSession | null) {
  // Create control plane client
  const controlPlaneClient = createControlPlaneClient(session?.accessToken ?? '');

  // Create user-scoped client for user-specific APIs (e.g., organization memberships)
  // Base URL: {API_URL}/apis/iam.miloapis.com/v1alpha1/users/{userId}/control-plane/
  const userScopedBaseUrl = `${env.public.apiUrl}/apis/iam.miloapis.com/v1alpha1/users/${session?.sub}/control-plane`;
  const userScopedClient = createControlPlaneClient(session?.accessToken ?? '', userScopedBaseUrl);

  return {
    controlPlaneClient,
    userScopedClient,
  };
}

/**
 * Context middleware that sets up controlPlaneClient and userScopedClient
 * for API routes that need access to these services.
 */
export function contextMiddleware() {
  return createMiddleware<{ Variables: Variables }>(async (c, next) => {
    const session = c.get('session');
    const { controlPlaneClient, userScopedClient } = await buildContext(session);

    // Set context variables
    c.set('controlPlaneClient', controlPlaneClient);
    c.set('userScopedClient', userScopedClient);

    await next();
  });
}
